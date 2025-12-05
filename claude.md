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

### 店舗・スタッフ

```sql
-- 店舗
CREATE TABLE salons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  plan TEXT DEFAULT 'standard',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- スタッフ
CREATE TABLE staffs (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  salon_id UUID REFERENCES salons(id),
  name TEXT NOT NULL,
  role TEXT DEFAULT 'stylist', -- 'stylist' | 'manager' | 'owner'
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### セッション・分析

```sql
-- セッション
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID REFERENCES salons(id),
  stylist_id UUID REFERENCES staffs(id),
  status TEXT DEFAULT 'recording', -- 'recording' | 'processing' | 'completed'
  customer_info JSONB DEFAULT '{}',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 話者セグメント
CREATE TABLE speaker_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id),
  speaker TEXT NOT NULL, -- 'stylist' | 'customer'
  text TEXT NOT NULL,
  start_time REAL NOT NULL,
  end_time REAL NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 分析結果
CREATE TABLE analysis_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id),
  chunk_index INTEGER NOT NULL,
  overall_score INTEGER,
  metrics JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
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

```typescript
// セッション開始
// POST /create-session
interface CreateSessionRequest {
  stylistId: string;
  customerInfo?: {
    ageGroup?: '10s' | '20s' | '30s' | '40s' | '50s' | '60s';
    gender?: 'male' | 'female' | 'other';
    visitType?: 'new' | 'repeat';
  };
}

interface CreateSessionResponse {
  sessionId: string;
  status: 'recording';
  realtimeChannel: string;
  startedAt: string;
}

// 会話分析
// POST /analyze-conversation
interface AnalyzeConversationRequest {
  sessionId: string;
  chunkIndex: number;
  segments: SpeakerSegment[];
}

interface AnalyzeConversationResponse {
  overallScore: number;
  metrics: {
    talkRatio: MetricResult;
    questionQuality: MetricResult;
    emotion: MetricResult;
    concernKeywords: MetricResult;
    proposalTiming: MetricResult;
    proposalQuality: MetricResult;
    conversion: MetricResult;
  };
  suggestions: string[];
  matchedSuccessCases: SuccessCase[];
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

```typescript
// 命名規則
const sessionId: string;              // 変数: camelCase
const MAX_CHUNK_DURATION = 60;        // 定数: UPPER_SNAKE_CASE
interface SessionData {}              // 型: PascalCase
function createSession() {}           // 関数: camelCase

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
| 1.0 | 2025-12-04 | 初版作成 |

---

**© 2025 Revol Corporation. All Rights Reserved.**
