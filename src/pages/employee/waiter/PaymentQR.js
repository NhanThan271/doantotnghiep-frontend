import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const API = 'http://localhost:8080';
const getToken = () => localStorage.getItem('token');
const apiFetch = (url, opts = {}) =>
    fetch(`${API}${url}`, {
        ...opts,
        headers: {
            Authorization: `Bearer ${getToken()}`,
            'Content-Type': 'application/json',
            ...opts.headers,
        },
    });

const fmtPrice = (v) => new Intl.NumberFormat('vi-VN').format(Number(v) || 0) + 'đ';

export default function PaymentQR() {
    const navigate = useNavigate();
    const location = useLocation();
    const order = location.state?.order;

    const [step, setStep] = useState('loading'); // loading | qr | success | error
    const [qrData, setQrData] = useState(null);
    const [errMsg, setErrMsg] = useState('');
    const [countdown, setCountdown] = useState(300);
    const pollingRef = useRef(null);
    const countdownRef = useRef(null);

    const total = Number(order?.totalAmount) || 0;
    const getLocation = (o) =>
        o?.room ? `Phòng VIP ${o.room.number}`
            : o?.table ? `Bàn ${o.table.number}`
                : o?.locationDetail || '—';

    useEffect(() => {
        if (!order) { navigate(-1); return; }
        createLink();
        return () => {
            clearInterval(pollingRef.current);
            clearInterval(countdownRef.current);
        };
    }, []);

    const createLink = async () => {
        setStep('loading');
        setCountdown(300);
        clearInterval(pollingRef.current);
        clearInterval(countdownRef.current);
        try {
            const orderCode = parseInt(`${Date.now()}`.slice(-7)) + Number(order.id);
            const items = (order.items || []).map(item => ({
                name: (item.food?.name || 'Mon an').slice(0, 25),
                quantity: Number(item.quantity) || 1,
                price: Math.round(Number(item.price) || 0),
            }));
            const payload = {
                orderCode,
                amount: Math.round(total),
                description: `Don ${order.id}`.slice(0, 25),
                returnUrl: `${window.location.origin}/waiter/payment-requests?payos=success&orderId=${order.id}`,
                cancelUrl: `${window.location.origin}/waiter/payment-requests?payos=cancel&orderId=${order.id}`,
                items,
            };
            const r = await apiFetch('/api/payos/create', {
                method: 'POST',
                body: JSON.stringify(payload),
            });
            if (!r.ok) {
                const err = await r.json().catch(() => ({}));
                throw new Error(err.message || err.error || 'Tạo link PayOS thất bại');
            }
            const raw = await r.json();
            const res = raw.data || raw;
            if (!res.qrCode && !res.checkoutUrl) throw new Error('Không nhận được QR từ PayOS');

            setQrData({ qrCode: res.qrCode, checkoutUrl: res.checkoutUrl, orderCode });
            setStep('qr');
            startPolling(orderCode);
            startCountdown();
            // Tự động mở trang thanh toán PayOS
            if (res.checkoutUrl) {
                window.location.href = res.checkoutUrl;
            }
        } catch (e) {
            setErrMsg(e.message);
            setStep('error');
        }
    };

    const startPolling = (orderCode) => {
        pollingRef.current = setInterval(async () => {
            try {
                const r = await apiFetch(`/api/payos/check-status/${orderCode}`);
                if (!r.ok) return;
                const raw = await r.json();
                const res = raw.data || raw;
                if (res.status === 'PAID' || res.code === '00') {
                    clearInterval(pollingRef.current);
                    clearInterval(countdownRef.current);
                    await apiFetch(
                        `/api/customer/orders/${order.id}/pay?paymentMethod=BANKING`,
                        { method: 'PUT' }
                    );
                    setStep('success');
                    setTimeout(() => navigate(-1), 2800);
                }
            } catch { /* ignore */ }
        }, 3000);
    };

    const startCountdown = () => {
        countdownRef.current = setInterval(() => {
            setCountdown(c => {
                if (c <= 1) {
                    clearInterval(countdownRef.current);
                    clearInterval(pollingRef.current);
                    setErrMsg('Hết thời gian thanh toán. Vui lòng thử lại.');
                    setStep('error');
                    return 0;
                }
                return c - 1;
            });
        }, 1000);
    };

    const fmt = (s) =>
        `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

    const progress = ((300 - countdown) / 300) * 100;

    if (!order) return null;

    return (
        <div style={styles.page}>
            <div style={styles.blob1} />
            <div style={styles.blob2} />

            <div style={styles.container}>
                <div style={styles.card}>
                    {step === 'loading' && (
                        <div style={styles.center}>
                            <div style={styles.spinnerRing} />
                            <p style={styles.hint}>Đang tạo mã QR thanh toán...</p>
                        </div>
                    )}

                    {step === 'success' && (
                        <div style={styles.center}>
                            <div style={styles.successIcon}>✅</div>
                            <h3 style={{ margin: '12px 0 6px', fontSize: 22, color: '#065f46' }}>
                                Thanh toán thành công!
                            </h3>
                            <p style={{ color: '#64748b', fontSize: 14, margin: 0 }}>
                                Đơn #{order.id} đã được xác nhận
                            </p>
                            <p style={{ color: '#94a3b8', fontSize: 12, marginTop: 8 }}>
                                Đang quay lại...
                            </p>
                        </div>
                    )}

                    {step === 'error' && (
                        <div style={styles.center}>
                            <div style={{ fontSize: 52, marginBottom: 12 }}>❌</div>
                            <p style={{ color: '#991b1b', fontSize: 14, textAlign: 'center', margin: '0 0 20px' }}>
                                {errMsg}
                            </p>
                            <button style={styles.retryBtn} onClick={createLink}>
                                🔄 Thử lại
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.3; } }
                @keyframes scanMove {
                    0% { top: 0; opacity: 1; }
                    90% { top: calc(100% - 2px); opacity: 1; }
                    100% { top: calc(100% - 2px); opacity: 0; }
                }
                @keyframes successBounce {
                    0% { transform: scale(0.5); opacity: 0; }
                    60% { transform: scale(1.2); }
                    100% { transform: scale(1); opacity: 1; }
                }
            `}</style>
        </div>
    );
}

