# BCR TRADERS — NEW FEATURE IMPLEMENTATION PROMPT

Act as a senior software developer working on the existing BCR TRADERS codebase (per `bcr_prd.md`). Do not touch or refactor any code that already works correctly — only add/extend what's needed for the following four features. Read the relevant existing files fully before changing anything.

---

## 1. Bulk quantity ("number of boxes") ordering
**Problem:** To order 100 boxes of a product, the customer currently has to add it to the cart 100 separate times / click a +1 stepper 100 times. Needs a direct "type the number" path.

- Add a **"Boxes required"** numeric input (alongside or replacing the existing +/- stepper, depending on context) on the product page and in the cart line item — the user types `100` and it sets the cart quantity in one action.
- Add schema support for this:
  - `units_per_box INT` (nullable) on `products` — not every product is sold by the box.
  - `sold_by TEXT DEFAULT 'unit' CHECK (sold_by IN ('unit', 'box'))` so the storefront knows whether to label the input "Qty" or "Boxes."
- Route the typed-quantity path through the **same validation logic** the stepper already uses — respect `min_order_qty`, `max_order_qty`, and `stock_qty`. Decide once whether `stock_qty` is tracked in units or boxes, and be consistent everywhere: cart, order stock decrement, and admin stock display.
- If the typed number exceeds available stock or `max_order_qty`, show the same inline error/clamp behavior the stepper already has — never silently accept an invalid quantity.
- Update the admin product form (`new`/`edit`) so admins can set `units_per_box` and `sold_by` per product.

## 2. Show "units per box" on product card and product page
**Problem:** There's currently no visible indicator of how many units are in a box.

- `ProductCard.tsx`: add a small legible line (e.g. "12 units/box") wherever `units_per_box` is set — skip entirely for `sold_by = 'unit'` or a null value; never show "0 units/box" or a blank line.
- Product detail page: show it more prominently, near the price/unit info, in both English and Odia per the existing language-toggle pattern — don't hardcode the string in English only.
- If `sold_by = 'box'`, make sure the displayed price is unambiguous about whether it's per-unit or per-box — adjust the existing price label rather than just adding a units-per-box number next to an ambiguous price.

## 3. Email required at checkout
**Problem:** `profiles.email` is currently nullable and only requested "after OTP" for first-time users without being enforced — an order can currently be placed with no email on file.

- Require a valid email before "Place Order" is enabled: if `profiles.email` is missing at checkout, prompt the customer to enter and confirm one, validate format server-side, and persist it to `profiles`.
- The order-placement API route must independently reject the request server-side (400 + clear validation error) if no email is on file, even if the frontend somehow lets the request through — this cannot be a client-only gate.
- Flag explicitly (don't silently decide) whether existing customers/orders without an email are backfilled or exempted from this requirement.

## 4. Every order-lifecycle update must email the customer AND every eligible admin/super admin
**Problem:** The PRD only specifies emailing admins on new-order placement. There's no requirement for customer status emails, or for admins to be notified on later updates (confirmed, out for delivery, delivered, cancelled, returned, refunded, etc.).

- Build (or extend, if one exists) a single reusable "notify on order event" function that fires on **every** order status transition — cover every value in the actual status enum used in `orders`/the order timeline, not just creation.
- On every such event:
  - Email the **customer** at `profiles.email` (now guaranteed present per item 3) with a clear, order-specific update, reusing the existing Resend integration/templates.
  - Email **every** `admin_profiles` row where `receive_order_emails = true AND role != 'delivery'` — apply this filter for every event type, not just order creation.
  - Always include the **super admin** in this distribution regardless of their `receive_order_emails` flag — they should never be able to miss an update on their own store.
- Log (don't silently swallow) any Resend send failure, without letting an email failure block or roll back the actual order status update.
- Avoid double-emailing when one action triggers two conceptual events (e.g., an admin marking "delivered" also completing the delivery-confirmation flow).
- Respect the language toggle for customer-facing email content when `preferred_lang = 'or'` — don't hardcode English-only templates.
