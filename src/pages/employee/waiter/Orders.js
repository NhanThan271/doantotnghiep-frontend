import React, { useState, useEffect, useCallback } from 'react';
import {
    UtensilsCrossed, LayoutGrid, ClipboardList, ChefHat,
    Search, RefreshCw, Users, Clock, CheckCircle,
    Plus, Minus, X, ShoppingCart, MapPin, Send, Eye,
    Coffee, DoorOpen, Layers, Check
} from 'lucide-react';
import './WaiterInterface.css';

const API = 'http://localhost:8080';
const getToken = () => localStorage.getItem('token');
const apiFetch = (url, opts = {}) =>
    fetch(`${API}${url}`, {
        ...opts,
        headers: {
            Authorization: `Bearer ${getToken()}`,
            'Content-Type': 'application/json',
            ...opts.headers
        }
    });

const fmtPrice = v => new Intl.NumberFormat('vi-VN').format(v) + 'đ';
const fmtDate = d => d ? new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(d)) : '-';

// ──────────────────── BADGE COMPONENTS ────────────────────
const StatusBadge = ({ status }) => {
    const map = {
        FREE: ['badge badge-free', '●', 'Trống'],
        OCCUPIED: ['badge badge-occupied', '●', 'Có khách'],
        RESERVED: ['badge badge-reserved', '●', 'Đã đặt'],
        PENDING: ['badge badge-pending', '⏳', 'Chờ'],
        CONFIRMED: ['badge badge-confirmed', '✓', 'Xác nhận'],
        PREPARING: ['badge badge-preparing', '🍳', 'Đang làm'],
        COMPLETED: ['badge badge-completed', '✅', 'Hoàn thành'],
        PAID: ['badge badge-paid', '💳', 'Đã thanh toán'],
        CANCELED: ['badge badge-canceled', '✗', 'Đã hủy'],
        WAITING: ['badge badge-waiting', '⏳', 'Chờ bếp'],
        DONE: ['badge badge-done', '✅', 'Xong'],
    };
    const [cls, icon, text] = map[status] || ['badge badge-pending', '?', status];
    return <span className={cls}>{icon} {text}</span>;
};

// ──────────────────── TOAST ────────────────────
function useToast() {
    const [toasts, setToasts] = useState([]);
    const add = useCallback((type, title, msg) => {
        const id = Date.now() + Math.random();
        setToasts(p => [...p, { id, type, title, msg }]);
        setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000);
    }, []);
    const remove = id => setToasts(p => p.filter(t => t.id !== id));
    return { toasts, add, remove };
}

function ToastContainer({ toasts, remove }) {
    return (
        <div className="toast-container">
            {toasts.map(t => (
                <div key={t.id} className={`toast toast-${t.type}`}>
                    <div className="toast-body">
                        <div className="toast-title">{t.title}</div>
                        {t.msg && <div className="toast-msg">{t.msg}</div>}
                    </div>
                    <button className="toast-close" onClick={() => remove(t.id)}>
                        <X size={14} />
                    </button>
                </div>
            ))}
        </div>
    );
}

