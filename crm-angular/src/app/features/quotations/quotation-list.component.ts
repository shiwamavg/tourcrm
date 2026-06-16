import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { QuotationListItem, QuotationStatus } from '../../core/models';

@Component({
    selector: 'app-quotation-list',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink, DatePipe, DecimalPipe],

    template: `
    <div class="page-header">
        <div>
            <h1>Quotations</h1>
            <p>All customized tour quotations</p>
        </div>
        <a routerLink="/quotations/new" class="btn btn-primary">+ New Quotation</a>
    </div>

    <!-- Expiry alerts banner -->
    @if (expiringItems().length > 0) {
        <div class="expiry-alert">
            <span class="expiry-alert-icon">⏰</span>
            <strong>{{ expiringItems().length }} quotation{{ expiringItems().length > 1 ? 's' : '' }} expiring soon</strong>
            — follow up with customers before these expire.
            <button class="btn btn-sm" style="margin-left:auto; background:#854d0e; color:#fff; border:none"
                    (click)="filterExpiring()">View Expiring</button>
        </div>
    }

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
                    <th>Validity</th>
                    <th class="num">Total</th>
                    <th>Created</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                @if (loading()) {
                    <tr><td colspan="10" class="text-center"><span class="spinner"></span> Loading…</td></tr>
                } @else if (items().length === 0) {
                    <tr><td colspan="10">
                        <div class="empty-state">
                            <div class="icon">📭</div>
                            <p>No quotations found.</p>
                        </div>
                    </td></tr>
                } @else {
                    @for (q of items(); track q.id) {
                        <tr [class.row-expiring]="isExpiringSoon(q) && q.status === 'sent'">
                            <td>
                                <a [routerLink]="['/quotations', q.id]"><strong>{{ q.quotation_number }}</strong></a>
                                @if (isExpiringSoon(q) && q.status === 'sent') {
                                    <span class="expiry-badge">⏰ Expiring soon</span>
                                }
                                @if (q.status === 'expired') {
                                    <span class="expired-badge">❌ Expired</span>
                                }
                            </td>
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
                            <td>
                                @if (q.valid_until) {
                                    <span [class.text-danger]="isExpiringSoon(q)" [class.text-muted]="!isExpiringSoon(q)">
                                        {{ q.valid_until | date:'d MMM yyyy' }}
                                        @if (daysUntilExpiry(q) <= 3 && daysUntilExpiry(q) >= 0) {
                                            <br><small style="color:#b45309; font-weight:600">{{ daysUntilExpiry(q) }}d left</small>
                                        }
                                    </span>
                                } @else { <span class="text-muted">—</span> }
                            </td>
                            <td class="num">₹{{ q.grand_total | number:'1.0-0' }}</td>
                            <td>{{ q.created_at | date:'short' }}</td>
                            <td>
                                <div class="row-actions">
                                    <a [routerLink]="['/quotations', q.id]" class="btn btn-sm">View</a>
                                    @if (q.status === 'accepted' && !q.booking_id) {
                                        <button class="btn btn-sm btn-convert"
                                                (click)="quickConvert(q)"
                                                [disabled]="converting() === q.id"
                                                title="Convert to Booking">
                                            {{ converting() === q.id ? '…' : '✅ Book' }}
                                        </button>
                                    }
                                    @if (q.status === 'accepted' && q.booking_id) {
                                        <span class="booked-badge">📦 Booked</span>
                                    }
                                    @if ((q.status === 'sent' || q.status === 'expired') && isExpiringSoon(q)) {
                                        <button class="btn btn-sm btn-resend"
                                                (click)="resendExtended(q)"
                                                title="Resend with extended validity">
                                            🔄 Extend
                                        </button>
                                    }
                                </div>
                            </td>
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

    <!-- Quick Convert Modal -->
    @if (convertModal()) {
        <div class="modal-backdrop" (click)="convertModal.set(null)">
            <div class="modal" (click)="$event.stopPropagation()">
                <h3>✅ Confirm Booking</h3>
                <p class="text-muted">Creating a booking from <strong>{{ convertModal()!.quotation_number }}</strong> for <strong>{{ convertModal()!.customer_name }}</strong></p>
                <div class="modal-detail-grid">
                    <div><span class="detail-label">Destination</span><span>{{ convertModal()!.destination_name || convertModal()!.destination_text }}</span></div>
                    <div><span class="detail-label">Travel</span><span>{{ convertModal()!.trip_start_date | date:'d MMM yyyy' }} – {{ convertModal()!.trip_end_date | date:'d MMM yyyy' }}</span></div>
                    <div><span class="detail-label">Total Amount</span><span class="modal-amount">₹{{ convertModal()!.grand_total | number:'1.0-0' }}</span></div>
                </div>
                <label style="display:flex;flex-direction:column;gap:4px;margin:12px 0;font-size:13px">
                    <span>Booking Fee % (advance)</span>
                    <input type="number" [(ngModel)]="bookingFeePct" min="0" max="100" style="padding:8px;border:1px solid #d1d5db;border-radius:6px;font:inherit">
                    <small class="text-muted">Advance amount: ₹{{ ((convertModal()!.grand_total || 0) * bookingFeePct / 100) | number:'1.0-0' }}</small>
                </label>
                <label style="display:flex;flex-direction:column;gap:4px;margin:12px 0;font-size:13px">
                    <span>Special Requests / Notes</span>
                    <textarea [(ngModel)]="specialRequests" rows="2" style="padding:8px;border:1px solid #d1d5db;border-radius:6px;font:inherit" placeholder="e.g. vegetarian meals, extra bed…"></textarea>
                </label>
                <div class="modal-actions">
                    <button class="btn btn-outline" (click)="convertModal.set(null)">Cancel</button>
                    <button class="btn btn-primary" (click)="confirmConvert()" [disabled]="converting() !== null">
                        {{ converting() !== null ? 'Creating…' : '✅ Confirm Booking' }}
                    </button>
                </div>
            </div>
        </div>
    }
    `,
    styles: [`
        .expiry-alert {
            display:flex; align-items:center; gap:10px; flex-wrap:wrap;
            background:#fef3c7; border:1px solid #fcd34d; border-radius:8px;
            padding:10px 16px; font-size:13px; color:#92400e; margin-bottom:14px;
        }
        .expiry-alert-icon { font-size:18px; }
        .row-expiring { background:#fffbeb !important; }
        .row-expiring:hover { background:#fef3c7 !important; }
        .expiry-badge { display:inline-block; background:#fef3c7; color:#b45309; font-size:10px; font-weight:700; padding:1px 7px; border-radius:10px; margin-left:6px; }
        .expired-badge { display:inline-block; background:#fee2e2; color:#991b1b; font-size:10px; font-weight:700; padding:1px 7px; border-radius:10px; margin-left:6px; }
        .booked-badge { display:inline-block; background:#d1fae5; color:#065f46; font-size:11px; font-weight:600; padding:2px 8px; border-radius:10px; }
        .text-danger { color:#dc2626; }
        .toolbar { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:14px; }
        .grow { flex:1; min-width:180px; }
        .row-actions { display:flex; gap:4px; align-items:center; }
        .btn-convert { background:#059669; color:#fff; border:none; }
        .btn-convert:hover:not(:disabled) { background:#047857; }
        .btn-convert:disabled { opacity:.5; cursor:not-allowed; }
        .btn-resend { background:#d97706; color:#fff; border:none; font-size:11px; }
        .btn-resend:hover { background:#b45309; }

        /* Modal */
        .modal-backdrop {
            position:fixed; inset:0; background:rgba(0,0,0,.4); z-index:9000;
            display:flex; align-items:center; justify-content:center;
            animation:fadeIn .15s ease;
        }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        .modal {
            background:#fff; border-radius:12px; padding:24px 28px; max-width:480px; width:90%;
            box-shadow:0 20px 60px rgba(0,0,0,.25);
            animation:slideUp .2s ease;
        }
        @keyframes slideUp { from{transform:translateY(20px);opacity:0} to{transform:translateY(0);opacity:1} }
        .modal h3 { margin:0 0 6px; font-size:18px; }
        .modal .text-muted { color:#6b7280; font-size:13px; margin-bottom:14px; }
        .modal-detail-grid { display:flex; flex-direction:column; gap:8px; background:#f9fafb; border-radius:8px; padding:12px 14px; }
        .modal-detail-grid > div { display:flex; justify-content:space-between; align-items:center; font-size:13px; }
        .detail-label { color:#6b7280; font-weight:500; }
        .modal-amount { font-size:18px; font-weight:800; color:#059669; }
        .modal-actions { display:flex; gap:8px; justify-content:flex-end; margin-top:16px; }

        .flex { display:flex; align-items:center; }
        .between { justify-content:space-between; }
        .mt-3 { margin-top:12px; }
        .text-muted { color:#6b7280; font-size:12px; }
        .btn { padding:8px 14px; border:none; border-radius:6px; cursor:pointer; font:inherit; text-decoration:none; }
        .btn-sm { padding:5px 10px; font-size:12px; }
        .btn-primary { background:#0f766e; color:#fff; }
        .btn-primary:disabled { opacity:.5; cursor:not-allowed; }
        .btn-outline { background:#fff; color:#374151; border:1px solid #d1d5db; }
    `]
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
    converting = signal<number | null>(null);
    convertModal = signal<QuotationListItem | null>(null);
    bookingFeePct = 20;
    specialRequests = '';

    searchCtrl = this.fb.control('');
    statusCtrl = this.fb.control<QuotationStatus | ''>('');

    expiringItems = signal<QuotationListItem[]>([]);

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
        this.page.set(1); this.fetch();
    }

    filterExpiring() {
        this.statusCtrl.setValue('sent');
        this.applyFilters();
    }

    formatPackage(p: string): string {
        return (p || '').replace(/_/g, ' + ').replace(/\b\w/g, c => c.toUpperCase());
    }

    daysUntilExpiry(q: QuotationListItem): number {
        if (!q.valid_until) return 999;
        const diff = new Date(q.valid_until).getTime() - Date.now();
        return Math.ceil(diff / (1000 * 3600 * 24));
    }

    isExpiringSoon(q: QuotationListItem): boolean {
        return this.daysUntilExpiry(q) <= 3;
    }

    quickConvert(q: QuotationListItem) {
        this.bookingFeePct = 20;
        this.specialRequests = '';
        this.convertModal.set(q);
    }

    confirmConvert() {
        const q = this.convertModal();
        if (!q) return;
        this.converting.set(q.id);
        this.api.createBooking({ quotation_id: q.id, booking_fee_pct: this.bookingFeePct, special_requests: this.specialRequests }).subscribe({
            next: (bk: any) => {
                this.toast.success(`Booking ${bk.booking_number} created successfully!`);
                this.converting.set(null);
                this.convertModal.set(null);
                this.fetch();
            },
            error: (e: any) => {
                this.toast.error(e.error?.error || 'Failed to create booking.');
                this.converting.set(null);
            }
        });
    }

    resendExtended(q: QuotationListItem) {
        // Extend validity by 7 days and mark as sent again
        const newValidity = new Date();
        newValidity.setDate(newValidity.getDate() + 7);
        const validUntil = newValidity.toISOString().split('T')[0];
        this.api.updateQuotation(q.id, { valid_until: validUntil, status: 'sent' } as any).subscribe({
            next: () => { this.toast.success(`${q.quotation_number} validity extended by 7 days`); this.fetch(); },
            error: () => this.toast.error('Failed to extend quotation.')
        });
    }

    private fetch() {
        this.loading.set(true);
        this.api.listQuotations({
            q: this.searchCtrl.value || undefined,
            status: (this.statusCtrl.value || undefined) as QuotationStatus | undefined,
            page: this.page(),
            limit: this.limit
        }).subscribe({
            next: r => {
                this.items.set(r.items);
                this.total.set(r.total);
                this.loading.set(false);
                // Find items expiring within 3 days that are in sent status
                this.expiringItems.set(r.items.filter(q => q.status === 'sent' && this.isExpiringSoon(q)));
            },
            error: () => { this.loading.set(false); this.toast.error('Failed to load quotations.'); }
        });
    }
}
