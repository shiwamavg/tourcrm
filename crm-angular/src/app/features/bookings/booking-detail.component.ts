// src/app/features/bookings/booking-detail.component.ts
import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { PaymentGateway, PaymentStatus2, BookingTraveller } from '../../core/models';
import { FollowupTimelineComponent } from '../../shared/components/followup-timeline.component';
import { SupplierService, WhatsappService } from '../../core/services/competitor-features.service';
import { PdfService } from '../../core/services/pdf.service';

@Component({
    selector: 'app-booking-detail',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink, DatePipe, DecimalPipe, FollowupTimelineComponent],
    template: `
    @if (loading()) {
        <div class="card text-center"><span class="spinner"></span> Loading…</div>
    } @else if (!booking()) {
        <div class="card">
            <h2>Booking not found</h2>
            <a routerLink="/bookings" class="btn">← Back to list</a>
        </div>
    } @else {
        <div class="page-header">
            <div>
                <h1>
                    {{ booking()!.booking_number }}
                    <span class="badge" [class]="'badge-' + badgeStatus(booking()!.status)">{{ booking()!.status }}</span>
                    <span class="badge" [class]="'badge-' + badgePay(booking()!.payment_status)">{{ booking()!.payment_status }}</span>
                </h1>
                <p>Created {{ booking()!.created_at | date:'medium' }} • Quotation
                    @if (booking()!.quotation_number) {
                        <a [routerLink]="['/quotations', booking()!.quotation_id]" class="link">{{ booking()!.quotation_number }}</a>
                    } @else { — }
                    @if (booking()!.package_title) {
                        • Package: <strong>{{ booking()!.package_title }}</strong>
                    }
                </p>
            </div>
            <div class="flex" style="gap:8px">
                <a routerLink="/bookings" class="btn">← Back</a>
                <button class="btn btn-outline" (click)="downloadVoucher()" [disabled]="generatingVoucher()">
                    @if (generatingVoucher()) { <span class="spinner"></span> }
                    @else { 📄 Download Voucher }
                </button>
                <button class="btn btn-outline" (click)="openWhatsappModal()">
                    💬 Send WhatsApp
                </button>
                <button class="btn btn-success" (click)="openPaymentModal()">+ Record Payment</button>
            </div>
        </div>

        <div class="stats-grid">
            <div class="stat-card">
                <div class="label">Customer</div>
                <div class="value" style="font-size:1.1rem">{{ booking()!.customer_name }}</div>
                <div class="text-muted">
                    {{ booking()!.customer_phone }}
                    @if (booking()!.customer_email) { • {{ booking()!.customer_email }} }
                </div>
            </div>
            <div class="stat-card">
                <div class="label">Trip</div>
                <div class="value" style="font-size:1.1rem">
                    {{ booking()!.destination_name || booking()!.destination_text || '—' }}
                </div>
                <div class="text-muted">
                    {{ booking()!.trip_start_date | date:'mediumDate' }} → {{ booking()!.trip_end_date | date:'mediumDate' }}
                </div>
            </div>
            <div class="stat-card">
                <div class="label">Pax</div>
                <div class="value" style="font-size:1.1rem">{{ booking()!.adults }} adults</div>
                <div class="text-muted">
                    @if (booking()!.children_below_5) { {{ booking()!.children_below_5 }} child(ren) <5y }
                    @if (booking()!.children_above_5) { {{ booking()!.children_above_5 }} child(ren) >5y }
                </div>
            </div>
            <div class="stat-card success">
                <div class="label">Total / Paid / Balance</div>
                <div class="value">₹{{ booking()!.total_amount | number:'1.0-0' }}</div>
                <div class="text-muted">
                    Paid: <strong>₹{{ booking()!.amount_paid | number:'1.0-0' }}</strong>
                    @if (balance() > 0) { • Balance: <strong class="text-danger">₹{{ balance() | number:'1.0-0' }}</strong> }
                    @else { • <strong class="text-success">Fully paid</strong> }
                </div>
            </div>
            <div class="stat-card" [style.border-left]="'4px solid ' + (booking()!.net_profit >= 0 ? '#10b981' : '#ef4444')">
                <div class="label">Vendor Cost / Net Profit</div>
                <div class="value" style="font-size:1.1rem" [class.text-success]="booking()!.net_profit >= 0" [class.text-danger]="booking()!.net_profit < 0">
                    Cost: ₹{{ booking()!.vendor_cost | number:'1.0-0' }} / Profit: ₹{{ booking()!.net_profit | number:'1.0-0' }}
                </div>
                <div class="text-muted">
                    Profit Margin: <strong>{{ booking()!.total_amount > 0 ? (booking()!.net_profit / booking()!.total_amount * 100 | number:'1.0-1') : 0 }}%</strong>
                </div>
            </div>
            @if (booking()!.agent_id) {
                <div class="stat-card" style="border-left: 4px solid #4f46e5">
                    <div class="label">B2B Agent Partner</div>
                    <div class="value" style="font-size:1.1rem">{{ booking()!.agent_agency_name }}</div>
                    <div class="text-muted">
                        Agent: {{ booking()!.agent_contact_name }} • Commission: <strong style="color:#4f46e5">₹{{ booking()!.agent_commission | number:'1.0-0' }}</strong>
                    </div>
                </div>
            }
        </div>

        <!-- Travellers -->
        <div class="card">
            <h2>👤 Travellers
                @if (!travellersEditing()) {
                    <button class="btn btn-sm btn-outline" style="margin-left:auto" (click)="startEditTravellers()">
                        {{ travellers().length ? '✏️ Edit' : '+ Add' }}
                    </button>
                }
            </h2>

            @if (travellersLoading()) {
                <span class="spinner"></span>
            } @else if (travellersEditing()) {
                <p class="text-muted" style="margin-bottom:12px;font-size:13px">
                    Enter names for all travellers based on the booking pax.
                    <strong>{{ booking()!.adults }} adult(s)</strong>
                    @if (booking()!.children_below_5) { • <strong>{{ booking()!.children_below_5 }} child(ren) below 5y</strong> }
                    @if (booking()!.children_above_5) { • <strong>{{ booking()!.children_above_5 }} child(ren) above 5y</strong> }
                </p>
                <div class="traveller-form">
                    @for (t of travellerForm(); track $index; let i = $index) {
                        <div class="traveller-row">
                            <span class="traveller-index">{{ i + 1 }}</span>
                            <div class="traveller-fields">
                                <input type="text" [(ngModel)]="t.full_name"
                                       [placeholder]="'Full name (' + (t.traveller_type || 'adult').replace('_', ' ') + ')'" />
                                <input type="text" [(ngModel)]="t.aadhar_number"
                                       placeholder="Aadhar number (optional)" style="max-width:180px" />
                            </div>
                            <span class="traveller-type-badge" [class]="'type-' + t.traveller_type">
                                {{ t.traveller_type === 'adult' ? 'Adult' : t.traveller_type === 'child_below_5' ? 'Child <5' : 'Child 5+' }}
                            </span>
                        </div>
                    }
                </div>
                <div class="flex" style="gap:8px;margin-top:12px">
                    <button class="btn btn-primary btn-sm" (click)="saveTravellers()" [disabled]="travellerSaving()">
                        {{ travellerSaving() ? 'Saving…' : '✓ Save Travellers' }}
                    </button>
                    <button class="btn btn-sm btn-outline" (click)="cancelEditTravellers()">Cancel</button>
                </div>
            } @else if (travellers().length > 0) {
                <div class="table-wrap" style="box-shadow:none">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>#</th><th>Name</th><th>Aadhar Number</th><th>Type</th>
                            </tr>
                        </thead>
                        <tbody>
                            @for (t of travellers(); track t.id; let i = $index) {
                                <tr>
                                    <td>{{ i + 1 }}</td>
                                    <td><strong>{{ t.full_name }}</strong></td>
                                    <td>{{ t.aadhar_number || '—' }}</td>
                                    <td>
                                        <span class="traveller-type-badge" [class]="'type-' + t.traveller_type">
                                            {{ t.traveller_type === 'adult' ? 'Adult' : t.traveller_type === 'child_below_5' ? 'Child <5' : 'Child 5+' }}
                                        </span>
                                    </td>
                                </tr>
                            }
                        </tbody>
                    </table>
                </div>
            } @else {
                <p class="text-muted">No travellers recorded yet.
                    <button class="btn btn-sm btn-outline" (click)="startEditTravellers()">+ Add travellers</button>
                </p>
            }
        </div>

        <!-- Hotels -->
        @if (booking()!.hotels?.length) {
            <div class="card">
                <h2>🏨 Hotels</h2>
                <div class="table-wrap" style="box-shadow:none">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Hotel</th><th>Room</th><th>Meal</th>
                                <th class="num">Nights</th><th class="num">Rooms</th>
                                <th class="num">Rate/night</th><th class="num">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            @for (h of booking()!.hotels; track h.id) {
                                <tr>
                                    <td><strong>{{ h.hotel_name }}</strong>
                                        @if (h.star_rating) { <small> {{ h.star_rating }}★</small> }
                                    </td>
                                    <td>{{ h.room_type }}</td>
                                    <td>{{ h.meal_plan }}</td>
                                    <td class="num">{{ h.num_nights }}</td>
                                    <td class="num">{{ h.num_rooms }}</td>
                                    <td class="num">₹{{ h.charge_per_night | number:'1.0-0' }}</td>
                                    <td class="num"><strong>₹{{ h.line_total | number:'1.0-0' }}</strong></td>
                                </tr>
                            }
                        </tbody>
                    </table>
                </div>
            </div>
        }

        <!-- Cars -->
        @if (booking()!.cars?.length) {
            <div class="card">
                <h2>🚗 Transport</h2>
                <div class="table-wrap" style="box-shadow:none">
                    <table class="data-table">
                        <thead><tr><th>Car</th><th>Days</th><th class="num">Rate/day</th><th class="num">Total</th></tr></thead>
                        <tbody>
                            @for (c of booking()!.cars; track c.id) {
                                <tr>
                                    <td><strong>{{ c.car_type_name }}</strong> <small>({{ c.car_class }})</small></td>
                                    <td class="num">{{ c.num_days }}</td>
                                    <td class="num">₹{{ c.charge_per_day | number:'1.0-0' }}</td>
                                    <td class="num"><strong>₹{{ c.line_total | number:'1.0-0' }}</strong></td>
                                </tr>
                            }
                        </tbody>
                    </table>
                </div>
            </div>
        }

        <!-- Payments -->
        <div class="card">
            <h2>💰 Payments ({{ booking()!.payments?.length || 0 }})</h2>
            @if (!booking()!.payments?.length) {
                <p class="text-muted">No payments recorded yet.
                    <button class="btn btn-sm btn-success" (click)="openPaymentModal()">+ Record first payment</button>
                </p>
            } @else {
                <div class="table-wrap" style="box-shadow:none">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Date</th><th>Gateway</th><th>Method</th>
                                <th>Reference</th><th class="num">Amount</th><th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            @for (p of booking()!.payments; track p.id) {
                                <tr>
                                    <td>
                                        {{ (p.paid_at || p.created_at) | date:'short' }}
                                        @if (p.collected_by) { <br><small class="text-muted">by staff</small> }
                                    </td>
                                    <td>{{ p.gateway }}</td>
                                    <td>{{ p.method_label || '—' }}</td>
                                    <td>
                                        @if (p.offline_reference) { {{ p.offline_reference }} }
                                        @if (p.gateway_payment_id) { <small class="text-muted">{{ p.gateway_payment_id }}</small> }
                                    </td>
                                    <td class="num"><strong>₹{{ p.amount | number:'1.0-0' }}</strong></td>
                                    <td>
                                        <span class="badge" [class]="'badge-' + (p.status === 'paid' ? 'accepted' :
                                                                          p.status === 'failed' ? 'rejected' : 'draft')">
                                            {{ p.status }}
                                        </span>
                                    </td>
                                </tr>
                            }
                        </tbody>
                    </table>
                </div>
            }
        </div>

        <!-- Vendor Costing Ledger -->
        <div class="card">
            <h2>
                💼 Vendor Costing Ledger
                <button class="btn btn-sm btn-outline" style="margin-left:auto" (click)="openLedgerModal()">
                    + Add Cost Item
                </button>
            </h2>

            @if (ledgerLoading()) {
                <span class="spinner"></span>
            } @else if (vendorLedgers().length === 0) {
                <p class="text-muted">No vendor costing entries recorded yet.</p>
            } @else {
                <div class="table-wrap" style="box-shadow:none">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Supplier / Vendor</th>
                                <th>Type</th>
                                <th class="num">Cost Price</th>
                                <th class="num">Paid Amount</th>
                                <th class="num">Pending Balance</th>
                                <th>Status</th>
                                <th>Notes</th>
                                <th style="text-align:center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            @for (l of vendorLedgers(); track l.id) {
                                <tr>
                                    <td><strong>{{ l.supplier_name }}</strong></td>
                                    <td>
                                        <span class="traveller-type-badge type-adult" style="text-transform: capitalize;">
                                            {{ l.supplier_type }}
                                        </span>
                                    </td>
                                    <td class="num">₹{{ l.cost_amount | number:'1.0-0' }}</td>
                                    <td class="num">₹{{ l.paid_amount | number:'1.0-0' }}</td>
                                    <td class="num">
                                        @if (l.cost_amount - l.paid_amount > 0) {
                                            <strong class="text-danger">₹{{ (l.cost_amount - l.paid_amount) | number:'1.0-0' }}</strong>
                                        } @else {
                                            <strong class="text-success">₹0</strong>
                                        }
                                    </td>
                                    <td>
                                        <span class="badge" [class]="'badge-' + (l.status === 'paid' ? 'accepted' : l.status === 'partial' ? 'sent' : 'rejected')">
                                            {{ l.status }}
                                        </span>
                                    </td>
                                    <td>{{ l.notes || '—' }}</td>
                                    <td style="text-align:center">
                                        <div class="flex" style="justify-content:center;gap:6px">
                                            <button class="btn btn-sm btn-outline" (click)="openLedgerModal(l)">✏️</button>
                                            <button class="btn btn-sm btn-danger-outline" (click)="deleteLedger(l.id)" style="width:26px;height:26px;padding:0">×</button>
                                        </div>
                                    </td>
                                </tr>
                            }
                        </tbody>
                    </table>
                </div>
            }
        </div>

        <!-- Booking Tasks -->
        <div class="card">
            <h2>✅ Booking Tasks</h2>
            @if (tasksLoading()) {
                <span class="spinner"></span>
            } @else if (bookingTasks().length === 0 && !showTaskForm()) {
                <p class="text-muted">No tasks for this booking yet.</p>
            }
            @if (bookingTasks().length > 0) {
                <div style="margin-bottom:12px">
                    @for (t of bookingTasks(); track t.id) {
                        <div class="task-row" [class.completed]="t.is_completed">
                            <label class="task-checkbox">
                                <input type="checkbox" [checked]="t.is_completed"
                                    (change)="toggleTask(t)" />
                                <span class="checkmark"></span>
                            </label>
                            <div class="task-body">
                                <span class="task-title">{{ t.title }}</span>
                                @if (t.assigned_to_name) {
                                    <span class="task-assignee">👤 {{ t.assigned_to_name }}</span>
                                }
                                @if (t.due_date) {
                                    <span class="task-due">📅 {{ t.due_date | date:'mediumDate' }}</span>
                                }
                            </div>
                            <button class="btn btn-sm btn-danger-outline" (click)="deleteTask(t.id)"
                                title="Delete task">×</button>
                        </div>
                    }
                </div>
            }
            @if (showTaskForm()) {
                <div class="task-form">
                    <div class="form-grid-3">
                        <div class="form-group">
                            <input type="text" [(ngModel)]="newTaskTitle" placeholder="Task title…" />
                        </div>
                        <div class="form-group">
                            <input type="text" [(ngModel)]="newTaskAssignee" placeholder="Assignee name (optional)" />
                        </div>
                        <div class="form-group">
                            <input type="date" [(ngModel)]="newTaskDueDate" />
                        </div>
                    </div>
                    <div class="flex">
                        <button class="btn btn-primary btn-sm" (click)="addTask()"
                            [disabled]="taskSaving() || !newTaskTitle.trim()">
                            {{ taskSaving() ? 'Adding…' : '✓ Add' }}
                        </button>
                        <button class="btn btn-sm btn-outline" (click)="closeTaskForm()">Cancel</button>
                    </div>
                </div>
            } @else {
                <button class="btn btn-sm btn-outline" (click)="openTaskForm()">+ Add Task</button>
            }
        </div>

        <!-- Invoices -->
        @if (booking()!.invoices?.length) {
            <div class="card">
                <h2>🧾 Invoices</h2>
                <div class="table-wrap" style="box-shadow:none">
                    <table class="data-table">
                        <thead>
                            <tr><th>Invoice #</th><th>Issued</th><th class="num">Total</th><th>PDF</th></tr>
                        </thead>
                        <tbody>
                            @for (i of booking()!.invoices; track i.id) {
                                <tr>
                                    <td><strong>{{ i.invoice_number }}</strong></td>
                                    <td>{{ i.issued_at | date:'mediumDate' }}</td>
                                    <td class="num">₹{{ i.total | number:'1.0-0' }}</td>
                                    <td>
                                        <button class="btn btn-sm btn-primary" (click)="downloadInvoice(i.id)">
                                            📄 Download
                                        </button>
                                    </td>
                                </tr>
                            }
                        </tbody>
                    </table>
                </div>
            </div>
        }

        <!-- Reviews -->
        @if (booking()!.reviews?.length) {
            <div class="card">
                <h2>⭐ Review</h2>
                @for (r of booking()!.reviews; track r.id) {
                    <div style="padding:10px 0">
                        <div style="font-size:18px; color:#f59e0b">
                            @for (s of [1,2,3,4,5]; track s) {
                                {{ s <= r.rating ? '★' : '☆' }}
                            }
                        </div>
                        @if (r.title) { <strong>{{ r.title }}</strong><br> }
                        <p>{{ r.comment }}</p>
                        <small class="text-muted">— {{ r.customer_name }} • {{ r.created_at | date:'mediumDate' }}</small>
                    </div>
                }
            </div>
        }

        <!-- Customer Journey Timeline -->
        <div class="card">
            <h2>Timeline & Journey</h2>
            <app-followup-timeline [bookingId]="booking()!.id" />
        </div>

        <!-- Payment modal -->
        @if (paymentOpen()) {
            <div class="modal-backdrop" (click)="closePaymentModal()">
                <div class="modal" (click)="$event.stopPropagation()">
                    <h2 style="margin-top:0">+ Record a payment</h2>
                    <p class="text-muted">
                        Recording for booking <strong>{{ booking()!.booking_number }}</strong>.
                        Balance: <strong>₹{{ balance() | number:'1.0-0' }}</strong>.
                        An invoice is auto-generated on the first successful payment.
                    </p>
                    <div class="form-grid-2">
                        <div class="form-group">
                            <label>Amount (₹) <span class="req">*</span></label>
                            <input type="number" [(ngModel)]="form.amount" min="1" step="1"
                                   [placeholder]="balance()">
                        </div>
                        <div class="form-group">
                            <label>Gateway <span class="req">*</span></label>
                            <select [(ngModel)]="form.gateway">
                                <option value="cash">Cash</option>
                                <option value="bank_transfer">Bank Transfer (NEFT/RTGS/IMPS)</option>
                                <option value="upi">UPI</option>
                                <option value="card">Card</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Method label</label>
                            <input type="text" [(ngModel)]="form.method_label"
                                   placeholder="e.g. NEFT, UPI, Visa ****1234">
                        </div>
                        <div class="form-group">
                            <label>Reference #</label>
                            <input type="text" [(ngModel)]="form.offline_reference"
                                   placeholder="Cheque / transaction id">
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Note</label>
                        <textarea rows="2" [(ngModel)]="form.offline_note"
                                  placeholder="e.g. Customer paid full balance on arrival"></textarea>
                    </div>
                    @if (formError()) {
                        <div class="info-badge" style="background:#fee2e2;color:#991b1b;display:block;margin-bottom:10px">
                            ✕ {{ formError() }}
                        </div>
                    }
                    <div class="flex" style="justify-content:flex-end">
                        <button class="btn" (click)="closePaymentModal()" [disabled]="submitting()">Cancel</button>
                        <button class="btn btn-success" (click)="submitPayment()" [disabled]="submitting()">
                            @if (submitting()) { <span class="spinner"></span> Saving… }
                            @else { ✓ Record Payment }
                        </button>
                    </div>
                </div>
            </div>
        }

        <!-- Vendor Ledger Modal -->
        @if (ledgerOpen()) {
            <div class="modal-backdrop" (click)="closeLedgerModal()">
                <div class="modal" (click)="$event.stopPropagation()">
                    <h2 style="margin-top:0">{{ editingLedgerId() ? '✏️ Edit Cost Entry' : '+ Add Cost Entry' }}</h2>
                    <p class="text-muted">
                        Record vendor cost & payouts for booking <strong>{{ booking()!.booking_number }}</strong>.
                    </p>
                    <div class="form-grid-2">
                        @if (!editingLedgerId()) {
                            <div class="form-group" style="grid-column: span 2">
                                <label>Supplier / Vendor <span class="req">*</span></label>
                                <select [(ngModel)]="ledgerForm.supplier_id">
                                    <option value="">— select supplier —</option>
                                    @for (s of suppliers(); track s.id) {
                                        <option [value]="s.id">{{ s.name }} ({{ s.type }})</option>
                                    }
                                </select>
                            </div>
                        } @else {
                            <div class="form-group" style="grid-column: span 2">
                                <label>Supplier / Vendor</label>
                                <input type="text" [value]="getSelectedSupplierName()" disabled style="background:#e2e8f0; border: 1px solid var(--gray-200); padding: 8px 10px; border-radius: 6px; width: 100%; color: var(--gray-600);" />
                            </div>
                        }
                        <div class="form-group">
                            <label>Cost Price (₹) <span class="req">*</span></label>
                            <input type="number" [(ngModel)]="ledgerForm.cost_amount" min="0" step="1">
                        </div>
                        <div class="form-group">
                            <label>Paid to Vendor (₹)</label>
                            <input type="number" [(ngModel)]="ledgerForm.paid_amount" min="0" step="1">
                        </div>
                    </div>
                    <div class="form-group" style="margin-top:10px">
                        <label>Notes</label>
                        <textarea rows="2" [(ngModel)]="ledgerForm.notes"
                                  placeholder="e.g. Flight ticket booking cost or advance paid to hotelier" style="width: 100%; box-sizing: border-box;"></textarea>
                    </div>
                    @if (ledgerError()) {
                        <div class="info-badge" style="background:#fee2e2;color:#991b1b;display:block;margin-bottom:10px">
                            ✕ {{ ledgerError() }}
                        </div>
                    }
                    <div class="flex" style="justify-content:flex-end;gap:8px;margin-top:12px">
                        <button class="btn ghost" (click)="closeLedgerModal()" [disabled]="ledgerSubmitting()">Cancel</button>
                        <button class="btn btn-success" (click)="submitLedger()" [disabled]="ledgerSubmitting()">
                            @if (ledgerSubmitting()) { <span class="spinner"></span> Saving… }
                            @else { ✓ Save Entry }
                        </button>
                    </div>
                </div>
            </div>
        }

        <!-- WhatsApp Notification Modal -->
        @if (whatsappOpen()) {
            <div class="modal-backdrop" (click)="closeWhatsappModal()">
                <div class="modal" (click)="$event.stopPropagation()">
                    <h2 style="margin-top:0">💬 Send WhatsApp Notification</h2>
                    <p class="text-muted">
                        Send message to traveller <strong>{{ booking()!.customer_name }}</strong> at <strong>{{ booking()!.customer_phone }}</strong>.
                    </p>
                    <div class="form-group">
                        <label>Select Template</label>
                        <select [(ngModel)]="selectedTemplate" (change)="applyTemplate()">
                            <option value="custom">Custom Message (No Template)</option>
                            <option value="confirmation">Booking Confirmation</option>
                            <option value="receipt">Payment Receipt</option>
                            <option value="reminder">Balance Reminder</option>
                        </select>
                    </div>
                    <div class="form-group" style="margin-top:10px">
                        <label>Message Content <span class="req">*</span></label>
                        <textarea rows="5" [(ngModel)]="whatsappMessage" placeholder="Type message..." style="width: 100%; box-sizing: border-box; font-family: inherit; font-size: 13px; border: 1px solid var(--gray-300); border-radius: 6px; padding: 8px;"></textarea>
                    </div>
                    @if (whatsappError()) {
                        <div class="info-badge" style="background:#fee2e2;color:#991b1b;display:block;margin-bottom:10px">
                            ✕ {{ whatsappError() }}
                        </div>
                    }
                    <div class="flex" style="justify-content:flex-end;gap:8px;margin-top:12px">
                        <button class="btn ghost" (click)="closeWhatsappModal()" [disabled]="whatsappSending()">Cancel</button>
                        <button class="btn btn-primary" (click)="sendWhatsapp()" [disabled]="whatsappSending() || !whatsappMessage.trim()">
                            @if (whatsappSending()) { <span class="spinner"></span> Dispatching… }
                            @else { ✓ Send Message }
                        </button>
                    </div>
                </div>
            </div>
        }
    }
    `,
    styles: [`
        .traveller-form { display:flex; flex-direction:column; gap:6px; }
        .traveller-row { display:flex; align-items:center; gap:10px; padding:8px 10px; background:var(--gray-50); border-radius:6px; }
        .traveller-index { width:24px; height:24px; border-radius:50%; background:#4f46e5; color:#fff; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:700; flex-shrink:0; }
        .traveller-fields { flex:1; display:flex; gap:8px; }
        .traveller-fields input { flex:1; padding:6px 10px; border:1px solid var(--gray-200); border-radius:5px; font:inherit; font-size:13px; }
        .traveller-fields input:focus { outline:none; border-color:#4f46e5; }
        .traveller-type-badge { font-size:10px; font-weight:600; padding:2px 8px; border-radius:8px; white-space:nowrap; }
        .type-adult { background:#dbeafe; color:#1e40af; }
        .type-child_below_5 { background:#fef3c7; color:#92400e; }
        .type-child_above_5 { background:#d1fae5; color:#065f46; }
        .card h2 { display:flex; align-items:center; gap:8px; }
        .task-row { display:flex; align-items:center; gap:10px; padding:8px 10px; border-bottom:1px solid var(--gray-100); transition:background .1s; }
        .task-row:hover { background:var(--gray-50); }
        .task-row.completed { opacity:.6; }
        .task-row.completed .task-title { text-decoration:line-through; }
        .task-checkbox { position:relative; width:20px; height:20px; flex-shrink:0; }
        .task-checkbox input { position:absolute; opacity:0; cursor:pointer; width:100%; height:100%; z-index:1; }
        .task-checkbox .checkmark { display:block; width:20px; height:20px; border:2px solid var(--gray-300); border-radius:4px; background:#fff; transition:all .15s; }
        .task-checkbox input:checked ~ .checkmark { background:var(--success); border-color:var(--success); }
        .task-checkbox input:checked ~ .checkmark::after { content:'✓'; display:block; text-align:center; color:#fff; font-size:14px; line-height:16px; }
        .task-body { flex:1; display:flex; flex-wrap:wrap; gap:4px 12px; align-items:center; }
        .task-title { font-weight:500; }
        .task-assignee, .task-due { font-size:12px; color:#64748b; }
        .btn-danger-outline { background:transparent; border:1px solid var(--danger); color:var(--danger); width:26px; height:26px; border-radius:4px; cursor:pointer; font-size:16px; line-height:1; display:flex; align-items:center; justify-content:center; }
        .btn-danger-outline:hover { background:var(--danger); color:#fff; }
        .task-form { margin-top:6px; padding:8px; background:var(--gray-50); border-radius:8px; }
    `]
})
export class BookingDetailComponent implements OnInit {
    private api  = inject(ApiService);
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private toast = inject(ToastService);
    private supplierService = inject(SupplierService);
    private pdfService = inject(PdfService);
    private whatsappService = inject(WhatsappService);

