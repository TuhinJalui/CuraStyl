-- ============================================================
-- Mumbai GlamHub – Seed Data
-- Run this after schema.sql
-- ============================================================

-- Sample coupons
INSERT INTO public.coupons (code, description, discount_type, discount_value, min_order_amount, usage_limit, valid_from, valid_until) VALUES
('FIRST15',   'First booking 15% off',              'percentage', 15,   0,    1000, NOW(), NOW() + INTERVAL '1 year'),
('MONDAY20',  '20% off all facials on Mondays',     'percentage', 20, 500,    NULL, NOW(), NOW() + INTERVAL '1 year'),
('BRIDE2024', 'Flat ₹2000 off bridal packages',     'fixed',    2000, 5000,    500, NOW(), NOW() + INTERVAL '6 months'),
('GLAMHUB10', 'GlamHub exclusive 10% off',          'percentage', 10, 300,    NULL, NOW(), NOW() + INTERVAL '1 year'),
('SPA500',    'Flat ₹500 off spa treatments',       'fixed',     500, 1500,    200, NOW(), NOW() + INTERVAL '3 months');

-- Note: Salon and user seed data would normally be inserted via the app
-- after Supabase Auth creates user records. See lib/data/seed.ts for
-- sample data used by the app in demo mode.
