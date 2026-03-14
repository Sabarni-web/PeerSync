import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const socketRef = useRef(null);

  // Incoming session request (for mentors)
  const [sessionRequest, setSessionRequest] = useState(null);

  const clearRequest = useCallback(() => setSessionRequest(null), []);

  useEffect(() => {
    if (!user?._id) return;

    // Create a single persistent socket for the whole app
    if (!socketRef.current) {
      socketRef.current = io(SOCKET_URL);
    }

    const socket = socketRef.current;

    socket.on('connect', () => {
      // Register this user to their personal room
      socket.emit('register_user', user._id);
    });

    // If already connected (reconnect case), register immediately
    if (socket.connected) {
      socket.emit('register_user', user._id);
    }

    // ── Mentor receives a new session request ─────────────────────────────
    socket.on('session_request', (data) => {
      setSessionRequest(data);
    });

    // ── Student: their request was accepted → go to chat ─────────────────
    socket.on('session_accepted', ({ sessionId }) => {
      navigate(`/chat/${sessionId}`);
    });

    // ── Student: their request was declined ───────────────────────────────
    socket.on('session_declined', ({ mentorName }) => {
      setSessionRequest({ declined: true, mentorName });
    });

    return () => {
      socket.off('session_request');
      socket.off('session_accepted');
      socket.off('session_declined');
    };
  }, [user?._id]);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, sessionRequest, clearRequest }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);

export default SocketContext;
