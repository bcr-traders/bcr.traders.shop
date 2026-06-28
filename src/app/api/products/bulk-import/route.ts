/**
 * POST /api/products/bulk-import
 *
 * Accepts multipart/form-data with a "file" field (CSV).
 * CSV columns: name, category_slug, price, mrp, unit, stock_qty, description, sku
 *
 * Returns:
 *   { created, failed, errors: [{ row, reason }], error_csv: base64 }
 * The error_csv is a base64-encoded CSV of failed rows for the admin to download.
 */
import { auth } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import type { ClerkPublicMetadata } from '@/types'

const RowSchema = z.object({
  name:          z.string().min(1, 'name required'),
  category_slug: z.string().min(1, 'category_slug required'),
  price:         z.coerce.number().nonnegative('price must be ≥ 0'),
  mrp:           z.coerce.number().nonnegative().optional(),
  unit:          z.string().min(1, 'unit required'),
  stock_qty:     z.coerce.number().int().nonnegative().default(0),
  description:   z.string().optional(),
  sku:           z.string().optional(),
})

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(Boolean)
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase())
  return lines.slice(1).map((line) => {
    const values = line.split(',').map((v) => v.trim())
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? '']))
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

  const meta = sessionClaims?.publicMetadata as ClerkPublicMetadata | undefined
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

  // Cache category slug → id
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: categories } = await (supabase as any).from('categories').select('id, slug')
  const catMap: Record<string, string> = {}
  for (const c of (categories ?? []) as { id: string; slug: string }[]) {
    catMap[c.slug] = c.id
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
    const categoryId = catMap[row.category_slug]
    if (!categoryId) {
      errors.push({ row: rowNum, reason: `Unknown category_slug: "${row.category_slug}"`, data: raw })
      continue
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: insertError } = await (supabase as any).from('products').insert({
      name:        row.name,
      slug:        slugify(row.name),
      category_id: categoryId,
      price:       row.price,
      mrp:         row.mrp ?? null,
      unit:        row.unit,
      stock_qty:   row.stock_qty,
      description: row.description ?? null,
      sku:         row.sku ?? null,
      is_active:   true,
      is_featured: false,
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
