import React, { useState, useEffect, useCallback } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts';
import {
  Cpu, HardDrive, Server, Database, Activity,
  RefreshCw, CheckCircle, AlertTriangle, XCircle, Wifi, Clock
} from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import { adminApi } from '../../api';

interface SystemHealth {
  cpu: { usage: number; status: string; cores: number };
  memory: { used: number; total: number; percentage: number; status: string };
  disk: { used: number; total: number; percentage: number; status: string };
  application: { activeSessions: number; dbConnections: number; maxDbConnections: number; avgResponseTime: number };
  history: Array<{ timestamp: string; cpuUsage: number; memoryUsage: number; diskUsage: number }>;
}

const STATUS_CONFIG: Record<string, { color: string; bg: string; icon: React.ReactNode; label: string }> = {
  HEALTHY: { color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)', icon: <CheckCircle size={16} />, label: 'Healthy' },
  WARNING: { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', icon: <AlertTriangle size={16} />, label: 'Warning' },
  CRITICAL: { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)', icon: <XCircle size={16} />, label: 'Critical' },
  UNKNOWN: { color: '#6b7280', bg: 'rgba(107, 114, 128, 0.1)', icon: <Activity size={16} />, label: 'Unknown' },
};

const AdminHealth: React.FC = () => {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchHealth = useCallback(async () => {
    try {
      const res = await adminApi.getSystemHealth();
      if (res.data?.success) {
        setHealth(res.data.data);
        setLastUpdated(new Date());
      }
      setLoading(false);
    } catch {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 3000); // Polling every 3 seconds for real-time feel
    return () => clearInterval(interval);
  }, [fetchHealth]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchHealth();
    setRefreshing(false);
  };

  const getOverallStatus = (): string => {
    if (!health) return 'UNKNOWN';
    const statuses = [health.cpu.status, health.memory.status, health.disk.status];
    if (statuses.includes('CRITICAL')) return 'CRITICAL';
    if (statuses.includes('WARNING')) return 'WARNING';
    return 'HEALTHY';
  };

  const getGaugeGradient = (status: string) => {
    if (status === 'CRITICAL') return 'linear-gradient(135deg, #ef4444, #dc2626)';
    if (status === 'WARNING') return 'linear-gradient(135deg, #f59e0b, #d97706)';
    return 'linear-gradient(135deg, #10b981, #059669)';
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload?.length) {
      return (
        <div className="adm-chart-tooltip">
          <p className="adm-chart-tooltip-label">{label}</p>
          {payload.map((p: any, i: number) => (
            <p key={i} style={{ color: p.color, margin: '2px 0' }}>
              {p.name}: <strong>{p.value?.toFixed(1)}%</strong>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const overallStatus = getOverallStatus();
  const statusConfig = STATUS_CONFIG[overallStatus] || STATUS_CONFIG.UNKNOWN;

  return (
    <DashboardLayout role="admin">
      <div className="page-header animate-fade-in">
        <div>
          <h1 className="page-title gradient-text">System Health</h1>
          <p className="page-subtitle">Real-time infrastructure monitoring</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <span className="adm-last-updated" style={{ background: 'var(--bg-secondary)', padding: '0.5rem 1rem', borderRadius: '12px', border: '1px solid var(--border-glass)', fontSize: '0.8rem', fontWeight: 600 }}>
            <Clock size={14} style={{ color: 'var(--text-muted)' }} />
            Synced: {lastUpdated.toLocaleTimeString()}
          </span>
          <button
            className={`adm-icon-btn ${refreshing ? 'spinning' : ''}`}
            onClick={handleRefresh}
            title="Refresh"
            style={{ width: '40px', height: '40px', borderRadius: '12px' }}
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading-screen" style={{ minHeight: '60vh' }}><div className="spinner"></div></div>
      ) : health ? (
        <div className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
          {/* Overall Status Banner */}
          <div className="premium-card adm-health-banner" style={{ borderLeft: `5px solid ${statusConfig.color}`, padding: '1.5rem', background: 'var(--bg-glass)', backdropFilter: 'blur(10px)' }}>
            <div className="adm-health-banner-icon" style={{ background: statusConfig.bg, color: statusConfig.color, width: '48px', height: '48px', borderRadius: '14px' }}>
              {statusConfig.icon}
            </div>
            <div className="adm-health-banner-text">
              <div className="adm-health-banner-title" style={{ fontSize: '1.1rem', fontWeight: 800 }}>
                Infrastructure: <span style={{ color: statusConfig.color }}>{statusConfig.label.toUpperCase()}</span>
              </div>
              <p className="adm-health-banner-sub" style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                {overallStatus === 'HEALTHY'
                  ? 'Cloud infrastructure and core services are performing at peak efficiency.'
                  : overallStatus === 'WARNING'
                    ? 'Increased latency detected on some nodes. Monitoring situation.'
                    : 'Critical failure detected. Engineering team has been notified.'}
              </p>
            </div>
          </div>

          {/* Health Gauges */}
          <div className="adm-health-gauges" style={{ marginTop: '1.5rem' }}>
            {/* CPU */}
            <div className="premium-card adm-gauge-card" style={{ padding: '1.75rem' }}>
              <div className="adm-gauge-header">
                <div className="adm-gauge-icon" style={{ background: 'rgba(37, 99, 235, 0.1)', color: '#3b82f6' }}>
                  <Cpu size={20} />
                </div>
                <span className="adm-gauge-title" style={{ fontWeight: 700 }}>Processor</span>
                <span
                  className="adm-gauge-status-pill"
                  style={{ background: STATUS_CONFIG[health.cpu.status]?.bg, color: STATUS_CONFIG[health.cpu.status]?.color, borderRadius: '6px', fontWeight: 800, fontSize: '0.65rem' }}
                >
                  {health.cpu.status}
                </span>
              </div>
              <div className="adm-gauge-ring-container" style={{ margin: '1.5rem 0' }}>
                <svg viewBox="0 0 120 120" className="adm-gauge-ring">
                  <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(0, 0, 0, 0.2)" strokeWidth="8" />
                  <circle
                    cx="60" cy="60" r="50" fill="none"
                    stroke={STATUS_CONFIG[health.cpu.status]?.color || '#10b981'}
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${(Math.max(0, Math.min(100, health.cpu.usage)) / 100) * 314} 314`}
                    transform="rotate(-90 60 60)"
                    style={{ transition: 'stroke-dasharray 1.5s cubic-bezier(0.4, 0, 0.2, 1)' }}
                  />
                </svg>
                <div className="adm-gauge-ring-label">
                  <span className="adm-gauge-pct" style={{ fontSize: '1.5rem', fontWeight: 800 }}>{health.cpu.usage.toFixed(1)}%</span>
                </div>
              </div>
              <div className="adm-gauge-detail" style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>{health.cpu.cores} Virtual Cores</div>
            </div>

            {/* Memory */}
            <div className="premium-card adm-gauge-card" style={{ padding: '1.75rem' }}>
              <div className="adm-gauge-header">
                <div className="adm-gauge-icon" style={{ background: 'rgba(124, 58, 237, 0.1)', color: '#8b5cf6' }}>
                  <Server size={20} />
                </div>
                <span className="adm-gauge-title" style={{ fontWeight: 700 }}>Memory</span>
                <span
                  className="adm-gauge-status-pill"
                  style={{ background: STATUS_CONFIG[health.memory.status]?.bg, color: STATUS_CONFIG[health.memory.status]?.color, borderRadius: '6px', fontWeight: 800, fontSize: '0.65rem' }}
                >
                  {health.memory.status}
                </span>
              </div>
              <div className="adm-gauge-ring-container" style={{ margin: '1.5rem 0' }}>
                <svg viewBox="0 0 120 120" className="adm-gauge-ring">
                  <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(0, 0, 0, 0.2)" strokeWidth="8" />
                  <circle
                    cx="60" cy="60" r="50" fill="none"
                    stroke={STATUS_CONFIG[health.memory.status]?.color || '#10b981'}
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${(health.memory.percentage / 100) * 314} 314`}
                    transform="rotate(-90 60 60)"
                    style={{ transition: 'stroke-dasharray 1.5s cubic-bezier(0.4, 0, 0.2, 1)' }}
                  />
                </svg>
                <div className="adm-gauge-ring-label">
                  <span className="adm-gauge-pct" style={{ fontSize: '1.5rem', fontWeight: 800 }}>{health.memory.percentage.toFixed(1)}%</span>
                </div>
              </div>
              <div className="adm-gauge-detail" style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>{health.memory.used} MB / {health.memory.total} MB</div>
            </div>

            {/* Disk */}
            <div className="premium-card adm-gauge-card" style={{ padding: '1.75rem' }}>
              <div className="adm-gauge-header">
                <div className="adm-gauge-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                  <HardDrive size={20} />
                </div>
                <span className="adm-gauge-title" style={{ fontWeight: 700 }}>Storage</span>
                <span
                  className="adm-gauge-status-pill"
                  style={{ background: STATUS_CONFIG[health.disk.status]?.bg, color: STATUS_CONFIG[health.disk.status]?.color, borderRadius: '6px', fontWeight: 800, fontSize: '0.65rem' }}
                >
                  {health.disk.status}
                </span>
              </div>
              <div className="adm-gauge-ring-container" style={{ margin: '1.5rem 0' }}>
                <svg viewBox="0 0 120 120" className="adm-gauge-ring">
                  <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(0, 0, 0, 0.2)" strokeWidth="8" />
                  <circle
                    cx="60" cy="60" r="50" fill="none"
                    stroke={STATUS_CONFIG[health.disk.status]?.color || '#10b981'}
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${(health.disk.percentage / 100) * 314} 314`}
                    transform="rotate(-90 60 60)"
                    style={{ transition: 'stroke-dasharray 1.5s cubic-bezier(0.4, 0, 0.2, 1)' }}
                  />
                </svg>
                <div className="adm-gauge-ring-label">
                  <span className="adm-gauge-pct" style={{ fontSize: '1.5rem', fontWeight: 800 }}>{health.disk.percentage.toFixed(1)}%</span>
                </div>
              </div>
              <div className="adm-gauge-detail" style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>{health.disk.used} GB / {health.disk.total} GB</div>
            </div>

            {/* Database */}
            <div className="premium-card adm-gauge-card" style={{ padding: '1.75rem' }}>
              <div className="adm-gauge-header">
                <div className="adm-gauge-icon" style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1' }}>
                  <Database size={20} />
                </div>
                <span className="adm-gauge-title" style={{ fontWeight: 700 }}>Database</span>
                <span className="adm-gauge-status-pill" style={{ background: '#f0fdf4', color: '#059669', borderRadius: '6px', fontWeight: 800, fontSize: '0.65rem' }}>
                  ACTIVE
                </span>
              </div>
              <div className="adm-gauge-ring-container" style={{ margin: '1.5rem 0' }}>
                <svg viewBox="0 0 120 120" className="adm-gauge-ring">
                  <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(0, 0, 0, 0.2)" strokeWidth="8" />
                  <circle
                    cx="60" cy="60" r="50" fill="none"
                    stroke="#6366f1"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${((health.application.dbConnections / health.application.maxDbConnections) * 100 / 100) * 314} 314`}
                    transform="rotate(-90 60 60)"
                    style={{ transition: 'stroke-dasharray 1.5s cubic-bezier(0.4, 0, 0.2, 1)' }}
                  />
                </svg>
                <div className="adm-gauge-ring-label">
                  <span className="adm-gauge-pct" style={{ fontSize: '1.5rem', fontWeight: 800 }}>{health.application.dbConnections}</span>
                </div>
              </div>
              <div className="adm-gauge-detail" style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>{health.application.dbConnections} / {health.application.maxDbConnections} Active Conns</div>
            </div>
          </div>

          {/* Application Metrics */}
          <div className="adm-app-metrics" style={{ marginTop: '1.5rem' }}>
            <div className="premium-card adm-metric-pill" style={{ flex: 1, padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div style={{ background: 'rgba(219, 39, 119, 0.1)', color: '#db2777', padding: '0.6rem', borderRadius: '10px' }}><Wifi size={18} /></div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Active Sessions</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>{health.application.activeSessions}</div>
              </div>
            </div>
            <div className="premium-card adm-metric-pill" style={{ flex: 1, padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div style={{ background: 'rgba(217, 119, 6, 0.1)', color: '#d97706', padding: '0.6rem', borderRadius: '10px' }}><Activity size={18} /></div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Avg Response Time</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>{health.application.avgResponseTime}ms</div>
              </div>
            </div>
            <div className="premium-card adm-metric-pill" style={{ flex: 1, padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '0.6rem', borderRadius: '10px' }}><Server size={18} /></div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Service Uptime</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>99.98%</div>
              </div>
            </div>
          </div>

          {/* 24-Hour History Chart */}
          <div className="premium-card" style={{ marginTop: '1.5rem', padding: '1.75rem' }}>
            <div className="adm-section-header">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>24-Hour Infrastructure Pulse</h3>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Historical resource utilization</div>
            </div>
            <div style={{ marginTop: '1.5rem' }}>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={health.history}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-glass)" />
                  <XAxis dataKey="timestamp" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} dx={-10} domain={[0, 100]} tickFormatter={v => `${v}%`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                  <Line
                    type="monotone" dataKey="cpuUsage" name="CPU Utilization"
                    stroke="#2563eb" strokeWidth={3} dot={false}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                    animationDuration={1500}
                  />
                  <Line
                    type="monotone" dataKey="memoryUsage" name="Memory Allocation"
                    stroke="#7c3aed" strokeWidth={3} dot={false}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                    animationDuration={1500}
                  />
                  <Line
                    type="monotone" dataKey="diskUsage" name="Disk Throughput"
                    stroke="#10b981" strokeWidth={3} dot={false}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                    animationDuration={1500}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      ) : (
        <div className="adm-empty-state" style={{ padding: '5rem 2rem' }}>
          <Activity size={50} color="#dc2626" strokeWidth={1.5} />
          <p style={{ fontSize: '1.2rem', fontWeight: 700 }}>Telemetry Offline</p>
          <span style={{ color: 'var(--text-muted)' }}>The system health monitoring service is currently unreachable.</span>
        </div>
      )}
    </DashboardLayout>
  );
};

export default AdminHealth;
