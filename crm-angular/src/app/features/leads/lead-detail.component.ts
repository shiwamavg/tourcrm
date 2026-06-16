import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { Lead, LeadStatus, User } from '../../core/models';
import { FollowupTimelineComponent } from '../../shared/components/followup-timeline.component';

@Component({
    selector: 'app-lead-detail',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink, FollowupTimelineComponent],
    template: `
    <!-- Loading -->
    @if (loading()) {
        <div class="empty">
            <span class="spinner"></span>
            <p>Loading lead…</p>
        </div>
    }

    <!-- Detail -->
    @if (lead()) {
        @let l = lead()!;
        <div class="lead-detail">
            <div class="page-head">
                <div>
                    <a routerLink="/leads" class="back-link">← All leads</a>
                    <h1>{{ l.full_name }}</h1>
                    <p class="muted">
                        <span class="status-tag" [class]="'st-' + l.status">{{ l.status }}</span>
                        @if (l.rating) {
                            &middot;
                            <span class="rating-tag" [class]="'rating-' + l.rating">{{ l.rating | uppercase }}</span>
                        }
                        &middot;
                        <span class="source-tag" [class]="'src-' + l.source">{{ sourceLabel(l.source) }}</span>
                        &middot;
                        Lead #{{ l.id }} · created {{ formatDate(l.created_at) }}
                    </p>
                </div>
                <div class="actions">
                    @if (l.converted_quotation_id) {
                        <a [routerLink]="['/quotations', l.converted_quotation_id]"
                           class="btn btn-outline">
                            Open {{ l.converted_quotation_number }}
                        </a>
                    }
                    @if (l.status !== 'converted' && !l.converted_quotation_id) {
                        <button class="btn btn-primary" (click)="convert()">
                            🔄 Convert to Quotation
                        </button>
                    }
                </div>
            </div>

            <div class="grid">
                <!-- Left: details -->
                <div class="card">
                    <h3>Contact & destination</h3>
                    <table class="kv">
                        <tr><th>Phone</th><td>{{ l.phone }}</td></tr>
                        <tr><th>Email</th><td>{{ l.email || '—' }}</td></tr>
                        <tr><th>Destination</th><td>{{ l.destination_text || '—' }}</td></tr>
                        @if (l.package_title) {
                            <tr><th>Package</th><td><strong>{{ l.package_title }}</strong></td></tr>
                        }
                        <tr><th>Assigned to</th>
                            <td>
                                <select [ngModel]="l.assigned_to" (change)="assign($event)">
                                    <option [ngValue]="null">— Unassigned —</option>
                                    @for (u of staff; track u.id) {
                                        <option [ngValue]="u.id">{{ u.full_name }}</option>
                                    }
                                </select>
                            </td>
                        </tr>
                        <tr><th>Follow-up at</th>
                            <td>
                                <input type="datetime-local" [ngModel]="toLocalInput(l.follow_up_at)"
                                       (change)="setFollowup($event)" />
                                @if (l.follow_up_at && isOverdue(l.follow_up_at)) {
                                    <span class="overdue">⚠ overdue</span>
                                }
                            </td>
                        </tr>
                    </table>
                </div>

                <div class="card">
                    <h3>Status workflow</h3>
                    <p class="muted small">Move the lead through the pipeline. Each change is logged in the notes.</p>
                    <div class="status-buttons">
                        @for (s of statuses; track s.value) {
                            <button class="status-btn"
                                    [class.active]="l.status === s.value"
                                    [disabled]="l.status === s.value || l.status === 'converted'"
                                    (click)="setStatus(s.value)">
                                {{ s.label }}
                            </button>
                        }
                    </div>

                    @if (statusNote) {
                        <div class="status-note">
                            <label>Add a note about this status change (optional):</label>
                            <textarea [(ngModel)]="statusNoteText" rows="2" placeholder="e.g. Sent WhatsApp, awaiting reply"></textarea>
                            <div class="row-end">
                                <button class="btn btn-sm btn-outline" (click)="cancelStatus()">Cancel</button>
                                <button class="btn btn-sm btn-primary" (click)="confirmStatus()">Save</button>
                            </div>
                        </div>
                    }
                </div>

                @if (l.source_meta) {
                    <div class="card">
                        <h3>Source payload</h3>
                        <p class="muted small">Raw data captured from {{ sourceLabel(l.source) }} — useful for auditing & reprocessing.</p>
                        <pre class="meta">{{ formatMeta(l.source_meta) }}</pre>
                    </div>
                }

                <div class="card" style="grid-column: 1 / -1">
                    <app-followup-timeline [leadId]="l.id" />
                </div>
            </div>
        </div>
    }
    `,
    styles: [`
        .empty { text-align:center; color:#6b7280; padding:40px; }
        .empty .spinner { margin-right: 8px; }
        .page-head { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:16px; }
        .page-head h1 { margin:6px 0 4px; }
        .back-link { color:#0f766e; text-decoration:none; font-size:13px; }
        .back-link:hover { text-decoration:underline; }
        .page-head .muted { margin:0; color:#6b7280; }
        .actions { display:flex; gap:8px; }
        .grid { display:grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap:14px; }
        .card {
            background:#fff; border-radius:8px;
            box-shadow:0 1px 2px rgba(0,0,0,.04);
            padding:18px 20px;
        }
        .card h3 { margin:0 0 12px; font-size:15px; }
        .kv { width:100%; border-collapse:collapse; }
        .kv th, .kv td { padding:6px 0; text-align:left; vertical-align:top; font-size:13px; }
        .kv th { color:#6b7280; width:120px; font-weight:500; }
        .kv input, .kv select {
            padding:5px 8px; border:1px solid #d1d5db; border-radius:5px;
            font:inherit; background:#fff;
        }
        .overdue { color:#dc2626; font-size:11px; margin-left:6px; }
        .status-buttons { display:flex; flex-wrap:wrap; gap:6px; margin:8px 0; }
        .status-btn {
            padding:6px 12px; border:1px solid #d1d5db; border-radius:6px;
            background:#fff; cursor:pointer; font:inherit; font-size:12px;
        }
        .status-btn:hover:not(:disabled) { background:#f3f4f6; }
        .status-btn.active { background:#0f766e; color:#fff; border-color:#0f766e; }
        .status-btn:disabled { opacity:.4; cursor:not-allowed; }
        .status-note { margin-top:10px; }
        .status-note textarea {
            width:100%; padding:8px; border:1px solid #d1d5db; border-radius:6px;
            font:inherit; margin-top:4px;
        }
        .row-end { display:flex; gap:6px; justify-content:flex-end; margin-top:6px; }
        .meta {
            background:#f9fafb; padding:10px 12px; border-radius:6px;
            font-size:12px; max-height:280px; overflow:auto; white-space:pre-wrap;
        }
        .btn { padding:8px 14px; border:none; border-radius:6px; cursor:pointer; font:inherit; }
        .btn-primary { background:#0f766e; color:#fff; }
        .btn-primary:hover { background:#115e59; }
        .btn-outline { background:#fff; color:#374151; border:1px solid #d1d5db; text-decoration:none; }
        .btn-sm { padding:5px 10px; font-size:12px; }
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
        .rating-tag   { display:inline-block; font-size:11px; padding:2px 8px; border-radius:10px; font-weight:600; }
        .rating-hot   { background: #fef2f2; color: #dc2626; border: 1px solid #fca5a5; }
        .rating-warm  { background: #fffbeb; color: #d97706; border: 1px solid #fde68a; }
        .rating-cold  { background: #f0f9ff; color: #0284c7; border: 1px solid #bae6fd; }
        .small { font-size:12px; }
    `]
})
export class LeadDetailComponent implements OnInit {
    private api    = inject(ApiService);
    private route  = inject(ActivatedRoute);
    private router = inject(Router);
    private toast  = inject(ToastService);

