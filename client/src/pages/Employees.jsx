import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Plus, Search, Edit, Trash2, X, Users } from 'lucide-react';

export default function Employees() {
    const { apiFetch, user } = useAuth();
    const [employees, setEmployees] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editId, setEditId] = useState(null);
    const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', departmentId: '', designation: '', phone: '', salary: '' });
    const isAdmin = user?.role === 'admin' || user?.role === 'hr';
    const isManager = user?.role === 'manager';
    const canManage = isAdmin || isManager;

    useEffect(() => { fetchEmployees(); fetchDepartments(); }, []);

    const fetchEmployees = async () => {
        try {
            const res = await apiFetch(`/employees?search=${search}`);
            if (res.ok) setEmployees(await res.json());
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const fetchDepartments = async () => {
        try {
            const res = await apiFetch('/departments');
            if (res.ok) setDepartments(await res.json());
        } catch (err) { console.error(err); }
    };

    useEffect(() => {
        const timer = setTimeout(fetchEmployees, 300);
        return () => clearTimeout(timer);
    }, [search]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editId) {
                await apiFetch(`/employees/${editId}`, { method: 'PUT', body: JSON.stringify(form) });
            } else {
                await apiFetch('/employees', { method: 'POST', body: JSON.stringify({ ...form, password: form.password || 'password123' }) });
            }
            setShowModal(false);
            setEditId(null);
            setForm({ firstName: '', lastName: '', email: '', password: '', departmentId: '', designation: '', phone: '', salary: '' });
            fetchEmployees();
        } catch (err) { console.error(err); }
    };

    const handleEdit = (emp) => {
        setEditId(emp.id);
        setForm({ firstName: emp.firstName, lastName: emp.lastName, email: emp.email, departmentId: emp.departmentId || '', designation: emp.designation || '', phone: emp.phone || '', salary: emp.salary || '' });
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this employee?')) return;
        await apiFetch(`/employees/${id}`, { method: 'DELETE' });
        fetchEmployees();
    };

    const update = (k, v) => setForm(p => ({ ...p, [k]: v }));

    // Role badges
    const roleBadge = (role) => {
        const colors = { admin: '#ef4444', hr: '#8b5cf6', manager: '#f59e0b', employee: '#3b82f6' };
        return (
            <span style={{
                padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                background: `${colors[role] || '#64748b'}22`, color: colors[role] || '#64748b',
                textTransform: 'capitalize'
            }}>
                {role}
            </span>
        );
    };

    return (
        <div className="animate-slide-up">
            <div className="page-toolbar">
                <div className="page-toolbar-left">
                    <input className="filter-input" type="text" placeholder="Search employees..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                {canManage && (
                    <button className="btn btn-primary" onClick={() => { setEditId(null); setForm({ firstName: '', lastName: '', email: '', password: '', departmentId: '', designation: '', phone: '', salary: '' }); setShowModal(true); }}>
                        <Plus size={16} /> Add Employee
                    </button>
                )}
            </div>

            {loading ? (
                <div className="empty-state"><div style={{ animation: 'pulse 1.5s infinite' }}>Loading...</div></div>
            ) : employees.length === 0 ? (
                <div className="empty-state"><Users size={48} /><p>No employees found</p></div>
            ) : (
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Employee</th>
                                <th>ID</th>
                                <th>Role</th>
                                <th>Department</th>
                                <th>Designation</th>
                                <th>Status</th>
                                {canManage && <th>Phone</th>}
                                {canManage && <th>Salary</th>}
                                {canManage && <th>Actions</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {employees.map(emp => (
                                <tr key={emp.id}>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <div className="header-avatar" style={{ width: 36, height: 36, fontSize: 13 }}>
                                                {(emp.firstName?.[0] || '') + (emp.lastName?.[0] || '')}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{emp.firstName} {emp.lastName}</div>
                                                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{emp.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{emp.employeeId}</td>
                                    <td>{roleBadge(emp.role)}</td>
                                    <td>{emp.departmentName || '—'}</td>
                                    <td>{emp.designation || '—'}</td>
                                    <td><span className={`status-badge ${emp.status}`}>{emp.status}</span></td>
                                    {canManage && <td>{emp.phone || '—'}</td>}
                                    {canManage && <td style={{ fontWeight: 600 }}>{emp.salary != null ? `$${Number(emp.salary).toLocaleString()}` : '—'}</td>}
                                    {canManage && (
                                        <td>
                                            <div style={{ display: 'flex', gap: 6 }}>
                                                <button className="btn btn-secondary btn-sm" onClick={() => handleEdit(emp)}><Edit size={14} /></button>
                                                {isAdmin && <button className="btn btn-danger btn-sm" onClick={() => handleDelete(emp.id)}><Trash2 size={14} /></button>}
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editId ? 'Edit Employee' : 'Add Employee'}</h2>
                            <button className="modal-close" onClick={() => setShowModal(false)}><X size={18} /></button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                <div className="form-row">
                                    <div className="form-group"><label>First Name</label><input className="form-control" value={form.firstName} onChange={e => update('firstName', e.target.value)} required /></div>
                                    <div className="form-group"><label>Last Name</label><input className="form-control" value={form.lastName} onChange={e => update('lastName', e.target.value)} required /></div>
                                </div>
                                {!editId && (
                                    <div className="form-row">
                                        <div className="form-group"><label>Email</label><input type="email" className="form-control" value={form.email} onChange={e => update('email', e.target.value)} required /></div>
                                        <div className="form-group"><label>Password</label><input type="password" className="form-control" value={form.password} onChange={e => update('password', e.target.value)} placeholder="password123" /></div>
                                    </div>
                                )}
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Department</label>
                                        <select className="form-control" value={form.departmentId} onChange={e => update('departmentId', e.target.value)} disabled={isManager}>
                                            <option value="">Select...</option>
                                            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                        </select>
                                        {isManager && <small style={{ color: 'var(--text-muted)', fontSize: 11 }}>Auto-assigned to your department</small>}
                                    </div>
                                    <div className="form-group"><label>Designation</label><input className="form-control" value={form.designation} onChange={e => update('designation', e.target.value)} /></div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group"><label>Phone</label><input className="form-control" value={form.phone} onChange={e => update('phone', e.target.value)} /></div>
                                    <div className="form-group"><label>Salary</label><input type="number" className="form-control" value={form.salary} onChange={e => update('salary', e.target.value)} /></div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">{editId ? 'Update' : 'Create'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
