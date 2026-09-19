import type { Component } from 'svelte';
import ObstacleDetails from './ObstacleDetails.svelte';
import ObstacleReportPanel from './ObstacleReportPanel.svelte';
import { detailsRoute, additionalInformationRoute, type ReportingVariant } from './reporting.js';
import type { ReportingVariantProps } from './reportingVariantProps.js';

// Add a view and its ordered routes here to make another reporting flow selectable.
export const reportingVariants = [
  { id: 'one-step', label: 'One step', component: ObstacleReportPanel, stepRoutes: [detailsRoute] },
  { id: 'two-step', label: 'Two steps', component: ObstacleDetails, stepRoutes: [detailsRoute, additionalInformationRoute] },
] as const satisfies readonly (ReportingVariant & { component: Component<ReportingVariantProps> })[];
