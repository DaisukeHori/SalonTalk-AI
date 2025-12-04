## 3. API詳細仕様

### 3.1 API設計方針

| 方針 | 説明 |
|------|------|
| RESTful | リソース指向のエンドポイント設計 |
| JSON | リクエスト/レスポンスボディはJSON形式 |
| JWT認証 | Supabase Auth発行のJWTトークンで認証 |
| HTTPステータス | 適切なHTTPステータスコードを返却 |
| エラー形式 | 統一されたエラーレスポンス形式 |
| バージョニング | URLパスでのバージョニング（v1） |

### 3.2 共通仕様

#### 3.2.1 認証ヘッダー

```
Authorization: Bearer {access_token}
```

#### 3.2.2 共通リクエストヘッダー

| ヘッダー | 必須 | 説明 |
|---------|------|------|
| Authorization | ○ | Bearer トークン |
| Content-Type | ○ | application/json |
| X-Request-ID | × | リクエスト追跡用ID |

#### 3.2.3 共通レスポンス形式

**成功時**:

```typescript
interface SuccessResponse<T> {
  data: T;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
  };
}
```

**エラー時**:

```typescript
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}
```

#### 3.2.4 HTTPステータスコード

| コード | 説明 | 使用場面 |
|--------|------|---------|
| 200 | OK | 正常取得・更新 |
| 201 | Created | 正常作成 |
| 204 | No Content | 正常削除 |
| 400 | Bad Request | リクエスト不正 |
| 401 | Unauthorized | 認証エラー |
| 403 | Forbidden | 権限エラー |
| 404 | Not Found | リソース未存在 |
| 409 | Conflict | 競合エラー |
| 422 | Unprocessable Entity | バリデーションエラー |
| 429 | Too Many Requests | レート制限 |
| 500 | Internal Server Error | サーバーエラー |
| 503 | Service Unavailable | サービス一時停止 |

### 3.3 Edge Functions 詳細仕様

#### 3.3.1 create-session

**エンドポイント**: `POST /functions/v1/create-session`

**説明**: 新しいセッションを作成し、リアルタイム分析を開始する

**リクエスト**:

```typescript
interface CreateSessionRequest {
  stylistId: string;  // UUID
  customerInfo?: {
    ageGroup?: '10s' | '20s' | '30s' | '40s' | '50s' | '60s+';
    gender?: 'male' | 'female' | 'other';
    visitFrequency?: 'first' | 'monthly' | 'bimonthly' | 'quarterly' | 'irregular';
    notes?: string;  // max 500 chars
  };
}
```

**レスポンス**:

```typescript
// 201 Created
interface CreateSessionResponse {
  data: {
    sessionId: string;
    status: 'recording';
    startedAt: string;  // ISO8601
    realtimeChannel: string;  // "session:{sessionId}"
  };
}
```

**エラー**:

| コード | 説明 |
|--------|------|
| AUTH_001 | 認証トークン無効 |
| VAL_001 | stylistId未指定 |
| VAL_002 | customerInfo形式不正 |
| SES_004 | アクティブセッション存在 |

**実装**:

```typescript
// supabase/functions/create-session/index.ts

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

// バリデーションスキーマ
const CreateSessionSchema = z.object({
  stylistId: z.string().uuid(),
  customerInfo: z.object({
    ageGroup: z.enum(['10s', '20s', '30s', '40s', '50s', '60s+']).optional(),
    gender: z.enum(['male', 'female', 'other']).optional(),
    visitFrequency: z.enum(['first', 'monthly', 'bimonthly', 'quarterly', 'irregular']).optional(),
    notes: z.string().max(500).optional(),
  }).optional(),
});

serve(async (req: Request) => {
  try {
    // CORS
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'authorization, content-type',
        },
      });
    }

    // 認証チェック
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return errorResponse('AUTH_001', '認証が必要です', 401);
    }

    // Supabaseクライアント（ユーザーコンテキスト）
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // ユーザー取得
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return errorResponse('AUTH_001', '認証に失敗しました', 401);
    }

    // リクエストボディ解析
    const body = await req.json();
    const parseResult = CreateSessionSchema.safeParse(body);
    if (!parseResult.success) {
      return errorResponse('VAL_001', 'リクエストが不正です', 400, {
        details: parseResult.error.errors,
      });
    }

    const { stylistId, customerInfo } = parseResult.data;

    // スタッフ情報取得
    const { data: staff, error: staffError } = await supabase
      .from('staffs')
      .select('id, salon_id, role, is_active')
      .eq('id', stylistId)
      .single();

    if (staffError || !staff) {
      return errorResponse('VAL_001', 'スタイリストが見つかりません', 400);
    }

    if (!staff.is_active) {
      return errorResponse('VAL_001', 'スタイリストが無効です', 400);
    }

    // アクティブセッション確認
    const { data: activeSession } = await supabase
      .from('sessions')
      .select('id')
      .eq('stylist_id', stylistId)
      .eq('status', 'recording')
      .single();

    if (activeSession) {
      return errorResponse('SES_004', '既にアクティブなセッションがあります', 409);
    }

    // セッション作成
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .insert({
        salon_id: staff.salon_id,
        stylist_id: stylistId,
        status: 'recording',
        customer_info: customerInfo || null,
        diarization_status: 'pending',
      })
      .select()
      .single();

    if (sessionError) {
      console.error('Session creation error:', sessionError);
      return errorResponse('DB_001', 'セッションの作成に失敗しました', 500);
    }

    // 成功レスポンス
    return new Response(
      JSON.stringify({
        data: {
          sessionId: session.id,
          status: session.status,
          startedAt: session.started_at,
          realtimeChannel: `session:${session.id}`,
        },
      }),
      {
        status: 201,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return errorResponse('SYS_001', 'システムエラーが発生しました', 500);
  }
});

function errorResponse(
  code: string,
  message: string,
  status: number,
  details?: Record<string, unknown>
) {
  return new Response(
    JSON.stringify({
      error: { code, message, details },
    }),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    }
  );
}
```

