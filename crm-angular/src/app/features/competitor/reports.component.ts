import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReportsService } from '../../core/services/competitor-features.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
    selector: 'app-reports',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <div class="reports-header">
        <h1>Comprehensive Analytics Dashboard</h1>
        <p>Analyze company performance across agents, destinations, lead sources, and monthly revenues. Export data instantly.</p>
    </div>

    <div class="grid-container">
        <!-- 1. Sales by Agent -->
        <div class="report-card">
            <div class="card-header">
                <h2>Sales by Agent</h2>
                <button class="export-btn" (click)="exportAgentCSV()">CSV</button>
            </div>
            <div class="chart-container">
                @for (a of agentSales(); track a.agent_name) {
                    <div class="chart-bar-row">
                        <div class="bar-label">{{ a.agent_name }}</div>
                        <div class="bar-wrapper">
                            <div class="bar teal" [style.width.%]="getAgentPercent(a.total_sales)"></div>
                        </div>
                        <div class="bar-value">₹{{ a.total_sales | number }} ({{ a.bookings_count }} bkgs)</div>
                    </div>
                } @empty {
                    <div class="empty">No sales data recorded.</div>
                }
            </div>
        </div>

        <!-- 2. Sales by Destination -->
        <div class="report-card">
            <div class="card-header">
                <h2>Sales by Destination</h2>
                <button class="export-btn" (click)="exportDestCSV()">CSV</button>
            </div>
            <div class="chart-container">
                @for (d of destSales(); track d.destination) {
                    <div class="chart-bar-row">
                        <div class="bar-label">{{ d.destination }}</div>
                        <div class="bar-wrapper">
                            <div class="bar blue" [style.width.%]="getDestPercent(d.total_sales)"></div>
                        </div>
                        <div class="bar-value">₹{{ d.total_sales | number }} ({{ d.bookings_count }} bkgs)</div>
                    </div>
                } @empty {
                    <div class="empty">No destination data.</div>
                }
            </div>
        </div>

        <!-- 3. Lead Sources -->
        <div class="report-card">
            <div class="card-header">
                <h2>Lead Acquisition Sources</h2>
                <button class="export-btn" (click)="exportLeadCSV()">CSV</button>
            </div>
            <div class="chart-container">
                @for (l of leadSources(); track l.source) {
                    <div class="chart-bar-row">
                        <div class="bar-label capitalize">{{ l.source }}</div>
                        <div class="bar-wrapper">
                            <div class="bar amber" [style.width.%]="getLeadPercent(l.count)"></div>
                        </div>
                        <div class="bar-value">{{ l.count }} leads</div>
                    </div>
                } @empty {
                    <div class="empty">No leads recorded.</div>
                }
            </div>
        </div>

        <!-- 4. Monthly Revenue -->
        <div class="report-card">
            <div class="card-header">
                <h2>Monthly Booking Revenue</h2>
                <button class="export-btn" (click)="exportRevenueCSV()">CSV</button>
            </div>
            <div class="chart-container">
                @for (m of monthlyRev(); track m.month) {
                    <div class="chart-bar-row">
                        <div class="bar-label">{{ m.month }}</div>
                        <div class="bar-wrapper">
                            <div class="bar purple" [style.width.%]="getRevenuePercent(m.revenue)"></div>
                        </div>
                        <div class="bar-value">₹{{ m.revenue | number }}</div>
                    </div>
                } @empty {
                    <div class="empty">No monthly data.</div>
                }
            </div>
        </div>

        <!-- 5. Predefined Packages Performance -->
        <div class="report-card col-span-full">
            <div class="card-header">
                <h2>Predefined Packages Performance</h2>
                <button class="export-btn" (click)="exportPackageCSV()">CSV</button>
            </div>
            <div class="table-wrap">
                <table class="report-table">
                    <thead>
                        <tr>
                            <th>Package Name</th>
                            <th>Enquiries (Leads)</th>
                            <th>Confirmed Bookings</th>
                            <th>Total Revenue</th>
                            <th>Conversion Rate</th>
                        </tr>
                    </thead>
                    <tbody>
                        @for (p of packagePerf(); track p.package_id) {
                            <tr>
                                <td><strong>{{ p.package_title }}</strong></td>
                                <td>{{ p.leads_count }}</td>
                                <td>{{ p.bookings_count }}</td>
                                <td><strong>₹{{ p.total_revenue | number }}</strong></td>
                                <td>
                                    @if (p.leads_count > 0) {
                                        {{ (p.bookings_count / p.leads_count * 100) | number:'1.0-1' }}%
                                    } @else {
                                        0%
                                    }
                                </td>
                            </tr>
                        } @empty {
                            <tr><td colspan="5" class="empty">No package performance data available.</td></tr>
                        }
                    </tbody>
                </table>
            </div>
        </div>
    </div>
    `,
    styles: [`
        .reports-header { margin-bottom: 20px; }
        .reports-header h1 { font-size: 1.5rem; margin: 0 0 6px; color: #0d9488; }
        .reports-header p { margin: 0; font-size: 13px; color: #6b7280; }

        .grid-container { display: grid; grid-template-columns: repeat(auto-fit, minmax(440px, 1fr)); gap: 20px; }
        .report-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
        
        .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; border-bottom: 1px solid #f3f4f6; padding-bottom: 8px; }
        .card-header h2 { font-size: 14px; margin: 0; color: #374151; }
        .export-btn { padding: 4px 10px; font-size: 11px; font-weight: 600; border: 1px solid #d1d5db; background: #fff; border-radius: 4px; color: #4b5563; cursor: pointer; transition: all 0.15s; }
        .export-btn:hover { border-color: #0d9488; color: #0d9488; background: #f0fdfa; }

        .chart-container { display: flex; flex-direction: column; gap: 14px; min-height: 120px; }
        .chart-bar-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; font-size: 12px; }
        
        .bar-label { min-width: 110px; color: #4b5563; font-weight: 500; text-overflow: ellipsis; overflow: hidden; white-space: nowrap; }
        .bar-wrapper { flex-grow: 1; height: 12px; background: #f3f4f6; border-radius: 6px; overflow: hidden; }
        .bar { height: 100%; border-radius: 6px; transition: width 0.3s ease; }
        .bar.teal { background: linear-gradient(90deg, #0d9488, #2dd4bf); }
        .bar.blue { background: linear-gradient(90deg, #2563eb, #60a5fa); }
        .bar.amber { background: linear-gradient(90deg, #d97706, #fbbf24); }
        .bar.purple { background: linear-gradient(90deg, #7c3aed, #a78bfa); }
        
        .bar-value { min-width: 140px; text-align: right; font-weight: 600; color: #1f2937; }
        .capitalize { text-transform: capitalize; }
        .empty { text-align: center; color: #9ca3af; padding: 40px 0; }
        .col-span-full { grid-column: 1 / -1; }
        .report-table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 8px; }
        .report-table th, .report-table td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
        .report-table th { background: #f9fafb; font-weight: 600; color: #4b5563; }
        .report-table tr:hover { background: #f9fafb; }
    `]
})
export class ReportsComponent implements OnInit {
    private reports = inject(ReportsService);
    private toast = inject(ToastService);

    agentSales = signal<any[]>([]);
    destSales = signal<any[]>([]);
    leadSources = signal<any[]>([]);
    monthlyRev = signal<any[]>([]);
    packagePerf = signal<any[]>([]);

    ngOnInit() {
        this.loadReports();
    }

    loadReports() {
        this.reports.getSalesByAgent().subscribe({
            next: (data) => this.agentSales.set(data || []),
            error: () => this.toast.error('Failed to load agent sales data.')
        });

        this.reports.getSalesByDestination().subscribe({
            next: (data) => this.destSales.set(data || []),
            error: () => this.toast.error('Failed to load destination sales data.')
        });

        this.reports.getLeadSources().subscribe({
            next: (data) => this.leadSources.set(data || []),
            error: () => this.toast.error('Failed to load lead sources data.')
        });

        this.reports.getMonthlyRevenue().subscribe({
            next: (data) => this.monthlyRev.set(data || []),
            error: () => this.toast.error('Failed to load monthly revenue data.')
        });

        this.reports.getPackagePerformance().subscribe({
            next: (data) => this.packagePerf.set(data || []),
            error: () => this.toast.error('Failed to load package performance data.')
        });
    }

    // Calculations for bar percentages
    getAgentPercent(sales: number): number {
        const max = Math.max(...this.agentSales().map(a => a.total_sales), 1);
        return Math.max((sales / max) * 100, 5);
    }

    getDestPercent(sales: number): number {
        const max = Math.max(...this.destSales().map(d => d.total_sales), 1);
        return Math.max((sales / max) * 100, 5);
    }

    getLeadPercent(count: number): number {
        const max = Math.max(...this.leadSources().map(l => l.count), 1);
        return Math.max((count / max) * 100, 5);
    }

    getRevenuePercent(revenue: number): number {
        const max = Math.max(...this.monthlyRev().map(m => m.revenue), 1);
        return Math.max((revenue / max) * 100, 5);
    }

    // CSV Exports
    exportAgentCSV() {
        this.exportToCSV('Sales_By_Agent', ['Agent Name', 'Bookings Count', 'Total Sales (INR)'], ['agent_name', 'bookings_count', 'total_sales'], this.agentSales());
    }

    exportDestCSV() {
        this.exportToCSV('Sales_By_Destination', ['Destination', 'Bookings Count', 'Total Sales (INR)'], ['destination', 'bookings_count', 'total_sales'], this.destSales());
    }

    exportLeadCSV() {
        this.exportToCSV('Lead_Sources', ['Lead Source', 'Leads Count'], ['source', 'count'], this.leadSources());
    }

    exportRevenueCSV() {
        this.exportToCSV('Monthly_Revenue', ['Month', 'Revenue (INR)'], ['month', 'revenue'], this.monthlyRev());
    }

    exportPackageCSV() {
        const data = this.packagePerf().map(p => ({
            ...p,
            conversion_rate: p.leads_count > 0 ? (p.bookings_count / p.leads_count * 100).toFixed(1) + '%' : '0%'
        }));
        this.exportToCSV('Package_Performance', 
            ['Package', 'Enquiries (Leads)', 'Bookings', 'Revenue (INR)', 'Conversion Rate'], 
            ['package_title', 'leads_count', 'bookings_count', 'total_revenue', 'conversion_rate'], 
            data
        );
    }

    private exportToCSV(filename: string, headers: string[], keys: string[], data: any[]) {
        if (!data || data.length === 0) {
            this.toast.error('No data available to export.');
            return;
        }

        const csvContent = [
            headers.join(','),
            ...data.map(row => keys.map(k => {
                const cell = row[k] === null || row[k] === undefined ? '' : String(row[k]);
                return `"${cell.replace(/"/g, '""')}"`;
            }).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', `${filename.toLowerCase().replace(/\s+/g, '_')}_report.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        this.toast.success('CSV report exported.');
    }
}
