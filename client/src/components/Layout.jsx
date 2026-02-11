import { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import {
    LayoutDashboard, Users, Building2, Clock, CalendarDays,
    DollarSign, MessageCircle, Bell, User, LogOut, ChevronLeft,
    ChevronRight, Search, ShieldCheck, FileText
} from 'lucide-react';

const navItems = [
    { section: 'Main' },
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/employees', icon: Users, label: 'Employees' },
    { path: '/departments', icon: Building2, label: 'Departments' },
    { section: 'Management' },
    { path: '/attendance', icon: Clock, label: 'Attendance' },
    { path: '/leaves', icon: CalendarDays, label: 'Leaves' },
    { path: '/payroll', icon: DollarSign, label: 'Payroll', roles: ['admin', 'hr'] },
    { section: 'Communication' },
    { path: '/chat', icon: MessageCircle, label: 'Chat' },
    { path: '/notifications', icon: Bell, label: 'Notifications' },
    { section: 'Account' },
    { path: '/profile', icon: User, label: 'Profile' },
    { path: '/audit-log', icon: FileText, label: 'Audit Log', roles: ['admin'] },
];

export default function Layout({ children }) {
    const [collapsed, setCollapsed] = useState(false);
    const location = useLocation();
    const { user, logout } = useAuth();
    const { unreadCount, unreadMessages, toasts } = useSocket();

    const getInitials = () => {
        if (!user) return '?';
        return `${(user.firstName || '')[0] || ''}${(user.lastName || '')[0] || ''}`.toUpperCase();
    };

    const pageTitle = navItems.find(item => item.path === location.pathname)?.label || 'Dashboard';

    const roleBadgeColors = { admin: '#ef4444', hr: '#8b5cf6', manager: '#f59e0b', employee: '#3b82f6' };

    return (
        <div className="app-layout">
            {/* Sidebar */}
            <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
                <div className="sidebar-logo">
                    <div className="logo-icon">HR</div>
                    <span className="logo-text">HRM Portal</span>
                </div>

                <button className="sidebar-toggle" onClick={() => setCollapsed(!collapsed)}>
                    {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                </button>

                <nav className="sidebar-nav">
                    {navItems.map((item, i) => {
                        if (item.section) {
                            return <div key={i} className="nav-section-title">{item.section}</div>;
                        }
                        // Role-based filtering
                        if (item.roles && !item.roles.includes(user?.role)) {
                            return null;
                        }
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;
                        return (
                            <Link key={item.path} to={item.path} className={`nav-item ${isActive ? 'active' : ''}`}>
                                <Icon className="nav-icon" size={20} />
                                <span className="nav-label">{item.label}</span>
                                {item.path === '/notifications' && unreadCount > 0 && (
                                    <span className="badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
                                )}
                                {item.path === '/chat' && unreadMessages > 0 && (
                                    <span className="badge" style={{ background: 'var(--accent)' }}>{unreadMessages > 99 ? '99+' : unreadMessages}</span>
                                )}
                            </Link>
                        );
                    })}
                </nav>

                <div style={{ padding: '12px', borderTop: '1px solid var(--border)' }}>
                    <button className="nav-item" onClick={logout} style={{ width: '100%', color: 'var(--danger)' }}>
                        <LogOut className="nav-icon" size={20} />
                        <span className="nav-label">Logout</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className={`main-area ${collapsed ? 'collapsed' : ''}`}>
                <header className="header">
                    <div className="header-left">
                        <h1>{pageTitle}</h1>
                    </div>
                    <div className="header-right">
                        <div className="header-search">
                            <Search className="search-icon" size={16} />
                            <input type="text" placeholder="Search anything..." />
                        </div>
                        <Link to="/notifications">
                            <button className="header-icon-btn">
                                <Bell size={20} />
                                {unreadCount > 0 && <span className="notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
                            </button>
                        </Link>
                        <Link to="/profile" className="header-user">
                            <div className="header-avatar">{getInitials()}</div>
                            <div className="header-user-info">
                                <span className="name">{user?.firstName} {user?.lastName}</span>
                                <span className="role" style={{ color: roleBadgeColors[user?.role] || '#64748b', textTransform: 'capitalize' }}>{user?.role}</span>
                            </div>
                        </Link>
                    </div>
                </header>

                <main className="main-content animate-fade-in">
                    {children}
                </main>
            </div>

            {/* Toast Notifications */}
            {toasts.length > 0 && (
                <div className="toast-container">
                    {toasts.map(toast => (
                        <div key={toast.id} className={`toast ${toast.type}`}>
                            <span>{toast.message}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