---

#### 3.3.2 process-audio

**エンドポイント**: `POST /functions/v1/process-audio`

**説明**: 音声チャンクを受信し、文字起こし保存・話者分離をトリガー

**リクエスト**: `multipart/form-data`

| フィールド | 型 | 必須 | 説明 |
|-----------|---|------|------|
| sessionId | string | ○ | セッションID |
| chunkIndex | number | ○ | チャンク番号 |
| audio | File | ○ | WAVファイル（最大10MB） |
| transcripts | JSON | ○ | 文字起こし結果 |

**transcripts形式**:

```typescript
interface TranscriptData {
  text: string;
  startTime: number;
  endTime: number;
  segments?: Array<{
    text: string;
    startTime: number;
    endTime: number;
    confidence: number;
  }>;
}
```

**レスポンス**:

```typescript
// 200 OK
interface ProcessAudioResponse {
  data: {
    transcriptId: string;
    audioUrl: string;
    diarizationTriggered: boolean;
  };
}
```

**実装**:

```typescript
// supabase/functions/process-audio/index.ts

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const PYANNOTE_SERVER = Deno.env.get('PYANNOTE_SERVER_URL');
const PYANNOTE_API_KEY = Deno.env.get('PYANNOTE_API_KEY');

serve(async (req: Request) => {
  try {
    if (req.method === 'OPTIONS') {
      return corsResponse(null, 204);
    }

    // 認証
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return errorResponse('AUTH_001', '認証が必要です', 401);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // multipart/form-data解析
    const formData = await req.formData();
    const sessionId = formData.get('sessionId') as string;
    const chunkIndex = parseInt(formData.get('chunkIndex') as string, 10);
    const audioFile = formData.get('audio') as File;
    const transcriptsJson = formData.get('transcripts') as string;

    // バリデーション
    if (!sessionId || isNaN(chunkIndex) || !audioFile || !transcriptsJson) {
      return errorResponse('VAL_001', '必須パラメータが不足しています', 400);
    }

    if (audioFile.size > MAX_FILE_SIZE) {
      return errorResponse('VAL_002', 'ファイルサイズが上限を超えています', 400);
    }

    // セッション存在確認
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id, salon_id, status')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return errorResponse('SES_001', 'セッションが見つかりません', 404);
    }

    if (session.status !== 'recording') {
      return errorResponse('SES_002', 'セッションは録音中ではありません', 400);
    }

    // 音声ファイルをStorageにアップロード
    const date = new Date().toISOString().split('T')[0];
    const audioPath = `${session.salon_id}/${date}/${sessionId}/chunk_${chunkIndex.toString().padStart(4, '0')}.wav`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('audio-chunks')
      .upload(audioPath, audioFile, {
        contentType: 'audio/wav',
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return errorResponse('SYS_001', '音声ファイルのアップロードに失敗しました', 500);
    }

    // 公開URLを取得
    const { data: urlData } = supabase.storage
      .from('audio-chunks')
      .getPublicUrl(audioPath);

    const audioUrl = urlData.publicUrl;

    // 文字起こしを保存
    const transcripts = JSON.parse(transcriptsJson);
    const { data: transcript, error: transcriptError } = await supabase
      .from('transcripts')
      .insert({
        session_id: sessionId,
        chunk_index: chunkIndex,
        text: transcripts.text,
        start_time: transcripts.startTime,
        end_time: transcripts.endTime,
        audio_url: audioUrl,
      })
      .select()
      .single();

    if (transcriptError) {
      console.error('Transcript save error:', transcriptError);
      return errorResponse('DB_001', '文字起こしの保存に失敗しました', 500);
    }

    // 話者分離をトリガー
    let diarizationTriggered = false;
    if (PYANNOTE_SERVER && PYANNOTE_API_KEY) {
      try {
        const callbackUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/diarization-callback`;
        
        const diarizeForm = new FormData();
        diarizeForm.append('audio', audioFile);
        diarizeForm.append('callback_url', callbackUrl);
        diarizeForm.append('num_speakers', '2');
        diarizeForm.append('chunk_index', chunkIndex.toString());

        const diarizeResponse = await fetch(
          `${PYANNOTE_SERVER}/diarize/${sessionId}`,
          {
            method: 'POST',
            headers: {
              'X-API-Key': PYANNOTE_API_KEY,
            },
            body: diarizeForm,
          }
        );

        if (diarizeResponse.ok) {
          diarizationTriggered = true;
          
          // セッションの話者分離ステータスを更新
          await supabase
            .from('sessions')
            .update({ diarization_status: 'processing' })
            .eq('id', sessionId);
        } else {
          console.error('Diarization trigger failed:', await diarizeResponse.text());
        }
      } catch (diarizeError) {
        console.error('Diarization error:', diarizeError);
        // 話者分離失敗は致命的エラーとしない
      }
    }

    return corsResponse({
      data: {
        transcriptId: transcript.id,
        audioUrl,
        diarizationTriggered,
      },
    }, 200);

  } catch (error) {
    console.error('Unexpected error:', error);
    return errorResponse('SYS_001', 'システムエラーが発生しました', 500);
  }
});

