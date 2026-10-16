import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { LiveEventsService, SessionService } from 'data-access';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink],
  template: `
    <header class="topbar">
      <a routerLink="/" class="brand">Pulseboard</a>
      @if (session.signedIn()) {
        <div class="row">
          <a routerLink="/">Overview</a>
          <a routerLink="/setup">Setup</a>
          <span class="dot" [class.on]="live.connected()" [title]="live.connected() ? 'Live' : 'Reconnecting'"></span>
          <span class="muted">{{ session.userId() }}</span>
          <button (click)="signOut()">Sign out</button>
        </div>
      }
    </header>
    <main><router-outlet /></main>
  `,
})
export class AppComponent {
  readonly session = inject(SessionService);
  readonly live = inject(LiveEventsService);
  private readonly router = inject(Router);

  signOut(): void {
    this.session.clear();
    this.router.navigate(['/sign-in']);
  }
}
