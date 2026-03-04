import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:3001';

export const useInventorySocket = ({
    role,
    branchId,
    userId,
    onNewRequest,
    onRequestStatusChanged,
    onInventoryUpdated,
    onStockChanged
}) => {
    const socketRef = useRef(null);

    useEffect(() => {
        // Kết nối socket
        socketRef.current = io(SOCKET_URL, {
            transports: ['websocket', 'polling']
        });

        const socket = socketRef.current;

        socket.on('connect', () => {
            console.log('✅ Socket connected:', socket.id);

            // Đăng ký role
            socket.emit('register-role', { role, branchId, userId });
        });

        // Admin nhận yêu cầu mới
        if (role === 'admin' && onNewRequest) {
            socket.on('new-inventory-request', onNewRequest);
        }

        // Manager nhận thông báo duyệt/từ chối
        if (role === 'manager' && onRequestStatusChanged) {
            socket.on('inventory-request-status-changed', onRequestStatusChanged);
        }

        // Cả 2 nhận update inventory
        if (onInventoryUpdated) {
            socket.on('inventory-updated', onInventoryUpdated);
        }

        // Cả 2 nhận update stock
        if (onStockChanged) {
            socket.on('inventory-stock-changed', onStockChanged);
        }

        socket.on('disconnect', () => {
            console.log('❌ Socket disconnected');
        });

        // Cleanup
        return () => {
            socket.off('new-inventory-request');
            socket.off('inventory-request-status-changed');
            socket.off('inventory-updated');
            socket.off('inventory-stock-changed');
            socket.disconnect();
        };
    }, [role, branchId, userId, onNewRequest, onRequestStatusChanged, onInventoryUpdated, onStockChanged]);

    // Emit functions
    const emitRequestCreated = useCallback((requestData) => {
        socketRef.current?.emit('inventory-request-created', requestData);
    }, []);

    const emitRequestApproved = useCallback((approvalData) => {
        socketRef.current?.emit('inventory-request-approved', approvalData);
    }, []);

    const emitRequestRejected = useCallback((rejectionData) => {
        socketRef.current?.emit('inventory-request-rejected', rejectionData);
    }, []);

    const emitInventoryUpdated = useCallback((data) => {
        socketRef.current?.emit('branch-inventory-updated', data);
    }, []);

    return {
        emitRequestCreated,
        emitRequestApproved,
        emitRequestRejected,
        emitInventoryUpdated
    };
};