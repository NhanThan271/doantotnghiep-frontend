import io from 'socket.io-client';

const SOCKET_URL = 'http://localhost:3001'; // Kết nối đến socket server của bạn

class WebSocketService {
    constructor() {
        this.socket = null;
        this.connected = false;
    }

    connect(role, userData = {}) {
        if (this.socket && this.connected) {
            console.log('Socket already connected');
            return;
        }

        this.socket = io(SOCKET_URL, {
            transports: ['websocket'],
            reconnection: true,
            reconnectionAttempts: 5
        });

        this.socket.on('connect', () => {
            console.log('✅ Socket connected to server at', SOCKET_URL);
            this.connected = true;

            // Đăng ký role với socket server
            this.socket.emit('register-role', {
                role: role,
                userId: userData.id,
                branchId: userData.branchId
            });
        });

        this.socket.on('disconnect', () => {
            console.log('❌ Socket disconnected');
            this.connected = false;
        });

        this.socket.on('connect_error', (error) => {
            console.error('Socket connection error:', error);
            this.connected = false;
        });

        return this.socket;
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.connected = false;
            this.socket = null;
        }
    }

    emit(event, data) {
        if (this.socket && this.connected) {
            this.socket.emit(event, data);
            console.log(`📡 Emitted ${event}:`, data);
        } else {
            console.warn(`Cannot emit ${event}, socket not connected`);
        }
    }

    on(event, callback) {
        if (this.socket) {
            this.socket.on(event, callback);
        }
    }

    off(event, callback) {
        if (this.socket) {
            this.socket.off(event, callback);
        }
    }
}

export const wsService = new WebSocketService();