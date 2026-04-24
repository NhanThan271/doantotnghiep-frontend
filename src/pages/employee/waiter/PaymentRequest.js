import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './PaymentRequest.css';

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
const fmtDate = (d) =>
    d ? new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    }).format(new Date(d)) : '—';

const STATUS_LABEL = {
    PENDING: 'Chờ xác nhận',
    CONFIRMED: 'Đã xác nhận',
    PREPARING: 'Đang chế biến',
    COMPLETED: 'Hoàn thành',
    PAID: 'Đã thanh toán',
    CANCELED: 'Đã hủy',
};
const STATUS_CLASS = {
    PENDING: 'status-pending',
    CONFIRMED: 'status-confirmed',
    PREPARING: 'status-preparing',
    COMPLETED: 'status-completed',
    PAID: 'status-paid',
    CANCELED: 'status-canceled',
};

// ─────────────────────────────────────────────
// MODAL: HÓA ĐƠN
// ─────────────────────────────────────────────
function BillModal({ bill, onClose, onExport }) {
    if (!bill) return null;
    const order = bill.order || {};
    const location = order.room ? `Phòng VIP ${order.room.number}`
        : order.table ? `Bàn ${order.table.number}`
            : order.locationDetail || '—';

    return (
        <div className="pr-modal-backdrop" onClick={onClose}>
            <div className="pr-modal" onClick={e => e.stopPropagation()}>
                <div className="pr-modal-header">
                    <div className="pr-modal-title"><span className="pr-modal-icon">🧾</span>Hóa đơn #{bill.id}</div>
                    <button className="pr-modal-close" onClick={onClose}>✕</button>
                </div>
                <div className="pr-modal-body">
                    <div className="bill-meta-grid">
                        {[
                            ['Đơn hàng', `#${order.id}`],
                            ['Vị trí', location],
                            ['Thanh toán', bill.paymentMethod || '—'],
                            ['Thời gian', fmtDate(bill.issuedAt)],
                            ['Trạng thái', bill.paymentStatus === 'PAID' ? '✔ Đã thanh toán' : bill.paymentStatus],
                        ].map(([label, val], i) => (
                            <div key={i} className="bill-meta-item">
                                <span className="bill-meta-label">{label}</span>
                                <span className={`bill-meta-val${i === 4 && bill.paymentStatus === 'PAID' ? ' bill-pay-status paid' : ''}`}>{val}</span>
                            </div>
                        ))}
                    </div>
                    <div className="bill-items-title">Chi tiết món ăn</div>
                    <table className="bill-table">
                        <thead><tr><th>Món</th><th className="text-center">SL</th><th className="text-right">Đơn giá</th><th className="text-right">Thành tiền</th></tr></thead>
                        <tbody>
                            {(order.items || []).map((item, i) => (
                                <tr key={i}>
                                    <td>
                                        <div className="item-name">{item.food?.name || '—'}</div>
                                        {item.note && <div className="item-note">📝 {item.note}</div>}
                                    </td>
                                    <td className="text-center">{item.quantity}</td>
                                    <td className="text-right">{fmtPrice(item.price)}</td>
                                    <td className="text-right">{fmtPrice(Number(item.price) * item.quantity)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div className="bill-total-row">
                        <span>Tổng thanh toán</span>
                        <span className="bill-total-amount">{fmtPrice(bill.totalAmount)}</span>
                    </div>
                    {bill.notes && <div className="bill-notes">📝 {bill.notes}</div>}
                </div>
                <div className="pr-modal-footer">
                    <button className="pr-btn pr-btn-ghost" onClick={onClose}>Đóng</button>
                    <button className="pr-btn pr-btn-export" onClick={onExport}>⬇ Xuất PDF</button>
                </div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────
export default function PaymentRequest() {
    const navigate = useNavigate();
    const location = useLocation();
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : {};
    const branchId = user?.branch?.id || user?.branchId;

    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('COMPLETED');
    const [bill, setBill] = useState(null);
    const [billLoading, setBillLoading] = useState(false);
    const [toasts, setToasts] = useState([]);

    const toast = useCallback((type, msg) => {
        const id = Date.now();
        setToasts(p => [...p, { id, type, msg }]);
        setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000);
    }, []);

    const fetchOrders = useCallback(async () => {
        setLoading(true);
        try {
            const r = await apiFetch('/api/customer/orders');
            const data = await r.json();
            const branch = Array.isArray(data) ? data.filter(o => o.branch?.id === branchId) : [];
            setOrders(branch.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
        } catch { toast('error', 'Không thể tải danh sách đơn hàng'); }
        finally { setLoading(false); }
    }, [branchId]);

    // Handle redirect back from PayOS
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const payos = params.get('payos');
        const orderId = params.get('orderId');
        if (!payos) return;

        // Clean up URL
        navigate(location.pathname, { replace: true });

        if (payos === 'success' && orderId) {
            // Mark order as paid
            apiFetch(`/api/customer/orders/${orderId}/pay?paymentMethod=BANKING`, { method: 'PUT' })
                .catch(() => { });
            toast('success', `✔ Đơn #${orderId} đã thanh toán thành công!`);
            setFilterStatus('PAID');
            fetchOrders();
        } else if (payos === 'cancel') {
            toast('warning', 'Bạn đã hủy thanh toán. Đơn hàng chưa được thanh toán.');
        }
    }, []);

    // Re-fetch when navigating back from PaymentQR (in case order was paid)
    useEffect(() => { fetchOrders(); }, [fetchOrders]);

    const filtered = orders.filter(o => {
        if (filterStatus !== 'all' && o.status !== filterStatus) return false;
        if (search) {
            const s = search.toLowerCase();
            return String(o.id).includes(s) || o.table?.number?.toString().includes(s) || o.room?.number?.toString().includes(s);
        }
        return true;
    });

    const handleViewBill = async (orderId) => {
        setBillLoading(true);
        try {
            const r = await apiFetch('/api/employee/bills');
            const data = await r.json();
            const found = Array.isArray(data) ? data.find(b => b.order?.id === orderId) : null;
            if (!found) { toast('error', 'Chưa có hóa đơn cho đơn này'); return; }
            setBill(found);
        } catch { toast('error', 'Không thể tải hóa đơn'); }
        finally { setBillLoading(false); }
    };

    const handleExportBill = async () => {
        if (!bill) return;
        try {
            const r = await apiFetch(`/api/employee/bills/${bill.id}/export`);
            if (!r.ok) throw new Error();
            const blob = await r.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = `hoa-don-${bill.id}.pdf`; a.click();
            URL.revokeObjectURL(url);
        } catch { toast('error', 'Không thể xuất PDF'); }
    };

    // ── Navigate to QR page instead of opening modal ──
    const handlePayQR = (order) => {
        navigate(`/waiter/payment-requests/${order.id}`, { state: { order } });
    };

    const getLocation = o => o.room ? `Phòng VIP ${o.room.number}` : o.table ? `Bàn ${o.table.number}` : o.locationDetail || '—';
    const canPay = s => ['CONFIRMED', 'PREPARING', 'COMPLETED'].includes(s);

    const STATUS_OPTIONS = [
        { value: 'all', label: 'Tất cả' },
        { value: 'CONFIRMED', label: 'Đã xác nhận' },
        { value: 'PREPARING', label: 'Đang làm' },
        { value: 'COMPLETED', label: 'Hoàn thành' },
        { value: 'PAID', label: 'Đã thanh toán' },
        { value: 'CANCELED', label: 'Đã hủy' },
    ];

    return (
        <div className="pr-page">
            <div className="pr-header">
                <div>
                    <h1 className="pr-title">Yêu cầu thanh toán</h1>
                    <p className="pr-subtitle">Tạo mã QR chuyển khoản qua PayOS</p>
                </div>
                <button className="pr-btn pr-btn-refresh" onClick={fetchOrders}>↻ Làm mới</button>
            </div>

            <div className="pr-filter-bar">
                <div className="pr-search-wrap">
                    <span className="pr-search-icon">🔍</span>
                    <input className="pr-search" placeholder="Tìm theo đơn #, bàn số..."
                        value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <div className="pr-status-tabs">
                    {STATUS_OPTIONS.map(s => (
                        <button key={s.value}
                            className={`pr-status-tab ${filterStatus === s.value ? 'active' : ''}`}
                            onClick={() => setFilterStatus(s.value)}>{s.label}</button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="pr-loading"><div className="pr-spinner" /><span>Đang tải...</span></div>
            ) : filtered.length === 0 ? (
                <div className="pr-empty"><span className="pr-empty-icon">🧾</span><p>Không có đơn hàng nào</p></div>
            ) : (
                <div className="pr-list">
                    {filtered.map(order => {
                        const total = Number(order.totalAmount) || 0;
                        const itemCount = (order.items || []).length;
                        return (
                            <div key={order.id} className={`pr-card ${order.status === 'PAID' ? 'pr-card-paid' : ''}`}>
                                <div className="pr-card-top">
                                    <div className="pr-card-id-wrap">
                                        <span className="pr-card-id">Đơn #{order.id}</span>
                                        <span className={`pr-status-badge ${STATUS_CLASS[order.status] || ''}`}>
                                            {STATUS_LABEL[order.status] || order.status}
                                        </span>
                                    </div>
                                    <div className="pr-card-total">{fmtPrice(total)}</div>
                                </div>
                                <div className="pr-card-meta">
                                    <span>📍 {getLocation(order)}</span>
                                    <span>🕐 {fmtDate(order.createdAt)}</span>
                                    <span>🍽️ {itemCount} món</span>
                                </div>
                                <div className="pr-card-items">
                                    {(order.items || []).slice(0, 3).map((item, i) => (
                                        <div key={i} className="pr-card-item-row">
                                            <span className="pr-card-item-name">{item.food?.name || '—'}</span>
                                            <span className="pr-card-item-qty">×{item.quantity}</span>
                                            <span className="pr-card-item-price">{fmtPrice(Number(item.price || 0) * item.quantity)}</span>
                                        </div>
                                    ))}
                                    {itemCount > 3 && <div className="pr-card-more">+{itemCount - 3} món khác</div>}
                                </div>
                                <div className="pr-card-actions">
                                    {order.status === 'PAID' ? (
                                        <button className="pr-btn pr-btn-bill" disabled={billLoading}
                                            onClick={() => handleViewBill(order.id)}>🧾 Xem hóa đơn</button>
                                    ) : canPay(order.status) ? (
                                        <button className="pr-btn pr-btn-pay"
                                            onClick={() => handlePayQR(order)}>
                                            🏦 Tạo QR thanh toán
                                        </button>
                                    ) : (
                                        <span className="pr-card-no-action">Chưa thể thanh toán</span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {bill && <BillModal bill={bill} onClose={() => setBill(null)} onExport={handleExportBill} />}

            <div className="pr-toast-container">
                {toasts.map(t => (
                    <div key={t.id} className={`pr-toast pr-toast-${t.type}`}>{t.msg}</div>
                ))}
            </div>
        </div>
    );
}