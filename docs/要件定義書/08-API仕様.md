## 8. API仕様

### 8.1 API設計方針

- **プロトコル**: HTTPS
- **認証**: Supabase Auth（JWT）
- **レスポンス形式**: JSON
- **エラー形式**: RFC 7807準拠

### 8.2 エンドポイント一覧

#### 8.2.1 セッション管理

| メソッド | エンドポイント | 説明 |
|---------|--------------|------|
| POST | /functions/v1/create-session | セッション開始 |
| POST | /functions/v1/end-session | セッション終了 |
| GET | /rest/v1/sessions | セッション一覧取得 |
| GET | /rest/v1/sessions/{id} | セッション詳細取得 |

#### 8.2.2 音声処理

| メソッド | エンドポイント | 説明 |
|---------|--------------|------|
| POST | /functions/v1/process-audio | 音声チャンク処理 |
| POST | /functions/v1/trigger-diarization | 話者分離開始 |
| POST | /functions/v1/diarization-callback | 話者分離完了コールバック |

#### 8.2.3 AI分析

| メソッド | エンドポイント | 説明 |
|---------|--------------|------|
| POST | /functions/v1/analyze-segment | セグメント分析 |
| POST | /functions/v1/generate-report | レポート生成 |
| POST | /functions/v1/search-cases | 成功事例検索 |

#### 8.2.4 トレーニング

| メソッド | エンドポイント | 説明 |
|---------|--------------|------|
| POST | /functions/v1/roleplay-chat | ロールプレイ会話 |
| GET | /rest/v1/scenarios | シナリオ一覧取得 |

### 8.3 API詳細仕様

#### POST /functions/v1/create-session

**説明**: 新規セッションを開始する

**リクエストヘッダー**:
```
Authorization: Bearer {JWT_TOKEN}
Content-Type: application/json
```

**リクエストボディ**:
```json
{
  "stylistId": "uuid",
  "customerInfo": {
    "ageGroup": "30s",
    "gender": "female",
    "visitFrequency": "monthly",
    "notes": "パーマの予約"
  }
}
```

**レスポンス（成功: 201）**:
```json
{
  "sessionId": "uuid",
  "status": "recording",
  "startedAt": "2025-12-04T10:00:00Z",
  "realtimeChannel": "session:uuid"
}
```

**レスポンス（エラー: 400）**:
```json
{
  "type": "https://api.salontalk.jp/errors/validation",
  "title": "Validation Error",
  "status": 400,
  "detail": "stylistId is required",
  "instance": "/functions/v1/create-session"
}
```

---

#### POST /functions/v1/process-audio

**説明**: 音声チャンクを処理し、文字起こしを保存する

**リクエストヘッダー**:
```
Authorization: Bearer {JWT_TOKEN}
Content-Type: multipart/form-data
```

**リクエストボディ**:
```
sessionId: uuid
chunkIndex: 1
audio: (binary WAV file)
transcripts: [
  {"text": "今日はどんな...", "startTime": 0.1, "endTime": 0.5}
]
```

**レスポンス（成功: 200）**:
```json
{
  "status": "processed",
  "chunkIndex": 1,
  "transcriptCount": 15,
  "diarizationTriggered": true
}
```

---

#### POST /functions/v1/search-cases

**説明**: 類似の成功事例を検索する

**リクエストボディ**:
```json
{
  "concernKeywords": ["乾燥", "広がる"],
  "customerProfile": {
    "ageGroup": "30s",
    "visitFrequency": "monthly"
  },
  "limit": 5,
  "minConversionRate": 0.3
}
```

**レスポンス（成功: 200）**:
```json
{
  "cases": [
    {
      "id": "uuid",
      "similarity": 0.92,
      "concernKeywords": ["乾燥", "パサつき"],
      "successfulTalk": "同じお悩みだった○○様は...",
      "keyTactics": ["ベネフィット提示", "お客様の声活用"],
      "conversionRate": 0.78,
      "soldProduct": "モイスチャーシャンプー"
    }
  ],
  "totalFound": 12
}
```

---

#### POST /functions/v1/roleplay-chat

**説明**: AIロールプレイの会話を行う

**リクエストボディ**:
```json
{
  "scenarioId": "uuid",
  "sessionId": "uuid",
  "userMessage": "このシャンプーは乾燥に効果的ですよ",
  "conversationHistory": [
    {"role": "ai", "content": "最近、髪がパサパサして困ってるんです..."},
    {"role": "user", "content": "そうなんですね、乾燥が気になりますか？"}
  ]
}
```

**レスポンス（成功: 200）**:
```json
{
  "aiResponse": "そうですか...でも、シャンプー変えても大丈夫かな。今使ってるのがあるので...",
  "hint": "異議処理のチャンス！現在のシャンプーとの違いを具体的に説明しましょう",
  "evaluation": {
    "current": {
      "score": 65,
      "feedback": "ベネフィット提示が弱い"
    }
  },
  "isCompleted": false
}
```

---

### 8.4 Realtime API（WebSocket）

#### チャンネル構成

| チャンネル | 用途 | イベント |
|-----------|------|---------|
| session:{id} | セッション状態 | transcript, analysis, notification |
| staff:{id} | スタッフ通知 | session_update, alert |
| salon:{id} | 店舗全体 | announcement |

#### イベント形式

```typescript
// 文字起こし更新
{
  event: "transcript",
  payload: {
    sessionId: "uuid",
    segments: [
      { text: "今日はどんな...", role: "stylist", startTime: 0.1 }
    ]
  }
}

// 分析結果更新
{
  event: "analysis",
  payload: {
    sessionId: "uuid",
    type: "realtime_score",
    data: {
      listeningScore: 75,
      questionCount: 5,
      emotionIndicator: "positive"
    }
  }
}

// 提案通知
{
  event: "notification",
  payload: {
    type: "proposal_timing",
    concernKeyword: "乾燥",
    suggestedProduct: "モイスチャーシャンプー",
    successTalkExample: "同じお悩みだった○○様は..."
  }
}
```

---
