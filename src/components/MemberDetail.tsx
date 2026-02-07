import { useState, useEffect } from 'react';
import { ArrowLeft, Mail, Calendar, CreditCard, Clock, Sun, Sunset, Moon, Phone } from 'lucide-react';
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { parseFirestoreDate } from '@/utils/date';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/components/ui/utils";

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
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-[300px] rounded-xl" />
          <Skeleton className="h-[300px] rounded-xl" />
        </div>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex flex-col items-center justify-center p-12 text-center">
          <p className="text-muted-foreground">Member not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={onBack} className="h-9 w-9">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold tracking-tight">{member.displayName || 'N/A'}</h2>
          <p className="text-sm text-muted-foreground">
            Member since {member.createdAt?.toLocaleDateString() || 'N/A'}
          </p>
        </div>
        <Badge variant={
          member.enrollmentStatus === 'approved' ? 'default' :
            member.enrollmentStatus === 'pending' ? 'secondary' :
              'destructive'
        } className="px-3 py-1 text-sm capitalize">
          {member.enrollmentStatus}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Profile Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-start gap-4 p-4 rounded-lg border bg-card/50">
              <div className="p-2 bg-muted rounded-full text-muted-foreground">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</p>
                <p className="text-sm font-medium mt-1">{member.email || 'N/A'}</p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4 rounded-lg border bg-card/50">
              <div className="p-2 bg-muted rounded-full text-muted-foreground">
                <Phone className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Phone</p>
                <p className="text-sm font-medium mt-1">{member.phoneNumber || 'N/A'}</p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4 rounded-lg border bg-card/50">
              <div className="p-2 bg-muted rounded-full text-muted-foreground">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Time Slot</p>
                <div className="flex items-center gap-2 mt-1">
                  {getTimeSlotIcon(member.timeSlot)}
                  <p className="text-sm font-medium">{member.timeSlot || 'Not assigned'}</p>
                </div>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4 rounded-lg border bg-card/50">
              <div className="p-2 bg-muted rounded-full text-muted-foreground">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Current Plan</p>
                <p className="text-sm font-medium mt-1">{getPlanLabel(member.planDuration)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Membership Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Membership Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <Badge variant={isExpired ? 'destructive' : 'outline'} className={cn("capitalize", isExpired && "bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20")}>
                {isExpired ? 'Expired' : 'Active'}
              </Badge>
            </div>
            <Separator />
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase">Enrolled At</p>
              <p className="text-sm font-medium">{member.enrolledAt?.toLocaleDateString() || '--'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase">Expiry Date</p>
              <p className={`text-sm font-medium ${isExpired ? 'text-destructive' : ''}`}>
                {expiryDate ? expiryDate.toLocaleDateString() : '--'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Real Attendance History */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center justify-between">
              Recent Attendance
              <Badge variant="secondary" className="rounded-full px-2.5">{attendance.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {attendance.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                <Calendar className="w-8 h-8 opacity-20 mb-2" />
                <p className="text-sm">No attendance records found</p>
              </div>
            ) : (
              <div className="space-y-1">
                {attendance.map((record) => (
                  <div key={record.id} className="group flex items-center justify-between p-3 hover:bg-muted/50 rounded-lg transition-colors border-b last:border-0 border-border/50">
                    <div>
                      <p className="text-sm font-medium">{record.date}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <span>{formatTime(record.checkInTime)} - {formatTime(record.checkOutTime)}</span>
                        {record.timeSlot && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              {getTimeSlotIcon(record.timeSlot)}
                              {record.timeSlot}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <Badge variant="outline" className="font-normal font-mono text-xs">
                      {formatDuration(record.duration)}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Real Payment History */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center justify-between">
              Payment History
              <Badge variant="secondary" className="rounded-full px-2.5">{payments.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {payments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                <CreditCard className="w-8 h-8 opacity-20 mb-2" />
                <p className="text-sm">No payment records found</p>
              </div>
            ) : (
              <div className="space-y-1">
                {payments.map(payment => (
                  <div key={payment.id} className="flex items-center justify-between p-3 hover:bg-muted/50 rounded-lg transition-colors border-b last:border-0 border-border/50">
                    <div className="flex items-start gap-4">
                      <div className="p-2 bg-muted rounded-lg text-muted-foreground mt-1">
                        <CreditCard className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm font-bold">₹{payment.amount}</p>
                        <p className="text-xs text-muted-foreground capitalize">{payment.paymentMethod}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{payment.createdAt.toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={
                        payment.status === 'approved' ? 'default' :
                          payment.status === 'pending' ? 'secondary' :
                            'destructive'
                      } className="capitalize mb-1">
                        {payment.status}
                      </Badge>
                      {payment.transactionId && (
                        <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">
                          #{payment.transactionId.slice(0, 8)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}