-- ═══════════════════════════════════════════════════════════════════
-- 🔍 DATABASE VERIFICATION SCRIPT
-- Run this in Supabase SQL Editor to check if everything is set up
-- ═══════════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_has_payments_table BOOLEAN;
  v_has_plan_tier BOOLEAN;
  v_has_plan_expires BOOLEAN;
  v_has_created_by BOOLEAN;
  v_has_glam_points_history BOOLEAN;
  v_has_total_spent BOOLEAN;
  v_has_award_function BOOLEAN;
  v_payments_count INTEGER;
  v_salons_count INTEGER;
  v_user_email TEXT;
  v_salon_name TEXT;
  v_salon_tier TEXT;
  rec RECORD;
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '🔍 STARTING DATABASE VERIFICATION';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';

  -- ═══════════════════════════════════════════════════════════════════
  -- 1. Check if payments table exists
  -- ═══════════════════════════════════════════════════════════════════
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'payments' AND table_schema = 'public'
  ) INTO v_has_payments_table;

  IF v_has_payments_table THEN
    RAISE NOTICE '✅ PAYMENTS TABLE: EXISTS';
    
    -- Check columns
    RAISE NOTICE '   Columns:';
    FOR rec IN (
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'payments' AND table_schema = 'public'
      ORDER BY ordinal_position
    ) LOOP
      RAISE NOTICE '     - % (%, nullable: %, default: %)', 
        rec.column_name, rec.data_type, rec.is_nullable, 
        COALESCE(rec.column_default, 'none');
    END LOOP;
    
    -- Check RLS
    IF EXISTS (
      SELECT 1 FROM pg_tables 
      WHERE tablename = 'payments' AND rowsecurity = true
    ) THEN
      RAISE NOTICE '   ✅ Row Level Security: ENABLED';
    ELSE
      RAISE NOTICE '   ⚠️  Row Level Security: DISABLED';
    END IF;
    
    -- Check policies
    SELECT COUNT(*) INTO v_payments_count
    FROM pg_policies 
    WHERE tablename = 'payments';
    RAISE NOTICE '   Policies: % active', v_payments_count;
    
  ELSE
    RAISE NOTICE '❌ PAYMENTS TABLE: NOT FOUND';
    RAISE NOTICE '   Action: Run PAYMENTS_MIGRATION.sql';
  END IF;
  
  RAISE NOTICE '';

  -- ═══════════════════════════════════════════════════════════════════
  -- 2. Check salons table for plan_tier
  -- ═══════════════════════════════════════════════════════════════════
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'salons' AND column_name = 'plan_tier'
  ) INTO v_has_plan_tier;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'salons' AND column_name = 'plan_expires_at'
  ) INTO v_has_plan_expires;

  IF v_has_plan_tier AND v_has_plan_expires THEN
    RAISE NOTICE '✅ SALONS TABLE: Has plan_tier and plan_expires_at columns';
  ELSE
    RAISE NOTICE '❌ SALONS TABLE: Missing plan columns';
    IF NOT v_has_plan_tier THEN
      RAISE NOTICE '   Missing: plan_tier';
    END IF;
    IF NOT v_has_plan_expires THEN
      RAISE NOTICE '   Missing: plan_expires_at';
    END IF;
    RAISE NOTICE '   Action: Run FIX_GLAMPOINTS_AND_PLANS.sql';
  END IF;
  
  RAISE NOTICE '';

  -- ═══════════════════════════════════════════════════════════════════
  -- 3. Check coupons table for created_by
  -- ═══════════════════════════════════════════════════════════════════
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'coupons' AND column_name = 'created_by'
  ) INTO v_has_created_by;

  IF v_has_created_by THEN
    RAISE NOTICE '✅ COUPONS TABLE: Has created_by column';
  ELSE
    RAISE NOTICE '❌ COUPONS TABLE: Missing created_by column';
    RAISE NOTICE '   Action: Run FIX_GLAMPOINTS_AND_PLANS.sql';
  END IF;
  
  RAISE NOTICE '';

  -- ═══════════════════════════════════════════════════════════════════
  -- 4. Check glam_points_history table
  -- ═══════════════════════════════════════════════════════════════════
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'glam_points_history' AND table_schema = 'public'
  ) INTO v_has_glam_points_history;

  IF v_has_glam_points_history THEN
    RAISE NOTICE '✅ GLAM_POINTS_HISTORY TABLE: EXISTS';
  ELSE
    RAISE NOTICE '❌ GLAM_POINTS_HISTORY TABLE: NOT FOUND';
    RAISE NOTICE '   Action: Run FIX_GLAMPOINTS_AND_PLANS.sql';
  END IF;
  
  RAISE NOTICE '';

  -- ═══════════════════════════════════════════════════════════════════
  -- 5. Check profiles for total_spent
  -- ═══════════════════════════════════════════════════════════════════
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'total_spent'
  ) INTO v_has_total_spent;

  IF v_has_total_spent THEN
    RAISE NOTICE '✅ PROFILES TABLE: Has total_spent column';
  ELSE
    RAISE NOTICE '❌ PROFILES TABLE: Missing total_spent column';
    RAISE NOTICE '   Action: Run FIX_GLAMPOINTS_AND_PLANS.sql';
  END IF;
  
  RAISE NOTICE '';

  -- ═══════════════════════════════════════════════════════════════════
  -- 6. Check award_glam_points function
  -- ═══════════════════════════════════════════════════════════════════
  SELECT EXISTS (
    SELECT 1 FROM information_schema.routines 
    WHERE routine_name = 'award_glam_points' AND routine_schema = 'public'
  ) INTO v_has_award_function;

  IF v_has_award_function THEN
    RAISE NOTICE '✅ AWARD_GLAM_POINTS FUNCTION: EXISTS';
  ELSE
    RAISE NOTICE '❌ AWARD_GLAM_POINTS FUNCTION: NOT FOUND';
    RAISE NOTICE '   Action: Run FIX_GLAMPOINTS_AND_PLANS.sql';
  END IF;
  
  RAISE NOTICE '';

  -- ═══════════════════════════════════════════════════════════════════
  -- 7. Check current user and salon
  -- ═══════════════════════════════════════════════════════════════════
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '👤 CURRENT USER INFO';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  
  BEGIN
    SELECT email INTO v_user_email
    FROM profiles
    WHERE id = auth.uid();

    IF FOUND THEN
      RAISE NOTICE 'User ID: %', auth.uid();
      RAISE NOTICE 'Email: %', v_user_email;
      RAISE NOTICE '';
      
      -- Check if user has a salon
      SELECT COUNT(*) INTO v_salons_count
      FROM salons WHERE owner_id = auth.uid();
      
      IF v_salons_count > 0 THEN
        SELECT name, plan_tier 
        INTO v_salon_name, v_salon_tier
        FROM salons 
        WHERE owner_id = auth.uid()
        LIMIT 1;
        
        RAISE NOTICE '✅ USER HAS SALON';
        RAISE NOTICE '   Salon Name: %', v_salon_name;
        RAISE NOTICE '   Current Plan: %', v_salon_tier;
      ELSE
        RAISE NOTICE '⚠️  USER HAS NO SALON';
        RAISE NOTICE '   Action: Navigate to /salon-owner/register to create salon';
      END IF;
    ELSE
      RAISE NOTICE '⚠️  NOT LOGGED IN or user not in profiles table';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '⚠️  Could not fetch user info (you may not be logged in via SQL Editor)';
  END;
  
  RAISE NOTICE '';

  -- ═══════════════════════════════════════════════════════════════════
  -- 8. Summary
  -- ═══════════════════════════════════════════════════════════════════
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '📋 VERIFICATION SUMMARY';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  
  IF v_has_payments_table AND v_has_plan_tier AND v_has_plan_expires AND 
     v_has_created_by AND v_has_glam_points_history AND v_has_total_spent AND 
     v_has_award_function THEN
    RAISE NOTICE '✅ ALL REQUIRED TABLES AND FUNCTIONS EXIST';
    RAISE NOTICE '';
    RAISE NOTICE '🎉 Database is properly configured!';
    RAISE NOTICE '   You can now:';
    RAISE NOTICE '   - Create payment orders';
    RAISE NOTICE '   - Upgrade salon plans';
    RAISE NOTICE '   - Redeem GlamPoints';
    RAISE NOTICE '   - Apply coupons';
  ELSE
    RAISE NOTICE '⚠️  SOME COMPONENTS ARE MISSING';
    RAISE NOTICE '';
    RAISE NOTICE '📝 Actions Required:';
    IF NOT v_has_payments_table THEN
      RAISE NOTICE '   1. Run PAYMENTS_MIGRATION.sql';
    END IF;
    IF NOT (v_has_plan_tier AND v_has_plan_expires AND v_has_created_by AND 
            v_has_glam_points_history AND v_has_total_spent AND v_has_award_function) THEN
      RAISE NOTICE '   2. Run FIX_GLAMPOINTS_AND_PLANS.sql';
    END IF;
  END IF;
  
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
END $$;

