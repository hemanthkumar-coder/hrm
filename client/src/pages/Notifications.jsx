import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { Bell, CheckCheck, CalendarDays, Clock, DollarSign, Info, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

const iconMap = {
    leave: CalendarDays,
    attendance: Clock,
    payroll: DollarSign,
    info: Info,
    warning: AlertTriangle,
    success: CheckCircle,
    error: XCircle,
};

const colorMap = {
    leave: { bg: 'var(--warning-light)', color: 'var(--warning)' },
    attendance: { bg: 'var(--info-light)', color: 'var(--info)' },
    payroll: { bg: 'var(--accent-light)', color: 'var(--accent-hover)' },
    info: { bg: 'var(--info-light)', color: 'var(--info)' },
    warning: { bg: 'var(--warning-light)', color: 'var(--warning)' },
    success: { bg: 'var(--success-light)', color: 'var(--success)' },
    error: { bg: 'var(--danger-light)', color: 'var(--danger)' },
};

export default function Notifications() {
    const { apiFetch } = useAuth();
    const { setUnreadCount } = useSocket();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { fetchNotifications(); }, []);

    const fetchNotifications = async () => {
        try {
            const res = await apiFetch('/notifications');
            if (res.ok) {
                const data = await res.json();
                setNotifications(data);
                setUnreadCount(data.filter(n => !n.isRead).length);
            }
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const markAsRead = async (id) => {
        await apiFetch(`/notifications/${id}/read`, { method: 'PUT' });
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
    };

    const markAllRead = async () => {
        await apiFetch('/notifications/read-all', { method: 'PUT' });
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setUnreadCount(0);
    };

    const formatTime = (ts) => {
        const d = new Date(ts);
        const now = new Date();
        const diff = Math.floor((now - d) / 60000);
        if (diff < 1) return 'Just now';
        if (diff < 60) return `${diff}m ago`;
        if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    if (loading) return <div className="empty-state"><div style={{ animation: 'pulse 1.5s infinite' }}>Loading...</div></div>;

    const unread = notifications.filter(n => !n.isRead).length;

    return (
        <div className="animate-slide-up">
            <div className="page-toolbar">
                <div className="page-toolbar-left">
                    <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                        {unread > 0 ? `${unread} unread notification${unread > 1 ? 's' : ''}` : 'All caught up!'}
                    </span>
                </div>
                {unread > 0 && (
                    <button className="btn btn-secondary" onClick={markAllRead}>
                        <CheckCheck size={16} /> Mark All Read
                    </button>
                )}
            </div>

            {notifications.length === 0 ? (
                <div className="empty-state"><Bell size={48} /><p>No notifications yet</p></div>
            ) : (
                <div className="notification-list">
                    {notifications.map(n => {
                        const Icon = iconMap[n.type] || Info;
                        const colors = colorMap[n.type] || colorMap.info;
                        return (
                            <div
                                key={n.id}
                                className={`notification-item ${!n.isRead ? 'unread' : ''}`}
                                onClick={() => !n.isRead && markAsRead(n.id)}
                            >
                                <div className="notification-icon" style={{ background: colors.bg, color: colors.color }}>
                                    <Icon size={18} />
                                </div>
                                <div className="notification-content">
                                    <div className="notification-title">{n.title}</div>
                                    <div className="notification-message">{n.message}</div>
                                    <div className="notification-time">{formatTime(n.createdAt)}</div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
