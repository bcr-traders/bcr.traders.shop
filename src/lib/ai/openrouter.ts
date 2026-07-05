/**
 * Thin server-side OpenRouter client for admin content generation.
 *
 * OpenRouter is OpenAI-compatible. The API key + model live in env (.env.local
 * locally, project env vars in prod) and must NEVER reach the browser — every
 * caller here is a server route handler.
 */

const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions'
const DEFAULT_MODEL = 'nvidia/nemotron-3-ultra-550b-a55b:free'

export function isAIConfigured(): boolean {
  return !!process.env.OPENROUTER_API_KEY
}

interface ChatOpts {
  system: string
  user: string
  maxTokens?: number
  temperature?: number
}

/** Raw chat call — returns the model's text content (reasoning tags stripped). */
export async function aiChat({ system, user, maxTokens = 900, temperature = 0.6 }: ChatOpts): Promise<string> {
  const key = process.env.OPENROUTER_API_KEY
  if (!key) throw new Error('AI is not configured. Set OPENROUTER_API_KEY in your environment.')
  const model = process.env.OPENROUTER_MODEL || DEFAULT_MODEL

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      // Optional attribution headers OpenRouter uses for its dashboards.
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL ?? 'https://bcrtraders.com',
      'X-Title': 'BCR Traders Admin',
    },
    body: JSON.stringify({
      model,
      temperature,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    // 429 = free-tier rate/quota limit — surface a friendly hint.
    if (res.status === 429) throw new Error('AI is rate-limited right now (free tier). Please wait a moment and try again.')
    throw new Error(`AI request failed (${res.status})${detail ? `: ${detail.slice(0, 180)}` : ''}`)
  }

  const data = await res.json()
  const content = data?.choices?.[0]?.message?.content
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('AI returned an empty response. Please try again.')
  }
  // Some reasoning models (incl. Nemotron) prepend a <think>…</think> block.
  return content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim()
}

/** Chat call that expects a JSON object back; tolerant of code fences / prose. */
export async function aiJSON<T>(opts: ChatOpts): Promise<T> {
  const text = await aiChat(opts)
  const cleaned = text.replace(/```json/gi, '').replace(/```/g, '')
  const match = cleaned.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('AI did not return valid JSON. Please try again.')
  try {
    return JSON.parse(match[0]) as T
  } catch {
    throw new Error('Could not parse the AI response. Please try again.')
  }
}
