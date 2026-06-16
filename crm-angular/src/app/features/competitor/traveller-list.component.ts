import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { TravellerService } from '../../core/services/competitor-features.service';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
    selector: 'app-traveller-list',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink, DatePipe, DecimalPipe],
    template: `
    <div class="page-header">
        <div>
            <h1>👥 Traveller Profiles</h1>
            <p>360° view of all past customers — booking history, documents, spend</p>
        </div>
        <button class="btn btn-primary" (click)="showForm.set(!showForm())">{{ showForm() ? '✕ Cancel' : '+ New Traveller' }}</button>
    </div>

    <!-- New / Edit Form -->
    @if (showForm()) {
        <div class="card form-card">
            <h3 style="margin:0 0 14px">{{ editingId() ? 'Edit Traveller' : 'New Traveller' }}</h3>
            <div class="form-section-label">👤 Personal Info</div>
            <div class="form-grid">
                <label>First Name <span class="req">*</span><input type="text" [(ngModel)]="form.first_name" placeholder="First name" /></label>
                <label>Last Name<input type="text" [(ngModel)]="form.last_name" placeholder="Last name" /></label>
                <label>Email<input type="email" [(ngModel)]="form.email" placeholder="email@example.com" /></label>
                <label>Phone<input type="text" [(ngModel)]="form.phone" placeholder="+91 98xxx xxxxx" /></label>
                <label>Date of Birth<input type="date" [(ngModel)]="form.date_of_birth" /></label>
                <label>Anniversary<input type="date" [(ngModel)]="form.anniversary_date" /></label>
                <label>Gender
                    <select [(ngModel)]="form.gender">
                        <option value="">—</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                    </select>
                </label>
                <label>Nationality<input type="text" [(ngModel)]="form.nationality" placeholder="e.g. Indian" /></label>
            </div>
            <div class="form-section-label" style="margin-top:14px">🛂 Passport & Travel Documents</div>
            <div class="form-grid">
                <label>Passport Number<input type="text" [(ngModel)]="form.passport_number" /></label>
                <label>Passport Expiry<input type="date" [(ngModel)]="form.passport_expiry" /></label>
            </div>
            <div class="form-section-label" style="margin-top:14px">🆘 Emergency Contact</div>
            <div class="form-grid">
                <label>Emergency Contact Name<input type="text" [(ngModel)]="form.emergency_contact_name" /></label>
                <label>Emergency Contact Phone<input type="text" [(ngModel)]="form.emergency_contact_phone" /></label>
            </div>
            <label style="display:flex;flex-direction:column;gap:4px;font-size:13px;margin-top:12px">
                Medical Notes / Dietary Requirements
                <textarea [(ngModel)]="form.medical_notes" rows="2" placeholder="Allergies, medications, dietary preferences…"></textarea>
            </label>
            <div class="form-actions">
                <button class="btn btn-outline" (click)="showForm.set(false); editingId.set(null)">Cancel</button>
                <button class="btn btn-primary" (click)="save()" [disabled]="saving()">{{ saving() ? 'Saving…' : (editingId() ? 'Update' : 'Create') }}</button>
            </div>
        </div>
    }

    <!-- Search -->
    <div style="margin-bottom:14px">
        <input type="text" [(ngModel)]="search" (ngModelChange)="filterList()" class="search-input" placeholder="Search by name, email, phone, passport…" />
    </div>

    <!-- Traveller cards grid -->
    @if (filtered().length === 0) {
        <div class="empty-state" style="padding:40px 16px">
            <div style="font-size:3rem">👥</div>
            <p style="margin-top:8px; color:#6b7280">No travellers found{{ search ? ' matching "' + search + '"' : '' }}.</p>
        </div>
    } @else {
        <div class="traveller-grid">
            @for (t of filtered(); track t.id) {
                <div class="traveller-card" [class.selected-card]="selectedId() === t.id">
                    <div class="tcard-header" (click)="selectTraveller(t.id)">
                        <div class="tcard-avatar">{{ avatarInitials(t) }}</div>
                        <div class="tcard-info">
                            <div class="tcard-name">{{ t.first_name }} {{ t.last_name }}</div>
                            <div class="tcard-contact">{{ t.phone || t.email || '—' }}</div>
                            @if (t.nationality) { <div class="tcard-tag">🌍 {{ t.nationality }}</div> }
                        </div>
                        <div class="tcard-meta">
                            @if (t.passport_number) {
                                <div class="tcard-passport">🛂 {{ t.passport_number }}</div>
                            }
                            @if (t.date_of_birth) {
                                <div class="tcard-dob">🎂 {{ getBirthdayLabel(t.date_of_birth) }}</div>
                            }
                        </div>
                    </div>
                    <div class="tcard-footer">
                        <div class="tcard-actions">
                            <button class="btn btn-sm btn-outline" (click)="edit(t)">Edit</button>
                            <button class="btn btn-sm" style="background:#4f46e5;color:#fff" (click)="selectTraveller(t.id)">
                                {{ selectedId() === t.id ? '▲ Hide' : '▼ History' }}
                            </button>
                            <button class="btn btn-sm" style="background:#fee2e2;color:#991b1b;border:none" (click)="remove(t.id)">Delete</button>
                        </div>
                    </div>

                    <!-- 360° Profile Panel -->
                    @if (selectedId() === t.id) {
                        <div class="profile-panel">
                            @if (profileLoading()) {
                                <div class="profile-loading"><span class="spinner"></span> Loading history…</div>
                            } @else {
                                <!-- Stats row -->
                                <div class="profile-stats">
                                    <div class="pstat">
                                        <div class="pstat-num">{{ travelerBookings().length }}</div>
                                        <div class="pstat-label">Bookings</div>
                                    </div>
                                    <div class="pstat">
                                        <div class="pstat-num">₹{{ totalSpend() | number:'1.0-0' }}</div>
                                        <div class="pstat-label">Total Spend</div>
                                    </div>
                                    <div class="pstat">
                                        <div class="pstat-num">{{ travelerBookings().length }}</div>
                                        <div class="pstat-label">Trips Taken</div>
                                    </div>
                                    @if (t.anniversary_date) {
                                        <div class="pstat">
                                            <div class="pstat-num">💑</div>
                                            <div class="pstat-label">Anniversary {{ t.anniversary_date | date:'d MMM' }}</div>
                                        </div>
                                    }
                                </div>

                                <!-- Booking history -->
                                @if (travelerBookings().length > 0) {
                                    <div class="profile-section-label">📦 Booking History</div>
                                    <div class="profile-bookings">
                                        @for (bk of travelerBookings(); track bk.id) {
                                            <a [routerLink]="['/bookings', bk.id]" class="profile-booking-row">
                                                <div>
                                                    <strong>{{ bk.booking_number }}</strong>
                                                    <div class="text-muted" style="font-size:11px">{{ bk.destination_text || bk.package_title }}</div>
                                                </div>
                                                <div style="text-align:center">
                                                    <div>{{ bk.trip_start_date | date:'d MMM yyyy' }}</div>
                                                    <div class="text-muted" style="font-size:11px">{{ bk.adults || 1 }} pax</div>
                                                </div>
                                                <div style="text-align:right">
                                                    <span class="badge" [class]="'badge-' + bk.status">{{ bk.status }}</span>
                                                    <div style="font-weight:700;color:#4f46e5;margin-top:2px;font-size:13px">₹{{ bk.total_amount | number:'1.0-0' }}</div>
                                                </div>
                                            </a>
                                        }
                                    </div>
                                } @else {
                                    <p class="text-muted" style="font-size:13px;text-align:center;padding:12px">No bookings found for this traveller.</p>
                                }

                                <!-- Emergency & Medical -->
                                @if (t.emergency_contact_name || t.medical_notes) {
                                    <div class="profile-section-label" style="margin-top:12px">🆘 Emergency & Medical</div>
                                    <div class="profile-meta-grid">
                                        @if (t.emergency_contact_name) {
                                            <div><span class="meta-label">Emergency:</span> {{ t.emergency_contact_name }} {{ t.emergency_contact_phone ? '(' + t.emergency_contact_phone + ')' : '' }}</div>
                                        }
                                        @if (t.medical_notes) {
                                            <div><span class="meta-label">Medical:</span> {{ t.medical_notes }}</div>
                                        }
                                    </div>
                                }
                            }
                        </div>
                    }
                </div>
            }
        </div>
    }
    `,
    styles: [`
        .page-header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:14px; }
        .page-header h1 { margin:0 0 4px; }
        .page-header p { margin:0; color:#6b7280; font-size:13px; }
        .form-card { margin-bottom:18px; max-width:720px; }
        .form-section-label { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.06em; color:#4b5563; margin-bottom:8px; padding-bottom:4px; border-bottom:1px solid #f3f4f6; }
        .form-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px 14px; }
        .form-grid label { display:flex; flex-direction:column; gap:3px; font-size:12px; font-weight:500; color:#374151; }
        .form-grid input, .form-grid select, textarea { padding:7px 10px; border:1px solid #d1d5db; border-radius:6px; font:inherit; background:#fff; }
        .form-grid input:focus, .form-grid select:focus, textarea:focus { outline:none; border-color:#0f766e; }
        .form-actions { display:flex; gap:8px; justify-content:flex-end; margin-top:14px; }
        .req { color:#ef4444; }
        .search-input { padding:9px 12px; border:1px solid #d1d5db; border-radius:8px; font:inherit; width:100%; max-width:400px; box-sizing:border-box; }
        .search-input:focus { outline:none; border-color:#0f766e; }

        .traveller-grid { display:flex; flex-direction:column; gap:10px; }
        .traveller-card { background:#fff; border-radius:10px; border:1px solid #e5e7eb; overflow:hidden; transition:box-shadow .15s; }
        .traveller-card:hover { box-shadow:0 2px 10px rgba(0,0,0,.08); }
        .selected-card { border-color:#4f46e5; box-shadow:0 0 0 2px rgba(79,70,229,.15); }
        .tcard-header { display:flex; align-items:center; gap:12px; padding:14px 16px; cursor:pointer; }
        .tcard-avatar { width:44px; height:44px; border-radius:50%; background:linear-gradient(135deg, #4f46e5, #7c3aed); color:#fff; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:15px; flex-shrink:0; }
        .tcard-info { flex:1; }
        .tcard-name { font-size:15px; font-weight:700; color:#111827; }
        .tcard-contact { font-size:12px; color:#6b7280; margin-top:1px; }
        .tcard-tag { display:inline-block; background:#f3f4f6; color:#374151; font-size:10px; padding:1px 6px; border-radius:8px; margin-top:3px; }
        .tcard-meta { text-align:right; }
        .tcard-passport { font-size:11px; color:#374151; font-family:monospace; }
        .tcard-dob { font-size:11px; color:#6b7280; margin-top:2px; }
        .tcard-footer { padding:8px 16px; border-top:1px solid #f9fafb; background:#fafafa; }
        .tcard-actions { display:flex; gap:6px; }

        /* 360° Profile */
        .profile-panel { border-top:1px solid #e0e7ff; padding:14px 16px; background:#f8f9ff; }
        .profile-loading { color:#6b7280; text-align:center; padding:16px; }
        .profile-stats { display:grid; grid-template-columns:repeat(auto-fit, minmax(100px, 1fr)); gap:10px; margin-bottom:14px; }
        .pstat { background:#fff; border-radius:8px; padding:10px 12px; text-align:center; border:1px solid #e5e7eb; }
        .pstat-num { font-size:18px; font-weight:800; color:#4f46e5; }
        .pstat-label { font-size:10px; color:#6b7280; text-transform:uppercase; letter-spacing:.04em; margin-top:2px; }
        .profile-section-label { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.06em; color:#4b5563; margin-bottom:8px; }
        .profile-bookings { display:flex; flex-direction:column; gap:6px; }
        .profile-booking-row {
            display:flex; justify-content:space-between; align-items:center; gap:12px;
            background:#fff; border-radius:8px; padding:10px 12px; border:1px solid #e5e7eb;
            text-decoration:none; color:inherit; transition:background .1s;
        }
        .profile-booking-row:hover { background:#f0f9ff; }
        .profile-meta-grid { font-size:12px; color:#374151; display:flex; flex-direction:column; gap:4px; background:#fff; border-radius:6px; padding:10px 12px; border:1px solid #e5e7eb; }
        .meta-label { font-weight:600; }
        .text-muted { color:#6b7280; }

        .btn { padding:8px 14px; border:none; border-radius:6px; cursor:pointer; font:inherit; }
        .btn-primary { background:#0f766e; color:#fff; }
        .btn-primary:disabled { opacity:.5; cursor:not-allowed; }
        .btn-outline { background:#fff; color:#374151; border:1px solid #d1d5db; }
        .btn-sm { padding:5px 10px; font-size:12px; }

        @media (max-width:640px) { .form-grid { grid-template-columns:1fr; } .tcard-meta { display:none; } }
    `]
})
export class TravellerListComponent implements OnInit {
    private svc = inject(TravellerService);
    private api = inject(ApiService);
    private toast = inject(ToastService);

