import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { B2BService, ItineraryService, FixedDepartureService } from '../../core/services/competitor-features.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
    selector: 'app-b2b-marketplace',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <div class="b2b-header">
        <h1>B2B Cooperation Network</h1>
        <p>Collaborate with other travel agencies. Share your departures/itineraries, or import packages from the network.</p>
    </div>

    <div class="tabs">
        <button class="tab-btn" [class.active]="activeTab() === 'marketplace'" (click)="activeTab.set('marketplace')">Network Marketplace</button>
        <button class="tab-btn" [class.active]="activeTab() === 'my-shares'" (click)="activeTab.set('my-shares')">My Share Manager</button>
    </div>

    @if (activeTab() === 'marketplace') {
        <div class="section-card">
            <h2>Shared Fixed Departures</h2>
            <table>
                <thead>
                    <tr>
                        <th>Publisher</th>
                        <th>Title</th>
                        <th>Destination</th>
                        <th>Dates</th>
                        <th>Seats Available</th>
                        <th>Price</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    @for (d of marketplaceDepartures(); track d.id) {
                        <tr>
                            <td class="bold-text">{{ d.company_name }}</td>
                            <td>{{ d.title }}</td>
                            <td>{{ d.destination }}</td>
                            <td>{{ d.start_date | date:'shortDate' }} → {{ d.end_date | date:'shortDate' }}</td>
                            <td>{{ d.total_seats - d.booked_seats }} / {{ d.total_seats }}</td>
                            <td class="price">₹{{ d.price_per_person | number }}</td>
                            <td>
                                <button class="btn small" (click)="importItem('departure', d.id)" [disabled]="importing()">
                                    {{ importing() ? 'Importing...' : 'Import' }}
                                </button>
                            </td>
                        </tr>
                    } @empty {
                        <tr><td colspan="7" class="empty">No shared departures on the network.</td></tr>
                    }
                </tbody>
            </table>
        </div>

        <div class="section-card">
            <h2>Shared Itineraries</h2>
            <table>
                <thead>
                    <tr>
                        <th>Publisher</th>
                        <th>Title</th>
                        <th>Days</th>
                        <th>Details</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    @for (i of marketplaceItineraries(); track i.id) {
                        <tr>
                            <td class="bold-text">{{ i.company_name }}</td>
                            <td>{{ i.title }}</td>
                            <td>{{ i.total_days }} Days</td>
                            <td>{{ i.notes || 'No description' }}</td>
                            <td>
                                <button class="btn small" (click)="importItem('itinerary', i.id)" [disabled]="importing()">
                                    {{ importing() ? 'Importing...' : 'Import' }}
                                </button>
                            </td>
                        </tr>
                    } @empty {
                        <tr><td colspan="5" class="empty">No shared itineraries on the network.</td></tr>
                    }
                </tbody>
            </table>
        </div>
    } @else {
        <div class="section-card">
            <h2>My Local Departures</h2>
            <table>
                <thead>
                    <tr>
                        <th>Title</th>
                        <th>Destination</th>
                        <th>Marketplace Status</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    @for (d of localDepartures(); track d.id) {
                        <tr>
                            <td>{{ d.title }}</td>
                            <td>{{ d.destination }}</td>
                            <td>
                                <span class="status-badge" [class.shared]="d.is_b2b_shared">
                                    {{ d.is_b2b_shared ? 'Shared' : 'Private' }}
                                </span>
                            </td>
                            <td>
                                <button class="btn small toggle-btn" [class.shared]="d.is_b2b_shared" (click)="toggleShare('departure', d.id, !d.is_b2b_shared)">
                                    {{ d.is_b2b_shared ? 'Remove' : 'Share Network' }}
                                </button>
                            </td>
                        </tr>
                    } @empty {
                        <tr><td colspan="4" class="empty">No local departures. Create one first!</td></tr>
                    }
                </tbody>
            </table>
        </div>

        <div class="section-card">
            <h2>My Local Itineraries</h2>
            <table>
                <thead>
                    <tr>
                        <th>Title</th>
                        <th>Days</th>
                        <th>Marketplace Status</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    @for (i of localItineraries(); track i.id) {
                        <tr>
                            <td>{{ i.title }}</td>
                            <td>{{ i.total_days }} Days</td>
                            <td>
                                <span class="status-badge" [class.shared]="i.is_b2b_shared">
                                    {{ i.is_b2b_shared ? 'Shared' : 'Private' }}
                                </span>
                            </td>
                            <td>
                                <button class="btn small toggle-btn" [class.shared]="i.is_b2b_shared" (click)="toggleShare('itinerary', i.id, !i.is_b2b_shared)">
                                    {{ i.is_b2b_shared ? 'Remove' : 'Share Network' }}
                                </button>
                            </td>
                        </tr>
                    } @empty {
                        <tr><td colspan="4" class="empty">No local itineraries.</td></tr>
                    }
                </tbody>
            </table>
        </div>
    }
    `,
    styles: [`
        .b2b-header { margin-bottom: 20px; }
        .b2b-header h1 { font-size: 1.5rem; margin: 0 0 6px; color: #0d9488; }
        .b2b-header p { margin: 0; font-size: 13px; color: #6b7280; }

        .tabs { display: flex; gap: 10px; margin-bottom: 20px; border-bottom: 2px solid #e5e7eb; padding-bottom: 2px; }
        .tab-btn { padding: 8px 16px; border: none; background: none; font-size: 14px; font-weight: 500; color: #6b7280; cursor: pointer; position: relative; }
        .tab-btn.active { color: #0d9488; }
        .tab-btn.active::after { content: ''; position: absolute; bottom: -4px; left: 0; right: 0; height: 3px; background: #0d9488; border-radius: 99px; }

        .section-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
        .section-card h2 { font-size: 14px; margin: 0 0 12px; color: #374151; border-left: 3px solid #0d9488; padding-left: 8px; }

        table { width: 100%; border-collapse: collapse; text-align: left; }
        th, td { padding: 10px 12px; border-bottom: 1px solid #f3f4f6; font-size: 13px; }
        th { background: #f9fafb; font-weight: 600; color: #4b5563; font-size: 11px; text-transform: uppercase; }
        
        .bold-text { font-weight: 600; color: #1f2937; }
        .price { font-weight: 600; color: #0f766e; }
        .empty { text-align: center; color: #9ca3af; padding: 20px; }

        .btn { padding: 6px 12px; border: none; border-radius: 6px; background: #0d9488; color: #fff; cursor: pointer; font-size: 12px; font-weight: 500; transition: background 0.15s; }
        .btn:hover { background: #0f766e; }
        .btn.small { padding: 4px 8px; }
        .btn:disabled { opacity: 0.6; cursor: not-allowed; }

        .status-badge { display: inline-block; padding: 2px 8px; border-radius: 99px; font-size: 11px; font-weight: 500; background: #f3f4f6; color: #4b5563; }
        .status-badge.shared { background: #dcfce7; color: #166534; }

        .btn.toggle-btn { background: #2563eb; }
        .btn.toggle-btn.shared { background: #dc2626; }
        .btn.toggle-btn:hover { background: #1d4ed8; }
        .btn.toggle-btn.shared:hover { background: #b91c1c; }
    `]
})
export class B2BMarketplaceComponent implements OnInit {
    private b2b = inject(B2BService);
    private itineraries = inject(ItineraryService);
    private departures = inject(FixedDepartureService);
    private toast = inject(ToastService);

    activeTab = signal<'marketplace' | 'my-shares'>('marketplace');
    
    // Marketplace items
    marketplaceDepartures = signal<any[]>([]);
    marketplaceItineraries = signal<any[]>([]);

    // Local items
    localDepartures = signal<any[]>([]);
    localItineraries = signal<any[]>([]);

    importing = signal(false);

    ngOnInit() {
        this.loadMarketplace();
        this.loadLocal();
    }

    loadMarketplace() {
        this.b2b.listMarketplace().subscribe({
            next: (data) => {
                this.marketplaceDepartures.set(data.fixedDepartures || []);
                this.marketplaceItineraries.set(data.itineraries || []);
            },
            error: () => this.toast.error('Failed to load cooperation network marketplace.')
        });
    }

    loadLocal() {
        this.itineraries.list().subscribe(data => this.localItineraries.set(data || []));
        this.departures.list().subscribe(data => this.localDepartures.set(data || []));
    }

    toggleShare(type: string, id: number, share: boolean) {
        this.b2b.shareItem({ type, id, share }).subscribe({
            next: () => {
                this.toast.success(`Item ${share ? 'shared' : 'removed'} successfully.`);
                this.loadLocal();
                this.loadMarketplace();
            },
            error: (err) => this.toast.error(err.error?.error || 'Failed to toggle share state.')
        });
    }

    importItem(type: string, id: number) {
        this.importing.set(true);
        this.b2b.importItem({ type, id }).subscribe({
            next: () => {
                this.importing.set(false);
                this.toast.success(`Successfully imported ${type} to your database!`);
                this.loadLocal();
            },
            error: () => {
                this.importing.set(false);
                this.toast.error('Import failed.');
            }
        });
    }
}
