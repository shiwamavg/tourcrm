// Quotation Builder — Angular 22 multi-step form (signals + reactive forms)
import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule, DecimalPipe } from '@angular/common';
import {
    FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule, AbstractControl
} from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import {
    Destination, HotelRate, CarRate,
    Quotation, QuotationStatus
} from '../../core/models';
import { HotelRateModalComponent } from '../../shared/components/hotel-rate-modal.component';
import { CarRateModalComponent } from '../../shared/components/car-rate-modal.component';
import { DestinationModalComponent } from '../../shared/components/destination-modal.component';
import { DaywiseItineraryComponent } from './daywise-itinerary.component';
import { CurrencyService } from '../../core/services/competitor-features.service';

type PackageType =
    | 'hotel' | 'car' | 'flight'
    | 'hotel_car' | 'hotel_flight' | 'car_flight' | 'hotel_car_flight';

@Component({
    selector: 'app-quotation-builder',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, DecimalPipe, HotelRateModalComponent, CarRateModalComponent, DestinationModalComponent, DaywiseItineraryComponent],
    template: `
    <div class="page-header">
        <div>
            <h1>{{ editId() ? 'Edit Quotation' : 'New Quotation' }}</h1>
            <p>Step {{ visibleStepNum() }} of {{ visibleSteps().length }} — {{ stepLabel() }}</p>
        </div>
        <div>
            <span class="info-badge">Live total: {{ getBillingCurrencySymbol() }}{{ totals().grandTotal | number:'1.0-0' }}</span>
        </div>
    </div>

    <!-- ── Stepper ─────────────────────────────────────── -->
    <div class="step-progress">
        @for (s of visibleSteps(); track s.num) {
            <div class="step-item"
                 [class.active]="currentStep() === s.num"
                 [class.done]="currentStep() > s.num">
                <div class="step-circle">{{ currentStep() > s.num ? '✓' : $index + 1 }}</div>
                <span>{{ s.label }}</span>
            </div>
        }
    </div>

    @if (loading()) {
        <div class="card text-center"><span class="spinner"></span> Loading quotation…</div>
    }
    <form [formGroup]="form">

        <!-- ── STEP 1: Customer + Trip Details ─────────── -->
        @if (currentStep() === 1) {
        <div class="card">
            <h2>Customer & Trip Details</h2>
            <div class="form-group" style="margin-bottom: 1.5rem; background: var(--gray-50); padding: 1rem; border-radius: 6px;">
                <label style="font-weight: 600; color: var(--primary);">Quick Start: Select a Predefined Package (Optional)</label>
                <select (change)="onPackageSelect($event)" class="master-select">
                    <option value="">— Start from scratch —</option>
                    @for (p of predefinedPackages(); track p.id) {
                        <option [value]="p.id">{{ p.title }} ({{ p.duration_days }} Days) — ₹{{ p.price | number:'1.0-0' }} / person</option>
                    }
                </select>
                <p class="text-xs mt-1 text-gray-500">Selecting a package will auto-fill hotels, transport, itinerary, and add a lumped "Package Base Price" charge.</p>
            </div>
            <div class="form-grid-2">
                <div class="form-group">
                    <label>Customer Name <span class="req">*</span></label>
                    <input type="text" formControlName="customer_name" placeholder="Full name"
                           [class.invalid]="isInvalid(form.get('customer_name'))">
                    @if (isInvalid(form.get('customer_name'))) {
                        <span class="field-error">{{ errorMsg(form.get('customer_name')) }}</span>
                    }
                </div>
                <div class="form-group">
                    <label>Phone <span class="req">*</span></label>
                    <input type="tel" formControlName="customer_phone" placeholder="10-digit number"
                           [class.invalid]="isInvalid(form.get('customer_phone'))">
                    @if (isInvalid(form.get('customer_phone'))) {
                        <span class="field-error">{{ errorMsg(form.get('customer_phone')) }}</span>
                    }
                </div>
                <div class="form-group">
                    <label>Email</label>
                    <input type="email" formControlName="customer_email" placeholder="optional"
                           [class.invalid]="isInvalid(form.get('customer_email'))">
                    @if (isInvalid(form.get('customer_email'))) {
                        <span class="field-error">{{ errorMsg(form.get('customer_email')) }}</span>
                    }
                </div>
                <div class="form-group">
                    <label>Destination <span class="req">*</span></label>
                    <div class="flex gap-2">
                        <select formControlName="destination_id" (change)="onDestinationChange($event)"
                                [class.invalid]="isInvalid(form.get('destination_id'))" style="flex:1">
                            <option [ngValue]="null">— select —</option>
                            @for (d of destinations(); track d.id) {
                                <option [ngValue]="d.id">{{ d.name }}, {{ d.country }}</option>
                            }
                        </select>
                        <button type="button" class="btn btn-outline" (click)="showDestinationModal.set(true)" title="Add new destination">+</button>
                    </div>
                    @if (isInvalid(form.get('destination_id'))) {
                        <span class="field-error">{{ errorMsg(form.get('destination_id')) }}</span>
                    }
                </div>
                <div class="form-group">
                    <label>Trip Start Date <span class="req">*</span></label>
                    <input type="date" formControlName="trip_start_date" (change)="syncNights()"
                           [class.invalid]="isInvalid(form.get('trip_start_date'))">
                    @if (isInvalid(form.get('trip_start_date'))) {
                        <span class="field-error">{{ errorMsg(form.get('trip_start_date')) }}</span>
                    }
                </div>
                <div class="form-group">
                    <label>Trip End Date <span class="req">*</span></label>
                    <input type="date" formControlName="trip_end_date" (change)="syncNights()"
                           [class.invalid]="isInvalid(form.get('trip_end_date'))">
                    @if (isInvalid(form.get('trip_end_date'))) {
                        <span class="field-error">{{ errorMsg(form.get('trip_end_date')) }}</span>
                    }
                </div>
                @if (nights() > 0) {
                    <div class="info-badge" style="grid-column: span 2">🌙 {{ nights() }} night(s)</div>
                }
                <div class="form-group">
                    <label>Adults <span class="req">*</span></label>
                    <input type="number" formControlName="adults" min="1"
                           [class.invalid]="isInvalid(form.get('adults'))">
                    @if (isInvalid(form.get('adults'))) {
                        <span class="field-error">{{ errorMsg(form.get('adults')) }}</span>
                    }
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
                    <label>Billing Currency</label>
                    <select formControlName="billing_currency" (change)="onBillingCurrencyChange()">
                        @for (curr of currenciesList(); track curr.code) {
                            <option [value]="curr.code">{{ curr.code }} ({{ curr.symbol }}) — Rate: {{ curr.exchange_rate }}</option>
                        }
                    </select>
                </div>
                <div class="form-group">
                    <label>Number of Rooms</label>
                    <input type="number" formControlName="num_rooms" min="1">
                </div>
            </div>

            <div class="form-group mt-3">
                <label>Package Type <span class="req">*</span></label>
                <div class="checkbox-group">
                    @for (p of packageOptions; track p.value) {
                        <label class="checkbox-item">
                            <input type="radio" formControlName="package_type" [value]="p.value">
                            {{ p.label }}
                        </label>
                    }
                </div>
            </div>
        </div>
        }

        <!-- ── STEP 2: Hotels ──────────────────────────── -->
        @if (currentStep() === 2 && hasHotel()) {
        <div class="card">
            <div class="section-header">
                <h2 style="margin:0;border:none;padding:0">🏨 Hotel Details</h2>
                <button type="button" class="btn btn-outline btn-sm" (click)="addHotel()">+ Add blank hotel</button>
            </div>

            <div formArrayName="hotels">
                @for (h of hotelsArray.controls; track $index; let i = $index) {
                    <div class="line-item-card" [formGroupName]="i">
                        <div class="line-item-header">
                            <h3 style="margin:0">Hotel {{ i + 1 }}</h3>
                            @if (hotelsArray.length > 1) {
                                <button type="button" class="btn-remove" (click)="removeHotel(i)">✕</button>
                            }
                        </div>

                        <!-- Dropdown to pick from master rates -->
                        <div class="form-group" style="margin-bottom:12px">
                            <label>Select from master rates</label>
                            <div class="flex gap-2">
                                <select class="master-select" (change)="onHotelDropdownChange($event, i)">
                                    <option value="">— Choose a hotel or add new —</option>
                                    @for (r of hotelMasterRates(); track r.id) {
                                        <option [value]="r.id">{{ r.hotel_name }} ({{ r.star_rating }}★ {{ r.room_type }}) — ₹{{ r.charge_per_night | number:'1.0-0' }}/night</option>
                                    }
                                    <option value="__add_new__">+ Add New Hotel Rate</option>
                                </select>
                            </div>
                        </div>

                        <div class="form-grid-3">
                            <div class="form-group">
                                <label>Hotel Name <span class="req">*</span></label>
                                <input type="text" formControlName="hotel_name"
                                       [class.invalid]="isInvalid(h.get('hotel_name'))">
                                @if (isInvalid(h.get('hotel_name'))) {
                                    <span class="field-error">{{ errorMsg(h.get('hotel_name')) }}</span>
                                }
                            </div>
                            <div class="form-group">
                                <label>Star Rating</label>
                                <select formControlName="star_rating">
                                    <option [ngValue]="null">—</option>
                                    @for (s of [1,2,3,4,5]; track s) {
                                        <option [ngValue]="s">{{ s }} Star</option>
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
                                <label>Charge / Night <span class="req">*</span></label>
                                <div class="flex gap-2">
                                    <select formControlName="currency_code" style="max-width:80px" (change)="onLineCurrencyChange(i, 'hotel')">
                                        @for (curr of currenciesList(); track curr.code) {
                                            <option [value]="curr.code">{{ curr.code }}</option>
                                        }
                                    </select>
                                    <input type="number" formControlName="charge_per_night" min="0" step="1" style="flex:1"
                                           [class.invalid]="isInvalid(h.get('charge_per_night'))">
                                </div>
                                @if (h.get('currency_code')?.value !== form.get('billing_currency')?.value) {
                                    <small class="text-muted" style="display:block;margin-top:2px">≈ {{ getBillingCurrencySymbol() }}{{ getConvertedLineTotalLabel(h) }} / night</small>
                                }
                                @if (isInvalid(h.get('charge_per_night'))) {
                                    <span class="field-error">{{ errorMsg(h.get('charge_per_night')) }}</span>
                                }
                            </div>
                            <div class="form-group">
                                <label>No. of Nights <span class="req">*</span></label>
                                <input type="number" formControlName="num_nights" min="1" step="1"
                                       [class.invalid]="isInvalid(h.get('num_nights'))">
                                @if (isInvalid(h.get('num_nights'))) {
                                    <span class="field-error">{{ errorMsg(h.get('num_nights')) }}</span>
                                }
                            </div>
                            <div class="form-group">
                                <label>Rooms</label>
                                <input type="number" formControlName="num_rooms" min="1" step="1">
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
                                <label>Special Charges (₹)</label>
                                <input type="number" formControlName="special_charges" min="0" step="1">
                            </div>
                            <div class="form-group">
                                <label>Special Note</label>
                                <input type="text" formControlName="special_charges_note" placeholder="e.g. Honeymoon setup">
                            </div>
                        </div>
                        <div class="line-total">
                            Hotel {{ i + 1 }} total: {{ getBillingCurrencySymbol() }}{{ hotelLineTotal(i) | number:'1.0-0' }}
                        </div>
                    </div>
                }
            </div>

            @if (showHotelModal()) {
                <app-hotel-rate-modal
                    [destinationId]="form.value.destination_id"
                    [destinations]="destinations()"
                    (close)="showHotelModal.set(false)"
                    (saved)="onHotelModalSaved($event)" />
            }
        </div>
        }

        <!-- ── STEP 3: Cars ────────────────────────────── -->
        @if (currentStep() === 3 && hasCar()) {
        <div class="card">
            <div class="section-header">
                <h2 style="margin:0;border:none;padding:0">🚗 Car / Cab Details</h2>
                <button type="button" class="btn btn-outline btn-sm" (click)="addCar()">+ Add blank car</button>
            </div>

            <div formArrayName="cars">
                @for (c of carsArray.controls; track $index; let i = $index) {
                    <div class="line-item-card" [formGroupName]="i">
                        <div class="line-item-header">
                            <h3 style="margin:0">Car {{ i + 1 }}</h3>
                            @if (carsArray.length > 1) {
                                <button type="button" class="btn-remove" (click)="removeCar(i)">✕</button>
                            }
                        </div>

                        <!-- Dropdown to pick from master rates -->
                        <div class="form-group" style="margin-bottom:12px">
                            <label>Select from master rates</label>
                            <div class="flex gap-2">
                                <select class="master-select" (change)="onCarDropdownChange($event, i)">
                                    <option value="">— Choose a car or add new —</option>
                                    @for (r of carMasterRates(); track r.id) {
                                        <option [value]="r.id">{{ r.car_type_name }} ({{ r.car_class }}) — ₹{{ r.charge_per_day | number:'1.0-0' }}/day</option>
                                    }
                                    <option value="__add_new__">+ Add New Car Rate</option>
                                </select>
                            </div>
                        </div>

                        <div class="form-grid-3">
                            <div class="form-group">
                                <label>Car Type <span class="req">*</span></label>
                                <input type="text" formControlName="car_type_name" placeholder="e.g. Innova Crysta"
                                       [class.invalid]="isInvalid(c.get('car_type_name'))">
                                @if (isInvalid(c.get('car_type_name'))) {
                                    <span class="field-error">{{ errorMsg(c.get('car_type_name')) }}</span>
                                }
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
                                <label>Charge / Day <span class="req">*</span></label>
                                <div class="flex gap-2">
                                    <select formControlName="currency_code" style="max-width:80px" (change)="onLineCurrencyChange(i, 'car')">
                                        @for (curr of currenciesList(); track curr.code) {
                                            <option [value]="curr.code">{{ curr.code }}</option>
                                        }
                                    </select>
                                    <input type="number" formControlName="charge_per_day" min="0" step="1" style="flex:1"
                                           [class.invalid]="isInvalid(c.get('charge_per_day'))">
                                </div>
                                @if (c.get('currency_code')?.value !== form.get('billing_currency')?.value) {
                                    <small class="text-muted" style="display:block;margin-top:2px">≈ {{ getBillingCurrencySymbol() }}{{ getConvertedLineTotalLabel(c) }} / day</small>
                                }
                                @if (isInvalid(c.get('charge_per_day'))) {
                                    <span class="field-error">{{ errorMsg(c.get('charge_per_day')) }}</span>
                                }
                            </div>
                            <div class="form-group">
                                <label>No. of Days <span class="req">*</span></label>
                                <input type="number" formControlName="num_days" min="1" step="1"
                                       [class.invalid]="isInvalid(c.get('num_days'))">
                                @if (isInvalid(c.get('num_days'))) {
                                    <span class="field-error">{{ errorMsg(c.get('num_days')) }}</span>
                                }
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
                                <label>Estimated Extra KM</label>
                                <input type="number" formControlName="estimated_extra_km" min="0" step="1">
                            </div>
                        </div>
                        <div class="line-total">
                            Car {{ i + 1 }} total: {{ getBillingCurrencySymbol() }}{{ carLineTotal(i) | number:'1.0-0' }}
                        </div>
                    </div>
                }
            </div>

            @if (showCarModal()) {
                <app-car-rate-modal
                    [destinationId]="form.value.destination_id"
                    [destinations]="destinations()"
                    (close)="showCarModal.set(false)"
                    (saved)="onCarModalSaved($event)" />
            }
        </div>
        }

        <!-- ── STEP 4: Flights ─────────────────────────── -->
        @if (currentStep() === 4 && hasFlight()) {
        <div class="card">
            <div class="section-header">
                <h2 style="margin:0;border:none;padding:0">✈ Flight Details</h2>
                <button type="button" class="btn btn-outline btn-sm" (click)="addFlight()">+ Add Flight</button>
            </div>

            <div formArrayName="flights">
                @for (f of flightsArray.controls; track $index; let i = $index) {
                    <div class="line-item-card" [formGroupName]="i">
                        <div class="line-item-header">
                            <h3 style="margin:0">Flight {{ i + 1 }}</h3>
                            @if (flightsArray.length > 1) {
                                <button type="button" class="btn-remove" (click)="removeFlight(i)">✕</button>
                            }
                        </div>
                        <div class="form-grid-3">
                            <div class="form-group">
                                <label>Airline</label>
                                <input type="text" formControlName="airline" placeholder="IndiGo, Air India…">
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
                                <input type="number" formControlName="fare_per_adult" min="0">
                            </div>
                            <div class="form-group">
                                <label>Fare / Child (₹)</label>
                                <input type="number" formControlName="fare_per_child" min="0">
                            </div>
                        </div>
                        <div class="line-total">
                            Flight {{ i + 1 }} total: {{ getBillingCurrencySymbol() }}{{ flightLineTotal(i) | number:'1.0-0' }}
                        </div>
                    </div>
                }
            </div>
        </div>
        }

        <!-- ── STEP 5: Daywise Itinerary ────────────────── -->
        @if (currentStep() === 5) {
            <div class="card">
                <app-daywise-itinerary
                    [quoteId]="editId() || 0"
                    [startDate]="form.value.trip_start_date"
                    [endDate]="form.value.trip_end_date"
                    [leadId]="form.value.lead_id || 0"
                    [destinationId]="form.value.destination_id || 0"
                    [quoteHotels]="form.value.hotels"
                    [quoteCars]="form.value.cars"
                    [isBuilder]="true"
                    [initialDays]="builderDays()"
                    (daysChange)="onDaywiseChange($event)" />
            </div>
        }

        <!-- ── STEP 6: Misc + Markup/GST ────────────────── -->
        @if (currentStep() === 6) {
        <div class="card">
            <div class="section-header">
                <h2 style="margin:0;border:none;padding:0">📋 Miscellaneous & Charges</h2>
                <button type="button" class="btn btn-outline btn-sm" (click)="addMisc()">+ Add Line</button>
            </div>

            <div formArrayName="misc">
                @for (m of miscArray.controls; track $index; let i = $index) {
                    <div class="flex" style="margin-bottom:8px" [formGroupName]="i">
                        <input type="text" formControlName="label" placeholder="e.g. Guide charges" style="flex:2">
                        <input type="number" formControlName="amount" placeholder="Amount ₹" min="0" style="flex:1">
                        <button type="button" class="btn-remove" (click)="removeMisc(i)">✕</button>
                    </div>
                }
            </div>

            <div class="form-grid-2 mt-3">
                <div class="form-group">
                    <label>Profit Markup (%)</label>
                    <input type="number" formControlName="markup_pct" min="0" max="100" step="0.5">
                </div>
                <div class="form-group">
                    <label>GST (%)</label>
                    <input type="number" formControlName="gst_pct" min="0" max="28" step="0.5">
                </div>
                <div class="form-group">
                    <label>Valid Till</label>
                    <input type="date" formControlName="valid_till">
                </div>
                <div class="form-group">
                    <label>Internal Notes (not shown to customer)</label>
                    <input type="text" formControlName="internal_notes">
                </div>
            </div>

            <div class="form-group mt-2">
                <label>Terms & Notes for Customer</label>
                <textarea formControlName="terms_notes" rows="4"
                          placeholder="Inclusions, exclusions, cancellation policy…"></textarea>
            </div>
        </div>
        }

        <!-- ── STEP 7: Review & Send ───────────────────── -->
        @if (currentStep() === 7) {
        <div class="card">
            <h2>📊 Grand Summary</h2>

            @if (hotelsArray.length && hasHotel()) {
                <h3 class="mt-2">Hotels</h3>
                <table class="data-table">
                    <thead><tr><th>Hotel</th><th>Room</th><th>Meal</th><th class="num">Nights × Rooms</th><th class="num">Rate</th><th class="num">Total</th></tr></thead>
                    <tbody>
                        @for (h of form.value.hotels; track $index; let i = $index) {
                            <tr>
                                <td>{{ h.hotel_name }} @if (h.star_rating) {<small> {{ h.star_rating }}★</small>}</td>
                                <td>{{ h.room_type }}</td>
                                <td>{{ formatMeal(h.meal_plan) }}</td>
                                <td class="num">{{ h.num_nights }} × {{ h.num_rooms || 1 }}</td>
                                <td class="num">₹{{ h.charge_per_night | number:'1.0-0' }}</td>
                                <td class="num">₹{{ hotelLineTotal(i) | number:'1.0-0' }}</td>
                            </tr>
                        }
                    </tbody>
                </table>
            }

            @if (carsArray.length && hasCar()) {
                <h3 class="mt-3">Transport</h3>
                <table class="data-table">
                    <thead><tr><th>Car</th><th>Class</th><th class="num">Days</th><th class="num">Rate</th><th class="num">Extra KM</th><th class="num">Total</th></tr></thead>
                    <tbody>
                        @for (c of form.value.cars; track $index; let i = $index) {
                            <tr>
                                <td>{{ c.car_type_name }}</td>
                                <td>{{ c.car_class }}</td>
                                <td class="num">{{ c.num_days }}</td>
                                <td class="num">₹{{ c.charge_per_day | number:'1.0-0' }}/d</td>
                                <td class="num">{{ c.estimated_extra_km || 0 }} km × ₹{{ c.extra_charge_per_km | number:'1.0-2' }}</td>
                                <td class="num">₹{{ carLineTotal(i) | number:'1.0-0' }}</td>
                            </tr>
                        }
                    </tbody>
                </table>
            }

            @if (flightsArray.length && hasFlight()) {
                <h3 class="mt-3">Flights</h3>
                <table class="data-table">
                    <thead><tr><th>Airline</th><th>Route</th><th>Date</th><th class="num">Adult fare</th><th class="num">Child fare</th><th class="num">Total</th></tr></thead>
                    <tbody>
                        @for (f of form.value.flights; track $index; let i = $index) {
                            <tr>
                                <td>{{ f.airline }}</td>
                                <td>{{ f.route }}</td>
                                <td>{{ f.flight_date }}</td>
                                <td class="num">₹{{ f.fare_per_adult | number:'1.0-0' }}</td>
                                <td class="num">₹{{ f.fare_per_child | number:'1.0-0' }}</td>
                                <td class="num">₹{{ flightLineTotal(i) | number:'1.0-0' }}</td>
                            </tr>
                        }
                    </tbody>
                </table>
            }

            @if (miscArray.length) {
                <h3 class="mt-3">Other Charges</h3>
                <table class="data-table">
                    <thead><tr><th>Label</th><th class="num">Amount</th></tr></thead>
                    <tbody>
                        @for (m of form.value.misc; track $index) {
                            <tr>
                                <td>{{ m.label }}</td>
                                <td class="num">₹{{ m.amount | number:'1.0-0' }}</td>
                            </tr>
                        }
                    </tbody>
                </table>
            }

            <div class="summary-table mt-4">
                @if (totals().hotelTotal > 0) {
                    <div class="summary-row"><span>Hotels total</span><span>{{ getBillingCurrencySymbol() }}{{ totals().hotelTotal | number:'1.0-0' }}</span></div>
                }
                @if (totals().carTotal > 0) {
                    <div class="summary-row"><span>Transport total</span><span>{{ getBillingCurrencySymbol() }}{{ totals().carTotal | number:'1.0-0' }}</span></div>
                }
                @if (totals().flightTotal > 0) {
                    <div class="summary-row"><span>Flights total</span><span>{{ getBillingCurrencySymbol() }}{{ totals().flightTotal | number:'1.0-0' }}</span></div>
                }
                @if (totals().miscTotal > 0) {
                    <div class="summary-row"><span>Miscellaneous</span><span>{{ getBillingCurrencySymbol() }}{{ totals().miscTotal | number:'1.0-0' }}</span></div>
                }
                <div class="summary-row subtotal"><span>Subtotal</span><span>{{ getBillingCurrencySymbol() }}{{ totals().subtotal | number:'1.0-0' }}</span></div>
                <div class="summary-row">
                    <span>Markup ({{ form.value.markup_pct || 0 }}%)</span>
                    <span>{{ getBillingCurrencySymbol() }}{{ totals().markupAmount | number:'1.0-0' }}</span>
                </div>
                <div class="summary-row">
                    <span>GST ({{ form.value.gst_pct || 0 }}%)</span>
                    <span>{{ getBillingCurrencySymbol() }}{{ totals().gstAmount | number:'1.0-0' }}</span>
                </div>
                <div class="summary-row grand-total">
                    <span>Grand Total</span>
                    <span>{{ getBillingCurrencySymbol() }}{{ totals().grandTotal | number:'1.0-0' }}</span>
                </div>
            </div>

            @if (form.value.terms_notes) {
                <div class="mt-3">
                    <h3>Terms & Notes</h3>
                    <pre style="white-space:pre-wrap; font-family:inherit; background:var(--gray-50); padding:12px; border-radius:6px">{{ form.value.terms_notes }}</pre>
                </div>
            }
        </div>
        }

        <!-- ── Step nav ───────────────────────────────── -->
        <div class="step-nav">
            <div>
                @if (currentStep() > 1) {
                    <button type="button" class="btn" (click)="prevStep()">← Back</button>
                }
            </div>
            <div>
                @if (currentStep() < 7) {
                    <button type="button" class="btn btn-primary" (click)="continueStep()" [disabled]="saving()">
                        @if (saving()) { <span class="spinner"></span> Saving… }
                        @else { Continue → }
                    </button>
                } @else {
                    <button type="button" class="btn" (click)="save('draft')" [disabled]="saving()">
                        @if (saving()) { <span class="spinner"></span> Saving… }
                        @else { Save as Draft }
                    </button>
                    <button type="button" class="btn btn-success" (click)="save('sent')" [disabled]="saving()">
                        @if (saving()) { <span class="spinner"></span> }
                        @else { ✓ Save & Mark as Sent }
                    </button>
                }
            </div>
        </div>

        @if (error()) {
            <div class="card" style="border-left: 4px solid var(--danger); color: var(--danger)">
                {{ error() }}
            </div>
        }

        @if (showDestinationModal()) {
            <app-destination-modal
                (close)="showDestinationModal.set(false)"
                (saved)="onDestinationSaved($event)" />
        }
    </form>
    `
})
export class QuotationBuilderComponent implements OnInit {
    private fb = inject(FormBuilder);
    private api = inject(ApiService);
    private router = inject(Router);
    private route = inject(ActivatedRoute);
    private currencyService = inject(CurrencyService);
    editId = signal<number | null>(null);
    loading = signal(false);