    loading = signal(true);
    booking = signal<any | null>(null);

    // Agency Settings for PDFs
    settings = signal<any>(null);
    generatingVoucher = signal(false);

    // Payment modal
    paymentOpen = signal(false);
    submitting   = signal(false);
    formError    = signal<string | null>(null);
    form = {
        amount: 0,
        gateway: 'cash' as PaymentGateway,
        method_label: '',
        offline_reference: '',
        offline_note: ''
    };

    // Vendor Costing Ledger
    vendorLedgers = signal<any[]>([]);
    suppliers = signal<any[]>([]);
    ledgerLoading = signal(false);
    ledgerOpen = signal(false);
    ledgerSubmitting = signal(false);
    ledgerError = signal<string | null>(null);
    editingLedgerId = signal<number | null>(null);
    ledgerForm = {
        supplier_id: '',
        cost_amount: 0,
        paid_amount: 0,
        notes: ''
    };

    // WhatsApp modal
    whatsappOpen = signal(false);
    whatsappSending = signal(false);
    whatsappError = signal<string | null>(null);
    whatsappMessage = '';
    selectedTemplate = 'custom';

    // Booking travellers
    travellers = signal<BookingTraveller[]>([]);
    travellersLoading = signal(false);
    travellersEditing = signal(false);
    travellerSaving = signal(false);
    travellerForm = signal<Partial<BookingTraveller>[]>([]);

