import type { Metadata } from 'next'
import CouponForm from '../CouponForm'

export const metadata: Metadata = { title: 'New Coupon | BCR Admin' }

export default function NewCouponPage() {
  return <CouponForm />
}