    travellers = signal<any[]>([]);
    filtered   = signal<any[]>([]);
    showForm   = signal(false);
    saving     = signal(false);
    editingId  = signal<number | null>(null);
    selectedId = signal<number | null>(null);
    profileLoading = signal(false);
    travelerBookings = signal<any[]>([]);
    totalSpend = signal(0);
    search = '';

    form: any = {
        first_name: '', last_name: '', email: '', phone: '',
        date_of_birth: '', anniversary_date: '', gender: '',
        passport_number: '', passport_expiry: '', nationality: '',
        emergency_contact_name: '', emergency_contact_phone: '',
        medical_notes: ''
    };

    ngOnInit() { this.load(); }

    load() {
        this.svc.list().subscribe(r => {
            this.travellers.set(r);
            this.filterList();
        });
    }

    filterList() {
        const q = this.search.toLowerCase();
        if (!q) { this.filtered.set(this.travellers()); return; }
        this.filtered.set(this.travellers().filter(t =>
            (t.first_name + ' ' + t.last_name).toLowerCase().includes(q) ||
            (t.email || '').toLowerCase().includes(q) ||
            (t.phone || '').includes(q) ||
            (t.passport_number || '').toLowerCase().includes(q)
        ));
    }

    avatarInitials(t: any): string {
        return ((t.first_name?.[0] || '') + (t.last_name?.[0] || '')).toUpperCase() || '?';
    }

