// src/app/features/bookings/booking-detail.component.ts
import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { PaymentGateway, PaymentStatus2 } from '../../core/models';
import { FollowupTimelineComponent } from '../../shared/components/followup-timeline.component';

@Component({
    selector: 'app-booking-detail',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink, DatePipe, DecimalPipe, FollowupTimelineComponent],
    template: `
    @if (loading()) {
        <div class="card text-center"><span class="spinner"></span> Loading…</div>
    } @else if (!booking()) {
        <div class="card">
            <h2>Booking not found</h2>
            <a routerLink="/bookings" class="btn">← Back to list</a>
        </div>
    } @else {
        <div class="page-header">
            <div>
                <h1>
                    {{ booking()!.booking_number }}
                    <span class="badge" [class]="'badge-' + badgeStatus(booking()!.status)">{{ booking()!.status }}</span>
                    <span class="badge" [class]="'badge-' + badgePay(booking()!.payment_status)">{{ booking()!.payment_status }}</span>
                </h1>
                <p>Created {{ booking()!.created_at | date:'medium' }} • Quotation
                    @if (booking()!.quotation_number) {
                        <a [routerLink]="['/quotations', booking()!.quotation_id]" class="link">{{ booking()!.quotation_number }}</a>
                    } @else { — }
                </p>
            </div>
            <div class="flex">
                <a routerLink="/bookings" class="btn">← Back</a>
                <button class="btn btn-success" (click)="openPaymentModal()">+ Record Payment</button>
            </div>
        </div>

        <div class="stats-grid">
            <div class="stat-card">
                <div class="label">Customer</div>
                <div class="value" style="font-size:1.1rem">{{ booking()!.customer_name }}</div>
                <div class="text-muted">
                    {{ booking()!.customer_phone }}
                    @if (booking()!.customer_email) { • {{ booking()!.customer_email }} }
                </div>
            </div>
            <div class="stat-card">
                <div class="label">Trip</div>
                <div class="value" style="font-size:1.1rem">
                    {{ booking()!.destination_name || booking()!.destination_text || '—' }}
                </div>
                <div class="text-muted">
                    {{ booking()!.trip_start_date | date:'mediumDate' }} → {{ booking()!.trip_end_date | date:'mediumDate' }}
                </div>
            </div>
            <div class="stat-card">
                <div class="label">Pax</div>
                <div class="value" style="font-size:1.1rem">{{ booking()!.adults }} adults</div>
                <div class="text-muted">
                    @if (booking()!.children_below_5) { {{ booking()!.children_below_5 }} child(ren) <5y }
                    @if (booking()!.children_above_5) { {{ booking()!.children_above_5 }} child(ren) >5y }
                </div>
            </div>
            <div class="stat-card success">
                <div class="label">Total / Paid / Balance</div>
                <div class="value">₹{{ booking()!.total_amount | number:'1.0-0' }}</div>
                <div class="text-muted">
                    Paid: <strong>₹{{ booking()!.amount_paid | number:'1.0-0' }}</strong>
                    @if (balance() > 0) { • Balance: <strong class="text-danger">₹{{ balance() | number:'1.0-0' }}</strong> }
                    @else { • <strong class="text-success">Fully paid</strong> }
                </div>
            </div>
        </div>

        <!-- Hotels -->
        @if (booking()!.hotels?.length) {
            <div class="card">
                <h2>🏨 Hotels</h2>
                <div class="table-wrap" style="box-shadow:none">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Hotel</th><th>Room</th><th>Meal</th>
                                <th class="num">Nights</th><th class="num">Rooms</th>
                                <th class="num">Rate/night</th><th class="num">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            @for (h of booking()!.hotels; track h.id) {
                                <tr>
                                    <td><strong>{{ h.hotel_name }}</strong>
                                        @if (h.star_rating) { <small> {{ h.star_rating }}★</small> }
                                    </td>
                                    <td>{{ h.room_type }}</td>
                                    <td>{{ h.meal_plan }}</td>
                                    <td class="num">{{ h.num_nights }}</td>
                                    <td class="num">{{ h.num_rooms }}</td>
                                    <td class="num">₹{{ h.charge_per_night | number:'1.0-0' }}</td>
                                    <td class="num"><strong>₹{{ h.line_total | number:'1.0-0' }}</strong></td>
                                </tr>
                            }
                        </tbody>
                    </table>
                </div>
            </div>
        }

        <!-- Cars -->
        @if (booking()!.cars?.length) {
            <div class="card">
                <h2>🚗 Transport</h2>
                <div class="table-wrap" style="box-shadow:none">
                    <table class="data-table">
                        <thead><tr><th>Car</th><th>Days</th><th class="num">Rate/day</th><th class="num">Total</th></tr></thead>
                        <tbody>
                            @for (c of booking()!.cars; track c.id) {
                                <tr>
                                    <td><strong>{{ c.car_type_name }}</strong> <small>({{ c.car_class }})</small></td>
                                    <td class="num">{{ c.num_days }}</td>
                                    <td class="num">₹{{ c.charge_per_day | number:'1.0-0' }}</td>
                                    <td class="num"><strong>₹{{ c.line_total | number:'1.0-0' }}</strong></td>
                                </tr>
                            }
                        </tbody>
                    </table>
                </div>
            </div>
        }

        <!-- Payments -->
        <div class="card">
            <h2>💰 Payments ({{ booking()!.payments?.length || 0 }})</h2>
            @if (!booking()!.payments?.length) {
                <p class="text-muted">No payments recorded yet.
                    <button class="btn btn-sm btn-success" (click)="openPaymentModal()">+ Record first payment</button>
                </p>
            } @else {
                <div class="table-wrap" style="box-shadow:none">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Date</th><th>Gateway</th><th>Method</th>
                                <th>Reference</th><th class="num">Amount</th><th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            @for (p of booking()!.payments; track p.id) {
                                <tr>
                                    <td>
                                        {{ (p.paid_at || p.created_at) | date:'short' }}
                                        @if (p.collected_by) { <br><small class="text-muted">by staff</small> }
                                    </td>
                                    <td>{{ p.gateway }}</td>
                                    <td>{{ p.method_label || '—' }}</td>
                                    <td>
                                        @if (p.offline_reference) { {{ p.offline_reference }} }
                                        @if (p.gateway_payment_id) { <small class="text-muted">{{ p.gateway_payment_id }}</small> }
                                    </td>
                                    <td class="num"><strong>₹{{ p.amount | number:'1.0-0' }}</strong></td>
                                    <td>
                                        <span class="badge" [class]="'badge-' + (p.status === 'paid' ? 'accepted' :
                                                                          p.status === 'failed' ? 'rejected' : 'draft')">
                                            {{ p.status }}
                                        </span>
                                    </td>
                                </tr>
                            }
                        </tbody>
                    </table>
                </div>
            }
        </div>

        <!-- Invoices -->
        @if (booking()!.invoices?.length) {
            <div class="card">
                <h2>🧾 Invoices</h2>
                <div class="table-wrap" style="box-shadow:none">
                    <table class="data-table">
                        <thead>
                            <tr><th>Invoice #</th><th>Issued</th><th class="num">Total</th><th>PDF</th></tr>
                        </thead>
                        <tbody>
                            @for (i of booking()!.invoices; track i.id) {
                                <tr>
                                    <td><strong>{{ i.invoice_number }}</strong></td>
                                    <td>{{ i.issued_at | date:'mediumDate' }}</td>
                                    <td class="num">₹{{ i.total | number:'1.0-0' }}</td>
                                    <td>
                                        <button class="btn btn-sm btn-primary" (click)="downloadInvoice(i.id)">
                                            📄 Download
                                        </button>
                                    </td>
                                </tr>
                            }
                        </tbody>
                    </table>
                </div>
            </div>
        }

        <!-- Reviews -->
        @if (booking()!.reviews?.length) {
            <div class="card">
                <h2>⭐ Review</h2>
                @for (r of booking()!.reviews; track r.id) {
                    <div style="padding:10px 0">
                        <div style="font-size:18px; color:#f59e0b">
                            @for (s of [1,2,3,4,5]; track s) {
                                {{ s <= r.rating ? '★' : '☆' }}
                            }
                        </div>
                        @if (r.title) { <strong>{{ r.title }}</strong><br> }
                        <p>{{ r.comment }}</p>
                        <small class="text-muted">— {{ r.customer_name }} • {{ r.created_at | date:'mediumDate' }}</small>
                    </div>
                }
            </div>
        }

        <!-- Customer Journey Timeline -->
        <div class="card">
            <h2>Timeline & Journey</h2>
            <app-followup-timeline [bookingId]="booking()!.id" />
        </div>

        <!-- Payment modal -->
        @if (paymentOpen()) {
            <div class="modal-backdrop" (click)="closePaymentModal()">
                <div class="modal" (click)="$event.stopPropagation()">
                    <h2 style="margin-top:0">+ Record a payment</h2>
                    <p class="text-muted">
                        Recording for booking <strong>{{ booking()!.booking_number }}</strong>.
                        Balance: <strong>₹{{ balance() | number:'1.0-0' }}</strong>.
                        An invoice is auto-generated on the first successful payment.
                    </p>
                    <div class="form-grid-2">
                        <div class="form-group">
                            <label>Amount (₹) <span class="req">*</span></label>
                            <input type="number" [(ngModel)]="form.amount" min="1" step="1"
                                   [placeholder]="balance()">
                        </div>
                        <div class="form-group">
                            <label>Gateway <span class="req">*</span></label>
                            <select [(ngModel)]="form.gateway">
                                <option value="cash">Cash</option>
                                <option value="bank_transfer">Bank Transfer (NEFT/RTGS/IMPS)</option>
                                <option value="upi">UPI</option>
                                <option value="card">Card</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Method label</label>
                            <input type="text" [(ngModel)]="form.method_label"
                                   placeholder="e.g. NEFT, UPI, Visa ****1234">
                        </div>
                        <div class="form-group">
                            <label>Reference #</label>
                            <input type="text" [(ngModel)]="form.offline_reference"
                                   placeholder="Cheque / transaction id">
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Note</label>
                        <textarea rows="2" [(ngModel)]="form.offline_note"
                                  placeholder="e.g. Customer paid full balance on arrival"></textarea>
                    </div>
                    @if (formError()) {
                        <div class="info-badge" style="background:#fee2e2;color:#991b1b;display:block;margin-bottom:10px">
                            ✕ {{ formError() }}
                        </div>
                    }
                    <div class="flex" style="justify-content:flex-end">
                        <button class="btn" (click)="closePaymentModal()" [disabled]="submitting()">Cancel</button>
                        <button class="btn btn-success" (click)="submitPayment()" [disabled]="submitting()">
                            @if (submitting()) { <span class="spinner"></span> Saving… }
                            @else { ✓ Record Payment }
                        </button>
                    </div>
                </div>
            </div>
        }
    }
    `
})
export class BookingDetailComponent implements OnInit {
    private api  = inject(ApiService);
    private route = inject(ActivatedRoute);
    private router = inject(Router);

