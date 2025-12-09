'use client';

import { useEffect, useState } from 'react';
import {
  getOperators,
  createOperator,
  updateOperator,
  getMe,
  Operator,
  OperatorSession,
} from '@/lib/admin/client';

export default function OperatorsPage() {
  const [operators, setOperators] = useState<Operator[]>([]);
  const [currentOperator, setCurrentOperator] = useState<OperatorSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingOperator, setEditingOperator] = useState<Operator | null>(null);

  // Create form states
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<'operator_admin' | 'operator_support'>('operator_support');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit form states
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<'operator_admin' | 'operator_support'>('operator_support');
  const [editIsActive, setEditIsActive] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setIsLoading(true);
    const [operatorsRes, meRes] = await Promise.all([getOperators(), getMe()]);
    if (operatorsRes.data) {
      setOperators(operatorsRes.data);
    }
    if (meRes.data) {
      setCurrentOperator(meRes.data);
    }
    setIsLoading(false);
  }

  const handleCreate = async () => {
    setIsSubmitting(true);
    setError('');

    if (!newEmail || !newPassword || !newName) {
      setError('全ての項目を入力してください');
      setIsSubmitting(false);
      return;
    }

    if (newPassword.length < 8) {
      setError('パスワードは8文字以上にしてください');
      setIsSubmitting(false);
      return;
    }

    const { data, error: apiError } = await createOperator({
      email: newEmail,
      password: newPassword,
      name: newName,
      role: newRole,
    });

    if (apiError) {
      setError(apiError.message);
    } else if (data) {
      setSuccessMessage('オペレーターを作成しました');
      setShowCreateModal(false);
      setNewEmail('');
      setNewPassword('');
      setNewName('');
      setNewRole('operator_support');
      await loadData();
    }
    setIsSubmitting(false);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleEdit = (operator: Operator) => {
    setEditingOperator(operator);
    setEditName(operator.name);
    setEditRole(operator.role);
    setEditIsActive(operator.is_active);
    setShowEditModal(true);
  };

  const handleUpdate = async () => {
    if (!editingOperator) return;

    setIsSubmitting(true);
    setError('');

    const updates: {
      name?: string;
      role?: 'operator_admin' | 'operator_support';
      is_active?: boolean;
    } = {};

    if (editName !== editingOperator.name) updates.name = editName;
    if (editRole !== editingOperator.role) updates.role = editRole;
    if (editIsActive !== editingOperator.is_active) updates.is_active = editIsActive;

    if (Object.keys(updates).length === 0) {
      setError('変更がありません');
      setIsSubmitting(false);
      return;
    }

    const { data, error: apiError } = await updateOperator(editingOperator.id, updates);

    if (apiError) {
      setError(apiError.message);
    } else if (data) {
      setSuccessMessage('オペレーターを更新しました');
      setShowEditModal(false);
      setEditingOperator(null);
      await loadData();
    }
    setIsSubmitting(false);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const getRoleBadge = (role: string) => {
    if (role === 'operator_admin') {
      return 'bg-purple-500/20 text-purple-400 border border-purple-500/30';
    }
    return 'bg-blue-500/20 text-blue-400 border border-blue-500/30';
  };

  const getRoleLabel = (role: string) => {
    if (role === 'operator_admin') return '管理者';
    return 'サポート';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">オペレーター管理</h1>
          <p className="text-gray-400 mt-1 text-sm sm:text-base">運営管理コンソールにアクセスできるアカウントの管理</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-gray-400 text-sm">
            全 <span className="text-white font-medium">{operators.length}</span> 人
          </span>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-3 sm:px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors flex items-center gap-2 text-sm sm:text-base"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="hidden sm:inline">新規オペレーター作成</span>
            <span className="sm:hidden">新規作成</span>
          </button>
        </div>
      </div>

      {/* 成功メッセージ */}
      {successMessage && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
          <p className="text-green-400">{successMessage}</p>
        </div>
      )}

      {/* エラーメッセージ */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {/* テーブル */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead className="bg-gray-700/50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">名前</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">メールアドレス</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">権限</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">ステータス</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">最終ログイン</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">作成日</th>
              <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {operators.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-400">
                  オペレーターが登録されていません
                </td>
              </tr>
            ) : (
              operators.map((operator) => (
                <tr key={operator.id} className="hover:bg-gray-700/50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium">{operator.name}</span>
                      {currentOperator?.operator_id === operator.id && (
                        <span className="text-xs px-2 py-0.5 bg-orange-500/20 text-orange-400 rounded">自分</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-300">{operator.email}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getRoleBadge(operator.role)}`}>
                      {getRoleLabel(operator.role)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {operator.is_active ? (
                      <span className="px-2 py-1 rounded text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
                        有効
                      </span>
                    ) : (
                      <span className="px-2 py-1 rounded text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30">
                        無効
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-gray-400 text-sm">
                    {operator.last_login_at
                      ? new Date(operator.last_login_at).toLocaleString()
                      : '-'}
                  </td>
                  <td className="px-6 py-4 text-gray-400 text-sm">
                    {new Date(operator.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleEdit(operator)}
                      className="text-orange-500 hover:text-orange-400 text-sm font-medium"
                    >
                      編集
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 新規作成モーダル */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl w-full max-w-md border border-gray-700">
            <div className="p-6 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white">新規オペレーター作成</h3>
            </div>
            <div className="p-6 space-y-4">
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}
              <div>
                <label className="block text-sm text-gray-400 mb-2">名前</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="田中 太郎"
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">メールアドレス</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="operator@example.com"
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">パスワード（8文字以上）</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="********"
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">権限</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as 'operator_admin' | 'operator_support')}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
                >
                  <option value="operator_support">サポート（閲覧中心）</option>
                  <option value="operator_admin">管理者（全権限）</option>
                </select>
                <p className="text-xs text-gray-500 mt-2">
                  管理者: プラン変更、オペレーター管理が可能<br />
                  サポート: サロン情報の閲覧、座席数変更のみ可能
                </p>
              </div>
            </div>
            <div className="p-6 border-t border-gray-700 flex gap-3">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setError('');
                  setNewEmail('');
                  setNewPassword('');
                  setNewName('');
                  setNewRole('operator_support');
                }}
                className="flex-1 px-4 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
              >
                キャンセル
              </button>
              <button
                onClick={handleCreate}
                disabled={isSubmitting}
                className="flex-1 px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
              >
                {isSubmitting ? '作成中...' : '作成'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 編集モーダル */}
      {showEditModal && editingOperator && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl w-full max-w-md border border-gray-700">
            <div className="p-6 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white">オペレーター編集</h3>
              <p className="text-gray-400 text-sm mt-1">{editingOperator.email}</p>
            </div>
            <div className="p-6 space-y-4">
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}
              <div>
                <label className="block text-sm text-gray-400 mb-2">名前</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">権限</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as 'operator_admin' | 'operator_support')}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  disabled={currentOperator?.operator_id === editingOperator.id}
                >
                  <option value="operator_support">サポート（閲覧中心）</option>
                  <option value="operator_admin">管理者（全権限）</option>
                </select>
                {currentOperator?.operator_id === editingOperator.id && (
                  <p className="text-xs text-yellow-500 mt-2">
                    自分自身の権限は変更できません
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">ステータス</label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      checked={editIsActive}
                      onChange={() => setEditIsActive(true)}
                      className="w-4 h-4 text-orange-500"
                      disabled={currentOperator?.operator_id === editingOperator.id}
                    />
                    <span className="text-white">有効</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      checked={!editIsActive}
                      onChange={() => setEditIsActive(false)}
                      className="w-4 h-4 text-orange-500"
                      disabled={currentOperator?.operator_id === editingOperator.id}
                    />
                    <span className="text-white">無効</span>
                  </label>
                </div>
                {currentOperator?.operator_id === editingOperator.id && (
                  <p className="text-xs text-yellow-500 mt-2">
                    自分自身のアカウントを無効化することはできません
                  </p>
                )}
              </div>
            </div>
            <div className="p-6 border-t border-gray-700 flex gap-3">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingOperator(null);
                  setError('');
                }}
                className="flex-1 px-4 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
              >
                キャンセル
              </button>
              <button
                onClick={handleUpdate}
                disabled={isSubmitting}
                className="flex-1 px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
              >
                {isSubmitting ? '更新中...' : '更新'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