// ══════════════════════════════════════════════════════════
// TAB 1: CHỌN BÀN / PHÒNG
// ══════════════════════════════════════════════════════════
function SeatTab({ branchId, onSelectSeat, toast }) {
    const [seatType, setSeatType] = useState('table'); // 'table' | 'room'
    const [tables, setTables] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [areas, setAreas] = useState([]);
    const [selectedArea, setSelectedArea] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);

    const fetchTables = useCallback(async () => {
        if (!branchId) return;
        setLoading(true);
        try {
            const r = await apiFetch('/api/tables');
            const data = await r.json();
            const branch = Array.isArray(data) ? data.filter(t => t.branch?.id === branchId) : [];
            setTables(branch);
            const uniqueAreas = [...new Set(branch.map(t => t.area).filter(Boolean))];
            setAreas(uniqueAreas);
        } catch { toast.add('error', 'Lỗi', 'Không thể tải danh sách bàn'); }
        finally { setLoading(false); }
    }, [branchId]);

    const fetchRooms = useCallback(async () => {
        if (!branchId) return;
        setLoading(true);
        try {
            const r = await apiFetch(`/api/rooms/branch/${branchId}`);
            if (r.ok) setRooms(await r.json());
        } catch { toast.add('error', 'Lỗi', 'Không thể tải danh sách phòng'); }
        finally { setLoading(false); }
    }, [branchId]);

    useEffect(() => { fetchTables(); fetchRooms(); }, [fetchTables, fetchRooms]);

    const updateStatus = async (id, status, type) => {
        const url = type === 'table'
            ? `/api/tables/${id}/status?status=${status}`
            : `/api/rooms/${id}/status?status=${status}`;
        await apiFetch(url, { method: 'PUT' });
        type === 'table' ? fetchTables() : fetchRooms();
        toast.add('success', status === 'OCCUPIED' ? 'Đã mở' : 'Đã đóng', '');
    };

    const filterItems = (items) => {
        let f = items;
        if (filterStatus !== 'all') f = f.filter(i => i.status === filterStatus);
        if (seatType === 'table' && selectedArea !== 'all') f = f.filter(i => i.area === selectedArea);
        if (search) f = f.filter(i => i.number?.toString().includes(search) || i.area?.toLowerCase().includes(search.toLowerCase()));
        return f;
    };

    const items = filterItems(seatType === 'table' ? tables : rooms);
    const stats = {
        free: (seatType === 'table' ? tables : rooms).filter(i => i.status === 'FREE').length,
        occupied: (seatType === 'table' ? tables : rooms).filter(i => i.status === 'OCCUPIED').length,
        reserved: (seatType === 'table' ? tables : rooms).filter(i => i.status === 'RESERVED').length,
    };

    return (
        <div>
            {/* Type switcher */}
            <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
                <div className="type-tabs" style={{ width: 260 }}>
                    <button className={`type-tab ${seatType === 'table' ? 'active' : ''}`} onClick={() => setSeatType('table')}>
                        <LayoutGrid size={15} /> Bàn thường
                    </button>
                    <button className={`type-tab vip ${seatType === 'room' ? 'active' : ''}`} onClick={() => setSeatType('room')}>
                        <DoorOpen size={15} /> Phòng VIP
                    </button>
                </div>

                {/* Stats */}
                <div className="stat-chips" style={{ margin: 0, flex: 1 }}>
                    <div className="stat-chip">
                        <div className="stat-chip-icon" style={{ background: 'rgba(16,185,129,0.1)' }}>✅</div>
                        <div><div className="stat-chip-value" style={{ color: '#059669' }}>{stats.free}</div><div className="stat-chip-label">Trống</div></div>
                    </div>
                    <div className="stat-chip">
                        <div className="stat-chip-icon" style={{ background: 'rgba(239,68,68,0.1)' }}>🔴</div>
                        <div><div className="stat-chip-value" style={{ color: '#dc2626' }}>{stats.occupied}</div><div className="stat-chip-label">Có khách</div></div>
                    </div>
                    <div className="stat-chip">
                        <div className="stat-chip-icon" style={{ background: 'rgba(245,158,11,0.1)' }}>🕐</div>
                        <div><div className="stat-chip-value" style={{ color: '#d97706' }}>{stats.reserved}</div><div className="stat-chip-label">Đã đặt</div></div>
                    </div>
                </div>

                <button className="btn btn-ghost btn-sm" onClick={() => { fetchTables(); fetchRooms(); }}>
                    <RefreshCw size={14} /> Làm mới
                </button>
            </div>

            {/* Filters */}
            <div className="filter-bar">
                <div className="search-input-wrap">
                    <Search size={15} />
                    <input className="search-input" placeholder={`Tìm ${seatType === 'table' ? 'bàn' : 'phòng'}...`}
                        value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                {seatType === 'table' && (
                    <select className="filter-select" value={selectedArea} onChange={e => setSelectedArea(e.target.value)}>
                        <option value="all">Tất cả khu vực</option>
                        {areas.map(a => <option key={a} value={a}>Khu {a}</option>)}
                    </select>
                )}
                <select className="filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                    <option value="all">Tất cả trạng thái</option>
                    <option value="FREE">Trống</option>
                    <option value="OCCUPIED">Có khách</option>
                    <option value="RESERVED">Đã đặt</option>
                </select>
            </div>

            {/* Grid */}
            {loading ? <div className="empty-state"><div className="spinner" style={{ margin: '0 auto' }} /></div>
                : items.length === 0 ? (
                    <div className="empty-state">
                        <LayoutGrid size={40} />
                        <p>Không có {seatType === 'table' ? 'bàn' : 'phòng'} nào</p>
                    </div>
                ) : (
                    <div className="seat-grid">
                        {items.map(item => {
                            const statusClass = { FREE: 'free', OCCUPIED: 'occupied', RESERVED: 'reserved' }[item.status] || '';
                            return (
                                <div key={item.id} className={`seat-card ${statusClass}`}>
                                    <div className="seat-card-header">
                                        <div>
                                            <div className="seat-number">{seatType === 'table' ? 'Bàn' : 'Phòng'} {item.number}</div>
                                            <div className="seat-type-label">
                                                {seatType === 'table' ? <><Layers size={11} /> {item.area}</> : <><DoorOpen size={11} /> VIP</>}
                                            </div>
                                        </div>
                                        <StatusBadge status={item.status} />
                                    </div>
                                    <div className="seat-info">
                                        <div className="seat-info-row"><Users size={12} /> Sức chứa: {item.capacity} người</div>
                                        {item.updatedAt && <div className="seat-info-row"><Clock size={12} /> {fmtDate(item.updatedAt)}</div>}
                                    </div>
                                    <div className="seat-actions">
                                        {item.status === 'FREE' ? (
                                            <>
                                                <button className="btn btn-success btn-sm" style={{ flex: 1 }}
                                                    onClick={() => onSelectSeat(item, seatType)}>
                                                    <ShoppingCart size={13} /> Đặt món
                                                </button>
                                                <button className="btn btn-ghost btn-sm"
                                                    onClick={() => updateStatus(item.id, 'OCCUPIED', seatType)}>
                                                    <Check size={13} /> Mở
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <button className="btn btn-primary btn-sm" style={{ flex: 1 }}
                                                    onClick={() => onSelectSeat(item, seatType)}>
                                                    <Plus size={13} /> Thêm món
                                                </button>
                                                <button className="btn btn-danger btn-sm"
                                                    onClick={() => updateStatus(item.id, 'FREE', seatType)}>
                                                    <X size={13} /> Đóng
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
        </div>
    );
}

// ══════════════════════════════════════════════════════════
// TAB 2: GỌI MÓN (MENU + CART)
// ══════════════════════════════════════════════════════════
function OrderTab({ branchId, initialSeat, initialSeatType, toast, onOrderCreated }) {
    const [menu, setMenu] = useState([]);
    const [categories, setCategories] = useState([]);
    const [selectedCat, setSelectedCat] = useState('all');
    const [search, setSearch] = useState('');
    const [cart, setCart] = useState([]);
    const [generalNote, setGeneralNote] = useState('');
    const [rooms, setRooms] = useState([]);
    const [areas, setAreas] = useState([]);
    const [tablesByArea, setTablesByArea] = useState([]);
    const [seatType, setSeatType] = useState(initialSeatType || 'table');
    const [selectedArea, setSelectedArea] = useState('');
    const [selectedTableId, setSelectedTableId] = useState('');
    const [selectedTableNumber, setSelectedTableNumber] = useState('');
    const [selectedRoomId, setSelectedRoomId] = useState('');
    const [existingOrderId, setExistingOrderId] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!branchId) return;
        apiFetch(`/api/branch-foods/branch/${branchId}/with-promotions`)
            .then(r => r.ok ? r.json() : [])
            .then(data => {
                setMenu(Array.isArray(data) ? data : []);
            });
        apiFetch('/api/categories').then(r => r.ok ? r.json() : []).then(d => setCategories(Array.isArray(d) ? d : []));
        apiFetch(`/api/rooms/branch/${branchId}`).then(r => r.ok ? r.json() : []).then(d => setRooms(Array.isArray(d) ? d : []));
        apiFetch(`/api/tables/branch/${branchId}/areas`).then(r => r.ok ? r.json() : []).then(d => setAreas(Array.isArray(d) ? d : []));
    }, [branchId]);

    useEffect(() => {
        if (initialSeat) {
            if (initialSeatType === 'table') {
                setSelectedArea(initialSeat.area || '');
                setSelectedTableId(String(initialSeat.id));
                setSelectedTableNumber(String(initialSeat.number));
                setSeatType('table');
            } else {
                setSelectedRoomId(String(initialSeat.id));
                setSeatType('room');
            }
        }
    }, [initialSeat, initialSeatType]);

    useEffect(() => {
        if (selectedArea && branchId) {
            apiFetch(`/api/tables/branch/${branchId}/area/${selectedArea}`)
                .then(r => r.ok ? r.json() : [])
                .then(d => setTablesByArea(Array.isArray(d) ? d : []));
        } else {
            setTablesByArea([]);
        }
    }, [selectedArea, branchId]);

    const handleSeatTypeChange = (type) => {
        setSeatType(type);
        setSelectedArea(''); setSelectedTableId(''); setSelectedTableNumber(''); setSelectedRoomId('');
    };

    const addToCart = (item) => {
        const price = Number(item.finalPrice || item.branchPrice || 0);
        setCart(prev => {
            const ex = prev.find(c => c.id === item.id);
            if (ex) return prev.map(c => c.id === item.id ? { ...c, qty: c.qty + 1, total: (c.qty + 1) * c.price } : c);
            return [...prev, { id: item.id, name: item.name, price, qty: 1, total: price, note: '' }];
        });
    };

    const updateQty = (id, delta) => {
        setCart(prev => {
            const item = prev.find(c => c.id === id);
            if (!item) return prev;
            const newQty = item.qty + delta;
            if (newQty <= 0) return prev.filter(c => c.id !== id);
            return prev.map(c => c.id === id ? { ...c, qty: newQty, total: newQty * c.price } : c);
        });
    };

    const subtotal = cart.reduce((s, i) => s + i.total, 0);
    const total = subtotal;

    const getLocationName = () => {
        if (seatType === 'room') {
            const r = rooms.find(r => String(r.id) === String(selectedRoomId));
            return `Phòng VIP ${r?.number || ''} - ${r?.area || ''}`;
        }
        return `Khu ${selectedArea} - Bàn ${selectedTableNumber}`;
    };

    const handleSubmit = async () => {
        if (cart.length === 0) { toast.add('warning', 'Chưa có món', 'Vui lòng chọn ít nhất 1 món'); return; }
        if (seatType === 'room' && !selectedRoomId) { toast.add('warning', 'Chưa chọn phòng', ''); return; }
        if (seatType === 'table' && (!selectedArea || !selectedTableId)) { toast.add('warning', 'Chưa chọn bàn', 'Vui lòng chọn khu vực và bàn'); return; }

        setSubmitting(true);
        try {
            const orderData = {
                branch: { id: branchId },
                roomType: seatType,
                notes: generalNote,
                customerName: 'Khách lẻ',
                locationDetail: getLocationName(),
                totalAmount: total,
                status: 'PENDING',
                ...(seatType === 'room' ? { room: { id: Number(selectedRoomId) } } : {
                    table: { id: Number(selectedTableId) },
                    areaName: selectedArea,
                    tableNumber: Number(selectedTableNumber)
                }),
                items: cart.map(i => ({
                    food: { id: i.id },
                    quantity: i.qty,
                    price: i.price,
                    note: i.note
                }))
            };

            const r = await apiFetch('/api/customer/orders', { method: 'POST', body: JSON.stringify(orderData) });
            if (!r.ok) throw new Error('Tạo đơn thất bại');
            const saved = await r.json();
            await apiFetch(`/api/customer/orders/${saved.id}/confirm`, { method: 'PUT' });
            toast.add('success', `Món #${saved.id} đã gửi bếp!`, getLocationName());
            setCart([]); setGeneralNote('');
            onOrderCreated && onOrderCreated(saved);
        } catch (e) {
            toast.add('error', 'Lỗi', e.message);
        } finally { setSubmitting(false); }
    };

    const filteredMenu = menu.filter(item => {
        if (selectedCat !== 'all' && item.categoryName?.toLowerCase() !== selectedCat) return false;
        if (search && !item.name?.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    });

    const getImgUrl = (url) => {
        if (!url) return null;
        if (url.startsWith('http')) return url;
        return `${API}${url.startsWith('/') ? '' : '/uploads/'}${url}`;
    };

    return (
        <div className="order-layout">
            {/* ── LEFT: MENU ── */}
            <div>
                <div className="card" style={{ marginBottom: 16 }}>
                    <div className="card-body" style={{ paddingBottom: 12 }}>
                        <div className="search-input-wrap" style={{ marginBottom: 12 }}>
                            <Search size={15} />
                            <input className="search-input" placeholder="Tìm món..." value={search} onChange={e => setSearch(e.target.value)} />
                        </div>
                        <div className="category-chips">
                            <button className={`cat-chip ${selectedCat === 'all' ? 'active' : ''}`} onClick={() => setSelectedCat('all')}>🍽️ Tất cả</button>
                            {categories.map(c => (
                                <button key={c.id} className={`cat-chip ${selectedCat === c.name?.toLowerCase() ? 'active' : ''}`}
                                    onClick={() => setSelectedCat(c.name?.toLowerCase())}>
                                    {c.name}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="menu-grid">
                    {filteredMenu.map(item => {
                        const price = Number(item.finalPrice || item.branchPrice || 0);
                        const original = Number(item.originalPrice || item.branchPrice || 0);
                        const discount = item.discountPercentage || 0;
                        const inCart = cart.find(c => c.id === item.id);
                        const imgUrl = getImgUrl(item.imageUrl);
                        return (
                            <div key={item.id} className="menu-item" onClick={() => addToCart(item)}>
                                {discount > 0 && <div className="menu-item-discount">-{discount}%</div>}
                                {inCart && <div className="menu-item-in-cart">×{inCart.qty}</div>}
                                <div className="menu-item-img">
                                    {imgUrl ? <img src={imgUrl} alt={item.name} onError={e => { e.target.style.display = 'none'; }} /> : <span>🍽️</span>}
                                </div>
                                <div className="menu-item-body">
                                    <div className="menu-item-name">{item.name}</div>
                                    <div>
                                        <span className="menu-item-price">{fmtPrice(price)}</span>
                                        {discount > 0 && <span className="menu-item-original">{fmtPrice(original)}</span>}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ── RIGHT: CART ── */}
            <div className="cart-panel">
                <div className="card">
                    <div className="card-header">
                        <div className="card-title"><ShoppingCart size={16} /> Giỏ hàng ({cart.length})</div>
                    </div>
                    <div className="card-body">
                        {/* Location selector */}
                        <div className="location-selector">
                            <span className="location-label">Vị trí</span>
                            <div className="type-tabs" style={{ marginBottom: 10 }}>
                                <button className={`type-tab ${seatType === 'table' ? 'active' : ''}`} onClick={() => handleSeatTypeChange('table')}>
                                    🪑 Bàn thường
                                </button>
                                <button className={`type-tab vip ${seatType === 'room' ? 'active' : ''}`} onClick={() => handleSeatTypeChange('room')}>
                                    👑 Phòng VIP
                                </button>
                            </div>

                            {seatType === 'room' ? (
                                <select className="location-select" value={selectedRoomId}
                                    onChange={e => setSelectedRoomId(e.target.value)}>
                                    <option value="">-- Chọn phòng VIP --</option>
                                    {rooms.map(r => (
                                        <option key={r.id} value={r.id}>
                                            Phòng {r.number} - {r.area} ({r.capacity} người) {r.status === 'OCCUPIED' ? '🔴' : '🟢'}
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <>
                                    <select className="location-select" value={selectedArea}
                                        onChange={e => { setSelectedArea(e.target.value); setSelectedTableId(''); setSelectedTableNumber(''); }}>
                                        <option value="">-- Chọn khu vực --</option>
                                        {areas.map(a => <option key={a} value={a}>Khu {a}</option>)}
                                    </select>
                                    {selectedArea && (
                                        <select className="location-select" value={selectedTableId}
                                            onChange={e => {
                                                const t = tablesByArea.find(tb => String(tb.id) === e.target.value);
                                                setSelectedTableId(e.target.value);
                                                setSelectedTableNumber(t?.number?.toString() || '');
                                            }}>
                                            <option value="">-- Chọn bàn --</option>
                                            {tablesByArea.map(t => (
                                                <option key={t.id} value={t.id}>
                                                    Bàn {t.number} - {t.capacity} người {t.status === 'OCCUPIED' ? '🔴' : '🟢'}
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                </>
                            )}

                            {((seatType === 'room' && selectedRoomId) || (seatType === 'table' && selectedTableId)) && (
                                <div className="location-selected-info">📍 {getLocationName()}</div>
                            )}
                        </div>

                        {/* Cart items */}
                        {cart.length === 0 ? (
                            <div className="empty-state" style={{ padding: '24px 0' }}>
                                <ShoppingCart size={32} />
                                <p style={{ fontSize: 13 }}>Chưa có món nào</p>
                            </div>
                        ) : (
                            <div className="cart-items">
                                {cart.map(item => (
                                    <div key={item.id} className="cart-item">
                                        <div className="cart-item-top">
                                            <div>
                                                <div className="cart-item-name">{item.name}</div>
                                                <div className="cart-item-price">{fmtPrice(item.price)}/món</div>
                                            </div>
                                            <div className="cart-item-subtotal">{fmtPrice(item.total)}</div>
                                        </div>
                                        <div className="qty-control">
                                            <button className="qty-btn" onClick={() => updateQty(item.id, -1)}><Minus size={11} /></button>
                                            <span className="qty-num">{item.qty}</span>
                                            <button className="qty-btn" onClick={() => updateQty(item.id, 1)}><Plus size={11} /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Summary */}
                        <div className="cart-summary">
                            <div className="cart-row"><span>Tạm tính</span><span>{fmtPrice(subtotal)}</span></div>
                            <div className="cart-row total"><span>Tổng cộng</span><span className="cart-total-amount">{fmtPrice(total)}</span></div>
                        </div>

                        <textarea className="general-note" placeholder="📝 Ghi chú chung cho bếp..." value={generalNote} onChange={e => setGeneralNote(e.target.value)} />

                        <button className="btn btn-success btn-lg btn-block" disabled={submitting || cart.length === 0} onClick={handleSubmit}>
                            {submitting ? <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Đang xử lý...</> : <><Send size={16} /> Gửi đơn hàng</>}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ══════════════════════════════════════════════════════════
// TAB 3: DANH SÁCH ĐƠN HÀNG
// ══════════════════════════════════════════════════════════
function OrdersTab({ branchId, toast }) {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(false);
    const [filterStatus, setFilterStatus] = useState('all');
    const [search, setSearch] = useState('');
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [addingTo, setAddingTo] = useState(null);
    const [addCart, setAddCart] = useState([]);
    const [menu, setMenu] = useState([]);
    const [actionLoading, setActionLoading] = useState({});

    const fetchOrders = useCallback(async () => {
        setLoading(true);
        try {
            const r = await apiFetch('/api/customer/orders');
            const data = await r.json();
            const filtered = Array.isArray(data) ? data.filter(o => o.branch?.id === branchId) : [];
            setOrders(filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
        } catch { toast.add('error', 'Lỗi', 'Không thể tải đơn hàng'); }
        finally { setLoading(false); }
    }, [branchId]);

    useEffect(() => { fetchOrders(); }, [fetchOrders]);

    useEffect(() => {
        if (!branchId) return;
        apiFetch(`/api/branch-foods/branch/${branchId}/with-promotions`).then(r => r.ok ? r.json() : []).then(d => setMenu(Array.isArray(d) ? d : []));
    }, [branchId]);

    const doAction = async (id, endpoint, method = 'PUT') => {
        setActionLoading(p => ({ ...p, [id]: true }));
        try {
            const r = await apiFetch(`/api/customer/orders/${id}/${endpoint}`, { method });
            if (!r.ok) throw new Error();
            toast.add('success', 'Thành công', '');
            fetchOrders();
            setSelectedOrder(null);
        } catch { toast.add('error', 'Lỗi', 'Thao tác thất bại'); }
        finally { setActionLoading(p => ({ ...p, [id]: false })); }
    };

    const addItemsToOrder = async (orderId) => {
        if (addCart.length === 0) return;
        try {
            const body = addCart.map(i => ({ foodId: i.id, quantity: i.qty, note: i.note || '' }));
            const r = await apiFetch(`/api/customer/orders/${orderId}/add-items`, { method: 'POST', body: JSON.stringify(body) });
            if (!r.ok) throw new Error();
            toast.add('success', 'Đã thêm món', `${addCart.length} món thêm vào đơn #${orderId}`);
            setAddingTo(null); setAddCart([]);
            fetchOrders();
        } catch { toast.add('error', 'Lỗi', 'Không thể thêm món'); }
    };

    const filtered = orders.filter(o => {
        if (filterStatus !== 'all' && o.status !== filterStatus) return false;
        if (search) {
            const s = search.toLowerCase();
            return String(o.id).includes(s) || o.table?.number?.toString().includes(s) || o.room?.number?.toString().includes(s);
        }
        return true;
    });

    const statusOptions = ['all', 'PENDING', 'CONFIRMED', 'PREPARING', 'COMPLETED', 'PAID', 'CANCELED'];

    return (
        <div>
            <div className="filter-bar">
                <div className="search-input-wrap">
                    <Search size={15} />
                    <input className="search-input" placeholder="Tìm đơn hàng, bàn..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <select className="filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                    {statusOptions.map(s => <option key={s} value={s}>{s === 'all' ? 'Tất cả' : s}</option>)}
                </select>
                <button className="btn btn-ghost btn-sm" onClick={fetchOrders}><RefreshCw size={14} /> Làm mới</button>
            </div>

            {loading ? <div className="empty-state"><div className="spinner" style={{ margin: '0 auto' }} /></div>
                : filtered.length === 0 ? (
                    <div className="empty-state"><ClipboardList size={40} /><p>Không có đơn hàng nào</p></div>
                ) : (
                    <div className="orders-list">
                        {filtered.map(order => {
                            const location = order.room ? `Phòng ${order.room.number}` : order.table ? `Bàn ${order.table.number}` : order.locationDetail || 'N/A';
                            return (
                                <div key={order.id} className="order-card">
                                    <div className="order-card-header">
                                        <div>
                                            <span className="order-card-id">Đơn #{order.id}</span>
                                            <div className="order-card-meta">
                                                <span><MapPin size={11} /> {location}</span>
                                                <span><Clock size={11} /> {fmtDate(order.createdAt)}</span>
                                                {order.room && <span className="badge badge-vip">VIP</span>}
                                            </div>
                                        </div>
                                        <StatusBadge status={order.status} />
                                    </div>

                                    <div className="order-card-body">
                                        <div className="order-items-list">
                                            {(order.items || []).slice(0, 3).map((item, i) => (
                                                <div key={i} className="order-item-row">
                                                    <div>
                                                        <div className="order-item-row-name">{item.food?.name || 'N/A'}</div>
                                                        {item.note && <div className="order-item-row-note">📝 {item.note}</div>}
                                                    </div>
                                                    <div className="order-item-row-right">
                                                        <div className="order-item-row-qty">x{item.quantity}</div>
                                                        <div className="order-item-row-total">{fmtPrice(Number(item.subtotal || 0))}</div>
                                                    </div>
                                                </div>
                                            ))}
                                            {(order.items || []).length > 3 && (
                                                <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '4px 0' }}>
                                                    +{order.items.length - 3} món khác
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="order-card-footer">
                                        <div className="order-total">{fmtPrice(Number(order.totalAmount || 0))}</div>
                                        <div className="order-actions">
                                            <button className="btn btn-ghost btn-sm" onClick={() => setSelectedOrder(order)}>
                                                <Eye size={13} /> Chi tiết
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

            {/* Detail Modal */}
            {selectedOrder && (
                <div className="modal-backdrop" onClick={() => setSelectedOrder(null)}>
                    <div className="modal-box" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div className="modal-title">Chi tiết đơn #{selectedOrder.id}</div>
                            <button className="modal-close" onClick={() => setSelectedOrder(null)}><X size={16} /></button>
                        </div>
                        <div className="modal-body">
                            <div className="info-grid">
                                <div className="info-item">
                                    <div className="info-item-label">Vị trí</div>
                                    <div className="info-item-value">
                                        {selectedOrder.room ? `Phòng ${selectedOrder.room.number}` : selectedOrder.table ? `Bàn ${selectedOrder.table.number}` : 'N/A'}
                                    </div>
                                </div>
                                <div className="info-item">
                                    <div className="info-item-label">Trạng thái</div>
                                    <StatusBadge status={selectedOrder.status} />
                                </div>
                                <div className="info-item">
                                    <div className="info-item-label">Tổng tiền</div>
                                    <div className="info-item-value" style={{ color: 'var(--success)' }}>{fmtPrice(Number(selectedOrder.totalAmount || 0))}</div>
                                </div>
                                <div className="info-item">
                                    <div className="info-item-label">Thời gian</div>
                                    <div className="info-item-value">{fmtDate(selectedOrder.createdAt)}</div>
                                </div>
                            </div>
                            <div className="section-title"><UtensilsCrossed size={14} /> Món ăn ({(selectedOrder.items || []).length})</div>
                            <div className="order-items-list" style={{ marginBottom: 16 }}>
                                {(selectedOrder.items || []).map((item, i) => (
                                    <div key={i} className="order-item-row">
                                        <div>
                                            <div className="order-item-row-name">{item.food?.name || 'N/A'}</div>
                                            {item.note && <div className="order-item-row-note">📝 {item.note}</div>}
                                        </div>
                                        <div className="order-item-row-right">
                                            <div className="order-item-row-qty">x{item.quantity}</div>
                                            <div className="order-item-row-total">{fmtPrice(Number(item.subtotal || 0))}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {selectedOrder.notes && (
                                <div style={{ padding: '10px 12px', background: 'rgba(245,158,11,0.08)', borderRadius: 8, fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
                                    📝 {selectedOrder.notes}
                                </div>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setSelectedOrder(null)}>Đóng</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add items Modal */}
            {addingTo && (
                <div className="modal-backdrop" onClick={() => setAddingTo(null)}>
                    <div className="modal-box" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div className="modal-title">Thêm món — Đơn #{addingTo.id}</div>
                            <button className="modal-close" onClick={() => setAddingTo(null)}><X size={16} /></button>
                        </div>
                        <div className="modal-body">
                            <div className="menu-grid" style={{ maxHeight: 320 }}>
                                {menu.map(item => {
                                    const price = Number(item.finalPrice || item.branchPrice || 0);
                                    const inCart = addCart.find(c => c.id === item.id);
                                    return (
                                        <div key={item.id} className="menu-item" onClick={() => {
                                            setAddCart(prev => {
                                                const ex = prev.find(c => c.id === item.id);
                                                if (ex) return prev.map(c => c.id === item.id ? { ...c, qty: c.qty + 1 } : c);
                                                return [...prev, { id: item.id, name: item.name, price, qty: 1, note: '' }];
                                            });
                                        }}>
                                            {inCart && <div className="menu-item-in-cart">×{inCart.qty}</div>}
                                            <div className="menu-item-img"><span>🍽️</span></div>
                                            <div className="menu-item-body">
                                                <div className="menu-item-name">{item.name}</div>
                                                <div className="menu-item-price">{fmtPrice(price)}</div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            {addCart.length > 0 && (
                                <div style={{ marginTop: 12 }}>
                                    <div className="section-title">Đã chọn</div>
                                    {addCart.map(item => (
                                        <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', fontSize: 13, borderBottom: '1px solid var(--border-light)' }}>
                                            <span>{item.name}</span>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <button className="qty-btn" onClick={() => setAddCart(p => p.map(c => c.id === item.id ? { ...c, qty: Math.max(1, c.qty - 1) } : c))}><Minus size={10} /></button>
                                                <span>{item.qty}</span>
                                                <button className="qty-btn" onClick={() => setAddCart(p => p.map(c => c.id === item.id ? { ...c, qty: c.qty + 1 } : c))}><Plus size={10} /></button>
                                                <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setAddCart(p => p.filter(c => c.id !== item.id))}><X size={12} /></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setAddingTo(null)}>Hủy</button>
                            <button className="btn btn-primary" disabled={addCart.length === 0} onClick={() => addItemsToOrder(addingTo.id)}>
                                <Plus size={14} /> Thêm {addCart.length} món
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ══════════════════════════════════════════════════════════
// TAB 4: THEO DÕI BẾP
// ══════════════════════════════════════════════════════════
function KitchenTab({ toast }) {
    const [kitchenOrders, setKitchenOrders] = useState([]);
    const [loading, setLoading] = useState(false);
    const [filterStatus, setFilterStatus] = useState('all');

    const fetchActive = useCallback(async () => {
        setLoading(true);
        try {
            const r = await apiFetch('/api/kitchen-orders/active');
            const data = await r.json();
            setKitchenOrders(Array.isArray(data) ? data : []);
        } catch { toast.add('error', 'Lỗi', 'Không thể tải dữ liệu bếp'); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchActive(); const id = setInterval(fetchActive, 10000); return () => clearInterval(id); }, [fetchActive]);

    const filtered = kitchenOrders.filter(ko => filterStatus === 'all' || ko.kitchenStatus === filterStatus);

    const statusColor = { WAITING: 'var(--text-muted)', PREPARING: 'var(--warning)', DONE: 'var(--success)' };

    return (
        <div>
            <div className="filter-bar">
                <select className="filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                    <option value="all">Tất cả</option>
                    <option value="WAITING">Chờ bếp</option>
                    <option value="PREPARING">Đang làm</option>
                    <option value="DONE">Xong</option>
                </select>
                <button className="btn btn-ghost btn-sm" onClick={fetchActive}><RefreshCw size={14} /> Làm mới</button>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 'auto' }}>
                    Tự cập nhật mỗi 10 giây
                </div>
            </div>

            {/* Stats */}
            <div className="stat-chips" style={{ marginBottom: 16 }}>
                {[
                    { label: 'Chờ bếp', status: 'WAITING', icon: '⏳', color: 'var(--text-muted)' },
                    { label: 'Đang làm', status: 'PREPARING', icon: '🍳', color: 'var(--warning)' },
                    { label: 'Xong', status: 'DONE', icon: '✅', color: 'var(--success)' },
                ].map(s => (
                    <div key={s.status} className="stat-chip" style={{ cursor: 'pointer' }} onClick={() => setFilterStatus(s.status)}>
                        <div className="stat-chip-icon" style={{ background: `${s.color}18`, fontSize: 18 }}>{s.icon}</div>
                        <div>
                            <div className="stat-chip-value" style={{ color: s.color }}>
                                {kitchenOrders.filter(k => k.kitchenStatus === s.status).length}
                            </div>
                            <div className="stat-chip-label">{s.label}</div>
                        </div>
                    </div>
                ))}
            </div>

            {loading ? <div className="empty-state"><div className="spinner" style={{ margin: '0 auto' }} /></div>
                : filtered.length === 0 ? (
                    <div className="empty-state"><ChefHat size={40} /><p>Không có order bếp nào</p></div>
                ) : (
                    <div className="kitchen-list">
                        {filtered.map(ko => (
                            <div key={ko.id} className={`kitchen-card ${ko.kitchenStatus?.toLowerCase()}`}>
                                <div className="kitchen-card-header">
                                    <div>
                                        <span style={{ fontWeight: 700, fontSize: 15 }}>Order #{ko.order?.id}</span>
                                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                                            {ko.order?.table ? `Bàn ${ko.order.table.number}` : ko.order?.room ? `Phòng ${ko.order.room.number}` : ko.order?.locationDetail || 'N/A'}
                                        </div>
                                    </div>
                                    <span className={`badge badge-${ko.kitchenStatus?.toLowerCase()}`} style={{ color: statusColor[ko.kitchenStatus] }}>
                                        {ko.kitchenStatus === 'WAITING' ? '⏳ Chờ bếp' : ko.kitchenStatus === 'PREPARING' ? '🍳 Đang làm' : '✅ Xong'}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
        </div>
    );
}

// ══════════════════════════════════════════════════════════
// ROOT COMPONENT
// ══════════════════════════════════════════════════════════
export default function WaiterInterface() {
    const [activeTab, setActiveTab] = useState('seats');
    const [selectedSeat, setSelectedSeat] = useState(null);
    const [selectedSeatType, setSelectedSeatType] = useState('table');
    const toast = useToast();

    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : {};
    const branchId = user?.branch?.id || user?.branchId;
    const branchName = user?.branch?.name || 'Chi nhánh';

    const [pendingKitchen, setPendingKitchen] = useState(0);

    useEffect(() => {
        apiFetch('/api/kitchen-orders/status?status=WAITING')
            .then(r => r.ok ? r.json() : [])
            .then(d => setPendingKitchen(Array.isArray(d) ? d.length : 0));
        const id = setInterval(() => {
            apiFetch('/api/kitchen-orders/status?status=WAITING')
                .then(r => r.ok ? r.json() : [])
                .then(d => setPendingKitchen(Array.isArray(d) ? d.length : 0));
        }, 15000);
        return () => clearInterval(id);
    }, []);

    const handleSelectSeat = (seat, type) => {
        setSelectedSeat(seat);
        setSelectedSeatType(type);
        setActiveTab('order');
    };

    const TABS = [
        { id: 'seats', label: 'Bàn / Phòng', icon: <LayoutGrid size={15} /> },
        { id: 'order', label: 'Gọi món', icon: <UtensilsCrossed size={15} /> },
        { id: 'orders', label: 'Đơn hàng', icon: <ClipboardList size={15} /> },
        { id: 'kitchen', label: 'Bếp', icon: <ChefHat size={15} />, badge: pendingKitchen },
    ];

    return (
        <div className="waiter-app">
            <nav className="waiter-nav">
                <div className="waiter-nav-brand">
                    <Coffee size={22} />
                    <span>Phục vụ</span>
                </div>
                <div className="waiter-nav-tabs">
                    {TABS.map(t => (
                        <button key={t.id} className={`waiter-nav-tab ${activeTab === t.id ? 'active' : ''}`} onClick={() => setActiveTab(t.id)}>
                            {t.icon} {t.label}
                            {t.badge > 0 && <span className="badge">{t.badge}</span>}
                        </button>
                    ))}
                </div>
                <div className="waiter-nav-right">
                    <MapPin size={14} /> {branchName}
                    <span style={{ opacity: 0.4 }}>|</span>
                    <Users size={14} /> {user?.fullName || user?.username || 'Nhân viên'}
                </div>
            </nav>

            <div className="waiter-content">
                {activeTab === 'seats' && <SeatTab branchId={branchId} onSelectSeat={handleSelectSeat} toast={toast} />}
                {activeTab === 'order' && <OrderTab branchId={branchId} initialSeat={selectedSeat} initialSeatType={selectedSeatType} toast={toast} onOrderCreated={() => setActiveTab('orders')} />}
                {activeTab === 'orders' && <OrdersTab branchId={branchId} toast={toast} />}
                {activeTab === 'kitchen' && <KitchenTab toast={toast} />}
            </div>

            <ToastContainer toasts={toast.toasts} remove={toast.remove} />
        </div>
    );
}