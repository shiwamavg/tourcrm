import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';

@Component({
    selector: 'app-booking-detail',
    standalone: true,
    imports: [CommonModule, RouterLink, ReactiveFormsModule],
    template: `
    <a routerLink="/bookings" class="btn-ghost" style="margin-bottom:16px;display:inline-flex;gap:6px;">← Bookings</a>

    @if (booking()) {
    <div class="page-header">
        <div>
            <h1>{{ booking().booking_number }}</h1>
            <p class="text-muted">{{ booking().customer_name }} · {{ booking().destination_text }}</p>
        </div>
        <div class="flex gap-2">
            <span class="badge badge-{{ booking().status }}" style="padding:6px 14px;">{{ booking().status }}</span>
            <span class="badge badge-{{ booking().payment_status }}" style="padding:6px 14px;">{{ booking().payment_status }}</span>
        </div>
    </div>

    <!-- Financial summary -->
    <div class="stats-grid" style="grid-template-columns:repeat(3,1fr);">
        <div class="stat-card">
            <div class="stat-label">Total Amount</div>
            <div class="stat-value">₹{{ fmt(booking().total_amount) }}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Paid</div>
            <div class="stat-value" style="color:var(--success);">₹{{ fmt(booking().total_paid) }}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Balance Due</div>
            <div class="stat-value" [style.color]="parseFloat(booking().balance_due)>0?'var(--danger)':'var(--success)'">₹{{ fmt(booking().balance_due) }}</div>
        </div>
    </div>

    <div style="display:grid;grid-template-columns:2fr 1fr;gap:20px;align-items:start;">
        <div>
            <!-- Trip details -->
            <div class="card mb-4">
                <div class="card-header"><h2>Trip Details</h2></div>
                <div class="card-body">
                    <div class="form-grid-2">
                        <div><label class="text-muted text-sm">Destination</label><p>{{ booking().destination_text }}</p></div>
                        <div><label class="text-muted text-sm">Dates</label><p>{{ fmtDate(booking().trip_start_date) }} → {{ fmtDate(booking().trip_end_date) }}</p></div>
                        <div><label class="text-muted text-sm">Adults</label><p>{{ booking().adults }}</p></div>
                        <div><label class="text-muted text-sm">Customer</label><p>{{ booking().customer_name }}<br><span class="text-muted text-sm">{{ booking().customer_phone }} · {{ booking().customer_email }}</span></p></div>
                        <div><label class="text-muted text-sm">Booking Fee</label><p>₹{{ fmt(booking().booking_fee_amount) }} ({{ booking().booking_fee_pct }}%)</p></div>
                        <div><label class="text-muted text-sm">Created By</label><p>{{ booking().created_by_name }}</p></div>
                    </div>
                    @if (booking().special_requests) {
                        <div style="margin-top:14px;padding-top:14px;border-top:1px solid var(--border);">
                            <label class="text-muted text-sm">Special Requests</label><p>{{ booking().special_requests }}</p>
                        </div>
                    }
                </div>
            </div>

            <!-- Payment history -->
            <div class="card mb-4">
                <div class="card-header"><h2>Payment History</h2></div>
                @if (booking().payments?.length) {
                <table class="data-table">
                    <thead><tr><th>Date</th><th>Method</th><th>Reference</th><th>Amount</th><th>Status</th></tr></thead>
                    <tbody>
                        @for (p of booking().payments; track p.id) {
                            <tr>
                                <td>{{ fmtDate(p.payment_date) }}</td>
                                <td>{{ p.payment_method.replace(/_/g,' ') }}</td>
                                <td class="text-muted text-sm">{{ p.reference_number || '—' }}</td>
                                <td style="font-weight:600;">₹{{ fmt(p.amount) }}</td>
                                <td><span class="badge badge-{{ p.payment_status }}">{{ p.payment_status }}</span></td>
                            </tr>
                        }
                    </tbody>
                </table>
                } @else {
                    <div class="card-body"><p class="text-muted">No payments recorded yet.</p></div>
                }
            </div>

            <!-- Invoice -->
            @if (booking().invoice) {
            <div class="card">
                <div class="card-header"><h2>Invoice</h2></div>
                <div class="card-body">
                    <div class="form-grid-2">
                        <div><label class="text-muted text-sm">Invoice #</label><p>{{ booking().invoice.invoice_number }}</p></div>
                        <div><label class="text-muted text-sm">Invoice Date</label><p>{{ fmtDate(booking().invoice.invoice_date) }}</p></div>
                        <div><label class="text-muted text-sm">Total</label><p style="font-weight:600;">₹{{ fmt(booking().invoice.total_amount) }}</p></div>
                        <div><label class="text-muted text-sm">Balance</label><p style="font-weight:600;">₹{{ fmt(booking().invoice.balance_due) }}</p></div>
                    </div>
                </div>
            </div>
            }
        </div>

        <!-- Record offline payment -->
        <div>
            <div class="card">
                <div class="card-header"><h2>Record Payment</h2></div>
                <div class="card-body">
                    <form [formGroup]="payForm" (ngSubmit)="submitPayment()">
                        <div class="form-group">
                            <label>Amount (₹) *</label>
                            <input type="number" formControlName="amount" placeholder="Enter amount">
                        </div>
                        <div class="form-group">
                            <label>Payment Method *</label>
                            <select formControlName="payment_method">
                                <option value="cash">Cash</option>
                                <option value="bank_transfer">Bank Transfer</option>
                                <option value="upi_manual">UPI (Manual)</option>
                                <option value="cheque">Cheque</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Reference / UTR / Cheque #</label>
                            <input type="text" formControlName="reference_number">
                        </div>
                        <div class="form-group">
                            <label>Payment Date</label>
                            <input type="date" formControlName="payment_date">
                        </div>
                        <div class="form-group">
                            <label>Notes</label>
                            <textarea formControlName="notes" rows="2"></textarea>
                        </div>
                        @if (paySuccess()) { <p style="color:var(--success);margin-bottom:8px;">✓ Payment recorded!</p> }
                        <button class="btn-success" type="submit" style="width:100%;justify-content:center;" [disabled]="paySaving()">
                            {{ paySaving() ? 'Saving…' : 'Record Payment' }}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    </div>
    }
    `
})
export class BookingDetailComponent implements OnInit {
    private api = inject(ApiService);
    private route = inject(ActivatedRoute);
    private fb = inject(FormBuilder);

