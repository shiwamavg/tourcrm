// ─── booking-list.component.ts ────────────────────────────────────
import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';

@Component({
    selector: 'app-booking-list',
    standalone: true,
    imports: [CommonModule, RouterLink, ReactiveFormsModule],
    template: `
    <div class="page-header">
        <div><h1>Bookings</h1></div>
    </div>

    <div class="filter-bar">
        <input type="text" [formControl]="searchCtrl" placeholder="Search customer, booking #..." style="max-width:240px;">
        <select [formControl]="statusCtrl">
            <option value="">All statuses</option>
            <option value="confirmed">Confirmed</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
        </select>
        <select [formControl]="payCtrl">
            <option value="">All payment</option>
            <option value="pending">Pending</option>
            <option value="partial">Partial</option>
            <option value="paid">Paid</option>
        </select>
        <input type="date" [formControl]="fromCtrl" title="From date">
        <input type="date" [formControl]="toCtrl" title="To date">
    </div>

    <div class="card">
        <table class="data-table">
            <thead>
                <tr>
                    <th>Booking #</th>
                    <th>Customer</th>
                    <th>Destination</th>
                    <th>Travel Dates</th>
                    <th>Total</th>
                    <th>Paid</th>
                    <th>Balance</th>
                    <th>Status</th>
                    <th>Payment</th>
                </tr>
            </thead>
            <tbody>
                @for (b of bookings(); track b.id) {
                    <tr style="cursor:pointer;" [routerLink]="['/bookings', b.id]">
                        <td style="font-weight:600;color:var(--primary);">{{ b.booking_number }}</td>
                        <td>{{ b.customer_name }}<div class="text-muted text-sm">{{ b.customer_phone }}</div></td>
                        <td>{{ b.destination_text }}</td>
                        <td class="text-sm">{{ fmtDate(b.trip_start_date) }}<br>{{ fmtDate(b.trip_end_date) }}</td>
                        <td style="font-weight:600;">₹{{ fmt(b.total_amount) }}</td>
                        <td style="color:var(--success);">₹{{ fmt(b.total_paid) }}</td>
                        <td [style.color]="parseFloat(b.balance_due)>0?'var(--danger)':'var(--success)'">₹{{ fmt(b.balance_due) }}</td>
                        <td><span class="badge badge-{{ b.status }}">{{ b.status }}</span></td>
                        <td><span class="badge badge-{{ b.payment_status }}">{{ b.payment_status }}</span></td>
                    </tr>
                }
                @if (bookings().length === 0) {
                    <tr><td colspan="9"><div class="empty-state"><div class="icon">📅</div><p>No bookings found</p></div></td></tr>
                }
            </tbody>
        </table>
    </div>
    `
})
export class BookingListComponent implements OnInit {
    private api = inject(ApiService);
    private fb = inject(FormBuilder);
    bookings = signal<any[]>([]);
    searchCtrl = this.fb.control('');
    statusCtrl = this.fb.control('');
    payCtrl = this.fb.control('');
    fromCtrl = this.fb.control('');
    toCtrl = this.fb.control('');

    ngOnInit() {
        this.load();
        [this.searchCtrl, this.statusCtrl, this.payCtrl, this.fromCtrl, this.toCtrl].forEach(c =>
            c.valueChanges.subscribe(() => this.load())
        );
    }
    load() {
        const params: any = {};
        if (this.searchCtrl.value) params.search = this.searchCtrl.value;
        if (this.statusCtrl.value) params.status = this.statusCtrl.value;
        if (this.payCtrl.value) params.payment_status = this.payCtrl.value;
        if (this.fromCtrl.value) params.from_date = this.fromCtrl.value;
        if (this.toCtrl.value) params.to_date = this.toCtrl.value;
        this.api.getBookings(params).subscribe((b: any[]) => this.bookings.set(b));
    }
    fmtDate(d: string) { return d ? new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '—'; }
    fmt(n: any) { return parseFloat(n||0).toLocaleString('en-IN', { minimumFractionDigits: 0 }); }
    parseFloat = parseFloat;
}
