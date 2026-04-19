import React, { useEffect, useState } from 'react';
import styles from "./TableDetail.module.css";

const ToastNotification = ({ message, type = 'info', duration = 5000, onClose }) => {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(false);
            setTimeout(() => onClose && onClose(), 300);
        }, duration);

        return () => clearTimeout(timer);
    }, [duration, onClose]);

    const getIcon = () => {
        switch (type) {
            case 'success': return '✅';
            case 'warning': return '⚠️';
            case 'error': return '❌';
            default: return '🔔';
        }
    };

    const getBackgroundColor = () => {
        switch (type) {
            case 'success': return '#10b981';
            case 'warning': return '#f59e0b';
            case 'error': return '#ef4444';
            default: return '#3b82f6';
        }
    };

    return (
        <div
            style={{
                position: 'relative',
                marginBottom: '10px',
                padding: '12px 16px',
                borderRadius: '8px',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                minWidth: '280px',
                maxWidth: '400px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                backgroundColor: getBackgroundColor(),
                animation: isVisible ? 'slideIn 0.3s ease-out' : 'slideOut 0.3s ease-in',
                pointerEvents: 'auto'
            }}
        >
            <style>
                {`
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
                    @keyframes slideOut {
                        from {
                            transform: translateX(0);
                            opacity: 1;
                        }
                        to {
                            transform: translateX(100%);
                            opacity: 0;
                        }
                    }
                `}
            </style>
            <div style={{ fontSize: '20px' }}>{getIcon()}</div>
            <div style={{ flex: 1, fontSize: '14px', whiteSpace: 'pre-line' }}>{message}</div>
            <button
                onClick={() => {
                    setIsVisible(false);
                    setTimeout(() => onClose && onClose(), 300);
                }}
                style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '16px',
                    padding: '4px'
                }}
            >
                ✕
            </button>
        </div>
    );
};

export default ToastNotification;