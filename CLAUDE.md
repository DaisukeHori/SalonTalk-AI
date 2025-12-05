# SalonTalk AI - プロジェクトガイドライン

> **⚠️ 重要: 詳細設計ドキュメントについて**
>
> このCLAUDE.mdはプロジェクトの概要と開発ガイドラインを提供します。
> **実装で迷った場合や詳細な仕様が必要な場合は、必ず以下のドキュメントを参照してください：**
>
> | ドキュメント | パス | 参照すべき場面 |
> |-------------|------|---------------|
> | **企画書** | `docs/企画書/` | ビジネス要件、市場分析、財務計画、競合分析 |
> | **要件定義書** | `docs/要件定義書/` | 機能要件(FR-xxx)、非機能要件、受け入れ基準、ユースケース |
> | **基本設計書** | `docs/基本設計書/` | システムアーキテクチャ、画面設計、API設計、データ設計 |
> | **詳細設計書** | `docs/詳細設計書/` | クラス設計、シーケンス図、アルゴリズム、DB物理設計、テスト仕様 |
>
> **各ドキュメントは章ごとに分割されています。各フォルダの `README.md` から目次を参照してください。**
>
> ---
>
> **📌 設計書の正本について（2025-12-05更新）**
>
> - **正本**: `docs/企画書/`, `docs/要件定義書/`, `docs/基本設計書/`, `docs/詳細設計書/` の分割ファイル
> - **廃止**: `SalonTalk-AI-*-v1.0.md` の一体化ファイルは削除済み（内容が同一のため）
> - **更新ルール**: 設計書の更新は必ず分割ファイルに対して行うこと
> - **レビューレポート**: `docs/design-review-report.md` に設計書間の整合性問題を記載

---

## プロジェクト概要

**SalonTalk AI**は、美容室における接客会話をAIがリアルタイムで分析し、トップスタイリストの「売れるトーク」パターンを可視化・共有することで、店舗全体の売上向上と人材育成の効率化を実現するシステムです。

### ミッション
「売れる美容師の暗黙知を科学し、再現可能なスキルに変換する」

### 解決する課題
- スタッフ間売上格差（トップ:平均 = 3.3:1 → 2:1以下へ）
- 新人早期離職（3年未満36.7%離職 → 30%削減）
- 店販苦手意識（70%が苦手 → 購入率20%向上）

### 期待効果
- 店販売上向上: +20〜36%
- 育成期間短縮: 50%
- 離職率低下: -30%

---

## 技術スタック

### フロントエンド

| 領域 | 技術 | 用途 |
|------|------|------|
| iPadアプリ | React Native + Expo (~50.x) | 施術者向けUI |
| Webダッシュボード | Next.js 14 + TypeScript | 管理者向けUI |
| 状態管理 | Zustand 4.x | クライアント状態 |
| データフェッチ | SWR 2.x | サーバーデータ同期 |
| UIコンポーネント | Tailwind CSS, NativeWind | スタイリング |
| グラフ | Recharts 2.x | 分析ダッシュボード |
| バリデーション | Zod 3.x | スキーマ検証 |

### バックエンド

| 領域 | 技術 | 用途 |
|------|------|------|
| BaaS | Supabase | PostgreSQL + Auth + Realtime + Storage + Edge Functions |
| ベクトルDB | pgvector (Supabase) | 成功事例の類似検索 |
| 話者分離サーバー | FastAPI + pyannote.audio 3.x | 話者分離処理 |
| キュー処理 | Supabase pg_net / Edge Functions | 非同期処理 |

### AI/ML

| 領域 | 技術 | 用途 |
|------|------|------|
| 文字起こし | Apple SpeechAnalyzer (iOS 26+) | オンデバイス音声認識 |
| 話者分離 | pyannote.audio 3.1 | 美容師/お客様の発話分離 |
| AI分析 | Claude Sonnet 4.5 | 7指標トーク分析・レポート生成 |
| 埋め込み生成 | OpenAI text-embedding-3-small | ベクトル化 |

### インフラ

| 領域 | 技術 | 用途 |
|------|------|------|
| ホスティング | Vercel | Next.js Webダッシュボード |
| モバイル配信 | Expo EAS | iPadアプリ配信 |
| GPU処理 | VAST.ai / RunPod | pyannote話者分離 |
| 監視 | Sentry, Supabase Logs | エラー追跡・ログ |

