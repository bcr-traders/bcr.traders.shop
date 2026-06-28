-- ─────────────────────────────────────────────────────────────────────────────
-- BCR TRADERS — Migration 003: Seed Data (v2)
-- Run AFTER 002_rls.sql
--
-- All INSERTs use ON CONFLICT DO NOTHING / DO UPDATE so this file is
-- safe to re-run on an existing database (idempotent).
--
-- !! BEFORE RUNNING !!
--   Replace the super-admin phone (+91XXXXXXXXXX) with the actual phone number.
-- ─────────────────────────────────────────────────────────────────────────────


-- ── ADMIN PROFILES ───────────────────────────────────────────────────────────
-- Super Admin row must exist before Clerk webhook can link the Clerk user.
-- Set phone to the super-admin WhatsApp number stored in SUPER_ADMIN_PHONE env.
INSERT INTO admin_profiles (phone, name, email, role, permissions) VALUES
  ('+91XXXXXXXXXX', 'Super Admin', 'admin@bcrtrades.in', 'super_admin',
   '{
     "view_orders":              true,
     "update_order_status":      true,
     "manage_products":          true,
     "manage_categories":        true,
     "manage_banners":           true,
     "manage_coupons":           true,
     "manage_pincodes":          true,
     "manage_cms":               true,
     "manage_admin_profiles":    true,
     "manage_delivery_persons":  true,
     "view_analytics":           true,
     "view_abandoned_carts":     true,
     "view_unserviceable":       true,
     "receive_order_emails":     true,
     "export_data":              true
   }'::jsonb)
ON CONFLICT (phone) DO NOTHING;


-- ── CATEGORIES ───────────────────────────────────────────────────────────────
-- These slugs MUST match the CAT_CODES map in /api/products/route.ts
-- for SKU auto-generation to work correctly.
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO categories (name, name_or, slug, description, display_order, is_active,
                        meta_title, meta_description) VALUES

  ('Edible Oil', 'ଖାଦ୍ୟ ତେଲ', 'edible-oil',
   'Premium quality edible oils at wholesale prices. Sunflower, mustard, refined, and more.',
   1, true,
   'Buy Edible Oil Wholesale in Odisha — BCR TRADERS | Best Prices',
   'Buy edible oil in bulk at wholesale prices. Sunflower oil, mustard oil, refined oil available. BCR TRADERS — Odisha trusted oil distributor.'),

  ('Pulses (Dal)', 'ଡାଲ', 'pulses-dal',
   'Nutritious lentils and legumes at wholesale prices. Toor dal, moong dal, chana dal and more.',
   2, true,
   'Pulses Wholesale Odisha — Best Dal Price | BCR TRADERS',
   'Buy pulses and dal in bulk at wholesale prices. Toor, moong, chana, masoor dal available. BCR TRADERS — trusted dal distributor Odisha.'),

  ('Atta & Flour', 'ଆଟା ଏବଂ ଆଟା', 'atta-flour',
   'Fresh wheat flour and specialty flours at wholesale prices.',
   3, true,
   'Atta Wholesale Price Odisha — Bulk Wheat Flour | BCR TRADERS',
   'Buy atta and wheat flour in bulk at wholesale prices. Aashirvaad, chakki atta available. BCR TRADERS flour distributor Odisha.'),

  ('Spices (Masala)', 'ମସଲା', 'spices-masala',
   'Aromatic whole and ground spices from trusted brands at wholesale rates.',
   4, true,
   'Spices Wholesale Odisha — Masala Distributor | BCR TRADERS',
   'Buy spices and masala in bulk at wholesale prices. Turmeric, chilli, garam masala available. BCR TRADERS — best spice distributor Odisha.'),

  ('Sugar & Jaggery', 'ଚିନି ଏବଂ ଗୁଡ', 'sugar-jaggery',
   'Refined sugar and natural jaggery at wholesale prices for homes and businesses.',
   5, true,
   'Sugar Wholesale Odisha — Bulk Sugar Dealer | BCR TRADERS',
   'Buy sugar and jaggery in bulk at wholesale prices. BCR TRADERS — trusted sugar distributor and wholesale dealer in Odisha.'),

  ('Packaged Water', 'ପ୍ୟାକ୍ଡ ପାଣି', 'packaged-water',
   'Safe and hygienic packaged drinking water bottles at wholesale prices.',
   6, true,
   'Packaged Water Wholesale Odisha — Water Bottle Bulk Order | BCR TRADERS',
   'Buy packaged mineral water bottles in bulk at wholesale prices. BCR TRADERS — water bottle distributor Odisha.')

