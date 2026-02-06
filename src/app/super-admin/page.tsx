'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs, doc, updateDoc, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Gym } from '@/types';
import { Building2, Users, DollarSign, LogOut, Key, Ban, CheckCircle, Trash2, Plus } from 'lucide-react';
import { getAuth, sendPasswordResetEmail } from 'firebase/auth';
import CreateGymForm from '@/components/CreateGymForm';

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const { user, userData, loading: authLoading, logout } = useAuth();
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showCreateGym, setShowCreateGym] = useState(false);
  const auth = getAuth();

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate('/');
      } else if (userData?.role !== 'superAdmin') {
        navigate('/');
      } else {
        fetchGyms();
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
      // In a real app, you'd want to:
      // 1. Delete all associated users
      // 2. Delete all enrollments
      // 3. Then delete the gym
      // For now, just mark as inactive
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
        {/* Stats Cards */}
        {/* CREATE GYM BUTTON - PROMINENT */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-purple-50 dark:bg-purple-900/10 border-2 border-purple-200 dark:border-purple-800 rounded-lg p-4 gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Gym Management</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Create and manage all gyms in the system</p>
          </div>
          <button
            onClick={() => navigate('/super-admin/create-gym')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold text-base shadow-lg hover:shadow-xl transition-all w-full sm:w-auto justify-center"
          >
            <Plus className="w-5 h-5" />
            Create New Gym
          </button>
        </div>

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
                  gyms.map((gym) => (
                    <tr key={gym.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                      <td className="py-3 px-5">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{gym.name}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">{gym.address}</p>
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
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Create Gym Modal */}
        {showCreateGym && (
          <div className="fixed inset-0 bg-gray-900/50 z-[9999] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-900 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-4 flex items-center justify-between z-10">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Create New Gym</h2>
                <button
                  onClick={() => setShowCreateGym(false)}
                  className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  ✕
                </button>
              </div>
              <div className="p-6">
                <CreateGymForm
                  onSuccess={() => {
                    setShowCreateGym(false);
                    fetchGyms();
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
