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

---

## 8. 追加レビュー：設計書内部の問題

### 8.1 スコア計算の重み付け問題（重大）

**ファイル**: `SalonTalk-AI-基本設計書-v1.0.md`

スコア計算の重み付けの合計が **1.00ではなく1.10** になっています：

| 指標 | 重み |
|------|------|
| 会話比率 | 0.15 |
| 質問力 | 0.15 |
| 傾聴・共感 | 0.20 |
| 悩みワード抽出 | 0.15 |
| 提案タイミング | 0.15 |
| 提案品質 | 0.15 |
| **小計** | **0.95** |
| コンバージョン | 0.15 |
| **合計** | **1.10** ❌ |

**影響**: スコア計算結果が最大110点になる可能性があり、100点満点を超える異常値が発生します。

---

### 8.2 「傾聴スコア」の定義矛盾（重大）

**企画書**での定義:
> 傾聴スコア = 相槌の頻度 + 顧客の発言を繰り返す回数

**基本設計書**での定義:
> 感情認識スコア（emotion_score）= ポジティブ表現の割合 + ネガティブ表現への共感対応回数

**問題**: 同じ「傾聴・共感」指標に対して、計測方法が根本的に異なります。「相槌」と「感情認識」は別物です。

---

### 8.3 コードサンプルのバグ

#### 8.3.1 未使用パラメータの関数

**ファイル**: `SalonTalk-AI-詳細設計書-v1.0.md`

```typescript
// estimateTalkRatioFromText関数
private estimateTalkRatioFromText(
  segments: SpeakerSegment[],  // ← 未使用
  currentTranscript: string     // ← 未使用
): number {
  // 実装では segments も currentTranscript も使用していない
  return 50; // 固定値を返している
}
```

**影響**: 会話比率の推定が機能しません。

#### 8.3.2 スコア正規化の数学的エラー

**ファイル**: `SalonTalk-AI-詳細設計書-v1.0.md`

```typescript
// 誤った正規化
const normalizedScore = (rawScore / maxPossibleScore) * 100;
// maxPossibleScoreが定義されていない、または不正確
```

**影響**: スコアが0-100の範囲に正しく正規化されない可能性があります。

---

### 8.4 API仕様の不整合

#### 8.4.1 エラーレスポンス形式の不統一

| 設計書 | 形式 |
|--------|------|
| 基本設計書 | `{ "error": "メッセージ" }` |
| 詳細設計書 | `{ "code": "ERROR_CODE", "message": "詳細" }` |

#### 8.4.2 認証ヘッダーの不統一

| 設計書 | ヘッダー |
|--------|---------|
| 基本設計書 | `Authorization: Bearer {token}` |
| 詳細設計書 | `X-API-Key: {api_key}` も混在 |

#### 8.4.3 WebSocketエンドポイントの矛盾

| 設計書 | エンドポイント |
|--------|---------------|
| 基本設計書 | `wss://api.example.com/ws/session/{id}` |
| 詳細設計書 | `wss://realtime.example.com/v1/audio` |

---

### 8.5 画面設計と機能要件の矛盾

#### 8.5.1 ダッシュボード表示項目

**要件定義書**の「ダッシュボード要件」:
- 本日のセッション数
- 平均スコア
- スコアトレンド

**基本設計書**の「画面設計」で追加されている項目:
- コンバージョン率（要件定義書に記載なし）
- 前週比較グラフ（要件定義書に記載なし）

#### 8.5.2 レポート詳細画面

**要件定義書**: 7つの評価指標を表示
**基本設計書**: 8つの評価指標（「総合評価」が追加）

---

### 8.6 参照関係の問題

#### 8.6.1 存在しないテーブルへの参照

**詳細設計書**のコードサンプル:
```typescript
// staff_goals テーブルを参照しているが、
// どの設計書にもこのテーブルの定義がない
const goals = await supabase.from('staff_goals').select('*');
```

#### 8.6.2 外部キー制約の不整合

**要件定義書**:
```sql
sessions.stylist_id REFERENCES staffs(id)
```

**実装考慮点**: `staffs`テーブルのレコード削除時の挙動（CASCADE/RESTRICT）が未定義。

---

### 8.7 用語の揺れ（追加）

| 箇所 | 用語1 | 用語2 |
|------|-------|-------|
| 顧客 | `customer` | `client` |
| スタイリスト | `stylist` | `staff` |
| セッション状態 | `status` | `state` |
| 評価指標 | `metrics` | `scores` / `indicators` |
| レポート生成日 | `created_at` | `generated_at` |

---

### 8.8 その他のタイポ・誤字（追加）

| ファイル | 行 | 誤 | 正 |
|----------|-----|---|---|
| 詳細設計書 | 複数 | `anaylsis` | `analysis` |
| 詳細設計書 | 複数 | `reponse` | `response` |
| 基本設計書 | 複数 | `segement` | `segment` |
| 要件定義書 | - | `録音中` / `recording` 混在 | 統一が必要 |