ON CONFLICT (slug) DO UPDATE SET
  name             = EXCLUDED.name,
  name_or          = EXCLUDED.name_or,
  description      = EXCLUDED.description,
  display_order    = EXCLUDED.display_order,
  is_active        = EXCLUDED.is_active,
  meta_title       = EXCLUDED.meta_title,
  meta_description = EXCLUDED.meta_description,
  updated_at       = NOW();


-- Legacy categories from v1 seed — kept inactive so existing product links don't break.
-- Re-run safe: ON CONFLICT DO NOTHING means active state is preserved if already set.
INSERT INTO categories (name, name_or, slug, description, display_order, is_active) VALUES
  ('Edible Oils',    'ଖାଦ୍ୟ ତେଲ',     'edible-oils',    'Cooking and edible oils — mustard, sunflower, soya, rice bran', 10, false),
  ('Spices',         'ମସଲା',           'spices',          'Whole and ground spices for everyday cooking',                  11, false),
  ('Rice & Grains',  'ଚାଉଳ ଓ ଶସ୍ୟ',  'rice-grains',    'Premium rice varieties and other grains',                       12, false),
  ('Salt & Sugar',   'ଲୁଣ ଓ ଚିନି',   'salt-sugar',     'Packaged salt, sugar, and jaggery',                             13, false),
  ('Flour & Sooji',  'ଆଟା ଓ ସୁଜି',   'flour-sooji',    'Wheat flour, maida, sooji, and besan',                          14, false),
  ('Dry Fruits',     'ଶୁଖୁଲା ଫଳ',    'dry-fruits',     'Cashews, almonds, raisins, and assorted dry fruits',            15, false),
  ('Packaged Foods', 'ପ୍ୟାକ ଖାଦ୍ୟ',  'packaged-foods', 'Noodles, biscuits, namkeen, and ready-to-eat items',            16, false)
ON CONFLICT (slug) DO NOTHING;


