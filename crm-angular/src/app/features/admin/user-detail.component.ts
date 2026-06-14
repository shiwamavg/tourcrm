import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { StaffUser, RoleRecord } from '../../core/models';

@Component({
    selector: 'app-user-detail',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink],
    template: `
    <div class="page-head">
        <div>
            <a routerLink="/admin/users" class="back-link">← All users</a>
            <h1>{{ isEdit() ? 'Edit User' : 'New User' }}</h1>
            <p class="muted">{{ isEdit() ? 'Update staff member details and role' : 'Add a new staff member to the CRM' }}</p>
        </div>
    </div>

    @if (loading()) {
        <div class="empty"><span class="spinner"></span> Loading…</div>
    } @else {
        <form (ngSubmit)="submit()" class="form-card">
            <div class="grid">
                <label>
                    <span>Full name <span class="req">*</span></span>
                    <input [(ngModel)]="form.full_name" name="full_name" required placeholder="Full name">
                </label>
                <label>
                    <span>Email <span class="req">*</span></span>
                    <input type="email" [(ngModel)]="form.email" name="email" required placeholder="email@tourcrm.local">
                </label>
                <label>
                    <span>Phone</span>
                    <input [(ngModel)]="form.phone" name="phone" placeholder="+91 98xxx xxxxx">
                </label>
                <label>
                    <span>Role <span class="req">*</span></span>
                    <select [(ngModel)]="form.role" name="role" required>
                        <option value="">Select role…</option>
                        @for (r of roles(); track r.id) {
                            <option [value]="r.slug">{{ r.name }}</option>
                        }
                    </select>
                </label>
                @if (!isEdit()) {
                    <label>
                        <span>Password <span class="req">*</span></span>
                        <input type="password" [(ngModel)]="form.password" name="password" required placeholder="Min 6 characters">
                    </label>
                }
                <label>
                    <span>Status</span>
                    <select [(ngModel)]="form.is_active" name="is_active">
                        <option [ngValue]="true">Active</option>
                        <option [ngValue]="false">Inactive</option>
                    </select>
                </label>
            </div>

            @if (isEdit() && selectedRole()) {
                <div class="permissions-box">
                    <h4>Role Permissions: {{ selectedRole()?.name }}</h4>
                    <div class="perm-grid">
                        @for (perm of selectedRolePermissions(); track perm.module) {
                            <div class="perm-card">
                                <strong>{{ perm.module }}</strong>
                                <div class="perm-tags">
                                    @for (p of perm.actions; track p) {
                                        <span class="perm-tag">{{ p }}</span>
                                    }
                                </div>
                            </div>
                        }
                    </div>
                </div>
            }

            @if (error()) {
                <div class="error">{{ error() }}</div>
            }

            <div class="actions">
                <a routerLink="/admin/users" class="btn btn-outline">Cancel</a>
                <button type="submit" class="btn btn-primary" [disabled]="saving()">
                    @if (saving()) { Saving… } @else { {{ isEdit() ? 'Update User' : 'Create User' }} }
                </button>
            </div>
        </form>

        @if (isEdit()) {
            <div class="form-card danger-zone">
                <h4>Reset Password</h4>
                <p class="muted">Set a new password for this user. They will need to log in again.</p>
                <div class="flex gap-2 mt-2">
                    <input type="password" [(ngModel)]="newPassword" placeholder="New password (min 6 chars)" style="flex:1">
                    <button class="btn btn-danger" [disabled]="!newPassword || newPassword.length < 6 || resetting()"
                            (click)="resetPassword()">
                        {{ resetting() ? 'Resetting…' : 'Reset Password' }}
                    </button>
                </div>
            </div>
        }
    }
    `,
    styles: [`
        .page-head { display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:14px; }
        .page-head h1 { margin:6px 0 4px; }
        .back-link { color:#0f766e; text-decoration:none; font-size:13px; }
        .muted { color:#6b7280; margin:0; }
        .form-card {
            background:#fff; border-radius:8px; box-shadow:0 1px 2px rgba(0,0,0,.04);
            padding:20px 22px; max-width:720px; margin-bottom:16px;
        }
        .grid { display:grid; grid-template-columns: 1fr 1fr; gap:12px 16px; }
        label { display:flex; flex-direction:column; gap:4px; font-size:13px; }
        label > span { color:#374151; }
        .req { color:#dc2626; }
        input, select {
            padding:8px 10px; border:1px solid #d1d5db; border-radius:6px;
            font:inherit; background:#fff;
        }
        input:focus, select:focus { outline:none; border-color:#0f766e; box-shadow:0 0 0 3px rgba(15,118,110,.1); }
        .permissions-box { margin-top:16px; background:#f9fafb; border-radius:6px; padding:14px 16px; }
        .permissions-box h4 { margin:0 0 10px; font-size:14px; }
        .perm-grid { display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:10px; }
        .perm-card { background:#fff; border:1px solid #e5e7eb; border-radius:6px; padding:10px 12px; font-size:12px; }
        .perm-tags { display:flex; flex-wrap:wrap; gap:4px; margin-top:6px; }
        .perm-tag { background:#e0e7ff; color:#3730a3; font-size:10px; padding:2px 6px; border-radius:4px; text-transform:uppercase; }
        .error { background:#fee2e2; color:#991b1b; padding:10px 12px; border-radius:6px; margin-top:12px; font-size:13px; }
        .actions { display:flex; gap:8px; justify-content:flex-end; margin-top:16px; }
        .btn { padding:8px 14px; border:none; border-radius:6px; cursor:pointer; font:inherit; text-decoration:none; }
        .btn-primary { background:#0f766e; color:#fff; }
        .btn-primary:hover:not(:disabled) { background:#115e59; }
        .btn-primary:disabled { opacity:.5; cursor:not-allowed; }
        .btn-outline { background:#fff; color:#374151; border:1px solid #d1d5db; }
        .btn-danger { background:#dc2626; color:#fff; }
        .btn-danger:hover:not(:disabled) { background:#b91c1c; }
        .danger-zone { border:1px solid #fecaca; background:#fef2f2; }
        .danger-zone h4 { color:#991b1b; margin:0 0 4px; }
        .flex { display:flex; gap:10px; }
        .mt-2 { margin-top:8px; }
        .empty { text-align:center; color:#6b7280; padding:40px; }
    `]
})
export class UserDetailComponent implements OnInit {
    private api = inject(ApiService);
    private toast = inject(ToastService);
    private route = inject(ActivatedRoute);
    private router = inject(Router);

