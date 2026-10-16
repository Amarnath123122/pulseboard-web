import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService, FollowUp, QueryResult, Tile, TileData } from 'data-access';

@Component({
  selector: 'pb-tile',
  standalone: true,
  imports: [RouterLink, DecimalPipe],
  template: `
    <article class="tile p-{{ t.priority_cd.toLowerCase() }}" [class.alert]="t.tier_cd === 'ALERT'">
      <header class="tile-head">
        <h3>{{ t.title }}</h3>
        @if (t.priority_cd !== 'LOW') { <span class="chip {{ t.priority_cd.toLowerCase() }}">{{ t.priority_cd }}</span> }
        @if (t.detail_board_id) {
          <a class="open" [routerLink]="['/boards', t.detail_board_id]" [attr.aria-label]="'Open detail for ' + t.title">›</a>
        }
      </header>
      @if (t.presentation['summary']) { <p class="summary">{{ t.presentation['summary'] }}</p> }

      @switch (data()?.status) {
        @case (undefined) { <div class="placeholder" aria-busy="true"></div> }
        @case ('ERROR') { <p class="error">This tile couldn't load: {{ data()!.error }}</p> }
        @default {
          @if (stat(); as s) {
            <div class="stat-value">{{ fmt(s.value, s.unit) }}</div>
            <div class="stat-delta" [class.good]="good(s)" [class.bad]="!good(s)">
              {{ s.change_pct >= 0 ? '▲' : '▼' }} {{ (s.change_pct < 0 ? -s.change_pct : s.change_pct) | number: '1.1-1' }}%
              <span class="muted">vs avg {{ fmt(s.baseline, s.unit) }}</span>
            </div>
          }
          @if (series(); as line) {
            <svg viewBox="0 0 320 110" class="trend" role="img" [attr.aria-label]="'Trend for ' + t.title">
              <polyline [attr.points]="line.actual" class="line" />
              @if (line.ahead) { <polyline [attr.points]="line.ahead" class="line projected" /> }
            </svg>
            <p class="muted small">{{ line.caption }}</p>
          }
          @if (bars(); as b) {
            <div class="breakdown">
              @for (r of b.rows; track r.label) {
                <div class="breakdown-row">
                  <span>{{ r.label }}</span>
                  <span class="track"><span class="fill" [style.width.%]="(r.value / b.max) * 100"></span></span>
                  <span class="num">{{ fmt(r.value, b.unit) }}</span>
                </div>
              }
            </div>
          }
        }
      }

      @if (t.tier_cd === 'ALERT') {
        <footer class="tile-foot">
          <span class="muted">Follow-up: {{ t.follow_up_cd.toLowerCase() }}</span>
          <div class="row">
            @if (t.follow_up_cd !== 'SEEN' && t.follow_up_cd !== 'DONE') {
              <button [disabled]="saving()" (click)="mark('SEEN')">Mark seen</button>
            }
            @if (t.follow_up_cd !== 'DONE') { <button [disabled]="saving()" (click)="mark('DONE')">Done</button> }
            @if (t.briefing_board_id) {
              <a class="button primary" [routerLink]="['/boards', t.briefing_board_id]">Open briefing</a>
            }
          </div>
        </footer>
      }
    </article>
  `,
})
export class TileCardComponent {
  private readonly api = inject(ApiService);
  readonly tile = input.required<Tile>();
  readonly data = input<TileData>();
  readonly changed = output<void>();
  readonly saving = signal(false);
  get t(): Tile {
    return this.tile();
  }

  private readonly result = computed<QueryResult | null>(() => this.data()?.result ?? null);
  readonly stat = computed(() => {
    const r = this.result();
    return r?.shape === 'stat' ? r : null;
  });
  readonly bars = computed(() => {
    const r = this.result();
    return r?.shape === 'categories' ? { ...r, max: Math.max(...r.rows.map((x) => x.value)) || 1 } : null;
  });
  readonly series = computed(() => {
    const r = this.result();
    if (r?.shape !== 'series' || !r.rows.length) return null;
    const W = 320, H = 110, P = 6;
    const vals = r.rows.map((x) => x.value);
    const lo = Math.min(...vals), hi = Math.max(...vals);
    const x = (i: number) => P + (i * (W - 2 * P)) / Math.max(1, r.rows.length - 1);
    const y = (v: number) => H - P - ((v - lo) / (hi - lo || 1)) * (H - 2 * P);
    const split = r.rows.findIndex((row) => row.projected);
    const pts = (from: number, to: number) =>
      r.rows.slice(from, to).map((row, i) => `${x(i + from)},${y(row.value)}`).join(' ');
    const last = r.rows[r.rows.length - 1];
    return {
      actual: pts(0, split < 0 ? r.rows.length : split),
      ahead: split < 0 ? null : pts(split - 1, r.rows.length),
      caption: `${r.rows[0].label} to ${last.label} · latest ${this.fmt(last.value, r.unit)}${split >= 0 ? ' · dashed is projected' : ''}`,
    };
  });

  good(s: { change_pct: number; higher_is_better: boolean }): boolean {
    return s.higher_is_better ? s.change_pct >= 0 : s.change_pct <= 0;
  }

  fmt(v: number, unit: string): string {
    if (unit === '%') return `${v.toFixed(v >= 99 ? 2 : 1)}%`;
    if (unit === 'USD') return v >= 1e6 ? `$${(v / 1e6).toFixed(2)}M` : `$${(v / 1e3).toFixed(0)}K`;
    if (unit === 'x') return `${v.toFixed(2)}×`;
    return `${v >= 100 ? Math.round(v).toLocaleString() : v.toFixed(1)} ${unit}`;
  }

  mark(state: FollowUp): void {
    this.saving.set(true);
    this.api.setFollowUp(this.tile().id, state).subscribe({
      next: () => this.changed.emit(),
      complete: () => this.saving.set(false),
      error: () => this.saving.set(false),
    });
  }
}
