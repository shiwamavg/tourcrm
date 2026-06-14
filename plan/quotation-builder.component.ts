// quotation-builder.component.ts
// Multi-step quotation builder using Angular 22 signals + reactive forms
import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators, AbstractControl } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';

@Component({
    selector: 'app-quotation-builder',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    template: `
    <div class="page-header">
        <h1>New Quotation</h1>
        <p class="text-muted">Step {{ currentStep() }} of 6</p>
    </div>

    <!-- Step Progress -->
    <div class="step-progress">
        @for (step of steps; track step.num) {
            <div class="step-item" [class.active]="currentStep() === step.num" [class.done]="currentStep() > step.num">
                <div class="step-circle">{{ step.num }}</div>
                <span>{{ step.label }}</span>
            </div>
        }
    </div>

    <form [formGroup]="form">

        <!-- Step 1: Trip Details -->
        @if (currentStep() === 1) {
        <div class="form-card">
            <h2>Trip Details</h2>
            <div class="form-grid-2">
                <div class="form-group">
                    <label>Destination *</label>
                    <select formControlName="destination_id" (change)="onDestinationChange($event)">
                        <option value="">Select destination</option>
                        @for (d of destinations(); track d.id) {
                            <option [value]="d.id">{{ d.name }}, {{ d.country }}</option>
                        }
                    </select>
                </div>
                <div class="form-group">
                    <label>Destination (free text)</label>
                    <input type="text" formControlName="destination_text" placeholder="Or type custom destination">
                </div>
                <div class="form-group">
                    <label>Trip Start Date *</label>
                    <input type="date" formControlName="trip_start_date" (change)="calcNights()">
                </div>
                <div class="form-group">
                    <label>Trip End Date *</label>
                    <input type="date" formControlName="trip_end_date" (change)="calcNights()">
                </div>
                @if (nights() > 0) {
                    <div class="info-badge" style="grid-column:span 2">🌙 {{ nights() }} nights</div>
                }
                <div class="form-group">
                    <label>Adults *</label>
                    <input type="number" formControlName="adults" min="1">
                </div>
                <div class="form-group">
                    <label>Children below 5</label>
                    <input type="number" formControlName="children_below_5" min="0">
                </div>
                <div class="form-group">
                    <label>Children above 5</label>
                    <input type="number" formControlName="children_above_5" min="0">
                </div>
                <div class="form-group">
                    <label>Number of Rooms</label>
                    <input type="number" formControlName="num_rooms" min="1">
                </div>
            </div>

            <div class="form-group mt-4">
                <label>Package Type *</label>
                <div class="checkbox-group">
                    @for (pkg of packageOptions; track pkg.value) {
                        <label class="checkbox-item">
                            <input type="radio" formControlName="package_type" [value]="pkg.value">
                            {{ pkg.label }}
                        </label>
                    }
                </div>
            </div>
        </div>
        }

        <!-- Step 2: Hotel Details -->
        @if (currentStep() === 2) {
        <div class="form-card">
            <div class="section-header">
                <h2>🏨 Hotel Details</h2>
                <button type="button" class="btn-outline" (click)="addHotel()">+ Add Hotel</button>
            </div>

            <div formArrayName="hotels">
                @for (hotel of hotelsArray.controls; track $index; let i = $index) {
                    <div class="line-item-card" [formGroupName]="i">
                        <div class="line-item-header">
                            <h3>Hotel {{ i + 1 }}</h3>
                            @if (hotelsArray.length > 1) {
                                <button type="button" class="btn-remove" (click)="removeHotel(i)">✕</button>
                            }
                        </div>
                        <div class="form-grid-3">
                            <div class="form-group">
                                <label>Hotel Name *</label>
                                <input type="text" formControlName="hotel_name" placeholder="Hotel name">
                            </div>
                            <div class="form-group">
                                <label>Star Rating</label>
                                <select formControlName="star_rating">
                                    <option value="">Select</option>
                                    @for (s of [1,2,3,4,5]; track s) {
                                        <option [value]="s">{{ s }} Star</option>
                                    }
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Room Type</label>
                                <select formControlName="room_type">
                                    <option value="standard">Standard</option>
                                    <option value="deluxe">Deluxe</option>
                                    <option value="premium">Premium</option>
                                    <option value="luxury">Luxury</option>
                                    <option value="suite">Suite</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Charge / Night (₹) *</label>
                                <input type="number" formControlName="charge_per_night" (input)="recalc()">
                            </div>
                            <div class="form-group">
                                <label>No. of Nights *</label>
                                <input type="number" formControlName="num_nights" [value]="nights()" (input)="recalc()">
                            </div>
                            <div class="form-group">
                                <label>Rooms</label>
                                <input type="number" formControlName="num_rooms" (input)="recalc()">
                            </div>
                            <div class="form-group">
                                <label>Meal Plan</label>
                                <select formControlName="meal_plan">
                                    <option value="none">No meals</option>
                                    <option value="breakfast">Breakfast only</option>
                                    <option value="breakfast_dinner">Breakfast + Dinner</option>
                                    <option value="all_inclusive">All Inclusive</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Special Charges (₹)</label>
                                <input type="number" formControlName="special_charges" (input)="recalc()">
                            </div>
                            <div class="form-group">
                                <label>Special Note</label>
                                <input type="text" formControlName="special_charges_note">
                            </div>
                        </div>
                        <div class="line-total">
                            Hotel {{ i+1 }} total: ₹{{ getHotelTotal(i) | number:'1.0-0' }}
                        </div>

                        <!-- Quick fill from master rates -->
                        @if (hotelMasterRates().length) {
                        <div class="form-group mt-2">
                            <label>Quick fill from master rates</label>
                            <select (change)="fillHotelFromMaster($event, i)">
                                <option value="">Select master rate...</option>
                                @for (r of hotelMasterRates(); track r.id) {
                                    <option [value]="r.id">{{ r.hotel_name }} — {{ r.room_type }} — ₹{{ r.charge_per_night }}/night</option>
                                }
                            </select>
                        </div>
                        }
                    </div>
                }
            </div>
        </div>
        }

        <!-- Step 3: Car Details -->
        @if (currentStep() === 3) {
        <div class="form-card">
            <div class="section-header">
                <h2>🚗 Car / Cab Details</h2>
                <button type="button" class="btn-outline" (click)="addCar()">+ Add Car</button>
            </div>

            <div formArrayName="cars">
                @for (car of carsArray.controls; track $index; let i = $index) {
                    <div class="line-item-card" [formGroupName]="i">
                        <div class="line-item-header">
                            <h3>Car {{ i + 1 }}</h3>
                            @if (carsArray.length > 1) {
                                <button type="button" class="btn-remove" (click)="removeCar(i)">✕</button>
                            }
                        </div>
                        <div class="form-grid-3">
                            <div class="form-group">
                                <label>Car Type *</label>
                                <input type="text" formControlName="car_type_name" placeholder="e.g. Innova Crysta">
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
                                <label>Charge / Day (₹) *</label>
                                <input type="number" formControlName="charge_per_day" (input)="recalc()">
                            </div>
                            <div class="form-group">
                                <label>No. of Days *</label>
                                <input type="number" formControlName="num_days" (input)="recalc()">
                            </div>
                            <div class="form-group">
                                <label>KM Limit / Day</label>
                                <input type="number" formControlName="km_limit_per_day">
                            </div>
                            <div class="form-group">
                                <label>Extra Charge / KM (₹)</label>
                                <input type="number" formControlName="extra_charge_per_km" (input)="recalc()">
                            </div>
                            <div class="form-group">
                                <label>Estimated Extra KM</label>
                                <input type="number" formControlName="estimated_extra_km" (input)="recalc()">
                            </div>
                        </div>
                        <div class="line-total">Car {{ i+1 }} total: ₹{{ getCarTotal(i) | number:'1.0-0' }}</div>

                        @if (carMasterRates().length) {
                        <div class="form-group mt-2">
                            <label>Quick fill from master rates</label>
                            <select (change)="fillCarFromMaster($event, i)">
                                <option value="">Select master rate...</option>
                                @for (r of carMasterRates(); track r.id) {
                                    <option [value]="r.id">{{ r.car_type_name }} ({{ r.car_class }}) — ₹{{ r.charge_per_day }}/day</option>
                                }
                            </select>
                        </div>
                        }
                    </div>
                }
            </div>
        </div>
        }

        <!-- Step 4: Flight Details -->
        @if (currentStep() === 4) {
        <div class="form-card">
            <div class="section-header">
                <h2>✈ Flight Details</h2>
                <button type="button" class="btn-outline" (click)="addFlight()">+ Add Flight</button>
            </div>

            <div formArrayName="flights">
                @for (flight of flightsArray.controls; track $index; let i = $index) {
                    <div class="line-item-card" [formGroupName]="i">
                        <div class="line-item-header">
                            <h3>Flight {{ i + 1 }}</h3>
                            @if (flightsArray.length > 1) {
                                <button type="button" class="btn-remove" (click)="removeFlight(i)">✕</button>
                            }
                        </div>
                        <div class="form-grid-3">
                            <div class="form-group">
                                <label>Airline</label>
                                <input type="text" formControlName="airline" placeholder="IndiGo, Air India...">
                            </div>
                            <div class="form-group">
                                <label>Route</label>
                                <input type="text" formControlName="route" placeholder="DEL → GOA">
                            </div>
                            <div class="form-group">
                                <label>Date</label>
                                <input type="date" formControlName="flight_date">
                            </div>
                            <div class="form-group">
                                <label>Fare / Adult (₹)</label>
                                <input type="number" formControlName="fare_per_adult" (input)="recalc()">
                            </div>
                            <div class="form-group">
                                <label>Fare / Child (₹)</label>
                                <input type="number" formControlName="fare_per_child" (input)="recalc()">
                            </div>
                        </div>
                    </div>
                }
            </div>
        </div>
        }

        <!-- Step 5: Miscellaneous -->
        @if (currentStep() === 5) {
        <div class="form-card">
            <div class="section-header">
                <h2>📋 Miscellaneous Charges</h2>
                <button type="button" class="btn-outline" (click)="addMisc()">+ Add Line</button>
            </div>

            <div formArrayName="misc">
                @for (m of miscArray.controls; track $index; let i = $index) {
                    <div class="misc-row" [formGroupName]="i">
                        <input type="text" formControlName="label" placeholder="e.g. Guide charges" style="flex:2">
                        <input type="number" formControlName="amount" placeholder="Amount ₹" style="flex:1" (input)="recalc()">
                        <button type="button" class="btn-remove" (click)="removeMisc(i)">✕</button>
                    </div>
                }
            </div>

            <div class="markup-row form-grid-2 mt-4">
                <div class="form-group">
                    <label>Profit Markup (%)</label>
                    <input type="number" formControlName="markup_pct" min="0" max="100" (input)="recalc()">
                </div>
                <div class="form-group">
                    <label>GST (%)</label>
                    <input type="number" formControlName="gst_pct" min="0" max="28" (input)="recalc()">
                </div>
            </div>
        </div>
        }

        <!-- Step 6: Summary -->
        @if (currentStep() === 6) {
        <div class="form-card">
            <h2>📊 Grand Summary</h2>
            <div class="summary-table">
                @if (totals().hotelTotal > 0) {
                    <div class="summary-row"><span>Hotels</span><span>₹{{ totals().hotelTotal | number:'1.0-0' }}</span></div>
                }
                @if (totals().carTotal > 0) {
                    <div class="summary-row"><span>Transport</span><span>₹{{ totals().carTotal | number:'1.0-0' }}</span></div>
                }
                @if (totals().flightTotal > 0) {
                    <div class="summary-row"><span>Flights</span><span>₹{{ totals().flightTotal | number:'1.0-0' }}</span></div>
                }
                @if (totals().miscTotal > 0) {
                    <div class="summary-row"><span>Other charges</span><span>₹{{ totals().miscTotal | number:'1.0-0' }}</span></div>
                }
                <div class="summary-row subtotal"><span>Subtotal</span><span>₹{{ totals().subtotal | number:'1.0-0' }}</span></div>
                @if (totals().markupAmount > 0) {
                    <div class="summary-row"><span>Markup ({{ form.value.markup_pct }}%)</span><span>₹{{ totals().markupAmount | number:'1.0-0' }}</span></div>
                }
                @if (totals().gstAmount > 0) {
                    <div class="summary-row"><span>GST ({{ form.value.gst_pct }}%)</span><span>₹{{ totals().gstAmount | number:'1.0-0' }}</span></div>
                }
                <div class="summary-row grand-total"><span>Grand Total</span><span>₹{{ totals().grandTotal | number:'1.0-0' }}</span></div>
            </div>

            <div class="form-group mt-4">
                <label>Valid Till</label>
                <input type="date" formControlName="valid_till">
            </div>
            <div class="form-group">
                <label>Terms & Notes for Customer</label>
                <textarea formControlName="terms_notes" rows="4" placeholder="Inclusions, exclusions, cancellation policy..."></textarea>
            </div>
        </div>
        }

        <!-- Navigation -->
        <div class="step-nav">
            @if (currentStep() > 1) {
                <button type="button" class="btn-outline" (click)="prevStep()">← Back</button>
            }
            @if (currentStep() < 6) {
                <button type="button" class="btn-primary" (click)="nextStep()">Continue →</button>
            }
            @if (currentStep() === 6) {
                <button type="button" class="btn-success" (click)="saveQuotation('draft')" [disabled]="saving()">
                    {{ saving() ? 'Saving…' : 'Save Draft' }}
                </button>
                <button type="button" class="btn-primary" (click)="saveQuotation('sent')" [disabled]="saving()">
                    {{ saving() ? 'Saving…' : 'Save & Mark as Sent' }}
                </button>
            }
        </div>
    </form>
    `
})
export class QuotationBuilderComponent implements OnInit {
    private fb = inject(FormBuilder);
    private api = inject(ApiService);
    private router = inject(Router);
    private route = inject(ActivatedRoute);

