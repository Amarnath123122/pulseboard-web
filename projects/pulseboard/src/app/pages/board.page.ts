import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ApiService, Board, LiveEventsService, Tile, TileData } from 'data-access';
import { Observable } from 'rxjs';
import { TileCardComponent } from './tile-card.component';

@Component({
  standalone: true,
  imports: [RouterLink, DatePipe, TileCardComponent],
  template: `
    <section class="page">
      @if (error()) {
        <p class="error">{{ error() }}</p>
        <button (click)="load()">Retry</button>
      } @else if (!board()) {
        <div class="placeholder tall"></div>
      } @else if (board()!.build_status_cd === 'BUILDING') {
        <div class="thinking" role="status" aria-live="polite">
          <div class="pulse"></div>
          <h2>Building your board…</h2>
          <p class="muted">The assistant is laying it out. It will appear here automatically.</p>
        </div>
      } @else {
        <nav class="crumbs">
          @if (b.parent_board_id) { <a routerLink="/">Overview</a> › <span>{{ b.kind_cd === 'DETAIL' ? 'Detail' : 'Briefing' }}</span> } @else { <span>Overview</span> }
        </nav>
        <div class="page-head">
          <h1>{{ b.title }}</h1>
          <span class="muted">version {{ b.version }}
            @if (b.next_review_at) { · next review {{ b.next_review_at | date: 'shortTime' }} }
          </span>
        </div>

        <p class="muted hint">{{ hints[b.kind_cd] }}</p>
        @if (b.kind_cd === 'OVERVIEW') {
          <div class="legend"><span><i style="background:var(--bad)"></i>High priority</span><span><i style="background:var(--warn)"></i>Medium priority</span><span>› opens details</span></div>
          <p class="muted">{{ b.settings['team'] }} · watching {{ b.settings['areas']?.join(', ') }} · region {{ b.settings['region'] }}</p>
        }
        @if (b.kind_cd === 'BRIEFING') {
          <section class="briefing">
            <p class="summary">{{ b.settings['summary'] }}</p>
            <div class="briefing-grid">
              <div><h4>Next steps</h4><ol>@for (s of b.settings['next_steps']; track s) { <li>{{ s }}</li> }</ol></div>
              <div><h4>Owners</h4><ul>@for (o of b.settings['owners']; track o) { <li>{{ o }}</li> }</ul></div>
              <div><h4>Sources</h4><p class="mono">{{ b.settings['sources']?.join(' → ') }}</p></div>
            </div>
          </section>
        }

        @if (alerts().length) {
          <h2 class="section-title">Needs attention ({{ alerts().length }})</h2>
          <div class="grid">
            @for (t of alerts(); track t.id) { <pb-tile [tile]="t" [data]="data()[t.id]" (changed)="load()" /> }
          </div>
        } @else if (b.kind_cd === 'OVERVIEW') {
          <p class="all-clear">All clear. Nothing needs your attention.</p>
        }
        @if (others().length) {
          @if (b.kind_cd === 'OVERVIEW') { <h2 class="section-title">Watching</h2> }
          <div class="grid">
            @for (t of others(); track t.id) { <pb-tile [tile]="t" [data]="data()[t.id]" (changed)="load()" /> }
          </div>
        }
      }
    </section>
  `,
})
export class BoardPage {
  private readonly api = inject(ApiService);
  private readonly live = inject(LiveEventsService);
  private readonly router = inject(Router);

  readonly id = input<string>(); // route param; empty = the user's overview
  readonly board = signal<Board | null>(null);
  readonly tiles = signal<Tile[]>([]);
  readonly data = signal<Record<string, TileData>>({});
  readonly error = signal<string | null>(null);
  readonly alerts = computed(() => this.tiles().filter((t) => t.tier_cd === 'ALERT'));
  readonly others = computed(() => this.tiles().filter((t) => t.tier_cd !== 'ALERT'));
  private poll?: ReturnType<typeof setTimeout>;
  readonly hints: Record<string, string> = {
    OVERVIEW: 'Metrics that need attention are listed first. Open an alert for its trend and briefing, then mark it seen or done.',
    DETAIL: 'The last 12 weeks, the split by region, and where the metric is heading.',
    BRIEFING: 'What changed, who owns it, and suggested next steps.',
  };
  get b(): Board {
    return this.board()!;
  }

  constructor() {
    effect(() => {
      this.id();
      untracked(() => {
        this.data.set({});
        this.load();
      });
    });
    // Refetch when the server publishes a new version of this board (or its parent).
    effect(() => {
      const ev = this.live.last();
      const b = untracked(this.board);
      if (ev?.type?.startsWith('board.') && b && [b.id, b.parent_board_id].includes(ev.boardId ?? '')) {
        untracked(() => this.load());
      }
    });
  }

  load(): void {
    clearTimeout(this.poll);
    this.error.set(null);
    const id = this.id();
    const board$: Observable<Board> = id ? this.api.board(id) : this.api.overview();
    board$.subscribe({
      next: (b) => {
        this.board.set(b);
        if (b.build_status_cd === 'BUILDING') {
          this.poll = setTimeout(() => this.load(), 3000); // fallback if the WebSocket is down
          return;
        }
        this.api.tiles(b.id).subscribe((tiles) => {
          this.tiles.set(tiles);
          for (const t of tiles) {
            this.api.tileData(t.id).subscribe({
              next: (d) => this.data.update((m) => ({ ...m, [t.id]: d })),
              error: () =>
                this.data.update((m) => ({ ...m, [t.id]: { tile_id: t.id, status: 'ERROR', result: null, error: 'request failed' } })),
            });
          }
        });
      },
      error: (e: HttpErrorResponse) => {
        if (e.status === 404 && !id) this.router.navigate(['/setup']);
        else if (e.status !== 401) this.error.set(e.error?.error?.message ?? 'Could not reach the API');
      },
    });
  }
}
