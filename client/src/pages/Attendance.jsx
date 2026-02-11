import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { Clock, LogIn, LogOut, Users } from 'lucide-react';

export default function Attendance() {
    const { apiFetch, user } = useAuth();
    const { socket } = useSocket();
    const [myStatus, setMyStatus] = useState(null);
    const [todayList, setTodayList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [clockLoading, setClockLoading] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        fetchData();
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (!socket) return;
        const handler = (data) => {
            fetchData();
        };
        socket.on('attendance_update', handler);
        return () => socket.off('attendance_update', handler);
    }, [socket]);

    const fetchData = async () => {
        try {
            const [statusRes, listRes] = await Promise.all([
                apiFetch('/attendance/my-today'),
                apiFetch('/attendance/today'),
            ]);
            if (statusRes.ok) setMyStatus(await statusRes.json());
            if (listRes.ok) setTodayList(await listRes.json());
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const handleClockIn = async () => {
        setClockLoading(true);
        try {
            const res = await apiFetch('/attendance/clock-in', { method: 'POST' });
            if (res.ok) fetchData();
            else {
                const data = await res.json();
                alert(data.error);
            }
        } catch (err) { console.error(err); }
        finally { setClockLoading(false); }
    };

    const handleClockOut = async () => {
        setClockLoading(true);
        try {
            const res = await apiFetch('/attendance/clock-out', { method: 'POST' });
            if (res.ok) fetchData();
            else {
                const data = await res.json();
                alert(data.error);
            }
        } catch (err) { console.error(err); }
        finally { setClockLoading(false); }
    };

    const formatTime = (date) => {
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    };

    const formatDate = (date) => {
        return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    };

    const formatClockTime = (ts) => {
        if (!ts) return '—';
        return new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    };

    if (loading) {
        return <div className="empty-state"><div style={{ animation: 'pulse 1.5s infinite' }}>Loading...</div></div>;
    }

    return (
        <div className="animate-slide-up">
            {/* Clock Section */}
            <div className="clock-section">
                <div>
                    <div className="clock-time">{formatTime(currentTime)}</div>
                    <div className="clock-date">{formatDate(currentTime)}</div>
                </div>
                <div className="clock-actions">
                    {myStatus?.status === 'not_clocked_in' && (
                        <button className="btn btn-success" onClick={handleClockIn} disabled={clockLoading} style={{ padding: '14px 28px', fontSize: 15 }}>
                            <LogIn size={18} /> {clockLoading ? 'Processing...' : 'Clock In'}
                        </button>
                    )}
                    {myStatus?.status === 'clocked_in' && (
                        <>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--success)', fontWeight: 600, fontSize: 14 }}>
                                <div className="status-dot online" /> Clocked in at {formatClockTime(myStatus.clock_in)}
                            </div>
                            <button className="btn btn-danger" onClick={handleClockOut} disabled={clockLoading} style={{ padding: '14px 28px', fontSize: 15 }}>
                                <LogOut size={18} /> {clockLoading ? 'Processing...' : 'Clock Out'}
                            </button>
                        </>
                    )}
                    {myStatus?.status === 'clocked_out' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--text-secondary)', fontSize: 14 }}>
                            <span className="status-badge processed">Day Complete</span>
                            <span>In: {formatClockTime(myStatus.clock_in)} — Out: {formatClockTime(myStatus.clock_out)}</span>
                            <span style={{ color: 'var(--accent-hover)', fontWeight: 700 }}>{myStatus.hours_worked}h worked</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Today's Attendance Board */}
            <div className="card">
                <div className="card-header">
                    <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Users size={18} /> Today's Attendance
                        <span style={{ background: 'var(--accent-light)', color: 'var(--accent-hover)', padding: '2px 10px', borderRadius: 12, fontSize: 13, fontWeight: 700, marginLeft: 8 }}>
                            {todayList.length} present
                        </span>
                    </h3>
                    <div style={{ fontSize: 13, color: 'var(--text-muted) ' }}>Live updates enabled</div>
                </div>

                {todayList.length === 0 ? (
                    <div className="empty-state" style={{ padding: 40 }}>
                        <Clock size={40} />
                        <p>No one has clocked in yet today</p>
                    </div>
                ) : (
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Employee</th>
                                    <th>ID</th>
                                    <th>Department</th>
                                    <th>Clock In</th>
                                    <th>Clock Out</th>
                                    <th>Hours</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {todayList.map(att => (
                                    <tr key={att.id}>
                                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{att.name}</td>
                                        <td style={{ fontFamily: 'monospace' }}>{att.empCode}</td>
                                        <td>{att.department || '—'}</td>
                                        <td style={{ color: 'var(--success)' }}>{formatClockTime(att.clockIn)}</td>
                                        <td style={{ color: att.clockOut ? 'var(--danger)' : 'var(--text-muted)' }}>{att.clockOut ? formatClockTime(att.clockOut) : '—'}</td>
                                        <td style={{ fontWeight: 600 }}>{att.hoursWorked ? `${att.hoursWorked}h` : '—'}</td>
                                        <td>
                                            <span className={`status-badge ${att.clockOut ? 'processed' : 'active'}`}>
                                                {att.clockOut ? 'Complete' : 'Working'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
