import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService, SessionService } from 'data-access';

/** Demo sign-in. Swap for your identity provider (e.g. Entra ID) in production. */
@Component({
  standalone: true,
  imports: [FormsModule],
  template: `
    <section class="page narrow">
      <h1>Pulseboard</h1>
      <p class="muted">Demo sign-in. Enter any user ID.</p>
      <form class="stack" (ngSubmit)="submit()">
        <label>User ID <input name="userId" [(ngModel)]="userId" required pattern="[A-Za-z0-9_.@-]+" /></label>
        <button class="primary" [disabled]="busy()">Sign in</button>
        @if (error()) { <p class="error">{{ error() }}</p> }
      </form>
    </section>
  `,
})
export class SignInPage {
  private readonly api = inject(ApiService);
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);
  userId = 'demo';
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);

  submit(): void {
    this.busy.set(true);
    this.api.signIn(this.userId.trim()).subscribe({
      next: (r) => {
        this.session.set(r.access_token, r.user_id);
        this.router.navigate(['/']);
      },
      error: (e) => {
        this.error.set(e?.error?.error?.message ?? 'Sign-in failed. Is the API running?');
        this.busy.set(false);
      },
    });
  }
}
