-- ============================================================
-- Add Membership Fields to Profiles Table
-- Run this in Supabase SQL Editor
-- ============================================================

-- Add new columns if they don't exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS membership_tier TEXT NOT NULL DEFAULT 'basic' CHECK (membership_tier IN ('basic', 'premium', 'vip'));

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS membership_expires_at TIMESTAMPTZ;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS glam_points INTEGER DEFAULT 0;

-- Update existing users to have basic membership
UPDATE public.profiles 
SET membership_tier = 'basic', 
    glam_points = 0 
WHERE membership_tier IS NULL;

COMMENT ON COLUMN public.profiles.membership_tier IS 'User membership plan: basic (free), premium (₹499/mo), vip (₹999/mo)';
COMMENT ON COLUMN public.profiles.membership_expires_at IS 'Expiration date for premium/vip memberships';
COMMENT ON COLUMN public.profiles.glam_points IS 'Reward points earned from bookings (50 points per completed booking)';
