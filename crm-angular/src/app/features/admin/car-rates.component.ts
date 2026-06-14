import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { Destination, CarType, CarRate } from '../../core/models';
import { DestinationModalComponent } from '../../shared/components/destination-modal.component';

@Component({
    selector: 'app-car-rates',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, DecimalPipe, FormsModule, DestinationModalComponent],
    template: `
    <div class="page-header">
        <div>
            <h1>Car Rates</h1>
            <p>Master daily rates for cabs by destination / car type / class</p>
        </div>
    </div>

    <div class="card">
        <h2>{{ editing() ? 'Edit car rate' : 'Add car rate' }}</h2>
        <form [formGroup]="form" (ngSubmit)="save()">
            <div class="form-grid-3">
                <div class="form-group">
                    <label>Destination <span class="req">*</span></label>
                    <div class="flex" style="gap:0.5rem">
                        <select formControlName="destination_id" style="flex:1">
                            <option [ngValue]="null">— select —</option>
                            @for (d of destinations(); track d.id) {
                                <option [ngValue]="d.id">{{ d.name }}</option>
                            }
                        </select>
                        <button type="button" class="btn btn-sm" (click)="showDestinationModal.set(true)">+</button>
                    </div>
                </div>
                <div class="form-group">
                    <label>Car Type <span class="req">*</span></label>
                    <select formControlName="car_type_id">
                        <option [ngValue]="null">— select —</option>
                        @for (t of carTypes(); track t.id) {
                            <option [ngValue]="t.id">{{ t.name }} ({{ t.capacity }} seater)</option>
                        }
                    </select>
                </div>
                <div class="form-group">
                    <label>Class</label>
                    <select formControlName="car_class">
                        <option value="economy">Economy</option>
                        <option value="standard">Standard</option>
                        <option value="premium">Premium</option>
                        <option value="luxury">Luxury</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Charge / Day (₹) <span class="req">*</span></label>
                    <input type="number" formControlName="charge_per_day" min="0" step="1">
                </div>
                <div class="form-group">
                    <label>KM Limit / Day</label>
                    <input type="number" formControlName="km_limit_per_day" min="0" step="1">
                </div>
                <div class="form-group">
                    <label>Extra Charge / KM (₹)</label>
                    <input type="number" formControlName="extra_charge_per_km" min="0" step="0.5">
                </div>
                <div class="form-group">
                    <label>Valid From</label>
                    <input type="date" formControlName="valid_from">
                </div>
                <div class="form-group">
                    <label>Valid Till</label>
                    <input type="date" formControlName="valid_till">
                </div>
                <div class="form-group">
                    <label>Notes</label>
                    <input type="text" formControlName="notes">
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

    @if (showDestinationModal()) {
        <app-destination-modal (close)="showDestinationModal.set(false)" (saved)="onDestinationSaved($event)" />
    }

    <div class="card">
        <div class="section-header">
            <h2 style="margin:0;border:none;padding:0">All car rates ({{ total() }})</h2>
            <div class="flex" style="gap:0.5rem">
                <input type="text" [ngModel]="search()" (ngModelChange)="onSearchChange($event)" placeholder="Search car rates…" style="min-width:220px">
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
                    <tr>
                        <th>Destination</th><th>Car Type</th><th>Class</th>
                        <th class="num">Rate/Day</th>
                        <th class="num">KM Limit</th>
                        <th class="num">Extra/KM</th>
                        <th>Status</th><th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    @for (r of items(); track r.id) {
                        <tr>
                            <td>{{ r.destination_name }}</td>
                            <td><strong>{{ r.car_type_name }}</strong> <small>({{ r.capacity }} seater)</small></td>
                            <td>{{ r.car_class }}</td>
                            <td class="num">₹{{ r.charge_per_day | number:'1.0-0' }}</td>
                            <td class="num">{{ r.km_limit_per_day }} km</td>
                            <td class="num">₹{{ r.extra_charge_per_km | number:'1.0-2' }}</td>
                            <td>
                                @if (r.is_active) { <span class="badge badge-accepted">Active</span> }
                                @else { <span class="badge badge-draft">Inactive</span> }
                            </td>
                            <td>
                                <button class="btn btn-sm" (click)="edit(r)">Edit</button>
                                <button class="btn btn-sm btn-danger" (click)="remove(r)">Delete</button>
                            </td>
                        </tr>
                    } @empty {
                        <tr><td colspan="8" class="empty-state">No car rates yet — add one above.</td></tr>
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
export class CarRatesComponent implements OnInit {
    private api = inject(ApiService);
    private fb = inject(FormBuilder);
    private toast = inject(ToastService);

    items = signal<CarRate[]>([]);
    destinations = signal<Destination[]>([]);
    carTypes = signal<CarType[]>([]);
    total = signal(0);
    page = signal(1);
    limit = signal(20);
    search = signal('');
    loading = signal(false);
    saving = signal(false);
    editingId = signal<number | null>(null);
    editing = () => this.editingId() !== null;
    showDestinationModal = signal(false);

    totalPages = () => Math.max(1, Math.ceil(this.total() / this.limit()));

    form: FormGroup = this.fb.group({
        destination_id:      [null, Validators.required],
        car_type_id:         [null, Validators.required],
        car_class:           ['standard'],
        charge_per_day:      [0, [Validators.required, Validators.min(0)]],
        km_limit_per_day:    [250],
        extra_charge_per_km: [12],
        valid_from:          [''],
        valid_till:          [''],
        notes:               [''],
        is_active:           [true]
    });

    ngOnInit() {
        this.api.listDestinations().subscribe({
            next: d => this.destinations.set(d.items),
            error: () => this.toast.error('Failed to load destinations')
        });
        this.api.listCarTypes().subscribe({
            next: t => this.carTypes.set(t),
            error: () => this.toast.error('Failed to load car types')
        });
        this.fetch();
    }

    fetch() {
        this.loading.set(true);
        this.api.listCarRates({ q: this.search(), page: this.page(), limit: this.limit() }).subscribe({
            next: (res) => {
                this.items.set(res.items);
                this.total.set(res.total);
                this.loading.set(false);
            },
            error: () => {
                this.loading.set(false);
                this.toast.error('Failed to load car rates');
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

    edit(r: CarRate) {
        this.editingId.set(r.id);
        this.form.patchValue({
            destination_id: r.destination_id, car_type_id: r.car_type_id, car_class: r.car_class,
            charge_per_day: r.charge_per_day, km_limit_per_day: r.km_limit_per_day,
            extra_charge_per_km: r.extra_charge_per_km,
            valid_from: r.valid_from || '', valid_till: r.valid_till || '',
            notes: r.notes || '', is_active: r.is_active
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    cancelEdit() {
        this.editingId.set(null);
        this.form.reset({ car_class: 'standard', charge_per_day: 0,
                          km_limit_per_day: 250, extra_charge_per_km: 12, is_active: true });
    }

    save() {
        if (this.form.invalid) return;
        this.saving.set(true);
        const body = this.form.value;
        const obs = this.editingId()
            ? this.api.updateCarRate(this.editingId()!, body)
            : this.api.createCarRate(body);
        obs.subscribe({
            next: () => { this.saving.set(false); this.cancelEdit(); this.fetch(); },
            error: () => { this.saving.set(false); this.toast.error('Failed to save car rate'); }
        });
    }

    onDestinationSaved(dest: Destination) {
        this.destinations.update(list => [...list, dest]);
        this.form.patchValue({ destination_id: dest.id });
        this.showDestinationModal.set(false);
    }

    remove(r: CarRate) {
        if (!confirm(`Delete rate for "${r.car_type_name}" at "${r.destination_name}"?`)) return;
        this.api.deleteCarRate(r.id).subscribe({
            next: () => this.fetch(),
            error: () => this.toast.error('Failed to delete car rate')
        });
    }
}
