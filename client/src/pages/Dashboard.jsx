import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Users, UserCheck, CalendarDays, DollarSign, TrendingUp, Clock, ArrowUpRight } from 'lucide-react';

export default function Dashboard() {
    const { apiFetch } = useAuth();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const res = await apiFetch('/dashboard/stats');
            if (res.ok) {
                const data = await res.json();
                setStats(data);
            }
        } catch (err) {
            console.error('Failed to fetch stats:', err);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (val) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(val || 0);
    };

    const formatTime = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const now = new Date();
        const diff = Math.floor((now - date) / 60000);
        if (diff < 1) return 'Just now';
        if (diff < 60) return `${diff}m ago`;
        if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
        return date.toLocaleDateString();
    };

    if (loading) {
        return (
            <div className="empty-state">
                <div style={{ fontSize: 14, animation: 'pulse 1.5s infinite' }}>Loading dashboard...</div>
            </div>
        );
    }

    return (
        <div className="animate-slide-up">
            {/* Stat Cards */}
            <div className="stats-grid">
                <div className="stat-card accent">
                    <div className="stat-icon accent"><Users size={24} /></div>
                    <div className="stat-content">
                        <div className="label">Total Employees</div>
                        <div className="value">{stats?.totalEmployees || 0}</div>
                        <div className="change"><TrendingUp size={12} /> Active workforce</div>
                    </div>
                </div>
                <div className="stat-card success">
                    <div className="stat-icon success"><UserCheck size={24} /></div>
                    <div className="stat-content">
                        <div className="label">Present Today</div>
                        <div className="value">{stats?.presentToday || 0}</div>
                        <div className="change"><ArrowUpRight size={12} /> Clocked in</div>
                    </div>
                </div>
                <div className="stat-card warning">
                    <div className="stat-icon warning"><CalendarDays size={24} /></div>
                    <div className="stat-content">
                        <div className="label">Pending Leaves</div>
                        <div className="value">{stats?.pendingLeaves || 0}</div>
                        <div className="change"><Clock size={12} /> Awaiting approval</div>
                    </div>
                </div>
                <div className="stat-card info">
                    <div className="stat-icon info"><DollarSign size={24} /></div>
                    <div className="stat-content">
                        <div className="label">Total Payroll</div>
                        <div className="value" style={{ fontSize: 24 }}>{formatCurrency(stats?.totalPayroll)}</div>
                        <div className="change"><TrendingUp size={12} /> Processed</div>
                    </div>
                </div>
            </div>

            {/* Content Grid */}
            <div className="dashboard-grid">
                {/* Recent Activity */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Recent Activity</h3>
                    </div>
                    <div className="activity-list">
                        {stats?.recentActivity?.length > 0 ? (
                            stats.recentActivity.map((activity, i) => (
                                <div key={i} className="activity-item">
                                    <div className="activity-icon" style={{
                                        background: activity.type === 'attendance' ? 'var(--success-light)' : 'var(--warning-light)',
                                        color: activity.type === 'attendance' ? 'var(--success)' : 'var(--warning)'
                                    }}>
                                        {activity.type === 'attendance' ? <Clock size={16} /> : <CalendarDays size={16} />}
                                    </div>
                                    <div className="activity-content">
                                        <div className="activity-name">{activity.name}</div>
                                        <div className="activity-desc">{activity.description}</div>
                                        <div className="activity-time">{formatTime(activity.created_at)}</div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
                                No recent activity
                            </div>
                        )}
                    </div>
                </div>

                {/* Quick Stats */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Quick Overview</h3>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--bg-primary)', borderRadius: 8 }}>
                            <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Attendance Rate</span>
                            <span style={{ fontWeight: 700, color: 'var(--success)' }}>
                                {stats?.totalEmployees ? Math.round((stats.presentToday / stats.totalEmployees) * 100) : 0}%
                            </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--bg-primary)', borderRadius: 8 }}>
                            <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Absent Today</span>
                            <span style={{ fontWeight: 700, color: 'var(--danger)' }}>
                                {(stats?.totalEmployees || 0) - (stats?.presentToday || 0)}
                            </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--bg-primary)', borderRadius: 8 }}>
                            <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Pending Leave Requests</span>
                            <span style={{ fontWeight: 700, color: 'var(--warning)' }}>{stats?.pendingLeaves || 0}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--bg-primary)', borderRadius: 8 }}>
                            <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Total Departments</span>
                            <span style={{ fontWeight: 700, color: 'var(--accent-hover)' }}>5</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