    // Booking tasks
    bookingTasks = signal<any[]>([]);
    tasksLoading = signal(false);
    showTaskForm = signal(false);
    taskSaving = signal(false);
    newTaskTitle = '';
    newTaskAssignee = '';
    newTaskDueDate = '';

    balance = computed(() => {
        const b = this.booking();
        if (!b) return 0;
        return Math.max(0, Number(b.total_amount || 0) - Number(b.amount_paid || 0));
    });

    ngOnInit() { this.reload(); }

    reload() {
        const id = this.route.snapshot.paramMap.get('id');
        if (!id) { this.loading.set(false); return; }
        this.api.getBooking(id).subscribe({
            next: b => {
                this.booking.set(b);
                this.loading.set(false);
                this.loadTasks();
                this.loadTravellers();
                this.loadLedgers();
                this.loadSuppliers();
                this.loadSettings();
            },
            error: ()  => this.loading.set(false)
        });
    }

    loadSettings() {
        this.api.getSettings().subscribe({
            next: s => this.settings.set(s),
            error: () => this.settings.set(null)
        });
    }

    loadLedgers() {
        const id = this.route.snapshot.paramMap.get('id');
        if (!id) return;
        this.ledgerLoading.set(true);
        this.api.listVendorLedgers(id).subscribe({
            next: r => { this.vendorLedgers.set(r); this.ledgerLoading.set(false); },
            error: () => this.ledgerLoading.set(false)
        });
    }

