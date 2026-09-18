import type { DetailsDraft } from './createDetailsController.js';
import type { ObstacleType } from './obstacle.js';

/** Every reporting view consumes the same draft and controller commands. */
export interface ReportingVariantProps {
  draft: DetailsDraft;
  open: boolean;
  step: number;
  totalSteps: number;
  busy: boolean;
  error: string;
  ontype: (type: ObstacleType) => void;
  onheight: (height: number) => void;
  onillumination: () => void;
  onabsence: (notPresent: boolean) => void;
  oncustomtype: (value: string) => void;
  ondescription: (value: string) => void;
  onphotos: (files: readonly File[]) => void;
  onremovephoto: (index: number) => void;
  onsave: () => void;
  oncontinue: () => void;
  onfinish: () => void;
  onback: () => void;
  ondismiss: () => void;
}
