'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getSalons, createSalon, Salon, Pagination } from '@/lib/admin/client';

export default function AdminSalonsPage() {
  const searchParams = useSearchParams();
  const [salons, setSalons] = useState<Salon[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [plan, setPlan] = useState('');
  const [page, setPage] = useState(1);

  // Create modal states
  const [showCreateModal, setShowCreateModal] = useState(searchParams.get('action') === 'create');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [newSalon, setNewSalon] = useState({
    name: '',
    plan: 'standard' as const,
    seats_count: 3,
    staff_limit: 10,
    owner_email: '',
    owner_name: '',
    owner_password: '',
  });

  useEffect(() => {
    async function loadSalons() {
      setIsLoading(true);
      const { data } = await getSalons({ search, status, plan, page, limit: 20 });
      if (data) {
        setSalons(data.salons);
        setPagination(data.pagination);
      }
      setIsLoading(false);
    }
    loadSalons();
  }, [search, status, plan, page]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  const handleCreateSalon = async () => {
    if (!newSalon.name.trim()) {
      setCreateError('サロン名を入力してください');
      return;
    }
    if (!newSalon.owner_email.trim()) {
      setCreateError('オーナーのメールアドレスを入力してください');
      return;
    }
    if (!newSalon.owner_name.trim()) {
      setCreateError('オーナー名を入力してください');
      return;
    }
    if (!newSalon.owner_password || newSalon.owner_password.length < 8) {
      setCreateError('パスワードは8文字以上で入力してください');
      return;
    }

    setIsCreating(true);
    setCreateError('');

    const { data, error } = await createSalon(newSalon);

    if (error) {
      setCreateError(error.message);
      setIsCreating(false);
      return;
    }

    if (data) {
      setShowCreateModal(false);
      setNewSalon({
        name: '',
        plan: 'standard',
        seats_count: 3,
        staff_limit: 10,
        owner_email: '',
        owner_name: '',
        owner_password: '',
      });
      // Reload salons
      const { data: salonsData } = await getSalons({ search, status, plan, page, limit: 20 });
      if (salonsData) {
        setSalons(salonsData.salons);
        setPagination(salonsData.pagination);
      }
    }
    setIsCreating(false);
  };

  const getPlanBadge = (planType: string) => {
    const colors: Record<string, { bg: string; text: string; border: string }> = {
      free: { bg: 'bg-gray-500/20', text: 'text-gray-400', border: 'border-gray-500/30' },
      standard: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' },
      premium: { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30' },
      enterprise: { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30' },
    };
    return colors[planType] || colors.free;
  };

  const getPlanLabel = (planType: string) => {
    const labels: Record<string, string> = {
      free: 'フリー',
      standard: 'スタンダード',
      premium: 'プレミアム',
      enterprise: 'エンタープライズ',
    };
    return labels[planType] || planType;
  };

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">サロン管理</h1>
          <p className="text-gray-400 mt-1 text-sm sm:text-base">登録済みサロンの一覧と管理</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-gray-400 text-sm">
            全 <span className="text-white font-medium">{pagination?.total ?? 0}</span> 件
          </span>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-3 sm:px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors flex items-center gap-2 text-sm sm:text-base"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="hidden sm:inline">新規サロン作成</span>
            <span className="sm:hidden">新規作成</span>
          </button>
        </div>
      </div>

      {/* フィルター */}
      <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
        <form onSubmit={handleSearch} className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[250px]">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="サロン名またはIDで検索..."
                className="w-full pl-10 pr-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
              />
            </div>
          </div>
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500 transition-all"
          >
            <option value="">すべてのステータス</option>
            <option value="active">アクティブ</option>
            <option value="suspended">停止中</option>
          </select>
          <select
            value={plan}
            onChange={(e) => { setPlan(e.target.value); setPage(1); }}
            className="px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500 transition-all"
          >
            <option value="">すべてのプラン</option>
            <option value="free">フリー</option>
            <option value="standard">スタンダード</option>
            <option value="premium">プレミアム</option>
            <option value="enterprise">エンタープライズ</option>
          </select>
        </form>
      </div>

      {/* サロンカードグリッド */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500"></div>
            <span className="text-gray-400">読み込み中...</span>
          </div>
        </div>
      ) : salons.length === 0 ? (
        <div className="bg-gray-800 rounded-xl p-12 border border-gray-700 text-center">
          <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <p className="text-gray-400 text-lg">サロンが見つかりません</p>
          <p className="text-gray-500 text-sm mt-2">検索条件を変更するか、新しいサロンを作成してください</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            新規サロン作成
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {salons.map((salon) => (
            <Link
              key={salon.id}
              href={`/admin/salons/${salon.id}`}
              className="bg-gray-800 rounded-xl p-5 border border-gray-700 hover:border-orange-500/50 transition-all group"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-white group-hover:text-orange-400 transition-colors">
                    {salon.name}
                  </h3>
                  <p className="text-gray-500 text-sm font-mono">{salon.id.slice(0, 8)}...</p>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  salon.status === 'active'
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-red-500/20 text-red-400'
                }`}>
                  {salon.status === 'active' ? 'アクティブ' : '停止中'}
                </span>
              </div>

              <div className="flex items-center gap-4 mb-4">
                <span className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${getPlanBadge(salon.plan).bg} ${getPlanBadge(salon.plan).text} ${getPlanBadge(salon.plan).border}`}>
                  {getPlanLabel(salon.plan)}
                </span>
                <div className="flex items-center gap-1.5 text-gray-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <span className="text-sm">{salon.seats_count} 席</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">
                  作成: {new Date(salon.created_at).toLocaleDateString('ja-JP')}
                </span>
                <span className="text-orange-500 group-hover:text-orange-400 flex items-center gap-1">
                  詳細を見る
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* ページネーション */}
      {pagination && pagination.total_pages > 1 && (
        <div className="flex items-center justify-between pt-4">
          <span className="text-gray-400 text-sm">
            ページ {pagination.page} / {pagination.total_pages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              前へ
            </button>
            <button
              onClick={() => setPage(p => Math.min(pagination.total_pages, p + 1))}
              disabled={page === pagination.total_pages}
              className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
            >
              次へ
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* サロン作成モーダル */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl w-full max-w-lg border border-gray-700 shadow-2xl">
            <div className="p-6 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">新規サロン作成</h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-5">
              {createError && (
                <div className="bg-red-500/10 text-red-400 px-4 py-3 rounded-lg border border-red-500/20 flex items-center gap-2">
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {createError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  サロン名 <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={newSalon.name}
                  onChange={(e) => setNewSalon({ ...newSalon, name: e.target.value })}
                  placeholder="例: ヘアサロン ABC"
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">プラン</label>
                  <select
                    value={newSalon.plan}
                    onChange={(e) => setNewSalon({ ...newSalon, plan: e.target.value as typeof newSalon.plan })}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="free">フリー</option>
                    <option value="standard">スタンダード</option>
                    <option value="premium">プレミアム</option>
                    <option value="enterprise">エンタープライズ</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">座席数（iPad数）</label>
                  <input
                    type="number"
                    value={newSalon.seats_count}
                    onChange={(e) => setNewSalon({ ...newSalon, seats_count: parseInt(e.target.value) || 1 })}
                    min={1}
                    max={100}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">スタッフ数上限</label>
                <input
                  type="number"
                  value={newSalon.staff_limit}
                  onChange={(e) => setNewSalon({ ...newSalon, staff_limit: parseInt(e.target.value) || 1 })}
                  min={1}
                  max={100}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500"
                />
                <p className="text-xs text-gray-500 mt-1">このサロンに登録できるスタッフの最大数</p>
              </div>

              <div className="border-t border-gray-700 pt-5">
                <p className="text-sm text-orange-400 mb-4 font-medium">オーナー情報（サロン管理者アカウント）</p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      オーナー名 <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={newSalon.owner_name}
                      onChange={(e) => setNewSalon({ ...newSalon, owner_name: e.target.value })}
                      placeholder="例: 山田 太郎"
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      オーナーメールアドレス（ログインID） <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="email"
                      value={newSalon.owner_email}
                      onChange={(e) => setNewSalon({ ...newSalon, owner_email: e.target.value })}
                      placeholder="例: owner@example.com"
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      初期パスワード <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="password"
                      value={newSalon.owner_password}
                      onChange={(e) => setNewSalon({ ...newSalon, owner_password: e.target.value })}
                      placeholder="8文字以上"
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">オーナーがダッシュボードにログインするためのパスワード</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-700 flex gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium"
              >
                キャンセル
              </button>
              <button
                onClick={handleCreateSalon}
                disabled={isCreating || !newSalon.name.trim()}
                className="flex-1 px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isCreating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                    作成中...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    サロンを作成
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
