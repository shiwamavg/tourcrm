import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SuperAdminApiService } from '../../core/services/super-admin-api.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
    selector: 'app-sa-companies',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink],
    template: `
    <h1>Companies</h1>
    <div class="toolbar">
        <input class="search" type="text" [(ngModel)]="q" (ngModelChange)="search()" placeholder="Search companies…">
        <select [(ngModel)]="statusFilter" (change)="search()">
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
        </select>
        <select [(ngModel)]="subFilter" (change)="search()">
            <option value="">All subscriptions</option>
            <option value="trial">Trial</option>
            <option value="active">Active</option>
            <option value="expired">Expired</option>
            <option value="cancelled">Cancelled</option>
        </select>
        <button class="btn" (click)="openNew()">+ New Company</button>
    </div>

    @if (showForm()) {
    <div class="form-panel">
        <h3>{{ editingId() ? 'Edit Company' : 'New Company' }}</h3>
        <label>Name <input type="text" [(ngModel)]="form.name" /></label>
        <label>Contact Name <input type="text" [(ngModel)]="form.contact_name" /></label>
        <label>Contact Email <input type="email" [(ngModel)]="form.contact_email" /></label>
        <label>Contact Phone <input type="text" [(ngModel)]="form.contact_phone" /></label>
        <label>Admin Password <input type="password" [(ngModel)]="form.password" [disabled]="!!editingId()" placeholder="{{ editingId() ? 'Leave blank' : 'Required' }}" /></label>
        <label>Package
            <select [(ngModel)]="form.package_id">
                @for (p of packages(); track p.id) {
                    <option [value]="p.id">{{ p.name }}</option>
                }
            </select>
        </label>
        <label>Status
            <select [(ngModel)]="form.status">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
            </select>
        </label>
        <div class="form-actions">
            <button class="btn" (click)="save()" [disabled]="saving()">{{ saving() ? 'Saving…' : 'Save' }}</button>
            <button class="btn ghost" (click)="showForm.set(false)">Cancel</button>
        </div>
    </div>
    }

    <table>
        <thead>
            <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Contact</th>
                <th>Package</th>
                <th>Status</th>
                <th>Subscription</th>
                <th>Trial Ends</th>
                <th>Actions</th>
            </tr>
        </thead>
        <tbody>
            @for (c of companies(); track c.id) {
                <tr>
                    <td>{{ c.id }}</td>
                    <td><a [routerLink]="['/super-admin/companies', c.id]">{{ c.name }}</a></td>
                    <td>{{ c.contact_email }}<br>{{ c.contact_phone }}</td>
                    <td>{{ c.package_name || '-' }}</td>
                    <td><span class="badge" [class]="c.status">{{ c.status }}</span></td>
                    <td><span class="badge" [class]="c.subscription_status">{{ c.subscription_status }}</span></td>
                    <td>{{ c.trial_ends_at | date:'mediumDate' }}</td>
                    <td>
                        <button class="btn small" (click)="edit(c)">Edit</button>
                        @if (c.status === 'active') {
                            <button class="btn small warn" (click)="toggle(c, 'suspended')">Suspend</button>
                        } @else {
                            <button class="btn small" (click)="toggle(c, 'active')">Activate</button>
                        }
                    </td>
                </tr>
            } @empty {
                <tr><td colspan="8" class="empty">No companies found.</td></tr>
            }
        </tbody>
    </table>

    <div class="pagination">
        <button class="btn ghost small" [disabled]="page() <= 1" (click)="prevPage()">Previous</button>
        <span class="pagination-info">Page {{ page() }} of {{ totalPages() }} (Total: {{ total() }} companies)</span>
        <button class="btn ghost small" [disabled]="page() >= totalPages()" (click)="nextPage()">Next</button>
    </div>
    `,
    styles: [`
        h1 { margin:0 0 14px; font-size:1.3rem; }
        .toolbar { display:flex; gap:8px; align-items:center; margin-bottom:14px; }
        .search { flex:1; padding:8px 10px; border:1px solid #d1d5db; border-radius:6px; }
        select { padding:8px 10px; border:1px solid #d1d5db; border-radius:6px; }
        .btn { padding:8px 12px; border:none; border-radius:6px; background:#0f766e; color:#fff; cursor:pointer; font-size:13px; }
        .btn.ghost { background:#f3f4f6; color:#374151; }
        .btn.small { padding:4px 8px; font-size:12px; }
        .btn.warn { background:#b91c1c; }
        .form-panel { background:#fff; border:1px solid #e5e7eb; border-radius:8px; padding:14px; margin-bottom:14px; max-width:540px; }
        .form-panel label { display:flex; flex-direction:column; gap:4px; margin-bottom:10px; font-size:12px; color:#374151; }
        .form-panel input, .form-panel select { padding:8px 10px; border:1px solid #d1d5db; border-radius:6px; }
        .form-actions { display:flex; gap:8px; }
        table { width:100%; border-collapse:collapse; background:#fff; border-radius:8px; overflow:hidden; }
        th, td { padding:10px; text-align:left; border-bottom:1px solid #f3f4f6; font-size:13px; }
        th { background:#f9fafb; color:#6b7280; text-transform:uppercase; font-size:11px; }
        td a { color:#0f766e; text-decoration:none; font-weight:600; }
        .badge { display:inline-block; padding:2px 8px; border-radius:999px; font-size:11px; text-transform:capitalize; }
        .badge.active, .badge.trial { background:#dcfce7; color:#166534; }
        .badge.inactive { background:#f3f4f6; color:#6b7280; }
        .badge.suspended { background:#fee2e2; color:#991b1b; }
        .badge.expired { background:#fef3c7; color:#92400e; }
        .badge.cancelled { background:#e5e7eb; color:#374151; }
        .empty { color:#9ca3af; text-align:center; }
        .pagination { display: flex; align-items: center; justify-content: center; gap: 14px; margin-top: 18px; }
        .pagination-info { font-size: 13px; color: #4b5563; font-weight: 500; }
    `]
})
export class SaCompaniesComponent implements OnInit {
    private api = inject(SuperAdminApiService);
    private toast = inject(ToastService);

