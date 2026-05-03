import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Clock,
  BookOpen,
  Users,
  CheckCircle2,
  Radio,
  MapPin,
  MoreHorizontal,
  X,
  ArrowLeft,
  ArrowRight,
  TrendingUp,
  CircleDashed,
  ExternalLink,
  Calendar,
  Upload,
  QrCode,
  UserCheck
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import DashboardLayout from '../../components/DashboardLayout';
import { teacherApi } from '../../api';
import { useAuth } from '../../auth/AuthContext';
import { showAlert, showConfirm, showApiError } from '../../utils/feedback';
import { getCourseBg, adjustColor } from '../../utils/courseBg';


/* ── helpers ───────────────────────────────────────────────── */

const DAYS = [
  { key: 'Su', label: 'Sun' },
  { key: 'M', label: 'Mon' },
  { key: 'T', label: 'Tue' },
  { key: 'W', label: 'Wed' },
  { key: 'Th', label: 'Thu' },
  { key: 'F', label: 'Fri' },
  { key: 'Sa', label: 'Sat' },
];

const COURSE_GRADIENTS = [
  'linear-gradient(135deg, #4285F4 0%, #5B9CF4 100%)',
  'linear-gradient(135deg, #F4A742 0%, #F6C86B 100%)',
  'linear-gradient(135deg, #7B68EE 0%, #9B8FFF 100%)',
  'linear-gradient(135deg, #EA4335 0%, #FF6B5B 100%)',
  'linear-gradient(135deg, #34A853 0%, #4FC36B 100%)',
  'linear-gradient(135deg, #00BCD4 0%, #4DD0E1 100%)',
  'linear-gradient(135deg, #9C27B0 0%, #BA68C8 100%)',
  'linear-gradient(135deg, #FF5722 0%, #FF8A65 100%)',
];

// Removed CATEGORY_COLORS

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function formatTime12(t: string): string {
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
}

/* ── Live Clock ────────────────────────────────────────────── */
const LiveClock: React.FC = () => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const hours = now.getHours();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const h12 = hours % 12 || 12;
  const mins = now.getMinutes().toString().padStart(2, '0');
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return (
    <div className="td-clock-display">
      <span className="td-clock-label">LOCAL TIME</span>
      <div className="td-clock-time">{h12}:{mins} <span className="td-clock-ampm">{ampm}</span></div>
      <span className="td-clock-date">{dayNames[now.getDay()]}, {monthNames[now.getMonth()]} {now.getDate()}</span>
    </div>
  );
};

