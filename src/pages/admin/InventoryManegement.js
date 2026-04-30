import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
    Clock, CheckCircle, XCircle, Check, X,
    MapPin, Calendar, User, FileText, ArrowUpCircle, ArrowDownCircle,
    History, Warehouse, PlusCircle, Download, BarChart2, Store
} from 'lucide-react';
import './InventoryManegement.css';
import io from 'socket.io-client';

const socket = io('http://localhost:3001');
const API_BASE_URL = 'http://localhost:8080';

const token = () => localStorage.getItem('token');
const apiFetch = (url, opts = {}) =>
    fetch(`${API_BASE_URL}${url}`, {
        ...opts,
        headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json', ...opts.headers }
    });

const fmtDate = d => new Date(d).toLocaleString('vi-VN');

const StatusBadge = ({ status }) => {
    const map = {
        PENDING: { cls: 'badge status-pending', icon: <Clock size={12} />, label: 'Chờ duyệt' },
        APPROVED: { cls: 'badge status-approved', icon: <CheckCircle size={12} />, label: 'Đã duyệt' },
        RECEIVED: { cls: 'badge status-approved', icon: <Check size={12} />, label: 'Đã nhận hàng' },
        REJECTED: { cls: 'badge status-rejected', icon: <XCircle size={12} />, label: 'Từ chối' },
    };
    const s = map[status] || { cls: 'badge status-pending', icon: <Clock size={12} />, label: status };
    return <span className={s.cls}>{s.icon} {s.label}</span>;
};

const TypeBadge = ({ type }) => {
    const isImport = type === 'IMPORT';
    return (
        <span className={`badge ${isImport ? 'type-import' : 'type-export'}`}>
            {isImport ? <ArrowDownCircle size={12} /> : <ArrowUpCircle size={12} />}
            {isImport ? 'Nhập kho' : 'Xuất kho'}
        </span>
    );
};

const StockBadge = ({ qty }) => {
    if (qty === 0) return <span className="badge status-rejected">Hết hàng</span>;
    if (qty < 10) return <span className="badge status-pending">Sắp hết</span>;
    return <span className="badge status-approved">Đủ hàng</span>;
};

const colorMap = { success: '#10b981', warning: '#f59e0b', error: '#ef4444', info: '#6366f1' };

function ToastContainer({ items, remove }) {
    return (
        <div style={{
            position: 'fixed', top: 20, right: 20, zIndex: 9999,
            display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 360
        }}>
            {items.map(n => (
                <div
                    key={n.id}
                    onClick={() => { n.onClick?.(); remove(n.id); }}
                    style={{
                        background: colorMap[n.type] || '#6366f1', color: '#fff',
                        padding: '14px 16px', borderRadius: 10,
                        boxShadow: '0 4px 12px rgba(0,0,0,.25)',
                        cursor: n.onClick ? 'pointer' : 'default',
                        display: 'flex', gap: 10, alignItems: 'flex-start'
                    }}
                >
                    <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{n.title}</div>
                        <div style={{ fontSize: 13, opacity: .9 }}>{n.message}</div>
                    </div>
                    <button
                        onClick={e => { e.stopPropagation(); remove(n.id); }}
                        style={{
                            background: 'rgba(255,255,255,.2)', border: 'none', color: '#fff',
                            borderRadius: '50%', width: 22, height: 22, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                        }}
                    >
                        <X size={13} />
                    </button>
                </div>
            ))}
        </div>
    );
}

