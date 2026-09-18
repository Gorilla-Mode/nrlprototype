<script lang="ts">
  import type { Draft } from './types';
  import { geometryTypeFor } from './types';

  export let draft: Draft;
  export let onBack: () => void = () => {};

  $: geometryType = geometryTypeFor(draft.category);

  $: missingFields = [
    { label: 'height above ground', missing: draft.heightAboveGround === 'Not set' },
    { label: 'lighting', missing: draft.lighting === 'Not set' }
  ].filter(f => f.missing);

  $: canSend = missingFields.length === 0;

  $: locationCaption = draft.coordinates
    ? `${draft.coordinates.lat.toFixed(4)}° N, ${draft.coordinates.lng.toFixed(4)}° E · ${draft.vertexCount} ${draft.vertexCount === 1 ? 'vertex' : 'vertices'}`
    : 'Location not set';

  const heightOptions = [
    'Not set',
    '49 ft (15 m)',
    '98 ft (30 m)',
    '148 ft (45 m)',
    '197 ft (60 m)',
    '328 ft (100 m)',
    '492 ft (150 m)'
  ];

  const lightingOptions = [
    'Not set',
    'No lighting',
    'Steady red light',
    'Flashing red light',
    'Flashing white light',
    'Unknown'
  ];
</script>

