// ─── destinations.component.ts ───────────────────────────────────
import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';

@Component({
    selector: 'app-destinations',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    template: `
    <div class="page-header">
        <h1>Destinations</h1>
        <button class="btn-primary" (click)="showForm=!showForm">+ Add Destination</button>
    </div>

    @if (showForm) {
    <div class="card mb-4">
        <div class="card-body">
            <h2 style="margin-bottom:16px;">Add Destination</h2>
            <form [formGroup]="form" (ngSubmit)="save()">
                <div class="form-grid-3">
                    <div class="form-group"><label>Name *</label><input type="text" formControlName="name"></div>
                    <div class="form-group"><label>State</label><input type="text" formControlName="state"></div>
                    <div class="form-group"><label>Country</label><input type="text" formControlName="country"></div>
                </div>
                <button class="btn-primary" type="submit" [disabled]="saving()">{{ saving() ? 'Saving…' : 'Save' }}</button>
                <button type="button" class="btn-ghost" (click)="showForm=false" style="margin-left:8px;">Cancel</button>
            </form>
        </div>
    </div>
    }

    <div class="card">
        <table class="data-table">
            <thead><tr><th>Name</th><th>State</th><th>Country</th><th>Active</th></tr></thead>
            <tbody>
                @for (d of destinations(); track d.id) {
                    <tr>
                        <td style="font-weight:600;">{{ d.name }}</td>
                        <td>{{ d.state || '—' }}</td>
                        <td>{{ d.country }}</td>
                        <td><span class="badge" [class.badge-confirmed]="d.is_active" [class.badge-cancelled]="!d.is_active">{{ d.is_active ? 'Active' : 'Inactive' }}</span></td>
                    </tr>
                }
            </tbody>
        </table>
    </div>
    `
})
export class DestinationsComponent implements OnInit {
    private api = inject(ApiService);
    private fb = inject(FormBuilder);
    destinations = signal<any[]>([]);
    showForm = false;
    saving = signal(false);
    form = this.fb.group({ name: ['', Validators.required], state: [''], country: ['India'] });

    ngOnInit() { this.api.getDestinations().subscribe(d => this.destinations.set(d)); }

    save() {
        if (this.form.invalid) return;
        this.saving.set(true);
        this.api.createDestination(this.form.value).subscribe({
            next: (d) => { this.destinations.update(ds => [d, ...ds]); this.form.reset({ country: 'India' }); this.showForm = false; this.saving.set(false); },
            error: () => this.saving.set(false)
        });
    }
}


// ─── hotel-rates.component.ts ─────────────────────────────────────
import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';

