<script lang="ts">
  import { tick } from 'svelte';
  import ReportSummaryDialog, { type SummaryRow } from './ReportSummaryDialog.svelte';
  import LocationEditor from '../map/LocationEditor.svelte';
  import { obstacleGeometryChoices, obstacleTypeChoices, ObstacleType, type ObstacleGeometry } from './obstacle';
  import { illuminationLabels, type CompleteReport } from './createDetailsController';

  let { report, totalSteps, onedit, ongeometry, onsend, oncontinue, onclose }: {
    report: CompleteReport;
    /** Steps in the flow that produced the report; optional details are on the last one. */
    totalSteps: number;
    /** Reopens the reporting step that holds a row's value. */
    onedit: (step: number) => void;
    /** A new location from the location editor; the summary stays open. */
    ongeometry: (geometry: ObstacleGeometry) => void;
    /** Sends the saved report for review. */
    onsend: () => void;
    /** Back to the map; the report stays saved, not sent. */
    oncontinue: () => void;
    /** X and Escape: back to the map; the report stays saved. */
    onclose: () => void;
  } = $props();
  let geometryChoice = $derived(obstacleGeometryChoices.find((choice) => choice.type === report.obstacle_position.type));
  let typeChoice = $derived(obstacleTypeChoices.find((choice) => choice.type === report.type));
  let editingGeometry = $state(false);
  let summary = $state<ReportSummaryDialog>();
  const editStep = (step: number) => ({ onclick: () => onedit(step) });
  // Geometry is drawn on the map, not in a reporting step; it is edited in the location editor.
  let rows = $derived<SummaryRow[]>([
    { key: 'geometry', label: 'Geometry', value: geometryChoice?.label ?? '—', edit: { onclick: () => { editingGeometry = true; }, haspopup: 'dialog' } },
    { key: 'type', label: 'Obstacle type', value: report.type === ObstacleType.Other ? (report.customType || 'Other') : (typeChoice?.label ?? '—'), edit: editStep(1) },
    { key: 'height', label: 'Height', value: report.height + ' m', edit: editStep(1) },
    { key: 'lighting', label: 'Lighting', value: illuminationLabels[report.illumination], edit: editStep(1) },
    { key: 'description', label: 'Description', value: report.description || 'Not added', edit: editStep(totalSteps) },
    { key: 'photos', label: 'Photos', value: report.photos.length ? report.photos.map((photo) => photo.name).join(', ') : 'Not added', edit: editStep(totalSteps) },
  ]);

  async function closeGeometryEditor() {
    editingGeometry = false;
    await tick();
    summary?.focusEdit('geometry');
  }

  function useGeometry(geometry: ObstacleGeometry) {
    ongeometry(geometry);
    void closeGeometryEditor();
  }
</script>

<ReportSummaryDialog bind:this={summary} title="Report saved – not sent yet" {rows} {oncontinue} {onsend} {onclose}>
  {#if editingGeometry}
    <LocationEditor geometry={report.obstacle_position} onuse={useGeometry} oncancel={closeGeometryEditor} />
  {/if}
</ReportSummaryDialog>
