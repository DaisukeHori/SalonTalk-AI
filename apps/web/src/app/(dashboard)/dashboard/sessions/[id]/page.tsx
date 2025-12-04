'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Progress,
  Badge,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui';
import {
  ArrowLeft,
  Clock,
  MessageSquare,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  User,
  Calendar,
} from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

interface MetricData {
  score: number;
  details: string;
}

interface SessionDetail {
  id: string;
  stylistName: string;
  stylistId: string;
  startedAt: string;
  endedAt: string;
  duration: number;
  status: 'completed' | 'processing' | 'error';
  customerInfo: {
    ageGroup: string;
    gender: string;
    visitType: string;
  };
  overallScore: number;
  metrics: {
    talkRatio: MetricData & { stylistRatio: number; customerRatio: number };
    questionQuality: MetricData & { openCount: number; closedCount: number };
    emotion: MetricData & { positiveRatio: number };
    concernKeywords: MetricData & { keywords: string[] };
    proposalTiming: MetricData;
    proposalQuality: MetricData & { matchRate: number };
    conversion: MetricData & { isConverted: boolean };
  };
  transcript: Array<{
    speaker: 'stylist' | 'customer';
    text: string;
    timestamp: number;
  }>;
  improvements: string[];
  strengths: string[];
}

const METRIC_LABELS: Record<string, { label: string; icon: string }> = {
  talkRatio: { label: 'トーク比率', icon: '💬' },
  questionQuality: { label: '質問の質', icon: '❓' },
  emotion: { label: '感情分析', icon: '😊' },
  concernKeywords: { label: '悩みキーワード', icon: '🔍' },
  proposalTiming: { label: '提案タイミング', icon: '⏱️' },
  proposalQuality: { label: '提案の質', icon: '💡' },
  conversion: { label: '成約判定', icon: '✅' },
};

function ScoreRing({ score, size = 120 }: { score: number; size?: number }) {
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  const color =
    score >= 80 ? '#22c55e' : score >= 60 ? '#3b82f6' : '#f97316';

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r="45"
          stroke="#e5e7eb"
          strokeWidth="8"
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r="45"
          stroke={color}
          strokeWidth="8"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold" style={{ color }}>
          {score}
        </span>
        <span className="text-sm text-gray-500">点</span>
      </div>
    </div>
  );
}

function MetricBar({
  label,
  score,
  details,
  icon,
}: {
  label: string;
  score: number;
  details: string;
  icon: string;
}) {
  const color =
    score >= 80
      ? 'bg-green-500'
      : score >= 60
      ? 'bg-blue-500'
      : 'bg-orange-500';

  return (
    <div className="p-4 border rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span>{icon}</span>
          <span className="font-medium">{label}</span>
        </div>
        <Badge variant={score >= 80 ? 'default' : score >= 60 ? 'secondary' : 'destructive'}>
          {score}点
        </Badge>
      </div>
      <Progress value={score} className="h-2 mb-2" />
      <p className="text-sm text-gray-500">{details}</p>
    </div>
  );
}

