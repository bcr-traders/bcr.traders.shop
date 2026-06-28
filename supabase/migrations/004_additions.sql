-- ── 17.1  WhatsApp opt-in field on profiles ────────────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS whatsapp_opt_in boolean NOT NULL DEFAULT false;

-- ── 17.5  Return / Refund ────────────────────────────────────────────────────
-- Add 'returned' to the order_status enum (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typname = 'order_status' AND e.enumlabel = 'returned'
  ) THEN
    ALTER TYPE order_status ADD VALUE 'returned';
  END IF;
END
$$;

-- Track when an order was returned
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS returned_at timestamptz;

-- ── 17.10  Error log table ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS error_log (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  route      text,
  message    text        NOT NULL,
  code       text,
  stack      text,
  user_id    text,
  created_at timestamptz DEFAULT now()
);

-- Trim old entries automatically (keep last 10 000 rows)
CREATE INDEX IF NOT EXISTS error_log_created_at_idx ON error_log (created_at DESC);
