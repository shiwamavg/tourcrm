// ─── lead-list.component.ts ───────────────────────────────────────
import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';

@Component({
    selector: 'app-lead-list',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterLink],
    template: `
    <div class="page-header">
        <div><h1>Leads</h1><p class="text-muted">{{ total() }} total leads</p></div>
        <div class="flex gap-2">
            <button class="btn-outline" (click)="showImport=!showImport">⬆ Import CSV</button>
            <a routerLink="/leads/new" class="btn-primary">+ New Lead</a>
        </div>
    </div>

    <!-- CSV Import -->
    @if (showImport) {
    <div class="card mb-4">
        <div class="card-body">
            <h3 style="margin-bottom:12px;">Import Leads from CSV</h3>
            <p class="text-muted text-sm" style="margin-bottom:12px;">Columns: Name, Email, Phone, Destination, TravelDate, Adults</p>
            <input type="file" accept=".csv" (change)="onCsvFile($event)">
            @if (importResult()) {
                <p style="margin-top:10px;color:var(--success);">✓ Imported: {{ importResult()!.imported }}, Skipped: {{ importResult()!.skipped }}</p>
            }
        </div>
    </div>
    }

    <!-- Filters -->
    <div class="filter-bar">
        <input type="text" placeholder="Search name, phone, email..." [formControl]="searchCtrl" style="max-width:260px;">
        <select [formControl]="statusCtrl">
            <option value="">All statuses</option>
            @for (s of statuses; track s) { <option [value]="s">{{ s }}</option> }
        </select>
        <select [formControl]="sourceCtrl">
            <option value="">All sources</option>
            <option value="manual">Manual</option>
            <option value="google_sheet">Google Sheet</option>
            <option value="website_form">Website Form</option>
            <option value="csv_upload">CSV Upload</option>
        </select>
        <div class="filter-actions">
            <button class="btn-outline" (click)="resetFilters()">Reset</button>
        </div>
    </div>

    <!-- Table -->
    <div class="card">
        <table class="data-table">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Phone</th>
                    <th>Destination</th>
                    <th>Travel Date</th>
                    <th>Source</th>
                    <th>Status</th>
                    <th>Follow-up</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                @if (loading()) {
                    <tr><td colspan="8" style="text-align:center;padding:32px;"><div class="loader"></div></td></tr>
                }
                @for (lead of leads(); track lead.id) {
                    <tr>
                        <td>
                            <a routerLink="/leads/{{ lead.id }}" style="font-weight:600;color:var(--primary);text-decoration:none;">{{ lead.full_name }}</a>
                            @if (lead.email) { <div class="text-muted text-sm">{{ lead.email }}</div> }
                        </td>
                        <td>{{ lead.phone }}</td>
                        <td>{{ lead.destination_name || lead.destination_text || '—' }}</td>
                        <td>{{ fmtDate(lead.travel_date_approx) }}</td>
                        <td><span class="text-sm text-muted">{{ lead.source.replace('_',' ') }}</span></td>
                        <td><span class="badge badge-{{ lead.status }}">{{ lead.status }}</span></td>
                        <td>
                            @if (lead.follow_up_at) {
                                <span [style.color]="isOverdue(lead.follow_up_at) ? 'var(--danger)' : 'inherit'">
                                    {{ fmtDate(lead.follow_up_at) }}
                                </span>
                            } @else { <span class="text-muted">—</span> }
                        </td>
                        <td class="actions">
                            <a routerLink="/leads/{{ lead.id }}" class="btn-ghost text-sm">View</a>
                            <a routerLink="/quotations/new" [queryParams]="{lead_id:lead.id}" class="btn-ghost text-sm">Quote</a>
                        </td>
                    </tr>
                }
                @if (!loading() && leads().length === 0) {
                    <tr><td colspan="8"><div class="empty-state"><div class="icon">👥</div><p>No leads found</p></div></td></tr>
                }
            </tbody>
        </table>
        <div class="pagination">
            <span>{{ (page()-1)*limit()+1 }}–{{ min(page()*limit(), total()) }} of {{ total() }}</span>
            <button [disabled]="page()===1" (click)="goPage(-1)">‹ Prev</button>
            <button [disabled]="page()*limit()>=total()" (click)="goPage(1)">Next ›</button>
        </div>
    </div>
    `
})
export class LeadListComponent implements OnInit {
    private api = inject(ApiService);
    private fb = inject(FormBuilder);

    leads = signal<any[]>([]);
    total = signal(0);
    loading = signal(false);
    page = signal(1);
    limit = signal(20);
    importResult = signal<any>(null);
    showImport = false;

    statuses = ['new','hot','warm','cold','follow_later','junked','converted','not_converted'];

    searchCtrl = this.fb.control('');
    statusCtrl = this.fb.control('');
    sourceCtrl = this.fb.control('');

    ngOnInit() {
        this.loadLeads();
        // React to filter changes with debounce
        [this.searchCtrl, this.statusCtrl, this.sourceCtrl].forEach(ctrl =>
            ctrl.valueChanges.subscribe(() => { this.page.set(1); this.loadLeads(); })
        );
    }

    loadLeads() {
        this.loading.set(true);
        const params: any = { page: this.page(), limit: this.limit() };
        if (this.searchCtrl.value) params.search = this.searchCtrl.value;
        if (this.statusCtrl.value) params.status = this.statusCtrl.value;
        if (this.sourceCtrl.value) params.source = this.sourceCtrl.value;

        this.api.getLeads(params).subscribe({
            next: (res: any) => { this.leads.set(res.data); this.total.set(res.total); this.loading.set(false); },
            error: () => this.loading.set(false)
        });
    }

    goPage(dir: number) { this.page.update(p => p + dir); this.loadLeads(); }
    resetFilters() { this.searchCtrl.reset(''); this.statusCtrl.reset(''); this.sourceCtrl.reset(''); }
    fmtDate(d: string) { return d ? new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '—'; }
    isOverdue(d: string) { return new Date(d) < new Date(); }
    min(a: number, b: number) { return Math.min(a, b); }

    onCsvFile(event: Event) {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (!file) return;
        import('papaparse').then(Papa => {
            Papa.default.parse(file, {
                header: true,
                complete: (result) => {
                    const leads = result.data.map((row: any) => ({
                        full_name: row['Name'] || row['name'],
                        email:     row['Email'] || row['email'],
                        phone:     row['Phone'] || row['phone'],
                        destination_text: row['Destination'] || row['destination'],
                        travel_date: row['TravelDate'] || row['travel_date'],
                        adults: row['Adults'] || 1
                    })).filter((l: any) => l.full_name && l.phone);
                    this.api.bulkImportLeads(leads).subscribe(res => {
                        this.importResult.set(res);
                        this.loadLeads();
                    });
                }
            });
        });
    }
}
