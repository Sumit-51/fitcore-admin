'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs, doc, updateDoc, query, orderBy, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Gym } from '@/types';
import { Building2, Users, DollarSign, LogOut, Key, Ban, CheckCircle, Trash2, Plus, AlertTriangle, Flag, ChevronDown, ChevronUp } from 'lucide-react';
import { getAuth, sendPasswordResetEmail } from 'firebase/auth';

interface GymReport {
  id: string;
  gymId: string;
  gymName: string;
  userId: string;
  userName: string;
  userEmail: string;
  issueTypes: string[];
  description: string;
  status: string;
  createdAt: Date;
  reviewedAt: Date | null;
  reviewedBy: string | null;
  adminNotes?: string;
}

interface FlaggedGym {
  gymId: string;
  gymName: string;
  totalReports: number;
  pendingReports: number;
  issueBreakdown: Record<string, number>;
  reports: GymReport[];
  gym?: Gym;
}

const parseDate = (val: unknown): Date => {
  if (!val) return new Date();
  if (val instanceof Date) return val;
  if (typeof val === 'object' && val !== null && 'toDate' in val) {
    return (val as { toDate: () => Date }).toDate();
  }
  if (typeof val === 'object' && val !== null && 'seconds' in val) {
    return new Date((val as { seconds: number }).seconds * 1000);
  }
  return new Date(val as string);
};

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const { user, userData, loading: authLoading, logout } = useAuth();
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const auth = getAuth();

  // Flagged gyms state
  const [flaggedGyms, setFlaggedGyms] = useState<FlaggedGym[]>([]);
  const [flaggedLoading, setFlaggedLoading] = useState(true);
  const [expandedGym, setExpandedGym] = useState<string | null>(null);
  const REPORT_THRESHOLD = 3; // Show gym if reports >= this number

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate('/');
      } else if (userData?.role !== 'superAdmin') {
        navigate('/');
      } else {
        fetchGyms();
        fetchFlaggedGyms();
      }
    }
  }, [user, userData, authLoading, navigate]);

  const fetchGyms = async () => {
    try {
      const gymsQuery = query(collection(db, 'gyms'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(gymsQuery);
      const gymsList: Gym[] = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        name: docSnap.data().name,
        address: docSnap.data().address,
        phone: docSnap.data().phone,
        email: docSnap.data().email,
        upiId: docSnap.data().upiId,
        monthlyFee: docSnap.data().monthlyFee,
        createdAt: docSnap.data().createdAt?.toDate() || new Date(),
        adminId: docSnap.data().adminId,
        isActive: docSnap.data().isActive ?? true,
      }));
      setGyms(gymsList);
    } catch (error) {
      console.error('Error fetching gyms:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFlaggedGyms = async () => {
    try {
      setFlaggedLoading(true);
      // Fetch ALL gym reports
      const reportsSnap = await getDocs(collection(db, 'gymReports'));
      const allReports: GymReport[] = reportsSnap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          gymId: data.gymId || '',
          gymName: data.gymName || '',
          userId: data.userId || '',
          userName: data.userName || '',
          userEmail: data.userEmail || '',
          issueTypes: data.issueTypes || [],
          description: data.description || '',
          status: data.status || 'pending',
          createdAt: parseDate(data.createdAt),
          reviewedAt: data.reviewedAt ? parseDate(data.reviewedAt) : null,
          reviewedBy: data.reviewedBy || null,
          adminNotes: data.adminNotes || undefined,
        };
      });

      // Group by gymId - Filter out resolved/rejected reports from flagging count
      const gymMap = new Map<string, GymReport[]>();
      allReports.forEach(r => {
        // Exclude resolved and rejected reports from the count
        if (r.status === 'resolved' || r.status === 'rejected') return;

        if (!gymMap.has(r.gymId)) gymMap.set(r.gymId, []);
        gymMap.get(r.gymId)!.push(r);
      });

      // Filter: only gyms with >= REPORT_THRESHOLD reports
      const flagged: FlaggedGym[] = [];
      gymMap.forEach((reports, gymId) => {
        if (reports.length >= REPORT_THRESHOLD) {
          // Build issue breakdown
          const issueBreakdown: Record<string, number> = {};
          reports.forEach(r => {
            r.issueTypes.forEach(issue => {
              issueBreakdown[issue] = (issueBreakdown[issue] || 0) + 1;
            });
          });

          // Sort reports by date desc
          reports.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

          flagged.push({
            gymId,
            gymName: reports[0].gymName || 'Unknown Gym',
            totalReports: reports.length,
            pendingReports: reports.filter(r => r.status === 'pending').length,
            issueBreakdown,
            reports,
          });
        }
      });

      // Sort by total reports desc
      flagged.sort((a, b) => b.totalReports - a.totalReports);
      setFlaggedGyms(flagged);
    } catch (error) {
      console.error('Error fetching flagged gyms:', error);
    } finally {
      setFlaggedLoading(false);
    }
  };

  const handleResetPassword = async (gym: Gym) => {
    if (!gym.email) {
      alert('No email found for this gym admin');
      return;
    }

    if (!confirm(`Send password reset email to ${gym.email}?`)) return;

    setActionLoading(gym.id);
    try {
      await sendPasswordResetEmail(auth, gym.email);
      alert(`Password reset email sent to ${gym.email}`);
    } catch (error) {
      console.error('Error sending password reset:', error);
      alert('Failed to send password reset email');
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleActive = async (gym: Gym) => {
    const action = gym.isActive ? 'deactivate' : 'activate';
    if (!confirm(`Are you sure you want to ${action} ${gym.name}?`)) return;

    setActionLoading(gym.id);
    try {
      await updateDoc(doc(db, 'gyms', gym.id), {
        isActive: !gym.isActive,
      });
      await fetchGyms();
      alert(`Gym ${action}d successfully`);
    } catch (error) {
      console.error(`Error ${action}ing gym:`, error);
      alert(`Failed to ${action} gym`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteGym = async (gym: Gym) => {
    if (!confirm(`⚠️ WARNING: Delete ${gym.name}? This action cannot be undone!`)) return;
    if (!confirm(`Type the gym name to confirm deletion: "${gym.name}"`)) return;

    setActionLoading(gym.id);
    try {
      await updateDoc(doc(db, 'gyms', gym.id), {
        isActive: false,
      });
      await fetchGyms();
      alert('Gym deactivated (deletion requires additional cleanup)');
    } catch (error) {
      console.error('Error deleting gym:', error);
      alert('Failed to delete gym');
    } finally {
      setActionLoading(null);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const stats = {
    totalGyms: gyms.length,
    activeGyms: gyms.filter((g) => g.isActive).length,
    inactiveGyms: gyms.filter((g) => !g.isActive).length,
    totalRevenue: gyms.reduce((sum, g) => sum + g.monthlyFee, 0),
  };

  const issueColors: Record<string, string> = {
    Equipment: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    Cleanliness: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    Staff: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    Safety: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    Other: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
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
              <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white">FITCORE</h1>
                <p className="text-sm text-purple-600 dark:text-purple-400">Super Admin</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/super-admin/create-gym')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium text-sm transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create Gym
              </button>
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
        {/* Banner - PROMINENT */}
        <div className="flex flex-col sm:flex-row items-center justify-between bg-purple-50 dark:bg-purple-900/10 border-2 border-purple-200 dark:border-purple-800 rounded-lg p-4 gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Gym Management</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Create and manage all gyms in the system</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.totalGyms}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Gyms</p>
          </div>

          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
            <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.activeGyms}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Active Gyms</p>
          </div>

          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <Ban className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
            </div>
            <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.inactiveGyms}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Inactive Gyms</p>
          </div>

          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <DollarSign className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <p className="text-2xl font-semibold text-gray-900 dark:text-white">₹{stats.totalRevenue}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Monthly Fees</p>
          </div>
        </div>

        {/* ⚠️ FLAGGED GYMS — Repeated Reports Section */}
        <div className="bg-white dark:bg-gray-900 border-2 border-red-200 dark:border-red-900/50 rounded-lg overflow-hidden">
          <div className="p-5 border-b border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Flagged Gyms — Repeated Reports ({REPORT_THRESHOLD}+ reports)
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Gyms with {REPORT_THRESHOLD} or more member reports that need your attention
                </p>
              </div>
            </div>
            {flaggedGyms.length > 0 && (
              <span className="px-3 py-1 bg-red-600 text-white rounded-full text-xs font-bold">
                {flaggedGyms.length} flagged
              </span>
            )}
          </div>

          {flaggedLoading ? (
            <div className="p-8 flex justify-center">
              <div className="w-6 h-6 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : flaggedGyms.length === 0 ? (
            <div className="p-8 text-center">
              <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400">All clear! No gyms have {REPORT_THRESHOLD}+ reports.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-800">
              {flaggedGyms.map(fg => (
                <div key={fg.gymId} className="transition-colors">
                  {/* Flagged Gym Summary Row */}
                  <button
                    onClick={() => setExpandedGym(expandedGym === fg.gymId ? null : fg.gymId)}
                    className="w-full flex items-center justify-between p-5 hover:bg-gray-50 dark:hover:bg-gray-800/30 text-left"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg shrink-0">
                        <Flag className="w-4 h-4 text-red-600 dark:text-red-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{fg.gymName}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span className="px-2 py-0.5 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded text-xs font-bold">
                            {fg.totalReports} reports
                          </span>
                          {fg.pendingReports > 0 && (
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded text-xs font-medium">
                              {fg.pendingReports} pending
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Issue Breakdown Chips */}
                    <div className="hidden md:flex items-center gap-1.5 mx-4 shrink-0">
                      {Object.entries(fg.issueBreakdown)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 4)
                        .map(([issue, count]) => (
                          <span key={issue} className={`px-2 py-0.5 rounded text-xs font-medium ${issueColors[issue] || issueColors.Other}`}>
                            {issue}: {count}
                          </span>
                        ))}
                    </div>

                    {expandedGym === fg.gymId
                      ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" />
                      : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                    }
                  </button>

                  {/* Expanded Detail — Individual Reports */}
                  {expandedGym === fg.gymId && (
                    <div className="bg-gray-50 dark:bg-gray-800/20 border-t border-gray-200 dark:border-gray-800">
                      {/* Issue breakdown summary */}
                      <div className="px-5 pt-4 pb-2 flex flex-wrap gap-2">
                        {Object.entries(fg.issueBreakdown)
                          .sort((a, b) => b[1] - a[1])
                          .map(([issue, count]) => (
                            <div key={issue} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${issueColors[issue] || issueColors.Other}`}>
                              <span>{issue}</span>
                              <span className="opacity-70">×{count}</span>
                            </div>
                          ))}
                      </div>

                      {/* Individual reports table */}
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-100 dark:bg-gray-800/50">
                            <tr>
                              <th className="text-left py-2 px-5 text-xs font-medium text-gray-600 dark:text-gray-400">Date</th>
                              <th className="text-left py-2 px-5 text-xs font-medium text-gray-600 dark:text-gray-400">Member</th>
                              <th className="text-left py-2 px-5 text-xs font-medium text-gray-600 dark:text-gray-400">Issues</th>
                              <th className="text-left py-2 px-5 text-xs font-medium text-gray-600 dark:text-gray-400">Description</th>
                              <th className="text-left py-2 px-5 text-xs font-medium text-gray-600 dark:text-gray-400">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                            {fg.reports.map(report => (
                              <tr key={report.id} className="hover:bg-white dark:hover:bg-gray-800/40">
                                <td className="py-2.5 px-5 text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                                  {report.createdAt.toLocaleDateString()}
                                </td>
                                <td className="py-2.5 px-5">
                                  <p className="text-xs font-medium text-gray-900 dark:text-white">{report.userName || 'Unknown'}</p>
                                  <p className="text-xs text-gray-500 truncate max-w-[150px]">{report.userEmail}</p>
                                </td>
                                <td className="py-2.5 px-5">
                                  <div className="flex flex-wrap gap-1">
                                    {report.issueTypes.map(issue => (
                                      <span key={issue} className={`px-1.5 py-0.5 rounded text-xs ${issueColors[issue] || issueColors.Other}`}>
                                        {issue}
                                      </span>
                                    ))}
                                  </div>
                                </td>
                                <td className="py-2.5 px-5 text-xs text-gray-600 dark:text-gray-400 max-w-[250px] truncate">
                                  {report.description}
                                </td>
                                <td className="py-2.5 px-5">
                                  <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${report.status === 'pending'
                                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                    : report.status === 'resolved'
                                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                      : report.status === 'reviewed'
                                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                    }`}>
                                    {report.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Gyms Table */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
          <div className="p-5 border-b border-gray-200 dark:border-gray-800">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">All Gyms</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  <th className="text-left py-3 px-5 text-xs font-medium text-gray-600 dark:text-gray-400">Gym Name</th>
                  <th className="text-left py-3 px-5 text-xs font-medium text-gray-600 dark:text-gray-400">Contact</th>
                  <th className="text-left py-3 px-5 text-xs font-medium text-gray-600 dark:text-gray-400">Monthly Fee</th>
                  <th className="text-left py-3 px-5 text-xs font-medium text-gray-600 dark:text-gray-400">Status</th>
                  <th className="text-left py-3 px-5 text-xs font-medium text-gray-600 dark:text-gray-400">Created</th>
                  <th className="text-right py-3 px-5 text-xs font-medium text-gray-600 dark:text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {gyms.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-500">
                      <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p>No gyms found</p>
                    </td>
                  </tr>
                ) : (
                  gyms.map((gym) => {
                    // Check if this gym is flagged
                    const flagInfo = flaggedGyms.find(f => f.gymId === gym.id);
                    return (
                      <tr key={gym.id} className={`hover:bg-gray-50 dark:hover:bg-gray-800/30 ${flagInfo ? 'bg-red-50/50 dark:bg-red-900/5' : ''}`}>
                        <td className="py-3 px-5">
                          <div className="flex items-center gap-2">
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">{gym.name}</p>
                              <p className="text-xs text-gray-600 dark:text-gray-400">{gym.address}</p>
                            </div>
                            {flagInfo && (
                              <span className="px-1.5 py-0.5 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded text-xs font-bold shrink-0" title={`${flagInfo.totalReports} member reports`}>
                                ⚠ {flagInfo.totalReports}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-5">
                          <p className="text-sm text-gray-900 dark:text-white">{gym.email}</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">{gym.phone}</p>
                        </td>
                        <td className="py-3 px-5 text-sm font-semibold text-gray-900 dark:text-white">₹{gym.monthlyFee}</td>
                        <td className="py-3 px-5">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${gym.isActive
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                              }`}
                          >
                            {gym.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="py-3 px-5 text-sm text-gray-600 dark:text-gray-400">
                          {gym.createdAt instanceof Date ? gym.createdAt.toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="py-3 px-5">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleResetPassword(gym)}
                              disabled={actionLoading === gym.id}
                              className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors disabled:opacity-50"
                              title="Reset Admin Password"
                            >
                              <Key className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleToggleActive(gym)}
                              disabled={actionLoading === gym.id}
                              className={`p-1.5 rounded transition-colors disabled:opacity-50 ${gym.isActive
                                ? 'text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/30'
                                : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30'
                                }`}
                              title={gym.isActive ? 'Deactivate Gym' : 'Activate Gym'}
                            >
                              {gym.isActive ? <Ban className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={() => handleDeleteGym(gym)}
                              disabled={actionLoading === gym.id}
                              className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors disabled:opacity-50"
                              title="Delete Gym"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>


      </main>
    </div>
  );
}