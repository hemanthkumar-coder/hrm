import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(email, password);
            navigate('/');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-card animate-slide-up">
                <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                    <div className="logo-icon" style={{ width: 56, height: 56, fontSize: 20, margin: '0 auto 16px', borderRadius: 14, background: 'linear-gradient(135deg, var(--accent), var(--accent-hover))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: 'white' }}>HR</div>
                </div>
                <h1 style={{ textAlign: 'center' }}>Welcome Back</h1>
                <p className="subtitle" style={{ textAlign: 'center' }}>Sign in to your HRM Portal account</p>

                {error && (
                    <div style={{ background: 'var(--danger-light)', color: 'var(--danger)', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 13, fontWeight: 500 }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Email Address</label>
                        <input type="email" className="form-control" placeholder="admin@hrm.com" value={email} onChange={e => setEmail(e.target.value)} required />
                    </div>
                    <div className="form-group">
                        <label>Password</label>
                        <input type="password" className="form-control" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
                    </div>
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>

                <div className="login-footer">
                    Don't have an account? <Link to="/register">Sign up</Link>
                </div>

                <div style={{ marginTop: 20, padding: '12px 16px', background: 'var(--accent-light)', borderRadius: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
                    <strong style={{ color: 'var(--accent-hover)' }}>Demo Credentials:</strong><br />
                    Admin: admin@hrm.com / admin123<br />
                    HR: hr@hrm.com / admin123<br />
                    Employee: john@hrm.com / admin123
                </div>
            </div>
        </div>
    );
}