    loading = signal(true);
    booking = signal<any | null>(null);

    // Payment modal
    paymentOpen = signal(false);
    submitting   = signal(false);
    formError    = signal<string | null>(null);
    form = {
        amount: 0,
        gateway: 'cash' as PaymentGateway,
        method_label: '',
        offline_reference: '',
        offline_note: ''
    };

    balance = computed(() => {
        const b = this.booking();
        if (!b) return 0;
        return Math.max(0, Number(b.total_amount || 0) - Number(b.amount_paid || 0));
    });

    ngOnInit() { this.reload(); }

    reload() {
        const id = this.route.snapshot.paramMap.get('id');
        if (!id) { this.loading.set(false); return; }
        this.api.getBooking(id).subscribe({
            next: b => { this.booking.set(b); this.loading.set(false); },
            error: ()  => this.loading.set(false)
        });
    }

    openPaymentModal() {
        this.form = {
            amount: this.balance(),
            gateway: 'bank_transfer',
            method_label: '',
            offline_reference: '',
            offline_note: ''
        };
        this.formError.set(null);
        this.paymentOpen.set(true);
    }
    closePaymentModal() {
        if (this.submitting()) return;
        this.paymentOpen.set(false);
    }
    submitPayment() {
        const b = this.booking();
        if (!b) return;
        if (!this.form.amount || this.form.amount <= 0) {
            this.formError.set('Amount must be greater than 0');
            return;
        }
        this.submitting.set(true);
        this.formError.set(null);
        this.api.recordOfflinePayment({
            booking_id: b.id,
            amount: this.form.amount,
            gateway: this.form.gateway,
            method_label: this.form.method_label || undefined,
            offline_reference: this.form.offline_reference || undefined,
            offline_note: this.form.offline_note || undefined
        }).subscribe({
            next: () => {
                this.submitting.set(false);
                this.paymentOpen.set(false);
                this.reload();
            },
            error: (err) => {
                this.submitting.set(false);
                this.formError.set(err?.error?.error || 'Failed to record payment');
            }
        });
    }

    downloadInvoice(invoiceId: number) {
        const token = localStorage.getItem('crm_token');
        const url = this.api.invoicePdfUrl(invoiceId);
        if (!token) { window.open(url, '_blank'); return; }
        fetch(url, { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.blob())
            .then(blob => {
                const objUrl = URL.createObjectURL(blob);
                window.open(objUrl, '_blank');
                setTimeout(() => URL.revokeObjectURL(objUrl), 60_000);
            });
    }

    badgeStatus(s: string): string {
        if (s === 'completed') return 'accepted';
        if (s === 'cancelled') return 'rejected';
        return 'sent';
    }
    badgePay(p: string): string {
        if (p === 'paid')     return 'accepted';
        if (p === 'partial')  return 'sent';
        if (p === 'refunded') return 'rejected';
        return 'draft';
    }
}
