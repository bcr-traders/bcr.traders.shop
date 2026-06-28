import Razorpay from 'razorpay'

function getRazorpay() {
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
  })
}

export async function createDeliveryPaymentLink(
  orderId: string,
  amount: number, // in ₹
): Promise<string> {
  const rz = getRazorpay()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const link = await (rz.paymentLink as any).create({
    amount: Math.round(amount * 100), // paise
    currency: 'INR',
    description: `BCR Traders Order #${orderId.slice(-8).toUpperCase()}`,
    reminder_enable: false,
    upi_link: true,
  })
  return link.short_url as string
}
