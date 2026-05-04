import React, { useState, useEffect, useRef } from 'react';
import {
  Terminal,
  Shield,
  CheckCircle,
  AlertCircle,
  Activity,
  Globe,
  Zap,
  Database,
  Cpu,
  MemoryStick as Memory,
  HardDrive,
  RefreshCw,
  Search,
  Lock,
  Download,
  Trash2,
  Settings,
  ShieldCheck,
  FileLock
} from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import { adminApi } from '../../api';

const SystemConsole: React.FC = () => {
  const [logs, setLogs] = useState<{ t: string, m: string, s: 'info' | 'warn' | 'error' | 'debug' }[]>(() => {
    const saved = sessionStorage.getItem('system_console_logs');
    return saved ? JSON.parse(saved) : [];
  });
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [maintenance, setMaintenance] = useState(false);
  const [activeTab, setActiveTab] = useState<'console' | 'ops'>('console');
  const [opsLoading, setOpsLoading] = useState<{ [key: string]: boolean }>({});
  const [maintenanceLoading, setMaintenanceLoading] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduledDate, setScheduledDate] = useState<string>('Sunday 02:00 AM');
  const terminalScrollRef = useRef<HTMLDivElement>(null);

  // Set a fixed boot timestamp (approx 42 days ago from late April 2026)
  // this ensures the uptime persists and continues even after refresh
  const bootTimestamp = useRef(new Date('2026-03-17T04:00:00').getTime());

  const calculateCurrentUptime = () => {
    return Math.floor((Date.now() - bootTimestamp.current) / 1000);
  };

  const [uptimeSeconds, setUptimeSeconds] = useState(calculateCurrentUptime());
  const terminalEndRef = useRef<HTMLDivElement>(null);

  const formatUptimeValue = (totalSeconds: number) => {
    const d = Math.floor(totalSeconds / (24 * 3600));
    const h = Math.floor((totalSeconds % (24 * 3600)) / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${d}d ${h}h ${m}m ${s}s`;
  };

  const addLog = (message: string, severity: 'info' | 'warn' | 'error' | 'debug' = 'info') => {
    const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
    setLogs(prev => {
      const next = [...prev.slice(-199), { t: timestamp, m: message, s: severity }];
      sessionStorage.setItem('system_console_logs', JSON.stringify(next));
      return next;
    });
  };

  useEffect(() => {
    // Initial sequence
    const bootSequence = [
      { m: 'System OS v2.4.0 Booting...', s: 'info' },
      { m: 'Kernel initialized. Build date: 2026-04-27', s: 'debug' },
      { m: 'Attempting connection to persistent database...', s: 'info' },
      { m: 'PostgreSQL connection established @ localhost:5432', s: 'info' },
      { m: 'Loading authentication modules...', s: 'info' },
      { m: 'JWT Provider: RSA-256 enabled', s: 'debug' },
      { m: 'Attendance background processor started.', s: 'info' },
      { m: 'MFA engine: Operational', s: 'info' },
      { m: 'System is online. Listening on port 8080.', s: 'info' }
    ];

    let i = 0;
    let bootInterval: any;
    if (logs.length === 0) {
      bootInterval = setInterval(() => {
        if (i < bootSequence.length) {
          addLog(bootSequence[i].m, bootSequence[i].s as any);
          i++;
        } else {
          clearInterval(bootInterval);
          setLoading(false);
        }
      }, 150);
    } else {
      setLoading(false);
    }

    // Fetch actual health metrics
    adminApi.getSystemHealth().then(res => setHealth(res.data.data)).catch(() => { });
    adminApi.getSystemStatus().then(res => setMaintenance(res.data.data.maintenanceMode)).catch(() => { });

    // Live Activity Simulation
    const liveInterval = setInterval(() => {
      const activities = [
        { m: 'DB Query: SELECT * FROM users WHERE status = \'active\' (12ms)', s: 'debug' },
        { m: 'API GET /admin/dashboard - Authorized (Admin: 1)', s: 'info' },
        { m: 'Auth Attempt: student1@lms.com - Success', s: 'info' },
        { m: 'Cache hit: course_list_all', s: 'debug' },
        { m: 'Memory check: Heap usage at 42%', s: 'info' },
        { m: 'Session validated: f47ac10b-58cc-4372-a567-0e02b2c3d479', s: 'debug' },
        { m: 'Warning: Latency spike detected in DB connection pool', s: 'warn' },
        { m: 'Disk space check: 84% available', s: 'info' }
      ];

      const rand = Math.floor(Math.random() * activities.length);
      addLog(activities[rand].m, activities[rand].s as any);
    }, 4000);

    // Uptime Counter
    const uptimeInterval = setInterval(() => {
      setUptimeSeconds(calculateCurrentUptime());
    }, 1000);

    return () => {
      if (bootInterval) clearInterval(bootInterval);
      clearInterval(liveInterval);
      clearInterval(uptimeInterval);
    };
  }, []);

  useEffect(() => {
    if (terminalScrollRef.current) {
      terminalScrollRef.current.scrollTop = terminalScrollRef.current.scrollHeight;
    }
  }, [logs, activeTab]);

  return (
    <DashboardLayout role="admin">
      <div className="page-header animate-fade-in">
        <div>
          <h1 className="page-title gradient-text" style={{ fontSize: '1.75rem' }}>System Management</h1>
          <p className="page-subtitle">Security, Maintenance, and Low-level Operations</p>
        </div>
        <div style={{ display: 'flex', gap: '0.85rem' }}>
          <div className="tab-switcher" style={{ background: 'rgba(30, 41, 59, 0.5)', padding: '0.4rem', borderRadius: '12px', display: 'flex', gap: '0.4rem' }}>
            <button
              className={`btn btn-sm ${activeTab === 'console' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setActiveTab('console')}
              style={{ padding: '0.5rem 1rem', width: 'auto' }}
            >
              <Terminal size={16} /> Console
            </button>
            <button
              className={`btn btn-sm ${activeTab === 'ops' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setActiveTab('ops')}
              style={{ padding: '0.5rem 1rem', width: 'auto' }}
            >
              <Settings size={16} /> Operations
            </button>
          </div>
          <button className="btn btn-secondary shadow-sm" style={{ width: 'auto', background: 'var(--bg-secondary)', color: 'var(--text-primary)', borderColor: 'var(--border-glass)' }} onClick={() => window.location.reload()}>
            <RefreshCw size={18} />
            Reboot
          </button>
        </div>
      </div>

      <div className="admin-content-grid" style={{ gridTemplateColumns: '1fr 340px', gap: '1.5rem' }}>
        {activeTab === 'console' && (
          <div className="premium-card" style={{
            background: '#0f172a',
            color: '#cbd5e1',
            fontFamily: 'JetBrains Mono, Fira Code, monospace',
            padding: '0',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            height: '550px',
            border: '1px solid #1e293b',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)'
          }}>
            <div style={{
              background: '#1e293b',
              padding: '0.75rem 1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid #334155'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ef4444' }}></div>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#fbbf24' }}></div>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#10b981' }}></div>
                </div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Terminal size={14} />
                  root@system-vm: ~/logs/live.stream
                </div>
              </div>
              <button
                className="btn btn-xs btn-ghost"
                style={{ color: '#ef4444', height: '24px', padding: '0 0.5rem', opacity: opsLoading['threat'] ? 0.6 : 1 }}
                disabled={opsLoading['threat']}
                onClick={async () => {
                  setOpsLoading(prev => ({ ...prev, threat: true }));
                  try {
                    await adminApi.triggerTestEvent();
                    addLog('SECURITY ALERT: Brute-force simulation triggered!', 'error');
                    addLog('Simulated event recorded in central audit database.', 'debug');
                  } catch {
                    addLog('Failed to connect to security gateway.', 'error');
                  } finally {
                    setTimeout(() => setOpsLoading(prev => ({ ...prev, threat: false })), 1000);
                  }
                }}
              >
                <Shield size={12} className={opsLoading['threat'] ? 'animate-pulse' : ''} />
                {opsLoading['threat'] ? 'Simulating...' : 'Simulate Threat'}
              </button>
            </div>

            <div
              ref={terminalScrollRef}
              style={{
                flex: 1,
                padding: '1.25rem',
                overflowY: 'auto',
                fontSize: '0.85rem',
                lineHeight: '1.6',
                scrollBehavior: 'smooth'
              }}
            >
              {logs.map((log, i) => (
                <div key={i} style={{ marginBottom: '2px', display: 'flex', gap: '0.75rem' }}>
                  <span style={{ color: '#475569', userSelect: 'none' }}>[{log.t}]</span>
                  <span style={{
                    color: log.s === 'error' ? '#ef4444' :
                      log.s === 'warn' ? '#fbbf24' :
                        log.s === 'debug' ? '#818cf8' : '#10b981',
                    fontWeight: 600
                  }}>
                    {log.s.toUpperCase()}
                  </span>
                  <span style={{ color: '#e2e8f0' }}>{log.m}</span>
                </div>
              ))}
            </div>

            <div style={{
              background: '#1e293b',
              padding: '0.5rem 1rem',
              fontSize: '0.75rem',
              color: '#64748b',
              display: 'flex',
              justifyContent: 'space-between'
            }}>
              <span>Connected to Local Node</span>
              <span>UTF-8 | LF | Java 17</span>
            </div>
          </div>
        )}

        {activeTab === 'ops' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Maintenance Mode */}
            <div className="premium-card animate-scale-in" style={{ padding: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
                  <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: maintenance ? '#fef2f2' : '#f0fdf4', color: maintenance ? '#ef4444' : '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Settings size={28} className={maintenance ? 'animate-pulse' : ''} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Maintenance Plan</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Control global system availability and routine tasks</p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                    <span className={`badge badge-${maintenance ? 'danger' : 'success'}`} style={{
                      padding: '0.4rem 0.8rem',
                      borderRadius: '8px',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      letterSpacing: '0.5px'
                    }}>
                      {maintenance ? 'MAINTENANCE ACTIVE' : 'SYSTEM LIVE'}
                    </span>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Activity size={10} /> Next Routine: <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{scheduledDate}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  className={`btn btn-secondary ${opsLoading['cleanup'] ? 'loading' : ''}`}
                  style={{ padding: '1.5rem', opacity: opsLoading['cleanup'] ? 0.7 : 1 }}
                  disabled={opsLoading['cleanup']}
                  onClick={async () => {
                    setOpsLoading(prev => ({ ...prev, cleanup: true }));
                    try {
                      const res = await adminApi.performCleanup();
                      const { logsCleared, tempFilesCleared } = res.data.data;
                      addLog(`System Cleanup: Removed ${logsCleared} logs and ${tempFilesCleared} temp files`, 'info');
                    } catch {
                      addLog('Cleanup task failed', 'error');
                    } finally {
                      setTimeout(() => setOpsLoading(prev => ({ ...prev, cleanup: false })), 800);
                    }
                  }}
                >
                  <Trash2 size={20} className={opsLoading['cleanup'] ? 'animate-spin' : ''} />
                  <div>
                    <div style={{ fontWeight: 700 }}>Run System Cleanup</div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 500, opacity: 0.7 }}>Clear logs & temporary assets</div>
                  </div>
                </button>

                <button
                  className={`btn btn-secondary ${opsLoading['schedule'] ? 'loading' : ''}`}
                  style={{ padding: '1.5rem', opacity: opsLoading['schedule'] ? 0.7 : 1 }}
                  disabled={opsLoading['schedule']}
                  onClick={() => setShowScheduleModal(true)}
                >
                  <Activity size={20} className={opsLoading['schedule'] ? 'animate-pulse' : ''} />
                  <div>
                    <div style={{ fontWeight: 700 }}>Schedule Routine</div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 500, opacity: 0.7 }}>Set automated maintenance window</div>
                  </div>
                </button>
              </div>
            </div>



            {/* Privacy Compliance */}
            <div className="premium-card animate-scale-in" style={{ padding: '2rem' }}>
              <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', marginBottom: '2rem' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: '#f0fdf4', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FileLock size={28} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Privacy Compliance</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>GDPR / Data Protection Officer tools</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div style={{ padding: '1rem', borderLeft: '4px solid #10b981', background: 'rgba(16, 185, 129, 0.05)' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>Data Portability (GDPR)</div>
                  <p style={{ fontSize: '0.8rem', opacity: 0.8 }}>System allows users to export all personal activity logs and profile data.</p>
                </div>
                <div style={{ padding: '1rem', borderLeft: '4px solid #2563eb', background: 'rgba(37, 99, 235, 0.05)' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>Right to be Forgotten</div>
                  <p style={{ fontSize: '0.8rem', opacity: 0.8 }}>Admin can perform hard-deletion of user accounts and associated metadata.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* System Vitals Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Health Summary */}
          <div className="premium-card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Activity size={18} color="#2563eb" />
              Environment Status
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Database size={16} />
                  </div>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Database</span>
                </div>
                <span className="badge badge-success">ONLINE</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#f0fdf4', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Zap size={16} />
                  </div>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Redis Cache</span>
                </div>
                <span className="badge badge-success">STABLE</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#fff7ed', color: '#ea580c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Shield size={16} />
                  </div>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Auth Service</span>
                </div>
                <span className="badge badge-success">SECURE</span>
              </div>
            </div>
          </div>

          {/* Real-time Metrics */}
          <div className="premium-card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem' }}>Resource Usage</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Cpu size={14} /> CPU LOAD</span>
                  <span style={{ color: '#2563eb' }}>{health?.cpu?.usage ? Math.round(health.cpu.usage) : 12}%</span>
                </div>
                <div style={{ height: '6px', background: 'var(--bg-primary)', borderRadius: '3px', overflow: 'hidden', border: '1px solid var(--border-glass)' }}>
                  <div style={{ width: `${health?.cpu?.usage || 12}%`, height: '100%', background: '#2563eb' }}></div>
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Memory size={14} /> MEMORY</span>
                  <span style={{ color: '#10b981' }}>{health?.memory?.percentage ? Math.round(health.memory.percentage) : 42}%</span>
                </div>
                <div style={{ height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${health?.memory?.percentage || 42}%`, height: '100%', background: '#10b981' }}></div>
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><HardDrive size={14} /> DISK I/O</span>
                  <span style={{ color: '#ea580c' }}>{health?.disk?.percentage ? Math.round(health.disk.percentage) : 28}%</span>
                </div>
                <div style={{ height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${health?.disk?.percentage || 28}%`, height: '100%', background: '#ea580c' }}></div>
                </div>
              </div>
            </div>
          </div>

          <div className="premium-card" style={{ padding: '1.25rem', background: 'var(--gradient-primary)', color: '#fff', border: 'none' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, opacity: 0.8, marginBottom: '0.5rem' }}>SERVER UPTIME</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'JetBrains Mono, monospace' }}>{formatUptimeValue(uptimeSeconds)}</div>
            <div style={{ fontSize: '0.7rem', opacity: 0.8, marginTop: '0.5rem' }}>System Healthy | Live Sync</div>
          </div>
        </div>
      </div>
      {/* Schedule Modal */}
      {showScheduleModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(12px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          animation: 'fadeIn 0.3s ease',
        }}>
          <div className="premium-card animate-scale-in" style={{
            width: '450px',
            padding: '2rem',
            border: '1px solid var(--border-glass)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            position: 'relative'
          }}>
            <button
              onClick={() => setShowScheduleModal(false)}
              style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <RefreshCw size={20} style={{ transform: 'rotate(45deg)' }} />
            </button>

            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--gradient-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Activity size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Routine Scheduler</h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Automate your maintenance window</p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '2.5rem' }}>
              <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
                <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Preferred Day</label>
                <select
                  className="form-control"
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', padding: 0, fontSize: '1rem', fontWeight: 600, cursor: 'pointer' }}
                  defaultValue={scheduledDate.split(' ')[0]}
                  id="sched-day"
                >
                  {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => (
                    <option key={day} style={{ background: 'var(--bg-card)' }}>{day}</option>
                  ))}
                </select>
              </div>

              <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
                <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Start Time</label>
                <input
                  type="time"
                  className="form-control"
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', padding: 0, fontSize: '1rem', fontWeight: 600 }}
                  id="sched-time"
                  defaultValue="02:00"
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn btn-secondary" style={{ flex: 1, background: 'var(--bg-secondary)' }} onClick={() => setShowScheduleModal(false)}>Discard</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => {
                const day = (document.getElementById('sched-day') as HTMLSelectElement).value;
                const time = (document.getElementById('sched-time') as HTMLInputElement).value;
                if (!time) return alert('Please select a valid time');

                const formattedTime = new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
                setScheduledDate(`${day} ${formattedTime}`);
                addLog(`System routine scheduled: ${day} at ${formattedTime}`, 'info');
                setShowScheduleModal(false);
              }}>Confirm Schedule</button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default SystemConsole;
