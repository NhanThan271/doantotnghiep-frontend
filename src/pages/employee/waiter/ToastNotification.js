// src/pages/employee/waiter/ToastNotification.js
import React, { useEffect } from 'react';

const ToastNotification = ({ message, type = 'info', duration = 5000, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, duration);

        return () => clearTimeout(timer);
    }, [duration, onClose]);

    const getIcon = () => {
        switch (type) {
            case 'success':
                return '✅';
            case 'error':
                return '❌';
            case 'warning':
                return '⚠️';
            default:
                return 'ℹ️';
        }
    };

    const getBackgroundColor = () => {
        switch (type) {
            case 'success':
                return '#10b981';
            case 'error':
                return '#ef4444';
            case 'warning':
                return '#f59e0b';
            default:
                return '#3b82f6';
        }
    };

    return (
        <div style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            background: getBackgroundColor(),
            color: 'white',
            padding: '12px 20px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 9999,
            animation: 'slideIn 0.3s ease-out',
            minWidth: '250px',
            maxWidth: '400px'
        }}>
            <span style={{ fontSize: '18px' }}>{getIcon()}</span>
            <span style={{ flex: 1, fontSize: '14px' }}>{message}</span>
            <button
                onClick={onClose}
                style={{
                    background: 'none',
                    border: 'none',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '16px',
                    padding: '0 4px'
                }}
            >
                ✕
            </button>
            <style>{`
                @keyframes slideIn {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
            `}</style>
        </div>
    );
};

export default ToastNotification;