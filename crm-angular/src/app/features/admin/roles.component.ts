import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { RoleRecord } from '../../core/models';

@Component({
    selector: 'app-roles',
    standalone: true,
    imports: [CommonModule, RouterLink],
    template: `
    <div class="page-head">
        <div>
            <h1>Roles & Permissions</h1>
            <p class="muted">CRM workflow roles and their access levels</p>
        </div>
        <div class="actions">
            <a routerLink="/admin/users" class="btn btn-outline">← Back to Users</a>
        </div>
    </div>

    @if (loading()) {
        <div class="empty"><span class="spinner"></span> Loading roles…</div>
    } @else {
        <div class="roles-grid">
            @for (r of roles(); track r.id) {
                <div class="role-panel">
                    <div class="role-header">
                        <div class="role-title">{{ r.name }}</div>
                        <div class="role-slug">{{ r.slug }}</div>
                    </div>
                    <div class="role-desc">{{ r.description }}</div>

                    <div class="perms-list">
                        @for (perm of permissionsFor(r); track perm.module) {
                            <div class="perm-row">
                                <div class="perm-module">{{ perm.module }}</div>
                                <div class="perm-actions">
                                    @for (a of perm.actions; track a) {
                                        <span class="perm-badge">{{ a }}</span>
                                    }
                                </div>
                            </div>
                        } @empty {
                            <div class="perm-row no-perms">No permissions assigned</div>
                        }
                    </div>
                </div>
            }
        </div>

        <div class="summary-box">
            <h3>Role Summary</h3>
            <ul>
                <li><strong>Super Admin</strong> – Full system access. Can manage users, settings, finance, and everything.</li>
                <li><strong>Sales Manager</strong> – Manages leads, quotations, bookings, and team performance. Can view analytics.</li>
                <li><strong>Telecaller / Sales Executive</strong> – Handles lead calls, creates quotations, and follows up. Read-only on bookings and payments.</li>
                <li><strong>Accounts</strong> – Handles payments, invoices, and financial records. Read-only on leads and quotations.</li>
            </ul>
        </div>
    }
    `,
    styles: [`
        .page-head { display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:14px; }
        @media (max-width: 600px) {
            .page-head { flex-direction: column; align-items: flex-start; gap: 10px; }
        }
        .page-head h1 { margin:0 0 4px; }
        .muted { color:#6b7280; margin:0; }
        .actions { display:flex; gap:8px; }
        .btn { padding:8px 14px; border:none; border-radius:6px; cursor:pointer; font:inherit; text-decoration:none; }
        .btn-outline { background:#fff; color:#374151; border:1px solid #d1d5db; }
        .roles-grid { display:grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap:14px; margin-bottom:20px; }
        .role-panel {
            background:#fff; border-radius:8px; box-shadow:0 1px 2px rgba(0,0,0,.04);
            padding:16px 18px; border-top:4px solid #0f766e;
        }
        .role-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; }
        .role-title { font-weight:700; font-size:15px; color:#111827; }
        .role-slug { font-size:11px; color:#6b7280; background:#f3f4f6; padding:2px 8px; border-radius:10px; text-transform:uppercase; }
        .role-desc { font-size:13px; color:#6b7280; margin-bottom:12px; }
        .perms-list { border-top:1px solid #f3f4f6; padding-top:10px; }
        .perm-row { display:flex; justify-content:space-between; align-items:flex-start; padding:6px 0; border-bottom:1px solid #f9fafb; }
        .perm-row:last-child { border-bottom:none; }
        .perm-module { font-size:13px; font-weight:600; color:#374151; text-transform:capitalize; min-width:100px; }
        .perm-actions { display:flex; flex-wrap:wrap; gap:4px; justify-content:flex-end; }
        .perm-badge {
            font-size:10px; padding:2px 6px; border-radius:4px; background:#e0e7ff; color:#3730a3;
            text-transform:uppercase; font-weight:600;
        }
        .no-perms { color:#9ca3af; font-style:italic; }
        .summary-box {
            background:#f9fafb; border-radius:8px; padding:16px 18px;
        }
        .summary-box h3 { margin:0 0 10px; font-size:15px; }
        .summary-box ul { margin:0; padding-left:18px; }
        .summary-box li { margin-bottom:6px; font-size:13px; color:#374151; }
        .empty { text-align:center; color:#6b7280; padding:40px; }
    `]
})
export class RolesComponent implements OnInit {
    private api = inject(ApiService);
    private toast = inject(ToastService);

    roles = signal<RoleRecord[]>([]);
    loading = signal(true);

    ngOnInit() {
        this.loadRoles();
    }

    loadRoles() {
        this.api.listRoles().subscribe({
            next: r => { this.roles.set(r); this.loading.set(false); },
            error: () => {
                this.loading.set(false);
                this.toast.error('Failed to load roles.');
            }
        });
    }

    permissionsFor(r: RoleRecord) {
        if (!r.permissions) return [];
        return Object.entries(r.permissions).map(([module, actions]) => ({
            module: module.charAt(0).toUpperCase() + module.slice(1),
            actions: actions as string[]
        }));
    }
}
