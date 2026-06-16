import { Component, inject, signal, OnInit } from '@angular/core';
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
        <!-- Section: Contact Info -->
        <div class="section-label">👤 Contact Information</div>
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
        </div>

        <!-- Section: Trip Interest -->
        <div class="section-label" style="margin-top:18px">✈️ Trip Interest</div>
        <div class="grid">
            <!-- Package selector — auto-fills destination + budget -->
            <label class="span-2">
                <span>Enquiry For Package <small class="muted-label">(optional — auto-fills destination &amp; budget)</small></span>
                <select [(ngModel)]="selectedPackageId" name="package_id" (ngModelChange)="onPackageSelect($event)">
                    <option value="">— Select a package —</option>
                    @for (p of packages(); track p.id) {
                        <option [value]="p.id">{{ p.title }} ({{ p.duration_days }}D/{{ p.duration_nights }}N) — ₹{{ p.price | number }}</option>
                    }
                </select>
            </label>
            @if (selectedPackage()) {
                <div class="pkg-preview span-2">
                    <span class="pkg-preview-badge">📦 {{ selectedPackage()!.category || 'Package' }}</span>
                    <span>{{ selectedPackage()!.title }}</span>
                    <span class="pkg-preview-price">₹{{ selectedPackage()!.price | number }}</span>
                    <span class="muted-label">{{ selectedPackage()!.duration_days }} Days / {{ selectedPackage()!.duration_nights }} Nights</span>
                    <button type="button" class="pkg-clear" (click)="clearPackage()">✕ Clear</button>
                </div>
            }
            <label class="span-2">
                <span>Destination / trip interest</span>
                <input [(ngModel)]="form.destination_text" name="destination_text"
                       placeholder="e.g. Gangtok + Pelling 5 days">
            </label>
            <label>
                <span>Approx. Budget (₹)</span>
                <input type="number" [(ngModel)]="form.budget" name="budget" placeholder="e.g. 25000">
            </label>
            <label>
                <span>Travel Month</span>
                <input [(ngModel)]="form.travel_month" name="travel_month" placeholder="e.g. October 2025">
            </label>
            <label>
                <span>No. of Travellers</span>
                <input type="number" [(ngModel)]="form.pax" name="pax" min="1" placeholder="2">
            </label>
            <label>
                <span>Tour Type</span>
                <select [(ngModel)]="form.tour_type" name="tour_type">
                    <option value="">— Select —</option>
                    <option value="Individual / Family">Individual / Family</option>
                    <option value="Group Tour">Group Tour</option>
                    <option value="Corporate / MICE">Corporate / MICE</option>
                    <option value="Honeymoon">Honeymoon</option>
                    <option value="Adventure / Trekking">Adventure / Trekking</option>
                </select>
            </label>
        </div>

        <!-- Section: Follow-up & Notes -->
        <div class="section-label" style="margin-top:18px">📝 Follow-up & Notes</div>
        <div class="grid">
            <label>
                <span>Follow-up date</span>
                <input type="datetime-local" [(ngModel)]="form.follow_up_at" name="follow_up_at">
            </label>
            <label>
                <span>Lead Rating</span>
                <select [(ngModel)]="form.rating" name="rating">
                    <option value="">— Not set —</option>
                    <option value="hot">🔥 Hot</option>
                    <option value="warm">🌤️ Warm</option>
                    <option value="cold">❄️ Cold</option>
                </select>
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
        .muted-label { color:#9ca3af; font-size:11px; font-weight:400; }
        .form { background:#fff; padding:20px 22px; border-radius:8px; box-shadow:0 1px 2px rgba(0,0,0,.04); max-width:780px; }
        .section-label { font-size:12px; font-weight:700; color:#374151; text-transform:uppercase; letter-spacing:.06em; margin-bottom:10px; padding-bottom:6px; border-bottom:1px solid #f3f4f6; }
        .grid { display:grid; grid-template-columns: 1fr 1fr; gap:12px 16px; }
        .grid .span-2 { grid-column: span 2; }
        label { display:flex; flex-direction:column; gap:4px; font-size:13px; }
        label > span { color:#374151; font-weight:500; }
        .req { color:#dc2626; }
        input, select, textarea { padding:8px 10px; border:1px solid #d1d5db; border-radius:6px; font:inherit; background:#fff; }
        input:focus, select:focus, textarea:focus { outline:none; border-color:#0f766e; box-shadow:0 0 0 3px rgba(15,118,110,.1); }
        textarea { resize:vertical; }
        .actions { display:flex; gap:8px; justify-content:flex-end; margin-top:16px; }
        .btn { padding:8px 14px; border:none; border-radius:6px; cursor:pointer; font:inherit; text-decoration:none; }
        .btn-primary { background:#0f766e; color:#fff; }
        .btn-primary:hover:not(:disabled) { background:#115e59; }
        .btn-primary:disabled { opacity:.5; cursor:not-allowed; }
        .btn-outline { background:#fff; color:#374151; border:1px solid #d1d5db; }
        .error { background:#fee2e2; color:#991b1b; padding:10px 12px; border-radius:6px; margin-top:12px; font-size:13px; }

        /* Package preview */
        .pkg-preview {
            display:flex; align-items:center; gap:10px; flex-wrap:wrap;
            background:#f0fdf4; border:1px solid #bbf7d0; border-radius:6px; padding:8px 12px;
            font-size:12px; color:#065f46;
        }
        .pkg-preview-badge { background:#d1fae5; color:#065f46; padding:2px 8px; border-radius:10px; font-size:11px; font-weight:700; }
        .pkg-preview-price { font-weight:700; font-size:14px; }
        .pkg-clear { border:none; background:none; color:#9ca3af; cursor:pointer; font-size:12px; margin-left:auto; }
        .pkg-clear:hover { color:#ef4444; }

        @media (max-width:640px) { .grid { grid-template-columns:1fr; } .grid .span-2 { grid-column:span 1; } }
    `]
})
export class LeadNewComponent implements OnInit {
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
        { value: 'demo_request', label: 'Demo request' },
        { value: 'google_sheet', label: 'Google Sheet' },
        { value: 'csv_upload',   label: 'CSV upload' },
        { value: 'meta_ads',     label: 'Meta Ads' },
        { value: 'other',        label: 'Other' }
    ];

    packages = signal<any[]>([]);
    selectedPackageId = '';
    selectedPackage = signal<any | null>(null);

    form: any = {
        source: 'manual',
        full_name: '', phone: '', email: null,
        destination_text: '', notes: '',
        follow_up_at: null, budget: null, travel_month: '', pax: null,
        tour_type: '', rating: '', package_id: null
    };
    submitting = signal(false);
    error     = signal<string | null>(null);

    ngOnInit() {
        this.api.listPackages({ is_active: true, limit: 100 }).subscribe({
            next: r => this.packages.set(r.items),
            error: () => {}
        });
    }

    onPackageSelect(id: string) {
        if (!id) { this.clearPackage(); return; }
        const pkg = this.packages().find(p => String(p.id) === String(id));
        if (pkg) {
            this.selectedPackage.set(pkg);
            this.form.package_id = pkg.id;
            if (!this.form.destination_text) this.form.destination_text = pkg.title;
            if (!this.form.budget) this.form.budget = pkg.price;
        }
    }

    clearPackage() {
        this.selectedPackageId = '';
        this.selectedPackage.set(null);
        this.form.package_id = null;
    }

    submit() {
        this.error.set(null);
        if (!this.form.full_name?.trim()) { this.error.set('Name is required.'); return; }
        if (!this.form.phone?.trim())     { this.error.set('Phone is required.'); return; }
        this.submitting.set(true);
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
