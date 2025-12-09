'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  getSalon,
  updateSalonSeats,
  updateSalonPlan,
  suspendSalon,
  unsuspendSalon,
  SalonWithStats,
  getMe,
  OperatorSession,
} from '@/lib/admin/client';

export default function SalonDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [salon, setSalon] = useState<SalonWithStats | null>(null);
  const [operator, setOperator] = useState<OperatorSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Modal states
  const [showSeatsModal, setShowSeatsModal] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showSuspendModal, setShowSuspendModal] = useState(false);

  // Form states
  const [newSeats, setNewSeats] = useState(0);
  const [seatsReason, setSeatsReason] = useState('');
  const [newPlan, setNewPlan] = useState('');
  const [planReason, setPlanReason] = useState('');
  const [suspendReason, setSuspendReason] = useState('');
  const [suspendNote, setSuspendNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadData() {
      const [salonRes, meRes] = await Promise.all([getSalon(id), getMe()]);
      if (salonRes.data) {
        setSalon(salonRes.data);
        setNewSeats(salonRes.data.seats_count);
        setNewPlan(salonRes.data.plan);
      }
      if (meRes.data) setOperator(meRes.data);
      setIsLoading(false);
    }
    loadData();
  }, [id]);

  const handleUpdateSeats = async () => {
    setIsSubmitting(true);
    setError('');
    const { data, error: apiError } = await updateSalonSeats(id, newSeats, seatsReason);
    if (apiError) {
      setError(apiError.message);
    } else if (data?.success) {
      setSuccessMessage('Seats updated successfully');
      setShowSeatsModal(false);
      const { data: updated } = await getSalon(id);
      if (updated) setSalon(updated);
    }
    setIsSubmitting(false);
  };

  const handleUpdatePlan = async () => {
    setIsSubmitting(true);
    setError('');
    const { data, error: apiError } = await updateSalonPlan(id, newPlan, planReason);
    if (apiError) {
      setError(apiError.message);
    } else if (data?.success) {
      setSuccessMessage('Plan updated successfully');
      setShowPlanModal(false);
      const { data: updated } = await getSalon(id);
      if (updated) setSalon(updated);
    }
    setIsSubmitting(false);
  };

  const handleSuspend = async () => {
    setIsSubmitting(true);
    setError('');
    const { data, error: apiError } = await suspendSalon(id, suspendReason, suspendNote);
    if (apiError) {
      setError(apiError.message);
    } else if (data?.success) {
      setSuccessMessage('Salon suspended');
      setShowSuspendModal(false);
      const { data: updated } = await getSalon(id);
      if (updated) setSalon(updated);
    }
    setIsSubmitting(false);
  };

  const handleUnsuspend = async () => {
    setIsSubmitting(true);
    setError('');
    const { data, error: apiError } = await unsuspendSalon(id);
    if (apiError) {
      setError(apiError.message);
    } else if (data?.success) {
      setSuccessMessage('Salon unsuspended');
      const { data: updated } = await getSalon(id);
      if (updated) setSalon(updated);
    }
    setIsSubmitting(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (!salon) {
    return <div className="text-red-400">Salon not found</div>;
  }

  const isAdmin = operator?.role === 'operator_admin';

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href="/admin/salons" className="text-gray-400 hover:text-white">
            ← Back
          </Link>
          <h1 className="text-2xl font-bold text-white">{salon.name}</h1>
          <span className={`px-2 py-1 rounded text-xs font-medium ${
            salon.status === 'active'
              ? 'bg-green-500/20 text-green-400'
              : 'bg-red-500/20 text-red-400'
          }`}>
            {salon.status}
          </span>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-6 bg-red-500/10 text-red-400 px-4 py-3 rounded-lg border border-red-500/20">
          {error}
        </div>
      )}
      {successMessage && (
        <div className="mb-6 bg-green-500/10 text-green-400 px-4 py-3 rounded-lg border border-green-500/20">
          {successMessage}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Info Card */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h2 className="text-lg font-semibold text-white mb-4">Salon Info</h2>
          <dl className="space-y-4">
            <div>
              <dt className="text-gray-400 text-sm">ID</dt>
              <dd className="text-white font-mono text-sm">{salon.id}</dd>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <dt className="text-gray-400 text-sm">Plan</dt>
                <dd className="text-white capitalize">{salon.plan}</dd>
              </div>
              {isAdmin && (
                <button
                  onClick={() => setShowPlanModal(true)}
                  className="text-orange-500 text-sm hover:text-orange-400"
                >
                  Change
                </button>
              )}
            </div>
            <div className="flex items-center justify-between">
              <div>
                <dt className="text-gray-400 text-sm">Seats</dt>
                <dd className="text-white">{salon.seats_count}</dd>
              </div>
              <button
                onClick={() => setShowSeatsModal(true)}
                className="text-orange-500 text-sm hover:text-orange-400"
              >
                Change
              </button>
            </div>
            <div>
              <dt className="text-gray-400 text-sm">Created</dt>
              <dd className="text-white">{new Date(salon.created_at).toLocaleDateString()}</dd>
            </div>
            {salon.suspended_at && (
              <div>
                <dt className="text-gray-400 text-sm">Suspended At</dt>
                <dd className="text-red-400">{new Date(salon.suspended_at).toLocaleDateString()}</dd>
                <dd className="text-gray-400 text-sm mt-1">{salon.suspended_reason}</dd>
              </div>
            )}
          </dl>

          {isAdmin && (
            <div className="mt-6 pt-4 border-t border-gray-700">
              {salon.status === 'active' ? (
                <button
                  onClick={() => setShowSuspendModal(true)}
                  className="w-full px-4 py-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20"
                >
                  Suspend Salon
                </button>
              ) : (
                <button
                  onClick={handleUnsuspend}
                  disabled={isSubmitting}
                  className="w-full px-4 py-2 bg-green-500/10 text-green-400 rounded-lg hover:bg-green-500/20 disabled:opacity-50"
                >
                  {isSubmitting ? 'Processing...' : 'Unsuspend Salon'}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Stats Card */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h2 className="text-lg font-semibold text-white mb-4">Statistics</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-700/50 rounded-lg p-4">
              <p className="text-2xl font-bold text-white">{salon.stats.staff_count}</p>
              <p className="text-gray-400 text-sm">Staff</p>
            </div>
            <div className="bg-gray-700/50 rounded-lg p-4">
              <p className="text-2xl font-bold text-white">{salon.stats.active_device_count}</p>
              <p className="text-gray-400 text-sm">Active Devices</p>
            </div>
            <div className="bg-gray-700/50 rounded-lg p-4">
              <p className="text-2xl font-bold text-white">{salon.stats.total_sessions}</p>
              <p className="text-gray-400 text-sm">Total Sessions</p>
            </div>
            <div className="bg-gray-700/50 rounded-lg p-4">
              <p className="text-2xl font-bold text-white">{salon.stats.sessions_this_month}</p>
              <p className="text-gray-400 text-sm">This Month</p>
            </div>
          </div>
          {salon.stats.last_session_at && (
            <p className="text-gray-400 text-sm mt-4">
              Last session: {new Date(salon.stats.last_session_at).toLocaleDateString()}
            </p>
          )}
        </div>

        {/* Internal Note */}
        {isAdmin && salon.internal_note && (
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-lg font-semibold text-white mb-4">Internal Note</h2>
            <p className="text-gray-300 whitespace-pre-wrap">{salon.internal_note}</p>
          </div>
        )}
      </div>

      {/* Staff List */}
      <div className="mt-6 bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">Staff ({salon.staffs.length})</h2>
        </div>
        <table className="w-full">
          <thead className="bg-gray-700/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {salon.staffs.map((staff) => (
              <tr key={staff.id} className="hover:bg-gray-700/50">
                <td className="px-6 py-4 text-white">{staff.name}</td>
                <td className="px-6 py-4 text-gray-400">{staff.email}</td>
                <td className="px-6 py-4 text-gray-400 capitalize">{staff.role}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded text-xs ${
                    staff.is_active
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-gray-500/20 text-gray-400'
                  }`}>
                    {staff.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Devices List */}
      <div className="mt-6 bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">Devices ({salon.devices.length})</h2>
        </div>
        <table className="w-full">
          <thead className="bg-gray-700/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Device Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Seat #</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Last Active</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {salon.devices.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-center text-gray-400">No devices</td>
              </tr>
            ) : (
              salon.devices.map((device) => (
                <tr key={device.id} className="hover:bg-gray-700/50">
                  <td className="px-6 py-4 text-white">{device.device_name}</td>
                  <td className="px-6 py-4 text-gray-400">{device.seat_number ?? '-'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs ${
                      device.status === 'active'
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-gray-500/20 text-gray-400'
                    }`}>
                      {device.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-400 text-sm">
                    {device.last_active_at
                      ? new Date(device.last_active_at).toLocaleString()
                      : '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Seats Modal */}
      {showSeatsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">Change Seats Count</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">New Seats Count</label>
                <input
                  type="number"
                  value={newSeats}
                  onChange={(e) => setNewSeats(parseInt(e.target.value))}
                  min={1}
                  max={100}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Reason (min 10 characters)</label>
                <textarea
                  value={seatsReason}
                  onChange={(e) => setSeatsReason(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="Enter reason for this change..."
                />
              </div>
            </div>
            <div className="flex gap-4 mt-6">
              <button
                onClick={() => setShowSeatsModal(false)}
                className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateSeats}
                disabled={isSubmitting || seatsReason.length < 10}
                className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
              >
                {isSubmitting ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Plan Modal */}
      {showPlanModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">Change Plan</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">New Plan</label>
                <select
                  value={newPlan}
                  onChange={(e) => setNewPlan(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                >
                  <option value="free">Free</option>
                  <option value="standard">Standard</option>
                  <option value="premium">Premium</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Reason</label>
                <textarea
                  value={planReason}
                  onChange={(e) => setPlanReason(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="Enter reason for this change..."
                />
              </div>
            </div>
            <div className="flex gap-4 mt-6">
              <button
                onClick={() => setShowPlanModal(false)}
                className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdatePlan}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
              >
                {isSubmitting ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Suspend Modal */}
      {showSuspendModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">Suspend Salon</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Reason (shown to users)</label>
                <textarea
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="Enter reason shown to salon users..."
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Internal Note (optional)</label>
                <textarea
                  value={suspendNote}
                  onChange={(e) => setSuspendNote(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="Internal note for operators..."
                />
              </div>
            </div>
            <div className="flex gap-4 mt-6">
              <button
                onClick={() => setShowSuspendModal(false)}
                className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleSuspend}
                disabled={isSubmitting || !suspendReason}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
              >
                {isSubmitting ? 'Processing...' : 'Suspend'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
