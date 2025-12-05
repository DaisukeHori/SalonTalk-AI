'use client';

/**
 * ReportViewer Component
 * レポートビューアコンポーネント
 */
import Image from 'next/image';
import { Clock, User, MessageSquare, TrendingUp, AlertCircle, CheckCircle, XCircle } from 'lucide-react';

interface AnalysisMetric {
  name: string;
  score: number;
  maxScore: number;
  weight: number;
  feedback?: string;
}

interface ConcernKeyword {
  keyword: string;
  context: string;
  timestamp: string;
}

interface ProposalItem {
  product: string;
  timing: string;
  approach: string;
  result: 'success' | 'pending' | 'rejected';
}

interface SessionReport {
  id: string;
  staffName: string;
  staffAvatarUrl?: string;
  customerName?: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  overallScore: number;
  metrics: AnalysisMetric[];
  concerns: ConcernKeyword[];
  proposals: ProposalItem[];
  transcript?: string;
  improvements: string[];
  strengths: string[];
  converted: boolean;
}

interface ReportViewerProps {
  report: SessionReport;
  showTranscript?: boolean;
}

export function ReportViewer({ report, showTranscript = true }: ReportViewerProps) {
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'short',
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}時間${mins > 0 ? `${mins}分` : ''}`;
    }
    return `${mins}分`;
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-50 border-green-200';
    if (score >= 60) return 'bg-yellow-50 border-yellow-200';
    return 'bg-red-50 border-red-200';
  };

  const getResultIcon = (result: string) => {
    switch (result) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-yellow-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`rounded-xl border p-6 ${getScoreBgColor(report.overallScore)}`}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center flex-shrink-0 shadow-sm relative overflow-hidden">
              {report.staffAvatarUrl ? (
                <Image
                  src={report.staffAvatarUrl}
                  alt={report.staffName}
                  fill
                  sizes="64px"
                  className="rounded-full object-cover"
                />
              ) : (
                <span className="text-2xl text-indigo-600 font-medium">
                  {report.staffName.charAt(0)}
                </span>
              )}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{report.staffName}</h2>
              {report.customerName && (
                <p className="text-sm text-gray-600 flex items-center gap-1">
                  <User className="w-4 h-4" />
                  {report.customerName}様
                </p>
              )}
              <p className="text-sm text-gray-500 mt-1">
                {formatDate(report.startTime)} {formatTime(report.startTime)} - {formatTime(report.endTime)}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className={`text-4xl font-bold ${getScoreColor(report.overallScore)}`}>
              {report.overallScore}
            </p>
            <p className="text-sm text-gray-500">総合スコア</p>
            <div className="mt-2 flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-gray-400" />
              <span>{formatDuration(report.duration)}</span>
              {report.converted && (
                <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                  成約
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">評価詳細</h3>
        <div className="space-y-4">
          {report.metrics.map((metric, index) => (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">{metric.name}</span>
                <span className={`font-semibold ${getScoreColor((metric.score / metric.maxScore) * 100)}`}>
                  {metric.score} / {metric.maxScore}
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    (metric.score / metric.maxScore) >= 0.8
                      ? 'bg-green-500'
                      : (metric.score / metric.maxScore) >= 0.6
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                  }`}
                  style={{ width: `${(metric.score / metric.maxScore) * 100}%` }}
                />
              </div>
              {metric.feedback && (
                <p className="text-sm text-gray-600">{metric.feedback}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Concerns */}
      {report.concerns.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-pink-500" />
            検出された悩みキーワード
          </h3>
          <div className="space-y-3">
            {report.concerns.map((concern, index) => (
              <div key={index} className="p-3 bg-pink-50 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 bg-pink-200 text-pink-800 rounded text-sm font-medium">
                    {concern.keyword}
                  </span>
                  <span className="text-xs text-gray-500">{concern.timestamp}</span>
                </div>
                <p className="text-sm text-gray-700">&ldquo;{concern.context}&rdquo;</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Proposals */}
      {report.proposals.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">提案履歴</h3>
          <div className="space-y-3">
            {report.proposals.map((proposal, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                {getResultIcon(proposal.result)}
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{proposal.product}</p>
                  <p className="text-sm text-gray-600">{proposal.approach}</p>
                  <p className="text-xs text-gray-500 mt-1">{proposal.timing}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Improvements & Strengths */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Strengths */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-500" />
            良かった点
          </h3>
          <ul className="space-y-2">
            {report.strengths.map((strength, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                {strength}
              </li>
            ))}
          </ul>
        </div>

        {/* Improvements */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-500" />
            改善点
          </h3>
          <ul className="space-y-2">
            {report.improvements.map((improvement, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                <MessageSquare className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                {improvement}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Transcript */}
      {showTranscript && report.transcript && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">会話ログ</h3>
          <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
            <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">
              {report.transcript}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

export default ReportViewer;
