import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test, type TestContext } from 'node:test';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { compile } from 'svelte/compiler';
import { render } from 'svelte/server';
import type { Component } from 'svelte';
import { createGeolocationController, type GeolocationState } from '../src/lib/map/createGeolocationController.js';
import { position } from './helpers/geolocation.js';

const asModule = (code: string) => `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`;

interface WatchRequest {
  success: PositionCallback;
  error: (error: Pick<GeolocationPositionError, 'code'>) => void;
  options?: PositionOptions;
}

interface SetupOptions {
  secure?: boolean;
  supported?: boolean;
  permissions?: { query: () => Promise<unknown> };
}

function setup(t: TestContext, { secure = true, supported = true, permissions }: SetupOptions = {}) {
  const requests: WatchRequest[] = [];
  const cleared: number[] = [];
  const positions: GeolocationPosition[] = [];
  const recenters: GeolocationPosition[] = [];
  const states: { state: GeolocationState; message: string }[] = [];
  let clears = 0;
  let onWatch: ((success: PositionCallback, error: WatchRequest['error']) => void) | undefined;
  const geolocation: Pick<Geolocation, 'watchPosition' | 'clearWatch'> = {
    watchPosition(success, onError, options) {
      const error: WatchRequest['error'] = ({ code }) => onError?.({
        code, message: '', PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3,
      });
      const id = requests.length; // Exercise ID zero as well.
      requests.push({ success, error, options });
      onWatch?.(success, error);
      return id;
    },
    clearWatch(id) { cleared.push(id); },
  };
  for (const [key, value] of Object.entries({
    window: { isSecureContext: secure },
    navigator: { geolocation: supported ? geolocation : undefined, permissions },
  })) {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { value, configurable: true });
    t.after(() => {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    });
  }
  const controller = createGeolocationController({
    onStateChange: (state, message) => states.push({ state, message }),
    onPosition: (position) => positions.push(position),
    onRecenter: (position) => recenters.push(position),
    onClear: () => clears++,
  });
  t.after(() => controller.destroy());
  return {
    controller, requests, cleared, positions, recenters, states,
    get state() { return states.at(-1)!.state; },
    get message() { return states.at(-1)!.message; },
    get clears() { return clears; },
    set onWatch(callback: typeof onWatch) { onWatch = callback; },
  };
}

for (const mode of ['missing', 'rejecting', 'throwing', 'denied', 'granted', 'pending']) {
  test(`starts synchronously without consulting a ${mode} Permissions API`, (t) => {
    let queries = 0;
    const permissions = mode === 'missing' ? undefined : {
      query() {
        queries++;
        if (mode === 'throwing') throw new Error('Permissions API failed');
        if (mode === 'rejecting') return Promise.reject(new Error('Unsupported query'));
        if (mode === 'pending') return new Promise(() => {});
        return Promise.resolve({ state: mode });
      },
    };
    const h = setup(t, { permissions });
    assert.equal(h.state, 'idle');
    assert.equal(h.requests.length, 0, 'no request on page load');
    h.controller.toggle();
    assert.equal(h.requests.length, 1, 'watch starts before toggle returns');
    assert.equal(h.state, 'locating');
    assert.deepEqual(h.requests[0].options, { enableHighAccuracy: true, timeout: 10000 });
    assert.equal(queries, 0);
    h.requests[0].success(position());
    assert.equal(h.state, 'following');
    assert.equal(h.positions.length, 1);
    assert.equal(h.recenters.length, 1);
  });
}

for (const [code, message] of [[1, /denied/], [2, /position is unavailable/], [3, /timed out/]] as const) {
  test(`error ${code} clears the watch and allows immediate successful retry`, (t) => {
    const h = setup(t, { permissions: { query: () => Promise.resolve({ state: 'granted' }) } });
    h.controller.toggle();
    h.requests[0].error({ code });
    assert.equal(h.state, 'error');
    assert.match(h.message, message);
    if (code === 1) {
      assert.match(h.message, /website.*permission/);
      assert.match(h.message, /Location Services for Safari/);
    }
    assert.deepEqual(h.cleared, [0]);
    assert.equal(h.clears, 1);
    h.controller.toggle();
    assert.equal(h.state, 'locating');
    assert.equal(h.message, '');
    assert.equal(h.requests.length, 2);
    // Old callbacks, even after retry, must not replace state or show stale markers.
    h.requests[0].success(position());
    h.requests[0].error({ code: 1 });
    assert.equal(h.state, 'locating');
    assert.equal(h.positions.length, 0);
    h.requests[1].success(position());
    assert.equal(h.state, 'following');
    assert.equal(h.message, '');
  });
}

test('repeated taps cancel locating and following without overlapping watches', (t) => {
  const h = setup(t);
  h.controller.toggle();
  h.controller.toggle();
  assert.equal(h.state, 'idle');
  assert.deepEqual(h.cleared, [0]);
  h.requests[0].success(position());
  h.requests[0].error({ code: 3 });
  assert.equal(h.state, 'idle');
  assert.equal(h.positions.length, 0);
  h.controller.toggle();
  h.requests[1].success(position());
  h.controller.toggle();
  assert.equal(h.state, 'idle');
  assert.deepEqual(h.cleared, [0, 1]);
  assert.equal(h.clears, 2);
});

test('panning keeps positions updating and the next tap recenters the latest fix', (t) => {
  const h = setup(t);
  h.controller.toggle();
  h.requests[0].success(position());
  h.controller.stopFollowing();
  assert.equal(h.state, 'background');
  const latest = position(5.35, 60.41, 40);
  h.requests[0].success(latest);
  assert.equal(h.state, 'background');
  assert.equal(h.positions.at(-1), latest);
  assert.equal(h.recenters.length, 1);
  h.controller.toggle();
  assert.equal(h.state, 'following');
  assert.equal(h.recenters.at(-1), latest);
  assert.equal(h.requests.length, 1, 'recenter reuses the active watch');
  assert.deepEqual(h.cleared, []);
});

