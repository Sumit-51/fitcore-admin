// src/app/dashboard/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs, doc, updateDoc, query, orderBy, where, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Enrollment } from '@/types';
import { Building2, Users, Clock, CheckCircle, XCircle, DollarSign, LogOut } from 'lucide-react';

export default function GymAdminDashboard() {
  const navigate = useNavigate();
  const { user, userData, userGym, loading: authLoading, logout } = useAuth();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate('/');
      } else if (userData?.role !== 'gymAdmin') {
        navigate('/');
      } else if (userData.gymId) {
        fetchEnrollments(userData.gymId);
      }
    }
  }, [user, userData, authLoading, navigate]);

  const fetchEnrollments = async (gymId: string) => {
    try {
      const enrollmentsQuery = query(
        collection(db, 'enrollments'),
        where('gymId', '==', gymId),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(enrollmentsQuery);
      const enrollmentsList: Enrollment[] = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        userId: docSnap.data().userId,
        userName: docSnap.data().userName,
        userEmail: docSnap.data().userEmail,
        gymId: docSnap.data().gymId,
        gymName: docSnap.data().gymName,
        paymentMethod: docSnap.data().paymentMethod,
        transactionId: docSnap.data().transactionId,
        amount: docSnap.data().amount,
        status: docSnap.data().status,
        createdAt: docSnap.data().createdAt?.toDate() || new Date(),
        verifiedAt: docSnap.data().verifiedAt?.toDate() || null,
        verifiedBy: docSnap.data().verifiedBy || null,
      }));
      setEnrollments(enrollmentsList);
    } catch (error) {
      console.error('Error fetching enrollments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (enrollment: Enrollment) => {
    if (!confirm(`Approve enrollment for ${enrollment.userName}?`)) return;
    setActionLoading(enrollment.id);
    try {
      await updateDoc(doc(db, 'enrollments', enrollment.id), {
        status: 'approved',
        verifiedAt: serverTimestamp(),
        verifiedBy: user?.uid || null,
      });
      await updateDoc(doc(db, 'users', enrollment.userId), {
        enrollmentStatus: 'approved',
        enrolledAt: serverTimestamp(),
        gymId: userData?.gymId || enrollment.gymId,
      });
      if (userData?.gymId) {
        await fetchEnrollments(userData.gymId);
      }
      alert('Approved successfully');
    } catch (error) {
      console.error('Error approving:', error);
      alert('Failed to approve enrollment. Please check permissions.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (enrollment: Enrollment) => {
    if (!confirm(`Reject enrollment for ${enrollment.userName}?`)) return;
    setActionLoading(enrollment.id);
    try {
      await updateDoc(doc(db, 'enrollments', enrollment.id), {
        status: 'rejected',
        verifiedAt: serverTimestamp(),
        verifiedBy: user?.uid || null,
      });
      await updateDoc(doc(db, 'users', enrollment.userId), {
        enrollmentStatus: 'rejected',
        gymId: null,
      });
      if (userData?.gymId) {
        await fetchEnrollments(userData.gymId);
      }
      alert('Rejected successfully');
    } catch (error) {
      console.error('Error rejecting:', error);
      alert('Failed to reject enrollment');
    } finally {
      setActionLoading(null);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const filteredEnrollments = enrollments.filter((e) => e.status === activeTab);

  const stats = {
    pending: enrollments.filter((e) => e.status === 'pending').length,
    approved: enrollments.filter((e) => e.status === 'approved').length,
    rejected: enrollments.filter((e) => e.status === 'rejected').length,
    revenue: enrollments.filter((e) => e.status === 'approved').reduce((sum, e) => sum + e.amount, 0),
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white">FITCORE</h1>
                <p className="text-sm text-blue-600 dark:text-blue-400">Gym Admin</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{userData?.displayName}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">{userData?.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Gym Info Card */}
        {userGym && (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-7 h-7 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{userGym.name}</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{userGym.address}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{userGym.phone}</p>
                </div>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-xs text-gray-600 dark:text-gray-400">Monthly Fee</p>
                <p className="text-2xl font-semibold text-blue-600 dark:text-blue-400">₹{userGym.monthlyFee}</p>
              </div>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.pending}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Pending</p>
          </div>

          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
            <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.approved}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Approved</p>
          </div>

          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
            </div>
            <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.rejected}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Rejected</p>
          </div>

          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <DollarSign className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <p className="text-2xl font-semibold text-gray-900 dark:text-white">₹{stats.revenue.toLocaleString()}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Revenue</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-1">
          {(['pending', 'approved', 'rejected'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 px-4 py-2 rounded text-sm font-medium capitalize transition-colors ${activeTab === tab
                ? 'bg-blue-600 text-white'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
            >
              {tab} ({stats[tab]})
            </button>
          ))}
        </div>

        {/* Enrollments Table */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
          {filteredEnrollments.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 dark:text-gray-400">No {activeTab} enrollments</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800/50">
                  <tr>
                    <th className="text-left py-3 px-5 text-xs font-medium text-gray-600 dark:text-gray-400">Member</th>
                    <th className="text-left py-3 px-5 text-xs font-medium text-gray-600 dark:text-gray-400">Payment</th>
                    <th className="text-left py-3 px-5 text-xs font-medium text-gray-600 dark:text-gray-400">Amount</th>
                    <th className="text-left py-3 px-5 text-xs font-medium text-gray-600 dark:text-gray-400">Date</th>
                    {activeTab === 'pending' && (
                      <th className="text-right py-3 px-5 text-xs font-medium text-gray-600 dark:text-gray-400">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {filteredEnrollments.map((enrollment) => (
                    <tr key={enrollment.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                      <td className="py-3 px-5">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{enrollment.userName}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">{enrollment.userEmail}</p>
                      </td>
                      <td className="py-3 px-5">
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded text-xs font-medium capitalize">
                          {enrollment.paymentMethod}
                        </span>
                      </td>
                      <td className="py-3 px-5 text-sm font-semibold text-gray-900 dark:text-white">
                        ₹{enrollment.amount}
                      </td>
                      <td className="py-3 px-5 text-sm text-gray-600 dark:text-gray-400">
                        {enrollment.createdAt.toLocaleDateString()}
                      </td>
                      {activeTab === 'pending' && (
                        <td className="py-3 px-5">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleApprove(enrollment)}
                              disabled={actionLoading === enrollment.id}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg disabled:opacity-50 transition-colors"
                            >
                              {actionLoading === enrollment.id ? '...' : 'Approve'}
                            </button>
                            <button
                              onClick={() => handleReject(enrollment)}
                              disabled={actionLoading === enrollment.id}
                              className="px-3 py-1.5 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 text-xs font-medium rounded-lg disabled:opacity-50 transition-colors"
                            >
                              Reject
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
