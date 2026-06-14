import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SuperAdminApiService } from '../../core/services/super-admin-api.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
    selector: 'app-sa-invoices',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <h1>Invoices</h1>
    <div class="toolbar">
        <select [(ngModel)]="companyId" (change)="load()">
            <option value="">All companies</option>
            @for (c of companies(); track c.id) {
                <option [value]="c.id">{{ c.name }}</option>
            }
        </select>
        <select [(ngModel)]="status" (change)="load()">
            <option value="">All statuses</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
            <option value="cancelled">Cancelled</option>
        </select>
        <button class="btn" (click)="openNew()">+ New Invoice</button>
    </div>

    @if (showForm()) {
    <div class="form-panel">
        <h3>New Invoice</h3>
        <label>Company
            <select [(ngModel)]="form.company_id">
                @for (c of companies(); track c.id) {
                    <option [value]="c.id">{{ c.name }}</option>
                }
            </select>
        </label>
        <label>Amount (INR) <input type="number" [(ngModel)]="form.amount" /></label>
        <label>Description <input type="text" [(ngModel)]="form.description" /></label>
        <label>Due Date <input type="date" [(ngModel)]="form.due_date" /></label>
        <div class="form-actions">
            <button class="btn" (click)="save()" [disabled]="saving()">{{ saving() ? 'Saving…' : 'Create' }}</button>
            <button class="btn ghost" (click)="showForm.set(false)">Cancel</button>
        </div>
    </div>
    }

    <table>
        <thead>
            <tr><th>ID</th><th>Company</th><th>Amount</th><th>Status</th><th>Due</th><th>Created</th><th>Actions</th></tr>
        </thead>
        <tbody>
            @for (inv of invoices(); track inv.id) {
                <tr>
                    <td>{{ inv.invoice_number }}</td>
                    <td>{{ inv.company_name || '#' + inv.company_id }}</td>
                    <td>₹{{ inv.amount | number }}</td>
                    <td><span class="badge" [class]="inv.status">{{ inv.status }}</span></td>
                    <td>{{ inv.due_date | date:'mediumDate' }}</td>
                    <td>{{ inv.created_at | date:'short' }}</td>
                    <td>
                        @if (inv.status === 'draft' || inv.status === 'sent') {
                            <button class="btn small" (click)="mark(inv, 'paid')">Mark Paid</button>
                        }
                        @if (inv.status === 'draft') {
                            <button class="btn small" (click)="mark(inv, 'sent')">Send</button>
                        }
                        <button class="btn small ghost" (click)="download(inv.id)" style="margin-left:4px;">📄 Download</button>
                    </td>
                </tr>
            } @empty {
                <tr><td colspan="7" class="empty">No invoices found.</td></tr>
            }
        </tbody>
    </table>
    `,
    styles: [`
        h1 { margin:0 0 14px; font-size:1.3rem; }
        .toolbar { display:flex; gap:8px; align-items:center; margin-bottom:14px; }
        select { padding:8px 10px; border:1px solid #d1d5db; border-radius:6px; }
        .btn { padding:8px 12px; border:none; border-radius:6px; background:#0f766e; color:#fff; cursor:pointer; font-size:13px; }
        .btn.ghost { background:#f3f4f6; color:#374151; }
        .btn.small { padding:4px 8px; font-size:12px; }
        .btn.small.ghost { background:#f3f4f6; color:#374151; border:1px solid #d1d5db; }
        .form-panel { background:#fff; border:1px solid #e5e7eb; border-radius:8px; padding:14px; margin-bottom:14px; max-width:540px; }
        .form-panel label { display:flex; flex-direction:column; gap:4px; margin-bottom:10px; font-size:12px; color:#374151; }
        .form-panel input, .form-panel select { padding:8px 10px; border:1px solid #d1d5db; border-radius:6px; }
        .form-actions { display:flex; gap:8px; }
        table { width:100%; border-collapse:collapse; background:#fff; border-radius:8px; overflow:hidden; }
        th, td { padding:10px; text-align:left; border-bottom:1px solid #f3f4f6; font-size:13px; }
        th { background:#f9fafb; color:#6b7280; text-transform:uppercase; font-size:11px; }
        .badge { display:inline-block; padding:2px 8px; border-radius:999px; font-size:11px; text-transform:capitalize; }
        .badge.draft { background:#e5e7eb; color:#374151; }
        .badge.sent { background:#dbeafe; color:#1d4ed8; }
        .badge.paid { background:#dcfce7; color:#166534; }
        .badge.overdue { background:#fee2e2; color:#991b1b; }
        .badge.cancelled { background:#fce7f3; color:#9d174d; }
        .empty { color:#9ca3af; text-align:center; }
    `]
})
export class SaInvoicesComponent implements OnInit {
    private api = inject(SuperAdminApiService);
    private toast = inject(ToastService);

    invoices = signal<any[]>([]);
    companies = signal<any[]>([]);
    showForm = signal(false);
    saving = signal(false);
    companyId = '';
    status = '';

    form: any = { company_id: '', amount: '', description: 'Subscription', due_date: '' };

    ngOnInit() {
        this.api.listCompanies({}).subscribe(r => this.companies.set(r.companies || []));
        this.load();
    }

    load() {
        const params: any = {};
        if (this.companyId) params.company_id = Number(this.companyId);
        if (this.status) params.status = this.status;
        this.api.listInvoices(params).subscribe({
            next: r => this.invoices.set(r.invoices || []),
            error: () => this.toast.error('Failed to load invoices')
        });
    }

    openNew() {
        const today = new Date();
        const due = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate()).toISOString().split('T')[0];
        this.form = { company_id: this.companies()[0]?.id || '', amount: '', description: 'Subscription', due_date: due };
        this.showForm.set(true);
    }

    save() {
        this.saving.set(true);
        this.api.createInvoice(this.form).subscribe({
            next: () => { this.saving.set(false); this.showForm.set(false); this.load(); this.toast.success('Invoice created'); },
            error: () => { this.saving.set(false); this.toast.error('Failed to create invoice'); }
        });
    }

    mark(inv: any, status: string) {
        this.api.updateInvoice(inv.id, { status }).subscribe({
            next: () => { this.load(); this.toast.success('Invoice updated'); },
            error: () => this.toast.error('Update failed')
        });
    }

    download(id: number) {
        const token = localStorage.getItem('sa_token');
        const url = this.api.invoicePdfUrl(id);
        if (!token) { window.open(url, '_blank'); return; }
        fetch(url, { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.blob())
            .then(blob => {
                const objUrl = URL.createObjectURL(blob);
                window.open(objUrl, '_blank');
                setTimeout(() => URL.revokeObjectURL(objUrl), 60_000);
            });
    }
}
