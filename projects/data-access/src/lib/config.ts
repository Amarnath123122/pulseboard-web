import { InjectionToken } from '@angular/core';

export interface PulseboardConfig {
  apiUrl: string;
  wsUrl: string;
}

export const PULSEBOARD_CONFIG = new InjectionToken<PulseboardConfig>('PULSEBOARD_CONFIG');
