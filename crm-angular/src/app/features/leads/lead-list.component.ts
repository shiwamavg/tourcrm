import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { Lead, LeadStats, LeadStatus, LeadSource } from '../../core/models';

@Component({
    selector: 'app-lead-list',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink],
    template: `
    <div class="page-head">
        <div>
            <h1>Leads</h1>
            <p class="muted">Sales pipeline — every enquiry from Meta-ads, website form, CSV, walk-in, etc.</p>
        </div>
        <div class="actions">
            <a routerLink="/leads/import" class="btn btn-outline">📤 Import CSV</a>
            <a routerLink="/leads/new" class="btn btn-primary">+ New Lead</a>
        </div>
    </div>

    <!-- Stats strip -->
    <div class="stats-strip" *ngIf="stats()">
        <div class="stat" *ngFor="let s of statusCards()" (click)="filterByStatus(s.value)" [class.clickable]="s.value">
            <span class="stat-num" [style.color]="s.color">{{ s.n }}</span>
            <span class="stat-label">{{ s.label }}</span>
        </div>
    </div>

    <!-- Filters -->
    <div class="filters">
        <input class="input" placeholder="Search by name, email, phone, destination…"
               [(ngModel)]="search" (ngModelChange)="onFilterChange()" />
        <select class="input" [(ngModel)]="statusFilter" (change)="onFilterChange()">
            <option value="">All statuses</option>
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="qualified">Qualified</option>
            <option value="converted">Converted</option>
            <option value="lost">Lost</option>
            <option value="junk">Junk</option>
        </select>
        <select class="input" [(ngModel)]="sourceFilter" (change)="onFilterChange()">
            <option value="">All sources</option>
            <option value="manual">Manual</option>
            <option value="website_form">Website form</option>
            <option value="demo_request">Demo request</option>
            <option value="google_sheet">Google Sheet</option>
            <option value="csv_upload">CSV upload</option>
            <option value="meta_ads">Meta Ads</option>
            <option value="walk_in">Walk-in</option>
            <option value="referral">Referral</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="phone">Phone</option>
            <option value="other">Other</option>
        </select>
        <select class="input" [value]="limit" (change)="onLimitChange($event)">
            <option value="10">10 / page</option>
            <option value="20">20 / page</option>
            <option value="50">50 / page</option>
            <option value="100">100 / page</option>
        </select>
        @if (hasActiveFilters()) {
            <button class="btn btn-sm btn-outline" (click)="clearFilters()">Clear</button>
        }
    </div>

    <!-- Loading -->
    @if (loading()) {
        <div class="empty">
            <span class="spinner"></span>
            <p>Loading leads…</p>
        </div>
    }
    <!-- Empty state -->
    @else if (leads().length === 0) {
        <div class="empty">
            <div class="empty-icon">🎯</div>
            <p>No leads match your filters.</p>
            @if (hasActiveFilters()) {
                <button class="btn btn-sm btn-outline" (click)="clearFilters()">Clear filters</button>
            } @else {
                <a routerLink="/leads/new" class="btn btn-sm btn-primary">Add your first lead</a>
            }
        </div>
    }
    <!-- Table -->
    @else {
        <div class="table-wrap">
            <table class="table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Contact</th>
                        <th>Destination</th>
                        <th>Source</th>
                        <th>Status</th>
                        <th>Assigned to</th>
                        <th>Follow-up</th>
                        <th>Created</th>
                    </tr>
                </thead>
                <tbody>
                    <tr *ngFor="let l of leads()" (click)="goToLead(l.id)" class="row-link" [class.junk-row]="l.status === 'junk'">
                        <td>
                            <div class="name-container">
                                <strong>{{ l.full_name }}</strong>
                                @if (l.rating) {
                                    <span class="rating-badge" [class]="'rating-' + l.rating">{{ l.rating | uppercase }}</span>
                                }
                            </div>
                            @if (l.converted_quotation_number) {
                                <span class="converted-badge">
                                    → {{ l.converted_quotation_number }}
                                </span>
                            }
                        </td>
                        <td>
                            <div>{{ l.phone }}</div>
                            <div class="muted small">{{ l.email || '—' }}</div>
                        </td>
                        <td>{{ l.destination_text || '—' }}</td>
                        <td><span class="source-tag" [class]="'src-' + l.source">{{ sourceLabel(l.source) }}</span></td>
                        <td><span class="status-tag" [class]="'st-' + l.status">{{ l.status }}</span></td>
                        <td>{{ l.assigned_to_name || '—' }}</td>
                        <td>
                            @if (l.follow_up_at) {
                                <span [class.overdue]="isOverdue(l.follow_up_at)">
                                    {{ formatDate(l.follow_up_at) }}
                                </span>
                            } @else {
                                <span class="muted">—</span>
                            }
                        </td>
                        <td>{{ formatDate(l.created_at) }}</td>
                    </tr>
                </tbody>
            </table>
        </div>
        @if (total() > limit) {
            <div class="flex between mt-3">
                <div class="text-muted">Showing {{ leads().length }} of {{ total() }}</div>
                <div class="flex">
                    <button class="btn btn-sm" [disabled]="page() <= 1" (click)="prev()">← Prev</button>
                    <span class="text-muted" style="padding:6px 12px">Page {{ page() }} / {{ pages() }}</span>
                    <button class="btn btn-sm" [disabled]="page() >= pages()" (click)="next()">Next →</button>
                </div>
            </div>
        }
    }
    `,
    styles: [`
        .page-head { display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:14px; }
        .page-head h1 { margin:0 0 4px; }
        .page-head .muted { margin:0; color:#6b7280; }
        .actions { display:flex; gap:8px; }
        .import-btn { cursor:pointer; }
        .stats-strip {
            display:grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
            gap:10px; margin-bottom:14px;
        }
        .stat {
            background:#fff; padding:12px 14px; border-radius:8px;
            box-shadow: 0 1px 2px rgba(0,0,0,.04);
            display:flex; flex-direction:column; align-items:flex-start;
            transition: transform .12s, box-shadow .12s;
        }
        .stat.clickable { cursor: pointer; }
        .stat.clickable:hover { transform: translateY(-1px); box-shadow: 0 2px 6px rgba(0,0,0,.08); }
        .stat-num { font-size:24px; font-weight:700; line-height:1; }
        .stat-label { font-size:12px; color:#6b7280; text-transform:uppercase; letter-spacing:.5px; margin-top:4px; }
        .input {
            padding:8px 10px; border:1px solid #d1d5db; border-radius:6px;
            font:inherit; background:#fff;
        }
        .input:focus { outline:none; border-color:#0f766e; box-shadow:0 0 0 3px rgba(15,118,110,.1); }
        .table-wrap { background:#fff; border-radius:8px; box-shadow:0 1px 2px rgba(0,0,0,.04); overflow:hidden; }
        .table { width:100%; border-collapse:collapse; }
        .table th, .table td { padding:10px 12px; text-align:left; border-bottom:1px solid #f3f4f6; }
        .table th { background:#f9fafb; font-size:12px; text-transform:uppercase; color:#6b7280; letter-spacing:.5px; }
        .row-link { cursor:pointer; transition: background .1s; }
        .row-link:hover { background:#f9fafb; }
        .small { font-size:11px; }
        .converted-badge {
            display:inline-block; background:#d1fae5; color:#065f46;
            font-size:10px; padding:1px 6px; border-radius:8px; margin-left:6px;
        }
        .source-tag, .status-tag {
            display:inline-block; font-size:11px; padding:2px 8px; border-radius:10px;
            background:#f3f4f6; color:#374151;
        }
        .src-meta_ads    { background:#fef3c7; color:#92400e; }
        .src-walk_in     { background:#dbeafe; color:#1e40af; }
        .src-website_form{ background:#e0e7ff; color:#3730a3; }
        .src-demo_request{ background:#ccfbf1; color:#0f766e; }
        .src-csv_upload  { background:#fae8ff; color:#6b21a8; }
        .src-referral    { background:#d1fae5; color:#065f46; }
        .src-whatsapp    { background:#d1fae5; color:#065f46; }
        .st-new       { background:#dbeafe; color:#1e40af; }
        .st-contacted { background:#fef3c7; color:#92400e; }
        .st-qualified { background:#e0e7ff; color:#3730a3; }
        .st-converted { background:#d1fae5; color:#065f46; }
        .st-lost      { background:#fee2e2; color:#991b1b; }
        .st-junk      { background:#f3f4f6; color:#374151; border: 1px dashed #9ca3af; }
        .name-container { display:flex; align-items:center; }
        .rating-badge { display:inline-block; font-size:10px; padding:1px 6px; border-radius:8px; font-weight:600; margin-left:6px; }
        .rating-hot   { background: #fef2f2; color: #dc2626; border: 1px solid #fca5a5; }
        .rating-warm  { background: #fffbeb; color: #d97706; border: 1px solid #fde68a; }
        .rating-cold  { background: #f0f9ff; color: #0284c7; border: 1px solid #bae6fd; }
        .junk-row td  { opacity: 0.6; }
        .junk-row td strong { text-decoration: line-through; }
        .overdue { color:#dc2626; font-weight:600; }
        .empty { text-align:center; color:#6b7280; padding:40px; }
        .empty .empty-icon { font-size: 3rem; margin-bottom: 8px; }
        .empty p { margin-bottom: 12px; }
        .btn { padding:8px 14px; border:none; border-radius:6px; cursor:pointer; font:inherit; }
        .btn-primary { background:#0f766e; color:#fff; }
        .btn-outline { background:#fff; color:#374151; border:1px solid #d1d5db; text-decoration: none; }
        .btn-primary:hover { background:#115e59; }
    `]
})
export class LeadListComponent implements OnInit {
    private api = inject(ApiService);
    private router = inject(Router);
    private toast = inject(ToastService);

