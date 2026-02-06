import { useState } from 'react';
import { UserCheck, UserX, Plus, Edit } from 'lucide-react';

type ViewMode = 'today' | 'history';

interface AttendanceProps {
  darkMode: boolean;
}

export function Attendance({ darkMode }: AttendanceProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('today');

  const todayAttendance = [
    { id: 1, name: 'Sarah Johnson', checkIn: '06:30 AM', status: 'in', duration: '2h 45m', email: 'sarah.j@email.com' },
    { id: 2, name: 'Emma Wilson', checkIn: '08:00 AM', status: 'in', duration: '1h 45m', email: 'emma.w@email.com' },
    { id: 3, name: 'Lisa Anderson', checkIn: '09:00 AM', status: 'in', duration: '45m', email: 'lisa.a@email.com' },
    { id: 4, name: 'David Martinez', checkIn: '07:30 AM', status: 'in', duration: '2h 15m', email: 'david.m@email.com' },
  ];

  const checkedOutToday = [
    { id: 5, name: 'Mike Chen', checkIn: '07:15 AM', checkOut: '09:00 AM', duration: '1h 45m', email: 'mike.chen@email.com' },
    { id: 6, name: 'James Brown', checkIn: '07:45 AM', checkOut: '09:30 AM', duration: '1h 45m', email: 'james.b@email.com' },
    { id: 7, name: 'Sophie Taylor', checkIn: '06:00 AM', checkOut: '07:30 AM', duration: '1h 30m', email: 'sophie.t@email.com' },
    { id: 8, name: 'Ryan Garcia', checkIn: '08:30 AM', checkOut: '10:00 AM', duration: '1h 30m', email: 'ryan.g@email.com' },
  ];

  const attendanceHistory = [
    { id: 1, name: 'Sarah Johnson', date: '2026-01-11', checkIn: '06:30 AM', checkOut: '08:45 AM', duration: '2h 15m' },
    { id: 2, name: 'Mike Chen', date: '2026-01-11', checkIn: '07:15 AM', checkOut: '09:00 AM', duration: '1h 45m' },
    { id: 3, name: 'Emma Wilson', date: '2026-01-11', checkIn: '08:00 AM', checkOut: '09:45 AM', duration: '1h 45m' },
    { id: 4, name: 'David Martinez', date: '2026-01-10', checkIn: '07:30 AM', checkOut: '09:30 AM', duration: '2h 0m' },
    { id: 5, name: 'Sarah Johnson', date: '2026-01-10', checkIn: '06:45 AM', checkOut: '08:30 AM', duration: '1h 45m' },
    { id: 6, name: 'Lisa Anderson', date: '2026-01-10', checkIn: '09:00 AM', checkOut: '10:30 AM', duration: '1h 30m' },
    { id: 7, name: 'James Brown', date: '2026-01-09', checkIn: '07:45 AM', checkOut: '09:30 AM', duration: '1h 45m' },
    { id: 8, name: 'Emma Wilson', date: '2026-01-09', checkIn: '08:00 AM', checkOut: '10:00 AM', duration: '2h 0m' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Attendance</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Track member check-ins and visits</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode('today')}
              className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
                viewMode === 'today'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setViewMode('history')}
              className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
                viewMode === 'history'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              History
            </button>
          </div>
          <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-colors">
            <Plus className="w-4 h-4" />
            Manual Entry
          </button>
        </div>
      </div>

      {viewMode === 'today' ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-5">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Currently In Gym</p>
              <p className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400 mb-2">{todayAttendance.length}</p>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Active Now</span>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-5">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Checked Out Today</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">{checkedOutToday.length}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Completed visits</p>
            </div>
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-5">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Total Check-ins</p>
              <p className="text-2xl font-semibold text-blue-600 dark:text-blue-400 mb-2">
                {todayAttendance.length + checkedOutToday.length}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Today's total</p>
            </div>
          </div>

          {/* Currently In Gym */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
            <div className="p-5 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Currently In Gym</h3>
              <span className="px-2 py-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 rounded text-xs font-medium">
                {todayAttendance.length} Active
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800/50">
                  <tr>
                    <th className="text-left py-3 px-5 text-xs font-medium text-gray-600 dark:text-gray-400">Member</th>
                    <th className="text-left py-3 px-5 text-xs font-medium text-gray-600 dark:text-gray-400">Check-in Time</th>
                    <th className="text-left py-3 px-5 text-xs font-medium text-gray-600 dark:text-gray-400">Duration</th>
                    <th className="text-left py-3 px-5 text-xs font-medium text-gray-600 dark:text-gray-400">Status</th>
                    <th className="text-right py-3 px-5 text-xs font-medium text-gray-600 dark:text-gray-400">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {todayAttendance.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                      <td className="py-3 px-5">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{record.name}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">{record.email}</p>
                      </td>
                      <td className="py-3 px-5 text-sm text-gray-900 dark:text-white">{record.checkIn}</td>
                      <td className="py-3 px-5 text-sm font-medium text-gray-900 dark:text-white">{record.duration}</td>
                      <td className="py-3 px-5">
                        <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                          <UserCheck className="w-3.5 h-3.5" />
                          <span className="text-xs font-medium">In Gym</span>
                        </span>
                      </td>
                      <td className="py-3 px-5 text-right">
                        <button className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-medium transition-colors">
                          Check Out
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Checked Out Today */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
            <div className="p-5 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Checked Out Today</h3>
              <span className="px-2 py-1 bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400 rounded text-xs font-medium">
                {checkedOutToday.length} Completed
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
                    <th className="text-left py-3 px-5 text-xs font-medium text-gray-600 dark:text-gray-400">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {checkedOutToday.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                      <td className="py-3 px-5">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{record.name}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">{record.email}</p>
                      </td>
                      <td className="py-3 px-5 text-sm text-gray-900 dark:text-white">{record.checkIn}</td>
                      <td className="py-3 px-5 text-sm text-gray-900 dark:text-white">{record.checkOut}</td>
                      <td className="py-3 px-5 text-sm font-medium text-gray-900 dark:text-white">{record.duration}</td>
                      <td className="py-3 px-5">
                        <span className="inline-flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                          <UserX className="w-3.5 h-3.5" />
                          <span className="text-xs font-medium">Completed</span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* History Filters */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Date Range</label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    className="flex-1 px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-gray-500 dark:text-gray-400">to</span>
                  <input
                    type="date"
                    className="flex-1 px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Member</label>
                <select className="px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">All Members</option>
                  <option value="1">Sarah Johnson</option>
                  <option value="2">Mike Chen</option>
                  <option value="3">Emma Wilson</option>
                </select>
              </div>
            </div>
          </div>

          {/* History Table */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800/50">
                  <tr>
                    <th className="text-left py-3 px-5 text-xs font-medium text-gray-600 dark:text-gray-400">Date</th>
                    <th className="text-left py-3 px-5 text-xs font-medium text-gray-600 dark:text-gray-400">Member</th>
                    <th className="text-left py-3 px-5 text-xs font-medium text-gray-600 dark:text-gray-400">Check-in</th>
                    <th className="text-left py-3 px-5 text-xs font-medium text-gray-600 dark:text-gray-400">Check-out</th>
                    <th className="text-left py-3 px-5 text-xs font-medium text-gray-600 dark:text-gray-400">Duration</th>
                    <th className="text-right py-3 px-5 text-xs font-medium text-gray-600 dark:text-gray-400">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {attendanceHistory.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                      <td className="py-3 px-5 text-sm font-medium text-gray-900 dark:text-white">
                        {new Date(record.date).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-5 text-sm text-gray-900 dark:text-white">{record.name}</td>
                      <td className="py-3 px-5 text-sm text-gray-900 dark:text-white">{record.checkIn}</td>
                      <td className="py-3 px-5 text-sm text-gray-900 dark:text-white">{record.checkOut}</td>
                      <td className="py-3 px-5 text-sm font-medium text-gray-900 dark:text-white">{record.duration}</td>
                      <td className="py-3 px-5 text-right">
                        <button 
                          className="p-1.5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Summary */}
          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
            <p>Showing {attendanceHistory.length} attendance records</p>
          </div>
        </>
      )}
    </div>
  );
}
