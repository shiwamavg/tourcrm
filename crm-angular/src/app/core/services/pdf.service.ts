// src/app/core/services/pdf.service.ts
// Generates a professional quotation PDF (jsPDF + autotable).
import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Quotation, AgencySettings } from '../models';

const COL_PRIMARY: [number, number, number] = [37, 99, 235];   // #2563eb
const COL_GRAY:    [number, number, number] = [107, 114, 128]; // #6b7280
const COL_DARK:    [number, number, number] = [17, 24, 39];    // #111827
const COL_LIGHT:   [number, number, number] = [243, 244, 246]; // #f3f4f6
const COL_BORDER:  [number, number, number] = [229, 231, 235]; // #e5e7eb

const formatCurrency = (n: number, currencyCode: string = 'INR') => {
    const currencyMap: any = { 'INR': '₹', 'USD': '$', 'EUR': '€', 'GBP': '£', 'AED': 'د.إ' };
    const symbol = currencyMap[currencyCode] || currencyCode + ' ';
    return symbol + (Number(n) || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
};

const fmtDate = (s?: string) => {
    if (!s) return '—';
    const d = new Date(s);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

@Injectable({ providedIn: 'root' })
export class PdfService {
    generateQuotationPdf(q: Quotation, s: AgencySettings | null | undefined): void {
        const currencyCode = (q as any).billing_currency || 'INR';
        const inr = (n: number) => formatCurrency(n, currencyCode);

        const doc = new jsPDF({ unit: 'pt', format: 'a4' });
        const pageW = doc.internal.pageSize.getWidth();
        const pageH = doc.internal.pageSize.getHeight();
        const margin = 40;

        // ── Header / Footer delegates (jspdf hooks) ───────────
        this.applyHeaderFooter(doc, s, q.quotation_number, pageW, pageH, margin);

        // ── Title block ────────────────────────────────────────
        let y = 100;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(22);
        doc.setTextColor(...COL_DARK);
        doc.text('QUOTATION', margin, y);
        y += 10;
        doc.setDrawColor(...COL_PRIMARY);
        doc.setLineWidth(2);
        doc.line(margin, y, margin + 90, y);
        y += 24;

        // ── Quotation meta (right column) ──────────────────────
        const metaX = pageW - margin;
        doc.setFontSize(9);
        doc.setTextColor(...COL_GRAY);
        doc.setFont('helvetica', 'normal');
        const metaLines: [string, string][] = [
            ['Quotation #', q.quotation_number],
            ['Date',         fmtDate(q.created_at)],
            ['Valid Till',   fmtDate(q.valid_till)],
            ['Status',       (q.status || '').toUpperCase()]
        ];
        let my = 100;
        for (const [label, value] of metaLines) {
            doc.text(label, metaX - 90, my, { align: 'left' });
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...COL_DARK);
            doc.text(value, metaX, my, { align: 'right' });
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...COL_GRAY);
            my += 16;
        }

        // ── Customer + Trip panels (2 columns) ─────────────────
        y = Math.max(y, my + 12);
        const colW = (pageW - margin * 2 - 16) / 2;

        // Bill To
        this.panel(doc, margin, y, colW, 92, 'BILL TO', [
            q.customer_name,
            q.customer_phone,
            q.customer_email || '—'
        ]);

        // Trip Details
        this.panel(doc, margin + colW + 16, y, colW, 92, 'TRIP DETAILS', [
            `Destination: ${q.destination_name || q.destination_text || '—'}`,
            `Dates: ${fmtDate(q.trip_start_date)} → ${fmtDate(q.trip_end_date)}  (${q.nights}N)`,
            `Pax: ${q.adults} adults`
                + (q.children_below_5 ? `, ${q.children_below_5} child <5` : '')
                + (q.children_above_5 ? `, ${q.children_above_5} child >5` : ''),
            `Rooms: ${q.num_rooms}  •  Package: ${(q.package_type || '').replace(/_/g, ' + ').toUpperCase()}`
        ]);

        y += 92 + 18;

        // ── Hotels table ───────────────────────────────────────
        if (q.hotels?.length) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(11);
            doc.setTextColor(...COL_DARK);
            doc.text('HOTELS', margin, y); y += 6;
            autoTable(doc, {
                startY: y,
                head: [['Hotel', 'Room', 'Meal', 'N × R', 'Rate/night', 'Total']],
                body: q.hotels.map(h => [
                    (h.hotel_name || '') + (h.star_rating ? `  ${h.star_rating}★` : ''),
                    h.room_type,
                    this.meal(h.meal_plan),
                    `${h.num_nights} × ${h.num_rooms}`,
                    inr(h.charge_per_night),
                    inr(h.line_total || 0)
                ]),
                margin: { left: margin, right: margin },
                styles: { fontSize: 9, cellPadding: 5 },
                headStyles: { fillColor: COL_PRIMARY, textColor: 255, fontStyle: 'bold' },
                columnStyles: {
                    3: { halign: 'right' },
                    4: { halign: 'right' },
                    5: { halign: 'right' }
                }
            });
            y = (doc as any).lastAutoTable.finalY + 14;
        }

        // ── Cars table ─────────────────────────────────────────
        if (q.cars?.length) {
            this.sectionTitle(doc, 'TRANSPORT', margin, y); y += 6;
            autoTable(doc, {
                startY: y,
                head: [['Car', 'Class', 'Days', 'Rate/day', 'Extra KM', 'Total']],
                body: q.cars.map(c => [
                    c.car_type_name,
                    c.car_class,
                    String(c.num_days),
                    inr(c.charge_per_day),
                    `${c.estimated_extra_km} km × INR ${c.extra_charge_per_km}`,
                    inr(c.line_total || 0)
                ]),
                margin: { left: margin, right: margin },
                styles: { fontSize: 9, cellPadding: 5 },
                headStyles: { fillColor: COL_PRIMARY, textColor: 255, fontStyle: 'bold' },
                columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' } }
            });
            y = (doc as any).lastAutoTable.finalY + 14;
        }

        // ── Flights table ──────────────────────────────────────
        if (q.flights?.length) {
            this.sectionTitle(doc, 'FLIGHTS', margin, y); y += 6;
            autoTable(doc, {
                startY: y,
                head: [['Airline', 'Route', 'Date', 'Adult fare', 'Child fare', 'Total']],
                body: q.flights.map(f => [
                    f.airline || '—',
                    f.route   || '—',
                    fmtDate(f.flight_date),
                    inr(f.fare_per_adult),
                    inr(f.fare_per_child),
                    inr(f.line_total || 0)
                ]),
                margin: { left: margin, right: margin },
                styles: { fontSize: 9, cellPadding: 5 },
                headStyles: { fillColor: COL_PRIMARY, textColor: 255, fontStyle: 'bold' },
                columnStyles: { 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' } }
            });
            y = (doc as any).lastAutoTable.finalY + 14;
        }

        // ── Misc table ─────────────────────────────────────────
        if (q.misc?.length) {
            this.sectionTitle(doc, 'OTHER CHARGES', margin, y); y += 6;
            autoTable(doc, {
                startY: y,
                head: [['Label', 'Amount']],
                body: q.misc.map(m => [m.label, inr(m.amount)]),
                margin: { left: margin, right: margin },
                styles: { fontSize: 9, cellPadding: 5 },
                headStyles: { fillColor: COL_PRIMARY, textColor: 255, fontStyle: 'bold' },
                columnStyles: { 1: { halign: 'right' } }
            });
            y = (doc as any).lastAutoTable.finalY + 14;
        }

        // ── Daywise Itinerary ──────────────────────────────────
        if (q.daywise_itinerary && q.daywise_itinerary.length > 0) {
            if (y > pageH - 160) { doc.addPage(); y = 100; }
            this.sectionTitle(doc, 'DAYWISE ITINERARY', margin, y); y += 14;
            const dayHeaders = ['Day', 'Date', 'Activity / Destination', 'Hotel', 'Vehicle / Transport', 'Cost'];
            const dayRows: string[][] = q.daywise_itinerary.map(d => {
                const dateStr = d.date ? this.formatDate(d.date) : '';
                const dateLabel = d.day_name ? `${dateStr}\n(${d.day_name.toUpperCase()})` : dateStr;
                return [
                    'Day ' + d.day,
                    dateLabel,
                    d.itenary_name || '',
                    d.hotel_name || '—',
                    d.vehicle_type || '—',
                    inr(d.amt || 0)
                ];
            });
            autoTable(doc, {
                startY: y,
                head: [dayHeaders],
                body: dayRows,
                theme: 'grid',
                headStyles: { fillColor: COL_PRIMARY, fontStyle: 'bold', fontSize: 8, halign: 'center' },
                bodyStyles: { fontSize: 7 },
                columnStyles: {
                    0: { halign: 'center', cellWidth: 40 },
                    1: { halign: 'center', cellWidth: 70 },
                    2: { halign: 'left' },
                    3: { halign: 'left' },
                    4: { halign: 'left', cellWidth: 100 },
                    5: { halign: 'right', cellWidth: 60 },
                },
                margin: { left: margin, right: margin },
                tableWidth: 'auto'
            });
            y = (doc as any).lastAutoTable.finalY + 14;
        }

        // ── Grand total box (right aligned) ────────────────────
        const boxW = 230;
        const boxX = pageW - margin - boxW;
        const boxH = 130;
        if (y + boxH > pageH - 80) { doc.addPage(); y = 100; }

        doc.setFillColor(...COL_LIGHT);
        doc.setDrawColor(...COL_BORDER);
        doc.roundedRect(boxX, y, boxW, boxH, 4, 4, 'FD');

        const totalRows: [string, string, boolean?][] = [];
        if (q.hotel_total  > 0) totalRows.push(['Hotels',  inr(q.hotel_total)]);
        if (q.car_total    > 0) totalRows.push(['Transport', inr(q.car_total)]);
        if (q.flight_total > 0) totalRows.push(['Flights',  inr(q.flight_total)]);
        if (q.misc_total   > 0) totalRows.push(['Misc',     inr(q.misc_total)]);
        totalRows.push(['Subtotal', inr(q.subtotal)]);
        if (q.markup_amount > 0) totalRows.push([`Markup (${q.markup_pct}%)`, inr(q.markup_amount)]);
        if (q.gst_amount > 0)    totalRows.push([`GST (${q.gst_pct}%)`,       inr(q.gst_amount)]);

        let ty = y + 18;
        doc.setFontSize(9);
        for (const row of totalRows) {
            const [label, value] = row;
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...COL_GRAY);
            doc.text(label, boxX + 12, ty);
            doc.setTextColor(...COL_DARK);
            doc.text(value, boxX + boxW - 12, ty, { align: 'right' });
            ty += 14;
        }
        // Grand total line
        doc.setDrawColor(...COL_PRIMARY);
        doc.setLineWidth(1.5);
        doc.line(boxX + 10, ty - 4, boxX + boxW - 10, ty - 4);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(...COL_PRIMARY);
        doc.text('GRAND TOTAL', boxX + 12, ty + 10);
        doc.text(inr(q.grand_total), boxX + boxW - 12, ty + 10, { align: 'right' });

        y = Math.max(y + boxH + 16, ty + 30);

        // ── Terms & Conditions ─────────────────────────────────
        if (q.terms_notes) {
            if (y > pageH - 140) { doc.addPage(); y = 100; }
            this.sectionTitle(doc, 'TERMS & CONDITIONS', margin, y); y += 14;
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.setTextColor(...COL_DARK);
            const lines = doc.splitTextToSize(q.terms_notes, pageW - margin * 2);
            doc.text(lines, margin, y);
        }

        // ── Save ───────────────────────────────────────────────
        const safeNum = q.quotation_number.replace(/[^a-z0-9_-]/gi, '_');
        doc.save(`Quotation_${safeNum}.pdf`);
    }

    // ── helpers ──────────────────────────────────────────────
    private applyHeaderFooter(
        doc: jsPDF, s: AgencySettings | null | undefined, qNum: string,
        pageW: number, pageH: number, margin: number
    ) {
        // Normalize null/undefined to an empty object (all `s.x` accessors below use `|| 'fallback'`)
        s = s ?? ({} as AgencySettings);
        const total = doc.getNumberOfPages();
        for (let i = 1; i <= total; i++) {
            doc.setPage(i);

            // ── Header band ──
            doc.setFillColor(...COL_PRIMARY);
            doc.rect(0, 0, pageW, 70, 'F');

            // Logo placeholder badge
            doc.setFillColor(255, 255, 255);
            doc.roundedRect(margin, 18, 36, 36, 6, 6, 'F');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(20);
            doc.setTextColor(...COL_PRIMARY);
            const initial = (s.agency_name || 'T').charAt(0).toUpperCase();
            doc.text(initial, margin + 18, 42, { align: 'center' });

            // Agency name
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(16);
            doc.setTextColor(255, 255, 255);
            doc.text(s.agency_name || 'Travel Agency', margin + 50, 32);

            // Tagline / GSTIN
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(220, 230, 250);
            const sub: string[] = [];
            if (s.address) sub.push(s.address);
            if (s.gstin)   sub.push(`GSTIN: ${s.gstin}`);
            doc.text(sub.join('  •  '), margin + 50, 46);

            // Right side: contact
            const contact: string[] = [];
            if (s.phone)   contact.push('📞 ' + s.phone);
            if (s.email)   contact.push('✉  ' + s.email);
            if (s.website) contact.push('🌐 ' + s.website.replace(/^https?:\/\//, ''));
            doc.setFontSize(8);
            doc.text(contact.join('\n'), pageW - margin, 30, { align: 'right' });

            // ── Footer ──
            const footerY = pageH - 28;
            doc.setDrawColor(...COL_BORDER);
            doc.setLineWidth(0.5);
            doc.line(margin, footerY - 8, pageW - margin, footerY - 8);

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(...COL_GRAY);
            doc.text(
                `${s.agency_name || ''}  •  ${s.phone || ''}  •  ${s.email || ''}`,
                margin, footerY
            );
            doc.text(
                `Page ${i} of ${total}  •  ${qNum}`,
                pageW - margin, footerY, { align: 'right' }
            );
        }
    }

    private panel(
        doc: jsPDF, x: number, y: number, w: number, h: number,
        title: string, lines: string[]
    ) {
        doc.setFillColor(...COL_LIGHT);
        doc.setDrawColor(...COL_BORDER);
        doc.roundedRect(x, y, w, h, 4, 4, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(...COL_GRAY);
        doc.text(title, x + 10, y + 14);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(...COL_DARK);
        let ty = y + 30;
        for (const line of lines) {
            doc.text(line, x + 10, ty);
            ty += 14;
        }
    }

    private sectionTitle(doc: jsPDF, label: string, x: number, y: number) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(...COL_DARK);
        doc.text(label, x, y);
    }

    private meal(m: string): string {
        return ({ none: 'No meals', breakfast: 'Breakfast',
                  breakfast_dinner: 'Breakfast + Dinner',
                  all_inclusive: 'All Inclusive' } as any)[m] || m || '—';
    }

    private formatDate(dateStr: string): string {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        return d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
    }

    generateVoucherPdf(b: any, s: any): void {
        const doc = new jsPDF({ unit: 'pt', format: 'a4' });
        const pageW = doc.internal.pageSize.getWidth();
        const pageH = doc.internal.pageSize.getHeight();
        const margin = 40;

        // ── Header / Footer delegates (jspdf hooks) ───────────
        this.applyHeaderFooter(doc, s, b.booking_number, pageW, pageH, margin);

        // ── Title block ────────────────────────────────────────
        let y = 100;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(22);
        doc.setTextColor(...COL_DARK);
        doc.text('CONFIRMED TOUR VOUCHER', margin, y);
        y += 10;
        doc.setDrawColor(...COL_PRIMARY);
        doc.setLineWidth(2);
        doc.line(margin, y, margin + 250, y);
        y += 24;

        // ── Booking meta (right column) ──────────────────────
        const metaX = pageW - margin;
        doc.setFontSize(9);
        doc.setTextColor(...COL_GRAY);
        doc.setFont('helvetica', 'normal');
        const metaLines: [string, string][] = [
            ['Booking #', b.booking_number],
            ['Date Confirmed', fmtDate(b.created_at)],
            ['Trip Starts', fmtDate(b.trip_start_date)],
            ['Trip Ends', fmtDate(b.trip_end_date)]
        ];
        let my = 100;
        for (const [label, value] of metaLines) {
            doc.text(label, metaX - 110, my, { align: 'left' });
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...COL_DARK);
            doc.text(value, metaX, my, { align: 'right' });
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...COL_GRAY);
            my += 16;
        }

        // ── Customer + Trip panels (2 columns) ─────────────────
        y = Math.max(y, my + 12);
        const colW = (pageW - margin * 2 - 16) / 2;

        // Customer details
        this.panel(doc, margin, y, colW, 92, 'CUSTOMER DETAILS', [
            b.customer_name || '—',
            b.customer_phone || '—',
            b.customer_email || '—'
        ]);

        // Trip Details
        this.panel(doc, margin + colW + 16, y, colW, 92, 'TRIP DETAILS', [
            `Destination: ${b.destination_name || b.destination_text || '—'}`,
            `Dates: ${fmtDate(b.trip_start_date)} → ${fmtDate(b.trip_end_date)}`,
            `Pax: ${b.adults} adults` + 
                (b.children_below_5 ? `, ${b.children_below_5} child <5` : '') + 
                (b.children_above_5 ? `, ${b.children_above_5} child >5` : ''),
            `Rooms: ${b.num_rooms || 1}  •  Package: ${b.package_title || 'Custom Tour'}`
        ]);

        y += 92 + 18;

        // ── Travellers List ────────────────────────────────────
        if (b.travellers?.length) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(11);
            doc.setTextColor(...COL_DARK);
            doc.text('PASSENGER DETAILS', margin, y); y += 6;
            autoTable(doc, {
                startY: y,
                head: [['#', 'Full Name', 'Type', 'Aadhar Number']],
                body: b.travellers.map((t: any, idx: number) => [
                    idx + 1,
                    t.full_name,
                    t.traveller_type === 'adult' ? 'Adult' : t.traveller_type === 'child_below_5' ? 'Child < 5y' : 'Child > 5y',
                    t.aadhar_number || '—'
                ]),
                theme: 'striped',
                headStyles: { fillColor: COL_PRIMARY },
                margin: { left: margin, right: margin }
            });
            y = (doc as any).lastAutoTable.finalY + 18;
        }

        // ── Hotels table ───────────────────────────────────────
        if (b.hotels?.length) {
            if (y > pageH - 120) { doc.addPage(); y = 100; }
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(11);
            doc.setTextColor(...COL_DARK);
            doc.text('HOTEL RESERVATIONS', margin, y); y += 6;
            autoTable(doc, {
                startY: y,
                head: [['Hotel', 'Room Type', 'Meal Plan', 'Nights', 'Rooms']],
                body: b.hotels.map((h: any) => [
                    h.hotel_name,
                    h.room_type,
                    this.meal(h.meal_plan),
                    h.num_nights,
                    h.num_rooms
                ]),
                theme: 'striped',
                headStyles: { fillColor: COL_PRIMARY },
                margin: { left: margin, right: margin }
            });
            y = (doc as any).lastAutoTable.finalY + 18;
        }

        // ── Transport table ────────────────────────────────────
        if (b.cars?.length) {
            if (y > pageH - 120) { doc.addPage(); y = 100; }
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(11);
            doc.setTextColor(...COL_DARK);
            doc.text('TRANSPORT DETAILS', margin, y); y += 6;
            autoTable(doc, {
                startY: y,
                head: [['Vehicle Type', 'Class', 'Duration (Days)', 'Emergency Support']],
                body: b.cars.map((c: any) => [
                    c.car_type_name,
                    c.car_class,
                    c.num_days,
                    s?.phone || 'Agency Helpline'
                ]),
                theme: 'striped',
                headStyles: { fillColor: COL_PRIMARY },
                margin: { left: margin, right: margin }
            });
            y = (doc as any).lastAutoTable.finalY + 18;
        }

        // ── Emergency & Checklist ──────────────────────────────
        if (y > pageH - 140) { doc.addPage(); y = 100; }
        this.sectionTitle(doc, 'IMPORTANT INFORMATION & EMERGENCY CONTACTS', margin, y); y += 14;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(...COL_DARK);
        
        const infoLines = [
            `• Please carry a valid Photo ID (Aadhar Card, Passport, or Voter ID) for all travelers.`,
            `• Emergency Helpline: ${s?.phone || 'Contact agency'} (${s?.email || 'email support'})`,
            `• Check-in time at hotels is usually 12:00 PM and check-out is 10:00 AM. Early check-in is subject to availability.`,
            `• Please present this voucher at hotel check-in desks and to the cab driver upon arrival.`
        ];
        
        for (const line of infoLines) {
            doc.text(line, margin, y);
            y += 14;
        }

        // ── Save ───────────────────────────────────────────────
        const safeNum = b.booking_number.replace(/[^a-z0-9_-]/gi, '_');
        doc.save(`Voucher_${safeNum}.pdf`);
    }

    generateInvoicePdf(i: any, s: AgencySettings | null | undefined): void {
        const currencyCode = i.billing_currency || 'INR';
        const inr = (n: number) => formatCurrency(n, currencyCode);

        const doc = new jsPDF({ unit: 'pt', format: 'a4' });
        const pageW = doc.internal.pageSize.getWidth();
        const pageH = doc.internal.pageSize.getHeight();
        const margin = 40;

        this.applyHeaderFooter(doc, s, i.invoice_number, pageW, pageH, margin);

        let y = 100;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(22);
        doc.setTextColor(...COL_DARK);
        doc.text('TAX INVOICE', margin, y);
        y += 10;
        doc.setDrawColor(...COL_PRIMARY);
        doc.setLineWidth(2);
        doc.line(margin, y, margin + 140, y);
        y += 24;

        const metaX = pageW - margin;
        doc.setFontSize(9);
        doc.setTextColor(...COL_GRAY);
        doc.setFont('helvetica', 'normal');
        const metaLines: [string, string][] = [
            ['Invoice #', i.invoice_number],
            ['Date', fmtDate(i.issued_at)],
            ['Status', (i.status || '').toUpperCase()],
            ['Due Date', fmtDate(i.due_date)]
        ];
        let my = 100;
        for (const [label, value] of metaLines) {
            doc.text(label, metaX - 90, my, { align: 'left' });
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...COL_DARK);
            doc.text(value, metaX, my, { align: 'right' });
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...COL_GRAY);
            my += 16;
        }

        y = Math.max(y, my + 12);
        const colW = (pageW - margin * 2 - 16) / 2;

        this.panel(doc, margin, y, colW, 92, 'BILL TO', [
            i.customer_name || '—',
            i.customer_phone || '—',
            i.customer_email || '—'
        ]);

        this.panel(doc, margin + colW + 16, y, colW, 92, 'REFERENCE', [
            `Booking #: ${i.booking_number || '—'}`,
            `Destination: ${i.destination_text || '—'}`,
            `Travel Dates: ${fmtDate(i.trip_start_date)} → ${fmtDate(i.trip_end_date)}`
        ]);

        y += 92 + 24;

        autoTable(doc, {
            startY: y,
            head: [['Description', 'Amount']],
            body: [
                ['Tour Package Charges', inr(i.subtotal)],
                [`Markup (${i.markup_pct}%)`, inr(i.markup_amount)],
                [`GST (${i.gst_pct}%)`, inr(i.gst_amount)]
            ].filter(row => Number(String(row[1]).replace(/[^0-9.-]+/g, '')) > 0),
            margin: { left: margin, right: margin },
            headStyles: { fillColor: COL_PRIMARY, textColor: 255, fontStyle: 'bold' },
            columnStyles: { 1: { halign: 'right' } }
        });

        y = (doc as any).lastAutoTable.finalY + 14;

        const boxW = 230;
        const boxX = pageW - margin - boxW;
        const boxH = 90;
        
        doc.setFillColor(...COL_LIGHT);
        doc.setDrawColor(...COL_BORDER);
        doc.roundedRect(boxX, y, boxW, boxH, 4, 4, 'FD');

        let ty = y + 20;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...COL_DARK);
        doc.text('TOTAL AMOUNT', boxX + 12, ty);
        doc.text(inr(i.total), boxX + boxW - 12, ty, { align: 'right' });
        
        ty += 24;
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...COL_GRAY);
        doc.text('Amount Paid', boxX + 12, ty);
        doc.setTextColor(5, 150, 105); // green
        doc.text(inr(i.amount_paid), boxX + boxW - 12, ty, { align: 'right' });

        ty += 20;
        doc.setDrawColor(...COL_BORDER);
        doc.setLineWidth(1);
        doc.line(boxX + 10, ty - 12, boxX + boxW - 10, ty - 12);
        
        const balance = Math.max(0, i.total - (i.amount_paid || 0));
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(220, 38, 38); // red
        doc.text('BALANCE DUE', boxX + 12, ty);
        doc.text(inr(balance), boxX + boxW - 12, ty, { align: 'right' });

        if (i.notes) {
            y = Math.max((doc as any).lastAutoTable.finalY + boxH + 20, ty + 40);
            this.sectionTitle(doc, 'NOTES / PAYMENT TERMS', margin, y);
            y += 14;
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.setTextColor(...COL_GRAY);
            const lines = doc.splitTextToSize(i.notes, pageW - margin * 2);
            doc.text(lines, margin, y);
        }

        const safeNum = i.invoice_number.replace(/[^a-z0-9_-]/gi, '_');
        doc.save(`Invoice_${safeNum}.pdf`);
    }

    generateReceiptPdf(p: any, s: AgencySettings | null | undefined): void {
        const currencyCode = p.currency || 'INR'; // Fallback if currency not provided in payment
        const inr = (n: number) => formatCurrency(n, currencyCode);

        const doc = new jsPDF({ unit: 'pt', format: 'a5' }); // A5 format for receipts
        const pageW = doc.internal.pageSize.getWidth();
        const margin = 30;

        doc.setFillColor(...COL_PRIMARY);
        doc.rect(0, 0, pageW, 50, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.setTextColor(255, 255, 255);
        doc.text(s?.agency_name || 'Travel Agency', margin, 32);

        let y = 80;
        doc.setFontSize(18);
        doc.setTextColor(...COL_DARK);
        doc.text('PAYMENT RECEIPT', margin, y);
        y += 30;

        const details: [string, string][] = [
            ['Receipt No.', `REC-${p.id}`],
            ['Date', fmtDate(p.created_at)],
            ['Payment Method', (p.method_label || p.gateway || '').toUpperCase()],
            ['Transaction Ref.', p.offline_reference || p.gateway_order_id || '—'],
            ['Status', (p.status || '').toUpperCase()]
        ];

        doc.setFontSize(10);
        for (const [lbl, val] of details) {
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...COL_GRAY);
            doc.text(lbl, margin, y);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...COL_DARK);
            doc.text(val, margin + 120, y);
            y += 18;
        }

        y += 20;
        doc.setFillColor(...COL_LIGHT);
        doc.roundedRect(margin, y, pageW - margin * 2, 60, 4, 4, 'F');
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(12);
        doc.setTextColor(...COL_GRAY);
        doc.text('Amount Received', margin + 16, y + 26);
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(24);
        doc.setTextColor(5, 150, 105);
        doc.text(inr(p.amount), pageW - margin - 16, y + 42, { align: 'right' });

        y += 90;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...COL_GRAY);
        doc.text(`Thank you for your payment. This is an auto-generated receipt.`, pageW / 2, y, { align: 'center' });

        doc.save(`Receipt_REC-${p.id}.pdf`);
    }
}
