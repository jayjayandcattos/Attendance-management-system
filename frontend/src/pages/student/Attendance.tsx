import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { studentApi } from '../../api';
import { useAuth } from '../../auth/AuthContext';
import { showAlert } from '../../utils/feedback';
import { CheckCircle2, AlertCircle, Target, BookOpen, Scan, RefreshCcw, X } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

const StudentAttendance: React.FC = () => {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [codes, setCodes] = useState<Record<number, string>>({});
    const [submitting, setSubmitting] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
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

    const submitAttendance = async (sessionId: number, providedCode?: string) => {
        const code = providedCode !== undefined ? providedCode : codes[sessionId];
        if (!code?.trim()) { showAlert('Error', 'Enter attendance code', 'error'); return; }
        if (submitting) return;
        setSubmitting(sessionId);
        try {
            const res = await studentApi.submitAttendance({ sessionId, attendanceCode: code });
            showAlert('Success', res.data.message || 'Attendance submitted!', 'success');
            setCodes(prev => ({ ...prev, [sessionId]: '' }));
            load();
        } catch (err: any) {
            showAlert('Error', err.response?.data?.message || 'Failed to submit', 'error');
        } finally { setSubmitting(null); }
    };

    useEffect(() => {
        if (showScanner) {
            const html5QrCode = new Html5Qrcode("reader");
            scannerRef.current = html5QrCode;

            const startScanner = async () => {
                try {
                    await html5QrCode.start(
                        { facingMode: facingMode },
                        { fps: 10, qrbox: { width: 250, height: 250 } },
                        (text) => {
                            if (scannerRef.current) {
                                scannerRef.current.stop().then(() => {
                                    scannerRef.current?.clear();
                                }).catch(console.error);
                            }
                            setShowScanner(false);
                            try {
                                const url = new URL(text);
                                const qId = url.searchParams.get('attendSessionId');
                                const qCode = url.searchParams.get('code');
                                if (qId && qCode) {
                                    setCodes(prev => ({ ...prev, [Number(qId)]: qCode.toUpperCase() }));
                                    submitAttendance(Number(qId), qCode.toUpperCase());
                                } else {
                                    showAlert('Error', 'Invalid QR Code format', 'error');
                                }
                            } catch (e) {
                                showAlert('Error', 'Invalid QR Code URL', 'error');
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


    const activeSessions = data?.activeSessions || [];
    const courses = data?.courses || [];

    let totalPresent = 0, totalAll = 0;
    courses.forEach((c: any) => {
        totalAll += c.totalSessions || 0;
        totalPresent += c.presentCount || 0;
    });
    const totalAbsent = totalAll - totalPresent;
    const overallRate = totalAll > 0 ? Math.round((totalPresent / totalAll) * 1000) / 10 : 100;

    const filteredCourses = courses.filter((c: any) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
            c.course?.courseName?.toLowerCase().includes(q) ||
            c.course?.courseCode?.toLowerCase().includes(q)
        );
    });

    return (
        <DashboardLayout 
            role="student" 
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
        >

            {loading ? <div className="loading-screen"><div className="spinner"></div></div> : (
                <>
                    {/* ── Stats Row ─────────────────────────────────── */}
                    <div className="ta-stats-row mt-4">
                        <div className="ta-stat-card hover:translate-y-[-2px] transition-transform">
                            <div className="ta-stat-top">
                                <span className="ta-stat-label">Present</span>
                                <div className="ta-stat-icon-box ta-stat-icon-green">
                                    <CheckCircle2 size={18} strokeWidth={2.5} />
                                </div>
                            </div>
                            <div className="ta-stat-value">{totalPresent}</div>
                            <span className="ta-stat-badge ta-stat-green">CLASSES ATTENDED</span>
                        </div>
                        <div className="ta-stat-card hover:translate-y-[-2px] transition-transform">
                            <div className="ta-stat-top">
                                <span className="ta-stat-label">Absent / Late</span>
                                <div className="ta-stat-icon-box ta-stat-icon-red">
                                    <AlertCircle size={18} strokeWidth={2.5} />
                                </div>
                            </div>
                            <div className="ta-stat-value">{totalAbsent}</div>
                            <span className="ta-stat-badge ta-stat-neutral" style={{ color: 'var(--accent-red)', background: '#fee2e2' }}>RECORDED ABSENCES</span>
                        </div>
                        <div className="ta-stat-card hover:translate-y-[-2px] transition-transform">
                            <div className="ta-stat-top">
                                <span className="ta-stat-label">Overall Rate</span>
                                <div className="ta-stat-icon-box ta-stat-icon-blue">
                                    <Target size={18} strokeWidth={2.5} />
                                </div>
                            </div>
                            <div className="ta-stat-value">{overallRate}%</div>
                            <span className="ta-stat-badge ta-stat-blue">CUMULATIVE AVERAGE</span>
                        </div>
                    </div>

                    {/* ── Active Sessions ───────────────────────────── */}
                    {activeSessions.length > 0 && (
                        <div className="ta-active-section mt-8">
                            <div className="ta-active-header">
                                <h2>Active Sessions</h2>
                                <span className="ta-live-indicator"><span className="td-live-dot-sm bg-orange-500 mr-2"></span>LIVE INDICATOR</span>
                            </div>
                            {activeSessions.map((s: any) => (
                                <div key={s.session.id} className="ta-active-card hover:shadow-md transition-shadow">
                                    <div className="ta-active-info">
                                        <span className="ta-active-ongoing bg-orange-100 text-orange-600">ONGOING NOW</span>
                                        <h3 className="text-xl font-bold">{s.courseName}</h3>
                                        <p className="text-muted">{s.session.sessionTitle || 'Regular Session'} • {s.session.durationMinutes} mins</p>
                                    </div>
                                    <div className="ta-access-code w-full max-w-sm">
                                        {s.alreadySubmitted ? (
                                            <div className="flex flex-col items-center justify-center p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 w-full h-full">
                                                <CheckCircle2 size={24} className="mb-1" />
                                                <span className="font-bold tracking-widest uppercase">Verified</span>
                                            </div>
                                        ) : (
                                            <>
                                                <span className="ta-code-label">ENTER JOIN CODE</span>
                                                <div className="flex gap-2 items-stretch" style={{ height: '48px' }}>
                                                    <input 
                                                        className="form-input text-center text-xl font-mono tracking-widest font-bold placeholder:font-sans placeholder:tracking-normal w-full" 
                                                        placeholder="EX: 123456" 
                                                        value={codes[s.session.id] || ''}
                                                        onChange={e => setCodes({ ...codes, [s.session.id]: e.target.value.toUpperCase() })}
                                                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submitAttendance(s.session.id); } }} 
                                                        maxLength={6}
                                                    />
                                                </div>
                                            </>
                                        )}
                                    </div>
                                    <div className="ta-active-actions flex gap-2 items-stretch">
                                        {!s.alreadySubmitted && (
                                            <>
                                                <button
                                                    type="button"
                                                    className="btn btn-secondary flex items-center justify-center"
                                                    onClick={() => setShowScanner(true)}
                                                    style={{ width: '48px', padding: 0, minWidth: '48px', height: '48px' }}
                                                    title="Scan QR Code"
                                                >
                                                    <Scan size={20} />
                                                </button>
                                                <button 
                                                    className="btn btn-primary px-8 font-bold text-lg" 
                                                    disabled={submitting === s.session.id || (codes[s.session.id] || '').length < 3}
                                                    onClick={() => submitAttendance(s.session.id)}
                                                    style={{ height: '48px' }}
                                                >
                                                    {submitting === s.session.id ? 'Verifying…' : 'Submit Code'}
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* ── All Sessions Table (Course Breakdown) ─────── */}
                    <div className="ta-table-section mt-8">
                        <div className="ta-table-header">
                            <h2>Course Breakdown</h2>
                        </div>
                        <div className="data-table-wrapper">
                            <table className="data-table relative z-10 w-full">
                                <thead>
                                    <tr>
                                        <th>COURSE</th>
                                        <th className="text-center">TOTAL SESSIONS</th>
                                        <th className="text-center">PRESENT</th>
                                        <th>ATTENDANCE RATE</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredCourses.map((c: any) => (
                                        <tr key={c.course.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td>
                                                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{c.course.courseName}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{c.course.courseCode}</div>
                                            </td>
                                            <td className="text-center">
                                                <span className="inline-flex items-center justify-center min-w-[28px] h-7 bg-gray-100 rounded-md text-sm font-bold text-gray-600">
                                                    {c.totalSessions}
                                                </span>
                                            </td>
                                            <td className="text-center">
                                                <span className="inline-flex items-center justify-center min-w-[28px] h-7 bg-green-50 border border-green-200 text-green-600 rounded-md text-sm font-bold">
                                                    {c.presentCount}
                                                </span>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                    <div className="progress-bar-bg flex-1 max-w-[200px] h-2 bg-gray-100 rounded-full overflow-hidden">
                                                        <div 
                                                            className="progress-bar-fill h-full rounded-full transition-all duration-1000" 
                                                            style={{ 
                                                                width: `${c.attendanceRate}%`, 
                                                                background: c.attendanceRate >= 80 ? 'var(--accent-green)' : c.attendanceRate >= 60 ? 'var(--accent-yellow)' : 'var(--accent-red)' 
                                                            }}
                                                        />
                                                    </div>
                                                    <span style={{ fontWeight: 800, fontSize: '0.85rem', width: '45px' }} className={c.attendanceRate >= 80 ? 'text-green-600' : c.attendanceRate >= 60 ? 'text-yellow-600' : 'text-red-500'}>
                                                        {c.attendanceRate}%
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredCourses.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="py-12 text-center text-gray-500">
                                                <BookOpen size={32} className="mx-auto mb-3 text-gray-300" />
                                                <p className="font-medium text-gray-600">No courses found matching your search.</p>
                                                <p className="text-sm mt-1">Try adjusting your filters or enroll in a new class.</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
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

export default StudentAttendance;
