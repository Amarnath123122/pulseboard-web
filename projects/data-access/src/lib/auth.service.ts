import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, finalize, firstValueFrom, map, shareReplay, tap } from 'rxjs';
import { PULSEBOARD_CONFIG } from './config';
import { Page } from './models';
import { AuthSession, SessionService, SessionUser } from './session.service';

export interface AdminUser extends SessionUser {
  is_active: boolean;
  last_login_at: string | null;
  created_at: string | null;
}

/** Client for the identity service (reached through the gateway). */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(PULSEBOARD_CONFIG);
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);
  private refreshing: Observable<string> | null = null;

  private url(path: string): string {
    return `${this.config.authUrl}${path}`;
  }

  register(email: string, password: string, display_name: string): Observable<AuthSession> {
    return this.http
      .post<AuthSession>(this.url('/api/v1/auth/register'), { email, password, display_name })
      .pipe(tap((s) => this.session.set(s)));
  }

  login(email: string, password: string): Observable<AuthSession> {
    return this.http
      .post<AuthSession>(this.url('/api/v1/auth/login'), { email, password })
      .pipe(tap((s) => this.session.set(s)));
  }

  /** Single-flight: concurrent 401s share one refresh call, because the refresh token rotates on use. */
  refresh(): Observable<string> {
    if (!this.refreshing) {
      this.refreshing = this.http
        .post<AuthSession>(this.url('/api/v1/auth/refresh'), { refresh_token: this.session.refreshToken() })
        .pipe(
          tap((s) => this.session.set(s)),
          map((s) => s.access_token),
          finalize(() => (this.refreshing = null)),
          shareReplay(1),
        );
    }
    return this.refreshing;
  }

  async freshToken(): Promise<string | null> {
    try {
      return await firstValueFrom(this.refresh());
    } catch {
      return null;
    }
  }

  logout(): void {
    const token = this.session.refreshToken();
    this.session.clear();
    if (token) this.http.post(this.url('/api/v1/auth/logout'), { refresh_token: token }).subscribe({ error: () => {} });
    this.router.navigate(['/sign-in']);
  }

  roles(): Observable<Record<string, string[]>> {
    return this.http.get<Record<string, string[]>>(this.url('/api/v1/auth/roles'));
  }

  users(query: { q?: string; role?: string; page: number; size: number }): Observable<Page<AdminUser>> {
    const params: Record<string, string> = {};
    for (const [k, v] of Object.entries(query)) if (v !== undefined && v !== '') params[k] = String(v);
    return this.http.get<Page<AdminUser>>(this.url('/api/v1/users'), { params });
  }

  updateUser(id: string, change: { role?: string; is_active?: boolean }): Observable<AdminUser> {
    return this.http.patch<AdminUser>(this.url(`/api/v1/users/${encodeURIComponent(id)}`), change);
  }
}
