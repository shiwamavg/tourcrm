import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '../core/services/auth.service';
import { ToastService } from '../core/services/toast.service';
import { QuickActionsService } from '../core/services/quick-actions.service';
import { GlobalSearchService } from '../core/services/global-search.service';
import { ToastContainerComponent } from '../shared/components/toast-container.component';
import { QuickActionsComponent } from '../shared/components/quick-actions.component';
import { SearchModalComponent } from '../shared/components/search-modal.component';

@Component({
    selector: 'app-shell',
    standalone: true,
    imports: [
        CommonModule, RouterOutlet, RouterLink, RouterLinkActive,
        ToastContainerComponent, QuickActionsComponent, SearchModalComponent
    ],
    template: `
    <div class="app-shell" [class.mobile-open]="sidebarOpen()">
        <aside class="sidebar">
            <div class="sidebar-brand">
                <span class="brand-text">Tour CRM</span>
                <small>Sikkim Trails Travel</small>
            </div>
            <button class="sidebar-close" (click)="sidebarOpen.set(false)" aria-label="Close menu">×</button>
            <nav class="sidebar-nav">
                <a routerLink="/dashboard" routerLinkActive="active">
                    <span class="nav-icon">📊</span> <span class="nav-label">Dashboard</span>
                </a>
                <a routerLink="/reports" routerLinkActive="active">
                    <span class="nav-icon">📈</span> <span class="nav-label">Analytics Reports</span>
                </a>

                <div class="group-label">Sales</div>
                <a routerLink="/leads" routerLinkActive="active">
                    <span class="nav-icon">🎯</span> <span class="nav-label">Leads</span>
                    @if (leadCount() > 0) {
                        <span class="nav-badge">{{ leadCount() }}</span>
                    }
                </a>
                <a routerLink="/quotations" routerLinkActive="active" [routerLinkActiveOptions]="{exact:true}">
                    <span class="nav-icon">📋</span> <span class="nav-label">All Quotations</span>
                </a>
                <a routerLink="/bookings" routerLinkActive="active">
                    <span class="nav-icon">📦</span> <span class="nav-label">Bookings</span>
                </a>

                <div class="group-label">Finance</div>
                <a routerLink="/payments" routerLinkActive="active">
                    <span class="nav-icon">💰</span> <span class="nav-label">Payments</span>
                </a>
                <a routerLink="/invoices" routerLinkActive="active">
                    <span class="nav-icon">🧾</span> <span class="nav-label">Invoices</span>
                </a>

                <div class="group-label">Operations</div>
                <a routerLink="/itineraries" routerLinkActive="active">
                    <span class="nav-icon">📅</span> <span class="nav-label">Itineraries</span>
                </a>
                <a routerLink="/suppliers" routerLinkActive="active">
                    <span class="nav-icon">🏢</span> <span class="nav-label">Suppliers</span>
                </a>
                <a routerLink="/gds-search" routerLinkActive="active">
                    <span class="nav-icon">✈️</span> <span class="nav-label">GDS Search</span>
                </a>
                <a routerLink="/tasks" routerLinkActive="active">
                    <span class="nav-icon">✅</span> <span class="nav-label">Tasks</span>
                </a>
                <a routerLink="/reminders" routerLinkActive="active">
                    <span class="nav-icon">🔔</span> <span class="nav-label">Reminders</span>
                </a>
                <a routerLink="/fixed-departures" routerLinkActive="active">
                    <span class="nav-icon">🚌</span> <span class="nav-label">Fixed Departures</span>
                </a>

                <div class="group-label">Customer</div>
                <a routerLink="/reviews" routerLinkActive="active">
                    <span class="nav-icon">⭐</span> <span class="nav-label">Reviews</span>
                </a>
                <a routerLink="/travellers" routerLinkActive="active">
                    <span class="nav-icon">👥</span> <span class="nav-label">Travellers</span>
                </a>
                <a routerLink="/visas" routerLinkActive="active">
                    <span class="nav-icon">🛂</span> <span class="nav-label">Visas</span>
                </a>

                <div class="group-label">Marketing</div>
                <a routerLink="/email-campaigns" routerLinkActive="active">
                    <span class="nav-icon">📧</span> <span class="nav-label">Email Campaigns</span>
                </a>
                <a routerLink="/landing-pages" routerLinkActive="active">
                    <span class="nav-icon">🌐</span> <span class="nav-label">Landing Pages</span>
                </a>
                <a routerLink="/flyer-designer" routerLinkActive="active">
                    <span class="nav-icon">🎨</span> <span class="nav-label">Flyer Designer</span>
                </a>
                <a routerLink="/b2b-marketplace" routerLinkActive="active">
                    <span class="nav-icon">🤝</span> <span class="nav-label">B2B Network</span>
                </a>
                <a routerLink="/whatsapp" routerLinkActive="active">
                    <span class="nav-icon">💬</span> <span class="nav-label">WhatsApp</span>
                </a>

                @if (isAdmin()) {
                    <div class="group-label">Admin</div>
                    <a routerLink="/admin/destinations" routerLinkActive="active">
                        <span class="nav-icon">🌍</span> <span class="nav-label">Destinations</span>
                    </a>
                    <a routerLink="/admin/hotel-rates" routerLinkActive="active">
                        <span class="nav-icon">🏨</span> <span class="nav-label">Hotel Rates</span>
                    </a>
                    <a routerLink="/admin/car-rates" routerLinkActive="active">
                        <span class="nav-icon">🚗</span> <span class="nav-label">Car Rates</span>
                    </a>
                    <a routerLink="/admin/users" routerLinkActive="active">
                        <span class="nav-icon">👤</span> <span class="nav-label">Users</span>
                    </a>
                    <a routerLink="/admin/roles" routerLinkActive="active">
                        <span class="nav-icon">🔐</span> <span class="nav-label">Roles</span>
                    </a>
                    <a routerLink="/admin/settings" routerLinkActive="active">
                        <span class="nav-icon">⚙️</span> <span class="nav-label">Settings</span>
                    </a>
                    <a routerLink="/admin/usage" routerLinkActive="active">
                        <span class="nav-icon">📊</span> <span class="nav-label">Usage & Limits</span>
                    </a>
                    <a routerLink="/admin/billing" routerLinkActive="active">
                        <span class="nav-icon">💳</span> <span class="nav-label">Billing & Subscription</span>
                    </a>
                    <a routerLink="/admin/message-templates" routerLinkActive="active">
                        <span class="nav-icon">📝</span> <span class="nav-label">Message Templates</span>
                    </a>
                    <a routerLink="/admin/payment-reminders" routerLinkActive="active">
                        <span class="nav-icon">⏰</span> <span class="nav-label">Payment Reminders</span>
                    </a>
                    <a routerLink="/admin/followup-sequences" routerLinkActive="active">
                        <span class="nav-icon">🔄</span> <span class="nav-label">Follow-up Sequences</span>
                    </a>
                    <a routerLink="/admin/gst-report" routerLinkActive="active">
                        <span class="nav-icon">📊</span> <span class="nav-label">GST Report</span>
                    </a>
                }
            </nav>
            <div class="sidebar-user">
                <div class="user-info">
                    <div class="name">{{ auth.user()?.full_name }}</div>
                    <div class="role">{{ auth.user()?.role }}</div>
                </div>
                <button (click)="auth.logout()" title="Logout">Logout</button>
            </div>
        </aside>

        <!-- Mobile sidebar overlay -->
        @if (sidebarOpen()) {
            <div class="sidebar-overlay" (click)="sidebarOpen.set(false)"></div>
        }

        <div class="main">
            <header class="topbar">
                <div class="topbar-left">
                    <button class="menu-toggle" (click)="sidebarOpen.set(true)" aria-label="Open menu">
                        <span></span><span></span><span></span>
                    </button>
                    <div class="page-title">{{ pageTitle() }}</div>
                </div>
                <div class="topbar-actions">
                    <button class="theme-toggle" (click)="toggleTheme()"
                        [attr.title]="darkMode() ? 'Switch to light mode' : 'Switch to dark mode'">
                        {{ darkMode() ? '☀️' : '🌙' }}
                    </button>
                    <button class="btn btn-icon" (click)="search.toggle()" title="Search (Ctrl+Shift+F)">
                        🔍
                    </button>
                    <button class="btn btn-icon" (click)="qa.toggle()" title="Command palette (Ctrl+K)">
                        ⌘
                    </button>
                    <a routerLink="/quotations/new" class="btn btn-primary btn-sm">+ New Quotation</a>
                </div>
            </header>
            <main class="content">
                <router-outlet></router-outlet>
            </main>
        </div>
    </div>

    <app-toast-container></app-toast-container>
    <app-quick-actions></app-quick-actions>
    <app-search-modal></app-search-modal>
`,
    styles: [`
        .sidebar { transition: transform .25s ease; z-index: 100; }
        .sidebar-close { display: none; }
        .nav-badge {
            margin-left: auto; background: var(--primary); color: #fff;
            font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 10px;
        }

        @media (max-width: 768px) {
            .sidebar { transform: translateX(-100%); z-index: 200; }
            .app-shell.mobile-open .sidebar { transform: translateX(0); }
            .sidebar-overlay {
                position: fixed; inset: 0; background: rgba(15,23,42,0.5); z-index: 150;
                animation: fadeIn .2s ease;
            }
            .sidebar-close {
                display: flex; align-items: center; justify-content: center;
                position: absolute; top: 12px; right: 12px;
                background: rgba(255,255,255,0.06); border: none;
                color: #94a3b8; font-size: 20px; width: 28px; height: 28px;
                border-radius: 6px; cursor: pointer;
            }
            .sidebar-close:hover { background: rgba(255,255,255,0.12); color: #e2e8f0; }
            .main { margin-left: 0; }
            .menu-toggle { display: flex; }
            .topbar { padding: 0 16px; }
            .content { padding: 12px; }
        }
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
    `]
})
export class ShellComponent implements OnInit {
    auth = inject(AuthService);
    private router = inject(Router);
    toast = inject(ToastService);
    qa = inject(QuickActionsService);
    search = inject(GlobalSearchService);

