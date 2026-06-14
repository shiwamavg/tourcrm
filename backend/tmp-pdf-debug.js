const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, 'src/controllers/invoices.controller.js'), 'utf8');
const start = src.indexOf('const buildInvoicePdf = (inv, booking, settings) => {');
if (start < 0) {
  console.error('buildInvoicePdf not found');
  process.exit(1);
}
let depth = 0;
let endIndex = -1;
for (let i = start; i < src.length; ++i) {
  const ch = src[i];
  if (ch === '{') depth += 1;
  else if (ch === '}') {
    depth -= 1;
    if (depth === 0) {
      endIndex = i;
      break;
    }
  }
}
if (endIndex < 0) {
  console.error('function end not found');
  process.exit(1);
}
const fnText = src.slice(start, endIndex + 1);
const moduleText = fnText + '\nmodule.exports = { buildInvoicePdf };\n';
const vm = require('vm');
const module = { exports: {} };
const sandbox = { require, console, Buffer, process, Date, __dirname, __filename, path, module, exports: module.exports };
vm.createContext(sandbox);
vm.runInContext(moduleText, sandbox);
const buf = sandbox.module.exports.buildInvoicePdf(
  { invoice_number:'INV-2026-0001', subtotal:50000, tax_amount:9000, total:59000, issued_at:new Date() },
  { booking_number:'B001', customer_name:'Test Customer', customer_email:'test@example.com', customer_phone:'+919876543210', trip_start_date:'2026-07-01', trip_end_date:'2026-07-10', package_name:'DELUXE', subtotal:50000, tax_amount:9000, amount_paid:20000 },
  { agency_name:'ABC Tours', address:'123 Street', gstin:'GST123', phone:'+911234567890', bank_name:'State Bank', bank_account_no:'12345678901', bank_ifsc:'SBIN0001234' }
);
console.log('buf len', buf.length);
const s = buf.toString('latin1');
console.log('head', JSON.stringify(s.slice(0,160)));
console.log('streamIdx', s.indexOf('stream\n'));
console.log('endstreamIdx', s.indexOf('endstream'));
console.log('hasBT', s.includes('BT '), 'hasET', s.includes(' ET'));
console.log('hasCatalog', s.includes('/Type /Catalog'), 'hasPages', s.includes('/Type /Pages'));
console.log('contentsRef', s.indexOf('/Contents 4 0 R'));
fs.writeFileSync(path.join(__dirname, 'tmp-invoice.pdf'), buf);
console.log('wrote tmp-invoice.pdf');
