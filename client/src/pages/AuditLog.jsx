import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { FileText, Shield, UserCog, Trash2, Edit, CheckCircle, XCircle, Clock } from 'lucide-react';

export default function AuditLog() {
    const { apiFetch, user } = useAuth();
    const [logs, setLogs] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(0);
    const limit = 20;

    useEffect(() => { fetchLogs(); }, [page]);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const res = await apiFetch(`/audit-log?limit=${limit}&offset=${page * limit}`);
            if (res.ok) {
                const data = await res.json();
                setLogs(data.logs);
                setTotal(data.total);
            }
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    if (user?.role !== 'admin') {
        return (
            <div className="empty-state">
                <Shield size={48} />
                <p>Access Denied</p>
                <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>Only administrators can view the audit log.</p>
            </div>
        );
    }

    const actionIcon = (action) => {
        if (action.includes('CREATE')) return <span style={{ color: '#22c55e' }}>＋</span>;
        if (action.includes('DELETE')) return <Trash2 size={14} style={{ color: '#ef4444' }} />;
        if (action.includes('UPDATE') || action.includes('ASSIGN')) return <Edit size={14} style={{ color: '#3b82f6' }} />;
        if (action.includes('APPROVE')) return <CheckCircle size={14} style={{ color: '#22c55e' }} />;
        if (action.includes('REJECT')) return <XCircle size={14} style={{ color: '#ef4444' }} />;
        return <Clock size={14} style={{ color: '#64748b' }} />;
    };

    const formatAction = (action) => {
        return action.replace(/_/g, ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase());
    };

    const roleBadge = (role) => {
        const colors = { admin: '#ef4444', hr: '#8b5cf6', manager: '#f59e0b', employee: '#3b82f6' };
        return (
            <span style={{
                padding: '2px 6px', borderRadius: 8, fontSize: 10, fontWeight: 600,
                background: `${colors[role] || '#64748b'}22`, color: colors[role] || '#64748b',
                textTransform: 'capitalize'
            }}>
                {role}
            </span>
        );
    };

    const totalPages = Math.ceil(total / limit);

    return (
        <div className="animate-slide-up">
            <div className="page-toolbar">
                <div className="page-toolbar-left" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>
                        {total} total events
                    </span>
                </div>
            </div>

            {loading ? (
                <div className="empty-state"><div style={{ animation: 'pulse 1.5s infinite' }}>Loading...</div></div>
            ) : logs.length === 0 ? (
                <div className="empty-state"><FileText size={48} /><p>No audit entries yet</p></div>
            ) : (
                <>
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Time</th>
                                    <th>User</th>
                                    <th>Action</th>
                                    <th>Entity</th>
                                    <th>Details</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map(log => (
                                    <tr key={log.id}>
                                        <td style={{ whiteSpace: 'nowrap', fontSize: 12, color: 'var(--text-muted)' }}>
                                            {new Date(log.createdAt).toLocaleString()}
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <div>
                                                    <div style={{ fontWeight: 600, fontSize: 13 }}>{log.userName}</div>
                                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                                        {log.userEmail} {roleBadge(log.userRole)}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                {actionIcon(log.action)}
                                                <span style={{ fontSize: 13, fontWeight: 500 }}>{formatAction(log.action)}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <span style={{
                                                padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                                                background: 'var(--bg-secondary)', color: 'var(--text-secondary)',
                                                textTransform: 'capitalize'
                                            }}>
                                                {log.entityType}
                                            </span>
                                        </td>
                                        <td style={{ maxWidth: 240, fontSize: 12, color: 'var(--text-muted)' }}>
                                            {log.details ? (
                                                <code style={{ fontSize: 11, background: 'var(--bg-secondary)', padding: '2px 6px', borderRadius: 4, wordBreak: 'break-all' }}>
                                                    {typeof log.details === 'string' ? log.details : JSON.stringify(log.details).substring(0, 100)}
                                                </code>
                                            ) : '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 20 }}>
                            <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>
                                ← Prev
                            </button>
                            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                                Page {page + 1} of {totalPages}
                            </span>
                            <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>
                                Next →
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
