import { Component, inject, signal, OnInit, computed, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { ReminderService } from '../../core/services/competitor-features.service';
import { ToastService } from '../../core/services/toast.service';
import { QuotationStats, QuotationListItem, LeadStats, Lead } from '../../core/models';

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [CommonModule, RouterLink, DatePipe, DecimalPipe],
    template: `
    <div class="page-header">
        <div>
            <h1>Dashboard</h1>
            <p>Overview of sales pipeline, quotations, and recent activity</p>
        </div>
        <div class="flex gap-2">
            <a routerLink="/leads/new" class="btn btn-outline btn-sm">+ New Lead</a>
            <a routerLink="/quotations/new" class="btn btn-primary btn-sm">+ New Quotation</a>
        </div>
    </div>

    @if (loading()) {
        <div class="card text-center"><span class="spinner"></span> Loading…</div>
    } @else {
        <!-- Onboarding Wizard Checklist -->
        @if (showOnboarding()) {
            <div class="card onboarding-card" style="margin-bottom: 24px; border-left: 5px solid #10b981; background: linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%);">
                <div style="display:flex; justify-content:space-between; align-items:start">
                    <div>
                        <h2 style="margin:0 0 8px; border:none; padding:0; font-size: 1.25rem;">🚀 Welcome to your new CRM! Let's get set up</h2>
                        <p class="text-muted" style="margin:0 0 16px; font-size: 0.9rem;">Complete these key steps to get your agency running on our SaaS platform.</p>
                    </div>
                    <button class="btn btn-sm btn-outline" (click)="dismissOnboarding()">Dismiss</button>
                </div>
                <div class="onboarding-steps" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:16px; margin-top: 12px;">
                    <div class="onboarding-step" [class.done]="settingsCompleted()" style="background: #fff; padding: 14px; border-radius: 8px; border: 1px solid #e5e7eb; display: flex; gap: 12px;">
                        <span class="step-check" [style.background]="settingsCompleted() ? '#10b981' : '#fff'" [style.color]="settingsCompleted() ? '#fff' : '#6b7280'" [style.border-color]="settingsCompleted() ? '#10b981' : '#d1d5db'" style="display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 50%; border: 2px solid #d1d5db; font-weight: 700; flex-shrink: 0;">{{ settingsCompleted() ? '✓' : '1' }}</span>
                        <div class="step-info" style="font-size: 13px;">
                            <strong style="display: block; font-size: 14px; color: #111827; margin-bottom: 2px;">Agency Settings</strong>
                            <p style="margin: 0 0 6px; color: #6b7280; font-size: 12px;">Update logo & billing info.</p>
                            <a routerLink="/admin/settings" style="color: #0f766e; font-weight: 600; text-decoration: none;">Go to Settings →</a>
                        </div>
                    </div>
                    <div class="onboarding-step" [class.done]="destinationsCount() > 0" style="background: #fff; padding: 14px; border-radius: 8px; border: 1px solid #e5e7eb; display: flex; gap: 12px;">
                        <span class="step-check" [style.background]="destinationsCount() > 0 ? '#10b981' : '#fff'" [style.color]="destinationsCount() > 0 ? '#fff' : '#6b7280'" [style.border-color]="destinationsCount() > 0 ? '#10b981' : '#d1d5db'" style="display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 50%; border: 2px solid #d1d5db; font-weight: 700; flex-shrink: 0;">{{ destinationsCount() > 0 ? '✓' : '2' }}</span>
                        <div class="step-info" style="font-size: 13px;">
                            <strong style="display: block; font-size: 14px; color: #111827; margin-bottom: 2px;">Add Destination</strong>
                            <p style="margin: 0 0 6px; color: #6b7280; font-size: 12px;">Define your travel packages.</p>
                            <a routerLink="/admin/destinations" style="color: #0f766e; font-weight: 600; text-decoration: none;">Add Destination →</a>
                        </div>
                    </div>
                    <div class="onboarding-step" [class.done]="hotelRatesCount() > 0" style="background: #fff; padding: 14px; border-radius: 8px; border: 1px solid #e5e7eb; display: flex; gap: 12px;">
                        <span class="step-check" [style.background]="hotelRatesCount() > 0 ? '#10b981' : '#fff'" [style.color]="hotelRatesCount() > 0 ? '#fff' : '#6b7280'" [style.border-color]="hotelRatesCount() > 0 ? '#10b981' : '#d1d5db'" style="display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 50%; border: 2px solid #d1d5db; font-weight: 700; flex-shrink: 0;">{{ hotelRatesCount() > 0 ? '✓' : '3' }}</span>
                        <div class="step-info" style="font-size: 13px;">
                            <strong style="display: block; font-size: 14px; color: #111827; margin-bottom: 2px;">Add Rates</strong>
                            <p style="margin: 0 0 6px; color: #6b7280; font-size: 12px;">Upload contracted hotel pricing.</p>
                            <a routerLink="/admin/hotel-rates" style="color: #0f766e; font-weight: 600; text-decoration: none;">Configure Rates →</a>
                        </div>
                    </div>
                    <div class="onboarding-step" [class.done]="(leadStats()?.totals?.total || 0) > 0" style="background: #fff; padding: 14px; border-radius: 8px; border: 1px solid #e5e7eb; display: flex; gap: 12px;">
                        <span class="step-check" [style.background]="(leadStats()?.totals?.total || 0) > 0 ? '#10b981' : '#fff'" [style.color]="(leadStats()?.totals?.total || 0) > 0 ? '#fff' : '#6b7280'" [style.border-color]="(leadStats()?.totals?.total || 0) > 0 ? '#10b981' : '#d1d5db'" style="display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 50%; border: 2px solid #d1d5db; font-weight: 700; flex-shrink: 0;">{{ (leadStats()?.totals?.total || 0) > 0 ? '✓' : '4' }}</span>
                        <div class="step-info" style="font-size: 13px;">
                            <strong style="display: block; font-size: 14px; color: #111827; margin-bottom: 2px;">Create Lead</strong>
                            <p style="margin: 0 0 6px; color: #6b7280; font-size: 12px;">Log client query to start conversion.</p>
                            <a routerLink="/leads/new" style="color: #0f766e; font-weight: 600; text-decoration: none;">Log a Lead →</a>
                        </div>
                    </div>
                </div>
            </div>
        }

        <!-- Quick action tiles -->
        <div class="quick-tiles">
            <a routerLink="/leads" class="qtile">
                <span class="qtile-icon">🎯</span>
                <div class="qtile-info">
                    <div class="qtile-num">{{ leadStats()?.totals?.total || 0 }}</div>
                    <div class="qtile-label">Total Leads</div>
                </div>
            </a>
            <a routerLink="/leads" [queryParams]="{status:'new'}" class="qtile">
                <span class="qtile-icon">🔔</span>
                <div class="qtile-info">
                    <div class="qtile-num">{{ leadStats()?.totals?.new_count || 0 }}</div>
                    <div class="qtile-label">New Leads</div>
                </div>
            </a>
            <a routerLink="/quotations" class="qtile">
                <span class="qtile-icon">📋</span>
                <div class="qtile-info">
                    <div class="qtile-num">{{ quoteStats()?.total || 0 }}</div>
                    <div class="qtile-label">Quotations</div>
                </div>
            </a>
            <a routerLink="/bookings" class="qtile">
                <span class="qtile-icon">📦</span>
                <div class="qtile-info">
                    <div class="qtile-num">{{ bookingCount() }}</div>
                    <div class="qtile-label">Bookings</div>
                </div>
            </a>
            <a routerLink="/payments" class="qtile">
                <span class="qtile-icon">💰</span>
                <div class="qtile-info">
                    <div class="qtile-num">₹{{ (quoteStats()?.total_value || 0) | number:'1.0-0' }}</div>
                    <div class="qtile-label">Pipeline Value</div>
                </div>
            </a>
            <a routerLink="/invoices" class="qtile">
                <span class="qtile-icon">🧾</span>
                <div class="qtile-info">
                    <div class="qtile-num">{{ invoiceCount() }}</div>
                    <div class="qtile-label">Invoices</div>
                </div>
            </a>
            <a routerLink="/calendar" class="qtile qtile-calendar">
                <span class="qtile-icon">📅</span>
                <div class="qtile-info">
                    <div class="qtile-num">{{ upcomingDepartures() }}</div>
                    <div class="qtile-label">Departures (30d)</div>
                </div>
            </a>
            <a routerLink="/reminders" class="qtile" [class]="{'qtile-danger': reminderStats()?.overdue > 0}">
                <span class="qtile-icon">🔔</span>
                <div class="qtile-info">
                    <div class="qtile-num">{{ reminderStats()?.today || 0 }} <small style="font-size:11px;color:#6b7280;font-weight:400">/ {{ reminderStats()?.pending || 0 }}</small></div>
                    <div class="qtile-label">Today's Follow-ups</div>
                    @if (reminderStats()?.overdue > 0) { <small style="color:#b91c1c">🚨 {{ reminderStats()?.overdue }} overdue</small> }
                </div>
            </a>
        </div>

        <!-- ── Revenue & Analytics Section ─────────────────── -->
        <div class="analytics-grid">

            <!-- Monthly Revenue Bar Chart -->
            <div class="card chart-card">
                <div class="section-header">
                    <h2 style="margin:0;border:none;padding:0">📈 Monthly Revenue</h2>
                    <a routerLink="/reports" class="btn btn-sm btn-outline">Full Reports</a>
                </div>
                @if (monthlyRevenue().length > 0) {
                    <div class="bar-chart-wrap">
                        <div class="bar-chart">
                            @for (item of monthlyRevenue(); track item.month) {
                                <div class="bar-col" [title]="'₹' + (item.revenue | number:'1.0-0')">
                                    <div class="bar-fill" [style.height]="getBarHeight(item.revenue) + '%'"
                                         [class.bar-peak]="item.revenue === maxRevenue()">
                                        <span class="bar-val">₹{{ formatShort(item.revenue) }}</span>
                                    </div>
                                    <div class="bar-label">{{ formatMonth(item.month) }}</div>
                                </div>
                            }
                        </div>
                    </div>
                } @else {
                    <div class="chart-empty">
                        <div style="font-size:3rem">📊</div>
                        <p>No booking revenue data yet.<br><a routerLink="/bookings">Create your first booking →</a></p>
                    </div>
                }
            </div>

            <!-- Pipeline Funnel + Lead Sources -->
            <div class="card chart-card">
                <h2 style="margin:0 0 16px; border:none; padding:0">🔀 Pipeline & Lead Sources</h2>
                <!-- Pipeline funnel -->
                <div class="funnel">
                    <div class="funnel-step" style="--w:100%">
                        <div class="funnel-bar" style="background: linear-gradient(90deg,#6366f1,#818cf8)">
                            <span class="funnel-label">Leads</span>
                            <span class="funnel-num">{{ leadStats()?.totals?.total || 0 }}</span>
                        </div>
                    </div>
                    <div class="funnel-step" [style.--w]="funnelWidth(quoteStats()?.total || 0, leadStats()?.totals?.total || 0)">
                        <div class="funnel-bar" style="background: linear-gradient(90deg,#0ea5e9,#38bdf8)">
                            <span class="funnel-label">Quotations</span>
                            <span class="funnel-num">{{ quoteStats()?.total || 0 }}</span>
                        </div>
                    </div>
                    <div class="funnel-step" [style.--w]="funnelWidth(bookingCount(), leadStats()?.totals?.total || 0)">
                        <div class="funnel-bar" style="background: linear-gradient(90deg,#10b981,#34d399)">
                            <span class="funnel-label">Bookings</span>
                            <span class="funnel-num">{{ bookingCount() }}</span>
                        </div>
                    </div>
                </div>

                <!-- Lead Sources -->
                @if (leadSources().length > 0) {
                    <div style="margin-top: 20px;">
                        <h3 style="font-size:13px; font-weight:600; color:#6b7280; text-transform:uppercase; letter-spacing:.06em; margin:0 0 10px">Lead Sources</h3>
                        @for (src of leadSources(); track src.source) {
                            <div class="source-row">
                                <div class="source-dot" [style.background]="srcColor(src.source)"></div>
                                <div class="source-name">{{ src.source | titlecase }}</div>
                                <div class="source-bar-wrap">
                                    <div class="source-bar" [style.width]="srcPct(src.count) + '%'" [style.background]="srcColor(src.source)"></div>
                                </div>
                                <div class="source-count">{{ src.count }}</div>
                            </div>
                        }
                    </div>
                }
            </div>

            <!-- Top Destinations -->
            @if (topDestinations().length > 0) {
                <div class="card chart-card">
                    <h2 style="margin:0 0 12px; border:none; padding:0">🗺️ Top Destinations</h2>
                    <div class="table-wrap" style="box-shadow:none">
                        <table class="data-table">
                            <thead><tr><th>Destination</th><th class="num">Bookings</th><th class="num">Revenue</th></tr></thead>
                            <tbody>
                                @for (d of topDestinations().slice(0,8); track d.destination) {
                                    <tr>
                                        <td><strong>{{ d.destination }}</strong></td>
                                        <td class="num">{{ d.bookings_count }}</td>
                                        <td class="num" style="color:#10b981; font-weight:600">₹{{ d.total_sales | number:'1.0-0' }}</td>
                                    </tr>
                                }
                            </tbody>
                        </table>
                    </div>
                </div>
            }

            <!-- Agent Performance -->
            @if (agentPerformance().length > 0) {
                <div class="card chart-card">
                    <h2 style="margin:0 0 12px; border:none; padding:0">👤 Agent Performance</h2>
                    <div class="table-wrap" style="box-shadow:none">
                        <table class="data-table">
                            <thead><tr><th>Agent</th><th class="num">Bookings</th><th class="num">Revenue</th></tr></thead>
                            <tbody>
                                @for (a of agentPerformance(); track a.agent_name) {
                                    <tr>
                                        <td>
                                            <div style="display:flex; align-items:center; gap:8px">
                                                <span style="width:28px; height:28px; border-radius:50%; background: var(--primary); color:#fff; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:700; flex-shrink:0">{{ a.agent_name[0] }}</span>
                                                {{ a.agent_name }}
                                            </div>
                                        </td>
                                        <td class="num">{{ a.bookings_count }}</td>
                                        <td class="num" style="color:#4f46e5; font-weight:600">₹{{ a.total_sales | number:'1.0-0' }}</td>
                                    </tr>
                                }
                            </tbody>
                        </table>
                    </div>
                </div>
            }
        </div>

        <!-- Today's Follow-ups -->
        <div class="card" style="margin-bottom:18px">
            <div class="section-header">
                <h2 style="margin:0;border:none;padding:0">📅 Today's Follow-ups
                    @if (reminderStats()?.myToday > 0) { <small style="font-size:12px;color:#0f766e">({{ reminderStats()?.myToday }} for you)</small> }
                </h2>
                <a routerLink="/reminders" class="btn btn-sm btn-outline">Manage</a>
            </div>
            @if (todayFollowups().length) {
                <div class="table-wrap" style="box-shadow:none">
                    <table class="data-table">
                        <thead>
                            <tr><th>Title</th><th>Time</th><th>Priority</th><th>Type</th><th>Assigned To</th><th></th></tr>
                        </thead>
                        <tbody>
                            @for (r of todayFollowups(); track r.id) {
                                <tr>
                                    <td>
                                        <strong>{{ r.title }}</strong>
                                        @if (r.description) { <br><small class="text-muted">{{ r.description }}</small> }
                                    </td>
                                    <td>{{ r.remind_at | date:'shortTime' }}</td>
                                    <td><span class="badge" [class]="'badge-prio-' + r.priority">{{ r.priority }}</span></td>
                                    <td><span class="source-tag">{{ r.followup_type }}</span></td>
                                    <td>{{ r.assigned_name || '—' }}</td>
                                    <td>
                                        <button class="btn btn-sm btn-outline" (click)="dismissReminder(r.id)">✓ Done</button>
                                    </td>
                                </tr>
                            }
                        </tbody>
                    </table>
                </div>
            } @else {
                <div class="empty-state" style="padding:16px">
                    <p>No follow-ups scheduled for today. 🎉</p>
                </div>
            }
        </div>

        <!-- Recent Leads + Quotations -->
        <div class="dashboard-grid">
            <div class="card">
                <div class="section-header">
                    <h2 style="margin:0;border:none;padding:0">Recent Leads</h2>
                    <a routerLink="/leads" class="btn btn-sm btn-outline">View all</a>
                </div>
                @if (recentLeads().length) {
                    <div class="table-wrap" style="box-shadow:none">
                        <table class="data-table">
                            <thead>
                                <tr><th>Name</th><th>Source</th><th>Status</th><th>Date</th></tr>
                            </thead>
                            <tbody>
                                @for (l of recentLeads(); track l.id) {
                                    <tr>
                                        <td><a [routerLink]="['/leads', l.id]">{{ l.full_name }}</a></td>
                                        <td><span class="source-tag" [class]="'src-' + l.source">{{ l.source.replace('_', ' ') }}</span></td>
                                        <td><span class="status-tag" [class]="'st-' + l.status">{{ l.status }}</span></td>
                                        <td>{{ l.created_at | date:'shortDate' }}</td>
                                    </tr>
                                }
                            </tbody>
                        </table>
                    </div>
                } @else {
                    <div class="empty-state">
                        <div class="icon">🎯</div>
                        <p>No leads yet. <a routerLink="/leads/new">Add your first lead →</a></p>
                    </div>
                }
            </div>

            <!-- Recent Quotations -->
            <div class="card">
                <div class="section-header">
                    <h2 style="margin:0;border:none;padding:0">Recent Quotations</h2>
                    <a routerLink="/quotations" class="btn btn-sm btn-outline">View all</a>
                </div>
                @if (recentQuotations().length) {
                    <div class="table-wrap" style="box-shadow:none">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Number</th>
                                    <th>Customer</th>
                                    <th>Status</th>
                                    <th class="num">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                @for (q of recentQuotations(); track q.id) {
                                    <tr>
                                        <td><a [routerLink]="['/quotations', q.id]">{{ q.quotation_number }}</a></td>
                                        <td>{{ q.customer_name }}</td>
                                        <td><span class="badge" [class]="'badge-' + q.status">{{ q.status }}</span></td>
                                        <td class="num">₹{{ q.grand_total | number:'1.0-0' }}</td>
                                    </tr>
                                }
                            </tbody>
                        </table>
                    </div>
                } @else {
                    <div class="empty-state">
                        <div class="icon">📋</div>
                        <p>No quotations yet. <a routerLink="/quotations/new">Create your first one →</a></p>
                    </div>
                }
            </div>
        </div>
    }
    `,
    styles: [`
        .quick-tiles {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
            gap: 14px; margin-bottom: 24px;
        }
        .qtile {
            background: #fff; border-radius: 10px;
            box-shadow: 0 1px 3px rgba(0,0,0,.08), 0 1px 2px rgba(0,0,0,.06);
            padding: 16px 18px; display: flex; align-items: center; gap: 12px;
            text-decoration: none; color: inherit; transition: transform .15s, box-shadow .15s;
        }
        .qtile:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,.1); }
        .qtile-icon { font-size: 28px; }
        .qtile-info { flex: 1; }
        .qtile-num { font-size: 1.4rem; font-weight: 700; color: #111827; }
        .qtile-label { font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: .04em; }
        .qtile-calendar { border: 2px solid #e0e7ff; }

        /* Analytics grid */
        .analytics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
            gap: 18px; margin-bottom: 24px;
        }
        .chart-card { min-height: 200px; }

        /* Bar chart */
        .bar-chart-wrap { overflow-x: auto; padding-bottom: 4px; }
        .bar-chart {
            display: flex; align-items: flex-end; gap: 6px;
            height: 160px; padding: 0 4px;
            min-width: 300px;
        }
        .bar-col {
            flex: 1; display: flex; flex-direction: column;
            align-items: center; height: 100%; justify-content: flex-end;
        }
        .bar-fill {
            width: 100%; max-width: 36px;
            background: linear-gradient(180deg, #6366f1 0%, #818cf8 100%);
            border-radius: 4px 4px 0 0;
            min-height: 4px;
            position: relative;
            transition: height .4s cubic-bezier(.4,0,.2,1);
            display: flex; align-items: flex-start; justify-content: center;
        }
        .bar-fill.bar-peak { background: linear-gradient(180deg, #4f46e5 0%, #6366f1 100%); }
        .bar-val {
            font-size: 9px; font-weight: 700; color: #fff;
            padding: 2px; text-align: center; white-space: nowrap;
            position: absolute; top: -18px; color: #4f46e5;
        }
        .bar-label { font-size: 10px; color: #6b7280; margin-top: 4px; text-align: center; }
        .chart-empty { text-align: center; padding: 32px; color: #6b7280; }

        /* Funnel */
        .funnel { display: flex; flex-direction: column; gap: 8px; }
        .funnel-step { width: var(--w, 100%); transition: width .5s ease; }
        .funnel-bar {
            display: flex; align-items: center; justify-content: space-between;
            padding: 10px 16px; border-radius: 6px; color: #fff;
        }
        .funnel-label { font-size: 13px; font-weight: 600; }
        .funnel-num { font-size: 18px; font-weight: 800; }

        /* Lead Sources */
        .source-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
        .source-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
        .source-name { font-size: 12px; font-weight: 500; min-width: 110px; color: #374151; text-transform: capitalize; }
        .source-bar-wrap { flex: 1; height: 8px; background: #f3f4f6; border-radius: 4px; overflow: hidden; }
        .source-bar { height: 100%; border-radius: 4px; transition: width .4s ease; }
        .source-count { font-size: 12px; font-weight: 700; color: #374151; min-width: 28px; text-align: right; }

        .dashboard-grid {
            display: grid; grid-template-columns: repeat(auto-fit, minmax(420px, 1fr));
            gap: 18px;
        }
        .source-tag, .status-tag {
            display: inline-block; font-size: 11px; padding: 2px 8px; border-radius: 10px;
            background: #f3f4f6; color: #374151;
        }
        .src-meta_ads    { background: #fef3c7; color: #92400e; }
        .src-walk_in     { background: #dbeafe; color: #1e40af; }
        .src-website_form{ background: #e0e7ff; color: #3730a3; }
        .src-demo_request{ background: #ccfbf1; color: #0f766e; }
        .src-csv_upload  { background: #fae8ff; color: #6b21a8; }
        .src-referral    { background: #d1fae5; color: #065f46; }
        .src-whatsapp    { background: #d1fae5; color: #065f46; }
        .st-new       { background: #dbeafe; color: #1e40af; }
        .st-contacted { background: #fef3c7; color: #92400e; }
        .st-qualified { background: #e0e7ff; color: #3730a3; }
        .st-converted { background: #d1fae5; color: #065f46; }
        .st-lost      { background: #fee2e2; color: #991b1b; }
        @media (max-width: 600px) {
            .dashboard-grid { grid-template-columns: 1fr; }
            .analytics-grid { grid-template-columns: 1fr; }
        }
    `]
})
export class DashboardComponent implements OnInit {
    private api = inject(ApiService);
    private reminderApi = inject(ReminderService);
    private toast = inject(ToastService);