    currentStep = signal(1);
    saving = signal(false);
    destinations = signal<any[]>([]);
    hotelMasterRates = signal<any[]>([]);
    carMasterRates = signal<any[]>([]);

    steps = [
        { num: 1, label: 'Trip' },
        { num: 2, label: 'Hotels' },
        { num: 3, label: 'Cars' },
        { num: 4, label: 'Flights' },
        { num: 5, label: 'Misc' },
        { num: 6, label: 'Summary' }
    ];

    packageOptions = [
        { value: 'hotel', label: 'Hotel only' },
        { value: 'car', label: 'Car only' },
        { value: 'flight', label: 'Flight only' },
        { value: 'hotel_car', label: 'Hotel + Car' },
        { value: 'hotel_flight', label: 'Hotel + Flight' },
        { value: 'car_flight', label: 'Car + Flight' },
        { value: 'hotel_car_flight', label: 'Hotel + Car + Flight' }
    ];

    form: FormGroup = this.fb.group({
        lead_id: [this.route.snapshot.queryParams['lead_id'] || '', Validators.required],
        destination_id: [''],
        destination_text: [''],
        trip_start_date: ['', Validators.required],
        trip_end_date: ['', Validators.required],
        adults: [1, [Validators.required, Validators.min(1)]],
        children_below_5: [0],
        children_above_5: [0],
        num_rooms: [1],
        package_type: ['hotel_car', Validators.required],
        markup_pct: [10],
        gst_pct: [5],
        valid_till: [''],
        terms_notes: [''],
        hotels: this.fb.array([this.newHotel()]),
        cars: this.fb.array([this.newCar()]),
        flights: this.fb.array([this.newFlight()]),
        misc: this.fb.array([
            this.fb.group({ label: ['Guide charges'], amount: [0] }),
            this.fb.group({ label: ['Entrance & monument fees'], amount: [0] })
        ])
    });