    currenciesList = signal<any[]>([]);

    currentStep = signal(1);
    saving = signal(false);
    error = signal<string | null>(null);
    showHotelModal = signal(false);
    showCarModal = signal(false);
    showDestinationModal = signal(false);

    destinations = signal<Destination[]>([]);
    predefinedPackages = signal<any[]>([]);
    hotelMasterRates = signal<HotelRate[]>([]);
    carMasterRates = signal<CarRate[]>([]);

    packageOptions: { value: PackageType; label: string }[] = [
        { value: 'hotel',             label: 'Hotel only' },
        { value: 'car',               label: 'Car only' },
        { value: 'flight',            label: 'Flight only' },
        { value: 'hotel_car',         label: 'Hotel + Car' },
        { value: 'hotel_flight',      label: 'Hotel + Flight' },
        { value: 'car_flight',        label: 'Car + Flight' },
        { value: 'hotel_car_flight',  label: 'Hotel + Car + Flight' }
    ];

    builderDays = signal<any[]>([]);

    allSteps = [
        { num: 1, label: 'Trip' },
        { num: 2, label: 'Hotels' },
        { num: 3, label: 'Cars' },
        { num: 4, label: 'Flights' },
        { num: 5, label: 'Daywise Plan' },
        { num: 6, label: 'Misc' },
        { num: 7, label: 'Summary' }
    ];

