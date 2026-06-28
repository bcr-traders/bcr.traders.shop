import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency = 'INR'): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function generateOrderNumber(orderId: string): string {
  return `BCR-${orderId.slice(0, 8).toUpperCase()}`
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function getDiscountPercent(price: number, mrp: number): number {
  if (!mrp || mrp <= price) return 0
  return Math.round((1 - price / mrp) * 100)
}

export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10) return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`
  }
  return phone
}

const CAT_CODES: Record<string, string> = {
  'edible-oil': 'OIL',
  'pulses-dal': 'PUL',
  'atta-flour': 'ATT',
  'spices-masala': 'SPI',
  'sugar-jaggery': 'SUG',
  'packaged-water': 'WAT',
}

export function generateSKU(categorySlug: string, sequence: number): string {
  const catCode = CAT_CODES[categorySlug] ?? 'GEN'
  const year = new Date().getFullYear()
  const seq = sequence.toString().padStart(4, '0')
  return `BCR-${catCode}-${year}-${seq}`
}
