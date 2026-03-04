import React, { useEffect, useState } from 'react';
import styles from './ToastNotification.module.css';

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
            case 'success':
                return '✅';
            case 'warning':
                return '⚠️';
            case 'error':
                return '❌';
            case 'info':
            default:
                return '🔔';
        }
    };

    const getBackgroundColor = () => {
        switch (type) {
            case 'success':
                return '#10b981';
            case 'warning':
                return '#f59e0b';
            case 'error':
                return '#ef4444';
            case 'info':
            default:
                return '#3b82f6';
        }
    };

    return (
        <div
            className={`${styles.toast} ${isVisible ? styles.show : styles.hide}`}
            style={{
                backgroundColor: getBackgroundColor(),
                animation: isVisible ? 'slideIn 0.3s ease-out' : 'slideOut 0.3s ease-in'
            }}
        >
            <div className={styles.icon}>{getIcon()}</div>
            <div className={styles.message}>{message}</div>
            <button
                className={styles.closeBtn}
                onClick={() => {
                    setIsVisible(false);
                    setTimeout(() => onClose && onClose(), 300);
                }}
            >
                ✕
            </button>
        </div>
    );
};

export default ToastNotification;