    loading = signal(true);
    saving = signal(false);
    resetting = signal(false);
    error = signal<string | null>(null);
    roles = signal<RoleRecord[]>([]);
    userId = signal<number | null>(null);
    newPassword = '';

    form = {
        full_name: '',
        email: '',
        phone: '',
        role: '' as 'admin' | 'manager' | 'telecaller' | 'accounts' | '',
        password: '',
        is_active: true
    };

    ngOnInit() {
        this.loadRoles();
        const id = this.route.snapshot.paramMap.get('id');
        if (id && id !== 'new') {
            this.userId.set(+id);
            this.loadUser(+id);
        } else {
            this.loading.set(false);
        }
    }

    loadRoles() {
        this.api.listRoles().subscribe({
            next: r => this.roles.set(r),
            error: () => this.toast.error('Failed to load roles.')
        });
    }

    loadUser(id: number) {
        this.api.getUser(id).subscribe({
            next: u => {
                this.form.full_name = u.full_name;
                this.form.email = u.email;
                this.form.phone = u.phone || '';
                this.form.role = u.role;
                this.form.is_active = u.is_active;
                this.loading.set(false);
            },
            error: () => {
                this.loading.set(false);
                this.toast.error('Failed to load user.');
            }
        });
    }

    isEdit() { return this.userId() !== null; }

    selectedRole() {
        return this.roles().find(r => r.slug === this.form.role);
    }

    selectedRolePermissions() {
        const r = this.selectedRole();
        if (!r) return [];
        return Object.entries(r.permissions).map(([module, actions]) => ({
            module: module.charAt(0).toUpperCase() + module.slice(1),
            actions: actions as string[]
        }));
    }

    submit() {
        this.error.set(null);
        if (!this.form.full_name.trim()) { this.error.set('Name is required.'); return; }
        if (!this.form.email.trim()) { this.error.set('Email is required.'); return; }
        if (!this.form.role) { this.error.set('Role is required.'); return; }
        if (!this.isEdit() && (!this.form.password || this.form.password.length < 6)) {
            this.error.set('Password must be at least 6 characters.'); return;
        }

        this.saving.set(true);
        const payload: any = {
            full_name: this.form.full_name,
            email: this.form.email,
            phone: this.form.phone || null,
            role: this.form.role,
            is_active: this.form.is_active
        };
        if (!this.isEdit()) payload.password = this.form.password;

        if (this.isEdit()) {
            this.api.updateUser(this.userId()!, payload).subscribe({
                next: () => {
                    this.toast.success('User updated successfully.');
                    this.router.navigate(['/admin/users']);
                },
                error: e => {
                    this.error.set(e.error?.error || 'Update failed.');
                    this.saving.set(false);
                }
            });
        } else {
            this.api.createUser(payload).subscribe({
                next: () => {
                    this.toast.success('User created successfully.');
                    this.router.navigate(['/admin/users']);
                },
                error: e => {
                    this.error.set(e.error?.error || 'Creation failed.');
                    this.saving.set(false);
                }
            });
        }
    }

    resetPassword() {
        if (!this.newPassword || this.newPassword.length < 6) return;
        this.resetting.set(true);
        this.api.resetUserPassword(this.userId()!, this.newPassword).subscribe({
            next: () => {
                this.toast.success('Password reset successfully.');
                this.newPassword = '';
                this.resetting.set(false);
            },
            error: () => {
                this.toast.error('Password reset failed.');
                this.resetting.set(false);
            }
        });
    }
}
