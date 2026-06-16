import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { Lead, LeadStats, LeadStatus, LeadSource } from '../../core/models';

const STATUSES: { value: LeadStatus | ''; label: string; color: string; icon: string }[] = [
    { value: 'new',       label: 'New',       color: '#1e40af', icon: '🔵' },
    { value: 'contacted', label: 'Contacted',  color: '#92400e', icon: '🟡' },
    { value: 'qualified', label: 'Qualified',  color: '#3730a3', icon: '🟣' },
    { value: 'converted', label: 'Converted',  color: '#065f46', icon: '🟢' },
    { value: 'lost',      label: 'Lost',       color: '#991b1b', icon: '🔴' },
    { value: 'junk',      label: 'Junk',       color: '#4b5563', icon: '⚫' },
];

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
        <div class="stat" *ngFor="let s of statusCards()" (click)="filterByStatus(s.value)" [class.clickable]="s.value" [class.active-filter]="statusFilter === s.value">
            <span class="stat-num" [style.color]="s.color">{{ s.n }}</span>
            <span class="stat-label">{{ s.label }}</span>
        </div>
    </div>

    <!-- Filters + View toggle -->
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
        <!-- View Mode Toggle -->
        <div class="view-toggle">
            <button class="view-btn" [class.active]="viewMode() === 'table'" (click)="viewMode.set('table')" title="Table view">☰</button>
            <button class="view-btn" [class.active]="viewMode() === 'kanban'" (click)="switchToKanban()" title="Kanban view">⬛</button>
        </div>
    </div>

    <!-- Loading -->
    @if (loading()) {
        <div class="empty">
            <span class="spinner"></span>
            <p>Loading leads…</p>
        </div>
    }

    <!-- TABLE VIEW -->
    @else if (viewMode() === 'table') {
        @if (leads().length === 0) {
            <div class="empty">
                <div class="empty-icon">🎯</div>
                <p>No leads match your filters.</p>
                @if (hasActiveFilters()) {
                    <button class="btn btn-sm btn-outline" (click)="clearFilters()">Clear filters</button>
                } @else {
                    <a routerLink="/leads/new" class="btn btn-sm btn-primary">Add your first lead</a>
                }
            </div>
        } @else {
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
                                    <span class="converted-badge">→ {{ l.converted_quotation_number }}</span>
                                }
                            </td>
                            <td>
                                <div>{{ l.phone }}</div>
                                <div class="muted small">{{ l.email || '—' }}</div>
                            </td>
                            <td>
                                {{ l.destination_text || '—' }}
                                @if (l.package_title) {
                                    <div class="muted small">📦 {{ l.package_title }}</div>
                                }
                            </td>
                            <td><span class="source-tag" [class]="'src-' + l.source">{{ sourceLabel(l.source) }}</span></td>
                            <td><span class="status-tag" [class]="'st-' + l.status">{{ l.status }}</span></td>
                            <td>{{ l.assigned_to_name || '—' }}</td>
                            <td>
                                @if (l.follow_up_at) {
                                    <span [class.overdue]="isOverdue(l.follow_up_at)">{{ formatDate(l.follow_up_at) }}</span>
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
    }

    <!-- KANBAN VIEW -->
    @else if (viewMode() === 'kanban') {
        <div class="kanban-note">
            <span>📋 Showing all leads in pipeline view. Drag cards or click status buttons to move leads between stages.</span>
        </div>
        @if (kanbanLoading()) {
            <div class="empty"><span class="spinner"></span><p>Loading pipeline…</p></div>
        } @else {
            <div class="kanban-board">
                @for (col of kanbanColumns; track col.status) {
                    <div class="kanban-col">
                        <div class="kanban-col-header" [style.border-top-color]="col.color">
                            <span class="kanban-col-icon">{{ col.icon }}</span>
                            <span class="kanban-col-title">{{ col.label }}</span>
                            <span class="kanban-col-count">{{ getColLeads(col.status).length }}</span>
                        </div>
                        <div class="kanban-col-body"
                             (dragover)="onDragOver($event)"
                             (drop)="onDrop($event, col.status)">
                            @for (l of getColLeads(col.status); track l.id) {
                                <div class="kanban-card"
                                     draggable="true"
                                     (dragstart)="onDragStart($event, l)"
                                     (click)="goToLead(l.id)">
                                    <div class="kcard-header">
                                        <strong class="kcard-name">{{ l.full_name }}</strong>
                                        @if (l.rating) {
                                            <span class="kcard-rating" [class]="'rating-' + l.rating">{{ l.rating | uppercase }}</span>
                                        }
                                    </div>
                                    @if (l.destination_text) {
                                        <div class="kcard-dest">📍 {{ l.destination_text }}</div>
                                    }
                                    @if (l.package_title) {
                                        <div class="kcard-pkg">📦 {{ l.package_title }}</div>
                                    }
                                    <div class="kcard-footer">
                                        <span class="source-tag" [class]="'src-' + l.source" style="font-size:10px">{{ sourceLabel(l.source) }}</span>
                                        @if (l.follow_up_at) {
                                            <span class="kcard-followup" [class.overdue]="isOverdue(l.follow_up_at)">
                                                🔔 {{ formatDate(l.follow_up_at) }}
                                            </span>
                                        }
                                    </div>
                                    <!-- Quick status move -->
                                    <div class="kcard-actions" (click)="$event.stopPropagation()">
                                        @for (st of quickMoveTargets(col.status); track st.value) {
                                            <button class="kcard-move-btn" [style.color]="st.color"
                                                    (click)="moveCard(l, st.value)" [title]="'Move to ' + st.label">
                                                → {{ st.label }}
                                            </button>
                                        }
                                    </div>
                                </div>
                            }
                            @if (getColLeads(col.status).length === 0) {
                                <div class="kanban-empty-col">Drop leads here</div>
                            }
                        </div>
                    </div>
                }
            </div>
        }
    }
    `,
    styles: [`
        .page-head { display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:14px; }
        .page-head h1 { margin:0 0 4px; }
        .page-head .muted { margin:0; color:#6b7280; }
        .actions { display:flex; gap:8px; }
        .stats-strip {
            display:grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
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
        .stat.active-filter { outline: 2px solid #0f766e; }
        .stat-num { font-size:22px; font-weight:700; line-height:1; }
        .stat-label { font-size:11px; color:#6b7280; text-transform:uppercase; letter-spacing:.5px; margin-top:4px; }

        /* Filters */
        .filters { display:grid; grid-template-columns:minmax(180px,1fr) auto auto auto auto; gap:8px; margin-bottom:14px; align-items:center; }
        .input { padding:8px 10px; border:1px solid #d1d5db; border-radius:6px; font:inherit; background:#fff; width:100%; min-width:0; }
        .input:focus { outline:none; border-color:#0f766e; box-shadow:0 0 0 3px rgba(15,118,110,.1); }

        /* View toggle */
        .view-toggle { display:flex; border:1px solid #d1d5db; border-radius:6px; overflow:hidden; margin-left:auto; }
        .view-btn { padding:6px 12px; border:none; background:#fff; font-size:13px; cursor:pointer; color:#6b7280; }
        .view-btn.active { background:#4f46e5; color:#fff; }
        .view-btn:hover:not(.active) { background:#f3f4f6; }

        /* Table */
        .table-wrap { background:#fff; border-radius:8px; box-shadow:0 1px 2px rgba(0,0,0,.04); overflow:hidden; }
        .table { width:100%; border-collapse:collapse; }
        .table th, .table td { padding:10px 12px; text-align:left; border-bottom:1px solid #f3f4f6; }
        .table th { background:#f9fafb; font-size:12px; text-transform:uppercase; color:#6b7280; letter-spacing:.5px; }
        .row-link { cursor:pointer; transition: background .1s; }
        .row-link:hover { background:#f9fafb; }
        .small { font-size:11px; }
        .converted-badge { display:inline-block; background:#d1fae5; color:#065f46; font-size:10px; padding:1px 6px; border-radius:8px; margin-left:6px; }
        .source-tag, .status-tag { display:inline-block; font-size:11px; padding:2px 8px; border-radius:10px; background:#f3f4f6; color:#374151; }
        .src-meta_ads     { background:#fef3c7; color:#92400e; }
        .src-walk_in      { background:#dbeafe; color:#1e40af; }
        .src-website_form { background:#e0e7ff; color:#3730a3; }
        .src-demo_request { background:#ccfbf1; color:#0f766e; }
        .src-csv_upload   { background:#fae8ff; color:#6b21a8; }
        .src-referral     { background:#d1fae5; color:#065f46; }
        .src-whatsapp     { background:#d1fae5; color:#065f46; }
        .st-new       { background:#dbeafe; color:#1e40af; }
        .st-contacted { background:#fef3c7; color:#92400e; }
        .st-qualified { background:#e0e7ff; color:#3730a3; }
        .st-converted { background:#d1fae5; color:#065f46; }
        .st-lost      { background:#fee2e2; color:#991b1b; }
        .st-junk      { background:#f3f4f6; color:#374151; border: 1px dashed #9ca3af; }
        .name-container { display:flex; align-items:center; }
        .rating-badge { display:inline-block; font-size:10px; padding:1px 6px; border-radius:8px; font-weight:600; margin-left:6px; }
        .rating-hot  { background:#fef2f2; color:#dc2626; border:1px solid #fca5a5; }
        .rating-warm { background:#fffbeb; color:#d97706; border:1px solid #fde68a; }
        .rating-cold { background:#f0f9ff; color:#0284c7; border:1px solid #bae6fd; }
        .junk-row td { opacity:0.6; }
        .junk-row td strong { text-decoration:line-through; }
        .overdue { color:#dc2626; font-weight:600; }
        .empty { text-align:center; color:#6b7280; padding:40px; }
        .empty .empty-icon { font-size:3rem; margin-bottom:8px; }
        .empty p { margin-bottom:12px; }

        /* Kanban note */
        .kanban-note {
            background:#eff6ff; border:1px solid #bfdbfe; border-radius:6px;
            padding:8px 14px; font-size:12px; color:#1e40af; margin-bottom:14px;
        }

        /* Kanban Board */
        .kanban-board {
            display:flex; gap:12px; overflow-x:auto;
            padding-bottom:16px; align-items:flex-start;
        }
        .kanban-col {
            min-width:240px; max-width:260px; flex-shrink:0;
            background:#f8fafc; border-radius:10px; overflow:hidden;
            border:1px solid #e5e7eb;
        }
        .kanban-col-header {
            display:flex; align-items:center; gap:8px;
            padding:10px 12px; background:#fff; font-weight:700; font-size:13px;
            border-top:3px solid #6366f1; border-bottom:1px solid #f1f5f9;
        }
        .kanban-col-icon { font-size:14px; }
        .kanban-col-title { flex:1; color:#111827; }
        .kanban-col-count {
            background:#f3f4f6; color:#374151; font-size:11px; font-weight:700;
            padding:1px 7px; border-radius:10px;
        }
        .kanban-col-body {
            padding:8px; min-height:120px; max-height:calc(100vh - 280px);
            overflow-y:auto;
        }
        .kanban-card {
            background:#fff; border-radius:8px; padding:10px 12px;
            margin-bottom:8px; cursor:pointer;
            box-shadow:0 1px 3px rgba(0,0,0,.07);
            border:1px solid #f1f5f9;
            transition:transform .12s, box-shadow .12s;
        }
        .kanban-card:hover { transform:translateY(-1px); box-shadow:0 3px 10px rgba(0,0,0,.1); }
        .kcard-header { display:flex; align-items:center; gap:6px; margin-bottom:4px; }
        .kcard-name { font-size:13px; color:#111827; flex:1; }
        .kcard-rating { font-size:9px; padding:1px 5px; border-radius:8px; font-weight:700; }
        .kcard-dest { font-size:11px; color:#374151; margin-bottom:2px; }
        .kcard-pkg { font-size:11px; color:#6b7280; margin-bottom:6px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .kcard-footer { display:flex; align-items:center; justify-content:space-between; gap:4px; margin-bottom:6px; }
        .kcard-followup { font-size:10px; color:#6b7280; }
        .kcard-followup.overdue { color:#dc2626; font-weight:600; }
        .kcard-actions { display:flex; gap:4px; flex-wrap:wrap; border-top:1px solid #f3f4f6; padding-top:6px; }
        .kcard-move-btn {
            font-size:10px; padding:2px 7px; border:1px solid #e5e7eb;
            background:#f9fafb; border-radius:8px; cursor:pointer; font-weight:600;
            white-space:nowrap;
        }
        .kcard-move-btn:hover { background:#e0e7ff; }
        .kanban-empty-col { color:#9ca3af; text-align:center; font-size:12px; padding:20px 8px; border:1px dashed #e5e7eb; border-radius:6px; }

        /* Buttons */
        .btn { padding:8px 14px; border:none; border-radius:6px; cursor:pointer; font:inherit; }
        .btn-primary { background:#0f766e; color:#fff; }
        .btn-outline { background:#fff; color:#374151; border:1px solid #d1d5db; text-decoration:none; }
        .btn-primary:hover { background:#115e59; }
        .btn-sm { padding:5px 10px; font-size:12px; }
        .flex { display:flex; align-items:center; }
        .between { justify-content:space-between; }
        .mt-3 { margin-top:12px; }
        .text-muted { color:#6b7280; font-size:12px; }
    `]
})
export class LeadListComponent implements OnInit {
    private api = inject(ApiService);
    private router = inject(Router);
    private toast = inject(ToastService);

    leads       = signal<Lead[]>([]);
    allLeads    = signal<Lead[]>([]);
    stats       = signal<LeadStats | null>(null);
    loading     = signal(false);
    kanbanLoading = signal(false);
    viewMode    = signal<'table' | 'kanban'>('table');
    search      = '';
    statusFilter = '';
    sourceFilter = '';
    page        = signal(1);
    limit       = 20;
    total       = signal(0);
    pages       = () => Math.max(1, Math.ceil(this.total() / this.limit));

    // Drag state
    private draggingLead: Lead | null = null;

    kanbanColumns = STATUSES.filter(s => s.value !== '').map(s => ({ ...s, status: s.value as LeadStatus }));

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
            error: () => { this.loading.set(false); this.toast.error('Failed to load leads.'); }
        });
    }

    switchToKanban() {
        this.viewMode.set('kanban');
        // Load ALL leads without pagination for kanban view
        this.kanbanLoading.set(true);
        this.api.listLeads({
            q: this.search || undefined,
            source: this.sourceFilter || undefined,
            limit: 200
        }).subscribe({
            next: r => { this.allLeads.set(r.items); this.kanbanLoading.set(false); },
            error: () => { this.kanbanLoading.set(false); this.toast.error('Failed to load kanban data.'); }
        });
    }

    getColLeads(status: LeadStatus): Lead[] {
        return this.allLeads().filter(l => l.status === status);
    }

    quickMoveTargets(current: LeadStatus): typeof STATUSES[number][] {
        const pipeline = ['new', 'contacted', 'qualified', 'converted'] as LeadStatus[];
        const idx = pipeline.indexOf(current);
        const result = [];
        if (idx < pipeline.length - 1) result.push(STATUSES.find(s => s.value === pipeline[idx + 1])!);
        if (current !== 'lost' && current !== 'converted') result.push(STATUSES.find(s => s.value === 'lost')!);
        return result.filter(Boolean);
    }

    moveCard(lead: Lead, newStatus: LeadStatus | '') {
        if (!newStatus || lead.status === newStatus) return;
        this.api.setLeadStatus(lead.id, newStatus).subscribe({
            next: () => {
                this.allLeads.update(list => list.map(l => l.id === lead.id ? { ...l, status: newStatus as LeadStatus } : l));
                this.toast.success(`${lead.full_name} → ${newStatus}`);
                this.api.getLeadStats().subscribe(s => this.stats.set(s));
            },
            error: () => this.toast.error('Failed to update status.')
        });
    }

    onDragStart(e: DragEvent, lead: Lead) {
        this.draggingLead = lead;
        e.dataTransfer?.setData('text/plain', String(lead.id));
    }

    onDragOver(e: DragEvent) { e.preventDefault(); }

    onDrop(e: DragEvent, targetStatus: LeadStatus) {
        e.preventDefault();
        if (this.draggingLead && this.draggingLead.status !== targetStatus) {
            this.moveCard(this.draggingLead, targetStatus);
        }
        this.draggingLead = null;
    }

    goToLead(id: number) { this.router.navigate(['/leads', id]); }

    filterByStatus(status: LeadStatus | '') {
        if (!status) return;
        this.statusFilter = status;
        this.onFilterChange();
    }

    hasActiveFilters(): boolean { return !!(this.search || this.statusFilter || this.sourceFilter); }

    clearFilters() {
        this.search = ''; this.statusFilter = ''; this.sourceFilter = '';
        this.page.set(1); this.reload();
    }

    onLimitChange(e: Event) {
        this.limit = parseInt((e.target as HTMLSelectElement).value, 10);
        this.page.set(1); this.reload();
    }

    prev() { this.page.update(p => Math.max(1, p - 1)); this.reload(); }
    next() { this.page.update(p => p + 1); this.reload(); }

    sourceLabel(s: LeadSource): string {
        const map: Record<string, string> = {
            manual: 'Manual', website_form: 'Website form', demo_request: 'Demo request',
            google_sheet: 'Google Sheet', csv_upload: 'CSV upload', meta_ads: 'Meta Ads',
            walk_in: 'Walk-in', referral: 'Referral', whatsapp: 'WhatsApp', phone: 'Phone', other: 'Other'
        };
        return map[s] || s;
    }

    isOverdue(date: string): boolean { return new Date(date) < new Date(); }

    formatDate(s: string): string {
        if (!s) return '—';
        return new Date(s).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    }
}