    loading = signal(true);
    quoteStats = signal<QuotationStats | null>(null);
    leadStats = signal<LeadStats | null>(null);
    recentQuotations = signal<QuotationListItem[]>([]);
    recentLeads = signal<Lead[]>([]);
    bookingCount = signal(0);
    invoiceCount = signal(0);
    reminderStats = signal<any>(null);
    todayFollowups = signal<any[]>([]);
    upcomingDepartures = signal(0);

    // Analytics
    monthlyRevenue = signal<{ month: string; revenue: number }[]>([]);
    leadSources = signal<{ source: string; count: number }[]>([]);
    topDestinations = signal<{ destination: string; bookings_count: number; total_sales: number }[]>([]);
    agentPerformance = signal<{ agent_name: string; bookings_count: number; total_sales: number }[]>([]);

    maxRevenue = computed(() => Math.max(...this.monthlyRevenue().map(r => r.revenue), 1));
    maxLeadCount = computed(() => Math.max(...this.leadSources().map(s => s.count), 1));

    // Onboarding checklist
    destinationsCount = signal(0);
    hotelRatesCount = signal(0);
    settingsCompleted = signal(false);
    onboardingDismissed = signal(localStorage.getItem('dismiss_onboarding') === 'true');

    showOnboarding = computed(() => {
        return !this.onboardingDismissed() &&
            (this.destinationsCount() === 0 ||
             this.hotelRatesCount() === 0 ||
             !this.settingsCompleted() ||
             (this.leadStats()?.totals?.total || 0) === 0);
    });

