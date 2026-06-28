import React from 'react'
import {
  Document, Page, Text, View, StyleSheet, renderToBuffer,
} from '@react-pdf/renderer'
import type { OrderEmailData } from '@/lib/resend'

const fmt = (n: number) =>
  `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const styles = StyleSheet.create({
  page: {
    backgroundColor: '#ffffff',
    fontFamily: 'Helvetica',
    fontSize: 10,
    padding: 40,
    color: '#1c1c17',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 28,
    paddingBottom: 16,
    borderBottom: '2 solid #26170c',
  },
  brandName: { fontSize: 22, fontFamily: 'Helvetica-Bold', color: '#26170c', letterSpacing: 1 },
  brandSub: { fontSize: 9, color: '#81756e', marginTop: 2 },
  invoiceLabel: { fontSize: 9, color: '#81756e', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 3 },
  invoiceNumber: { fontSize: 15, fontFamily: 'Helvetica-Bold', color: '#26170c' },
  invoiceDate: { fontSize: 10, color: '#4f453f', marginTop: 4 },
  section: { marginBottom: 20 },
  label: { fontSize: 8, color: '#81756e', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 5 },
  addressText: { fontSize: 10, color: '#3d2b1f', lineHeight: 1.6 },
  row: { flexDirection: 'row', marginBottom: 16 },
  col: { flex: 1 },
  table: { marginBottom: 16 },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#fdf9f1',
    padding: '6 8',
    borderBottom: '1 solid #e5e1d9',
  },
  tableRow: {
    flexDirection: 'row',
    padding: '8 8',
    borderBottom: '1 solid #f5f0e8',
  },
  thItem: { flex: 3, fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#4f453f', textTransform: 'uppercase', letterSpacing: 0.5 },
  thNum: { flex: 1, fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#4f453f', textTransform: 'uppercase', textAlign: 'center', letterSpacing: 0.5 },
  thPrice: { flex: 1.2, fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#4f453f', textTransform: 'uppercase', textAlign: 'right', letterSpacing: 0.5 },
  tdItem: { flex: 3, fontSize: 10, color: '#1c1c17' },
  tdUnit: { fontSize: 8, color: '#81756e', marginTop: 2 },
  tdNum: { flex: 1, fontSize: 10, color: '#1c1c17', textAlign: 'center' },
  tdPrice: { flex: 1.2, fontSize: 10, color: '#1c1c17', textAlign: 'right' },
  tdPriceBold: { flex: 1.2, fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#1c1c17', textAlign: 'right' },
  totalsContainer: { marginLeft: 'auto', width: 200 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  totalLabel: { fontSize: 10, color: '#4f453f' },
  totalValue: { fontSize: 10, color: '#1c1c17' },
  grandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTop: '2 solid #26170c',
    paddingTop: 6,
    marginTop: 4,
  },
  grandLabel: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: '#26170c' },
  grandValue: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: '#26170c' },
  paymentBox: {
    backgroundColor: '#fdf9f1',
    border: '1 solid #c4a882',
    borderRadius: 4,
    padding: '10 12',
    marginBottom: 20,
  },
  paymentText: { fontSize: 10, color: '#26170c' },
  footer: {
    borderTop: '1 solid #e5e1d9',
    paddingTop: 12,
    marginTop: 20,
    textAlign: 'center',
    fontSize: 9,
    color: '#81756e',
  },
})

function InvoiceDocument({ data }: { data: OrderEmailData }) {
  const addr = data.address
  const discount = data.discount ?? 0
  const date = new Date(data.createdAt).toLocaleDateString('en-IN', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  return (
    <Document title={`BCR Invoice ${data.orderNumber}`} author="BCR Traders">
      <Page size="A4" style={styles.page}>

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.brandName}>BCR TRADERS</Text>
            <Text style={styles.brandSub}>Wholesale · Cuttack, Odisha</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.invoiceLabel}>Tax Invoice</Text>
            <Text style={styles.invoiceNumber}>#{data.orderNumber}</Text>
            <Text style={styles.invoiceDate}>{date}</Text>
          </View>
        </View>

        {/* Bill To + Payment */}
        <View style={styles.row}>
          <View style={styles.col}>
            <Text style={styles.label}>Bill To</Text>
            <Text style={styles.addressText}>{addr.name}</Text>
            <Text style={styles.addressText}>{addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}</Text>
            <Text style={styles.addressText}>{addr.city}, {addr.state} — {addr.pincode}</Text>
            <Text style={styles.addressText}>{addr.phone}</Text>
          </View>
          <View style={[styles.col, { alignItems: 'flex-end' }]}>
            <Text style={styles.label}>Payment Method</Text>
            <Text style={styles.addressText}>Cash on Delivery (COD)</Text>
            <Text style={[styles.label, { marginTop: 10 }]}>Status</Text>
            <Text style={styles.addressText}>{data.status ?? 'Placed'}</Text>
          </View>
        </View>

        {/* COD notice */}
        <View style={styles.paymentBox}>
          <Text style={styles.paymentText}>
            💰 Amount to collect on delivery: {fmt(data.total)} · Payment Method: Cash / UPI
          </Text>
        </View>

        {/* Items table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.thItem}>Item</Text>
            <Text style={styles.thNum}>Qty</Text>
            <Text style={styles.thPrice}>Unit Price</Text>
            <Text style={styles.thPrice}>Total</Text>
          </View>
          {data.items.map((item, i) => (
            <View key={i} style={styles.tableRow}>
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

        {/* Totals */}
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

        {/* Footer */}
        <Text style={styles.footer}>
          Thank you for your business! · BCR Traders · Cuttack, Odisha · support@bcrtraders.in
        </Text>
      </Page>
    </Document>
  )
}

export async function generateInvoicePdfBase64(data: OrderEmailData): Promise<string> {
  const buffer = await renderToBuffer(<InvoiceDocument data={data} />)
  return Buffer.from(buffer).toString('base64')
}