    leads  = signal<Lead[]>([]);
    stats  = signal<LeadStats | null>(null);
    loading = signal(false);
    search = '';
    statusFilter = '';
    sourceFilter = '';
    page = signal(1);
    limit = 20;
    total = signal(0);
    pages = () => Math.max(1, Math.ceil(this.total() / this.limit));
    statusCards = computed(() => {
        const s = this.stats();
        if (!s) return [];
        return [
            { label: 'New',        n: s.totals.new_count,        color: '#1e40af', value: 'new' as LeadStatus },
            { label: 'Contacted',  n: s.totals.contacted_count,  color: '#92400e', value: 'contacted' as LeadStatus },
            { label: 'Qualified',  n: s.totals.qualified_count,  color: '#3730a3', value: 'qualified' as LeadStatus },
            { label: 'Converted',  n: s.totals.converted_count,  color: '#065f46', value: 'converted' as LeadStatus },
            { label: 'Lost',       n: s.totals.lost_count,       color: '#991b1b', value: 'lost' as LeadStatus },
            { label: 'Junk',       n: s.totals.junk_count || 0,  color: '#4b5563', value: 'junk' as LeadStatus },
            { label: 'Overdue follow-ups', n: s.totals.overdue_followups, color: s.totals.overdue_followups ? '#dc2626' : '#6b7280', value: '' as LeadStatus }
        ];
    });

