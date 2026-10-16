import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService, MetaService } from 'data-access';

interface Message {
  author: 'user' | 'assistant';
  text: string;
}

/** Setup assistant. Each question offers clickable answers built from /meta, so users never guess what to type. */
@Component({
  standalone: true,
  imports: [FormsModule],
  template: `
    <section class="page chat">
      <header>
        <h1>Set up your overview</h1>
        <p class="muted">Answer three quick questions and the assistant builds a board of the metrics you care about.
          You can re-run this any time.</p>
        <div class="progress" role="progressbar" [attr.aria-valuenow]="done()" aria-valuemin="0" [attr.aria-valuemax]="total()">
          @for (i of steps(); track i) { <span [class.done]="i < done()"></span> }
        </div>
        <p class="muted small">{{ finished() ? 'All done' : 'Question ' + (step() + 1) + ' of ' + total() + ': ' + labels[step()] }}</p>
      </header>

      <div class="messages" aria-live="polite">
        @for (m of messages(); track $index) {
          <div class="msg {{ m.author }}">{{ m.text || '…' }}</div>
        }
      </div>

      @if (error()) { <p class="error">{{ error() }}</p> }

      @if (finished()) {
        <div class="callout">Building your board now. You'll be taken to it automatically.</div>
      } @else {
        @if (suggestions().length) {
          <div class="chips" aria-label="Suggested answers">
            <span class="muted small">{{ multi() ? 'Pick one or more:' : 'Pick one:' }}</span>
            @for (s of suggestions(); track s) {
              <button type="button" class="chip-btn" [class.on]="picked().includes(s)" [disabled]="busy()" (click)="toggle(s)">{{ s }}</button>
            }
          </div>
        }
        <form class="composer" (ngSubmit)="reply()">
          <input name="text" [(ngModel)]="text" [placeholder]="placeholders[step()]" [disabled]="busy()" aria-label="Your answer" autofocus />
          <button class="primary" [disabled]="busy() || !answer()">Send</button>
          <button type="button" (click)="send('skip')" [disabled]="busy()" title="Use a default board with every area">Skip setup</button>
        </form>
      }
    </section>
  `,
})
export class SetupPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly meta = inject(MetaService);
  private readonly router = inject(Router);
  readonly labels = ['your team', 'areas to watch', 'region'];
  readonly placeholders = ['e.g. Customer Success', 'Pick areas above or type them', 'Pick a region above or type one'];

  readonly messages = signal<Message[]>([]);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly step = signal(0);
  readonly total = signal(3);
  readonly finished = signal(false);
  readonly picked = signal<string[]>([]);
  readonly done = computed(() => (this.finished() ? this.total() : this.step()));
  readonly steps = computed(() => Array.from({ length: this.total() }, (_, i) => i));
  readonly multi = computed(() => this.step() === 1);
  readonly suggestions = computed(() => {
    const m = this.meta.meta();
    if (!m) return [];
    if (this.step() === 1) return m.areas;
    if (this.step() === 2) return ['All regions', ...m.regions];
    return [];
  });
  private conversationId: string | null = null;
  text = '';

  ngOnInit(): void {
    this.meta.load();
    this.send('start');
  }

  toggle(s: string): void {
    if (!this.multi()) {
      this.text = s;
      this.reply();
      return;
    }
    this.picked.update((p) => (p.includes(s) ? p.filter((x) => x !== s) : [...p, s]));
  }

  answer(): string {
    const typed = this.text.trim();
    return [...this.picked(), ...(typed ? [typed] : [])].join(', ');
  }

  reply(): void {
    const a = this.answer();
    if (!a) return;
    this.text = '';
    this.picked.set([]);
    this.send('reply', a);
  }

  async send(action: 'start' | 'reply' | 'skip', text = ''): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    if (action !== 'start') this.messages.update((m) => [...m, { author: 'user', text: action === 'skip' ? 'Skip setup' : text }]);
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
          this.finished.set(ev.data.finished);
        } else if (ev.event === 'board') setTimeout(() => this.router.navigate(['/']), 900);
        else if (ev.event === 'error') this.error.set(ev.data.message);
      }
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'The assistant is unavailable. Is the API running?');
    } finally {
      this.busy.set(false);
    }
  }
}
