import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { GymReport, ReportStatus } from '@/types';
import { parseFirestoreDate } from '@/utils/date';
import { Flag, CheckCircle, XCircle, Eye, MessageSquare, AlertTriangle } from 'lucide-react';

const STATUS_CONFIG: Record<ReportStatus, { bg: string; text: string }> = {
  pending: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400' },
  reviewed: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400' },
  resolved: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400' },
  rejected: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400' },
};

const ISSUE_COLORS: Record<string, string> = {
  Equipment: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
  Cleanliness: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400',
  Staff: 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400',
  Safety: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400',
  Other: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
};

export function GymReports() {
  const { userData, user } = useAuth();
  const [reports, setReports] = useState<GymReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<GymReport | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchReports = async () => {
    if (!userData?.gymId) return;
    try {
      setLoading(true);
      const q = query(collection(db, 'gymReports'), where('gymId', '==', userData.gymId));
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({
        ...d.data(),
        id: d.id,
        createdAt: parseFirestoreDate(d.data().createdAt) || new Date(),
        reviewedAt: parseFirestoreDate(d.data().reviewedAt),
      })) as GymReport[];
      list.sort((a, b) => (b.createdAt as Date).getTime() - (a.createdAt as Date).getTime());
      setReports(list);
    } catch (error) {
      console.error('Error fetching gym reports:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReports(); }, [userData]);

  const updateReportStatus = async (report: GymReport, status: ReportStatus) => {
    if (!report.id) return;
    setActionLoading(true);
    try {
      if (status === 'resolved') {
        if (!confirm('Are you sure you want to resolve and DELETE this report? This action cannot be undone.')) {
          setActionLoading(false);
          return;
        }
        await deleteDoc(doc(db, 'gymReports', report.id));
      } else {
        const updateData: Record<string, unknown> = {
          status,
          reviewedAt: serverTimestamp(),
          reviewedBy: user?.uid || null,
        };
        if (adminNotes.trim()) updateData.adminNotes = adminNotes.trim();
        await updateDoc(doc(db, 'gymReports', report.id), updateData);
      }
      await fetchReports();
      setSelectedReport(null);
      setAdminNotes('');
    } catch (error) {
      console.error('Error updating report:', error);
      alert('Failed to update report');
    } finally {
      setActionLoading(false);
    }
  };

  const pendingCount = reports.filter(r => r.status === 'pending').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Flag className="w-5 h-5" />
            Gym Issue Reports
            {pendingCount > 0 && (
              <span className="px-2 py-0.5 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded-full text-xs font-medium">
                {pendingCount} pending
              </span>
            )}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Reports submitted by members from the app</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : reports.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-12 text-center">
          <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 dark:text-gray-400">No reports submitted yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map(report => (
            <div key={report.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-5">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{report.userName}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">{report.userEmail}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {report.createdAt instanceof Date ? report.createdAt.toLocaleString() : 'N/A'}
                  </p>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium capitalize ${STATUS_CONFIG[report.status]?.bg} ${STATUS_CONFIG[report.status]?.text}`}>
                  {report.status}
                </span>
              </div>

              {/* Issue types */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                {report.issueTypes.map(type => (
                  <span key={type} className={`px-2 py-0.5 rounded-full text-xs font-medium ${ISSUE_COLORS[type] || ISSUE_COLORS.Other}`}>
                    {type}
                  </span>
                ))}
              </div>

              {/* Description */}
              <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 mb-3">
                {report.description}
              </p>

              {/* Admin notes if exist */}
              {report.adminNotes && (
                <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-lg mb-3">
                  <MessageSquare className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                  <p className="text-sm text-blue-800 dark:text-blue-300">{report.adminNotes}</p>
                </div>
              )}

              {/* Actions */}
              {report.status === 'pending' && (
                <div className="flex items-center gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
                  <button
                    onClick={() => { setSelectedReport(report); setAdminNotes(''); }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg text-xs font-medium transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" /> Review
                  </button>
                  <button
                    onClick={() => updateReportStatus(report, 'resolved')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg text-xs font-medium transition-colors"
                  >
                    <CheckCircle className="w-3.5 h-3.5" /> Resolve
                  </button>
                  <button
                    onClick={() => updateReportStatus(report, 'rejected')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-xs font-medium transition-colors"
                  >
                    <XCircle className="w-3.5 h-3.5" /> Reject
                  </button>
                </div>
              )}

              {report.status === 'reviewed' && (
                <div className="flex items-center gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
                  <button
                    onClick={() => updateReportStatus(report, 'resolved')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg text-xs font-medium transition-colors"
                  >
                    <CheckCircle className="w-3.5 h-3.5" /> Mark Resolved
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Review Modal */}
      {selectedReport && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedReport(null)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Review Report</h3>

            <div className="space-y-3 mb-4">
              <p className="text-sm text-gray-700 dark:text-gray-300"><strong>From:</strong> {selectedReport.userName} ({selectedReport.userEmail})</p>
              <div className="flex flex-wrap gap-1.5">
                {selectedReport.issueTypes.map(t => (
                  <span key={t} className={`px-2 py-0.5 rounded-full text-xs font-medium ${ISSUE_COLORS[t] || ISSUE_COLORS.Other}`}>{t}</span>
                ))}
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">{selectedReport.description}</p>
            </div>

            <div className="mb-4">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Admin Notes (optional)</label>
              <textarea
                value={adminNotes}
                onChange={e => setAdminNotes(e.target.value)}
                rows={3}
                placeholder="Add notes about how this was handled..."
                className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            <div className="flex items-center gap-2 justify-end">
              <button onClick={() => setSelectedReport(null)} className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-sm font-medium transition-colors">
                Cancel
              </button>
              <button
                onClick={() => updateReportStatus(selectedReport, 'reviewed')}
                disabled={actionLoading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {actionLoading ? 'Saving...' : 'Mark as Reviewed'}
              </button>
              <button
                onClick={() => updateReportStatus(selectedReport, 'resolved')}
                disabled={actionLoading}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {actionLoading ? 'Saving...' : 'Resolve'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}