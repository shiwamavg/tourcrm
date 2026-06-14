// src/app/features/invoices/invoice-list.component.ts
import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
    selector: 'app-invoice-list',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink, DatePipe, DecimalPipe],
    template: `
    <div class="page-header">
        <div>
            <h1>🧾 Invoices</h1>
            <p>{{ total() }} total • Sum: <strong>₹{{ totalSum() | number:'1.0-0' }}</strong></p>
        </div>
    </div>

    <div class="card">
        <div class="filter-bar">
            <input type="search" placeholder="🔍 Search invoices…"
                   [ngModel]="search()" (ngModelChange)="search.set($event); applyFilters()">
            <select [ngModel]="limit()" (ngModelChange)="limit.set($event); applyFilters()">
                <option [ngValue]="10">10 per page</option>
                <option [ngValue]="20">20 per page</option>
                <option [ngValue]="50">50 per page</option>
                <option [ngValue]="100">100 per page</option>
            </select>
        </div>

        @if (loading()) {
            <div class="text-center" style="padding:32px"><span class="spinner"></span> Loading…</div>
        } @else if (filteredItems().length === 0) {
            <div class="empty-state">
                <div class="icon">🧾</div>
                <p>No invoices yet. Invoices are auto-generated on the first successful payment for a booking.</p>
            </div>
        } @else {
            <div class="table-wrap">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Invoice #</th>
                            <th>Booking</th>
                            <th>Customer</th>
                            <th>Issued</th>
                            <th class="num">Total</th>
                            <th>PDF</th>
                        </tr>
                    </thead>
                    <tbody>
                        @for (i of filteredItems(); track i.id) {
                            <tr>
                                <td><strong>{{ i.invoice_number }}</strong></td>
                                <td>
                                    @if (i.booking_id) {
                                        <a [routerLink]="['/bookings', i.booking_id]" class="link">
                                            {{ i.booking_number }}
                                        </a>
                                    }
                                </td>
                                <td>{{ i.customer_name }}</td>
                                <td>{{ i.issued_at | date:'mediumDate' }}</td>
                                <td class="num"><strong>₹{{ i.total | number:'1.0-0' }}</strong></td>
                                <td>
                                    <button class="btn btn-sm btn-primary" (click)="download(i.id)">
                                        📄 Download
                                    </button>
                                </td>
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
export class InvoiceListComponent implements OnInit {
    private api = inject(ApiService);
    private toast = inject(ToastService);

    loading = signal(true);
    items   = signal<any[]>([]);
    total   = signal(0);
    totalSum = signal(0);

    search = signal('');
    page   = signal(1);
    limit  = signal(20);

    totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.limit())));
    startIndex = computed(() => (this.page() - 1) * this.limit() + 1);
    endIndex   = computed(() => Math.min(this.page() * this.limit(), this.total()));

    filteredItems = computed(() => {
        const s = this.search().toLowerCase().trim();
        if (!s) return this.items();
        return this.items().filter(i =>
            String(i.invoice_number || '').toLowerCase().includes(s) ||
            String(i.booking_number || '').toLowerCase().includes(s) ||
            String(i.customer_name || '').toLowerCase().includes(s)
        );
    });

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
        this.api.listInvoices({ page: this.page(), limit: this.limit() }).subscribe({
            next: r => {
                this.items.set(r.items);
                this.total.set(r.total);
                this.totalSum.set(r.items.reduce((s: number, x: any) => s + Number(x.total), 0));
                this.loading.set(false);
            },
            error: () => {
                this.loading.set(false);
                this.toast.error('Failed to load invoices');
            }
        });
    }
    download(id: number) {
        const token = localStorage.getItem('crm_token');
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
