import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

/** Shared pagination bar: summary, page-size picker (sizes come from /meta) and prev/next. */
@Component({
  selector: 'pb-pager',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="pager">
      <span class="muted">{{ total() }} {{ noun() }} · page {{ page() }} of {{ pages() }}
        @if (cached()) { · <span title="Served from Redis">cached</span> }
      </span>
      <div class="row">
        <select aria-label="Page size" [ngModel]="size()" (ngModelChange)="sizeChange.emit(+$event)">
          @for (n of sizes(); track n) { <option [value]="n">{{ n }} / page</option> }
        </select>
        <button [disabled]="page() <= 1" (click)="pageChange.emit(page() - 1)">‹ Prev</button>
        <button [disabled]="page() >= pages()" (click)="pageChange.emit(page() + 1)">Next ›</button>
      </div>
    </div>
  `,
})
export class PagerComponent {
  readonly total = input.required<number>();
  readonly page = input.required<number>();
  readonly pages = input.required<number>();
  readonly size = input.required<number>();
  readonly sizes = input<number[]>([]);
  readonly noun = input('items');
  readonly cached = input(false);
  readonly pageChange = output<number>();
  readonly sizeChange = output<number>();
}
