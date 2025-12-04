# 設計書レビューレポート

作成日: 2024-12-04

## 概要

以下の4つの設計書を確認し、一貫性・カラム名の不一致・タイポ・その他の問題点を調査しました。

- SalonTalk-AI-企画書-v1.0.md
- SalonTalk-AI-要件定義書-v1.0.md
- SalonTalk-AI-基本設計書-v1.0.md
- SalonTalk-AI-詳細設計書-v1.0.md

また、実装コード（TypeScript型定義、マイグレーション）とも比較しました。

---

## 1. 重大な不整合（設計書 vs 実装コード）

### 1.1 session_reports テーブル

| 項目 | 設計書（要件定義/基本設計） | 実装（database.ts） |
|------|---------------------------|-------------------|
| 良かった点 | `good_points: TEXT[]` | `strengths: string[]` |
| 改善点 | `improvement_points: TEXT[]` | `improvements: string[]` |
| アクションアイテム | `action_items: TEXT[]` | **存在しない** |
| 詳細データ | `report_data: JSONB` | `metrics: Json` |
| 作成日時 | `created_at` | `generated_at` |
| サマリー | **存在しない** | `summary: string` |

**影響**: レポート生成・表示機能に影響。設計書とコードでカラム名が一致しないため、どちらかを修正する必要があります。

---

### 1.2 session_analyses テーブル

| 項目 | 設計書（要件定義） | 実装（database.ts） |
|------|------------------|-------------------|
| 構造 | `analysis_type: VARCHAR(30)` + `result: JSONB` | 各指標を個別カラムで持つ構造 |
| 制約 | `UNIQUE (session_id, analysis_type)` | `UNIQUE` なし |

**設計書の構造**:
```sql
CREATE TABLE session_analyses (
  id UUID PRIMARY KEY,
  session_id UUID NOT NULL,
  analysis_type VARCHAR(30) NOT NULL,  -- 'talk_ratio', 'questions' など
  result JSONB NOT NULL,
  UNIQUE (session_id, analysis_type)
);
```

**実装の構造**:
```typescript
session_analyses: {
  Row: {
    id: string;
    session_id: string;
    chunk_index: number;
    overall_score: number;
    talk_ratio_score: number | null;
    talk_ratio_detail: Json | null;
    question_score: number | null;
    question_detail: Json | null;
    // ... 各指標ごとに個別カラム
  }
}
```

**影響**: 設計と実装で根本的にデータモデルが異なります。設計書の更新または実装の修正が必要です。

---

### 1.3 speaker_segments テーブル

| 項目 | 設計書（要件定義） | 実装（database.ts） |
|------|------------------|-------------------|
| 話者カラム名 | `role: VARCHAR(20)` | `speaker: string` |
| 開始時間 | `start_time: NUMERIC(10,3)` (秒) | `start_time_ms: number` (ミリ秒) |
| 終了時間 | `end_time: NUMERIC(10,3)` (秒) | `end_time_ms: number` (ミリ秒) |
| チャンク番号 | **存在しない** | `chunk_index: number` |

**影響**: 時間単位が秒とミリ秒で異なるため、データ互換性に問題が生じます。

---

### 1.4 transcripts テーブル

| 項目 | 設計書（要件定義） | 実装（database.ts） |
|------|------------------|-------------------|
| 開始時間 | `start_time: NUMERIC(10,3)` (秒) | `start_time_ms: number` (ミリ秒) |
| 終了時間 | `end_time: NUMERIC(10,3)` (秒) | `end_time_ms: number` (ミリ秒) |
| 音声URL | **存在しない** | `audio_url: string | null` |

---

### 1.5 staffs テーブル

| 項目 | 設計書（要件定義） | 実装（database.ts） |
|------|------------------|-------------------|
| 画像URL | `profile_image_url: TEXT` | `avatar_url: string | null` |
| 役職 | `position: VARCHAR(50)` | **存在しない** |
| 入社日 | `join_date: DATE` | **存在しない** |
| 設定 | `settings: JSONB` | **存在しない** |
| Auth連携 | `auth_user_id: UUID` | **存在しない** |
| ロール値 | `'owner', 'manager', 'stylist', 'assistant', 'receptionist'` | `'stylist', 'manager', 'owner', 'admin'` |

**影響**: `assistant`と`receptionist`が実装に存在せず、`admin`が設計書に存在しません。

---

### 1.6 success_cases テーブル

| 項目 | 設計書（要件定義） | 実装（database.ts） |
|------|------------------|-------------------|
| 成功トーク | `successful_talk: TEXT` | `approach_text: string` |
| 成功要因 | `key_tactics: TEXT[]` | **存在しない** |
| 販売商品 | `sold_product: VARCHAR(100)` | **存在しない** |
| 公開フラグ | `is_public: BOOLEAN` | **存在しない** |
| 顧客プロフィール | `customer_profile: JSONB` | **存在しない** |
| 結果 | **存在しない** | `result: string` |
| メタデータ | **存在しない** | `metadata: Record<string, unknown>` |

