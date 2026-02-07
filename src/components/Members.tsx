import { useState, useEffect } from 'react';
import { Search, Filter, Plus, Eye, CheckCircle, XCircle, Trash2, Clock } from 'lucide-react';
import { collection, query, where, getDocs, doc, serverTimestamp, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { UserData } from '@/types';
import { parseFirestoreDate } from '@/utils/date';
import { MemberDetail } from './MemberDetail';
import { AddMember } from './AddMember';
import { PlanChangeRequests } from './PlanChangeRequests';

type FilterType = 'all' | 'active' | 'inactive' | 'pending' | 'expiring' | 'recent';

const getPlanLabel = (member: UserData): string => {
  const d = member.planDuration || 1;
  if (d === 1) return '1 Month';
  if (d === 3) return '3 Month';
  if (d === 6) return '6 Month';
  return `${d} Month`;
};

const getExpiryDate = (member: UserData): Date | null => {
  if (member.enrollmentStatus !== 'approved' || !member.enrolledAt) return null;
  const enrolled = member.enrolledAt instanceof Date ? member.enrolledAt : parseFirestoreDate(member.enrolledAt);
  if (!enrolled) return null;
  const expiry = new Date(enrolled);
  expiry.setMonth(expiry.getMonth() + (member.planDuration || 1));
  return expiry;
};

const isExpiringSoon = (member: UserData): boolean => {
  const expiry = getExpiryDate(member);
  if (!expiry) return false;
  const daysLeft = (expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  return daysLeft >= 0 && daysLeft <= 7;
};

const isExpired = (member: UserData): boolean => {
  const expiry = getExpiryDate(member);
  if (!expiry) return false;
  return expiry.getTime() < Date.now();
};

export function Members() {
  const { userData, user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [showAddMember, setShowAddMember] = useState(false);
  const [members, setMembers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchMembers = async () => {
    if (!userData?.gymId) return;
    try {
      setLoading(true);
      const q = query(
        collection(db, 'users'),
        where('gymId', '==', userData.gymId),
        where('role', '==', 'member')
      );
      const snapshot = await getDocs(q);
      const membersList = snapshot.docs.map(d => {
        const data = d.data();
        const planDuration = (data.planDuration as number) || (data.paymentMethod === 'Quarterly' ? 3 : data.paymentMethod === '6-Month' ? 6 : 1);
        return {
          ...data,
          uid: d.id,
          enrolledAt: parseFirestoreDate(data.enrolledAt),
          createdAt: parseFirestoreDate(data.createdAt) || new Date(),
          planDuration,
          timeSlot: data.timeSlot || null,
          phoneNumber: data.phoneNumber || data.phone || data.userPhone || data.mobile || null,
        } as UserData;
      });
      setMembers(membersList);
    } catch (error) {
      console.error("Error fetching members:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMembers(); }, [userData]);

  const handleApprove = async (member: UserData) => {
    if (!userData?.gymId) { alert("Error: Gym ID not found."); return; }
    if (!confirm(`Approve membership for ${member.displayName}?`)) return;
    setActionLoading(member.uid);
    try {
      await updateDoc(doc(db, 'users', member.uid), {
        enrollmentStatus: 'approved',
        enrolledAt: serverTimestamp(),
        gymId: userData.gymId
      });
      const enrollmentQuery = query(
        collection(db, 'enrollments'),
        where('userId', '==', member.uid),
        where('gymId', '==', userData.gymId),
        where('status', '==', 'pending')
      );
      const enrollmentSnapshot = await getDocs(enrollmentQuery);
      if (!enrollmentSnapshot.empty) {
        await updateDoc(doc(db, 'enrollments', enrollmentSnapshot.docs[0].id), {
          status: 'approved',
          verifiedAt: serverTimestamp(),
          verifiedBy: user?.uid || null,
        });
      }
      await fetchMembers();
      alert('Member approved successfully!');
    } catch (error: unknown) {
      console.error('Error approving member:', error);
      alert(`Failed to approve member: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally { setActionLoading(null); }
  };

  const handleSetPending = async (member: UserData) => {
    if (!userData?.gymId) { alert("Error: Gym ID not found."); return; }
    if (!confirm(`Set ${member.displayName}'s membership to pending?`)) return;
    setActionLoading(member.uid);
    try {
      await updateDoc(doc(db, 'users', member.uid), {
        enrollmentStatus: 'pending',
        enrolledAt: null
      });
      const enrollmentQuery = query(
        collection(db, 'enrollments'),
        where('userId', '==', member.uid),
        where('gymId', '==', userData.gymId)
      );
      const snap = await getDocs(enrollmentQuery);
      if (!snap.empty) {
        await updateDoc(doc(db, 'enrollments', snap.docs[0].id), {
          status: 'pending', verifiedAt: null, verifiedBy: null,
        });
      }
      await fetchMembers();
      alert('Member status set to pending');
    } catch (error: unknown) {
      console.error('Error:', error);
      alert(`Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally { setActionLoading(null); }
  };

  const handleReject = async (member: UserData) => {
    if (!userData?.gymId) { alert("Error: Gym ID not found."); return; }
    if (!confirm(`Reject membership for ${member.displayName}?`)) return;
    setActionLoading(member.uid);
    try {
      const enrollmentQuery = query(
        collection(db, 'enrollments'),
        where('userId', '==', member.uid),
        where('gymId', '==', userData.gymId),
        where('status', '==', 'pending')
      );
      const snap = await getDocs(enrollmentQuery);
      const pending = snap.docs.find(d => d.data().status === 'pending');
      if (pending) {
        await updateDoc(doc(db, 'enrollments', pending.id), {
          status: 'rejected', verifiedAt: serverTimestamp(), verifiedBy: user?.uid || null,
        });
      }
      await updateDoc(doc(db, 'users', member.uid), {
        enrollmentStatus: 'rejected', gymId: null,
      });
      await fetchMembers();
      alert('Member rejected successfully');
    } catch (error: unknown) {
      console.error('Error:', error);
      alert(`Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally { setActionLoading(null); }
  };

  const handleDelete = async (member: UserData) => {
    if (!confirm(`Are you sure you want to delete ${member.displayName}? This action cannot be undone.`)) return;
    setActionLoading(member.uid);
    try {
      await deleteDoc(doc(db, 'users', member.uid));
      await fetchMembers();
      alert('Member deleted successfully');
    } catch (error) {
      console.error('Error deleting member:', error);
      alert('Failed to delete member');
    } finally { setActionLoading(null); }
  };

  const filteredMembers = members.filter((member) => {
    const matchesSearch =
      (member.displayName?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (member.email?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (member.phoneNumber || '').includes(searchQuery);

    const matchesFilter =
      filter === 'all' ||
      (filter === 'active' && member.enrollmentStatus === 'approved' && !isExpired(member)) ||
      (filter === 'inactive' && (member.enrollmentStatus === 'rejected' || isExpired(member))) ||
      (filter === 'pending' && member.enrollmentStatus === 'pending') ||
      (filter === 'expiring' && isExpiringSoon(member)) ||
      (filter === 'recent' && member.createdAt && (Date.now() - member.createdAt.getTime()) < 7 * 24 * 60 * 60 * 1000);

    return matchesSearch && matchesFilter;
  });

  if (selectedMember) {
    return <MemberDetail memberId={selectedMember} onBack={() => setSelectedMember(null)} />;
  }
  if (showAddMember) {
    return <AddMember onBack={() => setShowAddMember(false)} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Members</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Manage your gym members</p>
        </div>
        <button
          onClick={() => setShowAddMember(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Member
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as FilterType)}
              className="px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Members ({members.length})</option>
              <option value="active">Active</option>
              <option value="pending">Pending Requests</option>
              <option value="expiring">Expiring Soon</option>
              <option value="inactive">Inactive / Expired</option>
              <option value="recent">Recently Added</option>
            </select>
          </div>
        </div>
      </div>

      {/* Members Table */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center items-center">
            <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  <th className="text-left py-3 px-5 text-xs font-medium text-gray-600 dark:text-gray-400">Name</th>
                  <th className="text-left py-3 px-5 text-xs font-medium text-gray-600 dark:text-gray-400">Contact</th>
                  <th className="text-left py-3 px-5 text-xs font-medium text-gray-600 dark:text-gray-400">Plan</th>
                  <th className="text-left py-3 px-5 text-xs font-medium text-gray-600 dark:text-gray-400">Time Slot</th>
                  <th className="text-left py-3 px-5 text-xs font-medium text-gray-600 dark:text-gray-400">Expiry</th>
                  <th className="text-left py-3 px-5 text-xs font-medium text-gray-600 dark:text-gray-400">Status</th>
                  <th className="text-right py-3 px-5 text-xs font-medium text-gray-600 dark:text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {filteredMembers.map((member) => {
                  const expiry = getExpiryDate(member);
                  const expired = isExpired(member);
                  const expiringSoon = isExpiringSoon(member);
                  return (
                    <tr key={member.uid} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                      <td className="py-3 px-5">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{member.displayName || 'N/A'}</p>
                      </td>
                      <td className="py-3 px-5">
                        <p className="text-sm text-gray-900 dark:text-white">{member.email}</p>
                        {member.phoneNumber && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{member.phoneNumber}</p>
                        )}
                      </td>
                      <td className="py-3 px-5">
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded text-xs font-medium">
                          {getPlanLabel(member)}
                        </span>
                      </td>
                      <td className="py-3 px-5 text-sm text-gray-900 dark:text-white">
                        {member.timeSlot || '--'}
                      </td>
                      <td className="py-3 px-5">
                        {expiry ? (
                          <span className={`text-sm font-medium ${expired ? 'text-red-600 dark:text-red-400' : expiringSoon ? 'text-amber-600 dark:text-amber-400' : 'text-gray-900 dark:text-white'}`}>
                            {expiry.toLocaleDateString()}
                            {expired && <span className="text-xs ml-1">(Expired)</span>}
                            {expiringSoon && !expired && <span className="text-xs ml-1">(Soon)</span>}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">--</span>
                        )}
                      </td>
                      <td className="py-3 px-5">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium capitalize ${expired
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            : member.enrollmentStatus === 'approved'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                              : member.enrollmentStatus === 'pending'
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                            }`}
                        >
                          {expired ? 'expired' : member.enrollmentStatus}
                        </span>
                      </td>
                      <td className="py-3 px-5">
                        <div className="flex items-center justify-end gap-2">
                          {member.enrollmentStatus === 'pending' ? (
                            <>
                              <button onClick={() => handleApprove(member)} disabled={actionLoading === member.uid}
                                className="p-1.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded transition-colors" title="Approve">
                                <CheckCircle className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleReject(member)} disabled={actionLoading === member.uid}
                                className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors" title="Reject">
                                <XCircle className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => setSelectedMember(member.uid)}
                                className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors" title="View">
                                <Eye className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleSetPending(member)} disabled={actionLoading === member.uid}
                                className="p-1.5 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded transition-colors" title="Set to Pending">
                                <Clock className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleDelete(member)} disabled={actionLoading === member.uid}
                                className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors" title="Delete">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
        <p>Showing {filteredMembers.length} of {members.length} members</p>
      </div>

      {/* Plan Change Requests Section */}
      <PlanChangeRequests />
    </div>
  );
}