    form: FormGroup = this.fb.group({
        customer_name:  ['', Validators.required],
        customer_phone: ['', [Validators.required, Validators.minLength(7)]],
        customer_email: [''],
        package_id: [null],
        destination_id: [null],
        destination_text: [''],
        trip_start_date: ['', Validators.required],
        trip_end_date:   ['', Validators.required],
        adults:           [1, [Validators.required, Validators.min(1)]],
        children_below_5: [0, [Validators.min(0)]],
        children_above_5: [0, [Validators.min(0)]],
        num_rooms:        [1, [Validators.min(1)]],
        package_type:     ['hotel_car' as PackageType, Validators.required],
        markup_pct:       [10, [Validators.min(0)]],
        gst_pct:          [5,  [Validators.min(0)]],
        valid_till:       [''],
        terms_notes:      [''],
        internal_notes:   [''],
        billing_currency: ['INR'],
        exchange_rate:    [1.000000],
        hotels:  this.fb.array([this.newHotel()]),
        cars:    this.fb.array([this.newCar()]),
        flights: this.fb.array([this.newFlight()]),
        misc:    this.fb.array([
            this.fb.group({ label: ['Guide charges'],           amount: [0] }),
            this.fb.group({ label: ['Entrance & monument fees'], amount: [0] })
        ])
    });

