import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  FileText, 
  Link as LinkIcon, 
  Megaphone, 
  ClipboardList, 
  Info, 
  Calendar, 
  MapPin, 
  Search, 
  Plus, 
  Trash2, 
  X, 
  ChevronRight, 
  Share, 
  Download, 
  Send,
  MoreHorizontal,
  Clock,
  ExternalLink,
  MessageSquare,
  Users,
  GraduationCap,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Edit2,
  Archive
} from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import Avatar from '../../components/Avatar';
import { teacherApi, fileApi } from '../../api';
import { useAuth } from '../../auth/AuthContext';
import { showAlert, showConfirm, showApiError } from '../../utils/feedback';

const getYouTubeId = (url: string): string | null => {
    const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/))([a-zA-Z0-9_-]{11})/);
    return m ? m[1] : null;
};

const downloadFile = async (type: 'material' | 'submission', id: number, fileName: string) => {
    try {
        const res = type === 'material'
            ? await fileApi.downloadMaterial(id)
            : await fileApi.downloadSubmission(id);
        const blob = new Blob([res.data]);
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = fileName || 'download';
        a.click();
        URL.revokeObjectURL(a.href);
    } catch { showAlert('Error', 'Could not download file', 'error'); }
};

const typeConfig: Record<string, { color: string; bg: string; label: string; icon: any }> = {
    file:         { color: '#4285F4', bg: '#eff6ff', label: 'Material', icon: FileText },
    link:         { color: '#8b5cf6', bg: '#f5f3ff', label: 'Link', icon: LinkIcon },
    announcement: { color: '#f59e0b', bg: '#fffbeb', label: 'Announcement', icon: Megaphone },
    assignment:   { color: '#EA4335', bg: '#fef2f2', label: 'Assignment', icon: ClipboardList },
};

const TypeIcon = ({ type, size = 20 }: { type: string; size?: number }) => {
    const Icon = typeConfig[type]?.icon || Info;
    return <Icon size={size} />;
};

const VideoPreview = ({ url }: { url: string }) => {
    const ytId = getYouTubeId(url);
    if (!ytId) return null;
    return (
        <div className="relative pb-[56.25%] h-0 rounded-xl overflow-hidden mb-4 bg-black shadow-lg animate-in fade-in zoom-in-95 duration-500">
            <iframe
                src={`https://www.youtube.com/embed/${ytId}`}
                className="absolute top-0 left-0 w-full h-full border-none"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen title="Video preview"
            />
        </div>
    );
};

const FileCard = ({ fileName, fileSize, onDownload }: { fileName: string; fileSize?: number; onDownload: () => void }) => (
    <div onClick={e => { e.stopPropagation(); onDownload(); }} className="flex items-center gap-3 p-3 bg-gray-50 hover:bg-blue-50/50 rounded-xl border border-gray-100 hover:border-blue-100 cursor-pointer transition-all mb-2 group">
        <div className="w-10 h-10 rounded-lg bg-blue-100/50 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
            <FileText size={20} className="text-blue-600" />
        </div>
        <div className="flex-1 min-width-0">
            <div className="font-semibold text-sm truncate">{fileName}</div>
            <div className="text-[10px] text-muted uppercase tracking-wider font-bold">
                {fileSize ? (fileSize > 1048576 ? `${(fileSize / 1048576).toFixed(1)} MB` : `${Math.round(fileSize / 1024)} KB`) : 'File'}
            </div>
        </div>
        <Download size={18} className="text-gray-400 group-hover:text-blue-500 transition-colors" />
    </div>
);

