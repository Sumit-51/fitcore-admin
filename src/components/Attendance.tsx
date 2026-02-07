import { useState, useEffect } from 'react';
import { UserCheck, UserX, Clock, Users, Sun, Sunset, Moon, RefreshCw } from 'lucide-react';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { parseFirestoreDate } from '@/utils/date';

type ViewMode = 'today' | 'history';

interface ActiveCheckIn {
  id: string;
  userId: string;
  userName: string;
  gymId: string;
  gymName?: string;
  timeSlot: string | null;
  checkInTime: Date;
}

interface CheckInHistoryRecord {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  gymId: string;
  gymName?: string;
  timeSlot: string | null;
  date: string;
  checkInTime: Date;
  checkOutTime: Date;
  duration: number; // seconds
}

interface AttendanceProps {
  darkMode: boolean;
}

const formatDuration = (seconds: number | null): string => {
  if (!seconds || seconds <= 0) return '--';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins}m`;
};

const formatTime = (date: Date | null): string => {
  if (!date) return '--';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
};

const getTimeSlotIcon = (slot?: string | null) => {
  switch (slot) {
    case 'Morning': return <Sun className="w-3.5 h-3.5 text-amber-500" />;
    case 'Evening': return <Sunset className="w-3.5 h-3.5 text-orange-500" />;
    case 'Night': return <Moon className="w-3.5 h-3.5 text-indigo-500" />;
    default: return null;
  }
};

export function Attendance({ darkMode }: AttendanceProps) {
  const { userData } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>('today');
  const [activeCheckIns, setActiveCheckIns] = useState<ActiveCheckIn[]>([]);
  const [completedToday, setCompletedToday] = useState<CheckInHistoryRecord[]>([]);
  const [historyRecords, setHistoryRecords] = useState<CheckInHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Fetch ACTIVE check-ins from "activeCheckIns" collection
  const fetchActiveCheckIns = async () => {
    if (!userData?.gymId) return;
    try {
      const q = query(
        collection(db, 'activeCheckIns'),
        where('gymId', '==', userData.gymId)
      );
      const snap = await getDocs(q);
      const list: ActiveCheckIn[] = snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          userId: data.userId || d.id,
          userName: data.userName || 'Unknown',
          gymId: data.gymId || '',
          gymName: data.gymName || '',
          timeSlot: data.timeSlot || null,
          checkInTime: parseFirestoreDate(data.checkInTime) || new Date(),
        };
      });
      list.sort((a, b) => b.checkInTime.getTime() - a.checkInTime.getTime());
      setActiveCheckIns(list);
    } catch (error) {
      console.error('Error fetching active check-ins:', error);
    }
  };

  // Fetch completed check-outs from "checkInHistory" collection
  const fetchCompletedToday = async () => {
    if (!userData?.gymId) return;
    try {
      const todayStr = new Date().toISOString().split('T')[0]; // "2026-02-06"

      // checkInHistory stores "date" field as "YYYY-MM-DD" string
      const q = query(
        collection(db, 'checkInHistory'),
        where('gymId', '==', userData.gymId),
        where('date', '==', todayStr)
      );
      const snap = await getDocs(q);
      const list: CheckInHistoryRecord[] = snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          userId: data.userId || '',
          userName: data.userName || 'Unknown',
          userEmail: data.userEmail || '',
          gymId: data.gymId || '',
          gymName: data.gymName || '',
          timeSlot: data.timeSlot || null,
          date: data.date || todayStr,
          checkInTime: parseFirestoreDate(data.checkInTime) || new Date(),
          checkOutTime: parseFirestoreDate(data.checkOutTime) || new Date(),
          duration: data.duration || 0,
        };
      });
      list.sort((a, b) => b.checkOutTime.getTime() - a.checkOutTime.getTime());
      setCompletedToday(list);
    } catch (error) {
      console.error('Error fetching completed today:', error);
    }
  };

  // Fetch history from "checkInHistory" collection
  const fetchHistory = async () => {
    if (!userData?.gymId) return;
    try {
      let records: CheckInHistoryRecord[] = [];
      try {
        const q = query(
          collection(db, 'checkInHistory'),
          where('gymId', '==', userData.gymId),
          orderBy('checkOutTime', 'desc'),
          limit(200)
        );
        const snap = await getDocs(q);
        records = snap.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            userId: data.userId || '',
            userName: data.userName || 'Unknown',
            userEmail: data.userEmail || '',
            gymId: data.gymId || '',
            gymName: data.gymName || '',
            timeSlot: data.timeSlot || null,
            date: data.date || '',
            checkInTime: parseFirestoreDate(data.checkInTime) || new Date(),
            checkOutTime: parseFirestoreDate(data.checkOutTime) || new Date(),
            duration: data.duration || 0,
          };
        });
      } catch {
        // Fallback: no index
        const q = query(
          collection(db, 'checkInHistory'),
          where('gymId', '==', userData.gymId)
        );
        const snap = await getDocs(q);
        records = snap.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            userId: data.userId || '',
            userName: data.userName || 'Unknown',
            userEmail: data.userEmail || '',
            gymId: data.gymId || '',
            gymName: data.gymName || '',
            timeSlot: data.timeSlot || null,
            date: data.date || '',
            checkInTime: parseFirestoreDate(data.checkInTime) || new Date(),
            checkOutTime: parseFirestoreDate(data.checkOutTime) || new Date(),
            duration: data.duration || 0,
          };
        });
        records.sort((a, b) => b.checkOutTime.getTime() - a.checkOutTime.getTime());
      }

      // Apply date filters using the "date" string field (YYYY-MM-DD)
      if (dateFrom) {
        records = records.filter(r => r.date >= dateFrom);
      }
      if (dateTo) {
        records = records.filter(r => r.date <= dateTo);
      }

      setHistoryRecords(records);
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  };

  const loadData = async () => {
    setLoading(true);
    await fetchActiveCheckIns();
    await fetchCompletedToday();
    if (viewMode === 'history') await fetchHistory();
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [userData, viewMode]);
  useEffect(() => { if (viewMode === 'history') fetchHistory(); }, [dateFrom, dateTo]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const getLiveDuration = (checkInTime: Date): string => {
    const diff = Math.round((Date.now() - checkInTime.getTime()) / 1000);
    return formatDuration(diff);
  };

  const totalTodayCheckins = activeCheckIns.length + completedToday.length;
  const avgDuration = completedToday.length > 0
    ? Math.round(completedToday.reduce((s, r) => s + (r.duration || 0), 0) / completedToday.length)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Attendance</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Real-time check-ins from the member app</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode('today')}
              className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
                viewMode === 'today' ? 'bg-blue-600 text-white' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >Today</button>
            <button
              onClick={() => setViewMode('history')}
              className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
                viewMode === 'history' ? 'bg-blue-600 text-white' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >History</button>
          </div>
          <button onClick={handleRefresh} disabled={refreshing}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg font-medium text-sm transition-colors disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : viewMode === 'today' ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-5">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Currently In Gym</p>
              <p className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400 mb-2">{activeCheckIns.length}</p>
              <div className="flex items-center gap-1.5">
                {activeCheckIns.length > 0 && <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />}
                <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  {activeCheckIns.length > 0 ? 'Active Now' : 'No one'}
                </span>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-5">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Checked Out Today</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">{completedToday.length}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Completed visits</p>
            </div>
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-5">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Total Check-ins</p>
              <p className="text-2xl font-semibold text-blue-600 dark:text-blue-400 mb-2">{totalTodayCheckins}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Today's total</p>
            </div>
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-5">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Avg. Duration</p>
              <p className="text-2xl font-semibold text-purple-600 dark:text-purple-400 mb-2">{formatDuration(avgDuration)}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Completed visits</p>
            </div>
          </div>

          {/* Currently In Gym — from activeCheckIns collection */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
            <div className="p-5 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Currently In Gym</h3>
              <span className="px-2 py-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 rounded text-xs font-medium">
                {activeCheckIns.length} Active
              </span>
            </div>
            {activeCheckIns.length === 0 ? (
              <div className="p-12 text-center">
                <Users className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400 text-sm">No one is currently checked in</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-800/50">
                    <tr>
                      <th className="text-left py-3 px-5 text-xs font-medium text-gray-600 dark:text-gray-400">Member</th>
                      <th className="text-left py-3 px-5 text-xs font-medium text-gray-600 dark:text-gray-400">Check-in Time</th>
                      <th className="text-left py-3 px-5 text-xs font-medium text-gray-600 dark:text-gray-400">Time Slot</th>
                      <th className="text-left py-3 px-5 text-xs font-medium text-gray-600 dark:text-gray-400">Duration</th>
                      <th className="text-left py-3 px-5 text-xs font-medium text-gray-600 dark:text-gray-400">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                    {activeCheckIns.map(record => (
                      <tr key={record.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                        <td className="py-3 px-5">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{record.userName}</p>
                        </td>
                        <td className="py-3 px-5 text-sm text-gray-900 dark:text-white">{formatTime(record.checkInTime)}</td>
                        <td className="py-3 px-5">
                          {record.timeSlot ? (
                            <div className="flex items-center gap-1.5">
                              {getTimeSlotIcon(record.timeSlot)}
                              <span className="text-sm text-gray-900 dark:text-white">{record.timeSlot}</span>
                            </div>
                          ) : <span className="text-sm text-gray-400">--</span>}
                        </td>
                        <td className="py-3 px-5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                          {getLiveDuration(record.checkInTime)}
                        </td>
                        <td className="py-3 px-5">
                          <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                            <UserCheck className="w-3.5 h-3.5" />
                            <span className="text-xs font-medium">In Gym</span>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Checked Out Today — from checkInHistory collection */}
          {completedToday.length > 0 && (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
              <div className="p-5 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Checked Out Today</h3>
                <span className="px-2 py-1 bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400 rounded text-xs font-medium">
                  {completedToday.length} Completed
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-800/50">
                    <tr>
                      <th className="text-left py-3 px-5 text-xs font-medium text-gray-600 dark:text-gray-400">Member</th>
                      <th className="text-left py-3 px-5 text-xs font-medium text-gray-600 dark:text-gray-400">Check-in</th>
                      <th className="text-left py-3 px-5 text-xs font-medium text-gray-600 dark:text-gray-400">Check-out</th>
                      <th className="text-left py-3 px-5 text-xs font-medium text-gray-600 dark:text-gray-400">Duration</th>
                      <th className="text-left py-3 px-5 text-xs font-medium text-gray-600 dark:text-gray-400">Time Slot</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                    {completedToday.map(record => (
                      <tr key={record.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                        <td className="py-3 px-5">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{record.userName}</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">{record.userEmail}</p>
                        </td>
                        <td className="py-3 px-5 text-sm text-gray-900 dark:text-white">{formatTime(record.checkInTime)}</td>
                        <td className="py-3 px-5 text-sm text-gray-900 dark:text-white">{formatTime(record.checkOutTime)}</td>
                        <td className="py-3 px-5 text-sm font-medium text-gray-900 dark:text-white">{formatDuration(record.duration)}</td>
                        <td className="py-3 px-5">
                          {record.timeSlot ? (
                            <div className="flex items-center gap-1.5">
                              {getTimeSlotIcon(record.timeSlot)}
                              <span className="text-xs text-gray-700 dark:text-gray-300">{record.timeSlot}</span>
                            </div>
                          ) : <span className="text-xs text-gray-400">--</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          {/* History Filters */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Date Range</label>
                <div className="flex items-center gap-2">
                  <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                    className="flex-1 px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <span className="text-gray-500 dark:text-gray-400">to</span>
                  <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                    className="flex-1 px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
            </div>
          </div>

          {/* History Table */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
            {historyRecords.length === 0 ? (
              <div className="p-12 text-center">
                <Clock className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400 text-sm">No attendance records found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-800/50">
                    <tr>
                      <th className="text-left py-3 px-5 text-xs font-medium text-gray-600 dark:text-gray-400">Date</th>
                      <th className="text-left py-3 px-5 text-xs font-medium text-gray-600 dark:text-gray-400">Member</th>
                      <th className="text-left py-3 px-5 text-xs font-medium text-gray-600 dark:text-gray-400">Check-in</th>
                      <th className="text-left py-3 px-5 text-xs font-medium text-gray-600 dark:text-gray-400">Check-out</th>
                      <th className="text-left py-3 px-5 text-xs font-medium text-gray-600 dark:text-gray-400">Duration</th>
                      <th className="text-left py-3 px-5 text-xs font-medium text-gray-600 dark:text-gray-400">Time Slot</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                    {historyRecords.map(record => (
                      <tr key={record.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                        <td className="py-3 px-5 text-sm font-medium text-gray-900 dark:text-white">{record.date}</td>
                        <td className="py-3 px-5">
                          <p className="text-sm text-gray-900 dark:text-white">{record.userName}</p>
                          <p className="text-xs text-gray-500">{record.userEmail}</p>
                        </td>
                        <td className="py-3 px-5 text-sm text-gray-900 dark:text-white">{formatTime(record.checkInTime)}</td>
                        <td className="py-3 px-5 text-sm text-gray-900 dark:text-white">{formatTime(record.checkOutTime)}</td>
                        <td className="py-3 px-5 text-sm font-medium text-gray-900 dark:text-white">{formatDuration(record.duration)}</td>
                        <td className="py-3 px-5">
                          {record.timeSlot ? (
                            <div className="flex items-center gap-1.5">
                              {getTimeSlotIcon(record.timeSlot)}
                              <span className="text-xs text-gray-700 dark:text-gray-300">{record.timeSlot}</span>
                            </div>
                          ) : <span className="text-xs text-gray-400">--</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
            <p>Showing {historyRecords.length} records</p>
          </div>
        </>
      )}
    </div>
  );
}