    pageTitle = signal('Dashboard');
    sidebarOpen = signal(false);
    leadCount = signal(0);
    darkMode = signal(false);

    isAdmin = () => this.auth.user()?.role === 'admin' || this.auth.user()?.role === 'manager';

    private titleMap: Record<string, string> = {
        '/dashboard': 'Dashboard',
        '/leads': 'Leads',
        '/leads/new': 'New Lead',
        '/quotations': 'Quotations',
        '/quotations/new': 'New Quotation',
        '/bookings': 'Bookings',
        '/payments': 'Payments',
        '/invoices': 'Invoices',
        '/reviews': 'Reviews',
        '/admin/destinations': 'Destinations',
        '/admin/hotel-rates': 'Hotel Rates',
        '/admin/car-rates': 'Car Rates',
        '/admin/users': 'Users & Roles',
        '/admin/users/new': 'New User',
        '/admin/roles': 'Role Permissions',
        '/admin/settings': 'Settings',
        '/admin/usage': 'Usage & Limits',
        '/admin/billing': 'Billing & Subscription',
        '/admin/message-templates': 'Message Templates',
        '/admin/payment-reminders': 'Payment Reminders',
        '/admin/followup-sequences': 'Follow-up Sequences',
        '/admin/gst-report': 'GST Report',
        '/suppliers': 'Suppliers',
        '/tasks': 'Tasks',
        '/itineraries': 'Itineraries',
        '/travellers': 'Travellers',
        '/reminders': 'Reminders',
        '/whatsapp': 'WhatsApp',
        '/fixed-departures': 'Fixed Departures',
        '/visas': 'Visas',
        '/currencies': 'Currencies',
        '/landing-pages': 'Landing Pages',
        '/email-campaigns': 'Email Campaigns',
        '/b2b-marketplace': 'B2B Network',
        '/gds-search': 'GDS Search',
        '/flyer-designer': 'Flyer Designer',
        '/reports': 'Analytics Reports',
    };

