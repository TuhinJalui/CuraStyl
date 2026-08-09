-- ============================================================
-- Mumbai GlamHub – Supabase Database Schema
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Users (extends Supabase auth.users) ──────────────────────
CREATE TABLE public.profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email           TEXT NOT NULL,
  full_name       TEXT NOT NULL,
  phone           TEXT,
  avatar_url      TEXT,
  role            TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'salon_owner', 'admin')),
  membership_tier TEXT NOT NULL DEFAULT 'basic' CHECK (membership_tier IN ('basic', 'premium', 'vip')),
  membership_expires_at TIMESTAMPTZ,
  glam_points     INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── Salons ───────────────────────────────────────────────────
CREATE TABLE public.salons (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  slug            TEXT NOT NULL UNIQUE,
  description     TEXT NOT NULL,
  tagline         TEXT,
  address         TEXT NOT NULL,
  area            TEXT NOT NULL,
  city            TEXT NOT NULL DEFAULT 'Mumbai',
  pincode         TEXT NOT NULL,
  lat             DECIMAL(10, 7),
  lng             DECIMAL(10, 7),
  phone           TEXT NOT NULL,
  email           TEXT NOT NULL,
  website         TEXT,
  cover_image     TEXT,
  gallery_images  TEXT[] DEFAULT '{}',
  category        TEXT NOT NULL CHECK (category IN ('women', 'men', 'unisex')),
  rating          DECIMAL(3, 2) DEFAULT 0,
  review_count    INTEGER DEFAULT 0,
  starting_price  INTEGER NOT NULL DEFAULT 0,
  is_verified     BOOLEAN DEFAULT FALSE,
  is_active       BOOLEAN DEFAULT TRUE,
  amenities       TEXT[] DEFAULT '{}',
  working_hours   JSONB,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_salons_area ON public.salons(area);
CREATE INDEX idx_salons_category ON public.salons(category);
CREATE INDEX idx_salons_rating ON public.salons(rating DESC);
CREATE INDEX idx_salons_owner ON public.salons(owner_id);

-- ── Services ─────────────────────────────────────────────────
CREATE TABLE public.services (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id        UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  category        TEXT NOT NULL,
  price           INTEGER NOT NULL,
  duration        INTEGER NOT NULL, -- minutes
  image_url       TEXT,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_services_salon ON public.services(salon_id);

-- ── Staff ────────────────────────────────────────────────────
CREATE TABLE public.staff (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id         UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  role             TEXT NOT NULL,
  specialization   TEXT[] DEFAULT '{}',
  avatar_url       TEXT,
  rating           DECIMAL(3, 2) DEFAULT 0,
  experience_years INTEGER DEFAULT 0,
  is_active        BOOLEAN DEFAULT TRUE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ── Bookings ─────────────────────────────────────────────────
CREATE TABLE public.bookings (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id          TEXT NOT NULL UNIQUE,  -- Human readable: GH-XXXX-XXXX
  user_id             UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  salon_id            UUID NOT NULL REFERENCES public.salons(id) ON DELETE RESTRICT,
  service_id          UUID NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
  staff_id            UUID REFERENCES public.staff(id),
  booking_date        DATE NOT NULL,
  time_slot           TEXT NOT NULL,
  status              TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  total_amount        INTEGER NOT NULL,
  discount_amount     INTEGER DEFAULT 0,
  final_amount        INTEGER NOT NULL,
  coupon_code         TEXT,
  payment_status      TEXT NOT NULL DEFAULT 'pending'
                        CHECK (payment_status IN ('pending', 'paid', 'refunded')),
  payment_method      TEXT,
  notes               TEXT,
  cancellation_reason TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent double booking: same salon + date + slot + active status
  CONSTRAINT unique_salon_slot UNIQUE (salon_id, booking_date, time_slot, staff_id)
    DEFERRABLE INITIALLY DEFERRED
);

CREATE INDEX idx_bookings_user ON public.bookings(user_id);
CREATE INDEX idx_bookings_salon ON public.bookings(salon_id);
CREATE INDEX idx_bookings_date ON public.bookings(booking_date);
CREATE INDEX idx_bookings_status ON public.bookings(status);

-- ── Reviews ──────────────────────────────────────────────────
CREATE TABLE public.reviews (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  salon_id       UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  booking_id     UUID REFERENCES public.bookings(id),
  rating         INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment        TEXT NOT NULL,
  images         TEXT[] DEFAULT '{}',
  is_verified    BOOLEAN DEFAULT FALSE,
  ai_summary     TEXT,
  helpful_count  INTEGER DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW(),

  -- One review per booking
  CONSTRAINT unique_booking_review UNIQUE (booking_id)
);

CREATE INDEX idx_reviews_salon ON public.reviews(salon_id);
CREATE INDEX idx_reviews_user ON public.reviews(user_id);

-- ── Favorites ────────────────────────────────────────────────
CREATE TABLE public.favorites (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  salon_id   UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, salon_id)
);

-- ── Notifications ────────────────────────────────────────────
CREATE TABLE public.notifications (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type       TEXT NOT NULL, -- booking_confirmed, booking_reminder, offer, system
  title      TEXT NOT NULL,
  message    TEXT NOT NULL,
  link       TEXT,
  is_read    BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON public.notifications(user_id);
CREATE INDEX idx_notifications_unread ON public.notifications(user_id, is_read) WHERE is_read = FALSE;

-- ── Coupons ──────────────────────────────────────────────────
CREATE TABLE public.coupons (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code                 TEXT NOT NULL UNIQUE,
  description          TEXT NOT NULL,
  discount_type        TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value       INTEGER NOT NULL,
  min_order_amount     INTEGER DEFAULT 0,
  max_discount_amount  INTEGER,
  usage_limit          INTEGER,
  used_count           INTEGER DEFAULT 0,
  valid_from           TIMESTAMPTZ NOT NULL,
  valid_until          TIMESTAMPTZ NOT NULL,
  is_active            BOOLEAN DEFAULT TRUE,
  applicable_salons    UUID[],
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- ── Payments ─────────────────────────────────────────────────
CREATE TABLE public.payments (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id       UUID NOT NULL REFERENCES public.bookings(id) ON DELETE RESTRICT,
  user_id          UUID NOT NULL REFERENCES public.profiles(id),
  amount           INTEGER NOT NULL,
  currency         TEXT DEFAULT 'INR',
  payment_method   TEXT NOT NULL,
  payment_provider TEXT,           -- razorpay, stripe, etc.
  provider_id      TEXT,           -- external transaction ID
  status           TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'success', 'failed', 'refunded')),
  metadata         JSONB,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ── Triggers: auto-update salon rating ───────────────────────
CREATE OR REPLACE FUNCTION update_salon_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.salons
  SET
    rating = (
      SELECT COALESCE(AVG(rating::DECIMAL), 0)
      FROM public.reviews
      WHERE salon_id = NEW.salon_id
    ),
    review_count = (
      SELECT COUNT(*)
      FROM public.reviews
      WHERE salon_id = NEW.salon_id
    ),
    updated_at = NOW()
  WHERE id = NEW.salon_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_salon_rating
AFTER INSERT OR UPDATE OR DELETE ON public.reviews
FOR EACH ROW EXECUTE FUNCTION update_salon_rating();

-- ── Trigger: auto-update updated_at ──────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_salons_updated_at
  BEFORE UPDATE ON public.salons
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Row Level Security ────────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read all, insert their own, and update their own
CREATE POLICY "Public profiles are viewable" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Salons: public read, owners can manage their own
CREATE POLICY "Active salons are public" ON public.salons FOR SELECT USING (is_active = true);
CREATE POLICY "Owners can manage own salon" ON public.salons FOR ALL USING (auth.uid() = owner_id);

-- Services: public read for active, owners manage
CREATE POLICY "Services are public" ON public.services FOR SELECT USING (is_active = true);
CREATE POLICY "Salon owners manage services" ON public.services FOR ALL
  USING (EXISTS (SELECT 1 FROM public.salons WHERE id = salon_id AND owner_id = auth.uid()));

-- Bookings: users see own bookings, owners see their salon's bookings
CREATE POLICY "Users see own bookings" ON public.bookings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users create bookings" ON public.bookings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users cancel own bookings" ON public.bookings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Owners see salon bookings" ON public.bookings FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.salons WHERE id = salon_id AND owner_id = auth.uid()));

-- Reviews: public read, authenticated users can create
CREATE POLICY "Reviews are public" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Auth users can review" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own reviews" ON public.reviews FOR UPDATE USING (auth.uid() = user_id);

-- Favorites: users manage own
CREATE POLICY "Users manage own favorites" ON public.favorites FOR ALL USING (auth.uid() = user_id);

-- Notifications: users see and manage own
CREATE POLICY "Users see own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
