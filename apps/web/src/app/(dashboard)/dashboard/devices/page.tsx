'use client';

import { useState, FormEvent } from 'react';
import { useDevices, Device, ActivationCode } from '@/hooks/useDevices';
import { useAuth } from '@/hooks/useAuth';

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: '未登録', color: 'bg-yellow-100 text-yellow-800' },
  active: { label: 'アクティブ', color: 'bg-green-100 text-green-800' },
  inactive: { label: '停止中', color: 'bg-gray-100 text-gray-600' },
  revoked: { label: '失効', color: 'bg-red-100 text-red-800' },
};

function formatRelativeTime(dateString: string | null): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'たった今';
  if (diffMin < 60) return `${diffMin}分前`;
  if (diffHour < 24) return `${diffHour}時間前`;
  if (diffDay < 7) return `${diffDay}日前`;
  return date.toLocaleDateString('ja-JP');
}

export default function DevicesPage() {
  const { user } = useAuth();
  const {
    devices,
    salonInfo,
    isLoading,
    error,
    registerDevice,
    generateActivationCode,
    updateDevice,
    revokeDevice,
    refresh,
  } = useDevices();

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isRevokeModalOpen, setIsRevokeModalOpen] = useState(false);

  // Form states
  const [addFormData, setAddFormData] = useState({ device_name: '', seat_number: '' });
  const [editFormData, setEditFormData] = useState<{
    device_id: string;
    device_name: string;
    seat_number: string;
    status: string;
  } | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [activationCode, setActivationCode] = useState<ActivationCode | null>(null);
  const [revokeReason, setRevokeReason] = useState('');

  // Loading states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const isOwner = user?.role === 'owner';
  const canAddDevice = salonInfo && salonInfo.active_device_count < salonInfo.seats_count;

  // Handle add device
  const handleAddDevice = async (e: FormEvent) => {
    e.preventDefault();
    if (!addFormData.device_name.trim()) return;

    setIsSubmitting(true);
    try {
      const result = await registerDevice({
        device_name: addFormData.device_name,
        seat_number: addFormData.seat_number ? parseInt(addFormData.seat_number) : undefined,
      });
      setActivationCode(result.activation_code);
      setIsAddModalOpen(false);
      setIsCodeModalOpen(true);
      setAddFormData({ device_name: '', seat_number: '' });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'デバイスの登録に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle generate activation code
  const handleGenerateCode = async (device: Device) => {
    setIsSubmitting(true);
    try {
      const code = await generateActivationCode(device.id);
      setActivationCode(code);
      setSelectedDevice(device);
      setIsCodeModalOpen(true);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'コードの生成に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle edit device
  const handleEditDevice = async (e: FormEvent) => {
    e.preventDefault();
    if (!editFormData) return;

    setIsSubmitting(true);
    try {
      await updateDevice({
        device_id: editFormData.device_id,
        device_name: editFormData.device_name || undefined,
        seat_number: editFormData.seat_number ? parseInt(editFormData.seat_number) : null,
        status: editFormData.status || undefined,
      });
      setIsEditModalOpen(false);
      setEditFormData(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'デバイスの更新に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle revoke device
  const handleRevokeDevice = async () => {
    if (!selectedDevice) return;

    setIsSubmitting(true);
    try {
      await revokeDevice(selectedDevice.id, revokeReason || undefined);
      setIsRevokeModalOpen(false);
      setSelectedDevice(null);
      setRevokeReason('');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'デバイスの失効に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Copy code to clipboard
  const handleCopyCode = async () => {
    if (!activationCode) return;
    try {
      await navigator.clipboard.writeText(activationCode.code);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch {
      alert('コピーに失敗しました');
    }
  };

  // Open edit modal
  const openEditModal = (device: Device) => {
    setEditFormData({
      device_id: device.id,
      device_name: device.device_name,
      seat_number: device.seat_number?.toString() || '',
      status: device.status,
    });
    setSelectedDevice(device);
    setIsEditModalOpen(true);
  };

  // Open revoke modal
  const openRevokeModal = (device: Device) => {
    setSelectedDevice(device);
    setRevokeReason('');
    setIsRevokeModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center h-64">
        <p className="text-gray-500">読み込み中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 text-red-600 p-4 rounded-lg">
          {error}
          <button onClick={refresh} className="ml-4 underline">
            再読み込み
          </button>
        </div>
      </div>
    );
  }

  const activeDevices = devices.filter(d => d.status === 'active');
  const onlineDevices = devices.filter(d => d.is_online);
  const pendingDevices = devices.filter(d => d.status === 'pending');

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">デバイス管理</h1>
          <p className="text-gray-500 mt-1">iPadデバイスの登録・管理を行います</p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          disabled={!canAddDevice}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          + デバイス追加
        </button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-gray-500 text-sm">登録済みデバイス</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">{devices.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-gray-500 text-sm">アクティブ</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{activeDevices.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-gray-500 text-sm">オンライン</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{onlineDevices.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-gray-500 text-sm">登録枠</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">
            {salonInfo?.active_device_count || 0} / {salonInfo?.seats_count || 0}
          </p>
          {!canAddDevice && (
            <p className="text-xs text-orange-500 mt-1">上限に達しています</p>
          )}
        </div>
      </div>

      {/* Devices Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                デバイス名
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                セット面
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ステータス
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                接続状態
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                最終接続
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                セッション
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                アクション
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {devices.map((device) => (
              <tr key={device.id} className={device.status === 'revoked' ? 'bg-gray-50 opacity-60' : ''}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{device.device_name}</div>
                  <div className="text-xs text-gray-400">{device.id.slice(0, 8)}...</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {device.seat_number || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs rounded-full ${statusLabels[device.status]?.color || ''}`}>
                    {statusLabels[device.status]?.label || device.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {device.status === 'active' ? (
                    <span className="flex items-center text-sm">
                      <span className={`w-2 h-2 rounded-full mr-2 ${device.is_online ? 'bg-green-500' : 'bg-gray-300'}`} />
                      {device.is_online ? 'オンライン' : 'オフライン'}
                    </span>
                  ) : (
                    <span className="text-gray-400 text-sm">-</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatRelativeTime(device.last_active_at)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {device.current_session ? (
                    <div>
                      <span className="text-primary-600">{device.current_session.stylist_name}</span>
                      <span className="text-gray-400 text-xs ml-1">
                        ({formatRelativeTime(device.current_session.started_at)}~)
                      </span>
                    </div>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                  {device.status !== 'revoked' && (
                    <div className="flex justify-end space-x-2">
                      {device.status === 'pending' && (
                        <button
                          onClick={() => handleGenerateCode(device)}
                          className="px-3 py-1 text-primary-600 hover:bg-primary-50 rounded-lg text-sm"
                          disabled={isSubmitting}
                        >
                          コード発行
                        </button>
                      )}
                      <button
                        onClick={() => openEditModal(device)}
                        className="px-3 py-1 text-gray-600 hover:bg-gray-100 rounded-lg text-sm"
                      >
                        設定
                      </button>
                      {isOwner && (
                        <button
                          onClick={() => openRevokeModal(device)}
                          className="px-3 py-1 text-red-600 hover:bg-red-50 rounded-lg text-sm"
                        >
                          失効
                        </button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {devices.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                  デバイスがまだ登録されていません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Device Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-800">新規デバイス追加</h2>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleAddDevice} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  デバイス名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={addFormData.device_name}
                  onChange={(e) => setAddFormData({ ...addFormData, device_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                  placeholder="例: iPad-1"
                  maxLength={50}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  セット面番号（任意）
                </label>
                <input
                  type="number"
                  value={addFormData.seat_number}
                  onChange={(e) => setAddFormData({ ...addFormData, seat_number: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                  placeholder="例: 1"
                  min={1}
                  max={99}
                />
              </div>

              {!canAddDevice && (
                <div className="bg-orange-50 text-orange-600 p-3 rounded-lg text-sm">
                  デバイス登録枠の上限に達しています。既存のデバイスを失効するか、プランをアップグレードしてください。
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
                  disabled={isSubmitting}
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                  disabled={isSubmitting || !canAddDevice}
                >
                  {isSubmitting ? '追加中...' : '追加'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Activation Code Modal */}
      {isCodeModalOpen && activationCode && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md text-center">
            <h2 className="text-xl font-bold text-gray-800 mb-2">アクティベーションコード</h2>
            <p className="text-gray-500 text-sm mb-6">
              iPadアプリでこのコードを入力してください
            </p>

            <div className="bg-gray-50 rounded-xl p-6 mb-4">
              <div className="text-4xl font-mono font-bold tracking-widest text-primary-600 mb-2">
                {activationCode.code}
              </div>
              <div className="text-sm text-gray-500">
                有効期限: {new Date(activationCode.expires_at).toLocaleString('ja-JP')}
              </div>
            </div>

            <button
              onClick={handleCopyCode}
              className={`w-full px-4 py-2 rounded-lg mb-4 ${
                copySuccess
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {copySuccess ? 'コピーしました!' : 'コードをコピー'}
            </button>

            <button
              onClick={() => {
                setIsCodeModalOpen(false);
                setActivationCode(null);
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
            >
              閉じる
            </button>
          </div>
        </div>
      )}

      {/* Edit Device Modal */}
      {isEditModalOpen && editFormData && selectedDevice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-800">デバイス設定</h2>
              <button
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditFormData(null);
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleEditDevice} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  デバイス名
                </label>
                <input
                  type="text"
                  value={editFormData.device_name}
                  onChange={(e) => setEditFormData({ ...editFormData, device_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                  maxLength={50}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  セット面番号
                </label>
                <input
                  type="number"
                  value={editFormData.seat_number}
                  onChange={(e) => setEditFormData({ ...editFormData, seat_number: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                  min={1}
                  max={99}
                />
              </div>

              {selectedDevice.status !== 'pending' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ステータス
                  </label>
                  <select
                    value={editFormData.status}
                    onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="active">アクティブ</option>
                    <option value="inactive">停止中</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    ※「停止中」にするとデバイスは使用できなくなります
                  </p>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditFormData(null);
                  }}
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
                  {isSubmitting ? '保存中...' : '保存'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Revoke Device Modal */}
      {isRevokeModalOpen && selectedDevice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-red-600">デバイスの失効</h2>
              <button
                onClick={() => {
                  setIsRevokeModalOpen(false);
                  setSelectedDevice(null);
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-red-600 font-medium mb-2">この操作は取り消せません</p>
              <p className="text-red-500 text-sm">
                「{selectedDevice.device_name}」を失効すると、このデバイスは永久に使用できなくなります。
                再度使用するには、新しいデバイスとして登録する必要があります。
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                失効理由（任意）
              </label>
              <textarea
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-red-500 focus:border-red-500"
                placeholder="例: デバイスの紛失、買い替え"
                rows={2}
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setIsRevokeModalOpen(false);
                  setSelectedDevice(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
                disabled={isSubmitting}
              >
                キャンセル
              </button>
              <button
                onClick={handleRevokeDevice}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                disabled={isSubmitting}
              >
                {isSubmitting ? '処理中...' : '失効する'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