    getBarHeight(revenue: number): number {
        const max = this.maxRevenue();
        return max > 0 ? Math.max(4, Math.round((revenue / max) * 100)) : 4;
    }

    formatShort(n: number): string {
        if (n >= 100000) return `${(n / 100000).toFixed(1)}L`;
        if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
        return String(n);
    }

    formatMonth(month: string): string {
        const [y, m] = month.split('-');
        const names = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        return names[parseInt(m) - 1] || month;
    }

    funnelWidth(count: number, total: number): string {
        if (!total || total === 0) return '100%';
        return Math.max(20, Math.round((count / total) * 100)) + '%';
    }

    srcPct(count: number): number {
        return Math.max(4, Math.round((count / this.maxLeadCount()) * 100));
    }

    srcColor(source: string): string {
        const map: Record<string, string> = {
            meta_ads: '#f59e0b', whatsapp: '#22c55e', referral: '#10b981',
            website_form: '#6366f1', walk_in: '#3b82f6', demo_request: '#14b8a6',
            csv_upload: '#a855f7', phone: '#ec4899', email: '#f97316'
        };
        return map[source] || '#6b7280';
    }

    dismissOnboarding() {
        localStorage.setItem('dismiss_onboarding', 'true');
        this.onboardingDismissed.set(true);
    }

