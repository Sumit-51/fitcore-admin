import { ArrowLeft, Mail, Phone, Calendar, Activity, CreditCard } from 'lucide-react';

interface MemberDetailProps {
  memberId: string;
  onBack: () => void;
}

export function MemberDetail({ memberId, onBack }: MemberDetailProps) {
  // In a real app, fetch member details using memberId
  const member = {
    id: memberId,
    name: 'Loading Name...', // Placeholder until fetched or passed as prop
    email: 'loading@email.com',
    phone: '(555) 123-4567',
    joinDate: new Date().toISOString(), // Use ISO string to match potential date handling
    membershipType: 'Standard', // Default
    membershipStart: new Date().toISOString(),
    membershipExpiry: new Date().toISOString(),
    status: 'active',
    goals: 'N/A',
    notes: 'No notes available.',
  };

  const attendanceHistory = [
    { date: '2026-01-12', checkIn: '06:30 AM', checkOut: '08:45 AM', duration: '2h 15m' },
    { date: '2026-01-11', checkIn: '06:45 AM', checkOut: '08:30 AM', duration: '1h 45m' },
    { date: '2026-01-09', checkIn: '06:30 AM', checkOut: '08:15 AM', duration: '1h 45m' },
    { date: '2026-01-08', checkIn: '07:00 AM', checkOut: '09:00 AM', duration: '2h 0m' },
    { date: '2026-01-06', checkIn: '06:30 AM', checkOut: '08:30 AM', duration: '2h 0m' },
  ];

  const paymentHistory = [
    { date: '2025-12-15', amount: 150, method: 'Card', status: 'completed', description: 'Monthly Premium' },
    { date: '2025-11-15', amount: 150, method: 'Card', status: 'completed', description: 'Monthly Premium' },
    { date: '2025-10-15', amount: 150, method: 'Cash', status: 'completed', description: 'Monthly Premium' },
    { date: '2025-09-15', amount: 150, method: 'Card', status: 'completed', description: 'Monthly Premium' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{member.name}</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">Member since {new Date(member.joinDate).toLocaleDateString()}</p>
        </div>
        <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-colors">
          Edit Member
        </button>
      </div>

      {/* Profile Card */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-5">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Profile Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-800">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Mail className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Email</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{member.email}</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-800">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
              <Phone className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Phone</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{member.phone}</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-800">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Activity className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Goals</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{member.goals}</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-800">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <Calendar className="w-4 h-4 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Join Date</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{new Date(member.joinDate).toLocaleDateString()}</p>
            </div>
          </div>
        </div>
        {member.notes && (
          <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/30 rounded-lg">
            <p className="text-xs font-medium text-amber-900 dark:text-amber-400 mb-1">Notes</p>
            <p className="text-sm text-amber-800 dark:text-amber-300">{member.notes}</p>
          </div>
        )}
      </div>

      {/* Membership Status */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-5">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Membership Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-800">
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">Membership Type</p>
            <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded text-xs font-medium">
              {member.membershipType}
            </span>
          </div>
          <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-800">
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">Start Date</p>
            <p className="text-sm font-medium text-gray-900 dark:text-white">{new Date(member.membershipStart).toLocaleDateString()}</p>
          </div>
          <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-800">
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">Expiry Date</p>
            <p className="text-sm font-medium text-gray-900 dark:text-white">{new Date(member.membershipExpiry).toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance History */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-5">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Recent Attendance</h3>
          <div className="space-y-3">
            {attendanceHistory.map((record, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-800"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{new Date(record.date).toLocaleDateString()}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {record.checkIn} - {record.checkOut}
                  </p>
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-white">{record.duration}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Payment History */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-5">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Recent Payments</h3>
          <div className="space-y-3">
            {paymentHistory.map((payment, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-800"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                    <CreditCard className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">${payment.amount}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{payment.description}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-500">{new Date(payment.date).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-block px-2 py-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 rounded text-xs font-medium mb-1">
                    {payment.status}
                  </span>
                  <p className="text-xs text-gray-600 dark:text-gray-400">{payment.method}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
