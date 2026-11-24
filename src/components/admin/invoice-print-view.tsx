'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Printer, Download, ArrowLeft, FileText, Receipt } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface PrintableOrderData {
  id: string;
  orderNumber: string;
  createdAt: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  shippingAddressLine: string;
  shippingArea?: string | null;
  shippingCity: string;
  shippingPostalCode?: string | null;
  subtotal: number;
  discountAmount: number;
  shippingCharge: number;
  grandTotal: number;
  couponCode?: string | null;
  paymentMethod: string;
  paymentStatus: string;
  status: string;
  customerNotes?: string | null;
  trackingNumber?: string | null;
  courierProvider?: string | null;
  items: Array<{
    id: string;
    productName: string;
    variantName?: string | null;
    sku: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
}

export interface StoreInvoiceSettings {
  storeName: string;
  tagline: string;
  address: string;
  contactPhone: string;
  contactEmail: string;
  invoiceHeaderNote: string;
  invoiceFooterNote: string;
  invoiceTerms: string;
}

export function InvoicePrintView({
  orders,
  store,
  initialFormat = 'a4',
  backHref = '/admin/orders',
}: {
  orders: PrintableOrderData[];
  store: StoreInvoiceSettings;
  initialFormat?: 'a4' | '80mm';
  backHref?: string;
}) {
  const [format, setFormat] = useState<'a4' | '80mm'>(initialFormat);

  const handleBrowserPrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: format === '80mm' ? [80, 200] : 'a4',
    });

    orders.forEach((order, index) => {
      if (index > 0) {
        doc.addPage();
      }

      if (format === '80mm') {
        let y = 10;
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(store.storeName, 40, y, { align: 'center' });
        y += 5;
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        doc.text(store.contactPhone, 40, y, { align: 'center' });
        y += 5;
        doc.text(`Order: ${order.orderNumber}`, 5, y);
        y += 4;
        doc.text(`Date: ${formatDate(order.createdAt, true)}`, 5, y);
        y += 4;
        doc.text(`Customer: ${order.customerName}`, 5, y);
        y += 4;
        doc.text(`Phone: ${order.customerPhone}`, 5, y);
        y += 4;
        doc.text(`City: ${order.shippingCity}`, 5, y);
        y += 5;
        doc.line(5, y, 75, y);
        y += 4;

        order.items.forEach((it) => {
          doc.setFont('helvetica', 'bold');
          doc.text(it.productName.slice(0, 28), 5, y);
          y += 3.5;
          doc.setFont('helvetica', 'normal');
          doc.text(
            `${it.sku}  ${it.quantity} x ${it.unitPrice.toFixed(0)} = BDT ${it.totalPrice.toFixed(0)}`,
            5,
            y
          );
          y += 4.5;
        });

        doc.line(5, y, 75, y);
        y += 4;
        doc.text(`Subtotal: BDT ${order.subtotal.toFixed(2)}`, 5, y);
        y += 4;
        if (order.discountAmount > 0) {
          doc.text(`Discount: -BDT ${order.discountAmount.toFixed(2)}`, 5, y);
          y += 4;
        }
        doc.text(`Delivery: BDT ${order.shippingCharge.toFixed(2)}`, 5, y);
        y += 4.5;
        doc.setFont('helvetica', 'bold');
        doc.text(`GRAND TOTAL: BDT ${order.grandTotal.toFixed(2)}`, 5, y);
        y += 4.5;
        doc.setFont('helvetica', 'normal');
        doc.text(`Payment: ${order.paymentMethod} (${order.paymentStatus})`, 5, y);
      } else {
        // A4 Professional Layout
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(47, 65, 86);
        doc.text(store.storeName, 15, 20);

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(82, 96, 109);
        doc.text(store.tagline, 15, 26);
        doc.text(store.address, 15, 31);
        doc.text(`${store.contactPhone} | ${store.contactEmail}`, 15, 36);

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(86, 124, 141);
        doc.text('INVOICE / ORDER MEMO', 195, 20, { align: 'right' });

        doc.setFontSize(9.5);
        doc.setTextColor(31, 41, 51);
        doc.text(`Invoice No: ${order.orderNumber}`, 195, 27, { align: 'right' });
        doc.text(`Order Date: ${formatDate(order.createdAt, true)}`, 195, 32, {
          align: 'right',
        });
        doc.text(`Payment: ${order.paymentMethod} (${order.paymentStatus})`, 195, 37, {
          align: 'right',
        });

        doc.setDrawColor(232, 224, 217);
        doc.line(15, 42, 195, 42);

        // Recipient Info
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('BILL & SHIP TO:', 15, 50);
        doc.setFont('helvetica', 'normal');
        doc.text(order.customerName, 15, 55);
        doc.text(`Phone: ${order.customerPhone}`, 15, 60);
        doc.text(
          `Address: ${order.shippingAddressLine}, ${order.shippingCity}`,
          15,
          65
        );
        if (order.trackingNumber) {
          doc.text(
            `Courier: ${order.courierProvider || 'INTERNAL'} | Tracking: ${
              order.trackingNumber
            }`,
            15,
            70
          );
        }

        autoTable(doc, {
          startY: 76,
          head: [['#', 'Product Description', 'SKU', 'Qty', 'Unit Price (BDT)', 'Total (BDT)']],
          body: order.items.map((it, idx) => [
            idx + 1,
            `${it.productName}${it.variantName ? ` (${it.variantName})` : ''}`,
            it.sku,
            it.quantity,
            it.unitPrice.toFixed(2),
            it.totalPrice.toFixed(2),
          ]),
          headStyles: {
            fillColor: [86, 124, 141],
            textColor: [255, 255, 255],
            fontSize: 9,
          },
          bodyStyles: {
            fontSize: 8.5,
            textColor: [31, 41, 51],
          },
          alternateRowStyles: {
            fillColor: [245, 241, 238],
          },
        });

        const finalY =
          (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable
            ?.finalY ?? 130;

        doc.setFontSize(9.5);
        doc.text(`Subtotal:`, 140, finalY + 10);
        doc.text(`BDT ${order.subtotal.toFixed(2)}`, 195, finalY + 10, { align: 'right' });

        doc.text(`Discount:`, 140, finalY + 16);
        doc.text(`-BDT ${order.discountAmount.toFixed(2)}`, 195, finalY + 16, {
          align: 'right',
        });

        doc.text(`Delivery Charge:`, 140, finalY + 22);
        doc.text(`BDT ${order.shippingCharge.toFixed(2)}`, 195, finalY + 22, {
          align: 'right',
        });

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text(`Grand Total:`, 140, finalY + 30);
        doc.text(`BDT ${order.grandTotal.toFixed(2)}`, 195, finalY + 30, {
          align: 'right',
        });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(82, 96, 109);
        doc.text(`Terms: ${store.invoiceTerms}`, 15, finalY + 46);
        doc.text(store.invoiceFooterNote, 15, finalY + 52);
      }
    });

    const filename =
      orders.length === 1
        ? `Invoice-${orders[0].orderNumber}-${format}.pdf`
        : `Maison-Beige-Bulk-Memos-${orders.length}-${format}.pdf`;

    doc.save(filename);
  };

  return (
    <div className="space-y-6">
      {/* Control Bar (Hidden when printing) */}
      <div className="no-print rounded-2xl border border-[#E8E0D9] bg-white p-4 sm:p-5 shadow-luxury flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#E8E0D9] bg-[#F5F1EE] px-3.5 py-2 text-xs font-semibold text-[#2F4156] hover:border-[#567C8D] shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back</span>
          </Link>
          <div className="min-w-0">
            <h1 className="text-sm sm:text-base font-bold text-[#2F4156]">
              Invoice &amp; Order Memo Studio ({orders.length}{' '}
              {orders.length === 1 ? 'Order' : 'Orders'})
            </h1>
            <p className="text-xs text-[#52606D]">
              Supports A4 Official Tax Invoice, 80mm POS Thermal Receipt &amp; Direct PDF Download (English &amp; বাংলা)
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Format Switcher */}
          <div className="inline-flex rounded-xl border border-[#E8E0D9] bg-[#F5F1EE] p-1">
            <button
              type="button"
              onClick={() => setFormat('a4')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                format === 'a4'
                  ? 'bg-[#567C8D] text-white shadow-sm'
                  : 'text-[#2F4156] hover:text-[#567C8D]'
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              <span>A4 Invoice</span>
            </button>
            <button
              type="button"
              onClick={() => setFormat('80mm')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                format === '80mm'
                  ? 'bg-[#567C8D] text-white shadow-sm'
                  : 'text-[#2F4156] hover:text-[#567C8D]'
              }`}
            >
              <Receipt className="h-3.5 w-3.5" />
              <span>80mm Thermal Receipt</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleDownloadPdf}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#567C8D] bg-[#C8D9E6]/60 px-4 py-2 text-xs font-semibold text-[#2F4156] hover:bg-[#C8D9E6]"
          >
            <Download className="h-4 w-4 text-[#567C8D]" />
            <span>Download PDF</span>
          </button>

          <button
            type="button"
            onClick={handleBrowserPrint}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#567C8D] px-5 py-2 text-xs font-semibold text-white hover:bg-[#486878] shadow-sm"
          >
            <Printer className="h-4 w-4" />
            <span>Print Now</span>
          </button>
        </div>
      </div>

      {/* Printable Document Area */}
      <div className="print-container space-y-8">
        {orders.map((order, idx) =>
          format === 'a4' ? (
            /* A4 PROFESSIONAL INVOICE LAYOUT */
            <div
              key={order.id}
              className={`print-a4 mx-auto max-w-4xl rounded-2xl border border-[#E8E0D9] bg-white p-5 sm:p-12 shadow-luxury ${
                idx < orders.length - 1 ? 'page-break' : ''
              }`}
            >
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 border-b-2 border-[#E8E0D9] pb-6">
                <div>
                  <div className="inline-flex items-center gap-2">
                    <span className="font-serif text-2xl sm:text-3xl font-bold tracking-[0.18em] text-[#2F4156]">
                      {store.storeName}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-[#567C8D] uppercase tracking-widest mt-1">
                    {store.tagline} • মেইসন বেইজ অ্যাটেলিয়ার
                  </p>
                  <p className="text-xs text-[#52606D] mt-2">{store.address}</p>
                  <p className="text-xs text-[#52606D]">
                    Phone: {store.contactPhone} • Email: {store.contactEmail}
                  </p>
                </div>

                <div className="sm:text-right space-y-1">
                  <span className="inline-block rounded-lg bg-[#F5F1EE] border border-[#E8E0D9] px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#567C8D]">
                    {store.invoiceHeaderNote}
                  </span>
                  <p className="text-base font-mono font-bold text-[#2F4156] pt-1">
                    Invoice #{order.orderNumber}
                  </p>
                  <p className="text-xs text-[#52606D]">
                    Date: {formatDate(order.createdAt, true)}
                  </p>
                  <p className="text-xs font-semibold text-[#2F4156]">
                    Order Status: {order.status}
                  </p>
                </div>
              </div>

              {/* Customer & Shipping Information */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-6 border-b border-[#E8E0D9] text-xs">
                <div className="rounded-xl bg-[#F5F1EE]/70 p-4 border border-[#E8E0D9]">
                  <p className="font-bold uppercase tracking-wider text-[#567C8D] mb-1.5">
                    Billed &amp; Delivered To (প্রাপকের বিবরণ)
                  </p>
                  <p className="text-sm font-bold text-[#2F4156]">{order.customerName}</p>
                  <p className="text-[#1F2933] font-medium mt-0.5">
                    Phone: {order.customerPhone}
                  </p>
                  {order.customerEmail && (
                    <p className="text-[#52606D]">Email: {order.customerEmail}</p>
                  )}
                  <p className="text-[#1F2933] mt-1.5 leading-relaxed">
                    {order.shippingAddressLine}
                    {order.shippingArea ? `, ${order.shippingArea}` : ''},{' '}
                    {order.shippingCity}{' '}
                    {order.shippingPostalCode ? `- ${order.shippingPostalCode}` : ''}
                  </p>
                </div>

                <div className="rounded-xl bg-[#F5F1EE]/70 p-4 border border-[#E8E0D9] space-y-1.5">
                  <p className="font-bold uppercase tracking-wider text-[#567C8D] mb-1.5">
                    Payment &amp; Logistics Details
                  </p>
                  <div className="flex justify-between gap-3">
                    <span className="text-[#52606D] shrink-0">Payment Method:</span>
                    <span className="font-semibold text-[#2F4156] text-right">
                      {order.paymentMethod}
                    </span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-[#52606D] shrink-0">Payment Status:</span>
                    <span className="font-bold text-[#567C8D] text-right">{order.paymentStatus}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-[#52606D] shrink-0">Courier Service:</span>
                    <span className="font-semibold text-[#2F4156] text-right">
                      {order.courierProvider || 'INTERNAL_DELIVERY'}
                    </span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-[#52606D] shrink-0">Tracking / Consignment:</span>
                    <span className="font-mono font-bold text-[#2F4156] text-right break-all">
                      {order.trackingNumber || 'Pending Assignment'}
                    </span>
                  </div>
                  {order.customerNotes && (
                    <p className="text-[11px] text-[#52606D] pt-1 border-t border-[#E8E0D9]">
                      Note: {order.customerNotes}
                    </p>
                  )}
                </div>
              </div>

              {/* Product Table */}
              <div className="py-6 overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b-2 border-[#E8E0D9] bg-[#F5F1EE] text-[#2F4156]">
                      <th className="py-3 px-3 font-bold">#</th>
                      <th className="py-3 px-3 font-bold">Item Description (পণ্যের নাম)</th>
                      <th className="py-3 px-3 font-bold">SKU</th>
                      <th className="py-3 px-3 font-bold text-center">Qty</th>
                      <th className="py-3 px-3 font-bold text-right">Unit Price</th>
                      <th className="py-3 px-3 font-bold text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8E0D9]">
                    {order.items.map((item, i) => (
                      <tr key={item.id}>
                        <td className="py-3 px-3 text-[#52606D]">{i + 1}</td>
                        <td className="py-3 px-3">
                          <p className="font-semibold text-[#2F4156]">{item.productName}</p>
                          {item.variantName && (
                            <p className="text-[11px] text-[#52606D]">
                              Variant: {item.variantName}
                            </p>
                          )}
                        </td>
                        <td className="py-3 px-3 font-mono text-[#52606D]">{item.sku}</td>
                        <td className="py-3 px-3 text-center font-semibold text-[#2F4156]">
                          {item.quantity}
                        </td>
                        <td className="py-3 px-3 text-right text-[#2F4156]">
                          {formatCurrency(item.unitPrice)}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-[#2F4156]">
                          {formatCurrency(item.totalPrice)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals & Terms */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 pt-4 border-t-2 border-[#E8E0D9]">
                <div className="sm:col-span-7 space-y-2 text-xs text-[#52606D]">
                  <p className="font-semibold text-[#2F4156]">
                    Terms &amp; Exchange Policy (শর্তাবলী):
                  </p>
                  <p className="leading-relaxed">{store.invoiceTerms}</p>
                  <p className="text-[11px] italic text-[#567C8D] pt-2">
                    {store.invoiceFooterNote} • ধন্যবাদান্তে মেইসন বেইজ
                  </p>
                </div>

                <div className="sm:col-span-5 space-y-2 text-xs rounded-xl bg-[#F5F1EE] p-4 border border-[#E8E0D9]">
                  <div className="flex justify-between">
                    <span className="text-[#52606D]">Subtotal:</span>
                    <span className="font-semibold text-[#2F4156]">
                      {formatCurrency(order.subtotal)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#52606D]">
                      Discount {order.couponCode ? `(${order.couponCode})` : ''}:
                    </span>
                    <span className="font-semibold text-emerald-700">
                      -{formatCurrency(order.discountAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#52606D]">Delivery Charge:</span>
                    <span className="font-semibold text-[#2F4156]">
                      {formatCurrency(order.shippingCharge)}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-[#E8E0D9] pt-2.5 text-sm font-bold text-[#2F4156]">
                    <span>Grand Total (সর্বমোট):</span>
                    <span>{formatCurrency(order.grandTotal)}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* 80MM THERMAL POS RECEIPT LAYOUT */
            <div
              key={order.id}
              className={`print-80mm mx-auto w-[310px] rounded-xl border border-[#E8E0D9] bg-white p-4 shadow-luxury font-mono text-xs text-black ${
                idx < orders.length - 1 ? 'page-break' : ''
              }`}
            >
              <div className="text-center border-b border-dashed border-gray-400 pb-3">
                <p className="text-base font-bold tracking-widest">{store.storeName}</p>
                <p className="text-[10px]">{store.address}</p>
                <p className="text-[10px]">Tel: {store.contactPhone}</p>
                <p className="text-[10px] font-semibold mt-1">
                  ORDER MEMO / ক্যাশ মেমো
                </p>
              </div>

              <div className="py-2.5 border-b border-dashed border-gray-400 space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span>Order:</span>
                  <span className="font-bold">{order.orderNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span>Date:</span>
                  <span>{formatDate(order.createdAt, true)}</span>
                </div>
                <div>
                  <span>Customer: </span>
                  <span className="font-bold">{order.customerName}</span>
                </div>
                <div>
                  <span>Phone: </span>
                  <span className="font-bold">{order.customerPhone}</span>
                </div>
                <div>
                  <span>Address: </span>
                  <span>
                    {order.shippingAddressLine}, {order.shippingCity}
                  </span>
                </div>
                {order.trackingNumber && (
                  <div>
                    <span>Track: </span>
                    <span className="font-bold">{order.trackingNumber}</span>
                  </div>
                )}
              </div>

              <div className="py-2.5 border-b border-dashed border-gray-400 space-y-2 text-[11px]">
                <div className="flex justify-between font-bold">
                  <span>ITEM / SKU</span>
                  <span>QTY × PRICE</span>
                </div>
                {order.items.map((item) => (
                  <div key={item.id}>
                    <p className="font-semibold leading-tight">{item.productName}</p>
                    <div className="flex justify-between text-[10px]">
                      <span>{item.sku}</span>
                      <span>
                        {item.quantity} × {formatCurrency(item.unitPrice)} ={' '}
                        <strong>{formatCurrency(item.totalPrice)}</strong>
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="py-2.5 border-b border-dashed border-gray-400 space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(order.subtotal)}</span>
                </div>
                {order.discountAmount > 0 && (
                  <div className="flex justify-between">
                    <span>Discount:</span>
                    <span>-{formatCurrency(order.discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Delivery:</span>
                  <span>{formatCurrency(order.shippingCharge)}</span>
                </div>
                <div className="flex justify-between text-xs font-bold pt-1 border-t border-dotted border-gray-300">
                  <span>GRAND TOTAL:</span>
                  <span>{formatCurrency(order.grandTotal)}</span>
                </div>
                <div className="flex justify-between text-[10px] pt-1">
                  <span>Payment:</span>
                  <span>
                    {order.paymentMethod} ({order.paymentStatus})
                  </span>
                </div>
              </div>

              <div className="pt-3 text-center text-[10px] space-y-1">
                <p className="font-semibold">Thank you for shopping with {store.storeName}!</p>
                <p>ধন্যবাদ • ৭ দিনের মধ্যে এক্সচেঞ্জ প্রযোজ্য</p>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