    lead    = signal<Lead | null>(null);
    loading = signal(true);
    staff: User[] = [];
    statuses: { value: LeadStatus; label: string }[] = [
        { value: 'new',       label: 'New' },
        { value: 'contacted', label: 'Contacted' },
        { value: 'qualified', label: 'Qualified' },
        { value: 'converted', label: 'Converted' },
        { value: 'lost',      label: 'Lost' },
        { value: 'junk',      label: 'Junk' }
    ];
    statusNote = false;
    statusNoteText = '';
    pendingStatus: LeadStatus | null = null;

    ngOnInit() {
        const id = this.route.snapshot.paramMap.get('id');
        if (id) this.load(id);
        this.loadStaff();
    }

    loadStaff() {
        this.api.listUsers({ limit: 100, is_active: '1' }).subscribe({
            next: r => this.staff = r.items || [],
            error: () => {}
        });
    }

    load(id: string) {
        this.loading.set(true);
        this.api.getLead(id).subscribe({
            next: l => { this.lead.set(l); this.loading.set(false); },
            error: () => {
                this.loading.set(false);
                this.toast.error('Failed to load lead details.');
            }
        });
    }

    assign(ev: Event) {
        const v = (ev.target as HTMLSelectElement).value;
        const id = this.lead()!.id;
        this.api.assignLead(id, v ? +v : null).subscribe({
            next: () => {
                this.toast.success('Lead assigned successfully.');
                this.load(String(id));
            },
            error: () => this.toast.error('Assignment failed.')
        });
    }