<section class="page">
  <div class="safe-area">
    <header class="header">
      <div class="left">
        <button class="back" on:click={onBack}>‹ Reports</button>
      </div>
      <span class="badge">Draft</span>
    </header>

    <h1>{draft.title}</h1>
    <div class="subtitle">{geometryType} · {draft.category} · {draft.value}</div>

    <div class="fields-row">
      <div class="field-box">
        <div class="field-label">TYPE</div>
        <div class="field-value">{draft.category}</div>
        <div class="field-caption muted">{geometryType} geometry</div>
      </div>

      <div class="field-box" class:missing={draft.heightAboveGround === 'Not set'}>
        <div class="field-label">HEIGHT ABOVE GROUND</div>
        <div class="field-value select-wrap">
          <select bind:value={draft.heightAboveGround}>
            {#each heightOptions as option}
              <option value={option}>{option}</option>
            {/each}
          </select>
          <span class="chev">⌄</span>
        </div>
        <div class="field-caption muted">Highest point reported</div>
      </div>

      <div class="field-box" class:missing={draft.lighting === 'Not set'}>
        <div class="field-label">LIGHTING</div>
        <div class="field-value select-wrap">
          <select bind:value={draft.lighting}>
            {#each lightingOptions as option}
              <option value={option}>{option}</option>
            {/each}
          </select>
          <span class="chev">⌄</span>
        </div>
        <div class="field-caption muted">Marking on the obstacle</div>
      </div>
    </div>

    {#if !canSend}
      <div class="needed-box">
        <div class="needed-title">{missingFields.length} {missingFields.length === 1 ? 'field' : 'fields'} still needed</div>
        <div class="needed-desc muted">Fill in the fields marked in red above, then send.</div>
      </div>
    {/if}

    <div class="section-label">DESCRIPTION AND REPORTER</div>
    <hr class="divider" />

    <label class="pilot-label" for="pilot-report">What the pilot reported</label>
    <textarea id="pilot-report" class="pilot-report" bind:value={draft.pilotReportText}></textarea>

    <div class="reporter-row">
      <span class="muted">Reported by</span>
      <span class="reporter-name">{draft.reportedByName} · {draft.reportedByOrg}</span>
    </div>

    <div class="two-col">
      <div class="panel">
        <div class="field-label">LOCATION</div>
        <div class="map-preview">
          {#if draft.coordinates}
            <span class="pin">📍</span>
          {/if}
        </div>
        <div class="map-caption muted">{locationCaption}</div>
      </div>

      <div class="panel">
        <div class="field-label">ACTIVITY</div>
        <ul class="activity-list">
          <li>
            <span class="dot"></span>
            <div>
              <div class="activity-title">Report created</div>
              <div class="activity-date muted">{draft.createdDate}</div>
            </div>
          </li>
          <li>
            <span class="dot"></span>
            <div>
              <div class="activity-title">Last edited</div>
              <div class="activity-date muted">{draft.editedDate}</div>
            </div>
          </li>
        </ul>
      </div>
    </div>

    <div class="actions">
      <button class="secondary">Send report</button>
      <div class="primary-wrap">
        <button class="primary" disabled={!canSend}>
          <span class="paper-plane">➤</span> Send Report
        </button>
        <div class="primary-note">
          <div class="note-strong">Goes straight to the NRL reviewer</div>
          <div class="muted">You cannot edit the report after sending</div>
        </div>
      </div>
    </div>
  </div>
</section>

<style>
  :global(:root) { --bg:#F7F7F8; --muted:#8E8E93; --text:#1C1C1E; --blue:#2F6FED; --green:#2E7D5B; --red:#E0483C; --card-border:#E5E5EA; }

  .page { width:100%; min-height:100vh; background:#fff; display:flex; align-items:flex-start; justify-content:center }
  .safe-area { width:100%; max-width:1100px; padding:28px 32px 48px; }

  .header { display:flex; align-items:center; justify-content:space-between; margin-bottom:10px }
  .back { background:transparent; border:0; color:var(--blue); font-weight:600; font-size:15px; cursor:pointer; padding:0 }
  .badge { background:#EFEFF0; color:#3A3A3C; padding:6px 10px; border-radius:999px; font-size:12px }

  h1 { margin:0 0 4px; font-size:26px; color:var(--text) }
  .subtitle { color:var(--muted); font-size:14px; margin-bottom:20px }
  .muted { color:var(--muted) }

  .fields-row { display:grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap:14px; margin-bottom:16px }
  .field-box { border:1px solid var(--card-border); border-radius:12px; padding:14px; background:#fff }
  .field-box.missing { border-color: var(--red) }
  .field-label { font-size:11px; font-weight:700; letter-spacing:0.06em; color:var(--muted); margin-bottom:6px }
  .field-value { font-size:17px; font-weight:700; color:var(--text); display:flex; align-items:center; justify-content:space-between }
  .chev { color:var(--muted); font-weight:400; pointer-events:none }
  .field-caption { font-size:12px; margin-top:4px }

  .select-wrap { position:relative }
  .select-wrap select {
    -webkit-appearance:none; appearance:none;
    width:100%; border:0; background:transparent; padding:0; margin:0;
    font:inherit; font-size:17px; font-weight:700; color:var(--text);
    cursor:pointer;
  }
  .select-wrap select:focus { outline:none }
  .select-wrap .chev { position:absolute; right:0; top:50%; transform:translateY(-50%) }

  .needed-box { border:1px solid var(--card-border); border-radius:12px; padding:14px 16px; margin-bottom:20px }
  .needed-title { font-weight:700; color:var(--text); margin-bottom:4px }
  .needed-desc { font-size:14px }

  .section-label { font-size:12px; font-weight:700; letter-spacing:0.06em; color:var(--muted); margin-top:8px }
  .divider { border:0; height:1px; background:#E9E9EB; margin:8px 0 16px }

  .pilot-label { display:block; font-size:14px; color:var(--text); margin-bottom:8px }
  .pilot-report { width:100%; min-height:70px; resize:vertical; background:#F2F2F7; border:1px solid transparent; border-radius:10px; padding:12px; font:inherit; box-sizing:border-box }

  .reporter-row { display:flex; justify-content:space-between; align-items:center; font-size:14px; margin:14px 0 20px }
  .reporter-name { font-weight:700; color:var(--text) }

  .two-col { display:grid; grid-template-columns: 1fr 1fr; gap:16px; margin-bottom:24px }
  .panel { border:1px solid var(--card-border); border-radius:12px; padding:14px }

  .map-preview { margin-top:8px; height:120px; border-radius:10px; background: linear-gradient(135deg, #E7F0FA 0%, #EFEAD9 100%); display:flex; align-items:center; justify-content:center }
  .pin { font-size:28px }
  .map-caption { font-size:12px; margin-top:8px }

  .activity-list { list-style:none; margin:8px 0 0; padding:0; display:flex; flex-direction:column; gap:14px }
  .activity-list li { display:flex; align-items:flex-start; gap:10px }
  .dot { width:8px; height:8px; border-radius:50%; background:#C7C7CC; margin-top:6px; flex-shrink:0 }
  .activity-title { font-weight:700; font-size:14px; color:var(--text) }
  .activity-date { font-size:12px; margin-top:2px }

  .actions { display:flex; justify-content:space-between; align-items:flex-end; flex-wrap:wrap; gap:16px }
  .secondary { background:#fff; border:1px solid var(--card-border); border-radius:10px; padding:12px 20px; font-weight:600; cursor:pointer }
  .primary-wrap { display:flex; flex-direction:column; align-items:flex-end; gap:8px }
  .primary { background:var(--green); color:#fff; border:0; border-radius:10px; padding:12px 22px; font-weight:700; display:flex; align-items:center; gap:8px; cursor:pointer }
  .primary:disabled { opacity:0.5; cursor:not-allowed }
  .paper-plane { transform:rotate(45deg); display:inline-block }
  .primary-note { text-align:right; font-size:12px }
  .note-strong { font-weight:700; color:var(--text) }

  @media (max-width:800px) {
    .fields-row { grid-template-columns: 1fr }
    .two-col { grid-template-columns: 1fr }
  }
</style>
