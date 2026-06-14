// src/app/features/payments/payment-list.component.ts
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { PaymentGateway, PaymentStatus2 } from '../../core/models';

@Component({
    selector: 'app-payment-list',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink, DatePipe, DecimalPipe],
    template: `
    <div class="page-header">
        <div>
            <h1>💰 Payments</h1>
            <p>{{ total() }} total • {{ paid() }} paid • {{ pending() }} pending • Total collected: <strong>₹{{ totalPaid() | number:'1.0-0' }}</strong></p>
        </div>
    </div>

    <div class="card">
        <div class="filter-bar">
            <input type="text" placeholder="Search…" [ngModel]="search()" (ngModelChange)="search.set($event); page.set(1); reload()" />
            <select [ngModel]="status()" (ngModelChange)="status.set($event); page.set(1); reload()">
                <option value="">All statuses</option>
                <option value="created">Created (awaiting gateway)</option>
                <option value="paid">Paid</option>
                <option value="failed">Failed</option>
                <option value="refunded">Refunded</option>
            </select>
            <select [ngModel]="gateway()" (ngModelChange)="gateway.set($event); page.set(1); reload()">
                <option value="">All gateways</option>
                <option value="cashfree">Cashfree</option>
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="upi">UPI</option>
                <option value="card">Card</option>
                <option value="other">Other</option>
            </select>
            <select [ngModel]="limit()" (ngModelChange)="limit.set(+$event); page.set(1); reload()">
                <option [value]="10">10 / page</option>
                <option [value]="20">20 / page</option>
                <option [value]="50">50 / page</option>
                <option [value]="100">100 / page</option>
            </select>
            <button class="btn btn-primary" (click)="reload()">Filter</button>
        </div>

        @if (loading()) {
            <div class="text-center" style="padding:32px"><span class="spinner"></span> Loading…</div>
        } @else if (items().length === 0) {
            <div class="empty-state">
                <div class="icon">💰</div>
                <p>No payments recorded yet. Record offline payments from any booking detail page.</p>
            </div>
        } @else {
            <div class="table-wrap">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Booking</th>
                            <th>Customer</th>
                            <th>Gateway</th>
                            <th>Method / Ref</th>
                            <th class="num">Amount</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        @for (p of items(); track p.id) {
                            <tr>
                                <td>
                                    {{ (p.paid_at || p.created_at) | date:'short' }}
                                    @if (p.collected_by) { <br><small class="text-muted">by staff</small> }
                                </td>
                                <td>
                                    @if (p.booking_id) {
                                        <a [routerLink]="['/bookings', p.booking_id]" class="link">
                                            <strong>{{ p.booking_number }}</strong>
                                        </a>
                                    }
                                </td>
                                <td>
                                    {{ p.customer_name }}
                                    <br><small class="text-muted">{{ p.customer_phone }}</small>
                                </td>
                                <td>{{ p.gateway }}</td>
                                <td>
                                    {{ p.method_label || '—' }}
                                    @if (p.offline_reference) { <br><small class="text-muted">{{ p.offline_reference }}</small> }
                                    @if (p.gateway_payment_id) { <br><small class="text-muted">cf: {{ p.gateway_payment_id }}</small> }
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

            <div class="pagination-bar" style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-top:1px solid #e5e7eb;">
                <span class="page-info text-muted">Showing {{ startIndex() }}–{{ endIndex() }} of {{ total() }} total</span>
                <div class="page-controls" style="display:flex;align-items:center;gap:8px;">
                    <button class="btn" [disabled]="page() === 1" (click)="prevPage()">← Prev</button>
                    <span class="page-number">Page {{ page() }} of {{ totalPages() }}</span>
                    <button class="btn" [disabled]="page() >= totalPages()" (click)="nextPage()">Next →</button>
                </div>
            </div>
        }
    </div>
    `
})
export class PaymentListComponent implements OnInit {
    private api = inject(ApiService);
    private toast = inject(ToastService);
    loading = signal(true);
    items   = signal<any[]>([]);
    total   = signal(0);
    status  = signal<PaymentStatus2 | ''>('');
    gateway = signal<PaymentGateway | ''>('');
    search  = signal('');
    page    = signal(1);
    limit   = signal(20);
    paid    = signal(0);
    pending = signal(0);
    totalPaid = signal(0);

    totalPages = computed(() => Math.ceil(this.total() / this.limit()) || 1);
    startIndex = computed(() => (this.page() - 1) * this.limit() + 1);
    endIndex   = computed(() => Math.min(this.page() * this.limit(), this.total()));

    ngOnInit() { this.reload(); }

    reload() {
        this.loading.set(true);
        this.api.listPayments({
            status: this.status() || undefined,
            gateway: this.gateway() || undefined,
            q: this.search() || undefined,
            page: this.page(),
            limit: this.limit()
        }).subscribe({
            next: r => {
                this.items.set(r.items);
                this.total.set(r.total);
                this.paid.set(r.items.filter((x: any) => x.status === 'paid').length);
                this.pending.set(r.items.filter((x: any) => x.status === 'created' || x.status === 'failed').length);
                this.totalPaid.set(r.items.filter((x: any) => x.status === 'paid')
                    .reduce((s: number, x: any) => s + Number(x.amount), 0));
                this.loading.set(false);
            },
            error: () => {
                this.loading.set(false);
                this.toast.error('Failed to load payments.');
            }
        });
    }

    goPage(n: number) {
        if (n >= 1 && n <= this.totalPages()) {
            this.page.set(n);
            this.reload();
        }
    }

    prevPage() { this.goPage(this.page() - 1); }
    nextPage() { this.goPage(this.page() + 1); }
}
