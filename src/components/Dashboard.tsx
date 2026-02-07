// src/components/Dashboard.tsx
import { useState, useEffect } from 'react';
import { TrendingUp, Users, DollarSign, AlertCircle, CheckCircle, XCircle, AlertTriangle, Flag, RefreshCw } from 'lucide-react';
import { collection, query, where, getDocs, getCountFromServer, orderBy, limit, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { Enrollment, GymReport } from '@/types';
import { parseFirestoreDate } from '@/utils/date';
import { useNavigate } from 'react-router-dom';

interface DashboardProps {
  darkMode: boolean;
}

export function Dashboard({ darkMode }: DashboardProps) {
  const { userData, user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    activeMembers: 0,
    enrollmentRequests: 0,
    todaysRevenue: 0,
    totalRevenue: 0,
    pendingReports: 0,
    pendingPlanChanges: 0,
  });
  const [recentPayments, setRecentPayments] = useState<Enrollment[]>([]);
  const [pendingEnrollments, setPendingEnrollments] = useState<Enrollment[]>([]);
  const [recentReports, setRecentReports] = useState<GymReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    if (!userData?.gymId) return;

    try {
      setLoading(true);
      setError(null);

      // 1. Active Members
      const activeMembersQuery = query(
        collection(db, 'users'),
        where('gymId', '==', userData.gymId),
        where('role', '==', 'member'),
        where('enrollmentStatus', '==', 'approved')
      );
      const activeMembersCount = (await getCountFromServer(activeMembersQuery)).data().count;

      // 2. Pending Enrollments
      let pendingList: Enrollment[] = [];
      try {
        const pendingQuery = query(
          collection(db, 'enrollments'),
          where('gymId', '==', userData.gymId),
          where('status', '==', 'pending'),
          orderBy('createdAt', 'desc'),
          limit(5)
        );
        const pendingSnapshot = await getDocs(pendingQuery);
        pendingList = pendingSnapshot.docs.map(d => ({
          ...d.data(),
          id: d.id,
          createdAt: parseFirestoreDate(d.data().createdAt) || new Date(),
        })) as Enrollment[];
      } catch {
        const fallbackQuery = query(
          collection(db, 'enrollments'),
          where('gymId', '==', userData.gymId),
          where('status', '==', 'pending')
        );
        const snapshot = await getDocs(fallbackQuery);
        pendingList = snapshot.docs
          .map(d => ({
            ...d.data(),
            id: d.id,
            createdAt: parseFirestoreDate(d.data().createdAt) || new Date(),
          })) as Enrollment[];
        pendingList.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        pendingList = pendingList.slice(0, 5);
      }
      setPendingEnrollments(pendingList);

      const pendingCountQuery = query(
        collection(db, 'enrollments'),
        where('gymId', '==', userData.gymId),
        where('status', '==', 'pending')
      );
      const pendingCount = (await getCountFromServer(pendingCountQuery)).data().count;

      // 3. Revenue (today + total)
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const revenueQuery = query(
        collection(db, 'enrollments'),
        where('gymId', '==', userData.gymId),
        where('status', '==', 'approved')
      );
      const revenueSnapshot = await getDocs(revenueQuery);

      let todaysRevenue = 0;
      let totalRevenue = 0;
      revenueSnapshot.docs.forEach(d => {
        const data = d.data();
        const amount = data.amount || 0;
        totalRevenue += amount;
        const date = parseFirestoreDate(data.createdAt);
        if (date && date >= today) {
          todaysRevenue += amount;
        }
      });

      // 4. Recent Payments
      let recentList: Enrollment[] = [];
      try {
        const recentPaymentsQuery = query(
          collection(db, 'enrollments'),
          where('gymId', '==', userData.gymId),
          where('status', '==', 'approved'),
          orderBy('createdAt', 'desc'),
          limit(5)
        );
        const recentSnapshot = await getDocs(recentPaymentsQuery);
        recentList = recentSnapshot.docs.map(d => ({
          ...d.data(),
          id: d.id,
          createdAt: parseFirestoreDate(d.data().createdAt) || new Date(),
        })) as Enrollment[];
      } catch {
        const fallbackQuery = query(
          collection(db, 'enrollments'),
          where('gymId', '==', userData.gymId),
          where('status', '==', 'approved')
        );
        const snapshot = await getDocs(fallbackQuery);
        recentList = snapshot.docs
          .map(d => ({
            ...d.data(),
            id: d.id,
            createdAt: parseFirestoreDate(d.data().createdAt) || new Date(),
          })) as Enrollment[];
        recentList.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        recentList = recentList.slice(0, 5);
      }
      setRecentPayments(recentList);

      // 5. Pending Gym Reports
      let pendingReportsCount = 0;
      let reportsList: GymReport[] = [];
      try {
        const reportsQuery = query(
          collection(db, 'gymReports'),
          where('gymId', '==', userData.gymId),
          where('status', '==', 'pending')
        );
        const reportsSnap = await getDocs(reportsQuery);
        pendingReportsCount = reportsSnap.size;
        reportsList = reportsSnap.docs.map(d => ({
          ...d.data(),
          id: d.id,
          createdAt: parseFirestoreDate(d.data().createdAt) || new Date(),
        })) as GymReport[];
        reportsList.sort((a, b) => (b.createdAt as Date).getTime() - (a.createdAt as Date).getTime());
        reportsList = reportsList.slice(0, 3);
      } catch {
        pendingReportsCount = 0;
      }
      setRecentReports(reportsList);

      // 6. Pending Plan Change Requests
      let pendingPlanChanges = 0;
      try {
        const planQuery = query(
          collection(db, 'planChangeRequests'),
          where('gymId', '==', userData.gymId),
          where('status', '==', 'pending')
        );
        pendingPlanChanges = (await getCountFromServer(planQuery)).data().count;
      } catch {
        pendingPlanChanges = 0;
      }

      setStats({
        activeMembers: activeMembersCount,
        enrollmentRequests: pendingCount,
        todaysRevenue,
        totalRevenue,
        pendingReports: pendingReportsCount,
        pendingPlanChanges,
      });

    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      setError("Failed to load dashboard data. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [userData]);

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
      await fetchDashboardData();
      alert('Enrollment approved successfully');
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
      await fetchDashboardData();
      alert('Enrollment rejected successfully');
    } catch (error) {
      console.error('Error rejecting:', error);
      alert('Failed to reject enrollment');
    } finally {
      setActionLoading(null);
    }
  };

  const kpis = [
    {
      label: 'Active Members',
      value: loading ? '...' : stats.activeMembers.toString(),
      change: stats.activeMembers === 1 ? '1 Member' : `${stats.activeMembers} Members`,
      icon: Users,
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
    },
    {
      label: 'Pending Requests',
      value: loading ? '...' : stats.enrollmentRequests.toString(),
      change: stats.enrollmentRequests > 0 ? 'Needs attention' : 'All caught up',
      icon: AlertCircle,
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-50 dark:bg-orange-900/20',
    },
    {
      label: "Today's Revenue",
      value: loading ? '...' : `₹${stats.todaysRevenue.toLocaleString()}`,
      change: 'From today',
      icon: DollarSign,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    },
    {
      label: 'Total Revenue',
      value: loading ? '...' : `₹${stats.totalRevenue.toLocaleString()}`,
      change: 'All time',
      icon: TrendingUp,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    },
  ];

  // Additional alert cards for issues & plan changes
  const alertCards = [
    stats.pendingReports > 0 && {
      label: 'Issue Reports',
      value: stats.pendingReports,
      desc: `${stats.pendingReports} pending report${stats.pendingReports > 1 ? 's' : ''} from members`,
      icon: Flag,
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-50 dark:bg-amber-900/20',
      borderColor: 'border-amber-200 dark:border-amber-800',
      path: '/gym-reports',
    },
    stats.pendingPlanChanges > 0 && {
      label: 'Plan Changes',
      value: stats.pendingPlanChanges,
      desc: `${stats.pendingPlanChanges} member${stats.pendingPlanChanges > 1 ? 's' : ''} requested plan changes`,
      icon: RefreshCw,
      color: 'text-indigo-600 dark:text-indigo-400',
      bgColor: 'bg-indigo-50 dark:bg-indigo-900/20',
      borderColor: 'border-indigo-200 dark:border-indigo-800',
      path: '/members',
    },
  ].filter(Boolean) as Array<{
    label: string; value: number; desc: string; icon: typeof Flag;
    color: string; bgColor: string; borderColor: string; path: string;
  }>;

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="space-y-6">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 mb-4 rounded-r-xl">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-red-500" aria-hidden="true" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-red-800 dark:text-red-200">
                  {error}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Alert Banners for gym reports & plan changes */}
        {!loading && alertCards.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {alertCards.map((card) => {
              const Icon = card.icon;
              return (
                <button
                  key={card.label}
                  onClick={() => navigate(card.path)}
                  className={`flex items-center gap-4 p-4 rounded-xl border ${card.borderColor} ${card.bgColor} hover:opacity-90 transition-opacity text-left w-full`}
                >
                  <div className={`p-2.5 rounded-lg ${card.bgColor}`}>
                    <Icon className={`w-5 h-5 ${card.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-bold ${card.color}`}>{card.value} {card.label}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{card.desc}</p>
                  </div>
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">View →</span>
                </button>
              );
            })}
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {kpis.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <div
                key={kpi.label}
                className="glass-card p-6 rounded-2xl relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300"
              >
                <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full opacity-10 group-hover:opacity-20 transition-opacity blur-2xl ${kpi.bgColor.replace('bg-', 'bg-')}`}></div>

                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 rounded-xl ${kpi.bgColor}`}>
                    <Icon className={`w-6 h-6 ${kpi.color}`} />
                  </div>
                  <span className="text-xs font-semibold px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                    {kpi.change}
                  </span>
                </div>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1 tracking-tight">{kpi.value}</p>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{kpi.label}</p>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pending Enrollment Requests */}
          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Pending Requests</h3>
              <span className="text-xs font-medium text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 px-3 py-1 rounded-full">
                {pendingEnrollments.length} new
              </span>
            </div>

            <div className="space-y-4">
              {loading ? (
                <p className="text-sm text-gray-500 text-center py-8">Loading requests...</p>
              ) : pendingEnrollments.length === 0 ? (
                <div className="text-center py-12">
                  <div className="bg-emerald-50 dark:bg-emerald-900/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-emerald-500" />
                  </div>
                  <p className="text-base font-medium text-gray-900 dark:text-gray-100">All caught up!</p>
                  <p className="text-sm text-gray-500 mt-1">No pending enrollment requests.</p>
                </div>
              ) : (
                pendingEnrollments.map((enrollment) => (
                  <div
                    key={enrollment.id}
                    className="flex items-center justify-between p-4 rounded-xl bg-gray-50/50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800/50 hover:bg-white dark:hover:bg-gray-800 transition-colors shadow-sm"
                  >
                    <div className="flex-1 min-w-0 pr-4">
                      <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{enrollment.userName}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{enrollment.userEmail}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                          ₹{enrollment.amount}
                        </span>
                        <span className="text-xs text-gray-400">•</span>
                        <span className="text-xs text-gray-500 capitalize">{enrollment.paymentMethod}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleApprove(enrollment)}
                        disabled={actionLoading === enrollment.id}
                        className="p-2 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition-colors disabled:opacity-50"
                        title="Approve"
                      >
                        <CheckCircle className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleReject(enrollment)}
                        disabled={actionLoading === enrollment.id}
                        className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors disabled:opacity-50"
                        title="Reject"
                      >
                        <XCircle className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Payments */}
          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Recent Payments</h3>
            </div>

            <div className="space-y-4">
              {loading ? (
                <p className="text-sm text-gray-500 text-center py-8">Loading payments...</p>
              ) : recentPayments.length === 0 ? (
                <div className="text-center py-12">
                  <div className="bg-gray-50 dark:bg-gray-800/50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <DollarSign className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-base font-medium text-gray-900 dark:text-gray-100">No payments yet</p>
                  <p className="text-xs text-gray-500 mt-1">Approved enrollments will appear here</p>
                </div>
              ) : (
                recentPayments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between p-4 rounded-xl bg-gray-50/50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center text-primary-600 dark:text-primary-400 font-bold text-sm">
                        {payment.userName.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">{payment.userName}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {payment.createdAt instanceof Date ? payment.createdAt.toLocaleDateString() : 'Date N/A'}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900 dark:text-white">₹{payment.amount}</p>
                      <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 capitalize">{payment.paymentMethod}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Recent Gym Issue Reports */}
        {!loading && recentReports.length > 0 && (
          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Flag className="w-5 h-5 text-amber-500" />
                Recent Issue Reports
              </h3>
              <button
                onClick={() => navigate('/gym-reports')}
                className="text-xs font-medium text-primary-600 dark:text-primary-400 hover:underline"
              >
                View all →
              </button>
            </div>
            <div className="space-y-3">
              {recentReports.map(report => (
                <div
                  key={report.id}
                  className="flex items-start justify-between p-4 rounded-xl bg-gray-50/50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800/50"
                >
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{report.userName}</p>
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded text-xs font-medium">
                        pending
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1 mb-1">
                      {report.issueTypes.map(t => (
                        <span key={t} className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded text-xs">
                          {t}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{report.description}</p>
                  </div>
                  <p className="text-xs text-gray-400 whitespace-nowrap">
                    {report.createdAt instanceof Date ? report.createdAt.toLocaleDateString() : ''}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}