    formValue = toSignal(this.form.valueChanges, { initialValue: this.form.value });
    nights = signal(0);

    // re-evaluate on every form change to drive the live total signal
    totals = signal({ hotelTotal: 0, carTotal: 0, flightTotal: 0, miscTotal: 0,
                      subtotal: 0, markupAmount: 0, gstAmount: 0, grandTotal: 0 });

    get hotelsArray()  { return this.form.get('hotels')  as FormArray; }
    get carsArray()    { return this.form.get('cars')    as FormArray; }
    get flightsArray() { return this.form.get('flights') as FormArray; }
    get miscArray()    { return this.form.get('misc')    as FormArray; }

    constructor() {
        // live totals — recompute on every value change
        this.form.valueChanges.subscribe(() => this.recalcTotals());
    }

    ngOnInit() {
        this.api.listDestinations().subscribe({
            next: d => this.destinations.set(d.items),
            error: () => this.error.set('Failed to load destinations. Make sure admin has added some.')
        });
        this.api.getPackagesAdmin().subscribe({
            next: (res: any) => this.predefinedPackages.set(res.items || [])
        });

        this.currencyService.list().subscribe({
            next: list => {
                if (list.length === 0) {
                    this.currenciesList.set([
                        { code: 'INR', symbol: '₹', exchange_rate: 1 },
                        { code: 'USD', symbol: '$', exchange_rate: 83.5 },
                        { code: 'EUR', symbol: '€', exchange_rate: 90 },
                        { code: 'AED', symbol: 'AED', exchange_rate: 22.7 }
                    ]);
                } else {
                    this.currenciesList.set(list);
                }
            },
            error: () => {
                this.currenciesList.set([
                    { code: 'INR', symbol: '₹', exchange_rate: 1 },
                    { code: 'USD', symbol: '$', exchange_rate: 83.5 },
                    { code: 'EUR', symbol: '€', exchange_rate: 90 },
                    { code: 'AED', symbol: 'AED', exchange_rate: 22.7 }
                ]);
            }
        });

        const editIdParam = this.route.snapshot.paramMap.get('id');
        if (editIdParam && this.router.url.includes('/edit')) {
            this.editId.set(Number(editIdParam));
            this.loading.set(true);
            this.api.getQuotation(editIdParam).subscribe({
                next: (q: any) => {
                    this.form.patchValue({
                        customer_name: q.customer_name,
                        customer_phone: q.customer_phone,
                        customer_email: q.customer_email || '',
                        destination_id: q.destination_id,
                        destination_text: q.destination_text || '',
                        trip_start_date: q.trip_start_date ? q.trip_start_date.substring(0, 10) : '',
                        trip_end_date: q.trip_end_date ? q.trip_end_date.substring(0, 10) : '',
                        adults: q.adults,
                        children_below_5: q.children_below_5 || 0,
                        children_above_5: q.children_above_5 || 0,
                        num_rooms: q.num_rooms || 1,
                        package_type: q.package_type,
                        markup_pct: q.markup_pct,
                        gst_pct: q.gst_pct,
                        valid_till: q.valid_till ? q.valid_till.substring(0, 10) : '',
                        terms_notes: q.terms_notes || '',
                        internal_notes: q.internal_notes || '',
                        billing_currency: q.billing_currency || 'INR',
                        exchange_rate: Number(q.exchange_rate || 1.0)
                    });
                    this.syncNights();

                    // Load hotels
                    this.hotelsArray.clear();
                    (q.hotels || []).forEach((h: any) => {
                        this.hotelsArray.push(this.fb.group({
                            hotel_rate_id: [h.hotel_rate_id || null],
                            hotel_name: [h.hotel_name, Validators.required],
                            star_rating: [h.star_rating ? Number(h.star_rating) : null],
                            room_type: [h.room_type || 'deluxe'],
                            meal_plan: [h.meal_plan || 'breakfast'],
                            charge_per_night: [h.original_rate != null ? Number(h.original_rate) : Number(h.charge_per_night), [Validators.required, Validators.min(0)]],
                            num_nights: [h.num_nights, [Validators.required, Validators.min(1)]],
                            num_rooms: [h.num_rooms || 1, [Validators.min(1)]],
                            special_charges: [h.special_charges || 0],
                            special_charges_note: [h.special_charges_note || ''],
                            currency_code: [h.currency_code || 'INR'],
                            exchange_rate: [Number(h.exchange_rate || 1.0)],
                            original_rate: [h.original_rate || null]
                        }));
                    });
                    if (this.hotelsArray.length === 0) this.hotelsArray.push(this.newHotel());

                    // Load cars
                    this.carsArray.clear();
                    (q.cars || []).forEach((c: any) => {
                        this.carsArray.push(this.fb.group({
                            car_rate_id: [c.car_rate_id || null],
                            car_type_name: [c.car_type_name, Validators.required],
                            car_class: [c.car_class || 'standard'],
                            charge_per_day: [c.original_rate != null ? Number(c.original_rate) : Number(c.charge_per_day), [Validators.required, Validators.min(0)]],
                            num_days: [c.num_days, [Validators.required, Validators.min(1)]],
                            km_limit_per_day: [c.km_limit_per_day || 250],
                            extra_charge_per_km: [c.extra_charge_per_km || 0],
                            estimated_extra_km: [c.estimated_extra_km || 0],
                            currency_code: [c.currency_code || 'INR'],
                            exchange_rate: [Number(c.exchange_rate || 1.0)],
                            original_rate: [c.original_rate || null]
                        }));
                    });
                    if (this.carsArray.length === 0) this.carsArray.push(this.newCar());

                    // Load flights
                    this.flightsArray.clear();
                    (q.flights || []).forEach((f: any) => {
                        this.flightsArray.push(this.fb.group({
                            airline: [f.airline || ''],
                            route: [f.route || ''],
                            flight_date: [f.flight_date ? f.flight_date.substring(0, 10) : ''],
                            fare_per_adult: [f.fare_per_adult || 0],
                            fare_per_child: [f.fare_per_child || 0]
                        }));
                    });
                    if (this.flightsArray.length === 0) this.flightsArray.push(this.newFlight());

                    // Load misc
                    this.miscArray.clear();
                    (q.misc || []).forEach((m: any) => {
                        this.miscArray.push(this.fb.group({ label: [m.label], amount: [m.amount || 0] }));
                    });
                    if (this.miscArray.length === 0) {
                        this.miscArray.push(this.fb.group({ label: ['Guide charges'], amount: [0] }));
                        this.miscArray.push(this.fb.group({ label: ['Entrance & monument fees'], amount: [0] }));
                    }

                    // Load master rates for destination
                    if (q.destination_id) {
                        this.api.hotelRatesFor(q.destination_id).subscribe(r => this.hotelMasterRates.set(r));
                        this.api.carRatesFor(q.destination_id).subscribe(r => this.carMasterRates.set(r));
                    }

                    // Load daywise itinerary
                    this.api.getDaywiseItinerary(q.id).subscribe({
                        next: days => this.builderDays.set(days),
                        error: () => {}
                    });

                    this.loading.set(false);
                },
                error: () => {
                    this.loading.set(false);
                    this.error.set('Failed to load quotation for editing.');
                }
            });
        }
    }

