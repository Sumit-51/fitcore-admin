import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { parseFirestoreDate } from '@/utils/date';
import { CheckCircle, XCircle, Clock, ArrowRightLeft, RefreshCw } from 'lucide-react';

interface PlanChangeRequest {
  id: string;
  userId: string;
  gymId: string | null;
  currentDuration: number;
  requestedDuration: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
  reviewedAt: Date | null;
  reviewedBy: string | null;
  // Extra fields the user app also stores
  userName?: string;
  userEmail?: string;
  gymName?: string;
}

const getPlanLabel = (d: number): string => {
  if (d === 1) return '1 Month';
  if (d === 3) return '3 Months';
  if (d === 6) return '6 Months';
  if (d === 12) return '12 Months';
  return `${d} Month`;
};

export function PlanChangeRequests() {
  const { userData, user } = useAuth();
  const [requests, setRequests] = useState<PlanChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  const fetchRequests = async () => {
    if (!userData?.gymId) return;
    try {
      setLoading(true);
      const q = query(
        collection(db, 'planChangeRequests'),
        where('gymId', '==', userData.gymId)
      );
      const snap = await getDocs(q);
      const list: PlanChangeRequest[] = snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          userId: data.userId || '',
          gymId: data.gymId || null,
          currentDuration: data.currentDuration || 1,
          requestedDuration: data.requestedDuration || 1,
          status: data.status || 'pending',
          createdAt: parseFirestoreDate(data.createdAt) || new Date(),
          reviewedAt: parseFirestoreDate(data.reviewedAt),
          reviewedBy: data.reviewedBy || null,
          userName: data.userName || null,
          userEmail: data.userEmail || null,
          gymName: data.gymName || null,
        };
      });
      // Sort: pending first, then by date desc
      list.sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (b.status === 'pending' && a.status !== 'pending') return 1;
        return b.createdAt.getTime() - a.createdAt.getTime();
      });
      setRequests(list);
    } catch (error) {
      console.error('Error fetching plan change requests:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRequests(); }, [userData]);

  const handleApprove = async (req: PlanChangeRequest) => {
    if (!confirm(`Approve plan change for ${req.userName || req.userId}?\n\n${getPlanLabel(req.currentDuration)} → ${getPlanLabel(req.requestedDuration)}`)) return;
    setActionLoading(req.id);
    try {
      // 1. Update the request status
      await updateDoc(doc(db, 'planChangeRequests', req.id), {
        status: 'approved',
        reviewedAt: serverTimestamp(),
        reviewedBy: user?.uid || null,
      });

      // 2. Update the user's actual planDuration in the users collection
      await updateDoc(doc(db, 'users', req.userId), {
        planDuration: req.requestedDuration,
        enrolledAt: serverTimestamp(), // Reset enrollment date for new plan cycle
      });

      await fetchRequests();
      alert('Plan change approved! Member\'s plan has been updated.');
    } catch (error) {
      console.error('Error approving plan change:', error);
      alert('Failed to approve plan change');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (req: PlanChangeRequest) => {
    if (!confirm(`Reject plan change request from ${req.userName || req.userId}?`)) return;
    setActionLoading(req.id);
    try {
      await updateDoc(doc(db, 'planChangeRequests', req.id), {
        status: 'rejected',
        reviewedAt: serverTimestamp(),
        reviewedBy: user?.uid || null,
      });
      await fetchRequests();
      alert('Plan change rejected.');
    } catch (error) {
      console.error('Error rejecting plan change:', error);
      alert('Failed to reject plan change');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredRequests = filter === 'all'
    ? requests
    : requests.filter(r => r.status === filter);

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
      <div className="p-5 border-b border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <ArrowRightLeft className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Plan Change Requests</h3>
          {pendingCount > 0 && (
            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded-full text-xs font-medium">
              {pendingCount} pending
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filter}
            onChange={e => setFilter(e.target.value as typeof filter)}
            className="px-3 py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All ({requests.length})</option>
            <option value="pending">Pending ({pendingCount})</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          <button onClick={fetchRequests} className="p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-8 flex justify-center">
          <div className="w-6 h-6 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="p-8 text-center">
          <Clock className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No plan change requests</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800/50">
              <tr>
                <th className="text-left py-3 px-5 text-xs font-medium text-gray-600 dark:text-gray-400">Member</th>
                <th className="text-left py-3 px-5 text-xs font-medium text-gray-600 dark:text-gray-400">Current Plan</th>
                <th className="text-left py-3 px-5 text-xs font-medium text-gray-600 dark:text-gray-400">Requested Plan</th>
                <th className="text-left py-3 px-5 text-xs font-medium text-gray-600 dark:text-gray-400">Date</th>
                <th className="text-left py-3 px-5 text-xs font-medium text-gray-600 dark:text-gray-400">Status</th>
                <th className="text-right py-3 px-5 text-xs font-medium text-gray-600 dark:text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {filteredRequests.map(req => (
                <tr key={req.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                  <td className="py-3 px-5">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{req.userName || 'Unknown'}</p>
                    {req.userEmail && <p className="text-xs text-gray-500">{req.userEmail}</p>}
                  </td>
                  <td className="py-3 px-5">
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400 rounded text-xs font-medium">
                      {getPlanLabel(req.currentDuration)}
                    </span>
                  </td>
                  <td className="py-3 px-5">
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded text-xs font-medium">
                      {getPlanLabel(req.requestedDuration)}
                    </span>
                  </td>
                  <td className="py-3 px-5 text-sm text-gray-600 dark:text-gray-400">
                    {req.createdAt.toLocaleDateString()}
                  </td>
                  <td className="py-3 px-5">
                    <span className={`px-2 py-1 rounded text-xs font-medium capitalize ${
                      req.status === 'pending'
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                        : req.status === 'approved'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {req.status}
                    </span>
                  </td>
                  <td className="py-3 px-5">
                    <div className="flex items-center justify-end gap-2">
                      {req.status === 'pending' ? (
                        <>
                          <button
                            onClick={() => handleApprove(req)}
                            disabled={actionLoading === req.id}
                            className="p-1.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded transition-colors disabled:opacity-50"
                            title="Approve"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleReject(req)}
                            disabled={actionLoading === req.id}
                            className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors disabled:opacity-50"
                            title="Reject"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <span className="text-xs text-gray-400">
                          {req.reviewedAt ? `Reviewed ${req.reviewedAt.toLocaleDateString()}` : '--'}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}