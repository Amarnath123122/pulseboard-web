import { Injectable, effect, inject, signal } from '@angular/core';
import { PULSEBOARD_CONFIG } from './config';
import { BoardEvent } from './models';
import { SessionService } from './session.service';

/** One reconnecting WebSocket per signed-in session; the latest board event is exposed as a signal. */
@Injectable({ providedIn: 'root' })
export class LiveEventsService {
  private readonly config = inject(PULSEBOARD_CONFIG);
  private readonly session = inject(SessionService);
  readonly connected = signal(false);
  readonly last = signal<BoardEvent | null>(null);

  private ws: WebSocket | null = null;
  private attempt = 0;
  private ping?: ReturnType<typeof setInterval>;
  private retry?: ReturnType<typeof setTimeout>;

  constructor() {
    effect(() => (this.session.token() ? this.open() : this.close()), { allowSignalWrites: true });
  }

  private open(): void {
    this.close();
    const token = this.session.token();
    if (!token) return;
    const ws = new WebSocket(`${this.config.wsUrl}?token=${encodeURIComponent(token)}`);
    this.ws = ws;
    ws.onopen = () => {
      this.attempt = 0;
      this.connected.set(true);
      this.ping = setInterval(() => ws.readyState === WebSocket.OPEN && ws.send('ping'), 25_000);
    };
    ws.onmessage = (m) => {
      try {
        this.last.set(JSON.parse(m.data));
      } catch {
        /* ignore malformed frames */
      }
    };
    ws.onclose = () => {
      this.connected.set(false);
      clearInterval(this.ping);
      if (this.ws === ws) this.retry = setTimeout(() => this.open(), Math.min(30_000, 500 * 2 ** this.attempt++));
    };
  }

  private close(): void {
    clearTimeout(this.retry);
    clearInterval(this.ping);
    const ws = this.ws;
    this.ws = null;
    ws?.close();
    this.connected.set(false);
  }
}
