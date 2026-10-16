import { Injectable, computed, signal } from '@angular/core';

const KEY = 'pb.session';

@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly state = signal<{ token: string; userId: string } | null>(this.load());
  readonly token = computed(() => this.state()?.token ?? null);
  readonly userId = computed(() => this.state()?.userId ?? null);
  readonly signedIn = computed(() => this.state() !== null);

  set(token: string, userId: string): void {
    this.state.set({ token, userId });
    try {
      localStorage.setItem(KEY, JSON.stringify({ token, userId }));
    } catch {
      /* storage blocked: session lasts for this tab only */
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

  private load(): { token: string; userId: string } | null {
    try {
      return JSON.parse(localStorage.getItem(KEY) ?? 'null');
    } catch {
      return null;
    }
  }
}