    companies = signal<any[]>([]);
    packages = signal<any[]>([]);
    showForm = signal(false);
    saving = signal(false);
    editingId = signal<number | null>(null);
    q = '';
    statusFilter = '';
    subFilter = '';

    // Pagination signals
    page = signal(1);
    total = signal(0);
    limit = signal(20);
    totalPages = computed(() => Math.ceil(this.total() / this.limit()) || 1);

    form: any = { name: '', contact_name: '', contact_email: '', contact_phone: '', password: '', package_id: '', status: 'active' };

    ngOnInit() {
        this.load();
        this.api.listPackages().subscribe(p => this.packages.set(p));
    }

    load() {
        this.api.listCompanies({
            q: this.q,
            status: this.statusFilter,
            subscription_status: this.subFilter,
            page: this.page(),
            limit: this.limit()
        }).subscribe({
            next: r => {
                this.companies.set(r.companies || []);
                this.total.set(r.total || 0);
            },
            error: () => this.toast.error('Failed to load companies')
        });
    }

    search() {
        this.page.set(1);
        this.load();
    }

    prevPage() {
        if (this.page() > 1) {
            this.page.set(this.page() - 1);
            this.load();
        }
    }

    nextPage() {
        if (this.page() < this.totalPages()) {
            this.page.set(this.page() + 1);
            this.load();
        }
    }

    openNew() {
        this.editingId.set(null);
        this.form = { name: '', contact_name: '', contact_email: '', contact_phone: '', password: '', package_id: this.packages()[0]?.id || '', status: 'active' };
        this.showForm.set(true);
    }

    edit(c: any) {
        this.editingId.set(c.id);
        this.form = { name: c.name, contact_name: c.contact_name, contact_email: c.contact_email, contact_phone: c.contact_phone, package_id: c.package_id, status: c.status };
        this.showForm.set(true);
    }

    save() {
        this.saving.set(true);
        const payload = { ...this.form };
        if (this.editingId()) {
            delete payload.password;
            this.api.updateCompany(this.editingId()!, payload).subscribe({
                next: () => { this.saving.set(false); this.showForm.set(false); this.load(); this.toast.success('Company updated'); },
                error: () => { this.saving.set(false); this.toast.error('Update failed'); }
            });
        } else {
            this.api.createCompany(payload).subscribe({
                next: () => { this.saving.set(false); this.showForm.set(false); this.load(); this.toast.success('Company created'); },
                error: () => { this.saving.set(false); this.toast.error('Creation failed'); }
            });
        }
    }

    toggle(c: any, status: string) {
        this.api.toggleCompanyStatus(c.id, status).subscribe({
            next: () => { this.load(); this.toast.success(`Company ${status}`); },
            error: () => this.toast.error('Action failed')
        });
    }
}