    loadSuppliers() {
        this.supplierService.list().subscribe({
            next: r => this.suppliers.set(r),
            error: () => {}
        });
    }

    openLedgerModal(entry?: any) {
        if (entry) {
            this.editingLedgerId.set(entry.id);
            this.ledgerForm = {
                supplier_id: String(entry.supplier_id),
                cost_amount: Number(entry.cost_amount),
                paid_amount: Number(entry.paid_amount || 0),
                notes: entry.notes || ''
            };
        } else {
            this.editingLedgerId.set(null);
            this.ledgerForm = {
                supplier_id: '',
                cost_amount: 0,
                paid_amount: 0,
                notes: ''
            };
        }
        this.ledgerError.set(null);
        this.ledgerOpen.set(true);
    }

    closeLedgerModal() {
        this.ledgerOpen.set(false);
    }

    getSelectedSupplierName(): string {
        const s = this.suppliers().find(x => String(x.id) === this.ledgerForm.supplier_id);
        return s ? `${s.name} (${s.type})` : 'Supplier';
    }

    submitLedger() {
        const id = this.route.snapshot.paramMap.get('id');
        if (!id) return;

        if (!this.ledgerForm.supplier_id) {
            this.ledgerError.set('Please select a supplier');
            return;
        }
        if (this.ledgerForm.cost_amount == null || this.ledgerForm.cost_amount < 0) {
            this.ledgerError.set('Cost price must be 0 or greater');
            return;
        }

        this.ledgerSubmitting.set(true);
        this.ledgerError.set(null);

        const body = {
            supplier_id: Number(this.ledgerForm.supplier_id),
            cost_amount: this.ledgerForm.cost_amount,
            paid_amount: this.ledgerForm.paid_amount,
            notes: this.ledgerForm.notes || null
        };

        const obs = this.editingLedgerId()
            ? this.api.updateVendorLedger(id, this.editingLedgerId()!, body)
            : this.api.createVendorLedger(id, body);

        obs.subscribe({
            next: () => {
                this.ledgerSubmitting.set(false);
                this.ledgerOpen.set(false);
                this.toast.success(this.editingLedgerId() ? 'Cost item updated' : 'Cost item added');
                this.reload();
            },
            error: err => {
                this.ledgerSubmitting.set(false);
                this.ledgerError.set(err?.error?.error || 'Failed to save cost entry');
            }
        });
    }

