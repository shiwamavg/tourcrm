import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FlyerService, ItineraryService, FixedDepartureService } from '../../core/services/competitor-features.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
    selector: 'app-flyer-designer',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <div class="flyer-header no-print">
        <h1>Visual Flyer Designer</h1>
        <p>Choose an itinerary or fixed departure, pick a layout template, customize contents, and print/save your marketing flyers.</p>
    </div>

    <div class="designer-layout no-print">
        <!-- Sidebar Controls -->
        <div class="controls-panel">
            <h3>1. Sourcing Data</h3>
            <label>Select Source
                <select (change)="onSourceChange($event)">
                    <option value="">-- Choose Option --</option>
                    <optgroup label="Fixed Departures">
                        @for (d of departures(); track d.id) {
                            <option [value]="'dep-' + d.id">Departure: {{ d.title }}</option>
                        }
                    </optgroup>
                    <optgroup label="Itineraries">
                        @for (i of itineraries(); track i.id) {
                            <option [value]="'it-' + i.id">Itinerary: {{ i.title }}</option>
                        }
                    </optgroup>
                </select>
            </label>

            <h3>2. Customize Info</h3>
            <label>Flyer Title <input type="text" [(ngModel)]="flyerData.title" /></label>
            <label>Destination <input type="text" [(ngModel)]="flyerData.destination" /></label>
            <label>Price <input type="text" [(ngModel)]="flyerData.price" /></label>
            <label>Duration <input type="text" [(ngModel)]="flyerData.duration" /></label>
            <label>Details <textarea [(ngModel)]="flyerData.description" rows="3"></textarea></label>
            <label>Footer Contact <input type="text" [(ngModel)]="flyerData.contact" /></label>

            <h3>3. Layout Style</h3>
            <div class="layout-selector">
                <button class="style-btn" [class.selected]="flyerData.layout === 'standard'" (click)="flyerData.layout = 'standard'">Standard</button>
                <button class="style-btn" [class.selected]="flyerData.layout === 'minimal'" (click)="flyerData.layout = 'minimal'">Minimalist</button>
                <button class="style-btn" [class.selected]="flyerData.layout === 'vibrant'" (click)="flyerData.layout = 'vibrant'">Vibrant</button>
            </div>

            <div class="actions">
                <button class="btn" (click)="saveFlyer()" [disabled]="saving()">{{ saving() ? 'Saving...' : 'Save Template' }}</button>
                <button class="btn print-btn" (click)="printFlyer()">Print / PDF</button>
            </div>
        </div>

        <!-- Canvas Preview -->
        <div class="canvas-panel">
            <h3>Live Preview</h3>
            <div class="flyer-canvas" [class]="flyerData.layout" id="flyer-print-area">
                <div class="badge-tag">EXCLUSIVE DEAL</div>
                <h1 class="flyer-title">{{ flyerData.title || 'Spectacular Himalayan Escape' }}</h1>
                
                <div class="meta-row">
                    <span class="meta-item"><span class="icon">📍</span> {{ flyerData.destination || 'Sikkim & Darjeeling' }}</span>
                    <span class="meta-item"><span class="icon">⏱</span> {{ flyerData.duration || '5 Nights / 6 Days' }}</span>
                </div>

                <div class="divider"></div>

                <p class="flyer-desc">
                    {{ flyerData.description || 'Experience the breath-taking views of Mt. Kanchenjunga, explore pristine Buddhist monasteries, walk through lush pine forests, and walk down the world-famous mall roads.' }}
                </p>

                <div class="price-container">
                    <span class="price-lbl">Starting From</span>
                    <span class="price-val">{{ flyerData.price || '₹14,999' }}</span>
                    <span class="per-person">per person</span>
                </div>

                <div class="flyer-footer">
                    <div class="contact-info">
                        <strong>For Bookings, Contact:</strong>
                        <span>{{ flyerData.contact || 'bookings@sikkimtrails.in | +91 98765 43210' }}</span>
                    </div>
                    <div class="brand">TourCRM Trails</div>
                </div>
            </div>
        </div>
    </div>

    `,
    styles: [`
        .flyer-header { margin-bottom: 20px; }
        .flyer-header h1 { font-size: 1.5rem; margin: 0 0 6px; color: #0d9488; }
        .flyer-header p { margin: 0; font-size: 13px; color: #6b7280; }

        .designer-layout { display: flex; gap: 20px; align-items: flex-start; }
        
        .controls-panel { width: 300px; background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
        .controls-panel h3 { margin: 0 0 10px; font-size: 12px; text-transform: uppercase; color: #374151; letter-spacing: 0.5px; border-bottom: 1px solid #f3f4f6; padding-bottom: 4px; }
        .controls-panel label { display: flex; flex-direction: column; gap: 4px; margin-bottom: 12px; font-size: 12px; color: #4b5563; }
        .controls-panel input, .controls-panel select, .controls-panel textarea { padding: 8px 10px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 13px; }
        
        .layout-selector { display: flex; gap: 6px; margin-bottom: 16px; }
        .style-btn { flex: 1; padding: 6px; border: 1px solid #d1d5db; border-radius: 6px; background: #fff; cursor: pointer; font-size: 11px; font-weight: 500; text-align: center; }
        .style-btn.selected { border-color: #0d9488; color: #0d9488; background: #f0fdfa; font-weight: 600; }
        
        .actions { display: flex; flex-direction: column; gap: 8px; }
        .btn { padding: 10px; border: none; border-radius: 6px; background: #0d9488; color: #fff; cursor: pointer; font-size: 13px; font-weight: 500; transition: background 0.15s; }
        .btn:hover { background: #0f766e; }
        .btn.print-btn { background: #1f2937; }
        .btn.print-btn:hover { background: #111827; }
        .btn:disabled { opacity: 0.6; cursor: not-allowed; }

        .canvas-panel { flex-grow: 1; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; display: flex; flex-direction: column; align-items: center; }
        .canvas-panel h3 { margin: 0 0 12px; font-size: 13px; color: #4b5563; align-self: flex-start; }

        /* Flyer Canvas Base Styles */
        .flyer-canvas { width: 100%; max-width: 440px; aspect-ratio: 1 / 1.414; padding: 32px; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.08); display: flex; flex-direction: column; position: relative; overflow: hidden; box-sizing: border-box; }
        
        /* Layout Style: Standard */
        .flyer-canvas.standard { background: #ffffff; border: 8px solid #0f766e; color: #1f2937; }
        .flyer-canvas.standard .flyer-title { color: #0f766e; font-size: 24px; font-weight: 700; margin-top: 10px; }
        .flyer-canvas.standard .badge-tag { background: #0f766e; color: #fff; padding: 4px 10px; font-size: 10px; font-weight: 700; border-radius: 4px; align-self: flex-start; }
        .flyer-canvas.standard .divider { height: 2px; background: #e5e7eb; margin: 16px 0; }
        .flyer-canvas.standard .price-val { color: #0f766e; font-weight: 800; }
        .flyer-canvas.standard .flyer-footer { border-top: 1px solid #e5e7eb; padding-top: 14px; margin-top: auto; display: flex; justify-content: space-between; align-items: flex-end; }
        
        /* Layout Style: Minimalist */
        .flyer-canvas.minimal { background: #fcfcfc; border: 1px solid #d1d5db; color: #111827; }
        .flyer-canvas.minimal .flyer-title { font-family: 'Playfair Display', serif; font-size: 28px; font-weight: 500; letter-spacing: -0.5px; border-bottom: 2px solid #111827; padding-bottom: 12px; }
        .flyer-canvas.minimal .badge-tag { display: none; }
        .flyer-canvas.minimal .divider { display: none; }
        .flyer-canvas.minimal .price-container { margin-top: 24px; border: 1px solid #111827; padding: 12px; align-self: flex-start; border-radius: 4px; }
        .flyer-canvas.minimal .price-val { font-size: 20px; font-weight: 600; color: #111827; }
        .flyer-canvas.minimal .flyer-footer { margin-top: auto; font-size: 11px; }

        /* Layout Style: Vibrant */
        .flyer-canvas.vibrant { background: linear-gradient(135deg, #0f766e 0%, #115e59 50%, #1e293b 100%); color: #ffffff; }
        .flyer-canvas.vibrant .flyer-title { color: #ffffff; font-size: 26px; font-weight: 800; text-shadow: 0 2px 4px rgba(0,0,0,0.2); }
        .flyer-canvas.vibrant .badge-tag { background: #fbbf24; color: #1e293b; padding: 4px 10px; font-size: 10px; font-weight: 800; border-radius: 99px; align-self: flex-start; }
        .flyer-canvas.vibrant .divider { height: 1px; background: rgba(255,255,255,0.15); margin: 16px 0; }
        .flyer-canvas.vibrant .price-val { color: #fbbf24; font-weight: 800; }
        .flyer-canvas.vibrant .flyer-footer { border-top: 1px solid rgba(255,255,255,0.1); padding-top: 14px; margin-top: auto; display: flex; justify-content: space-between; align-items: flex-end; }
        .flyer-canvas.vibrant .meta-item { color: rgba(255,255,255,0.9); }

        .meta-row { display: flex; gap: 14px; margin-top: 10px; font-size: 12px; }
        .meta-item { display: flex; align-items: center; gap: 4px; font-weight: 500; }
        
        .flyer-desc { font-size: 12px; line-height: 1.5; color: inherit; margin: 10px 0; }
        
        .price-container { display: flex; flex-direction: column; margin-top: 16px; }
        .price-lbl { font-size: 10px; text-transform: uppercase; color: inherit; opacity: 0.8; letter-spacing: 0.5px; }
        .price-val { font-size: 24px; }
        .per-person { font-size: 10px; opacity: 0.8; }

        .flyer-footer { font-size: 11px; }
        .flyer-footer strong { display: block; margin-bottom: 2px; }
        .flyer-footer .brand { font-weight: 800; text-transform: uppercase; letter-spacing: 1px; opacity: 0.7; }

    `]
})
export class FlyerDesignerComponent implements OnInit {
    private flyerService = inject(FlyerService);
    private itineraryService = inject(ItineraryService);
    private departureService = inject(FixedDepartureService);
    private toast = inject(ToastService);

    itineraries = signal<any[]>([]);
    departures = signal<any[]>([]);
    saving = signal(false);

    // Flyer editor state
    flyerData = {
        title: '',
        destination: '',
        price: '₹14,999',
        duration: '5 Nights / 6 Days',
        description: '',
        contact: 'bookings@sikkimtrails.in | +91 98765 43210',
        layout: 'standard'
    };

    ngOnInit() {
        this.loadSources();
    }

    loadSources() {
        this.itineraryService.list().subscribe(data => this.itineraries.set(data || []));
        this.departureService.list().subscribe(data => this.departures.set(data || []));
    }

    onSourceChange(event: any) {
        const value = event.target.value;
        if (!value) return;

        const [type, idStr] = value.split('-');
        const id = parseInt(idStr);

        if (type === 'dep') {
            const dep = this.departures().find(d => d.id === id);
            if (dep) {
                this.flyerData.title = dep.title;
                this.flyerData.destination = dep.destination || '';
                this.flyerData.price = `₹${dep.price_per_person.toLocaleString()}`;
                
                const start = new Date(dep.start_date);
                const end = new Date(dep.end_date);
                const diffTime = Math.abs(end.getTime() - start.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                this.flyerData.duration = `${diffDays - 1} Nights / ${diffDays} Days`;
                this.flyerData.description = dep.description || '';
            }
        } else {
            const it = this.itineraries().find(i => i.id === id);
            if (it) {
                this.flyerData.title = it.title;
                this.flyerData.destination = 'Custom Route';
                this.flyerData.price = '₹19,999'; // Default starting price estimation
                this.flyerData.duration = `${it.total_days - 1} Nights / ${it.total_days} Days`;
                this.flyerData.description = it.notes || '';
            }
        }
    }

    saveFlyer() {
        this.saving.set(true);
        const payload = {
            title: this.flyerData.title || 'Marketing Flyer',
            layout_data: this.flyerData,
            package_id: null
        };

        this.flyerService.create(payload).subscribe({
            next: () => {
                this.saving.set(false);
                this.toast.success('Flyer template saved successfully to DB!');
            },
            error: () => {
                this.saving.set(false);
                this.toast.error('Failed to save flyer template.');
            }
        });
    }

    printFlyer() {
        window.print();
    }
}
