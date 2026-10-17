import { InjectionToken } from '@angular/core';

/** Runtime endpoints (from /config.json). Empty strings mean "same origin", i.e. behind the gateway. */
export interface PulseboardConfig {
  apiUrl: string;
  authUrl: string;
  wsUrl: string;
}

export const PULSEBOARD_CONFIG = new InjectionToken<PulseboardConfig>('PULSEBOARD_CONFIG');