-- ── SERVICEABLE PINCODES ──────────────────────────────────────────────────────
INSERT INTO serviceable_pincodes (pincode, area_name, city, state) VALUES

  -- ── Bhubaneswar ──────────────────────────────────────────────────────────
  ('751001', 'Bhubaneswar Old Town',   'Bhubaneswar', 'Odisha'),
  ('751002', 'Unit-I',                 'Bhubaneswar', 'Odisha'),
  ('751003', 'Kalpana Square',         'Bhubaneswar', 'Odisha'),
  ('751004', 'Rajmahal Square',        'Bhubaneswar', 'Odisha'),
  ('751005', 'Vani Vihar',             'Bhubaneswar', 'Odisha'),
  ('751006', 'Sahid Nagar',            'Bhubaneswar', 'Odisha'),
  ('751007', 'Jaydev Vihar',           'Bhubaneswar', 'Odisha'),
  ('751008', 'Nayapalli Colony',       'Bhubaneswar', 'Odisha'),
  ('751009', 'Nayapalli',              'Bhubaneswar', 'Odisha'),
  ('751010', 'Patia',                  'Bhubaneswar', 'Odisha'),
  ('751012', 'Bomikhal',               'Bhubaneswar', 'Odisha'),
  ('751013', 'Rasulgarh',              'Bhubaneswar', 'Odisha'),
  ('751014', 'Mancheswar',             'Bhubaneswar', 'Odisha'),
  ('751015', 'Acharya Vihar',          'Bhubaneswar', 'Odisha'),
  ('751016', 'Baramunda',              'Bhubaneswar', 'Odisha'),
  ('751017', 'IRC Village',            'Bhubaneswar', 'Odisha'),
  ('751019', 'Damana',                 'Bhubaneswar', 'Odisha'),
  ('751020', 'Chandrasekharpur',       'Bhubaneswar', 'Odisha'),
  ('751021', 'Dumduma',                'Bhubaneswar', 'Odisha'),
  ('751022', 'Surya Nagar',            'Bhubaneswar', 'Odisha'),
  ('751023', 'Khandagiri',             'Bhubaneswar', 'Odisha'),
  ('751024', 'Niladri Vihar',          'Bhubaneswar', 'Odisha'),
  ('751025', 'Kalinga Nagar',          'Bhubaneswar', 'Odisha'),
  ('751029', 'Palasuni',               'Bhubaneswar', 'Odisha'),
  ('751030', 'Infocity',               'Bhubaneswar', 'Odisha'),
  ('751031', 'Pokhariput',             'Bhubaneswar', 'Odisha'),

  -- ── Khordha ───────────────────────────────────────────────────────────────
  ('752054', 'Jatni',                  'Khordha',     'Odisha'),
  ('752055', 'Bhubaneswar Airport',    'Khordha',     'Odisha'),
  ('752101', 'Khordha Town',           'Khordha',     'Odisha'),
  ('752102', 'Chilika',                'Khordha',     'Odisha'),

  -- ── Cuttack ───────────────────────────────────────────────────────────────
  ('753001', 'Cuttack Central',        'Cuttack',     'Odisha'),
  ('753002', 'Cuttack Old Town',       'Cuttack',     'Odisha'),
  ('753003', 'Buxi Bazar',             'Cuttack',     'Odisha'),
  ('753004', 'Cuttack Road',           'Cuttack',     'Odisha'),
  ('753007', 'Bidanasi',               'Cuttack',     'Odisha'),
  ('753008', 'Telenga Bazar',          'Cuttack',     'Odisha'),
  ('753009', 'Mangalabag',             'Cuttack',     'Odisha'),
  ('753010', 'Mahanadivihar',          'Cuttack',     'Odisha'),
  ('753012', 'Badambadi',              'Cuttack',     'Odisha'),
  ('753013', 'College Square',         'Cuttack',     'Odisha'),
  ('753014', 'Choudwar',               'Cuttack',     'Odisha'),

  -- ── Puri ──────────────────────────────────────────────────────────────────
  ('752001', 'Puri Town',              'Puri',        'Odisha'),
  ('752002', 'Grand Road',             'Puri',        'Odisha'),
  ('752003', 'Chakratirtha',           'Puri',        'Odisha'),
  ('752011', 'Konark',                 'Puri',        'Odisha'),

  -- ── Rourkela ──────────────────────────────────────────────────────────────
  ('769001', 'Rourkela Central',       'Rourkela',    'Odisha'),
  ('769002', 'Civil Township',         'Rourkela',    'Odisha'),
  ('769003', 'Ispat Nagar',            'Rourkela',    'Odisha'),
  ('769004', 'Panposh',                'Rourkela',    'Odisha'),
  ('769009', 'Koel Nagar',             'Rourkela',    'Odisha'),
  ('769012', 'Bondamunda',             'Rourkela',    'Odisha'),
  ('769015', 'Uditnagar',              'Rourkela',    'Odisha'),
  ('769016', 'Shaktinagar',            'Rourkela',    'Odisha'),

  -- ── Berhampur (Ganjam) ────────────────────────────────────────────────────
  ('760001', 'Berhampur Central',      'Berhampur',   'Odisha'),
  ('760002', 'Baidyanathpur',          'Berhampur',   'Odisha'),
  ('760003', 'Ambapua',                'Berhampur',   'Odisha'),
  ('760004', 'Ganjam Bazar',           'Berhampur',   'Odisha'),
  ('760007', 'Lanjipalli',             'Berhampur',   'Odisha'),
  ('760010', 'Tulsidas Nagar',         'Berhampur',   'Odisha'),

  -- ── Sambalpur ─────────────────────────────────────────────────────────────
  ('768001', 'Sambalpur Town',         'Sambalpur',   'Odisha'),
  ('768002', 'Ainthapali',             'Sambalpur',   'Odisha'),
  ('768003', 'Modipara',               'Sambalpur',   'Odisha'),
  ('768004', 'Budharaja',              'Sambalpur',   'Odisha'),

  -- ── Balasore ──────────────────────────────────────────────────────────────
  ('756001', 'Balasore Town',          'Balasore',    'Odisha'),
  ('756002', 'Remuna',                 'Balasore',    'Odisha'),
  ('756003', 'Sahadevkhunta',          'Balasore',    'Odisha'),

  -- ── Baripada ──────────────────────────────────────────────────────────────
  ('757001', 'Baripada Town',          'Baripada',    'Odisha'),
  ('757002', 'Mayurbhanj',             'Baripada',    'Odisha')