    dismissReminder(id: number) {
        this.reminderApi.dismiss(id).subscribe(() => {
            this.todayFollowups.update(list => list.filter((r: any) => r.id !== id));
            this.toast.success('Marked done');
        });
    }

    ngOnInit() {
        let done = 0;
        const total = 14;
        const check = () => { if (++done >= total) this.loading.set(false); };

        this.api.stats().subscribe({ next: s => { this.quoteStats.set(s); check(); }, error: () => check() });
        this.api.listQuotations({ limit: 5 }).subscribe({ next: r => { this.recentQuotations.set(r.items); check(); }, error: () => check() });
        this.api.getLeadStats().subscribe({ next: s => { this.leadStats.set(s); check(); }, error: () => check() });
        this.api.listLeads({ limit: 5 }).subscribe({ next: r => { this.recentLeads.set(r.items); check(); }, error: () => check() });
        this.api.listBookings({ limit: 1 }).subscribe({ next: r => { this.bookingCount.set(r.total); check(); }, error: () => check() });
        this.api.listInvoices({ limit: 1 }).subscribe({ next: r => { this.invoiceCount.set(r.total); check(); }, error: () => check() });
        this.api.getReminderStats().subscribe({ next: r => { this.reminderStats.set(r); this.todayFollowups.set(r.todayList || []); check(); }, error: () => check() });
        this.api.listDestinations({ limit: 1 }).subscribe({ next: r => { this.destinationsCount.set(r.total || 0); check(); }, error: () => check() });
        this.api.listHotelRates({ limit: 1 }).subscribe({ next: r => { this.hotelRatesCount.set(r.total || 0); check(); }, error: () => check() });
        this.api.getSettings().subscribe({
            next: s => { this.settingsCompleted.set(s && s.email && s.email !== 'bookings@sikkimtrails.demo' ? true : false); check(); },
            error: () => check()
        });

        // Analytics
        this.api.getMonthlyRevenue().subscribe({ next: d => { this.monthlyRevenue.set(d.slice(-12)); check(); }, error: () => check() });
        this.api.getLeadSources().subscribe({ next: d => { this.leadSources.set(d.slice(0, 8)); check(); }, error: () => check() });
        this.api.getSalesByDestination().subscribe({ next: d => { this.topDestinations.set(d); check(); }, error: () => check() });
        this.api.getSalesByAgent().subscribe({ next: d => { this.agentPerformance.set(d); check(); }, error: () => check() });

        // Upcoming departures (next 30 days)
        const now = new Date();
        this.api.getCalendarBookings(now.getFullYear(), now.getMonth() + 1).subscribe({
            next: d => { this.upcomingDepartures.set(d.items.length); },
            error: () => {}
        });
    }
}
