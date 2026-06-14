import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
    selector: 'app-message-templates',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <div class="page-header">
        <div>
            <h1>Message Templates</h1>
            <p>Reusable email, SMS and WhatsApp templates.</p>
        </div>
        <button class="btn btn-primary" (click)="openForm()">+ New Template</button>
    </div>

    @if (editing()) {
    <div class="card">
        <h3>{{ editing().id ? 'Edit' : 'New' }} Template</h3>
        <div class="form-grid-2">
            <div class="form-group">
                <label>Name</label>
                <input type="text" [(ngModel)]="editing().name" />
            </div>
            <div class="form-group">
                <label>Channel</label>
                <select [(ngModel)]="editing().channel">
                    <option value="email">Email</option>
                    <option value="sms">SMS</option>
                    <option value="whatsapp">WhatsApp</option>
                </select>
            </div>
            <div class="form-group">
                <label>Category</label>
                <select [(ngModel)]="editing().category">
                    <option value="payment_reminder">Payment Reminder</option>
                    <option value="follow_up">Follow-up</option>
                    <option value="welcome">Welcome</option>
                    <option value="booking_confirmation">Booking Confirmation</option>
                    <option value="general">General</option>
                </select>
            </div>
            <div class="form-group" *ngIf="editing().channel === 'email'">
                <label>Subject</label>
                <input type="text" [(ngModel)]="editing().subject" />
            </div>
        </div>
        <div class="form-group">
            <label>Body</label>
            <textarea [(ngModel)]="editing().body" rows="6"></textarea>
            <span class="text-muted" style="font-size:12px" ngNonBindable>Placeholders: {{full_name}}, {{destination}}, {{amount}}, {{booking_number}}, {{agency_name}}</span>
        </div>
        <div class="form-group">
            <label>Placeholders (comma separated)</label>
            <input type="text" [(ngModel)]="placeholderInput" />
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
                    <tr><th>Name</th><th>Channel</th><th>Category</th><th>Subject</th><th></th></tr>
                </thead>
                <tbody>
                    @for (t of templates(); track t.id) {
                        <tr>
                            <td>{{ t.name }}</td>
                            <td>{{ t.channel }}</td>
                            <td>{{ t.category || 'general' }}</td>
                            <td>{{ t.subject || '-' }}</td>
                            <td>
                                <button class="btn btn-sm btn-outline" (click)="edit(t)">Edit</button>
                                <button class="btn btn-sm btn-danger" (click)="deleteTemplate(t.id)">Delete</button>
                            </td>
                        </tr>
                    } @empty {
                        <tr><td colspan="5" class="text-center text-muted">No templates yet.</td></tr>
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
export class MessageTemplatesComponent implements OnInit {
    private api = inject(ApiService);
    private toast = inject(ToastService);

    templates = signal<any[]>([]);
    editing = signal<any>(null);
    saving = signal(false);
    placeholderInput = '';

    ngOnInit() {
        this.load();
    }

    load() {
        this.api.listMessageTemplates().subscribe({
            next: r => this.templates.set(r),
            error: () => this.toast.error('Failed to load templates')
        });
    }

    openForm() {
        this.editing.set({ name: '', channel: 'email', category: 'general', subject: '', body: '', placeholders: [] });
        this.placeholderInput = '';
    }

    edit(t: any) {
        this.editing.set({ ...t });
        this.placeholderInput = (t.placeholders || []).join(', ');
    }

    save() {
        const e = this.editing();
        const body = {
            ...e,
            placeholders: this.placeholderInput.split(',').map((p: string) => p.trim()).filter(Boolean)
        };
        this.saving.set(true);
        const req = e.id ? this.api.updateMessageTemplate(e.id, body) : this.api.createMessageTemplate(body);
        req.subscribe({
            next: () => {
                this.saving.set(false);
                this.editing.set(null);
                this.load();
                this.toast.success('Template saved');
            },
            error: () => {
                this.saving.set(false);
                this.toast.error('Failed to save template');
            }
        });
    }

    deleteTemplate(id: number) {
        if (!confirm('Delete this template?')) return;
        this.api.deleteMessageTemplate(id).subscribe({
            next: () => { this.load(); this.toast.success('Template deleted'); },
            error: () => this.toast.error('Failed to delete template')
        });
    }
}
