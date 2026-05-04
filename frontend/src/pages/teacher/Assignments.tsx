import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import Avatar from '../../components/Avatar';
import { teacherApi, fileApi } from '../../api';
import { showAlert, showConfirm, showApiError } from '../../utils/feedback';
import { FileText, Download, Plus, X, Upload, ArrowUpRight, ChevronRight, Users, Clock, Filter, CheckCircle2, AlertCircle, History, Trash2, BookOpen } from 'lucide-react';



const FileCard = ({ fileName, fileSize, onDownload }: { fileName: string; fileSize?: number; onDownload: () => void }) => (
    <div onClick={e => { e.stopPropagation(); onDownload(); }}
        className="theme-card ta-file-card"
        style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.85rem 1rem',
            borderRadius: 14, cursor: 'pointer',
            transition: 'all .15s', marginBottom: '0.5rem', width: '100%', boxSizing: 'border-box'
        }}
    >
        <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <FileText size={18} color="var(--accent-blue)" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>{fileName}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                {fileSize ? (fileSize > 1048576 ? `${(fileSize / 1048576).toFixed(1)} MB` : `${Math.round(fileSize / 1024)} KB`) : 'File'}
            </div>
        </div>
        <Download size={18} color="var(--text-muted)" />
    </div>
);

const TeacherAssignments: React.FC = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const [courses, setCourses] = useState<any[]>([]);
    const [assignments, setAssignments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCourse, setSelectedCourse] = useState<number | null>(Number(searchParams.get('courseId')) || null);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'urgent' | 'done' | 'overdue'>('all');
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ content: '', dueDate: '' });
    const [file, setFile] = useState<File | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [enrollments, setEnrollments] = useState<any[]>([]);
    const [targetCourses, setTargetCourses] = useState<number[]>([]);
    const menuRef = useRef<HTMLDivElement>(null);

    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [comments, setComments] = useState<any[]>([]);
    const [submissions, setSubmissions] = useState<any[]>([]);
    const [newComment, setNewComment] = useState('');
    const [detailTab, setDetailTab] = useState<'instructions' | 'submissions'>('instructions');

    const [gradingId, setGradingId] = useState<number | null>(null);
    const [gradeVal, setGradeVal] = useState('');
    const [feedbackVal, setFeedbackVal] = useState('');
    const [submissionFilter, setSubmissionFilter] = useState<'all' | 'submitted' | 'missing' | 'graded'>('all');
    const [selectedAssignment, setSelectedAssignment] = useState<any | null>(null);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [previewType, setPreviewType] = useState<'image' | 'pdf' | 'other' | null>(null);
    const [previewName, setPreviewName] = useState('');

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) setIsMenuOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const load = () => {
        setLoading(true);
        teacherApi.getCourses().then(r => {
            const c = r.data.data || [];
            setCourses(c);
            const initialCourseId = Number(searchParams.get('courseId'));
            if (initialCourseId && c.some((course: any) => course.id === initialCourseId)) {
                setSelectedCourse(initialCourseId);
            } else if (c.length > 0 && !selectedCourse) {
                setSelectedCourse(c[0].id);
                setSearchParams({ courseId: c[0].id.toString() }, { replace: true });
            }
            setLoading(false);
        }).catch(() => setLoading(false));
    };

    const loadAssignments = (id: number) => {
        teacherApi.getMaterials(id).then(r => {
            const all = r.data.data || [];
            setAssignments(all.filter((m: any) => m.type === 'assignment'));
        }).catch(() => { });
    };

    const handleViewAssignment = async (m: any) => {
        setSelectedAssignment(m);
        setDetailTab('instructions');
        setNewComment('');
        setGradingId(null);
        setSubmissionFilter('all');
        try { const r = await teacherApi.getComments(m.id); setComments(r.data.data || []); } catch { }
        try { const r = await teacherApi.getSubmissions(m.id); setSubmissions(r.data.data || []); } catch { }
    };

    const getLateInfo = (dueDate: string, submittedAt: string) => {
        const diff = new Date(submittedAt).getTime() - new Date(dueDate).getTime();
        if (diff <= 0) return null;
        const mins = Math.floor(diff / 60000);
        const hours = Math.floor(mins / 60);
        const days = Math.floor(hours / 24);
        if (days > 0) return `${days}d ${hours % 24}h late`;
        if (hours > 0) return `${hours}h ${mins % 60}m late`;
        return `${mins}m late`;
    };

    const getFullSubmissionList = () => {
        return enrollments.map(e => {
            const student = e.student;
            const sub = submissions.find(s => s.student?.id === student.id);
            let status: 'missing' | 'submitted' | 'graded' | 'late' = 'missing';
            let lateInfo = null;

            if (sub) {
                if (sub.status === 'late') status = 'late';
                else if (sub.grade !== null && sub.grade !== undefined) status = 'graded';
                else status = 'submitted';

                if (selectedAssignment?.dueDate && sub.createdAt) {
                    lateInfo = getLateInfo(selectedAssignment.dueDate, sub.createdAt);
                }
            }
            return { student, submission: sub, status, lateInfo };
        }).filter(item => {
            if (submissionFilter === 'all') return true;
            if (submissionFilter === 'submitted') return item.status === 'submitted' || item.status === 'graded' || item.status === 'late';
            if (submissionFilter === 'missing') return item.status === 'missing';
            if (submissionFilter === 'graded') return item.status === 'graded';
            return true;
        });
    };

    useEffect(() => { load(); }, []);
    useEffect(() => {
        if (selectedCourse) {
            setSearchParams({ courseId: selectedCourse.toString() }, { replace: true });
            loadAssignments(selectedCourse);
            setExpandedId(null);
            teacherApi.getCourse(selectedCourse).then(r => {
                setEnrollments(r.data?.data?.enrollments || []);
            }).catch(() => setEnrollments([]));
        }
    }, [selectedCourse]);

    const activeCourseData = courses.find(c => c.id === selectedCourse);

    const filtered = assignments.filter(m => {
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            if (!(m.title?.toLowerCase().includes(q) || m.description?.toLowerCase().includes(q))) return false;
        }

        const isUrgent = m.dueDate && new Date(m.dueDate).getTime() - Date.now() < 3 * 24 * 60 * 60 * 1000 && new Date(m.dueDate) > new Date();
        const isPast = m.dueDate && new Date(m.dueDate) < new Date();
        const isDone = enrollments.length > 0 && (m.submissionCount || 0) >= enrollments.length;

        if (statusFilter === 'urgent') return isUrgent;
        if (statusFilter === 'overdue') return isPast;
        if (statusFilter === 'done') return isDone;

        return true;
    });

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (submitting) return;
        const lines = form.content.split('\n');
        let title = lines[0].trim();
        const description = lines.slice(1).join('\n').trim();

        if (!title && file) title = file.name;
        if (!title) { showAlert('Error', 'Please enter a title or attach a file', 'error'); return; }
        if (!selectedCourse && !editingId) { showAlert('Error', 'No course selected', 'error'); return; }

        setSubmitting(true);
        const fd = new FormData();
        if (!editingId) fd.append('courseIds', targetCourses.join(','));
        fd.append('type', 'assignment');
        fd.append('title', title);
        if (description) fd.append('description', description);
        if (form.dueDate) fd.append('dueDate', form.dueDate);
        if (file) fd.append('file', file);
        try {
            if (editingId) {
                const r = await teacherApi.updateMaterial(editingId, fd);
                setSelectedAssignment(r.data.data);
                showAlert('Success', 'Assignment updated!');
            } else {
                await teacherApi.createMaterial(fd);
                showAlert('Success', 'Assignment posted!');
            }
            setShowModal(false);
            setEditingId(null);
            setForm({ content: '', dueDate: '' });
            setFile(null);
            if (selectedCourse) loadAssignments(selectedCourse);
        } catch (err: any) { showApiError(err); } finally { setSubmitting(false); }
    };

    const toggleAssignmentStatus = async (m: any) => {
        const action = m.isClosed ? 'reopen' : 'close';
        setSelectedAssignment(null);
        showConfirm(`${action.charAt(0).toUpperCase() + action.slice(1)} Assignment`, `Are you sure you want to ${action} this assignment?`, async () => {
            try {
                if (m.isClosed) await teacherApi.reopenMaterial(m.id);
                else await teacherApi.closeMaterial(m.id);
                if (selectedCourse) loadAssignments(selectedCourse);
                const r = await teacherApi.getMaterials(selectedCourse!);
                const updated = r.data.data.find((item: any) => item.id === m.id);
                if (updated) setSelectedAssignment(updated);
                showAlert('Success', `Assignment ${action}ed successfully!`);
            } catch (err: any) { showApiError(err); }
        });
    };

    const handleDelete = (id: number) => {
        showConfirm('Delete Assignment', 'Are you sure you want to delete this assignment and all submissions?', async () => {
            try {
                await teacherApi.deleteMaterial(id);
                if (expandedId === id) setExpandedId(null);
                if (selectedCourse) loadAssignments(selectedCourse);
                showAlert('Deleted', 'Assignment removed.', 'error');
            } catch (err: any) { showApiError(err); }
        });
    };

    const handleAddComment = async () => {
        if (!newComment.trim() || !selectedAssignment) return;
        try {
            await teacherApi.addComment(selectedAssignment.id, { content: newComment.trim(), isPrivate: false });
            setNewComment('');
            const r = await teacherApi.getComments(selectedAssignment.id);
            setComments(r.data.data || []);
        } catch (err: any) { showApiError(err); }
    };

    const handleGrade = async (subId: number, grade: string, feedback: string) => {
        try {
            await teacherApi.gradeSubmission(subId, { grade, feedback });
            if (selectedAssignment) {
                const r = await teacherApi.getSubmissions(selectedAssignment.id);
                setSubmissions(r.data.data || []);
                if (selectedCourse) loadAssignments(selectedCourse);
            }
            showAlert('Graded', 'Submission graded successfully!');
            setGradingId(null);
        } catch (err: any) { showApiError(err); }
    };

    const handlePreview = async (type: 'material' | 'submission', id: number, fileName: string) => {
        try {
            const res = type === 'material' ? await fileApi.downloadMaterial(id) : await fileApi.downloadSubmission(id);
            const blob = new Blob([res.data], { type: fileName.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/*' });
            const url = URL.createObjectURL(blob);
            setPreviewUrl(url);
            setPreviewName(fileName);

            const ext = fileName.split('.').pop()?.toLowerCase();
            if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) setPreviewType('image');
            else if (ext === 'pdf') setPreviewType('pdf');
            else setPreviewType('other');
        } catch { showAlert('Error', 'Could not load preview', 'error'); }
    };

    const assignmentsActions = (
        <div className="ta-topbar-actions-container">
            <nav className="ta-course-nav">
                <div style={{ position: 'relative' }} ref={menuRef}>
                    <div className="ta-course-selector" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                        <BookOpen size={16} />
                        <span className="ta-course-code">{activeCourseData?.courseCode || 'Select Course'}</span>
                        <ChevronRight size={14} className={`ta-chevron ${isMenuOpen ? 'open' : ''}`} />
                    </div>
                    {isMenuOpen && (
                        <div className="theme-card ta-course-dropdown">
                            <div className="ta-dropdown-header">Your Classrooms</div>
                            <div className="ta-dropdown-list">
                                {courses.map(c => (
                                    <div key={c.id} className={`ta-dropdown-item ${selectedCourse === c.id ? 'active' : ''}`} onClick={() => { setSelectedCourse(c.id); setIsMenuOpen(false); }}>
                                        <div className="ta-item-name">{c.courseName}</div>
                                        <div className="ta-item-code">{c.courseCode} · {c.section}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </nav>
            <button onClick={() => { setShowModal(true); setTargetCourses(selectedCourse ? [selectedCourse] : []); }} className="btn btn-primary ta-new-assignment-btn">
                <Plus size={16} /> <span>New Assignment</span>
            </button>
        </div>
    );

    return (
        <DashboardLayout
            role="teacher"
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            actions={assignmentsActions}
        >
            {loading ? (
                <div className="loading-screen" style={{ padding: '5rem 0' }}><div className="spinner" style={{ marginBottom: '1rem' }} /><p style={{ color: '#94a3b8' }}>Loading assignments...</p></div>
            ) : (
                <div className="ta-layout-grid">
                    <div className="ta-main-col">
                        <div className="ta-header">
                            <div className="ta-header-info">
                                <h2 className="ta-title">Assignments</h2>
                                <p className="ta-subtitle">Review and grade work for <strong>{activeCourseData?.courseName || activeCourseData?.courseCode}</strong>.</p>

                                <div className="ta-filters-scroll">
                                    <div className="ta-filters-inner">
                                        {[
                                            { id: 'all', label: 'All', icon: <History size={14} /> },
                                            { id: 'urgent', label: 'Urgent', icon: <Clock size={14} /> },
                                            { id: 'overdue', label: 'Overdue', icon: <AlertCircle size={14} /> },
                                            { id: 'done', label: 'Completed', icon: <CheckCircle2 size={14} /> }
                                        ].map(f => (
                                            <button
                                                key={f.id}
                                                onClick={() => setStatusFilter(f.id as any)}
                                                className={`ta-filter-pill ${statusFilter === f.id ? 'active' : ''}`}
                                            >
                                                {f.icon} {f.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="ta-assignment-list">
                            {filtered.length === 0 ? (
                                <div className="empty-state-card ta-empty-state">
                                    <div className="empty-state-icon-wrapper">
                                        <Filter size={32} className="empty-state-icon" />
                                    </div>
                                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>No assignments found</h3>
                                    <p style={{ color: 'var(--text-muted)' }}>Try changing your filter or classroom.</p>
                                </div>
                            ) : (
                                filtered.map(m => {
                                    const isUrgent = m.dueDate && new Date(m.dueDate).getTime() - Date.now() < 3 * 24 * 60 * 60 * 1000 && new Date(m.dueDate) > new Date();
                                    const isPast = m.dueDate && new Date(m.dueDate) < new Date();
                                    const isDone = enrollments.length > 0 && (m.submissionCount || 0) >= enrollments.length;

                                    return (
                                        <div key={m.id} className="theme-card ta-assignment-card" style={{ animation: 'slideUp 0.4s ease-out forwards', borderLeft: `6px solid ${isDone ? '#10b981' : isPast ? '#ef4444' : isUrgent ? '#f97316' : 'var(--accent-blue)'}` }}>
                                            <div onClick={() => handleViewAssignment(m)} className="ta-card-inner">
                                                <div className="ta-card-main">
                                                    <div className="ta-card-badges">
                                                        {(isDone || isPast || isUrgent) && (
                                                            <span className={`ta-status-tag ${isDone ? 'done' : isPast ? 'overdue' : 'urgent'}`}>
                                                                {isDone ? 'COMPLETED' : isPast ? 'OVERDUE' : isUrgent ? 'URGENT' : ''}
                                                            </span>
                                                        )}
                                                        <span className="ta-due-date"><Clock size={12} /> {m.dueDate ? `Due ${new Date(m.dueDate).toLocaleDateString()}` : 'No deadline'}</span>
                                                    </div>
                                                    <h3 className="ta-card-title">{m.title}</h3>
                                                </div>
                                                <div className="ta-card-right">
                                                    <div className="ta-submission-stats">
                                                        <div className="ta-stats-label">Submissions</div>
                                                        <div className="ta-stats-value">{m.submissionCount || 0} / {enrollments.length}</div>
                                                    </div>
                                                    <ChevronRight size={18} className="ta-card-chevron" />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    <div className="ta-side-col">
                        <div className="theme-card ta-overview-card">
                            <div className="ta-overview-header">
                                <Users size={18} color="var(--accent-blue)" />
                                <h3>Class Overview</h3>
                            </div>
                            <div className="ta-overview-body">
                                <div className="ta-overview-item">
                                    <span>Total Students</span>
                                    <span className="ta-overview-val">{enrollments.length}</span>
                                </div>
                                <div className="ta-overview-item">
                                    <span>Active Assignments</span>
                                    <span className="ta-overview-val">{assignments.length}</span>
                                </div>
                                <div className="ta-overview-footer">
                                    <button onClick={() => navigate(`/teacher/reports?courseId=${selectedCourse}`)} className="btn btn-secondary ta-report-btn">
                                        <ArrowUpRight size={16} /> View Full Report
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showModal && createPortal(
                <div className="modal-overlay" style={{ position: 'fixed', inset: 0, zIndex: 100000, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={() => { setShowModal(false); setEditingId(null); setForm({ content: '', dueDate: '' }); }}>
                    <div className="theme-card" style={{ position: 'relative', width: '100%', maxWidth: '650px', maxHeight: '90vh', borderRadius: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', animation: 'scaleIn 0.3s ease-out' }} onClick={e => e.stopPropagation()}>
                        
                        {/* Header */}
                        <div className="modal-header" style={{ padding: '1.5rem 2rem', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-glass)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-primary)' }}>{editingId ? 'Edit Assignment' : 'New Assignment'}</h3>
                                <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{editingId ? 'Modify assignment details and instructions' : 'Post instructions and materials to your sections'}</p>
                            </div>
                            <button onClick={() => { setShowModal(false); setEditingId(null); setForm({ content: '', dueDate: '' }); }} className="theme-btn-secondary" style={{ borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s', border: 'none' }}><X size={20} color="var(--text-muted)" /></button>
                        </div>

                        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                            {/* Scrollable Body */}
                            <div style={{ flex: 1, overflowY: 'auto', padding: '2rem' }} className="modal-scroll-area">
                                <div style={{ display: 'grid', gap: '2rem' }}>
                                    {/* Assignment Content */}
                                    <div className="form-group">
                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>Title & Instructions</label>
                                        <textarea
                                            style={{ width: '100%', minHeight: '160px', padding: '1rem', borderRadius: '16px', border: '1px solid var(--border-glass)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '0.95rem', resize: 'vertical', transition: 'all 0.2s', outline: 'none' }}
                                            placeholder="Write assignment title here...&#10;Then instructions below..."
                                            value={form.content}
                                            onChange={e => setForm({ ...form, content: e.target.value })}
                                            className="focus-ring"
                                        />
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '2rem' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em' }}>Due Date</label>
                                                <input
                                                    type="datetime-local"
                                                    style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '14px', border: '1px solid var(--border-glass)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none' }}
                                                    value={form.dueDate}
                                                    onChange={e => setForm({ ...form, dueDate: e.target.value })}
                                                    className="focus-ring"
                                                />
                                            </div>

                                            {!editingId && (
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em' }}>Target Sections</label>
                                                    <div style={{ maxHeight: '160px', overflowY: 'auto', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: 16, border: '1px solid var(--border-glass)' }}>
                                                        {courses.map(c => (
                                                            <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem', borderRadius: 10, cursor: 'pointer', transition: 'all 0.2s', background: targetCourses.includes(c.id) ? 'rgba(59,130,246,0.1)' : 'transparent', marginBottom: '4px' }}>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={targetCourses.includes(c.id)}
                                                                    onChange={(e) => {
                                                                        if (e.target.checked) setTargetCourses([...targetCourses, c.id]);
                                                                        else setTargetCourses(targetCourses.filter(id => id !== c.id));
                                                                    }}
                                                                    style={{ width: 18, height: 18, cursor: 'pointer' }}
                                                                />
                                                                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: targetCourses.includes(c.id) ? 'var(--accent-blue)' : 'var(--text-primary)' }}>
                                                                    {c.courseCode} <span style={{ fontWeight: 500, opacity: 0.6 }}>· {c.section}</span>
                                                                </div>
                                                            </label>
                                                        ))}
                                                    </div>
                                                    {targetCourses.length === 0 && <p style={{ fontSize: '0.7rem', color: '#ef4444', fontWeight: 700, marginTop: '8px' }}>* Select at least one section</p>}
                                                </div>
                                            )}
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em' }}>Attachment</label>
                                            <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', border: '2px dashed var(--border-glass)', borderRadius: 20, cursor: 'pointer', background: file ? 'rgba(59,130,246,0.1)' : 'var(--bg-secondary)', transition: 'all 0.2s', flex: 1, minHeight: '180px' }}
                                            >
                                                <input type="file" style={{ display: 'none' }} onChange={e => setFile(e.target.files?.[0] || null)} />
                                                <div style={{ width: 48, height: 48, borderRadius: '50%', background: file ? 'rgba(59,130,246,0.2)' : 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12, boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
                                                    <Upload size={22} color={file ? 'var(--accent-blue)' : 'var(--text-muted)'} />
                                                </div>
                                                <div style={{ fontWeight: 700, color: file ? 'var(--accent-blue)' : 'var(--text-secondary)', fontSize: '0.85rem', textAlign: 'center' }}>{file ? file.name : 'Upload instruction file'}</div>
                                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 6 }}>PDF, DOCX, ZIP or Images (10MB)</div>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="modal-actions" style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', padding: '1.5rem 2rem', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-glass)', flexShrink: 0 }}>
                                <button type="button" onClick={() => { setShowModal(false); setEditingId(null); setForm({ content: '', dueDate: '' }); }} className="btn btn-secondary" style={{ padding: '0.85rem 2rem', borderRadius: 16, fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.05)', width: 'auto' }}>Cancel</button>
                                <button type="submit" disabled={submitting} className="btn btn-primary" style={{ padding: '0.85rem 2.5rem', borderRadius: 16, border: 'none', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer', boxShadow: '0 8px 20px rgba(59,130,246,0.3)', transition: 'all 0.2s', width: 'auto' }}>{submitting ? 'Saving...' : editingId ? 'Update Assignment' : 'Create Assignment'}</button>
                            </div>
                        </form>
                    </div>
                </div>, document.body
            )}

            {/* Full Screen Assignment Detail Modal */}
            {selectedAssignment && createPortal(
                <div className="ta-detail-modal" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999, background: 'var(--bg-card)', display: 'flex', flexDirection: 'column', animation: 'scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
                    {/* Header */}
                    <div className="ta-detail-header" style={{ padding: '1rem 2rem', borderBottom: '1px solid var(--border-glass)', display: 'flex', alignItems: 'center', gap: '2rem', background: 'var(--bg-card)' }}>
                        <button onClick={() => setSelectedAssignment(null)} className="btn btn-secondary ta-detail-back" style={{ borderRadius: 12, padding: '0.6rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, cursor: 'pointer', width: 'auto' }}>
                            <ChevronRight size={18} style={{ transform: 'rotate(180deg)' }} /> <span>Back</span>
                        </button>
                        <div className="ta-detail-title-col" style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>{selectedAssignment.title}</h2>
                                {selectedAssignment.isClosed && <span style={{ fontSize: '0.65rem', fontWeight: 900, background: '#fee2e2', color: '#ef4444', padding: '2px 8px', borderRadius: 6, textTransform: 'uppercase' }}>Closed</span>}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{selectedAssignment.dueDate ? `Due ${new Date(selectedAssignment.dueDate).toLocaleString()}` : 'No deadline'}</div>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                            <button className="btn btn-secondary" onClick={() => { setEditingId(selectedAssignment.id); setForm({ content: selectedAssignment.title + (selectedAssignment.description ? '\n' : '') + (selectedAssignment.description || ''), dueDate: selectedAssignment.dueDate?.substring(0, 16) || '' }); setShowModal(true); setSelectedAssignment(null); }} style={{ padding: '0.5rem 1rem', borderRadius: 10, fontSize: '0.85rem', fontWeight: 700, width: 'auto' }}>Edit</button>
                            <button className={`btn ${selectedAssignment.isClosed ? 'btn-primary' : 'btn-secondary'}`} onClick={() => toggleAssignmentStatus(selectedAssignment)} style={{ padding: '0.5rem 1rem', borderRadius: 10, fontSize: '0.85rem', fontWeight: 700, width: 'auto', color: selectedAssignment.isClosed ? '#fff' : '#ef4444' }}>{selectedAssignment.isClosed ? 'Reopen' : 'Close Now'}</button>
                            <button className="ta-detail-delete" onClick={() => { handleDelete(selectedAssignment.id); setSelectedAssignment(null); }} style={{ border: 'none', background: 'none', color: '#ef4444', fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                <Trash2 size={18} /> <span>Delete</span>
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="ta-detail-content" style={{ flex: 1, overflow: 'hidden', display: 'grid', gridTemplateColumns: '1fr 420px' }}>
                        {/* Left Side: Submissions */}
                        <div className="ta-detail-left" style={{ padding: '2rem', borderRight: '1px solid var(--border-glass)', overflowY: 'auto' }}>
                            <div className="ta-detail-filters" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                <div className="ta-detail-filter-btns" style={{ display: 'flex', gap: '0.5rem' }}>
                                    {(['all', 'submitted', 'missing', 'graded'] as const).map(f => (
                                        <button key={f} className="ta-detail-filter-btn" onClick={() => setSubmissionFilter(f)} style={{ padding: '0.4rem 1rem', borderRadius: 20, border: '1px solid', borderColor: submissionFilter === f ? 'var(--accent-blue)' : 'var(--border-glass)', background: submissionFilter === f ? 'var(--accent-blue)' : 'var(--bg-secondary)', color: submissionFilter === f ? '#fff' : 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase' }}>{f}</button>
                                    ))}
                                </div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>{getFullSubmissionList().length} Students</div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {getFullSubmissionList().map(({ student, submission, status, lateInfo }) => (
                                    <div key={student.id} className="theme-card ta-student-card" style={{ padding: '1rem 1.5rem', borderRadius: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div className="ta-student-info" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            <Avatar firstName={student.firstName} lastName={student.lastName} size={40} />
                                            <div>
                                                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{student.firstName} {student.lastName}</div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase' }}>
                                                    <span style={{ color: status === 'missing' ? '#ef4444' : status === 'late' ? '#f59e0b' : '#10b981' }}>
                                                        {status === 'missing' ? (
                                                            selectedAssignment.dueDate && new Date(selectedAssignment.dueDate) < new Date() ? 'MISSING' : ''
                                                        ) : status}
                                                    </span>
                                                    {lateInfo && (
                                                        <span style={{ color: '#ef4444', background: '#fef2f2', padding: '2px 6px', borderRadius: 4, fontSize: '0.65rem' }}>
                                                            {lateInfo}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="ta-student-actions" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                            {submission ? (
                                                <>
                                                    {submission.fileName && <button onClick={() => handlePreview('submission', submission.id, submission.fileName)} className="btn btn-secondary" style={{ padding: '0.5rem 1rem', borderRadius: 8, fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', width: 'auto' }}><FileText size={14} color="var(--accent-blue)" /> View Work</button>}
                                                    <button onClick={() => { setGradingId(submission.id); setGradeVal(submission.grade || ''); setFeedbackVal(submission.feedback || ''); }} className="btn btn-primary" style={{ padding: '0.5rem 1.25rem', borderRadius: 8, background: status === 'graded' ? 'rgba(59,130,246,0.1)' : 'var(--accent-blue)', color: status === 'graded' ? 'var(--accent-blue)' : '#fff', border: 'none', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer', width: 'auto' }}>{status === 'graded' ? `Grade: ${submission.grade}%` : 'Grade Now'}</button>
                                                </>
                                            ) : (
                                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No submission</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {getFullSubmissionList().length === 0 && (
                                    <div style={{ textAlign: 'center', padding: '3rem', background: 'var(--bg-secondary)', borderRadius: 16, border: '1px dashed var(--border-glass)' }}>
                                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No students match this filter.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Right Side: Instructions & Discussion */}
                        <div className="ta-detail-right" style={{ padding: '2rem', background: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box' }}>
                            <div className="ta-detail-tabs" style={{ display: 'flex', gap: '1.5rem', borderBottom: '1px solid var(--border-glass)', marginBottom: '1.5rem' }}>
                                <button onClick={() => setDetailTab('instructions')} style={{ paddingBottom: '0.75rem', border: 'none', background: 'none', fontSize: '0.85rem', fontWeight: 700, color: detailTab === 'instructions' ? 'var(--accent-blue)' : 'var(--text-muted)', borderBottom: `2px solid ${detailTab === 'instructions' ? 'var(--accent-blue)' : 'transparent'}`, cursor: 'pointer' }}>Instructions</button>
                                <button onClick={() => setDetailTab('submissions')} style={{ paddingBottom: '0.75rem', border: 'none', background: 'none', fontSize: '0.85rem', fontWeight: 700, color: detailTab === 'submissions' ? 'var(--accent-blue)' : 'var(--text-muted)', borderBottom: `2px solid ${detailTab === 'submissions' ? 'var(--accent-blue)' : 'transparent'}`, cursor: 'pointer' }}>Discussion</button>
                            </div>

                            {detailTab === 'instructions' ? (
                                <div style={{ animation: 'fadeIn 0.2s', flex: 1, overflowY: 'auto', paddingRight: '0.5rem' }}>
                                    {selectedAssignment.description && <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap', marginBottom: '1.5rem', padding: '1rem', background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border-glass)' }}>{selectedAssignment.description}</div>}
                                    {selectedAssignment.fileName && <FileCard fileName={selectedAssignment.fileName} fileSize={selectedAssignment.fileSize} onDownload={() => handlePreview('material', selectedAssignment.id, selectedAssignment.fileName)} />}
                                </div>
                            ) : (
                                <div style={{ animation: 'fadeIn 0.2s', display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.85rem', overflowY: 'auto', marginBottom: '1rem', paddingRight: '0.5rem' }}>
                                        {comments.map((c: any) => (
                                            <div key={c.id} style={{ display: 'flex', gap: '0.75rem' }}>
                                                <Avatar firstName={c.user?.firstName} lastName={c.user?.lastName} size={32} />
                                                <div style={{ flex: 1, background: 'var(--bg-card)', padding: '0.75rem', borderRadius: '0 12px 12px 12px', border: '1px solid var(--border-glass)' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                                                        <span style={{ fontWeight: 700, fontSize: '0.75rem', color: 'var(--text-primary)' }}>{c.user?.firstName} {c.user?.lastName}</span>
                                                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{new Date(c.createdAt).toLocaleDateString()}</span>
                                                    </div>
                                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{c.content}</div>
                                                </div>
                                            </div>
                                        ))}
                                        {comments.length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic', marginTop: '2rem' }}>No comments yet.</p>}
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <input className="form-input" style={{ flex: 1, borderRadius: 12, padding: '0.6rem 1rem', fontSize: '0.85rem', outline: 'none' }} placeholder="Add a comment..." value={newComment} onChange={e => setNewComment(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleAddComment(); }} />
                                        <button onClick={handleAddComment} className="btn btn-primary" style={{ borderRadius: 12, padding: '0 1rem', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', width: 'auto' }}>Post</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            , document.body)}

            {/* Inline Grading Modal */}
            {gradingId && createPortal(
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999, background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
                    <div className="theme-card" style={{ width: '100%', maxWidth: 450, borderRadius: 24, boxShadow: '0 20px 40px rgba(0,0,0,0.2)', padding: '2rem' }}>
                        <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>Grade Submission</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Score (0-100)</label>
                                <input type="number" min="0" max="100" className="form-input" style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: 12, fontSize: '1rem', fontWeight: 700, outline: 'none' }} value={gradeVal} onChange={e => setGradeVal(e.target.value)} placeholder="e.g. 95" />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Feedback (Optional)</label>
                                <textarea className="form-input" style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: 12, fontSize: '0.9rem', minHeight: 100, outline: 'none', resize: 'vertical' }} value={feedbackVal} onChange={e => setFeedbackVal(e.target.value)} placeholder="Well done! Very thorough analysis..." />
                            </div>
                            <div className="modal-actions" style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                                <button onClick={() => setGradingId(null)} className="btn btn-secondary" style={{ flex: 1, padding: '0.85rem', borderRadius: 12, fontWeight: 700 }}>Cancel</button>
                                <button onClick={() => gradingId && handleGrade(gradingId, gradeVal, feedbackVal)} className="btn btn-primary" style={{ flex: 1, padding: '0.85rem', borderRadius: 12, fontWeight: 800 }}>Save Grade</button>
                            </div>
                        </div>
                    </div>
                </div>
            , document.body)}

            {/* File Preview Modal */}
            {previewUrl && createPortal(
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999, display: 'flex', flexDirection: 'column', background: 'rgba(15,23,42,0.95)', backdropFilter: 'blur(10px)', animation: 'fadeIn 0.2s' }}>
                    <div className="ta-preview-header" style={{ padding: '1rem 2rem', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#fff' }}>
                        <div className="ta-preview-title-col" style={{ display: 'flex', alignItems: 'center', gap: '1rem', minWidth: 0 }}>
                            <FileText size={20} color="#3b82f6" />
                            <h3 className="ta-preview-title" style={{ margin: 0, fontSize: '1rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{previewName}</h3>
                        </div>
                        <div className="ta-preview-actions" style={{ display: 'flex', gap: '1rem', flexShrink: 0 }}>
                            <button onClick={() => { if (previewUrl) { const a = document.createElement('a'); a.href = previewUrl; a.download = previewName; a.click(); } }} style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', borderRadius: 8, padding: '0.5rem 1rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Download size={16} /> Download</button>
                            <button onClick={() => { if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); } }} style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: 8, padding: '0.5rem 1rem', fontWeight: 700, cursor: 'pointer' }}>Close Preview</button>
                        </div>
                    </div>
                    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '2rem' }}>
                        {previewType === 'image' ? (
                            <img src={previewUrl} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 8, boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }} alt="Preview" />
                        ) : previewType === 'pdf' ? (
                            <iframe src={previewUrl} style={{ width: '100%', height: '100%', border: 'none', background: '#fff', borderRadius: 8, boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }} title="PDF Preview" />
                        ) : (
                            <div style={{ textAlign: 'center', color: '#fff' }}>
                                <FileText size={64} color="#3b82f6" style={{ marginBottom: '1rem' }} />
                                <p>Preview not available for this file type.</p>
                                <button onClick={() => { if (previewUrl) { const a = document.createElement('a'); a.href = previewUrl; a.download = previewName; a.click(); } }} style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, padding: '0.75rem 2rem', fontWeight: 700, cursor: 'pointer', marginTop: '1rem' }}>Download to View</button>
                            </div>
                        )}
                    </div>
                </div>
            , document.body)}

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(15px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes scaleIn {
                    from { opacity: 0; transform: scale(0.985); }
                    to { opacity: 1; transform: scale(1); }
                }
            `}</style>
        </DashboardLayout>
    );
};

export default TeacherAssignments;