    nights = computed(() => {
        const s = this.form.get('trip_start_date')?.value;
        const e = this.form.get('trip_end_date')?.value;
        if (!s || !e) return 0;
        const diff = (new Date(e).getTime() - new Date(s).getTime()) / 86400000;
        return Math.max(0, Math.round(diff));
    });

    totals = computed(() => {
        const v = this.form.value;
        const hotelTotal = (v.hotels || []).reduce((sum: number, h: any) =>
            sum + (h.charge_per_night * h.num_nights * (h.num_rooms || 1)) + (h.special_charges || 0), 0);
        const carTotal = (v.cars || []).reduce((sum: number, c: any) =>
            sum + (c.charge_per_day * c.num_days) + ((c.estimated_extra_km || 0) * (c.extra_charge_per_km || 0)), 0);
        const flightTotal = (v.flights || []).reduce((sum: number, f: any) =>
            sum + (f.fare_per_adult * (v.adults || 1)) + (f.fare_per_child * (v.children_above_5 || 0)), 0);
        const miscTotal = (v.misc || []).reduce((sum: number, m: any) => sum + (m.amount || 0), 0);
        const subtotal = hotelTotal + carTotal + flightTotal + miscTotal;
        const markupAmount = subtotal * (v.markup_pct || 0) / 100;
        const gstBase = subtotal + markupAmount;
        const gstAmount = gstBase * (v.gst_pct || 0) / 100;
        const grandTotal = gstBase + gstAmount;
        return { hotelTotal, carTotal, flightTotal, miscTotal, subtotal, markupAmount, gstAmount, grandTotal };
    });

