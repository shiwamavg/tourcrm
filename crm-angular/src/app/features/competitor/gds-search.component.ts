import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GDSService } from '../../core/services/competitor-features.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
    selector: 'app-gds-search',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <div class="gds-header">
        <h1>Live Supplier Search (GDS Engine)</h1>
        <p>Query mock Global Distribution System (GDS) integrations for flights and hotels in real-time.</p>
    </div>

    <div class="tabs">
        <button class="tab-btn" [class.active]="searchType() === 'flights'" (click)="searchType.set('flights')">Flights Search</button>
        <button class="tab-btn" [class.active]="searchType() === 'hotels'" (click)="searchType.set('hotels')">Hotels Search</button>
    </div>

    @if (searchType() === 'flights') {
        <div class="search-bar">
            <div class="form-grid">
                <label>From <input type="text" [(ngModel)]="flightForm.from" placeholder="DEL" /></label>
                <label>To <input type="text" [(ngModel)]="flightForm.to" placeholder="BOM" /></label>
                <label>Date <input type="date" [(ngModel)]="flightForm.date" /></label>
                <label>Cabin Class
                    <select [(ngModel)]="flightForm.cabinClass">
                        <option>Economy</option>
                        <option>Premium Economy</option>
                        <option>Business</option>
                        <option>First</option>
                    </select>
                </label>
                <div class="btn-align">
                    <button class="btn" (click)="searchFlights()" [disabled]="loading()">
                        {{ loading() ? 'Searching...' : 'Search Flights' }}
                    </button>
                </div>
            </div>
        </div>

        @if (flightsList().length > 0) {
            <div class="results-container">
                @for (f of flightsList(); track f.flightNumber) {
                    <div class="flight-card">
                        <div class="airline-info">
                            <div class="airline-logo">{{ f.airlineCode }}</div>
                            <div>
                                <div class="airline-name">{{ f.airline }}</div>
                                <div class="flight-no">{{ f.flightNumber }}</div>
                            </div>
                        </div>
                        <div class="route-info">
                            <div class="time-block">
                                <span class="time">{{ f.departureTime }}</span>
                                <span class="airport">{{ f.from }}</span>
                            </div>
                            <div class="duration-block">
                                <span class="duration">{{ f.duration }}</span>
                                <div class="line"></div>
                                <span class="stops">{{ f.stops === 0 ? 'Non-stop' : f.stops + ' Stop' }}</span>
                            </div>
                            <div class="time-block">
                                <span class="time">{{ f.arrivalTime }}</span>
                                <span class="airport">{{ f.to }}</span>
                            </div>
                        </div>
                        <div class="price-info">
                            <span class="seats">{{ f.seatsAvailable }} seats left</span>
                            <span class="price-val">₹{{ f.price | number }}</span>
                            <span class="class-lbl">{{ f.cabinClass }}</span>
                        </div>
                    </div>
                }
            </div>
        } @else if (searched()) {
            <div class="empty-state">No flights found matching the search criteria.</div>
        }
    } @else {
        <div class="search-bar">
            <div class="form-grid">
                <label>City <input type="text" [(ngModel)]="hotelForm.city" placeholder="Mumbai" /></label>
                <label>Check In <input type="date" [(ngModel)]="hotelForm.checkIn" /></label>
                <label>Check Out <input type="date" [(ngModel)]="hotelForm.checkOut" /></label>
                <label>Guests <input type="number" [(ngModel)]="hotelForm.guests" /></label>
                <div class="btn-align">
                    <button class="btn" (click)="searchHotels()" [disabled]="loading()">
                        {{ loading() ? 'Searching...' : 'Search Hotels' }}
                    </button>
                </div>
            </div>
        </div>

        @if (hotelsList().length > 0) {
            <div class="results-grid">
                @for (h of hotelsList(); track h.id) {
                    <div class="hotel-card">
                        <div class="hotel-img-placeholder">🏢</div>
                        <div class="hotel-details">
                            <div class="hotel-header">
                                <h3>{{ h.name }}</h3>
                                <div class="stars">
                                    @for (star of [].constructor(h.stars); track $index) { ⭐ }
                                    <span class="rating">({{ h.rating }} / 5)</span>
                                </div>
                            </div>
                            <p class="address">{{ h.address }}</p>
                            <div class="amenities-list">
                                @for (amenity of h.amenities; track amenity) {
                                    <span class="amenity-tag">{{ amenity }}</span>
                                }
                            </div>
                            <div class="rooms-list">
                                <h4>Available Room Classes:</h4>
                                @for (room of h.rooms; track room.type) {
                                    <div class="room-row">
                                        <div class="room-name">
                                            <strong>{{ room.type }}</strong>
                                            <p class="desc">{{ room.description }}</p>
                                        </div>
                                        <div class="room-price">
                                            <span class="price-val">₹{{ room.price | number }}</span>
                                            <span class="per-night">/ night</span>
                                        </div>
                                    </div>
                                }
                            </div>
                        </div>
                    </div>
                }
            </div>
        } @else if (searched()) {
            <div class="empty-state">No hotels found matching the search criteria.</div>
        }
    }
    `,
    styles: [`
        .gds-header { margin-bottom: 20px; }
        .gds-header h1 { font-size: 1.5rem; margin: 0 0 6px; color: #0d9488; }
        .gds-header p { margin: 0; font-size: 13px; color: #6b7280; }

        .tabs { display: flex; gap: 10px; margin-bottom: 20px; border-bottom: 2px solid #e5e7eb; padding-bottom: 2px; }
        .tab-btn { padding: 8px 16px; border: none; background: none; font-size: 14px; font-weight: 500; color: #6b7280; cursor: pointer; position: relative; }
        .tab-btn.active { color: #0d9488; }
        .tab-btn.active::after { content: ''; position: absolute; bottom: -4px; left: 0; right: 0; height: 3px; background: #0d9488; border-radius: 99px; }

        .search-bar { background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
        .form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; align-items: end; }
        .form-grid label { display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: #4b5563; }
        .form-grid input, .form-grid select { padding: 8px 10px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 13px; }
        .btn-align { display: flex; justify-content: flex-end; }
        
        .btn { width: 100%; padding: 10px; border: none; border-radius: 6px; background: #0d9488; color: #fff; cursor: pointer; font-size: 13px; font-weight: 500; transition: background 0.15s; }
        .btn:hover { background: #0f766e; }
        .btn:disabled { opacity: 0.6; cursor: not-allowed; }

        .results-container { display: flex; flex-direction: column; gap: 12px; }
        
        /* Flights Card styling */
        .flight-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; display: flex; align-items: center; justify-content: space-between; gap: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.03); }
        .airline-info { display: flex; align-items: center; gap: 12px; min-width: 140px; }
        .airline-logo { width: 36px; height: 36px; border-radius: 6px; background: #f3f4f6; display: flex; align-items: center; justify-content: center; font-weight: 600; color: #0d9488; font-size: 14px; border: 1px solid #e5e7eb; }
        .airline-name { font-size: 13px; font-weight: 600; color: #374151; }
        .flight-no { font-size: 11px; color: #6b7280; }
        
        .route-info { display: flex; align-items: center; justify-content: center; gap: 24px; flex-grow: 1; }
        .time-block { display: flex; flex-direction: column; align-items: center; }
        .time-block .time { font-size: 16px; font-weight: 600; color: #1f2937; }
        .time-block .airport { font-size: 11px; color: #6b7280; font-weight: 500; }
        
        .duration-block { display: flex; flex-direction: column; align-items: center; width: 100px; text-align: center; }
        .duration-block .duration { font-size: 11px; color: #6b7280; }
        .duration-block .line { width: 100%; height: 2px; background: #d1d5db; position: relative; margin: 4px 0; }
        .duration-block .line::after { content: '✈'; position: absolute; top: -6px; left: calc(50% - 6px); font-size: 10px; color: #9ca3af; background: #fff; padding: 0 4px; }
        .duration-block .stops { font-size: 10px; color: #059669; font-weight: 600; }
        
        .price-info { display: flex; flex-direction: column; align-items: flex-end; min-width: 120px; }
        .price-info .seats { font-size: 10px; color: #dc2626; font-weight: 600; }
        .price-info .price-val { font-size: 18px; font-weight: 700; color: #0f766e; }
        .price-info .class-lbl { font-size: 10px; color: #6b7280; text-transform: uppercase; }

        /* Hotels Card styling */
        .results-grid { display: flex; flex-direction: column; gap: 16px; }
        .hotel-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; display: flex; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.03); }
        .hotel-img-placeholder { width: 140px; background: #f3f4f6; display: flex; align-items: center; justify-content: center; font-size: 40px; border-right: 1px solid #e5e7eb; }
        .hotel-details { padding: 16px; flex-grow: 1; }
        .hotel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
        .hotel-header h3 { font-size: 15px; margin: 0; color: #1f2937; }
        .stars { font-size: 11px; color: #d97706; display: flex; align-items: center; gap: 2px; }
        .rating { color: #6b7280; margin-left: 4px; font-size: 11px; }
        .address { font-size: 11px; color: #6b7280; margin: 0 0 10px; }
        .amenities-list { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px; }
        .amenity-tag { font-size: 10px; padding: 2px 6px; background: #f0fdfa; color: #0d9488; border: 1px solid #ccfbf1; border-radius: 4px; font-weight: 500; }
        
        .rooms-list { border-top: 1px dashed #e5e7eb; padding-top: 10px; }
        .rooms-list h4 { font-size: 11px; color: #4b5563; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 0.5px; }
        .room-row { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid #f9fafb; }
        .room-row:last-child { border-bottom: none; }
        .room-name .desc { font-size: 11px; color: #6b7280; margin: 2px 0 0; font-weight: normal; }
        .room-price { text-align: right; }
        .room-price .price-val { font-size: 14px; font-weight: 700; color: #0f766e; }
        .room-price .per-night { font-size: 10px; color: #6b7280; }

        .empty-state { text-align: center; color: #9ca3af; padding: 30px; background: #fff; border: 1px dashed #e5e7eb; border-radius: 8px; }
    `]
})
export class GDSSearchComponent implements OnInit {
    private gds = inject(GDSService);
    private toast = inject(ToastService);

    searchType = signal<'flights' | 'hotels'>('flights');
    loading = signal(false);
    searched = signal(false);

    // Mock search forms
    flightForm = {
        from: 'DEL',
        to: 'BOM',
        date: '',
        cabinClass: 'Economy'
    };

    hotelForm = {
        city: 'Mumbai',
        checkIn: '',
        checkOut: '',
        guests: 2
    };

    flightsList = signal<any[]>([]);
    hotelsList = signal<any[]>([]);

    ngOnInit() {
        // Set tomorrow's date as default
        const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const dayAfter = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        this.flightForm.date = tomorrow;
        this.hotelForm.checkIn = tomorrow;
        this.hotelForm.checkOut = dayAfter;
    }

    searchFlights() {
        this.loading.set(true);
        this.searched.set(true);
        this.gds.searchFlights(this.flightForm).subscribe({
            next: (res) => {
                this.flightsList.set(res.results || []);
                this.loading.set(false);
            },
            error: (err) => {
                this.loading.set(false);
                this.toast.error(err.error?.message || 'Flight search failed.');
            }
        });
    }

    searchHotels() {
        this.loading.set(true);
        this.searched.set(true);
        this.gds.searchHotels(this.hotelForm).subscribe({
            next: (res) => {
                this.hotelsList.set(res.results || []);
                this.loading.set(false);
            },
            error: (err) => {
                this.loading.set(false);
                this.toast.error(err.error?.message || 'Hotel search failed.');
            }
        });
    }
}
