<script lang="ts">
  import { tick } from 'svelte';
  import Lightbox from '../map/Lightbox.svelte';
  import { maxPhotos } from '../reporting/createDetailsController';
  import { downscalePhoto, releasePhoto, type ReportPhoto } from './photos';

  interface Props {
    photos: ReportPhoto[];
    /** Adding and removing are only offered while editing; photos can always be viewed. */
    editable: boolean;
    /** Report or draft name, used in labels and the viewer title. */
    label: string;
  }

  let { photos = $bindable(), editable, label }: Props = $props();

  // Same glyphs as "Take photo" in the reporting panel and the app's close buttons.
  const cameraIcon = 'M4 8h3l2-2h6l2 2h3v11H4ZM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z';
  const plusIcon = 'M12 5v14M5 12h14';
  const closeIcon = 'm6 6 12 12M6 18 18 6';

  let input = $state<HTMLInputElement | undefined>();
  let addButton = $state<HTMLButtonElement | undefined>();
  let thumbButtons = $state<HTMLButtonElement[]>([]);
  let busy = $state(false);
  let message = $state('');
  let viewing = $state<number | null>(null);

  let caption = $derived.by(() => {
    if (busy) return 'Adding photo…';
    if (!photos.length) return 'Optional';
    if (editable) return `${photos.length} of ${maxPhotos} · Optional`;
    return `${photos.length} ${photos.length === 1 ? 'photo' : 'photos'}`;
  });

  async function addFiles(event: Event & { currentTarget: HTMLInputElement }) {
    const files = Array.from(event.currentTarget.files ?? []);
    event.currentTarget.value = '';
    if (!files.length) return;
    const room = maxPhotos - photos.length;
    busy = true;
    message = files.length > room ? `You can attach up to ${maxPhotos} photos.` : '';
    const added: ReportPhoto[] = [];
    for (const file of files.slice(0, room)) {
      try {
        added.push(await downscalePhoto(file));
      } catch {
        message = `Could not read ${file.name}. Try another photo.`;
      }
    }
    photos = [...photos, ...added];
    busy = false;
  }

  async function remove(index: number) {
    releasePhoto(photos[index]);
    photos = photos.filter((_, position) => position !== index);
    message = '';
    await tick();
    (thumbButtons[Math.min(index, photos.length - 1)] ?? addButton)?.focus({ preventScroll: true });
  }

  async function closeViewer() {
    const index = viewing;
    viewing = null;
    await tick();
    if (index !== null) thumbButtons[index]?.focus({ preventScroll: true });
  }
</script>

{#if editable}
  <input bind:this={input} type="file" accept="image/*" capture="environment" multiple hidden onchange={addFiles} />
{/if}

{#if photos.length}
  <ul class="photo-list" aria-label="Photos">
    {#each photos as photo, index (photo.id)}
      <li class="photo-item">
        <button bind:this={thumbButtons[index]} type="button" class="photo-thumb" aria-haspopup="dialog"
          aria-label={`View photo ${index + 1}: ${photo.name}`} onclick={() => (viewing = index)}>
          <img src={photo.url} alt="" />
        </button>
        {#if editable}
          <button type="button" class="photo-remove" aria-label={`Remove photo ${index + 1}: ${photo.name}`} onclick={() => remove(index)}>
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d={closeIcon} /></svg>
          </button>
        {/if}
      </li>
    {/each}
    {#if editable && photos.length < maxPhotos}
      <li class="photo-item">
        <button bind:this={addButton} type="button" class="photo-add-more" aria-label="Add another photo" disabled={busy} onclick={() => input?.click()}>
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d={plusIcon} /></svg>
        </button>
      </li>
    {/if}
  </ul>
{:else if editable}
  <button bind:this={addButton} type="button" class="photo-add" disabled={busy} onclick={() => input?.click()}>
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d={cameraIcon} /></svg>
    Add photo
  </button>
{:else}
  <div class="photo-none">No photo</div>
{/if}

<div class="photo-caption" aria-live="polite">{caption}</div>
{#if message}<div class="photo-message" role="status">{message}</div>{/if}

{#if viewing !== null && photos[viewing]}
  <Lightbox title={`${label} · photo ${viewing + 1} of ${photos.length}`} closeLabel="Close photo" onclose={closeViewer}>
    <img class="photo-full" src={photos[viewing].url} alt={photos[viewing].name} />
  </Lightbox>
{/if}

<style>
  svg { flex: none; width: var(--icon-size-default); height: var(--icon-size-default); stroke: currentColor; stroke-width: var(--icon-stroke-width); stroke-linecap: round; stroke-linejoin: round; }

  .photo-add {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    width: 100%;
    min-height: var(--target-size-min);
    border: var(--border-default);
    border-radius: var(--radius-control);
    background: var(--color-background-raised);
    color: var(--color-text-primary);
    font-size: var(--font-size-body-small);
    font-weight: var(--font-weight-semibold);
    cursor: pointer;
  }
  .photo-add:not(:disabled):hover, .photo-add-more:not(:disabled):hover { background: var(--color-map-control-hover); }

  .photo-none { min-height: var(--target-size-min); display: flex; align-items: center; font-size: var(--font-size-body); font-weight: var(--font-weight-semibold); color: var(--color-text-primary); }

  .photo-list { display: flex; flex-wrap: wrap; gap: var(--space-2); margin: 0; padding: 0; list-style: none; }
  .photo-item { position: relative; }
  .photo-thumb, .photo-add-more {
    display: grid;
    place-items: center;
    width: calc(var(--target-size-min) + var(--space-4));
    height: calc(var(--target-size-min) + var(--space-4));
    padding: 0;
    overflow: hidden;
    border: var(--border-default);
    border-radius: var(--radius-control);
    background: var(--color-background-subtle);
    color: var(--color-text-secondary);
    cursor: pointer;
  }
  .photo-thumb { cursor: zoom-in; }
  .photo-thumb img { width: 100%; height: 100%; object-fit: cover; }
  .photo-add-more { border-style: dashed; background: var(--color-background-raised); }

  /* Small visual badge on the corner; the ::before extends its target to 44px. */
  .photo-remove {
    position: absolute;
    top: calc(-1 * var(--space-2));
    right: calc(-1 * var(--space-2));
    display: grid;
    place-items: center;
    width: var(--space-6);
    height: var(--space-6);
    padding: 0;
    border: var(--border-default);
    border-radius: var(--radius-round);
    background: var(--color-background-raised);
    color: var(--color-text-primary);
    box-shadow: var(--shadow-control);
    cursor: pointer;
  }
  .photo-remove::before { content: ''; position: absolute; inset: calc((var(--space-6) - var(--target-size-min)) / 2); }
  .photo-remove svg { width: var(--space-4); height: var(--space-4); }
  .photo-remove:hover { background: var(--color-map-control-hover); }

  .photo-caption, .photo-message { margin-top: var(--space-1); font-size: var(--font-size-caption); color: var(--color-text-secondary); }
  .photo-message { color: var(--color-status-error); }

  .photo-full { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; background: var(--color-background-subtle); }
</style>