    // ── Validation helpers ─────────────────────────────────────
    isInvalid(control: AbstractControl | null): boolean {
        return !!(control && control.invalid && (control.touched || control.dirty));
    }
    errorMsg(control: AbstractControl | null): string {
        if (!control || !control.errors) return '';
        if (control.errors['required']) return 'This field is required.';
        if (control.errors['min']) return `Minimum value is ${control.errors['min'].min}.`;
        if (control.errors['minlength']) return `Minimum length is ${control.errors['minlength'].requiredLength}.`;
        if (control.errors['email']) return 'Please enter a valid email.';
        return 'Invalid value.';
    }
    invalidClass(control: AbstractControl | null): string {
        return this.isInvalid(control) ? 'invalid' : '';
    }

    // ── Derived UI state ─────────────────────────────────
    hasHotel():  boolean { return (this.formValue()?.package_type as string || '').includes('hotel'); }
    hasCar():    boolean { return (this.formValue()?.package_type as string || '').includes('car'); }
    hasFlight(): boolean { return (this.formValue()?.package_type as string || '').includes('flight'); }

    visibleSteps = computed(() => {
        const pkg = (this.formValue()?.package_type as string) || '';
        const isPredefined = !!(this.formValue()?.package_id);
        return this.allSteps.filter(s => {
            if (isPredefined && s.num > 1 && s.num < 7) return false;
            if (s.num === 2) return pkg.includes('hotel');
            if (s.num === 3) return pkg.includes('car');
            if (s.num === 4) return pkg.includes('flight');
            return true;
        });
    });

