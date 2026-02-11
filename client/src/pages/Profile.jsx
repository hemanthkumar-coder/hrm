import { useAuth } from '../context/AuthContext';
import { Mail, Phone, Building2, Calendar, DollarSign, Shield, Hash } from 'lucide-react';

export default function Profile() {
    const { user } = useAuth();

    const getInitials = () => {
        return `${(user?.firstName || '')[0] || ''}${(user?.lastName || '')[0] || ''}`.toUpperCase();
    };

    const formatDate = (d) => {
        if (!d) return '—';
        return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    };

    const formatCurrency = (v) => `$${Number(v || 0).toLocaleString()}`;

    return (
        <div className="animate-slide-up">
            {/* Profile Header */}
            <div className="profile-header">
                <div className="profile-avatar-lg">{getInitials()}</div>
                <div className="profile-info">
                    <h2>{user?.firstName} {user?.lastName}</h2>
                    <div className="profile-role">{user?.role}</div>
                    <div className="profile-email">{user?.email}</div>
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                    <span className={`status-badge ${user?.status || 'active'}`}>{user?.status || 'active'}</span>
                </div>
            </div>

            {/* Profile Details */}
            <div className="profile-details">
                <div className="detail-card">
                    <h3>Personal Information</h3>
                    <div className="detail-row">
                        <span className="detail-label"><Mail size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />Email</span>
                        <span className="detail-value">{user?.email || '—'}</span>
                    </div>
                    <div className="detail-row">
                        <span className="detail-label"><Phone size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />Phone</span>
                        <span className="detail-value">{user?.phone || '—'}</span>
                    </div>
                    <div className="detail-row">
                        <span className="detail-label"><Shield size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />Role</span>
                        <span className="detail-value" style={{ textTransform: 'capitalize' }}>{user?.role || '—'}</span>
                    </div>
                </div>

                <div className="detail-card">
                    <h3>Employment Details</h3>
                    <div className="detail-row">
                        <span className="detail-label"><Hash size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />Employee ID</span>
                        <span className="detail-value" style={{ fontFamily: 'monospace', color: 'var(--accent-hover)' }}>{user?.employeeId || '—'}</span>
                    </div>
                    <div className="detail-row">
                        <span className="detail-label"><Building2 size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />Department</span>
                        <span className="detail-value">{user?.departmentName || '—'}</span>
                    </div>
                    <div className="detail-row">
                        <span className="detail-label"><Calendar size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />Designation</span>
                        <span className="detail-value">{user?.designation || '—'}</span>
                    </div>
                    <div className="detail-row">
                        <span className="detail-label"><DollarSign size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />Salary</span>
                        <span className="detail-value" style={{ fontWeight: 700 }}>{formatCurrency(user?.salary)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
