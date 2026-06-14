import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
    {
        path: 'login',
        loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent)
    },
    {
        path: 'signup',
        loadComponent: () => import('./features/auth/signup.component').then(m => m.SignupComponent)
    },
    {
        path: 'signup/verify',
        loadComponent: () => import('./features/auth/signup-verify.component').then(m => m.SignupVerifyComponent)
    },
    {
        path: '',
        canActivate: [authGuard],
        loadComponent: () => import('./layout/shell.component').then(m => m.ShellComponent),
        children: [
            { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
            {
                path: 'dashboard',
                loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
            },
            {
                path: 'leads',
                loadComponent: () => import('./features/leads/lead-list.component').then(m => m.LeadListComponent)
            },
            {
                path: 'leads/new',
                loadComponent: () => import('./features/leads/lead-new.component').then(m => m.LeadNewComponent)
            },
            {
                path: 'leads/import',
                loadComponent: () => import('./features/leads/csv-upload.component').then(m => m.CsvUploadComponent)
            },
            {
                path: 'leads/:id',
                loadComponent: () => import('./features/leads/lead-detail.component').then(m => m.LeadDetailComponent)
            },
            {
                path: 'quotations',
                loadComponent: () => import('./features/quotations/quotation-list.component').then(m => m.QuotationListComponent)
            },
            {
                path: 'quotations/new',
                loadComponent: () => import('./features/quotations/quotation-builder.component').then(m => m.QuotationBuilderComponent)
            },
            {
                path: 'quotations/:id/edit',
                loadComponent: () => import('./features/quotations/quotation-builder.component').then(m => m.QuotationBuilderComponent)
            },
            {
                path: 'quotations/:id',
                loadComponent: () => import('./features/quotations/quotation-detail.component').then(m => m.QuotationDetailComponent)
            },
            {
                path: 'bookings',
                loadComponent: () => import('./features/bookings/booking-list.component').then(m => m.BookingListComponent)
            },
            {
                path: 'bookings/:id',
                loadComponent: () => import('./features/bookings/booking-detail.component').then(m => m.BookingDetailComponent)
            },
            {
                path: 'payments',
                loadComponent: () => import('./features/payments/payment-list.component').then(m => m.PaymentListComponent)
            },
            {
                path: 'invoices',
                loadComponent: () => import('./features/invoices/invoice-list.component').then(m => m.InvoiceListComponent)
            },
            {
                path: 'reviews',
                loadComponent: () => import('./features/reviews/review-list.component').then(m => m.ReviewListComponent)
            },
            {
                path: 'admin/destinations',
                loadComponent: () => import('./features/admin/destinations.component').then(m => m.DestinationsComponent)
            },
            {
                path: 'admin/hotel-rates',
                loadComponent: () => import('./features/admin/hotel-rates.component').then(m => m.HotelRatesComponent)
            },
            {
                path: 'admin/car-rates',
                loadComponent: () => import('./features/admin/car-rates.component').then(m => m.CarRatesComponent)
            },
            {
                path: 'admin/users',
                loadComponent: () => import('./features/admin/user-list.component').then(m => m.UserListComponent)
            },
            {
                path: 'admin/users/new',
                loadComponent: () => import('./features/admin/user-detail.component').then(m => m.UserDetailComponent)
            },
            {
                path: 'admin/users/:id',
                loadComponent: () => import('./features/admin/user-detail.component').then(m => m.UserDetailComponent)
            },
            {
                path: 'admin/roles',
                loadComponent: () => import('./features/admin/roles.component').then(m => m.RolesComponent)
            },
            {
                path: 'admin/settings',
                loadComponent: () => import('./features/admin/settings.component').then(m => m.SettingsComponent)
            },
            {
                path: 'admin/billing',
                loadComponent: () => import('./features/admin/billing/billing.component').then(m => m.BillingComponent)
            },
            {
                path: 'suppliers',
                loadComponent: () => import('./features/competitor/supplier-list.component').then(m => m.SupplierListComponent)
            },
            {
                path: 'tasks',
                loadComponent: () => import('./features/competitor/task-list.component').then(m => m.TaskListComponent)
            },
            {
                path: 'itineraries',
                loadComponent: () => import('./features/competitor/itinerary-list.component').then(m => m.ItineraryListComponent)
            },
            {
                path: 'itineraries/:id',
                loadComponent: () => import('./features/competitor/itinerary-detail.component').then(m => m.ItineraryDetailComponent)
            },
            {
                path: 'travellers',
                loadComponent: () => import('./features/competitor/traveller-list.component').then(m => m.TravellerListComponent)
            },
            {
                path: 'reminders',
                loadComponent: () => import('./features/competitor/reminder-list.component').then(m => m.ReminderListComponent)
            },
            {
                path: 'whatsapp',
                loadComponent: () => import('./features/competitor/whatsapp-config.component').then(m => m.WhatsappConfigComponent)
            },
            {
                path: 'fixed-departures',
                loadComponent: () => import('./features/competitor/fixed-departure-list.component').then(m => m.FixedDepartureListComponent)
            },
            {
                path: 'visas',
                loadComponent: () => import('./features/competitor/visa-list.component').then(m => m.VisaListComponent)
            },
            {
                path: 'currencies',
                loadComponent: () => import('./features/competitor/currency-list.component').then(m => m.CurrencyListComponent)
            },
            {
                path: 'landing-pages',
                loadComponent: () => import('./features/competitor/landing-page-list.component').then(m => m.LandingPageListComponent)
            },
            {
                path: 'email-campaigns',
                loadComponent: () => import('./features/competitor/email-campaign-list.component').then(m => m.EmailCampaignListComponent)
            },
            {
                path: 'b2b-marketplace',
                loadComponent: () => import('./features/competitor/b2b-marketplace.component').then(m => m.B2BMarketplaceComponent)
            },
            {
                path: 'gds-search',
                loadComponent: () => import('./features/competitor/gds-search.component').then(m => m.GDSSearchComponent)
            },
            {
                path: 'flyer-designer',
                loadComponent: () => import('./features/competitor/flyer-designer.component').then(m => m.FlyerDesignerComponent)
            },
            {
                path: 'reports',
                loadComponent: () => import('./features/competitor/reports.component').then(m => m.ReportsComponent)
            },
            {
                path: 'admin/usage',
                loadComponent: () => import('./features/admin/usage-limits.component').then(m => m.UsageLimitsComponent)
            },
            {
                path: 'admin/message-templates',
                loadComponent: () => import('./features/admin/message-templates.component').then(m => m.MessageTemplatesComponent)
            },
            {
                path: 'admin/payment-reminders',
                loadComponent: () => import('./features/admin/payment-reminders.component').then(m => m.PaymentRemindersComponent)
            },
            {
                path: 'admin/followup-sequences',
                loadComponent: () => import('./features/admin/followup-sequences.component').then(m => m.FollowupSequencesComponent)
            },
            {
                path: 'admin/gst-report',
                loadComponent: () => import('./features/admin/gst-report.component').then(m => m.GstReportComponent)
            }
        ]
    },
    {
        path: 'portal',
        loadComponent: () => import('./features/portal/portal-shell.component').then(m => m.PortalShellComponent),
        children: [
            { path: '', pathMatch: 'full', loadComponent: () => import('./features/portal/portal-login.component').then(m => m.PortalLoginComponent) },
            { path: 'bookings', loadComponent: () => import('./features/portal/portal-bookings.component').then(m => m.PortalBookingsComponent) },
            { path: 'bookings/:id', loadComponent: () => import('./features/portal/portal-booking-detail.component').then(m => m.PortalBookingDetailComponent) }
        ]
    },
    {
        path: 'super-admin/login',
        loadComponent: () => import('./features/super-admin/sa-login.component').then(m => m.SaLoginComponent)
    },
    {
        path: 'super-admin',
        loadComponent: () => import('./features/super-admin/sa-shell.component').then(m => m.SaShellComponent),
        children: [
            { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
            {
                path: 'dashboard',
                loadComponent: () => import('./features/super-admin/sa-dashboard.component').then(m => m.SaDashboardComponent)
            },
            {
                path: 'companies',
                loadComponent: () => import('./features/super-admin/sa-companies.component').then(m => m.SaCompaniesComponent)
            },
            {
                path: 'companies/:id',
                loadComponent: () => import('./features/super-admin/sa-company-detail.component').then(m => m.SaCompanyDetailComponent)
            },
            {
                path: 'packages',
                loadComponent: () => import('./features/super-admin/sa-packages.component').then(m => m.SaPackagesComponent)
            },
            {
                path: 'payments',
                loadComponent: () => import('./features/super-admin/sa-payments.component').then(m => m.SaPaymentsComponent)
            },
            {
                path: 'invoices',
                loadComponent: () => import('./features/super-admin/sa-invoices.component').then(m => m.SaInvoicesComponent)
            },
            {
                path: 'observability',
                loadComponent: () => import('./features/super-admin/sa-observability.component').then(m => m.SaObservabilityComponent)
            },
            {
                path: 'login-logs',
                loadComponent: () => import('./features/super-admin/sa-login-logs.component').then(m => m.SaLoginLogsComponent)
            },
            {
                path: 'activity-logs',
                loadComponent: () => import('./features/super-admin/sa-activity-logs.component').then(m => m.SaActivityLogsComponent)
            }
        ]
    },
    { path: '**', redirectTo: '' }
];
