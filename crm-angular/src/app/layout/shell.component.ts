import { Component, inject, signal, OnInit, computed } from '@angular/core';
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
import { ApiService } from '../core/services/api.service';

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
                <a routerLink="/calendar" routerLinkActive="active">
                    <span class="nav-icon">📅</span> <span class="nav-label">Departure Calendar</span>
                </a>

                <!-- Sales Group -->
                <div class="group-label" (click)="toggle('sales')" style="cursor:pointer; user-select:none;">
                    Sales <span class="group-arrow">{{ collapsed['sales'] ? '▸' : '▾' }}</span>
                </div>
                @if (!collapsed['sales']) {
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
                }

                <!-- Finance Group -->
                <div class="group-label" (click)="toggle('finance')" style="cursor:pointer; user-select:none;">
                    Finance <span class="group-arrow">{{ collapsed['finance'] ? '▸' : '▾' }}</span>
                </div>
                @if (!collapsed['finance']) {
                    <a routerLink="/payments" routerLinkActive="active">
                        <span class="nav-icon">💰</span> <span class="nav-label">Payments</span>
                    </a>
                    <a routerLink="/invoices" routerLinkActive="active">
                        <span class="nav-icon">🧾</span> <span class="nav-label">Invoices</span>
                    </a>
                }

                <!-- Operations Group -->
                <div class="group-label" (click)="toggle('operations')" style="cursor:pointer; user-select:none;">
                    Operations <span class="group-arrow">{{ collapsed['operations'] ? '▸' : '▾' }}</span>
                </div>
                @if (!collapsed['operations']) {
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
                }

                <!-- Customer Group -->
                <div class="group-label" (click)="toggle('customer')" style="cursor:pointer; user-select:none;">
                    Customer <span class="group-arrow">{{ collapsed['customer'] ? '▸' : '▾' }}</span>
                </div>
                @if (!collapsed['customer']) {
                    <a routerLink="/reviews" routerLinkActive="active">
                        <span class="nav-icon">⭐</span> <span class="nav-label">Reviews</span>
                    </a>
                    <a routerLink="/travellers" routerLinkActive="active">
                        <span class="nav-icon">👥</span> <span class="nav-label">Travellers</span>
                    </a>
                    <a routerLink="/visas" routerLinkActive="active">
                        <span class="nav-icon">🛂</span> <span class="nav-label">Visas</span>
                    </a>
                }

                <!-- Marketing Group -->
                <div class="group-label" (click)="toggle('marketing')" style="cursor:pointer; user-select:none;">
                    Marketing <span class="group-arrow">{{ collapsed['marketing'] ? '▸' : '▾' }}</span>
                </div>
                @if (!collapsed['marketing']) {
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
                }

                @if (isAdmin()) {
                    <div class="group-label" (click)="toggle('admin')" style="cursor:pointer; user-select:none;">
                        Admin <span class="group-arrow">{{ collapsed['admin'] ? '▸' : '▾' }}</span>
                    </div>
                    @if (!collapsed['admin']) {
                        <a routerLink="/admin/destinations" routerLinkActive="active">
                            <span class="nav-icon">🌍</span> <span class="nav-label">Destinations</span>
                        </a>
                        <a routerLink="/admin/packages" routerLinkActive="active">
                            <span class="nav-icon">🧳</span> <span class="nav-label">Tour Packages</span>
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
                        <a routerLink="/admin/agents" routerLinkActive="active">
                            <span class="nav-icon">🤝</span> <span class="nav-label">B2B Agents</span>
                        </a>
                        <a routerLink="/admin/commissions" routerLinkActive="active">
                            <span class="nav-icon">💰</span> <span class="nav-label">Agent Commissions</span>
                        </a>
                    }
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
                </div>
                <div class="topbar-actions">
                    <button class="theme-toggle" (click)="toggleTheme()"
                        [attr.title]="darkMode() ? 'Switch to light mode' : 'Switch to dark mode'">
                        {{ darkMode() ? '☀️' : '🌙' }}
                    </button>

                    <!-- Notifications Bell -->
                    <div class="notif-wrap" (click)="notifOpen.set(!notifOpen())">
                        <button class="btn btn-icon notif-btn" title="Notifications">
                            🔔
                            @if (notifCount() > 0) {
                                <span class="notif-dot">{{ notifCount() }}</span>
                            }
                        </button>
                        @if (notifOpen()) {
                            <div class="notif-dropdown" (click)="$event.stopPropagation()">
                                <div class="notif-header">
                                    <strong>Notifications</strong>
                                    @if (notifCount() > 0) { <span class="notif-count-badge">{{ notifCount() }}</span> }
                                </div>
                                @if (notifications().length === 0) {
                                    <div class="notif-empty">🎉 All caught up!</div>
                                } @else {
                                    @for (n of notifications(); track n.id) {
                                        <a [routerLink]="n.link" class="notif-item" (click)="notifOpen.set(false)">
                                            <span class="notif-icon">{{ n.icon }}</span>
                                            <div class="notif-body">
                                                <div class="notif-title">{{ n.title }}</div>
                                                <div class="notif-sub">{{ n.subtitle }}</div>
                                            </div>
                                            @if (n.urgent) { <span class="notif-urgent-dot"></span> }
                                        </a>
                                    }
                                }
                            </div>
                        }
                    </div>

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
        .group-label {
            display: flex; align-items: center; justify-content: space-between;
        }
        .group-arrow {
            font-size: 10px; color: #475569; margin-left: 4px; transition: transform .2s;
        }

        /* Notifications */
        .notif-wrap { position: relative; }
        .notif-btn { position: relative; }
        .notif-dot {
            position: absolute; top: -4px; right: -4px;
            background: #ef4444; color: #fff;
            font-size: 9px; font-weight: 800;
            min-width: 16px; height: 16px; border-radius: 8px;
            display: flex; align-items: center; justify-content: center;
            padding: 0 3px; line-height: 1;
            border: 2px solid #fff;
        }
        .notif-dropdown {
            position: absolute; top: calc(100% + 8px); right: 0;
            width: 320px; background: #fff;
            border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,.16);
            border: 1px solid #e5e7eb; z-index: 9999;
            overflow: hidden;
            animation: slideDown .15s ease;
        }
        @keyframes slideDown { from { opacity:0; transform:translateY(-6px) } to { opacity:1; transform:translateY(0) } }
        .notif-header {
            display: flex; align-items: center; justify-content: space-between;
            padding: 12px 16px; border-bottom: 1px solid #f3f4f6;
            font-size: 14px;
        }
        .notif-count-badge {
            background: #ef4444; color: #fff; font-size: 10px; font-weight: 700;
            padding: 1px 7px; border-radius: 8px;
        }
        .notif-empty { padding: 24px 16px; text-align: center; color: #6b7280; font-size: 13px; }
        .notif-item {
            display: flex; align-items: flex-start; gap: 10px;
            padding: 10px 16px; border-bottom: 1px solid #f9fafb;
            text-decoration: none; color: inherit; transition: background .1s;
            position: relative;
        }
        .notif-item:hover { background: #f9fafb; }
        .notif-item:last-child { border-bottom: none; }
        .notif-icon { font-size: 20px; flex-shrink: 0; padding-top: 1px; }
        .notif-body { flex: 1; min-width: 0; }
        .notif-title { font-size: 13px; font-weight: 600; color: #111827; line-height: 1.3; }
        .notif-sub { font-size: 11px; color: #6b7280; margin-top: 1px; }
        .notif-urgent-dot {
            width: 8px; height: 8px; border-radius: 50%; background: #ef4444;
            flex-shrink: 0; margin-top: 5px;
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
            .notif-dropdown { right: -60px; width: 290px; }
        }
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
    `]
})
export class ShellComponent implements OnInit {
    auth = inject(AuthService);
    private api = inject(ApiService);
    private router = inject(Router);
    toast = inject(ToastService);
    qa = inject(QuickActionsService);
    search = inject(GlobalSearchService);

    pageTitle = signal('Dashboard');
    sidebarOpen = signal(false);
    leadCount = signal(0);
    darkMode = signal(false);
    notifOpen = signal(false);
    notifications = signal<{ id: string; icon: string; title: string; subtitle: string; link: string; urgent?: boolean }[]>([]);

    // Collapsible groups — persisted to localStorage
    collapsed: Record<string, boolean> = this.loadCollapsed();

    notifCount = computed(() => this.notifications().length);

    isAdmin = () => this.auth.user()?.role === 'admin' || this.auth.user()?.role === 'manager';

    toggle(group: string) {
        this.collapsed[group] = !this.collapsed[group];
        localStorage.setItem('crm_collapsed', JSON.stringify(this.collapsed));
    }

    private loadCollapsed(): Record<string, boolean> {
        try {
            const stored = localStorage.getItem('crm_collapsed');
            return stored ? JSON.parse(stored) : {};
        } catch { return {}; }
    }

    private titleMap: Record<string, string> = {
        '/dashboard': 'Dashboard',
        '/leads': 'Leads',
        '/leads/new': 'New Lead',
        '/quotations': 'Quotations',
        '/quotations/new': 'New Quotation',
        '/bookings': 'Bookings',
        '/calendar': 'Departure Calendar',
        '/payments': 'Payments',
        '/invoices': 'Invoices',
        '/reviews': 'Reviews',
        '/admin/destinations': 'Destinations',
        '/admin/packages': 'Tour Packages',
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
        '/admin/agents': 'B2B Agents',
        '/admin/commissions': 'Agent Commissions',
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

        this.router.events
            .pipe(filter(e => e instanceof NavigationEnd))
            .subscribe((e: NavigationEnd) => {
                this.pageTitle.set(this.resolveTitle(e.urlAfterRedirects));
                this.sidebarOpen.set(false);
                this.notifOpen.set(false);
            });

        // Load notifications
        this.loadNotifications();
    }

    private loadNotifications() {
        const notifs: { id: string; icon: string; title: string; subtitle: string; link: string; urgent?: boolean }[] = [];

        // Overdue follow-ups
        this.api.getReminderStats().subscribe({
            next: (stats) => {
                this.leadCount.set(stats?.new_count || 0);
                if (stats?.overdue > 0) {
                    notifs.push({
                        id: 'overdue',
                        icon: '🚨',
                        title: `${stats.overdue} overdue follow-up${stats.overdue > 1 ? 's' : ''}`,
                        subtitle: 'Clients waiting for contact',
                        link: '/reminders',
                        urgent: true
                    });
                }
                if (stats?.new_count > 0) {
                    notifs.push({
                        id: 'new-leads',
                        icon: '🎯',
                        title: `${stats.new_count} new lead${stats.new_count > 1 ? 's' : ''} waiting`,
                        subtitle: 'Recently received enquiries',
                        link: '/leads'
                    });
                }
                this.notifications.set([...notifs]);
            },
            error: () => {}
        });

        // Upcoming departures this month
        const now = new Date();
        this.api.getCalendarBookings(now.getFullYear(), now.getMonth() + 1).subscribe({
            next: (res) => {
                const upcoming = res.items.filter(b => {
                    const dep = new Date(b.trip_start_date);
                    const diff = Math.ceil((dep.getTime() - now.getTime()) / (1000 * 3600 * 24));
                    return diff >= 0 && diff <= 7;
                });
                if (upcoming.length > 0) {
                    notifs.push({
                        id: 'departures',
                        icon: '✈️',
                        title: `${upcoming.length} departure${upcoming.length > 1 ? 's' : ''} in next 7 days`,
                        subtitle: upcoming[0].customer_name + (upcoming.length > 1 ? ` +${upcoming.length - 1} more` : ''),
                        link: '/calendar'
                    });
                    this.notifications.set([...notifs]);
                }
            },
            error: () => {}
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
        if (this.titleMap[url]) return this.titleMap[url];
        const clean = url.split('?')[0].replace(/\/$/, '');
        if (this.titleMap[clean]) return this.titleMap[clean];
        if (clean.startsWith('/leads/')) return 'Lead Detail';
        if (clean.startsWith('/quotations/')) return 'Quotation Detail';
        if (clean.startsWith('/bookings/')) return 'Booking Detail';
        if (clean.startsWith('/admin/users/')) return 'Edit User';
        if (clean.startsWith('/itineraries/')) return 'Itinerary Detail';
        return 'Tour CRM';
    }
}
