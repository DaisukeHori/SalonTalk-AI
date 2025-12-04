'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
    // TODO: Fetch session data from API
    // Mock data for now
    setSession({
      id: params.id as string,
      stylistName: '山田太郎',
      stylistId: 'staff-1',
      startedAt: '2024-12-04T14:00:00Z',
      endedAt: '2024-12-04T14:45:00Z',
      duration: 45,
      status: 'completed',
      customerInfo: {
        ageGroup: '30代',
        gender: '女性',
        visitType: 'リピーター',
      },
      overallScore: 78,
      metrics: {
        talkRatio: {
          score: 85,
          stylistRatio: 42,
          customerRatio: 58,
          details: '美容師42%・お客様58%と理想的な比率です',
        },
        questionQuality: {
          score: 70,
          openCount: 6,
          closedCount: 4,
          details: 'オープン質問6回・クローズド質問4回',
        },
        emotion: {
          score: 82,
          positiveRatio: 75,
          details: 'お客様のポジティブな反応が75%',
        },
        concernKeywords: {
          score: 90,
          keywords: ['乾燥', 'パサつき', '広がり'],
          details: '3つの悩みキーワードを検出',
        },
        proposalTiming: {
          score: 75,
          details: '悩み検出から4分後に提案',
        },
        proposalQuality: {
          score: 80,
          matchRate: 85,
          details: '悩みに対応した商品提案ができています',
        },
        conversion: {
          score: 0,
          isConverted: false,
          details: '今回は成約に至りませんでした',
        },
      },
      transcript: [
        { speaker: 'stylist', text: '今日はどのようにされますか？', timestamp: 0 },
        { speaker: 'customer', text: 'いつも通りのカットでお願いします', timestamp: 5 },
        {
          speaker: 'stylist',
          text: '最近、髪の調子はいかがですか？',
          timestamp: 30,
        },
        {
          speaker: 'customer',
          text: '実は最近、髪の乾燥が気になっていて...',
          timestamp: 45,
        },
        {
          speaker: 'stylist',
          text: 'どんな時に特に気になりますか？',
          timestamp: 60,
        },
        {
          speaker: 'customer',
          text: '朝起きた時とか、パサパサしていて広がるんですよね',
          timestamp: 75,
        },
        {
          speaker: 'stylist',
          text: 'なるほど、乾燥と広がりが気になるんですね。同じお悩みのお客様に人気のシャンプーがあるんですが...',
          timestamp: 120,
        },
      ],
      improvements: [
        'オープン質問をもう少し増やしましょう',
        '悩み検出から2-3分以内に提案するとより効果的です',
        '価格への異議に対する切り返しを準備しておきましょう',
      ],
      strengths: [
        'トーク比率が理想的で、お客様の話をしっかり聞けています',
        '複数の悩みキーワードを引き出せています',
        'お客様からポジティブな反応を得られています',
      ],
    });
    setLoading(false);
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
