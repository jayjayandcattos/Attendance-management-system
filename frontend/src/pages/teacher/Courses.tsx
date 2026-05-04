import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  LayoutGrid,
  List,
  Edit2,
  Trash2,
  Calendar,
  MapPin,
  X,
  Archive,
  RefreshCw,
  Clock,
  BookOpen,
  ArrowRight,
  Palette,
  Image as ImageIcon,
  Upload
} from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import { teacherApi } from '../../api';
import { useAuth } from '../../auth/AuthContext';
import { showAlert, showConfirm, showApiError } from '../../utils/feedback';
import { getCourseBg, adjustColor } from '../../utils/courseBg';


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
  'linear-gradient(135deg, #FF6B4A 0%, #FF4757 100%)',
  'linear-gradient(135deg, #F4A742 0%, #E8950A 100%)',
  'linear-gradient(135deg, #7B68EE 0%, #6C5CE7 100%)',
  'linear-gradient(135deg, #4285F4 0%, #2563EB 100%)',
  'linear-gradient(135deg, #34A853 0%, #059669 100%)',
  'linear-gradient(135deg, #00BCD4 0%, #0891B2 100%)',
  'linear-gradient(135deg, #9C27B0 0%, #7C3AED 100%)',
  'linear-gradient(135deg, #FF5722 0%, #DC2626 100%)',
];

const CATEGORY_LABELS = ['ONGOING', 'SOCIAL SCIENCES', 'LEADERSHIP', 'ENGINEERING', 'COMPUTER SCIENCE', 'BUSINESS', 'EDUCATION', 'GENERAL'];

const getCategory = (idx: number) => CATEGORY_LABELS[idx % CATEGORY_LABELS.length];

