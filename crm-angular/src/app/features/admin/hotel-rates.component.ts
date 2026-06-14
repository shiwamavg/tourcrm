import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { Destination, HotelRate } from '../../core/models';
import { DestinationModalComponent } from '../../shared/components/destination-modal.component';

@Component({
    selector: 'app-hotel-rates',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, DecimalPipe, FormsModule, DestinationModalComponent],
    template: `
    <div class="page-header">
        <div>
            <h1>Hotel Rates</h1>
            <p>Master rates per destination / hotel / room type — pre-fill the quotation builder</p>
        </div>
    </div>

    <div class="card">
        <h2>{{ editing() ? 'Edit hotel rate' : 'Add hotel rate' }}</h2>
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
                    <label>Hotel Name <span class="req">*</span></label>
                    <input type="text" formControlName="hotel_name" placeholder="e.g. Taj Holiday Village">
                </div>
                <div class="form-group">
                    <label>Star Rating <span class="req">*</span></label>
                    <select formControlName="star_rating">
                        @for (s of [1,2,3,4,5]; track s) {
                            <option [ngValue]="s.toString()">{{ s }} Star</option>
                        }
                    </select>
                </div>
                <div class="form-group">
                    <label>Room Type <span class="req">*</span></label>
                    <select formControlName="room_type">
                        <option value="standard">Standard</option>
                        <option value="deluxe">Deluxe</option>
                        <option value="premium">Premium</option>
                        <option value="luxury">Luxury</option>
                        <option value="suite">Suite</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Meal Plan</label>
                    <select formControlName="meal_plan">
                        <option value="none">No meals</option>
                        <option value="breakfast">Breakfast</option>
                        <option value="breakfast_dinner">Breakfast + Dinner</option>
                        <option value="all_inclusive">All Inclusive</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Charge / Night (₹) <span class="req">*</span></label>
                    <input type="number" formControlName="charge_per_night" min="0" step="1">
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
            <h2 style="margin:0;border:none;padding:0">All hotel rates ({{ total() }})</h2>
            <div class="flex" style="gap:0.5rem">
                <input type="text" [ngModel]="search()" (ngModelChange)="onSearchChange($event)" placeholder="Search hotel rates…" style="min-width:220px">
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
                        <th>Destination</th><th>Hotel</th><th>Star</th>
                        <th>Room</th><th>Meal</th>
                        <th class="num">Rate/night</th>
                        <th>Status</th><th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    @for (r of items(); track r.id) {
                        <tr>
                            <td>{{ r.destination_name }}</td>
                            <td><strong>{{ r.hotel_name }}</strong></td>
                            <td>{{ r.star_rating }}★</td>
                            <td>{{ r.room_type }}</td>
                            <td>{{ r.meal_plan.replace('_','+') }}</td>
                            <td class="num">₹{{ r.charge_per_night | number:'1.0-0' }}</td>
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
                        <tr><td colspan="8" class="empty-state">No hotel rates yet — add one above to pre-fill the quotation builder.</td></tr>
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
export class HotelRatesComponent implements OnInit {
    private api = inject(ApiService);
    private fb = inject(FormBuilder);
    private toast = inject(ToastService);

    items = signal<HotelRate[]>([]);
    destinations = signal<Destination[]>([]);
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
        destination_id:   [null, Validators.required],
        hotel_name:       ['', Validators.required],
        star_rating:      ['3', Validators.required],
        room_type:        ['deluxe', Validators.required],
        meal_plan:        ['breakfast'],
        charge_per_night: [0, [Validators.required, Validators.min(0)]],
        valid_from:       [''],
        valid_till:       [''],
        notes:            [''],
        is_active:        [true]
    });

    ngOnInit() {
        this.api.listDestinations().subscribe({
            next: d => this.destinations.set(d.items),
            error: () => this.toast.error('Failed to load destinations')
        });
        this.fetch();
    }

    fetch() {
        this.loading.set(true);
        this.api.listHotelRates({ q: this.search(), page: this.page(), limit: this.limit() }).subscribe({
            next: (res) => {
                this.items.set(res.items);
                this.total.set(res.total);
                this.loading.set(false);
            },
            error: () => {
                this.loading.set(false);
                this.toast.error('Failed to load hotel rates');
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

    edit(r: HotelRate) {
        this.editingId.set(r.id);
        this.form.patchValue({
            destination_id: r.destination_id, hotel_name: r.hotel_name, star_rating: r.star_rating,
            room_type: r.room_type, meal_plan: r.meal_plan, charge_per_night: r.charge_per_night,
            valid_from: r.valid_from || '', valid_till: r.valid_till || '',
            notes: r.notes || '', is_active: r.is_active
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    cancelEdit() {
        this.editingId.set(null);
        this.form.reset({ star_rating: '3', room_type: 'deluxe', meal_plan: 'breakfast',
                          charge_per_night: 0, is_active: true });
    }

    save() {
        if (this.form.invalid) return;
        this.saving.set(true);
        const body = this.form.value;
        const obs = this.editingId()
            ? this.api.updateHotelRate(this.editingId()!, body)
            : this.api.createHotelRate(body);
        obs.subscribe({
            next: () => { this.saving.set(false); this.cancelEdit(); this.fetch(); },
            error: () => { this.saving.set(false); this.toast.error('Failed to save hotel rate'); }
        });
    }

    onDestinationSaved(dest: Destination) {
        this.destinations.update(list => [...list, dest]);
        this.form.patchValue({ destination_id: dest.id });
        this.showDestinationModal.set(false);
    }

    remove(r: HotelRate) {
        if (!confirm(`Delete rate for "${r.hotel_name}"?`)) return;
        this.api.deleteHotelRate(r.id).subscribe({
            next: () => this.fetch(),
            error: () => this.toast.error('Failed to delete hotel rate')
        });
    }
}