/* Main Component */
export default function InventoryManagement() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    const [toasts, setToasts] = useState([]);
    const addToast = useCallback((t) => {
        const id = Date.now() + Math.random();
        setToasts(p => [...p, { ...t, id }]);
        setTimeout(() => setToasts(p => p.filter(x => x.id !== id)), 8000);
    }, []);
    const removeToast = id => setToasts(p => p.filter(x => x.id !== id));

    const [tab, setTab] = useState('warehouse');

    /* Warehouses */
    const [warehouses, setWarehouses] = useState([]);
    const [whName, setWhName] = useState('');
    const [whLoading, setWhLoading] = useState(false);

    const fetchWarehouses = useCallback(async () => {
        const r = await apiFetch('/api/warehouses');
        if (r.ok) setWarehouses(await r.json());
    }, []);

    const createWarehouse = async () => {
        if (!whName.trim()) return;
        setWhLoading(true);
        const r = await apiFetch('/api/warehouses', { method: 'POST', body: JSON.stringify({ name: whName }) });
        if (r.ok) {
            setWhName('');
            fetchWarehouses();
            addToast({ type: 'success', title: 'Tạo kho thành công', message: whName });
        }
        setWhLoading(false);
    };

    /* Import */
    const [ingredients, setIngredients] = useState([]);
    const [importForm, setImportForm] = useState({
        warehouseId: '',
        items: [{ ingredientId: '', quantity: '', expiryDate: '' }]
    });
    const [importLoading, setImportLoading] = useState(false);

    const fetchIngredients = useCallback(async () => {
        const r = await apiFetch('/api/ingredients');
        if (r.ok) setIngredients(await r.json());
    }, []);

    const addImportRow = () => setImportForm(f => ({ ...f, items: [...f.items, { ingredientId: '', quantity: '', expiryDate: '' }] }));
    const removeImportRow = i => setImportForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));
    const updateImportRow = (i, field, val) =>
        setImportForm(f => ({ ...f, items: f.items.map((r, idx) => idx === i ? { ...r, [field]: val } : r) }));

    const submitImport = async () => {
        if (!importForm.warehouseId) { addToast({ type: 'warning', title: 'Chưa chọn kho', message: '' }); return; }
        const valid = importForm.items.every(it => it.ingredientId && it.quantity > 0 && it.expiryDate);
        if (!valid) { addToast({ type: 'warning', title: 'Vui lòng điền đầy đủ thông tin', message: '' }); return; }
        setImportLoading(true);
        const r = await apiFetch('/api/warehouses/import', {
            method: 'POST',
            body: JSON.stringify({
                warehouseId: Number(importForm.warehouseId),
                items: importForm.items.map(it => ({
                    ingredientId: Number(it.ingredientId),
                    quantity: Number(it.quantity),
                    expiryDate: it.expiryDate
                }))
            })
        });
        if (r.ok) {
            addToast({ type: 'success', title: 'Nhập kho thành công', message: `${importForm.items.length} nguyên liệu` });
            setImportForm({ warehouseId: '', items: [{ ingredientId: '', quantity: '', expiryDate: '' }] });
            fetchWarehouseInventory(importForm.warehouseId);
        } else {
            addToast({ type: 'error', title: 'Nhập kho thất bại', message: '' });
        }
        setImportLoading(false);
    };

    /* Warehouse Inventory */
    const [whInventory, setWhInventory] = useState([]);
    const [selectedWh, setSelectedWh] = useState('');

    const fetchWarehouseInventory = useCallback(async (wid) => {
        if (!wid) return;
        const r = await apiFetch(`/api/warehouse-inventory?warehouseId=${wid}`);
        if (r.ok) setWhInventory(await r.json());
    }, []);

    /* Branches */
    const [branches, setBranches] = useState([]);
    const [selectedBranch, setSelectedBranch] = useState(null);
    const [branchIngredients, setBranchIngredients] = useState([]);

    const fetchBranches = useCallback(async () => {
        const r = await apiFetch('/api/branches');
        if (r.ok) {
            const d = await r.json();
            setBranches(d);
            if (d.length > 0) setSelectedBranch(d[0]);
        }
    }, []);

    const fetchBranchIngredients = useCallback(async (bid) => {
        const r = await apiFetch(`/api/branch-ingredients/branch/${bid}`);
        if (r.ok) setBranchIngredients(await r.json());
        else setBranchIngredients([]);
    }, []);

    /* Requests */
    const [requests, setRequests] = useState([]);
    const [requestItems, setRequestItems] = useState({});
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterType, setFilterType] = useState('all');
    const [search, setSearch] = useState('');
    const [selectedReq, setSelectedReq] = useState(null);
    const [rejectModal, setRejectModal] = useState(null);
    const [rejectNote, setRejectNote] = useState('');
    const [reqLoading, setReqLoading] = useState(false);
    const processed = useRef(new Set());

    /* History */
    const [exportHistory, setExportHistory] = useState([]);
    const [importHistory, setImportHistory] = useState([]);
    const [selectedExport, setSelectedExport] = useState(null);
    const [exportDetail, setExportDetail] = useState(null);
    const [historyTab, setHistoryTab] = useState('export'); // 'export' | 'import'

    const fetchRequests = useCallback(async () => {
        const r = await apiFetch('/api/inventory-requests');
        if (!r.ok) return;
        const data = await r.json();
        setRequests(data);
        const map = {};
        await Promise.all(data.map(async req => {
            const ir = await apiFetch(`/api/inventory-request-items/request/${req.id}`);
            map[req.id] = ir.ok ? await ir.json() : [];
        }));
        setRequestItems(map);
    }, []);

    const fetchExportHistory = useCallback(async () => {
        const r = await apiFetch('/api/warehouse-exports');
        if (r.ok) setExportHistory(await r.json());
    }, []);

    const fetchImportHistory = useCallback(async () => {
        const r = await apiFetch('/api/warehouses/inventory-history');
        if (r.ok) setImportHistory(await r.json());
    }, []);

    const fetchExportDetail = useCallback(async (id) => {
        const r = await apiFetch(`/api/warehouse-exports/${id}`);
        if (r.ok) {
            const d = await r.json();
            setExportDetail(d);
        }
    }, []);

    const getItems = id => requestItems[id] || [];
    const getFirst = id => getItems(id)[0] || null;

    const approveReq = async (id) => {
        setReqLoading(true);
        const req = requests.find(r => r.id === id);
        await apiFetch(`/api/inventory-requests/${id}/approve`, { method: 'PUT' });
        socket.emit('inventory-request-approved', { requestId: id, branchId: req?.branch?.id, approvedBy: user.fullName });
        addToast({ type: 'success', title: `Đã duyệt #${id}`, message: req?.branch?.name });
        await fetchRequests();
        setSelectedReq(null);
        setReqLoading(false);
    };

    const rejectReq = async (id, note) => {
        setReqLoading(true);
        const req = requests.find(r => r.id === id);
        await apiFetch(`/api/inventory-requests/${id}/reject`, { method: 'PUT', body: JSON.stringify(note) });
        socket.emit('inventory-request-rejected', { requestId: id, branchId: req?.branch?.id, note });
        addToast({ type: 'warning', title: `Đã từ chối #${id}`, message: req?.branch?.name });
        await fetchRequests();
        setSelectedReq(null);
        setRejectModal(null);
        setRejectNote('');
        setReqLoading(false);
    };

    /* Socket & lifecycle */
    useEffect(() => {
        socket.emit('register-role', { role: 'admin', userId: user?.id });
        socket.on('new-inventory-request', (data) => {
            const key = `${data.requestId}-${data.branchId}`;
            if (processed.current.has(key)) return;
            processed.current.add(key);
            addToast({
                type: 'info',
                title: 'Yêu cầu nhập kho mới',
                message: `${data.branchName} — ${data.ingredientName}`,
                onClick: () => setTab('requests')
            });
            fetchRequests();
        });
        socket.on('inventory-updated', () => {
            fetchRequests();
            if (selectedBranch) fetchBranchIngredients(selectedBranch.id);
        });
        return () => {
            socket.off('new-inventory-request');
            socket.off('inventory-updated');
        };
    }, [selectedBranch, user?.id]);

    useEffect(() => {
        fetchWarehouses();
        fetchIngredients();
        fetchBranches();
        fetchRequests();
        fetchExportHistory();
        fetchImportHistory();
    }, []);
    useEffect(() => { if (selectedBranch) fetchBranchIngredients(selectedBranch.id); }, [selectedBranch]);
    useEffect(() => { if (selectedWh) fetchWarehouseInventory(selectedWh); }, [selectedWh]);
    useEffect(() => {
        const id = setInterval(() => {
            if (!selectedReq && !rejectModal) {
                fetchRequests();
                if (selectedBranch) fetchBranchIngredients(selectedBranch.id);
            }
        }, 10000);
        return () => clearInterval(id);
    }, [selectedBranch, selectedReq, rejectModal]);

    const pendingCount = requests.filter(r => r?.status === 'PENDING').length;

    const filteredReqs = requests.filter(req => {
        if (!req) return false;
        const items = getItems(req.id);
        const names = items.map(i => i.ingredient?.name?.toLowerCase() || '').join(' ');
        const branch = req.branch?.name?.toLowerCase() || '';
        const kw = search.toLowerCase();
        return (
            (names.includes(kw) || branch.includes(kw)) &&
            (filterStatus === 'all' || req.status === filterStatus) &&
            (filterType === 'all' || req.type === filterType)
        );
    });

    /* Stats */
    const stats = [
        { key: 'total', label: 'Tổng yêu cầu', count: requests.length, icon: <FileText size={24} color="#3B82F6" /> },
        { key: 'pending', label: 'Chờ duyệt', count: requests.filter(r => r?.status === 'PENDING').length, icon: <Clock size={24} color="#F59E0B" /> },
        { key: 'approved', label: 'Đã duyệt', count: requests.filter(r => r?.status === 'APPROVED').length, icon: <CheckCircle size={24} color="#10B981" /> },
        { key: 'received', label: 'Đã nhận hàng', count: requests.filter(r => r?.status === 'RECEIVED').length, icon: <Check size={24} color="#6366f1" /> },
        { key: 'rejected', label: 'Từ chối', count: requests.filter(r => r?.status === 'REJECTED').length, icon: <XCircle size={24} color="#EF4444" /> },
    ];

    const TABS = [
        { id: 'warehouse', label: 'Kho tổng', icon: Warehouse },
        { id: 'import', label: 'Nhập kho', icon: Download },
        { id: 'wh-stock', label: 'Tồn kho tổng', icon: BarChart2 },
        { id: 'branch-stock', label: 'Tồn kho chi nhánh', icon: Store },
        { id: 'requests', label: 'Yêu cầu', icon: FileText, badge: pendingCount },
        { id: 'history', label: 'Lịch sử', icon: History },
    ];

    /* quantity className */
    const qtyClass = (qty) => {
        if (qty === 0) return 'quantity-value out-of-stock';
        if (qty < 10) return 'quantity-value low-stock';
        return 'quantity-value';
    };

    return (
        <div className="inventory-container">
            <ToastContainer items={toasts} remove={removeToast} />

            {/* Header */}
            <div className="inventory-header">
                <h1>Quản lý kho</h1>
                <p style={{
                    color: 'var(--color-text-secondary)',
                    fontSize: '14px'
                }}><Warehouse size={16} /> Theo dõi kho tổng, chi nhánh và yêu cầu nhập xuất</p>
            </div>

            {/* Stats */}
            <div className="stats-grid">
                {stats.map(s => (
                    <div key={s.key} className={`stat-card ${s.key}`}>
                        <div className="stat-card-content">
                            <div className={`stat-icon ${s.key}`}>{s.icon}</div>
                            <div>
                                <div className={`stat-number ${s.key}`}>{s.count}</div>
                                <div className="stat-label">{s.label}</div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div className="inventory-tabs">
                {TABS.map(t => {
                    const Icon = t.icon;
                    return (
                        <button
                            key={t.id}
                            onClick={() => setTab(t.id)}
                            className={`inventory-tab${tab === t.id ? ' active' : ''}`}
                        >
                            <Icon size={15} /> {t.label}
                            {t.badge > 0 && (
                                <span style={{
                                    background: '#ef4444', color: 'var(--color-text-secondary)',
                                    borderRadius: 10, padding: '1px 7px',
                                    fontSize: 11, fontWeight: 700, marginLeft: 4
                                }}>
                                    {t.badge}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Kho tổng */}
            {tab === 'warehouse' && (
                <div style={{ display: 'grid', gap: 2 }}>
                    {/* Create warehouse */}
                    <div className="branch-inventory-section">
                        <h3 style={{
                            color: 'var(--color-text-secondary)'
                        }}>
                            <PlusCircle size={16} /> Tạo kho mới</h3>
                        <div style={{ display: 'flex', gap: 10 }}>
                            <input
                                className="search-input"
                                style={{ paddingLeft: 16 }}
                                placeholder="Tên kho..."
                                value={whName}
                                onChange={e => setWhName(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && createWarehouse()}
                            />
                            <button
                                className="btn-modal-approve"
                                onClick={createWarehouse}
                                disabled={whLoading || !whName.trim()}
                                style={{ whiteSpace: 'nowrap', padding: '10px 20px' }}
                            >
                                <Check size={15} /> Tạo
                            </button>
                        </div>
                    </div>

                    {/* Warehouse list */}
                    <div className="branch-inventory-section">
                        <h3 style={{
                            color: 'var(--color-text-secondary)'
                        }}>
                            <Warehouse size={16} /> Danh sách kho ({warehouses.length})
                        </h3>
                        {warehouses.length === 0 ? (
                            <div className="empty-state"><Warehouse size={40} /><p>Chưa có kho nào</p></div>
                        ) : (
                            <div style={{
                                display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, background: '#f3f4f6',
                                border: '1px solid var(--color-border)', borderRadius: 10, padding: 12
                            }}>
                                {warehouses.map(w => (
                                    <div key={w.id} className="branch-button" style={{ cursor: 'default' }}>
                                        <Warehouse size={18} color="#667eea" />
                                        <div>
                                            <div style={{ color: 'var(--color-text-secondary)', fontWeight: 600, fontSize: 14 }}>{w.name}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Nhập kho */}
            {tab === 'import' && (
                <div className="branch-inventory-section">
                    <h3 style={{ color: 'var(--color-text-secondary)' }}><Download size={16} /> Nhập nguyên liệu vào kho</h3>

                    <div style={{ marginBottom: 16 }}>
                        <label className="modal-field-label">Chọn kho *</label>
                        <select
                            className="search-input1"
                            value={importForm.warehouseId}
                            onChange={e => setImportForm(f => ({ ...f, warehouseId: e.target.value }))}
                        >
                            <option value="">-- Chọn kho --</option>
                            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                        </select>
                    </div>

                    <div style={{ marginBottom: 20 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                            <label className="modal-field-label">Danh sách nguyên liệu *</label>
                            <button className="btn-reject" onClick={addImportRow} style={{ padding: '6px 14px', fontSize: 13 }}>
                                <PlusCircle size={13} /> Thêm dòng
                            </button>
                        </div>

                        <div style={{ display: 'grid', gap: 8 }}>
                            <div style={{
                                display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto',
                                gap: 8, fontSize: 12, color: 'rgba(255,255,255,.5)', padding: '0 4px'
                            }}>
                                <span>Nguyên liệu</span><span>Số lượng</span><span>Hạn sử dụng</span><span></span>
                            </div>
                            {importForm.items.map((row, i) => (
                                <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 8, alignItems: 'center' }}>
                                    <select
                                        className="search-input1"
                                        value={row.ingredientId}
                                        onChange={e => updateImportRow(i, 'ingredientId', e.target.value)}
                                    >
                                        <option value="">-- Chọn --</option>
                                        {ingredients.map(ing => (
                                            <option key={ing.id} value={ing.id}>{ing.name} ({ing.unit})</option>
                                        ))}
                                    </select>
                                    <input
                                        className="search-input"
                                        style={{ paddingLeft: 16 }}
                                        type="number" min="0" placeholder="0"
                                        value={row.quantity}
                                        onChange={e => updateImportRow(i, 'quantity', e.target.value)}
                                    />
                                    <input
                                        className="search-input"
                                        style={{ paddingLeft: 16 }}
                                        type="date"
                                        value={row.expiryDate}
                                        onChange={e => updateImportRow(i, 'expiryDate', e.target.value)}
                                    />
                                    <button
                                        className="modal-close"
                                        onClick={() => removeImportRow(i)}
                                        disabled={importForm.items.length === 1}
                                    >
                                        <X size={13} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <button
                        className="btn-modal-approve"
                        onClick={submitImport}
                        disabled={importLoading}
                        style={{ width: '100%', justifyContent: 'center', padding: '13px 0' }}
                    >
                        {importLoading ? 'Đang xử lý...' : <><Download size={15} /> Xác nhận nhập kho</>}
                    </button>
                </div>
            )}

            {/* Tồn kho tổng */}
            {tab === 'wh-stock' && (
                <div style={{ display: 'grid', gap: 2 }}>
                    <div className="branch-inventory-section">
                        <label className="modal-field-label" style={{ display: 'block', marginBottom: 8 }}>
                            Chọn kho để xem tồn kho
                        </label>
                        <select
                            className="search-input1"
                            style={{ maxWidth: 320 }}
                            value={selectedWh}
                            onChange={e => setSelectedWh(e.target.value)}
                        >
                            <option value="">-- Chọn kho --</option>
                            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                        </select>
                    </div>

                    {selectedWh && (
                        <div className="branch-inventory-section">
                            <h3 style={{ color: 'var(--color-text-secondary)' }}>
                                {warehouses.find(w => String(w.id) === String(selectedWh))?.name}
                                {' '}— Tồn kho ({whInventory.length} nguyên liệu)
                            </h3>
                            {whInventory.length === 0 ? (
                                <div className="empty-state"><BarChart2 size={40} /><p>Kho trống</p></div>
                            ) : (
                                <div className="inventory-table-container">
                                    <table className="inventory-table">
                                        <thead>
                                            <tr>
                                                {['Nguyên liệu', 'Đơn vị', 'Số lượng', 'Trạng thái'].map(h => (
                                                    <th key={h} style={{ color: 'var(--color-text-secondary)', fontWeight: 'bold' }}>
                                                        {h}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {whInventory.map(item => (
                                                <tr key={item.id}>
                                                    <td className="ingredient-name">{item.ingredient?.name || 'N/A'}</td>
                                                    <td className="ingredient-unit">{item.ingredient?.unit || '—'}</td>
                                                    <td className={qtyClass(item.quantity ?? 0)} style={{ color: 'var(--color-text-secondary)' }}>
                                                        {item.quantity ?? 0}
                                                    </td>
                                                    <td><StockBadge qty={item.quantity ?? 0} /></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Tồn kho chi nhánh */}
            {tab === 'branch-stock' && (
                <div style={{ display: 'grid', gap: 2 }}>
                    <div className="branch-inventory-section">
                        <h3 style={{ color: 'var(--color-text-secondary)' }}>
                            Chọn chi nhánh</h3>
                        <div className="branch-buttons">
                            {branches.map(b => (
                                <button
                                    key={b.id}
                                    onClick={() => setSelectedBranch(b)}
                                    className={`branch-button${selectedBranch?.id === b.id ? ' active' : ''}`}
                                >
                                    <MapPin size={13} /> {b.name}
                                </button>
                            ))}
                        </div>

                        {selectedBranch && (
                            <div className="branch-info">
                                <div className="branch-info-name"><MapPin size={16} /> {selectedBranch.name}</div>
                                <p className="branch-info-address">{selectedBranch.address}</p>
                            </div>
                        )}
                    </div>

                    {selectedBranch && (
                        <div className="branch-inventory-section">
                            <h3 style={{ color: 'var(--color-text-secondary)' }}>
                                Tồn kho — {selectedBranch.name}</h3>
                            {branchIngredients.length === 0 ? (
                                <div className="empty-state"><Store size={40} /><p>Chưa có nguyên liệu</p></div>
                            ) : (
                                <div className="inventory-table-container">
                                    <table className="inventory-table">
                                        <thead>
                                            <tr>
                                                {['Nguyên liệu', 'Đơn vị', 'Tồn kho', 'Trạng thái'].map(h => (
                                                    <th key={h} style={{ color: 'var(--color-text-secondary)', fontWeight: 'bold' }}>
                                                        {h}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {branchIngredients.map(item => (
                                                <tr key={item.id}>
                                                    <td className="ingredient-name">{item.ingredient?.name || 'N/A'}</td>
                                                    <td className="ingredient-unit">{item.ingredient?.unit || '—'}</td>
                                                    <td style={{ color: 'var(--color-text-secondary)' }} className={qtyClass(item.quantity ?? 0)}>{item.quantity ?? 0}</td>
                                                    <td><StockBadge qty={item.quantity ?? 0} /></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Yêu cầu */}
            {tab === 'requests' && (
                <div style={{ display: 'grid', gap: 2 }}>
                    {/* Filters */}
                    <div className="filters-container">
                        <div className="search-wrapper">
                            <input
                                className="search-input"
                                placeholder="Tìm kiếm..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </div>
                        <select className="search-input1" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                            <option value="all">Tất cả trạng thái</option>
                            <option value="PENDING">Chờ duyệt</option>
                            <option value="APPROVED">Đã duyệt</option>
                            <option value="RECEIVED">Đã nhận hàng</option>
                            <option value="REJECTED">Từ chối</option>
                        </select>
                        <select className="search-input1" value={filterType} onChange={e => setFilterType(e.target.value)}>
                            <option value="all">Tất cả loại</option>
                            <option value="IMPORT">Nhập kho</option>
                            <option value="EXPORT">Xuất kho</option>
                        </select>
                    </div>

                    {filteredReqs.length === 0 ? (
                        <div className="empty-state"><FileText size={40} /><p>Không tìm thấy yêu cầu nào</p></div>
                    ) : (
                        <div className="requests-list">
                            {filteredReqs.map(req => {
                                const items = getItems(req.id);
                                const first = getFirst(req.id);
                                const title = !first
                                    ? 'Không có nguyên liệu'
                                    : items.length === 1
                                        ? first.ingredient?.name
                                        : `${first.ingredient?.name} (+${items.length - 1} NL)`;
                                return (
                                    <div key={req.id} className="request-card" onClick={() => setSelectedReq(req)}>
                                        <div className="request-header">
                                            <div className="request-content">
                                                <div className="request-badges">
                                                    <TypeBadge type={req.type} />
                                                    <StatusBadge status={req.status} />
                                                </div>
                                                <div className="request-title">{title}</div>
                                                <div className="request-details">
                                                    <span className="request-detail-item"><MapPin size={12} />{req.branch?.name}</span>
                                                    <span className="request-detail-item"><User size={12} />{req.requestedBy?.fullName}</span>
                                                    <span className="request-detail-item"><Calendar size={12} />{fmtDate(req.requestedAt)}</span>
                                                </div>
                                            </div>
                                            {req.status === 'PENDING' && (
                                                <div className="request-actions">
                                                    <button
                                                        className="btn-approve"
                                                        onClick={e => { e.stopPropagation(); approveReq(req.id); }}
                                                        disabled={reqLoading}
                                                    >
                                                        <Check size={13} /> Duyệt
                                                    </button>
                                                    <button
                                                        className="btn-reject"
                                                        onClick={e => { e.stopPropagation(); setRejectModal(req); }}
                                                    >
                                                        <X size={13} /> Từ chối
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Lịch sử */}
            {tab === 'history' && (
                <div style={{ display: 'grid', gap: 20 }}>
                    {/* Sub-tabs */}
                    <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 0 }}>
                        {[
                            { id: 'export', label: '📤 Lịch sử xuất kho' },
                            { id: 'import', label: '📥 Lịch sử nhập kho' },
                        ].map(t => (
                            <button
                                key={t.id}
                                onClick={() => setHistoryTab(t.id)}
                                className={`inventory-tab${historyTab === t.id ? ' active' : ''}`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>

                    {/* Xuất kho */}
                    {historyTab === 'export' && (
                        <div className="branch-inventory-section">
                            <h3 style={{ color: 'var(--color-text-secondary)' }}><ArrowUpCircle size={16} /> Lịch sử xuất kho ({exportHistory.length})</h3>
                            {exportHistory.length === 0 ? (
                                <div className="empty-state"><ArrowUpCircle size={40} /><p>Chưa có dữ liệu</p></div>
                            ) : (
                                <div className="inventory-table-container">
                                    <table className="inventory-table">
                                        <thead>
                                            <tr>
                                                {['Ngày', 'Kho', 'Chi nhánh', 'Người duyệt', ''].map(h => (
                                                    <th key={h} style={{ color: 'var(--color-text-secondary)', fontWeight: 'bold' }}>
                                                        {h}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {exportHistory.map(ex => (
                                                <tr key={ex.id} style={{ cursor: 'pointer' }}
                                                    onClick={async () => {
                                                        setSelectedExport(ex);
                                                        await fetchExportDetail(ex.id);
                                                    }}
                                                >
                                                    <td style={{ color: 'var(--color-text-secondary)' }}>{fmtDate(ex.createdAt)}</td>
                                                    <td className="ingredient-name" style={{ color: 'var(--color-text-secondary)' }}>{ex.warehouse?.name || '—'}</td>
                                                    <td style={{ color: 'var(--color-text-secondary)' }}>{ex.branch?.name || '—'}</td>
                                                    <td style={{ color: 'var(--color-text-secondary)' }}>{ex.createdBy?.fullName || ex.createdBy?.username || '—'}</td>
                                                    <td>
                                                        <span style={{
                                                            fontSize: 12, color: '#667eea',
                                                            border: '1px solid #667eea',
                                                            borderRadius: 6, padding: '3px 10px'
                                                        }}>
                                                            Chi tiết
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Nhập kho */}
                    {historyTab === 'import' && (
                        <div className="branch-inventory-section">
                            <h3 style={{ color: 'var(--color-text-secondary)' }}><ArrowDownCircle size={16} /> Lịch sử nhập kho (tồn kho hiện tại)</h3>
                            {importHistory.length === 0 ? (
                                <div className="empty-state"><ArrowDownCircle size={40} /><p>Chưa có dữ liệu</p></div>
                            ) : (
                                <div className="inventory-table-container">
                                    <table className="inventory-table">
                                        <thead>
                                            <tr>
                                                {['Kho', 'Nguyên liệu', 'Đơn vị', 'Tồn kho', 'Trạng thái'].map(h => (
                                                    <th key={h} style={{ color: 'var(--color-text-secondary)', fontWeight: 'bold' }}>
                                                        {h}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {importHistory.map(item => (
                                                <tr key={item.id}>
                                                    <td className="ingredient-name" style={{ color: 'var(--color-text-secondary)' }}>
                                                        {item.warehouse?.name || '—'}
                                                    </td>
                                                    <td style={{ color: 'var(--color-text-secondary)' }}>
                                                        {item.ingredient?.name || '—'}
                                                    </td>
                                                    <td className="ingredient-unit" style={{ color: 'var(--color-text-secondary)' }}>
                                                        {item.ingredient?.unit || '—'}
                                                    </td>
                                                    <td className={qtyClass(item.quantity ?? 0)} style={{ color: 'var(--color-text-secondary)' }}>
                                                        {item.quantity ?? 0}
                                                    </td>
                                                    <td><StockBadge qty={item.quantity ?? 0} /></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Chi tiết yêu cầu */}
            {selectedReq && (
                <div className="modal-overlay" onClick={() => setSelectedReq(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">Chi tiết yêu cầu #{selectedReq.id}</h2>
                            <button className="modal-close" onClick={() => setSelectedReq(null)}>
                                <X size={16} />
                            </button>
                        </div>
                        <div className="modal-badges">
                            <TypeBadge type={selectedReq.type} />
                            <StatusBadge status={selectedReq.status} />
                        </div>
                        <div className="modal-body">
                            {/* Items */}
                            <div className="modal-field">
                                <div className="modal-field-label">Nguyên liệu</div>
                                {getItems(selectedReq.id).map((item, i) => (
                                    <div key={i} style={{
                                        display: 'flex', justifyContent: 'space-between',
                                        padding: '10px 14px', background: 'rgba(255,255,255,.05)',
                                        borderRadius: 8, marginBottom: 6, fontSize: 14
                                    }}>
                                        <span style={{ fontWeight: 500 }}>{item.ingredient?.name}</span>
                                        <span style={{ opacity: .6 }}>{item.quantity} {item.ingredient?.unit}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Timeline */}
                            <div className="modal-timeline">
                                <div className="modal-timeline-title">Thông tin</div>
                                <div className="modal-timeline-items">
                                    <div className="modal-timeline-item">
                                        <span className="modal-timeline-item-label"><MapPin size={13} /> Chi nhánh</span>
                                        <span className="modal-timeline-item-value">{selectedReq.branch?.name}</span>
                                    </div>
                                    <div className="modal-timeline-divider" />
                                    <div className="modal-timeline-item">
                                        <span className="modal-timeline-item-label"><User size={13} /> Người yêu cầu</span>
                                        <span className="modal-timeline-item-value">
                                            {selectedReq.requestedBy?.fullName || selectedReq.requestedBy?.username || 'N/A'}
                                        </span>
                                    </div>
                                    <div className="modal-timeline-divider" />
                                    <div className="modal-timeline-item">
                                        <span className="modal-timeline-item-label"><Calendar size={13} /> Thời gian</span>
                                        <span className="modal-timeline-item-value">{fmtDate(selectedReq.requestedAt)}</span>
                                    </div>
                                    {selectedReq.reason && (
                                        <>
                                            <div className="modal-timeline-divider" />
                                            <div className="modal-timeline-item">
                                                <span className="modal-timeline-item-label"><FileText size={13} /> Lý do</span>
                                                <span className="modal-timeline-item-value">{selectedReq.reason}</span>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            {selectedReq.status === 'PENDING' && (
                                <div className="modal-actions">
                                    <button
                                        className="btn-modal-approve"
                                        onClick={() => approveReq(selectedReq.id)}
                                        disabled={reqLoading}
                                    >
                                        <CheckCircle size={15} /> Duyệt
                                    </button>
                                    <button
                                        className="btn-modal-reject"
                                        onClick={() => { setRejectModal(selectedReq); setSelectedReq(null); }}
                                        disabled={reqLoading}
                                    >
                                        <XCircle size={15} /> Từ chối
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Chi tiết xuất kho */}
            {selectedExport && exportDetail && (
                <div className="modal-overlay" onClick={() => { setSelectedExport(null); setExportDetail(null); }}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">
                                Chi tiết xuất kho #{selectedExport.id}
                            </h2>
                            <button className="modal-close" onClick={() => { setSelectedExport(null); setExportDetail(null); }}>
                                <X size={16} />
                            </button>
                        </div>
                        <div className="modal-body">
                            {/* Thông tin chung */}
                            <div className="modal-timeline" style={{ marginBottom: 20 }}>
                                <div className="modal-timeline-title">Thông tin phiếu xuất</div>
                                <div className="modal-timeline-items">
                                    <div className="modal-timeline-item">
                                        <span className="modal-timeline-item-label"><Warehouse size={13} /> Kho</span>
                                        <span className="modal-timeline-item-value">{exportDetail.export?.warehouse?.name || '—'}</span>
                                    </div>
                                    <div className="modal-timeline-divider" />
                                    <div className="modal-timeline-item">
                                        <span className="modal-timeline-item-label"><MapPin size={13} /> Chi nhánh</span>
                                        <span className="modal-timeline-item-value">{exportDetail.export?.branch?.name || '—'}</span>
                                    </div>
                                    <div className="modal-timeline-divider" />
                                    {(selectedReq.status === 'RECEIVED' || selectedReq.status === 'APPROVED') && selectedReq.approvedBy && (
                                        <>
                                            <div className="modal-timeline-divider" />
                                            <div className="modal-timeline-item">
                                                <span className="modal-timeline-item-label"><CheckCircle size={13} /> Người duyệt</span>
                                                <span className="modal-timeline-item-value">{selectedReq.approvedBy?.fullName}</span>
                                            </div>
                                        </>
                                    )}
                                    {selectedReq.status === 'RECEIVED' && selectedReq.receivedBy && (
                                        <>
                                            <div className="modal-timeline-divider" />
                                            <div className="modal-timeline-item">
                                                <span className="modal-timeline-item-label"><Check size={13} /> Người nhận hàng</span>
                                                <span className="modal-timeline-item-value">{selectedReq.receivedBy?.fullName}</span>
                                            </div>
                                        </>
                                    )}
                                    <div className="modal-timeline-divider" />
                                    <div className="modal-timeline-item">
                                        <span className="modal-timeline-item-label"><Calendar size={13} /> Ngày xuất</span>
                                        <span className="modal-timeline-item-value">{fmtDate(exportDetail.export?.createdAt)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Danh sách nguyên liệu */}
                            <div className="modal-field-label" style={{ marginBottom: 8 }}>Nguyên liệu xuất</div>
                            {(exportDetail.items || []).length === 0 ? (
                                <div style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: 24 }}>
                                    Không có nguyên liệu
                                </div>
                            ) : (
                                <div className="inventory-table-container">
                                    <table className="inventory-table">
                                        <thead>
                                            <tr>
                                                <th>Nguyên liệu</th>
                                                <th>Đơn vị</th>
                                                <th>Số lượng</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(exportDetail.items || []).map((item, i) => (
                                                <tr key={i}>
                                                    <td className="ingredient-name">{item.ingredient?.name || '—'}</td>
                                                    <td className="ingredient-unit">{item.ingredient?.unit || '—'}</td>
                                                    <td className="quantity-value">{item.quantity}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Từ chối */}
            {rejectModal && (
                <div className="modal-overlay" onClick={() => setRejectModal(null)}>
                    <div className="modal-content" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">Từ chối yêu cầu</h2>
                            <button className="modal-close" onClick={() => setRejectModal(null)}>
                                <X size={16} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="modal-field">
                                <div className="modal-field-label">Chi nhánh</div>
                                <div className="modal-field-value branch">
                                    <MapPin size={16} color="#667eea" />
                                    <strong>{rejectModal.branch?.name}</strong>
                                </div>
                            </div>
                            <div className="modal-field">
                                <label className="modal-field-label rejection">Lý do từ chối *</label>
                                <textarea
                                    className="search-input"
                                    rows={4}
                                    placeholder="Nhập lý do..."
                                    value={rejectNote}
                                    onChange={e => setRejectNote(e.target.value)}
                                    style={{ paddingLeft: 16, resize: 'vertical', minHeight: 100 }}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                                <button
                                    className="modal-close"
                                    style={{ width: 'auto', padding: '8px 16px', borderRadius: 8 }}
                                    onClick={() => setRejectModal(null)}
                                >
                                    Hủy
                                </button>
                                <button
                                    className="btn-modal-reject"
                                    style={{ padding: '10px 20px', border: 'none', background: 'rgba(239,68,68,.9)', color: '#fff' }}
                                    disabled={reqLoading || !rejectNote.trim()}
                                    onClick={() => {
                                        if (!rejectNote.trim()) {
                                            addToast({ type: 'warning', title: 'Vui lòng nhập lý do', message: '' });
                                            return;
                                        }
                                        rejectReq(rejectModal.id, rejectNote);
                                    }}
                                >
                                    <XCircle size={15} /> Xác nhận từ chối
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}