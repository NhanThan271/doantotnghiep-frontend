// pages/employee/chef/ToastNotification.js
import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

const ToastNotification = ({ message, type = 'info', duration = 5000, onClose }) => {
    const [isVisible, setIsVisible] = useState(true);
    const [progress, setProgress] = useState(100);

    useEffect(() => {
        const interval = setInterval(() => {
            setProgress((prev) => {
                if (prev <= 0) {
                    clearInterval(interval);
                    return 0;
                }
                return prev - (100 / (duration / 100));
            });
        }, 100);

        const timer = setTimeout(() => {
            setIsVisible(false);
            setTimeout(onClose, 300);
        }, duration);

        return () => {
            clearInterval(interval);
            clearTimeout(timer);
        };
    }, [duration, onClose]);

    const getIcon = () => {
        switch (type) {
            case 'success':
                return <CheckCircle size={24} />;
            case 'error':
            case 'warning':
                return <AlertCircle size={24} />;
            default:
                return <Info size={24} />;
        }
    };

    const getColors = () => {
        switch (type) {
            case 'success':
                return {
                    bg: '#10b981',
                    progressBg: '#059669'
                };
            case 'error':
                return {
                    bg: '#ef4444',
                    progressBg: '#dc2626'
                };
            case 'warning':
                return {
                    bg: '#f59e0b',
                    progressBg: '#d97706'
                };
            default:
                return {
                    bg: '#3b82f6',
                    progressBg: '#2563eb'
                };
        }
    };

    const colors = getColors();

    return (
        <div
            style={{
                position: 'relative',
                minWidth: '300px',
                maxWidth: '400px',
                background: colors.bg,
                color: 'white',
                padding: '16px',
                borderRadius: '12px',
                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                transform: isVisible ? 'translateX(0)' : 'translateX(120%)',
                opacity: isVisible ? 1 : 0,
                transition: 'all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
                overflow: 'hidden'
            }}
        >
            <div style={{ flexShrink: 0 }}>
                {getIcon()}
            </div>

            <div style={{ flex: 1, paddingRight: '8px' }}>
                <p style={{
                    margin: 0,
                    fontSize: '14px',
                    fontWeight: '500',
                    lineHeight: '1.4',
                    whiteSpace: 'pre-line'
                }}>
                    {message}
                </p>
            </div>

            <button
                onClick={() => {
                    setIsVisible(false);
                    setTimeout(onClose, 300);
                }}
                style={{
                    background: 'rgba(255, 255, 255, 0.2)',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '4px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'background 0.2s',
                    flexShrink: 0
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                }}
            >
                <X size={16} color="white" />
            </button>

            <div
                style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    height: '4px',
                    background: colors.progressBg,
                    width: `${progress}%`,
                    transition: 'width 0.1s linear',
                    borderBottomLeftRadius: '12px',
                    borderBottomRightRadius: progress > 98 ? '12px' : '0'
                }}
            />
        </div>
    );
};

export default ToastNotification;