---

### 8.9 数値・計算の整合性問題

#### 8.9.1 チャンク時間の矛盾

| 設計書 | チャンク時間 |
|--------|-------------|
| 基本設計書 | 30秒 |
| 詳細設計書 | 60秒 |

#### 8.9.2 スコア閾値の未定義

**問題**: 「良い」「普通」「改善必要」の判定閾値が設計書によって異なるか、未定義。

| 設計書 | 「良い」の閾値 |
|--------|---------------|
| 企画書 | 80点以上 |
| 基本設計書 | 75点以上 |
| 詳細設計書 | 未定義 |

---

## 9. 更新されたまとめ

| カテゴリ | 問題数 |
|----------|--------|
| 重大な不整合（設計書 vs 実装） | 8件 |
| 重複テーブル | 2件 |
| タイポ・スペルミス | 6件 |
| 型定義ファイル間の不整合 | 4件 |
| 軽微な問題（用語揺れ等） | 5件 |
| **スコア計算の重み付け問題** | 1件 |
| **定義矛盾（傾聴スコア等）** | 2件 |
| **コードサンプルのバグ** | 2件 |
| **API仕様の不整合** | 3件 |
| **画面設計と機能要件の矛盾** | 2件 |
| **参照関係の問題** | 2件 |
| **数値・計算の整合性問題** | 3件 |
| **合計** | **40件** |

---

## 10. 優先度別対応推奨

### 最優先（開発に直接影響）

1. **スコア計算の重み合計を1.00に修正**
2. **傾聴スコアの定義を統一**
3. **時間単位（秒 vs ミリ秒）を統一**
4. **チャンク時間（30秒 vs 60秒）を統一**

### 高優先度

1. session_analyses テーブル構造の統一
2. session_reports カラム名の統一
3. 重複テーブルの整理
4. API仕様の統一

### 中優先度

1. 型定義ファイルの同期
2. タイポの修正
3. コードサンプルのバグ修正

### 低優先度

1. 用語集の作成
2. 閾値の明確な定義

---

## 11. 追加発見：設計書間の重大な構造的矛盾

### 11.1 評価指標名の不整合

指標の名称が設計書ごとに異なります。

| 指標 | 企画書・要件定義書 | 基本設計書・詳細設計書 |
|------|-------------------|---------------------|
| 質問力 | `questions` | `question_analysis` |
| 感情分析 | `emotion` | `emotion_analysis` |

**影響箇所**:
- 要件定義書: 行1547-1551（session_analyses CHECK制約）
- 基本設計書: 行2440-2449（indicator_type CHECK制約）
- 詳細設計書: 行5773-5780（ENUM型定義）

---

### 11.2 speaker_segments テーブルのカラム名と値

| 項目 | 要件定義書 | 基本設計書・詳細設計書 |
|------|----------|---------------------|
| カラム名 | `role` | `speaker` |
| 許可値 | `'stylist', 'customer'` | `'stylist', 'customer', 'unknown'` |

**問題**: 要件定義書では `unknown` 値がないため、音声認識失敗時に対応できない。

---

### 11.3 session_analyses テーブル構造の根本的な相違（重大）

**要件定義書**（行1533-1556）:
```sql
CREATE TABLE session_analyses (
  session_id UUID NOT NULL,
  analysis_type VARCHAR(30) NOT NULL,  -- 分析タイプのみ
  result JSONB NOT NULL,                -- 全結果をJSONで保存
  UNIQUE (session_id, analysis_type)
);
```

**基本設計書・詳細設計書**:
```sql
CREATE TABLE session_analyses (
  session_id UUID NOT NULL,
  chunk_index INTEGER NOT NULL,         -- 時系列管理（新規）
  indicator_type VARCHAR(30) NOT NULL,
  value NUMERIC(10, 4) NOT NULL,        -- 測定値（新規）
  score INTEGER NOT NULL,                -- スコア（新規）
  details JSONB,
  UNIQUE (session_id, chunk_index, indicator_type)
);
```

**影響**:
- 要件定義書: セッション × 7指標 = 7行
- 基本設計書以降: セッション × チャンク × 指標 で複数行
- データ構造が根本的に異なる

---

### 11.4 transcripts テーブルのメタデータ

| カラム | 要件定義書 | 基本設計書・詳細設計書 |
|--------|----------|---------------------|
| `confidence` | **あり** | **なし** |
| `audio_url` | **なし** | **あり** |

**影響**: 認識精度の追跡（要件定義）vs 音声再生（基本設計）で目的が異なる。

---

### 11.5 success_cases テーブルの NULL 制約が正反対

