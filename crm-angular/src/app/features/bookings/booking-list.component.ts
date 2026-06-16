// src/app/features/bookings/booking-list.component.ts
import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { BookingStatus, PaymentStatus } from '../../core/models';

@Component({
    selector: 'app-booking-list',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink, DatePipe, DecimalPipe],
    template: `
    <div class="page-header">
        <div>
            <h1>📋 Bookings</h1>
            <p>{{ total() }} total • {{ paid() }} paid • {{ partial() }} partial • {{ pending() }} unpaid</p>
        </div>
    </div>

    <div class="card">
        <div class="filter-bar">
            <input type="search" placeholder="🔍 Search by number, name, phone, email…"
                   [ngModel]="search()" (ngModelChange)="search.set($event)" (keyup.enter)="applyFilters()">
            <select [ngModel]="status()" (ngModelChange)="status.set($event); applyFilters()">
                <option value="">All statuses</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
            </select>
            <select [ngModel]="paymentStatus()" (ngModelChange)="paymentStatus.set($event); applyFilters()">
                <option value="">All payment</option>
                <option value="pending">Payment pending</option>
                <option value="partial">Partial</option>
                <option value="paid">Paid</option>
                <option value="refunded">Refunded</option>
            </select>
            <select [ngModel]="limit()" (ngModelChange)="limit.set($event); applyFilters()">
                <option [ngValue]="10">10 per page</option>
                <option [ngValue]="20">20 per page</option>
                <option [ngValue]="50">50 per page</option>
                <option [ngValue]="100">100 per page</option>
            </select>
            <button class="btn btn-primary" (click)="applyFilters()">Filter</button>
        </div>

        @if (loading()) {
            <div class="text-center" style="padding:32px"><span class="spinner"></span> Loading…</div>
        } @else if (items().length === 0) {
            <div class="empty-state">
                <div class="icon">📋</div>
                <p>No bookings match your filters.</p>
            </div>
        } @else {
            <div class="table-wrap">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Booking #</th>
                            <th>Customer</th>
                            <th>Trip</th>
                            <th>Package</th>
                            <th class="num">Total</th>
                            <th class="num">Paid</th>
                            <th class="num">Balance</th>
                            <th>Status</th>
                            <th>Payment</th>
                            <th>Created</th>
                        </tr>
                    </thead>
                    <tbody>
                        @for (b of items(); track b.id) {
                            <tr>
                                <td>
                                    <a [routerLink]="['/bookings', b.id]" class="link"><strong>{{ b.booking_number }}</strong></a>
                                </td>
                                <td>
                                    {{ b.customer_name }}
                                    <br><small class="text-muted">{{ b.customer_phone }}</small>
                                </td>
                                <td>
                                    {{ b.destination_name || b.destination_text || '—' }}
                                    <br><small class="text-muted">
                                        {{ b.trip_start_date | date:'mediumDate' }} → {{ b.trip_end_date | date:'mediumDate' }}
                                    </small>
                                </td>
                                <td>
                                    @if (b.package_title) {
                                        <strong style="color:#0f766e">{{ b.package_title }}</strong>
                                    } @else {
                                        <span class="badge badge-draft">{{ formatPackage(b.package_type) }}</span>
                                    }
                                </td>
                                <td class="num">₹{{ b.total_amount | number:'1.0-0' }}</td>
                                <td class="num">₹{{ b.amount_paid | number:'1.0-0' }}</td>
                                <td class="num">
                                    <strong [class.text-danger]="b.balance_due > 0">
                                        ₹{{ b.balance_due | number:'1.0-0' }}
                                    </strong>
                                </td>
                                <td>
                                    <span class="badge" [class]="'badge-' + (b.status === 'completed' ? 'accepted' :
                                                                 b.status === 'cancelled' ? 'rejected' : 'sent')">
                                        {{ b.status }}
                                    </span>
                                </td>
                                <td>
                                    <span class="badge" [class]="'badge-' + (b.payment_status === 'paid' ? 'accepted' :
                                                                 b.payment_status === 'partial' ? 'sent' :
                                                                 b.payment_status === 'refunded' ? 'rejected' : 'draft')">
                                        {{ b.payment_status }}
                                    </span>
                                </td>
                                <td>{{ b.created_at | date:'short' }}</td>
                            </tr>
                        }
                    </tbody>
                </table>
            </div>

            @if (total() > 0) {
                <div class="pagination-bar" style="display:flex; align-items:center; justify-content:space-between; padding:12px 16px; border-top:1px solid #e5e7eb;">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <button class="btn" (click)="prevPage()" [disabled]="page() === 1">← Prev</button>
                        <span>Page <strong>{{ page() }}</strong> of <strong>{{ totalPages() }}</strong></span>
                        <button class="btn" (click)="nextPage()" [disabled]="page() === totalPages()">Next →</button>
                    </div>
                    <span class="text-muted">Showing {{ startIndex() }} – {{ endIndex() }} of {{ total() }} total</span>
                </div>
            }
        }
    </div>
    `
})
export class BookingListComponent implements OnInit {
    private api = inject(ApiService);
    private toast = inject(ToastService);

    loading = signal(true);
    items   = signal<any[]>([]);
    total   = signal(0);
    paid    = signal(0);
    partial = signal(0);
    pending = signal(0);

    search        = signal('');
    status        = signal<BookingStatus | ''>('');
    paymentStatus = signal<PaymentStatus | ''>('');
    page          = signal(1);
    limit         = signal(20);

    totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.limit())));
    startIndex = computed(() => (this.page() - 1) * this.limit() + 1);
    endIndex   = computed(() => Math.min(this.page() * this.limit(), this.total()));

    ngOnInit() { this.reload(); }

    applyFilters() {
        this.page.set(1);
        this.reload();
    }

    prevPage() {
        if (this.page() > 1) {
            this.page.update(p => p - 1);
            this.reload();
        }
    }

    nextPage() {
        if (this.page() < this.totalPages()) {
            this.page.update(p => p + 1);
            this.reload();
        }
    }

    reload() {
        this.loading.set(true);
        this.api.listBookings({
            q: this.search() || undefined,
            status: this.status() || undefined,
            payment_status: this.paymentStatus() || undefined,
            page: this.page(),
            limit: this.limit()
        }).subscribe({
            next: r => {
                this.items.set(r.items);
                this.total.set(r.total);
                this.paid.set(r.items.filter((x: any) => x.payment_status === 'paid').length);
                this.partial.set(r.items.filter((x: any) => x.payment_status === 'partial').length);
                this.pending.set(r.items.filter((x: any) => x.payment_status === 'pending').length);
                this.loading.set(false);
            },
            error: () => {
                this.loading.set(false);
                this.toast.error('Failed to load bookings');
            }
        });
    }

    formatPackage(p: string | undefined): string {
        if (!p) return '—';
        return p.replace(/_/g, ' + ');
    }
}
