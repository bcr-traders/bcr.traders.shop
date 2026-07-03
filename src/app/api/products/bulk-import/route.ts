/**
 * POST /api/products/bulk-import
 *
 * Accepts multipart/form-data with a "file" field (CSV). Supports two header
 * styles, aliased onto the same canonical fields:
 *
 *   Legacy:  name, category_slug, price, mrp, unit, stock_qty, description, sku
 *   Client catalogue: Full Product Name, Brand, Product Category,
 *     Size / Weight, Packaging Form, Pack Type, Units per Pack, Unit Type,
 *     Price per Pack, Price per Unit
 *
 * "Product Category" is matched against category name OR slug. "Price per
 * Unit" is always recomputed server-side from Price per Pack ÷ Units per
 * Pack when both are present (never trusts a stale spreadsheet formula) —
 * otherwise a plain `price`/`Price per Unit` column is used directly.
 *
 * Returns:
 *   { created, failed, errors: [{ row, reason }], error_csv: base64 }
 * The error_csv is a base64-encoded CSV of failed rows for the admin to download.
 */
import { auth } from '@/lib/auth/server'
import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import type { AuthMetadata } from '@/types'

const RowSchema = z.object({
  name:           z.string().min(1, 'name / Full Product Name required'),
  category_slug:  z.string().optional(),
  category_name:  z.string().optional(),
  price:          z.coerce.number().nonnegative('price must be ≥ 0').optional(),
  mrp:            z.coerce.number().nonnegative().optional(),
  unit:           z.string().min(1, 'unit / Size-Weight required'),
  stock_qty:      z.coerce.number().int().nonnegative().default(0),
  description:    z.string().optional(),
  sku:            z.string().optional(),
  brand:          z.string().optional(),
  packaging_form: z.string().optional(),
  pack_type:      z.string().optional(),
  units_per_pack: z.coerce.number().int().positive().optional(),
  unit_type:      z.string().optional(),
  price_per_pack: z.coerce.number().nonnegative().optional(),
}).refine((d) => !!(d.category_slug || d.category_name), {
  message: 'category_slug or Product Category is required',
}).refine((d) => d.price !== undefined || (d.price_per_pack !== undefined && d.units_per_pack !== undefined), {
  message: 'price / Price per Unit, or Price per Pack + Units per Pack, is required',
})

// Normalizes a raw CSV header into a canonical field key, e.g.
// "Size / Weight" -> "size_weight" -> "unit"
const HEADER_ALIASES: Record<string, string> = {
  name: 'name',
  full_product_name: 'name',
  product_name: 'name',
  brand: 'brand',
  category: 'category_name',
  category_name: 'category_name',
  product_category: 'category_name',
  category_slug: 'category_slug',
  unit: 'unit',
  size: 'unit',
  weight: 'unit',
  size_weight: 'unit',
  packaging_form: 'packaging_form',
  pack_type: 'pack_type',
  units_per_pack: 'units_per_pack',
  unit_type: 'unit_type',
  price: 'price',
  selling_price: 'price',
  price_per_unit: 'price',
  price_per_pack: 'price_per_pack',
  mrp: 'mrp',
  stock_qty: 'stock_qty',
  stock: 'stock_qty',
  stock_quantity: 'stock_qty',
  description: 'description',
  sku: 'sku',
}

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
}

// Strips currency symbols/commas so "₹1,385" / "1,385" parse as numbers.
function cleanNumeric(v: string): string {
  return v.replace(/[₹,\s]/g, '')
}

const NUMERIC_FIELDS = new Set(['price', 'mrp', 'stock_qty', 'units_per_pack', 'price_per_pack'])

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(Boolean)
  if (lines.length < 2) return []
  const rawHeaders = lines[0].split(',').map((h) => h.trim())
  const headers = rawHeaders.map((h) => HEADER_ALIASES[normalizeHeader(h)] ?? normalizeHeader(h))
  return lines.slice(1).map((line) => {
    const values = line.split(',').map((v) => v.trim())
    const row: Record<string, string> = {}
    headers.forEach((h, i) => {
      const raw = values[i] ?? ''
      row[h] = NUMERIC_FIELDS.has(h) ? cleanNumeric(raw) : raw
    })
    return row
  })
}

