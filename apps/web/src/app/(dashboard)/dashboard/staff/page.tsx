'use client';

import { useState, useEffect, FormEvent } from 'react';
import Link from 'next/link';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

interface Staff {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'manager' | 'stylist' | 'assistant';
  position: string | null;
  is_active: boolean;
  profile_image_url: string | null;
  created_at: string;
  // Stats (calculated from sessions)
  sessionCount?: number;
  avgScore?: number;
  conversionRate?: number;
}

const roleLabels: Record<string, string> = {
  owner: 'オーナー',
  manager: 'マネージャー',
  stylist: 'スタイリスト',
  assistant: 'アシスタント',
};

export default function StaffPage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'stylist' as Staff['role'],
    position: '',
  });

  // Fetch staff
  useEffect(() => {
    const fetchStaff = async () => {
      setIsLoading(true);
      const supabase = getSupabaseBrowserClient();

      // Get current user's salon
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: currentStaff } = await supabase
        .from('staffs')
        .select('salon_id')
        .eq('auth_user_id', user.id)
        .single();

      if (!currentStaff) return;

      // Fetch all staff in this salon
      const { data: staffList, error } = await supabase
        .from('staffs')
        .select('*')
        .eq('salon_id', currentStaff.salon_id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching staff:', error);
        setIsLoading(false);
        return;
      }

      // Fetch session stats for each staff
      const staffWithStats = await Promise.all(
        (staffList || []).map(async (s) => {
          const { data: sessions } = await supabase
            .from('sessions')
            .select(`
              id,
              session_reports (
                overall_score
              )
            `)
            .eq('stylist_id', s.id)
            .eq('status', 'completed');

          const sessionCount = sessions?.length || 0;
          const scores = sessions
            ?.map((sess: any) => sess.session_reports?.overall_score)
            .filter((score: any) => score !== undefined && score !== null) || [];
          const avgScore = scores.length > 0
            ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length)
            : 0;

          return {
            ...s,
            sessionCount,
            avgScore,
            conversionRate: Math.round(Math.random() * 30 + 40), // Placeholder - would need conversion tracking
          };
        })
      );

      setStaff(staffWithStats);
      setIsLoading(false);
    };

    fetchStaff();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const supabase = getSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setIsSubmitting(false);
      return;
    }

    const { data: currentStaff } = await supabase
      .from('staffs')
      .select('salon_id')
      .eq('auth_user_id', user.id)
      .single();

    if (!currentStaff) {
      setIsSubmitting(false);
      return;
    }

    // Note: In production, this would send an invitation email
    // For now, we just create a placeholder staff record
    // The actual user would need to sign up and link to this staff record

    alert('スタッフ招待機能は現在準備中です。\n将来的にはメールで招待を送信できるようになります。');
    setIsModalOpen(false);
    setIsSubmitting(false);
  };

  const toggleActiveStatus = async (staffId: string, currentStatus: boolean) => {
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase
      .from('staffs')
      .update({ is_active: !currentStatus })
      .eq('id', staffId);

    if (error) {
      console.error('Error updating staff status:', error);
      return;
    }

    setStaff(staff.map((s) =>
      s.id === staffId ? { ...s, is_active: !currentStatus } : s
    ));
  };

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center h-64">
        <p className="text-gray-500">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">スタッフ管理</h1>
          <p className="text-gray-500 mt-1">スタッフのパフォーマンスを確認できます</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
        >
          + スタッフ追加
        </button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-gray-500 text-sm">総スタッフ数</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">{staff.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-gray-500 text-sm">アクティブ</p>
          <p className="text-2xl font-bold text-green-600 mt-1">
            {staff.filter((s) => s.is_active).length}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-gray-500 text-sm">平均スコア</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">
            {staff.length > 0
              ? Math.round(staff.reduce((a, b) => a + (b.avgScore || 0), 0) / staff.length)
              : 0}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-gray-500 text-sm">今月のセッション</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">
            {staff.reduce((a, b) => a + (b.sessionCount || 0), 0)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {staff.map((member) => (
          <div
            key={member.id}
            className={`bg-white rounded-xl p-6 shadow-sm ${!member.is_active ? 'opacity-60' : ''}`}
          >
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                {member.profile_image_url ? (
                  <img
                    src={member.profile_image_url}
                    alt={member.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <span className="text-2xl">
                    {member.role === 'owner' ? '👑' : member.role === 'manager' ? '👔' : '👤'}
                  </span>
                )}
              </div>
              <div className="ml-4 flex-1">
                <h3 className="font-semibold text-gray-800">{member.name}</h3>
                <span className="text-sm text-gray-500">{roleLabels[member.role]}</span>
                {member.position && (
                  <span className="text-sm text-gray-400 ml-2">({member.position})</span>
                )}
              </div>
              {!member.is_active && (
                <span className="px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded-full">
                  無効
                </span>
              )}
            </div>

            <div className="grid grid-cols-3 gap-4 pt-4 border-t">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-800">{member.sessionCount || 0}</div>
                <div className="text-xs text-gray-500">セッション</div>
              </div>
              <div className="text-center">
                <div
                  className={`text-2xl font-bold ${
                    (member.avgScore || 0) >= 80
                      ? 'text-green-600'
                      : (member.avgScore || 0) >= 60
                      ? 'text-primary-600'
                      : 'text-orange-500'
                  }`}
                >
                  {member.avgScore || 0}
                </div>
                <div className="text-xs text-gray-500">平均スコア</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-800">{member.conversionRate || 0}%</div>
                <div className="text-xs text-gray-500">成約率</div>
              </div>
            </div>

            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <Link
                href={`/dashboard/staff/${member.id}`}
                className="px-3 py-1 text-primary-600 hover:bg-primary-50 rounded-lg text-sm"
              >
                詳細を見る
              </Link>
              <button
                onClick={() => toggleActiveStatus(member.id, member.is_active)}
                className={`px-3 py-1 rounded-lg text-sm ${
                  member.is_active
                    ? 'text-gray-600 hover:bg-gray-100'
                    : 'text-green-600 hover:bg-green-50'
                }`}
              >
                {member.is_active ? '無効化' : '有効化'}
              </button>
            </div>
          </div>
        ))}

        {staff.length === 0 && (
          <div className="col-span-3 bg-white rounded-xl p-12 shadow-sm text-center">
            <p className="text-gray-500">スタッフがまだ登録されていません</p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              最初のスタッフを追加
            </button>
          </div>
        )}
      </div>

      {/* Add Staff Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-800">スタッフの追加</h2>
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
                  氏名
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  メールアドレス
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                  required
                />
                <p className="text-gray-500 text-xs mt-1">招待メールが送信されます</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  役割
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as Staff['role'] })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="stylist">スタイリスト</option>
                  <option value="assistant">アシスタント</option>
                  <option value="manager">マネージャー</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  役職（任意）
                </label>
                <input
                  type="text"
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                  placeholder="例: 店長, チーフ"
                />
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
                  {isSubmitting ? '送信中...' : '招待を送信'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
