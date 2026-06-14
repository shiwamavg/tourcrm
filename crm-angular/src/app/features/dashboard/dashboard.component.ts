import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { ReminderService } from '../../core/services/competitor-features.service';
import { ToastService } from '../../core/services/toast.service';
import { QuotationStats, QuotationListItem, LeadStats, Lead } from '../../core/models';

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [CommonModule, RouterLink, DatePipe, DecimalPipe],
    template: `
    <div class="page-header">
        <div>
            <h1>Dashboard</h1>
            <p>Overview of sales pipeline, quotations, and recent activity</p>
        </div>
        <div class="flex gap-2">
            <a routerLink="/leads/new" class="btn btn-outline btn-sm">+ New Lead</a>
            <a routerLink="/quotations/new" class="btn btn-primary btn-sm">+ New Quotation</a>
        </div>
    </div>

    @if (loading()) {
        <div class="card text-center"><span class="spinner"></span> Loading…</div>
    } @else {
        <!-- Quick action tiles -->
        <div class="quick-tiles">
            <a routerLink="/leads" class="qtile">
                <span class="qtile-icon">🎯</span>
                <div class="qtile-info">
                    <div class="qtile-num">{{ leadStats()?.totals?.total || 0 }}</div>
                    <div class="qtile-label">Total Leads</div>
                </div>
            </a>
            <a routerLink="/leads" [queryParams]="{status:'new'}" class="qtile">
                <span class="qtile-icon">🔔</span>
                <div class="qtile-info">
                    <div class="qtile-num">{{ leadStats()?.totals?.new_count || 0 }}</div>
                    <div class="qtile-label">New Leads</div>
                </div>
            </a>
            <a routerLink="/quotations" class="qtile">
                <span class="qtile-icon">📋</span>
                <div class="qtile-info">
                    <div class="qtile-num">{{ quoteStats()?.total || 0 }}</div>
                    <div class="qtile-label">Quotations</div>
                </div>
            </a>
            <a routerLink="/bookings" class="qtile">
                <span class="qtile-icon">📦</span>
                <div class="qtile-info">
                    <div class="qtile-num">{{ bookingCount() }}</div>
                    <div class="qtile-label">Bookings</div>
                </div>
            </a>
            <a routerLink="/payments" class="qtile">
                <span class="qtile-icon">💰</span>
                <div class="qtile-info">
                    <div class="qtile-num">₹{{ (quoteStats()?.total_value || 0) | number:'1.0-0' }}</div>
                    <div class="qtile-label">Pipeline Value</div>
                </div>
            </a>
            <a routerLink="/invoices" class="qtile">
                <span class="qtile-icon">🧾</span>
                <div class="qtile-info">
                    <div class="qtile-num">{{ invoiceCount() }}</div>
                    <div class="qtile-label">Invoices</div>
                </div>
            </a>
            <a routerLink="/reminders" class="qtile" [class]="{'qtile-danger': reminderStats()?.overdue > 0}">
                <span class="qtile-icon">🔔</span>
                <div class="qtile-info">
                    <div class="qtile-num">{{ reminderStats()?.today || 0 }} <small style="font-size:11px;color:#6b7280;font-weight:400">/ {{ reminderStats()?.pending || 0 }}</small></div>
                    <div class="qtile-label">Today's Follow-ups</div>
                    @if (reminderStats()?.overdue > 0) { <small style="color:#b91c1c">🚨 {{ reminderStats()?.overdue }} overdue</small> }
                </div>
            </a>
        </div>

        <!-- Today's Follow-ups -->
        <div class="card" style="margin-bottom:18px">
            <div class="section-header">
                <h2 style="margin:0;border:none;padding:0">📅 Today's Follow-ups
                    @if (reminderStats()?.myToday > 0) { <small style="font-size:12px;color:#0f766e">({{ reminderStats()?.myToday }} for you)</small> }
                </h2>
                <a routerLink="/reminders" class="btn btn-sm btn-outline">Manage</a>
            </div>
            @if (todayFollowups().length) {
                <div class="table-wrap" style="box-shadow:none">
                    <table class="data-table">
                        <thead>
                            <tr><th>Title</th><th>Time</th><th>Priority</th><th>Type</th><th>Assigned To</th><th></th></tr>
                        </thead>
                        <tbody>
                            @for (r of todayFollowups(); track r.id) {
                                <tr>
                                    <td>
                                        <strong>{{ r.title }}</strong>
                                        @if (r.description) { <br><small class="text-muted">{{ r.description }}</small> }
                                    </td>
                                    <td>{{ r.remind_at | date:'shortTime' }}</td>
                                    <td><span class="badge" [class]="'badge-prio-' + r.priority">{{ r.priority }}</span></td>
                                    <td><span class="source-tag">{{ r.followup_type }}</span></td>
                                    <td>{{ r.assigned_name || '—' }}</td>
                                    <td>
                                        <button class="btn btn-sm btn-outline" (click)="dismissReminder(r.id)">✓ Done</button>
                                    </td>
                                </tr>
                            }
                        </tbody>
                    </table>
                </div>
            } @else {
                <div class="empty-state" style="padding:16px">
                    <p>No follow-ups scheduled for today. 🎉</p>
                </div>
            }
        </div>

        <!-- Recent Leads -->
        <div class="dashboard-grid">
            <div class="card">
                <div class="section-header">
                    <h2 style="margin:0;border:none;padding:0">Recent Leads</h2>
                    <a routerLink="/leads" class="btn btn-sm btn-outline">View all</a>
                </div>
                @if (recentLeads().length) {
                    <div class="table-wrap" style="box-shadow:none">
                        <table class="data-table">
                            <thead>
                                <tr><th>Name</th><th>Source</th><th>Status</th><th>Date</th></tr>
                            </thead>
                            <tbody>
                                @for (l of recentLeads(); track l.id) {
                                    <tr>
                                        <td><a [routerLink]="['/leads', l.id]">{{ l.full_name }}</a></td>
                                        <td><span class="source-tag" [class]="'src-' + l.source">{{ l.source.replace('_', ' ') }}</span></td>
                                        <td><span class="status-tag" [class]="'st-' + l.status">{{ l.status }}</span></td>
                                        <td>{{ l.created_at | date:'shortDate' }}</td>
                                    </tr>
                                }
                            </tbody>
                        </table>
                    </div>
                } @else {
                    <div class="empty-state">
                        <div class="icon">🎯</div>
                        <p>No leads yet. <a routerLink="/leads/new">Add your first lead →</a></p>
                    </div>
                }
            </div>

            <!-- Recent Quotations -->
            <div class="card">
                <div class="section-header">
                    <h2 style="margin:0;border:none;padding:0">Recent Quotations</h2>
                    <a routerLink="/quotations" class="btn btn-sm btn-outline">View all</a>
                </div>
                @if (recentQuotations().length) {
                    <div class="table-wrap" style="box-shadow:none">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Number</th>
                                    <th>Customer</th>
                                    <th>Status</th>
                                    <th class="num">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                @for (q of recentQuotations(); track q.id) {
                                    <tr>
                                        <td><a [routerLink]="['/quotations', q.id]">{{ q.quotation_number }}</a></td>
                                        <td>{{ q.customer_name }}</td>
                                        <td><span class="badge" [class]="'badge-' + q.status">{{ q.status }}</span></td>
                                        <td class="num">₹{{ q.grand_total | number:'1.0-0' }}</td>
                                    </tr>
                                }
                            </tbody>
                        </table>
                    </div>
                } @else {
                    <div class="empty-state">
                        <div class="icon">📋</div>
                        <p>No quotations yet. <a routerLink="/quotations/new">Create your first one →</a></p>
                    </div>
                }
            </div>
        </div>
    }
    `,
    styles: [`
        .quick-tiles {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
            gap: 14px; margin-bottom: 24px;
        }
        .qtile {
            background: #fff; border-radius: 10px;
            box-shadow: 0 1px 3px rgba(0,0,0,.08), 0 1px 2px rgba(0,0,0,.06);
            padding: 16px 18px; display: flex; align-items: center; gap: 12px;
            text-decoration: none; color: inherit; transition: transform .15s, box-shadow .15s;
        }
        .qtile:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,.1); }
        .qtile-icon { font-size: 28px; }
        .qtile-info { flex: 1; }
        .qtile-num { font-size: 1.4rem; font-weight: 700; color: #111827; }
        .qtile-label { font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: .04em; }
        .dashboard-grid {
            display: grid; grid-template-columns: repeat(auto-fit, minmax(420px, 1fr));
            gap: 18px;
        }
        .source-tag, .status-tag {
            display: inline-block; font-size: 11px; padding: 2px 8px; border-radius: 10px;
            background: #f3f4f6; color: #374151;
        }
        .src-meta_ads    { background: #fef3c7; color: #92400e; }
        .src-walk_in     { background: #dbeafe; color: #1e40af; }
        .src-website_form{ background: #e0e7ff; color: #3730a3; }
        .src-csv_upload  { background: #fae8ff; color: #6b21a8; }
        .src-referral    { background: #d1fae5; color: #065f46; }
        .src-whatsapp    { background: #d1fae5; color: #065f46; }
        .st-new       { background: #dbeafe; color: #1e40af; }
        .st-contacted { background: #fef3c7; color: #92400e; }
        .st-qualified { background: #e0e7ff; color: #3730a3; }
        .st-converted { background: #d1fae5; color: #065f46; }
        .st-lost      { background: #fee2e2; color: #991b1b; }
        @media (max-width: 600px) {
            .dashboard-grid { grid-template-columns: 1fr; }
        }
    `]
})
export class DashboardComponent implements OnInit {
    private api = inject(ApiService);
    private reminderApi = inject(ReminderService);
    private toast = inject(ToastService);

