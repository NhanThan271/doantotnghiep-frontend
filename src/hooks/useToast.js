import { useCallback } from 'react';
import './useToast.css';

const icons = {
    error: 'ti-circle-x',
    warning: 'ti-alert-triangle',
    success: 'ti-circle-check',
    info: 'ti-info-circle'
};

let container = null;

function getContainer() {
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-root';
        Object.assign(container.style, {
            position: 'fixed', top: '24px', right: '24px',
            display: 'flex', flexDirection: 'column', gap: '10px',
            zIndex: '9999', pointerEvents: 'none'
        });
        document.body.appendChild(container);
    }
    return container;
}

function dismissToast(toast) {
    if (!toast || toast.classList.contains('exit')) return;
    toast.classList.add('toast-exit');
    setTimeout(() => toast.remove(), 300);
}

export function showToast(type = 'info', title, msg, duration = 3500) {
    const c = getContainer();
    const toast = document.createElement('div');
    toast.className = `app-toast app-toast--${type}`;
    toast.innerHTML = `
    <div class="app-toast__icon"><i class="ti ${icons[type]}"></i></div>
    <div class="app-toast__body">
      <div class="app-toast__title">${title}</div>
      ${msg ? `<div class="app-toast__msg">${msg}</div>` : ''}
    </div>
    <button class="app-toast__close" aria-label="Đóng">✕</button>
    <div class="app-toast__bar" style="animation-duration:${duration}ms"></div>
  `;
    toast.querySelector('.app-toast__close').onclick = () => dismissToast(toast);
    c.appendChild(toast);
    setTimeout(() => dismissToast(toast), duration);
}