import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from 'data-access';

@Component({
  standalone: true,
  imports: [FormsModule],
  template: `
    <section class="page narrow auth">
      <h1>Pulseboard</h1>
      <p class="muted">Your business metrics, watched for you.</p>

      <div class="tabs" role="tablist">
        <button role="tab" [class.on]="mode() === 'login'" (click)="switch('login')">Sign in</button>
        <button role="tab" [class.on]="mode() === 'register'" (click)="switch('register')">Create account</button>
      </div>

      <form class="stack" (ngSubmit)="submit()" #f="ngForm">
        @if (mode() === 'register') {
          <label>Your name <input name="name" [(ngModel)]="name" required maxlength="120" autocomplete="name" /></label>
        }
        <label>Email <input name="email" type="email" [(ngModel)]="email" required email autocomplete="email" /></label>
        <label>Password
          <input name="password" type="password" [(ngModel)]="password" required
                 [minlength]="mode() === 'register' ? 10 : 1"
                 [autocomplete]="mode() === 'register' ? 'new-password' : 'current-password'" />
        </label>
        @if (mode() === 'register') { <span class="muted small">At least 10 characters. New accounts start as Viewer; an admin can upgrade you.</span> }
        <button class="primary" [disabled]="busy() || f.invalid">{{ mode() === 'login' ? 'Sign in' : 'Create account' }}</button>
        @if (error()) { <p class="error" role="alert">{{ error() }}</p> }
      </form>
    </section>
  `,
})
export class SignInPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly mode = signal<'login' | 'register'>('login');
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  name = '';
  email = '';
  password = '';

  switch(mode: 'login' | 'register'): void {
    this.mode.set(mode);
    this.error.set(null);
  }

  submit(): void {
    this.busy.set(true);
    this.error.set(null);
    const req = this.mode() === 'login'
      ? this.auth.login(this.email.trim(), this.password)
      : this.auth.register(this.email.trim(), this.password, this.name.trim());
    req.subscribe({
      next: () => this.router.navigate(['/']),
      error: (e: HttpErrorResponse) => {
        const body = e.error?.error;
        const detail = Array.isArray(body?.details) ? body.details.map((d: any) => d.msg).join('; ') : '';
        this.error.set(detail || body?.message || (e.status === 0 ? 'Cannot reach the server.' : 'Sign-in failed.'));
        this.busy.set(false);
      },
    });
  }
}