function TranscriptMessage({
  speaker,
  text,
  timestamp,
}: {
  speaker: 'stylist' | 'customer';
  text: string;
  timestamp: number;
}) {
  const isStylist = speaker === 'stylist';
  const minutes = Math.floor(timestamp / 60);
  const seconds = Math.floor(timestamp % 60);

  return (
    <div className={`flex gap-3 ${isStylist ? 'flex-row-reverse' : ''}`}>
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center ${
          isStylist ? 'bg-blue-100' : 'bg-gray-100'
        }`}
      >
        {isStylist ? '✂️' : '👤'}
      </div>
      <div className={`flex-1 max-w-[70%] ${isStylist ? 'text-right' : ''}`}>
        <div
          className={`inline-block rounded-lg px-4 py-2 ${
            isStylist ? 'bg-blue-100 text-blue-900' : 'bg-gray-100 text-gray-900'
          }`}
        >
          {text}
        </div>
        <p className="text-xs text-gray-400 mt-1">
          {isStylist ? '美容師' : 'お客様'} • {minutes}:{seconds.toString().padStart(2, '0')}
        </p>
      </div>
    </div>
  );
}

export default function SessionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSessionData() {
      if (!params.id) {
        setLoading(false);
        return;
      }

      try {
        const supabase = getSupabaseBrowserClient();

        // Fetch session with staff info
        const { data: sessionData, error: sessionError } = await supabase
          .from('sessions')
          .select(`
            *,
            staffs (id, name)
          `)
          .eq('id', params.id)
          .single();

        if (sessionError || !sessionData) {
          console.error('Failed to fetch session:', sessionError);
          setLoading(false);
          return;
        }

        // Fetch report for this session
        const { data: reportData } = await supabase
          .from('session_reports')
          .select('*')
          .eq('session_id', params.id)
          .single();

        // Fetch transcript segments
        const { data: segments } = await supabase
          .from('speaker_segments')
          .select('*')
          .eq('session_id', params.id)
          .order('start_time_ms', { ascending: true });

        const metrics = reportData?.metrics || {};
        const customerInfo = sessionData.customer_info || {};
        const durationMs = sessionData.total_duration_ms || 0;

        setSession({
          id: sessionData.id,
          stylistName: sessionData.staffs?.name || '不明',
          stylistId: sessionData.stylist_id,
          startedAt: sessionData.started_at,
          endedAt: sessionData.ended_at || sessionData.started_at,
          duration: Math.round(durationMs / 60000),
          status: sessionData.status as 'completed' | 'processing' | 'error',
          customerInfo: {
            ageGroup: customerInfo.age_group || '不明',
            gender: customerInfo.gender === 'male' ? '男性' : customerInfo.gender === 'female' ? '女性' : '不明',
            visitType: customerInfo.visit_frequency === 'first' ? '新規' : 'リピーター',
          },
          overallScore: reportData?.overall_score || 0,
          metrics: {
            talkRatio: {
              score: metrics.talk_ratio?.score || 0,
              stylistRatio: metrics.talk_ratio?.stylist_ratio || 50,
              customerRatio: metrics.talk_ratio?.customer_ratio || 50,
              details: metrics.talk_ratio?.details || '',
            },
            questionQuality: {
              score: metrics.question_analysis?.score || 0,
              openCount: metrics.question_analysis?.open_count || 0,
              closedCount: metrics.question_analysis?.closed_count || 0,
              details: metrics.question_analysis?.details || '',
            },
            emotion: {
              score: metrics.emotion_analysis?.score || 0,
              positiveRatio: metrics.emotion_analysis?.positive_ratio || 0,
              details: metrics.emotion_analysis?.details || '',
            },
            concernKeywords: {
              score: metrics.concern_keywords?.score || 0,
              keywords: metrics.concern_keywords?.keywords || [],
              details: metrics.concern_keywords?.details || '',
            },
            proposalTiming: {
              score: metrics.proposal_timing?.score || 0,
              details: metrics.proposal_timing?.details || '',
            },
            proposalQuality: {
              score: metrics.proposal_quality?.score || 0,
              matchRate: metrics.proposal_quality?.match_rate || 0,
              details: metrics.proposal_quality?.details || '',
            },
            conversion: {
              score: metrics.conversion?.score || 0,
              isConverted: metrics.conversion?.is_converted || false,
              details: metrics.conversion?.details || '',
            },
          },
          transcript: (segments || []).map((seg: any) => ({
            speaker: seg.speaker as 'stylist' | 'customer',
            text: seg.text,
            timestamp: Math.round(seg.start_time_ms / 1000),
          })),
          improvements: reportData?.improvement_points || [],
          strengths: reportData?.good_points || [],
        });
      } catch (error) {
        console.error('Failed to fetch session data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchSessionData();
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">読み込み中...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">セッションが見つかりません</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">セッション詳細</h1>
            <p className="text-gray-500">
              {new Date(session.startedAt).toLocaleDateString('ja-JP')} •{' '}
              {session.stylistName}
            </p>
          </div>
        </div>
        <Badge
          variant={
            session.metrics.conversion.isConverted ? 'default' : 'secondary'
          }
        >
          {session.metrics.conversion.isConverted ? '成約' : '未成約'}
        </Badge>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">施術時間</p>
                <p className="text-lg font-semibold">{session.duration}分</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">お客様</p>
                <p className="text-lg font-semibold">
                  {session.customerInfo.ageGroup} {session.customerInfo.gender}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">来店タイプ</p>
                <p className="text-lg font-semibold">{session.customerInfo.visitType}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">検出キーワード</p>
                <p className="text-lg font-semibold">
                  {session.metrics.concernKeywords.keywords.length}個
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Score & Feedback */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>総合スコア</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <ScoreRing score={session.overallScore} />

            <div className="w-full mt-6 space-y-4">
              <div className="bg-green-50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="font-medium text-green-800">良かった点</span>
                </div>
                <ul className="text-sm text-green-700 space-y-1">
                  {session.strengths.map((s, i) => (
                    <li key={i}>• {s}</li>
                  ))}
                </ul>
              </div>

              <div className="bg-orange-50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-4 w-4 text-orange-600" />
                  <span className="font-medium text-orange-800">改善点</span>
                </div>
                <ul className="text-sm text-orange-700 space-y-1">
                  {session.improvements.map((s, i) => (
                    <li key={i}>• {s}</li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Detailed Analysis */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>詳細分析</CardTitle>
            <CardDescription>7つの指標による分析結果</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="metrics">
              <TabsList className="mb-4">
                <TabsTrigger value="metrics">指標</TabsTrigger>
                <TabsTrigger value="transcript">会話ログ</TabsTrigger>
              </TabsList>

              <TabsContent value="metrics" className="space-y-4">
                {Object.entries(session.metrics).map(([key, value]) => (
                  <MetricBar
                    key={key}
                    label={METRIC_LABELS[key]?.label || key}
                    score={value.score}
                    details={value.details}
                    icon={METRIC_LABELS[key]?.icon || '📊'}
                  />
                ))}
              </TabsContent>

              <TabsContent value="transcript" className="space-y-4 max-h-[600px] overflow-y-auto">
                {session.transcript.map((msg, index) => (
                  <TranscriptMessage
                    key={index}
                    speaker={msg.speaker}
                    text={msg.text}
                    timestamp={msg.timestamp}
                  />
                ))}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Keywords Section */}
      <Card>
        <CardHeader>
          <CardTitle>検出された悩みキーワード</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {session.metrics.concernKeywords.keywords.map((keyword, index) => (
              <Badge key={index} variant="outline" className="text-base px-3 py-1">
                {keyword}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
