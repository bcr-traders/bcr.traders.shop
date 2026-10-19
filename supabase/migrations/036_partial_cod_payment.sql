-- ─────────────────────────────────────────────────────────────────────────────
-- 036 — Partial payment (advance online + balance on delivery)
--
-- Admin → Settings can now switch Cash on Delivery OFF. When it is off, the
-- super admin sets a percentage of the cart that must be paid online up front;
-- the remainder is collected on delivery. That produces a third kind of order
-- which is neither fully COD nor fully prepaid, so:
--
--   * payment_method gains 'partial' (the live CHECK allowed only cod/online,
--     so an insert with 'partial' would otherwise be rejected outright)
--   * amount_paid_online / amount_due_cod record the split, so the delivery
--     panel collects the BALANCE rather than the full total, and the invoice
--     can show both legs.
--
-- Both amount columns stay NULL for ordinary cod/online orders — nothing about
-- existing rows changes, and code that ignores them keeps working.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Allow the new method. Drop by name if present, else drop whatever check
--    currently constrains payment_method (the live DB has drifted from 001, so
--    the constraint name is not guaranteed).
DO $$
DECLARE
  conname_found TEXT;
BEGIN
  SELECT c.conname INTO conname_found
  FROM pg_constraint c
  WHERE c.conrelid = 'public.orders'::regclass
    AND c.contype = 'c'
    AND pg_get_constraintdef(c.oid) ILIKE '%payment_method%'
  LIMIT 1;

  IF conname_found IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.orders DROP CONSTRAINT %I', conname_found);
  END IF;
END $$;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_payment_method_check
  CHECK (payment_method IN ('cod', 'online', 'partial'));

-- 2. The split. NULL for non-partial orders; for 'partial' both are set and
--    together they equal the order total.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS amount_paid_online NUMERIC(10,2)
    CHECK (amount_paid_online IS NULL OR amount_paid_online >= 0);

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS amount_due_cod NUMERIC(10,2)
    CHECK (amount_due_cod IS NULL OR amount_due_cod >= 0);

COMMENT ON COLUMN public.orders.amount_paid_online IS
  'Partial orders: advance already captured via Razorpay. NULL for cod/online.';
COMMENT ON COLUMN public.orders.amount_due_cod IS
  'Partial orders: balance the delivery person must still collect in cash. NULL for cod/online.';

-- 3. A partial order is prepaid in part only, so payment_status stays 'pending'
--    until the balance is collected. No status values change here.
