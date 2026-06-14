// src/controllers/invoices.controller.js
const fs      = require('fs');
const path    = require('path');
const db      = require('../config/db');

const INVOICE_DIR = path.resolve(
    process.cwd(),
    process.env.INVOICE_DIR || 'uploads/invoices'
);
try { fs.mkdirSync(INVOICE_DIR, { recursive: true }); } catch (e) {}

// ── number generator ───────────────────────────────────────
const generateInvoiceNumber = async (conn, companyId) => {
    const year = new Date().getFullYear();
    const [[row]] = await (conn || db).query(
        `SELECT COUNT(*) AS n FROM invoices WHERE invoice_number LIKE ? AND company_id = ?`,
        [`INV-${year}-%`, companyId]
    );
    const seq = String(Number(row.n || 0) + 1).padStart(4, '0');
    return `INV-${year}-${seq}`;
};

// ── PDF builder (minimal, no deps) ─────────────────────────
const buildInvoicePdf = (inv, booking, settings) => {
    const esc = (s) => String(s ?? '').replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
    const fmt = (n) => 'INR ' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

    const lines = [];
    const y = () => { const v = lines.length === 0 ? 0 : lines[lines.length - 1].y; return v; };
    const put = (text, x, yPos, opts = {}) => lines.push({ text, x, y: yPos, ...opts });
    const yStart = 770;
    let cursor = yStart;

    put(settings?.agency_name || 'Travel Agency', 50, cursor, { size: 20, bold: true });
    cursor -= 18;
    put(settings?.address || '', 50, cursor, { size: 9 });
    if (settings?.gstin) { cursor -= 12; put(`GSTIN: ${settings.gstin}`, 50, cursor, { size: 9 }); }
    if (settings?.phone) { cursor -= 12; put(`Phone: ${settings.phone}`, 50, cursor, { size: 9 }); }

    put('TAX INVOICE', 545, yStart, { size: 18, bold: true, align: 'right' });
    put(`Invoice #: ${inv.invoice_number}`, 545, yStart - 18, { size: 9, align: 'right' });
    put(`Issued: ${new Date(inv.issued_at).toLocaleDateString('en-IN')}`, 545, yStart - 30, { size: 9, align: 'right' });

    cursor -= 30;
    put('BILL TO', 50, cursor, { size: 9, bold: true });
    cursor -= 14;
    put(booking.customer_name, 50, cursor, { size: 11, bold: true });
    if (booking.customer_email) { cursor -= 12; put(booking.customer_email, 50, cursor, { size: 9 }); }
    if (booking.customer_phone) { cursor -= 12; put(booking.customer_phone, 50, cursor, { size: 9 }); }

    let rightY = yStart - 60;
    put('BOOKING', 545, rightY, { size: 9, bold: true, align: 'right' }); rightY -= 14;
    put(`#${booking.booking_number}`, 545, rightY, { size: 10, align: 'right' }); rightY -= 12;
    if (booking.trip_start_date) put(`Trip: ${booking.trip_start_date} → ${booking.trip_end_date}`, 545, rightY, { size: 9, align: 'right' });

    cursor = Math.min(cursor, rightY) - 30;
    put('DESCRIPTION',  50, cursor, { size: 9, bold: true });
    put('AMOUNT',      545, cursor, { size: 9, bold: true, align: 'right' });
    cursor -= 4;
    put('________________________________________________________________________________', 50, cursor, { size: 9 });
    cursor -= 16;
    put(`Tour Package: ${booking.package_name || booking.package_type || 'Custom'}`, 50, cursor, { size: 10 });
    put(fmt(booking.subtotal || inv.subtotal), 545, cursor, { size: 10, align: 'right' });
    cursor -= 14;
    if (Number(booking.tax_amount || inv.tax_amount) > 0) {
        put('Tax (GST)', 50, cursor, { size: 10 });
        put(fmt(booking.tax_amount || inv.tax_amount), 545, cursor, { size: 10, align: 'right' });
        cursor -= 14;
    }
    put('________________________________________________________________________________', 50, cursor, { size: 9 });
    cursor -= 18;
    put('TOTAL', 50, cursor, { size: 12, bold: true });
    put(fmt(inv.total), 545, cursor, { size: 12, bold: true, align: 'right' });
    cursor -= 28;

    put(`Amount Paid: ${fmt(booking.amount_paid || 0)}`, 50, cursor, { size: 10 });
    put(`Balance Due: ${fmt(Math.max(0, (inv.total) - (booking.amount_paid || 0)))}`, 545, cursor, { size: 10, align: 'right' });

    cursor -= 40;
    if (settings?.bank_name) {
        put('Bank Details:', 50, cursor, { size: 9, bold: true }); cursor -= 12;
        put(`${settings.bank_name} • A/C ${settings.bank_account_no || '—'} • IFSC ${settings.bank_ifsc || '—'}`, 50, cursor, { size: 9 });
    }

    const stream = lines.map(l => {
        const font = l.bold ? '/F2' : '/F1';
        const size = l.size || 10;
        let xPos = l.x;
        if (l.align === 'right') {
            const w = (l.text || '').length * size * 0.5;
            xPos = l.x - w;
        }
        return `BT ${font} ${size} Tf ${xPos} ${l.y} Td (${esc(l.text)}) Tj ET`;
    }).join('\n');


    const objs = [];
    objs.push('<< /Type /Catalog /Pages 2 0 R >>');
    objs.push('<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
    objs.push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>');
    objs.push(`<< /Length ${Buffer.byteLength(stream, 'utf8')} >>\nstream\n${stream}\nendstream`);
    objs.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
    objs.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');

    let pdf = '%PDF-1.4\n';
    const offsets = [];
    objs.forEach((obj, i) => {
        offsets.push(Buffer.byteLength(pdf, 'binary'));
        pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
    });
    const xrefOffset = Buffer.byteLength(pdf, 'binary');
    pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
    offsets.forEach(off => {
        pdf += `${String(off).padStart(10, '0')} 00000 n \n`;
    });
    pdf += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
    return Buffer.from(pdf, 'binary');
};

const isPdfBufferValid = (buf) => {
    if (!Buffer.isBuffer(buf) || buf.length < 256) return false;
    const sample = buf.toString('latin1', 0, Math.min(buf.length, 4096));
    return sample.includes('%PDF-') && sample.includes('/Type /Page') && sample.includes('BT ') && sample.includes('ET');
};

const rebuildInvoicePdf = async (inv, companyId) => {
    const settings = await loadSettings(companyId);
    const [b] = await db.query('SELECT * FROM bookings WHERE id = ? AND company_id = ?', [inv.booking_id, companyId]);
    const buf = buildInvoicePdf(inv, b[0], settings);
    const pdfPath = inv.pdf_path || `${inv.invoice_number}.pdf`;
    const fpath = path.join(INVOICE_DIR, pdfPath);
    try { fs.writeFileSync(fpath, buf); } catch (e) {}
    if (!inv.pdf_path) {
        await db.query('UPDATE invoices SET pdf_path = ? WHERE id = ? AND company_id = ?', [pdfPath, inv.id, companyId]);
        inv.pdf_path = pdfPath;
    }
    return { buf, fname: pdfPath, fpath };
};

// ── auto-generate (called by payments controller) ───────────
const autoGenerateForBooking = async (bookingId, userId, companyId) => {
    const booking = await loadBooking(bookingId, companyId);
    if (!booking) throw new Error(`Booking ${bookingId} not found`);

    const [existing] = await db.query(
        'SELECT * FROM invoices WHERE booking_id = ? AND company_id = ? ORDER BY id DESC LIMIT 1',
        [bookingId, companyId]
    );
    if (existing[0]) return existing[0];

    const { getCompanyQuota } = require('../middleware/quota');
    const quota = await getCompanyQuota(companyId);
    if (quota && quota.currentCounts.invoices >= quota.maxInvoices) {
        throw new Error(`Invoice quota exceeded. You have reached the limit of ${quota.maxInvoices} invoices. Please upgrade your plan.`);
    }

    let quotation = null;
    if (booking.quotation_id) {
        const [q] = await db.query('SELECT * FROM quotations WHERE id = ? AND company_id = ?', [booking.quotation_id, companyId]);
        quotation = q[0];
    }
    const bookingForPdf = {
        ...booking,
        grand_total: Number(booking.total_amount || 0),
        package_type: quotation?.package_type,
        package_name: quotation?.package_type
            ? quotation.package_type.replace(/_/g, ' + ').toUpperCase()
            : 'Tour Package'
    };

    const settings = await loadSettings(companyId);
    const invoiceNumber = await generateInvoiceNumber(null, companyId);
    const total = Number(booking.total_amount || 0);
    const gstPct = Number(quotation?.gst_pct || 0);
    const subtotal = gstPct > 0 ? Math.round((total / (1 + gstPct / 100)) * 100) / 100 : total;
    const taxAmount = Math.max(0, total - subtotal);
    const cgstAmount = gstPct > 0 ? Math.round((taxAmount / 2) * 100) / 100 : 0;
    const sgstAmount = gstPct > 0 ? Math.round((taxAmount / 2) * 100) / 100 : 0;
    const igstAmount = 0; // default intra-state split; can be enhanced with customer state

    const buf = buildInvoicePdf(
        {
            invoice_number: invoiceNumber, subtotal, tax_amount: taxAmount, total,
            gst_pct: gstPct, cgst_amount: cgstAmount, sgst_amount: sgstAmount, igst_amount: igstAmount,
            hsn_sac: '9985', issued_at: new Date()
        },
        bookingForPdf,
        settings
    );
    const fname = `${invoiceNumber}.pdf`;
    const fpath = path.join(INVOICE_DIR, fname);
    fs.writeFileSync(fpath, buf);

    const [r] = await db.query(
        `INSERT INTO invoices
            (invoice_number, booking_id, quotation_id, subtotal, gst_pct, cgst_amount, sgst_amount, igst_amount,
             tax_amount, hsn_sac, total, pdf_path, pdf_generated_at, issued_by, notes, company_id)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [invoiceNumber, bookingId, booking.quotation_id || null,
         subtotal, gstPct, cgstAmount, sgstAmount, igstAmount,
         taxAmount, '9985', total, fname, new Date(), userId || null,
         'Auto-generated on first successful payment', companyId]
    );
    return { id: r.insertId, invoice_number: invoiceNumber, pdf_path: fname, total };
};

// ── helpers ────────────────────────────────────────────────
const loadSettings = async (companyId) => {
    const [rows] = await db.query('SELECT * FROM agency_settings WHERE company_id = ? LIMIT 1', [companyId]);
    return rows[0] || null;
};
const loadBooking = async (id, companyId) => {
    const [rows] = await db.query('SELECT * FROM bookings WHERE id = ? AND company_id = ?', [id, companyId]);
    return rows[0] || null;
};
const loadInvoice = async (id, companyId) => {
    const [rows] = await db.query(
        `SELECT i.*, b.booking_number, b.customer_name, b.customer_email,
                b.customer_phone, b.trip_start_date, b.trip_end_date,
                b.total_amount, b.amount_paid, b.destination_text,
                q.package_type
           FROM invoices i
           JOIN bookings b ON b.id = i.booking_id AND b.company_id = i.company_id
           LEFT JOIN quotations q ON q.id = b.quotation_id AND q.company_id = i.company_id
          WHERE i.id = ? AND i.company_id = ?`, [id, companyId]
    );
    const inv = rows[0];
    if (!inv) return null;
    inv.grand_total = Number(inv.total_amount || 0);
    inv.package_name = inv.package_type
        ? inv.package_type.replace(/_/g, ' + ').toUpperCase()
        : 'Tour Package';
    return inv;
};

// ── list ───────────────────────────────────────────────────
const listInvoices = async (req, res, next) => {
    try {
        const { booking_id, page = 1, limit = 20 } = req.query;
        const where = ['i.company_id = ?'];
        const params = [req.companyId];
        if (booking_id) { where.push('i.booking_id = ?'); params.push(booking_id); }
        const whereSql = `WHERE ${where.join(' AND ')}`;
        const lim = Math.max(1, Math.min(100, Number(limit)));
        const offset = (Math.max(1, Number(page)) - 1) * lim;
        const [rows] = await db.query(
            `SELECT i.id, i.invoice_number, i.booking_id, i.total, i.issued_at, i.pdf_path,
                    b.booking_number, b.customer_name
               FROM invoices i
               JOIN bookings b ON b.id = i.booking_id AND b.company_id = i.company_id
               ${whereSql}
              ORDER BY i.id DESC
              LIMIT ? OFFSET ?`,
            [...params, lim, offset]
        );
        const [count] = await db.query(
            `SELECT COUNT(*) AS total FROM invoices i ${whereSql}`, params
        );
        res.json({ items: rows, total: count[0].total, page: Number(page), limit: lim });
    } catch (err) { next(err); }
};

// ── detail ─────────────────────────────────────────────────
const getInvoice = async (req, res, next) => {
    try {
        const inv = await loadInvoice(req.params.id, req.companyId);
        if (!inv) return res.status(404).json({ error: 'Invoice not found' });
        res.json(inv);
    } catch (err) { next(err); }
};

// ── download PDF ───────────────────────────────────────────
const downloadInvoice = async (req, res, next) => {
    try {
        const inv = await loadInvoice(req.params.id, req.companyId);
        if (!inv) return res.status(404).json({ error: 'Invoice not found' });
        if (!inv.pdf_path) {
            const rebuilt = await rebuildInvoicePdf(inv, req.companyId);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `inline; filename="${rebuilt.fname}"`);
            return res.send(rebuilt.buf);
        }
        const fpath = path.join(INVOICE_DIR, inv.pdf_path);
        if (!fs.existsSync(fpath)) {
            const rebuilt = await rebuildInvoicePdf(inv, req.companyId);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `inline; filename="${rebuilt.fname}"`);
            return res.send(rebuilt.buf);
        }
        const fileBuf = fs.readFileSync(fpath);
        if (!isPdfBufferValid(fileBuf)) {
            const rebuilt = await rebuildInvoicePdf(inv, req.companyId);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `inline; filename="${rebuilt.fname}"`);
            return res.send(rebuilt.buf);
        }
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${inv.pdf_path}"`);
        fs.createReadStream(fpath).pipe(res);
    } catch (err) { next(err); }
};

