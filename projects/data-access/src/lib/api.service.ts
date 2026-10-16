import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { PULSEBOARD_CONFIG } from './config';
import { Board, FollowUp, StreamEvent, Tile, TileData } from './models';
import { SessionService } from './session.service';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(PULSEBOARD_CONFIG);
  private readonly session = inject(SessionService);

  private url(path: string): string {
    return `${this.config.apiUrl}${path}`;
  }

  signIn(userId: string): Observable<{ access_token: string; user_id: string }> {
    return this.http.post<{ access_token: string; user_id: string }>(this.url('/api/v1/auth/dev-token'), {
      user_id: userId,
    });
  }

  overview(): Observable<Board> {
    return this.http.get<Board>(this.url('/api/v1/boards/overview'));
  }

  board(id: string): Observable<Board> {
    return this.http.get<Board>(this.url(`/api/v1/boards/${encodeURIComponent(id)}`));
  }

  tiles(id: string): Observable<Tile[]> {
    return this.http.get<Tile[]>(this.url(`/api/v1/boards/${encodeURIComponent(id)}/tiles`));
  }

  tileData(id: string): Observable<TileData> {
    return this.http.get<TileData>(this.url(`/api/v1/tiles/${encodeURIComponent(id)}/data`));
  }

  setFollowUp(id: string, follow_up_cd: FollowUp): Observable<Tile> {
    return this.http.patch<Tile>(this.url(`/api/v1/tiles/${encodeURIComponent(id)}/follow-up`), { follow_up_cd });
  }

  /** One assistant turn. HttpClient can't stream a POST response, so this reads the SSE stream with fetch. */
  async *assistantTurn(body: {
    conversation_id?: string | null;
    action: string;
    text?: string;
  }): AsyncGenerator<StreamEvent> {
    const res = await fetch(this.url('/api/v1/assistant/messages'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.session.token()}` },
      body: JSON.stringify(body),
    });
    if (!res.ok || !res.body) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.error?.message ?? 'The assistant is unavailable');
    }
    const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
    let buffer = '';
    for (;;) {
      const { value, done } = await reader.read();
      if (done) return;
      buffer += value;
      let cut: number;
      while ((cut = buffer.indexOf('\n\n')) >= 0) {
        const block = buffer.slice(0, cut);
        buffer = buffer.slice(cut + 2);
        let event = 'message';
        let data = '';
        for (const line of block.split('\n')) {
          if (line.startsWith('event: ')) event = line.slice(7);
          else if (line.startsWith('data: ')) data += line.slice(6);
        }
        yield { event, data: data ? JSON.parse(data) : null };
      }
    }
  }
}
