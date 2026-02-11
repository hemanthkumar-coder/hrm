import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { DollarSign, Play } from 'lucide-react';

export default function Payroll() {
    const { apiFetch, user } = useAuth();
    const [payroll, setPayroll] = useState([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const isAdmin = user?.role === 'admin' || user?.role === 'hr';

    useEffect(() => { fetchPayroll(); }, []);

    const fetchPayroll = async () => {
        try {
            const res = await apiFetch('/payroll');
            if (res.ok) setPayroll(await res.json());
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const handleGenerate = async () => {
        const now = new Date();
        setGenerating(true);
        try {
            const res = await apiFetch('/payroll/generate', {
                method: 'POST',
                body: JSON.stringify({ month: now.getMonth() + 1, year: now.getFullYear() }),
            });
            const data = await res.json();
            if (res.ok) {
                alert(data.message);
                fetchPayroll();
            } else {
                alert(data.error);
            }
        } catch (err) { console.error(err); }
        finally { setGenerating(false); }
    };

    const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const formatCurrency = (v) => `$${Number(v || 0).toLocaleString()}`;

    const totalNet = payroll.reduce((s, p) => s + Number(p.netSalary || 0), 0);

    if (loading) return <div className="empty-state"><div style={{ animation: 'pulse 1.5s infinite' }}>Loading...</div></div>;

    return (
        <div className="animate-slide-up">
            <div className="page-toolbar">
                <div className="page-toolbar-left">
                    <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                        {payroll.length} records • Total: <span style={{ color: 'var(--accent-hover)', fontWeight: 700 }}>{formatCurrency(totalNet)}</span>
                    </div>
                </div>
                {isAdmin && (
                    <button className="btn btn-primary" onClick={handleGenerate} disabled={generating}>
                        <Play size={16} /> {generating ? 'Generating...' : 'Generate Payroll'}
                    </button>
                )}
            </div>

            {payroll.length === 0 ? (
                <div className="empty-state"><DollarSign size={48} /><p>No payroll records found</p></div>
            ) : (
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                {isAdmin && <th>Employee</th>}
                                <th>Period</th>
                                <th>Basic</th>
                                <th>Allowances</th>
                                <th>Deductions</th>
                                <th>Net Salary</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {payroll.map(p => (
                                <tr key={p.id}>
                                    {isAdmin && (
                                        <td>
                                            <div>
                                                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.name}</div>
                                                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.empCode}</div>
                                            </div>
                                        </td>
                                    )}
                                    <td style={{ fontWeight: 600 }}>{monthNames[p.month]} {p.year}</td>
                                    <td>{formatCurrency(p.basicSalary)}</td>
                                    <td style={{ color: 'var(--success)' }}>+{formatCurrency(p.allowances)}</td>
                                    <td style={{ color: 'var(--danger)' }}>-{formatCurrency(p.deductions)}</td>
                                    <td style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 15 }}>{formatCurrency(p.netSalary)}</td>
                                    <td><span className={`status-badge ${p.status}`}>{p.status}</span></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