// ── portal download ───────────────────────────────────────
const downloadPortalInvoice = async (req, res, next) => {
    try {
        const email = req.portal.email;
        const id = parseInt(req.params.id, 10);
        const [rows] = await db.query(
            `SELECT i.*, b.customer_email
               FROM invoices i
               JOIN bookings b ON b.id = i.booking_id AND b.company_id = i.company_id
              WHERE i.id = ? AND i.company_id = ?`,
            [id, req.companyId]
        );
        const inv = rows[0];
        if (!inv) return res.status(404).json({ error: 'Invoice not found' });
        if (inv.customer_email !== email) {
            return res.status(403).json({ error: 'Not your invoice' });
        }
        if (inv.pdf_path) {
            const fpath = path.join(INVOICE_DIR, inv.pdf_path);
            if (fs.existsSync(fpath)) {
                const fileBuf = fs.readFileSync(fpath);
                if (isPdfBufferValid(fileBuf)) {
                    res.setHeader('Content-Type', 'application/pdf');
                    res.setHeader('Content-Disposition', `inline; filename="${inv.pdf_path}"`);
                    return fs.createReadStream(fpath).pipe(res);
                }
            }
        }
        const rebuilt = await rebuildInvoicePdf(inv, req.companyId);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${rebuilt.fname}"`);
        return res.send(rebuilt.buf);
    } catch (err) { next(err); }
};

// ── list by booking ────────────────────────────────────────
const listByBooking = async (req, res, next) => {
    try {
        const [rows] = await db.query(
            `SELECT * FROM invoices WHERE booking_id = ? AND company_id = ? ORDER BY id DESC`,
            [req.params.id, req.companyId]
        );
        res.json(rows);
    } catch (err) { next(err); }
};

module.exports = {
    listInvoices, getInvoice, downloadInvoice, downloadPortalInvoice, listByBooking,
    autoGenerateForBooking
};