---

### 1.7 sessions テーブル

| 項目 | 設計書（要件定義） | 実装（database.ts） |
|------|------------------|-------------------|
| 話者分離ステータス | `diarization_status: VARCHAR(20)` | **存在しない** |
| 合計時間 | **存在しない** | `total_duration_ms: number` |
| ステータス値 | `'recording', 'processing', 'completed', 'failed'` | `'recording', 'processing', 'analyzing', 'completed', 'error'` |

**影響**: `analyzing`は設計書に無く、`failed` vs `error`で名前が異なります。

---

### 1.8 salons テーブル - プラン名

| 設計書 | 実装 |
|--------|------|
| `'standard', 'professional', 'enterprise'` | `'free', 'standard', 'premium', 'enterprise'` |

**影響**: `free`が追加され、`professional`が`premium`に変更されています。

---

## 2. 重複テーブルの問題

以下のテーブルが重複して存在し、役割が不明確です：

| テーブル1 | テーブル2 | 問題 |
|----------|----------|------|
| `reports` | `session_reports` | 両方ともセッションレポートを格納するテーブル |
| `analysis_results` | `session_analyses` | 両方とも分析結果を格納するテーブル |

**推奨**: どちらかに統一するか、役割の違いを明確に文書化する必要があります。

---

## 3. タイポ・スペルミス

### 3.1 詳細設計書のリポジトリ関数名

| 問題箇所 | 誤 | 正 |
|----------|---|---|
| SessionRepository | `findActiveByStylisId` | `findActiveByStylistId` |
| SessionReportRepository | `getAverageScoreByStylisId` | `getAverageScoreByStylistId` |

**ファイル**: `SalonTalk-AI-詳細設計書-v1.0.md:1556`, `1608`

---

## 4. 型定義ファイル間の不整合

`apps/web/src/types/database.ts`と`packages/shared/src/infrastructure/supabase/types.ts`で定義が異なります：

| テーブル | web/types/database.ts | shared/types.ts |
|---------|----------------------|-----------------|
| session_reports | 存在する | **存在しない** |
| success_cases.staff_id | **存在しない** | 存在する |
| roleplay_sessions.evaluated_at | **存在しない** | 存在する |
| notification_logs.read_at | **存在しない** | 存在する |

**影響**: パッケージ間でデータ型の不一致が発生し、ランタイムエラーの原因になる可能性があります。

---

## 5. 設計書内の軽微な問題

### 5.1 用語の揺れ

| 箇所 | 用語1 | 用語2 |
|------|-------|-------|
| 分析タイプ | `question_analysis` | `questions` |
| 分析タイプ | `emotion_analysis` | `emotion` |

設計書内でも`analysis_type`の値が統一されていない箇所があります。

### 5.2 API エンドポイントの不一致

| 設計書 | 箇所 |
|--------|------|
| 基本設計書 | `POST /diarize/{session_id}` (パスパラメータ) |
| 詳細設計書 | `POST /diarize` (ボディでsession_id指定の可能性) |

---

## 6. 推奨事項

### 6.1 高優先度（設計書の修正が必要）

1. **session_analyses テーブル**: 設計書を実装に合わせて更新（各指標を個別カラムで持つ構造に）
2. **session_reports テーブル**: カラム名を統一（`good_points` → `strengths`など）
3. **時間単位の統一**: 秒からミリ秒に設計書を更新
4. **ロール値の統一**: `admin`を追加、`assistant`/`receptionist`の扱いを明確化

### 6.2 中優先度（コードの修正または設計書の更新）

1. **重複テーブルの整理**: `reports` vs `session_reports`, `analysis_results` vs `session_analyses`
2. **型定義ファイルの同期**: 両パッケージで同一の型定義を使用
3. **タイポの修正**: `StylistId`のスペルミス

### 6.3 低優先度（文書化・整理）

1. **用語集の作成**: `analysis_type`の正式な値リストを定義
2. **API仕様書の統一**: エンドポイントのパラメータ形式を統一

---

## 7. まとめ

| カテゴリ | 問題数 |
|----------|--------|
| 重大な不整合（設計書 vs 実装） | 8件 |
| 重複テーブル | 2件 |
| タイポ・スペルミス | 2件 |
| 型定義ファイル間の不整合 | 4件 |
| 軽微な問題 | 2件 |

設計書と実装コードの間に多くの不整合が見つかりました。特にデータベーススキーマの定義が大きく異なるため、設計書の更新を優先的に行うことを推奨します。