function toCSV(rows: Array<Record<string, string>>): string {
  if (rows.length === 0) return ''
  const headers = Object.keys(rows[0])
  return [
    headers.join(','),
    ...rows.map((r) => headers.map((h) => `"${(r[h] ?? '').replace(/"/g, '""')}"`).join(',')),
  ].join('\n')
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export async function POST(req: NextRequest) {
  const { userId, sessionClaims } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const meta = sessionClaims?.publicMetadata as AuthMetadata | undefined
  if (meta?.role !== 'super_admin' && meta?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let csvText: string
  try {
    const form = await req.formData()
    const file = form.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    csvText = await file.text()
  } catch {
    return NextResponse.json({ error: 'Failed to parse form data' }, { status: 400 })
  }

  const rawRows = parseCSV(csvText)
  if (rawRows.length === 0) {
    return NextResponse.json({ error: 'CSV is empty or has no data rows' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Cache category slug/name → id (case-insensitive name match)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: categories } = await (supabase as any).from('categories').select('id, slug, name')
  const slugMap: Record<string, string> = {}
  const nameMap: Record<string, string> = {}
  for (const c of (categories ?? []) as { id: string; slug: string; name: string }[]) {
    slugMap[c.slug] = c.id
    nameMap[c.name.trim().toLowerCase()] = c.id
  }

  let created = 0
  const errors: Array<{ row: number; reason: string; data: Record<string, string> }> = []

  for (let i = 0; i < rawRows.length; i++) {
    const raw = rawRows[i]
    const rowNum = i + 2 // row 1 = header

    const parsed = RowSchema.safeParse(raw)
    if (!parsed.success) {
      errors.push({ row: rowNum, reason: parsed.error.issues.map((e) => e.message).join('; '), data: raw })
      continue
    }

    const row = parsed.data
    const categoryId = row.category_slug
      ? slugMap[row.category_slug]
      : nameMap[(row.category_name ?? '').trim().toLowerCase()]

    if (!categoryId) {
      errors.push({
        row: rowNum,
        reason: `Unknown category: "${row.category_slug ?? row.category_name}"`,
        data: raw,
      })
      continue
    }

    // Price per Unit is always derived from Price per Pack ÷ Units per Pack
    // when both are given — never trusts a stale spreadsheet formula.
    const price = row.price_per_pack !== undefined && row.units_per_pack
      ? Math.round((row.price_per_pack / row.units_per_pack) * 100) / 100
      : row.price!

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: insertError } = await (supabase as any).from('products').insert({
      name:            row.name,
      slug:            slugify(row.name),
      category_id:     categoryId,
      price,
      mrp:             row.mrp ?? null,
      unit:            row.unit,
      stock_qty:       row.stock_qty,
      description:     row.description ?? null,
      sku:             row.sku ?? null,
      brand:           row.brand ?? null,
      packaging_form:  row.packaging_form ?? null,
      pack_type:       row.pack_type ?? null,
      units_per_pack:  row.units_per_pack ?? null,
      unit_type:       row.unit_type ?? null,
      price_per_pack:  row.price_per_pack ?? null,
      is_active:       true,
      is_featured:     false,
    })

    if (insertError) {
      errors.push({ row: rowNum, reason: insertError.message, data: raw })
    } else {
      created++
    }
  }

  const errorCsvRows = errors.map((e) => ({ row: String(e.row), error: e.reason, ...e.data }))
  const errorCsvB64 = Buffer.from(toCSV(errorCsvRows)).toString('base64')

  return NextResponse.json({
    created,
    failed:    errors.length,
    errors:    errors.map(({ row, reason }) => ({ row, reason })),
    error_csv: errorCsvB64,
  })
}
