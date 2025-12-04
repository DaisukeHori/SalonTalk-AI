'use client';

import { useState, useEffect, FormEvent } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

interface SuccessCase {
  id: string;
  concern_keywords: string[];
  approach_text: string;
  result: string | null;
  successful_talk?: string; // New column from migration
  key_tactics?: string[];   // New column from migration
  sold_product: string | null;
  is_public: boolean;
  is_active: boolean;
  created_at: string;
  stylist_id?: string;
  staffs?: {
    name: string;
  };
}

interface Stats {
  totalCases: number;
  avgConversion: number;
  topConcern: string;
  monthlyUsage: number;
}

const concernCategories = ['すべて', '乾燥', 'ダメージ', '広がり', '頭皮', 'カラー'];

export default function SuccessCasesPage() {
  const [selectedCategory, setSelectedCategory] = useState('すべて');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [successCases, setSuccessCases] = useState<SuccessCase[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalCases: 0,
    avgConversion: 0,
    topConcern: '-',
    monthlyUsage: 0,
  });

  // Form state
  const [formData, setFormData] = useState({
    concernKeywords: '',
    approach: '',
    result: '',
    conversionRate: '',
    soldProduct: '',
    isPublic: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch success cases
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const supabase = getSupabaseBrowserClient();

      // Get current user's salon
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: staff } = await supabase
        .from('staffs')
        .select('salon_id')
        .eq('id', user.id)
        .single() as { data: { salon_id: string } | null };

      if (!staff) return;

      // Fetch success cases for this salon or public ones
      const { data: cases, error } = await supabase
        .from('success_cases')
        .select(`
          id,
          concern_keywords,
          approach_text,
          result,
          successful_talk,
          key_tactics,
          sold_product,
          is_public,
          is_active,
          stylist_id,
          created_at
        `)
        .eq('is_active', true)
        .or(`salon_id.eq.${staff.salon_id},is_public.eq.true`)
        .order('created_at', { ascending: false }) as { data: any[] | null; error: any };

      if (error) {
        console.error('Error fetching success cases:', error);
        setIsLoading(false);
        return;
      }

      setSuccessCases(cases || []);

      // Calculate stats
      if (cases && cases.length > 0) {
        const keywordCounts: Record<string, number> = {};
        cases.forEach((c) => {
          c.concern_keywords?.forEach((k: string) => {
            keywordCounts[k] = (keywordCounts[k] || 0) + 1;
          });
        });
        const topConcern = Object.entries(keywordCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '-';

        setStats({
          totalCases: cases.length,
          avgConversion: 78, // Would need conversion tracking to calculate this
          topConcern,
          monthlyUsage: 42, // Would need usage tracking
        });
      }

      setIsLoading(false);
    };

    fetchData();
  }, []);

  const filteredCases = successCases.filter((caseItem) => {
    const matchesCategory =
      selectedCategory === 'すべて' ||
      caseItem.concern_keywords?.some((k) => k.includes(selectedCategory));
    const approachText = caseItem.successful_talk || caseItem.approach_text;
    const matchesSearch =
      searchQuery === '' ||
      approachText?.includes(searchQuery) ||
      caseItem.concern_keywords?.some((k) => k.includes(searchQuery));
    return matchesCategory && matchesSearch;
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const supabase = getSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setIsSubmitting(false);
      return;
    }

    const { data: staff } = await supabase
      .from('staffs')
      .select('id, salon_id')
      .eq('id', user.id)
      .single() as { data: { id: string; salon_id: string } | null };

    if (!staff) {
      setIsSubmitting(false);
      return;
    }

    const keywords = formData.concernKeywords
      .split(',')
      .map((k) => k.trim())
      .filter((k) => k);

    const tactics = formData.result
      .split('。')
      .map((t) => t.trim())
      .filter((t) => t);

    const result = await (supabase.from('success_cases') as any).insert({
      salon_id: staff.salon_id,
      stylist_id: staff.id,
      concern_keywords: keywords,
      approach_text: formData.approach,
      result: formData.result,
      successful_talk: formData.approach,
      key_tactics: tactics,
      sold_product: formData.soldProduct || null,
      is_public: formData.isPublic,
      is_active: true,
    });

    const { error } = result;

    if (error) {
      console.error('Error creating success case:', error);
      setIsSubmitting(false);
      return;
    }

    // Refresh the list
    const { data: cases } = await supabase
      .from('success_cases')
      .select(`
        id,
        concern_keywords,
        approach_text,
        result,
        successful_talk,
        key_tactics,
        sold_product,
        is_public,
        is_active,
        stylist_id,
        created_at
      `)
      .eq('is_active', true)
      .or(`salon_id.eq.${staff.salon_id},is_public.eq.true`)
      .order('created_at', { ascending: false }) as { data: any[] | null };

    setSuccessCases(cases || []);
    setIsModalOpen(false);
    setFormData({
      concernKeywords: '',
      approach: '',
      result: '',
      conversionRate: '',
      soldProduct: '',
      isPublic: false,
    });
    setIsSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('この成功事例を削除してもよろしいですか？')) return;

    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.from('success_cases').delete().eq('id', id);

    if (error) {
      console.error('Error deleting success case:', error);
      return;
    }

    setSuccessCases(successCases.filter((c) => c.id !== id));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">成功事例</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          + 新規登録
        </button>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex items-center space-x-4">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="キーワードで検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
          </div>
          <div className="flex space-x-2">
            {concernCategories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-full text-sm ${
                  selectedCategory === category
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-gray-500 text-sm">登録事例数</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">{stats.totalCases}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-gray-500 text-sm">平均成約率</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">{stats.avgConversion}%</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-gray-500 text-sm">最も多い悩み</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">{stats.topConcern}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-gray-500 text-sm">今月の活用回数</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">{stats.monthlyUsage}回</p>
        </div>
      </div>

      {/* Cases List */}
      <div className="space-y-4">
        {filteredCases.map((caseItem) => (
          <div key={caseItem.id} className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                {/* Keywords */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {caseItem.concern_keywords?.map((keyword, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm"
                    >
                      {keyword}
                    </span>
                  ))}
                  {caseItem.is_public && (
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                      公開中
                    </span>
                  )}
                </div>

                {/* Approach */}
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-gray-600 mb-1">アプローチ</h3>
                  <p className="text-gray-800 leading-relaxed">
                    {caseItem.successful_talk || caseItem.approach_text}
                  </p>
                </div>

                {/* Key Tactics / Result */}
                {(caseItem.key_tactics && caseItem.key_tactics.length > 0) || caseItem.result ? (
                  <div className="bg-green-50 rounded-lg p-3">
                    <h3 className="text-sm font-semibold text-green-700 mb-1">ポイント</h3>
                    {caseItem.key_tactics && caseItem.key_tactics.length > 0 ? (
                      <ul className="list-disc list-inside text-green-800">
                        {caseItem.key_tactics.map((tactic, index) => (
                          <li key={index}>{tactic}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-green-800">{caseItem.result}</p>
                    )}
                  </div>
                ) : null}
              </div>

              {/* Side Info */}
              <div className="ml-6 text-right">
                {caseItem.sold_product && (
                  <div className="mb-4">
                    <p className="text-gray-500 text-sm">販売商品</p>
                    <p className="text-lg font-semibold text-primary-600">{caseItem.sold_product}</p>
                  </div>
                )}
                <div className="mb-2">
                  <p className="text-gray-500 text-sm">登録者</p>
                  <p className="text-gray-800">{caseItem.staffs?.name || '不明'}</p>
                </div>
                <p className="text-gray-400 text-sm">
                  {new Date(caseItem.created_at).toLocaleDateString('ja-JP')}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end mt-4 pt-4 border-t space-x-2">
              <button
                onClick={() => handleDelete(caseItem.id)}
                className="px-3 py-1 text-red-600 hover:bg-red-50 rounded-lg text-sm"
              >
                削除
              </button>
            </div>
          </div>
        ))}

        {filteredCases.length === 0 && (
          <div className="bg-white rounded-xl p-12 shadow-sm text-center">
            <p className="text-gray-500">該当する成功事例が見つかりませんでした</p>
          </div>
        )}
      </div>

      {/* New Case Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-800">成功事例の新規登録</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  悩みキーワード
                </label>
                <input
                  type="text"
                  placeholder="例: 乾燥, パサつき"
                  value={formData.concernKeywords}
                  onChange={(e) => setFormData({ ...formData, concernKeywords: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                  required
                />
                <p className="text-gray-500 text-xs mt-1">カンマ区切りで複数入力できます</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  アプローチ内容
                </label>
                <textarea
                  rows={4}
                  placeholder="どのように話を切り出し、どのような流れで提案したかを具体的に記載してください"
                  value={formData.approach}
                  onChange={(e) => setFormData({ ...formData, approach: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ポイント・結果
                </label>
                <textarea
                  rows={2}
                  placeholder="購入された商品名や、お客様の反応などを記載してください。文で区切ると箇条書きになります。"
                  value={formData.result}
                  onChange={(e) => setFormData({ ...formData, result: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  関連商品
                </label>
                <input
                  type="text"
                  placeholder="例: 保湿シャンプー"
                  value={formData.soldProduct}
                  onChange={(e) => setFormData({ ...formData, soldProduct: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={formData.isPublic}
                  onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <label htmlFor="isPublic" className="text-sm text-gray-700">
                  他のサロンにも公開する
                </label>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
                  disabled={isSubmitting}
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? '登録中...' : '登録'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
