import {
  Body, Container, Head, Heading, Hr, Html, Img,
  Preview, Section, Text, Row, Column, Link,
} from '@react-email/components'
import type { OrderEmailData } from '../index'

type Props = OrderEmailData & { siteUrl: string }

const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`

export default function OrderConfirmedCustomer({
  orderNumber, items, address, subtotal, deliveryFee, discount, couponCode, total,
  createdAt, estimatedDelivery, customMessage, confirmedByName, siteUrl,
}: Props) {
  const date = new Date(createdAt).toLocaleString('en-IN', {
    day: '2-digit', month: 'long', year: 'numeric',
  })

  return (
    <Html lang="en">
      <Head />
      <Preview>✅ Your order #{orderNumber} is confirmed! {estimatedDelivery ? `Expected by ${estimatedDelivery}` : ''}</Preview>
      <Body style={body}>
        <Container style={container}>

          {/* Header */}
          <Section style={header}>
            <Heading style={headerTitle}>BCR TRADERS</Heading>
          </Section>

          {/* Hero */}
          <Section style={hero}>
            <Text style={heroIcon}>✅</Text>
            <Heading style={heroTitle}>Order Confirmed!</Heading>
            <Text style={heroText}>
              Great news, <strong>{address.name}</strong>! Your order has been confirmed and is being prepared.
            </Text>
            {estimatedDelivery && (
              <Text style={deliveryBadge}>
                🚚 Estimated Delivery: <strong>{estimatedDelivery}</strong>
              </Text>
            )}
          </Section>

          {/* Custom message from admin */}
          {customMessage && (
            <Section style={msgBox}>
              <Text style={msgLabel}>MESSAGE FROM BCR TRADERS</Text>
              <Text style={msgText}>&ldquo;{customMessage}&rdquo;</Text>
              {confirmedByName && (
                <Text style={msgBy}>— {confirmedByName}</Text>
              )}
            </Section>
          )}

          <Hr style={divider} />

          {/* Order details */}
          <Section style={section}>
            <Row>
              <Column style={metaCol}>
                <Text style={metaLabel}>ORDER #</Text>
                <Text style={metaValue}>#{orderNumber}</Text>
              </Column>
              <Column style={metaCol}>
                <Text style={metaLabel}>ORDER DATE</Text>
                <Text style={metaValue}>{date}</Text>
              </Column>
            </Row>
          </Section>

          <Hr style={divider} />

          {/* Status timeline */}
          <Section style={section}>
            <Heading style={sectionTitle}>Order Status</Heading>
            {[
              { label: 'Order Placed', done: true },
              { label: 'Confirmed ✓', done: true, active: true },
              { label: 'Packed & Ready', done: false },
              { label: 'Out for Delivery', done: false },
              { label: 'Delivered', done: false },
            ].map((step, i) => (
              <Row key={i} style={timelineRow}>
                <Column style={{ width: '28px', verticalAlign: 'middle' as const }}>
                  <div style={step.active ? dotActive : step.done ? dotDone : dotPending} />
                </Column>
                <Column>
                  <Text style={step.active ? stepLabelActive : step.done ? stepLabelDone : stepLabelPending}>
                    {step.label}
                  </Text>
                </Column>
              </Row>
            ))}
          </Section>

          <Hr style={divider} />

          {/* Items */}
          <Section style={section}>
            <Heading style={sectionTitle}>Order Summary</Heading>
            {items.map((item, i) => (
              <Row key={i} style={itemRow}>
                <Column style={{ width: '44px', paddingRight: '10px' }}>
                  {item.image
                    ? <Img src={item.image} alt={item.name} width={44} height={44} style={itemImg} />
                    : <div style={imgPlaceholder} />
                  }
                </Column>
                <Column>
                  <Text style={itemName}>{item.name}</Text>
                  <Text style={itemUnit}>{item.unit} × {item.quantity}</Text>
                </Column>
                <Column style={{ textAlign: 'right' as const }}>
                  <Text style={itemPrice}>{fmt(item.price * item.quantity)}</Text>
                </Column>
              </Row>
            ))}
            <Hr style={{ ...divider, marginTop: '12px' }} />
            <Row style={gTotal}>
              <Column><Text style={gLabel}>Total (COD)</Text></Column>
              <Column style={{ textAlign: 'right' as const }}><Text style={gValue}>{fmt(total)}</Text></Column>
            </Row>
          </Section>

          {/* Invoice note */}
          <Section style={invoiceNote}>
            <Text style={invoiceText}>
              📄 Invoice attached to this email (PDF)
            </Text>
          </Section>

          <Hr style={divider} />

          {/* Footer */}
          <Section style={footer}>
            <Link href={`${siteUrl}/orders`} style={trackLink}>Track Your Order →</Link>
            <Text style={footerText}>
              Questions? Reply to this email · BCR Traders, Brahmapur, Odisha
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

const body = { backgroundColor: '#f5f0e8', fontFamily: 'Helvetica, Arial, sans-serif', margin: '0', padding: '20px 0' }
const container = { maxWidth: '600px', margin: '0 auto', backgroundColor: '#ffffff', borderRadius: '16px', overflow: 'hidden' as const }
const header = { backgroundColor: '#26170c', padding: '22px 32px', textAlign: 'center' as const }
const headerTitle = { color: '#fdf9f1', fontSize: '24px', fontWeight: '700', margin: '0', letterSpacing: '2px' }
const hero = { padding: '32px 32px 20px', textAlign: 'center' as const }
const heroIcon = { fontSize: '52px', margin: '0 0 8px' }
const heroTitle = { color: '#16a34a', fontSize: '30px', fontWeight: '700', margin: '0 0 12px' }
const heroText = { color: '#3d2b1f', fontSize: '16px', margin: '0 0 16px' }
const deliveryBadge = { backgroundColor: '#dcfce7', color: '#166534', borderRadius: '8px', padding: '10px 20px', fontSize: '15px', display: 'inline-block' }
const msgBox = { backgroundColor: '#fdf9f1', border: '1px solid #c4a882', borderLeft: '4px solid #26170c', margin: '0 32px 8px', padding: '16px 20px', borderRadius: '4px' }
const msgLabel = { color: '#81756e', fontSize: '10px', letterSpacing: '1.5px', textTransform: 'uppercase' as const, margin: '0 0 8px' }
const msgText = { color: '#26170c', fontSize: '15px', fontStyle: 'italic', margin: '0 0 4px', lineHeight: '1.6' }
const msgBy = { color: '#81756e', fontSize: '13px', margin: '0' }
const divider = { borderColor: '#e5e1d9', margin: '0' }
const section = { padding: '24px 32px' }
const sectionTitle = { color: '#26170c', fontSize: '14px', fontWeight: '700', margin: '0 0 16px', textTransform: 'uppercase' as const, letterSpacing: '0.8px' }
const metaCol = { padding: '0 16px 0 0' }
const metaLabel = { color: '#81756e', fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase' as const, margin: '0 0 2px' }
const metaValue = { color: '#1c1c17', fontSize: '15px', fontWeight: '600', margin: '0' }
const timelineRow = { paddingBottom: '10px' }
const dotDone = { width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#d1fae5', border: '2px solid #16a34a' }
const dotActive = { width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#16a34a', border: '2px solid #16a34a' }
const dotPending = { width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#ffffff', border: '2px solid #d6d3d1' }
const stepLabelActive = { color: '#16a34a', fontSize: '14px', fontWeight: '700', margin: '0', paddingLeft: '10px' }
const stepLabelDone = { color: '#4f453f', fontSize: '14px', margin: '0', paddingLeft: '10px' }
const stepLabelPending = { color: '#d6d3d1', fontSize: '14px', margin: '0', paddingLeft: '10px' }
const itemRow = { marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid #f5f0e8' }
const itemImg = { borderRadius: '6px', objectFit: 'cover' as const }
const imgPlaceholder = { width: '44px', height: '44px', backgroundColor: '#f5f0e8', borderRadius: '6px' }
const itemName = { color: '#1c1c17', fontSize: '14px', fontWeight: '600', margin: '0 0 2px' }
const itemUnit = { color: '#81756e', fontSize: '12px', margin: '0' }
const itemPrice = { color: '#26170c', fontSize: '14px', fontWeight: '700', margin: '0' }
const gTotal = { marginTop: '8px' }
const gLabel = { color: '#26170c', fontSize: '16px', fontWeight: '700', margin: '0' }
const gValue = { color: '#26170c', fontSize: '16px', fontWeight: '700', margin: '0', textAlign: 'right' as const }
const invoiceNote = { backgroundColor: '#fdf9f1', padding: '14px 32px', textAlign: 'center' as const }
const invoiceText = { color: '#4f453f', fontSize: '13px', margin: '0' }
const footer = { backgroundColor: '#f5f0e8', padding: '24px 32px', textAlign: 'center' as const }
const trackLink = { color: '#26170c', fontSize: '15px', fontWeight: '700', textDecoration: 'underline' }
const footerText = { color: '#81756e', fontSize: '12px', margin: '16px 0 0' }
