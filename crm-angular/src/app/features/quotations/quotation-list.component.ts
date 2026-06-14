import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { QuotationListItem, QuotationStatus } from '../../core/models';

@Component({
    selector: 'app-quotation-list',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterLink, DatePipe, DecimalPipe],
    template: `
    <div class="page-header">
        <div>
            <h1>Quotations</h1>
            <p>All customized tour quotations</p>
        </div>
        <a routerLink="/quotations/new" class="btn btn-primary">+ New Quotation</a>
    </div>

    <div class="toolbar">
        <input type="text" placeholder="Search number, customer, phone…"
               [formControl]="searchCtrl" (input)="applyFilters()" class="grow">
        <select [formControl]="statusCtrl" (change)="applyFilters()">
            <option value="">All status</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
            <option value="expired">Expired</option>
        </select>
        <select [value]="limit" (change)="setLimit($event)">
            <option value="10">10 / page</option>
            <option value="20">20 / page</option>
            <option value="50">50 / page</option>
            <option value="100">100 / page</option>
        </select>
    </div>

    <div class="table-wrap">
        <table class="data-table">
            <thead>
                <tr>
                    <th>Number</th>
                    <th>Customer</th>
                    <th>Destination</th>
                    <th>Travel</th>
                    <th>Package</th>
                    <th>Status</th>
                    <th class="num">Total</th>
                    <th>Created</th>
                </tr>
            </thead>
            <tbody>
                @if (loading()) {
                    <tr><td colspan="8" class="text-center"><span class="spinner"></span> Loading…</td></tr>
                } @else if (items().length === 0) {
                    <tr><td colspan="8">
                        <div class="empty-state">
                            <div class="icon">📭</div>
                            <p>No quotations found.</p>
                        </div>
                    </td></tr>
                } @else {
                    @for (q of items(); track q.id) {
                        <tr>
                            <td><a [routerLink]="['/quotations', q.id]"><strong>{{ q.quotation_number }}</strong></a></td>
                            <td>
                                {{ q.customer_name }}
                                <br><small class="text-muted">{{ q.customer_phone }}</small>
                            </td>
                            <td>{{ q.destination_name || q.destination_text || '—' }}</td>
                            <td>
                                {{ q.trip_start_date | date:'mediumDate' }}
                                <br><small class="text-muted">to {{ q.trip_end_date | date:'mediumDate' }}</small>
                            </td>
                            <td><span class="badge badge-draft">{{ formatPackage(q.package_type) }}</span></td>
                            <td>
                                <span class="badge" [class]="'badge-' + q.status">{{ q.status }}</span>
                            </td>
                            <td class="num">₹{{ q.grand_total | number:'1.0-0' }}</td>
                            <td>{{ q.created_at | date:'short' }}</td>
                        </tr>
                    }
                }
            </tbody>
        </table>
    </div>

    @if (total() > limit) {
        <div class="flex between mt-3">
            <div class="text-muted">Showing {{ items().length }} of {{ total() }}</div>
            <div class="flex">
                <button class="btn btn-sm" [disabled]="page() <= 1" (click)="prev()">← Prev</button>
                <span class="text-muted" style="padding:6px 12px">Page {{ page() }} / {{ pages() }}</span>
                <button class="btn btn-sm" [disabled]="page() >= pages()" (click)="next()">Next →</button>
            </div>
        </div>
    }
    `
})
export class QuotationListComponent implements OnInit {
    private api = inject(ApiService);
    private fb = inject(FormBuilder);
    private toast = inject(ToastService);

    loading = signal(true);
    items = signal<QuotationListItem[]>([]);
    total = signal(0);
    page = signal(1);
    limit = 20;
    pages = () => Math.max(1, Math.ceil(this.total() / this.limit));

    searchCtrl = this.fb.control('');
    statusCtrl = this.fb.control<QuotationStatus | ''>('');

    private searchTimer: any;

    ngOnInit() { this.fetch(); }

    applyFilters() {
        clearTimeout(this.searchTimer);
        this.searchTimer = setTimeout(() => { this.page.set(1); this.fetch(); }, 300);
    }

    prev() { this.page.update(p => Math.max(1, p - 1)); this.fetch(); }
    next() { this.page.update(p => p + 1); this.fetch(); }

    setLimit(e: Event) {
        this.limit = parseInt((e.target as HTMLSelectElement).value, 10);
        this.page.set(1);
        this.fetch();
    }

    formatPackage(p: string): string {
        return p.replace(/_/g, ' + ').replace(/\b\w/g, c => c.toUpperCase());
    }

    private fetch() {
        this.loading.set(true);
        this.api.listQuotations({
            q: this.searchCtrl.value || undefined,
            status: (this.statusCtrl.value || undefined) as QuotationStatus | undefined,
            page: this.page(),
            limit: this.limit
        }).subscribe({
            next: r => { this.items.set(r.items); this.total.set(r.total); this.loading.set(false); },
            error: () => {
                this.loading.set(false);
                this.toast.error('Failed to load quotations.');
            }
        });
    }
}
