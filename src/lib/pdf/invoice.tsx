import React from 'react'
import {
  Document, Page, Text, View, Image, StyleSheet, renderToBuffer,
} from '@react-pdf/renderer'
import type { OrderEmailData } from '@/lib/resend'
import { BCR_LOGO_PNG } from './logo'

// react-pdf's built-in Helvetica has no ₹ glyph (it renders as a blank box), so
// the PDF uses "Rs." for amounts — reliable across all viewers.
const fmt = (n: number) =>
  `Rs. ${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

// ── Seller (issuer) details ─────────────────────────────────────────────────
const SELLER = {
  name: 'BCR TRADERS',
  tagline: 'Wholesale Grocery Distributor',
  address: 'Brahmapur, Ganjam, Odisha - 760001',
  gstin: '21GBUPR9356D1Z3',
  phone: '+91 90400 11053',
  email: 'bcr.traders19@gmail.com',
}

const STATUS_LABEL: Record<string, string> = {
  placed: 'Placed',
  confirmed: 'Confirmed',
  packed: 'Packed',
  shipping: 'Out for Delivery',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  returned: 'Returned',
}

const styles = StyleSheet.create({
  page: {
    backgroundColor: '#ffffff',
    fontFamily: 'Helvetica',
    fontSize: 10,
    padding: 36,
    color: '#1c1c17',
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center' },
  logo: { width: 40, height: 48, marginRight: 12 },
  brandName: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: '#26170c', letterSpacing: 1 },
  brandSub: { fontSize: 8, color: '#81756e', marginTop: 2 },
  sellerLine: { fontSize: 8, color: '#4f453f', marginTop: 1.5 },
  gstin: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#26170c', marginTop: 3 },

  invoiceBox: { alignItems: 'flex-end' },
  invoiceLabel: {
    fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#ffffff',
    backgroundColor: '#26170c', padding: '4 10', borderRadius: 3,
    textTransform: 'uppercase', letterSpacing: 1,
  },
  invoiceMetaLabel: { fontSize: 8, color: '#81756e', textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 8 },
  invoiceMetaValue: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#26170c', marginTop: 1 },
  invoiceDate: { fontSize: 9, color: '#4f453f', marginTop: 6 },

  ruleThick: { borderBottom: '2 solid #26170c', marginBottom: 16 },

  // Bill-to / meta
  row: { flexDirection: 'row', marginBottom: 18 },
  col: { flex: 1 },
  label: { fontSize: 8, color: '#81756e', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 5 },
  addressText: { fontSize: 10, color: '#3d2b1f', lineHeight: 1.6 },
  nameText: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#26170c', marginBottom: 2 },
  buyerGstin: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#26170c', marginTop: 4 },

  // COD box
  paymentBox: {
    backgroundColor: '#fdf9f1',
    border: '1 solid #c4a882',
    borderRadius: 4,
    padding: '10 12',
    marginBottom: 18,
  },
  paymentText: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#26170c' },
  paymentSub: { fontSize: 8, color: '#81756e', marginTop: 2 },

  // Items table
  table: { marginBottom: 16 },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#26170c',
    padding: '7 8',
  },
  th: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#ffffff', textTransform: 'uppercase', letterSpacing: 0.5 },
  thSl: { width: 24 },
  thItem: { flex: 3 },
  thNum: { flex: 1, textAlign: 'center' },
  thPrice: { flex: 1.3, textAlign: 'right' },
  tableRow: {
    flexDirection: 'row',
    padding: '8 8',
    borderBottom: '1 solid #f0e9dc',
    alignItems: 'flex-start',
  },
  tableRowAlt: { backgroundColor: '#fbf7ef' },
  tdSl: { width: 24, fontSize: 9, color: '#81756e' },
  tdItem: { flex: 3, fontSize: 10, color: '#1c1c17' },
  tdUnit: { fontSize: 8, color: '#81756e', marginTop: 2 },
  tdNum: { flex: 1, fontSize: 10, color: '#1c1c17', textAlign: 'center' },
  tdPrice: { flex: 1.3, fontSize: 10, color: '#1c1c17', textAlign: 'right' },
  tdPriceBold: { flex: 1.3, fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#1c1c17', textAlign: 'right' },

  // Totals
  totalsContainer: { marginLeft: 'auto', width: 220 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  totalLabel: { fontSize: 10, color: '#4f453f' },
  totalValue: { fontSize: 10, color: '#1c1c17' },
  grandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#26170c',
    borderRadius: 3,
    padding: '7 10',
    marginTop: 6,
  },
  grandLabel: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: '#ffffff' },
  grandValue: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: '#ffffff' },

  // Footer
  footer: {
    borderTop: '1 solid #e5e1d9',
    paddingTop: 12,
    marginTop: 24,
  },
  footerThanks: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#26170c', textAlign: 'center', marginBottom: 6 },
  footerText: { fontSize: 8, color: '#81756e', textAlign: 'center', lineHeight: 1.5 },
  footerNote: { fontSize: 7, color: '#a99f95', textAlign: 'center', marginTop: 6 },
})

function InvoiceDocument({ data }: { data: OrderEmailData }) {
  const addr = data.address
  const discount = data.discount ?? 0
  const status = STATUS_LABEL[data.status ?? 'placed'] ?? 'Placed'
  const date = new Date(data.createdAt).toLocaleDateString('en-IN', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  return (
    <Document title={`BCR Invoice ${data.orderNumber}`} author="BCR Traders">
      <Page size="A4" style={styles.page}>

        {/* ── Header: logo + seller (left), invoice meta (right) ── */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <View style={styles.brandRow}>
              {/* eslint-disable-next-line jsx-a11y/alt-text */}
              <Image style={styles.logo} src={BCR_LOGO_PNG} />
              <View>
                <Text style={styles.brandName}>{SELLER.name}</Text>
                <Text style={styles.brandSub}>{SELLER.tagline}</Text>
              </View>
            </View>
            <Text style={styles.sellerLine}>{SELLER.address}</Text>
            <Text style={styles.sellerLine}>{SELLER.phone} · {SELLER.email}</Text>
            <Text style={styles.gstin}>GSTIN: {SELLER.gstin}</Text>
          </View>

          <View style={styles.invoiceBox}>
            <Text style={styles.invoiceLabel}>Tax Invoice</Text>
            <Text style={styles.invoiceMetaLabel}>Invoice No.</Text>
            <Text style={styles.invoiceMetaValue}>{data.orderNumber}</Text>
            <Text style={styles.invoiceDate}>Date: {date}</Text>
          </View>
        </View>

        <View style={styles.ruleThick} />

        {/* ── Bill To + Payment ── */}
        <View style={styles.row}>
          <View style={styles.col}>
            <Text style={styles.label}>Bill To</Text>
            {data.gstBusinessName && (
              <Text style={styles.nameText}>{data.gstBusinessName}</Text>
            )}
            <Text style={data.gstBusinessName ? styles.addressText : styles.nameText}>{addr.name}</Text>
            <Text style={styles.addressText}>{addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}</Text>
            <Text style={styles.addressText}>{addr.city}, {addr.state} — {addr.pincode}</Text>
            <Text style={styles.addressText}>{addr.phone}</Text>
            {data.gstin && (
              <Text style={styles.buyerGstin}>GSTIN: {data.gstin}</Text>
            )}
          </View>
          <View style={[styles.col, { alignItems: 'flex-end' }]}>
            <Text style={styles.label}>Payment Method</Text>
            <Text style={styles.addressText}>Cash on Delivery (COD)</Text>
            <Text style={[styles.label, { marginTop: 10 }]}>Order Status</Text>
            <Text style={styles.addressText}>{status}</Text>
          </View>
        </View>

        {/* ── COD notice ── */}
        <View style={styles.paymentBox}>
          <Text style={styles.paymentText}>Amount to collect on delivery: {fmt(data.total)}</Text>
          <Text style={styles.paymentSub}>Payable in Cash or UPI at the time of delivery.</Text>
        </View>

        {/* ── Items table ── */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, styles.thSl]}>#</Text>
            <Text style={[styles.th, styles.thItem]}>Item</Text>
            <Text style={[styles.th, styles.thNum]}>Qty</Text>
            <Text style={[styles.th, styles.thPrice]}>Unit Price</Text>
            <Text style={[styles.th, styles.thPrice]}>Amount</Text>
          </View>
          {data.items.map((item, i) => (
            <View key={i} style={[styles.tableRow, ...(i % 2 === 1 ? [styles.tableRowAlt] : [])]}>
              <Text style={styles.tdSl}>{i + 1}</Text>
              <View style={{ flex: 3 }}>
                <Text style={styles.tdItem}>{item.name}</Text>
                <Text style={styles.tdUnit}>{item.unit}</Text>
              </View>
              <Text style={styles.tdNum}>{item.quantity}</Text>
              <Text style={styles.tdPrice}>{fmt(item.price)}</Text>
              <Text style={styles.tdPriceBold}>{fmt(item.price * item.quantity)}</Text>
            </View>
          ))}
        </View>

        {/* ── Totals ── */}
        <View style={styles.totalsContainer}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>{fmt(data.subtotal)}</Text>
          </View>
          {discount > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>
                Discount{data.couponCode ? ` (${data.couponCode})` : ''}
              </Text>
              <Text style={[styles.totalValue, { color: '#16a34a' }]}>−{fmt(discount)}</Text>
            </View>
          )}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Delivery</Text>
            <Text style={styles.totalValue}>{data.deliveryFee === 0 ? 'FREE' : fmt(data.deliveryFee)}</Text>
          </View>
          <View style={styles.grandRow}>
            <Text style={styles.grandLabel}>Grand Total</Text>
            <Text style={styles.grandValue}>{fmt(data.total)}</Text>
          </View>
        </View>

        {/* ── Footer ── */}
        <View style={styles.footer}>
          <Text style={styles.footerThanks}>Thank you for your business!</Text>
          <Text style={styles.footerText}>
            {SELLER.name} · {SELLER.address} · GSTIN: {SELLER.gstin}
          </Text>
          <Text style={styles.footerText}>
            {SELLER.phone} · {SELLER.email}
          </Text>
          <Text style={styles.footerNote}>
            This is a computer-generated invoice and does not require a physical signature.
          </Text>
        </View>
      </Page>
    </Document>
  )
}

export async function generateInvoicePdfBase64(data: OrderEmailData): Promise<string> {
  const buffer = await renderToBuffer(<InvoiceDocument data={data} />)
  return Buffer.from(buffer).toString('base64')
}