function formatTime12(t: string): string {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${m.toString().padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

const BG_COLORS = ['#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981', '#06b6d4', '#475569'];
const BG_IMAGES = [
  '36796dba4d1a7b0ec7a1a4b28a5b3e98.jpg', '57a01220653971e4e2cff753fa272479.jpg', '669a8eed28456200f4ff95097a0db078.jpg',
  '6a0ee617bb9e1b0a5ab9ac0e44a7e51f.jpg', '6e7f2df1ec42a44deade0468b5c3c416.jpg', '7003c41241e8b565589c6abd02fd21fa.jpg',
  '7733001d7a1780e69890b4a77ac10f0b.jpg', '8b98a2f4a3e3f30f5635fcad59270443.jpg', '97cb2c4c04f03958bda41b2fee0ce67c.jpg',
  '9a7f7abda033d415c34ca89055d0d495.jpg', 'bd21141e01f48c911e1c42ffb1cd1f5a.jpg', 'c3c77155748f15ffee61cbc1fe9705d6.jpg',
  'd9b29715b473dd0a5b37e1bc9929907b.jpg', 'dffd9d976bdfd65a869e322a0e4f32b0.jpg', 'e4f0270d3e1ce8b4aeefe601076f4c2e.jpg',
  'e9a477fe6444851b976195d99fd45349.jpg', 'f271614b55f4c150ca1e1517c6486b2d.jpg', 'f9780f1993b3a4a6d643c3ddccc6e300.jpg',
  'ff9235cd827885e439aef1bb9e153754.jpg'
];

const TeacherCourses: React.FC = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [form, setForm] = useState({ courseCode: '', courseName: '', section: '', room: '', coverColor: '#3b82f6' });
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:30');
  const [showNewSession, setShowNewSession] = useState(false);
  const [sessionForm, setSessionForm] = useState({ courseId: '', sessionTitle: '', duration: '10', allowLate: true, lateMinutes: '15' });
  const [coverTab, setCoverTab] = useState<'colors' | 'presets' | 'upload'>('colors');
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const loadCourses = () => {
    teacherApi.getCourses().then(res => { setCourses(res.data.data || []); setLoading(false); }).catch(() => setLoading(false));
  };

  useEffect(() => { loadCourses(); }, []);

  const buildSchedule = () => selectedDays.length === 0 ? '' : `${selectedDays.join('')} ${formatTime12(startTime)} - ${formatTime12(endTime)}`;
  const toggleDay = (day: string) => setSelectedDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { ...form, schedule: buildSchedule() };
      if (isEditing && editingId) {
        await teacherApi.updateCourse(editingId, payload);
        showAlert('Success', 'Course updated successfully!', 'success');
      } else {
        await teacherApi.createCourse(payload);
        showAlert('Success', 'Course created successfully!', 'success');
      }
      setShowModal(false);
      resetForm();
      loadCourses();
    } catch (err: any) { showApiError(err); }
  };

  const resetForm = () => {
    setIsEditing(false);
    setEditingId(null);
    setForm({ courseCode: '', courseName: '', section: '', room: '', coverColor: '#3b82f6' });
    setSelectedDays([]); setStartTime('09:00'); setEndTime('10:30');
  };

  const openEditModal = (e: React.MouseEvent, course: any) => {
    e.stopPropagation();
    setIsEditing(true);
    setEditingId(course.id);
    setForm({
      courseCode: course.courseCode || '',
      courseName: course.courseName || '',
      section: course.section || '',
      room: course.room || '',
      coverColor: course.coverColor || '#3b82f6'
    });
    
    // Parse schedule: "MTWThF 9:00 AM - 10:30 AM" → selected days
    if (course.schedule) {
      const spaceIdx = course.schedule.indexOf(' ');
      let dayPart = spaceIdx > -1 ? course.schedule.substring(0, spaceIdx) : course.schedule;
      const foundDays: string[] = [];
      // Check longer keys first, remove matched to prevent 'T' matching inside 'Th'
      [...DAYS].sort((a, b) => b.key.length - a.key.length).forEach(d => {
        if (dayPart.includes(d.key)) {
          foundDays.push(d.key);
          dayPart = dayPart.replace(d.key, '');
        }
      });
      setSelectedDays(foundDays);
    }
    
    setShowModal(true);
  };

  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setForm({ ...form, coverColor: reader.result as string });
    };
    reader.readAsDataURL(file);
  };

  const handleArchive = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    showConfirm('Archive Course', 'Archive this course? Students won\'t be able to see it.', async () => {
      try { await teacherApi.archiveCourse(id); showAlert('Success', 'Course archived.', 'success'); loadCourses(); }
      catch (err: any) { showApiError(err); }
    });
  };

  const handleUnarchive = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    try { await teacherApi.unarchiveCourse(id); showAlert('Success', 'Course unarchived.', 'success'); loadCourses(); }
    catch (err: any) { showApiError(err); }
  };

  const handleDelete = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    showConfirm('Delete Course', 'Are you sure? This cannot be undone.', async () => {
      try { await teacherApi.deleteCourse(id); showAlert('Deleted', 'Course removed.', 'error'); loadCourses(); }
      catch (err: any) { showApiError(err); }
    });
  };

  const handleNewSession = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await teacherApi.createAttendance({ courseId: Number(sessionForm.courseId), sessionTitle: sessionForm.sessionTitle, duration: Number(sessionForm.duration), allowLate: sessionForm.allowLate, lateMinutes: Number(sessionForm.lateMinutes) });
      setShowNewSession(false);
      setSessionForm({ courseId: '', sessionTitle: '', duration: '10', allowLate: true, lateMinutes: '15' });
      const code = res.data?.data?.attendanceCode || '';
      showAlert('Success', `Session started! Code: ${code}`, 'success');
    } catch (err: any) { showApiError(err); }
  };



  const filtered = courses.filter(c => {
    if (c.status !== activeTab) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return c.courseName?.toLowerCase().includes(q) || c.courseCode?.toLowerCase().includes(q) || c.section?.toLowerCase().includes(q);
  });

  const coursesActions = (
    <>
      <button className="btn btn-secondary td-topbar-btn transition-all active:scale-95" onClick={() => setShowNewSession(true)}>
        <Plus size={16} className="mr-1" /> New Session
      </button>
      <button className="btn btn-primary td-topbar-btn shadow-sm hover:shadow-md transition-all active:scale-95" onClick={() => { resetForm(); setShowModal(true); }}>
        <Plus size={16} className="mr-1" /> Create Course
      </button>
    </>
  );

  return (
    <DashboardLayout
      role="teacher"
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      actions={coursesActions}
    >
      {/* ── Page Header ──────────────────────────────────── */}
      <div className="mt-4 mb-6">
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.25rem' }}>My Courses</h1>
        <p className="text-muted text-sm">Manage your academic curriculum and course materials</p>
      </div>

      {/* ── Tabs + View Toggle ────────────────────────────── */}
      <div className="tc-filter-bar mb-6">
        <div className="tc-tabs bg-gray-100 p-1 rounded-lg">
          <button className={`tc-tab ${activeTab === 'active' ? 'active shadow-sm' : ''} transition-all`} onClick={() => setActiveTab('active')}>Active</button>
          <button className={`tc-tab ${activeTab === 'archived' ? 'active shadow-sm' : ''} transition-all`} onClick={() => setActiveTab('archived')}>Archived</button>
        </div>
        <div className="tc-view-toggle">
          <button className={`tc-view-btn ${viewMode === 'grid' ? 'active' : ''} transition-all`} onClick={() => setViewMode('grid')} title="Grid view">
            <LayoutGrid size={18} />
          </button>
          <button className={`tc-view-btn ${viewMode === 'list' ? 'active' : ''} transition-all`} onClick={() => setViewMode('list')} title="List view">
            <List size={18} />
          </button>
        </div>
      </div>

      {loading ? <div className="loading-screen"><div className="spinner"></div></div> : (
        <>
          {/* ── Course Grid / List ────────────────────────── */}
          <div className={viewMode === 'grid' ? 'tc-course-grid' : 'tc-course-list'}>
            {filtered.map((c, idx) => (
              <div key={c.id} className={`${viewMode === 'grid' ? 'tc-card' : 'tc-list-item'} group hover:shadow-lg transition-all cursor-pointer`} onClick={() => navigate(`/teacher/materials?courseId=${c.id}`)}>
                {viewMode === 'grid' ? (
                  <>
                    <div className="tc-card-cover overflow-hidden" style={getCourseBg(c.coverColor, idx)}>

                      <div className="tc-card-actions opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="tc-action-icon hover:scale-110 transition-transform" title="Edit" onClick={(e) => openEditModal(e, c)}>
                          <Edit2 size={14} color="white" />
                        </button>
                        <button className="tc-action-icon hover:scale-110 transition-transform hover:bg-red-500" title="Delete/Archive" onClick={(e) => activeTab === 'active' ? handleArchive(e, c.id) : handleDelete(e, c.id)}>
                          <Trash2 size={14} color="white" />
                        </button>
                      </div>
                      <div className="tc-card-schedule bg-black/20 backdrop-blur-sm px-2 py-1 rounded text-[10px] uppercase font-bold tracking-wider">
                        <Calendar size={12} className="mr-1 inline-block mb-0.5" />
                        {c.schedule || 'No schedule'}
                      </div>
                    </div>
                    <div className="tc-card-body">
                      <h4 className="group-hover:text-blue-600 transition-colors">{c.courseName}</h4>
                      <p className="tc-card-desc">{c.description || (c.courseCode + (c.section ? ` · ${c.section}` : ''))}</p>
                      <div className="tc-card-footer border-t pt-3 mt-3">
                        <div className="tc-card-stat">
                          <span className="tc-card-stat-label">JOIN CODE</span>
                          <span className="tc-card-stat-value tc-code font-mono text-blue-600 font-bold">{c.joinCode}</span>
                        </div>
                        <div className="tc-card-stat">
                          <span className="tc-card-stat-label">STUDENTS</span>
                          <span className="tc-card-stat-value">{c.enrollmentCount || '0'}</span>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  /* ── List View ──────────────────────────── */
                  <>
                    <div className="tc-list-color" style={{
                      ...getCourseBg(c.coverColor, idx),
                      backgroundSize: '100% 100%'
                    }}></div>
                    <div className="tc-list-info flex-grow">
                      <h4 className="group-hover:text-blue-600 transition-colors m-0">{c.courseName}</h4>
                      <div className="flex gap-3 text-xs text-muted mt-1">
                        <span className="font-bold text-gray-700">{c.courseCode}{c.section ? ` · ${c.section}` : ''}</span>
                        <span>•</span>
                        <span className="flex items-center"><Calendar size={12} className="mr-1" /> {c.schedule || 'No schedule'}</span>
                      </div>
                    </div>
                    <div className="tc-list-meta text-right mr-6">
                      <span className="tc-list-code block font-mono font-bold text-blue-600">{c.joinCode}</span>
                      <span className="tc-list-students text-xs text-muted">{c.enrollmentCount || '0'} students</span>
                    </div>
                    <div className="tc-list-actions opacity-0 group-hover:opacity-100 transition-all flex gap-2">
                      <button className="btn btn-secondary btn-sm transition-all hover:bg-gray-200" title="Edit" onClick={(e) => openEditModal(e, c)} style={{ width: 'auto' }}>
                        <Edit2 size={14} className="mr-1" /> Edit
                      </button>
                      {activeTab === 'active' ? (
                        <button className="btn btn-secondary btn-sm transition-all hover:bg-gray-200" onClick={(e) => handleArchive(e, c.id)} style={{ width: 'auto' }}>
                          <Archive size={14} className="mr-1" /> Archive
                        </button>
                      ) : (
                        <button className="btn btn-secondary btn-sm transition-all hover:bg-gray-100" onClick={(e) => handleUnarchive(e, c.id)} style={{ width: 'auto' }}>
                          <RefreshCw size={14} className="mr-1" /> Unarchive
                        </button>
                      )}
                      <button className="btn btn-danger btn-sm transition-all shadow-sm" onClick={(e) => handleDelete(e, c.id)} style={{ width: 'auto' }}>
                        <Trash2 size={14} className="mr-1" /> Delete
                      </button>
                      <button className="btn btn-primary btn-sm rounded-full p-2" onClick={(e) => { e.stopPropagation(); navigate(`/teacher/materials?courseId=${c.id}`); }}>
                        <ArrowRight size={16} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}

            {/* ── Empty State / Add Card ────────────────── */}
            {activeTab === 'active' && viewMode === 'grid' && (
              <div className="tc-add-card group hover:border-blue-300 hover:bg-blue-50/30 transition-all border-dashed border-2" onClick={() => { resetForm(); setShowModal(true); }}>
                <div className="tc-add-icon group-hover:scale-110 group-active:scale-95 transition-transform bg-gray-50 border group-hover:bg-white group-hover:border-blue-200">
                  <Plus size={24} className="text-gray-400 group-hover:text-blue-500" />
                </div>
                <h4>Expand Curriculum</h4>
                <p>Ready to start a new academic journey? Create a course to begin tracking.</p>
                <button className="btn btn-secondary btn-sm mt-2 transition-all active:scale-95" style={{ width: 'auto' }}>Get Started</button>
              </div>
            )}
          </div>
          {filtered.length === 0 && (
            <div className="td-empty-sessions" style={{ padding: '4rem 2rem' }}>
              <div className="bg-gray-50 p-6 rounded-2xl inline-block mb-4">
                <BookOpen size={48} className="text-gray-300" />
              </div>
              <h3 className="text-lg font-bold text-gray-700">No {activeTab} courses found</h3>
              <p className="text-muted mt-1">{searchQuery ? `No results for "${searchQuery}"` : `You don't have any ${activeTab} courses yet.`}</p>
              {searchQuery && <button className="btn btn-secondary btn-sm mt-4 mx-auto" style={{ width: 'auto' }} onClick={() => setSearchQuery('')}>Clear Search</button>}
            </div>
          )}
        </>
      )}

      {/* ── Floating Add Button ───────────────────────────── */}
      <button className="tc-fab shadow-lg hover:shadow-xl hover:scale-110 active:scale-90 transition-all rotate-hover" onClick={() => { resetForm(); setShowModal(true); }} title="Create Course">
        <Plus size={24} color="white" />
      </button>

      {/* ── Create Course Modal ───────────────────────────── */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="theme-card" style={{ width: '100%', maxWidth: '600px', borderRadius: '24px', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ padding: '1.5rem', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-glass)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="modal-title" style={{ margin: 0, fontWeight: 900, color: 'var(--text-primary)' }}>{isEditing ? 'Edit Course' : 'Create New Course'}</h3>
              <button className="theme-btn-secondary" style={{ border: 'none', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleCreate} style={{ padding: '1.5rem', maxHeight: '80vh', overflowY: 'auto' }} className="modal-scroll-area">
              <div className="form-group"><label className="form-label">Course Name</label><input className="form-input focus:ring-2 focus:ring-blue-100 transition-all" value={form.courseName} onChange={e => setForm({ ...form, courseName: e.target.value })} required placeholder="Introduction to Programming" /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group"><label className="form-label">Course Code</label><input className="form-input font-mono focus:ring-2 focus:ring-blue-100 transition-all" value={form.courseCode} onChange={e => setForm({ ...form, courseCode: e.target.value })} required placeholder="CS101" /></div>
                <div className="form-group"><label className="form-label">Section</label><input className="form-input focus:ring-2 focus:ring-blue-100 transition-all" value={form.section} onChange={e => setForm({ ...form, section: e.target.value })} placeholder="Section A" /></div>
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
              <div className="form-group"><label className="form-label">Room</label><div className="relative"><MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input className="form-input pl-10 focus:ring-2 focus:ring-blue-100 transition-all" value={form.room} onChange={e => setForm({ ...form, room: e.target.value })} placeholder="Room 301" /></div></div>

              <div className="form-group">
                <label className="form-label">Course Cover</label>
                <div className="cover-preview" style={getCourseBg(form.coverColor || '#3b82f6', 0)}>
                  <div style={{ zIndex: 1, textAlign: 'center' }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 800 }}>{form.courseName || 'Course Name'}</div>
                    <div style={{ fontSize: '0.7rem', opacity: 0.8 }}>{form.courseCode || 'CODE101'}</div>
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
                        className={`color-option ${form.coverColor === color ? 'active' : ''}`}
                        style={{ background: color }}
                        onClick={() => setForm({ ...form, coverColor: color })}
                      />
                    ))}
                  </div>
                )}

                {coverTab === 'presets' && (
                  <div className="cover-options-grid">
                    {BG_IMAGES.map(img => (
                      <div
                        key={img}
                        className={`image-option ${form.coverColor === `/bg/${img}` ? 'active' : ''}`}
                        style={{ backgroundImage: `url(/bg/${img})` }}
                        onClick={() => setForm({ ...form, coverColor: `/bg/${img}` })}
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
                <button type="button" className="btn btn-secondary transition-colors" onClick={() => setShowModal(false)} style={{ width: 'auto' }}>Cancel</button>
                <button type="submit" className="btn btn-primary shadow-sm hover:shadow-md transition-all active:scale-95" style={{ width: 'auto' }}>
                  {isEditing ? 'Save Changes' : 'Create Course'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── New Session Modal ──────────────────────────────── */}
      {showNewSession && (
        <div className="modal-overlay" onClick={() => setShowNewSession(false)}>
          <div className="theme-card" style={{ width: '100%', maxWidth: '500px', borderRadius: '24px', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ padding: '1.5rem', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-glass)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="modal-title" style={{ margin: 0, fontWeight: 900, color: 'var(--text-primary)' }}>Start Attendance Session</h3>
              <button className="theme-btn-secondary" style={{ border: 'none', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowNewSession(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleNewSession} style={{ padding: '1.5rem', maxHeight: '80vh', overflowY: 'auto' }} className="modal-scroll-area">
              <div className="form-group"><label className="form-label">Course</label>
                <select className="form-input focus:ring-2 focus:ring-blue-100 transition-all" value={sessionForm.courseId} onChange={e => setSessionForm({ ...sessionForm, courseId: e.target.value })} required>
                  <option value="">Select course...</option>
                  {courses.filter(c => c.status === 'active').map(c => <option key={c.id} value={c.id}>{c.courseCode} {c.section ? `- ${c.section}` : ''}</option>)}
                </select>
              </div>
              <div className="form-group"><label className="form-label">Session Title (optional)</label><input className="form-input focus:ring-2 focus:ring-blue-100 transition-all" value={sessionForm.sessionTitle} onChange={e => setSessionForm({ ...sessionForm, sessionTitle: e.target.value })} placeholder="e.g. Week 5 Lecture" /></div>
              <div className="form-group"><label className="form-label">Duration (minutes)</label><div className="relative"><Clock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input className="form-input pl-10 focus:ring-2 focus:ring-blue-100 transition-all" type="number" min="1" max="120" value={sessionForm.duration} onChange={e => setSessionForm({ ...sessionForm, duration: e.target.value })} /></div></div>
              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem', marginBottom: sessionForm.allowLate ? '0.5rem' : '1rem' }}>
                <input type="checkbox" id="allowLate" checked={sessionForm.allowLate} onChange={e => setSessionForm({ ...sessionForm, allowLate: e.target.checked })} style={{ width: '1rem', height: '1rem', cursor: 'pointer' }} />
                <label htmlFor="allowLate" className="form-label" style={{ marginBottom: 0, cursor: 'pointer' }}>Enable Late System</label>
              </div>
              {sessionForm.allowLate && (
                <div className="form-group">
                  <label className="form-label">Mark as Late after (minutes)</label>
                  <input className="form-input focus:ring-2 focus:ring-blue-100 transition-all" type="number" min="1" value={sessionForm.lateMinutes} onChange={e => setSessionForm({ ...sessionForm, lateMinutes: e.target.value })} />
                </div>
              )}
              <div className="modal-actions" style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary transition-colors" onClick={() => setShowNewSession(false)} style={{ width: 'auto' }}>Cancel</button>
                <button type="submit" className="btn btn-primary shadow-sm hover:shadow-md transition-all active:scale-95" style={{ width: 'auto' }}>
                  <Plus size={16} className="mr-1" /> Start Session Now
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default TeacherCourses;
