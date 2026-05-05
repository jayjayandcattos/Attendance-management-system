import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import { X, QrCode, Upload, MapPin } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import { teacherApi } from '../../api';
import { showAlert, showConfirm, showApiError } from '../../utils/feedback';
import { getCourseBg } from '../../utils/courseBg';

const DAYS = [
  { key: 'Su', label: 'Sun' },
  { key: 'M', label: 'Mon' },
  { key: 'T', label: 'Tue' },
  { key: 'W', label: 'Wed' },
  { key: 'Th', label: 'Thu' },
  { key: 'F', label: 'Fri' },
  { key: 'Sa', label: 'Sat' },
];

const BG_COLORS = ['#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981', '#06b6d4', '#475569'];
const BG_IMAGES = [
  '36796dba4d1a7b0ec7a1a4b28a5b3e98.jpg',
  '57a01220653971e4e2cff753fa272479.jpg',
  '669a8eed28456200f4ff95097a0db078.jpg',
  '6a0ee617bb9e1b0a5ab9ac0e44a7e51f.jpg',
  '6e7f2df1ec42a44deade0468b5c3c416.jpg',
  '7003c41241e8b565589c6abd02fd21fa.jpg',
  '7733001d7a1780e69890b4a77ac10f0b.jpg',
  '8b98a2f4a3e3f30f5635fcad59270443.jpg',
  '97cb2c4c04f03958bda41b2fee0ce67c.jpg',
  '9a7f7abda033d415c34ca89055d0d495.jpg',
  'bd21141e01f48c911e1c42ffb1cd1f5a.jpg',
  'c3c77155748f15ffee61cbc1fe9705d6.jpg',
  'd9b29715b473dd0a5b37e1bc9929907b.jpg',
  'dffd9d976bdfd65a869e322a0e4f32b0.jpg',
  'e4f0270d3e1ce8b4aeefe601076f4c2e.jpg',
  'e9a477fe6444851b976195d99fd45349.jpg',
  'f271614b55f4c150ca1e1517c6486b2d.jpg',
  'f9780f1993b3a4a6d643c3ddccc6e300.jpg',
  'ff9235cd827885e439aef1bb9e153754.jpg'
];

