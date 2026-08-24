-- ─────────────────────────────────────────────────────────────────────────────
-- 035 · REVIEW PROMPT STATE
-- ─────────────────────────────────────────────────────────────────────────────
-- Persists the state of the CONSOLIDATED "rate your products" prompt per
-- customer, so it is shown as one request and then follows a controlled reminder
-- rule instead of re-appearing on every visit.
--
-- "Already reviewed" is NOT tracked here — that stays driven by the `reviews`
-- table (a review row for (user, product) means it's done). This table only
-- records whether/when the consolidated prompt may be shown again.
--
-- One row per customer (the prompt is consolidated across all their eligible
-- products). Reminder rule enforced in /api/reviews/pending:
--   • show while dismiss_count < 3 (initial ask + up to 2 reminders)
--   • after a Skip: dismiss_count += 1, remind_after = now() + 7 days
--   • after a Submit: remind_after = now() + 7 days (no count change — engaging
--     shouldn't count against the customer)
--   • stay silent while remind_after is in the future
CREATE TABLE IF NOT EXISTS review_prompt_state (
  user_id       UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  remind_after  TIMESTAMPTZ,
  dismiss_count INT NOT NULL DEFAULT 0,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Service-role only: the storefront reaches this exclusively through the admin
-- client in /api/reviews/pending (same as orders/reviews reads). Enabling RLS
-- with no policies denies anon/authenticated by default.
ALTER TABLE review_prompt_state ENABLE ROW LEVEL SECURITY;
