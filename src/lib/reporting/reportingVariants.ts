import type { Component } from 'svelte';
import ObstacleDetailsKeypad from './ObstacleDetailsKeypad.svelte';
import ObstacleDetails from './ObstacleDetails.svelte';
import ObstacleReportPanel from './ObstacleReportPanel.svelte';
import ObstacleReportPanelKeypad from './ObstacleReportPanelKeypad.svelte';
import { detailsRoute, additionalInformationRoute, type ReportingVariant } from './reporting.js';
import type { ReportingVariantProps } from './reportingVariantProps.js';

// Add a view and its ordered routes here to make another reporting flow selectable.
export const reportingVariants = [
  { id: 'one-step', label: 'One step — scrolling', component: ObstacleReportPanel, stepRoutes: [detailsRoute] },
  { id: 'one-step-keypad', label: 'One step — keypad', component: ObstacleReportPanelKeypad, stepRoutes: [detailsRoute] },
  { id: 'two-step', label: 'Two steps', component: ObstacleDetails, stepRoutes: [detailsRoute, additionalInformationRoute] },
  { id: 'two-step-keypad', label: 'Two steps — keypad', component: ObstacleDetailsKeypad, stepRoutes: [detailsRoute, additionalInformationRoute] },
] as const satisfies readonly (ReportingVariant & { component: Component<ReportingVariantProps> })[];