    visibleStepNum = computed(() => {
        return this.visibleSteps().findIndex(s => s.num === this.currentStep()) + 1;
    });

    stepLabel(): string {
        return this.visibleSteps().find(s => s.num === this.currentStep())?.label || '';
    }

    // ── Date handling ────────────────────────────────────
    syncNights() {
        const s = this.form.get('trip_start_date')?.value;
        const e = this.form.get('trip_end_date')?.value;
        if (!s || !e) { this.nights.set(0); return; }
        const start = new Date(s), end = new Date(e);
        const diff = Math.round((end.getTime() - start.getTime()) / 86400000);
        const n = Math.max(0, diff);
        this.nights.set(n);
        // also push nights into the first hotel/car line items as default
        if (n > 0) {
            const h0 = this.hotelsArray.at(0);
            if (h0 && !h0.get('num_nights')?.value) h0.patchValue({ num_nights: n });
            const c0 = this.carsArray.at(0);
            if (c0 && !c0.get('num_days')?.value) c0.patchValue({ num_days: n });
        }
    }

    // ── Per-line totals (used in line card + summary) ───
    hotelLineTotal(i: number): number {
        const h = this.hotelsArray.at(i).value as any;
        const rate = this.convertToBilling(h.charge_per_night, h.currency_code, h.exchange_rate);
        const spec = this.convertToBilling(h.special_charges, h.currency_code, h.exchange_rate);
        return (Number(rate) || 0) * (Number(h.num_nights) || 0) * (Number(h.num_rooms) || 1)
             + (Number(spec) || 0);
    }
    carLineTotal(i: number): number {
        const c = this.carsArray.at(i).value as any;
        const rate = this.convertToBilling(c.charge_per_day, c.currency_code, c.exchange_rate);
        const extra = this.convertToBilling(c.extra_charge_per_km, c.currency_code, c.exchange_rate);
        return (Number(rate) || 0) * (Number(c.num_days) || 0)
             + (Number(c.estimated_extra_km) || 0) * (Number(extra) || 0);
    }
    flightLineTotal(i: number): number {
        const f = this.flightsArray.at(i).value as any;
        const adults = Number(this.form.value.adults) || 1;
        const children = Number(this.form.value.children_above_5) || 0;
        return (Number(f.fare_per_adult) || 0) * adults
             + (Number(f.fare_per_child) || 0) * children;
    }

    convertToBilling(amount: number, itemCurrency: string, itemRate: number): number {
        const billingCurr = this.form.get('billing_currency')?.value || 'INR';
        const billingRate = Number(this.form.get('exchange_rate')?.value || 1.0);

        if (itemCurrency === billingCurr) {
            return Number(amount) || 0;
        }
        return ((Number(amount) || 0) * (Number(itemRate) || 1.0)) / (Number(billingRate) || 1.0);
    }

    getBillingCurrencySymbol(): string {
        const code = this.form.get('billing_currency')?.value || 'INR';
        const curr = this.currenciesList().find(c => c.code === code);
        return curr ? curr.symbol : '₹';
    }

    getConvertedLineTotalLabel(control: AbstractControl): string {
        const rateVal = Number(control.get('charge_per_night')?.value || control.get('charge_per_day')?.value || 0);
        const itemCurr = control.get('currency_code')?.value || 'INR';
        const itemRate = Number(control.get('exchange_rate')?.value || 1.0);
        const converted = this.convertToBilling(rateVal, itemCurr, itemRate);
        return converted.toFixed(0);
    }

    onBillingCurrencyChange() {
        const code = this.form.get('billing_currency')?.value;
        const curr = this.currenciesList().find(c => c.code === code);
        if (curr) {
            this.form.patchValue({ exchange_rate: curr.exchange_rate });
        }
        this.recalcTotals();
    }

    onLineCurrencyChange(index: number, type: 'hotel' | 'car') {
        const array = type === 'hotel' ? this.hotelsArray : this.carsArray;
        const grp = array.at(index);
        const code = grp.get('currency_code')?.value;
        const curr = this.currenciesList().find(c => c.code === code);
        if (curr) {
            grp.patchValue({ exchange_rate: curr.exchange_rate });
        }
        this.recalcTotals();
    }

    private recalcTotals() {
        const v = this.form.value;
        const hotelTotal  = this.hotelsArray.controls
            .reduce((sum, _, i) => sum + this.hotelLineTotal(i), 0);
        const carTotal    = this.carsArray.controls
            .reduce((sum, _, i) => sum + this.carLineTotal(i), 0);
        const flightTotal = this.flightsArray.controls
            .reduce((sum, _, i) => sum + this.flightLineTotal(i), 0);
        const miscTotal   = (v.misc || []).reduce((s: number, m: any) => s + (Number(m.amount) || 0), 0);
        const subtotal    = hotelTotal + carTotal + flightTotal + miscTotal;
        const markupAmount = subtotal * (Number(v.markup_pct) || 0) / 100;
        const gstBase      = subtotal + markupAmount;
        const gstAmount    = gstBase * (Number(v.gst_pct) || 0) / 100;
        const grandTotal   = gstBase + gstAmount;
        this.totals.set({ hotelTotal, carTotal, flightTotal, miscTotal,
                          subtotal, markupAmount, gstAmount, grandTotal });
    }

    // ── Dropdown + Modal handlers ─────────────────────────
    onHotelDropdownChange(event: Event, index: number) {
        const val = (event.target as HTMLSelectElement).value;
        if (val === '__add_new__') {
            this.showHotelModal.set(true);
            // reset the dropdown to blank so user can re-select after modal closes
            const grp = this.hotelsArray.at(index);
            grp.patchValue({ hotel_rate_id: null } as any);
            return;
        }
        const id = Number(val);
        if (!id) return;
        const r = this.hotelMasterRates().find(x => x.id === id);
        if (r) {
            this.hotelsArray.at(index).patchValue(this.hotelPatchFromMaster(r) as any);
        }
    }

    onCarDropdownChange(event: Event, index: number) {
        const val = (event.target as HTMLSelectElement).value;
        if (val === '__add_new__') {
            this.showCarModal.set(true);
            const grp = this.carsArray.at(index);
            grp.patchValue({ car_rate_id: null } as any);
            return;
        }
        const id = Number(val);
        if (!id) return;
        const r = this.carMasterRates().find(x => x.id === id);
        if (r) {
            this.carsArray.at(index).patchValue(this.carPatchFromMaster(r) as any);
        }
    }

    onHotelModalSaved(rate: HotelRate) {
        this.showHotelModal.set(false);
        this.hotelMasterRates.update(list => [...list, rate]);
        // Auto-fill the first empty hotel line with this new rate
        const emptyIndex = this.hotelsArray.controls.findIndex(c => !c.get('hotel_name')?.value);
        if (emptyIndex >= 0) {
            this.hotelsArray.at(emptyIndex).patchValue(this.hotelPatchFromMaster(rate) as any);
        }
    }

    onCarModalSaved(rate: CarRate) {
        this.showCarModal.set(false);
        this.carMasterRates.update(list => [...list, rate]);
        const emptyIndex = this.carsArray.controls.findIndex(c => !c.get('car_type_name')?.value);
        if (emptyIndex >= 0) {
            this.carsArray.at(emptyIndex).patchValue(this.carPatchFromMaster(rate) as any);
        }
    }