    loading = signal(true);
    quoteStats = signal<QuotationStats | null>(null);
    leadStats = signal<LeadStats | null>(null);
    recentQuotations = signal<QuotationListItem[]>([]);
    recentLeads = signal<Lead[]>([]);
    bookingCount = signal(0);
    invoiceCount = signal(0);
    reminderStats = signal<any>(null);
    todayFollowups = signal<any[]>([]);

    dismissReminder(id: number) {
        this.reminderApi.dismiss(id).subscribe(() => {
            this.todayFollowups.update(list => list.filter((r: any) => r.id !== id));
            this.toast.success('Marked done');
        });
    }

    ngOnInit() {
        // Load all data in parallel
        let done = 0;
        const total = 7;
        const check = () => { if (++done >= total) this.loading.set(false); };

        this.api.stats().subscribe({
            next: s => { this.quoteStats.set(s); check(); },
            error: () => check()
        });
        this.api.listQuotations({ limit: 5 }).subscribe({
            next: r => { this.recentQuotations.set(r.items); check(); },
            error: () => check()
        });
        this.api.getLeadStats().subscribe({
            next: s => { this.leadStats.set(s); check(); },
            error: () => check()
        });
        this.api.listLeads({ limit: 5 }).subscribe({
            next: r => { this.recentLeads.set(r.items); check(); },
            error: () => check()
        });
        this.api.listBookings({ limit: 1 }).subscribe({
            next: r => { this.bookingCount.set(r.total); check(); },
            error: () => check()
        });
        this.api.listInvoices({ limit: 1 }).subscribe({
            next: r => { this.invoiceCount.set(r.total); check(); },
            error: () => check()
        });
        this.api.getReminderStats().subscribe({
            next: r => { this.reminderStats.set(r); this.todayFollowups.set(r.todayList || []); check(); },
            error: () => check()
        });
    }
}