const SessionTimer: React.FC<{ endTime: string; onExpire: () => void }> = ({ endTime, onExpire }) => {
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    const end = new Date(endTime).getTime();
    const update = () => {
      const now = Date.now();
      const diff = end - now;
      if (diff <= 0) { setTimeLeft('Expired'); onExpire(); return; }
      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${m}:${s.toString().padStart(2, '0')}`);
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [endTime, onExpire]);

  return (
    <span className={`font-mono font-black ${timeLeft === 'Expired' ? 'text-red-500' : 'text-green-500'}`}>
      {timeLeft}
    </span>
  );
};

const TeacherCourseDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<'students' | 'sessions' | 'materials'>('materials');
    const [showEdit, setShowEdit] = useState(false);
    const [showAttendance, setShowAttendance] = useState(false);
    const [editForm, setEditForm] = useState({ courseCode: '', courseName: '', description: '', section: '', schedule: '', room: '' });
    const [attendForm, setAttendForm] = useState({ sessionTitle: '', duration: '10' });
    const [showReopenModal, setShowReopenModal] = useState(false);
    const [targetReopenSession, setTargetReopenSession] = useState<{id: number, title: string} | null>(null);
    const [reopenDuration, setReopenDuration] = useState('10');
    const [reopeningId, setReopeningId] = useState<number | null>(null);
    const [courses, setCourses] = useState<any[]>([]);
    const [showPostArea, setShowPostArea] = useState(false);
    const [postForm, setPostForm] = useState({ type: 'announcement', title: '', description: '', externalLink: '', dueDate: '', forCourses: [Number(id)] });
    const [postFile, setPostFile] = useState<File | null>(null);
    const [posting, setPosting] = useState(false);
    const [submissions, setSubmissions] = useState<any[]>([]);
    const [gradingSub, setGradingSub] = useState<any>(null);
    const [comments, setComments] = useState<Record<number, any[]>>({});
    const [expandedThreads, setExpandedThreads] = useState<Record<number, boolean>>({});
    const [showStudentsPanel, setShowStudentsPanel] = useState(false);
    const [detail, setDetail] = useState<any>(null);
    const [showForward, setShowForward] = useState<number | null>(null);
    const [forwardCourses, setForwardCourses] = useState<number[]>([]);

    const load = () => {
        teacherApi.getCourse(Number(id)).then(res => {
            setData(res.data.data);
            const c = res.data.data.course;
            setEditForm({ courseCode: c.courseCode, courseName: c.courseName, description: c.description || '', section: c.section || '', schedule: c.schedule || '', room: c.room || '' });
            setLoading(false);
            teacherApi.getMaterials(Number(id)).then(mres => {
                const materials = mres.data.data || [];
                setData((prev: any) => ({ ...prev, materials }));
                materials.forEach((m: any) => loadComments(m.id));
            });
            teacherApi.getCourses().then(cres => setCourses(cres.data.data || []));
        }).catch(() => setLoading(false));
    };

    const loadComments = (mid: number) => {
        teacherApi.getComments(mid).then(res => setComments(prev => ({ ...prev, [mid]: res.data.data })));
    };

    const handlePost = async (e: React.FormEvent) => {
        e.preventDefault();
        setPosting(true);
        const fd = new FormData();
        fd.append('courseIds', postForm.forCourses.join(','));
        fd.append('type', postForm.type);
        fd.append('title', postForm.title);
        if (postForm.description) fd.append('description', postForm.description);
        if (postForm.externalLink) fd.append('externalLink', postForm.externalLink);
        if (postForm.dueDate) fd.append('dueDate', postForm.dueDate);
        if (postFile) fd.append('file', postFile);

        try {
            await teacherApi.createMaterial(fd);
            setShowPostArea(false);
            setPostForm({ type: 'announcement', title: '', description: '', externalLink: '', dueDate: '', forCourses: [Number(id)] });
            setPostFile(null);
            load();
            showAlert('Success', 'Posted successfully');
        } catch (err: any) { showApiError(err); } finally { setPosting(false); }
    };

    const openDetail = async (material: any) => {
        setDetail(material);
        if (material.type === 'assignment') {
            teacherApi.getSubmissions(material.id).then(res => setSubmissions(res.data.data || []));
        }
    };

    const handleForward = async () => {
        if (!showForward || forwardCourses.length === 0 || posting) return;
        setPosting(true);
        try {
            await teacherApi.shareMaterial(showForward, forwardCourses.join(','));
            setShowForward(null);
            setForwardCourses([]);
            showAlert('Success', 'Material shared with other courses');
        } catch (err: any) { showApiError(err); } finally { setPosting(false); }
    };

    const handleDeleteMaterial = (mid: number) => {
        showConfirm('Delete', 'Are you sure you want to delete this post?', async () => {
            try {
                await teacherApi.deleteMaterial(mid);
                setDetail(null);
                load();
                showAlert('Deleted', 'Post removed', 'error');
            } catch (err: any) { showApiError(err); }
        });
    };

    const gradeSubmission = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await teacherApi.gradeSubmission(gradingSub.id, { grade: gradingSub.grade, feedback: gradingSub.feedback });
            setGradingSub(null);
            teacherApi.getSubmissions(detail.id).then(res => setSubmissions(res.data.data || []));
            showAlert('Success', 'Graded successfully');
        } catch (err: any) { showApiError(err); }
    };

    const postComment = async (mid: number, content: string, isPrivate = false) => {
        try {
            await teacherApi.addComment(mid, { content, isPrivate });
            loadComments(mid);
        } catch (err: any) { showApiError(err); }
    };

    useEffect(() => { load(); }, [id]);

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        await teacherApi.updateCourse(Number(id), editForm);
        setShowEdit(false);
        load();
    };

    const handleDelete = async () => {
        showConfirm('Delete Course', 'Are you sure you want to delete this course? This cannot be undone.', async () => {
            try {
                await teacherApi.deleteCourse(Number(id));
                navigate('/teacher/courses');
                showAlert('Deleted', 'Course has been deleted.', 'error');
            } catch (err: any) { showApiError(err); }
        });
    };

    const handleArchive = async () => {
        showConfirm('Archive Course', 'Archive this course? Students will no longer see it in their active list.', async () => {
            try {
                await teacherApi.archiveCourse(Number(id));
                showAlert('Archived', 'Course archived.');
                load();
            } catch (err: any) { showApiError(err); }
        });
    };

    const handleUnarchive = async () => {
        await teacherApi.unarchiveCourse(Number(id));
        load();
    };

    const startSession = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await teacherApi.createAttendance({ courseId: Number(id), sessionTitle: attendForm.sessionTitle, duration: Number(attendForm.duration), allowLate: true });
            setShowAttendance(false);
            setAttendForm({ sessionTitle: '', duration: '10' });
            load();
            showAlert('Success', 'Attendance session started!');
        } catch (err: any) { showApiError(err); }
    };

    const closeSession = async (sessionId: number) => {
        showConfirm('Close Session', 'Are you sure you want to close this session? Absent students will be auto-marked.', async () => {
            try {
                await teacherApi.closeAttendance(sessionId);
                showAlert('Success', 'Session closed.');
                load();
            } catch (err: any) { showApiError(err); }
        });
    };

    const openReopenModal = (id: number, title: string) => {
        setTargetReopenSession({ id, title });
        setReopenDuration('10');
        setShowReopenModal(true);
    };

    const confirmReopen = async () => {
        if (!targetReopenSession) return;
        try {
            setReopeningId(targetReopenSession.id);
            await teacherApi.reopenAttendance(targetReopenSession.id, Number(reopenDuration));
            setShowReopenModal(false);
            setTargetReopenSession(null);
            load();
        } catch (err: any) {
            showApiError(err, 'Error reopening');
        } finally {
            setReopeningId(null);
        }
    };

    if (loading) return <DashboardLayout role="teacher"><div className="loading-screen"><div className="spinner"></div></div></DashboardLayout>;
    if (!data) return <DashboardLayout role="teacher"><p>Course not found</p></DashboardLayout>;

    const { course, enrollments, sessions } = data;

    return (
        <DashboardLayout role="teacher">
            {/* Floating Student Panel Toggle */}
            <button
                className="btn btn-primary shadow-xl hover:shadow-2xl transition-all active:scale-95 group"
                onClick={() => setShowStudentsPanel(prev => !prev)}
                style={{
                    position: 'fixed',
                    right: showStudentsPanel ? 336 : 24,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: 'auto',
                    height: 'auto',
                    zIndex: 50,
                    borderRadius: '24px',
                    padding: '0.75rem 1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}
            >
                <Users size={18} className="group-hover:scale-110 transition-transform" />
                <span className="font-bold text-sm">{showStudentsPanel ? 'Close' : `Students (${enrollments?.length || 0})`}</span>
            </button>

            {/* Side Students Panel */}
            <div
                style={{
                    position: 'fixed',
                    top: 80,
                    right: 0,
                    bottom: 0,
                    width: 320,
                    background: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(12px)',
                    borderLeft: '1px solid var(--border-glass)',
                    boxShadow: '-12px 0 30px rgba(15,23,42,0.1)',
                    transform: showStudentsPanel ? 'translateX(0)' : 'translateX(100%)',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    zIndex: 45,
                    display: 'flex',
                    flexDirection: 'column'
                }}
            >
                <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-glass)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Users size={18} className="text-blue-500" />
                    <h3 className="m-0 font-extrabold text-sm uppercase tracking-wider">Class Roster</h3>
                </div>
                <div style={{ padding: '1rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {enrollments?.length > 0 ? enrollments.map((e: any) => (
                        <div key={e.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-white shadow-sm hover:shadow-md hover:border-blue-100 transition-all cursor-default group">
                            <Avatar firstName={e.student?.firstName} lastName={e.student?.lastName} size={32} />
                            <div className="min-width-0">
                                <div className="text-sm font-bold truncate group-hover:text-blue-600 transition-colors">
                                    {e.student?.firstName} {e.student?.lastName}
                                </div>
                                <div className="text-[10px] uppercase font-bold text-muted tracking-tighter">
                                    {e.student?.studentId || 'N/A'}
                                </div>
                            </div>
                        </div>
                    )) : <div className="text-center py-12 opacity-40"><Users size={48} className="mx-auto mb-2" /><p className="text-xs">No entries yet</p></div>}
                </div>
            </div>

            {/* Course Header */}
            <div className="detail-header rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow animate-in slide-in-from-top duration-500" 
                 style={{ borderLeft: `8px solid ${course.coverColor}`, background: `linear-gradient(135deg, ${course.coverColor}10, transparent)` }}>
                <div className="flex justify-between items-start flex-wrap gap-6">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                             <div className="bg-blue-600 text-white text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-widest">{course.courseCode}</div>
                             {course.section && <div className="bg-gray-100 text-gray-600 text-[10px] font-bold px-2 py-0.5 rounded border">{course.section}</div>}
                        </div>
                        <h1 className="page-title text-4xl mb-3">{course.courseName}</h1>
                        <p className="page-subtitle max-w-2xl">{course.description || 'Welcome to your digital classroom community. Access all course materials, assignments, and announcements here.'}</p>
                        
                        <div className="flex flex-wrap gap-4 mt-6">
                            <div className="flex items-center gap-2 bg-white/50 px-3 py-1.5 rounded-lg border border-white/50 backdrop-blur-sm shadow-sm transition-all hover:bg-white">
                                <Search size={14} className="text-blue-500" />
                                <span className="text-xs font-black tracking-widest font-mono text-blue-700">{course.joinCode}</span>
                            </div>
                            {course.schedule && (
                                <div className="flex items-center gap-2 bg-white/50 px-3 py-1.5 rounded-lg border border-white/50 backdrop-blur-sm shadow-sm transition-all hover:bg-white">
                                    <Clock size={14} className="text-purple-500" />
                                    <span className="text-xs font-bold text-gray-700">{course.schedule}</span>
                                </div>
                            )}
                            {course.room && (
                                <div className="flex items-center gap-2 bg-white/50 px-3 py-1.5 rounded-lg border border-white/50 backdrop-blur-sm shadow-sm transition-all hover:bg-white">
                                    <MapPin size={14} className="text-red-500" />
                                    <span className="text-xs font-bold text-gray-700">{course.room}</span>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                        <button className="btn btn-primary shadow-sm hover:scale-105 active:scale-95 transition-all" onClick={() => setShowAttendance(true)}>
                            <Plus size={18} className="mr-1" /> Attendance
                        </button>
                        <button className="btn btn-secondary shadow-sm hover:bg-gray-100 transition-all" onClick={() => setShowEdit(true)}>
                            <Edit2 size={18} />
                        </button>
                        {course.status === 'archived' ? (
                            <button className="btn btn-secondary hover:bg-green-50 hover:text-green-600 transition-all" title="Unarchive" onClick={handleUnarchive}><RotateCcw size={18} /></button>
                        ) : (
                            <button className="btn btn-secondary hover:bg-gray-200 transition-all" title="Archive" onClick={handleArchive}><Archive size={18} /></button>
                        )}
                        <button className="btn btn-danger btn-sm p-2 rounded-lg hover:rotate-6 active:-rotate-6 transition-transform" onClick={handleDelete}><Trash2 size={18} /></button>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="tabs-container mt-8 shadow-inner bg-gray-50/50 p-1.5 rounded-2xl inline-flex gap-1">
                <button className={`tab-btn px-6 py-2 rounded-xl font-bold text-sm transition-all ${tab === 'materials' ? 'bg-white shadow-md text-blue-600' : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'}`} onClick={() => setTab('materials')}>
                    <Megaphone size={16} className="inline mr-2" /> Stream
                </button>
                <button className={`tab-btn px-6 py-2 rounded-xl font-bold text-sm transition-all ${tab === 'students' ? 'bg-white shadow-md text-blue-600' : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'}`} onClick={() => setTab('students')}>
                    <Users size={16} className="inline mr-2" /> Students
                </button>
                <button className={`tab-btn px-6 py-2 rounded-xl font-bold text-sm transition-all ${tab === 'sessions' ? 'bg-white shadow-md text-blue-600' : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'}`} onClick={() => setTab('sessions')}>
                    <Clock size={16} className="inline mr-2" /> Sessions
                </button>
            </div>

            <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Students Tab Content */}
                {tab === 'students' && (
                    <div className="glass-card overflow-hidden rounded-2xl shadow-xl">
                        {enrollments?.length > 0 ? (
                            <div className="data-table-wrapper">
                                <table className="data-table">
                                    <thead><tr><th>Student Account</th><th>Institutional ID</th><th>Contact Email</th><th>Account Status</th></tr></thead>
                                    <tbody>
                                        {enrollments.map((e: any) => (
                                            <tr key={e.id} className="hover:bg-blue-50/10 transition-colors">
                                                <td>
                                                    <div className="flex items-center gap-3">
                                                        <Avatar firstName={e.student?.firstName} lastName={e.student?.lastName} size={32} />
                                                        <span className="font-bold">{e.student?.firstName} {e.student?.lastName}</span>
                                                    </div>
                                                </td>
                                                <td><span className="font-mono text-xs font-bold text-gray-500">{e.student?.studentId || '—'}</span></td>
                                                <td><span className="text-sm text-gray-400">{e.student?.email}</span></td>
                                                <td>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-green-600">Active</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="empty-state py-20">
                                <div className="bg-gray-50 p-8 rounded-full inline-block mb-4 shadow-inner"><Users size={64} className="text-gray-200" /></div>
                                <h3 className="text-xl font-bold">No students enrolled</h3>
                                <p className="text-muted mt-2 max-w-sm mx-auto">Share the join code <span className="font-mono font-bold text-blue-600">{course.joinCode}</span> with your students to populate this roster.</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Materials (Stream) Tab */}
                {tab === 'materials' && (
                    <div className="classroom-stream max-w-4xl">
                        {/* Share Box */}
                        {!showPostArea ? (
                            <div className="stream-item post-trigger group hover:border-blue-200 hover:shadow-lg transition-all" onClick={() => setShowPostArea(true)}>
                                <Avatar firstName={user?.firstName} lastName={user?.lastName} size={40} className="shadow-sm group-hover:scale-105 transition-transform" />
                                <span className="text-gray-400 group-hover:text-blue-500 transition-colors">Launch a new post, assignment, or resource...</span>
                                <Plus size={20} className="ml-auto text-gray-300 group-hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-all group-hover:rotate-90" />
                            </div>
                        ) : (
                            <div className="stream-item post-box-expanded shadow-xl border-blue-100 animate-in zoom-in-95 duration-300">
                                <form onSubmit={handlePost}>
                                    <div className="flex gap-4 mb-4 items-center">
                                        <div className="flex-shrink-0">
                                            <Avatar firstName={user?.firstName} lastName={user?.lastName} size={40} />
                                        </div>
                                        <div className="flex-grow flex gap-2">
                                            <select className="form-input focus:ring-4 focus:ring-blue-100 transition-all border-2" style={{ width: 'auto' }} value={postForm.type} onChange={e => setPostForm({ ...postForm, type: e.target.value })}>
                                                <option value="announcement">Announcement</option>
                                                <option value="assignment">Assignment</option>
                                                <option value="file">Resource (File)</option>
                                                <option value="link">Reference (Link)</option>
                                            </select>
                                            <input className="form-input flex-grow focus:ring-4 focus:ring-blue-100 transition-all border-2" placeholder="Subject / Title" value={postForm.title} onChange={e => setPostForm({ ...postForm, title: e.target.value })} required />
                                        </div>
                                    </div>
                                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 focus-within:bg-white focus-within:shadow-inner transition-all">
                                        <textarea className="form-input bg-transparent border-none p-0 focus:ring-0 resize-none min-h-[120px]" placeholder="Detailed instructions or content..." value={postForm.description} onChange={e => setPostForm({ ...postForm, description: e.target.value })} />
                                        
                                        <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-gray-200/50">
                                            {postForm.type === 'file' && (
                                                <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border shadow-sm">
                                                    <FileText size={16} className="text-blue-500" />
                                                    <input type="file" className="text-xs file:hidden cursor-pointer" onChange={e => setPostFile(e.target.files?.[0] || null)} />
                                                </div>
                                            )}
                                            {postForm.type === 'link' && (
                                                <div className="flex-1 flex items-center gap-2 bg-white px-3 py-2 rounded-lg border shadow-sm">
                                                    <LinkIcon size={16} className="text-purple-500" />
                                                    <input type="text" className="bg-transparent border-none p-0 focus:ring-0 text-xs flex-grow" placeholder="Include a URL (YouTube, PDF, Web)..." value={postForm.externalLink} onChange={e => setPostForm({ ...postForm, externalLink: e.target.value })} />
                                                </div>
                                            )}
                                            {postForm.type === 'assignment' && (
                                                <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border shadow-sm">
                                                    <Calendar size={16} className="text-red-500" />
                                                    <input type="datetime-local" className="bg-transparent border-none p-0 focus:ring-0 text-xs" value={postForm.dueDate} onChange={e => setPostForm({ ...postForm, dueDate: e.target.value })} />
                                                    <span className="text-[10px] font-black tracking-widest text-red-600 uppercase">Deadline</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div className="mt-6 flex flex-col gap-4">
                                        <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100/50">
                                            <div className="flex items-center gap-2 mb-3">
                                                <Share size={14} className="text-blue-600" />
                                                <span className="text-[10px] font-black uppercase tracking-widest text-blue-700">Course Propagation</span>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {courses.map(c => (
                                                    <label key={c.id} className={`chip-select flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${postForm.forCourses.includes(c.id) ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-gray-400 border-gray-200 hover:border-blue-300'}`}>
                                                        <input type="checkbox" checked={postForm.forCourses.includes(c.id)} onChange={e => {
                                                            const cur = postForm.forCourses;
                                                            setPostForm({ ...postForm, forCourses: e.target.checked ? [...cur, c.id] : cur.filter(x => x !== c.id) });
                                                        }} className="hidden" />
                                                        {c.courseCode} {c.section}
                                                    </label>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                                            <button type="button" className="btn btn-secondary px-6" onClick={() => setShowPostArea(false)}>Cancel</button>
                                            <button type="submit" className="btn btn-primary px-8 shadow-lg hover:scale-105 active:scale-95 transition-all" disabled={posting}>
                                                {posting ? 'Broadcasting...' : (
                                                    <>
                                                        <Send size={18} className="mr-2" />
                                                        Post to Stream
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </form>
                            </div>
                        )}

                        {data.materials?.length > 0 ? data.materials.map((m: any) => (
                            <div key={m.id} className="stream-item group hover:shadow-xl hover:border-blue-100 transition-all animate-in slide-in-from-bottom-4 duration-500">
                                <div onClick={() => openDetail(m)} className="cursor-pointer">
                                    {m.type === 'announcement' ? (
                                        <>
                                            <div className="stream-header mb-4">
                                                <Avatar firstName={m.teacher?.firstName} lastName={m.teacher?.lastName} size={40} className="shadow-sm" />
                                                <div className="stream-info">
                                                    <div className="stream-author text-sm font-black group-hover:text-blue-600 transition-colors uppercase tracking-tight">{m.teacher?.firstName} {m.teacher?.lastName}</div>
                                                    <div className="stream-date text-[10px] font-bold text-gray-400 uppercase tracking-widest">{new Date(m.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                                                </div>
                                                <button className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity p-2 text-gray-300 hover:text-gray-600 hover:bg-gray-50 rounded-full" onClick={(e) => { e.stopPropagation(); /* more actions */ }}>
                                                    <MoreHorizontal size={20} />
                                                </button>
                                            </div>
                                            <div className="stream-content">
                                                {m.title && <h3 className="text-lg font-bold mb-2 tracking-tight">{m.title}</h3>}
                                                <div className="text-gray-600 leading-relaxed text-sm whitespace-pre-wrap">{m.description}</div>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="stream-item-material flex items-center p-2 rounded-xl group-hover:bg-blue-50/30 transition-colors">
                                            <div className="material-badge w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform" 
                                                 style={{ background: typeConfig[m.type]?.bg || '#f1f5f9', color: typeConfig[m.type]?.color || '#64748b' }}>
                                                <TypeIcon type={m.type} size={24} />
                                            </div>
                                            <div className="stream-info flex-1 ml-4">
                                                <span className="text-[10px] font-black uppercase tracking-widest mb-1 block" style={{ color: typeConfig[m.type]?.color }}>Published {m.type}</span>
                                                <h4 className="text-base font-bold group-hover:text-blue-600 transition-colors">{m.title}</h4>
                                                <p className="text-[10px] font-bold text-muted uppercase tracking-tighter mt-1">{new Date(m.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric' })}</p>
                                            </div>
                                            <div className="flex items-center gap-3 pr-2">
                                                {m.type === 'assignment' && (
                                                    <div className="bg-white/80 border px-3 py-1.5 rounded-full flex items-center gap-2 group-hover:border-blue-200 shadow-sm">
                                                        <GraduationCap size={14} className="text-blue-500" />
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-600">Submissions</span>
                                                    </div>
                                                )}
                                                <ChevronRight size={20} className="text-gray-300 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Comments Section */}
                                <div className="comments-section border-t border-gray-50/80 mt-6 pt-6">
                                    <div className="flex items-center gap-2 mb-4 text-[10px] font-black uppercase tracking-widest text-gray-400">
                                        <MessageSquare size={14} />
                                        <span>Class Discussions ({comments[m.id]?.length || 0})</span>
                                    </div>
                                    <div className="space-y-4">
                                        {(expandedThreads[m.id] ? comments[m.id] : comments[m.id]?.slice(0, 2))?.map((c: any) => (
                                            <div key={c.id} className="comment-item flex gap-3 group/item scale-in duration-300">
                                                <Avatar firstName={c.user?.firstName} lastName={c.user?.lastName} size={30} className={c.isPrivate ? 'ring-2 ring-red-100' : ''} />
                                                <div className="flex-1 min-width-0">
                                                    <div className="flex gap-2 items-center mb-1">
                                                        <strong className="text-xs font-bold">{c.user?.firstName} {c.user?.lastName}</strong> 
                                                        <span className="text-[9px] font-bold text-muted uppercase opacity-60 tracking-wider font-mono">{new Date(c.createdAt).toLocaleDateString()}</span>
                                                        {c.isPrivate && <span className="bg-red-50 text-red-600 text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest border border-red-100">Private</span>}
                                                    </div>
                                                    <div className="text-xs text-gray-600 max-w-prose leading-relaxed">{c.content}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    
                                    {comments[m.id]?.length > 2 && !expandedThreads[m.id] && (
                                        <button 
                                            onClick={() => setExpandedThreads(prev => ({ ...prev, [m.id]: true }))}
                                            className="mt-4 text-[10px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-2"
                                        >
                                            <ChevronRight size={14} className="rotate-90" />
                                            Show {comments[m.id].length - 2} more replies
                                        </button>
                                    )}
                                    
                                    <div className="flex items-center gap-3 mt-6 bg-gray-50 p-2 rounded-2xl group-focus-within:bg-blue-50 transition-colors">
                                        <Avatar firstName={user?.firstName} lastName={user?.lastName} size={28} />
                                        <input 
                                            type="text" 
                                            className="bg-transparent border-none p-0 focus:ring-0 text-xs flex-grow" 
                                            placeholder="Write a class comment..." 
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && e.currentTarget.value) {
                                                    postComment(m.id, e.currentTarget.value);
                                                    e.currentTarget.value = '';
                                                }
                                            }}
                                        />
                                        <Send size={14} className="text-gray-300 mr-2" />
                                    </div>
                                </div>
                            </div>
                        )) : (
                            <div className="empty-state py-24 bg-gray-50/30 rounded-3xl border-2 border-dashed border-gray-100">
                                <div className="text-blue-100 mb-6"><Megaphone size={64} className="mx-auto" /></div>
                                <h3 className="text-lg font-bold text-gray-700">Digital stream is quiet</h3>
                                <p className="text-muted text-sm mt-2">Publish assignments, share resources, or make announcements to start the class discussion.</p>
                                <button className="btn btn-primary mt-6 shadow-md hover:scale-105 active:scale-95 transition-all" onClick={() => setShowPostArea(true)}>
                                   Create First Post
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Sessions Tab */}
                {tab === 'sessions' && (
                    <div className="glass-card overflow-hidden rounded-2xl shadow-xl">
                        {sessions?.length > 0 ? (
                            <div className="data-table-wrapper">
                                <table className="data-table">
                                    <thead><tr><th>Class Session</th><th>Entrance Code</th><th>Duration</th><th>Real-time Status</th><th>Date / Time</th><th>Control Panel</th></tr></thead>
                                    <tbody>
                                        {sessions.map((s: any) => (
                                            <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="font-bold">{s.sessionTitle || `Class Session #${s.id}`}</td>
                                                <td><span className="font-mono font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-lg tracking-widest">{s.attendanceCode}</span></td>
                                                <td><span className="text-xs font-bold text-gray-500">{s.durationMinutes} minutes</span></td>
                                                <td>
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-2 h-2 rounded-full ${s.status === 'active' ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
                                                        <span className={`text-[10px] font-black uppercase tracking-widest ${s.status === 'active' ? 'text-green-600' : 'text-gray-400'}`}>{s.status}</span>
                                                    </div>
                                                </td>
                                                <td className="text-[10px] font-bold text-muted uppercase opacity-70 tracking-tighter">
                                                    {new Date(s.startTime).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                </td>
                                                <td>
                                                    {s.status === 'active' ? (
                                                        <div className="flex items-center gap-3">
                                                            <div className="bg-white border rounded-full px-3 py-1 flex items-center gap-2 shadow-inner">
                                                                <Clock size={12} className="text-green-500" />
                                                                <SessionTimer endTime={s.endTime} onExpire={load} />
                                                            </div>
                                                            <button className="btn btn-danger btn-sm rounded-full py-1.5 px-4 shadow-sm hover:scale-105 active:scale-95 transition-all" onClick={() => closeSession(s.id)}>End Now</button>
                                                        </div>
                                                    ) : (
                                                        <button 
                                                            className="flex items-center gap-2 bg-gray-100 hover:bg-blue-50 hover:text-blue-600 transition-all px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-transparent hover:border-blue-100 group"
                                                            onClick={() => openReopenModal(s.id, s.sessionTitle || 'Session')}
                                                            disabled={reopeningId === s.id}
                                                        >
                                                            {reopeningId === s.id ? <div className="spinner-sm" /> : <RotateCcw size={14} className="group-hover:rotate-[-20deg] transition-transform" />}
                                                            {reopeningId === s.id ? 'Restoring...' : 'Resume Session'}
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="empty-state py-20">
                                <div className="bg-gray-50 p-8 rounded-full inline-block mb-4 shadow-inner"><Clock size={64} className="text-gray-200" /></div>
                                <h3 className="text-xl font-bold">No sessions logged</h3>
                                <p className="text-muted mt-2">Start your first attendance session to begin tracking students automatically.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Modals Section */}
            
            {/* Edit Course Modal */}
            {showEdit && (
                <div className="modal-overlay" onClick={() => setShowEdit(false)}>
                    <div className="modal shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
                        <div className="modal-header border-b pb-4">
                            <h3 className="modal-title flex items-center gap-2"><Edit2 size={20} className="text-blue-500" /> Edit Course Details</h3>
                            <button className="modal-close hover:rotate-90 transition-transform" onClick={() => setShowEdit(false)}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleUpdate} className="mt-6 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="form-group"><label className="form-label text-[10px] font-black uppercase tracking-widest text-gray-400">Registry Code</label><input className="form-input focus:ring-4 focus:ring-blue-100 transition-all font-mono" value={editForm.courseCode} onChange={e => setEditForm({ ...editForm, courseCode: e.target.value })} required /></div>
                                <div className="form-group"><label className="form-label text-[10px] font-black uppercase tracking-widest text-gray-400">Class Section</label><input className="form-input focus:ring-4 focus:ring-blue-100 transition-all" value={editForm.section} onChange={e => setEditForm({ ...editForm, section: e.target.value })} placeholder="e.g. Morning 1" /></div>
                            </div>
                            <div className="form-group"><label className="form-label text-[10px] font-black uppercase tracking-widest text-gray-400">Curriculum Designation</label><input className="form-input focus:ring-4 focus:ring-blue-100 transition-all text-lg font-bold" value={editForm.courseName} onChange={e => setEditForm({ ...editForm, courseName: e.target.value })} required /></div>
                            <div className="form-group"><label className="form-label text-[10px] font-black uppercase tracking-widest text-gray-400">Detailed Abstract</label><textarea className="form-input focus:ring-4 focus:ring-blue-100 transition-all h-24" value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} placeholder="Summarize course objectives..." /></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="form-group"><label className="form-label text-[10px] font-black uppercase tracking-widest text-gray-400">Weekly Schedule</label><div className="relative"><Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input className="form-input pl-10 focus:ring-4 focus:ring-blue-100 transition-all" value={editForm.schedule} onChange={e => setEditForm({ ...editForm, schedule: e.target.value })} placeholder="MWF 9:00 AM" /></div></div>
                                <div className="form-group"><label className="form-label text-[10px] font-black uppercase tracking-widest text-gray-400">Facility / Location</label><div className="relative"><MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input className="form-input pl-10 focus:ring-4 focus:ring-blue-100 transition-all" value={editForm.room} onChange={e => setEditForm({ ...editForm, room: e.target.value })} placeholder="Room 201" /></div></div>
                            </div>
                            <div className="modal-actions pt-6 border-t font-black uppercase tracking-widest">
                                <button type="button" className="btn btn-secondary px-8" onClick={() => setShowEdit(false)}>Discard</button>
                                <button type="submit" className="btn btn-primary px-8 shadow-lg hover:scale-105 active:scale-95 transition-all">Synchronize Changes</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Attendance Session Modal */}
            {showAttendance && (
                <div className="modal-overlay" onClick={() => setShowAttendance(false)}>
                    <div className="modal shadow-2xl animate-in fade-in duration-200" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px' }}>
                        <div className="modal-header border-b pb-4"><h3 className="modal-title flex items-center gap-2"><Clock size={20} className="text-green-500" /> Start Live Tracker</h3><button className="modal-close hover:rotate-90 transition-transform" onClick={() => setShowAttendance(false)}><X size={20} /></button></div>
                        <form onSubmit={startSession} className="mt-6 space-y-6">
                            <div className="form-group"><label className="form-label text-[10px] font-black uppercase tracking-widest text-gray-400">Broadcast Title</label><input className="form-input focus:ring-4 focus:ring-green-100 transition-all" value={attendForm.sessionTitle} onChange={e => setAttendForm({ ...attendForm, sessionTitle: e.target.value })} placeholder="e.g. Week 4 - Advanced Robotics" /></div>
                            <div className="form-group"><label className="form-label text-[10px] font-black uppercase tracking-widest text-gray-400">Tracking Duration (Minutes)</label><div className="relative"><RotateCcw size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input className="form-input pl-10 focus:ring-4 focus:ring-green-100 transition-all" type="number" min="1" max="120" value={attendForm.duration} onChange={e => setAttendForm({ ...attendForm, duration: e.target.value })} /></div></div>
                            <div className="modal-actions pt-6 border-t">
                                <button type="button" className="btn btn-secondary px-6" onClick={() => setShowAttendance(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary px-8 bg-green-600 hover:bg-green-700 shadow-xl hover:scale-105 active:scale-95 transition-all">Launch Tracker</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Reopen Session Modal */}
            {showReopenModal && (
                <div className="modal-overlay" onClick={() => setShowReopenModal(false)}>
                    <div className="modal shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px' }}>
                        <div className="modal-header border-b pb-4">
                            <h3 className="modal-title flex items-center gap-2"><RotateCcw size={20} className="text-blue-500" /> Restore Session</h3>
                            <button className="modal-close hober:rotate-90 transition-transform" onClick={() => setShowReopenModal(false)}><X size={20} /></button>
                        </div>
                        <div className="mt-6 bg-blue-50 rounded-2xl p-4 border border-blue-100 mb-6 animate-in slide-in-from-top-2 duration-300">
                             <div className="flex gap-3">
                                 <AlertCircle className="text-blue-500 flex-shrink-0" size={20} />
                                 <p className="text-xs text-blue-700 leading-relaxed font-medium">
                                    Restoring: <span className="font-bold underline">{targetReopenSession?.title}</span>. Late students marked "Absent" can now check-in. Existing records remain intact.
                                 </p>
                             </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label text-[10px] font-black uppercase tracking-widest text-gray-400">Extended Runtime Period (Min)</label>
                            <input 
                                type="number" 
                                className="form-input focus:ring-4 focus:ring-blue-100 transition-all" 
                                value={reopenDuration} 
                                onChange={e => setReopenDuration(e.target.value)} 
                                min="1" max="120"
                            />
                        </div>
                        <div className="modal-actions pt-6 border-t mt-6 gap-3">
                            <button className="btn btn-secondary py-3 flex-1 transition-all" onClick={() => setShowReopenModal(false)}>Discard</button>
                            <button className="btn btn-primary py-3 flex-1 shadow-lg hover:scale-105 active:scale-95 transition-all" onClick={confirmReopen} disabled={reopeningId !== null}>
                                {reopeningId !== null ? 'Initializing...' : 'Confirm Restore'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Material Detail Modal (The Heavy Hitter) */}
            {detail && (
                <div className="modal-overlay" onClick={() => setDetail(null)}>
                    <div className={`modal shadow-2xl animate-in zoom-in-95 duration-300 ${detail.type === 'assignment' ? 'modal-xl' : 'modal-lg'}`} 
                         onClick={e => e.stopPropagation()} 
                         style={{ maxWidth: detail.type === 'assignment' ? 1200 : 840, height: '85vh', padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', borderRadius: '32px' }}>
                        
                        <div className="px-8 py-6 border-b flex items-center gap-4 flex-shrink-0 bg-white/80 backdrop-blur-md">
                            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg animate-in roll-in duration-500" 
                                 style={{ background: typeConfig[detail.type]?.color || '#64748b' }}>
                                <TypeIcon type={detail.type} size={24} />
                            </div>
                            <div className="flex-1 min-width-0">
                                <span className="text-[10px] font-black uppercase tracking-widest block opacity-40 mb-1">{typeConfig[detail.type]?.label} Details</span>
                                <h3 className="m-0 text-xl font-black truncate tracking-tight">{detail.title}</h3>
                            </div>
                            <div className="flex items-center gap-2">
                                <button className="p-3 hover:bg-gray-100 text-gray-400 hover:text-blue-600 rounded-2xl transition-all group/btn" title="Share Content" onClick={() => setShowForward(detail.id)}>
                                    <Share size={20} className="group-hover/btn:scale-110 transition-transform" />
                                </button>
                                <button className="p-3 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-2xl transition-all group/btn" title="Remove Permanently" onClick={() => handleDeleteMaterial(detail.id)}>
                                    <Trash2 size={20} className="group-hover/btn:scale-110 group-hover/btn:rotate-6 transition-transform" />
                                </button>
                                <div className="w-px h-8 bg-gray-100 mx-2" />
                                <button className="p-3 hover:bg-gray-100 text-gray-400 hover:text-black rounded-2xl transition-all" onClick={() => setDetail(null)}>
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        <div className="flex flex-1 overflow-hidden">
                            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                                <div className="max-w-2xl">
                                    <div className="flex items-center gap-3 mb-8 bg-gray-50/50 p-2 rounded-2xl border w-fit">
                                        <Avatar firstName={detail.teacher?.firstName} lastName={detail.teacher?.lastName} size={36} />
                                        <div className="pr-4">
                                            <div className="text-xs font-bold">{detail.teacher?.firstName} {detail.teacher?.lastName}</div>
                                            <div className="text-[10px] text-muted font-bold uppercase tracking-wider">{new Date(detail.createdAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</div>
                                        </div>
                                    </div>

                                    {detail.description && (
                                        <div className="text-base leading-loose text-gray-700 mb-8 whitespace-pre-wrap font-medium">
                                            {detail.description}
                                        </div>
                                    )}

                                    {detail.externalLink && <VideoPreview url={detail.externalLink} />}
                                    
                                    {detail.fileName && <FileCard fileName={detail.fileName} fileSize={detail.fileSize} onDownload={() => downloadFile('material', detail.id, detail.fileName)} />}
                                    
                                    {detail.externalLink && !getYouTubeId(detail.externalLink) && (
                                        <a href={detail.externalLink} target="_blank" rel="noreferrer" className="flex items-center gap-4 p-4 bg-gray-50 hover:bg-purple-50/50 rounded-2xl border border-gray-100 hover:border-purple-100 transition-all group no-underline text-inherit mb-4">
                                            <div className="w-12 h-12 rounded-xl bg-purple-100/50 flex items-center justify-center group-hover:scale-110 transition-transform text-purple-600">
                                                <LinkIcon size={24} />
                                            </div>
                                            <div className="flex-1 truncate">
                                                <div className="text-sm font-bold truncate">{detail.externalLink}</div>
                                                <div className="text-[10px] font-black uppercase text-purple-500 tracking-widest mt-1">Visit External Reference</div>
                                            </div>
                                            <ExternalLink size={20} className="text-gray-300 group-hover:text-purple-500 transition-colors" />
                                        </a>
                                    )}

                                    {/* Detailed Stats for Assignments */}
                                    {detail.type === 'assignment' && detail.dueDate && (
                                         <div className="mt-12 flex items-center gap-3 bg-red-50 p-4 rounded-2xl border border-red-100 mb-8">
                                             <AlertCircle size={20} className="text-red-500" />
                                             <div className="flex-1">
                                                 <span className="text-[10px] font-black uppercase tracking-widest text-red-600 block mb-1">Instructional Deadline</span>
                                                 <span className="text-sm font-bold text-red-700">{new Date(detail.dueDate).toLocaleString(undefined, { weekday: 'long', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                             </div>
                                         </div>
                                    )}

                                    <div className="mt-12">
                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-muted mb-6 flex items-center gap-2">
                                            <MessageSquare size={14} className="text-blue-500" /> 
                                            Class Discussions ({comments[detail.id]?.length || 0})
                                        </h4>
                                        <div className="space-y-8">
                                            {comments[detail.id]?.map((c: any) => (
                                                <div key={c.id} className="flex gap-4 animate-in slide-in-from-left duration-300">
                                                    <Avatar firstName={c.user?.firstName} lastName={c.user?.lastName} size={36} className="shadow-sm" />
                                                    <div className="flex-1 bg-gray-50/50 p-4 rounded-3xl border border-gray-100">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <span className="text-xs font-bold">{c.user?.firstName} {c.user?.lastName}</span>
                                                            <span className="text-[9px] font-bold text-muted uppercase tracking-wider font-mono bg-white px-2 py-0.5 rounded-full border">{new Date(c.createdAt).toLocaleDateString()}</span>
                                                        </div>
                                                        <div className="text-sm text-gray-600 leading-relaxed">{c.content}</div>
                                                    </div>
                                                </div>
                                            ))}
                                            {comments[detail.id]?.length === 0 && (
                                                <div className="text-center py-6 opacity-30 italic text-sm">No discussion started yet.</div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {detail.type === 'assignment' && (
                                <div className="w-[480px] bg-gray-50/30 border-l flex flex-col animate-in slide-in-from-right duration-500">
                                    <div className="p-6 border-b flex justify-between items-center bg-white/50 backdrop-blur-sm">
                                        <div>
                                            <h4 className="m-0 text-sm font-black uppercase tracking-widest text-gray-700">Digital Grading Book</h4>
                                            <div className="flex gap-3 text-[10px] font-bold text-muted mt-1 uppercase tracking-tighter">
                                                <span>Total: {enrollments?.length || 0}</span>
                                                <span className="text-blue-600">Pending: {submissions.filter(s => s.status !== 'graded').length}</span>
                                                <span className="text-green-600">Graded: {submissions.filter(s => s.status === 'graded').length}</span>
                                            </div>
                                        </div>
                                        <div className="bg-blue-600 text-white rounded-2xl w-10 h-10 flex items-center justify-center shadow-lg">
                                            <GraduationCap size={20} />
                                        </div>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                                        {enrollments?.length === 0 ? (
                                            <div className="text-center py-20 opacity-30"><Users size={48} className="mx-auto" /></div>
                                        ) : enrollments.map((e: any) => {
                                            const s = submissions.find(x => x.student?.id === e.student?.id);
                                            const isGrading = gradingSub?.id === s?.id;
                                            
                                            return (
                                                <div key={e.id} className={`p-4 rounded-3xl border transition-all ${s ? (isGrading ? 'bg-blue-50 border-blue-200 shadow-lg translate-x-2' : 'bg-white border-gray-100 shadow-sm hover:shadow-md') : 'bg-transparent border-dashed border-gray-200 opacity-60'}`}>
                                                    <div className="flex items-center gap-3">
                                                        <Avatar firstName={e.student?.firstName} lastName={e.student?.lastName} size={36} />
                                                        <div className="flex-1 min-width-0">
                                                            <div className="text-sm font-bold truncate">{e.student?.firstName} {e.student?.lastName}</div>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                {s ? (
                                                                    <>
                                                                        <div className="flex items-center gap-1">
                                                                            {s.status === 'graded' ? <CheckCircle2 size={10} className="text-green-500" /> : <RotateCcw size={10} className="text-blue-500 animate-spin-slow" />}
                                                                            <span className={`text-[10px] font-black uppercase tracking-widest ${s.status === 'graded' ? 'text-green-600' : 'text-blue-600'}`}>{s.status}</span>
                                                                        </div>
                                                                        <span className="text-gray-300">•</span>
                                                                        <span className="text-[9px] font-bold text-gray-400">{new Date(s.createdAt).toLocaleDateString()}</span>
                                                                    </>
                                                                ) : (
                                                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Awaiting Submission</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        {s?.grade && (
                                                            <div className="bg-green-50 text-green-600 font-mono font-black text-xs px-3 py-1 rounded-full border border-green-100">
                                                                {s.grade}<span className="text-[8px] opacity-60 ml-0.5">/100</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    
                                                    {s && (
                                                        <div className="mt-4 pt-4 border-t border-gray-100 space-y-3 animate-in fade-in duration-300">
                                                            {s.fileName && (
                                                                <div onClick={() => downloadFile('submission', s.id, s.fileName)} className="flex items-center gap-2 p-2 bg-gray-50 hover:bg-blue-50 rounded-xl border border-gray-100 hover:border-blue-200 cursor-pointer transition-all group/file">
                                                                    <FileText size={14} className="text-blue-500" />
                                                                    <div className="flex-1 text-[10px] font-bold truncate group-hover/file:text-blue-700">{s.fileName}</div>
                                                                    <Download size={14} className="text-gray-300" />
                                                                </div>
                                                            )}
                                                            {s.content && (
                                                                <div className="text-[11px] text-gray-600 bg-white p-3 rounded-xl border border-gray-100 line-clamp-3 italic leading-relaxed">"{s.content}"</div>
                                                            )}
                                                            <button 
                                                                className={`w-full py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-sm ${s.status === 'graded' ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200'}`}
                                                                onClick={() => setGradingSub(isGrading ? null : s)}
                                                            >
                                                                {isGrading ? 'Close Inspector' : (s.status === 'graded' ? 'Review & Re-grade' : 'Launch Grading Inspector')}
                                                            </button>
                                                            
                                                            {/* Nested Grading Form */}
                                                            {isGrading && (
                                                                <div className="mt-4 p-4 bg-white rounded-2xl shadow-inner border border-blue-100 space-y-4 animate-in slide-in-from-top-2 duration-300">
                                                                    <form onSubmit={gradeSubmission} className="space-y-4">
                                                                        <div className="form-group">
                                                                            <label className="text-[9px] font-black uppercase tracking-widest text-blue-600 mb-2 block">Instructional Grade (Points)</label>
                                                                            <div className="relative">
                                                                                <input type="number" className="form-input focus:ring-4 focus:ring-blue-100 transition-all font-black text-center text-xl py-3" min="0" max="100" value={gradingSub.grade || ''} onChange={e => setGradingSub({ ...gradingSub, grade: e.target.value })} required />
                                                                                <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-gray-300 text-sm">/ 100</span>
                                                                            </div>
                                                                        </div>
                                                                        <div className="form-group">
                                                                            <label className="text-[9px] font-black uppercase tracking-widest text-blue-600 mb-2 block">Pedagogical Feedback</label>
                                                                            <textarea className="form-input focus:ring-4 focus:ring-blue-100 transition-all text-xs h-24" value={gradingSub.feedback || ''} onChange={e => setGradingSub({ ...gradingSub, feedback: e.target.value })} placeholder="Provide constructive critique..." />
                                                                        </div>
                                                                        <button type="submit" className="btn btn-primary w-full py-3 shadow-xl hover:scale-105 transition-all">Submit Evaluation</button>
                                                                    </form>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Forward (Share) Modal */}
            {showForward && (
                <div className="modal-overlay" onClick={() => setShowForward(null)}>
                    <div className="modal shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
                        <div className="modal-header border-b pb-4 flex items-center justify-between">
                            <h3 className="modal-title flex items-center gap-2"><Share size={20} className="text-blue-500" /> Resource Propagation</h3>
                            <button className="modal-close hover:rotate-90 transition-transform" onClick={() => setShowForward(null)}><X size={20} /></button>
                        </div>
                        <div className="mt-6 space-y-6">
                            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                <p className="text-xs text-gray-500 leading-relaxed font-medium m-0">Synchronize this content across multiple sections to maintain curriculum consistency. Select target classrooms below:</p>
                            </div>
                            <div className="flex flex-wrap gap-2 max-h-[240px] overflow-y-auto pr-2 custom-scrollbar">
                                {courses.filter(c => c.id !== Number(id)).map(c => (
                                    <label key={c.id} className={`flex-grow chip-select flex items-center gap-3 px-4 py-3 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${forwardCourses.includes(c.id) ? 'bg-blue-600 text-white border-blue-600 shadow-lg' : 'bg-white text-gray-400 border-gray-100 hover:border-blue-300'}`}>
                                        <input type="checkbox" checked={forwardCourses.includes(c.id)} onChange={e => {
                                            setForwardCourses(prev => e.target.checked ? [...prev, c.id] : prev.filter(x => x !== c.id));
                                        }} className="hidden" />
                                        <div className={`w-3 h-3 rounded-full border-2 ${forwardCourses.includes(c.id) ? 'bg-white border-white' : 'border-gray-200'}`} />
                                        <div className="flex-1">
                                            <div className="font-black uppercase tracking-widest">{c.courseCode}</div>
                                            <div className="text-[9px] opacity-80">{c.section || 'General Section'}</div>
                                        </div>
                                    </label>
                                ))}
                            </div>
                            <div className="modal-actions pt-6 border-t mt-6 gap-3">
                                <button className="btn btn-secondary py-3 flex-1 transition-all" onClick={() => setShowForward(null)}>Cancel</button>
                                <button className="btn btn-primary py-3 flex-1 shadow-lg hover:scale-105 active:scale-95 transition-all" onClick={handleForward} disabled={posting || forwardCourses.length === 0}>
                                    {posting ? 'Propagating...' : 'Propagate Content'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
};

export default TeacherCourseDetail;
