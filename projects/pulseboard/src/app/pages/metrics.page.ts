import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ApiService, MetaService, Metric, MetricQuery, Page, ToastService } from 'data-access';
import { PagerComponent } from './pager.component';
import { Subject, debounceTime } from 'rxjs';

const blank = (): Metric => ({
  key: '', area: '', title: '', unit: '', base: 100, volatility: 0.05,
  higher_is_better: true, owners: [], sources: [], enabled: true,
});

/** Metric catalog: search, filter, sort, paginate, and create / edit / delete. */
@Component({
  standalone: true,
  imports: [FormsModule, PagerComponent],
  template: `
    <section class="page">
      <div class="page-head">
        <h1>Metric catalog</h1>
        <button class="primary" (click)="startCreate()">+ New metric</button>
      </div>

      <div class="toolbar">
        <input placeholder="Search key, title or area…" [ngModel]="query().q" (ngModelChange)="search$.next($event)" />
        <select [ngModel]="query().area ?? ''" (ngModelChange)="patch({ area: $event || undefined, page: 1 })">
          <option value="">All areas</option>
          @for (a of areas(); track a) { <option [value]="a">{{ a }}</option> }
        </select>
      </div>

      @if (error()) { <p class="error">{{ error() }}</p> }

      @if (editing(); as m) {
        <form class="card form-grid" (ngSubmit)="save()">
          <h3>{{ isNew() ? 'New metric' : 'Edit ' + m.key }}</h3>
          <label>Key <input name="key" [(ngModel)]="m.key" [disabled]="!isNew()" required placeholder="area.metric_name" /></label>
          <label>Title <input name="title" [(ngModel)]="m.title" required /></label>
          <label>Area <input name="area" [(ngModel)]="m.area" required /></label>
          <label>Unit
            <select name="unit" [(ngModel)]="m.unit">@for (u of meta.meta()?.units ?? []; track u) { <option [value]="u">{{ u }}</option> }</select>
          </label>
          <label>Typical level <input name="base" type="number" step="any" [(ngModel)]="m.base" required /></label>
          <label>Volatility (0–1) <input name="volatility" type="number" step="0.01" [(ngModel)]="m.volatility" required /></label>
          <label>Owners (comma separated) <input name="owners" [(ngModel)]="ownersText" /></label>
          <label>Sources (comma separated) <input name="sources" [(ngModel)]="sourcesText" /></label>
          <label class="check"><input type="checkbox" name="hib" [(ngModel)]="m.higher_is_better" /> Higher is better</label>
          <label class="check"><input type="checkbox" name="enabled" [(ngModel)]="m.enabled" /> Enabled</label>
          <div class="row">
            <button class="primary" [disabled]="busy()">Save</button>
            <button type="button" (click)="editing.set(null)">Cancel</button>
          </div>
        </form>
      }

      @if (page(); as p) {
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                @for (c of columns; track c.key) {
                  <th>
                    @if (c.sort) {
                      <button class="link" (click)="sortBy(c.sort)">{{ c.label }} {{ query().sort === c.sort ? (query().desc ? '▼' : '▲') : '' }}</button>
                    } @else { {{ c.label }} }
                  </th>
                }
                <th></th>
              </tr>
            </thead>
            <tbody>
              @for (m of p.items; track m.key) {
                <tr [class.disabled]="!m.enabled">
                  <td class="mono">{{ m.key }}</td>
                  <td>{{ m.title }}</td>
                  <td>{{ m.area }}</td>
                  <td>{{ m.unit }}</td>
                  <td>{{ m.higher_is_better ? '↑ higher' : '↓ lower' }}</td>
                  <td>{{ m.enabled ? 'yes' : 'no' }}</td>
                  <td class="row">
                    <button (click)="startEdit(m)">Edit</button>
                    @if (confirming() === m.key) {
                      <button class="danger" (click)="remove(m.key)">Confirm delete</button>
                      <button (click)="confirming.set(null)">Keep</button>
                    } @else {
                      <button (click)="confirming.set(m.key)">Delete</button>
                    }
                  </td>
                </tr>
              } @empty {
                <tr><td colspan="7" class="muted">No metrics match.</td></tr>
              }
            </tbody>
          </table>
        </div>
        <pb-pager [total]="p.total" [page]="p.page" [pages]="p.pages" [size]="query().size" [sizes]="meta.meta()?.page_sizes ?? []"
                  [cached]="!!p.cached" noun="metrics" (pageChange)="patch({ page: $event })" (sizeChange)="patch({ size: $event, page: 1 })" />
      }
    </section>
  `,
})
export class MetricsPage implements OnInit {
  private readonly api = inject(ApiService);
  readonly meta = inject(MetaService);
  private readonly toast = inject(ToastService);
  readonly columns = [
    { key: 'key', label: 'Key', sort: 'key' as const },
    { key: 'title', label: 'Title', sort: 'title' as const },
    { key: 'area', label: 'Area', sort: 'area' as const },
    { key: 'unit', label: 'Unit', sort: null },
    { key: 'dir', label: 'Better when', sort: null },
    { key: 'enabled', label: 'Enabled', sort: null },
  ];
  readonly query = signal<MetricQuery>({ page: 1, size: 10, sort: 'key', desc: false });
  readonly page = signal<Page<Metric> | null>(null);
  readonly areas = signal<string[]>([]);
  readonly editing = signal<Metric | null>(null);
  readonly isNew = signal(false);
  readonly confirming = signal<string | null>(null);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly search$ = new Subject<string>();
  ownersText = '';
  sourcesText = '';

