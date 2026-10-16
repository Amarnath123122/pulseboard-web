import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService, Job, LiveEventsService, MetaService, Page } from 'data-access';
import { PagerComponent } from './pager.component';

/** Setup and review jobs; refreshes itself whenever a board is republished. */
@Component({
  standalone: true,
  imports: [FormsModule, RouterLink, DatePipe, PagerComponent],
  template: `
    <section class="page">
      <div class="page-head">
        <div><h1>Activity</h1><p class="muted">Every setup and scheduled review the assistant ran for you.</p></div>
      </div>
      <div class="toolbar">
        <select aria-label="Job type" [ngModel]="type()" (ngModelChange)="type.set($event); go(1)">
          <option value="">All jobs</option>
          @for (t of meta.meta()?.job_types ?? []; track t) { <option [value]="t">{{ t.toLowerCase() }}</option> }
        </select>
        <select aria-label="Status" [ngModel]="status()" (ngModelChange)="status.set($event); go(1)">
          <option value="">Any status</option>
          @for (s of meta.meta()?.job_statuses ?? []; track s) { <option [value]="s">{{ s.toLowerCase() }}</option> }
        </select>
      </div>
      @if (page(); as p) {
        <div class="table-wrap">
          <table>
            <thead><tr><th>Job</th><th>Status</th><th>Started</th><th>Took</th><th>Board</th><th>Note</th></tr></thead>
            <tbody>
              @for (j of p.items; track j.id) {
                <tr>
                  <td>{{ j.job_type_cd.toLowerCase() }}</td>
                  <td><span class="status {{ j.status_cd.toLowerCase() }}">{{ j.status_cd.toLowerCase() }}</span></td>
                  <td class="muted">{{ j.started_at | date: 'medium' }}</td>
                  <td>{{ took(j) }}</td>
                  <td>@if (j.board_id) { <a routerLink="/">overview</a> } @else { – }</td>
                  <td class="muted">{{ j.error ?? '' }}</td>
                </tr>
              } @empty {
                <tr><td colspan="6" class="empty">Nothing yet.</td></tr>
              }
            </tbody>
          </table>
        </div>
        <pb-pager [total]="p.total" [page]="p.page" [pages]="p.pages" [size]="size()" [sizes]="sizes()" noun="jobs"
                  (pageChange)="go($event)" (sizeChange)="size.set($event); go(1)" />
      } @else {
        <div class="placeholder tall"></div>
      }
    </section>
  `,
})
export class ActivityPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly live = inject(LiveEventsService);
  readonly meta = inject(MetaService);
  readonly type = signal('');
  readonly status = signal('');
  readonly size = signal(10);
  readonly page = signal<Page<Job> | null>(null);
  readonly sizes = computed(() => this.meta.meta()?.page_sizes ?? [this.size()]);

  constructor() {
    effect(() => {
      if (this.live.last()?.type === 'board.published') untracked(() => this.go(this.page()?.page ?? 1));
    });
  }

  ngOnInit(): void {
    this.go(1);
  }

  go(page: number): void {
    this.api.jobs({ job_type: this.type(), status: this.status(), page, size: this.size() })
      .subscribe((p) => this.page.set(p));
  }

  took(j: Job): string {
    if (!j.finished_at) return 'running…';
    const ms = new Date(j.finished_at).getTime() - new Date(j.started_at).getTime();
    return ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`;
  }
}
