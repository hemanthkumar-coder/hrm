import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Plus, Building2, Users, X, Crown, UserCheck } from 'lucide-react';

export default function Departments() {
    const { apiFetch, user } = useAuth();
    const [departments, setDepartments] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showManagerModal, setShowManagerModal] = useState(null);
    const [form, setForm] = useState({ name: '', description: '' });
    const isAdmin = user?.role === 'admin';

    useEffect(() => { fetchDepartments(); fetchEmployees(); }, []);

    const fetchDepartments = async () => {
        try {
            const res = await apiFetch('/departments');
            if (res.ok) setDepartments(await res.json());
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const fetchEmployees = async () => {
        try {
            const res = await apiFetch('/employees');
            if (res.ok) setEmployees(await res.json());
        } catch (err) { console.error(err); }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await apiFetch('/departments', { method: 'POST', body: JSON.stringify(form) });
            setShowModal(false);
            setForm({ name: '', description: '' });
            fetchDepartments();
        } catch (err) { console.error(err); }
    };

    const assignManager = async (deptId, managerId) => {
        try {
            await apiFetch(`/departments/${deptId}/manager`, {
                method: 'PUT',
                body: JSON.stringify({ managerId: managerId || null })
            });
            setShowManagerModal(null);
            fetchDepartments();
            fetchEmployees();
        } catch (err) { console.error(err); }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this department? Employees will be unassigned.')) return;
        await apiFetch(`/departments/${id}`, { method: 'DELETE' });
        fetchDepartments();
    };

    const colors = ['var(--accent)', 'var(--success)', 'var(--warning)', 'var(--info)', 'var(--danger)', '#a855f7', '#ec4899'];

    return (
        <div className="animate-slide-up">
            <div className="page-toolbar">
                <div />
                {(isAdmin || user?.role === 'hr') && (
                    <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                        <Plus size={16} /> Add Department
                    </button>
                )}
            </div>

            {loading ? (
                <div className="empty-state"><div style={{ animation: 'pulse 1.5s infinite' }}>Loading...</div></div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
                    {departments.map((dept, i) => (
                        <div key={dept.id} className="card" style={{ position: 'relative', overflow: 'hidden' }}>
                            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: colors[i % colors.length] }} />
                            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                                <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-sm)', background: `${colors[i % colors.length]}22`, color: colors[i % colors.length], display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <Building2 size={24} />
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <h3 style={{ fontSize: 16, fontWeight: 700 }}>{dept.name}</h3>
                                    <div style={{ fontSize: 13, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dept.description || 'No description'}</div>
                                </div>
                                {isAdmin && (
                                    <button className="btn btn-secondary btn-sm" title="Delete" onClick={() => handleDelete(dept.id)} style={{ flexShrink: 0 }}>
                                        <X size={14} />
                                    </button>
                                )}
                            </div>

                            {/* Manager Section */}
                            <div style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: 8, marginBottom: 12 }}>
                                <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <Crown size={12} /> Department Manager
                                </div>
                                {dept.managerName ? (
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <div>
                                            <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 14 }}>{dept.managerName}</div>
                                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{dept.managerEmail}</div>
                                        </div>
                                        {isAdmin && (
                                            <button className="btn btn-secondary btn-sm" onClick={() => setShowManagerModal(dept.id)} style={{ fontSize: 11 }}>
                                                Change
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <span style={{ color: 'var(--text-muted)', fontSize: 13, fontStyle: 'italic' }}>No manager assigned</span>
                                        {isAdmin && (
                                            <button className="btn btn-primary btn-sm" onClick={() => setShowManagerModal(dept.id)} style={{ fontSize: 11 }}>
                                                <UserCheck size={12} /> Assign
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--text-secondary)' }}>
                                    <Users size={16} /> {dept.employeeCount} employees
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Department Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Add Department</h2>
                            <button className="modal-close" onClick={() => setShowModal(false)}><X size={18} /></button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                <div className="form-group"><label>Name</label><input className="form-control" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required /></div>
                                <div className="form-group"><label>Description</label><textarea className="form-control" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} /></div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">Create</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Assign Manager Modal */}
            {showManagerModal && (
                <div className="modal-overlay" onClick={() => setShowManagerModal(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Assign Department Manager</h2>
                            <button className="modal-close" onClick={() => setShowManagerModal(null)}><X size={18} /></button>
                        </div>
                        <div className="modal-body">
                            <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 13, color: 'var(--text-muted)' }}>
                                <strong style={{ color: 'var(--text-secondary)' }}>👑 Manager Privileges:</strong> Can add/edit employees in this department, view sensitive data, and approve leave requests (first level).
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 400, overflowY: 'auto' }}>
                                {/* Option to remove manager */}
                                <button
                                    className="btn btn-secondary"
                                    style={{ width: '100%', justifyContent: 'flex-start', padding: '10px 14px', fontSize: 13, color: 'var(--text-muted)' }}
                                    onClick={() => assignManager(showManagerModal, null)}
                                >
                                    Remove current manager
                                </button>
                                {employees.map(emp => (
                                    <button
                                        key={emp.id}
                                        className="btn btn-secondary"
                                        style={{ width: '100%', justifyContent: 'flex-start', padding: '10px 14px', gap: 12 }}
                                        onClick={() => assignManager(showManagerModal, emp.userId)}
                                    >
                                        <div className="header-avatar" style={{ width: 32, height: 32, fontSize: 12, flexShrink: 0 }}>
                                            {(emp.firstName?.[0] || '') + (emp.lastName?.[0] || '')}
                                        </div>
                                        <div style={{ textAlign: 'left' }}>
                                            <div style={{ fontWeight: 600, fontSize: 13 }}>{emp.firstName} {emp.lastName}</div>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{emp.designation} • {emp.departmentName || 'No dept'}</div>
                                        </div>
                                        {emp.role === 'manager' && (
                                            <span style={{ marginLeft: 'auto', fontSize: 10, padding: '2px 6px', borderRadius: 8, background: '#f59e0b22', color: '#f59e0b' }}>Manager</span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
