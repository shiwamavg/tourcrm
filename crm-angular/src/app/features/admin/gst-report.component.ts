import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
    selector: 'app-gst-report',
    standalone: true,
    imports: [CommonModule, FormsModule, DatePipe, DecimalPipe],
    template: `
    <div class="page-header">
        <div>
            <h1>GST Report</h1>
            <p>Invoice-wise taxable value and GST break-up.</p>
        </div>
    </div>

    <div class="card">
        <div class="toolbar">
            <div class="form-group" style="margin:0">
                <label>From</label>
                <input type="date" [(ngModel)]="from" />
            </div>
            <div class="form-group" style="margin:0">
                <label>To</label>
                <input type="date" [(ngModel)]="to" />
            </div>
            <button class="btn btn-primary" (click)="load()" [disabled]="loading()">Run Report</button>
        </div>
    </div>

    @if (report()) {
    <div class="stats-grid" style="margin-bottom:16px">
        <div class="stat-card">
            <div class="label">Taxable Value</div>
            <div class="value">{{ report().totals.subtotal | number:'1.2-2' }}</div>
        </div>
        <div class="stat-card">
            <div class="label">CGST</div>
            <div class="value">{{ report().totals.cgst | number:'1.2-2' }}</div>
        </div>
        <div class="stat-card">
            <div class="label">SGST</div>
            <div class="value">{{ report().totals.sgst | number:'1.2-2' }}</div>
        </div>
        <div class="stat-card">
            <div class="label">Total GST</div>
            <div class="value">{{ report().totals.tax | number:'1.2-2' }}</div>
        </div>
        <div class="stat-card">
            <div class="label">Invoice Total</div>
            <div class="value">{{ report().totals.total | number:'1.2-2' }}</div>
        </div>
    </div>

    <div class="card">
        <div class="table-wrap">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Invoice #</th><th>Date</th><th>Customer</th>
                        <th class="num">Taxable</th><th class="num">CGST</th><th class="num">SGST</th>
                        <th class="num">Total GST</th><th class="num">Total</th>
                    </tr>
                </thead>
                <tbody>
                    @for (r of report().items; track r.id) {
                        <tr>
                            <td>{{ r.invoice_number }}</td>
                            <td>{{ r.issued_at | date:'mediumDate' }}</td>
                            <td>{{ r.customer_name }}</td>
                            <td class="num">{{ r.subtotal | number:'1.2-2' }}</td>
                            <td class="num">{{ r.cgst_amount | number:'1.2-2' }}</td>
                            <td class="num">{{ r.sgst_amount | number:'1.2-2' }}</td>
                            <td class="num">{{ r.tax_amount | number:'1.2-2' }}</td>
                            <td class="num">{{ r.total | number:'1.2-2' }}</td>
                        </tr>
                    } @empty {
                        <tr><td colspan="8" class="text-center text-muted">No invoices in this period.</td></tr>
                    }
                </tbody>
            </table>
        </div>
    </div>
    }
    `,
    styles: [`
        .toolbar { display:flex; gap:12px; align-items:flex-end; margin-bottom:0; }
        @media (max-width: 600px) {
            .toolbar { flex-direction: column; align-items: stretch; gap: 8px; }
        }
    `]
})
export class GstReportComponent implements OnInit {
    private api = inject(ApiService);
    private toast = inject(ToastService);

    from = '';
    to = '';
    report = signal<any>(null);
    loading = signal(false);

    ngOnInit() {
        const d = new Date();
        this.to = d.toISOString().slice(0, 10);
        d.setMonth(d.getMonth() - 1);
        this.from = d.toISOString().slice(0, 10);
    }

    load() {
        if (!this.from || !this.to) return;
        this.loading.set(true);
        this.api.getGstReport(this.from, this.to).subscribe({
            next: r => { this.report.set(r); this.loading.set(false); },
            error: () => { this.toast.error('Failed to load GST report'); this.loading.set(false); }
        });
    }
}
