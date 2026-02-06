import { useState, useEffect } from 'react';
import { Download, DollarSign, Users } from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { Enrollment } from '@/types';

export function Reports() {
  const { userData } = useAuth();
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalMembers: 0,
    approvedEnrollments: 0,
    pendingEnrollments: 0,
  });
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReportsData = async () => {
      if (!userData?.gymId) return;

      try {
        setLoading(true);

        // Fetch all enrollments for this gym
        const enrollmentsQuery = query(
          collection(db, 'enrollments'),
          where('gymId', '==', userData.gymId)
        );
        const enrollmentsSnapshot = await getDocs(enrollmentsQuery);
        const enrollmentsList = enrollmentsSnapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          createdAt: (doc.data().createdAt as any)?.toDate ? (doc.data().createdAt as any).toDate() : doc.data().createdAt,
        })) as Enrollment[];
        setEnrollments(enrollmentsList);

        // Calculate stats
        const approved = enrollmentsList.filter(e => e.status === 'approved');
        const pending = enrollmentsList.filter(e => e.status === 'pending');
        const totalRevenue = approved.reduce((sum, e) => sum + e.amount, 0);

        // Get member count
        const membersQuery = query(
          collection(db, 'users'),
          where('gymId', '==', userData.gymId),
          where('role', '==', 'member'),
          where('enrollmentStatus', '==', 'approved')
        );
        const membersSnapshot = await getDocs(membersQuery);

        setStats({
          totalRevenue,
          totalMembers: membersSnapshot.size,
          approvedEnrollments: approved.length,
          pendingEnrollments: pending.length,
        });

      } catch (error) {
        console.error("Error fetching reports data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchReportsData();
  }, [userData]);

  const exportPayments = () => {
    const csv = [
      ['Date', 'Member', 'Email', 'Amount', 'Payment Method', 'Status'].join(','),
      ...enrollments.map(e => [
        e.createdAt instanceof Date ? e.createdAt.toLocaleDateString() : 'N/A',
        e.userName,
        e.userEmail,
        e.amount,
        e.paymentMethod,
        e.status
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payments-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Reports</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Analytics and insights</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={exportPayments}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg font-medium text-sm transition-colors"
          >
            <Download className="w-4 h-4" />
            Export Payments
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
              <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          <p className="text-2xl font-semibold text-gray-900 dark:text-white mb-1">
            {loading ? '...' : `₹${stats.totalRevenue}`}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400">Total Revenue</p>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <p className="text-2xl font-semibold text-gray-900 dark:text-white mb-1">
            {loading ? '...' : stats.totalMembers}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400">Total Active Members</p>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <DollarSign className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          <p className="text-2xl font-semibold text-gray-900 dark:text-white mb-1">
            {loading ? '...' : stats.approvedEnrollments}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400">Approved Enrollments</p>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <Users className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
          <p className="text-2xl font-semibold text-gray-900 dark:text-white mb-1">
            {loading ? '...' : stats.pendingEnrollments}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400">Pending Requests</p>
        </div>
      </div>

      {/* All Transactions Table */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
        <div className="p-5 border-b border-gray-200 dark:border-gray-800">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">All Transactions</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800/50">
              <tr>
                <th className="text-left py-3 px-5 text-xs font-medium text-gray-600 dark:text-gray-400">Date</th>
                <th className="text-left py-3 px-5 text-xs font-medium text-gray-600 dark:text-gray-400">Member</th>
                <th className="text-left py-3 px-5 text-xs font-medium text-gray-600 dark:text-gray-400">Email</th>
                <th className="text-left py-3 px-5 text-xs font-medium text-gray-600 dark:text-gray-400">Amount</th>
                <th className="text-left py-3 px-5 text-xs font-medium text-gray-600 dark:text-gray-400">Method</th>
                <th className="text-left py-3 px-5 text-xs font-medium text-gray-600 dark:text-gray-400">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500">Loading...</td>
                </tr>
              ) : enrollments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500">No transactions found</td>
                </tr>
              ) : (
                enrollments.map((enrollment) => (
                  <tr key={enrollment.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                    <td className="py-3 px-5 text-sm text-gray-900 dark:text-white">
                      {enrollment.createdAt instanceof Date ? enrollment.createdAt.toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="py-3 px-5 text-sm font-medium text-gray-900 dark:text-white">{enrollment.userName}</td>
                    <td className="py-3 px-5 text-sm text-gray-600 dark:text-gray-400">{enrollment.userEmail}</td>
                    <td className="py-3 px-5 text-sm font-semibold text-gray-900 dark:text-white">₹{enrollment.amount}</td>
                    <td className="py-3 px-5">
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400 rounded text-xs font-medium uppercase">
                        {enrollment.paymentMethod}
                      </span>
                    </td>
                    <td className="py-3 px-5">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium capitalize ${enrollment.status === 'approved'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : enrollment.status === 'pending'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          }`}
                      >
                        {enrollment.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