ON CONFLICT (pincode) DO NOTHING;


-- ── SAMPLE PRODUCTS ───────────────────────────────────────────────────────────
-- One sample product per active category for dev/staging.
-- Real products should be added through the admin panel (images not seeded here).
-- Re-run safe: ON CONFLICT (slug) DO NOTHING skips existing products.
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO products (
  category_id, name, name_or, slug, sku,
  short_desc, short_desc_or,
  price, mrp, show_strikethrough,
  unit, stock_qty, low_stock_threshold,
  is_active, is_featured, display_order,
  meta_title, meta_description,
  brand, condition, google_product_category,
  tags, auto_keywords
)
SELECT
  c.id,
  'Fortune Sunflower Refined Oil',
  'ଫର୍ଚ୍ଚୁନ ସୂର୍ଯ୍ୟମୁଖୀ ତେଲ',
  'fortune-sunflower-oil-5l',
  'BCR-OIL-2025-0001',
  'Light and healthy refined sunflower oil for everyday cooking',
  'ଦୈନନ୍ଦିନ ରାନ୍ଧିବା ପାଇଁ ହାଲୁକା ଏବଂ ସ୍ୱାସ୍ଥ୍ୟକର ସୂର୍ଯ୍ୟମୁଖୀ ତେଲ',
  649, 720, true,
  '5 Litre', 150, 20,
  true, true, 1,
  'Fortune Sunflower Oil 5L Wholesale Price — BCR TRADERS',
  'Buy Fortune Sunflower Refined Oil 5L at wholesale prices in Odisha. BCR TRADERS — best edible oil distributor.',
  'Fortune', 'new', 'Food, Beverages & Tobacco > Food Items > Cooking Oils',
  ARRAY['sunflower oil', 'refined oil', 'cooking oil', 'Fortune oil', 'oil 5 litre'],
  ARRAY['sunflower oil wholesale Odisha', 'Fortune oil 5L price', 'cooking oil bulk order', 'refined oil distributor Odisha']
FROM categories c
WHERE c.slug = 'edible-oil'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO products (
  category_id, name, name_or, slug, sku,
  short_desc, short_desc_or,
  price, mrp, show_strikethrough,
  unit, stock_qty, low_stock_threshold,
  is_active, is_featured, display_order,
  meta_title, meta_description,
  brand, condition, google_product_category,
  tags, auto_keywords
)
SELECT
  c.id,
  'Toor Dal (Arhar Dal)',
  'ତୁଅର ଡାଲ',
  'toor-dal-1kg',
  'BCR-PUL-2025-0001',
  'Premium quality toor dal at wholesale prices',
  'ଉତ୍ତମ ମାନର ତୁଅର ଡାଲ ଥୋକ ମୂଲ୍ୟରେ',
  135, 150, true,
  '1 kg', 500, 50,
  true, true, 2,
  'Toor Dal Wholesale Price Odisha — BCR TRADERS',
  'Buy toor dal (arhar dal) in bulk at wholesale prices in Odisha. Best quality lentils. BCR TRADERS.',
  'BCR TRADERS', 'new', 'Food, Beverages & Tobacco > Food Items > Grains & Pasta > Beans & Legumes',
  ARRAY['toor dal', 'arhar dal', 'pigeon peas', 'dal wholesale', 'pulses'],
  ARRAY['toor dal wholesale Odisha', 'arhar dal bulk price', 'dal distributor Odisha']
