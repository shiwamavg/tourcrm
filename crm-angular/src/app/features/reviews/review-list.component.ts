// src/app/features/reviews/review-list.component.ts
import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
    selector: 'app-review-list',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink, DatePipe],
    template: `
    <div class="page-header">
        <div>
            <h1>⭐ Reviews</h1>
            <p>{{ total() }} total • Avg rating: <strong>{{ avgRating() }}/5</strong></p>
        </div>
    </div>

    <div class="card">
        <div class="filter-bar">
            <input type="search" placeholder="🔍 Search by name, comment, booking…"
                   [ngModel]="search()" (ngModelChange)="search.set($event)" (keyup.enter)="applyFilters()">
            <select [ngModel]="filter()" (ngModelChange)="filter.set($event); applyFilters()">
                <option value="">All reviews</option>
                <option value="1">Visible only</option>
                <option value="0">Hidden only</option>
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
                <div class="icon">⭐</div>
                <p>No reviews match your filters.</p>
            </div>
        } @else {
            <div class="review-grid">
                @for (r of items(); track r.id) {
                    <div class="card" style="margin-bottom:14px">
                        <div class="review-header">
                            <div>
                                <div style="color:#f59e0b; font-size:18px">
                                    @for (s of [1,2,3,4,5]; track s) {
                                        <span>{{ s <= r.rating ? '★' : '☆' }}</span>
                                    }
                                </div>
                                @if (r.title) { <strong>{{ r.title }}</strong> }
                            </div>
                            <div class="flex">
                                @if (r.is_verified) {
                                    <span class="badge badge-accepted" title="Customer had a paid booking">✓ Verified</span>
                                } @else {
                                    <span class="badge badge-draft">Unverified</span>
                                }
                                @if (r.is_visible) {
                                    <span class="badge badge-sent">Visible</span>
                                } @else {
                                    <span class="badge badge-rejected">Hidden</span>
                                }
                            </div>
                        </div>
                        <p>{{ r.comment }}</p>
                        <small class="text-muted">
                            — {{ r.customer_name }} • {{ r.created_at | date:'mediumDate' }}
                            • Booking <a [routerLink]="['/bookings', r.booking_id]" class="link">{{ r.booking_number }}</a>
                        </small>

                        @if (r.admin_reply) {
                            <div class="admin-reply">
                                <strong>↩ Agency reply:</strong>
                                <p style="margin:4px 0 0">{{ r.admin_reply }}</p>
                            </div>
                        }

                        <div class="review-actions">
                            <button class="btn btn-sm" (click)="toggleVisibility(r)">
                                {{ r.is_visible ? '🙈 Hide' : '👁 Show' }}
                            </button>
                            <button class="btn btn-sm" (click)="openReply(r)" [disabled]="replyOpenFor() === r.id">
                                💬 Reply
                            </button>
                        </div>

                        @if (replyOpenFor() === r.id) {
                            <div class="reply-form">
                                <textarea rows="3" [(ngModel)]="replyText" placeholder="Thank the customer, address concerns…"></textarea>
                                <div class="flex" style="justify-content:flex-end; margin-top:6px">
                                    <button class="btn btn-sm" (click)="closeReply()">Cancel</button>
                                    <button class="btn btn-sm btn-primary" (click)="submitReply(r)" [disabled]="!replyText.trim() || saving()">
                                        @if (saving()) { <span class="spinner"></span> }
                                        Send reply
                                    </button>
                                </div>
                            </div>
                        }
                    </div>
                }
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
export class ReviewListComponent implements OnInit {
    private api = inject(ApiService);
    private toast = inject(ToastService);

    loading = signal(true);
    items   = signal<any[]>([]);
    total   = signal(0);
    avgRating = signal(0);
    filter  = signal<'' | '1' | '0'>('');
    search  = signal('');
    page    = signal(1);
    limit   = signal(20);

    totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.limit())));
    startIndex = computed(() => (this.page() - 1) * this.limit() + 1);
    endIndex   = computed(() => Math.min(this.page() * this.limit(), this.total()));

    replyOpenFor = signal<number | null>(null);
    replyText = '';
    saving = signal(false);

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
        const f = this.filter();
        this.api.listReviewsAdmin({
            is_visible: f === '' ? undefined : (Number(f) as 0 | 1),
            page: this.page(),
            limit: this.limit(),
            search: this.search() || undefined
        }).subscribe({
            next: r => {
                this.items.set(r.items);
                this.total.set(r.total);
                this.page.set(r.page);
                this.limit.set(r.limit);
                const avg = r.avg_rating !== undefined
                    ? Number(r.avg_rating)
                    : r.items.length
                        ? r.items.reduce((s: number, x: any) => s + Number(x.rating), 0) / r.items.length
                        : 0;
                this.avgRating.set(Math.round(avg * 10) / 10);
                this.loading.set(false);
            },
            error: () => {
                this.loading.set(false);
                this.toast.error('Failed to load reviews');
            }
        });
    }
    toggleVisibility(r: any) {
        this.api.moderateReview(r.id, { is_visible: !r.is_visible }).subscribe({
            next: () => this.reload(),
            error: () => this.toast.error('Failed to update visibility')
        });
    }
    openReply(r: any) {
        this.replyText = r.admin_reply || '';
        this.replyOpenFor.set(r.id);
    }
    closeReply() {
        this.replyOpenFor.set(null);
        this.replyText = '';
    }
    submitReply(r: any) {
        this.saving.set(true);
        this.api.moderateReview(r.id, { admin_reply: this.replyText }).subscribe({
            next: () => {
                this.saving.set(false);
                this.closeReply();
                this.toast.success('Reply posted');
                this.reload();
            },
            error: () => {
                this.saving.set(false);
                this.toast.error('Failed to post reply');
            }
        });
    }
}