@Component({
    selector: 'app-hotel-rates',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    template: `
    <div class="page-header">
        <h1>Hotel Rates</h1>
        <button class="btn-primary" (click)="showForm=!showForm">+ Add Rate</button>
    </div>

    @if (showForm) {
    <div class="card mb-4">
        <div class="card-body">
            <h2 style="margin-bottom:16px;">Add Hotel Rate</h2>
            <form [formGroup]="form" (ngSubmit)="save()">
                <div class="form-grid-3">
                    <div class="form-group"><label>Destination *</label>
                        <select formControlName="destination_id">
                            <option value="">Select</option>
                            @for (d of destinations(); track d.id) { <option [value]="d.id">{{ d.name }}</option> }
                        </select>
                    </div>
                    <div class="form-group"><label>Hotel Name *</label><input type="text" formControlName="hotel_name"></div>
                    <div class="form-group"><label>Star Rating</label>
                        <select formControlName="star_rating">
                            @for (s of [1,2,3,4,5]; track s) { <option [value]="s">{{ s }} Star</option> }
                        </select>
                    </div>
                    <div class="form-group"><label>Room Type</label>
                        <select formControlName="room_type">
                            <option value="standard">Standard</option><option value="deluxe">Deluxe</option>
                            <option value="premium">Premium</option><option value="luxury">Luxury</option><option value="suite">Suite</option>
                        </select>
                    </div>
                    <div class="form-group"><label>Meal Plan</label>
                        <select formControlName="meal_plan">
                            <option value="none">No meals</option><option value="breakfast">Breakfast</option>
                            <option value="breakfast_dinner">Breakfast+Dinner</option><option value="all_inclusive">All Inclusive</option>
                        </select>
                    </div>
                    <div class="form-group"><label>Charge / Night (₹) *</label><input type="number" formControlName="charge_per_night"></div>
                    <div class="form-group"><label>Valid From</label><input type="date" formControlName="valid_from"></div>
                    <div class="form-group"><label>Valid Till</label><input type="date" formControlName="valid_till"></div>
                </div>
                <button class="btn-primary" type="submit" [disabled]="saving()">{{ saving() ? 'Saving…' : 'Save Rate' }}</button>
                <button type="button" class="btn-ghost" (click)="showForm=false" style="margin-left:8px;">Cancel</button>
            </form>
        </div>
    </div>
    }

    <div class="card">
        <table class="data-table">
            <thead><tr><th>Destination</th><th>Hotel</th><th>Stars</th><th>Room Type</th><th>Meal Plan</th><th>Rate / Night</th><th>Valid Till</th></tr></thead>
            <tbody>
                @for (r of rates(); track r.id) {
                    <tr>
                        <td>{{ r.destination_name }}</td>
                        <td style="font-weight:600;">{{ r.hotel_name }}</td>
                        <td>{{ r.star_rating }}★</td>
                        <td>{{ r.room_type }}</td>
                        <td>{{ r.meal_plan.replace('_','+') }}</td>
                        <td style="font-weight:600;">₹{{ parseFloat(r.charge_per_night).toLocaleString('en-IN') }}</td>
                        <td class="text-muted text-sm">{{ fmtDate(r.valid_till) }}</td>
                    </tr>
                }
            </tbody>
        </table>
    </div>
    `
})
export class HotelRatesComponent implements OnInit {
    private api = inject(ApiService);
    private fb = inject(FormBuilder);
    rates = signal<any[]>([]);
    destinations = signal<any[]>([]);
    showForm = false;
    saving = signal(false);
    form = this.fb.group({
        destination_id: ['', Validators.required], hotel_name: ['', Validators.required],
        star_rating: ['3'], room_type: ['deluxe'], meal_plan: ['breakfast'],
        charge_per_night: [null, Validators.required], valid_from: [''], valid_till: ['']
    });

    ngOnInit() {
        this.api.getHotelRates().subscribe(r => this.rates.set(r));
        this.api.getDestinations().subscribe(d => this.destinations.set(d));
    }

    save() {
        if (this.form.invalid) return;
        this.saving.set(true);
        this.api.createHotelRate(this.form.value).subscribe({
            next: () => { this.api.getHotelRates().subscribe(r => this.rates.set(r)); this.showForm = false; this.saving.set(false); },
            error: () => this.saving.set(false)
        });
    }
    fmtDate(d: string) { return d ? new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '—'; }
    parseFloat = parseFloat;
}


// ─── car-rates.component.ts ───────────────────────────────────────
import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';

