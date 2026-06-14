import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { PortalApiService } from './portal-api.service';
import { PortalAuthService } from './portal-auth.service';

@Component({
    selector: 'app-portal-bookings',
    standalone: true,
    imports: [CommonModule, RouterLink],
    template: `
    <h1>My Bookings</h1>
    @if (loading()) {
        <div>Loading your bookings...</div>
    } @else if (bookings().length === 0) {
        <div class="empty">No bookings found. When you make a booking with us, it will appear here.</div>
    } @else {
        <div class="booking-grid">
            @for (b of bookings(); track b.id) {
                <a class="booking-card" [routerLink]="['/portal/bookings', b.id]">
                    <div class="card-top">
                        <div class="destination">{{ b.destination_text || 'Tour' }}</div>
                        <span class="badge" [class]="b.status">{{ b.status }}</span>
                    </div>
                    <div class="card-body">
                        <div class="row"><span>Name</span><span>{{ b.customer_name }}</span></div>
                        <div class="row"><span>Dates</span><span>{{ b.start_date | date:'shortDate' }} → {{ b.end_date | date:'shortDate' }}</span></div>
                        <div class="row"><span>Total</span><span class="amount">₹{{ b.grand_total | number }}</span></div>
                        <div class="row"><span>Paid</span><span class="paid">₹{{ b.amount_paid | number }}</span></div>
                    </div>
                </a>
            }
        </div>
    }
    `,
    styles: [`
        h1 { margin:0 0 14px; font-size:1.3rem; }
        .empty { background:#fff; border:1px solid #e5e7eb; border-radius:8px; padding:24px; text-align:center; color:#9ca3af; font-size:14px; }
        .booking-grid { display:grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap:14px; }
        .booking-card { background:#fff; border:1px solid #e5e7eb; border-radius:8px; padding:14px; text-decoration:none; color:inherit; transition:box-shadow .15s; }
        .booking-card:hover { box-shadow:0 2px 8px rgba(0,0,0,.06); }
        .card-top { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px; }
        .destination { font-weight:700; font-size:1rem; }
        .badge { display:inline-block; padding:2px 8px; border-radius:999px; font-size:11px; text-transform:capitalize; background:#e5e7eb; color:#374151; }
        .badge.confirmed { background:#dbeafe; color:#1d4ed8; }
        .badge.in_progress { background:#fef3c7; color:#92400e; }
        .badge.completed { background:#dcfce7; color:#166534; }
        .badge.cancelled { background:#fee2e2; color:#991b1b; }
        .card-body .row { display:flex; justify-content:space-between; font-size:13px; margin-bottom:4px; color:#6b7280; }
        .card-body .row span:first-child { color:#374151; }
        .amount { font-weight:700; color:#111827; }
        .paid { color:#0f766e; font-weight:600; }
    `]
})
export class PortalBookingsComponent implements OnInit {
    private api = inject(PortalApiService);
    private auth = inject(PortalAuthService);
    private router = inject(Router);

    bookings = signal<any[]>([]);
    loading = signal(true);

    ngOnInit() {
        if (!this.auth.isLoggedIn()) { this.router.navigate(['/portal']); return; }
        this.auth.loadEmail();
        this.api.getMyBookings().subscribe({
            next: r => { this.bookings.set(r); this.loading.set(false); },
            error: () => this.loading.set(false)
        });
    }
}