    ngOnInit() {
        this.initTheme();
        this.qa.setupDefaults();
        this.search.initShortcut();

        // Update page title on navigation
        this.router.events
            .pipe(filter(e => e instanceof NavigationEnd))
            .subscribe((e: NavigationEnd) => {
                this.pageTitle.set(this.resolveTitle(e.urlAfterRedirects));
                this.sidebarOpen.set(false);
            });
    }

    private initTheme() {
        const stored = localStorage.getItem('crm_theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const isDark = stored ? stored === 'dark' : prefersDark;
        this.darkMode.set(isDark);
        document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    }

    toggleTheme() {
        const next = !this.darkMode();
        this.darkMode.set(next);
        document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
        localStorage.setItem('crm_theme', next ? 'dark' : 'light');
    }

    private resolveTitle(url: string): string {
        // Exact match first
        if (this.titleMap[url]) return this.titleMap[url];
        // Remove query params and trailing slash
        const clean = url.split('?')[0].replace(/\/$/, '');
        if (this.titleMap[clean]) return this.titleMap[clean];
        // Pattern match for detail pages
        if (clean.startsWith('/leads/')) return 'Lead Detail';
        if (clean.startsWith('/quotations/')) return 'Quotation Detail';
        if (clean.startsWith('/bookings/')) return 'Booking Detail';
        if (clean.startsWith('/admin/users/')) return 'Edit User';
        if (clean.startsWith('/itineraries/')) return 'Itinerary Detail';
        return 'Tour CRM';
    }
}
