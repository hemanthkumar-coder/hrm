import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
    const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', role: 'employee' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { register } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await register(form);
            navigate('/');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const update = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

    return (
        <div className="login-page">
            <div className="login-card animate-slide-up" style={{ maxWidth: 480 }}>
                <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                    <div className="logo-icon" style={{ width: 56, height: 56, fontSize: 20, margin: '0 auto 16px', borderRadius: 14, background: 'linear-gradient(135deg, var(--accent), var(--accent-hover))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: 'white' }}>HR</div>
                </div>
                <h1 style={{ textAlign: 'center' }}>Create Account</h1>
                <p className="subtitle" style={{ textAlign: 'center' }}>Join the HRM Portal platform</p>

                {error && (
                    <div style={{ background: 'var(--danger-light)', color: 'var(--danger)', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 13, fontWeight: 500 }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="form-row">
                        <div className="form-group">
                            <label>First Name</label>
                            <input type="text" className="form-control" value={form.firstName} onChange={e => update('firstName', e.target.value)} required />
                        </div>
                        <div className="form-group">
                            <label>Last Name</label>
                            <input type="text" className="form-control" value={form.lastName} onChange={e => update('lastName', e.target.value)} required />
                        </div>
                    </div>
                    <div className="form-group">
                        <label>Email</label>
                        <input type="email" className="form-control" value={form.email} onChange={e => update('email', e.target.value)} required />
                    </div>
                    <div className="form-group">
                        <label>Password</label>
                        <input type="password" className="form-control" value={form.password} onChange={e => update('password', e.target.value)} required minLength={6} />
                    </div>
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                        {loading ? 'Creating Account...' : 'Create Account'}
                    </button>
                </form>

                <div className="login-footer">
                    Already have an account? <Link to="/login">Sign in</Link>
                </div>
            </div>
        </div>
    );
}
