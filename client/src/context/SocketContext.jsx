import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
    const { token, user, apiFetch } = useAuth();
    const [socket, setSocket] = useState(null);
    const [onlineUsers, setOnlineUsers] = useState(new Set());
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0); // System notifications
    const [unreadMessages, setUnreadMessages] = useState(0); // Chat messages
    const [toasts, setToasts] = useState([]);

    useEffect(() => {
        if (!token || !user) {
            if (socket) {
                socket.disconnect();
                setSocket(null);
            }
            return;
        }

        // Request Notification Permission
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }

        fetchUnreadMessages();

        const newSocket = io({
            auth: { token },
            transports: ['websocket', 'polling'],
        });

        newSocket.on('connect', () => {
            console.log('Socket connected');
        });

        newSocket.on('user_online', ({ userId }) => {
            setOnlineUsers(prev => new Set(prev).add(userId));
        });

        newSocket.on('user_offline', ({ userId }) => {
            setOnlineUsers(prev => {
                const next = new Set(prev);
                next.delete(userId);
                return next;
            });
        });

        newSocket.on('notification', (data) => {
            setUnreadCount(prev => prev + 1);
            addToast(data.title, data.type || 'info');

            if (document.hidden && Notification.permission === 'granted') {
                new Notification(data.title, {
                    body: data.message || 'New system notification',
                    icon: '/vite.svg'
                });
            }
        });

        newSocket.on('new_message', (data) => {
            // Only increment if we are not the sender
            if (data.senderId !== user.id) {
                setUnreadMessages(prev => prev + 1);
                addToast(`New message from ${data.senderName}`, 'info');

                if (document.hidden && Notification.permission === 'granted') {
                    new Notification(`New message from ${data.senderName}`, {
                        body: data.content,
                        icon: data.senderAvatar || '/vite.svg'
                    });
                }
            }
        });

        newSocket.on('attendance_update', (data) => {
            const msg = `${data.name} ${data.type === 'clock_in' ? 'clocked in' : 'clocked out'}`;
            addToast(msg, 'info');
            if (document.hidden && Notification.permission === 'granted') {
                new Notification('Attendance Update', {
                    body: msg,
                    icon: '/vite.svg'
                });
            }
        });

        setSocket(newSocket);

        return () => {
            newSocket.disconnect();
        };
    }, [token, user?.id]);

    const fetchUnreadMessages = async () => {
        try {
            const res = await apiFetch('/messages/unread');
            if (res.ok) {
                const data = await res.json();
                setUnreadMessages(data.count);
            }
        } catch (err) { console.error(err); }
    };

    const addToast = (message, type = 'info') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 4000);
    };

    return (
        <SocketContext.Provider value={{ socket, onlineUsers, notifications, setNotifications, unreadCount, setUnreadCount, unreadMessages, fetchUnreadMessages, toasts, addToast }}>
            {children}
        </SocketContext.Provider>
    );
}

export const useSocket = () => useContext(SocketContext);