/* ── Session Timer ─────────────────────────────────────────── */
const SessionTimer: React.FC<{ endTime: string; onExpire: () => void }> = ({ endTime, onExpire }) => {
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    const end = new Date(endTime).getTime();
    const update = () => {
      const now = Date.now();
      const diff = end - now;
      if (diff <= 0) { onExpire(); return; }
      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${m}:${s.toString().padStart(2, '0')}`);
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [endTime, onExpire]);

  return (
    <div className="td-session-timer">
      <Clock size={14} strokeWidth={2.5} />
      {timeLeft}
    </div>
  );
};

/* ── Main Component ────────────────────────────────────────── */
const TeacherDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showAttendance, setShowAttendance] = useState(false);
  const [showCreateCourse, setShowCreateCourse] = useState(false);
  const [showReopenModal, setShowReopenModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState<{ show: boolean, sessionId: number | null, code: string }>({ show: false, sessionId: null, code: '' });

  // Forms
  const [attendForm, setAttendForm] = useState({ courseId: '', sessionTitle: '', duration: '10', allowLate: true, lateMinutes: '15' });
  const [courseForm, setCourseForm] = useState({ courseName: '', courseCode: '', section: '', schedule: '', room: '', coverColor: '#3b82f6' });
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:30');
  const [targetReopenSession, setTargetReopenSession] = useState<{ id: number; title: string } | null>(null);
  const [reopenDuration, setReopenDuration] = useState('10');
  const [reopeningId, setReopeningId] = useState<number | null>(null);
  const [coverTab, setCoverTab] = useState<'colors' | 'presets' | 'upload'>('colors');
  const coverInputRef = useRef<HTMLInputElement>(null);

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

  // Courses carousel
  const coursesScrollRef = useRef<HTMLDivElement>(null);

  const loadDashboard = useCallback(() => {
    teacherApi.getDashboard().then(res => {
      setData(res.data?.data || { courses: [], activeSessions: [], recentSessions: [], totalCourses: 0, totalStudents: 0, totalSessions: 0 });
      setLoadError(null);
      setLoading(false);
    }).catch(() => {
      setLoadError('Unable to load teacher dashboard. Please refresh.');
      setData({ courses: [], activeSessions: [], recentSessions: [], totalCourses: 0, totalStudents: 0, totalSessions: 0 });
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    loadDashboard();
    const pollInterval = setInterval(() => {
      if (data?.activeSessions?.length > 0) {
        teacherApi.getDashboard().then(res => setData(res.data.data)).catch(() => { });
      }
    }, 5000);
    return () => clearInterval(pollInterval);
  }, [data?.activeSessions?.length, loadDashboard]);

  /* ── actions ──────────────────────────────────────────────── */
  const buildSchedule = () => {
    if (selectedDays.length === 0) return '';
    return `${selectedDays.join('')} ${formatTime12(startTime)} - ${formatTime12(endTime)}`;
  };

  const startSession = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await teacherApi.createAttendance({
        courseId: Number(attendForm.courseId),
        sessionTitle: attendForm.sessionTitle,
        duration: Number(attendForm.duration),
        allowLate: attendForm.allowLate,
        lateMinutes: Number(attendForm.lateMinutes),
      });
      setShowAttendance(false);
      setAttendForm({ courseId: '', sessionTitle: '', duration: '10', allowLate: true, lateMinutes: '15' });
      const code = res.data?.data?.attendanceCode || '';
      showAlert('Success', `Attendance session started! Code: ${code}`, 'success');
      loadDashboard();
    } catch (err: any) { showApiError(err, 'Error creating session'); }
  };

  const closeSession = async (id: number) => {
    showConfirm('Confirm Action', 'Close this attendance session? Absent students will be automatically marked.', async () => {
      try {
        await teacherApi.closeAttendance(id);
        showAlert('Success', 'Session closed successfully.', 'success');
        loadDashboard();
      } catch (err: any) { showApiError(err, 'Error closing session'); }
    });
  };

  const confirmReopen = async () => {
    if (!targetReopenSession) return;
    try {
      setReopeningId(targetReopenSession.id);
      const res = await teacherApi.reopenAttendance(targetReopenSession.id, Number(reopenDuration));
      const code = res.data?.data?.attendanceCode || '';
      showAlert('Success', `Session reopened! New code: ${code}`, 'success');
      setShowReopenModal(false);
      setTargetReopenSession(null);
      loadDashboard();
    } catch (err: any) { showApiError(err, 'Error reopening session'); }
    finally { setReopeningId(null); }
  };

  const openReopenModal = (id: number, title: string) => {
    setTargetReopenSession({ id, title });
    setReopenDuration('10');
    setShowReopenModal(true);
  };

  const createCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await teacherApi.createCourse({ ...courseForm, schedule: buildSchedule() });
      setShowCreateCourse(false);
      setCourseForm({ courseName: '', courseCode: '', section: '', schedule: '', room: '', coverColor: '#3b82f6' });
      setSelectedDays([]);
      setStartTime('09:00');
      setEndTime('10:30');
      showAlert('Success', 'Course created successfully!', 'success');
      loadDashboard();
    } catch (err: any) { showApiError(err, 'Error creating course'); }
  };

  const toggleDay = (day: string) => {
    setSelectedDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  };

  const scrollCourses = (dir: number) => {
    if (coursesScrollRef.current) {
      coursesScrollRef.current.scrollBy({ left: dir * 320, behavior: 'smooth' });
    }
  };

  /* ── computed ─────────────────────────────────────────────── */
  const totalCourses = data?.totalCourses || data?.courses?.length || 0;
  const totalStudents = data?.totalStudents || 0;
  const totalSessions = data?.totalSessions || 0;
  const activeSessionsCount = data?.activeSessions?.length || 0;
  const activeCourses = data?.courses?.filter((c: any) => c.status === 'active') || [];

  // Search filter
  const filteredCourses = activeCourses.filter((c: any) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.courseName?.toLowerCase().includes(q) ||
      c.courseCode?.toLowerCase().includes(q) ||
      c.section?.toLowerCase().includes(q)
    );
  });

  const teacherName = data?.teacherName || user?.firstName || 'Teacher';



  const dashboardActions = (
    <>
      <button className="btn btn-secondary td-topbar-btn transition-all active:scale-95" onClick={() => setShowAttendance(true)}>
        <Plus size={14} strokeWidth={2.5} />
        New Session
      </button>
      <button className="btn btn-primary td-topbar-btn shadow-sm hover:shadow-md transition-all active:scale-95" onClick={() => setShowCreateCourse(true)}>
        <Plus size={14} strokeWidth={2.5} />
        Create Course
      </button>
    </>
  );

  /* ── render ──────────────────────────────────────────────── */
  return (
    <DashboardLayout
      role="teacher"
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      actions={dashboardActions}
    >
      {loading ? (
        <div className="loading-screen"><div className="spinner"></div></div>
      ) : loadError ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '2rem' }}>
          <h3 style={{ marginBottom: '0.5rem' }}>Dashboard unavailable</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>{loadError}</p>
          <button className="btn btn-primary" style={{ width: 'auto' }} onClick={() => { setLoading(true); loadDashboard(); }}>Retry</button>
        </div>
      ) : (
        <>
          {/* ── Welcome Banner ────────────────────────────────── */}
          <div className="td-welcome-banner">
            <div className="td-welcome-left">
              <h1 className="td-welcome-title">Welcome back, {teacherName}!</h1>
              <p className="td-welcome-sub">
                Your editorial intelligence dashboard is ready. You have {activeSessionsCount} active session{activeSessionsCount !== 1 ? 's' : ''} running currently.
              </p>
            </div>
            <LiveClock />
          </div>

          {/* ── Stats Grid ────────────────────────────────────── */}
          <div className="td-stats-grid">
            <div className="td-stat-card hover:translate-y-[-2px] transition-all duration-300 shadow-sm hover:shadow-md">
              <div className="td-stat-icon td-stat-icon-blue">
                <BookOpen size={20} />
              </div>
              <div className="td-stat-label">Active Courses</div>
              <div className="td-stat-value">{totalCourses}</div>
              <div className="td-stat-trend td-stat-trend-up">
                <TrendingUp size={12} strokeWidth={2.5} />
                12% from last month
              </div>
            </div>
            <div className="td-stat-card hover:translate-y-[-2px] transition-all duration-300 shadow-sm hover:shadow-md">
              <div className="td-stat-icon td-stat-icon-green">
                <Users size={20} />
              </div>
              <div className="td-stat-label">Total Students</div>
              <div className="td-stat-value">{totalStudents}</div>
              <div className="td-stat-trend td-stat-trend-neutral">
                <CircleDashed size={12} strokeWidth={2.5} />
                Stable enrollment
              </div>
            </div>
            <div className="td-stat-card hover:translate-y-[-2px] transition-all duration-300 shadow-sm hover:shadow-md">
              <div className="td-stat-icon td-stat-icon-purple">
                <CheckCircle2 size={20} />
              </div>
              <div className="td-stat-label">Sessions Created</div>
              <div className="td-stat-value">{totalSessions}</div>
              <div className="td-stat-trend td-stat-trend-up">
                <TrendingUp size={12} strokeWidth={2.5} />
                Increased activity
              </div>
            </div>
            <div className="td-stat-card hover:translate-y-[-2px] transition-all duration-300 shadow-sm hover:shadow-md border-2 border-blue-50">
              <div className="td-stat-icon td-stat-icon-orange">
                <Radio size={20} />
              </div>
              <div className="td-stat-label">Active Sessions</div>
              <div className="td-stat-value">{activeSessionsCount}</div>
              <div className="td-stat-trend td-stat-trend-live">
                <span className="td-live-dot-sm"></span>
                Currently Live
              </div>
            </div>

          </div>

          {/* ── Active Sessions + Recently Closed ─────────────── */}
          <div className="td-sessions-grid">
            {/* Active Sessions */}
            <div className="td-sessions-panel td-sessions-active">
              <div className="td-sessions-header">
                <h3>Active Attendance Sessions</h3>
                <button className="td-link-btn group hover:text-blue-600 transition-colors" onClick={() => navigate('/teacher/attendance')}>
                  View All <ArrowRight size={14} className="inline group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
              {data.activeSessions?.length > 0 ? data.activeSessions.map((s: any, i: number) => (
                <div key={i} className="td-active-session-card hover:border-blue-200 transition-all shadow-sm hover:shadow-md">
                  <div className="td-as-top">
                    <div className="td-as-info">
                      <h4>{s.courseName}</h4>
                      <p>
                        <MapPin size={12} className="inline" />
                        {s.session?.sessionTitle || 'Regular Session'}
                      </p>
                    </div>
                    <div className="td-as-actions">
                      <span className="td-live-badge">LIVE NOW</span>
                      <button className="btn btn-secondary btn-sm hover:bg-gray-200 transition-colors" onClick={() => setShowQrModal({ show: true, sessionId: s.session.id, code: s.session.attendanceCode })} style={{ width: 'auto' }}>
                        <QrCode size={12} className="inline mr-1" />
                        QR Code
                      </button>
                      <button className="btn btn-danger btn-sm td-close-btn hover:bg-red-600 transition-colors" onClick={() => closeSession(s.session.id)}>
                        <X size={12} strokeWidth={2.5} />
                        Close Session
                      </button>
                      <button className="btn btn-secondary btn-sm hover:bg-gray-200 transition-colors" onClick={() => navigate('/teacher/attendance')} style={{ width: 'auto' }}>
                        <ExternalLink size={12} className="inline" />
                        Monitor Real-time
                      </button>
                    </div>
                  </div>
                  <div className="td-as-bottom">
                    <div className="td-as-code-section">
                      <span className="td-code-label">JOIN CODE</span>
                      <div className="td-code-display active:scale-95 transition-transform"
                        onClick={() => {
                          navigator.clipboard.writeText(s.session?.attendanceCode || '');
                          showAlert('Copied', 'Join code copied to clipboard!', 'success');
                        }}
                        title="Click to copy"
                      >
                        {s.session?.attendanceCode}
                      </div>
                    </div>
                    <div className="td-as-timer-section">
                      <span className="td-code-label">TIME LEFT</span>
                      <SessionTimer endTime={s.session.endTime} onExpire={loadDashboard} />
                    </div>
                  </div>
                  <div className="td-as-footer">
                    <div className="td-as-avatars">
                      {Array.from({ length: Math.min(s.submissions || 0, 3) }).map((_, ai) => (
                        <div key={ai} className="td-mini-avatar" style={{ background: COURSE_GRADIENTS[ai % COURSE_GRADIENTS.length], marginLeft: ai > 0 ? '-8px' : '0' }}>
                          {String.fromCharCode(65 + ai)}{String.fromCharCode(65 + ai + 1)}
                        </div>
                      ))}
                      {(s.submissions || 0) > 3 && (
                        <div className="td-mini-avatar td-mini-avatar-more" style={{ marginLeft: '-8px' }}>+{s.submissions - 3}</div>
                      )}
                    </div>
                    <span className="td-as-joined"><UserCheck size={12} className="inline mr-1" /> {s.submissions || 0} students joined so far</span>
                  </div>
                </div>
              )) : (
                <div className="td-empty-sessions">
                  <Calendar size={32} strokeWidth={1.5} color="var(--text-muted)" />
                  <p>No active sessions</p>
                  <span>Click "+ New Session" to start attendance.</span>
                </div>
              )}
            </div>

            {/* Recently Closed */}
            <div className="td-sessions-panel td-sessions-recent">
              <div className="td-sessions-header">
                <h3>Recently Closed</h3>
                <button className="td-more-btn transition-colors theme-hover-secondary" title="More">
                  <MoreHorizontal size={18} />
                </button>
              </div>
              {data.recentSessions?.length > 0 ? data.recentSessions.slice(0, 4).map((s: any, i: number) => (
                <div
                  key={i}
                  className="td-recent-item group theme-hover-secondary transition-colors"
                  onClick={() => openReopenModal(s.session.id, s.session.sessionTitle || 'Regular Session')}
                  title="Click to reopen"
                >
                  <div className="td-recent-icon group-hover:scale-110 transition-transform">
                    <Clock size={18} />
                  </div>
                  <div className="td-recent-info">
                    <h4>{s.courseName?.length > 18 ? s.courseName.substring(0, 18) + '...' : s.courseName}</h4>
                    <span>Closed {timeAgo(s.session.startTime)} · {s.submissions} Present</span>
                  </div>
                </div>
              )) : (
                <div className="td-empty-sessions" style={{ padding: '1.5rem' }}>
                  <p>No recent sessions</p>
                </div>
              )}
              {data.recentSessions?.length > 0 && (
                <button className="td-full-history-btn theme-hover-secondary transition-colors" onClick={() => navigate('/teacher/attendance')}>
                  Full Session History
                </button>
              )}
            </div>
          </div>

          {/* ── My Courses ────────────────────────────────────── */}
          <div className="td-courses-section">
            <div className="td-courses-header">
              <h3>My Courses</h3>
              <div className="td-courses-nav">
                <button className="td-nav-arrow theme-hover-secondary transition-colors" onClick={() => scrollCourses(-1)} aria-label="Scroll left">
                  <ArrowLeft size={16} strokeWidth={2.5} />
                </button>
                <button className="td-nav-arrow theme-hover-secondary transition-colors" onClick={() => scrollCourses(1)} aria-label="Scroll right">
                  <ArrowRight size={16} strokeWidth={2.5} />
                </button>
              </div>
            </div>
            <div className="td-courses-scroll" ref={coursesScrollRef}>
              {filteredCourses.map((c: any, idx: number) => {
                const courseData = (data?.courses || []).find((cc: any) => cc.id === c.id);
                return (
                  <div
                    key={c.id}
                    className="td-course-card premium-card animate-slide-up"
                    style={{ animationDelay: `${idx * 0.1}s` }}
                    onClick={() => navigate(`/teacher/materials?courseId=${c.id}`)}
                  >
                    <div
                      className="td-course-cover"
                      style={{
                        ...getCourseBg(c.coverColor, idx),
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                    >
                      <div style={{
                        position: 'absolute',
                        top: '-10px',
                        right: '-10px',
                        width: '80px',
                        height: '80px',
                        borderRadius: '50%',
                        background: 'rgba(255, 255, 255, 0.1)',
                        filter: 'blur(20px)'
                      }} />


                    </div>
                    <div className="td-course-body">
                      <h4>{c.courseName}</h4>
                      <p className="td-course-desc">
                        {c.courseCode} · {c.section || 'General'}
                      </p>
                      <div className="td-course-meta">
                        <span style={{ fontWeight: 700, fontSize: '0.75rem' }}>
                          <Calendar size={12} className="inline mr-1 text-blue-500" />
                          {c.schedule?.split(' ')[0] || 'No schedule'}
                        </span>
                        <span style={{ fontWeight: 700, fontSize: '0.75rem' }}>
                          <Users size={12} className="inline mr-1 text-purple-500" />
                          {courseData?.enrollmentCount || '0'} Students
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
              {filteredCourses.length === 0 && (
                <div className="td-no-courses">
                  <p>No courses found. {searchQuery ? 'Try a different search.' : 'Create your first course!'}</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── Start Attendance Modal ───────────────────────────── */}
      {showAttendance && (
        <div className="modal-overlay" onClick={() => setShowAttendance(false)}>
          <div className="theme-card" style={{ width: '100%', maxWidth: '500px', borderRadius: '24px', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ padding: '1.5rem', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-glass)' }}>
              <h3 className="modal-title" style={{ margin: 0, fontWeight: 900, color: 'var(--text-primary)' }}>Start Attendance Session</h3>
              <button className="theme-btn-secondary" style={{ border: 'none', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowAttendance(false)}><X size={20} /></button>
            </div>
            <form onSubmit={startSession} style={{ padding: '1.5rem' }}>
              <div className="form-group">
                <label className="form-label" style={{ color: 'var(--text-muted)' }}>Course</label>
                <select className="form-input" value={attendForm.courseId} onChange={e => setAttendForm({ ...attendForm, courseId: e.target.value })} required>
                  <option value="">Select course...</option>
                  {data?.courses?.map((c: any) => <option key={c.id} value={c.id}>{c.courseCode} {c.section ? `- ${c.section}` : ''}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" style={{ color: 'var(--text-muted)' }}>Session Title (optional)</label>
                <input className="form-input" value={attendForm.sessionTitle} onChange={e => setAttendForm({ ...attendForm, sessionTitle: e.target.value })} placeholder="e.g. Week 5" />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ color: 'var(--text-muted)' }}>Duration (minutes)</label>
                <input className="form-input" type="number" min="1" max="120" value={attendForm.duration} onChange={e => setAttendForm({ ...attendForm, duration: e.target.value })} />
              </div>
              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem', marginBottom: attendForm.allowLate ? '0.5rem' : '1rem' }}>
                <input type="checkbox" id="allowLate" checked={attendForm.allowLate} onChange={e => setAttendForm({ ...attendForm, allowLate: e.target.checked })} style={{ width: '1rem', height: '1rem', cursor: 'pointer' }} />
                <label htmlFor="allowLate" className="form-label" style={{ marginBottom: 0, cursor: 'pointer', color: 'var(--text-primary)' }}>Enable Late System</label>
              </div>
              {attendForm.allowLate && (
                <div className="form-group">
                  <label className="form-label" style={{ color: 'var(--text-muted)' }}>Mark as Late after (minutes)</label>
                  <input className="form-input" type="number" min="1" value={attendForm.lateMinutes} onChange={e => setAttendForm({ ...attendForm, lateMinutes: e.target.value })} />
                </div>
              )}
              <div className="modal-actions" style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAttendance(false)} style={{ width: 'auto' }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ width: 'auto' }}>Start Session</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Create Course Modal ──────────────────────────────── */}
      {showCreateCourse && (
        <div className="modal-overlay" onClick={() => setShowCreateCourse(false)}>
          <div className="theme-card" style={{ width: '100%', maxWidth: '600px', borderRadius: '24px', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ padding: '1.5rem', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-glass)' }}>
              <h3 className="modal-title" style={{ margin: 0, fontWeight: 900, color: 'var(--text-primary)' }}>Create New Course</h3>
              <button className="theme-btn-secondary" style={{ border: 'none', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowCreateCourse(false)}><X size={20} /></button>
            </div>
            <form onSubmit={createCourse} style={{ padding: '1.5rem', maxHeight: '80vh', overflowY: 'auto' }} className="modal-scroll-area">
              <div className="form-group">
                <label className="form-label" style={{ color: 'var(--text-muted)' }}>Course Name</label>
                <input className="form-input" value={courseForm.courseName} onChange={e => setCourseForm({ ...courseForm, courseName: e.target.value })} required placeholder="Introduction to Programming" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label" style={{ color: 'var(--text-muted)' }}>Course Code</label>
                  <input className="form-input" value={courseForm.courseCode} onChange={e => setCourseForm({ ...courseForm, courseCode: e.target.value })} required placeholder="CS101" />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ color: 'var(--text-muted)' }}>Section</label>
                  <input className="form-input" value={courseForm.section} onChange={e => setCourseForm({ ...courseForm, section: e.target.value })} placeholder="Section A" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label" style={{ color: 'var(--text-muted)' }}>Schedule</label>
                <div className="day-picker" style={{ marginBottom: '0.75rem' }}>
                  {DAYS.map(d => (
                    <div key={d.key} className={`day-chip ${selectedDays.includes(d.key) ? 'selected' : ''}`} onClick={() => toggleDay(d.key)}>{d.label}</div>
                  ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Start Time</label>
                    <input className="form-input" type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>End Time</label>
                    <input className="form-input" type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
                  </div>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label" style={{ color: 'var(--text-muted)' }}>Room</label>
                <input className="form-input" value={courseForm.room} onChange={e => setCourseForm({ ...courseForm, room: e.target.value })} placeholder="Room 301" />
              </div>

              <div className="form-group">
                <label className="form-label">Course Cover</label>
                <div className="cover-preview" style={getCourseBg(courseForm.coverColor || '#3b82f6', 0)}>
                  <div style={{ zIndex: 1, textAlign: 'center' }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#fff' }}>{courseForm.courseName || 'Course Name'}</div>
                    <div style={{ fontSize: '0.7rem', opacity: 0.8, color: '#fff' }}>{courseForm.courseCode || 'CODE101'}</div>
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
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary transition-colors" onClick={() => setShowCreateCourse(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary shadow-sm hover:shadow-md transition-all active:scale-95" style={{ width: 'auto' }}>Create Course</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Reopen Session Modal ─────────────────────────────── */}
      {showReopenModal && (
        <div className="modal-overlay" onClick={() => setShowReopenModal(false)}>
          <div className="theme-card" style={{ width: '100%', maxWidth: '450px', borderRadius: '24px', padding: '2rem' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ marginBottom: '1.5rem', border: 'none', padding: 0, background: 'transparent' }}>
              <h3 className="modal-title" style={{ margin: 0, fontWeight: 900, color: 'var(--text-primary)' }}>Reopen Session</h3>
              <button className="theme-btn-secondary" style={{ border: 'none', width: 32, height: 32, borderRadius: '50%', position: 'absolute', top: '1.5rem', right: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowReopenModal(false)}><X size={20} /></button>
            </div>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
              Reopening: <strong style={{ color: 'var(--accent-blue)' }}>{targetReopenSession?.title}</strong>.
              <br />This will clear "absent" records, allowing late students to submit.
            </p>
            <div className="form-group" style={{ marginBottom: '2rem' }}>
              <label className="form-label" style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Extended Duration (minutes)</label>
              <input type="number" className="form-input" value={reopenDuration} onChange={e => setReopenDuration(e.target.value)} min="1" max="120" />
            </div>
            <div className="modal-actions" style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn btn-secondary" onClick={() => setShowReopenModal(false)} style={{ flex: 1 }}>Cancel</button>
              <button className="btn btn-primary" onClick={confirmReopen} disabled={reopeningId !== null} style={{ flex: 1 }}>
                {reopeningId !== null ? 'Reopening...' : 'Confirm Reopen'}
              </button>
            </div>
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
              <div style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '2rem', display: 'inline-block', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', border: '1px solid var(--border-glass)' }}>
                <QRCodeSVG
                  value={`${window.location.origin}/student/dashboard?attendSessionId=${showQrModal.sessionId}&code=${showQrModal.code}`}
                  size={240}
                  level="H"
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

    </DashboardLayout>
  );
};

export default TeacherDashboard;