    getBirthdayLabel(dob: string): string {
        if (!dob) return '';
        const d = new Date(dob);
        const today = new Date();
        const age = today.getFullYear() - d.getFullYear();
        return `${d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} (${age}y)`;
    }

    selectTraveller(id: number) {
        if (this.selectedId() === id) { this.selectedId.set(null); return; }
        this.selectedId.set(id);
        this.loadProfile(id);
    }

    loadProfile(travellerId: number) {
        const t = this.travellers().find(x => x.id === travellerId);
        if (!t) return;
        this.profileLoading.set(true);
        this.travelerBookings.set([]);
        this.totalSpend.set(0);
        // Search bookings by customer name + phone
        const q = t.first_name + ' ' + t.last_name;
        this.api.listBookings({ q, limit: 50 }).subscribe({
            next: r => {
                this.travelerBookings.set(r.items);
                this.totalSpend.set(r.items.reduce((sum: number, b: any) => sum + (b.total_amount || 0), 0));
                this.profileLoading.set(false);
            },
            error: () => { this.profileLoading.set(false); }
        });
    }

    edit(t: any) {
        this.editingId.set(t.id);
        this.form = { ...t };
        // normalize dates
        if (this.form.date_of_birth) this.form.date_of_birth = this.form.date_of_birth.substring(0, 10);
        if (this.form.passport_expiry) this.form.passport_expiry = this.form.passport_expiry.substring(0, 10);
        if (this.form.anniversary_date) this.form.anniversary_date = this.form.anniversary_date.substring(0, 10);
        this.showForm.set(true);
    }

    save() {
        if (!this.form.first_name?.trim()) { this.toast.error('First name is required.'); return; }
        this.saving.set(true);
        const op = this.editingId() ? this.svc.update(this.editingId()!, this.form) : this.svc.create(this.form);
        op.subscribe({
            next: () => {
                this.saving.set(false); this.showForm.set(false); this.editingId.set(null);
                this.resetForm(); this.load(); this.toast.success('Traveller saved');
            },
            error: () => { this.saving.set(false); this.toast.error('Failed to save traveller'); }
        });
    }

    remove(id: number) {
        if (!confirm('Delete this traveller profile?')) return;
        this.svc.delete(id).subscribe(() => { this.load(); this.toast.success('Deleted'); });
    }

    private resetForm() {
        this.form = {
            first_name: '', last_name: '', email: '', phone: '',
            date_of_birth: '', anniversary_date: '', gender: '',
            passport_number: '', passport_expiry: '', nationality: '',
            emergency_contact_name: '', emergency_contact_phone: '', medical_notes: ''
        };
    }
}
