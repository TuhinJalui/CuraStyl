-- AI Memory table: stores latest memory per user or session
CREATE TABLE IF NOT EXISTS public.ai_memory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT,
  memory JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_memory_user ON public.ai_memory(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_memory_session ON public.ai_memory(session_id);

-- Upsert helper: keep only latest per user via unique index
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'ui_ai_memory_user') THEN
    CREATE UNIQUE INDEX ui_ai_memory_user ON public.ai_memory (user_id) WHERE user_id IS NOT NULL;
  END IF;
EXCEPTION WHEN others THEN
  -- ignore
END $$;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION ai_memory_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_ai_memory_updated_at ON public.ai_memory;
CREATE TRIGGER trigger_ai_memory_updated_at
  BEFORE UPDATE ON public.ai_memory
  FOR EACH ROW EXECUTE FUNCTION ai_memory_set_updated_at();


-- AI Analytics table: store generic event payloads
CREATE TABLE IF NOT EXISTS public.ai_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_analytics_event ON public.ai_analytics(event_type);