| カラム | 要件定義書 | 基本設計書・詳細設計書 |
|--------|----------|---------------------|
| `conversion_rate` | **NOT NULL** | **NULL可** |
| `embedding` | **NOT NULL** | **NULL可** |
| `key_tactics` | **NULL可** | **NOT NULL** |

**影響**: データ入力フロー・バリデーションが完全に異なる。

---

### 11.6 session_reports テーブルの大幅な差異

**要件定義書**:
```sql
good_points TEXT[],              -- NULL可
improvement_points TEXT[],        -- NULL可
report_data JSONB NOT NULL        -- 全データをJSONで保存
```

**基本設計書・詳細設計書**:
```sql
good_points TEXT[] NOT NULL DEFAULT '{}',
improvement_points TEXT[] NOT NULL DEFAULT '{}',
transcript_summary TEXT,          -- 新規
ai_feedback TEXT,                 -- 新規
indicator_scores JSONB NOT NULL   -- 新規（指標スコアの構造化）
```

**影響**: レポート生成・取得・表示のロジックが全く異なる。

---

### 11.7 staffs テーブルのロール定義

| ロール | 要件定義書 | 基本設計書・詳細設計書 |
|--------|----------|---------------------|
| `receptionist` | **あり** | **なし** |

**影響**: 受付スタッフ機能の有無。UI・権限判定が異なる。

---

### 11.8 staffs テーブルの auth_user_id 必須性

| 項目 | 要件定義書 | 基本設計書・詳細設計書 |
|------|----------|---------------------|
| NULL制約 | **NULL可** | **NOT NULL** |
| 削除時動作 | `ON DELETE SET NULL` | `ON DELETE CASCADE` |
| UNIQUE制約 | **なし** | **あり** |

**影響**:
- 要件定義書: 認証なしのスタッフ（非常勤等）も登録可能
- 基本設計書: 全スタッフがSupabase Authユーザーである必要あり

---

### 11.9 salons テーブルの seats_count 制約

| 設計書 | 制約 |
|--------|------|
| 要件定義書 | `DEFAULT 10`（制約なし） |
| 基本設計書 | `CHECK (seats_count > 0)` |
| 詳細設計書 | `CHECK (seats_count IS NULL OR seats_count > 0)` |

**影響**: 0を許可するか、NULLを許可するかが異なる。

---

### 11.10 salons テーブルの settings JSONB デフォルト値

| 設計書 | デフォルト値 |
|--------|-------------|
| 要件定義書 | `'{}'`（空オブジェクト） |
| 基本設計書・詳細設計書 | 詳細なJSON構造（通知設定、分析設定含む） |

**影響**: 新規店舗作成時の初期設定が完全に異なる。

---

### 11.11 データ保持期間の記載漏れ

| データ種別 | 企画書・要件定義書 | 基本設計書 |
|------------|------------------|------------|
| 文字起こしテキスト | 6年 | **記載なし** |
| 分析結果 | 6年 | **記載なし** |
| レポート | 6年 | **記載なし** |
| ログ | 1年 | 1年（監査ログのみ） |

---

## 12. 最終まとめ

| カテゴリ | 問題数 |
|----------|--------|
| 重大な不整合（設計書 vs 実装） | 8件 |
| 重複テーブル | 2件 |
| タイポ・スペルミス | 6件 |
| 型定義ファイル間の不整合 | 4件 |
| 軽微な問題（用語揺れ等） | 5件 |
| スコア計算の重み付け問題 | 1件 |
| 定義矛盾（傾聴スコア等） | 2件 |
| コードサンプルのバグ | 2件 |
| API仕様の不整合 | 3件 |
| 画面設計と機能要件の矛盾 | 2件 |
| 参照関係の問題 | 2件 |
| 数値・計算の整合性問題 | 3件 |
| **設計書間の構造的矛盾（新規）** | **11件** |
| **合計** | **51件** |

---

## 13. 影響度別の整理

### 最重要（実装に大きな差が生じる）

1. **session_analyses テーブル構造** - データベーススキーマが完全に異なる
2. **session_reports テーブル構造** - レポート生成・取得ロジックが異なる
3. **success_cases の必須性** - データ入力フロー・バリデーションが異なる
4. **staffs の auth_user_id** - ユーザー認証フローが異なる
5. **指標名（question_analysis vs questions）** - API契約・データベースクエリが異なる
6. **スコア重み合計1.10** - 計算結果が110点を超える可能性

### 高影響度

7. speaker_segments のカラム名・値
8. staffs のロール値（receptionist の有無）
9. transcripts のメタデータ（精度追跡 vs 音声再生）
10. 傾聴スコアの定義矛盾
11. チャンク時間（30秒 vs 60秒）

### 中影響度

12. salons の制約・デフォルト値
13. データ保持期間の記載漏れ
14. API仕様の不整合
15. 画面設計と機能要件の矛盾

### 低影響度

16. 用語の揺れ
17. タイポ・スペルミス
18. スコア閾値の未定義
