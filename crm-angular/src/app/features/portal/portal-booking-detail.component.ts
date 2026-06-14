import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PortalApiService } from './portal-api.service';
import { PortalAuthService } from './portal-auth.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
    selector: 'app-portal-booking-detail',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink],
    template: `
    <div class="toolbar">
        <a class="btn ghost" routerLink="/portal/bookings">← My Bookings</a>
    </div>
    @if (loading()) {
        <div>Loading...</div>
    } @else if (booking(); as b) {
        <h1>Booking #{{ b.booking_number || b.id }}</h1>
        <div class="status-line">
            <span class="badge" [class]="b.status">{{ b.status }}</span>
        </div>

        <div class="cards">
            <div class="card">
                <h3>Trip Details</h3>
                <div class="row"><b>Customer:</b> {{ b.customer_name }}</div>
                <div class="row"><b>Email:</b> {{ b.customer_email }}</div>
                <div class="row"><b>Phone:</b> {{ b.customer_phone }}</div>
                <div class="row"><b>Destination:</b> {{ b.destination_text }}</div>
                <div class="row"><b>Dates:</b> {{ b.start_date | date:'mediumDate' }} → {{ b.end_date | date:'mediumDate' }}</div>
                <div class="row"><b>Package:</b> {{ b.package_type }}</div>
            </div>

            <div class="card">
                <h3>Payment Summary</h3>
                <div class="row"><b>Total:</b> ₹{{ b.grand_total | number }}</div>
                <div class="row"><b>Paid:</b> ₹{{ (b.amount_paid || 0) | number }}</div>
                <div class="row"><b>Balance:</b> <span class="due">₹{{ ((b.grand_total || 0) - (b.amount_paid || 0)) | number }}</span></div>
            </div>

            @if (b.hotels?.length) {
                <div class="card">
                    <h3>Hotels ({{ b.hotels.length }})</h3>
                    @for (h of b.hotels; track h.id) {
                        <div class="item">{{ h.hotel_name }} — {{ h.room_type }} ({{ h.check_in | date:'shortDate' }} → {{ h.check_out | date:'shortDate' }})</div>
                    }
                </div>
            }

            @if (b.cars?.length) {
                <div class="card">
                    <h3>Transport ({{ b.cars.length }})</h3>
                    @for (c of b.cars; track c.id) {
                        <div class="item">{{ c.car_model }} — {{ c.days }} days</div>
                    }
                </div>
            }
        </div>

        <!-- Payments -->
        @if (b.payments?.length) {
            <div class="card">
                <h3>Payments</h3>
                <table>
                    <thead><tr><th>Amount</th><th>Method</th><th>Status</th><th>Date</th></tr></thead>
                    <tbody>
                        @for (p of b.payments; track p.id) {
                            <tr>
                                <td>₹{{ p.amount | number }}</td>
                                <td>{{ p.payment_method }}</td>
                                <td><span class="badge" [class]="p.status">{{ p.status }}</span></td>
                                <td>{{ p.paid_at | date:'short' }}</td>
                            </tr>
                        }
                    </tbody>
                </table>
            </div>
        }

        <!-- Pay Now -->
        @if (b.status === 'confirmed' || b.status === 'in_progress') {
            @if ((b.grand_total || 0) > (b.amount_paid || 0)) {
                <div class="card pay-card">
                    <h3>Make a Payment</h3>
                    <label>Amount (INR) <input type="number" [(ngModel)]="payAmount" [max]="b.grand_total - (b.amount_paid || 0)" /></label>
                    <label>Method
                        <select [(ngModel)]="payMethod">
                            <option value="cash">Cash</option>
                            <option value="bank_transfer">Bank Transfer</option>
                            <option value="upi">UPI</option>
                            <option value="card">Card</option>
                        </select>
                    </label>
                    <label>Reference (optional) <input type="text" [(ngModel)]="payRef" /></label>
                    <button class="btn" (click)="pay(b.id)" [disabled]="paySaving()">{{ paySaving() ? 'Processing...' : 'Pay Now' }}</button>
                </div>
            }
        }

        <!-- Review -->
        @if (b.status === 'completed' || b.status === 'in_progress') {
            @if (!b.review) {
                <div class="card">
                    <h3>Leave a Review</h3>
                    <label>Rating
                        <select [(ngModel)]="reviewRating">
                            <option value="5">★★★★★ (5)</option>
                            <option value="4">★★★★☆ (4)</option>
                            <option value="3">★★★☆☆ (3)</option>
                            <option value="2">★★☆☆☆ (2)</option>
                            <option value="1">★☆☆☆☆ (1)</option>
                        </select>
                    </label>
                    <label>Your Review <textarea [(ngModel)]="reviewText" rows="3" placeholder="Share your experience..."></textarea></label>
                    <button class="btn" (click)="submitReview(b.id)" [disabled]="reviewSaving()">{{ reviewSaving() ? 'Submitting...' : 'Submit Review' }}</button>
                </div>
            } @else {
                <div class="card">
                    <h3>Your Review</h3>
                    <div class="stars">{{ '★'.repeat(b.review.rating) }}{{ '☆'.repeat(5 - b.review.rating) }}</div>
                    <p>{{ b.review.comment }}</p>
                    <span class="badge" [class]="b.review.is_verified ? 'active' : ''">{{ b.review.is_verified ? 'Verified' : 'Pending' }}</span>
                </div>
            }
        }
    }
    `,
    styles: [`
        .toolbar { margin-bottom:10px; }
        .btn.ghost { background:#f3f4f6; color:#374151; padding:6px 10px; border-radius:6px; text-decoration:none; font-size:13px; display:inline-block; }
        h1 { margin:0 0 6px; font-size:1.3rem; }
        .status-line { margin-bottom:14px; }
        .badge { display:inline-block; padding:2px 8px; border-radius:999px; font-size:11px; text-transform:capitalize; background:#e5e7eb; color:#374151; }
        .badge.confirmed { background:#dbeafe; color:#1d4ed8; }
        .badge.in_progress { background:#fef3c7; color:#92400e; }
        .badge.completed { background:#dcfce7; color:#166534; }
        .badge.cancelled { background:#fee2e2; color:#991b1b; }
        .badge.active { background:#dcfce7; color:#166534; }
        .cards { display:flex; flex-direction:column; gap:10px; margin-bottom:14px; }
        .card { background:#fff; border:1px solid #e5e7eb; border-radius:8px; padding:14px; }
        .card h3 { margin:0 0 10px; font-size:14px; }
        .row { font-size:13px; margin-bottom:6px; color:#374151; }
        .due { color:#dc2626; font-weight:600; }
        .item { font-size:13px; padding:6px 0; border-bottom:1px solid #f3f4f6; }
        table { width:100%; border-collapse:collapse; }
        th, td { padding:8px; text-align:left; border-bottom:1px solid #f3f4f6; font-size:13px; }
        th { background:#f9fafb; color:#6b7280; text-transform:uppercase; font-size:11px; }
        .pay-card label { display:flex; flex-direction:column; gap:4px; margin-bottom:10px; font-size:12px; color:#374151; }
        .pay-card input, select { padding:8px 10px; border:1px solid #d1d5db; border-radius:6px; }
        .btn { padding:8px 12px; border:none; border-radius:6px; background:#0f766e; color:#fff; cursor:pointer; font-size:13px; }
        .btn:disabled { opacity:.5; cursor:not-allowed; }
        .stars { font-size:1.2rem; color:#f59e0b; }
    `]
})
export class PortalBookingDetailComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private api = inject(PortalApiService);
    private auth = inject(PortalAuthService);
    private router = inject(Router);
    private toast = inject(ToastService);

    booking = signal<any>(null);
    loading = signal(true);
    paySaving = signal(false);
    payAmount = 0;
    payMethod = 'cash';
    payRef = '';
    reviewSaving = signal(false);
    reviewRating = 5;
    reviewText = '';

    ngOnInit() {
        if (!this.auth.isLoggedIn()) { this.router.navigate(['/portal']); return; }
        const id = Number(this.route.snapshot.paramMap.get('id'));
        this.api.getBooking(id).subscribe({
            next: b => { this.booking.set(b); this.loading.set(false); },
            error: () => this.loading.set(false)
        });
    }

    pay(id: number) {
        if (!this.payAmount || this.payAmount <= 0) { this.toast.error('Enter amount'); return; }
        this.paySaving.set(true);
        this.api.payOffline(id, { amount: this.payAmount, payment_method: this.payMethod, reference: this.payRef }).subscribe({
            next: () => { this.paySaving.set(false); this.toast.success('Payment recorded'); this.ngOnInit(); },
            error: () => { this.paySaving.set(false); this.toast.error('Payment failed'); }
        });
    }

    submitReview(id: number) {
        if (!this.reviewText) { this.toast.error('Write a review'); return; }
        this.reviewSaving.set(true);
        this.api.reviewBooking(id, { rating: this.reviewRating, comment: this.reviewText }).subscribe({
            next: () => { this.reviewSaving.set(false); this.toast.success('Review submitted'); this.ngOnInit(); },
            error: () => { this.reviewSaving.set(false); this.toast.error('Failed'); }
        });
    }
}