test('panning before the first fix does not snap back when it arrives', (t) => {
  const h = setup(t);
  h.controller.toggle();
  h.controller.stopFollowing();
  h.requests[0].success(position());
  assert.equal(h.state, 'background');
  assert.equal(h.recenters.length, 0);
  h.controller.toggle();
  assert.equal(h.state, 'following');
  assert.equal(h.recenters.length, 1);
});

test('recentering before the first fix resumes locating without another watch', (t) => {
  const h = setup(t);
  h.controller.toggle();
  h.controller.stopFollowing();
  h.controller.toggle();
  assert.equal(h.state, 'locating');
  assert.equal(h.requests.length, 1);
  h.requests[0].success(position());
  assert.equal(h.state, 'following');
});

test('an error while following or in background removes the current position', (t) => {
  const h = setup(t);
  for (const background of [false, true]) {
    h.controller.toggle();
    const request = h.requests.at(-1);
    assert.ok(request);
    request.success(position());
    if (background) h.controller.stopFollowing();
    request.error({ code: 2 });
    assert.equal(h.state, 'error');
  }
  assert.equal(h.clears, 2);
  assert.deepEqual(h.cleared, [0, 1]);
});

for (const stage of ['idle', 'locating', 'following', 'background', 'error']) {
  test(`destroy during ${stage} clears resources once and ignores subsequent work`, (t) => {
    const h = setup(t);
    if (stage !== 'idle') h.controller.toggle();
    if (stage === 'following' || stage === 'background') h.requests[0].success(position());
    if (stage === 'background') h.controller.stopFollowing();
    if (stage === 'error') h.requests[0].error({ code: 1 });
    h.controller.destroy();
    const snapshot = [h.states.length, h.positions.length, h.recenters.length, h.clears];
    h.controller.destroy();
    h.controller.toggle();
    h.controller.stopFollowing();
    h.requests[0]?.success(position());
    h.requests[0]?.error({ code: 1 });
    assert.deepEqual([h.states.length, h.positions.length, h.recenters.length, h.clears], snapshot);
    assert.deepEqual(h.cleared, stage === 'idle' ? [] : [0]);
    assert.equal(h.requests.length, stage === 'idle' ? 0 : 1);
  });
}

for (const options of [{ secure: false }, { supported: false }]) {
  test(`unsupported environment stays unavailable: ${JSON.stringify(options)}`, (t) => {
    const h = setup(t, options);
    assert.equal(h.state, 'unavailable');
    h.controller.toggle();
    h.controller.stopFollowing();
    assert.equal(h.state, 'unavailable');
    assert.equal(h.requests.length, 0);
  });
}

test('a synchronous request exception is recoverable', (t) => {
  const h = setup(t);
  h.onWatch = () => { throw new DOMException('Denied', 'NotAllowedError'); };
  h.controller.toggle();
  assert.equal(h.state, 'error');
  assert.match(h.message, /denied/);
  h.onWatch = undefined;
  h.controller.toggle();
  h.requests[1].success(position());
  assert.equal(h.state, 'following');
});

test('a synchronous error callback clears the watch ID when it returns', (t) => {
  const h = setup(t);
  h.onWatch = (_success, error) => error({ code: 1 });
  h.controller.toggle();
  assert.equal(h.state, 'error');
  assert.deepEqual(h.cleared, [0]);
});

test('a request cancelled before its watch ID returns is still cleared', (t) => {
  const h = setup(t);
  h.onWatch = () => h.controller.destroy();
  h.controller.toggle();
  assert.deepEqual(h.cleared, [0]);
  h.requests[0].success(position());
  assert.equal(h.positions.length, 0);
});

async function compileComponent(name: string, replacements: Record<string, string> = {}) {
  const filename = pathToFileURL(resolve('src/lib/map', `${name}.svelte`));
  const source = await readFile(filename, 'utf8');
  let { js: { code } } = compile(source, { filename: filename.pathname, generate: 'server' });
  // Data URLs have no package resolution base, so make runtime imports absolute.
  for (const specifier of ['svelte/internal/server', 'svelte/internal/flags/legacy']) {
    code = code.replaceAll(`'${specifier}'`, JSON.stringify(import.meta.resolve(specifier)));
  }
  for (const [specifier, url] of Object.entries(replacements)) {
    code = code.replaceAll(`'${specifier}'`, JSON.stringify(url));
  }
  return asModule(code);
}

const buttonModule = await compileComponent('MapButton');
const controlModule = await compileComponent('GeolocationControl', { './MapButton.svelte': buttonModule });
const { default: GeolocationControl } = await import(controlModule) as {
  default: Component<{ state: GeolocationState; onclick: () => void }>;
};

for (const state of ['idle', 'locating', 'following', 'background', 'error', 'unavailable'] as const) {
  test(`control accessibility and availability in ${state}`, () => {
    const { body } = render(GeolocationControl, { props: { state, onclick() {} } });
    const match = body.match(/<button\b[^>]*>/);
    assert.ok(match);
    const button = match[0];
    assert.equal(/\sdisabled(?:\s|=|>)/.test(button), state === 'unavailable');
    assert.ok(button.includes(`aria-busy="${state === 'locating'}"`));
    assert.ok(button.includes(`aria-pressed="${['locating', 'following', 'background'].includes(state)}"`));
    assert.match(button, /aria-label="[^"]+"/);
    if (state === 'error') assert.match(button, /Retry finding my location/);
    if (state === 'background') assert.match(button, /Recenter on my location/);
  });
}
