import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
    selector: 'app-agent-list',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, FormsModule],
    template: `
    <div class="page-header">
        <div>
            <h1>B2B Agents</h1>
            <p>Approve and manage travel agent partners and their commission settings</p>
        </div>
    </div>

    @if (selectedAgent()) {
        <div class="card">
            <div class="flex" style="justify-content:space-between;align-items:center;margin-bottom:1rem">
                <h2 style="margin:0;border:none;padding:0">Review Agent: {{ selectedAgent()?.agency_name }}</h2>
                <button type="button" class="btn btn-sm" (click)="closeReview()">Close</button>
            </div>
            <div class="agent-review-grid">
                <div>
                    <p><strong>Agency Name:</strong> {{ selectedAgent()?.agency_name }}</p>
                    <p><strong>Agent Contact:</strong> {{ selectedAgent()?.agent_name }}</p>
                    <p><strong>Email Address:</strong> {{ selectedAgent()?.email }}</p>
                    <p><strong>Phone Number:</strong> {{ selectedAgent()?.phone }}</p>
                    <p><strong>Registered On:</strong> {{ selectedAgent()?.created_at | date:'medium' }}</p>
                </div>
                <div>
                    <form [formGroup]="form" (ngSubmit)="saveAgent()">
                        <div class="form-group" style="margin-bottom:1rem">
                            <label>Status</label>
                            <select formControlName="status" style="width:100%">
                                <option value="pending">Pending Approval</option>
                                <option value="approved">Approved / Active</option>
                                <option value="rejected">Rejected</option>
                                <option value="inactive">Deactivated</option>
                            </select>
                        </div>
                        <div class="form-grid-2" style="margin-bottom:1rem">
                            <div class="form-group">
                                <label>Commission Type</label>
                                <select formControlName="commission_type" style="width:100%">
                                    <option value="percentage">Percentage (%)</option>
                                    <option value="fixed">Fixed Flat Rate (₹)</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Commission Rate</label>
                                <input type="number" formControlName="commission_rate" style="width:100%" placeholder="e.g. 10">
                            </div>
                        </div>
                        <button type="submit" class="btn btn-primary" [disabled]="saving()">
                            @if (saving()) { <span class="spinner"></span> Saving… }
                            @else { Save Settings }
                        </button>
                    </form>
                </div>
            </div>
        </div>
    }

    <div class="card">
        <div class="section-header">
            <h2 style="margin:0;border:none;padding:0">All Registered Agents ({{ total() }})</h2>
            <div class="flex" style="gap:0.5rem">
                <select [ngModel]="filterStatus()" (ngModelChange)="onFilterStatusChange($event)" style="min-width:180px">
                    <option value="">All Statuses</option>
                    <option value="pending">Pending Approval</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                    <option value="inactive">Inactive</option>
                </select>
                <select [ngModel]="limit()" (ngModelChange)="onLimitChange($event)">
                    <option [ngValue]="10">10</option>
                    <option [ngValue]="20">20</option>
                    <option [ngValue]="50">50</option>
                </select>
            </div>
        </div>
        <div class="table-wrap" style="box-shadow:none">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Agency Name</th>
                        <th>Agent Name</th>
                        <th>Email / Phone</th>
                        <th>Commission Settings</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    @for (a of items(); track a.id) {
                        <tr>
                            <td><strong>{{ a.agency_name }}</strong></td>
                            <td>{{ a.agent_name }}</td>
                            <td>
                                <div>{{ a.email }}</div>
                                <div style="font-size:0.85rem;color:var(--text-muted)">{{ a.phone }}</div>
                            </td>
                            <td>
                                @if (a.commission_type === 'percentage') {
                                    {{ a.commission_rate }}% of subtotal
                                } @else {
                                    Flat ₹{{ a.commission_rate }} per booking
                                }
                            </td>
                            <td>
                                @if (a.status === 'approved') {
                                    <span class="badge badge-accepted">Approved</span>
                                } @else if (a.status === 'pending') {
                                    <span class="badge badge-draft">Pending Review</span>
                                } @else if (a.status === 'rejected') {
                                    <span class="badge badge-rejected">Rejected</span>
                                } @else {
                                    <span class="badge badge-cancelled">Inactive</span>
                                }
                            </td>
                            <td>
                                <button class="btn btn-sm btn-primary" (click)="reviewAgent(a)">Review & Setup</button>
                            </td>
                        </tr>
                    } @empty {
                        <tr><td colspan="6" class="empty-state">No agents found</td></tr>
                    }
                </tbody>
            </table>
        </div>
        <div class="pagination-bar">
            <button class="btn btn-sm" [disabled]="page() === 1 || loading()" (click)="prevPage()">Prev</button>
            <span>Page {{ page() }} of {{ totalPages() }}</span>
            <button class="btn btn-sm" [disabled]="page() >= totalPages() || loading()" (click)="nextPage()">Next</button>
        </div>
    </div>
    `,
    styles: [`
        .agent-review-grid { display:grid; grid-template-columns:1fr 1fr; gap:2rem; margin-bottom:1.5rem; }
        @media (max-width: 768px) {
            .agent-review-grid { grid-template-columns:1fr; gap:1rem; }
        }
    `]
})
export class AgentListComponent implements OnInit {
    private api = inject(ApiService);
    private fb = inject(FormBuilder);
    private toast = inject(ToastService);

    items = signal<any[]>([]);
    total = signal(0);
    page = signal(1);
    limit = signal(20);
    filterStatus = signal('');
    loading = signal(false);
    saving = signal(false);
    selectedAgent = signal<any | null>(null);

    form: FormGroup = this.fb.group({
        status: ['pending', Validators.required],
        commission_type: ['percentage', Validators.required],
        commission_rate: [10, [Validators.required, Validators.min(0)]]
    });

    totalPages = () => Math.max(1, Math.ceil(this.total() / this.limit()));

    ngOnInit() { this.fetch(); }

    fetch() {
        this.loading.set(true);
        this.api.listAgents({
            status: this.filterStatus(),
            page: this.page(),
            limit: this.limit()
        }).subscribe({
            next: (res) => {
                this.items.set(res.items);
                this.total.set(res.total);
                this.loading.set(false);
            },
            error: () => {
                this.loading.set(false);
                this.toast.error('Failed to load agents');
            }
        });
    }

    onFilterStatusChange(val: string) {
        this.filterStatus.set(val);
        this.page.set(1);
        this.fetch();
    }

    onLimitChange(val: number) {
        this.limit.set(val);
        this.page.set(1);
        this.fetch();
    }

    prevPage() {
        if (this.page() > 1) {
            this.page.update(p => p - 1);
            this.fetch();
        }
    }

    nextPage() {
        if (this.page() < this.totalPages()) {
            this.page.update(p => p + 1);
            this.fetch();
        }
    }

    reviewAgent(agent: any) {
        this.selectedAgent.set(agent);
        this.form.patchValue({
            status: agent.status,
            commission_type: agent.commission_type || 'percentage',
            commission_rate: agent.commission_rate != null ? Number(agent.commission_rate) : 10
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    closeReview() {
        this.selectedAgent.set(null);
    }

    saveAgent() {
        if (this.form.invalid || !this.selectedAgent()) return;
        this.saving.set(true);
        const body = this.form.value;
        this.api.updateAgentStatus(this.selectedAgent().id, body).subscribe({
            next: (res) => {
                this.saving.set(false);
                this.toast.success('Agent settings updated successfully');
                this.closeReview();
                this.fetch();
            },
            error: (err) => {
                this.saving.set(false);
                this.toast.error(err.error?.error || 'Failed to update agent settings');
            }
        });
    }
}
