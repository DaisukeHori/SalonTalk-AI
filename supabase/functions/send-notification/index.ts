/**
 * Send Notification Edge Function
 * POST /send-notification
 *
 * Sends push notifications to mobile devices via Expo Push API
 * Supports various notification types for session alerts and training reminders
 */
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { handleCors } from '../_shared/cors.ts';
import { createSupabaseClient, createSupabaseAdminClient, getUser, getStaff } from '../_shared/supabase.ts';
import { jsonResponse, errorResponse, unauthorizedResponse } from '../_shared/response.ts';

interface SendNotificationRequest {
  type: 'session_complete' | 'training_reminder' | 'score_alert' | 'success_case' | 'custom';
  recipientId?: string; // Staff ID
  recipientIds?: string[]; // Multiple staff IDs
  title?: string;
  body?: string;
  data?: Record<string, unknown>;
}

interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default' | null;
  badge?: number;
  priority?: 'default' | 'normal' | 'high';
  channelId?: string;
}

interface ExpoPushTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: Record<string, unknown>;
}

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

const NOTIFICATION_TEMPLATES: Record<string, { title: string; body: string }> = {
  session_complete: {
    title: 'セッション完了',
    body: '接客セッションの分析が完了しました。レポートを確認してください。',
  },
  training_reminder: {
    title: 'トレーニングリマインダー',
    body: '今日のトレーニングがまだ完了していません。スキルアップのために練習しましょう！',
  },
  score_alert: {
    title: 'スコアアラート',
    body: '高スコアを記録しました！詳細を確認してください。',
  },
  success_case: {
    title: '成功事例が見つかりました',
    body: '類似の悩みに対する成功事例があります。参考にしてください。',
  },
};

/**
 * Get push tokens for staff members
 */
async function getPushTokens(
  supabase: ReturnType<typeof createSupabaseClient>,
  staffIds: string[]
): Promise<Map<string, string[]>> {
  const tokenMap = new Map<string, string[]>();

  const { data: tokens, error } = await supabase
    .from('push_tokens')
    .select('staff_id, token, platform')
    .in('staff_id', staffIds)
    .eq('is_active', true);

  if (error || !tokens) {
    console.error('Failed to fetch push tokens:', error);
    return tokenMap;
  }

  for (const token of tokens) {
    const existing = tokenMap.get(token.staff_id) || [];
    existing.push(token.token);
    tokenMap.set(token.staff_id, existing);
  }

  return tokenMap;
}

/**
 * Send push notifications via Expo Push API
 */
async function sendPushNotifications(
  messages: ExpoPushMessage[]
): Promise<ExpoPushTicket[]> {
  if (messages.length === 0) {
    return [];
  }

  // Expo accepts up to 100 messages per request
  const chunks: ExpoPushMessage[][] = [];
  for (let i = 0; i < messages.length; i += 100) {
    chunks.push(messages.slice(i, i + 100));
  }

  const tickets: ExpoPushTicket[] = [];

  for (const chunk of chunks) {
    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
      },
      body: JSON.stringify(chunk),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Expo Push API error:', error);
      continue;
    }

    const result = await response.json();
    if (result.data) {
      tickets.push(...result.data);
    }
  }

  return tickets;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const supabase = createSupabaseClient(req);
    const adminClient = createSupabaseAdminClient();

    // Verify authentication (allow service role for internal calls)
    const authHeader = req.headers.get('Authorization');
    const isServiceRole = authHeader?.includes(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '');

    if (!isServiceRole) {
      await getUser(supabase);
    }

    // Parse request body
    const body: SendNotificationRequest = await req.json();

    if (!body.type) {
      return errorResponse('VAL_001', 'type is required', 400);
    }

    // Get recipient IDs
    const recipientIds: string[] = [];
    if (body.recipientId) {
      recipientIds.push(body.recipientId);
    }
    if (body.recipientIds) {
      recipientIds.push(...body.recipientIds);
    }

    if (recipientIds.length === 0) {
      return errorResponse('VAL_001', 'recipientId or recipientIds is required', 400);
    }

    // Get notification content
    const template = NOTIFICATION_TEMPLATES[body.type];
    const title = body.title || template?.title || 'SalonTalk';
    const notificationBody = body.body || template?.body || '';

    // Get push tokens for recipients
    const tokenMap = await getPushTokens(adminClient, recipientIds);

    // Build push messages
    const messages: ExpoPushMessage[] = [];
    for (const [staffId, tokens] of tokenMap) {
      for (const token of tokens) {
        // Validate Expo push token format
        if (!token.startsWith('ExponentPushToken[') && !token.startsWith('ExpoPushToken[')) {
          continue;
        }

        messages.push({
          to: token,
          title,
          body: notificationBody,
          data: {
            ...body.data,
            type: body.type,
            staffId,
            timestamp: new Date().toISOString(),
          },
          sound: 'default',
          priority: 'high',
          channelId: 'default',
        });
      }
    }

    if (messages.length === 0) {
      return jsonResponse({
        success: false,
        message: 'No valid push tokens found for recipients',
        recipientCount: recipientIds.length,
        sentCount: 0,
      });
    }

    // Send notifications
    const tickets = await sendPushNotifications(messages);

    // Log notifications
    const notificationLogs = recipientIds.map((staffId) => ({
      staff_id: staffId,
      type: body.type,
      title,
      body: notificationBody,
      data: body.data,
      sent_at: new Date().toISOString(),
      status: tickets.some((t) => t.status === 'ok') ? 'sent' : 'failed',
    }));

    const { error: logError } = await adminClient
      .from('notification_logs')
      .insert(notificationLogs);

    if (logError) {
      console.error('Failed to log notifications:', logError);
    }

    // Count successful sends
    const successCount = tickets.filter((t) => t.status === 'ok').length;
    const failCount = tickets.filter((t) => t.status === 'error').length;

    return jsonResponse({
      success: successCount > 0,
      message: `Sent ${successCount} notification(s)`,
      recipientCount: recipientIds.length,
      sentCount: successCount,
      failedCount: failCount,
      tickets: tickets.map((t) => ({
        status: t.status,
        id: t.id,
        message: t.message,
      })),
    });
  } catch (error) {
    console.error('Error in send-notification:', error);

    if (error.message === 'Unauthorized') {
      return unauthorizedResponse();
    }

    return errorResponse('INTERNAL_ERROR', error.message, 500);
  }
});
