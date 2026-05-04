import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import { studentApi, fileApi } from '../../api';
// Removed unused useAuth import
import { showAlert, showApiError } from '../../utils/feedback';
import { FileText, Download, Play, X, Upload, ChevronRight, MessageSquare, Clock, Filter, CheckCircle2, AlertCircle, History, Shield } from 'lucide-react';
import Avatar from '../../components/Avatar';

const FileCard = ({ fileName, fileSize, onDownload }: { fileName: string; fileSize?: number; onDownload: () => void }) => (
    <div onClick={e => { e.stopPropagation(); onDownload(); }}
        className="theme-hover-secondary"
        style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.85rem 1rem',
            background: 'var(--bg-secondary)', borderRadius: 14, border: '1px solid var(--border-glass)', cursor: 'pointer',
            transition: 'all .15s', marginBottom: '0.5rem'
        }}
    >
        <div style={{ width: 40, height: 40, borderRadius: 10, background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <FileText size={18} color="#3b82f6" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fileName}</div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 2 }}>
                {fileSize ? (fileSize > 1048576 ? `${(fileSize / 1048576).toFixed(1)} MB` : `${Math.round(fileSize / 1024)} KB`) : 'File'}
            </div>
        </div>
        <Download size={18} color="#94a3b8" />
    </div>
);

