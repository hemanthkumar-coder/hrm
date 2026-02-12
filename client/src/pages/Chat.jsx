import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { Send, MessageCircle, ArrowLeft } from 'lucide-react';

export default function Chat() {
    const { apiFetch, user } = useAuth();
    const { socket, onlineUsers, fetchUnreadMessages } = useSocket();
    const [contacts, setContacts] = useState([]);
    const [selectedContact, setSelectedContact] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [typing, setTyping] = useState(null);
    const [mobileShowChat, setMobileShowChat] = useState(false);
    const messagesEndRef = useRef(null);
    const typingTimeoutRef = useRef(null);

    useEffect(() => { fetchContacts(); }, []);

    useEffect(() => {
        if (!socket) return;

        const handleNewMessage = (msg) => {
            if (selectedContact && (msg.senderId === selectedContact.id || msg.receiverId === selectedContact.id)) {
                setMessages(prev => [...prev, msg]);
                if (msg.senderId === selectedContact.id) {
                    socket.emit('mark_read', { senderId: msg.senderId });
                    setTimeout(fetchUnreadMessages, 500);
                }
            }
            fetchContacts();
        };

        const handleMessageSent = (msg) => {
            setMessages(prev => [...prev, msg]);
        };

        const handleTyping = (data) => {
            if (selectedContact && data.userId === selectedContact.id) {
                setTyping(data.isTyping ? selectedContact : null);
                if (data.isTyping) {
                    setTimeout(() => setTyping(null), 3000);
                }
            }
        };

        socket.on('new_message', handleNewMessage);
        socket.on('message_sent', handleMessageSent);
        socket.on('user_typing', handleTyping);

        return () => {
            socket.off('new_message', handleNewMessage);
            socket.off('message_sent', handleMessageSent);
            socket.off('user_typing', handleTyping);
        };
    }, [socket, selectedContact]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const fetchContacts = async () => {
        try {
            const res = await apiFetch('/messages');
            if (res.ok) setContacts(await res.json());
        } catch (err) { console.error(err); }
    };

    const selectContact = async (contact) => {
        setSelectedContact(contact);
        setMobileShowChat(true);
        try {
            const res = await apiFetch(`/messages/${contact.id}`);
            if (res.ok) {
                setMessages(await res.json());
                fetchUnreadMessages();
            }
        } catch (err) { console.error(err); }
    };

    const handleBackToContacts = () => {
        setMobileShowChat(false);
    };

    const sendMessage = (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedContact || !socket) return;

        socket.emit('send_message', {
            receiverId: selectedContact.id,
            content: newMessage.trim(),
        });

        setNewMessage('');
        socket.emit('typing', { receiverId: selectedContact.id, isTyping: false });
    };

    const handleTyping = (e) => {
        setNewMessage(e.target.value);
        if (!socket || !selectedContact) return;

        socket.emit('typing', { receiverId: selectedContact.id, isTyping: true });

        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            socket.emit('typing', { receiverId: selectedContact.id, isTyping: false });
        }, 2000);
    };

    const formatTime = (ts) => {
        if (!ts) return '';
        return new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    };

    const getInitials = (firstName, lastName) => {
        return `${(firstName || '')[0] || ''}${(lastName || '')[0] || ''}`.toUpperCase();
    };

    return (
        <div className={`chat-layout animate-slide-up ${mobileShowChat ? 'mobile-chat-active' : ''}`}>
            {/* Contacts */}
            <div className="chat-contacts">
                <div className="chat-contacts-header">Messages</div>
                <div className="chat-contacts-list">
                    {contacts.map(contact => (
                        <div
                            key={contact.id}
                            className={`chat-contact ${selectedContact?.id === contact.id ? 'active' : ''}`}
                            onClick={() => selectContact(contact)}
                        >
                            <div className="chat-contact-avatar">
                                {getInitials(contact.firstName, contact.lastName)}
                                {onlineUsers.has(contact.id) && <div className="online-dot" />}
                            </div>
                            <div className="chat-contact-info">
                                <div className="contact-name">{contact.firstName} {contact.lastName}</div>
                                <div className="last-message">{contact.lastMessage || contact.designation || 'Start a conversation'}</div>
                            </div>
                            {contact.unreadCount > 0 && (
                                <span style={{ background: 'var(--accent)', color: 'white', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10, minWidth: 20, textAlign: 'center' }}>
                                    {contact.unreadCount}
                                </span>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Chat Area */}
            {selectedContact ? (
                <div className="chat-main">
                    <div className="chat-header">
                        <button className="chat-back-btn" onClick={handleBackToContacts}>
                            <ArrowLeft size={20} />
                        </button>
                        <div className="chat-contact-avatar" style={{ width: 36, height: 36, fontSize: 13 }}>
                            {getInitials(selectedContact.firstName, selectedContact.lastName)}
                            {onlineUsers.has(selectedContact.id) && <div className="online-dot" style={{ width: 10, height: 10 }} />}
                        </div>
                        <div>
                            <div style={{ fontWeight: 600, fontSize: 15 }}>{selectedContact.firstName} {selectedContact.lastName}</div>
                            <div style={{ fontSize: 12, color: onlineUsers.has(selectedContact.id) ? 'var(--success)' : 'var(--text-muted)' }}>
                                {onlineUsers.has(selectedContact.id) ? 'Online' : 'Offline'}
                            </div>
                        </div>
                    </div>

                    <div className="chat-messages">
                        {messages.map(msg => (
                            <div key={msg.id} className={`chat-message ${msg.senderId === user.id ? 'sent' : 'received'}`}>
                                <div>{msg.content}</div>
                                <div className="msg-time">{formatTime(msg.createdAt)}</div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>

                    <div className="chat-typing">
                        {typing && `${selectedContact.firstName} is typing...`}
                    </div>

                    <form className="chat-input-area" onSubmit={sendMessage}>
                        <input
                            type="text"
                            value={newMessage}
                            onChange={handleTyping}
                            placeholder="Type a message..."
                            autoFocus
                        />
                        <button type="submit" className="btn btn-primary" disabled={!newMessage.trim()}>
                            <Send size={18} />
                        </button>
                    </form>
                </div>
            ) : (
                <div className="chat-empty">
                    <MessageCircle size={64} style={{ opacity: 0.2 }} />
                    <div style={{ fontSize: 18, fontWeight: 600 }}>Select a conversation</div>
                    <div style={{ fontSize: 14 }}>Choose a contact to start messaging</div>
                </div>
            )}
        </div>
    );
}
