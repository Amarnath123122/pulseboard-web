import { bootstrapApplication } from '@angular/platform-browser';
import { PULSEBOARD_CONFIG, PulseboardConfig } from 'data-access';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';

// API endpoints are read at runtime from /config.json, so one build runs against any backend.
fetch('/config.json', { cache: 'no-store' })
  .then((r) => r.json() as Promise<PulseboardConfig>)
  .then((config) =>
    bootstrapApplication(AppComponent, {
      providers: [...appConfig.providers, { provide: PULSEBOARD_CONFIG, useValue: config }],
    }),
  )
  .catch((err) => {
    document.body.innerHTML = '<p style="font-family:sans-serif;padding:24px">Pulseboard could not load its configuration.</p>';
    console.error(err);
  });
