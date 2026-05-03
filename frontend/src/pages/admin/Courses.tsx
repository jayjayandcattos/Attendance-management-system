import React, { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { adminApi } from '../../api';
import { Search, X, ChevronRight, Check, AlertTriangle } from 'lucide-react';
import { getCourseBg } from '../../utils/courseBg';

const AdminCourses: React.FC = () => {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadCourses = () => {
    setLoading(true);
    adminApi.getAllCourses(filter || undefined).then(res => {
      setCourses(res.data.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { loadCourses(); }, [filter]);

  const filteredCourses = useMemo(() => {
    if (!search.trim()) return courses;
    const q = search.toLowerCase();
    return courses.filter(c =>
      c.courseName?.toLowerCase().includes(q) ||
      c.courseCode?.toLowerCase().includes(q) ||
      c.teacher?.firstName?.toLowerCase().includes(q) ||
      c.teacher?.lastName?.toLowerCase().includes(q) ||
      c.joinCode?.toLowerCase().includes(q)
    );
  }, [courses, search]);

  const statusStats = useMemo(() => ({
    all: courses.length,
    active: courses.filter(c => c.status === 'active').length,
    archived: courses.filter(c => c.status === 'archived').length,
    deleted: courses.filter(c => c.status === 'deleted').length,
  }), [courses]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const updateCourseStatus = async (course: any, action: 'archive' | 'activate' | 'delete') => {
    try {
      setUpdatingId(course.id);
      if (action === 'archive') {
        await adminApi.archiveCourse(course.id);
        setToast({ type: 'success', text: `"${course.courseName}" archived.` });
      } else if (action === 'activate') {
        await adminApi.activateCourse(course.id);
        setToast({ type: 'success', text: `"${course.courseName}" activated.` });
      } else {
        await adminApi.deleteCourse(course.id);
        setToast({ type: 'success', text: `"${course.courseName}" marked as deleted.` });
      }
      loadCourses();
    } catch (err: any) {
      setToast({ type: 'error', text: err.response?.data?.message || 'Action failed' });
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return { bg: 'rgba(22, 163, 74, 0.1)', color: '#16a34a', border: 'rgba(22, 163, 74, 0.2)' };
      case 'archived': return { bg: 'rgba(217, 119, 6, 0.1)', color: '#d97706', border: 'rgba(217, 119, 6, 0.2)' };
      case 'deleted': return { bg: 'rgba(220, 38, 38, 0.1)', color: '#dc2626', border: 'rgba(220, 38, 38, 0.2)' };
      default: return { bg: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: 'var(--border-glass)' };
    }
  };

  return (
    <DashboardLayout role="admin">
      {toast && (
        <div className={`admin-toast ${toast.type} animate-fade-in`} style={{ top: '1.5rem', right: '1.5rem', transform: 'none' }}>
          <span style={{ background: toast.type === 'success' ? '#10b981' : '#ef4444', color: 'white', padding: '0.25rem', borderRadius: '50%' }}>
            {toast.type === 'success' ? <Check size={14} /> : <AlertTriangle size={14} />}
          </span>
          {toast.text}
        </div>
      )}

      <div className="page-header animate-fade-in">
        <div>
          <h1 className="page-title gradient-text">Curriculum Hub</h1>
          <p className="page-subtitle">Administrative oversight of academic courses and sections</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="admin-filter-bar animate-fade-in" style={{ animationDelay: '0.1s', border: 'none', background: 'transparent' }}>
        <div className="admin-filter-tabs" style={{ padding: '0.35rem', borderRadius: '35px', boxShadow: 'var(--shadow-premium)' }}>
          {[
            { key: '', label: 'All Classrooms', count: statusStats.all },
            { key: 'active', label: 'Active', count: statusStats.active },
            { key: 'archived', label: 'Archived', count: statusStats.archived },
            { key: 'deleted', label: 'Removed', count: statusStats.deleted },
          ].map(tab => (
            <button key={tab.key}
              className={`admin-filter-tab ${filter === tab.key ? 'active' : ''}`}
              onClick={() => setFilter(tab.key)}
              style={{ borderRadius: '30px', padding: '0.6rem 1.25rem', fontSize: '0.85rem' }}>
              {tab.label}
              <span className="admin-filter-count" style={{ background: filter === tab.key ? 'rgba(255,255,255,0.2)' : '#f1f5f9', color: filter === tab.key ? 'white' : '#64748b' }}>{tab.count}</span>
            </button>
          ))}
        </div>
        <div className="admin-search-box focus-within:ring-2 focus-within:ring-blue-100 transition-all shadow-sm" style={{ height: '42px', borderRadius: '12px', border: 'none', boxShadow: 'var(--shadow-premium)', minWidth: '320px' }}>
          <span className="admin-search-icon"><Search size={18} /></span>
          <input type="text" placeholder="Search classrooms, codes, or instructors..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="admin-search-input" />
          {search && <button className="admin-search-clear hover:bg-gray-100 transition-colors" onClick={() => setSearch('')}><X size={16} /></button>}
        </div>
      </div>

      {/* Courses Table */}
      <div className="premium-card animate-fade-in" style={{ animationDelay: '0.2s', padding: '1rem 0' }}>
        <div className="data-table-wrapper" style={{ border: 'none' }}>
          <table className="data-table">
            <thead>
              <tr style={{ background: 'transparent' }}>
                <th style={{ width: '50px', background: 'transparent' }}></th>
                <th style={{ background: 'transparent' }}>Course Identity</th>
                <th style={{ background: 'transparent' }}>Catalog Code</th>
                <th style={{ background: 'transparent' }}>Lead Instructor</th>
                <th style={{ background: 'transparent' }}>Join Token</th>
                <th style={{ background: 'transparent' }}>Lifecyle</th>
                <th style={{ background: 'transparent', paddingRight: '2rem' }}>Created</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '5rem' }}>
                  <div className="spinner" style={{ margin: '0 auto' }}></div>
                </td></tr>
              ) : filteredCourses.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '5rem', color: 'var(--text-muted)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                    <Search size={48} strokeWidth={1} style={{ opacity: 0.3 }} />
                    <div>{search ? `No courses matching "${search}"` : 'No courses found in the curriculum'}</div>
                  </div>
                </td></tr>
              ) : filteredCourses.map(c => {
                const sc = getStatusColor(c.status);
                const isExpanded = expandedId === c.id;
                return (
                  <React.Fragment key={c.id}>
                    <tr className={`clickable-row transition-all duration-200 ${isExpanded ? 'bg-slate-50' : 'hover:bg-slate-50'}`} 
                        onClick={() => setExpandedId(isExpanded ? null : c.id)}
                        style={{ cursor: 'pointer', borderBottom: isExpanded ? 'none' : '1px solid #f1f5f9' }}>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: isExpanded ? 'var(--bg-secondary)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
                          <ChevronRight 
                            size={16} 
                            className={`transition-transform duration-300 ${isExpanded ? 'rotate-90 text-blue-600' : 'text-gray-400'}`} 
                          />
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <div className="shadow-sm" style={{
                            width: 40, height: 40, borderRadius: 12,
                            ...getCourseBg(c.coverColor, 0),
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'white', fontWeight: 800, fontSize: '0.9rem', flexShrink: 0
                          }}>
                            {c.courseName?.[0]}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{c.courseName}</div>
                            {c.section && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>{c.section}</div>}
                          </div>
                        </div>
                      </td>
                      <td><code style={{ background: 'var(--bg-secondary)', padding: '0.3rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>{c.courseCode}</code></td>
                      <td>
                        {c.teacher ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                            <div className="admin-table-avatar shadow-sm" style={{
                              width: 32, height: 32, fontSize: '0.75rem', borderRadius: '10px',
                              background: 'linear-gradient(135deg, #0ea5e9, #0284c7)', fontWeight: 800
                            }}>
                              {c.teacher.firstName?.[0]}{c.teacher.lastName?.[0]}
                            </div>
                            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                              {c.teacher.firstName} {c.teacher.lastName}
                            </span>
                          </div>
                        ) : <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Unassigned</span>}
                      </td>
                      <td>
                        <span className="join-code" style={{ letterSpacing: '1px', fontWeight: 700, fontSize: '0.85rem' }}>{c.joinCode}</span>
                      </td>
                      <td>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          padding: '0.3rem 0.8rem', borderRadius: '20px',
                          fontSize: '0.7rem', fontWeight: 800,
                          background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`,
                          textTransform: 'uppercase'
                        }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: sc.color }}></span>
                          {c.status}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600, paddingRight: '2rem' }}>
                        {new Date(c.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td colSpan={7} style={{ padding: '0 1rem 1rem 4rem' }}>
                          <div className="animate-fade-in" style={{ background: 'var(--bg-primary)', borderRadius: '16px', padding: '1.5rem', border: '1px solid var(--border-glass)' }}>
                            <div className="admin-expanded-grid" style={{ gap: '1.5rem' }}>
                              <div className="admin-expanded-item">
                                <span className="admin-expanded-label" style={{ fontWeight: 700, color: '#64748b', fontSize: '0.7rem', textTransform: 'uppercase' }}>Course Description</span>
                                <span className="admin-expanded-value" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5 }}>{c.description || 'No extended description available for this classroom.'}</span>
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1.5rem', marginTop: '1rem' }}>
                                <div className="admin-expanded-item">
                                  <span className="admin-expanded-label" style={{ fontWeight: 700, color: '#64748b', fontSize: '0.7rem', textTransform: 'uppercase' }}>Academic Schedule</span>
                                  <span className="admin-expanded-value" style={{ fontWeight: 600 }}>{c.schedule || 'Flexi-schedule'}</span>
                                </div>
                                <div className="admin-expanded-item">
                                  <span className="admin-expanded-label" style={{ fontWeight: 700, color: '#64748b', fontSize: '0.7rem', textTransform: 'uppercase' }}>Location/Room</span>
                                  <span className="admin-expanded-value" style={{ fontWeight: 600 }}>{c.room || 'TBD'}</span>
                                </div>
                                <div className="admin-expanded-item">
                                  <span className="admin-expanded-label" style={{ fontWeight: 700, color: '#64748b', fontSize: '0.7rem', textTransform: 'uppercase' }}>Registration Date</span>
                                  <span className="admin-expanded-value" style={{ fontWeight: 600 }}>
                                    {new Date(c.createdAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-glass)', justifyContent: 'flex-end' }}>
                              {c.status === 'active' && (
                                <button
                                  className="btn btn-sm btn-secondary shadow-sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateCourseStatus(c, 'archive');
                                  }}
                                  disabled={updatingId === c.id}
                                  style={{ width: 'auto', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-glass)' }}
                                >
                                  {updatingId === c.id ? 'Processing...' : 'Archive Course'}
                                </button>
                              )}
                              {(c.status === 'archived' || c.status === 'deleted') && (
                                <button
                                  className="btn btn-sm btn-primary shadow-sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateCourseStatus(c, 'activate');
                                  }}
                                  disabled={updatingId === c.id}
                                  style={{ width: 'auto' }}
                                >
                                  {updatingId === c.id ? 'Processing...' : c.status === 'deleted' ? 'Restore Classroom' : 'Re-activate'}
                                </button>
                              )}
                              {c.status !== 'deleted' && (
                                <button
                                  className="btn btn-sm btn-danger shadow-sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateCourseStatus(c, 'delete');
                                  }}
                                  disabled={updatingId === c.id}
                                  style={{ width: 'auto' }}
                                >
                                  {updatingId === c.id ? 'Processing...' : 'Remove Course'}
                                </button>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="admin-table-footer" style={{ border: 'none', color: 'var(--text-muted)', fontWeight: 600, padding: '1.5rem 2rem' }}>
          {filteredCourses.length} academic courses indexed
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminCourses;
