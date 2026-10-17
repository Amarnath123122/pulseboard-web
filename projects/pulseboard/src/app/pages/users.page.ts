import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminUser, AuthService, MetaService, Page, SessionService, ToastService } from 'data-access';
import { Subject, debounceTime } from 'rxjs';
import { PagerComponent } from './pager.component';

/** Admin: search users, change roles, activate/deactivate. Roles and their permissions come from the identity service. */
@Component({
  standalone: true,
  imports: [FormsModule, DatePipe, PagerComponent],
  template: `
    <section class="page">
      <div class="page-head">
        <div><h1>Users</h1><p class="muted">Who can use Pulseboard and what they may do. Changes apply at the user's next token refresh (within 15 minutes).</p></div>
      </div>
      <details class="card roles">
        <summary>What each role can do</summary>
        @for (r of roleNames(); track r) { <p><strong>{{ r }}</strong>: <span class="muted">{{ roles()[r].join(', ') }}</span></p> }
      </details>
      <div class="toolbar">
        <input placeholder="Search by name or email…" [ngModel]="q()" (ngModelChange)="search$.next($event)" aria-label="Search users" />
        <select aria-label="Role filter" [ngModel]="role()" (ngModelChange)="role.set($event); go(1)">
          <option value="">All roles</option>
          @for (r of roleNames(); track r) { <option [value]="r">{{ r }}</option> }
        </select>
      </div>
      @if (page(); as p) {
        <div class="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Last sign-in</th><th></th></tr></thead>
            <tbody>
              @for (u of p.items; track u.id) {
                <tr [class.disabled]="!u.is_active">
                  <td>{{ u.display_name }} @if (u.id === me()?.id) { <span class="tag">you</span> }</td>
                  <td class="mono">{{ u.email }}</td>
                  <td>
                    <select [attr.aria-label]="'Role for ' + u.email" [ngModel]="u.role" (ngModelChange)="change(u, { role: $event })">
                      @for (r of roleNames(); track r) { <option [value]="r">{{ r }}</option> }
                    </select>
                  </td>
                  <td>{{ u.is_active ? 'active' : 'deactivated' }}</td>
                  <td class="muted">{{ u.last_login_at ? (u.last_login_at | date: 'medium') : 'never' }}</td>
                  <td>
                    @if (u.id !== me()?.id) {
                      <button (click)="change(u, { is_active: !u.is_active })">{{ u.is_active ? 'Deactivate' : 'Activate' }}</button>
                    }
                  </td>
                </tr>
              } @empty { <tr><td colspan="6" class="empty">No users match.</td></tr> }
            </tbody>
          </table>
        </div>
        <pb-pager [total]="p.total" [page]="p.page" [pages]="p.pages" [size]="size()" [sizes]="meta.meta()?.page_sizes ?? []"
                  noun="users" (pageChange)="go($event)" (sizeChange)="size.set($event); go(1)" />
      } @else { <div class="placeholder tall"></div> }
    </section>
  `,
})
export class UsersPage implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  readonly meta = inject(MetaService);
  readonly me = inject(SessionService).user;
  readonly q = signal('');
  readonly role = signal('');
  readonly size = signal(10);
  readonly page = signal<Page<AdminUser> | null>(null);
  readonly roles = signal<Record<string, string[]>>({});
  readonly roleNames = computed(() => Object.keys(this.roles()));
  readonly search$ = new Subject<string>();

  ngOnInit(): void {
    this.auth.roles().subscribe((r) => this.roles.set(r));
    this.search$.pipe(debounceTime(300)).subscribe((q) => {
      this.q.set(q);
      this.go(1);
    });
    this.go(1);
  }

  go(page: number): void {
    this.auth.users({ q: this.q(), role: this.role(), page, size: this.size() }).subscribe((p) => this.page.set(p));
  }

  change(u: AdminUser, change: { role?: string; is_active?: boolean }): void {
    this.auth.updateUser(u.id, change).subscribe({
      next: (updated) => {
        this.toast.show(`${updated.email}: ${change.role ? 'role is now ' + updated.role : updated.is_active ? 'activated' : 'deactivated'}`, 'success');
        this.go(this.page()?.page ?? 1);
      },
      error: (e) => {
        this.toast.show(e?.error?.error?.message ?? 'Update failed', 'error');
        this.go(this.page()?.page ?? 1);
      },
    });
  }
}
