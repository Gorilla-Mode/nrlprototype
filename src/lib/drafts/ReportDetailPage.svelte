<script lang="ts">
  import type { Report } from './types';
  import { geometryTypeFor, heightOptions, lightingOptions, lightingSummary } from './types';

  export let report: Report;
  export let onBack: () => void = () => {};
  export let onEdit: () => void = () => {};

  let editing = false;

  const toggleEditing = () => {
    editing = !editing;
    if (editing) onEdit();
  };

  $: geometryType = geometryTypeFor(report.category);

  $: locationCaption = report.coordinates
    ? `${report.coordinates.lat.toFixed(4)}° N, ${report.coordinates.lng.toFixed(4)}° E · ${report.vertexCount} ${report.vertexCount === 1 ? 'vertex' : 'vertices'}`
    : 'Location not set';

  $: descriptionStatus = report.pilotReportText.trim() ? 'Added' : 'Not added';
</script>

<section class="page">
  <header class="top-bar">
    <div class="top-bar-inner">
      <button class="back" on:click={onBack}>‹ Reports</button>
      <span class="badge">Ready</span>
    </div>
    <div class="top-bar-inner title-row">
      <div>
        <h1>{report.title}</h1>
        <div class="subtitle">{geometryType} · {report.category} · {report.value}</div>
      </div>
    </div>
  </header>

  <div class="scroll-area">
    <div class="safe-area">
      <div class="fields-row">
        <div class="field-box">
          <div class="field-label">TYPE</div>
          <div class="field-value">{report.category}</div>
          <div class="field-caption muted">{geometryType} geometry</div>
        </div>

        <div class="field-box">
          <div class="field-label">HEIGHT ABOVE GROUND</div>
          {#if editing}
            <div class="field-value select-wrap">
              <select bind:value={report.heightAboveGround}>
                {#each heightOptions as option}
                  <option value={option}>{option}</option>
                {/each}
              </select>
              <span class="chev">⌄</span>
            </div>
          {:else}
            <div class="field-value">{report.heightAboveGround}</div>
          {/if}
          <div class="field-caption muted">Highest point reported</div>
        </div>

        <div class="field-box">
          <div class="field-label">LIGHTING</div>
          {#if editing}
            <div class="field-value select-wrap">
              <select bind:value={report.lighting}>
                {#each lightingOptions as option}
                  <option value={option}>{option}</option>
                {/each}
              </select>
              <span class="chev">⌄</span>
            </div>
          {:else}
            <div class="field-value">{report.lighting}</div>
          {/if}
          <div class="field-caption muted">Marking on the obstacle</div>
        </div>
      </div>

      <div class="ready-card">
        <div class="ready-title">Ready to send for review</div>
        <div class="ready-desc muted">Everything the reviewer needs is filled in.</div>

        <div class="summary-grid">
          <div class="summary-item">
            <div class="summary-label">Geometry drawn on map</div>
            <div class="summary-value muted">{locationCaption}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">Height above ground</div>
            <div class="summary-value muted">{report.heightAboveGround}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">Lighting</div>
            <div class="summary-value muted">{lightingSummary(report.lighting)}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">Description</div>
            <div class="summary-value muted">{descriptionStatus}</div>
          </div>
        </div>
      </div>

      <div class="info-card">
        <div class="section-label">DESCRIPTION AND REPORTER</div>
        <hr class="divider" />

        {#if editing}
          <label class="pilot-label" for="pilot-report">What the pilot reported</label>
          <textarea id="pilot-report" class="pilot-report-input" bind:value={report.pilotReportText}></textarea>
        {:else}
          <div class="pilot-label">What the pilot reported</div>
          <p class="pilot-report">{report.pilotReportText}</p>
        {/if}

        <div class="reporter-row">
          <span class="muted">Reported by</span>
          <span class="reporter-name">{report.reportedByName} · {report.reportedByOrg}</span>
        </div>
      </div>

      <div class="two-col">
        <div class="panel">
          <div class="field-label">LOCATION</div>
          <div class="map-preview">
            {#if geometryType === 'Line'}
              <svg class="route-line" viewBox="0 0 200 120" preserveAspectRatio="none" aria-hidden="true">
                <path d="M10 95 C 55 105, 85 45, 130 55 S 175 25, 195 12" />
              </svg>
            {/if}
            {#if report.coordinates}
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
                <div class="activity-date muted">{report.createdDate}</div>
              </div>
            </li>
            <li>
              <span class="dot"></span>
              <div>
                <div class="activity-title">Last edited</div>
                <div class="activity-date muted">{report.editedDate}</div>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>

  <footer class="bottom-bar">
    <div class="actions">
      <button class="secondary" on:click={toggleEditing}>{editing ? 'Done editing' : 'Edit report'}</button>
      <div class="primary-wrap">
        <button class="primary">
          <span class="paper-plane">➤</span> Send for review
        </button>
        <div class="primary-note">
          <div class="note-strong">Goes straight to the NRL reviewer</div>
          <div class="muted">You cannot edit the report after sending</div>
        </div>
      </div>
    </div>
  </footer>
</section>

<style>
  .page {
    position: fixed; inset: 0; z-index: var(--layer-dialog);
    display: flex; flex-direction: column;
    background: var(--color-background-page);
  }

  .top-bar { flex-shrink: 0; background: var(--color-background-raised); border-bottom: var(--border-default); }
  .top-bar-inner { width:100%; max-width:1100px; margin:0 auto; padding:20px 32px 0; box-sizing:border-box; display:flex; align-items:center; justify-content:space-between; }
  .top-bar-inner.title-row { padding-top:4px; padding-bottom:20px; display:block }

  .back { background:transparent; border:0; color:var(--color-action-secondary); font-weight:600; font-size:15px; cursor:pointer; padding:0 }
  .badge { background:var(--color-status-info-surface); color:var(--color-status-info); padding:6px 10px; border-radius:999px; font-size:12px; font-weight:600 }

  h1 { margin:0 0 4px; font-size:26px; color:var(--color-text-primary) }
  .subtitle { color:var(--color-text-secondary); font-size:14px }
  .muted { color:var(--color-text-secondary) }

  .scroll-area { flex:1; overflow-y:auto; overscroll-behavior:contain; }
  .safe-area { width:100%; max-width:1100px; margin:0 auto; padding:24px 32px 32px; box-sizing:border-box; }

  .fields-row { display:grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap:14px; margin-bottom:16px }
  .field-box { border:var(--border-default); border-radius:12px; padding:14px; background:var(--color-background-raised) }
  .field-label { font-size:11px; font-weight:700; letter-spacing:0.06em; color:var(--color-text-secondary); margin-bottom:6px }
  .field-value { font-size:17px; font-weight:700; color:var(--color-text-primary) }
  .field-caption { font-size:12px; margin-top:4px }

  .select-wrap { position:relative; display:flex; align-items:center; justify-content:space-between }
  .select-wrap select {
    -webkit-appearance:none; appearance:none;
    width:100%; border:0; background:transparent; padding:0; margin:0;
    font:inherit; font-size:17px; font-weight:700; color:var(--color-text-primary);
    cursor:pointer;
  }
  .select-wrap select:focus { outline:none }
  .select-wrap .chev { position:absolute; right:0; top:50%; transform:translateY(-50%); color:var(--color-text-secondary); font-weight:400; pointer-events:none }

  .ready-card { border:var(--border-default); border-radius:12px; padding:16px; margin-bottom:24px; background:var(--color-background-raised) }
  .ready-title { font-weight:700; font-size:17px; color:var(--color-text-primary) }
  .ready-desc { font-size:14px; margin-top:2px }

  .summary-grid { display:grid; grid-template-columns: 1fr 1fr; gap:16px 24px; margin-top:16px }
  .summary-label { font-weight:700; font-size:14px; color:var(--color-text-primary) }
  .summary-value { font-size:13px; margin-top:2px }

  .info-card { border:var(--border-default); border-radius:12px; padding:16px; margin-bottom:24px; background:var(--color-background-raised) }

  .section-label { font-size:12px; font-weight:700; letter-spacing:0.06em; color:var(--color-text-secondary); margin-top:8px }
  .divider { border:0; height:1px; background:var(--color-border-default); margin:8px 0 16px }

  .pilot-label { display:block; font-size:14px; color:var(--color-text-primary); margin-bottom:8px }
  .pilot-report { margin:0; font-size:15px; line-height:1.5; color:var(--color-text-primary) }
  .pilot-report-input { width:100%; min-height:70px; resize:vertical; background:var(--color-background-subtle); border:1px solid transparent; border-radius:10px; padding:12px; font:inherit; font-size:15px; box-sizing:border-box }

  .reporter-row { display:flex; justify-content:space-between; align-items:center; font-size:14px; margin:14px 0 0; padding-top:14px; border-top:var(--border-default) }
  .reporter-name { font-weight:700; color:var(--color-text-primary) }

  .two-col { display:grid; grid-template-columns: 1fr 1fr; gap:16px }
  .panel { border:var(--border-default); border-radius:12px; padding:14px; background:var(--color-background-raised) }

  .map-preview { position:relative; margin-top:8px; height:120px; border-radius:10px; overflow:hidden; background: linear-gradient(135deg, var(--color-status-info-surface) 0%, var(--color-status-warning-surface) 100%); display:flex; align-items:center; justify-content:center }
  .route-line { position:absolute; inset:0; width:100%; height:100%; }
  .route-line path { fill:none; stroke: var(--color-map-line); stroke-width:4; stroke-linecap:round; }
  .pin { font-size:28px; position:relative; }
  .map-caption { font-size:12px; margin-top:8px }

  .activity-list { list-style:none; margin:8px 0 0; padding:0; display:flex; flex-direction:column; gap:14px }
  .activity-list li { display:flex; align-items:flex-start; gap:10px }
  .dot { width:8px; height:8px; border-radius:50%; background:var(--color-border-strong); margin-top:6px; flex-shrink:0 }
  .activity-title { font-weight:700; font-size:14px; color:var(--color-text-primary) }
  .activity-date { font-size:12px; margin-top:2px }

  .bottom-bar { flex-shrink:0; background:var(--color-background-raised); border-top:var(--border-default); }
  .actions { width:100%; max-width:1100px; margin:0 auto; padding:16px 32px; box-sizing:border-box; display:flex; justify-content:space-between; align-items:flex-end; flex-wrap:wrap; gap:16px }
  .secondary { background:var(--color-background-raised); border:var(--border-default); border-radius:10px; padding:12px 20px; font-weight:600; cursor:pointer; color:var(--color-text-primary) }
  .primary-wrap { display:flex; flex-direction:column; align-items:flex-end; gap:8px }
  .primary { background:var(--color-action-primary); color:var(--color-action-primary-text); border:0; border-radius:10px; padding:12px 22px; font-weight:700; display:flex; align-items:center; gap:8px; cursor:pointer }
  .paper-plane { transform:rotate(45deg); display:inline-block }
  .primary-note { text-align:right; font-size:12px }
  .note-strong { font-weight:700; color:var(--color-text-primary) }

  @media (max-width:800px) {
    .fields-row { grid-template-columns: 1fr }
    .two-col { grid-template-columns: 1fr }
    .summary-grid { grid-template-columns: 1fr }
  }
</style>
