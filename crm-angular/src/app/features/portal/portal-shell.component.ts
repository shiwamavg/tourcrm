import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink } from '@angular/router';
import { PortalAuthService } from './portal-auth.service';

@Component({
    selector: 'app-portal-shell',
    standalone: true,
    imports: [CommonModule, RouterOutlet, RouterLink],
    template: `
    <header class="portal-header">
        <div class="inner">
            <a routerLink="/portal/bookings" class="brand">Tour CRM Portal</a>
            @if (auth.isLoggedIn()) {
                <div class="user-area">
                    <span>{{ auth.email() }}</span>
                    <button (click)="auth.logout()">Logout</button>
                </div>
            }
        </div>
    </header>
    <main class="portal-main">
        <router-outlet></router-outlet>
    </main>
    `,
    styles: [`
        .portal-header { background:#0f766e; color:#fff; padding:0 24px; }
        .inner { display:flex; align-items:center; justify-content:space-between; height:56px; max-width:1000px; margin:0 auto; }
        .brand { color:#fff; text-decoration:none; font-weight:700; font-size:1rem; }
        .user-area { display:flex; align-items:center; gap:12px; font-size:13px; }
        .user-area button { background:rgba(255,255,255,.15); color:#fff; border:none; border-radius:6px; padding:6px 12px; cursor:pointer; font-size:12px; }
        .user-area button:hover { background:rgba(255,255,255,.25); }
        .portal-main { max-width:1000px; margin:0 auto; padding:24px; }
    `]
})
export class PortalShellComponent {
    auth = inject(PortalAuthService);
}
