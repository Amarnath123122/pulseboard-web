import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from './api.service';
import { Meta } from './models';

/** App metadata (regions, units, areas, page sizes…) loaded once per session from /api/v1/meta. */
@Injectable({ providedIn: 'root' })
export class MetaService {
  private readonly api = inject(ApiService);
  readonly meta = signal<Meta | null>(null);

  load(force = false): void {
    if (this.meta() && !force) return;
    this.api.meta().subscribe({ next: (m) => this.meta.set(m) });
  }
}