FROM categories c
WHERE c.slug = 'pulses-dal'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO products (
  category_id, name, name_or, slug, sku,
  short_desc, short_desc_or,
  price, mrp, show_strikethrough,
  unit, stock_qty, low_stock_threshold,
  is_active, is_featured, display_order,
  meta_title, meta_description,
  brand, condition, google_product_category,
  tags, auto_keywords
)
SELECT
  c.id,
  'Aashirvaad Whole Wheat Atta',
  'ଆଶୀର୍ବାଦ ଗହମ ଆଟା',
  'aashirvaad-atta-10kg',
  'BCR-ATT-2025-0001',
  'Premium whole wheat atta, freshly milled for soft rotis',
  'ନରମ ରୁଟି ପାଇଁ ଉତ୍ତମ ମାନର ଗହମ ଆଟା',
  445, 499, true,
  '10 kg', 200, 30,
  true, true, 3,
  'Aashirvaad Atta 10kg Wholesale Price — BCR TRADERS',
  'Buy Aashirvaad whole wheat atta 10kg at wholesale price in Odisha. BCR TRADERS — best atta flour distributor.',
  'Aashirvaad', 'new', 'Food, Beverages & Tobacco > Food Items > Grains & Pasta',
  ARRAY['aashirvaad atta', 'wheat flour', 'whole wheat atta', 'atta 10kg', 'flour'],
  ARRAY['aashirvaad atta wholesale Odisha', 'wheat flour bulk price', 'atta distributor Odisha']
FROM categories c
WHERE c.slug = 'atta-flour'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO products (
  category_id, name, name_or, slug, sku,
  short_desc, short_desc_or,
  price, mrp, show_strikethrough,
  unit, stock_qty, low_stock_threshold,
  is_active, is_featured, display_order,
  meta_title, meta_description,
  brand, condition, google_product_category,
  tags, auto_keywords
)
SELECT
  c.id,
  'Turmeric Powder (Haldi)',
  'ହଳଦୀ ଗୁଣ୍ଡ',
  'turmeric-powder-500g',
  'BCR-SPI-2025-0001',
  'Pure and vibrant turmeric powder from the best farms',
  'ଉତ୍ତମ ଜମିରୁ ଶୁଦ୍ଧ ଓ ଉଜ୍ଜ୍ୱଳ ହଳଦୀ ଗୁଣ୍ଡ',
  79, 95, true,
  '500 g', 300, 40,
  true, false, 4,
  'Turmeric Powder Wholesale Odisha — Haldi Bulk Price | BCR TRADERS',
  'Buy turmeric powder (haldi) in bulk at wholesale prices in Odisha. BCR TRADERS — spice distributor.',
  'BCR TRADERS', 'new', 'Food, Beverages & Tobacco > Food Items > Seasonings & Spices',
  ARRAY['turmeric', 'haldi', 'turmeric powder', 'spices', 'masala'],
  ARRAY['turmeric powder wholesale Odisha', 'haldi bulk price', 'spice distributor Odisha']
FROM categories c
WHERE c.slug = 'spices-masala'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO products (
  category_id, name, name_or, slug, sku,
  short_desc, short_desc_or,
  price, mrp, show_strikethrough,
  unit, stock_qty, low_stock_threshold,
  is_active, is_featured, display_order,
  meta_title, meta_description,
  brand, condition, google_product_category,
  tags, auto_keywords
)
SELECT
  c.id,
  'Refined Sugar (Cheeni)',
  'ଚିନି',
  'refined-sugar-5kg',
  'BCR-SUG-2025-0001',
  'Pure white refined sugar at wholesale prices for bulk buyers',
  'ଥୋକ କ୍ରେତାମାନଙ୍କ ପାଇଁ ଥୋକ ମୂଲ୍ୟରେ ଶୁଦ୍ଧ ଧଳା ଚିନି',
  215, 240, true,
  '5 kg', 400, 50,
  true, false, 5,
  'Sugar Wholesale Price Odisha — Refined Sugar Bulk | BCR TRADERS',
  'Buy refined sugar in bulk at wholesale prices in Odisha. BCR TRADERS — trusted sugar distributor.',
  'BCR TRADERS', 'new', 'Food, Beverages & Tobacco > Food Items > Sugars & Sweeteners',
  ARRAY['sugar', 'cheeni', 'refined sugar', 'sugar wholesale', 'sugar 5kg'],
  ARRAY['sugar wholesale Odisha', 'refined sugar bulk price', 'sugar distributor Odisha']
