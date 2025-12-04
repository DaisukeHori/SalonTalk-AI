-- ===========================================
-- SalonTalk AI - Seed Data
-- ===========================================
-- Development seed data for testing
-- ===========================================

-- Note: This seed data is for development only
-- In production, users will be created via auth signup

-- ===========================================
-- 1. Sample Salon
-- ===========================================
INSERT INTO salons (id, name, address, phone, plan, seats_count, settings)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'テストサロン 渋谷店',
    '東京都渋谷区神南1-1-1',
    '03-1234-5678',
    'standard',
    5,
    '{
        "language": "ja",
        "timezone": "Asia/Tokyo",
        "recordingEnabled": true,
        "analysisEnabled": true,
        "notificationsEnabled": true,
        "maxConcurrentSessions": 10,
        "sessionTimeoutMinutes": 180,
        "dataRetentionDays": 365
    }'::jsonb
);

-- ===========================================
-- 2. Sample Training Scenarios (System-wide)
-- ===========================================
INSERT INTO training_scenarios (salon_id, title, description, customer_persona, objectives, difficulty, estimated_minutes)
VALUES
(
    NULL,
    '乾燥毛のお客様への店販提案',
    '髪の乾燥に悩むお客様への適切なヒアリングと商品提案を練習します。',
    '{
        "name": "田中美咲",
        "ageGroup": "30代",
        "gender": "女性",
        "hairConcerns": ["乾燥", "パサつき", "広がり"],
        "personality": "控えめだが、良い商品には興味がある",
        "purchaseHistory": ["シャンプー"]
    }'::jsonb,
    ARRAY['悩みを引き出す質問ができる', '悩みに合った商品を提案できる', '押し売りにならない提案ができる'],
    'beginner',
    10
),
(
    NULL,
    'ダメージヘアのケア提案',
    'カラーやパーマでダメージを受けた髪のケア商品提案を練習します。',
    '{
        "name": "佐藤香",
        "ageGroup": "20代",
        "gender": "女性",
        "hairConcerns": ["ダメージ", "枝毛", "切れ毛"],
        "personality": "美意識が高く、トレンドに敏感",
        "purchaseHistory": ["トリートメント", "ヘアオイル"]
    }'::jsonb,
    ARRAY['ダメージの原因を把握できる', '継続ケアの重要性を伝えられる', '予算に合わせた提案ができる'],
    'intermediate',
    15
),
(
    NULL,
    '頭皮ケアの提案',
    '頭皮トラブルに悩むお客様への適切なアドバイスと商品提案を練習します。',
    '{
        "name": "山田健一",
        "ageGroup": "40代",
        "gender": "男性",
        "hairConcerns": ["頭皮のべたつき", "かゆみ", "抜け毛"],
        "personality": "忙しく、手軽なケアを求めている",
        "purchaseHistory": []
    }'::jsonb,
    ARRAY['デリケートな悩みを聞き出せる', '男性向けの提案ができる', '生活習慣のアドバイスができる'],
    'advanced',
    15
);

-- ===========================================
-- 3. Sample Success Cases
-- ===========================================
INSERT INTO success_cases (salon_id, concern_keywords, approach_text, result, conversion_rate, is_active)
VALUES
(
    '00000000-0000-0000-0000-000000000001',
    ARRAY['乾燥', 'パサつき'],
    '「普段のお手入れで困っていることはありますか？」と聞いた後、「この季節は特に乾燥しやすいですよね。実は私も同じ悩みがあって、このオイルを使い始めたんです」と自分の体験を交えて提案。',
    'ヘアオイル購入。「自分も使っている」という言葉が信頼感につながった。',
    0.85,
    TRUE
),
(
    '00000000-0000-0000-0000-000000000001',
    ARRAY['ダメージ', '枝毛', 'カラー持ち'],
    '「カラー後1週間くらいで色落ちが気になりませんか？」と具体的な悩みを予測して質問。その後、カラー用シャンプーの効果をビフォーアフター写真で説明。',
    'カラーシャンプーとトリートメントのセット購入。視覚的な説明が効果的だった。',
    0.78,
    TRUE
),
(
    '00000000-0000-0000-0000-000000000001',
    ARRAY['広がり', 'うねり', '梅雨'],
    '「梅雨の時期、髪がまとまらなくて大変じゃないですか？」と季節の悩みから話を始め、「このスタイリング剤は雨の日でもキープできるんです」と具体的なベネフィットを説明。',
    'スタイリング剤購入。季節に合わせたタイムリーな提案が刺さった。',
    0.72,
    TRUE
);

-- Note: embedding vectors would be generated via OpenAI API in production
-- UPDATE success_cases SET embedding = ... WHERE id = ...;

-- ===========================================
-- End of seed data
-- ===========================================
