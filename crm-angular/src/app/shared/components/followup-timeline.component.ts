import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { Followup, FollowupType, Lead, StaffUser } from '../../core/models';

@Component({
    selector: 'app-followup-timeline',
    standalone: true,
    imports: [CommonModule, FormsModule, DatePipe],
    template: `
    <div class="followup-timeline-container">
        <!-- Header & Action -->
        <div class="section-header">
            <h3>👤 Customer Journey & Follow-ups</h3>
            <button class="btn btn-sm btn-primary" (click)="toggleForm()">
                {{ showForm() ? '✕ Close Form' : '＋ Log Follow-up' }}
            </button>
        </div>

        <!-- Log Follow-up Form -->
        @if (showForm()) {
            <div class="followup-form-panel">
                <h4>Log Interaction</h4>
                <div class="form-grid">
                    <!-- Notes -->
                    <div class="form-group full-width">
                        <label>Interaction Notes <span class="req">*</span></label>
                        <textarea [(ngModel)]="form.notes" rows="3" placeholder="What did you discuss with the customer?"></textarea>
                    </div>

                    <!-- Followup Type -->
                    <div class="form-group">
                        <label>Contact Method</label>
                        <select [(ngModel)]="form.followup_type">
                            <option value="call">📞 Call</option>
                            <option value="whatsapp">💬 WhatsApp</option>
                            <option value="email">✉️ Email</option>
                            <option value="meeting">🤝 Meeting</option>
                            <option value="site_visit">📍 Site Visit</option>
                            <option value="other">📝 Other</option>
                        </select>
                    </div>

                    <!-- Lead Specific inputs -->
                    @if (lead()) {
                        <!-- Lead Temperature -->
                        <div class="form-group">
                            <label>Lead Temperature (Rating)</label>
                            <select [(ngModel)]="form.rating">
                                <option [ngValue]="null">No Change</option>
                                <option value="hot">🔥 Hot Lead</option>
                                <option value="warm">☀️ Warm Lead</option>
                                <option value="cold">❄️ Cold Lead</option>
                            </select>
                        </div>

                        <!-- Lead Status -->
                        <div class="form-group">
                            <label>Update Lead Status</label>
                            <select [(ngModel)]="form.status">
                                <option [ngValue]="null">No Change</option>
                                <option value="new">New</option>
                                <option value="contacted">Contacted</option>
                                <option value="qualified">Qualified</option>
                                <option value="lost">Lost</option>
                                <option value="junk">🚨 Junk (Fake/False Lead)</option>
                            </select>
                        </div>
                    }

                    <!-- Next Reminder Section Toggle -->
                    <div class="form-group checkbox-group full-width">
                        <label class="checkbox-label">
                            <input type="checkbox" [(ngModel)]="form.setReminder" />
                            Schedule Next Follow-up Reminder?
                        </label>
                    </div>

                    @if (form.setReminder) {
                        <!-- Reminder Time -->
                        <div class="form-group">
                            <label>Next Reminder At <span class="req">*</span></label>
                            <input type="datetime-local" [(ngModel)]="form.next_remind_at" />
                        </div>

                        <!-- Assignee -->
                        <div class="form-group">
                            <label>Assign Reminder To</label>
                            <select [(ngModel)]="form.next_reminder_assignee">
                                <option [ngValue]="null">Self (default)</option>
                                @for (u of users(); track u.id) {
                                    <option [ngValue]="u.id">{{ u.full_name }}</option>
                                }
                            </select>
                        </div>
                    }
                </div>

                <div class="form-actions">
                    <button class="btn btn-outline btn-sm" (click)="toggleForm()">Cancel</button>
                    <button class="btn btn-primary btn-sm" (click)="save()" [disabled]="saving() || !form.notes.trim()">
                        {{ saving() ? 'Saving…' : '✓ Save Log' }}
                    </button>
                </div>
            </div>
        }

        <!-- Timeline Display -->
        @if (loading()) {
            <div class="timeline-loading">
                <span class="spinner"></span>
                <p>Loading journey...</p>
            </div>
        } @else {
            <div class="timeline">
                @if (lead()) {
                    <div class="lead-summary-card">
                        <div class="summary-details">
                            <span><strong>Lead Info:</strong> {{ lead()!.full_name }}</span>
                            <span>📞 {{ lead()!.phone }}</span>
                            @if (lead()!.email) { <span>✉️ {{ lead()!.email }}</span> }
                            <span class="badge" [class]="'badge-' + lead()!.status">Status: {{ lead()!.status }}</span>
                            @if (lead()!.rating) {
                                <span class="badge" [class]="'rating-' + lead()!.rating">Rating: {{ lead()!.rating | uppercase }}</span>
                            }
                        </div>
                        @if (lead()!.phone) {
                            <a [href]="getWhatsAppLink(lead()!.phone)" target="_blank" class="wa-action-btn">
                                💬 Open WhatsApp Web
                            </a>
                        }
                    </div>
                }

                @if (journey().length === 0) {
                    <div class="empty-timeline">
                        <p>No activity logged yet. Use the button above to record your first follow-up call, email, or meeting.</p>
                    </div>
                } @else {
                    <div class="timeline-list">
                        @for (item of journey(); track item.id) {
                            <div class="timeline-item" [class.system-item]="item.is_system">
                                <!-- Bullet Dot -->
                                <div class="timeline-badge" [class]="getTimelineBadgeClass(item)">
                                    {{ getIcon(item) }}
                                </div>

                                <!-- Content Card -->
                                <div class="timeline-panel">
                                    <div class="timeline-heading">
                                        <h4 class="timeline-title">
                                            @if (item.is_system) {
                                                <span class="system-tag">⚙️ System Milestone</span>
                                            } @else {
                                                <span class="type-tag">{{ item.followup_type | uppercase }}</span>
                                                <span class="user-info">by {{ item.user_name || 'Staff' }}</span>
                                            }
                                        </h4>
                                        <span class="timeline-time">{{ item.created_at | date:'medium' }}</span>
                                    </div>
                                    <div class="timeline-body">
                                        <p class="notes-text">{{ item.notes }}</p>

                                        <!-- Meta tags inside followup -->
                                        <div class="timeline-meta-tags">
                                            @if (item.rating) {
                                                <span class="badge" [class]="'rating-' + item.rating">Rating: {{ item.rating | uppercase }}</span>
                                            }
                                            @if (item.next_remind_at) {
                                                <span class="badge reminder-tag">🔔 Next Reminder: {{ item.next_remind_at | date:'medium' }}</span>
                                            }
                                            @if (item.quotation_number) {
                                                <span class="badge context-tag">📄 Quote: {{ item.quotation_number }}</span>
                                            }
                                            @if (item.booking_number) {
                                                <span class="badge context-tag">🏨 Booking: {{ item.booking_number }}</span>
                                            }
                                        </div>
                                    </div>
                                    @if (!item.is_system) {
                                        <button class="delete-btn" (click)="deleteItem(item.id)" title="Delete follow-up log">🗑️</button>
                                    }
                                </div>
                            </div>
                        }
                    </div>
                }
            </div>
        }
    </div>
    `,
    styles: [`
        .followup-timeline-container { margin-top: 20px; }
        .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; }
        .section-header h3 { margin: 0; font-size: 1.1rem; color: #111827; }
        
        .btn { padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 500; border: none; }
        .btn-primary { background: #0f766e; color: #fff; }
        .btn-primary:hover { background: #115e59; }
        .btn-outline { background: #fff; color: #374151; border: 1px solid #d1d5db; }
        .btn-outline:hover { background: #f9fafb; }
        .btn-sm { padding: 4px 8px; font-size: 12px; }

        /* Form styling */
        .followup-form-panel { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 20px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
        .followup-form-panel h4 { margin: 0 0 12px; font-size: 14px; color: #374151; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; }
        .form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; }
        .form-group { display: flex; flex-direction: column; gap: 4px; }
        .form-group.full-width { grid-column: 1 / -1; }
        .form-group label { font-size: 11px; font-weight: 600; color: #4b5563; }
        .form-group input, .form-group select, .form-group textarea { padding: 8px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 13px; background: #fff; }
        .form-group textarea { font-family: inherit; resize: vertical; }
        .checkbox-group { justify-content: center; }
        .checkbox-label { display: flex; align-items: center; gap: 6px; font-size: 13px !important; cursor: pointer; user-select: none; }
        .checkbox-label input { width: 16px; height: 16px; margin: 0; cursor: pointer; }
        .req { color: #dc2626; }
        .form-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 14px; border-top: 1px solid #e5e7eb; padding-top: 10px; }

        /* Timeline summary card */
        .lead-summary-card { background: #f3f4f6; border-radius: 6px; padding: 10px 14px; margin-bottom: 15px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; }
        .summary-details { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; font-size: 12px; color: #4b5563; }
        .wa-action-btn { display: inline-block; padding: 4px 8px; border-radius: 4px; background: #25d366; color: #fff; text-decoration: none; font-size: 12px; font-weight: 600; transition: background 0.2s; }
        .wa-action-btn:hover { background: #128c7e; }

        /* Badges */
        .badge { display: inline-block; padding: 2px 6px; border-radius: 9999px; font-size: 10px; font-weight: 600; }
        .badge-new { background: #dbeafe; color: #1e40af; }
        .badge-contacted { background: #fef3c7; color: #92400e; }
        .badge-qualified { background: #e0e7ff; color: #3730a3; }
        .badge-converted { background: #d1fae5; color: #065f46; }
        .badge-lost { background: #fee2e2; color: #991b1b; }
        .badge-junk { background: #f3f4f6; color: #374151; border: 1px dashed #9ca3af; }
        
        .rating-hot { background: #fef2f2; color: #dc2626; border: 1px solid #fca5a5; }
        .rating-warm { background: #fffbeb; color: #d97706; border: 1px solid #fde68a; }
        .rating-cold { background: #f0f9ff; color: #0284c7; border: 1px solid #bae6fd; }

        .reminder-tag { background: #faf5ff; color: #6b21a8; border: 1px solid #e9d5ff; }
        .context-tag { background: #f3f4f6; color: #4b5563; }

        /* Timeline UI */
        .timeline-loading { text-align: center; padding: 40px; color: #6b7280; }
        .empty-timeline { text-align: center; padding: 30px; color: #9ca3af; border: 1px dashed #e5e7eb; border-radius: 8px; }
        .timeline { position: relative; }
        .timeline-list { position: relative; padding: 10px 0; }
        
        /* Vertical Line */
        .timeline-list::before { content: ''; position: absolute; top: 0; bottom: 0; left: 16px; width: 2px; background: #e5e7eb; }
        
        /* Timeline Items */
        .timeline-item { position: relative; margin-bottom: 20px; padding-left: 45px; transition: all 0.2s ease; }
        .timeline-item.system-item .timeline-panel { background: #fafbfc; border-color: #f1f3f5; }
        
        /* Badges/Icons */
        .timeline-badge { position: absolute; top: 2px; left: 2px; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; background: #fff; border: 2px solid #e5e7eb; z-index: 2; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
        .badge-call { border-color: #0d9488; background: #f0fdfa; }
        .badge-whatsapp { border-color: #25d366; background: #f0fdf4; }
        .badge-email { border-color: #8b5cf6; background: #f5f3ff; }
        .badge-meeting { border-color: #f59e0b; background: #fffbeb; }
        .badge-site_visit { border-color: #ef4444; background: #fef2f2; }
        .badge-other { border-color: #6b7280; background: #f9fafb; }
        .badge-system { border-color: #9ca3af; background: #f3f4f6; }

        /* Panel Card */
        .timeline-panel { background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px 16px; position: relative; box-shadow: 0 1px 2px rgba(0,0,0,0.03); }
        .timeline-panel:hover { border-color: #d1d5db; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
        .timeline-heading { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px; flex-wrap: wrap; gap: 4px; }
        .timeline-title { margin: 0; font-size: 13px; font-weight: 700; color: #111827; display: flex; align-items: center; gap: 6px; }
        .timeline-time { font-size: 11px; color: #9ca3af; }
        
        .system-tag { color: #6b7280; font-weight: 600; font-size: 11px; }
        .type-tag { color: #0d9488; font-weight: 800; font-size: 11px; }
        .user-info { font-size: 11px; color: #6b7280; font-weight: 400; }

        .timeline-body .notes-text { margin: 0 0 8px; font-size: 13px; color: #374151; line-height: 1.4; white-space: pre-wrap; }
        .timeline-meta-tags { display: flex; flex-wrap: wrap; gap: 6px; }

        /* Action Buttons on Timeline panel */
        .delete-btn { position: absolute; top: 12px; right: 12px; background: none; border: none; font-size: 12px; cursor: pointer; opacity: 0; transition: opacity 0.2s; padding: 0; }
        .timeline-panel:hover .delete-btn { opacity: 0.6; }
        .delete-btn:hover { opacity: 1 !important; }

        @media (max-width: 600px) {
            .timeline-heading { flex-direction: column; align-items: flex-start; }
            .timeline-time { margin-top: 2px; }
        }
    `]
})
export class FollowupTimelineComponent implements OnInit {
    private api = inject(ApiService);
    private toast = inject(ToastService);

