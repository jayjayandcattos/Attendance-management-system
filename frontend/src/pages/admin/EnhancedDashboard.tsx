import React, { useEffect, useState } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';
import {
  Users, BookOpen, Activity, Shield, TrendingUp, TrendingDown,
  Minus, AlertTriangle, CheckCircle, Clock, Server, Database,
  Cpu, HardDrive
} from 'lucide-react';

interface StatCard {
  label: string;
  value: number;
  trend: number;
  trendDirection: 'UP' | 'DOWN' | 'STABLE';
  icon: string;
  color: string;
}

interface DashboardStats {
  totalUsers: StatCard;
  totalCourses: StatCard;
  activeStudents: StatCard;
  todayLogins: StatCard;
  securityEvents: StatCard;
  systemHealth: StatCard;
}

interface AnalyticsData {
  metricName: string;
  timestamp: string;
  value: number;
  granularity: string;
}

interface SystemHealth {
  cpu: {
    usage: number;
    status: string;
    cores: number;
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
    status: string;
  };
  disk: {
    used: number;
    total: number;
    percentage: number;
    status: string;
  };
  application: {
    activeSessions: number;
    dbConnections: number;
    maxDbConnections: number;
    avgResponseTime: number;
  };
  history: Array<{
    timestamp: string;
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
  }>;
}

const COLORS = {
  blue: '#3B82F6',
  green: '#10B981',
  purple: '#8B5CF6',
  indigo: '#6366F1',
  red: '#EF4444',
  yellow: '#F59E0B',
  pink: '#EC4899',
  teal: '#14B8A6'
};

const CHART_COLORS = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EC4899', '#14B8A6'];

const EnhancedDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [userGrowth, setUserGrowth] = useState<AnalyticsData[]>([]);
  const [loginActivity, setLoginActivity] = useState<AnalyticsData[]>([]);
  const [usersByRole, setUsersByRole] = useState<any[]>([]);
  const [coursesByStatus, setCoursesByStatus] = useState<any[]>([]);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };

      // Fetch dashboard stats
      const statsRes = await fetch('/api/admin/dashboard/stats', { headers });
      const statsData = await statsRes.json();
      if (statsData.success) {
        setStats(statsData.data);
      }

      // Fetch user growth analytics
      const userGrowthRes = await fetch('/api/admin/analytics/users', { headers });
      const userGrowthData = await userGrowthRes.json();
      if (userGrowthData.success) {
        setUserGrowth(userGrowthData.data);
      }

      // Fetch login activity
      const loginRes = await fetch('/api/admin/analytics/logins', { headers });
      const loginData = await loginRes.json();
      if (loginData.success) {
        setLoginActivity(loginData.data);
      }

      // Fetch users by role
      const roleRes = await fetch('/api/admin/analytics/users-by-role', { headers });
      const roleData = await roleRes.json();
      if (roleData.success) {
        const roleArray = Object.entries(roleData.data).map(([name, value]) => ({
          name,
          value
        }));
        setUsersByRole(roleArray);
      }

      // Fetch courses by status
      const statusRes = await fetch('/api/admin/analytics/courses-by-status', { headers });
      const statusData = await statusRes.json();
      if (statusData.success) {
        const statusArray = Object.entries(statusData.data).map(([name, value]) => ({
          name,
          value
        }));
        setCoursesByStatus(statusArray);
      }

      // Fetch system health
      const healthRes = await fetch('/api/admin/system/health', { headers });
      const healthData = await healthRes.json();
      if (healthData.success) {
        setSystemHealth(healthData.data);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setLoading(false);
    }
  };

  const getIconComponent = (iconName: string) => {
    const icons: Record<string, any> = {
      users: Users,
      book: BookOpen,
      'user-check': Users,
      login: Activity,
      shield: Shield,
      activity: Activity
    };
    const Icon = icons[iconName] || Activity;
    return <Icon className="w-6 h-6" />;
  };

  const getTrendIcon = (direction: string) => {
    if (direction === 'UP') return <TrendingUp className="w-4 h-4" />;
    if (direction === 'DOWN') return <TrendingDown className="w-4 h-4" />;
    return <Minus className="w-4 h-4" />;
  };

  const getStatusColor = (status: string) => {
    if (status === 'HEALTHY') return 'text-green-600 bg-green-100';
    if (status === 'WARNING') return 'text-yellow-600 bg-yellow-100';
    if (status === 'CRITICAL') return 'text-red-600 bg-red-100';
    return 'text-gray-600 bg-gray-100';
  };

  const getStatusIcon = (status: string) => {
    if (status === 'HEALTHY') return <CheckCircle className="w-5 h-5" />;
    if (status === 'WARNING') return <AlertTriangle className="w-5 h-5" />;
    return <AlertTriangle className="w-5 h-5" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600 mt-1">Welcome back! Here's what's happening today.</p>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <Clock className="w-4 h-4" />
            <span>Last updated: {new Date().toLocaleTimeString()}</span>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.values(stats).map((stat, index) => (
              <div
                key={index}
                className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-6 border border-gray-100"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value.toLocaleString()}</p>
                    <div className="flex items-center mt-2 space-x-1">
                      <span className={`flex items-center text-sm font-medium ${stat.trendDirection === 'UP' ? 'text-green-600' :
                          stat.trendDirection === 'DOWN' ? 'text-red-600' :
                            'text-gray-600'
                        }`}>
                        {getTrendIcon(stat.trendDirection)}
                        <span className="ml-1">{Math.abs(stat.trend).toFixed(1)}%</span>
                      </span>
                      <span className="text-sm text-gray-500">vs last period</span>
                    </div>
                  </div>
                  <div className={`p-3 rounded-lg bg-${stat.color}-100`}>
                    <div className={`text-${stat.color}-600`}>
                      {getIconComponent(stat.icon)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* User Growth Chart */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">User Growth</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={userGrowth}>
                <defs>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.blue} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={COLORS.blue} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="timestamp"
                  stroke="#9CA3AF"
                  tick={{ fontSize: 12 }}
                />
                <YAxis stroke="#9CA3AF" tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={COLORS.blue}
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorUsers)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Login Activity Chart */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Login Activity (7 Days)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={loginActivity}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="timestamp"
                  stroke="#9CA3AF"
                  tick={{ fontSize: 12 }}
                />
                <YAxis stroke="#9CA3AF" tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Bar dataKey="value" fill={COLORS.green} radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Users by Role */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Users by Role</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={usersByRole}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {usersByRole.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Courses by Status */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Courses by Status</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={coursesByStatus} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" stroke="#9CA3AF" tick={{ fontSize: 12 }} />
                <YAxis dataKey="name" type="category" stroke="#9CA3AF" tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Bar dataKey="value" fill={COLORS.purple} radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* System Health */}
        {systemHealth && (
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">System Health</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              {/* CPU */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Cpu className="w-5 h-5 text-blue-600" />
                    <span className="font-medium text-gray-900">CPU</span>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(systemHealth.cpu.status)}`}>
                    {systemHealth.cpu.status}
                  </span>
                </div>
                <div className="text-2xl font-bold text-gray-900">{systemHealth.cpu.usage.toFixed(1)}%</div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${systemHealth.cpu.status === 'CRITICAL' ? 'bg-red-600' :
                        systemHealth.cpu.status === 'WARNING' ? 'bg-yellow-600' :
                          'bg-green-600'
                      }`}
                    style={{ width: `${systemHealth.cpu.usage}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-500">{systemHealth.cpu.cores} cores</p>
              </div>

              {/* Memory */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Server className="w-5 h-5 text-purple-600" />
                    <span className="font-medium text-gray-900">Memory</span>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(systemHealth.memory.status)}`}>
                    {systemHealth.memory.status}
                  </span>
                </div>
                <div className="text-2xl font-bold text-gray-900">{systemHealth.memory.percentage.toFixed(1)}%</div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${systemHealth.memory.status === 'CRITICAL' ? 'bg-red-600' :
                        systemHealth.memory.status === 'WARNING' ? 'bg-yellow-600' :
                          'bg-green-600'
                      }`}
                    style={{ width: `${systemHealth.memory.percentage}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-500">{systemHealth.memory.used} / {systemHealth.memory.total} MB</p>
              </div>

              {/* Disk */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <HardDrive className="w-5 h-5 text-green-600" />
                    <span className="font-medium text-gray-900">Disk</span>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(systemHealth.disk.status)}`}>
                    {systemHealth.disk.status}
                  </span>
                </div>
                <div className="text-2xl font-bold text-gray-900">{systemHealth.disk.percentage.toFixed(1)}%</div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${systemHealth.disk.status === 'CRITICAL' ? 'bg-red-600' :
                        systemHealth.disk.status === 'WARNING' ? 'bg-yellow-600' :
                          'bg-green-600'
                      }`}
                    style={{ width: `${systemHealth.disk.percentage}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-500">{systemHealth.disk.used} / {systemHealth.disk.total} GB</p>
              </div>

              {/* Database */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Database className="w-5 h-5 text-indigo-600" />
                    <span className="font-medium text-gray-900">Database</span>
                  </div>
                  <span className="px-2 py-1 rounded-full text-xs font-medium text-green-600 bg-green-100">
                    HEALTHY
                  </span>
                </div>
                <div className="text-2xl font-bold text-gray-900">{systemHealth.application.dbConnections}</div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="h-2 rounded-full bg-indigo-600"
                    style={{ width: `${(systemHealth.application.dbConnections / systemHealth.application.maxDbConnections) * 100}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-500">
                  {systemHealth.application.dbConnections} / {systemHealth.application.maxDbConnections} connections
                </p>
              </div>
            </div>

            {/* Health History Chart */}
            <div className="mt-6">
              <h4 className="text-sm font-medium text-gray-700 mb-4">24-Hour History</h4>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={systemHealth.history}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="timestamp" stroke="#9CA3AF" tick={{ fontSize: 12 }} />
                  <YAxis stroke="#9CA3AF" tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="cpuUsage" stroke={COLORS.blue} name="CPU" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="memoryUsage" stroke={COLORS.purple} name="Memory" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="diskUsage" stroke={COLORS.green} name="Disk" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedDashboard;