---

## プロジェクト構造

```
salontalk-ai/
├── apps/
│   ├── mobile/                     # React Native iPadアプリ
│   │   ├── src/
│   │   │   ├── app/                # Expo Router画面定義
│   │   │   ├── components/         # UIコンポーネント
│   │   │   │   ├── session/        # セッション関連
│   │   │   │   ├── analysis/       # 分析表示
│   │   │   │   └── common/         # 共通コンポーネント
│   │   │   ├── hooks/              # カスタムフック
│   │   │   ├── services/           # API・外部サービス連携
│   │   │   ├── stores/             # Zustand状態管理
│   │   │   ├── utils/              # ユーティリティ
│   │   │   └── types/              # 型定義
│   │   ├── app.json
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── web/                        # Next.js Webダッシュボード
│       ├── src/
│       │   ├── app/                # App Router
│       │   │   ├── (auth)/         # 認証ルート
│       │   │   ├── (dashboard)/    # ダッシュボード
│       │   │   └── api/            # API Routes
│       │   ├── components/         # UIコンポーネント
│       │   ├── hooks/              # カスタムフック
│       │   ├── lib/                # ライブラリ設定
│       │   └── types/              # 型定義
│       ├── next.config.js
│       ├── package.json
│       └── tsconfig.json
│
├── packages/
│   └── shared/                     # 共有パッケージ
│       ├── src/
│       │   ├── domain/             # ドメインモデル
│       │   │   ├── entities/       # エンティティ
│       │   │   ├── valueObjects/   # 値オブジェクト
│       │   │   └── services/       # ドメインサービス
│       │   ├── types/              # 共有型定義
│       │   ├── constants/          # 定数
│       │   └── utils/              # 共有ユーティリティ
│       └── package.json
│
├── services/
│   └── pyannote/                   # 話者分離サーバー
│       ├── app/
│       │   ├── main.py             # FastAPIエントリポイント
│       │   ├── routes/             # APIルート
│       │   ├── services/           # 話者分離サービス
│       │   └── models/             # Pydanticモデル
│       ├── Dockerfile
│       ├── requirements.txt
│       └── pyproject.toml
│
├── supabase/
│   ├── functions/                  # Edge Functions
│   │   ├── create-session/         # セッション作成
│   │   ├── end-session/            # セッション終了
│   │   ├── process-transcription/  # 文字起こし処理
│   │   ├── analyze-conversation/   # 会話分析
│   │   ├── generate-report/        # レポート生成
│   │   ├── search-success-cases/   # 成功事例検索
│   │   └── _shared/                # 共有ユーティリティ
│   ├── migrations/                 # DBマイグレーション
│   ├── seed/                       # 初期データ
│   └── config.toml
│
├── docs/                           # 設計ドキュメント（※実装時は必ず参照）
│   ├── 企画書/                     # ビジネス要件・財務計画（章ごとに分割）
│   ├── 要件定義書/                 # 機能要件・非機能要件（章ごとに分割）
│   ├── 基本設計書/                 # アーキテクチャ・画面設計（章ごとに分割）
│   └── 詳細設計書/                 # クラス設計・アルゴリズム（章ごとに分割）
│
├── .github/
│   └── workflows/                  # CI/CD
│
├── CLAUDE.md                       # このファイル
├── package.json                    # ルートpackage.json（ワークスペース）
├── pnpm-workspace.yaml
└── turbo.json                      # Turborepo設定
```

---

## 主要機能と実装ポイント

### 1. 音声処理パイプライン

```
iPadマイク → SpeechAnalyzer(文字起こし) → 1分チャンク送信 → pyannote(話者分離) → DB保存
```

#### 実装ポイント
- **Apple SpeechAnalyzer**: `@react-native-ai/apple`パッケージを使用
- **音声チャンク**: 60秒単位でWAV形式
- **話者分離**: pyannoteサーバーへ音声アップロード → 非同期処理 → Webhookコールバック
- **話者推定**: 発話時間が長い方を美容師と推定

### 2. AI分析（7指標スコアリング）

