import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from 'data-access';

interface Message {
  author: 'user' | 'assistant';
  text: string;
}

@Component({
  standalone: true,
  imports: [FormsModule],
  template: `
    <section class="page chat">
      <div class="page-head">
        <h1>Set up your board</h1>
        <span class="muted">Question {{ step() + 1 > total() ? total() : step() + 1 }} of {{ total() }}</span>
      </div>
      <div class="messages" aria-live="polite">
        @for (m of messages(); track $index) {
          <div class="msg {{ m.author }}">{{ m.text || '…' }}</div>
        }
      </div>
      @if (error()) { <p class="error">{{ error() }}</p> }
      <form class="composer" (ngSubmit)="reply()">
        <input name="text" [(ngModel)]="text" placeholder="Type your answer…" [disabled]="busy()" autofocus />
        <button class="primary" [disabled]="busy() || !text.trim()">Send</button>
        <button type="button" (click)="send('skip')" [disabled]="busy()">Skip</button>
      </form>
    </section>
  `,
})
export class SetupPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  readonly messages = signal<Message[]>([]);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly step = signal(0);
  readonly total = signal(3);
  private conversationId: string | null = null;
  text = '';

  ngOnInit(): void {
    this.send('start');
  }

  reply(): void {
    const t = this.text.trim();
    if (!t) return;
    this.text = '';
    this.send('reply', t);
  }

  async send(action: 'start' | 'reply' | 'skip', text = ''): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    if (action === 'reply') this.messages.update((m) => [...m, { author: 'user', text }]);
    this.messages.update((m) => [...m, { author: 'assistant', text: '' }]);
    try {
      for await (const ev of this.api.assistantTurn({ conversation_id: this.conversationId, action, text })) {
        if (ev.event === 'conversation') this.conversationId = ev.data.conversation_id;
        else if (ev.event === 'delta')
          this.messages.update((m) => {
            const last = m[m.length - 1];
            return [...m.slice(0, -1), { ...last, text: last.text + ev.data.text }];
          });
        else if (ev.event === 'turn.end') {
          this.step.set(ev.data.step);
          this.total.set(ev.data.total_steps);
        } else if (ev.event === 'board') setTimeout(() => this.router.navigate(['/']), 700);
        else if (ev.event === 'error') this.error.set(ev.data.message);
      }
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'The assistant is unavailable');
    } finally {
      this.busy.set(false);
    }
  }
}
