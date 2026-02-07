import { useState, useEffect } from 'react';
import { ArrowLeft, Mail, Calendar, CreditCard, Clock, Sun, Sunset, Moon, Phone } from 'lucide-react';
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { parseFirestoreDate } from '@/utils/date';

interface MemberDetailProps {
  memberId: string;
  onBack: () => void;
}

interface MemberData {
  displayName: string | null;
  email: string | null;
  enrollmentStatus: string;
  enrolledAt: Date | null;
  createdAt: Date | null;
  planDuration: number;
  timeSlot: string | null;
  paymentMethod: string | null;
  phoneNumber: string | null;
}

interface AttendanceRecord {
  id: string;
  date: string;
  checkInTime: Date;
  checkOutTime: Date;
  duration: number;
  timeSlot: string | null;
}

interface PaymentRecord {
  id: string;
  amount: number;
  paymentMethod: string;
  status: string;
  transactionId: string | null;
  createdAt: Date;
}

const formatDuration = (seconds: number): string => {
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

const getPlanLabel = (d: number): string => {
  if (d === 1) return '1 Month';
  if (d === 3) return '3 Month (Quarterly)';
  if (d === 6) return '6 Month';
  return `${d} Month`;
};

export function MemberDetail({ memberId, onBack }: MemberDetailProps) {
  const { userData } = useAuth();
  const [member, setMember] = useState<MemberData | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        // 1. Fetch member from users collection
        const userDoc = await getDoc(doc(db, 'users', memberId));
        if (userDoc.exists()) {
          const d = userDoc.data();
          const planDuration = d.planDuration || (d.paymentMethod === 'Quarterly' ? 3 : d.paymentMethod === '6-Month' ? 6 : 1);
          setMember({
            displayName: d.displayName || null,
            email: d.email || null,
            enrollmentStatus: d.enrollmentStatus || 'none',
            enrolledAt: parseFirestoreDate(d.enrolledAt),
            createdAt: parseFirestoreDate(d.createdAt) || new Date(),
            planDuration,
            timeSlot: d.timeSlot || null,
            paymentMethod: d.paymentMethod || null,
            phoneNumber: d.phoneNumber || d.phone || d.userPhone || d.mobile || null,
          });
        }

        // 2. Fetch attendance from checkInHistory
        try {
          const attQ = query(
            collection(db, 'checkInHistory'),
            where('userId', '==', memberId),
            orderBy('checkOutTime', 'desc'),
            limit(10)
          );
          const attSnap = await getDocs(attQ);
          setAttendance(attSnap.docs.map(d => {
            const data = d.data();
            return {
              id: d.id,
              date: data.date || '',
              checkInTime: parseFirestoreDate(data.checkInTime) || new Date(),
              checkOutTime: parseFirestoreDate(data.checkOutTime) || new Date(),
              duration: data.duration || 0,
              timeSlot: data.timeSlot || null,
            };
          }));
        } catch {
          // Fallback without orderBy (no index)
          const attQ = query(
            collection(db, 'checkInHistory'),
            where('userId', '==', memberId)
          );
          const attSnap = await getDocs(attQ);
          const list = attSnap.docs.map(d => {
            const data = d.data();
            return {
              id: d.id,
              date: data.date || '',
              checkInTime: parseFirestoreDate(data.checkInTime) || new Date(),
              checkOutTime: parseFirestoreDate(data.checkOutTime) || new Date(),
              duration: data.duration || 0,
              timeSlot: data.timeSlot || null,
            };
          });
          list.sort((a, b) => b.checkOutTime.getTime() - a.checkOutTime.getTime());
          setAttendance(list.slice(0, 10));
        }

        // 3. Fetch payments from enrollments
        if (userData?.gymId) {
          try {
            const payQ = query(
              collection(db, 'enrollments'),
              where('userId', '==', memberId),
              where('gymId', '==', userData.gymId),
              orderBy('createdAt', 'desc'),
              limit(10)
            );
            const paySnap = await getDocs(payQ);
            setPayments(paySnap.docs.map(d => {
              const data = d.data();
              return {
                id: d.id,
                amount: data.amount || 0,
                paymentMethod: data.paymentMethod || '--',
                status: data.status || 'pending',
                transactionId: data.transactionId || null,
                createdAt: parseFirestoreDate(data.createdAt) || new Date(),
              };
            }));
          } catch {
            const payQ = query(
              collection(db, 'enrollments'),
              where('userId', '==', memberId),
              where('gymId', '==', userData.gymId)
            );
            const paySnap = await getDocs(payQ);
            const list = paySnap.docs.map(d => {
              const data = d.data();
              return {
                id: d.id,
                amount: data.amount || 0,
                paymentMethod: data.paymentMethod || '--',
                status: data.status || 'pending',
                transactionId: data.transactionId || null,
                createdAt: parseFirestoreDate(data.createdAt) || new Date(),
              };
            });
            list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
            setPayments(list.slice(0, 10));
          }
        }
      } catch (error) {
        console.error('Error fetching member detail:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [memberId, userData]);

  // Computed
  const expiryDate = member?.enrolledAt && member.planDuration
    ? (() => { const d = new Date(member.enrolledAt); d.setMonth(d.getMonth() + member.planDuration); return d; })()
    : null;
  const isExpired = expiryDate ? expiryDate.getTime() < Date.now() : false;

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!member) {
    return (
      <div className="space-y-6">
        <button onClick={onBack} className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <p className="text-gray-500 text-center">Member not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{member.displayName || 'N/A'}</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Member since {member.createdAt?.toLocaleDateString() || 'N/A'}
          </p>
        </div>
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
              <p className="text-sm font-medium text-gray-900 dark:text-white">{member.email || 'N/A'}</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-800">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Phone className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Phone</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{member.phoneNumber || 'N/A'}</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-800">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
              <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Time Slot</p>
              <div className="flex items-center gap-1.5">
                {getTimeSlotIcon(member.timeSlot)}
                <p className="text-sm font-medium text-gray-900 dark:text-white">{member.timeSlot || 'Not assigned'}</p>
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-800">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <CreditCard className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Plan</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{getPlanLabel(member.planDuration)}</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-800">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <Calendar className="w-4 h-4 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Join Date</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{member.createdAt?.toLocaleDateString() || 'N/A'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Membership Status */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-5">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Membership Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-800">
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">Status</p>
            <span className={`inline-block px-2 py-1 rounded text-xs font-medium capitalize ${isExpired ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
              : member.enrollmentStatus === 'approved' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                : member.enrollmentStatus === 'pending' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
              }`}>
              {isExpired ? 'Expired' : member.enrollmentStatus}
            </span>
          </div>
          <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-800">
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">Enrolled At</p>
            <p className="text-sm font-medium text-gray-900 dark:text-white">{member.enrolledAt?.toLocaleDateString() || '--'}</p>
          </div>
          <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-800">
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">Expiry Date</p>
            <p className={`text-sm font-medium ${isExpired ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
              {expiryDate ? expiryDate.toLocaleDateString() : '--'}
              {isExpired && <span className="text-xs ml-1">(Expired)</span>}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Real Attendance History */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-5">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Recent Attendance ({attendance.length})</h3>
          {attendance.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">No attendance records</p>
          ) : (
            <div className="space-y-3">
              {attendance.map(record => (
                <div key={record.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-800">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{record.date}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {formatTime(record.checkInTime)} - {formatTime(record.checkOutTime)}
                    </p>
                    {record.timeSlot && (
                      <div className="flex items-center gap-1 mt-0.5">
                        {getTimeSlotIcon(record.timeSlot)}
                        <span className="text-xs text-gray-500">{record.timeSlot}</span>
                      </div>
                    )}
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{formatDuration(record.duration)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Real Payment History */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-5">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Payment History ({payments.length})</h3>
          {payments.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">No payment records</p>
          ) : (
            <div className="space-y-3">
              {payments.map(payment => (
                <div key={payment.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-800">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                      <CreditCard className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">₹{payment.amount}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">{payment.paymentMethod}</p>
                      <p className="text-xs text-gray-500">{payment.createdAt.toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium capitalize mb-1 ${payment.status === 'approved' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                      : payment.status === 'pending' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                      {payment.status}
                    </span>
                    {payment.transactionId && (
                      <p className="text-xs text-gray-500 font-mono">{payment.transactionId.slice(0, 12)}...</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}