| 指標 | 重み | 説明 | 理想値 |
|------|------|------|--------|
| トーク比率 | 25% | 美容師とお客様の発話比率 | 40:60 |
| 質問の質 | 20% | オープン質問の割合 | 60%以上 |
| 感情分析 | 15% | ポジティブ感情の維持 | 70%以上 |
| 悩みキーワード検出 | 15% | 髪の悩みの把握 | 2個以上 |
| 提案タイミング | 10% | 悩み検出から提案までの時間 | 3分以内 |
| 提案の質 | 10% | 悩みに対応した提案か | 80%マッチ |
| 成約有無 | 5% | 店販購入の有無 | 成約 |

#### Claude分析プロンプト例
```typescript
const ANALYSIS_SYSTEM_PROMPT = `
あなたは美容室の接客会話を分析する専門家です。
以下の会話トランスクリプトを分析し、7つの指標でスコアリングしてください。

## 分析指標
1. トーク比率（美容師:お客様 = 40:60が理想）
2. 質問の質（オープン質問の割合）
3. 感情分析（ポジティブ表現の割合）
4. 悩みキーワード（乾燥、パサつき、広がる等）
5. 提案タイミング（悩み検出から提案までの時間）
6. 提案の質（悩みに対応した商品提案）
7. 成約有無

## 出力形式
JSON形式で以下の構造で出力してください:
{
  "overallScore": number, // 0-100
  "metrics": {
    "talkRatio": { "score": number, "stylistRatio": number, "details": string },
    "questionQuality": { "score": number, "openRatio": number, "details": string },
    ...
  },
  "improvements": string[],
  "highlights": string[]
}
`;
```

### 3. 成功事例マッチング

```typescript
// ベクトル検索（pgvector）
const searchSuccessCases = async (concernKeywords: string[], limit = 5) => {
  // キーワードを結合してembedding生成
  const queryText = concernKeywords.join(' ');
  const embedding = await generateEmbedding(queryText);
  
  // コサイン類似度で検索
  const { data } = await supabase.rpc('search_success_cases', {
    query_embedding: embedding,
    match_threshold: 0.7,
    match_count: limit,
  });
  
  return data;
};
```

### 4. リアルタイム通知

```typescript
// Supabase Realtimeでスコア更新を配信
const channel = supabase.channel(`session:${sessionId}`);

channel.on('broadcast', { event: 'score_update' }, (payload) => {
  setCurrentScore(payload.score);
});

channel.on('broadcast', { event: 'proposal_timing' }, (payload) => {
  showProposalNotification(payload.suggestion);
});

channel.subscribe();
```

---

## データベース設計（主要テーブル）

> **📌 正本**: `supabase/migrations/00000000000000_initial_schema.sql`
> **📌 詳細**: `docs/詳細設計書/07-データベース物理設計.md`

### 店舗・スタッフ

```sql
-- 店舗
CREATE TABLE salons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'standard', 'premium', 'enterprise')),
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- スタッフ（id = auth.users(id) パターン）
CREATE TABLE staffs (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'stylist' CHECK (role IN ('stylist', 'manager', 'owner', 'admin')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### セッション・分析

```sql
-- セッション
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  stylist_id UUID NOT NULL REFERENCES staffs(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'recording' CHECK (status IN ('recording', 'processing', 'analyzing', 'completed', 'error')),
  customer_info JSONB DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  total_duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 話者セグメント（ミリ秒単位）
CREATE TABLE speaker_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  speaker TEXT NOT NULL CHECK (speaker IN ('stylist', 'customer', 'unknown')),
  text TEXT NOT NULL,
  start_time_ms INTEGER NOT NULL,  -- ミリ秒
  end_time_ms INTEGER NOT NULL,    -- ミリ秒
  confidence REAL DEFAULT 1.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 分析結果（正規化構造）
CREATE TABLE session_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  indicator_type TEXT NOT NULL CHECK (indicator_type IN (
    'talk_ratio', 'question_analysis', 'emotion_analysis',
    'concern_keywords', 'proposal_timing', 'proposal_quality', 'conversion'
  )),
  value NUMERIC(10, 4) NOT NULL,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT session_analyses_unique UNIQUE (session_id, chunk_index, indicator_type)
);
```

### 成功事例（ベクトル検索）

```sql
-- pgvector拡張の有効化
CREATE EXTENSION IF NOT EXISTS vector;