  ngOnInit(): void {
    this.search$.pipe(debounceTime(300)).subscribe((q) => this.patch({ q, page: 1 }));
    this.load();
  }

  patch(change: Partial<MetricQuery>): void {
    this.query.update((q) => ({ ...q, ...change }));
    this.load();
  }

  sortBy(sort: MetricQuery['sort']): void {
    const q = this.query();
    this.patch({ sort, desc: q.sort === sort ? !q.desc : false });
  }

  load(): void {
    this.api.metrics(this.query()).subscribe({ next: (p) => this.page.set(p), error: (e) => this.fail(e) });
    this.api.metricAreas().subscribe((a) => this.areas.set(a));
  }

  startCreate(): void {
    this.isNew.set(true);
    this.ownersText = this.sourcesText = '';
    this.editing.set({ ...blank(), unit: this.meta.meta()?.units[0] ?? '' });
  }

  startEdit(m: Metric): void {
    this.isNew.set(false);
    this.ownersText = m.owners.join(', ');
    this.sourcesText = m.sources.join(', ');
    this.editing.set({ ...m });
  }

  save(): void {
    const m = this.editing();
    if (!m) return;
    const split = (t: string) => t.split(',').map((x) => x.trim()).filter(Boolean);
    const { key, updated_at, ...rest } = { ...m, owners: split(this.ownersText), sources: split(this.sourcesText) };
    this.busy.set(true);
    const req = this.isNew() ? this.api.createMetric({ key, ...rest }) : this.api.updateMetric(key, rest);
    req.subscribe({
      next: () => {
        this.toast.show('Metric ' + key + (this.isNew() ? ' created' : ' updated'), 'success');
        this.meta.load(true);
        this.editing.set(null);
        this.busy.set(false);
        this.error.set(null);
        this.load();
      },
      error: (e) => {
        this.busy.set(false);
        this.fail(e);
      },
    });
  }

  remove(key: string): void {
    this.api.deleteMetric(key).subscribe({
      next: () => {
        this.toast.show('Metric ' + key + ' deleted', 'success');
        this.meta.load(true);
        this.confirming.set(null);
        const p = this.page();
        if (p && p.items.length === 1 && p.page > 1) this.query.update((q) => ({ ...q, page: q.page - 1 }));
        this.load();
      },
      error: (e) => this.fail(e),
    });
  }

  private fail(e: HttpErrorResponse): void {
    const body = e.error?.error;
    const detail = Array.isArray(body?.details) ? body.details.map((d: any) => `${d.loc?.at(-1)}: ${d.msg}`).join('; ') : '';
    this.error.set(detail || body?.message || 'Request failed');
    this.toast.show(this.error()!, 'error');
  }
}
