import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { BookOpen, X, Plus, Clock, FileText, Megaphone, ClipboardList, Scan, RefreshCcw } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import { getCourseBg, adjustColor } from '../../utils/courseBg';
import { Html5Qrcode } from 'html5-qrcode';
import { useAuth } from '../../auth/AuthContext';
import { studentApi } from '../../api';
import { showAlert, showApiError } from '../../utils/feedback';

/* ── Gradient palette for course cards ─────────────────────── */
const CARD_GRADIENTS = [
  'linear-gradient(135deg, #2563eb 0%, #3b82f6 60%, #60a5fa 100%)',
  'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 60%, #a78bfa 100%)',
  'linear-gradient(135deg, #0891b2 0%, #06b6d4 60%, #22d3ee 100%)',
  'linear-gradient(135deg, #059669 0%, #10b981 60%, #34d399 100%)',
  'linear-gradient(135deg, #d97706 0%, #f59e0b 60%, #fbbf24 100%)',
];

const StudentDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [attendCode, setAttendCode] = useState('');
  const [selectedSession, setSelectedSession] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const scannerRef = React.useRef<Html5Qrcode | null>(null);

  const load = () => {
    studentApi.getDashboard().then(res => {
      setData(res.data.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const qId = searchParams.get('attendSessionId');
    const qCode = searchParams.get('code');
    if (qId && qCode) {
      const sessionId = Number(qId);
      const code = qCode.toUpperCase();
      setAttendCode(code);
      setSelectedSession(sessionId);
      // Auto-submit if we have both and are not already submitting
      if (!submitting) {
        submitAttendanceWithValues(sessionId, code);
      }
    }
  }, [searchParams]);

  // Auto-select session if only one is available
  useEffect(() => {
    if (data?.activeSessions) {
      const active = data.activeSessions.filter((s: any) => !s.alreadySubmitted);
      if (active.length === 1) {
        setSelectedSession(active[0].session.id);
      }
    }
  }, [data]);

  useEffect(() => {
    if (showScanner) {
      const html5QrCode = new Html5Qrcode("reader");
      scannerRef.current = html5QrCode;

      const startScanner = async () => {
        try {
          await html5QrCode.start(
            { facingMode: facingMode },
            { 
              fps: 25, 
              qrbox: (viewfinderWidth, viewfinderHeight) => {
                const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
                const size = Math.floor(minEdge * 0.8);
                return { width: size, height: size };
              },
                aspectRatio: 1.0,
                disableFlip: false
              },
            (decodedText) => {
              const text = decodedText.trim();
              if (scannerRef.current) {
                scannerRef.current.stop().then(() => {
                   scannerRef.current?.clear();
                }).catch(console.error);
              }
              setShowScanner(false);
              
              try {
                // Check if it's a full URL or just the params part
                let url: URL;
                if (text.startsWith('http')) {
                  url = new URL(text);
                } else {
                  // Fallback for relative URLs or just params
                  url = new URL(text, window.location.origin);
                }
                
                const qId = url.searchParams.get('attendSessionId')?.trim();
                const qCode = url.searchParams.get('code')?.trim();
                
                if (qId && qCode) {
                  const sessionId = Number(qId);
                  const code = qCode.toUpperCase();
                  if (isNaN(sessionId) || sessionId <= 0) {
                    showAlert('Error', 'Invalid Session ID in QR Code', 'error');
                    return;
                  }
                  console.log('QR Scan Match:', { sessionId, code });
                  setAttendCode(code);
                  setSelectedSession(sessionId);
                  submitAttendanceWithValues(sessionId, code);
                } else {
                  // Check if the scanned text ITSELF is the 6-digit code
                  if (text.length === 6 && /^[A-Z0-9]+$/i.test(text)) {
                    const code = text.toUpperCase();
                    setAttendCode(code);
                    if (selectedSession) {
                      submitAttendanceWithValues(selectedSession, code);
                    } else {
                      showAlert('Info', 'Code detected. Please select a session to apply it.', 'alert');
                    }
                  } else {
                    showAlert('Error', 'Invalid QR Code format', 'error');
                  }
                }
              } catch (e) {
                // If URL parsing fails, maybe it's just the code?
                if (text.length === 6 && /^[A-Z0-9]+$/i.test(text)) {
                   const code = text.toUpperCase();
                   setAttendCode(code);
                   if (selectedSession) {
                     submitAttendanceWithValues(selectedSession, code);
                   } else {
                     showAlert('Info', 'Code detected. Please select a session to apply it.', 'alert');
                   }
                } else {
                  showAlert('Error', 'Could not read QR Code content', 'error');
                }
              }
            },
            () => {} // ignore
          );
        } catch (err) {
          console.error(err);
        }
      };

      startScanner();

      return () => {
        if (scannerRef.current && scannerRef.current.isScanning) {
          scannerRef.current.stop().then(() => scannerRef.current?.clear()).catch(console.error);
        } else if (scannerRef.current) {
          scannerRef.current.clear();
        }
      };
    }
  }, [showScanner, facingMode]);

  const submitAttendanceWithValues = async (sessionId: number, code: string) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await studentApi.submitAttendance({ sessionId, attendanceCode: code });
      showAlert('Success', res.data.message || 'Attendance recorded!');
      setAttendCode('');
      setSelectedSession(null);
      load(); // Refresh data instead of full page reload
    } catch (err: any) {
      console.error('Attendance Submission Error:', err);
      showApiError(err, 'Failed to submit attendance');
    } finally { setSubmitting(false); }
  };

  const submitAttendance = () => {
    if (!selectedSession || !attendCode) return;
    submitAttendanceWithValues(selectedSession, attendCode);
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim() || joining) return;
    setJoining(true);
    try {
      await studentApi.joinCourse(joinCode.toUpperCase());
      showAlert('Success', 'Successfully joined the course!');
      setShowJoin(false);
      setJoinCode('');
      load();
    } catch (err: any) {
      showAlert('Error', err.response?.data?.message || 'Could not join course', 'error');
    } finally { setJoining(false); }
  };

  /* ── Computed values ─────────────────────────────────────── */
  const avgAttendance = data?.courses?.length > 0
    ? Math.round(data.courses.reduce((acc: number, c: any) => acc + c.attendanceRate, 0) / data.courses.length)
    : 0;

  const pendingAssignments = 0; // Could be extended via API later

  /* Today's schedule — derive from course schedule strings */
  const todaysSchedule: { time: string; courseCode: string; room: string }[] = [];
  if (data?.courses) {
    const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const today = dayNames[new Date().getDay()];
    const shortDay: Record<string, string[]> = {
      'M': ['MON'], 'T': ['TUE'], 'W': ['WED'], 'TH': ['THU'], 'F': ['FRI'],
      'S': ['SAT'], 'SU': ['SUN'],
      'MWF': ['MON', 'WED', 'FRI'], 'TTH': ['TUE', 'THU'], 'TTHS': ['TUE', 'THU', 'SAT'],
      'MW': ['MON', 'WED'], 'MF': ['MON', 'FRI'], 'WF': ['WED', 'FRI'],
    };
    data.courses.forEach((cd: any) => {
      const schedule = cd.course.schedule || '';
      const room = cd.course.room || '';
      // Try to parse schedule like "MWF 9:00 AM" or "TTH 11:00 AM - 12:30 PM"
      const parts = schedule.trim().split(/\s+/);
      if (parts.length >= 2) {
        const dayPart = parts[0].toUpperCase();
        const timePart = parts.slice(1).join(' ');
        const matchedDays = shortDay[dayPart] || [];
        if (matchedDays.includes(today)) {
          todaysSchedule.push({
            time: timePart,
            courseCode: cd.course.courseCode,
            room: room ? `Room ${room}` : '',
          });
        }
      }
    });
  }

  /* Recent activity — we gather recent materials info from courses if available */
  const recentActivity: { icon: 'file' | 'announcement'; title: string; subtitle: string }[] = [];

  const studentActions = (
    <button className="sd-join-btn" onClick={() => setShowJoin(true)}>
      <Plus size={16} strokeWidth={2.5} />
      Join New Course
    </button>
  );

  return (
    <DashboardLayout role="student" actions={studentActions}>
      <div className="sd-welcome-header" style={{ marginBottom: '1.5rem' }}>
        <h1 className="sd-header-title" style={{ color: 'var(--text-primary)' }}>Welcome back, {user?.firstName || 'Student'}!</h1>
        <p className="sd-header-subtitle" style={{ color: 'var(--text-secondary)' }}>Here's your learning overview.</p>
      </div>
      {loading ? <div className="loading-screen"><div className="spinner"></div></div> : data && (
        <>
          {/* ── Active Sessions — Submit Attendance ── */}
          {data.activeSessions?.filter((s: any) => !s.alreadySubmitted).length > 0 && (
            <div className="sd-active-session-banner" style={{ background: 'var(--bg-card)', border: '1px solid var(--accent-blue)' }}>
              <div className="sd-active-dot-row">
                <div className="live-dot" />
                <h3 className="sd-active-title" style={{ color: 'var(--text-primary)' }}>Active Attendance Session</h3>
              </div>

              {data.activeSessions.filter((s: any) => !s.alreadySubmitted).map((s: any) => (
                <div
                  key={s.session.id}
                  className={`sd-session-item ${selectedSession === s.session.id ? 'selected' : ''}`}
                  onClick={() => setSelectedSession(s.session.id)}
                >
                  <div style={{ flex: 1 }}>
                    <strong className={selectedSession === s.session.id ? 'sd-session-name-active' : ''}>
                      {s.courseName}
                    </strong>
                    <span className="sd-session-sub">{s.session.sessionTitle || 'Live Session'}</span>
                  </div>
                  <span className={`badge badge-active`} style={{ opacity: selectedSession === s.session.id ? 1 : 0.7 }}>
                    {selectedSession === s.session.id ? 'Selected' : 'Click to select'}
                  </span>
                </div>
              ))}

              <div className="sd-attend-input-row" style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  className="form-input sd-code-input"
                  placeholder="0 0 0 0 0 0"
                  value={attendCode}
                  onChange={e => setAttendCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submitAttendance(); } }}
                  style={{ flex: 1 }}
                />
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowScanner(true)}
                  style={{ padding: '0 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  title="Scan QR Code"
                >
                  <Scan size={20} />
                </button>
                <button
                  className="btn btn-primary sd-submit-btn"
                  onClick={submitAttendance}
                  disabled={!selectedSession || !attendCode || submitting}
                >
                  {submitting ? 'Submitting…' : 'Submit Code'}
                </button>
              </div>
            </div>
          )}

          {/* ── Stats + Schedule Row ─────────────────── */}
          <div className="sd-top-grid">
            {/* Stats cards */}
            <div className="sd-stats-section">
              <div className="sd-stat-card">
                <div className="sd-stat-tag blue">Total Enrolled</div>
                <div className="sd-stat-icon-wrap blue">
                  <BookOpen size={18} />
                </div>
                <div className="sd-stat-value">{data.totalCourses}</div>
                <div className="sd-stat-label">Enrolled Courses</div>
              </div>

              <div className="sd-stat-card">
                <div className="sd-stat-tag blue">Avg. Attendance %</div>
                <div className="sd-stat-value lg">{avgAttendance}%</div>
                <div className="sd-stat-bar-track">
                  <div className="sd-stat-bar-fill blue" style={{ width: `${avgAttendance}%` }} />
                </div>
                <div className="sd-stat-label">Average Attendance</div>
              </div>

              <div className="sd-stat-card" onClick={() => navigate('/student/assignments')} style={{ cursor: 'pointer' }}>
                <div className="sd-stat-tag amber">Pending Assignments</div>
                <div className="sd-stat-icon-wrap amber">
                  <ClipboardList size={18} />
                </div>
                <div className="sd-stat-value">{pendingAssignments}</div>
                <div className="sd-stat-label">Assignments to Complete</div>
              </div>
            </div>

            {/* Today's Schedule panel */}
            <div className="sd-schedule-panel">
              <h3 className="sd-panel-title" style={{ color: 'var(--text-primary)' }}>Today's Schedule</h3>
              {todaysSchedule.length > 0 ? todaysSchedule.map((item, i) => (
                <div key={i} className={`sd-schedule-item ${i === 0 ? 'highlight' : ''}`}>
                  <div className="sd-schedule-time">{item.time}</div>
                  <div className="sd-schedule-meta">{item.courseCode}{item.room ? `, ${item.room}` : ''}</div>
                </div>
              )) : (
                <div className="sd-schedule-empty">
                  <Clock size={20} />
                  <span>No classes scheduled today</span>
                </div>
              )}
            </div>
          </div>

          {/* ── My Courses + Recent Activity Row ────── */}
          <div className="sd-bottom-grid">
            <div className="sd-courses-section">
              <div className="sd-section-header">
                <h3 className="sd-section-title" style={{ color: 'var(--text-primary)' }}>My Courses</h3>
                <div className="sd-section-actions">
                  <button className="sd-link-btn" onClick={() => navigate('/student/courses')}>Open All</button>
                  <button className="sd-link-btn" onClick={() => load()}>Refresh</button>
                </div>
              </div>

              <div className="sd-course-cards">
                {data.courses?.map((cd: any, idx: number) => (
                  <div
                    key={cd.course.id}
                    className="sd-course-card premium-card animate-slide-up"
                    style={{ animationDelay: `${idx * 0.1}s` }}
                    onClick={() => navigate(`/student/materials?courseId=${cd.course.id}`)}
                  >
                    <div
                      className="sd-course-card-top"
                      style={{ 
                        ...getCourseBg(cd.course.coverColor, idx, CARD_GRADIENTS),
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                    >
                      {/* Decorative abstract circle for premium feel */}
                      <div style={{
                        position: 'absolute',
                        top: '-20px',
                        right: '-20px',
                        width: '120px',
                        height: '120px',
                        borderRadius: '50%',
                        background: 'rgba(255, 255, 255, 0.1)',
                        filter: 'blur(30px)'
                      }} />

                      <span className="sd-course-code" style={{ 
                        background: 'rgba(255, 255, 255, 0.2)', 
                        backdropFilter: 'blur(4px)',
                        padding: '4px 12px',
                        borderRadius: '20px',
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        letterSpacing: '1px'
                      }}>
                        {cd.course.courseCode}
                      </span>
                      <h4 className="sd-course-name" style={{ fontSize: '1.25rem', marginTop: '0.75rem', fontWeight: 800 }}>
                        {cd.course.courseName}
                      </h4>
                      <p className="sd-course-desc" style={{ opacity: 0.9, fontSize: '0.8rem', marginTop: '0.5rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {cd.course.description || 'Join this class to start your learning journey.'}
                      </p>
                    </div>

                    <div className="sd-course-card-bottom" style={{ 
                      backdropFilter: 'blur(10px)',
                      borderTop: '1px solid var(--border-glass)'
                    }}>
                      <div className="sd-attendance-row">
                        <span className="sd-attendance-label" style={{ fontWeight: 700, fontSize: '0.75rem', opacity: 0.7 }}>ATTENDANCE</span>
                        <span className="sd-attendance-pct" style={{
                          fontWeight: 800,
                          color: cd.attendanceRate >= 80 ? '#10b981' : cd.attendanceRate >= 60 ? '#f59e0b' : '#ef4444'
                        }}>{cd.attendanceRate}%</span>
                      </div>
                      <div className="sd-attendance-bar-track" style={{ height: '6px', background: '#f1f5f9', borderRadius: '10px', overflow: 'hidden' }}>
                        <div
                          className="sd-attendance-bar-fill progress-shimmer"
                          style={{
                            width: `${cd.attendanceRate}%`,
                            height: '100%',
                            borderRadius: '10px',
                            background: cd.course.coverColor
                              ? `linear-gradient(90deg, ${cd.course.coverColor}, ${adjustColor(cd.course.coverColor, 20)})`
                              : idx % 2 === 0
                                ? 'linear-gradient(90deg, #3b82f6, #60a5fa)'
                                : 'linear-gradient(90deg, #8b5cf6, #a78bfa)',
                          }}
                        />
                      </div>
                      <div className="sd-course-meta-row" style={{ marginTop: '1rem', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                        {cd.course.teacher && <span>👨‍🏫 {cd.course.teacher.firstName}</span>}
                        {cd.course.schedule && <span>🕒 {cd.course.schedule}</span>}
                      </div>
                    </div>
                  </div>
                ))}

                {data.courses?.length === 0 && (
                  <div className="sd-empty-courses">
                    <BookOpen size={48} />
                    <h3>No courses enrolled</h3>
                    <p>Enter a join code from your teacher to get started.</p>
                    <button className="sd-join-btn" onClick={() => setShowJoin(true)}>
                      <Plus size={16} />
                      Join Course
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Activity panel */}
            <div className="sd-activity-panel">
              <h3 className="sd-panel-title" style={{ color: 'var(--text-primary)' }}>Recent Activity</h3>
              {recentActivity.length > 0 ? recentActivity.map((act, i) => (
                <div key={i} className="sd-activity-item">
                  <div className={`sd-activity-icon ${act.icon}`}>
                    {act.icon === 'file' ? <FileText size={16} /> : <Megaphone size={16} />}
                  </div>
                  <div>
                    <div className="sd-activity-title">{act.title}</div>
                    <div className="sd-activity-sub">{act.subtitle}</div>
                  </div>
                </div>
              )) : (
                <div className="sd-activity-empty">
                  <FileText size={20} />
                  <span>No recent activity yet</span>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── Join Course Modal ──────────────────────── */}
      {showJoin && (
        <div className="modal-overlay" onClick={() => setShowJoin(false)}>
          <div className="modal shadow-lg" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Join New Course</h3>
              <button className="modal-close hover:rotate-90 transition-transform duration-200" onClick={() => setShowJoin(false)}>
                <X size={20} />
              </button>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Enter the 6-digit course code provided by your teacher to enroll in their class.
            </p>
            <form onSubmit={handleJoin}>
              <div className="form-group">
                <label className="form-label">Course Code</label>
                <input
                  className="form-input focus:ring-2 focus:ring-blue-100 transition-all"
                  autoFocus
                  placeholder="EX: ABC123"
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  required
                  style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.3rem', fontWeight: '700', fontFamily: 'monospace', height: '56px' }}
                />
              </div>
              <div className="modal-actions" style={{ marginTop: '2rem' }}>
                <button type="button" className="btn btn-secondary transition-all" onClick={() => setShowJoin(false)} style={{ flex: 1 }}>Cancel</button>
                <button type="submit" className="btn btn-primary shadow-sm hover:shadow-md transition-all active:scale-95" style={{ flex: 1 }} disabled={joining || joinCode.length < 5}>
                  {joining ? 'Joining...' : 'Enroll Now'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── QR Scanner Modal ──────────────────────── */}
      {showScanner && (
        <div className="modal-overlay" onClick={() => setShowScanner(false)}>
          <div className="modal shadow-lg" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px', textAlign: 'center', overflow: 'hidden' }}>
            <div className="modal-header">
              <h3 className="modal-title">Scan QR Code</h3>
              <button className="modal-close hover:rotate-90 transition-transform duration-200" onClick={() => setShowScanner(false)}>
                <X size={20} />
              </button>
            </div>
            
            <div style={{ position: 'relative', width: '100%', marginTop: '1rem', borderRadius: '12px', overflow: 'hidden', backgroundColor: '#000', minHeight: '300px' }}>
              <div id="reader" style={{ width: '100%', border: 'none' }}></div>
              <button 
                onClick={(e) => { e.stopPropagation(); setFacingMode(prev => prev === "environment" ? "user" : "environment"); }}
                style={{ position: 'absolute', bottom: '1rem', right: '1rem', background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '50%', width: '45px', height: '45px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10, backdropFilter: 'blur(4px)' }}
                title="Flip Camera"
              >
                <RefreshCcw size={20} />
              </button>
            </div>
            <p style={{ marginTop: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Point your camera at the teacher's screen</p>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default StudentDashboard;