    get hotelsArray() { return this.form.get('hotels') as FormArray; }
    get carsArray() { return this.form.get('cars') as FormArray; }
    get flightsArray() { return this.form.get('flights') as FormArray; }
    get miscArray() { return this.form.get('misc') as FormArray; }

    ngOnInit() {
        this.api.getDestinations().subscribe(d => this.destinations.set(d));
    }

    onDestinationChange(event: Event) {
        const id = (event.target as HTMLSelectElement).value;
        if (id) {
            this.api.getHotelRatesForDest(id).subscribe(r => this.hotelMasterRates.set(r));
            this.api.getCarRatesForDest(id).subscribe(r => this.carMasterRates.set(r));
        }
    }

    calcNights() { /* triggers nights signal recompute */ }
    recalc() { /* triggers totals signal recompute */ }

    getHotelTotal(i: number): number {
        const h = this.hotelsArray.at(i).value;
        return (h.charge_per_night * h.num_nights * (h.num_rooms || 1)) + (h.special_charges || 0);
    }

    getCarTotal(i: number): number {
        const c = this.carsArray.at(i).value;
        return (c.charge_per_day * c.num_days) + ((c.estimated_extra_km || 0) * (c.extra_charge_per_km || 0));
    }

    fillHotelFromMaster(event: Event, index: number) {
        const id = (event.target as HTMLSelectElement).value;
        const rate = this.hotelMasterRates().find(r => r.id === id);
        if (!rate) return;
        this.hotelsArray.at(index).patchValue({
            hotel_rate_id: rate.id,
            hotel_name: rate.hotel_name,
            star_rating: rate.star_rating,
            room_type: rate.room_type,
            meal_plan: rate.meal_plan,
            charge_per_night: rate.charge_per_night,
            num_nights: this.nights()
        });
    }