const TeacherAttendance: React.FC = () => {
  const [sessions, setSessions] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState<{ show: boolean, sessionId: number | null, code: string }>({ show: false, sessionId: null, code: '' });
  const [showRecords, setShowRecords] = useState<any>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [form, setForm] = useState({ courseId: '', sessionTitle: '', duration: '10', customLate: false, lateMinutes: '' });
  
  // Create Course state
  const [showCreateCourse, setShowCreateCourse] = useState(false);
  const [courseForm, setCourseForm] = useState({ courseName: '', courseCode: '', section: '', room: '', coverColor: '#3b82f6' });
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:30');
  const [coverTab, setCoverTab] = useState<'colors' | 'presets' | 'upload'>('colors');
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showReopenModal, setShowReopenModal] = useState(false);
  const [targetReopen, setTargetReopen] = useState<any>(null);
  const [reopenDuration, setReopenDuration] = useState('10');
  const [showActivity, setShowActivity] = useState<any>(null);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const itemsPerPage = 8;

  const load = () => {
    Promise.all([
      teacherApi.getSessions(),
      teacherApi.getCourses()
    ]).then(([sessRes, courseRes]) => {
      setSessions(sessRes.data.data || []);
      setCourses(courseRes.data.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  // Polling for active sessions
  useEffect(() => {
    const activeSessions = sessions.filter(s => s.status === 'active');
    if (activeSessions.length === 0) return;
    const interval = setInterval(() => {
      teacherApi.getSessions().then(res => setSessions(res.data.data || [])).catch(() => { });
    }, 5000);
    return () => clearInterval(interval);
  }, [sessions]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = {
        courseId: Number(form.courseId),
        sessionTitle: form.sessionTitle,
        duration: Number(form.duration)
      };

      const res = await teacherApi.createAttendance(payload);
      setShowModal(false);
      setForm({ courseId: '', sessionTitle: '', duration: '10', customLate: false, lateMinutes: '' });
      const code = res.data?.data?.attendanceCode || '';
      showAlert('Success', `Session started! Code: ${code}`, 'success');
      load();
    } catch (err: any) { showApiError(err); }
  };

  const closeSession = (id: number) => {
    showConfirm('Close Session', 'Close this session? Absent students will be auto-marked.', async () => {
      try { await teacherApi.closeAttendance(id); showAlert('Success', 'Session closed.', 'success'); load(); }
      catch (err: any) { showApiError(err); }
    });
  };

  const openReopenModal = (session: any) => {
    setTargetReopen(session);
    setReopenDuration('10');
    setShowReopenModal(true);
  };

  const confirmReopen = async () => {
    if (!targetReopen) return;
    try {
      const res = await teacherApi.reopenAttendance(targetReopen.id, Number(reopenDuration));
      const code = res.data?.data?.attendanceCode || '';
      showAlert('Success', `Session reopened! Code: ${code}`, 'success');
      setShowReopenModal(false);
      setTargetReopen(null);
      load();
    } catch (err: any) { showApiError(err); }
  };

  const viewRecords = async (session: any) => {
    try {
      const res = await teacherApi.getRecords(session.id);
      setRecords(res.data.data || []);
      setShowRecords(session);
    } catch { setRecords([]); setShowRecords(session); }
  };

  const viewActivity = async (session: any) => {
    try {
      const res = await teacherApi.getSessionActivity(session.id);
      setActivityLogs(res.data.data || []);
      setShowActivity(session);
    } catch (err: any) { showApiError(err); }
  };

  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      showAlert('Error', 'Image too large. Max 2MB.', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setCourseForm({ ...courseForm, coverColor: result });
    };
    reader.onerror = () => {
      showAlert('Error', 'Failed to read file', 'error');
    };
    reader.readAsDataURL(file);
  };

  const toggleDay = (day: string) => {
    setSelectedDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  };

  const formatTime12 = (t: string): string => {
    if (!t) return '';
    const [h, m] = t.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
  };

  const buildSchedule = () => {
    if (selectedDays.length === 0) return '';
    return `${selectedDays.join('')} ${formatTime12(startTime)} - ${formatTime12(endTime)}`;
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await teacherApi.createCourse({ ...courseForm, schedule: buildSchedule() });
      setShowCreateCourse(false);
      setCourseForm({ courseName: '', courseCode: '', section: '', room: '', coverColor: '#3b82f6' });
      setSelectedDays([]);
      setStartTime('09:00');
      setEndTime('10:30');
      showAlert('Success', 'Course created successfully!', 'success');
      load();
    } catch (err: any) { showApiError(err, 'Error creating course'); }
  };

  const activeSessions = sessions.filter(s => s.status === 'active');
  const closedSessions = sessions.filter(s => s.status !== 'active');

  // Filtered sessions
  const filteredSessions = sessions.filter(s => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.course?.courseName?.toLowerCase().includes(q) ||
      s.course?.courseCode?.toLowerCase().includes(q) ||
      s.sessionTitle?.toLowerCase().includes(q) ||
      s.attendanceCode?.toLowerCase().includes(q)
    );
  });

  // Pagination
  const totalPages = Math.ceil(filteredSessions.length / itemsPerPage);
  const paginatedSessions = filteredSessions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const attendanceActions = (
    <div className="td-topbar-actions">
      <button className="btn btn-primary td-topbar-btn" onClick={() => setShowCreateCourse(true)}>+ Create Course</button>
      <button className="btn btn-secondary td-topbar-btn" onClick={() => setShowModal(true)}>+ New Session</button>
    </div>
  );

  return (
    <DashboardLayout role="teacher" actions={attendanceActions}>
      {loading ? <div className="loading-screen"><div className="spinner"></div></div> : (
        <>
          {/* ── Stats Row ─────────────────────────────────── */}
          <div className="ta-stats-row">
            <div className="ta-stat-card">
              <div className="ta-stat-top">
                <span className="ta-stat-label">Total Sessions</span>
                <div className="ta-stat-icon-box ta-stat-icon-gray">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                </div>
              </div>
              <div className="ta-stat-value">{sessions.length}</div>
              <span className="ta-stat-badge ta-stat-blue">THIS SEMESTER</span>
            </div>
            <div className="ta-stat-card">
              <div className="ta-stat-top">
                <span className="ta-stat-label">Active Now</span>
                <div className="ta-stat-icon-box ta-stat-icon-yellow">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
                </div>
              </div>
              <div className="ta-stat-value">{activeSessions.length}</div>
              <span className="ta-stat-badge ta-stat-live">
                <span className="td-live-dot-sm" style={{ background: '#f97316' }}></span>
                LIVE TRACKING
              </span>
            </div>
            <div className="ta-stat-card">
              <div className="ta-stat-top">
                <span className="ta-stat-label">Completed</span>
                <div className="ta-stat-icon-box ta-stat-icon-green">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
                </div>
              </div>
              <div className="ta-stat-value">{closedSessions.length}</div>
              <span className="ta-stat-badge ta-stat-neutral">ARCHIVED SESSIONS</span>
            </div>
          </div>

          {/* ── Active Sessions ───────────────────────────── */}
          {activeSessions.length > 0 && (
            <div className="ta-active-section">
              <div className="ta-active-header">
                <h2>Active Sessions</h2>
                <span className="ta-live-indicator">LIVE INDICATOR</span>
              </div>
              {activeSessions.map(s => (
                <div key={s.id} className="ta-active-card">
                  <div className="ta-active-info">
                    <span className="ta-active-ongoing">ONGOING NOW</span>
                    <h3>{s.course?.courseName || 'Course'}</h3>
                    <p>{s.sessionTitle || 'Regular Session'} • {s.course?.section || ''}</p>
                  </div>
                  <div className="ta-access-code">
                    <span className="ta-code-label">ACCESS CODE</span>
                    <div className="ta-code-value" onClick={() => { navigator.clipboard.writeText(s.attendanceCode || ''); showAlert('Copied', 'Code copied!', 'success'); }}>{s.attendanceCode}</div>
                  </div>
                  <div className="ta-active-actions">
                    <button className="btn btn-secondary" onClick={() => setShowQrModal({ show: true, sessionId: s.id, code: s.attendanceCode || '' })} style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <QrCode size={14} />
                      QR Code
                    </button>
                    <button className="btn btn-secondary" onClick={() => viewRecords(s)} style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="9" y1="21" x2="9" y2="9" /></svg>
                      Records
                    </button>
                    <button className="btn btn-secondary" onClick={() => viewActivity(s)} style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '0.4rem', border: '1px solid #fecaca', color: '#dc2626' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                      Audit
                    </button>
                    <button className="btn btn-danger" onClick={() => closeSession(s.id)} style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                      Close
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── All Sessions Table ────────────────────────── */}
          <div className="ta-table-section">
            <div className="ta-table-header">
              <h2>All Sessions</h2>
              <div className="ta-search-wrapper">
                <svg className="td-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                <input className="td-search-input" placeholder="Search sessions..." value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }} />
              </div>
            </div>
            <div className="data-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>COURSE</th>
                    <th>SESSION</th>
                    <th>CODE</th>
                    <th>DURATION</th>
                    <th>STATUS</th>
                    <th>DATE</th>
                    <th>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedSessions.map(s => (
                    <tr key={s.id}>
                      <td>
                        <div className="ta-table-course-name">{s.course?.courseName || '—'}</div>
                        <div className="ta-table-course-meta">{s.course?.courseCode} • {s.course?.section || ''}</div>
                      </td>
                      <td>{s.sessionTitle || 'Regular Session'}</td>
                      <td>
                        <span className="ta-table-code" onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(s.attendanceCode || ''); showAlert('Copied', 'Code copied!', 'success'); }}>
                          {s.attendanceCode}
                        </span>
                      </td>
                      <td>{s.status === 'active' ? 'Ongoing' : `${s.durationMinutes} Mins`}</td>
                      <td>
                        <span className={`ta-status-pill ${s.status === 'active' ? 'active' : 'closed'}`}>
                          {s.status === 'active' ? 'ACTIVE' : 'CLOSED'}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>{new Date(s.startTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          {s.status === 'active' ? (
                            <>
                              <button className="ta-action-btn" title="View Records" onClick={() => viewRecords(s)}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                              </button>
                              <button className="btn btn-danger btn-sm" onClick={() => closeSession(s.id)} style={{ width: 'auto', borderRadius: '20px', fontSize: '0.7rem' }}>
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                              </button>
                            </>
                          ) : (
                            <>
                              <button className="ta-reopen-btn" onClick={() => openReopenModal(s)}>REOPEN</button>
                              <button className="ta-action-btn" title="History" onClick={() => viewRecords(s)}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" /></svg>
                              </button>
                              <button className="ta-action-btn" title="Audit Activity" onClick={() => viewActivity(s)} style={{ color: '#ef4444' }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredSessions.length === 0 && (
                    <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No sessions found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {/* ── Pagination ──────────────────────────────── */}
            <div className="ta-pagination">
              <span className="ta-page-info">Showing {Math.min((currentPage - 1) * itemsPerPage + 1, filteredSessions.length)} to {Math.min(currentPage * itemsPerPage, filteredSessions.length)} of {filteredSessions.length} entries</span>
              <div className="ta-page-btns">
                <button className="ta-page-btn" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
                </button>
                {Array.from({ length: totalPages }, (_, i) => (
                  <button key={i} className={`ta-page-num ${currentPage === i + 1 ? 'active' : ''}`} onClick={() => setCurrentPage(i + 1)}>{i + 1}</button>
                ))}
                <button className="ta-page-btn" disabled={currentPage === totalPages || totalPages === 0} onClick={() => setCurrentPage(p => p + 1)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── New Session Modal ──────────────────────────────── */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="theme-card" style={{ width: '100%', maxWidth: '500px', borderRadius: '24px', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ padding: '1.5rem', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-glass)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="modal-title" style={{ margin: 0, fontWeight: 900, color: 'var(--text-primary)' }}>New Attendance Session</h3>
              <button className="theme-btn-secondary" style={{ border: 'none', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowModal(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
            <form onSubmit={handleCreate} style={{ padding: '1.5rem', maxHeight: '80vh', overflowY: 'auto' }} className="modal-scroll-area">
              <div className="form-group"><label className="form-label">Course</label>
                <select className="form-input" value={form.courseId} onChange={e => setForm({ ...form, courseId: e.target.value })} required>
                  <option value="">Select course...</option>
                  {courses.filter(c => c.status === 'active').map(c => <option key={c.id} value={c.id}>{c.courseCode} — {c.courseName}</option>)}
                </select>
              </div>
              <div className="form-group"><label className="form-label">Session Title (optional)</label><input className="form-input" value={form.sessionTitle} onChange={e => setForm({ ...form, sessionTitle: e.target.value })} placeholder="e.g. Week 5" /></div>
              <div className="form-group"><label className="form-label">Duration (minutes)</label><input className="form-input" type="number" min="1" max="120" value={form.duration} onChange={e => setForm({ ...form, duration: e.target.value })} /></div>



              <div className="modal-actions" style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}><button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)} style={{ width: 'auto' }}>Cancel</button><button type="submit" className="btn btn-primary" style={{ width: 'auto' }}>Start Session</button></div>
            </form>
          </div>
        </div>
      )}

      {/* ── Records Modal ─────────────────────────────────── */}
      {showRecords && (
        <div className="modal-overlay" onClick={() => setShowRecords(null)}>
          <div className="modal" style={{ maxWidth: '700px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3 className="modal-title">Attendance Records — {showRecords.sessionTitle || 'Session'}</h3><button className="modal-close" onClick={() => setShowRecords(null)}>×</button></div>
            <div className="data-table-wrapper">
              <table className="data-table">
                <thead><tr><th>Student</th><th>Status</th><th>Time</th></tr></thead>
                <tbody>
                  {records.map((r: any) => (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 500 }}>{r.student?.firstName} {r.student?.lastName}{r.student?.studentId && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 400 }}>{r.student.studentId}</div>}</td>
                      <td><span className={`badge badge-${r.status}`}>{r.status}</span></td>
                      <td style={{ color: 'var(--text-secondary)' }}>{r.submittedAt ? new Date(r.submittedAt).toLocaleString() : '—'}</td>
                    </tr>
                  ))}
                  {records.length === 0 && <tr><td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No records</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Activity Logs Modal ───────────────────────────── */}
      {showActivity && (
        <div className="modal-overlay" onClick={() => setShowActivity(null)}>
          <div className="modal shadow-2xl" style={{ maxWidth: '800px', borderRadius: '24px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ padding: '1.5rem', background: '#fff1f2', borderBottom: '1px solid #fecaca' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ background: '#fee2e2', padding: '0.5rem', borderRadius: '12px' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                </div>
                <div>
                  <h3 className="modal-title" style={{ margin: 0, color: '#991b1b' }}>Suspicious Activity Audit</h3>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#b91c1c' }}>Login/Logout activity during session window (±5 mins)</p>
                </div>
              </div>
              <button className="modal-close" onClick={() => setShowActivity(null)}>×</button>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '16px', padding: '1rem', marginBottom: '1.5rem', fontSize: '0.85rem', color: '#991b1b' }}>
                <strong>Tip:</strong> Look for multiple students logging in from the same IP address or students logging out immediately after marking attendance. This may indicate account sharing.
              </div>
              
              <div className="data-table-wrapper" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Action</th>
                      <th>Student</th>
                      <th>IP Address</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activityLogs.map((log: any) => (
                      <tr key={log.id}>
                        <td style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{new Date(log.createdAt).toLocaleTimeString()}</td>
                        <td>
                          <span style={{ 
                            padding: '4px 8px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 800,
                            background: log.action === 'login' ? '#dcfce7' : '#fee2e2',
                            color: log.action === 'login' ? '#166534' : '#991b1b',
                            textTransform: 'uppercase'
                          }}>
                            {log.action}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{log.user?.firstName} {log.user?.lastName}</div>
                          <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{log.user?.email}</div>
                        </td>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{log.ipAddress}</td>
                      </tr>
                    ))}
                    {activityLogs.length === 0 && (
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                          No login/logout activity detected during this session.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="modal-footer" style={{ padding: '1rem 1.5rem', borderTop: '1px solid #fee2e2', background: '#fff1f2', textAlign: 'right' }}>
              <button className="btn btn-secondary" onClick={() => setShowActivity(null)} style={{ width: 'auto' }}>Close Audit</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Reopen Modal ──────────────────────────────────── */}
      {showReopenModal && (
        <div className="modal-overlay" onClick={() => setShowReopenModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3 className="modal-title">Reopen Session</h3><button className="modal-close" onClick={() => setShowReopenModal(false)}>×</button></div>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>Reopening: <strong>{targetReopen?.sessionTitle || 'Session'}</strong>. A new code will be generated.</p>
            <div className="form-group"><label className="form-label">Extended Duration (minutes)</label><input type="number" className="form-input" value={reopenDuration} onChange={e => setReopenDuration(e.target.value)} min="1" max="120" /></div>
            <div className="modal-actions"><button className="btn btn-secondary" onClick={() => setShowReopenModal(false)}>Cancel</button><button className="btn btn-primary" style={{ width: 'auto' }} onClick={confirmReopen}>Confirm Reopen</button></div>
          </div>
        </div>
      )}
      {/* ── QR Code Modal ─────────────────────────────────────── */}
      {showQrModal.show && (
        <div className="modal-overlay" onClick={() => setShowQrModal({ show: false, sessionId: null, code: '' })}>
          <div className="theme-card" onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '420px', textAlign: 'center', borderRadius: '24px', overflow: 'hidden' }}>
            <div className="modal-header" style={{ padding: '1.5rem', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-glass)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="modal-title" style={{ margin: 0, fontWeight: 900, color: 'var(--text-primary)' }}>Attendance QR Code</h3>
              <button className="theme-btn-secondary" style={{ border: 'none', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowQrModal({ show: false, sessionId: null, code: '' })}>
                <X size={20} />
              </button>
            </div>
            <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '2rem', display: 'inline-block', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', border: '1px solid var(--border-glass)' }}>
                <QRCodeCanvas
                  value={`${window.location.origin}/student/dashboard?attendSessionId=${showQrModal.sessionId}&code=${showQrModal.code}`}
                  size={260}
                  level="M"
                  includeMargin={false}
                />
              </div>
              <p style={{ marginTop: '1.5rem', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 500 }}>Students can scan this code to mark their attendance automatically.</p>
              
              <div style={{ marginTop: '1.5rem', padding: '1.25rem', background: 'rgba(59,130,246,0.1)', borderRadius: '20px', width: '100%' }}>
                <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 900, letterSpacing: '0.1em', color: 'var(--accent-blue)', opacity: 0.8 }}>Manual Join Code</span>
                <div style={{ fontSize: '2.5rem', fontFamily: 'monospace', fontWeight: 900, letterSpacing: '0.2em', marginTop: '0.25rem', color: 'var(--text-primary)' }}>{showQrModal.code}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Create Course Modal ──────────────────────────────── */}
      {showCreateCourse && (
        <div className="modal-overlay" onClick={() => setShowCreateCourse(false)}>
          <div className="theme-card" style={{ width: '100%', maxWidth: '600px', borderRadius: '24px', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ padding: '1.5rem', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-glass)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="modal-title" style={{ margin: 0, fontWeight: 900, color: 'var(--text-primary)' }}>Create New Course</h3>
              <button className="theme-btn-secondary" style={{ border: 'none', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowCreateCourse(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateCourse} style={{ padding: '1.5rem', maxHeight: '80vh', overflowY: 'auto' }} className="modal-scroll-area">
              <div className="form-group"><label className="form-label">Course Name</label><input className="form-input focus:ring-2 focus:ring-blue-100 transition-all" value={courseForm.courseName} onChange={e => setCourseForm({ ...courseForm, courseName: e.target.value })} required placeholder="Introduction to Programming" /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group"><label className="form-label">Course Code</label><input className="form-input font-mono focus:ring-2 focus:ring-blue-100 transition-all" value={courseForm.courseCode} onChange={e => setCourseForm({ ...courseForm, courseCode: e.target.value })} required placeholder="CS101" /></div>
                <div className="form-group"><label className="form-label">Section</label><input className="form-input focus:ring-2 focus:ring-blue-100 transition-all" value={courseForm.section} onChange={e => setCourseForm({ ...courseForm, section: e.target.value })} placeholder="Section A" /></div>
              </div>
              <div className="form-group">
                <label className="form-label">Schedule</label>
                <div className="day-picker flex gap-2 mb-3">
                  {DAYS.map(d => (
                    <div key={d.key}
                      className={`day-chip ${selectedDays.includes(d.key) ? 'selected' : ''}`}
                      onClick={() => toggleDay(d.key)}>
                      {d.label}
                    </div>
                  ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1.5rem' }}>
                  <div><label className="form-label text-[10px] uppercase font-bold text-gray-400">Start Time</label><input className="form-input focus:ring-2 focus:ring-blue-100 transition-all" type="time" value={startTime} onChange={e => setStartTime(e.target.value)} /></div>
                  <div><label className="form-label text-[10px] uppercase font-bold text-gray-400">End Time</label><input className="form-input focus:ring-2 focus:ring-blue-100 transition-all" type="time" value={endTime} onChange={e => setEndTime(e.target.value)} /></div>
                </div>
              </div>
              <div className="form-group"><label className="form-label">Room</label><div className="relative"><MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input className="form-input pl-10 focus:ring-2 focus:ring-blue-100 transition-all" value={courseForm.room} onChange={e => setCourseForm({ ...courseForm, room: e.target.value })} placeholder="Room 301" /></div></div>

              <div className="form-group">
                <label className="form-label">Course Cover</label>
                <div className="cover-preview" style={getCourseBg(courseForm.coverColor || '#3b82f6', 0)}>
                  <div style={{ zIndex: 1, textAlign: 'center' }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 800 }}>{courseForm.courseName || 'Course Name'}</div>
                    <div style={{ fontSize: '0.7rem', opacity: 0.8 }}>{courseForm.courseCode || 'CODE101'}</div>
                  </div>
                </div>

                <div className="cover-selector-tabs">
                  <div className={`cover-tab ${coverTab === 'colors' ? 'active' : ''}`} onClick={() => setCoverTab('colors')}>Colors</div>
                  <div className={`cover-tab ${coverTab === 'presets' ? 'active' : ''}`} onClick={() => setCoverTab('presets')}>Backgrounds</div>
                  <div className={`cover-tab ${coverTab === 'upload' ? 'active' : ''}`} onClick={() => setCoverTab('upload')}>Custom</div>
                </div>

                {coverTab === 'colors' && (
                  <div className="cover-options-grid">
                    {BG_COLORS.map(color => (
                      <div
                        key={color}
                        className={`color-option ${courseForm.coverColor === color ? 'active' : ''}`}
                        style={{ background: color }}
                        onClick={() => setCourseForm({ ...courseForm, coverColor: color })}
                      />
                    ))}
                  </div>
                )}

                {coverTab === 'presets' && (
                  <div className="cover-options-grid">
                    {BG_IMAGES.map(img => (
                      <div
                        key={img}
                        className={`image-option ${courseForm.coverColor === `/bg/${img}` ? 'active' : ''}`}
                        style={{ backgroundImage: `url(/bg/${img})` }}
                        onClick={() => setCourseForm({ ...courseForm, coverColor: `/bg/${img}` })}
                      />
                    ))}
                  </div>
                )}

                {coverTab === 'upload' && (
                  <div className="cover-upload-zone" onClick={() => coverInputRef.current?.click()}>
                    <Upload size={24} style={{ marginBottom: '0.5rem', color: 'var(--text-muted)' }} />
                    <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>Click to upload custom image</div>
                    <input ref={coverInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleCoverUpload} />
                  </div>
                )}
              </div>
              <div className="modal-actions" style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary transition-colors" onClick={() => setShowCreateCourse(false)} style={{ width: 'auto' }}>Cancel</button>
                <button type="submit" className="btn btn-primary shadow-sm hover:shadow-md transition-all active:scale-95" style={{ width: 'auto' }}>
                  Create Course
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default TeacherAttendance;