    deleteLedger(ledgerId: number) {
        const id = this.route.snapshot.paramMap.get('id');
        if (!id || !confirm('Are you sure you want to delete this cost entry?')) return;

        this.api.deleteVendorLedger(id, ledgerId).subscribe({
            next: () => {
                this.toast.success('Cost entry deleted');
                this.reload();
            },
            error: () => this.toast.error('Failed to delete cost entry')
        });
    }

    downloadVoucher() {
        const b = this.booking();
        if (!b) return;
        const bookingData = {
            ...b,
            hotels: b.hotels || [],
            cars: b.cars || [],
            travellers: this.travellers()
        };
        this.generatingVoucher.set(true);
        setTimeout(() => {
            try {
                const s = this.settings() ?? {};
                this.pdfService.generateVoucherPdf(bookingData, s);
                this.toast.success('Tour Voucher downloaded');
            } catch (e) {
                this.toast.error('Voucher generation failed: ' + (e as Error).message);
            } finally {
                this.generatingVoucher.set(false);
            }
        }, 50);
    }

    openWhatsappModal() {
        this.selectedTemplate = 'confirmation';
        this.whatsappError.set(null);
        this.applyTemplate();
        this.whatsappOpen.set(true);
    }

    closeWhatsappModal() {
        this.whatsappOpen.set(false);
    }

