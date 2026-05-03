import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  LayoutGrid,
  List,
  Calendar,
  MapPin,
  X,
  BookOpen,
  ArrowRight,
  LogOut
} from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import { studentApi } from '../../api';
import { useAuth } from '../../auth/AuthContext';
import { showAlert, showConfirm, showApiError } from '../../utils/feedback';
import { getCourseBg, adjustColor } from '../../utils/courseBg';

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

const CATEGORY_LABELS = ['ENROLLED', 'MANDATORY', 'ELECTIVE', 'CORE', 'TRACK', 'GENERAL'];

const getCategory = (idx: number) => CATEGORY_LABELS[idx % CATEGORY_LABELS.length];

const StudentCourses: React.FC = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showJoin, setShowJoin] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [activeTab, setActiveTab] = useState<'active' | 'dropped'>('active');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchCourses = async () => {
    try {
      const res = await studentApi.getCourses();
      setCourses(res.data.data || []);
    } catch (err: any) {
      showApiError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim() || submitting) return;

    setSubmitting(true);
    try {
      const res = await studentApi.joinCourse(joinCode.toUpperCase());
      showAlert('Success', res.data.message || 'Successfully joined the course!', 'success');
      setShowJoin(false);
      setJoinCode('');
      fetchCourses();
    } catch (err: any) {
      showApiError(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLeaveCourse = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    showConfirm('Drop Course', 'Are you sure you want to drop this course? Your attendance records might still remain.', async () => {
      try {
        await studentApi.leaveCourse(id);
        showAlert('Success', 'Course dropped successfully.', 'success');
        fetchCourses();
      } catch (err: any) {
        showApiError(err);
      }
    });
  };


  const filtered = courses.filter((c: any) => {
    if (c.enrollment?.status !== activeTab) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const courseData = c.course;
    return courseData?.courseName?.toLowerCase().includes(q) ||
      courseData?.courseCode?.toLowerCase().includes(q) ||
      courseData?.teacher?.lastName?.toLowerCase().includes(q);
  });

  const coursesActions = (
    <button className="btn btn-primary td-topbar-btn shadow-sm hover:shadow-md transition-all active:scale-95" onClick={() => setShowJoin(true)}>
      <Plus size={16} className="mr-1" /> Join Course
    </button>
  );

  return (
    <DashboardLayout
      role="student"
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      actions={coursesActions}
    >
      {/* ── Page Header ──────────────────────────────────── */}
      <div className="mt-4 mb-6">
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.25rem' }}>My Courses</h1>
        <p className="text-muted text-sm">Track your learning journey and explore your enrolled classes</p>
      </div>

      {/* ── Tabs + View Toggle ────────────────────────────── */}
      <div className="tc-filter-bar mb-6">
        <div className="tc-tabs bg-gray-100 p-1 rounded-lg">
          <button className={`tc-tab ${activeTab === 'active' ? 'active shadow-sm' : ''} transition-all`} onClick={() => setActiveTab('active')}>Active</button>
          <button className={`tc-tab ${activeTab === 'dropped' ? 'active shadow-sm' : ''} transition-all`} onClick={() => setActiveTab('dropped')}>Dropped</button>
        </div>
        <div className="tc-view-toggle">
          <button className={`tc-view-btn ${viewMode === 'grid' ? 'active bg-white shadow-sm' : ''} transition-all`} onClick={() => setViewMode('grid')} title="Grid view">
            <LayoutGrid size={18} />
          </button>
          <button className={`tc-view-btn ${viewMode === 'list' ? 'active bg-white shadow-sm' : ''} transition-all`} onClick={() => setViewMode('list')} title="List view">
            <List size={18} />
          </button>
        </div>
      </div>

      {loading ? <div className="loading-screen"><div className="spinner"></div></div> : (
        <>
          {/* ── Course Grid / List ────────────────────────── */}
          <div className={viewMode === 'grid' ? 'tc-course-grid' : 'tc-course-list'}>
            {filtered.map((item, idx) => {
              const c = item.course;
              return (
                <div key={c.id} className={`${viewMode === 'grid' ? 'tc-card' : 'tc-list-item'} group hover:shadow-lg transition-all cursor-pointer`} onClick={() => navigate(`/student/materials?courseId=${c.id}`)}>
                  {viewMode === 'grid' ? (
                    <>
                      <div className="tc-card-cover overflow-hidden" style={getCourseBg(c.coverColor, idx)}>
                        <span className="tc-category-badge glass transition-all" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', backdropFilter: 'blur(4px)' }}>
                          {getCategory(idx)}
                        </span>
                        <div className="tc-card-actions opacity-0 group-hover:opacity-100 transition-opacity">
                          {activeTab === 'active' && (
                            <button className="tc-action-icon hover:scale-110 transition-transform hover:bg-red-500" title="Drop Course" onClick={(e) => handleLeaveCourse(e, c.id)}>
                              <LogOut size={14} color="white" />
                            </button>
                          )}
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
                            <span className="tc-card-stat-label">INSTRUCTOR</span>
                            <span className="tc-card-stat-value text-gray-700">{c.teacher ? `${c.teacher.firstName} ${c.teacher.lastName}` : 'TBA'}</span>
                          </div>
                          <div className="tc-card-stat">
                            <span className="tc-card-stat-label">ROOM</span>
                            <span className="tc-card-stat-value">{c.room || 'TBA'}</span>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    /* ── List View ──────────────────────────── */
                    <>
                      <div className="tc-list-color" style={{
                        ...getCourseBg(c.coverColor, idx),
                        backgroundSize: 'cover',
                        backgroundImage: c.coverColor?.startsWith('#') ? 'none' : getCourseBg(c.coverColor, idx).backgroundImage
                      }}></div>
                      <div className="tc-list-info flex-grow">
                        <h4 className="group-hover:text-blue-600 transition-colors m-0">{c.courseName}</h4>
                        <div className="flex gap-3 text-xs text-muted mt-1">
                          <span className="font-bold text-gray-700">{c.courseCode}{c.section ? ` · ${c.section}` : ''}</span>
                          <span>•</span>
                          <span className="flex items-center"><Calendar size={12} className="mr-1" /> {c.schedule || 'No schedule'}</span>
                          <span>•</span>
                          <span className="flex items-center"><MapPin size={12} className="mr-1" /> {c.room || 'TBA'}</span>
                        </div>
                      </div>
                      <div className="tc-list-meta text-right mr-6">
                        <span className="tc-list-code block font-semibold text-gray-700">{c.teacher ? `${c.teacher.firstName} ${c.teacher.lastName}` : 'Instructor TBA'}</span>
                      </div>
                      <div className="tc-list-actions opacity-0 group-hover:opacity-100 transition-all flex gap-2">
                        {activeTab === 'active' && (
                          <button className="btn btn-danger btn-sm transition-all shadow-sm" onClick={(e) => handleLeaveCourse(e, c.id)} style={{ width: 'auto' }}>
                            <LogOut size={14} className="mr-1" /> Drop
                          </button>
                        )}
                        <button className="btn btn-primary btn-sm rounded-full p-2" onClick={(e) => { e.stopPropagation(); navigate(`/student/materials?courseId=${c.id}`); }}>
                          <ArrowRight size={16} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}

            {/* ── Empty State / Add Card ────────────────── */}
            {activeTab === 'active' && viewMode === 'grid' && filtered.length > 0 && (
              <div className="tc-add-card group hover:border-blue-300 hover:bg-blue-50/30 transition-all border-dashed border-2" onClick={() => setShowJoin(true)}>
                <div className="tc-add-icon group-hover:scale-110 group-active:scale-95 transition-transform bg-gray-50 border group-hover:bg-white group-hover:border-blue-200">
                  <Plus size={24} className="text-gray-400 group-hover:text-blue-500" />
                </div>
                <h4>Join New Course</h4>
                <p>Have another class to attend? Enter the code provided by your instructor.</p>
                <button className="btn btn-secondary btn-sm mt-2 transition-all active:scale-95" style={{ width: 'auto' }}>Join Course</button>
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
              {!searchQuery && activeTab === 'active' && (
                <button className="btn btn-primary shadow-sm hover:shadow-md transition-all mt-4" style={{ width: 'auto' }} onClick={() => setShowJoin(true)}>
                  <Plus size={18} className="mr-2" />
                  Join Course
                </button>
              )}
              {searchQuery && <button className="btn btn-secondary btn-sm mt-4 mx-auto" style={{ width: 'auto' }} onClick={() => setSearchQuery('')}>Clear Search</button>}
            </div>
          )}
        </>
      )}

      {/* ── Floating Add Button ───────────────────────────── */}
      <button className="tc-fab shadow-lg hover:shadow-xl hover:scale-110 active:scale-90 transition-all rotate-hover" onClick={() => setShowJoin(true)} title="Join Course">
        <Plus size={24} color="white" />
      </button>

      {/* ── Join Course Modal ───────────────────────────── */}
      {showJoin && (
        <div className="modal-overlay" onClick={() => setShowJoin(false)}>
          <div className="modal shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div className="modal-header border-b pb-4">
              <h3 className="modal-title">Join a Classroom</h3>
              <button className="modal-close hover:rotate-90 transition-transform" onClick={() => setShowJoin(false)}><X size={20} /></button>
            </div>
            <div className="mt-6 mb-8 text-center">
              <p className="text-sm text-muted">
                Enter the unique 6-character code provided by your teacher to enroll in their course.
              </p>
            </div>
            <form onSubmit={handleJoin}>
              <div className="form-group">
                <label className="form-label text-[10px] uppercase font-black tracking-widest text-centered text-blue-600 mb-2 block text-center">Instructional Join Code</label>
                <input
                  className="form-input focus:ring-4 focus:ring-blue-100 transition-all border-2"
                  autoFocus
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value.toUpperCase())}
                  required
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '1.75rem',
                    letterSpacing: '0.6rem',
                    textAlign: 'center',
                    padding: '1.25rem',
                    textTransform: 'uppercase',
                    borderRadius: '16px'
                  }}
                  placeholder="EX1234"
                  maxLength={6}
                />
              </div>
              <div className="modal-actions gap-4 mt-8 pt-4 border-t">
                <button type="button" className="btn btn-secondary py-3 flex-1 transition-colors" onClick={() => setShowJoin(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary py-3 flex-1 shadow-sm hover:shadow-md transition-all active:scale-95" disabled={submitting || joinCode.length < 5}>
                  {submitting ? 'Verifying...' : 'Enroll Now'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default StudentCourses;