const StudentAssignments: React.FC = () => {
    const navigate = useNavigate();
    const [courses, setCourses] = useState<any[]>([]);
    const [assignments, setAssignments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'urgent' | 'done' | 'overdue'>('all');
    const [submissionsMap, setSubmissionsMap] = useState<Record<number, any>>({});

    const [comments, setComments] = useState<any[]>([]);
    const [newComment, setNewComment] = useState('');
    const [privateComment, setPrivateComment] = useState('');
    const [mySubmission, setMySubmission] = useState<any | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [submitFile, setSubmitFile] = useState<File | null>(null);
    const [submitContent, setSubmitContent] = useState('');
    const [selectedAssignment, setSelectedAssignment] = useState<any | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [previewType, setPreviewType] = useState<'image' | 'pdf' | 'other' | null>(null);
    const [previewName, setPreviewName] = useState('');
    const [detailTab, setDetailTab] = useState<'submission' | 'discussion' | 'private'>('submission');



    const load = async () => {
        setLoading(true);
        try {
            const r = await studentApi.getCourses();
            const data = Array.isArray(r.data?.data) ? r.data.data : [];
            const courseList = data.map((d: any) => d?.course).filter(Boolean);
            setCourses(courseList);
            
            const allPromises = courseList.map((c: any) => studentApi.getMaterials(c.id));
            const results = await Promise.all(allPromises);
            const allAssignments = results.flatMap((res, index) => {
                const materials = Array.isArray(res.data?.data) ? res.data.data : [];
                return materials
                    .filter((m: any) => m.type === 'assignment')
                    .map((m: any) => ({ ...m, course: courseList[index] }));
            });
            allAssignments.sort((a, b) => {
                if (!a.dueDate) return 1;
                if (!b.dueDate) return -1;
                return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
            });
            setAssignments(allAssignments);

            // Parallel fetch submissions to determine "Done" status
            const subPromises = allAssignments.map(a => studentApi.getSubmission(a.id));
            const subResults = await Promise.allSettled(subPromises);
            const subMap: Record<number, any> = {};
            subResults.forEach((res, idx) => {
                if (res.status === 'fulfilled') {
                    subMap[allAssignments[idx].id] = (res.value as any).data.data || null;
                }
            });
            setSubmissionsMap(subMap);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const handleViewAssignment = async (m: any) => {
        setSelectedAssignment(m);
        setMySubmission(null);
        setSubmitFile(null);
        setSubmitContent('');
        setNewComment('');
        setPrivateComment('');
        try {
            const r = await studentApi.getComments(m.id);
            setComments(Array.isArray(r.data?.data) ? r.data.data : []);
        } catch {}
        try { 
            const r = await studentApi.getSubmission(m.id); 
            const sub = r.data.data || null;
            setMySubmission(sub); 
            // Update local map if it changed
            setSubmissionsMap(prev => ({ ...prev, [m.id]: sub }));
        } catch { setMySubmission(null); }
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

    const handlePrivateComment = async () => {
        if (!privateComment.trim() || !selectedAssignment) return;
        try {
            await studentApi.addComment(selectedAssignment.id, { content: privateComment.trim(), isPrivate: true });
            setPrivateComment('');
            const r = await studentApi.getComments(selectedAssignment.id);
            setComments(Array.isArray(r.data?.data) ? r.data.data : []);
        } catch (err: any) { showApiError(err); }
    };

    const handleSubmit = async () => {
        if (!selectedAssignment || submitting) return;
        if (!submitFile && !submitContent.trim()) { showAlert('Error', 'Please attach a file or write a response.', 'error'); return; }
        setSubmitting(true);
        const fd = new FormData();
        fd.append('materialId', selectedAssignment.id.toString());
        if (submitContent.trim()) fd.append('content', submitContent.trim());
        if (submitFile) fd.append('file', submitFile);
        try {
            await studentApi.submitHomework(fd);
            showAlert('Success', 'Assignment turned in!');
            const r = await studentApi.getSubmission(selectedAssignment.id);
            const sub = r.data.data || null;
            setMySubmission(sub);
            setSubmissionsMap(prev => ({ ...prev, [selectedAssignment.id]: sub }));
            setSubmitFile(null);
            setSubmitContent('');
        } catch (err: any) { showApiError(err); } finally { setSubmitting(false); }
    };

    const handleAddComment = async () => {
        if (!newComment.trim() || !selectedAssignment) return;
        try {
            await studentApi.addComment(selectedAssignment.id, { content: newComment.trim(), isPrivate: false });
            setNewComment('');
            const r = await studentApi.getComments(selectedAssignment.id);
            setComments(Array.isArray(r.data?.data) ? r.data.data : []);
        } catch (err: any) { showApiError(err); }
    };

    const filtered = assignments.filter(m => {
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            if (!(m.title?.toLowerCase().includes(q) || m.description?.toLowerCase().includes(q) || m.course?.courseCode?.toLowerCase().includes(q))) return false;
        }

        const isDone = !!submissionsMap[m.id];
        const isUrgent = m.dueDate && new Date(m.dueDate).getTime() - Date.now() < 3 * 24 * 60 * 60 * 1000 && new Date(m.dueDate) > new Date();
        const isPast = m.dueDate && new Date(m.dueDate) < new Date();

        if (statusFilter === 'urgent') return isUrgent && !isDone;
        if (statusFilter === 'overdue') return isPast && !isDone;
        if (statusFilter === 'done') return isDone;
        
        return true;
    });

    return (
        <DashboardLayout 
            role="student" 
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
        >
            {/* Header placeholder - kept empty as we use global TopNavbar */}

            {loading ? (
                <div className="loading-screen" style={{ padding: '5rem 0' }}><div className="spinner" style={{ marginBottom: '1rem' }} /><p style={{ color: '#94a3b8' }}>Loading all assignments...</p></div>
            ) : (
                <div className="sa-assignments-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '2rem' }}>
                    <div>
                        <div style={{ marginBottom: '1.5rem' }}>
                            <div>
                                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.25rem', letterSpacing: '-0.02em' }}>Academic Tasks</h2>
                                <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', margin: '0 0 1.25rem 0' }}>Viewing all tasks across <strong>{courses.length} courses</strong>.</p>
                            </div>
                            
                            {/* Filter Chips */}
                            <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--bg-secondary)', padding: '0.4rem', borderRadius: 14, width: 'fit-content' }}>
                                    {[
                                        { id: 'all', label: 'All', icon: <History size={14} /> },
                                        { id: 'urgent', label: 'Urgent', icon: <Clock size={14} /> },
                                        { id: 'overdue', label: 'Overdue', icon: <AlertCircle size={14} /> },
                                        { id: 'done', label: 'Done', icon: <CheckCircle2 size={14} /> }
                                    ].map(f => (
                                        <button
                                            key={f.id}
                                            onClick={() => setStatusFilter(f.id as any)}
                                            className={`sa-filter-chip ${statusFilter === f.id ? 'active' : ''}`}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '0.5rem',
                                                padding: '0.5rem 1rem', borderRadius: 10, border: 'none',
                                                fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
                                                transition: 'all .2s',
                                            }}
                                        >
                                            {f.icon} {f.label}
                                        </button>
                                    ))}
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {filtered.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '5rem', background: 'var(--bg-secondary)', borderRadius: 24, border: '2px dashed #e2e8f0', animation: 'fadeIn 0.4s ease-out' }}>
                                    <Filter size={48} color="#cbd5e1" style={{ marginBottom: '1rem' }} />
                                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>No tasks found</h3>
                                    <p style={{ color: '#64748b' }}>Try changing your filter or search query.</p>
                                </div>
                            ) : (
                                filtered.map(m => {
                                    const isDone = !!submissionsMap[m.id];
                                    const isUrgent = m.dueDate && new Date(m.dueDate).getTime() - Date.now() < 3 * 24 * 60 * 60 * 1000 && new Date(m.dueDate) > new Date();
                                    const isPast = m.dueDate && new Date(m.dueDate) < new Date();
                                    
                                    return (
                                        <div key={m.id} className="sa-assignment-card" style={{ borderRadius: 16, border: '1px solid var(--border-glass)', overflow: 'hidden', background: 'var(--bg-card)', transition: 'all .3s cubic-bezier(0.4, 0, 0.2, 1)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', animation: 'slideUp 0.4s ease-out forwards' }}>
                                            <div onClick={() => handleViewAssignment(m)} 
                                                className="theme-hover-secondary"
                                                style={{ padding: '1.25rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '1.15rem', borderLeft: `6px solid ${isDone ? '#10b981' : isPast ? '#ef4444' : isUrgent ? '#f97316' : '#3b82f6'}` }}>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 6 }}>
                                                        {(isDone || isPast || isUrgent) && (
                                                            <span style={{ fontSize: '0.6rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', padding: '3px 8px', borderRadius: 6, background: isDone ? '#f0fdf4' : isPast ? '#fef2f2' : isUrgent ? '#fff7ed' : '#eff6ff', color: isDone ? '#10b981' : isPast ? '#dc2626' : isUrgent ? '#ea580c' : '#2563eb' }}>
                                                                {isDone ? 'Done' : isPast ? 'Overdue' : isUrgent ? 'Urgent' : ''}
                                                            </span>
                                                        )}
                                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Clock size={14} /> {m.dueDate ? new Date(m.dueDate).toLocaleDateString() : 'No deadline'}</span>
                                                        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent-blue)', background: 'rgba(59,130,246,0.1)', padding: '3px 10px', borderRadius: 8 }}>{m.course?.courseCode}</span>
                                                    </div>
                                                    <h4 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.title}</h4>
                                                </div>
                                                <ChevronRight size={20} color="#cbd5e1" />
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    <div className="sa-sidebar-column" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div className="sa-sidebar-card" style={{ borderRadius: 24, padding: '1.75rem' }}>
                            <h3 style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '1.5rem' }}>Academic Record</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 600 }}>Total Assigned</span>
                                    <span style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-primary)' }}>{assignments.length}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 600 }}>Courses Enrolled</span>
                                    <span style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-primary)' }}>{courses.length}</span>
                                </div>
                                <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '1.25rem', marginTop: '0.5rem' }}>
                                    <button onClick={() => navigate('/student/courses')} className="sd-link-btn" style={{ width: '100%', padding: '0.85rem', borderRadius: 14, fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer', transition: 'all .2s' }}>View All Courses</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Full Screen Assignment Detail Modal */}
            {selectedAssignment && createPortal(
                <div className="sa-detail-modal-portal" style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'var(--bg-card)', display: 'flex', flexDirection: 'column', animation: 'scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
                    {/* Header */}
                    <div style={{ padding: '0.75rem 2.5rem', borderBottom: '1px solid var(--border-glass)', display: 'flex', alignItems: 'center', gap: '2rem', background: 'var(--bg-card)' }}>
                        <button onClick={() => setSelectedAssignment(null)} style={{ border: 'none', background: 'var(--bg-secondary)', color: 'var(--text-primary)', borderRadius: 10, padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem' }}>
                            <ChevronRight size={16} style={{ transform: 'rotate(180deg)' }} /> Back to Tasks
                        </button>
                        <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: 2 }}>
                                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>{selectedAssignment.title}</h2>
                                <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#3b82f6', background: '#eff6ff', padding: '2px 8px', borderRadius: 6 }}>{selectedAssignment.course?.courseCode}</span>
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{selectedAssignment.dueDate ? `Due ${new Date(selectedAssignment.dueDate).toLocaleString()}` : 'No deadline'}</div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="sa-detail-content" style={{ flex: 1, overflow: 'hidden', display: 'grid', gridTemplateColumns: '1fr 400px' }}>
                        {/* Left Side: Instructions */}
                        <div className="sa-detail-instructions" style={{ padding: '1.5rem 2.5rem', borderRight: '1px solid var(--border-glass)', overflowY: 'auto' }}>
                            <div style={{ marginBottom: '2rem' }}>
                                <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-blue)', borderBottom: '2px solid var(--accent-blue)', display: 'inline-block', paddingBottom: '0.4rem', marginBottom: '1.25rem' }}>Assignment Instructions</h3>
                                {selectedAssignment.description && (
                                    <div className="sad-instruction-box" style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap', marginBottom: '1.25rem', padding: '1.15rem', borderRadius: 12 }}>
                                        {selectedAssignment.description}
                                    </div>
                                )}
                                {selectedAssignment.fileName && (
                                    <FileCard fileName={selectedAssignment.fileName} fileSize={selectedAssignment.fileSize} onDownload={() => handlePreview('material', selectedAssignment.id, selectedAssignment.fileName)} />
                                )}
                            </div>
                        </div>

                        {/* Right Side: Submission & Chats (Tabbed) */}
                        <div className="sa-detail-sidebar" style={{ background: 'var(--bg-secondary)', borderLeft: '1px solid var(--border-glass)', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                            <div className="sad-sidebar-tabs" style={{ display: 'flex', gap: '0.5rem', padding: '1rem', borderBottom: '1px solid var(--border-glass)', flexShrink: 0 }}>
                                <button onClick={() => setDetailTab('submission')} className={`sad-tab ${detailTab === 'submission' ? 'active' : ''}`} style={{ flex: 1, padding: '0.65rem', borderRadius: 10, border: 'none', background: detailTab === 'submission' ? 'var(--accent-blue)' : 'transparent', color: detailTab === 'submission' ? '#fff' : '#94a3b8', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}>Submission</button>
                                <button onClick={() => setDetailTab('discussion')} className={`sad-tab ${detailTab === 'discussion' ? 'active' : ''}`} style={{ flex: 1, padding: '0.65rem', borderRadius: 10, border: 'none', background: detailTab === 'discussion' ? 'var(--accent-blue)' : 'transparent', color: detailTab === 'discussion' ? '#fff' : '#94a3b8', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}>Discussion</button>
                                <button onClick={() => setDetailTab('private')} className={`sad-tab ${detailTab === 'private' ? 'active' : ''}`} style={{ flex: 1, padding: '0.65rem', borderRadius: 10, border: 'none', background: detailTab === 'private' ? 'var(--accent-blue)' : 'transparent', color: detailTab === 'private' ? '#fff' : '#94a3b8', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}>Private</button>
                            </div>

                            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                                {detailTab === 'submission' && (
                                    <div style={{ padding: '1.5rem', animation: 'fadeIn 0.2s' }}>
                                        <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '1.25rem' }}>Your Submission</h4>
                                        {mySubmission ? (
                                            <div style={{ background: 'var(--bg-card)', borderRadius: 16, padding: '1.25rem', border: '1px solid var(--border-glass)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                                    <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', padding: '4px 10px', borderRadius: 6, background: mySubmission.status === 'graded' ? '#f0fdf4' : '#eff6ff', color: mySubmission.status === 'graded' ? '#16a34a' : '#3b82f6' }}>{mySubmission.status}</span>
                                                    {mySubmission.grade !== null && <div style={{ fontSize: '1.25rem', fontWeight: 900 }}>{mySubmission.grade}<span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>/100</span></div>}
                                                </div>
                                                {mySubmission.fileName && <FileCard fileName={mySubmission.fileName} fileSize={mySubmission.fileSize} onDownload={() => handlePreview('submission', mySubmission.id, mySubmission.fileName)} />}
                                                {mySubmission.content && <div style={{ fontSize: '0.82rem', color: '#475569', background: 'var(--bg-secondary)', padding: '1rem', borderRadius: 12, marginTop: '1rem', fontStyle: 'italic', border: '1px solid var(--border-glass)' }}>"{mySubmission.content}"</div>}
                                                {mySubmission.feedback && <div style={{ marginTop: '1.25rem', padding: '1.15rem', borderRadius: 14, background: '#fffbeb', border: '1px solid #fef3c7', fontSize: '0.82rem', color: '#92400e' }}><strong>Instructor Feedback:</strong><br/>{mySubmission.feedback}</div>}
                                            </div>
                                        ) : selectedAssignment.isClosed ? (
                                            <div style={{ textAlign: 'center', padding: '2rem 1rem', background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border-glass)' }}>
                                                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 48, height: 48, borderRadius: '50%', background: '#fef2f2', color: '#ef4444', marginBottom: '1rem' }}>
                                                    <X size={24} />
                                                </div>
                                                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>Assignment Officially Closed</h4>
                                                <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>The professor is no longer accepting submissions for this task.</p>
                                            </div>
                                        ) : (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                                <textarea style={{ width: '100%', border: '1px solid var(--border-glass)', borderRadius: 12, padding: '1rem', fontSize: '0.85rem', minHeight: 120, outline: 'none', resize: 'none', background: 'var(--bg-card)' }} placeholder="Type your answer or response here..." value={submitContent} onChange={e => setSubmitContent(e.target.value)} />
                                                <div style={{ position: 'relative' }}>
                                                    {submitFile ? (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0.75rem', background: 'var(--bg-card)', borderRadius: 12, border: '1px solid #3b82f6', boxShadow: '0 4px 6px rgba(59,130,246,0.1)' }}>
                                                            <FileText size={16} color="#3b82f6" />
                                                            <span style={{ fontSize: '0.8rem', flex: 1, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis' }}>{submitFile.name}</span>
                                                            <button onClick={() => setSubmitFile(null)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}><X size={16} /></button>
                                                        </div>
                                                    ) : (
                                                        <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1.5rem 1rem', border: '2px dashed #e2e8f0', borderRadius: 16, cursor: 'pointer', background: 'var(--bg-card)', gap: '0.5rem', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.borderColor = '#3b82f6'} onMouseLeave={e => e.currentTarget.style.borderColor = '#e2e8f0'}>
                                                            <input type="file" style={{ display: 'none' }} onChange={e => setSubmitFile(e.target.files?.[0] || null)} />
                                                            <Upload size={20} color="#3b82f6" />
                                                            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>Attach Files</span>
                                                            <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>PDF, DOCX, or Images</span>
                                                        </label>
                                                    )}
                                                </div>
                                                <button onClick={handleSubmit} disabled={submitting || (!submitContent.trim() && !submitFile)} style={{ width: '100%', padding: '0.9rem', background: '#000', color: '#fff', border: 'none', borderRadius: 12, fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s' }}>{submitting ? 'Processing...' : 'Turn In Work'}</button>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {detailTab === 'discussion' && (
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '1.5rem', animation: 'fadeIn 0.2s', overflow: 'hidden' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
                                            <MessageSquare size={16} color="#3b82f6" />
                                            <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Class Discussion</h4>
                                        </div>
                                        <div style={{ flex: 1, overflowY: 'auto', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem', paddingRight: '0.5rem' }}>
                                            {comments.filter(c => !c.isPrivate).map((c: any) => (
                                                <div key={c.id} style={{ display: 'flex', gap: '0.75rem' }}>
                                                    <Avatar firstName={c.user?.firstName} lastName={c.user?.lastName} size={28} />
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: 2 }}>
                                                            <span style={{ fontWeight: 700, fontSize: '0.75rem', color: 'var(--text-primary)' }}>{c.user?.firstName} {c.user?.lastName}</span>
                                                            <span style={{ fontSize: '0.6rem', color: '#94a3b8' }}>{new Date(c.createdAt).toLocaleDateString()}</span>
                                                        </div>
                                                        <div style={{ fontSize: '0.8rem', color: '#475569', lineHeight: 1.5, background: 'var(--bg-card)', padding: '0.65rem 0.85rem', borderRadius: '0 12px 12px 12px', border: '1px solid var(--border-glass)' }}>{c.content}</div>
                                                    </div>
                                                </div>
                                            ))}
                                            {comments.filter(c => !c.isPrivate).length === 0 && <p style={{ textAlign: 'center', padding: '2rem', fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>No discussion yet.</p>}
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.5rem', padding: '1rem', background: 'var(--bg-card)', borderTop: '1px solid var(--border-glass)', flexShrink: 0 }}>
                                            <input style={{ flex: 1, border: '1px solid var(--border-glass)', borderRadius: 12, padding: '0.65rem 1rem', fontSize: '0.85rem', outline: 'none', background: 'var(--bg-card)' }} placeholder="Ask a question..." value={newComment} onChange={e => setNewComment(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleAddComment(); }} />
                                            <button onClick={handleAddComment} disabled={!newComment.trim()} style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 12, padding: '0 1.25rem', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}>Post</button>
                                        </div>
                                    </div>
                                )}

                                {detailTab === 'private' && (
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '1.5rem', animation: 'fadeIn 0.2s', overflow: 'hidden' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
                                            <Shield size={16} color="#d97706" />
                                            <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Private Chat</h4>
                                        </div>
                                        <div style={{ flex: 1, overflowY: 'auto', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem', paddingRight: '0.5rem' }}>
                                            {comments.filter(c => c.isPrivate).map((c: any) => {
                                                const isT = (c.user?.role || '').toLowerCase().includes('teacher');
                                                return (
                                                    <div key={c.id} style={{ display: 'flex', gap: '0.65rem', flexDirection: isT ? 'row' : 'row-reverse' }}>
                                                        <Avatar firstName={c.user?.firstName} lastName={c.user?.lastName} size={28} />
                                                        <div style={{ flex: 1, background: isT ? '#fff' : '#3b82f6', color: isT ? '#334155' : '#fff', padding: '0.65rem 0.85rem', borderRadius: isT ? '0 12px 12px 12px' : '12px 0 12px 12px', border: isT ? '1px solid #e2e8f0' : 'none', fontSize: '0.8rem' }}>
                                                            <div style={{ fontSize: '0.6rem', fontWeight: 800, marginBottom: 2, opacity: 0.8 }}>{isT ? 'Instructor' : 'You'}</div>
                                                            <div>{c.content}</div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            {comments.filter(c => c.isPrivate).length === 0 && <p style={{ textAlign: 'center', padding: '2rem', fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>Messages here are only seen by you and your instructor.</p>}
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.5rem', padding: '1rem', background: 'var(--bg-card)', borderTop: '1px solid var(--border-glass)', flexShrink: 0 }}>
                                            <input style={{ flex: 1, border: '1px solid var(--border-glass)', borderRadius: 12, padding: '0.65rem 1rem', fontSize: '0.85rem', outline: 'none', background: 'var(--bg-card)' }} placeholder="Message instructor..." value={privateComment} onChange={e => setPrivateComment(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handlePrivateComment(); }} />
                                            <button onClick={handlePrivateComment} disabled={!privateComment.trim()} style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 12, width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Play size={18} fill="#fff" /></button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* File Preview Modal */}
            {previewUrl && createPortal(
                <div style={{ position: 'fixed', inset: 0, zIndex: 100001, display: 'flex', flexDirection: 'column', background: 'rgba(15,23,42,0.95)', backdropFilter: 'blur(10px)', animation: 'fadeIn 0.2s' }}>
                    <div style={{ padding: '1rem 2.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#fff' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0, flex: 1 }}>
                            <FileText size={20} color="#3b82f6" style={{ flexShrink: 0 }} />
                            <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{previewName}</h3>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                            <button onClick={() => { const a = document.createElement('a'); a.href = previewUrl; a.download = previewName; a.click(); }} style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', borderRadius: 8, padding: '0.5rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Download"><Download size={20} /></button>
                            <button onClick={() => { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }} style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: 8, padding: '0.5rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Close"><X size={20} /></button>
                        </div>
                    </div>
                    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '2rem' }}>
                        {previewType === 'image' ? (
                            <img src={previewUrl} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 8, boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }} alt="Preview" />
                        ) : previewType === 'pdf' ? (
                            <iframe src={previewUrl} style={{ width: '100%', height: '100%', border: 'none', background: 'var(--bg-card)', borderRadius: 8, boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }} title="PDF Preview" />
                        ) : (
                            <div style={{ textAlign: 'center', color: '#fff' }}>
                                <FileText size={64} color="#3b82f6" style={{ marginBottom: '1rem' }} />
                                <p>Preview not available for this file type.</p>
                                <button onClick={() => { const a = document.createElement('a'); a.href = previewUrl; a.download = previewName; a.click(); }} style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, padding: '0.75rem 2rem', fontWeight: 700, cursor: 'pointer', marginTop: '1rem' }}>Download to View</button>
                            </div>
                        )}
                    </div>
                </div>,
                document.body
            )}

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

export default StudentAssignments;