-- 成功事例
CREATE TABLE success_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID REFERENCES salons(id),
  concern_keywords TEXT[] NOT NULL,
  approach_text TEXT NOT NULL,
  result TEXT NOT NULL,
  conversion_rate REAL,
  embedding VECTOR(1536), -- OpenAI text-embedding-3-small
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ベクトル検索用インデックス
CREATE INDEX ON success_cases 
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- 類似検索関数
CREATE OR REPLACE FUNCTION search_success_cases(
  query_embedding VECTOR(1536),
  match_threshold FLOAT,
  match_count INT
)
RETURNS TABLE (
  id UUID,
  concern_keywords TEXT[],
  approach_text TEXT,
  result TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    sc.id,
    sc.concern_keywords,
    sc.approach_text,
    sc.result,
    1 - (sc.embedding <=> query_embedding) AS similarity
  FROM success_cases sc
  WHERE 1 - (sc.embedding <=> query_embedding) > match_threshold
  ORDER BY sc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

---

## API設計

### Edge Functions一覧

| エンドポイント | メソッド | 説明 |
|---------------|---------|------|
| `/create-session` | POST | セッション開始 |
| `/end-session` | POST | セッション終了 |
| `/process-transcription` | POST | 文字起こしチャンク処理 |
| `/diarization-callback` | POST | pyannoteコールバック |
| `/analyze-conversation` | POST | 会話分析実行 |
| `/generate-report` | POST | レポート生成 |
| `/search-success-cases` | POST | 成功事例検索 |

### リクエスト/レスポンス例

> **📌 全て snake_case を使用（2025-12-05 統一）**

```typescript
// セッション開始
// POST /create-session
interface CreateSessionRequest {
  stylist_id: string;
  customer_info?: {
    age_group?: '10s' | '20s' | '30s' | '40s' | '50s' | '60s';
    gender?: 'male' | 'female' | 'other';
    visit_type?: 'new' | 'repeat';
  };
}

interface CreateSessionResponse {
  session_id: string;
  status: 'recording';
  realtime_channel: string;
  started_at: string;
}

// 会話分析
// POST /analyze-conversation
interface AnalyzeConversationRequest {
  session_id: string;
  chunk_index: number;
  segments: SpeakerSegment[];
}

interface AnalyzeConversationResponse {
  overall_score: number;
  metrics: {
    talk_ratio: MetricResult;
    question_quality: MetricResult;
    emotion: MetricResult;
    concern_keywords: MetricResult;
    proposal_timing: MetricResult;
    proposal_quality: MetricResult;
    conversion: MetricResult;
  };
  suggestions: string[];
  matched_success_cases: SuccessCase[];
}
```

---

## セキュリティ設計

### Row Level Security (RLS)

```sql
-- 店舗: 所属スタッフのみアクセス可能
ALTER TABLE salons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "salons_access" ON salons
  USING (
    id IN (
      SELECT salon_id FROM staffs WHERE id = auth.uid()
    )
  );

-- セッション: 同一店舗のスタッフのみ
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sessions_access" ON sessions
  USING (
    salon_id IN (
      SELECT salon_id FROM staffs WHERE id = auth.uid()
    )
  );
```

### 認証フロー

1. Supabase Auth（メール/パスワード）
2. JWTトークン発行
3. RLSで店舗単位のアクセス制御
4. Edge Functionsでの認証チェック

### プライバシー対策

- 音声データは処理後24時間で自動削除
- お客様への事前同意取得（アプリ内で同意フロー）
- 国内リージョン（Tokyo）でのデータ保存
- 会話テキストの暗号化保存

---

## 開発ガイドライン

### コーディング規約

#### TypeScript

> **📌 2025-12-05: データ構造（型・インターフェース）は snake_case に統一**

```typescript
// 命名規則
const sessionId: string;              // ローカル変数: camelCase 可
const MAX_CHUNK_DURATION = 60;        // 定数: UPPER_SNAKE_CASE
function createSession() {}           // 関数: camelCase

// 🔴 データ構造（型・インターフェース）: snake_case 必須
interface SessionData {
  session_id: string;        // ✅ snake_case
  started_at: string;        // ✅ snake_case
  customer_info: object;     // ✅ snake_case
}

// ファイル名
// components/SessionCard.tsx          # コンポーネント: PascalCase
// utils/format-date.ts                # ユーティリティ: kebab-case
// hooks/use-session.ts                # フック: kebab-case

// インポート順序
import React from 'react';              // 1. React
import { useQuery } from 'swr';         // 2. 外部ライブラリ
import { supabase } from '@/lib/supabase'; // 3. 内部モジュール（絶対パス）
import { Button } from '../components'; // 4. 相対パス
import type { Session } from '@/types'; // 5. 型インポート
```

#### SQL

```sql
-- テーブル名: snake_case（複数形）
CREATE TABLE speaker_segments (...);

-- カラム名: snake_case
started_at TIMESTAMPTZ

-- インデックス名: idx_{table}_{columns}
CREATE INDEX idx_sessions_salon_id ON sessions(salon_id);

-- 制約名: {table}_{constraint_type}_{description}
CONSTRAINT sessions_fk_salon FOREIGN KEY (salon_id) REFERENCES salons(id)
```

### Git規約

```
# ブランチ命名
feature/add-session-recording
fix/audio-chunk-error
refactor/analysis-service

# コミットメッセージ（Conventional Commits）
feat(session): add real-time score display
fix(audio): resolve chunk upload timeout
docs(readme): update installation guide
refactor(analysis): extract metric calculators
test(session): add integration tests
```

### テスト戦略

```
テストピラミッド:
  ┌───────────────────────────┐
  │        E2E Tests          │  10%
  │     (Playwright/Detox)    │
  ├───────────────────────────┤
  │    Integration Tests      │  20%
  │    (Supabase + Jest)      │
  ├───────────────────────────┤
  │       Unit Tests          │  70%
  │    (Jest/Vitest)          │
  └───────────────────────────┘
```

#### カバレッジ目標
- Unit Tests: 80%
- Integration Tests: 主要フロー全て
- E2E Tests: クリティカルパス

---

## 開発フェーズ

### Phase 1: 初期版開発（3ヶ月）

**目標**: 基本機能実装、Prestoグループ3店舗でβテスト

| 週 | マイルストーン |
|----|--------------|
| 1-2 | 開発環境構築、CI/CD設定 |
| 3-4 | 音声処理（SpeechAnalyzer統合） |
| 5-6 | 話者分離（pyannoteサーバー構築） |
| 7-8 | AI分析（Claude統合、基本分析） |
| 9-10 | iPad UI（セッション画面） |
| 11-12 | βテスト、フィードバック収集 |

**成果物**:
- iPadアプリ v0.1
- 管理ダッシュボード v0.1
- pyannoteサーバー

### Phase 2: AI分析強化（6ヶ月）

**目標**: AI分析精度向上、10店舗に拡大

- 成功事例DB構築（pgvector）
- 類似事例検索機能
- リアルタイムアシスト（提案通知）
- スコアリング改善

### Phase 3: 教育機能追加（9ヶ月）

**目標**: 教育機能追加、正式ローンチ

- AIロールプレイ機能
- ゲーミフィケーション（バッジ・ランキング）
- 複数店舗統合分析

---

## 環境変数

```env
# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Anthropic
ANTHROPIC_API_KEY=sk-ant-xxx

# OpenAI
OPENAI_API_KEY=sk-xxx

# pyannote
PYANNOTE_SERVER_URL=http://xxx:8000
PYANNOTE_API_KEY=xxx
PYANNOTE_CALLBACK_SECRET=xxx
HUGGINGFACE_TOKEN=hf_xxx

# App
APP_ENV=development|staging|production
LOG_LEVEL=debug|info|warn|error
```

---

## トラブルシューティング

### よくあるエラー

| エラー | 原因 | 対処 |
|--------|------|------|
| `AUTH_001` | 認証トークン無効 | 再ログイン |
| `SES_004` | アクティブセッション存在 | 既存セッションを終了 |
| `AI_001` | Claude APIエラー | リトライ、レート制限確認 |
| `DIA_001` | pyannoteエラー | サーバー状態確認、リトライ |
| `NET_001` | ネットワーク接続エラー | 接続確認 |

### 性能目標

| 指標 | 目標値 |
|------|--------|
| 同時セッション数 | 100セッション |
| API応答時間（P95） | 500ms以下 |
| 話者分離処理時間 | 1分音声 → 1.5分以内 |
| AI分析処理時間 | 1分チャンク → 10秒以内 |
| エラー率 | 0.1%以下 |

---

## 参考リンク

### 公式ドキュメント
- [Supabase Documentation](https://supabase.com/docs)
- [React Native](https://reactnative.dev)
- [Expo](https://docs.expo.dev)
- [Next.js](https://nextjs.org/docs)
- [Anthropic Claude API](https://docs.anthropic.com)
- [OpenAI API](https://platform.openai.com/docs)
- [pyannote.audio](https://github.com/pyannote/pyannote-audio)
- [pgvector](https://github.com/pgvector/pgvector)

### プロジェクト設計書（実装時は必ず参照）

> **📌 実装で迷ったら、まずこれらのドキュメントを確認してください**

| ドキュメント | ファイル | 主な内容 |
|-------------|---------|---------|
| 企画書 | `docs/企画書/README.md` | ビジネス目標、市場分析、ROI計算、競合比較 |
| 要件定義書 | `docs/要件定義書/README.md` | 機能要件一覧(FR-101〜)、非機能要件、受け入れ基準 |
| 基本設計書 | `docs/基本設計書/README.md` | システム構成、画面遷移、API仕様、ER図 |
| 詳細設計書 | `docs/詳細設計書/README.md` | TypeScriptクラス設計、シーケンス図、Claudeプロンプト、テスト仕様 |

---

## AI開発者（Claude Code / Cursor）向け注意事項

### ⚠️ 最重要: ドキュメント参照ルール

**実装を始める前に、必ず関連するドキュメントを確認してください：**

```
実装タスク別の参照ドキュメント:

├── 新機能の実装
│   ├── まず → 要件定義書（FR-xxx で機能要件を確認）
│   ├── 次に → 基本設計書（画面設計、API設計を確認）
│   └── 最後 → 詳細設計書（クラス設計、アルゴリズムを確認）
│
├── API/Edge Functions の実装
│   ├── 基本設計書 → API仕様、リクエスト/レスポンス形式
│   └── 詳細設計書 → シーケンス図、エラーハンドリング
│
├── UI/画面の実装
│   ├── 基本設計書 → 画面遷移図、画面レイアウト
│   └── 詳細設計書 → 画面項目詳細定義
│
├── データベース操作
│   ├── 基本設計書 → ER図、テーブル設計
│   └── 詳細設計書 → 物理設計、インデックス、RLS
│
├── AI分析ロジック
│   ├── 要件定義書 → 7指標の定義、スコアリング基準
│   └── 詳細設計書 → Claudeプロンプト、アルゴリズム詳細
│
└── テスト作成
    ├── 要件定義書 → 受け入れ基準
    └── 詳細設計書 → テスト仕様、テストケース
```

**わからないことがあれば、推測せずにドキュメントを確認してください。**

### 実装時の優先順位

1. **型安全性**: TypeScriptの厳格モードを使用、`any`は禁止
2. **エラーハンドリング**: 全てのAPIコールにtry-catch、ユーザー向けエラーメッセージ
3. **ログ出力**: 重要な処理ポイントでログ出力（本番環境ではレベル制御）
4. **テスト**: 新機能には必ずユニットテストを追加

### コード生成時の注意

```typescript
// ❌ 避けるべきパターン
const data: any = await response.json();

// ✅ 推奨パターン
interface ApiResponse<T> {
  data: T | null;
  error: ApiError | null;
}

const response = await supabase.functions.invoke<Session>('create-session', {
  body: params,
});

if (response.error) {
  throw new AppError(response.error.code, response.error.message);
}

return response.data;
```

### Supabase Edge Functions テンプレート

```typescript
// supabase/functions/[function-name]/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req: Request) => {
  // CORSプリフライト
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 認証チェック
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      {
        global: { headers: { Authorization: authHeader } },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // リクエストボディ取得
    const body = await req.json();

    // ビジネスロジック
    // ...

    return new Response(
      JSON.stringify({ data: result }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: { message: error.message } }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
```

### React Native コンポーネントテンプレート

```tsx
// apps/mobile/src/components/session/SessionCard.tsx
import React from 'react';
import { View, Text, Pressable } from 'react-native';
import type { Session } from '@/types';

interface SessionCardProps {
  session: Session;
  onPress?: () => void;
}

export const SessionCard: React.FC<SessionCardProps> = ({ session, onPress }) => {
  return (
    <Pressable
      onPress={onPress}
      className="bg-white rounded-lg p-4 shadow-sm"
      testID="session-card"
    >
      <View className="flex-row justify-between items-center">
        <Text className="text-lg font-semibold">{session.customerInfo?.name ?? '顧客情報なし'}</Text>
        <Text className="text-sm text-gray-500">{formatDate(session.startedAt)}</Text>
      </View>
      <View className="mt-2">
        <Text className="text-2xl font-bold text-blue-600">{session.overallScore ?? '--'}</Text>
        <Text className="text-sm text-gray-500">総合スコア</Text>
      </View>
    </Pressable>
  );
};
```

---

## 変更履歴

| バージョン | 日付 | 変更内容 |
|-----------|------|---------|
| 1.2 | 2025-12-05 | **snake_case 統一規則を追加**（全レイヤーで snake_case 使用を必須化） |
| 1.1 | 2025-12-05 | 全レイヤー一貫性ルールを追加 |
| 1.0 | 2025-12-04 | 初版作成 |

---

## 🔴 snake_case 統一規則（最重要）

> **⚠️ 2025-12-05 決定: プロジェクト全体で snake_case を使用**
>
> 企画・設計・データベース・API・UI・Edge Functions 等、全てのレイヤーにおいて **snake_case のみ** を使用します。

### なぜ snake_case に統一するのか

1. **単一ソースの原則**: Supabase 生成型（PostgreSQL）を唯一の型定義ソースとする
2. **変換ロジック排除**: camelCase ↔ snake_case の変換が不要になりバグを削減
3. **一貫性**: DB → API → UI の全レイヤーで同一の命名規則

### 適用範囲

| レイヤー | 例 | 備考 |
|---------|-----|------|
| **データベース** | `session_id`, `started_at`, `customer_info` | PostgreSQL 標準 |
| **Edge Functions** | リクエスト/レスポンス全て snake_case | `{ session_id, chunk_index }` |
| **API 型定義** | `interface CreateSessionRequest { stylist_id: string }` | |
| **UI 状態** | `session.started_at`, `report.overall_score` | 内部 state も snake_case |
| **設計書** | プロパティ名は snake_case で記載 | |

### ❌ 禁止パターン

```typescript
// ❌ camelCase は使用しない
interface Session {
  sessionId: string;      // ❌
  startedAt: string;      // ❌
  customerInfo: object;   // ❌
}

// ❌ 変換ロジックは書かない
const session = {
  id: response.session_id,        // ❌ マッピング不要
  startedAt: response.started_at, // ❌
};
```

### ✅ 正しいパターン

```typescript
// ✅ snake_case をそのまま使用
interface Session {
  session_id: string;
  started_at: string;
  customer_info: object;
}

// ✅ API レスポンスをそのまま使用
const session = response; // マッピング不要

// ✅ JSX でも snake_case
<Text>{session.started_at}</Text>
<Text>{report.overall_score}</Text>
```

### 例外

| 項目 | 規則 | 理由 |
|------|------|------|
| **ローカル変数** | camelCase 可 | `const sessionId = params.id` |
| **関数名** | camelCase | JavaScript 標準 `createSession()` |
| **コンポーネント名** | PascalCase | React 標準 `<SessionCard />` |
| **定数** | UPPER_SNAKE_CASE | `const MAX_DURATION = 60` |

### Supabase 生成型の使用方法

```typescript
// ✅ 推奨: Supabase 生成型を直接使用
import type { Database } from '@/types/database';

type Session = Database['public']['Tables']['sessions']['Row'];
type Staff = Database['public']['Tables']['staffs']['Row'];

// ❌ 非推奨: 概念モデル（packages/shared/domain/entities）は実装で使用しない
import { Session } from '@salontalk/shared'; // ← 使用禁止
```

---

## 🔴 全レイヤー一貫性ルール（重要）

> **⚠️ 変更を行う際は、必ず以下の全レイヤーで一貫性を確認してください**

### 対象レイヤー

| レイヤー | ファイル | 説明 |
|---------|----------|------|
| **設計書** | `docs/要件定義書/`, `docs/詳細設計書/` | データモデル、物理設計 |
| **DBマイグレーション** | `supabase/migrations/` | テーブル定義、制約 |
| **型定義（apps/web）** | `apps/web/src/types/database.ts` | フロントエンド型 |
| **型定義（shared）** | `packages/shared/src/infrastructure/supabase/types.ts` | 共有型 |
| **Edge Functions** | `supabase/functions/` | サーバーサイドロジック |
| **UI** | `apps/web/src/`, `apps/mobile/src/` | 画面実装 |

### 統一ルール

#### 1. 時間カラムの命名

```
✅ 正しい: start_time_ms, end_time_ms (INTEGER, ミリ秒)
❌ 間違い: start_time, end_time (秒単位、NUMERIC)
```

- 全テーブルで `_ms` サフィックスを使用
- 型は `INTEGER`（ミリ秒単位）
- 対象: `transcripts`, `speaker_segments`, `session_reports.proposal_timing_ms`

#### 2. speaker_segments.speaker の値

```
✅ 正しい: 'stylist' | 'customer' | 'unknown'
❌ 間違い: 'stylist' | 'customer' のみ
```

- `unknown` は話者識別不可時のフォールバック

#### 3. training_scenarios のカラム名

```
✅ 正しい: title, difficulty
❌ 間違い: name, level
```

#### 4. roleplay_sessions のカラム名

```
✅ 正しい: messages, ended_at
❌ 間違い: conversation_history, completed_at
```

#### 5. staffs テーブル構造

```
✅ 正しい:
  - id = auth.users(id) パターン
  - role: 'stylist' | 'manager' | 'owner' | 'admin'

❌ 間違い:
  - 別途 auth_user_id を持つ
  - role に 'assistant' を含む
```

#### 6. レポートテーブル

```
✅ 正しい: session_reports のみ
❌ 間違い: reports テーブルが別途存在
```

#### 7. 分析テーブル構造

```
✅ 正しい: session_analyses（正規化構造）
  - indicator_type: 'talk_ratio' | 'question_analysis' | ... | 'conversion'
  - value: number
  - score: number (0-100)
  - details: JSONB

❌ 間違い:
  - analysis_results テーブル
  - 非正規化（talk_ratio_score, question_score... を別カラムに持つ）
```

### 変更時のチェックリスト

```
□ 設計書（要件定義書/07-データモデル設計.md）を更新したか？
□ 設計書（詳細設計書/07-データベース物理設計.md）を更新したか？
□ DBマイグレーション（supabase/migrations/）を更新したか？
□ apps/web/src/types/database.ts を更新したか？
□ packages/shared/.../types.ts を更新したか？
□ Edge Functions で該当カラムを参照している箇所を更新したか？
□ UIで該当カラムを参照している箇所を更新したか？
```

### ファイル内のドキュメント化

型定義ファイルの先頭には、以下のようなコメントを記載してください：

```typescript
/**
 * 一貫性ルール:
 * - 時間カラム: start_time_ms / end_time_ms (INTEGER, ミリ秒)
 * - speaker値: 'stylist' | 'customer' | 'unknown'
 * - training: title / difficulty (NOT name / level)
 * - roleplay: messages / ended_at (NOT conversation_history / completed_at)
 * - レポート: session_reports のみ (reports テーブルは存在しない)
 * - 分析: session_analyses (正規化構造: indicator_type, value, score, details)
 */
```

### 一貫性違反が起きやすいシナリオ

1. **新しいカラムを追加するとき** → 全レイヤーで追加
2. **カラム名を変更するとき** → 全レイヤーで変更
3. **型定義を自動生成したとき** → 手動で他のファイルも同期
4. **設計書を更新したとき** → 実装も同時に更新

---

**© 2025 Revol Corporation. All Rights Reserved.**
