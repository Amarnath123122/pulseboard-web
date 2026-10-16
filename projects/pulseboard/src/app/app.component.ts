import { Component, effect, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { LiveEventsService, MetaService, SessionService, ToastService } from 'data-access';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    @if (session.signedIn()) {
      <div class="shell">
        <aside class="sidebar">
          <a routerLink="/" class="brand">Pulseboard</a>
          <nav aria-label="Main">
            @for (item of nav; track item.path) {
              <a [routerLink]="item.path" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: item.exact }">
                <span aria-hidden="true">{{ item.icon }}</span> {{ item.label }}
              </a>
            }
          </nav>
          <div class="sidebar-foot">
            <span class="live" [class.on]="live.connected()">
              <span class="dot"></span>{{ live.connected() ? 'Live updates on' : 'Reconnecting…' }}
            </span>
            <span class="muted">Signed in as <strong>{{ session.userId() }}</strong></span>
            <button (click)="signOut()">Sign out</button>
          </div>
        </aside>
        <main class="content"><router-outlet /></main>
      </div>
    } @else {
      <main><router-outlet /></main>
    }
    <div class="toasts" aria-live="polite">
      @for (t of toast.toasts(); track t.id) {
        <div class="toast {{ t.kind }}" (click)="toast.dismiss(t.id)">{{ t.text }}</div>
      }
    </div>
  `,
})
export class AppComponent {
  readonly session = inject(SessionService);
  readonly live = inject(LiveEventsService);
  readonly toast = inject(ToastService);
  private readonly meta = inject(MetaService);
  private readonly router = inject(Router);

  readonly nav = [
    { path: '/', label: 'Overview', icon: '◉', exact: true },
    { path: '/boards', label: 'My boards', icon: '▦', exact: false },
    { path: '/metrics', label: 'Metric catalog', icon: '≡', exact: false },
    { path: '/activity', label: 'Activity', icon: '↻', exact: false },
    { path: '/setup', label: 'Setup assistant', icon: '✦', exact: false },
  ];

  constructor() {
    effect(() => {
      if (this.session.signedIn()) this.meta.load();
    });
    // Tell the user when one of their boards is republished in the background.
    effect(() => {
      const ev = this.live.last();
      if (ev?.type === 'board.published') this.toast.show(`Board updated to version ${ev.version}`, 'info');
    }, { allowSignalWrites: true });
  }

  signOut(): void {
    this.session.clear();
    this.meta.meta.set(null);
    this.router.navigate(['/sign-in']);
  }
}
