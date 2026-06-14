import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SuperAdminApiService } from '../../core/services/super-admin-api.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
    selector: 'app-sa-payments',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <h1>Company Payments</h1>
    <div class="toolbar">
        <select [(ngModel)]="companyId" (change)="load()">
            <option value="">All companies</option>
            @for (c of companies(); track c.id) {
                <option [value]="c.id">{{ c.name }}</option>
            }
        </select>
        <select [(ngModel)]="status" (change)="load()">
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
        </select>
        <button class="btn" (click)="openNew()">+ Record Payment</button>
    </div>

    @if (showForm()) {
    <div class="form-panel">
        <h3>Record Payment</h3>
        <label>Company
            <select [(ngModel)]="form.company_id">
                @for (c of companies(); track c.id) {
                    <option [value]="c.id">{{ c.name }}</option>
                }
            </select>
        </label>
        <label>Amount (INR) <input type="number" [(ngModel)]="form.amount" /></label>
        <label>Method
            <select [(ngModel)]="form.payment_method">
                <option value="razorpay">Razorpay</option>
                <option value="stripe">Stripe</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="upi">UPI</option>
                <option value="cash">Cash</option>
            </select>
        </label>
        <label>Transaction ID <input type="text" [(ngModel)]="form.transaction_id" /></label>
        <label>Status
            <select [(ngModel)]="form.status">
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
            </select>
        </label>
        <label>Notes <textarea [(ngModel)]="form.notes" rows="2"></textarea></label>
        <div class="form-actions">
            <button class="btn" (click)="save()" [disabled]="saving()">{{ saving() ? 'Saving…' : 'Save' }}</button>
            <button class="btn ghost" (click)="showForm.set(false)">Cancel</button>
        </div>
    </div>
    }

    <table>
        <thead>
            <tr><th>ID</th><th>Company</th><th>Amount</th><th>Method</th><th>Status</th><th>Date</th><th>Actions</th></tr>
        </thead>
        <tbody>
            @for (p of payments(); track p.id) {
                <tr>
                    <td>{{ p.id }}</td>
                    <td>{{ p.company_name || '#' + p.company_id }}</td>
                    <td>₹{{ p.amount | number }}</td>
                    <td>{{ p.payment_method }}</td>
                    <td><span class="badge" [class]="p.status">{{ p.status }}</span></td>
                    <td>{{ p.created_at | date:'short' }}</td>
                    <td>
                        <button class="btn small ghost" (click)="download(p.id)">📄 PDF Receipt</button>
                    </td>
                </tr>
            } @empty {
                <tr><td colspan="7" class="empty">No payments found.</td></tr>
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
        .form-panel input, .form-panel select, .form-panel textarea { padding:8px 10px; border:1px solid #d1d5db; border-radius:6px; }
        .form-actions { display:flex; gap:8px; }
        table { width:100%; border-collapse:collapse; background:#fff; border-radius:8px; overflow:hidden; }
        th, td { padding:10px; text-align:left; border-bottom:1px solid #f3f4f6; font-size:13px; }
        th { background:#f9fafb; color:#6b7280; text-transform:uppercase; font-size:11px; }
        .badge { display:inline-block; padding:2px 8px; border-radius:999px; font-size:11px; text-transform:capitalize; }
        .badge.pending { background:#fef3c7; color:#92400e; }
        .badge.completed { background:#dcfce7; color:#166534; }
        .badge.failed { background:#fee2e2; color:#991b1b; }
        .badge.refunded { background:#e5e7eb; color:#374151; }
        .empty { color:#9ca3af; text-align:center; }
    `]
})
export class SaPaymentsComponent implements OnInit {
    private api = inject(SuperAdminApiService);
    private toast = inject(ToastService);

    payments = signal<any[]>([]);
    companies = signal<any[]>([]);
    showForm = signal(false);
    saving = signal(false);
    companyId = '';
    status = '';

    form: any = { company_id: '', amount: '', payment_method: 'razorpay', transaction_id: '', status: 'completed', notes: '' };

    ngOnInit() {
        this.api.listCompanies({}).subscribe(r => this.companies.set(r.companies || []));
        this.load();
    }

    load() {
        const params: any = {};
        if (this.companyId) params.company_id = Number(this.companyId);
        if (this.status) params.status = this.status;
        this.api.listPayments(params).subscribe({
            next: r => this.payments.set(r.payments || []),
            error: () => this.toast.error('Failed to load payments')
        });
    }

    openNew() {
        this.form = { company_id: this.companies()[0]?.id || '', amount: '', payment_method: 'razorpay', transaction_id: '', status: 'completed', notes: '' };
        this.showForm.set(true);
    }

    save() {
        this.saving.set(true);
        this.api.createPayment(this.form).subscribe({
            next: () => { this.saving.set(false); this.showForm.set(false); this.load(); this.toast.success('Payment recorded'); },
            error: () => { this.saving.set(false); this.toast.error('Failed to record payment'); }
        });
    }

    download(id: number) {
        const token = localStorage.getItem('sa_token');
        const url = this.api.paymentPdfUrl(id);
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
