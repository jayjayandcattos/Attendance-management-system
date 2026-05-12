import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Search,
  Filter,
  MapPin,
  Clock,
  User,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  MoreVertical,
  Globe
} from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import { adminApi } from '../../api';

const SecurityEvents: React.FC = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('ALL');

  useEffect(() => {
    fetchEvents();

    // Auto-Sync Engine (Every 10 seconds)
    const interval = setInterval(() => {
      fetchEvents(true); // Silent refresh
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const fetchEvents = async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      const res = await adminApi.getSecurityEvents(0, 50);
      setEvents(res.data.data.content);
      if (!isSilent) setLoading(false);
    } catch {
      if (!isSilent) setLoading(false);
    }
  };

  const handleAcknowledge = async (id: number) => {
    try {
      await adminApi.acknowledgeEvent(id);
      setEvents(prev => prev.map(e => e.id === id ? { ...e, acknowledged: true } : e));
    } catch (err) {
      console.error(err);
    }
  };

  const filteredEvents = events.filter(e => {
    const matchesSearch = e.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.userEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.ipAddress?.includes(searchTerm);
    const matchesSeverity = filterSeverity === 'ALL' || e.severity === filterSeverity;
    return matchesSearch && matchesSeverity;
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return '#ef4444';
      case 'HIGH': return '#f97316';
      case 'MEDIUM': return '#eab308';
      case 'LOW': return '#3b82f6';
      default: return '#64748b';
    }
  };

  return (
    <DashboardLayout role="admin">
      <div className="page-header animate-fade-in">
        <div>
          <h1 className="page-title gradient-text" style={{ fontSize: '1.75rem' }}>Security Alerts</h1>
          <p className="page-subtitle" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="sync-indicator"></span>
            Live tracking of all high-severity system threats
          </p>
        </div>
      </div>

      <div className="premium-card animate-fade-in" style={{ padding: '0', overflow: 'hidden' }}>
        {/* Filters Bar */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--bg-secondary)'
        }}>
          <div style={{ display: 'flex', gap: '1rem', flex: 1 }}>
            <div className="search-input-wrap" style={{ maxWidth: '400px', width: '100%', position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Search size={18} className="search-icon" />
              <input
                type="text"
                placeholder="Search by IP, email, or description..."
                className="form-input"
                style={{ paddingLeft: '2.75rem', borderRadius: '10px' }}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM'].map(s => (
                <button
                  key={s}
                  onClick={() => setFilterSeverity(s)}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    background: filterSeverity === s ? 'var(--accent)' : 'var(--bg-primary)',
                    color: filterSeverity === s ? '#fff' : 'var(--text-secondary)',
                    border: '1px solid var(--border-glass)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Alerts List */}
        <div style={{ minHeight: '400px' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
              <div className="spinner"></div>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '400px', color: '#94a3b8' }}>
              <ShieldCheck size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
              <p style={{ fontWeight: 600 }}>No security threats detected in this range.</p>
            </div>
          ) : (
            <div className="alerts-list">
              {filteredEvents.map((event, i) => (
                <div
                  key={event.id}
                  className={`alert-item ${event.acknowledged ? 'acknowledged' : ''}`}
                  style={{
                    padding: '1.5rem',
                    borderBottom: '1px solid #f1f5f9',
                    display: 'flex',
                    gap: '1.5rem',
                    background: event.acknowledged ? 'transparent' : 'rgba(239, 68, 68, 0.05)',
                    animation: 'fade-in 0.3s ease-out forwards',
                    animationDelay: `${i * 0.05}s`,
                    position: 'relative'
                  }}
                >
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    background: event.acknowledged ? '#f8fafc' : `${getSeverityColor(event.severity)}15`,
                    color: event.acknowledged ? '#94a3b8' : getSeverityColor(event.severity),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {event.severity === 'CRITICAL' ? <ShieldAlert size={24} /> : <AlertTriangle size={24} />}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{
                          fontSize: '0.65rem',
                          fontWeight: 800,
                          padding: '0.2rem 0.6rem',
                          borderRadius: '4px',
                          background: getSeverityColor(event.severity),
                          color: '#fff'
                        }}>
                          {event.severity}
                        </span>
                        <h4 style={{ fontWeight: 700, fontSize: '0.95rem', color: event.acknowledged ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                          {event.description}
                        </h4>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={14} />
                        {new Date(event.createdAt).toLocaleString()}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '2rem', marginTop: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: '#64748b' }}>
                        <Globe size={14} />
                        <strong>IP:</strong> {event.ipAddress}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: '#64748b' }}>
                        <User size={14} />
                        <strong>User:</strong> {event.userEmail || 'Unknown'}
                      </div>
                      {event.countryCode && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: '#64748b' }}>
                          <MapPin size={14} />
                          <strong>Location:</strong> {event.city}, {event.countryCode}
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    {!event.acknowledged ? (
                      <button
                        onClick={() => handleAcknowledge(event.id)}
                        className="btn btn-sm btn-primary"
                        style={{ width: 'auto', background: '#0f172a', whiteSpace: 'nowrap' }}
                      >
                        <CheckCircle2 size={14} />
                        Acknowledge
                      </button>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#10b981', fontSize: '0.8rem', fontWeight: 700 }}>
                        <ShieldCheck size={16} />
                        Resolved
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SecurityEvents;