    applyTemplate() {
        const b = this.booking();
        if (!b) return;

        const bal = this.balance();
        const start = this.formatDateString(b.trip_start_date);

        if (this.selectedTemplate === 'confirmation') {
            this.whatsappMessage = `Hello ${b.customer_name}, your booking #${b.booking_number} for ${b.destination_name || b.destination_text || 'your trip'} starting on ${start} is confirmed! Thank you for choosing us.`;
        } else if (this.selectedTemplate === 'receipt') {
            const paid = Number(b.amount_paid || 0);
            this.whatsappMessage = `Hello ${b.customer_name}, we have successfully recorded your payment of ₹${paid.toLocaleString('en-IN')}. Your booking reference is #${b.booking_number}.`;
        } else if (this.selectedTemplate === 'reminder') {
            this.whatsappMessage = `Hello ${b.customer_name}, this is a friendly reminder that a balance payment of ₹${bal.toLocaleString('en-IN')} is due for your upcoming booking #${b.booking_number} starting on ${start}. Please process the payment soon.`;
        } else {
            this.whatsappMessage = '';
        }
    }

    formatDateString(dStr: string): string {
        if (!dStr) return '';
        const d = new Date(dStr);
        return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    }

    sendWhatsapp() {
        const b = this.booking();
        if (!b || !this.whatsappMessage.trim()) return;

        this.whatsappSending.set(true);
        this.whatsappError.set(null);

        this.whatsappService.sendMessage({
            to: b.customer_phone,
            message: this.whatsappMessage.trim()
        }).subscribe({
            next: (res: any) => {
                this.whatsappSending.set(false);
                this.whatsappOpen.set(false);
                if (res.mock) {
                    this.toast.success('WhatsApp sent (Simulated log)');
                } else {
                    this.toast.success('WhatsApp sent successfully!');
                }
            },
            error: err => {
                this.whatsappSending.set(false);
                this.whatsappError.set(err?.error?.error || 'Failed to dispatch message');
            }
        });
    }

