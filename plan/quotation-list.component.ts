// ─── quotation-list.component.ts ─────────────────────────────────
import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';

@Component({
    selector: 'app-quotation-list',
    standalone: true,
    imports: [CommonModule, RouterLink, ReactiveFormsModule],
    template: `
    <div class="page-header">
        <div><h1>Quotations</h1></div>
        <a routerLink="/quotations/new" class="btn-primary">+ New Quotation</a>
    </div>

    <div class="filter-bar">
        <select [formControl]="statusCtrl">
            <option value="">All statuses</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
        </select>
    </div>

    <div class="card">
        <table class="data-table">
            <thead>
                <tr>
                    <th>Quotation #</th>
                    <th>Lead / Customer</th>
                    <th>Destination</th>
                    <th>Dates</th>
                    <th>Package</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                @for (q of quotations(); track q.id) {
                    <tr>
                        <td><a routerLink="/quotations/{{ q.id }}" style="font-weight:600;color:var(--primary);text-decoration:none;">{{ q.quotation_number }}</a></td>
                        <td>{{ q.lead_name }}<div class="text-muted text-sm">{{ q.lead_phone }}</div></td>
                        <td>{{ q.destination_name || q.destination_text }}</td>
                        <td class="text-sm">{{ fmtDate(q.trip_start_date) }} → {{ fmtDate(q.trip_end_date) }}</td>
                        <td class="text-sm text-muted">{{ q.package_type.replace(/_/g,' ') }}</td>
                        <td style="font-weight:600;">₹{{ fmt(q.grand_total) }}</td>
                        <td><span class="badge badge-{{ q.status }}">{{ q.status }}</span></td>
                        <td class="actions">
                            <a routerLink="/quotations/{{ q.id }}" class="btn-ghost text-sm">View</a>
                        </td>
                    </tr>
                }
                @if (quotations().length === 0) {
                    <tr><td colspan="8"><div class="empty-state"><div class="icon">📄</div><p>No quotations found</p></div></td></tr>
                }
            </tbody>
        </table>
    </div>
    `
})
export class QuotationListComponent implements OnInit {
    private api = inject(ApiService);
    private fb = inject(FormBuilder);
    private route = inject(ActivatedRoute);
    quotations = signal<any[]>([]);
    statusCtrl = this.fb.control('');

    ngOnInit() {
        const leadId = this.route.snapshot.queryParams['lead_id'];
        this.load(leadId);
        this.statusCtrl.valueChanges.subscribe(s => this.load(leadId, s || ''));
    }
    load(leadId?: string, status?: string) {
        const params: any = {};
        if (leadId) params.lead_id = leadId;
        if (status) params.status = status;
        this.api.getQuotations(params).subscribe(q => this.quotations.set(q));
    }
    fmtDate(d: string) { return d ? new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'2-digit' }) : '—'; }
    fmt(n: any) { return parseFloat(n||0).toLocaleString('en-IN', { minimumFractionDigits: 0 }); }
}