@Component({
    selector: 'app-car-rates',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    template: `
    <div class="page-header">
        <h1>Car Rates</h1>
        <button class="btn-primary" (click)="showForm=!showForm">+ Add Rate</button>
    </div>

    @if (showForm) {
    <div class="card mb-4">
        <div class="card-body">
            <form [formGroup]="form" (ngSubmit)="save()">
                <div class="form-grid-3">
                    <div class="form-group"><label>Destination *</label>
                        <select formControlName="destination_id">
                            <option value="">Select</option>
                            @for (d of destinations(); track d.id) { <option [value]="d.id">{{ d.name }}</option> }
                        </select>
                    </div>
                    <div class="form-group"><label>Car Type *</label>
                        <select formControlName="car_type_id">
                            <option value="">Select</option>
                            @for (c of carTypes(); track c.id) { <option [value]="c.id">{{ c.name }} ({{ c.capacity }} seats)</option> }
                        </select>
                    </div>
                    <div class="form-group"><label>Class</label>
                        <select formControlName="car_class">
                            <option value="economy">Economy</option><option value="standard">Standard</option>
                            <option value="premium">Premium</option><option value="luxury">Luxury</option>
                        </select>
                    </div>
                    <div class="form-group"><label>Charge / Day (₹) *</label><input type="number" formControlName="charge_per_day"></div>
                    <div class="form-group"><label>KM Limit / Day</label><input type="number" formControlName="km_limit_per_day"></div>
                    <div class="form-group"><label>Extra Charge / KM (₹)</label><input type="number" formControlName="extra_charge_per_km"></div>
                </div>
                <button class="btn-primary" type="submit" [disabled]="saving()">{{ saving() ? 'Saving…' : 'Save Rate' }}</button>
                <button type="button" class="btn-ghost" (click)="showForm=false" style="margin-left:8px;">Cancel</button>
            </form>
        </div>
    </div>
    }

    <div class="card">
        <table class="data-table">
            <thead><tr><th>Destination</th><th>Car Type</th><th>Class</th><th>Rate/Day</th><th>KM Limit</th><th>Extra/KM</th></tr></thead>
            <tbody>
                @for (r of rates(); track r.id) {
                    <tr>
                        <td>{{ r.destination_name }}</td>
                        <td style="font-weight:600;">{{ r.car_type_name }} ({{ r.capacity }} seats)</td>
                        <td>{{ r.car_class }}</td>
                        <td style="font-weight:600;">₹{{ parseFloat(r.charge_per_day).toLocaleString('en-IN') }}</td>
                        <td>{{ r.km_limit_per_day }} km</td>
                        <td>₹{{ r.extra_charge_per_km }}/km</td>
                    </tr>
                }
            </tbody>
        </table>
    </div>
    `
})
export class CarRatesComponent implements OnInit {
    private api = inject(ApiService);
    private fb = inject(FormBuilder);
    rates = signal<any[]>([]);
    destinations = signal<any[]>([]);
    carTypes = signal<any[]>([]);
    showForm = false;
    saving = signal(false);
    form = this.fb.group({
        destination_id: ['', Validators.required], car_type_id: ['', Validators.required],
        car_class: ['standard'], charge_per_day: [null, Validators.required],
        km_limit_per_day: [250], extra_charge_per_km: [12]
    });

    ngOnInit() {
        this.api.getCarRates().subscribe(r => this.rates.set(r));
        this.api.getDestinations().subscribe(d => this.destinations.set(d));
        this.api.getCarTypes().subscribe(c => this.carTypes.set(c));
    }

    save() {
        if (this.form.invalid) return;
        this.saving.set(true);
        this.api.createCarRate(this.form.value).subscribe({
            next: () => { this.api.getCarRates().subscribe(r => this.rates.set(r)); this.showForm = false; this.saving.set(false); },
            error: () => this.saving.set(false)
        });
    }
    parseFloat = parseFloat;
}


// ─── users.component.ts ───────────────────────────────────────────
import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';

@Component({
    selector: 'app-users',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    template: `
    <div class="page-header">
        <h1>Staff Users</h1>
        <button class="btn-primary" (click)="showForm=!showForm">+ Add User</button>
    </div>

    @if (showForm) {
    <div class="card mb-4">
        <div class="card-body">
            <form [formGroup]="form" (ngSubmit)="save()">
                <div class="form-grid-2">
                    <div class="form-group"><label>Full Name *</label><input type="text" formControlName="full_name"></div>
                    <div class="form-group"><label>Email *</label><input type="email" formControlName="email"></div>
                    <div class="form-group"><label>Phone</label><input type="text" formControlName="phone"></div>
                    <div class="form-group"><label>Role *</label>
                        <select formControlName="role">
                            <option value="telecaller">Telecaller</option>
                            <option value="manager">Manager</option>
                            <option value="accounts">Accounts</option>
                            <option value="admin">Admin</option>
                        </select>
                    </div>
                    <div class="form-group"><label>Password *</label><input type="password" formControlName="password" placeholder="Min 8 characters"></div>
                </div>
                <button class="btn-primary" type="submit" [disabled]="saving()">{{ saving() ? 'Saving…' : 'Create User' }}</button>
                <button type="button" class="btn-ghost" (click)="showForm=false" style="margin-left:8px;">Cancel</button>
                @if (error()) { <p style="color:var(--danger);margin-top:8px;">{{ error() }}</p> }
            </form>
        </div>
    </div>
    }

    <div class="card">
        <table class="data-table">
            <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Role</th><th>Last Login</th><th>Status</th></tr></thead>
            <tbody>
                @for (u of users(); track u.id) {
                    <tr>
                        <td style="font-weight:600;">{{ u.full_name }}</td>
                        <td>{{ u.email }}</td>
                        <td>{{ u.phone || '—' }}</td>
                        <td><span class="badge badge-new">{{ u.role }}</span></td>
                        <td class="text-muted text-sm">{{ fmtDate(u.last_login_at) }}</td>
                        <td><span class="badge" [class.badge-confirmed]="u.is_active" [class.badge-cancelled]="!u.is_active">{{ u.is_active ? 'Active' : 'Inactive' }}</span></td>
                    </tr>
                }
            </tbody>
        </table>
    </div>
    `
})
export class UsersComponent implements OnInit {
    private api = inject(ApiService);
    private fb = inject(FormBuilder);
    users = signal<any[]>([]);
    showForm = false;
    saving = signal(false);
    error = signal('');
    form = this.fb.group({
        full_name: ['', Validators.required], email: ['', [Validators.required, Validators.email]],
        phone: [''], role: ['telecaller', Validators.required],
        password: ['', [Validators.required, Validators.minLength(8)]]
    });