FROM categories c
WHERE c.slug = 'sugar-jaggery'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO products (
  category_id, name, name_or, slug, sku,
  short_desc, short_desc_or,
  price, mrp, show_strikethrough,
  unit, stock_qty, low_stock_threshold,
  is_active, is_featured, display_order,
  meta_title, meta_description,
  brand, condition, google_product_category,
  tags, auto_keywords
)
SELECT
  c.id,
  'Packaged Drinking Water 1L',
  'ପ୍ୟାକ୍ଡ ପାନୀୟ ଜଳ 1L',
  'packaged-water-1l',
  'BCR-WAT-2025-0001',
  'Safe and pure packaged drinking water bottles at wholesale price',
  'ଥୋକ ମୂଲ୍ୟରେ ନିରାପଦ ଓ ଶୁଦ୍ଧ ପ୍ୟାକ୍ଡ ପାନୀୟ ଜଳ',
  10, 15, true,
  '1 Litre', 1000, 100,
  true, false, 6,
  'Packaged Water Wholesale Odisha — Water Bottle Bulk | BCR TRADERS',
  'Buy packaged drinking water 1L in bulk at wholesale prices. BCR TRADERS — water bottle distributor Odisha.',
  'BCR TRADERS', 'new', 'Food, Beverages & Tobacco > Beverages > Water',
  ARRAY['water bottle', 'packaged water', 'drinking water', 'mineral water', 'water 1 litre'],
  ARRAY['water bottle wholesale Odisha', 'packaged water bulk price', 'water distributor Odisha']
FROM categories c
WHERE c.slug = 'packaged-water'
ON CONFLICT (slug) DO NOTHING;


-- ── COUPONS ───────────────────────────────────────────────────────────────────
-- v2 coupons with Odia descriptions and use limits
INSERT INTO coupons (code, description, description_or, discount_type, discount_value,
                     min_order_value, max_discount, max_uses, is_active) VALUES
  ('WELCOME50', 'Flat ₹50 off on your first order above ₹300',
   'ତୁମ ପ୍ରଥମ ଅର୍ଡରରେ ₹50 ଛାଡ',
   'flat', 50, 300, NULL, 1000, true),

  ('BCR10', '10% off on orders above ₹500 (max ₹100)',
   '₹500 ଉପରେ ଅର୍ଡରରେ 10% ଛାଡ',
   'percentage', 10, 500, 100, NULL, true),

  ('BULK200', 'Flat ₹200 off on bulk orders above ₹3000',
   '₹3000 ଉପରେ ଥୋକ ଅର୍ଡରରେ ₹200 ଛାଡ',
   'flat', 200, 3000, NULL, NULL, true)

ON CONFLICT (code) DO NOTHING;

-- v1 coupons (legacy — kept for backward compat with any existing orders)
INSERT INTO coupons (code, description, description_or, discount_type, discount_value,
                     min_order_value, max_discount, max_uses, is_active) VALUES
  ('WELCOME10', 'Welcome discount — 10% off on first order',  NULL, 'percentage', 10,  500,  200, NULL, true),
  ('FLAT50',    'Flat ₹50 off on orders above ₹1000',        NULL, 'flat',       50,  1000, NULL, NULL, true),
  ('BCR100',    'Flat ₹100 off on orders above ₹2000',       NULL, 'flat',       100, 2000, NULL, NULL, true)
ON CONFLICT (code) DO NOTHING;
