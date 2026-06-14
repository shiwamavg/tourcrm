import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
    selector: 'app-followup-sequences',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <div class="page-header">
        <div>
            <h1>Auto Follow-up Sequences</h1>
            <p>Nurture new leads with timed email, WhatsApp, SMS and call steps.</p>
        </div>
        <button class="btn btn-primary" (click)="openForm()">+ New Sequence</button>
    </div>

    @if (editing()) {
    <div class="card">
        <h3>{{ editing().id ? 'Edit' : 'New' }} Sequence</h3>
        <div class="form-grid-2">
            <div class="form-group">
                <label>Name</label>
                <input type="text" [(ngModel)]="editing().name" />
            </div>
            <div class="form-group">
                <label>Apply to source</label>
                <select [(ngModel)]="editing().source">
                    <option value="">All sources</option>
                    <option value="website_form">Website form</option>
                    <option value="demo_request">Demo request</option>
                    <option value="meta_ads">Meta Ads</option>
                    <option value="walk_in">Walk-in</option>
                    <option value="referral">Referral</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="phone">Phone</option>
                    <option value="google_sheet">Google Sheet</option>
                    <option value="csv_upload">CSV upload</option>
                    <option value="manual">Manual</option>
                </select>
            </div>
        </div>
        <div class="form-group">
            <label>Active</label>
            <select [(ngModel)]="editing().is_active">
                <option [ngValue]="1">Yes</option>
                <option [ngValue]="0">No</option>
            </select>
        </div>

        <h4>Steps</h4>
        @for (step of editing().steps; track $index) {
            <div class="line-item-card">
                <div class="line-item-header">
                    <strong>Step {{ $index + 1 }}</strong>
                    <button class="btn-remove" (click)="removeStep($index)">×</button>
                </div>
                <div class="form-grid-3">
                    <div class="form-group">
                        <label>Action</label>
                        <select [(ngModel)]="step.action_type">
                            <option value="email">Email</option>
                            <option value="whatsapp">WhatsApp</option>
                            <option value="sms">SMS</option>
                            <option value="call_task">Call task</option>
                            <option value="system_note">System note</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Delay days</label>
                        <input type="number" [(ngModel)]="step.delay_days" />
                    </div>
                    <div class="form-group">
                        <label>Delay hours</label>
                        <input type="number" [(ngModel)]="step.delay_hours" />
                    </div>
                </div>
                @if (step.action_type === 'email' || step.action_type === 'whatsapp' || step.action_type === 'sms') {
                    <div class="form-group">
                        <label>Template</label>
                        <select [(ngModel)]="step.template_id">
                            <option value="">-- custom --</option>
                            @for (t of templates(); track t.id) {
                                <option [value]="t.id">{{ t.name }} ({{ t.channel }})</option>
                            }
                        </select>
                    </div>
                }
                @if (step.action_type === 'call_task') {
                    <div class="form-group">
                        <label>Call type</label>
                        <select [(ngModel)]="step.followup_type">
                            <option value="call">Call</option>
                            <option value="whatsapp">WhatsApp call</option>
                        </select>
                    </div>
                }
                <div class="form-group">
                    <label>{{ step.template_id ? 'Override body' : 'Body / note' }}</label>
                    <textarea [(ngModel)]="step.body" rows="3"></textarea>
                </div>
                @if (step.action_type === 'email') {
                    <div class="form-group">
                        <label>{{ step.template_id ? 'Override subject' : 'Subject' }}</label>
                        <input type="text" [(ngModel)]="step.subject" />
                    </div>
                }
            </div>
        }
        <button class="btn btn-outline" (click)="addStep()">+ Add Step</button>

        <div class="flex" style="margin-top:16px">
            <button class="btn btn-primary" (click)="save()" [disabled]="saving()">{{ saving() ? 'Saving…' : 'Save' }}</button>
            <button class="btn btn-outline" (click)="editing.set(null)">Cancel</button>
        </div>
    </div>
    }

    <div class="card">
        <div class="table-wrap">
            <table class="data-table">
                <thead>
                    <tr><th>Name</th><th>Source filter</th><th>Steps</th><th>Active</th><th></th></tr>
                </thead>
                <tbody>
                    @for (s of sequences(); track s.id) {
                        <tr>
                            <td>{{ s.name }}</td>
                            <td>{{ s.source || 'All' }}</td>
                            <td>{{ s.step_count || '-' }}</td>
                            <td>{{ s.is_active ? 'Yes' : 'No' }}</td>
                            <td>
                                <button class="btn btn-sm btn-outline" (click)="edit(s)">Edit</button>
                                <button class="btn btn-sm btn-danger" (click)="deleteSequence(s.id)">Delete</button>
                            </td>
                        </tr>
                    } @empty {
                        <tr><td colspan="5" class="text-center text-muted">No sequences yet.</td></tr>
                    }
                </tbody>
            </table>
        </div>
    </div>
    `,
    styles: [`
        .btn-danger { background: var(--danger); color: #fff; border-color: var(--danger); }
        .btn-remove { background: transparent; border: 1px solid var(--gray-300); color: var(--danger); width: 28px; height: 28px; border-radius: 50%; cursor: pointer; }
    `]
})
export class FollowupSequencesComponent implements OnInit {
    private api = inject(ApiService);
    private toast = inject(ToastService);

    sequences = signal<any[]>([]);
    templates = signal<any[]>([]);
    editing = signal<any>(null);
    saving = signal(false);

    ngOnInit() {
        this.load();
        this.api.listMessageTemplates().subscribe({
            next: r => this.templates.set(r),
            error: () => this.toast.error('Failed to load templates')
        });
    }

    load() {
        this.api.listFollowupSequences().subscribe({
            next: r => {
                // Enrich with step count; fetch detail if needed
                this.sequences.set(r);
            },
            error: () => this.toast.error('Failed to load sequences')
        });
    }

    openForm() {
        this.editing.set({ name: '', source: '', is_active: 1, steps: [] });
    }

    async edit(s: any) {
        this.api.getFollowupSequence(s.id).subscribe({
            next: seq => {
                this.editing.set({ ...seq, steps: seq.steps.map((st: any) => ({ ...st, template_id: st.template_id || '' })) });
            },
            error: () => this.toast.error('Failed to load sequence')
        });
    }

    addStep() {
        const e = this.editing();
        e.steps.push({ action_type: 'email', delay_days: 1, delay_hours: 0, template_id: '', subject: '', body: '', followup_type: 'call' });
        this.editing.set({ ...e });
    }

    removeStep(idx: number) {
        const e = this.editing();
        e.steps.splice(idx, 1);
        this.editing.set({ ...e });
    }

    save() {
        const e = this.editing();
        const body = {
            ...e,
            is_active: e.is_active ? 1 : 0,
            steps: e.steps.map((s: any) => ({
                ...s,
                template_id: s.template_id ? Number(s.template_id) : null,
                delay_days: Number(s.delay_days || 0),
                delay_hours: Number(s.delay_hours || 0)
            }))
        };
        this.saving.set(true);
        const req = e.id ? this.api.updateFollowupSequence(e.id, body) : this.api.createFollowupSequence(body);
        req.subscribe({
            next: () => {
                this.saving.set(false);
                this.editing.set(null);
                this.load();
                this.toast.success('Sequence saved');
            },
            error: () => {
                this.saving.set(false);
                this.toast.error('Failed to save sequence');
            }
        });
    }

    deleteSequence(id: number) {
        if (!confirm('Delete this sequence?')) return;
        this.api.deleteFollowupSequence(id).subscribe({
            next: () => { this.load(); this.toast.success('Sequence deleted'); },
            error: () => this.toast.error('Failed to delete sequence')
        });
    }
}