    // ── Traveller Methods ────────────────────────────────────
    loadTravellers() {
        const id = this.route.snapshot.paramMap.get('id');
        if (!id) return;
        this.travellersLoading.set(true);
        this.api.listBookingTravellers(id).subscribe({
            next: r => { this.travellers.set(r); this.travellersLoading.set(false); },
            error: () => this.travellersLoading.set(false)
        });
    }

    buildTravellerForm() {
        const b = this.booking();
        if (!b) return;
        const existing = this.travellers();
        if (existing.length > 0) {
            this.travellerForm.set(existing.map(t => ({ ...t })));
            return;
        }
        const form: Partial<BookingTraveller>[] = [];
        const adults = b.adults || 0;
        const cBelow5 = b.children_below_5 || 0;
        const cAbove5 = b.children_above_5 || 0;
        for (let i = 0; i < adults; i++) {
            form.push({ full_name: '', aadhar_number: '', traveller_type: 'adult', booking_id: b.id });
        }
        for (let i = 0; i < cBelow5; i++) {
            form.push({ full_name: '', aadhar_number: '', traveller_type: 'child_below_5', booking_id: b.id });
        }
        for (let i = 0; i < cAbove5; i++) {
            form.push({ full_name: '', aadhar_number: '', traveller_type: 'child_above_5', booking_id: b.id });
        }
        this.travellerForm.set(form);
    }

