import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Plus, CalendarDays, X, CheckCircle, XCircle, Clock, ArrowRight, Shield } from 'lucide-react';

export default function Leaves() {
    const { apiFetch, user } = useAuth();
    const [leaves, setLeaves] = useState([]);
    const [balances, setBalances] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ leaveType: 'casual', startDate: '', endDate: '', reason: '' });

    const isAdmin = user?.role === 'admin';
    const isHR = user?.role === 'hr';
    const isManager = user?.role === 'manager';
    const canFinalApprove = isAdmin || isHR;

    useEffect(() => { fetchLeaves(); fetchBalances(); }, []);

    const fetchLeaves = async () => {
        try {
            const res = await apiFetch('/leaves');
            if (res.ok) setLeaves(await res.json());
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const fetchBalances = async () => {
        try {
            const res = await apiFetch('/leave-balances');
            if (res.ok) setBalances(await res.json());
        } catch (err) { console.error(err); }
    };

    const handleApply = async (e) => {
        e.preventDefault();
        try {
            const res = await apiFetch('/leaves', { method: 'POST', body: JSON.stringify(form) });
            if (res.ok) {
                setShowModal(false);
                setForm({ leaveType: 'casual', startDate: '', endDate: '', reason: '' });
                fetchLeaves();
                fetchBalances();
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to apply');
            }
        } catch (err) { console.error(err); }
    };

    const handleManagerAction = async (id, action) => {
        const endpoint = action === 'approve' ? 'manager-approve' : 'manager-reject';
        try {
            await apiFetch(`/leaves/${id}/${endpoint}`, { method: 'PUT' });
            fetchLeaves();
        } catch (err) { console.error(err); }
    };

    const handleHRAction = async (id, action) => {
        const endpoint = action === 'approve' ? 'hr-approve' : 'hr-reject';
        try {
            await apiFetch(`/leaves/${id}/${endpoint}`, { method: 'PUT' });
            fetchLeaves();
            fetchBalances();
        } catch (err) { console.error(err); }
    };

    const update = (k, v) => setForm(p => ({ ...p, [k]: v }));

    const statusIcon = (status) => {
        if (status === 'approved') return <CheckCircle size={14} style={{ color: '#22c55e' }} />;
        if (status === 'rejected') return <XCircle size={14} style={{ color: '#ef4444' }} />;
        return <Clock size={14} style={{ color: '#f59e0b' }} />;
    };

    const statusColor = (status) => {
        if (status === 'approved') return '#22c55e';
        if (status === 'rejected') return '#ef4444';
        if (status === 'manager_approved') return '#f59e0b';
        return '#64748b';
    };

    // Own balances
    const myBalance = balances.find(b => b.userId === user?.id);

    return (
        <div className="animate-slide-up">
            {/* Leave Balance Cards */}
            {myBalance && (
                <div style={{ marginBottom: 24 }}>
                    <h3 style={{ color: 'var(--text-secondary)', marginBottom: 12, fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Your Leave Balance</h3>
                    <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
                        {['casual', 'sick', 'annual'].map(type => (
                            <div key={type} className="stat-card" style={{ padding: '16px 20px' }}>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'capitalize', marginBottom: 4 }}>{type} Leave</div>
                                <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>
                                    {myBalance[type].remaining}
                                    <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 400 }}> / {myBalance[type].total}</span>
                                </div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{myBalance[type].used} used</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="page-toolbar">
                <div className="page-toolbar-left">
                    <h3 style={{ color: 'var(--text-primary)', margin: 0 }}>Leave Requests</h3>
                </div>
                <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                    <Plus size={16} /> Apply for Leave
                </button>
            </div>

            {loading ? (
                <div className="empty-state"><div style={{ animation: 'pulse 1.5s infinite' }}>Loading...</div></div>
            ) : leaves.length === 0 ? (
                <div className="empty-state"><CalendarDays size={48} /><p>No leave requests</p></div>
            ) : (
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Employee</th>
                                <th>Type</th>
                                <th>Period</th>
                                <th>Reason</th>
                                <th>Manager</th>
                                <th>HR</th>
                                <th>Status</th>
                                {(isManager || canFinalApprove) && <th>Actions</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {leaves.map(leave => (
                                <tr key={leave.id}>
                                    <td>
                                        <div>
                                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{leave.name}</div>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{leave.departmentName}</div>
                                        </div>
                                    </td>
                                    <td>
                                        <span style={{
                                            padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                                            background: 'var(--bg-secondary)', color: 'var(--text-secondary)',
                                            textTransform: 'capitalize'
                                        }}>
                                            {leave.leaveType}
                                        </span>
                                    </td>
                                    <td>
                                        <div style={{ fontSize: 13 }}>
                                            {new Date(leave.startDate).toLocaleDateString()}
                                            <ArrowRight size={12} style={{ margin: '0 4px', verticalAlign: 'middle', color: 'var(--text-muted)' }} />
                                            {new Date(leave.endDate).toLocaleDateString()}
                                        </div>
                                    </td>
                                    <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {leave.reason || '—'}
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            {statusIcon(leave.managerStatus)}
                                            <span style={{ fontSize: 12, color: statusColor(leave.managerStatus), textTransform: 'capitalize' }}>
                                                {leave.managerStatus}
                                            </span>
                                        </div>
                                        {leave.managerApproverName && (
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>by {leave.managerApproverName}</div>
                                        )}
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            {statusIcon(leave.hrStatus)}
                                            <span style={{ fontSize: 12, color: statusColor(leave.hrStatus), textTransform: 'capitalize' }}>
                                                {leave.hrStatus}
                                            </span>
                                        </div>
                                        {leave.hrApproverName && (
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>by {leave.hrApproverName}</div>
                                        )}
                                    </td>
                                    <td>
                                        <span style={{
                                            padding: '4px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600,
                                            background: `${statusColor(leave.status)}22`, color: statusColor(leave.status),
                                            textTransform: 'capitalize'
                                        }}>
                                            {leave.status === 'manager_approved' ? 'Mgr ✓' : leave.status}
                                        </span>
                                    </td>
                                    {(isManager || canFinalApprove) && (
                                        <td>
                                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                                {/* Manager approval buttons */}
                                                {(isManager || isAdmin) && leave.managerStatus === 'pending' && leave.userId !== user?.id && (
                                                    <>
                                                        <button className="btn btn-sm" style={{ background: '#22c55e22', color: '#22c55e', border: '1px solid #22c55e44', padding: '4px 8px', borderRadius: 6, cursor: 'pointer', fontSize: 11 }}
                                                            onClick={() => handleManagerAction(leave.id, 'approve')}>
                                                            <CheckCircle size={12} /> Mgr ✓
                                                        </button>
                                                        <button className="btn btn-sm" style={{ background: '#ef444422', color: '#ef4444', border: '1px solid #ef444444', padding: '4px 8px', borderRadius: 6, cursor: 'pointer', fontSize: 11 }}
                                                            onClick={() => handleManagerAction(leave.id, 'reject')}>
                                                            <XCircle size={12} /> Mgr ✗
                                                        </button>
                                                    </>
                                                )}
                                                {/* HR approval buttons (only after manager approved) */}
                                                {canFinalApprove && leave.managerStatus === 'approved' && leave.hrStatus === 'pending' && (
                                                    <>
                                                        <button className="btn btn-sm" style={{ background: '#22c55e22', color: '#22c55e', border: '1px solid #22c55e44', padding: '4px 8px', borderRadius: 6, cursor: 'pointer', fontSize: 11 }}
                                                            onClick={() => handleHRAction(leave.id, 'approve')}>
                                                            <Shield size={12} /> HR ✓
                                                        </button>
                                                        <button className="btn btn-sm" style={{ background: '#ef444422', color: '#ef4444', border: '1px solid #ef444444', padding: '4px 8px', borderRadius: 6, cursor: 'pointer', fontSize: 11 }}
                                                            onClick={() => handleHRAction(leave.id, 'reject')}>
                                                            <Shield size={12} /> HR ✗
                                                        </button>
                                                    </>
                                                )}
                                                {leave.status === 'approved' && (
                                                    <span style={{ fontSize: 11, color: '#22c55e' }}>✅ Done</span>
                                                )}
                                                {leave.status === 'rejected' && (
                                                    <span style={{ fontSize: 11, color: '#ef4444' }}>Rejected</span>
                                                )}
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Apply Leave Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Apply for Leave</h2>
                            <button className="modal-close" onClick={() => setShowModal(false)}><X size={18} /></button>
                        </div>
                        <form onSubmit={handleApply}>
                            <div className="modal-body">
                                <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 13, color: 'var(--text-muted)' }}>
                                    <strong style={{ color: 'var(--text-secondary)' }}>📋 Approval Flow:</strong> Your request will first go to your department manager for approval, then to HR for final approval.
                                </div>
                                <div className="form-group">
                                    <label>Leave Type</label>
                                    <select className="form-control" value={form.leaveType} onChange={e => update('leaveType', e.target.value)}>
                                        <option value="casual">Casual Leave</option>
                                        <option value="sick">Sick Leave</option>
                                        <option value="annual">Annual Leave</option>
                                        <option value="maternity">Maternity Leave</option>
                                        <option value="paternity">Paternity Leave</option>
                                        <option value="unpaid">Unpaid Leave</option>
                                    </select>
                                </div>
                                {myBalance && form.leaveType !== 'unpaid' && myBalance[form.leaveType] && (
                                    <div style={{ background: 'var(--accent)11', border: '1px solid var(--accent)33', borderRadius: 8, padding: 10, marginBottom: 12, fontSize: 12 }}>
                                        Balance: <strong>{myBalance[form.leaveType].remaining}</strong> days remaining out of {myBalance[form.leaveType].total}
                                    </div>
                                )}
                                <div className="form-row">
                                    <div className="form-group"><label>Start Date</label><input type="date" className="form-control" value={form.startDate} onChange={e => update('startDate', e.target.value)} required /></div>
                                    <div className="form-group"><label>End Date</label><input type="date" className="form-control" value={form.endDate} onChange={e => update('endDate', e.target.value)} required /></div>
                                </div>
                                <div className="form-group"><label>Reason</label><textarea className="form-control" rows={3} value={form.reason} onChange={e => update('reason', e.target.value)} placeholder="Briefly describe the reason..." /></div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">Submit Request</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