function corsResponse(body: unknown, status: number) {
  return new Response(
    body ? JSON.stringify(body) : null,
    {
      status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, content-type',
      },
    }
  );
}

function errorResponse(code: string, message: string, status: number) {
  return corsResponse({ error: { code, message } }, status);
}
```

---

#### 3.3.3 diarization-callback

**エンドポイント**: `POST /functions/v1/diarization-callback`

**説明**: pyannoteサーバーからの話者分離結果を受信し、分析をトリガー

**リクエスト**:

```typescript
interface DiarizationCallbackRequest {
  session_id: string;
  chunk_index: number;
  status: 'completed' | 'failed';
  segments?: Array<{
    speaker: 'SPEAKER_00' | 'SPEAKER_01';
    start: number;
    end: number;
  }>;
  error?: string;
}
```

**レスポンス**:

```typescript
// 200 OK
interface DiarizationCallbackResponse {
  data: {
    processed: boolean;
    segmentCount: number;
    analysisTriggered: boolean;
  };
}
```

**実装**:

```typescript
// supabase/functions/diarization-callback/index.ts

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPECTED_API_KEY = Deno.env.get('PYANNOTE_CALLBACK_SECRET');

serve(async (req: Request) => {
  try {
    // API Keyによる認証（内部呼び出し用）
    const apiKey = req.headers.get('X-Callback-Secret');
    if (apiKey !== EXPECTED_API_KEY) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!  // Service Role Key使用
    );

    const body = await req.json();
    const { session_id, chunk_index, status, segments, error } = body;

    if (status === 'failed') {
      console.error(`Diarization failed for session ${session_id}:`, error);
      
      await supabase
        .from('sessions')
        .update({ diarization_status: 'failed' })
        .eq('id', session_id);
      
      return new Response(
        JSON.stringify({ data: { processed: false, segmentCount: 0, analysisTriggered: false } }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 話者セグメントを保存
    // 最初のセグメントのspeakerをstylistとする（美容師が先に話しかける想定）
    const firstSpeaker = segments[0]?.speaker || 'SPEAKER_00';
    
    const speakerSegments = segments.map((segment: any) => ({
      session_id,
      speaker: segment.speaker === firstSpeaker ? 'stylist' : 'customer',
      start_time: segment.start,
      end_time: segment.end,
      confidence: segment.confidence || null,
    }));

    const { data: insertedSegments, error: insertError } = await supabase
      .from('speaker_segments')
      .insert(speakerSegments)
      .select();

    if (insertError) {
      console.error('Insert error:', insertError);
      throw insertError;
    }

    // 文字起こしを取得してセグメントにマッチング
    const { data: transcripts } = await supabase
      .from('transcripts')
      .select('*')
      .eq('session_id', session_id)
      .eq('chunk_index', chunk_index);

    // テキストをセグメントに割り当て
    if (transcripts && transcripts.length > 0) {
      const fullText = transcripts[0].text;
      // 簡易的な割り当て（時間比率で分割）
      // 実際には音声認識結果のタイムスタンプを使用
    }

    // 分析をトリガー
    let analysisTriggered = false;
    try {
      const analyzeResponse = await fetch(
        `${Deno.env.get('SUPABASE_URL')}/functions/v1/analyze-segment`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionId: session_id,
            chunkIndex: chunk_index,
          }),
        }
      );
      
      if (analyzeResponse.ok) {
        analysisTriggered = true;
      }
    } catch (analyzeError) {
      console.error('Analyze trigger error:', analyzeError);
    }

    // セッションの話者分離ステータスを更新
    await supabase
      .from('sessions')
      .update({ diarization_status: 'completed' })
      .eq('id', session_id);

    return new Response(
      JSON.stringify({
        data: {
          processed: true,
          segmentCount: insertedSegments?.length || 0,
          analysisTriggered,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Callback error:', error);
    return new Response(
      JSON.stringify({ error: { message: 'Internal error' } }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
```

---

#### 3.3.4 analyze-segment

**エンドポイント**: `POST /functions/v1/analyze-segment`

**説明**: 話者分離済みのセグメントをAI分析し、7指標を計算

**リクエスト**:

```typescript
interface AnalyzeSegmentRequest {
  sessionId: string;
  chunkIndex: number;
}
```

**レスポンス**:

```typescript
// 200 OK
interface AnalyzeSegmentResponse {
  data: {
    overallScore: number;
    indicators: {
      talk_ratio: { score: number; value: number };
      question_analysis: { score: number; value: number };
      emotion_analysis: { score: number; value: number };
      concern_keywords: { score: number; value: number };
      proposal_timing: { score: number; value: number };
      proposal_quality: { score: number; value: number };
      conversion: { score: number; value: number };
    };
    concernsDetected: string[];
    notificationRequired: boolean;
  };
}
```

**実装**:

```typescript
// supabase/functions/analyze-segment/index.ts

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');

serve(async (req: Request) => {
  try {
    const authHeader = req.headers.get('Authorization');
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { sessionId, chunkIndex } = await req.json();

    // セッション取得
    const { data: session } = await supabase
      .from('sessions')
      .select('*, salons(*)')
      .eq('id', sessionId)
      .single();

    if (!session) {
      return errorResponse('SES_001', 'セッションが見つかりません', 404);
    }

    // 話者セグメント取得
    const { data: segments } = await supabase
      .from('speaker_segments')
      .select('*')
      .eq('session_id', sessionId)
      .order('start_time');

    // 文字起こし取得
    const { data: transcripts } = await supabase
      .from('transcripts')
      .select('*')
      .eq('session_id', sessionId)
      .order('chunk_index');

    // テキストと話者をマージ
    const conversationData = mergeTranscriptsWithSpeakers(transcripts || [], segments || []);

    // 分析実行（並列処理）
    const [
      talkRatio,
      questionAnalysis,
      emotionAnalysis,
      concernKeywords,
      proposalTiming,
      proposalQuality,
      conversion,
    ] = await Promise.all([
      analyzeTalkRatio(segments || []),
      analyzeQuestions(conversationData),
      analyzeEmotion(conversationData),
      detectConcerns(conversationData, session.salons.settings.analysis.concernKeywords),
      analyzeProposalTiming(conversationData),
      analyzeProposalQuality(conversationData),
      detectConversion(conversationData),
    ]);

    // 分析結果を保存
    const analyses = [
      { ...talkRatio, indicatorType: 'talk_ratio' },
      { ...questionAnalysis, indicatorType: 'question_analysis' },
      { ...emotionAnalysis, indicatorType: 'emotion_analysis' },
      { ...concernKeywords, indicatorType: 'concern_keywords' },
      { ...proposalTiming, indicatorType: 'proposal_timing' },
      { ...proposalQuality, indicatorType: 'proposal_quality' },
      { ...conversion, indicatorType: 'conversion' },
    ];

    const insertData = analyses.map(a => ({
      session_id: sessionId,
      chunk_index: chunkIndex,
      indicator_type: a.indicatorType,
      value: a.value,
      score: a.score,
      details: a.details,
    }));

    await supabase.from('session_analyses').insert(insertData);

    // 総合スコア計算
    const overallScore = calculateOverallScore(analyses);

    // Realtimeでブロードキャスト
    await supabase
      .channel(`session:${sessionId}`)
      .send({
        type: 'broadcast',
        event: 'analysis',
        payload: {
          chunkIndex,
          overallScore,
          indicators: {
            talk_ratio: { score: talkRatio.score, value: talkRatio.value },
            question_analysis: { score: questionAnalysis.score, value: questionAnalysis.value },
            emotion_analysis: { score: emotionAnalysis.score, value: emotionAnalysis.value },
            concern_keywords: { score: concernKeywords.score, value: concernKeywords.value },
            proposal_timing: { score: proposalTiming.score, value: proposalTiming.value },
            proposal_quality: { score: proposalQuality.score, value: proposalQuality.value },
            conversion: { score: conversion.score, value: conversion.value },
          },
        },
      });

    // 悩みキーワード検出時は成功事例検索をトリガー
    let notificationRequired = false;
    if (concernKeywords.details.detected && concernKeywords.details.detectedKeywords?.length > 0) {
      notificationRequired = true;
      
      // 成功事例検索をトリガー
      await fetch(
        `${Deno.env.get('SUPABASE_URL')}/functions/v1/search-cases`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionId,
            concernKeywords: concernKeywords.details.detectedKeywords,
            customerInfo: session.customer_info,
          }),
        }
      );
    }

    return new Response(
      JSON.stringify({
        data: {
          overallScore,
          indicators: {
            talk_ratio: { score: talkRatio.score, value: talkRatio.value },
            question_analysis: { score: questionAnalysis.score, value: questionAnalysis.value },
            emotion_analysis: { score: emotionAnalysis.score, value: emotionAnalysis.value },
            concern_keywords: { score: concernKeywords.score, value: concernKeywords.value },
            proposal_timing: { score: proposalTiming.score, value: proposalTiming.value },
            proposal_quality: { score: proposalQuality.score, value: proposalQuality.value },
            conversion: { score: conversion.score, value: conversion.value },
          },
          concernsDetected: concernKeywords.details.detectedKeywords || [],
          notificationRequired,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Analysis error:', error);
    return errorResponse('SYS_001', 'システムエラーが発生しました', 500);
  }
});

// 分析関数（詳細実装はPart 6のアルゴリズム詳細設計を参照）

function analyzeTalkRatio(segments: any[]) {
  let stylistTime = 0;
  let customerTime = 0;

  for (const segment of segments) {
    const duration = segment.end_time - segment.start_time;
    if (segment.speaker === 'stylist') {
      stylistTime += duration;
    } else if (segment.speaker === 'customer') {
      customerTime += duration;
    }
  }

  const totalTime = stylistTime + customerTime;
  const ratio = totalTime > 0 ? (stylistTime / totalTime) * 100 : 50;

  let score = 60;
  if (ratio >= 35 && ratio <= 45) score = 100;
  else if (ratio >= 30 && ratio <= 50) score = 80;
  else if (ratio >= 25 && ratio <= 55) score = 60;
  else score = 40;

  return {
    value: ratio,
    score,
    details: {
      stylistSeconds: stylistTime,
      customerSeconds: customerTime,
      totalSeconds: totalTime,
      ratio,
    },
  };
}

async function analyzeQuestions(conversationData: any[]) {
  // ローカル処理: 質問パターン検出
  const questionPatterns = [
    /[？?]$/,
    /^(どう|何|いつ|どこ|誰|なぜ|どれ|どの)/,
    /でしょうか/,
    /ますか/,
    /ですか/,
  ];

  const stylistUtterances = conversationData.filter(d => d.speaker === 'stylist');
  let totalQuestions = 0;
  let openQuestions = 0;
  const questionList: any[] = [];

  const openPatterns = [
    /^(どう|どのよう|何が|どんな)/,
    /について/,
    /感じ/,
  ];

  for (const utterance of stylistUtterances) {
    const isQuestion = questionPatterns.some(p => p.test(utterance.text));
    if (isQuestion) {
      totalQuestions++;
      const isOpen = openPatterns.some(p => p.test(utterance.text));
      if (isOpen) openQuestions++;
      questionList.push({
        text: utterance.text,
        type: isOpen ? 'open' : 'closed',
        time: utterance.startTime,
      });
    }
  }

  const openRatio = totalQuestions > 0 ? (openQuestions / totalQuestions) * 100 : 0;

  let score = 40;
  if (totalQuestions >= 8 && totalQuestions <= 12 && openRatio >= 60) score = 100;
  else if (totalQuestions >= 6 && totalQuestions <= 14 && openRatio >= 50) score = 80;
  else if (totalQuestions >= 4 && totalQuestions <= 16 && openRatio >= 40) score = 60;

  return {
    value: totalQuestions,
    score,
    details: {
      totalQuestions,
      openQuestions,
      closedQuestions: totalQuestions - openQuestions,
      openRatio,
      questionList,
    },
  };
}

async function analyzeEmotion(conversationData: any[]) {
  // Claude APIを使用した感情分析
  const customerUtterances = conversationData
    .filter(d => d.speaker === 'customer')
    .map(d => d.text)
    .join('\n');

  if (!customerUtterances) {
    return { value: 50, score: 50, details: { positiveRatio: 50, keywords: [], overall: 'neutral' } };
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `以下のお客様の発話を感情分析してください。

発話:
${customerUtterances}

JSONで回答してください:
{
  "positiveRatio": 0-100の数値,
  "keywords": ["ポジティブまたはネガティブなキーワード"],
  "overall": "positive" | "neutral" | "negative"
}`,
      }],
    }),
  });

  const result = await response.json();
  const analysisText = result.content[0].text;
  
  try {
    const analysis = JSON.parse(analysisText);
    let score = 50;
    if (analysis.positiveRatio >= 70) score = 100;
    else if (analysis.positiveRatio >= 60) score = 80;
    else if (analysis.positiveRatio >= 50) score = 60;
    else score = 40;

    return {
      value: analysis.positiveRatio,
      score,
      details: analysis,
    };
  } catch {
    return { value: 50, score: 50, details: { positiveRatio: 50, keywords: [], overall: 'neutral' } };
  }
}

async function detectConcerns(conversationData: any[], concernKeywords: string[]) {
  const customerText = conversationData
    .filter(d => d.speaker === 'customer')
    .map(d => d.text)
    .join(' ');

  const detected: string[] = [];
  const detectedAt: number[] = [];

  for (const keyword of concernKeywords) {
    if (customerText.includes(keyword)) {
      detected.push(keyword);
      // 検出時刻を特定
      const match = conversationData.find(
        d => d.speaker === 'customer' && d.text.includes(keyword)
      );
      if (match) detectedAt.push(match.startTime);
    }
  }

  return {
    value: detected.length > 0 ? 1 : 0,
    score: detected.length > 0 ? 100 : 50,
    details: {
      detected: detected.length > 0,
      detectedKeywords: detected,
      detectedAt,
      context: customerText.substring(0, 200),
    },
  };
}

async function analyzeProposalTiming(conversationData: any[]) {
  // 提案タイミング分析（詳細はPart 6参照）
  return {
    value: 0,
    score: 50,
    details: {
      concernDetectedAt: null,
      proposalAt: null,
      timingMinutes: null,
    },
  };
}

async function analyzeProposalQuality(conversationData: any[]) {
  // 提案品質分析（詳細はPart 6参照）
  return {
    value: 0,
    score: 50,
    details: {
      hasProposal: false,
      benefitRatio: 0,
      proposalDetails: [],
    },
  };
}

async function detectConversion(conversationData: any[]) {
  // 成約検出（詳細はPart 6参照）
  return {
    value: 0,
    score: 50,
    details: {
      converted: false,
      productName: null,
    },
  };
}

function calculateOverallScore(analyses: any[]) {
  const weights: Record<string, number> = {
    talk_ratio: 0.15,
    question_analysis: 0.15,
    emotion_analysis: 0.15,
    concern_keywords: 0.10,
    proposal_timing: 0.15,
    proposal_quality: 0.15,
    conversion: 0.15,
  };

  let totalScore = 0;
  for (const analysis of analyses) {
    totalScore += analysis.score * weights[analysis.indicatorType];
  }
  
  return Math.round(totalScore);
}

function mergeTranscriptsWithSpeakers(transcripts: any[], segments: any[]) {
  // 実装省略（Part 1のドメインサービス参照）
  return [];
}

function errorResponse(code: string, message: string, status: number) {
  return new Response(
    JSON.stringify({ error: { code, message } }),
    { status, headers: { 'Content-Type': 'application/json' } }
  );
}
```

---

#### 3.3.5 search-cases

**エンドポイント**: `POST /functions/v1/search-cases`

**説明**: 悩みキーワードに基づいて類似の成功事例を検索

**リクエスト**:

```typescript
interface SearchCasesRequest {
  sessionId: string;
  concernKeywords: string[];
  customerInfo?: {
    ageGroup?: string;
    gender?: string;
  };
}
```

**レスポンス**:

```typescript
// 200 OK
interface SearchCasesResponse {
  data: {
    cases: Array<{
      id: string;
      concernKeywords: string[];
      successfulTalk: string;
      keyTactics: string[];
      soldProduct: string | null;
      similarity: number;
    }>;
    notificationSent: boolean;
  };
}
```

**実装**:

```typescript
// supabase/functions/search-cases/index.ts

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

serve(async (req: Request) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { sessionId, concernKeywords, customerInfo } = await req.json();

    // セッション取得
    const { data: session } = await supabase
      .from('sessions')
      .select('salon_id')
      .eq('id', sessionId)
      .single();

    if (!session) {
      return errorResponse('SES_001', 'セッションが見つかりません', 404);
    }

    // 検索テキスト生成
    const searchText = generateSearchText(concernKeywords, customerInfo);

    // Embedding生成
    const embedding = await createEmbedding(searchText);

    // ベクトル検索（pgvector）
    const { data: cases, error: searchError } = await supabase.rpc(
      'search_success_cases',
      {
        query_embedding: embedding,
        match_threshold: 0.7,
        match_count: 5,
        salon_id: session.salon_id,
      }
    );

    if (searchError) {
      console.error('Search error:', searchError);
      // フォールバック: キーワード検索
      const { data: fallbackCases } = await supabase
        .from('success_cases')
        .select('*')
        .or(`salon_id.eq.${session.salon_id},is_public.eq.true`)
        .overlaps('concern_keywords', concernKeywords)
        .limit(5);

      return sendNotificationAndRespond(supabase, sessionId, fallbackCases || []);
    }

    return sendNotificationAndRespond(supabase, sessionId, cases || []);

  } catch (error) {
    console.error('Search cases error:', error);
    return errorResponse('SYS_001', 'システムエラーが発生しました', 500);
  }
});

async function createEmbedding(text: string): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text,
    }),
  });

  const result = await response.json();
  return result.data[0].embedding;
}

