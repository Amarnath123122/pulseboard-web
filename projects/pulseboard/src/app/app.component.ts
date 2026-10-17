import { Component, computed, effect, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService, LiveEventsService, MetaService, SessionService, ToastService } from 'data-access';

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
            @for (item of visibleNav(); track item.path) {
              <a [routerLink]="item.path" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: item.exact }">
                <span aria-hidden="true">{{ item.icon }}</span> {{ item.label }}
              </a>
            }
          </nav>
          <div class="sidebar-foot">
            <span class="live" [class.on]="live.connected()">
              <span class="dot"></span>{{ live.connected() ? 'Live updates on' : 'Reconnecting…' }}
            </span>
            <span class="muted"><strong>{{ session.user()?.display_name }}</strong> · {{ session.user()?.role?.toLowerCase() }}<br />{{ session.user()?.email }}</span>
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
  private readonly auth = inject(AuthService);

  readonly nav: { path: string; label: string; icon: string; exact: boolean; permission: string }[] = [
    { path: '/', label: 'Overview', icon: '◉', exact: true, permission: '' },
    { path: '/boards', label: 'My boards', icon: '▦', exact: false, permission: '' },
    { path: '/metrics', label: 'Metric catalog', icon: '≡', exact: false, permission: '' },
    { path: '/activity', label: 'Activity', icon: '↻', exact: false, permission: '' },
    { path: '/setup', label: 'Setup assistant', icon: '✦', exact: false, permission: '' },
    { path: '/users', label: 'Users', icon: '☺', exact: false, permission: 'users:read' },
  ];
  readonly visibleNav = computed(() => (this.session.user(), this.nav.filter((n) => !n.permission || this.session.can(n.permission))));

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
    this.meta.meta.set(null);
    this.auth.logout();
  }
}
