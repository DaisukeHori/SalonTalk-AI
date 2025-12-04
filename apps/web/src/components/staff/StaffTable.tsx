'use client';

/**
 * StaffTable Component
 * スタッフテーブルコンポーネント
 */
import { ChevronUp, ChevronDown, MoreVertical, Eye, Edit, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: 'stylist' | 'manager' | 'receptionist';
  avatarUrl?: string;
  averageScore: number;
  sessionCount: number;
  conversionRate: number;
  status: 'active' | 'inactive';
  joinedAt: Date;
}

type SortField = 'name' | 'averageScore' | 'sessionCount' | 'conversionRate' | 'joinedAt';
type SortOrder = 'asc' | 'desc';

interface StaffTableProps {
  data: StaffMember[];
  onView?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  loading?: boolean;
}

export function StaffTable({
  data,
  onView,
  onEdit,
  onDelete,
  loading = false,
}: StaffTableProps) {
  const [sortField, setSortField] = useState<SortField>('averageScore');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const sortedData = [...data].sort((a, b) => {
    let comparison = 0;
    switch (sortField) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'averageScore':
        comparison = a.averageScore - b.averageScore;
        break;
      case 'sessionCount':
        comparison = a.sessionCount - b.sessionCount;
        break;
      case 'conversionRate':
        comparison = a.conversionRate - b.conversionRate;
        break;
      case 'joinedAt':
        comparison = a.joinedAt.getTime() - b.joinedAt.getTime();
        break;
    }
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const roleLabels = {
    stylist: 'スタイリスト',
    manager: 'マネージャー',
    receptionist: 'レセプション',
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortOrder === 'asc' ? (
      <ChevronUp className="w-4 h-4" />
    ) : (
      <ChevronDown className="w-4 h-4" />
    );
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-8 text-center text-gray-500">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('name')}
                  className="flex items-center gap-1 hover:text-gray-700"
                >
                  スタッフ
                  <SortIcon field="name" />
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                役職
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('averageScore')}
                  className="flex items-center gap-1 hover:text-gray-700 mx-auto"
                >
                  平均スコア
                  <SortIcon field="averageScore" />
                </button>
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('sessionCount')}
                  className="flex items-center gap-1 hover:text-gray-700 mx-auto"
                >
                  セッション数
                  <SortIcon field="sessionCount" />
                </button>
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('conversionRate')}
                  className="flex items-center gap-1 hover:text-gray-700 mx-auto"
                >
                  成約率
                  <SortIcon field="conversionRate" />
                </button>
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                ステータス
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sortedData.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                  スタッフが登録されていません
                </td>
              </tr>
            ) : (
              sortedData.map((staff) => (
                <tr key={staff.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                        {staff.avatarUrl ? (
                          <img
                            src={staff.avatarUrl}
                            alt={staff.name}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-indigo-600 font-medium">
                            {staff.name.charAt(0)}
                          </span>
                        )}
                      </div>
                      <div className="ml-4">
                        <p className="font-medium text-gray-900">{staff.name}</p>
                        <p className="text-sm text-gray-500">{staff.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
                      {roleLabels[staff.role]}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className={`font-bold ${getScoreColor(staff.averageScore)}`}>
                      {staff.averageScore}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-gray-600">
                    {staff.sessionCount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-gray-600">
                    {staff.conversionRate}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        staff.status === 'active'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {staff.status === 'active' ? '有効' : '無効'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="relative">
                      <button
                        onClick={() => setOpenMenu(openMenu === staff.id ? null : staff.id)}
                        className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <MoreVertical className="w-4 h-4 text-gray-500" />
                      </button>
                      {openMenu === staff.id && (
                        <div className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                          {onView && (
                            <button
                              onClick={() => {
                                onView(staff.id);
                                setOpenMenu(null);
                              }}
                              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                            >
                              <Eye className="w-4 h-4" />
                              詳細
                            </button>
                          )}
                          {onEdit && (
                            <button
                              onClick={() => {
                                onEdit(staff.id);
                                setOpenMenu(null);
                              }}
                              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                            >
                              <Edit className="w-4 h-4" />
                              編集
                            </button>
                          )}
                          {onDelete && (
                            <button
                              onClick={() => {
                                onDelete(staff.id);
                                setOpenMenu(null);
                              }}
                              className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                            >
                              <Trash2 className="w-4 h-4" />
                              削除
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default StaffTable;
