import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SuperAdminApiService } from '../../core/services/super-admin-api.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
    selector: 'app-sa-company-detail',
    standalone: true,
    imports: [CommonModule, RouterLink],
    template: `
    <div class="toolbar">
        <a class="btn ghost" routerLink="/super-admin/companies">← Back</a>
        <h1 style="margin:0;">{{ company()?.name }}</h1>
    </div>
    @if (loading()) {
        <div>Loading…</div>
    } @else if (company()) {
        <div class="cards">
            <div class="card">
                <h3>Company Details</h3>
                <div class="row"><b>ID:</b> {{ company().id }}</div>
                <div class="row"><b>Name:</b> {{ company().name }}</div>
                <div class="row"><b>Contact:</b> {{ company().contact_name }}</div>
                <div class="row"><b>Email:</b> {{ company().contact_email }}</div>
                <div class="row"><b>Phone:</b> {{ company().contact_phone }}</div>
                <div class="row"><b>Status:</b> <span class="badge" [class]="company().status">{{ company().status }}</span></div>
                <div class="row"><b>Subscription:</b> <span class="badge" [class]="company().subscription_status">{{ company().subscription_status }}</span></div>
                <div class="row"><b>Trial ends:</b> {{ company().trial_ends_at | date:'mediumDate' }}</div>
                <div class="row"><b>Package:</b> {{ company().package_name || '-' }}</div>
                <div class="row"><b>Subscribed at:</b> {{ company().subscription_start_date | date:'mediumDate' }}</div>
                <div class="row"><b>Renewal:</b> {{ company().subscription_end_date | date:'mediumDate' }}</div>
                <div class="row"><b>Users:</b> {{ company().user_count }} / {{ company().max_users }}</div>
                <div class="row"><b>Leads:</b> {{ company().lead_count }} / {{ company().max_leads }}</div>
                <div class="row"><b>Quotations:</b> {{ company().quotation_count }} / {{ company().max_quotations }}</div>
                <div class="row"><b>Bookings:</b> {{ company().booking_count }} / {{ company().max_bookings }}</div>
            </div>
            <div class="card">
                <h3>Usage</h3>
                <div class="progress-row"><div class="progress-label">Users</div><div class="progress"><div class="progress-inner" [style.width.%]="pct(company().user_count, company().max_users)"></div></div></div>
                <div class="progress-row"><div class="progress-label">Leads</div><div class="progress"><div class="progress-inner" [style.width.%]="pct(company().lead_count, company().max_leads)"></div></div></div>
                <div class="progress-row"><div class="progress-label">Quotations</div><div class="progress"><div class="progress-inner" [style.width.%]="pct(company().quotation_count, company().max_quotations)"></div></div></div>
                <div class="progress-row"><div class="progress-label">Bookings</div><div class="progress"><div class="progress-inner" [style.width.%]="pct(company().booking_count, company().max_bookings)"></div></div></div>
            </div>
        </div>
    }
    `,
    styles: [`
        .toolbar { display:flex; align-items:center; gap:10px; margin-bottom:14px; }
        .btn.ghost { background:#f3f4f6; color:#374151; padding:6px 10px; border-radius:6px; text-decoration:none; font-size:13px; }
        .cards { display:grid; grid-template-columns: 1fr 1fr; gap:14px; }
        .card { background:#fff; border:1px solid #e5e7eb; border-radius:8px; padding:14px; }
        .card h3 { margin:0 0 10px; font-size:14px; }
        .row { font-size:13px; margin-bottom:6px; color:#374151; }
        .badge { display:inline-block; padding:2px 8px; border-radius:999px; font-size:11px; text-transform:capitalize; }
        .badge.active { background:#dcfce7; color:#166534; }
        .badge.suspended { background:#fee2e2; color:#991b1b; }
        .progress-row { display:flex; align-items:center; gap:8px; margin-bottom:8px; }
        .progress-label { width:80px; font-size:12px; color:#6b7280; }
        .progress { flex:1; height:10px; background:#e5e7eb; border-radius:5px; overflow:hidden; }
        .progress-inner { height:100%; background:#0f766e; border-radius:5px; }
    `]
})
export class SaCompanyDetailComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private api = inject(SuperAdminApiService);
    private toast = inject(ToastService);

    loading = signal(true);
    company = signal<any>(null);

    ngOnInit() {
        const id = Number(this.route.snapshot.paramMap.get('id'));
        this.api.getCompany(id).subscribe({
            next: c => { this.company.set(c); this.loading.set(false); },
            error: () => { this.loading.set(false); this.toast.error('Failed to load company'); }
        });
    }

    pct(current: number, max: number): number {
        if (!max) return 0;
        return Math.min(100, (current || 0) / max * 100);
    }
}
