import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { StaffUser, RoleRecord } from '../../core/models';

@Component({
    selector: 'app-user-list',
    standalone: true,
    imports: [CommonModule, RouterLink, FormsModule],
    template: `
    <div class="page-head">
        <div>
            <h1>Users & Roles</h1>
            <p class="muted">Manage CRM staff, roles, and permissions</p>
        </div>
        <div class="actions">
            <a routerLink="/admin/users/new" class="btn btn-primary">+ Add User</a>
        </div>
    </div>

    <!-- Role cards -->
    <div class="roles-strip">
        @for (r of roles(); track r.id) {
            <div class="role-card" [class.active]="selectedRole() === r.slug" (click)="filterByRole(r.slug)">
                <div class="role-name">{{ r.name }}</div>
                <div class="role-desc">{{ r.description }}</div>
            </div>
        }
        <div class="role-card all" [class.active]="!selectedRole()" (click)="filterByRole('')">
            <div class="role-name">All Users</div>
            <div class="role-desc">Show every staff member</div>
        </div>
    </div>

    <!-- Filters -->
    <div class="filters">
        <input class="input" placeholder="Search by name, email, phone…"
               [(ngModel)]="search" (ngModelChange)="onFilterChange()" />
        <select class="input" [(ngModel)]="statusFilter" (change)="onFilterChange()">
            <option value="">All statuses</option>
            <option value="1">Active</option>
            <option value="0">Inactive</option>
        </select>
        @if (hasActiveFilters()) {
            <button class="btn btn-sm btn-outline" (click)="clearFilters()">Clear</button>
        }
    </div>

    @if (loading()) {
        <div class="empty"><span class="spinner"></span> Loading users…</div>
    } @else if (users().length === 0) {
        <div class="empty">
            <div class="empty-icon">👥</div>
            <p>No users found.</p>
        </div>
    } @else {
        <div class="table-wrap">
            <table class="table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th>Last Login</th>
                        <th>Created</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    @for (u of users(); track u.id) {
                        <tr>
                            <td><strong>{{ u.full_name }}</strong></td>
                            <td>{{ u.email }}</td>
                            <td>{{ u.phone || '—' }}</td>
                            <td><span class="role-badge" [class]="'role-' + u.role">{{ u.role }}</span></td>
                            <td>
                                @if (u.is_active) {
                                    <span class="status-badge active">● Active</span>
                                } @else {
                                    <span class="status-badge inactive">● Inactive</span>
                                }
                            </td>
                            <td>{{ u.last_login_at ? formatDate(u.last_login_at) : 'Never' }}</td>
                            <td>{{ formatDate(u.created_at) }}</td>
                            <td class="actions-cell">
                                <a [routerLink]="['/admin/users', u.id]" class="btn btn-sm btn-outline">Edit</a>
                                <button class="btn btn-sm" [class.btn-success]="!u.is_active" [class.btn-outline]="u.is_active"
                                        (click)="toggleActive(u)">
                                    {{ u.is_active ? 'Deactivate' : 'Activate' }}
                                </button>
                            </td>
                        </tr>
                    }
                </tbody>
            </table>
        </div>
    }
    `,
    styles: [`
        .page-head { display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:14px; }
        .page-head h1 { margin:0 0 4px; }
        .page-head .muted { margin:0; color:#6b7280; }
        .actions { display:flex; gap:8px; }
        .roles-strip {
            display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap:10px; margin-bottom:14px;
        }
        .role-card {
            background:#fff; padding:14px 16px; border-radius:8px;
            box-shadow:0 1px 2px rgba(0,0,0,.04); cursor:pointer;
            border:2px solid transparent; transition: all .15s;
        }
        .role-card:hover { border-color:#e5e7eb; }
        .role-card.active { border-color:#2563eb; }
        .role-card.all { background:#f9fafb; }
        .role-name { font-weight:600; font-size:14px; color:#111827; margin-bottom:4px; }
        .role-desc { font-size:12px; color:#6b7280; }
        .input {
            padding:8px 10px; border:1px solid #d1d5db; border-radius:6px;
            font:inherit; background:#fff;
        }
        .table-wrap { background:#fff; border-radius:8px; box-shadow:0 1px 2px rgba(0,0,0,.04); overflow:hidden; }
        .table { width:100%; border-collapse:collapse; }
        .table th, .table td { padding:10px 12px; text-align:left; border-bottom:1px solid #f3f4f6; }
        .table th { background:#f9fafb; font-size:12px; text-transform:uppercase; color:#6b7280; letter-spacing:.5px; }
        .table tbody tr:hover { background:#f9fafb; }
        .role-badge {
            display:inline-block; font-size:11px; padding:2px 8px; border-radius:10px;
            background:#e0e7ff; color:#3730a3; font-weight:600;
        }
        .role-admin { background:#fee2e2; color:#991b1b; }
        .role-manager { background:#fef3c7; color:#92400e; }
        .role-telecaller { background:#dcfce7; color:#166534; }
        .role-accounts { background:#dbeafe; color:#1e40af; }
        .status-badge { font-size:12px; font-weight:600; }
        .status-badge.active { color:#16a34a; }
        .status-badge.inactive { color:#9ca3af; }
        .actions-cell { display:flex; gap:6px; }
        .btn { padding:8px 14px; border:none; border-radius:6px; cursor:pointer; font:inherit; }
        .btn-primary { background:#0f766e; color:#fff; }
        .btn-outline { background:#fff; color:#374151; border:1px solid #d1d5db; text-decoration:none; }
        .btn-success { background:#16a34a; color:#fff; }
        .btn-sm { padding:5px 10px; font-size:12px; }
        .empty { text-align:center; color:#6b7280; padding:40px; }
        .empty .empty-icon { font-size: 3rem; margin-bottom: 8px; }
    `]
})
export class UserListComponent implements OnInit {
    private api = inject(ApiService);
    private toast = inject(ToastService);

    users = signal<StaffUser[]>([]);
    roles = signal<RoleRecord[]>([]);
    loading = signal(false);
    search = '';
    statusFilter = '';
    selectedRole = signal('');

    ngOnInit() {
        this.loadRoles();
        this.loadUsers();
    }

    loadRoles() {
        this.api.listRoles().subscribe({
            next: r => this.roles.set(r),
            error: () => this.toast.error('Failed to load roles.')
        });
    }

    loadUsers() {
        this.loading.set(true);
        this.api.listUsers({
            q: this.search || undefined,
            is_active: this.statusFilter || undefined,
            role: this.selectedRole() || undefined
        }).subscribe({
            next: r => { this.users.set(r.items); this.loading.set(false); },
            error: () => {
                this.loading.set(false);
                this.toast.error('Failed to load users.');
            }
        });
    }

    onFilterChange() {
        this.loadUsers();
    }

    filterByRole(slug: string) {
        this.selectedRole.set(slug);
        this.loadUsers();
    }

    hasActiveFilters(): boolean {
        return !!(this.search || this.statusFilter);
    }

    clearFilters() {
        this.search = '';
        this.statusFilter = '';
        this.selectedRole.set('');
        this.loadUsers();
    }

    toggleActive(u: StaffUser) {
        this.api.toggleUserActive(u.id).subscribe({
            next: r => {
                this.toast.success(`User ${r.is_active ? 'activated' : 'deactivated'}.`);
                this.loadUsers();
            },
            error: () => this.toast.error('Failed to toggle user status.')
        });
    }

    formatDate(s: string): string {
        if (!s) return '—';
        return new Date(s).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    }
}