const styles = {
    page: {
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f0f4ff 0%, #fafafa 50%, #f0fdf4 100%)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '32px 16px 48px',
        fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
        position: 'relative',
        overflow: 'hidden',
    },
    blob1: {
        position: 'absolute', top: -120, right: -80,
        width: 400, height: 400,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)',
        pointerEvents: 'none',
    },
    blob2: {
        position: 'absolute', bottom: -100, left: -80,
        width: 350, height: 350,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(16,185,129,0.1) 0%, transparent 70%)',
        pointerEvents: 'none',
    },
    container: {
        width: '100%', maxWidth: 480,
        display: 'flex', flexDirection: 'column', gap: 16,
        position: 'relative', zIndex: 1,
    },
    card: {
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(226,232,240,0.7)',
        borderRadius: 20,
        padding: '28px 24px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
        minHeight: 360,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
    },
    center: {
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        width: '100%',
    },
    spinnerRing: {
        width: 48, height: 48,
        border: '4px solid #e2e8f0',
        borderTopColor: '#6366f1',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
        marginBottom: 16,
    },
    hint: { fontSize: 14, color: '#64748b', margin: 0 },
    qrContent: {
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: 14, width: '100%',
    },
    bankBadge: {
        background: '#eef2ff', color: '#4f46e5',
        borderRadius: 20, padding: '5px 16px',
        fontSize: 12, fontWeight: 600,
    },
    qrFrame: {
        position: 'relative', width: 220, height: 220,
        background: '#fff', borderRadius: 12,
        padding: 12,
        boxShadow: '0 4px 24px rgba(99,102,241,0.15)',
        overflow: 'hidden',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
    },
    corner: {
        position: 'absolute', width: 20, height: 20,
        border: '3px solid #6366f1',
    },
    cornerTL: { top: 6, left: 6, borderRight: 'none', borderBottom: 'none', borderRadius: '4px 0 0 0' },
    cornerTR: { top: 6, right: 6, borderLeft: 'none', borderBottom: 'none', borderRadius: '0 4px 0 0' },
    cornerBL: { bottom: 6, left: 6, borderRight: 'none', borderTop: 'none', borderRadius: '0 0 0 4px' },
    cornerBR: { bottom: 6, right: 6, borderLeft: 'none', borderTop: 'none', borderRadius: '0 0 4px 0' },
    qrImg: { width: '100%', height: '100%', objectFit: 'contain', borderRadius: 6 },
    qrFallback: {
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
    },
    scanLine: {
        position: 'absolute', left: 12, right: 12,
        height: 2, background: 'linear-gradient(90deg, transparent, #6366f1, transparent)',
        animation: 'scanMove 2.5s ease-in-out infinite',
        borderRadius: 2,
    },
    amountBadge: {
        fontSize: 26, fontWeight: 800,
        color: '#059669',
        letterSpacing: '-0.5px',
    },
    countdownWrap: {
        position: 'relative', width: 80, height: 80,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
    },
    countdownText: {
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
    },
    countdownNum: { fontSize: 14, fontWeight: 700, lineHeight: 1.2 },
    countdownLabel: { fontSize: 10, color: '#94a3b8' },
    pollingRow: {
        display: 'flex', alignItems: 'center', gap: 8,
        fontSize: 12, color: '#64748b',
    },
    pollingDot: {
        width: 8, height: 8, borderRadius: '50%',
        background: '#10b981',
        animation: 'pulse 1.5s ease-in-out infinite',
        flexShrink: 0,
    },
    successIcon: {
        fontSize: 64,
        animation: 'successBounce 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
    },
    retryBtn: {
        padding: '10px 24px',
        background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
        color: '#fff', border: 'none',
        borderRadius: 8, cursor: 'pointer',
        fontSize: 14, fontWeight: 600,
    },
    itemsSummary: {
        background: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(226,232,240,0.7)',
        borderRadius: 14, padding: '16px 18px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    },
    itemsSummaryTitle: {
        fontSize: 13, fontWeight: 600, color: '#475569',
        marginBottom: 10,
    },
    itemRow: {
        display: 'flex', alignItems: 'center', gap: 8,
        fontSize: 13, padding: '6px 0',
        borderBottom: '1px solid #f1f5f9',
    },
    itemName: { flex: 1, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
    itemQty: { color: '#94a3b8', fontSize: 12 },
    itemPrice: { color: '#475569', fontWeight: 600, fontSize: 12, whiteSpace: 'nowrap' },
    itemsTotalRow: {
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        paddingTop: 10, marginTop: 4,
        fontSize: 14, color: '#0f172a',
    },
    itemsTotalAmt: {
        fontSize: 18, fontWeight: 800, color: '#059669',
    },
};