    fillCarFromMaster(event: Event, index: number) {
        const id = (event.target as HTMLSelectElement).value;
        const rate = this.carMasterRates().find(r => r.id === id);
        if (!rate) return;
        this.carsArray.at(index).patchValue({
            car_rate_id: rate.id,
            car_type_name: rate.car_type_name,
            car_class: rate.car_class,
            charge_per_day: rate.charge_per_day,
            km_limit_per_day: rate.km_limit_per_day,
            extra_charge_per_km: rate.extra_charge_per_km,
            num_days: this.nights() || 1
        });
    }

    newHotel() {
        return this.fb.group({
            hotel_rate_id: [null],
            hotel_name: ['', Validators.required],
            star_rating: [''],
            room_type: ['deluxe'],
            meal_plan: ['breakfast'],
            charge_per_night: [0, Validators.required],
            num_nights: [1, Validators.required],
            num_rooms: [1],
            special_charges: [0],
            special_charges_note: ['']
        });
    }

    newCar() {
        return this.fb.group({
            car_rate_id: [null],
            car_type_name: ['', Validators.required],
            car_class: ['standard'],
            charge_per_day: [0, Validators.required],
            num_days: [1, Validators.required],
            km_limit_per_day: [250],
            extra_charge_per_km: [0],
            estimated_extra_km: [0]
        });
    }

    newFlight() {
        return this.fb.group({
            airline: [''],
            route: [''],
            flight_date: [''],
            fare_per_adult: [0],
            fare_per_child: [0]
        });
    }

    addHotel()  { this.hotelsArray.push(this.newHotel()); }
    addCar()    { this.carsArray.push(this.newCar()); }
    addFlight() { this.flightsArray.push(this.newFlight()); }
    addMisc()   { this.miscArray.push(this.fb.group({ label: [''], amount: [0] })); }

    removeHotel(i: number)  { this.hotelsArray.removeAt(i); }
    removeCar(i: number)    { this.carsArray.removeAt(i); }
    removeFlight(i: number) { this.flightsArray.removeAt(i); }
    removeMisc(i: number)   { this.miscArray.removeAt(i); }

    nextStep() {
        const pkg = this.form.value.package_type || '';
        let next = this.currentStep() + 1;
        // Skip hotel step if no hotel in package
        if (next === 2 && !pkg.includes('hotel')) next = 3;
        // Skip car step if no car in package
        if (next === 3 && !pkg.includes('car')) next = 4;
        // Skip flight step if no flight in package
        if (next === 4 && !pkg.includes('flight')) next = 5;
        this.currentStep.set(next);
    }

    prevStep() {
        const pkg = this.form.value.package_type || '';
        let prev = this.currentStep() - 1;
        if (prev === 4 && !pkg.includes('flight')) prev = 3;
        if (prev === 3 && !pkg.includes('car')) prev = 2;
        if (prev === 2 && !pkg.includes('hotel')) prev = 1;
        this.currentStep.set(Math.max(1, prev));
    }

    saveQuotation(status: string) {
        this.saving.set(true);
        const payload = { ...this.form.value, status };
        this.api.createQuotation(payload).subscribe({
            next: (q) => {
                this.saving.set(false);
                this.router.navigate(['/quotations', q.id]);
            },
            error: (err) => {
                this.saving.set(false);
                console.error('Save failed', err);
                alert('Failed to save quotation. Please try again.');
            }
        });
    }
}