-- ═══════════════════════════════════════════════════════════════════
-- 🧪 QUICK TEST: Try inserting a test payment record
-- ═══════════════════════════════════════════════════════════════════

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '🧪 TESTING PAYMENT INSERT';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  
  BEGIN
    -- Try to insert a test payment
    INSERT INTO payments (
      user_id,
      order_id,
      amount,
      currency,
      status,
      payment_type,
      metadata
    ) VALUES (
      auth.uid(),
      'test_verification_' || gen_random_uuid()::text,
      999,
      'INR',
      'created',
      'plan_upgrade_salon',
      '{"test": true, "tier": "premium"}'::jsonb
    );
    
    RAISE NOTICE '✅ TEST PAYMENT INSERT: SUCCESS';
    RAISE NOTICE '   Payments table is working correctly!';
    
    -- Clean up test record
    DELETE FROM payments 
    WHERE order_id LIKE 'test_verification_%' 
      AND user_id = auth.uid()
      AND metadata->>'test' = 'true';
    
    RAISE NOTICE '   Test record cleaned up';
    
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ TEST PAYMENT INSERT: FAILED';
    RAISE NOTICE '   Error: %', SQLERRM;
    RAISE NOTICE '   This indicates an issue with RLS policies or table structure';
  END;
  
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
END $$;
