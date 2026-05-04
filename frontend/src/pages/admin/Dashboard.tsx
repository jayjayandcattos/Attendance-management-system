import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  GraduationCap, 
  BookOpen, 
  ClipboardList, 
  Archive, 
  Trash2, 
  User, 
  Book, 
  FileText,
  Plus,
  ArrowRight,
  TrendingUp,
  Activity,
  Shield,
  LayoutGrid,
  Zap,
  Lock,
  Terminal,
  Settings,
  Database
} from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import { adminApi } from '../../api';

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    adminApi.getDashboard().then(res => {
      setStats(res.data.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const statCards = stats ? [
    { label: 'Total Users', value: stats.totalUsers, icon: <Users size={22} />, color: '#2563eb', bg: '#eff6ff', trend: 'Registered' },
    { label: 'Active Users', value: stats.activeUsers || 0, icon: <Activity size={22} />, color: '#10b981', bg: '#f0fdf4', trend: 'Logged in today' },
    { label: 'Teachers', value: stats.totalTeachers, icon: <GraduationCap size={22} />, color: '#0891b2', bg: '#ecfeff', trend: 'Staff members' },
    { label: 'Students', value: stats.totalStudents, icon: <BookOpen size={22} />, color: '#6366f1', bg: '#eef2ff', trend: 'Learners' },
    { label: 'Total Courses', value: stats.totalCourses || 0, icon: <LayoutGrid size={22} />, color: '#8b5cf6', bg: '#f5f3ff', trend: 'Curriculum' },
    { label: 'Active Courses', value: stats.activeCourses, icon: <ClipboardList size={22} />, color: '#7c3aed', bg: '#f5f3ff', trend: 'Ongoing sessions' },
    { label: 'Archived', value: stats.archivedCourses, icon: <Archive size={22} />, color: '#d97706', bg: '#fffbeb', trend: 'Old data' },
    { label: 'Monitoring', value: 'Live', icon: <Zap size={22} />, color: '#ef4444', bg: '#fef2f2', trend: 'System Status' },
  ] : [];

  const quickActions = [
    { label: 'User Management', desc: 'Control access and roles', icon: <User size={24} />, path: '/admin/users', color: '#2563eb' },
    { label: 'Course Catalog', desc: 'Monitor all classrooms', icon: <Book size={24} />, path: '/admin/courses', color: '#7c3aed' },
    { label: 'System Console', desc: 'Root logs & maintenance', icon: <Terminal size={24} />, path: '/admin/security', color: '#0f172a' },
  ];

  return (
    <DashboardLayout role="admin">
      <div className="page-header animate-fade-in">
        <div>
          <h1 className="page-title gradient-text" style={{ fontSize: '1.75rem' }}>System Overview</h1>
          <p className="page-subtitle">Welcome back, Administrator. Here's what's happening today.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.85rem' }}>
          <button className="btn btn-secondary shadow-sm hover:shadow-md transition-all active:scale-95" style={{ width: 'auto', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} onClick={() => navigate('/admin/analytics')}>
            <Activity size={18} />
            Analytics
          </button>
          <button className="btn btn-primary shadow-sm hover:shadow-md transition-all active:scale-95" style={{ width: 'auto' }} onClick={() => navigate('/admin/users')}>
            <Plus size={18} />
            Add User
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading-screen" style={{ minHeight: '60vh' }}><div className="spinner"></div></div>
      ) : stats && (
        <div className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
          {/* Stats Cards */}
          <div className="admin-stats-grid">
            {statCards.map((card, i) => (
              <div key={i} className="premium-card" style={{ animationDelay: `${i * 0.05}s`, padding: '1.5rem', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div className="admin-stat-icon" style={{ background: 'var(--bg-primary)', color: card.color, margin: 0, width: '46px', height: '46px', borderRadius: '12px' }}>
                      {card.icon}
                    </div>
                    {card.trend && <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.25rem 0.5rem', borderRadius: '20px', background: 'var(--bg-primary)', color: card.color, border: '1px solid var(--border-glass)' }}>{card.trend}</span>}
                  </div>
                  <div className="admin-stat-value" style={{ fontSize: '1.85rem', marginBottom: '0.25rem' }}>{card.value}</div>
                  <div className="admin-stat-label" style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{card.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Main Content Grid */}
          <div className="admin-content-grid" style={{ marginTop: '1.5rem' }}>
            {/* Quick Actions */}
            <div className="premium-card" style={{ padding: '1.75rem' }}>
              <div className="admin-section-header">
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Management Hub</h3>
                <LayoutGrid size={20} color="var(--text-muted)" />
              </div>
              <div className="admin-actions-grid" style={{ gap: '1rem' }}>
                {quickActions.map((action, i) => (
                  <div
                    key={i}
                    className="admin-action-card group"
                    style={{ 
                      background: 'var(--bg-primary)', 
                      border: '1px solid var(--border-glass)',
                      padding: '1.25rem',
                      borderRadius: 'var(--radius-md)',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease'
                    }}
                    onClick={() => navigate(action.path)}
                  >
                    <div className="admin-action-icon" style={{ background: 'var(--bg-secondary)', color: action.color, boxShadow: 'var(--shadow-sm)' }}>
                      {action.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div className="admin-action-title" style={{ fontWeight: 700 }}>{action.label}</div>
                      <div className="admin-action-desc">{action.desc}</div>
                    </div>
                    <span className="admin-action-arrow group-hover:translate-x-1 transition-transform">
                      <ArrowRight size={18} />
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* System Performance */}
            <div className="premium-card" style={{ padding: '1.75rem' }}>
              <div className="admin-section-header">
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Service Health</h3>
                <div className="admin-health-badge">
                  <span className="admin-health-dot"></span>
                  All Systems Optimal
                </div>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                <div className="admin-health-item">
                  <div className="admin-health-label">
                    <span>User Engagement</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 800 }}>
                      {stats.totalUsers > 0 ? Math.round(((stats.activeUsers || 0) / stats.totalUsers) * 100) : 0}%
                    </span>
                  </div>
                  <div className="admin-health-bar-container">
                    <div className="admin-health-bar" style={{
                      width: `${stats.totalUsers > 0 ? Math.min(((stats.activeUsers || 0) / stats.totalUsers) * 100, 100) : 0}%`,
                      background: 'var(--gradient-primary)'
                    }}></div>
                  </div>
                </div>

                <div className="admin-health-item">
                  <div className="admin-health-label">
                    <span>Classroom Activity</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 800 }}>
                      {stats.totalCourses > 0 ? Math.round((stats.activeCourses / stats.totalCourses) * 100) : 0}%
                    </span>
                  </div>
                  <div className="admin-health-bar-container">
                    <div className="admin-health-bar" style={{
                      width: `${stats.totalCourses > 0 ? Math.min((stats.activeCourses / stats.totalCourses) * 100, 100) : 0}%`,
                      background: 'var(--gradient-success)'
                    }}></div>
                  </div>
                </div>

                <div className="admin-health-item">
                  <div className="admin-health-label">
                    <span>API Response Time</span>
                    <span style={{ color: '#10b981', fontWeight: 800 }}>Normal</span>
                  </div>
                  <div style={{ display: 'flex', gap: '4px', height: '24px', alignItems: 'flex-end', marginTop: '4px' }}>
                    {[40, 60, 30, 80, 50, 70, 90, 60, 40, 70, 50, 80].map((h, i) => (
                      <div key={i} className="animate-pulse" style={{ 
                        flex: 1, 
                        height: `${h}%`, 
                        background: i > 8 ? '#10b981' : 'var(--border-glass)', 
                        borderRadius: '2px',
                        animationDelay: `${i * 0.1}s`
                      }}></div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Infrastructure & Security Quick View */}
          <div className="admin-stats-grid" style={{ marginTop: '1.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
            <div className="premium-card animate-scale-in" style={{ padding: '1.5rem', display: 'flex', gap: '1.25rem', alignItems: 'center', cursor: 'pointer' }} onClick={() => navigate('/admin/security')}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#fef2f2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Settings size={24} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Maintenance</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>System Live</div>
                <div style={{ fontSize: '0.75rem', color: '#10b981' }}>● All services running</div>
              </div>
              <ArrowRight size={18} color="var(--text-muted)" />
            </div>

            <div className="premium-card animate-scale-in" style={{ padding: '1.5rem', display: 'flex', gap: '1.25rem', alignItems: 'center', cursor: 'pointer', animationDelay: '0.1s' }} onClick={() => navigate('/admin/security')}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Database size={24} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Backup Strategy</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>Active Snapshot</div>
                <div style={{ fontSize: '0.75rem', color: '#2563eb' }}>Daily Cloud Sync: 100%</div>
              </div>
              <ArrowRight size={18} color="var(--text-muted)" />
            </div>

            <div className="premium-card animate-scale-in" style={{ padding: '1.5rem', display: 'flex', gap: '1.25rem', alignItems: 'center', cursor: 'pointer', animationDelay: '0.2s' }} onClick={() => navigate('/admin/security')}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#f0fdf4', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Lock size={24} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Data Encryption</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>AES-256 Enabled</div>
                <div style={{ fontSize: '0.75rem', color: '#10b981' }}>Compliance: Verified</div>
              </div>
              <ArrowRight size={18} color="var(--text-muted)" />
            </div>
          </div>

          {/* Recent Users Section */}
          <div className="premium-card animate-fade-in" style={{ marginTop: '1.5rem', animationDelay: '0.2s' }}>
            <div className="admin-section-header" style={{ padding: '1.75rem 1.75rem 1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>New Onboardings</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Latest users registered on the platform</p>
              </div>
              <button className="btn btn-sm btn-secondary" style={{ width: 'auto', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                onClick={() => navigate('/admin/users')}>
                View Directory <ArrowRight size={14} />
              </button>
            </div>
            <div className="data-table-wrapper" style={{ border: 'none', padding: '0 1.75rem 1.75rem' }}>
              <table className="data-table">
                <thead>
                  <tr style={{ background: 'transparent' }}>
                    <th style={{ background: 'transparent', paddingLeft: 0 }}>Identity</th>
                    <th style={{ background: 'transparent' }}>Contact</th>
                    <th style={{ background: 'transparent' }}>Permission</th>
                    <th style={{ background: 'transparent' }}>Activity</th>
                    <th style={{ background: 'transparent', textAlign: 'right', paddingRight: 0 }}>Joined Date</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentUsers?.map((u: any, i: number) => (
                    <tr key={u.id} className="hover:bg-slate-800/30 transition-colors" style={{ animationDelay: `${i * 0.05}s` }}>
                      <td style={{ paddingLeft: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                          <div className="admin-table-avatar" style={{
                            width: '40px', height: '40px',
                            background: u.role === 'teacher' ? 'var(--gradient-primary)' :
                              u.role === 'admin' ? 'var(--gradient-danger)' :
                                'var(--gradient-success)'
                          }}>
                            {u.firstName?.[0]}{u.lastName?.[0]}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{u.fullName}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ID: {u.id}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{u.email}</td>
                      <td>
                        <span className={`badge badge-${u.role}`} style={{ 
                          padding: '0.25rem 0.75rem', 
                          borderRadius: '6px', 
                          fontWeight: 700,
                          fontSize: '0.65rem'
                        }}>{u.role.toUpperCase()}</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: u.status === 'active' ? '#10b981' : '#cbd5e1' }}></span>
                          <span style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'capitalize', color: u.status === 'active' ? 'var(--text-primary)' : 'var(--text-muted)' }}>{u.status}</span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'right', paddingRight: 0, color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 500 }}>
                        {new Date(u.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default AdminDashboard;

