import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
    selector: 'app-payment-reminders',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <div class="page-header">
        <div>
            <h1>Payment Reminders</h1>
            <p>Automated reminders for balance payments before trip start.</p>
        </div>
        <button class="btn btn-primary" (click)="openForm()">+ New Schedule</button>
    </div>

    @if (editing()) {
    <div class="card">
        <h3>{{ editing().id ? 'Edit' : 'New' }} Schedule</h3>
        <div class="form-grid-2">
            <div class="form-group">
                <label>Name</label>
                <input type="text" [(ngModel)]="editing().name" />
            </div>
            <div class="form-group">
                <label>Trigger</label>
                <select [(ngModel)]="editing().trigger_type">
                    <option value="before_trip">Before trip start</option>
                    <option value="after_due">After due date</option>
                </select>
            </div>
            <div class="form-group">
                <label>Days offset</label>
                <input type="number" [(ngModel)]="editing().days_offset" />
            </div>
            <div class="form-group">
                <label>Channel</label>
                <select [(ngModel)]="editing().channel">
                    <option value="email">Email</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="both">Both</option>
                </select>
            </div>
            <div class="form-group">
                <label>Template</label>
                <select [(ngModel)]="editing().template_id">
                    @for (t of templates(); track t.id) {
                        <option [value]="t.id">{{ t.name }} ({{ t.channel }})</option>
                    }
                </select>
            </div>
            <div class="form-group">
                <label>Active</label>
                <select [(ngModel)]="editing().is_active">
                    <option [ngValue]="1">Yes</option>
                    <option [ngValue]="0">No</option>
                </select>
            </div>
        </div>
        <div class="flex">
            <button class="btn btn-primary" (click)="save()" [disabled]="saving()">{{ saving() ? 'Saving…' : 'Save' }}</button>
            <button class="btn btn-outline" (click)="editing.set(null)">Cancel</button>
        </div>
    </div>
    }

    <div class="card">
        <div class="table-wrap">
            <table class="data-table">
                <thead>
                    <tr><th>Name</th><th>Trigger</th><th>Days</th><th>Channel</th><th>Template</th><th>Active</th><th></th></tr>
                </thead>
                <tbody>
                    @for (s of schedules(); track s.id) {
                        <tr>
                            <td>{{ s.name }}</td>
                            <td>{{ s.trigger_type }}</td>
                            <td>{{ s.days_offset }}</td>
                            <td>{{ s.channel }}</td>
                            <td>{{ s.template_name }}</td>
                            <td>{{ s.is_active ? 'Yes' : 'No' }}</td>
                            <td>
                                <button class="btn btn-sm btn-outline" (click)="edit(s)">Edit</button>
                                <button class="btn btn-sm btn-danger" (click)="deleteSchedule(s.id)">Delete</button>
                            </td>
                        </tr>
                    } @empty {
                        <tr><td colspan="7" class="text-center text-muted">No schedules yet.</td></tr>
                    }
                </tbody>
            </table>
        </div>
    </div>
    `,
    styles: [`
        .btn-danger { background: var(--danger); color: #fff; border-color: var(--danger); }
    `]
})
export class PaymentRemindersComponent implements OnInit {
    private api = inject(ApiService);
    private toast = inject(ToastService);

    schedules = signal<any[]>([]);
    templates = signal<any[]>([]);
    editing = signal<any>(null);
    saving = signal(false);

    ngOnInit() {
        this.load();
        this.api.listMessageTemplates({ category: 'payment_reminder' }).subscribe({
            next: r => this.templates.set(r),
            error: () => this.toast.error('Failed to load templates')
        });
    }

    load() {
        this.api.listPaymentReminderSchedules().subscribe({
            next: r => this.schedules.set(r),
            error: () => this.toast.error('Failed to load schedules')
        });
    }

    openForm() {
        this.editing.set({ name: '', trigger_type: 'before_trip', days_offset: 7, channel: 'email', template_id: '', is_active: 1 });
    }

    edit(s: any) {
        this.editing.set({ ...s });
    }

    save() {
        const e = this.editing();
        const body = { ...e, template_id: Number(e.template_id), is_active: e.is_active ? 1 : 0 };
        this.saving.set(true);
        const req = e.id ? this.api.updatePaymentReminderSchedule(e.id, body) : this.api.createPaymentReminderSchedule(body);
        req.subscribe({
            next: () => {
                this.saving.set(false);
                this.editing.set(null);
                this.load();
                this.toast.success('Schedule saved');
            },
            error: () => {
                this.saving.set(false);
                this.toast.error('Failed to save schedule');
            }
        });
    }

    deleteSchedule(id: number) {
        if (!confirm('Delete this schedule?')) return;
        this.api.deletePaymentReminderSchedule(id).subscribe({
            next: () => { this.load(); this.toast.success('Schedule deleted'); },
            error: () => this.toast.error('Failed to delete schedule')
        });
    }
}
