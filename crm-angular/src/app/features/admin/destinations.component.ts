import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { Destination } from '../../core/models';

@Component({
    selector: 'app-destinations',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, FormsModule],
    template: `
    <div class="page-header">
        <div>
            <h1>Destinations</h1>
            <p>Manage destinations for the quotation builder</p>
        </div>
    </div>

    <div class="card">
        <h2>{{ editing() ? 'Edit destination' : 'Add destination' }}</h2>
        <form [formGroup]="form" (ngSubmit)="save()">
            <div class="form-grid-3">
                <div class="form-group">
                    <label>Name <span class="req">*</span></label>
                    <input type="text" formControlName="name" placeholder="e.g. Goa">
                </div>
                <div class="form-group">
                    <label>State / Region</label>
                    <input type="text" formControlName="state" placeholder="optional">
                </div>
                <div class="form-group">
                    <label>Country</label>
                    <input type="text" formControlName="country">
                </div>
            </div>
            <div class="flex">
                <label class="checkbox-item">
                    <input type="checkbox" formControlName="is_active"> Active
                </label>
                <button type="submit" class="btn btn-primary" [disabled]="saving() || form.invalid">
                    @if (saving()) { <span class="spinner"></span> Saving… }
                    @else { {{ editing() ? 'Update' : 'Add' }} }
                </button>
                @if (editing()) {
                    <button type="button" class="btn" (click)="cancelEdit()">Cancel</button>
                }
            </div>
        </form>
    </div>

    <div class="card">
        <div class="section-header">
            <h2 style="margin:0;border:none;padding:0">All destinations ({{ total() }})</h2>
            <div class="flex" style="gap:0.5rem">
                <input type="text" [ngModel]="search()" (ngModelChange)="onSearchChange($event)" placeholder="Search destinations…" style="min-width:220px">
                <select [ngModel]="limit()" (ngModelChange)="onLimitChange($event)">
                    <option [ngValue]="10">10</option>
                    <option [ngValue]="20">20</option>
                    <option [ngValue]="50">50</option>
                    <option [ngValue]="100">100</option>
                </select>
            </div>
        </div>
        <div class="table-wrap" style="box-shadow:none">
            <table class="data-table">
                <thead>
                    <tr><th>Name</th><th>State</th><th>Country</th><th>Status</th><th>Actions</th></tr>
                </thead>
                <tbody>
                    @for (d of items(); track d.id) {
                        <tr>
                            <td><strong>{{ d.name }}</strong></td>
                            <td>{{ d.state || '—' }}</td>
                            <td>{{ d.country }}</td>
                            <td>
                                @if (d.is_active) { <span class="badge badge-accepted">Active</span> }
                                @else { <span class="badge badge-draft">Inactive</span> }
                            </td>
                            <td>
                                <button class="btn btn-sm" (click)="edit(d)">Edit</button>
                            </td>
                        </tr>
                    } @empty {
                        <tr><td colspan="5" class="empty-state">No destinations yet</td></tr>
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
    `
})
export class DestinationsComponent implements OnInit {
    private api = inject(ApiService);
    private fb = inject(FormBuilder);
    private toast = inject(ToastService);

    items = signal<Destination[]>([]);
    total = signal(0);
    page = signal(1);
    limit = signal(20);
    search = signal('');
    loading = signal(false);
    saving = signal(false);
    editingId = signal<number | null>(null);
    editing = () => this.editingId() !== null;

    totalPages = () => Math.max(1, Math.ceil(this.total() / this.limit()));

    form: FormGroup = this.fb.group({
        name:      ['', Validators.required],
        state:     [''],
        country:   ['India'],
        is_active: [true]
    });

    ngOnInit() { this.fetch(); }

    fetch() {
        this.loading.set(true);
        this.api.listDestinations({ q: this.search(), page: this.page(), limit: this.limit() }).subscribe({
            next: (res) => {
                this.items.set(res.items);
                this.total.set(res.total);
                this.loading.set(false);
            },
            error: () => {
                this.loading.set(false);
                this.toast.error('Failed to load destinations');
            }
        });
    }

    onSearchChange(val: string) {
        this.search.set(val);
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

    edit(d: Destination) {
        this.editingId.set(d.id);
        this.form.patchValue({ name: d.name, state: d.state || '', country: d.country, is_active: d.is_active });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    cancelEdit() {
        this.editingId.set(null);
        this.form.reset({ country: 'India', is_active: true });
    }

    save() {
        if (this.form.invalid) return;
        this.saving.set(true);
        const body = this.form.value;
        const obs = this.editingId()
            ? this.api.updateDestination(this.editingId()!, body)
            : this.api.createDestination(body);
        obs.subscribe({
            next: () => { this.saving.set(false); this.cancelEdit(); this.fetch(); },
            error: () => { this.saving.set(false); this.toast.error('Failed to save destination'); }
        });
    }
}