    private filterTimer: any;

    ngOnInit() { this.reload(); }

    onFilterChange() {
        clearTimeout(this.filterTimer);
        this.page.set(1);
        this.filterTimer = setTimeout(() => this.reload(), 250);
    }

    reload() {
        this.loading.set(true);
        this.api.getLeadStats().subscribe(s => this.stats.set(s));
        this.api.listLeads({
            q: this.search || undefined,
            status: this.statusFilter || undefined,
            source: this.sourceFilter || undefined,
            page: this.page(),
            limit: this.limit
        }).subscribe({
            next: r => { this.leads.set(r.items); this.total.set(r.total); this.loading.set(false); },
            error: () => {
                this.loading.set(false);
                this.toast.error('Failed to load leads. Please try again.');
            }
        });
    }

    goToLead(id: number) {
        this.router.navigate(['/leads', id]);
    }

    filterByStatus(status: LeadStatus) {
        if (!status) return;
        this.statusFilter = status;
        this.onFilterChange();
    }

    hasActiveFilters(): boolean {
        return !!(this.search || this.statusFilter || this.sourceFilter);
    }

    clearFilters() {
        this.search = '';
        this.statusFilter = '';
        this.sourceFilter = '';
        this.page.set(1);
        this.reload();
    }

    onLimitChange(e: Event) {
        this.limit = parseInt((e.target as HTMLSelectElement).value, 10);
        this.page.set(1);
        this.reload();
    }

    prev() { this.page.update(p => Math.max(1, p - 1)); this.reload(); }
    next() { this.page.update(p => p + 1); this.reload(); }

    sourceLabel(s: LeadSource): string {
        const map: Record<string, string> = {
            manual: 'Manual', website_form: 'Website form', demo_request: 'Demo request',
            google_sheet: 'Google Sheet', csv_upload: 'CSV upload', meta_ads: 'Meta Ads',
            walk_in: 'Walk-in', referral: 'Referral', whatsapp: 'WhatsApp', phone: 'Phone',
            other: 'Other'
        };
        return map[s] || s;
    }

    isOverdue(date: string): boolean {
        return new Date(date) < new Date();
    }

    formatDate(s: string): string {
        if (!s) return '—';
        const d = new Date(s);
        return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    }
}