    startEditTravellers() {
        this.buildTravellerForm();
        this.travellersEditing.set(true);
    }

    cancelEditTravellers() {
        this.travellersEditing.set(false);
    }

    saveTravellers() {
        const id = this.route.snapshot.paramMap.get('id');
        if (!id) return;
        const form = this.travellerForm();
        if (form.some(t => !t.full_name?.trim())) {
            this.toast.error('All traveller names are required.');
            return;
        }
        this.travellerSaving.set(true);
        this.api.saveBookingTravellers(id, form).subscribe({
            next: r => {
                this.travellers.set(r);
                this.travellersEditing.set(false);
                this.travellerSaving.set(false);
                this.toast.success('Travellers saved');
            },
            error: () => {
                this.travellerSaving.set(false);
                this.toast.error('Failed to save travellers');
            }
        });
    }

    loadTasks() {
        const id = this.route.snapshot.paramMap.get('id');
        if (!id) return;
        this.tasksLoading.set(true);
        this.api.listBookingTasks(id).subscribe({
            next: tasks => { this.bookingTasks.set(tasks); this.tasksLoading.set(false); },
            error: () => this.tasksLoading.set(false)
        });
    }

    openTaskForm() {
        this.newTaskTitle = '';
        this.newTaskAssignee = '';
        this.newTaskDueDate = '';
        this.showTaskForm.set(true);
    }

    closeTaskForm() { this.showTaskForm.set(false); }

    addTask() {
        const id = this.route.snapshot.paramMap.get('id');
        if (!id || !this.newTaskTitle.trim()) return;
        this.taskSaving.set(true);
        this.api.createBookingTask({
            booking_id: Number(id),
            title: this.newTaskTitle.trim(),
            assigned_to_name: this.newTaskAssignee.trim() || undefined,
            due_date: this.newTaskDueDate || undefined
        }).subscribe({
            next: () => {
                this.taskSaving.set(false);
                this.showTaskForm.set(false);
                this.loadTasks();
            },
            error: () => this.taskSaving.set(false)
        });
    }

    toggleTask(task: any) {
        this.api.toggleBookingTask(task.id).subscribe({
            next: () => this.loadTasks(),
            error: () => {}
        });
    }

    deleteTask(taskId: number) {
        if (!confirm('Delete this task?')) return;
        this.api.deleteBookingTask(taskId).subscribe({
            next: () => this.loadTasks(),
            error: () => {}
        });
    }

    openPaymentModal() {
        this.form = {
            amount: this.balance(),
            gateway: 'bank_transfer',
            method_label: '',
            offline_reference: '',
            offline_note: ''
        };
        this.formError.set(null);
        this.paymentOpen.set(true);
    }
    closePaymentModal() {
        if (this.submitting()) return;
        this.paymentOpen.set(false);
    }
    submitPayment() {
        const b = this.booking();
        if (!b) return;
        if (!this.form.amount || this.form.amount <= 0) {
            this.formError.set('Amount must be greater than 0');
            return;
        }
        this.submitting.set(true);
        this.formError.set(null);
        this.api.recordOfflinePayment({
            booking_id: b.id,
            amount: this.form.amount,
            gateway: this.form.gateway,
            method_label: this.form.method_label || undefined,
            offline_reference: this.form.offline_reference || undefined,
            offline_note: this.form.offline_note || undefined
        }).subscribe({
            next: () => {
                this.submitting.set(false);
                this.paymentOpen.set(false);
                this.reload();
            },
            error: (err) => {
                this.submitting.set(false);
                this.formError.set(err?.error?.error || 'Failed to record payment');
            }
        });
    }

    downloadInvoice(invoiceId: number) {
        const token = localStorage.getItem('crm_token');
        const url = this.api.invoicePdfUrl(invoiceId);
        if (!token) { window.open(url, '_blank'); return; }
        fetch(url, { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.blob())
            .then(blob => {
                const objUrl = URL.createObjectURL(blob);
                window.open(objUrl, '_blank');
                setTimeout(() => URL.revokeObjectURL(objUrl), 60_000);
            });
    }

    badgeStatus(s: string): string {
        if (s === 'completed') return 'accepted';
        if (s === 'cancelled') return 'rejected';
        return 'sent';
    }
    badgePay(p: string): string {
        if (p === 'paid')     return 'accepted';
        if (p === 'partial')  return 'sent';
        if (p === 'refunded') return 'rejected';
        return 'draft';
    }
}