    onDestinationSaved(dest: Destination) {
        this.showDestinationModal.set(false);
        this.destinations.update(list => [...list, dest]);
        this.form.patchValue({ destination_id: dest.id });
        // Trigger the same logic as selecting a destination
        this.api.hotelRatesFor(dest.id).subscribe(rates => {
            this.hotelMasterRates.set(rates);
            this.autoFillFirstHotelFromMaster(rates);
        });
        this.api.carRatesFor(dest.id).subscribe(rates => {
            this.carMasterRates.set(rates);
            this.autoFillFirstCarFromMaster(rates);
        });
    }

    // ── Master-rate quick fill ──────────────────────────
    onDestinationChange(event: Event) {
        const id = Number((event.target as HTMLSelectElement).value);
        if (id) {
            // Load both rates in parallel; auto-fill first line item once loaded
            this.api.hotelRatesFor(id).subscribe(rates => {
                this.hotelMasterRates.set(rates);
                this.autoFillFirstHotelFromMaster(rates);
            });
            this.api.carRatesFor(id).subscribe(rates => {
                this.carMasterRates.set(rates);
                this.autoFillFirstCarFromMaster(rates);
            });
        } else {
            this.hotelMasterRates.set([]); this.carMasterRates.set([]);
        }
    }

    /** Auto-fill the first hotel line item with the first available master rate
     *  (if the user hasn't already manually filled it). */
    private autoFillFirstHotelFromMaster(rates: HotelRate[]) {
        if (!rates.length) return;
        const first = this.hotelsArray.at(0);
        if (!first) return;
        // Only auto-fill if blank (or default zeros)
        const cur = first.value;
        if (cur.hotel_name && cur.charge_per_night > 0) return;
        first.patchValue(this.hotelPatchFromMaster(rates[0]) as any);
    }

    private autoFillFirstCarFromMaster(rates: CarRate[]) {
        if (!rates.length) return;
        const first = this.carsArray.at(0);
        if (!first) return;
        const cur = first.value;
        if (cur.car_type_name && cur.charge_per_day > 0) return;
        first.patchValue(this.carPatchFromMaster(rates[0]) as any);
    }

    /** Add a new line item pre-populated from a master rate (click "+ Add" on a rate card). */
    addHotelFromMaster(r: HotelRate) {
        if (this.isHotelRateAdded(r.id)) return;
        const grp = this.newHotel();
        grp.patchValue(this.hotelPatchFromMaster(r) as any);
        this.hotelsArray.push(grp);
    }
    addCarFromMaster(r: CarRate) {
        if (this.isCarRateAdded(r.id)) return;
        const grp = this.newCar();
        grp.patchValue(this.carPatchFromMaster(r) as any);
        this.carsArray.push(grp);
    }

    /** Has a line item already been added from this master rate? */
    isHotelRateAdded(masterId: number): boolean {
        return this.hotelsArray.controls.some(c => c.get('hotel_rate_id')?.value === masterId);
    }
    isCarRateAdded(masterId: number): boolean {
        return this.carsArray.controls.some(c => c.get('car_rate_id')?.value === masterId);
    }

    private hotelPatchFromMaster(r: HotelRate) {
        return {
            hotel_rate_id:     r.id,
            hotel_name:        r.hotel_name,
            star_rating:       Number(r.star_rating) || null,
            room_type:         r.room_type,
            meal_plan:         r.meal_plan,
            charge_per_night:  r.charge_per_night,
            num_nights:        this.nights() || 1,
            num_rooms:         1,
            special_charges:   0,
            currency_code:     'INR',
            exchange_rate:     1.000000,
            original_rate:     null
        };
    }
    private carPatchFromMaster(r: CarRate) {
        return {
            car_rate_id:         r.id,
            car_type_name:       r.car_type_name,
            car_class:           r.car_class,
            charge_per_day:      r.charge_per_day,
            num_days:            this.nights() || 1,
            km_limit_per_day:    r.km_limit_per_day,
            extra_charge_per_km: r.extra_charge_per_km,
            estimated_extra_km:  0,
            currency_code:       'INR',
            exchange_rate:       1.000000,
            original_rate:       null
        };
    }

    // Legacy compat: dropdown-based fill (no longer used in UI but kept for safety)
    fillHotelFromMaster(event: Event, index: number) {
        const id = Number((event.target as HTMLSelectElement).value);
        const r = this.hotelMasterRates().find(x => x.id === id);
        if (r) this.hotelsArray.at(index).patchValue(this.hotelPatchFromMaster(r) as any);
    }
    fillCarFromMaster(event: Event, index: number) {
        const id = Number((event.target as HTMLSelectElement).value);
        const r = this.carMasterRates().find(x => x.id === id);
        if (r) this.carsArray.at(index).patchValue(this.carPatchFromMaster(r) as any);
    }