    @Input() leadId?: number;
    @Input() quotationId?: number;
    @Input() bookingId?: number;

    loading = signal(true);
    saving = signal(false);
    showForm = signal(false);

    lead = signal<Lead | null>(null);
    journey = signal<Followup[]>([]);
    users = signal<StaffUser[]>([]);

    form = {
        notes: '',
        followup_type: 'call' as FollowupType,
        rating: null as 'hot' | 'warm' | 'cold' | null,
        status: null as string | null,
        setReminder: false,
        next_remind_at: '',
        next_reminder_assignee: null as number | null
    };

    ngOnInit() {
        this.load();
        this.loadUsers();
    }

    load() {
        this.loading.set(true);
        const params: any = {};
        if (this.leadId) params.lead_id = this.leadId;
        if (this.quotationId) params.quotation_id = this.quotationId;
        if (this.bookingId) params.booking_id = this.bookingId;

        this.api.getJourney(params).subscribe({
            next: (data) => {
                this.journey.set(data.journey || []);
                this.lead.set(data.lead || null);
                
                // Prefill form status & rating with lead's current values if available
                if (data.lead) {
                    this.form.rating = data.lead.rating || null;
                    this.form.status = data.lead.status || null;
                }
                
                this.loading.set(false);
            },
            error: () => {
                this.toast.error('Failed to load customer journey timeline.');
                this.loading.set(false);
            }
        });
    }

