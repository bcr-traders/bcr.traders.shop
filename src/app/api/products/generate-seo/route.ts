import Anthropic from '@anthropic-ai/sdk'
import { auth } from '@/lib/auth/server'
import { NextRequest, NextResponse } from 'next/server'
import type { AuthMetadata } from '@/types'

const client = new Anthropic()

export async function POST(req: NextRequest) {
  const { userId, sessionClaims } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const meta = sessionClaims?.publicMetadata as AuthMetadata | undefined
  if (meta?.role !== 'super_admin' && meta?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { name, description, category, price, unit } = await req.json() as {
    productId?: string
    name: string
    description?: string
    category?: string
    price?: number
    unit?: string
  }

  if (!name) return NextResponse.json({ error: 'Product name required' }, { status: 400 })

  const priceStr = price != null && unit ? `₹${price} per ${unit}` : price != null ? `₹${price}` : null

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 512,
    messages: [
      {
        role: 'user',
        content: `You are an SEO expert for BCR TRADERS, a B2B wholesale commodity distributor in Odisha, India. They sell edible oil, pulses, atta, spices, sugar, and packaged water to retailers in bulk.

Generate SEO metadata for this product listing:
- Product name: ${name}
- Category: ${category ?? 'General'}
- Price: ${priceStr ?? 'Not specified'}
- Description: ${description ? description.replace(/<[^>]*>/g, '').slice(0, 400) : 'N/A'}

Rules:
- Write for B2B buyers searching for wholesale prices in Odisha/India
- meta_title must be ≤ 60 characters and include the product name
- meta_description must be ≤ 160 characters and mention "wholesale" or "bulk" and include a call to action
- keywords: exactly 10 specific, high-intent wholesale keywords; no brand fluff

Return ONLY valid JSON, no markdown, no extra text:
{
  "meta_title": "string ≤ 60 chars",
  "meta_description": "string ≤ 160 chars",
  "keywords": ["10 keyword strings"]
}`,
      },
    ],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : '{}'
  const match = text.match(/\{[\s\S]*\}/)

  try {
    const json = JSON.parse(match?.[0] ?? '{}') as {
      meta_title?: string
      meta_description?: string
      keywords?: string[]
    }
    return NextResponse.json({
      meta_title: (json.meta_title ?? '').slice(0, 60),
      meta_description: (json.meta_description ?? '').slice(0, 160),
      keywords: Array.isArray(json.keywords) ? json.keywords.slice(0, 10) : [],
    })
  } catch {
    return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 })
  }
}
