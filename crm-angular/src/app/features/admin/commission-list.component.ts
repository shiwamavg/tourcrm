import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
    selector: 'app-commission-list',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, FormsModule],
    template: `
    <div class="page-header">
        <div>
            <h1>Agent Commissions</h1>
            <p>Track commissions earned by B2B agent partners and record payouts</p>
        </div>
    </div>

    @if (payingId() !== null) {
        <div class="card bg-accent-soft" style="border: 2px solid var(--primary-color)">
            <h2 style="margin:0 0 1rem 0;border:none;padding:0">Record Commission Payout</h2>
            <form [formGroup]="payoutForm" (ngSubmit)="submitPayout()">
                <div class="form-grid-2" style="margin-bottom:1rem">
                    <div class="form-group">
                        <label>Payment Reference / Transaction ID <span class="req">*</span></label>
                        <input type="text" formControlName="payment_reference" placeholder="e.g. Bank Transfer ID, Cheque No." style="width:100%">
                    </div>
                    <div class="form-group">
                        <label>Notes / Comments</label>
                        <input type="text" formControlName="notes" placeholder="optional notes" style="width:100%">
                    </div>
                </div>
                <div class="flex" style="gap:0.5rem">
                    <button type="submit" class="btn btn-primary" [disabled]="savingPayout() || payoutForm.invalid">
                        @if (savingPayout()) { <span class="spinner"></span> Processing… }
                        @else { Confirm Payout }
                    </button>
                    <button type="button" class="btn" (click)="cancelPayout()">Cancel</button>
                </div>
            </form>
        </div>
    }

    <div class="card">
        <div class="section-header">
            <h2 style="margin:0;border:none;padding:0">Commission Log ({{ total() }})</h2>
            <div class="flex" style="gap:0.5rem">
                <select [ngModel]="filterStatus()" (ngModelChange)="onFilterStatusChange($event)" style="min-width:180px">
                    <option value="">All Statuses</option>
                    <option value="pending">Pending Payment</option>
                    <option value="approved">Approved</option>
                    <option value="paid">Paid</option>
                    <option value="cancelled">Cancelled</option>
                </select>
                <select [ngModel]="limit()" (ngModelChange)="onLimitChange($event)">
                    <option [ngValue]="10">10</option>
                    <option [ngValue]="20">20</option>
                    <option [ngValue]="50">50</option>
                </select>
            </div>
        </div>
        <div class="table-wrap" style="box-shadow:none">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Agent / Agency</th>
                        <th>Booking / Client</th>
                        <th>Booking Total</th>
                        <th>Commission Amt</th>
                        <th>Payout Status</th>
                        <th>Payment Details</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    @for (c of items(); track c.id) {
                        <tr>
                            <td>
                                @if (c.agency_name) {
                                    <strong>{{ c.agency_name }}</strong>
                                    <div style="font-size:0.85rem;color:var(--text-muted)">{{ c.agent_name }}</div>
                                } @else if (c.referrer_booking_number) {
                                    <strong>Customer Referral</strong>
                                    <div style="font-size:0.85rem;color:var(--text-muted)">Booking: {{ c.referrer_booking_number }}</div>
                                } @else {
                                    <span style="color:var(--text-muted)">System / General</span>
                                }
                            </td>
                            <td>
                                <strong>{{ c.booking_number }}</strong>
                                <div style="font-size:0.85rem;color:var(--text-muted)">{{ c.client_name }}</div>
                            </td>
                            <td>₹{{ c.total_amount | number:'1.2-2' }}</td>
                            <td style="color:var(--primary-color);font-weight:bold">₹{{ c.amount | number:'1.2-2' }}</td>
                            <td>
                                @if (c.status === 'paid') {
                                    <span class="badge badge-accepted">Paid</span>
                                } @else if (c.status === 'approved') {
                                    <span class="badge badge-partial">Approved</span>
                                } @else if (c.status === 'pending') {
                                    <span class="badge badge-draft">Pending</span>
                                } @else {
                                    <span class="badge badge-rejected">Cancelled</span>
                                }
                            </td>
                            <td>
                                @if (c.status === 'paid') {
                                    <div>Ref: {{ c.payment_reference }}</div>
                                    <div style="font-size:0.85rem;color:var(--text-muted)">Paid: {{ c.paid_at | date:'short' }}</div>
                                } @else {
                                    <span style="color:var(--text-muted)">—</span>
                                }
                            </td>
                            <td>
                                @if (c.status === 'pending' || c.status === 'approved') {
                                    <button class="btn btn-sm btn-primary" (click)="startPayout(c.id)">Record Payout</button>
                                } @else {
                                    <button class="btn btn-sm" disabled>No Action</button>
                                }
                            </td>
                        </tr>
                    } @empty {
                        <tr><td colspan="7" class="empty-state">No commissions recorded yet</td></tr>
                    }
                </tbody>
            </table>
        </div>
        <div class="pagination-bar">
            <button class="btn btn-sm" [disabled]="page() === 1 || loading()" (click)="prevPage()">Prev</button>
            <span>Page {{ page() }} of {{ totalPages() }}</span>
            <button class="btn btn-sm" [disabled]="page() >= totalPages() || loading()" (click)="nextPage()">Next</button>
        </div>
    </div>
    `
})
export class CommissionListComponent implements OnInit {
    private api = inject(ApiService);
    private fb = inject(FormBuilder);
    private toast = inject(ToastService);

    items = signal<any[]>([]);
    total = signal(0);
    page = signal(1);
    limit = signal(20);
    filterStatus = signal('');
    loading = signal(false);
    savingPayout = signal(false);
    payingId = signal<number | null>(null);

    payoutForm: FormGroup = this.fb.group({
        payment_reference: ['', Validators.required],
        notes: ['']
    });

    totalPages = () => Math.max(1, Math.ceil(this.total() / this.limit()));

    ngOnInit() { this.fetch(); }

    fetch() {
        this.loading.set(true);
        this.api.listCommissions({
            status: this.filterStatus(),
            page: this.page(),
            limit: this.limit()
        }).subscribe({
            next: (res) => {
                this.items.set(res.items);
                this.total.set(res.total);
                this.loading.set(false);
            },
            error: () => {
                this.loading.set(false);
                this.toast.error('Failed to load commissions');
            }
        });
    }

    onFilterStatusChange(val: string) {
        this.filterStatus.set(val);
        this.page.set(1);
        this.fetch();
    }

    onLimitChange(val: number) {
        this.limit.set(val);
        this.page.set(1);
        this.fetch();
    }

    prevPage() {
        if (this.page() > 1) {
            this.page.update(p => p - 1);
            this.fetch();
        }
    }

    nextPage() {
        if (this.page() < this.totalPages()) {
            this.page.update(p => p + 1);
            this.fetch();
        }
    }

    startPayout(id: number) {
        this.payingId.set(id);
        this.payoutForm.reset();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    cancelPayout() {
        this.payingId.set(null);
    }

    submitPayout() {
        if (this.payoutForm.invalid || this.payingId() === null) return;
        this.savingPayout.set(true);
        const id = this.payingId()!;
        this.api.payCommission(id, this.payoutForm.value).subscribe({
            next: () => {
                this.savingPayout.set(false);
                this.toast.success('Payout recorded successfully');
                this.cancelPayout();
                this.fetch();
            },
            error: (err) => {
                this.savingPayout.set(false);
                this.toast.error(err.error?.error || 'Failed to record payout');
            }
        });
    }
}
