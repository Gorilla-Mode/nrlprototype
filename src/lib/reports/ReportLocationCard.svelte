<script lang="ts">
  import MiniMap from '../map/MiniMap.svelte';
  import type { Report } from './reportsData';
  import { locationLine, mapViewerText } from './reportDetail';

  /**
   * The report detail page's Location card: the report map, which opens a read-only viewer when
   * tapped or through Enlarge, and the place and coordinates under it. The location is changed
   * only through Edit report.
   */
  let { report, label }: { report: Report; label: string } = $props();

  let record = $derived(report.errorReport);
  // An error report that moves the obstacle shows the registered position too, with the legend.
  let registered = $derived(record?.answers.errorKinds.includes('wrong-position') && record.answers.correctedPosition
    ? { lat: record.obstacle.lat, lng: record.obstacle.lng } : null);
</script>

<section class="report-detail-card report-detail-aside" aria-labelledby="detail-location-heading">
  <h2 class="report-detail-card-heading" id="detail-location-heading">Location</h2>
  <MiniMap geometry={report.geometry} {label} {registered} caption={locationLine(report)} viewer={mapViewerText(report)} />
</section>
