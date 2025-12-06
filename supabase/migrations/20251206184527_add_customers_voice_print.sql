-- ============================================================
-- SalonTalk AI - 声紋識別機能用マイグレーション
-- 顧客テーブルと声紋マッチング関数を追加
-- ============================================================

-- ------------------------------------------------------------
-- customers（顧客・声紋識別）
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  name VARCHAR(100),
  voice_embedding VECTOR(512),             -- 声紋埋め込みベクトル（pyannote 512次元）
  embedding_updated_at TIMESTAMPTZ,
  total_visits INTEGER NOT NULL DEFAULT 1 CHECK (total_visits > 0),
  first_visit_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_visit_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_customers_salon_id ON customers(salon_id);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name) WHERE name IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_last_visit ON customers(salon_id, last_visit_at DESC);

-- HNSWベクトルインデックス（声紋類似検索用）
CREATE INDEX IF NOT EXISTS idx_customers_voice_embedding ON customers
  USING hnsw (voice_embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- 更新日時自動更新トリガー（関数が存在する場合のみ）
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    CREATE TRIGGER update_customers_updated_at
      BEFORE UPDATE ON customers
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ------------------------------------------------------------
-- sessionsテーブルにcustomer_idを追加
-- ------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sessions' AND column_name = 'customer_id'
  ) THEN
    ALTER TABLE sessions ADD COLUMN customer_id UUID REFERENCES customers(id) ON DELETE SET NULL;
    CREATE INDEX idx_sessions_customer_id ON sessions(customer_id);
  END IF;
END $$;

-- ------------------------------------------------------------
-- RLS（Row Level Security）
-- ------------------------------------------------------------
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- customers ポリシー
CREATE POLICY "customer_select" ON customers
  FOR SELECT USING (salon_id = get_current_user_salon_id());

CREATE POLICY "customer_insert" ON customers
  FOR INSERT WITH CHECK (salon_id = get_current_user_salon_id());

CREATE POLICY "customer_update" ON customers
  FOR UPDATE USING (salon_id = get_current_user_salon_id());

CREATE POLICY "customer_delete" ON customers
  FOR DELETE USING (
    salon_id = get_current_user_salon_id()
    AND get_current_user_role() IN ('owner', 'manager')
  );

-- ------------------------------------------------------------
-- 声紋識別関数
-- ------------------------------------------------------------

-- 声紋による顧客マッチング関数
CREATE OR REPLACE FUNCTION match_customer_by_voice(
  query_embedding VECTOR(512),
  salon_id_param UUID,
  match_threshold FLOAT DEFAULT 0.65,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  name VARCHAR,
  similarity FLOAT,
  total_visits INTEGER,
  last_visit_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.name,
    1 - (c.voice_embedding <=> query_embedding) AS similarity,
    c.total_visits,
    c.last_visit_at
  FROM customers c
  WHERE
    c.salon_id = salon_id_param
    AND c.voice_embedding IS NOT NULL
    AND 1 - (c.voice_embedding <=> query_embedding) > match_threshold
  ORDER BY c.voice_embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 顧客の声紋埋め込み更新関数（加重平均）
CREATE OR REPLACE FUNCTION update_customer_embedding(
  customer_id_param UUID,
  new_embedding VECTOR(512)
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_visits INTEGER;
  current_embedding VECTOR(512);
  weight FLOAT;
BEGIN
  -- 現在の訪問回数と埋め込みを取得
  SELECT total_visits, voice_embedding
  INTO current_visits, current_embedding
  FROM customers
  WHERE id = customer_id_param;

  IF current_embedding IS NULL THEN
    -- 初回の場合はそのまま設定
    UPDATE customers
    SET
      voice_embedding = new_embedding,
      embedding_updated_at = NOW(),
      total_visits = current_visits + 1,
      last_visit_at = NOW(),
      updated_at = NOW()
    WHERE id = customer_id_param;
  ELSE
    -- 加重平均で更新（新しい埋め込みの重みを計算）
    -- 重み = 1 / (total_visits + 1)、最大0.3
    weight := LEAST(1.0 / (current_visits + 1), 0.3);

    UPDATE customers
    SET
      voice_embedding = (
        (1 - weight) * current_embedding::vector + weight * new_embedding::vector
      )::VECTOR(512),
      embedding_updated_at = NOW(),
      total_visits = current_visits + 1,
      last_visit_at = NOW(),
      updated_at = NOW()
    WHERE id = customer_id_param;
  END IF;
END;
$$;

-- 顧客作成関数（声紋付き）
CREATE OR REPLACE FUNCTION create_customer_with_embedding(
  salon_id_param UUID,
  name_param VARCHAR DEFAULT NULL,
  embedding_param VECTOR(512) DEFAULT NULL,
  metadata_param JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_customer_id UUID;
BEGIN
  INSERT INTO customers (
    salon_id,
    name,
    voice_embedding,
    embedding_updated_at,
    metadata
  ) VALUES (
    salon_id_param,
    name_param,
    embedding_param,
    CASE WHEN embedding_param IS NOT NULL THEN NOW() ELSE NULL END,
    metadata_param
  )
  RETURNING id INTO new_customer_id;

  RETURN new_customer_id;
END;
$$;
