import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { Lead, LeadSource } from '../../core/models';

@Component({
    selector: 'app-lead-new',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink],
    template: `
    <a routerLink="/leads" class="back-link">← All leads</a>
    <h1>New Lead</h1>
    <p class="muted">Manual entry — use this for walk-ins, phone inquiries, or referrals.</p>

    <form (ngSubmit)="submit()" class="form">
        <div class="grid">
            <label>
                <span>Full name <span class="req">*</span></span>
                <input [(ngModel)]="form.full_name" name="full_name" required placeholder="Customer full name">
            </label>
            <label>
                <span>Phone <span class="req">*</span></span>
                <input [(ngModel)]="form.phone" name="phone" required placeholder="+91 98xxx xxxxx">
            </label>
            <label>
                <span>Email</span>
                <input type="email" [(ngModel)]="form.email" name="email" placeholder="email@example.com">
            </label>
            <label>
                <span>Source</span>
                <select [(ngModel)]="form.source" name="source">
                    <option *ngFor="let s of sources" [value]="s.value">{{ s.label }}</option>
                </select>
            </label>
            <label class="span-2">
                <span>Destination / trip interest</span>
                <input [(ngModel)]="form.destination_text" name="destination_text"
                       placeholder="e.g. Gangtok + Pelling 5 days">
            </label>
            <label>
                <span>Follow-up date</span>
                <input type="datetime-local" [(ngModel)]="form.follow_up_at" name="follow_up_at">
            </label>
            <label class="span-2">
                <span>Notes</span>
                <textarea [(ngModel)]="form.notes" name="notes" rows="3"
                          placeholder="Budget, travellers, travel month, any constraints…"></textarea>
            </label>
        </div>

        <div *ngIf="error()" class="error">{{ error() }}</div>

        <div class="actions">
            <a routerLink="/leads" class="btn btn-outline">Cancel</a>
            <button type="submit" class="btn btn-primary" [disabled]="submitting()">
                <span *ngIf="submitting()">Saving…</span>
                <span *ngIf="!submitting()">Create Lead</span>
            </button>
        </div>
    </form>
    `,
    styles: [`
        .back-link { color:#0f766e; text-decoration:none; font-size:13px; }
        h1 { margin:8px 0 4px; }
        .muted { color:#6b7280; margin:0 0 16px; }
        .form { background:#fff; padding:20px 22px; border-radius:8px;
                box-shadow:0 1px 2px rgba(0,0,0,.04); max-width:720px; }
        .grid { display:grid; grid-template-columns: 1fr 1fr; gap:12px 16px; }
        .grid .span-2 { grid-column: span 2; }
        label { display:flex; flex-direction:column; gap:4px; font-size:13px; }
        label > span { color:#374151; }
        .req { color:#dc2626; }
        input, select, textarea {
            padding:8px 10px; border:1px solid #d1d5db; border-radius:6px;
            font:inherit; background:#fff;
        }
        input:focus, select:focus, textarea:focus {
            outline:none; border-color:#0f766e; box-shadow:0 0 0 3px rgba(15,118,110,.1);
        }
        textarea { resize: vertical; }
        .actions { display:flex; gap:8px; justify-content:flex-end; margin-top:16px; }
        .btn { padding:8px 14px; border:none; border-radius:6px; cursor:pointer; font:inherit;
               text-decoration:none; }
        .btn-primary { background:#0f766e; color:#fff; }
        .btn-primary:hover:not(:disabled) { background:#115e59; }
        .btn-primary:disabled { opacity:.5; cursor:not-allowed; }
        .btn-outline { background:#fff; color:#374151; border:1px solid #d1d5db; }
        .error { background:#fee2e2; color:#991b1b; padding:10px 12px;
                 border-radius:6px; margin-top:12px; font-size:13px; }
    `]
})
export class LeadNewComponent {
    private api    = inject(ApiService);
    private router = inject(Router);
    private toast  = inject(ToastService);

    sources: { value: LeadSource; label: string }[] = [
        { value: 'manual',       label: 'Manual' },
        { value: 'walk_in',      label: 'Walk-in' },
        { value: 'phone',        label: 'Phone' },
        { value: 'whatsapp',     label: 'WhatsApp' },
        { value: 'referral',     label: 'Referral' },
        { value: 'website_form', label: 'Website form' },
        { value: 'google_sheet', label: 'Google Sheet' },
        { value: 'csv_upload',   label: 'CSV upload' },
        { value: 'meta_ads',     label: 'Meta Ads' },
        { value: 'other',        label: 'Other' }
    ];

    form: Partial<Lead> = {
        source: 'manual',
        full_name: '',
        phone: '',
        email: null,
        destination_text: '',
        notes: '',
        follow_up_at: null
    };
    submitting = signal(false);
    error     = signal<string | null>(null);

    submit() {
        this.error.set(null);
        if (!this.form.full_name?.trim()) { this.error.set('Name is required.'); return; }
        if (!this.form.phone?.trim())     { this.error.set('Phone is required.'); return; }
        this.submitting.set(true);
        // Normalize follow-up to MySQL datetime string
        const payload: any = { ...this.form };
        if (payload.follow_up_at) {
            payload.follow_up_at = new Date(payload.follow_up_at).toISOString().slice(0, 19).replace('T', ' ');
        }
        this.api.createLead(payload).subscribe({
            next: l => {
                this.toast.success(`Lead "${l.full_name}" created successfully.`);
                this.router.navigate(['/leads', l.id]);
            },
            error: e => {
                this.error.set(e.error?.error || e.message || 'Failed to create lead');
                this.submitting.set(false);
            }
        });
    }
}