    booking = signal<any>(null);
    paySaving = signal(false);
    paySuccess = signal(false);

    payForm = this.fb.group({
        amount: [null, [Validators.required, Validators.min(1)]],
        payment_method: ['cash', Validators.required],
        reference_number: [''],
        payment_date: [new Date().toISOString().split('T')[0]],
        notes: ['']
    });

    ngOnInit() {
        this.load();
    }

    load() {
        this.api.getBooking(this.route.snapshot.paramMap.get('id')!).subscribe(b => this.booking.set(b));
    }

    submitPayment() {
        if (this.payForm.invalid) return;
        this.paySaving.set(true);
        this.api.recordOfflinePayment(this.booking().id, this.payForm.value).subscribe({
            next: () => {
                this.paySaving.set(false);
                this.paySuccess.set(true);
                this.payForm.reset({ payment_method: 'cash', payment_date: new Date().toISOString().split('T')[0] });
                setTimeout(() => this.paySuccess.set(false), 3000);
                this.load();
            },
            error: () => this.paySaving.set(false)
        });
    }

    fmtDate(d: string) { return d ? new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '—'; }
    fmt(n: any) { return parseFloat(n||0).toLocaleString('en-IN', { minimumFractionDigits: 0 }); }
    parseFloat = parseFloat;
}
