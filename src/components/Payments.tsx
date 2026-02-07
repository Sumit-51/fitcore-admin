import { useState, useEffect } from 'react';
import { Search, Filter, Download, AlertTriangle } from 'lucide-react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { Enrollment } from '@/types';
import { parseFirestoreDate } from '@/utils/date';

export function Payments() {
  const { userData } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMethod, setFilterMethod] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const [payments, setPayments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPayments = async () => {
      if (!userData?.gymId) return;
      try {
        setLoading(true);
        setError(null);
        let paymentsList: Enrollment[] = [];
        try {
          const q = query(
            collection(db, 'enrollments'),
            where('gymId', '==', userData.gymId),
            orderBy('createdAt', 'desc')
          );
          const snapshot = await getDocs(q);
          paymentsList = snapshot.docs.map(d => ({
            ...d.data(),
            id: d.id,
            createdAt: parseFirestoreDate(d.data().createdAt) || new Date(),
          })) as Enrollment[];
        } catch {
          const q = query(
            collection(db, 'enrollments'),
            where('gymId', '==', userData.gymId)
          );
          const snapshot = await getDocs(q);
          paymentsList = snapshot.docs.map(d => ({
            ...d.data(),
            id: d.id,
            createdAt: parseFirestoreDate(d.data().createdAt) || new Date(),
          })) as Enrollment[];
          paymentsList.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        }
        setPayments(paymentsList);
      } catch {
        setError("Failed to load payments data. Please check your connection.");
      } finally {
        setLoading(false);
      }
    };
    fetchPayments();
  }, [userData]);

  const filteredPayments = payments.filter((payment) => {
    const matchesSearch =
      payment.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (payment.transactionId && payment.transactionId.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesMethod = filterMethod === 'all' || payment.paymentMethod.toLowerCase() === filterMethod;
    const matchesStatus = filterStatus === 'all' || payment.status === filterStatus;

    return matchesSearch && matchesMethod && matchesStatus;
  });

  const totalRevenue = filteredPayments
    .filter((p) => p.status === 'approved')
    .reduce((sum, p) => sum + p.amount, 0);

  const pendingAmount = filteredPayments
    .filter((p) => p.status === 'pending')
    .reduce((sum, p) => sum + p.amount, 0);

  const handleExport = () => {
    const csv = [
      ['Date', 'Member', 'Amount', 'Method', 'Status', 'Transaction ID'].join(','),
      ...filteredPayments.map(p => [
        p.createdAt instanceof Date ? p.createdAt.toLocaleDateString() : '',
        `"${p.userName}"`,
        p.amount,
        p.paymentMethod,
        p.status,
        p.transactionId || '',
      ].join(','))
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payments_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Payments</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Track and manage all transactions</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg font-medium text-sm transition-colors"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0" />
            <p className="ml-3 text-sm text-red-700 dark:text-red-200">{error}</p>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-5">
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Total Revenue</p>
          <p className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">₹{totalRevenue.toLocaleString()}</p>
          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
            {filteredPayments.filter(p => p.status === 'approved').length} completed payments
          </p>
        </div>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-5">
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Pending Payments</p>
          <p className="text-2xl font-semibold text-orange-600 dark:text-orange-400 mb-2">₹{pendingAmount.toLocaleString()}</p>
          <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">
            {filteredPayments.filter(p => p.status === 'pending').length} pending
          </p>
        </div>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-5">
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Total Transactions</p>
          <p className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">{filteredPayments.length}</p>
          <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">In selected period</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by member name or transaction ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select value={filterMethod} onChange={(e) => setFilterMethod(e.target.value)}
              className="px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="all">All Methods</option>
              <option value="online">Online</option>
              <option value="offline">Offline</option>
            </select>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="all">All Status</option>
              <option value="approved">Completed</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800/50">
              <tr>
                <th className="text-left py-3 px-5 text-xs font-medium text-gray-600 dark:text-gray-400">Date & Time</th>
                <th className="text-left py-3 px-5 text-xs font-medium text-gray-600 dark:text-gray-400">Member</th>
                <th className="text-left py-3 px-5 text-xs font-medium text-gray-600 dark:text-gray-400">Amount</th>
                <th className="text-left py-3 px-5 text-xs font-medium text-gray-600 dark:text-gray-400">Method</th>
                <th className="text-left py-3 px-5 text-xs font-medium text-gray-600 dark:text-gray-400">Status</th>
                <th className="text-left py-3 px-5 text-xs font-medium text-gray-600 dark:text-gray-400">Reference</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {loading ? (
                <tr><td colSpan={6} className="py-8 text-center text-gray-500">Loading payments...</td></tr>
              ) : filteredPayments.length === 0 ? (
                <tr><td colSpan={6} className="py-8 text-center text-gray-500">No records found</td></tr>
              ) : (
                filteredPayments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                    <td className="py-3 px-5">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {payment.createdAt instanceof Date ? payment.createdAt.toLocaleDateString() : 'N/A'}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {payment.createdAt instanceof Date ? payment.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </p>
                    </td>
                    <td className="py-3 px-5 text-sm font-medium text-gray-900 dark:text-white">{payment.userName}</td>
                    <td className="py-3 px-5 text-sm font-semibold text-gray-900 dark:text-white">₹{payment.amount}</td>
                    <td className="py-3 px-5">
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400 rounded text-xs font-medium uppercase">
                        {payment.paymentMethod}
                      </span>
                    </td>
                    <td className="py-3 px-5">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium capitalize ${
                          payment.status === 'approved'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                            : payment.status === 'pending'
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        }`}
                      >
                        {payment.status}
                      </span>
                    </td>
                    <td className="py-3 px-5 text-sm text-gray-600 dark:text-gray-400">{payment.transactionId || '--'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
        <p>Showing {filteredPayments.length} of {payments.length} payments</p>
      </div>
    </div>
  );
}