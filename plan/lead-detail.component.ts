import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';

@Component({
    selector: 'app-lead-detail',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterLink],
    template: `
    <a routerLink="/leads" class="btn-ghost" style="margin-bottom:16px;display:inline-flex;align-items:center;gap:6px;">← Back to Leads</a>

    @if (lead()) {
    <div class="page-header">
        <div>
            <h1>{{ lead().full_name }}</h1>
            <p class="text-muted">{{ lead().phone }} · {{ lead().email || 'No email' }}</p>
        </div>
        <div class="flex gap-2">
            <a routerLink="/quotations/new" [queryParams]="{lead_id: lead().id}" class="btn-primary">+ Create Quotation</a>
        </div>
    </div>

    <div style="display:grid;grid-template-columns:2fr 1fr;gap:20px;align-items:start;">

        <!-- Left: info + follow-ups -->
        <div>
            <!-- Lead Info -->
            <div class="card mb-4">
                <div class="card-header">
                    <h2>Lead Details</h2>
                    <span class="badge badge-{{ lead().status }}">{{ lead().status }}</span>
                </div>
                <div class="card-body">
                    <div class="form-grid-2">
                        <div><label class="text-muted text-sm">Source</label><p>{{ lead().source.replace('_',' ') }}</p></div>
                        <div><label class="text-muted text-sm">Destination</label><p>{{ lead().destination_name || lead().destination_text || '—' }}</p></div>
                        <div><label class="text-muted text-sm">Travel Date</label><p>{{ fmtDate(lead().travel_date_approx) }}</p></div>
                        <div><label class="text-muted text-sm">Budget</label><p>{{ lead().budget_approx ? '₹' + formatCurrency(lead().budget_approx) : '—' }}</p></div>
                        <div><label class="text-muted text-sm">Adults / Children</label><p>{{ lead().pax_adults || '—' }} / {{ lead().pax_children || 0 }}</p></div>
                        <div><label class="text-muted text-sm">Assigned To</label><p>{{ lead().assigned_to_name || '—' }}</p></div>
                        <div><label class="text-muted text-sm">Next Follow-up</label>
                            <p [style.color]="isOverdue(lead().follow_up_at) ? 'var(--danger)' : 'inherit'">
                                {{ fmtDate(lead().follow_up_at) }}
                            </p>
                        </div>
                        <div><label class="text-muted text-sm">Created</label><p>{{ fmtDate(lead().created_at) }}</p></div>
                    </div>
                    @if (lead().notes) {
                        <div style="margin-top:14px;padding-top:14px;border-top:1px solid var(--border);">
                            <label class="text-muted text-sm">Notes</label>
                            <p style="margin-top:4px;">{{ lead().notes }}</p>
                        </div>
                    }
                </div>
            </div>

            <!-- Follow-up Timeline -->
            <div class="card">
                <div class="card-header">
                    <h2>Follow-up Timeline</h2>
                    <span class="text-muted text-sm">{{ lead().follow_ups?.length || 0 }} interactions</span>
                </div>
                <div class="card-body">
                    @if (!lead().follow_ups?.length) {
                        <div class="empty-state" style="padding:24px;"><p>No follow-ups logged yet.</p></div>
                    }
                    <div class="timeline">
                        @for (fu of lead().follow_ups; track fu.id) {
                            <div class="timeline-item">
                                <div class="timeline-dot"></div>
                                <div class="timeline-body">
                                    <div class="outcome">{{ fu.call_outcome || 'Follow-up logged' }}
                                        @if (fu.status_set_to) { <span class="badge badge-{{ fu.status_set_to }}" style="margin-left:8px;">→ {{ fu.status_set_to }}</span> }
                                    </div>
                                    <div class="meta">{{ fu.staff_name }} · {{ fmtDateTime(fu.created_at) }}</div>
                                    @if (fu.notes) { <div class="notes">{{ fu.notes }}</div> }
                                    @if (fu.next_follow_up) {
                                        <div class="meta" style="margin-top:4px;">📅 Next: {{ fmtDate(fu.next_follow_up) }}</div>
                                    }
                                </div>
                            </div>
                        }
                    </div>
                </div>
            </div>
        </div>

        <!-- Right: actions -->
        <div>
            <!-- Log Follow-up -->
            <div class="card mb-4">
                <div class="card-header"><h2>Log Follow-up</h2></div>
                <div class="card-body">
                    <form [formGroup]="followUpForm" (ngSubmit)="submitFollowUp()">
                        <div class="form-group">
                            <label>Call Outcome</label>
                            <select formControlName="call_outcome">
                                <option value="">Select...</option>
                                <option>Answered — Interested</option>
                                <option>Answered — Not Interested</option>
                                <option>Not Reachable</option>
                                <option>Call Back Requested</option>
                                <option>WhatsApp Sent</option>
                                <option>Email Sent</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Set Status</label>
                            <select formControlName="status_set_to">
                                <option value="">Keep current</option>
                                <option value="hot">Hot</option>
                                <option value="warm">Warm</option>
                                <option value="cold">Cold</option>
                                <option value="follow_later">Follow Later</option>
                                <option value="junked">Junk</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Next Follow-up Date</label>
                            <input type="datetime-local" formControlName="next_follow_up">
                        </div>
                        <div class="form-group">
                            <label>Notes</label>
                            <textarea formControlName="notes" rows="3" placeholder="What was discussed..."></textarea>
                        </div>
                        <button class="btn-primary" type="submit" style="width:100%;justify-content:center;" [disabled]="fuSaving()">
                            {{ fuSaving() ? 'Saving…' : 'Log Follow-up' }}
                        </button>
                    </form>
                </div>
            </div>

            <!-- Quick Status -->
            <div class="card">
                <div class="card-header"><h2>Quick Actions</h2></div>
                <div class="card-body" style="display:flex;flex-direction:column;gap:8px;">
                    <a routerLink="/quotations/new" [queryParams]="{lead_id:lead().id}" class="btn-primary" style="justify-content:center;">📄 New Quotation</a>
                    <a routerLink="/quotations" [queryParams]="{lead_id:lead().id}" class="btn-outline" style="justify-content:center;">View All Quotations</a>
                </div>
            </div>
        </div>
    </div>
    }
    `
})
export class LeadDetailComponent implements OnInit {
    private api = inject(ApiService);
    private route = inject(ActivatedRoute);
    private fb = inject(FormBuilder);

    lead = signal<any>(null);
    fuSaving = signal(false);

    followUpForm = this.fb.group({
        call_outcome: [''],
        status_set_to: [''],
        next_follow_up: [''],
        notes: ['']
    });

    ngOnInit() {
        const id = this.route.snapshot.paramMap.get('id')!;
        this.api.getLead(id).subscribe(l => this.lead.set(l));
    }

    submitFollowUp() {
        this.fuSaving.set(true);
        const id = this.lead().id;
        this.api.logFollowUp(id, this.followUpForm.value).subscribe({
            next: () => {
                this.fuSaving.set(false);
                this.followUpForm.reset();
                this.api.getLead(id).subscribe(l => this.lead.set(l));
            },
            error: () => this.fuSaving.set(false)
        });
    }

    fmtDate(d: string) { return d ? new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '—'; }
    fmtDateTime(d: string) { return d ? new Date(d).toLocaleString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }) : '—'; }
    isOverdue(d: string) { return d && new Date(d) < new Date(); }
    formatCurrency(n: any) { return parseFloat(n||0).toLocaleString('en-IN', { minimumFractionDigits: 0 }); }
}
