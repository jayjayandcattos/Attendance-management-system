import React, { useRef, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { createPortal } from 'react-dom';
import {
  User,
  Settings,
  Shield,
  X,
  AlertCircle,
  ChevronRight,
  LogOut
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { studentApi, teacherApi } from '../api';
import Modal from './Modal';
import Avatar from './Avatar';
import TopNavbar from './TopNavbar';
import { useTheme } from '../contexts/ThemeContext';
import { AnimatedThemeToggle } from './AnimatedThemeToggle';

interface DashboardLayoutProps {
  children: React.ReactNode;
  role: 'admin' | 'teacher' | 'student';
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  actions?: React.ReactNode;
}

interface NavSection {
  label: string;
  items: { label: string; path: string }[];
}

const navSections: Record<string, NavSection[]> = {
  admin: [
    {
      label: 'MAIN MENU',
      items: [
        { label: 'Dashboard', path: '/admin' },
        { label: 'Users', path: '/admin/users' },
        { label: 'Courses', path: '/admin/courses' },
        { label: 'Audit Log', path: '/admin/audit-log' },
      ],
    },
    {
      label: 'MONITORING',
      items: [
        { label: 'Analytics', path: '/admin/analytics' },
        { label: 'Security Alerts', path: '/admin/security-alerts' },
        { label: 'System Console', path: '/admin/security' },
        { label: 'Cloud Status', path: '/admin/health' },
      ],
    },
  ],
  teacher: [
    {
      label: 'MAIN MENU',
      items: [{ label: 'Dashboard', path: '/teacher' }],
    },
    {
      label: 'TEACHING',
      items: [
        { label: 'My Courses', path: '/teacher/courses' },
        { label: 'Attendance', path: '/teacher/attendance' },
        { label: 'Materials', path: '/teacher/materials' },
        { label: 'Assignments', path: '/teacher/assignments' },
        { label: 'Reports', path: '/teacher/reports' },
      ],
    },
    {
      label: 'COMMUNICATION',
      items: [{ label: 'Messages', path: '/teacher/messages' }],
    },
  ],
  student: [
    {
      label: 'MAIN MENU',
      items: [{ label: 'Dashboard', path: '/student' }],
    },
    {
      label: 'LEARNING',
      items: [
        { label: 'My Courses', path: '/student/courses' },
        { label: 'Attendance', path: '/student/attendance' },
        { label: 'Materials', path: '/student/materials' },
        { label: 'Assignments', path: '/student/assignments' },
      ],
    },
    {
      label: 'COMMUNICATION',
      items: [{ label: 'Messages', path: '/student/messages' }],
    },
  ],
};

const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  role,
  searchQuery,
  onSearchChange,
  actions
}) => {
  const { user, logout, setUser, refreshUser } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [showLogout, setShowLogout] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  // Mobile sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [profileTab, setProfileTab] = useState<'info' | 'security'>('info');
  const [profileForm, setProfileForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    department: (user as any)?.department || '',
  });

  React.useEffect(() => {
    if (user && showProfile) {
      setProfileForm({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        department: (user as any).department || '',
      });
    }
  }, [user, showProfile]);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [modal, setModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'alert' | 'confirm' | 'error' | 'success';
    onConfirm?: () => void;
    confirmLabel?: string;
  }>({ isOpen: false, title: '', message: '', type: 'alert' });

  // Modal event listeners
  React.useEffect(() => {
    const handleAlert = (e: any) => {
      setModal({
        isOpen: true,
        title: e.detail.title,
        message: e.detail.message,
        type: e.detail.type || 'alert',
      });
    };
    const handleConfirm = (e: any) => {
      setModal({
        isOpen: true,
        title: e.detail.title,
        message: e.detail.message,
        type: 'confirm',
        onConfirm: e.detail.onConfirm,
        confirmLabel: e.detail.confirmLabel,
      });
    };
    const handleLogoutTrigger = () => setShowLogout(true);
    window.addEventListener('ff-alert', handleAlert);
    window.addEventListener('ff-confirm', handleConfirm);
    window.addEventListener('ff-logout', handleLogoutTrigger);
    return () => {
      window.removeEventListener('ff-alert', handleAlert);
      window.removeEventListener('ff-confirm', handleConfirm);
      window.removeEventListener('ff-logout', handleLogoutTrigger);
    };
  }, []);

  // Swipe gesture variables
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (window.innerWidth > 900) return; // Only on mobile
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const deltaX = touchEndX - touchStartX.current;
    const deltaY = Math.abs(touchEndY - touchStartY.current);

    // Only trigger if swipe is mostly horizontal
    if (Math.abs(deltaX) > deltaY) {
      setSidebarOpen(prev => {
        // Swipe right to open (from anywhere)
        if (!prev && deltaX > 50) {
          return true;
        }
        // Swipe left to close
        if (prev && deltaX < -50) {
          return false;
        }
        return prev;
      });
    }
  };

  // Accessibility: trap focus and disable scroll when sidebar is open
  React.useEffect(() => {
    if (sidebarOpen) {
      document.body.classList.add('sidebar-open');
      // Trap focus in sidebar
      const sidebar = document.getElementById('sidebar-menu');
      if (sidebar) {
        sidebar.focus();
      }
      const handleTab = (e: KeyboardEvent) => {
        if (!sidebarOpen) return;
        const focusableEls = sidebar?.querySelectorAll<HTMLElement>(
          'a, button, input, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusableEls || focusableEls.length === 0) return;
        const first = focusableEls[0];
        const last = focusableEls[focusableEls.length - 1];
        if (e.key === 'Tab') {
          if (e.shiftKey) {
            if (document.activeElement === first) {
              e.preventDefault();
              last.focus();
            }
          } else {
            if (document.activeElement === last) {
              e.preventDefault();
              first.focus();
            }
          }
        }
        if (e.key === 'Escape') {
          setSidebarOpen(false);
        }
      };
      window.addEventListener('keydown', handleTab);
      return () => {
        document.body.classList.remove('sidebar-open');
        window.removeEventListener('keydown', handleTab);
      };
    } else {
      document.body.classList.remove('sidebar-open');
    }
  }, [sidebarOpen]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const apiForRole = role === 'student' ? studentApi : role === 'teacher' ? teacherApi : null;

  const hasAvatar = typeof user?.avatar === 'string' && user.avatar.trim().length > 0;


  const isActive = (path: string) => {
    if (path === `/${role}`) return location.pathname === path;
    // Use exact match or ensure it's a sub-route (prevents /security matching /security-alerts)
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };


  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiForRole) {
      setProfileMsg({ type: 'error', text: 'Profile editing is only available for students and teachers' });
      return;
    }
    setSaving(true);
    setProfileMsg(null);
    try {
      const res = await apiForRole.updateProfile(profileForm);
      const updatedUser = res.data.data;
      if (updatedUser) {
        const nextUser = { ...user, ...updatedUser } as any;
        setUser(nextUser);
        localStorage.setItem('user', JSON.stringify(nextUser));
      }
      setProfileMsg({ type: 'success', text: 'Profile updated successfully!' });
      await refreshUser();
    } catch (err: any) {
      setProfileMsg({ type: 'error', text: err.response?.data?.message || 'Error updating profile' });
    }
    setSaving(false);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiForRole) {
      setProfileMsg({ type: 'error', text: 'Password update is only available for students and teachers' });
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setProfileMsg({ type: 'error', text: 'New passwords do not match' });
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      setProfileMsg({ type: 'error', text: 'Password must be at least 6 characters' });
      return;
    }
    setSaving(true);
    setProfileMsg(null);
    try {
      await apiForRole.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setProfileMsg({ type: 'success', text: 'Password changed successfully!' });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      setProfileMsg({ type: 'error', text: err.response?.data?.message || 'Error changing password' });
    }
    setSaving(false);
  };

  const handleAvatarUpload = async (file?: File) => {
    if (!file || !apiForRole) return;
    const formData = new FormData();
    formData.append('file', file);

    setUploadingAvatar(true);
    setProfileMsg(null);
    try {
      const res = await apiForRole.uploadAvatar(formData);
      const updatedData = res.data.data;
      if (updatedData) {
        let nextUser;
        if (typeof updatedData === 'string') {
          // If response is just the path
          nextUser = { ...user, avatar: updatedData } as any;
        } else {
          // If response is the updated user object
          nextUser = { ...user, ...updatedData } as any;
        }
        setUser(nextUser);
        localStorage.setItem('user', JSON.stringify(nextUser));
      }
      setProfileMsg({ type: 'success', text: 'Profile photo updated successfully!' });
      // Force a re-fetch of the user data to ensure everything is in sync
      await refreshUser();
    } catch (err: any) {
      setProfileMsg({ type: 'error', text: err.response?.data?.message || 'Error uploading profile photo' });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const deleteAvatar = async () => {
    if (!apiForRole) return;

    setUploadingAvatar(true);
    setProfileMsg(null);
    try {
      const res = await apiForRole.deleteAvatar();
      const updatedUser = res.data.data;
      if (updatedUser) {
        const nextUser = { ...user, ...updatedUser } as any;
        setUser(nextUser);
        localStorage.setItem('user', JSON.stringify(nextUser));
      }
      setProfileMsg({ type: 'success', text: 'Profile photo removed successfully!' });
      await refreshUser();
    } catch (err: any) {
      setProfileMsg({ type: 'error', text: err.response?.data?.message || 'Error removing profile photo' });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleDeleteAvatar = () => {
    if (!hasAvatar || uploadingAvatar) return;
    setModal({
      isOpen: true,
      title: 'Delete Profile Picture',
      message: 'Are you sure you want to remove your profile picture?',
      type: 'confirm',
      onConfirm: deleteAvatar,
      confirmLabel: 'Delete',
    });
  };

  return (
    <div
      className={`dashboard-layout${sidebarOpen ? ' sidebar-open' : ''}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Sidebar overlay for mobile */}
      <div
        className={`sidebar-overlay${sidebarOpen ? ' active' : ''}`}
        style={{
          display: sidebarOpen ? 'block' : 'none',
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.25)',
          zIndex: 2001,
        }}
        onClick={() => setSidebarOpen(false)}
      />

      <aside
        id="sidebar-menu"
        className={`sidebar${sidebarOpen ? ' open' : ''}`}
        style={sidebarOpen ? { zIndex: 2002 } : {}}
        aria-modal="true"
        role="dialog"
        tabIndex={sidebarOpen ? 0 : -1}
        aria-hidden={!sidebarOpen}
      >
        {/* Close button for mobile sidebar */}
        <button
          className="sidebar-close-btn hover:rotate-90 transition-transform"
          aria-label="Close menu"
          onClick={() => setSidebarOpen(false)}
          style={{
            display: 'none',
            position: 'absolute',
            top: 18,
            right: 18,
            background: 'none',
            border: 'none',
            fontSize: 28,
            color: 'var(--text-secondary)',
            zIndex: 202,
            cursor: 'pointer',
          }}
        >
          <X size={24} />
        </button>
        <div className="sidebar-brand">
          <img
            src={theme === 'dark' ? "/WHITEMODE.png" : "/logo.png"}
            alt="AttendEase"
            className="sidebar-logo"
            style={{
              width: '140px',
              height: 'auto',
              objectFit: 'contain',
              display: 'block'
            }}
          />
        </div>
        <nav className="sidebar-nav">
          {navSections[role]?.map((section) => (
            <React.Fragment key={section.label}>
              <div className="sidebar-section-label">{section.label}</div>
              {section.items.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`sidebar-link group ${isActive(item.path) ? 'active' : ''}`}
                  style={{ position: 'relative', overflow: 'hidden' }}
                >
                  <span className="group-hover:translate-x-1 transition-transform">{item.label}</span>
                  {isActive(item.path) && (
                    <ChevronRight size={14} style={{ marginLeft: 'auto', opacity: 0.5 }} />
                  )}
                </Link>
              ))}

            </React.Fragment>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-theme-toggle">
            <AnimatedThemeToggle className="sidebar-toggle" />
            <span className="sidebar-toggle-label">Dark Mode</span>
          </div>
        </div>
      </aside>

      <div className="main-container">
        <TopNavbar
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
          actions={actions}
          onProfileClick={() => setShowProfile(true)}
          onLogoutClick={() => setShowLogout(true)}
          onMenuClick={() => setSidebarOpen(true)}
        />
        <main className="main-content">{children}</main>
      </div>


      {/* Logout Confirmation Modal */}
      {showLogout && (
        <div className="modal-overlay animate-fade-in" style={{
          zIndex: 20000,
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(15, 23, 42, 0.4)',
          backdropFilter: 'blur(8px)'
        }} onClick={() => setShowLogout(false)}>
          <div className="premium-card modal animate-scale-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px', padding: '2.5rem', textAlign: 'center' }}>
            <div className="logout-icon-circle" style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.1)',
              color: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem'
            }}>
              <LogOut size={32} />
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Confirm Sign Out</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
              Are you sure you want to log out? Any unsaved changes may be lost.
            </p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn btn-secondary" onClick={() => setShowLogout(false)} style={{ flex: 1, borderRadius: '12px', fontWeight: 700 }}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleLogout} style={{ flex: 1, borderRadius: '12px', fontWeight: 800, background: '#ef4444', boxShadow: '0 4px 12px rgba(239,68,68,0.2)' }}>
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Edit Modal */}
      {showProfile && createPortal(
        <div className="modal-overlay" style={{ zIndex: 110000, position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)' }} onClick={() => setShowProfile(false)}>
          <div className="theme-card profile-modal" onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '650px', maxHeight: '90vh', borderRadius: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', animation: 'scaleIn 0.3s ease-out' }}>
            <div className="modal-header" style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-glass)' }}>
              <h3 className="modal-title" style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>Edit Profile</h3>
              <button className="modal-close hover:rotate-90 transition-transform" onClick={() => setShowProfile(false)}><X size={20} /></button>
            </div>

            <div className="modal-scroll-area" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '1.5rem' }}>
                <Avatar
                  firstName={user?.firstName}
                  lastName={user?.lastName}
                  avatarUrl={user?.avatar}
                  size={80}
                  className="shadow-md"
                  style={{ marginBottom: '1rem', border: '3px solid var(--bg)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />

                {(role === 'student' || role === 'teacher') && (
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        handleAvatarUpload(file);
                        e.target.value = '';
                      }}
                    />
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ borderRadius: 12, padding: '0.5rem 1rem', fontSize: '0.8rem' }}
                      onClick={() => avatarInputRef.current?.click()}
                      disabled={uploadingAvatar}
                    >
                      <User size={14} style={{ marginRight: '6px' }} />
                      {uploadingAvatar ? 'Uploading...' : 'Upload Photo'}
                    </button>
                    {hasAvatar && (
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        style={{ borderRadius: 12, padding: '0.5rem 1rem', fontSize: '0.8rem' }}
                        onClick={handleDeleteAvatar}
                        disabled={uploadingAvatar}
                      >
                        <X size={14} style={{ marginRight: '6px' }} />
                        Delete
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="profile-tabs" style={{ marginBottom: '1.5rem' }}>
                <button className={`profile-tab ${profileTab === 'info' ? 'active' : ''}`} onClick={() => { setProfileTab('info'); setProfileMsg(null); }}>
                  <Settings size={14} style={{ marginRight: '6px', display: 'inline-block' }} />
                  Personal Info
                </button>
                <button className={`profile-tab ${profileTab === 'security' ? 'active' : ''}`} onClick={() => { setProfileTab('security'); setProfileMsg(null); }}>
                  <Shield size={14} style={{ marginRight: '6px', display: 'inline-block' }} />
                  Security
                </button>
              </div>

              {profileMsg && (
                <div className={`alert alert-${profileMsg.type === 'success' ? 'success' : 'error'}`} style={{ marginBottom: '1.5rem', borderRadius: 12 }}>
                  <AlertCircle size={14} style={{ marginRight: '6px' }} />
                  {profileMsg.text}
                </div>
              )}

              {profileTab === 'info' ? (
                <form id="profile-form" onSubmit={handleProfileUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 700, fontSize: '0.85rem' }}>First Name</label>
                      <input className="form-input" value={profileForm.firstName} onChange={e => setProfileForm({ ...profileForm, firstName: e.target.value })} required style={{ borderRadius: 12 }} />
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 700, fontSize: '0.85rem' }}>Last Name</label>
                      <input className="form-input" value={profileForm.lastName} onChange={e => setProfileForm({ ...profileForm, lastName: e.target.value })} required style={{ borderRadius: 12 }} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 700, fontSize: '0.85rem' }}>Email Address</label>
                    <input className="form-input" value={user?.email || ''} disabled style={{ opacity: 0.6, borderRadius: 12, background: 'var(--code-bg)' }} />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 700, fontSize: '0.85rem' }}>Department</label>
                    <input className="form-input" value={profileForm.department} onChange={e => setProfileForm({ ...profileForm, department: e.target.value })} placeholder="e.g. Computer Science" style={{ borderRadius: 12 }} />
                  </div>
                </form>
              ) : (
                <form id="password-form" onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 700, fontSize: '0.85rem' }}>Current Password</label>
                    <input className="form-input" type="password" value={passwordForm.currentPassword}
                      onChange={e => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} required style={{ borderRadius: 12 }} />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 700, fontSize: '0.85rem' }}>New Password</label>
                    <input className="form-input" type="password" value={passwordForm.newPassword}
                      onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} required style={{ borderRadius: 12 }} />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 700, fontSize: '0.85rem' }}>Confirm New Password</label>
                    <input className="form-input" type="password" value={passwordForm.confirmPassword}
                      onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} required style={{ borderRadius: 12 }} />
                  </div>
                </form>
              )}
            </div>

            <div className="modal-footer" style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid var(--border-glass)', background: 'var(--bg-secondary)', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowProfile(false)} style={{ width: 'auto', borderRadius: 12, fontWeight: 700 }}>Cancel</button>
              <button
                type="submit"
                form={profileTab === 'info' ? "profile-form" : "password-form"}
                className="btn btn-primary"
                style={{ width: 'auto', borderRadius: 12, fontWeight: 800, padding: '0.75rem 1.5rem', background: '#3b82f6', boxShadow: '0 4px 12px rgba(59,130,246,0.2)' }}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>, document.body
      )}

      <Modal
        isOpen={modal.isOpen}
        onClose={() => setModal({ ...modal, isOpen: false })}
        title={modal.title}
        message={modal.message}
        type={modal.type}
        onConfirm={() => {
          if (modal.onConfirm) modal.onConfirm();
          setModal({ ...modal, isOpen: false });
        }}
        confirmLabel={modal.confirmLabel}
      />
    </div>
  );
};

export default DashboardLayout;