    ngOnInit() { this.api.getStaffUsers().subscribe(u => this.users.set(u)); }

    save() {
        if (this.form.invalid) return;
        this.saving.set(true); this.error.set('');
        this.api.createStaffUser(this.form.value).subscribe({
            next: (u) => { this.users.update(us => [u, ...us]); this.showForm = false; this.saving.set(false); this.form.reset({ role: 'telecaller' }); },
            error: (err) => { this.saving.set(false); this.error.set(err?.error?.error || 'Failed to create user'); }
        });
    }
    fmtDate(d: string) { return d ? new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : 'Never'; }
}


// ─── settings.component.ts ────────────────────────────────────────
import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';

@Component({
    selector: 'app-settings',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    template: `
    <div class="page-header"><h1>Agency Settings</h1></div>
    <div class="card">
        <div class="card-body">
            <form [formGroup]="form" (ngSubmit)="save()">
                <h2 style="margin-bottom:16px;">Agency Information</h2>
                <div class="form-grid-2">
                    <div class="form-group"><label>Agency Name</label><input type="text" formControlName="agency_name"></div>
                    <div class="form-group"><label>GSTIN</label><input type="text" formControlName="gstin" placeholder="22AAAAA0000A1Z5"></div>
                    <div class="form-group"><label>Phone</label><input type="text" formControlName="phone"></div>
                    <div class="form-group"><label>Email</label><input type="email" formControlName="email"></div>
                    <div class="form-group" style="grid-column:span 2"><label>Address</label><textarea formControlName="address" rows="2"></textarea></div>
                </div>

                <h2 style="margin:20px 0 16px;padding-top:20px;border-top:1px solid var(--border);">Defaults</h2>
                <div class="form-grid-2">
                    <div class="form-group"><label>Default Booking Fee (%)</label><input type="number" formControlName="default_booking_fee_pct" min="0" max="100"></div>
                    <div class="form-group"><label>Default Markup (%)</label><input type="number" formControlName="default_markup_pct" min="0" max="100"></div>
                    <div class="form-group"><label>Default GST (%)</label><input type="number" formControlName="default_gst_pct" min="0" max="28"></div>
                    <div class="form-group"><label>Quotation Valid Days</label><input type="number" formControlName="default_quotation_valid_days" min="1"></div>
                </div>

                @if (saved()) { <p style="color:var(--success);margin-bottom:8px;">✓ Settings saved!</p> }
                <button class="btn-primary" type="submit" [disabled]="saving()">{{ saving() ? 'Saving…' : 'Save Settings' }}</button>
            </form>
        </div>
    </div>
    `
})
export class SettingsComponent implements OnInit {
    private api = inject(ApiService);
    private fb = inject(FormBuilder);
    saving = signal(false);
    saved = signal(false);
    form = this.fb.group({
        agency_name: [''], gstin: [''], phone: [''], email: [''], address: [''],
        default_booking_fee_pct: [20], default_markup_pct: [10], default_gst_pct: [5],
        default_quotation_valid_days: [7]
    });

    ngOnInit() {
        this.api.getSettings().subscribe(s => { if (s) this.form.patchValue(s); });
    }

    save() {
        this.saving.set(true);
        this.api.updateSettings(this.form.value).subscribe({
            next: () => { this.saving.set(false); this.saved.set(true); setTimeout(() => this.saved.set(false), 3000); },
            error: () => this.saving.set(false)
        });
    }
}
