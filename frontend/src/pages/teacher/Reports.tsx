import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { teacherApi } from '../../api';
import { useAuth } from '../../auth/AuthContext';
import Avatar from '../../components/Avatar';

const TeacherReports: React.FC = () => {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState<number | null>(null);
  const [report, setReport] = useState<any>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [studentDetail, setStudentDetail] = useState<any>(null);
  const [studentRecords, setStudentRecords] = useState<any[]>([]);
  const [loadingStudent, setLoadingStudent] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showCourseDropdown, setShowCourseDropdown] = useState(false);
  const itemsPerPage = 10;

  useEffect(() => {
    teacherApi.getCourses().then(res => {
      const c = res.data.data || [];
      setCourses(c);
      if (c.length > 0) setSelectedCourse(c[0].id);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (selectedCourse) {
      setLoadingReport(true);
      teacherApi.getReport(selectedCourse).then(res => {
        setReport(res.data.data);
        setLoadingReport(false);
        setCurrentPage(1);
      }).catch(() => setLoadingReport(false));
    }
  }, [selectedCourse]);

  const viewStudentRecords = async (student: any) => {
    if (!selectedCourse) return;
    setLoadingStudent(true);
    setStudentDetail(student);
    try {
      const res = await teacherApi.getStudentReport(selectedCourse, student.id);
      setStudentRecords(res.data.data?.records || []);
    } catch { setStudentRecords([]); }
    setLoadingStudent(false);
  };

  const exportCsv = () => {
    if (!report) return;
    const headers = ['Name', 'Student ID', 'Email', 'Present', 'Late', 'Absent', 'Rate (%)'];
    const rows = report.students.map((s: any) => [s.name, s.studentId || '', s.email, s.present, s.late, s.absent, s.rate]);
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_report_${report.course?.courseCode || 'course'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getRateColor = (rate: number) => {
    if (rate >= 80) return '#16a34a';
    if (rate >= 60) return '#f59e0b';
    return '#ef4444';
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = { present: 'badge-present', late: 'badge-late', absent: 'badge-absent', pending: 'badge-pending' };
    return map[status] || 'badge-closed';
  };



  const selectedCourseObj = courses.find(c => c.id === selectedCourse);
  const avgRate = report?.students?.length > 0 ? Math.round(report.students.reduce((a: number, s: any) => a + s.rate, 0) / report.students.length * 10) / 10 : 0;

  // Filtered + paginated students
  const filteredStudents = (report?.students || []).filter((s: any) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return s.name?.toLowerCase().includes(q) || s.studentId?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q);
  });
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const paginatedStudents = filteredStudents.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const reportsActions = (
    <div className="tr-topbar-actions-container" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
      <div className="tr-course-selector" style={{ margin: 0, padding: 0 }}>
        <div className="tr-dropdown" onClick={() => setShowCourseDropdown(!showCourseDropdown)} style={{ margin: 0, padding: '6px 12px', height: 'auto', borderRadius: '10px' }}>
          <span className="tr-dropdown-dot" style={{ background: '#3b82f6' }}></span>
          <span className="tr-dropdown-text" style={{ fontSize: '0.85rem' }}>
            <span className="tr-course-full">{selectedCourseObj ? `${selectedCourseObj.courseCode} • ${selectedCourseObj.section || 'Sec A'}` : 'Select course'}</span>
            <span className="tr-course-short">{selectedCourseObj ? selectedCourseObj.courseCode : 'Select'}</span>
          </span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
          {showCourseDropdown && (
            <div className="tr-dropdown-menu" onClick={e => e.stopPropagation()} style={{ right: 0, left: 'auto', marginTop: '10px' }}>
              {courses.map(c => (
                <div key={c.id} className={`tr-dropdown-item ${c.id === selectedCourse ? 'active' : ''}`} onClick={() => { setSelectedCourse(c.id); setShowCourseDropdown(false); }}>
                  <span className="tr-dropdown-dot" style={{ background: '#3b82f6' }}></span>
                  {c.courseName} {c.section ? `• ${c.section}` : ''}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {report && <button className="btn btn-secondary td-topbar-btn" onClick={exportCsv} style={{ height: '36px', padding: '0 12px', fontSize: '0.85rem' }}>Export CSV</button>}
    </div>
  );

  return (
    <DashboardLayout
      role="teacher"
      searchQuery={searchQuery}
      onSearchChange={(q) => { setSearchQuery(q); setCurrentPage(1); }}
      actions={reportsActions}
    >
      {loading ? <div className="loading-screen"><div className="spinner"></div></div> : (
        <>
          {/* ── Title ───────────────────── */}
          <div className="tr-header-section">
            <div className="tr-header-left">
              <h1 className="tr-title">Attendance Reports</h1>
              <p className="tr-subtitle">Monitor student engagement and track session consistency with comprehensive data visualization.</p>
            </div>
          </div>

          {loadingReport ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}><div className="spinner" style={{ margin: '0 auto' }}></div></div>
          ) : report && (
            <>
              {/* ── Stats Cards ──────────────────────────── */}
              <div className="tr-stats-row">
                <div className="tr-stat-card">
                  <div className="tr-stat-header">
                    <div className="tr-stat-icon tr-stat-icon-blue">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                    </div>
                    <span className="tr-stat-cat">CAPACITY</span>
                  </div>
                  <div className="tr-stat-value">{report.totalStudents}</div>
                  <div className="tr-stat-sub">Students</div>
                  <span className="tr-stat-desc">Enrolled</span>
                </div>
                <div className="tr-stat-card">
                  <div className="tr-stat-header">
                    <div className="tr-stat-icon tr-stat-icon-orange">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
                    </div>
                    <span className="tr-stat-cat">CONSISTENCY</span>
                  </div>
                  <div className="tr-stat-value">{report.totalSessions}</div>
                  <div className="tr-stat-sub">Sessions</div>
                  <span className="tr-stat-desc">Completed</span>
                </div>
                <div className="tr-stat-card">
                  <div className="tr-stat-header">
                    <div className="tr-stat-icon tr-stat-icon-green">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>
                    </div>
                    <span className="tr-stat-cat">PERFORMANCE</span>
                  </div>
                  <div className="tr-stat-value">
                    {avgRate}%
                  </div>
                  <div className="tr-stat-sub">Attendance</div>
                  <span className="tr-stat-desc">Average Rate</span>
                </div>
              </div>

              {/* ── Report Table ─────────────────────────── */}
              <div className="tr-table-section">
                <div className="tr-table-header">
                  <div>
                    <h2>Student Attendance Report</h2>
                    <span className="tr-table-sub">FULL CLASS ROSTER • SEMESTER 2024</span>
                  </div>
                  <div className="tr-table-actions">
                    <button className="ta-action-btn" title="Filter">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" /><line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" /><line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" /></svg>
                    </button>
                    <button className="ta-action-btn" title="More">⋮</button>
                  </div>
                </div>
                <div className="tr-table-scroll">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>STUDENT NAME</th>
                        <th>STUDENT ID</th>
                        <th>PRESENT</th>
                        <th>LATE</th>
                        <th>ABSENT</th>
                        <th>RATE</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedStudents.map((s: any) => (
                        <tr key={s.id} className="clickable-row" onClick={() => viewStudentRecords(s)}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <Avatar firstName={s.name?.split(' ')[0]} lastName={s.name?.split(' ')[1]} size={36} variant="blue" />
                              <div>
                                <div style={{ fontWeight: 600 }}>{s.name}</div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{s.email}</div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className="tr-sid-monospace">#{s.studentId || 'N/A'}</span>
                          </td>
                          <td><span className="tr-count-badge tr-count-green">{s.present}</span></td>
                          <td><span className="tr-count-badge tr-count-yellow">{s.late}</span></td>
                          <td><span className="tr-count-badge tr-count-red">{s.absent}</span></td>
                          <td>
                            <div className="tr-rate-cell">
                              <span style={{ fontWeight: 700, color: getRateColor(s.rate), fontSize: '0.9rem' }}>{s.rate}%</span>
                              <div className="tr-progress-mini"><div style={{ width: `${s.rate}%`, background: getRateColor(s.rate) }}></div></div>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredStudents.length === 0 && (
                        <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No students found</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {/* ── Pagination ────────────────────────── */}
                <div className="ta-pagination">
                  <span className="ta-page-info" style={{ color: 'var(--accent-blue)' }}>
                    Showing {Math.min((currentPage - 1) * itemsPerPage + 1, filteredStudents.length)} to {Math.min(currentPage * itemsPerPage, filteredStudents.length)} of {filteredStudents.length} Students
                  </span>
                  <div className="ta-page-btns">
                    <button className="ta-page-btn" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>Previous</button>
                    <button className="ta-page-btn ta-page-next" disabled={currentPage === totalPages || totalPages === 0} onClick={() => setCurrentPage(p => p + 1)}>Next</button>
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* ── Student Detail Modal ──────────────────────────── */}
      {studentDetail && (
        <div className="modal-overlay" onClick={() => setStudentDetail(null)}>
          <div className="modal" style={{ maxWidth: '650px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">{studentDetail.name}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: '0.15rem' }}>{studentDetail.studentId || ''} · {studentDetail.email}</p>
              </div>
              <button className="modal-close" onClick={() => setStudentDetail(null)}>×</button>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
              <span className="badge badge-present" style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}>Present: {studentDetail.present}</span>
              <span className="badge badge-late" style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}>Late: {studentDetail.late}</span>
              <span className="badge badge-absent" style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}>Absent: {studentDetail.absent}</span>
              <span className="badge badge-active" style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}>Rate: {studentDetail.rate}%</span>
            </div>
            {loadingStudent ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}><div className="spinner" style={{ margin: '0 auto' }}></div></div>
            ) : (
              <div className="data-table-wrapper">
                <table className="data-table">
                  <thead><tr><th>Session</th><th>Date</th><th>Status</th><th>Submitted At</th></tr></thead>
                  <tbody>
                    {studentRecords.map((r: any, i: number) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 500 }}>{r.sessionTitle || `Session ${i + 1}`}</td>
                        <td style={{ color: 'var(--text-secondary)' }}>{new Date(r.date).toLocaleDateString()}</td>
                        <td><span className={`badge ${getStatusBadge(r.status)}`}>{r.status}</span></td>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{r.submittedAt ? new Date(r.submittedAt).toLocaleString() : '—'}</td>
                      </tr>
                    ))}
                    {studentRecords.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No attendance records</td></tr>}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default TeacherReports;
