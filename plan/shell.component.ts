import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
    selector: 'app-shell',
    standalone: true,
    imports: [CommonModule, RouterModule, RouterLink, RouterLinkActive],
    template: `
    <div class="shell-layout">
        <!-- Sidebar -->
        <aside class="sidebar">
            <div class="sidebar-logo">
                <span>✈</span> TravelCRM
            </div>

            <nav class="sidebar-nav">
                <div class="sidebar-section-label">Main</div>
                <a routerLink="/dashboard" routerLinkActive="active">
                    <span>📊</span> Dashboard
                </a>
                <a routerLink="/leads" routerLinkActive="active">
                    <span>👥</span> Leads
                </a>
                <a routerLink="/quotations" routerLinkActive="active">
                    <span>📄</span> Quotations
                </a>
                <a routerLink="/bookings" routerLinkActive="active">
                    <span>📅</span> Bookings
                </a>

                @if (auth.hasRole(['admin', 'manager'])) {
                    <div class="sidebar-section-label">Admin</div>
                    <a routerLink="/admin/destinations" routerLinkActive="active">
                        <span>🗺</span> Destinations
                    </a>
                    <a routerLink="/admin/hotel-rates" routerLinkActive="active">
                        <span>🏨</span> Hotel Rates
                    </a>
                    <a routerLink="/admin/car-rates" routerLinkActive="active">
                        <span>🚗</span> Car Rates
                    </a>
                }

                @if (auth.hasRole(['admin'])) {
                    <a routerLink="/admin/users" routerLinkActive="active">
                        <span>👤</span> Staff Users
                    </a>
                    <a routerLink="/admin/settings" routerLinkActive="active">
                        <span>⚙️</span> Settings
                    </a>
                }
            </nav>

            <div class="sidebar-footer">
                <div style="font-size:13px;color:#94a3b8;margin-bottom:8px;">
                    {{ auth.currentUser()?.name }}<br>
                    <span style="font-size:11px;text-transform:uppercase;letter-spacing:0.05em;">{{ auth.currentUser()?.role }}</span>
                </div>
                <button class="btn-ghost" style="color:#94a3b8;font-size:13px;padding:4px 0;" (click)="auth.logout()">
                    ↩ Logout
                </button>
            </div>
        </aside>

        <!-- Main content area -->
        <div class="main-area">
            <header class="top-bar">
                <div></div>
                <div style="display:flex;align-items:center;gap:16px;font-size:14px;color:var(--text-muted);">
                    <span>{{ today }}</span>
                </div>
            </header>
            <div class="page-content">
                <router-outlet />
            </div>
        </div>
    </div>
    `
})
export class ShellComponent {
    auth = inject(AuthService);
    today = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}