    loadUsers() {
        this.api.listUsers({ limit: 100, is_active: '1' }).subscribe({
            next: (data) => this.users.set(data.items || []),
            error: () => {}
        });
    }

    toggleForm() {
        this.showForm.set(!this.showForm());
        if (!this.showForm()) {
            this.resetForm();
        } else {
            // Set a default reminder time to tomorrow, same hour
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const pad = (n: number) => String(n).padStart(2, '0');
            this.form.next_remind_at = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}T09:30`;
        }
    }

    resetForm() {
        this.form = {
            notes: '',
            followup_type: 'call',
            rating: this.lead()?.rating || null,
            status: this.lead()?.status || null,
            setReminder: false,
            next_remind_at: '',
            next_reminder_assignee: null
        };
    }

    save() {
        if (!this.form.notes.trim()) return;
        this.saving.set(true);

        const payload: any = {
            lead_id: this.leadId || this.lead()?.id || null,
            quotation_id: this.quotationId || null,
            booking_id: this.bookingId || null,
            followup_type: this.form.followup_type,
            notes: this.form.notes,
            rating: this.form.rating,
            status: this.form.status
        };

        if (this.form.setReminder && this.form.next_remind_at) {
            // Format datetime-local value to SQL datetime
            const dt = new Date(this.form.next_remind_at);
            const pad = (n: number) => String(n).padStart(2, '0');
            payload.next_remind_at = `${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())} ${pad(dt.getHours())}:${pad(dt.getMinutes())}:00`;
            payload.next_reminder_assignee = this.form.next_reminder_assignee;
        }

        this.api.createFollowup(payload).subscribe({
            next: () => {
                this.toast.success('Follow-up logged successfully.');
                this.saving.set(false);
                this.showForm.set(false);
                this.resetForm();
                this.load();
            },
            error: (err) => {
                this.toast.error(err?.error?.error || 'Failed to save follow-up.');
                this.saving.set(false);
            }
        });
    }

    deleteItem(id: number) {
        if (!confirm('Are you sure you want to delete this follow-up log?')) return;
        this.api.deleteFollowup(id).subscribe({
            next: () => {
                this.toast.success('Deleted follow-up log.');
                this.load();
            },
            error: () => this.toast.error('Failed to delete log.')
        });
    }

    getTimelineBadgeClass(item: Followup): string {
        if (item.is_system) return 'badge-system';
        return `badge-${item.followup_type}`;
    }

    getIcon(item: Followup): string {
        if (item.is_system) return '⚙️';
        const icons: Record<string, string> = {
            call: '📞',
            whatsapp: '💬',
            email: '✉️',
            meeting: '🤝',
            site_visit: '📍',
            other: '📝'
        };
        return icons[item.followup_type] || '📝';
    }

    getWhatsAppLink(phone: string): string {
        const clean = phone.replace(/\D/g, '');
        // Prefix with Indian country code if simple 10 digit (standard in local context)
        const countryPrefixed = clean.length === 10 ? '91' + clean : clean;
        return `https://wa.me/${countryPrefixed}`;
    }
}
