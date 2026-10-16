import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService, BoardSummary, MetaService, Page } from 'data-access';
import { Subject, debounceTime } from 'rxjs';
import { PagerComponent } from './pager.component';

@Component({
  standalone: true,
  imports: [FormsModule, RouterLink, DatePipe, PagerComponent],
  template: `
    <section class="page">
      <div class="page-head">
        <div><h1>My boards</h1><p class="muted">Your overview plus every detail and briefing board the assistant created.</p></div>
        <a class="button primary" routerLink="/setup">Re-run setup</a>
      </div>
      <div class="toolbar">
        <input placeholder="Search by title…" [ngModel]="q()" (ngModelChange)="search$.next($event)" aria-label="Search boards" />
        <select aria-label="Board kind" [ngModel]="kind()" (ngModelChange)="kind.set($event); go(1)">
          <option value="">All kinds</option>
          @for (k of meta.meta()?.board_kinds ?? []; track k) { <option [value]="k">{{ k.toLowerCase() }}</option> }
        </select>
      </div>
      @if (page(); as p) {
        <div class="table-wrap">
          <table>
            <thead><tr><th>Title</th><th>Kind</th><th>Tiles</th><th>Alerts</th><th>Version</th><th>Updated</th></tr></thead>
            <tbody>
              @for (b of p.items; track b.id) {
                <tr class="clickable" [routerLink]="b.kind_cd === 'OVERVIEW' ? '/' : ['/boards', b.id]">
                  <td><a [routerLink]="b.kind_cd === 'OVERVIEW' ? '/' : ['/boards', b.id]">{{ b.title }}</a></td>
                  <td><span class="tag">{{ b.kind_cd.toLowerCase() }}</span></td>
                  <td>{{ b.tile_count }}</td>
                  <td>@if (b.alert_count) { <span class="chip high">{{ b.alert_count }}</span> } @else { – }</td>
                  <td>v{{ b.version }}</td>
                  <td class="muted">{{ b.updated_at | date: 'medium' }}</td>
                </tr>
              } @empty {
                <tr><td colspan="6" class="empty">No boards yet. <a routerLink="/setup">Run the setup assistant</a> to create one.</td></tr>
              }
            </tbody>
          </table>
        </div>
        <pb-pager [total]="p.total" [page]="p.page" [pages]="p.pages" [size]="size()" [sizes]="sizes()" noun="boards"
                  (pageChange)="go($event)" (sizeChange)="size.set($event); go(1)" />
      } @else {
        <div class="placeholder tall"></div>
      }
    </section>
  `,
})
export class BoardsPage implements OnInit {
  private readonly api = inject(ApiService);
  readonly meta = inject(MetaService);
  readonly q = signal('');
  readonly kind = signal('');
  readonly size = signal(10);
  readonly page = signal<Page<BoardSummary> | null>(null);
  readonly sizes = computed(() => this.meta.meta()?.page_sizes ?? [this.size()]);
  readonly search$ = new Subject<string>();

  ngOnInit(): void {
    this.search$.pipe(debounceTime(300)).subscribe((q) => {
      this.q.set(q);
      this.go(1);
    });
    this.go(1);
  }

  go(page: number): void {
    this.api.boards({ q: this.q(), kind: this.kind(), page, size: this.size() }).subscribe((p) => this.page.set(p));
  }
}