    setFollowup(ev: Event) {
        const v = (ev.target as HTMLInputElement).value;
        if (!v) return;
        const iso = new Date(v).toISOString().slice(0, 19).replace('T', ' ');
        const id = this.lead()!.id;
        this.api.updateLead(id, { follow_up_at: iso }).subscribe({
            next: () => {
                this.toast.success('Follow-up date updated.');
                this.load(String(id));
            },
            error: () => this.toast.error('Update failed.')
        });
    }

    setStatus(s: LeadStatus) {
        this.pendingStatus = s;
        this.statusNote = true;
        this.statusNoteText = '';
    }
    cancelStatus() {
        this.statusNote = false;
        this.pendingStatus = null;
        this.statusNoteText = '';
    }
    confirmStatus() {
        const s = this.pendingStatus;
        if (!s) return;
        const id = this.lead()!.id;
        this.api.setLeadStatus(id, s, this.statusNoteText || undefined).subscribe({
            next: () => {
                this.toast.success(`Status updated to "${s}".`);
                this.cancelStatus();
                this.load(String(id));
            },
            error: () => this.toast.error('Status update failed.')
        });
    }

    convert() {
        const id = this.lead()!.id;
        if (!confirm('Create a new draft quotation from this lead? You will be redirected to the quotation builder.')) return;
        this.api.convertLead(id).subscribe({
            next: r => {
                this.toast.success(`Converted to ${r.quotation_number}`);
                this.router.navigate(['/quotations', r.quotation_id, 'edit']);
            },
            error: e => this.toast.error(e.error?.error || e.message || 'Convert failed')
        });
    }

    isOverdue(date: string): boolean { return new Date(date) < new Date(); }

    toLocalInput(iso: string | null | undefined): string {
        if (!iso) return '';
        const d = new Date(iso);
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }

    formatDate(s: string): string {
        if (!s) return '';
        return new Date(s).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    }

    formatMeta(m: any): string {
        if (typeof m === 'string') {
            try { return JSON.stringify(JSON.parse(m), null, 2); } catch { return m; }
        }
        return JSON.stringify(m, null, 2);
    }

    sourceLabel(s: string): string {
        const map: Record<string, string> = {
            manual: 'Manual', website_form: 'Website form', demo_request: 'Demo request',
            google_sheet: 'Google Sheet', csv_upload: 'CSV upload', meta_ads: 'Meta Ads',
            walk_in: 'Walk-in', referral: 'Referral', whatsapp: 'WhatsApp', phone: 'Phone',
            other: 'Other'
        };
        return map[s] || s;
    }
}
