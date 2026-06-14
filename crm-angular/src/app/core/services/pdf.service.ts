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

const inr = (n: number) =>
    'INR ' + (Number(n) || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

const fmtDate = (s?: string) => {
    if (!s) return '—';
    const d = new Date(s);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

@Injectable({ providedIn: 'root' })
export class PdfService {
    generateQuotationPdf(q: Quotation, s: AgencySettings | null | undefined): void {
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
}