function generateSearchText(keywords: string[], customerInfo?: any): string {
  const parts = [`悩み: ${keywords.join(', ')}`];
  
  if (customerInfo?.ageGroup) {
    parts.push(`年代: ${customerInfo.ageGroup}`);
  }
  if (customerInfo?.gender) {
    parts.push(`性別: ${customerInfo.gender}`);
  }
  
  return parts.join('\n');
}

async function sendNotificationAndRespond(
  supabase: any,
  sessionId: string,
  cases: any[]
) {
  if (cases.length > 0) {
    // Realtimeで通知を送信
    await supabase
      .channel(`session:${sessionId}`)
      .send({
        type: 'broadcast',
        event: 'notification',
        payload: {
          type: 'proposal_chance',
          title: '🎯 提案チャンス！',
          message: `お客様が悩みを話しています`,
          recommendedProduct: cases[0].sold_product,
          successTalk: cases[0].successful_talk,
          keyTactics: cases[0].key_tactics,
        },
      });
  }

  return new Response(
    JSON.stringify({
      data: {
        cases: cases.map(c => ({
          id: c.id,
          concernKeywords: c.concern_keywords,
          successfulTalk: c.successful_talk,
          keyTactics: c.key_tactics,
          soldProduct: c.sold_product,
          similarity: c.similarity || null,
        })),
        notificationSent: cases.length > 0,
      },
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}

function errorResponse(code: string, message: string, status: number) {
  return new Response(
    JSON.stringify({ error: { code, message } }),
    { status, headers: { 'Content-Type': 'application/json' } }
  );
}
```

---

#### 3.3.6 generate-report

**エンドポイント**: `POST /functions/v1/generate-report`

**説明**: セッション終了時にAIレポートを生成

**リクエスト**:

```typescript
interface GenerateReportRequest {
  sessionId: string;
}
```

**レスポンス**:

```typescript
// 200 OK
interface GenerateReportResponse {
  data: {
    reportId: string;
    overallScore: number;
    goodPoints: string[];
    improvementPoints: string[];
    actionItems: string[];
    transcriptSummary: string;
    aiFeedback: string;
  };
}
```

**実装**:

```typescript
// supabase/functions/generate-report/index.ts

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');

serve(async (req: Request) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { sessionId } = await req.json();

    // セッション取得
    const { data: session } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (!session) {
      return errorResponse('SES_001', 'セッションが見つかりません', 404);
    }

    // 全分析結果を取得
    const { data: analyses } = await supabase
      .from('session_analyses')
      .select('*')
      .eq('session_id', sessionId)
      .order('chunk_index', { ascending: false });

    // 最新の分析結果を指標ごとに取得
    const latestAnalyses = new Map<string, any>();
    for (const analysis of analyses || []) {
      if (!latestAnalyses.has(analysis.indicator_type)) {
        latestAnalyses.set(analysis.indicator_type, analysis);
      }
    }

    // 文字起こし全文取得
    const { data: transcripts } = await supabase
      .from('transcripts')
      .select('text')
      .eq('session_id', sessionId)
      .order('chunk_index');

    const fullTranscript = transcripts?.map(t => t.text).join(' ') || '';

    // 総合スコア計算
    const overallScore = calculateOverallScore(latestAnalyses);

    // Claude APIでレポート生成
    const reportContent = await generateReportWithAI(
      fullTranscript,
      latestAnalyses,
      overallScore
    );

    // レポート保存
    const indicatorScores: Record<string, { score: number; value: number }> = {};
    for (const [type, analysis] of latestAnalyses) {
      indicatorScores[type] = {
        score: analysis.score,
        value: analysis.value,
      };
    }

    const { data: report, error: reportError } = await supabase
      .from('session_reports')
      .insert({
        session_id: sessionId,
        overall_score: overallScore,
        good_points: reportContent.goodPoints,
        improvement_points: reportContent.improvementPoints,
        action_items: reportContent.actionItems,
        transcript_summary: reportContent.transcriptSummary,
        ai_feedback: reportContent.aiFeedback,
        indicator_scores: indicatorScores,
      })
      .select()
      .single();

    if (reportError) {
      throw reportError;
    }

    // セッションステータスを完了に
    await supabase
      .from('sessions')
      .update({ status: 'completed', ended_at: new Date().toISOString() })
      .eq('id', sessionId);

    return new Response(
      JSON.stringify({
        data: {
          reportId: report.id,
          overallScore,
          goodPoints: reportContent.goodPoints,
          improvementPoints: reportContent.improvementPoints,
          actionItems: reportContent.actionItems,
          transcriptSummary: reportContent.transcriptSummary,
          aiFeedback: reportContent.aiFeedback,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Report generation error:', error);
    return errorResponse('SYS_001', 'システムエラーが発生しました', 500);
  }
});

async function generateReportWithAI(
  transcript: string,
  analyses: Map<string, any>,
  overallScore: number
) {
  const analysisData = Object.fromEntries(analyses);

  const prompt = `あなたは美容室のセッションアナリストです。以下の会話分析結果に基づいて、レポートを生成してください。

## 会話内容（一部）
${transcript.substring(0, 2000)}...

## 分析結果
- 総合スコア: ${overallScore}点
- トーク比率: ${analysisData.talk_ratio?.score || 'N/A'}点
- 質問分析: ${analysisData.question_analysis?.score || 'N/A'}点
- 感情分析: ${analysisData.emotion_analysis?.score || 'N/A'}点
- 悩み検出: ${analysisData.concern_keywords?.details?.detected ? '検出あり' : '検出なし'}
- 提案品質: ${analysisData.proposal_quality?.score || 'N/A'}点
- 成約: ${analysisData.conversion?.details?.converted ? 'あり' : 'なし'}

## 出力形式（JSON）
{
  "goodPoints": ["良かった点を2-3個"],
  "improvementPoints": ["改善ポイントを2-3個"],
  "actionItems": ["次回への具体的なアクションを3個"],
  "transcriptSummary": "会話の要約（100文字程度）",
  "aiFeedback": "総合的なフィードバック（200文字程度）"
}`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  const result = await response.json();
  const content = result.content[0].text;

  try {
    return JSON.parse(content);
  } catch {
    // パース失敗時のフォールバック
    return {
      goodPoints: ['お客様との会話を行いました'],
      improvementPoints: ['分析データを確認してください'],
      actionItems: ['次回のセッションで改善を意識しましょう'],
      transcriptSummary: '会話が行われました',
      aiFeedback: 'レポート生成中にエラーが発生しました。',
    };
  }
}

function calculateOverallScore(analyses: Map<string, any>): number {
  const weights: Record<string, number> = {
    talk_ratio: 0.15,
    question_analysis: 0.15,
    emotion_analysis: 0.15,
    concern_keywords: 0.10,
    proposal_timing: 0.15,
    proposal_quality: 0.15,
    conversion: 0.15,
  };

  let totalScore = 0;
  let totalWeight = 0;

  for (const [type, analysis] of analyses) {
    if (weights[type]) {
      totalScore += analysis.score * weights[type];
      totalWeight += weights[type];
    }
  }

  return totalWeight > 0 ? Math.round(totalScore / totalWeight * 100) / 100 : 0;
}

function errorResponse(code: string, message: string, status: number) {
  return new Response(
    JSON.stringify({ error: { code, message } }),
    { status, headers: { 'Content-Type': 'application/json' } }
  );
}
```

---

#### 3.3.7 roleplay-chat

**エンドポイント**: `POST /functions/v1/roleplay-chat`

**説明**: AIロールプレイでお客様役の応答を生成

**リクエスト**:

```typescript
interface RoleplayChatRequest {
  scenarioId: string;
  conversationHistory: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  userMessage: string;
}
```

**レスポンス**:

```typescript
// 200 OK
interface RoleplayChatResponse {
  data: {
    response: string;
    evaluation?: {
      score: number;
      feedback: string;
    };
    isComplete: boolean;
  };
}
```

---

### 3.4 データベース関数（RPC）

#### 3.4.1 search_success_cases

```sql
-- ベクトル類似検索関数
CREATE OR REPLACE FUNCTION search_success_cases(
  query_embedding VECTOR(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5,
  salon_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  concern_keywords TEXT[],
  successful_talk TEXT,
  key_tactics TEXT[],
  sold_product VARCHAR,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    sc.id,
    sc.concern_keywords,
    sc.successful_talk,
    sc.key_tactics,
    sc.sold_product,
    1 - (sc.embedding <=> query_embedding) AS similarity
  FROM success_cases sc
  WHERE
    sc.embedding IS NOT NULL
    AND (sc.is_public = true OR sc.salon_id = search_success_cases.salon_id)
    AND 1 - (sc.embedding <=> query_embedding) > match_threshold
  ORDER BY sc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

#### 3.4.2 get_staff_statistics

```sql
-- スタッフ統計取得関数
CREATE OR REPLACE FUNCTION get_staff_statistics(
  staff_id UUID,
  start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  total_sessions BIGINT,
  avg_score NUMERIC,
  conversion_rate NUMERIC,
  total_duration_minutes BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(s.id) AS total_sessions,
    COALESCE(AVG(sr.overall_score), 0) AS avg_score,
    COALESCE(
      SUM(CASE WHEN sa.details->>'converted' = 'true' THEN 1 ELSE 0 END)::NUMERIC / 
      NULLIF(COUNT(DISTINCT s.id), 0),
      0
    ) AS conversion_rate,
    COALESCE(
      SUM(EXTRACT(EPOCH FROM (s.ended_at - s.started_at)) / 60)::BIGINT,
      0
    ) AS total_duration_minutes
  FROM sessions s
  LEFT JOIN session_reports sr ON sr.session_id = s.id
  LEFT JOIN session_analyses sa ON sa.session_id = s.id AND sa.indicator_type = 'conversion'
  WHERE
    s.stylist_id = get_staff_statistics.staff_id
    AND s.status = 'completed'
    AND s.started_at >= start_date
    AND s.started_at <= end_date
  GROUP BY s.stylist_id;
END;
$$;
```

---

（続きは Part 3 に記載: シーケンス図詳細、状態遷移設計）
# 詳細設計書 Part 3: シーケンス図詳細・状態遷移設計

---
