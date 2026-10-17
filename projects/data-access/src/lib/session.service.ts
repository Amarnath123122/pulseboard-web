import { Injectable, computed, signal } from '@angular/core';

export interface SessionUser {
  id: string;
  email: string;
  display_name: string;
  role: string;
  permissions: string[];
}

export interface AuthSession {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: SessionUser;
}

const KEY = 'pb.auth';

/** The signed-in user and tokens. The access token is short-lived; the refresh token rotates on every use. */
@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly state = signal<AuthSession | null>(this.load());
  readonly token = computed(() => this.state()?.access_token ?? null);
  readonly refreshToken = computed(() => this.state()?.refresh_token ?? null);
  readonly user = computed(() => this.state()?.user ?? null);
  readonly userId = computed(() => this.state()?.user.display_name ?? null);
  readonly signedIn = computed(() => this.state() !== null);

  can(permission: string): boolean {
    return this.state()?.user.permissions.includes(permission) ?? false;
  }

  set(session: AuthSession): void {
    this.state.set(session);
    try {
      localStorage.setItem(KEY, JSON.stringify(session));
    } catch {
      /* storage blocked: the session lasts for this tab only */
    }
  }

  clear(): void {
    this.state.set(null);
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* storage blocked */
    }
  }

  private load(): AuthSession | null {
    try {
      const s = JSON.parse(localStorage.getItem(KEY) ?? 'null');
      return s?.access_token && s?.refresh_token && s?.user ? s : null;
    } catch {
      return null;
    }
  }
}