    // ── FormArray factories ─────────────────────────────
    newHotel() {
        return this.fb.group({
            hotel_rate_id:        [null],
            hotel_name:           ['', Validators.required],
            star_rating:          [null],
            room_type:            ['deluxe'],
            meal_plan:            ['breakfast'],
            charge_per_night:     [0, [Validators.required, Validators.min(0)]],
            num_nights:           [1, [Validators.required, Validators.min(1)]],
            num_rooms:            [1,  [Validators.min(1)]],
            special_charges:      [0],
            special_charges_note: [''],
            currency_code:        ['INR'],
            exchange_rate:        [1.0],
            original_rate:        [null]
        });
    }
    newCar() {
        return this.fb.group({
            car_rate_id:         [null],
            car_type_name:       ['', Validators.required],
            car_class:           ['standard'],
            charge_per_day:      [0, [Validators.required, Validators.min(0)]],
            num_days:            [1, [Validators.required, Validators.min(1)]],
            km_limit_per_day:    [250],
            extra_charge_per_km: [0],
            estimated_extra_km:  [0],
            currency_code:       ['INR'],
            exchange_rate:       [1.0],
            original_rate:       [null]
        });
    }
    newFlight() {
        return this.fb.group({
            airline:        [''],
            route:          [''],
            flight_date:    [''],
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

    // ── Continue (save draft + step) ────────────────────
    continueStep() {
        this.error.set(null);
        this.saving.set(true);

        const rawForm = this.form.value;
        const hotels = (rawForm.hotels || []).map((h: any) => {
            const hasForeign = h.currency_code !== rawForm.billing_currency;
            return {
                ...h,
                original_rate: hasForeign ? Number(h.charge_per_night) : null,
                charge_per_night: hasForeign ? this.convertToBilling(h.charge_per_night, h.currency_code, h.exchange_rate) : h.charge_per_night,
                special_charges: hasForeign ? this.convertToBilling(h.special_charges, h.currency_code, h.exchange_rate) : h.special_charges
            };
        });
        const cars = (rawForm.cars || []).map((c: any) => {
            const hasForeign = c.currency_code !== rawForm.billing_currency;
            return {
                ...c,
                original_rate: hasForeign ? Number(c.charge_per_day) : null,
                charge_per_day: hasForeign ? this.convertToBilling(c.charge_per_day, c.currency_code, c.exchange_rate) : c.charge_per_day,
                extra_charge_per_km: hasForeign ? this.convertToBilling(c.extra_charge_per_km, c.currency_code, c.exchange_rate) : c.extra_charge_per_km
            };
        });

        const payload = {
            ...rawForm,
            status: 'draft' as const,
            hotels:  hotels.filter((h: any) => h.hotel_name),
            cars:    cars.filter((c: any) => c.car_type_name),
            flights: (rawForm.flights || []).filter((f: any) => f.airline || f.route),
            misc:    (rawForm.misc || []).filter((m: any) => m.label),
            daywise_itinerary: this.builderDays()
        };
        const obs = this.editId()
            ? this.api.updateQuotation(this.editId()!, payload)
            : this.api.createQuotation(payload);
        obs.subscribe({
            next: (q: Quotation) => {
                this.saving.set(false);
                if (!this.editId()) this.editId.set(q.id);
                this.nextStep();
            },
            error: (err) => {
                this.saving.set(false);
                this.error.set(err?.error?.error || 'Failed to save draft.');
                this.nextStep();
            }
        });
    }

    // ── Step navigation (skips irrelevant steps) ────────
    nextStep() {
        const pkg = this.form.value.package_type || '';
        const isPredefined = !!this.form.value.package_id;
        let n = this.currentStep() + 1;
        if (isPredefined && this.currentStep() === 1) {
            n = 7;
        } else {
            if (n === 2 && !pkg.includes('hotel')) n = 3;
            if (n === 3 && !pkg.includes('car'))   n = 4;
            if (n === 4 && !pkg.includes('flight')) n = 5;
        }
        this.currentStep.set(Math.min(7, n));
    }
    prevStep() {
        const pkg = this.form.value.package_type || '';
        const isPredefined = !!this.form.value.package_id;
        let p = this.currentStep() - 1;
        if (isPredefined && this.currentStep() === 7) {
            p = 1;
        } else {
            if (p === 4 && !pkg.includes('flight')) p = 3;
            if (p === 3 && !pkg.includes('car'))    p = 2;
            if (p === 2 && !pkg.includes('hotel'))  p = 1;
        }
        this.currentStep.set(Math.max(1, p));
    }

    onDaywiseChange(days: any[]) {
        this.builderDays.set(days);
    }

    // ── Save ────────────────────────────────────────────
    save(status: QuotationStatus) {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            this.error.set('Please fix the highlighted fields.');
            this.currentStep.set(1);
            return;
        }
        this.error.set(null);
        this.saving.set(true);

        const rawForm = this.form.value;
        const hotels = (rawForm.hotels || []).map((h: any) => {
            const hasForeign = h.currency_code !== rawForm.billing_currency;
            return {
                ...h,
                original_rate: hasForeign ? Number(h.charge_per_night) : null,
                charge_per_night: hasForeign ? this.convertToBilling(h.charge_per_night, h.currency_code, h.exchange_rate) : h.charge_per_night,
                special_charges: hasForeign ? this.convertToBilling(h.special_charges, h.currency_code, h.exchange_rate) : h.special_charges
            };
        });
        const cars = (rawForm.cars || []).map((c: any) => {
            const hasForeign = c.currency_code !== rawForm.billing_currency;
            return {
                ...c,
                original_rate: hasForeign ? Number(c.charge_per_day) : null,
                charge_per_day: hasForeign ? this.convertToBilling(c.charge_per_day, c.currency_code, c.exchange_rate) : c.charge_per_day,
                extra_charge_per_km: hasForeign ? this.convertToBilling(c.extra_charge_per_km, c.currency_code, c.exchange_rate) : c.extra_charge_per_km
            };
        });

        const payload = {
            ...rawForm,
            status,
            hotels:  hotels.filter((h: any) => h.hotel_name),
            cars:    cars.filter((c: any) => c.car_type_name),
            flights: (rawForm.flights || []).filter((f: any) => f.airline || f.route),
            misc:    (rawForm.misc || []).filter((m: any) => m.label),
            daywise_itinerary: this.builderDays()
        };

        const obs = this.editId()
            ? this.api.updateQuotation(this.editId()!, payload)
            : this.api.createQuotation(payload);
        obs.subscribe({
            next: (q: Quotation) => {
                this.saving.set(false);
                this.router.navigate(['/quotations', q.id]);
            },
            error: (err) => {
                this.saving.set(false);
                this.error.set(err?.error?.error || 'Failed to save quotation. Please try again.');
            }
        });
    }

    formatMeal(m: string): string {
        return ({ none: 'No meals', breakfast: 'Breakfast', breakfast_dinner: 'Breakfast + Dinner', all_inclusive: 'All Inclusive' } as any)[m] || m;
    }

    onPackageSelect(event: Event) {
        const val = (event.target as HTMLSelectElement).value;
        if (!val) {
            this.form.patchValue({ package_id: null });
            return;
        }
        const pkgId = Number(val);
        const pkg = this.predefinedPackages().find(p => p.id === pkgId);
        if (!pkg) return;

        // Auto-fill quotation details
        this.form.patchValue({
            package_id: pkg.id,
            destination_text: pkg.title
        });

        // Auto-fill dates based on duration
        const startRaw = this.form.get('trip_start_date')?.value;
        if (startRaw && pkg.duration_days > 1) {
            const startDt = new Date(startRaw);
            const endDt = new Date(startDt);
            endDt.setDate(endDt.getDate() + (pkg.duration_days - 1));
            this.form.patchValue({ trip_end_date: endDt.toISOString().substring(0, 10) });
            this.syncNights();
        }

        // Auto-fill hotels
        if (pkg.hotels && Array.isArray(pkg.hotels) && pkg.hotels.length > 0) {
            this.hotelsArray.clear();
            pkg.hotels.forEach((h: any) => {
                this.hotelsArray.push(this.fb.group({
                    hotel_rate_id: [null],
                    hotel_name: [h.hotel_name, Validators.required],
                    star_rating: [null],
                    room_type: [h.room_type || 'deluxe'],
                    meal_plan: [h.meal_plan || 'breakfast'],
                    charge_per_night: [0, [Validators.required, Validators.min(0)]], // 0 because package price is lumped
                    num_nights: [h.num_nights || 1, [Validators.required, Validators.min(1)]],
                    num_rooms: [this.form.value.num_rooms || 1, [Validators.min(1)]],
                    special_charges: [0],
                    special_charges_note: [''],
                    currency_code: ['INR'],
                    exchange_rate: [1.0],
                    original_rate: [null]
                }));
            });
        }

        // Auto-fill cars
        if (pkg.cars && Array.isArray(pkg.cars) && pkg.cars.length > 0) {
            this.carsArray.clear();
            pkg.cars.forEach((c: any) => {
                this.carsArray.push(this.fb.group({
                    car_rate_id: [null],
                    car_type_name: [c.car_type || 'Standard', Validators.required],
                    car_class: ['standard'],
                    charge_per_day: [0, [Validators.required, Validators.min(0)]], // 0 because package price is lumped
                    num_days: [c.num_days || 1, [Validators.required, Validators.min(1)]],
                    km_limit_per_day: [250],
                    extra_charge_per_km: [0],
                    estimated_extra_km: [0],
                    currency_code: ['INR'],
                    exchange_rate: [1.0],
                    original_rate: [null]
                }));
            });
        }

        // Auto-fill itinerary
        if (pkg.itinerary && Array.isArray(pkg.itinerary)) {
            this.builderDays.set(pkg.itinerary);
        }

        // Auto-fill Terms & Notes (Inclusions/Exclusions)
        let terms = '';
        if (pkg.inclusions) terms += '--- INCLUSIONS ---\n' + pkg.inclusions + '\n\n';
        if (pkg.exclusions) terms += '--- EXCLUSIONS ---\n' + pkg.exclusions + '\n';
        if (terms) {
            this.form.patchValue({ terms_notes: terms });
        }

        // Add the lumped package price to Misc (Other Charges)
        if (pkg.price > 0) {
            const adults = Number(this.form.get('adults')?.value) || 1;
            const existingMisc = this.form.get('misc')?.value || [];
            
            // check if there's already a package base price
            const hasPackageCharge = existingMisc.some((m: any) => m.label && m.label.toLowerCase().includes('package base price'));
            
            if (!hasPackageCharge) {
                this.miscArray.push(this.fb.group({
                    label: ['Package Base Price (' + pkg.title + ')'],
                    amount: [pkg.price * adults]
                }));
            }
        }
    }
}
