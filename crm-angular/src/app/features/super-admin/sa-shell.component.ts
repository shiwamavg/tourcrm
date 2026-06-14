import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { SuperAdminAuthService } from '../../core/services/super-admin-auth.service';

@Component({
    selector: 'app-sa-shell',
    standalone: true,
    imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
    template: `
    <div class="sa-shell">
        <aside class="sa-sidebar">
            <div class="sa-brand">
                <div class="sa-brand-title">Tour CRM</div>
                <div class="sa-brand-sub">Super Admin</div>
            </div>
            <nav class="sa-nav">
                <a routerLink="/super-admin/dashboard" routerLinkActive="active">Dashboard</a>
                <a routerLink="/super-admin/companies" routerLinkActive="active">Companies</a>
                <a routerLink="/super-admin/packages" routerLinkActive="active">Packages</a>
                <a routerLink="/super-admin/payments" routerLinkActive="active">Payments</a>
                <a routerLink="/super-admin/invoices" routerLinkActive="active">Invoices</a>
            </nav>
            <div class="sa-footer">
                <button class="sa-logout" (click)="auth.logout()">Logout</button>
            </div>
        </aside>
        <main class="sa-main">
            <router-outlet></router-outlet>
        </main>
    </div>
    `,
    styles: [`
        .sa-shell { display:flex; min-height:100vh; }
        .sa-sidebar { width:220px; background:#0f172a; color:#e2e8f0; display:flex; flex-direction:column; flex-shrink:0; }
        .sa-brand { padding:20px; border-bottom:1px solid #1e293b; }
        .sa-brand-title { font-weight:700; font-size:1.1rem; color:#fff; }
        .sa-brand-sub { font-size:11px; color:#64748b; }
        .sa-nav { flex:1; padding:12px 0; }
        .sa-nav a { display:block; padding:10px 20px; color:#cbd5e1; text-decoration:none; font-size:14px; }
        .sa-nav a:hover { background:#1e293b; color:#fff; }
        .sa-nav a.active { background:#1e293b; color:#fff; border-left:3px solid #0f766e; }
        .sa-footer { padding:14px 20px; border-top:1px solid #1e293b; }
        .sa-logout { background:transparent; color:#94a3b8; border:none; cursor:pointer; font-size:12px; }
        .sa-logout:hover { color:#fff; }
        .sa-main { flex:1; padding:24px; background:#f8fafc; }
    `]
})
export class SaShellComponent {
    auth = inject(SuperAdminAuthService);
}
