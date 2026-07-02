import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
    Clock, CheckCircle, XCircle, Check, X,
    MapPin, Calendar, User, FileText, ArrowUpCircle, ArrowDownCircle,
    History, Warehouse, PlusCircle, Download, BarChart2, Store,
    Package,
    Upload,
    AlertTriangle,
    Ban,
    ChevronRight
} from 'lucide-react';
import './InventoryManegement.css';
import io from 'socket.io-client';

const socket = io('/', { path: '/socket.io/' });
const API_BASE_URL = '';

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
    return <span className="badge status-approved"><Check size={12} /> Đủ hàng</span>;
};

const calcDays = (date) =>
    date ? Math.ceil((new Date(date) - new Date()) / 86_400_000) : null;

const fmtLocalDate = (date) =>
    date ? new Date(date).toLocaleDateString('vi-VN') : '—';

const ExpiryBadge = ({ date, daysOverride }) => {
    const d = daysOverride !== undefined ? daysOverride : calcDays(date);
    if (d === null) return <span className="badge status-pending">Không rõ HSD</span>;
    if (d < 0) return <span className="badge status-rejected"><AlertTriangle size={12} /> Hết hạn ({Math.abs(d)}d)</span>;
    if (d === 0) return <span className="badge status-rejected"><AlertTriangle size={12} /> Hết hôm nay</span>;
    if (d <= 3) return (
        <span className="badge" style={{
            background: 'rgba(239,68,68,.15)', color: '#ef4444',
            border: '1px solid rgba(239,68,68,.35)', borderRadius: 6,
            padding: '3px 8px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 3
        }}> <Clock size={12} /> Còn {d} ngày</span>
    );
    if (d <= 7) return <span className="badge status-pending"><Clock size={12} /> Còn {d} ngày</span>;
    return <span className="badge status-approved"><Check size={12} /> {d} ngày</span>;
};

const ExportBadge = ({ expiryDate }) => {
    const d = calcDays(expiryDate);
    if (d === null) return null;
    if (d < 0) return <span className="badge status-rejected"><Ban size={12} /> Hết hạn</span>;
    if (d <= 5) return (
        <span className="badge" style={{
            background: 'rgba(239,68,68,.12)', color: '#ef4444',
            border: '1px solid rgba(239,68,68,.3)', borderRadius: 6,
            padding: '3px 8px', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 3
        }}> <Ban size={12} /> Không thể xuất</span>
    );
    return <span className="badge status-approved" style={{ fontSize: 11 }}><Check size={12} /> Xuất được</span>;
};

const batchRowStyle = (d) => {
    if (d === null || d === undefined) return {};
    if (d < 0) return { background: 'rgba(239,68,68,.07)', borderLeft: '3px solid #ef4444' };
    if (d <= 3) return { background: 'rgba(239,68,68,.04)', borderLeft: '3px solid rgba(239,68,68,.5)' };
    if (d <= 7) return { background: 'rgba(245,158,11,.05)', borderLeft: '3px solid rgba(245,158,11,.6)' };
    return {};
};

const ViewToggle = ({ mode, setMode }) => (
    <div style={{ display: 'flex', gap: 4, background: 'rgba(0,0,0,.05)', borderRadius: 8, padding: 3 }}>
        {[
            { id: 'aggregate', label: <><BarChart2 size={13} /> Tổng hợp</> },
            { id: 'batch', label: <><Package size={13} /> Theo lô (HSD)</> }
        ].map(m => (
            <button key={m.id} onClick={() => setMode(m.id)} style={{
                padding: '6px 14px', borderRadius: 6, border: 'none',
                background: mode === m.id ? '#667eea' : 'transparent',
                color: mode === m.id ? '#fff' : 'inherit',
                cursor: 'pointer', fontSize: 13, fontWeight: mode === m.id ? 600 : 400,
                transition: 'all .15s',
                display: 'flex', alignItems: 'center', gap: 5
            }}>{m.label}</button>
        ))}
    </div>
);

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
    const [whAggregated, setWhAggregated] = useState([]);
    const fetchWhAggregated = useCallback(async (wid) => {
        if (!wid) return;
        const r = await apiFetch(`/api/inventory-batches/warehouse/${wid}/aggregated`);
        if (r.ok) setWhAggregated(await r.json());
        else setWhAggregated([]);
    }, []);

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
    const [whBatches, setWhBatches] = useState([]);
    const [branchBatches, setBranchBatches] = useState([]);
    const [nearExpiryBatches, setNearExpiryBatches] = useState([]);
    const [expiredCount, setExpiredCount] = useState(0);
    const [whViewMode, setWhViewMode] = useState('aggregate');
    const [branchViewMode, setBranchViewMode] = useState('aggregate');

    const [deletingWh, setDeletingWh] = useState(null);
    const [whBatchHsdFilter, setWhBatchHsdFilter] = useState('all');

    const [importSearchTerms, setImportSearchTerms] = useState({});
    const [importOpenDropdowns, setImportOpenDropdowns] = useState({});
    const [whStockSearch, setWhStockSearch] = useState('');

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

    const deleteWarehouse = async (id) => {
        const r = await apiFetch(`/api/warehouses/${id}`, { method: 'DELETE' });
        if (r.ok) {
            addToast({ type: 'success', title: 'Đã xóa kho', message: '' });
            fetchWarehouses();
        } else {
            const msg = await r.text();
            addToast({ type: 'error', title: 'Xóa thất bại', message: msg });
        }
        setDeletingWh(null);
    };

    const fetchExportHistory = useCallback(async () => {
        const r = await apiFetch('/api/warehouse-exports');
        if (r.ok) setExportHistory(await r.json());
    }, []);

    const fetchImportHistory = useCallback(async () => {
        const r = await apiFetch('/api/warehouses/inventory-history');
        if (r.ok) setImportHistory(await r.json());
    }, []);

    const fetchWhBatches = useCallback(async (wid) => {
        if (!wid) return;
        const r = await apiFetch(`/api/inventory-batches/warehouse/${wid}`);
        if (r.ok) setWhBatches(await r.json()); else setWhBatches([]);
    }, []);

    const fetchBranchBatches = useCallback(async (bid) => {
        const r = await apiFetch(`/api/inventory-batches/branch/${bid}`);
        if (r.ok) setBranchBatches(await r.json()); else setBranchBatches([]);
    }, []);

    const fetchNearExpiry = useCallback(async () => {
        const [nr, er] = await Promise.all([
            apiFetch('/api/inventory-batches/near-expiry'),
            apiFetch('/api/inventory-batches/expired-count'),
        ]);
        if (nr.ok) setNearExpiryBatches(await nr.json());
        if (er.ok) setExpiredCount(await er.json());
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
        const res = await apiFetch(`/api/inventory-requests/${id}/approve`, { method: 'PUT' });

        if (!res.ok) {
            // Đọc message lỗi từ backend (nếu có)
            let errMsg = 'Duyệt thất bại';
            try {
                const body = await res.json();
                errMsg = body.message || body.error || errMsg;
            } catch {
                errMsg = await res.text().catch(() => errMsg);
            }
            addToast({ type: 'error', title: `Không thể duyệt #${id}`, message: errMsg });
            setReqLoading(false);
            return; // ← dừng lại, không emit socket, không toast success
        }
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
        fetchNearExpiry();
    }, []);
    useEffect(() => {
        if (selectedBranch) {
            fetchBranchIngredients(selectedBranch.id);
            fetchBranchBatches(selectedBranch.id);
        }
    }, [selectedBranch]);
    useEffect(() => {
        if (selectedWh) {
            fetchWarehouseInventory(selectedWh);
            fetchWhBatches(selectedWh);
            fetchWhAggregated(selectedWh);
        }
    }, [selectedWh]);
    useEffect(() => {
        const id = setInterval(() => {
            fetchWarehouses();
            fetchNearExpiry();

            if (!selectedReq && !rejectModal) {
                fetchRequests();
            }

            switch (tab) {
                case 'wh-stock':
                    if (selectedWh) {
                        fetchWarehouseInventory(selectedWh);
                        fetchWhBatches(selectedWh);
                        fetchWhAggregated(selectedWh);
                    }
                    break;

                case 'branch-stock':
                    if (selectedBranch) {
                        fetchBranchIngredients(selectedBranch.id);
                        fetchBranchBatches(selectedBranch.id);
                    }
                    break;

                case 'history':
                    fetchExportHistory();
                    fetchImportHistory();
                    break;

                case 'import':
                    fetchIngredients();
                    break;

                default:
                    break;
            }
        }, 5000);

        return () => clearInterval(id);
    }, [
        tab,
        selectedBranch,
        selectedWh,
        selectedReq,
        rejectModal,
        fetchWarehouses,
        fetchNearExpiry,
        fetchRequests,
        fetchWarehouseInventory,
        fetchWhBatches,
        fetchWhAggregated,
        fetchBranchIngredients,
        fetchBranchBatches,
        fetchExportHistory,
        fetchImportHistory,
        fetchIngredients,
    ]);

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
    }).sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt));

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

            {(expiredCount > 0 || nearExpiryBatches.length > 0) && (
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 4 }}>
                    {expiredCount > 0 && (
                        <div onClick={() => setTab('wh-stock')} style={{
                            flex: 1, minWidth: 240, background: 'rgba(239,68,68,.1)',
                            border: '1px solid rgba(239,68,68,.3)', borderRadius: 10,
                            padding: '12px 16px', display: 'flex', gap: 10,
                            alignItems: 'center', cursor: 'pointer'
                        }}>
                            <XCircle size={22} color="#ef4444" />
                            <div style={{ flex: 1 }}>
                                <div style={{ color: '#ef4444', fontWeight: 700 }}>
                                    {expiredCount} lô nguyên liệu đã hết hạn
                                </div>
                                <div style={{ fontSize: 12, color: 'rgba(239,68,68,.7)', marginTop: 2 }}>
                                    Kiểm tra và loại bỏ khỏi kho
                                </div>
                            </div>
                            <span style={{ color: '#ef4444', fontSize: 12 }}>Xem <ChevronRight size={14} /></span>
                        </div>
                    )}
                    {nearExpiryBatches.length > 0 && (
                        <div onClick={() => setTab('wh-stock')} style={{
                            flex: 1, minWidth: 240, background: 'rgba(245,158,11,.1)',
                            border: '1px solid rgba(245,158,11,.3)', borderRadius: 10,
                            padding: '12px 16px', display: 'flex', gap: 10,
                            alignItems: 'center', cursor: 'pointer'
                        }}>
                            <Clock size={22} color="#f59e0b" />
                            <div style={{ flex: 1 }}>
                                <div style={{ color: '#f59e0b', fontWeight: 700 }}>
                                    {nearExpiryBatches.length} lô sắp hết hạn (≤ 7 ngày)
                                </div>
                                <div style={{ fontSize: 12, color: 'rgba(245,158,11,.75)', marginTop: 2 }}>
                                    {[...new Set(nearExpiryBatches.map(b => b.ingredient?.name).filter(Boolean))]
                                        .slice(0, 5).join(' · ')}
                                    {nearExpiryBatches.length > 5 ? ` +${nearExpiryBatches.length - 5} lô nữa` : ''}
                                </div>
                            </div>
                            <span style={{ color: '#f59e0b', fontSize: 12 }}>Xem <ChevronRight size={14} /></span>
                        </div>
                    )}
                </div>
            )}

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
                                    <div key={w.id} className="branch-button" style={{ cursor: 'default', justifyContent: 'space-between' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <Warehouse size={18} color="#667eea" />
                                            <div style={{ color: 'var(--color-text-secondary)', fontWeight: 600, fontSize: 14 }}>
                                                {w.name}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setDeletingWh(w)}
                                            style={{
                                                background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
                                                borderRadius: 6, padding: '4px 8px', cursor: 'pointer', color: '#ef4444',
                                                display: 'flex', alignItems: 'center', gap: 4, fontSize: 12
                                            }}
                                        >
                                            <X size={12} /> Xóa
                                        </button>
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
                                    <div style={{ position: 'relative' }}>
                                        <input
                                            className="search-input1"
                                            style={{ width: '100%', boxSizing: 'border-box' }}
                                            placeholder="Tìm nguyên liệu..."
                                            value={
                                                row.ingredientId
                                                    ? (importOpenDropdowns[i]
                                                        ? (importSearchTerms[i] ?? '')
                                                        : (() => {
                                                            const ing = ingredients.find(x => x.id === parseInt(row.ingredientId));
                                                            return ing ? `${ing.name} (${ing.unit})` : '';
                                                        })())
                                                    : (importSearchTerms[i] ?? '')
                                            }
                                            onChange={e => {
                                                setImportSearchTerms(p => ({ ...p, [i]: e.target.value }));
                                                setImportOpenDropdowns(p => ({ ...p, [i]: true }));
                                                if (!e.target.value) updateImportRow(i, 'ingredientId', '');
                                            }}
                                            onFocus={() => setImportOpenDropdowns(p => ({ ...p, [i]: true }))}
                                        />
                                        {importOpenDropdowns[i] && (
                                            <>
                                                <div
                                                    style={{ position: 'fixed', inset: 0, zIndex: 99 }}
                                                    onClick={() => setImportOpenDropdowns(p => ({ ...p, [i]: false }))}
                                                />
                                                <div style={{
                                                    position: 'absolute', top: '100%', left: 0, right: 0,
                                                    background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.15)',
                                                    borderRadius: 8, zIndex: 100, maxHeight: 200, overflowY: 'auto',
                                                    boxShadow: '0 8px 24px rgba(0,0,0,0.5)', marginTop: 4
                                                }}>
                                                    {ingredients
                                                        .filter(ing => {
                                                            const term = (importSearchTerms[i] ?? '').toLowerCase();
                                                            return !term || ing.name.toLowerCase().includes(term);
                                                        })
                                                        .map(ing => (
                                                            <div
                                                                key={ing.id}
                                                                onMouseDown={() => {
                                                                    updateImportRow(i, 'ingredientId', ing.id);
                                                                    setImportSearchTerms(p => ({ ...p, [i]: '' }));
                                                                    setImportOpenDropdowns(p => ({ ...p, [i]: false }));
                                                                }}
                                                                style={{
                                                                    padding: '9px 14px', cursor: 'pointer', fontSize: 13,
                                                                    color: parseInt(row.ingredientId) === ing.id ? '#667eea' : 'rgba(255,255,255,0.85)',
                                                                    background: parseInt(row.ingredientId) === ing.id ? 'rgba(102,126,234,0.15)' : 'transparent',
                                                                    borderBottom: '1px solid rgba(255,255,255,0.05)'
                                                                }}
                                                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(102,126,234,0.1)'}
                                                                onMouseLeave={e => e.currentTarget.style.background =
                                                                    parseInt(row.ingredientId) === ing.id ? 'rgba(102,126,234,0.15)' : 'transparent'}
                                                            >
                                                                {ing.name} ({ing.unit})
                                                            </div>
                                                        ))}
                                                    {ingredients.filter(ing => {
                                                        const term = (importSearchTerms[i] ?? '').toLowerCase();
                                                        return !term || ing.name.toLowerCase().includes(term);
                                                    }).length === 0 && (
                                                            <div style={{ padding: '14px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
                                                                Không tìm thấy
                                                            </div>
                                                        )}
                                                </div>
                                            </>
                                        )}
                                    </div>
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
                            onChange={e => { setSelectedWh(e.target.value); setWhBatchHsdFilter('all'); setWhStockSearch(''); }}
                        >
                            <option value="">-- Chọn kho --</option>
                            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                        </select>
                    </div>

                    {selectedWh && (
                        <div className="branch-inventory-section">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                                <h3 style={{ color: 'var(--color-text-secondary)', margin: 0 }}>
                                    {warehouses.find(w => String(w.id) === String(selectedWh))?.name}
                                    {' — '}
                                    {whViewMode === 'aggregate'
                                        ? `Tổng hợp (${whInventory.length} NL)`
                                        : `Theo lô (${whBatches.length} lô)`}
                                </h3>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                                    <input
                                        className="search-input"
                                        style={{ paddingLeft: 16, minWidth: 200 }}
                                        placeholder="Tìm nguyên liệu..."
                                        value={whStockSearch}
                                        onChange={e => setWhStockSearch(e.target.value)}
                                    />
                                    <ViewToggle mode={whViewMode} setMode={setWhViewMode} />
                                </div>
                            </div>

                            {/* Tổng hợp */}
                            {whViewMode === 'aggregate' && (() => {
                                const filteredAgg = whAggregated.filter(item =>
                                    !whStockSearch ||
                                    item.ingredient?.name?.toLowerCase().includes(whStockSearch.toLowerCase())
                                );
                                return filteredAgg.length === 0
                                    ? <div className="empty-state"><BarChart2 size={40} /><p>Kho trống (không có lô còn hạn)</p></div>
                                    : (
                                        <div className="inventory-table-container">
                                            <table className="inventory-table">
                                                <thead><tr>
                                                    {['Nguyên liệu', 'Đơn vị', 'Số lượng (còn hạn)', 'Trạng thái'].map(h =>
                                                        <th key={h} style={{ color: 'var(--color-text-secondary)', fontWeight: 'bold' }}>{h}</th>
                                                    )}
                                                </tr></thead>
                                                <tbody>
                                                    {filteredAgg.map(item => (
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
                                    );
                            })()}

                            {/* Theo lô */}
                            {whViewMode === 'batch' && (
                                whBatches.length === 0
                                    ? <div className="empty-state"><BarChart2 size={40} /><p>Không có lô nào</p></div>
                                    : (() => {
                                        const exportable = whBatches.filter(b => calcDays(b.expiryDate) > 5);
                                        const nonExportable = whBatches.filter(b => { const d = calcDays(b.expiryDate); return d !== null && d <= 5; });
                                        const exportableQty = (ing) => exportable
                                            .filter(b => b.ingredient?.id === ing)
                                            .reduce((s, b) => s + (b.remainingQuantity ?? 0), 0);

                                        return (
                                            <>
                                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                                                    {[
                                                        { value: 'all', label: 'Tất cả', color: '#667eea' },
                                                        { value: 'usable', label: <><Check size={12} /> Xuất được</>, color: '#10b981' },
                                                        { value: 'nearExpiry', label: <><Clock size={12} /> Sắp hết hạn</>, color: '#f59e0b' },
                                                        { value: 'expired', label: <><AlertTriangle size={12} /> Hết hạn</>, color: '#ef4444' },
                                                    ].map(p => (
                                                        <button key={p.value} onClick={() => setWhBatchHsdFilter(p.value)} style={{
                                                            padding: '5px 14px', borderRadius: 20,
                                                            border: `1.5px solid ${p.color}`,
                                                            background: whBatchHsdFilter === p.value ? p.color : 'transparent',
                                                            color: whBatchHsdFilter === p.value ? '#fff' : p.color,
                                                            cursor: 'pointer', fontSize: 13, fontWeight: 600, transition: 'all .15s'
                                                        }}>{p.label}</button>
                                                    ))}
                                                </div>
                                                {/* Summary bar */}
                                                {nonExportable.length > 0 && (
                                                    <div style={{
                                                        display: 'flex', gap: 12, marginBottom: 12,
                                                        padding: '10px 14px', borderRadius: 8,
                                                        background: 'rgba(239,68,68,.08)',
                                                        border: '1px solid rgba(239,68,68,.25)',
                                                        fontSize: 13, flexWrap: 'wrap', alignItems: 'center'
                                                    }}>
                                                        <span style={{ color: '#ef4444', fontWeight: 700 }}>
                                                            <Ban size={14} color="#ef4444" /> {nonExportable.length} lô không thể xuất (HSD ≤ 5 ngày hoặc đã hết hạn)
                                                        </span>
                                                        <span style={{ color: 'var(--color-text-secondary)', opacity: .7 }}>
                                                            Tổng lô xuất được: {exportable.length} / {whBatches.length}
                                                        </span>
                                                    </div>
                                                )}

                                                <div className="inventory-table-container">
                                                    <table className="inventory-table">
                                                        <thead><tr>
                                                            {['Nguyên liệu', 'Đơn vị', 'Còn lại', 'Nhập ban đầu', 'Ngày nhập', 'Hạn sử dụng', 'Trạng thái HSD', 'Xuất kho'].map(h =>
                                                                <th key={h} style={{ color: 'var(--color-text-secondary)', fontWeight: 'bold' }}>{h}</th>
                                                            )}
                                                        </tr></thead>
                                                        <tbody>
                                                            {[...whBatches]
                                                                .filter(batch => {
                                                                    if (whStockSearch && !batch.ingredient?.name?.toLowerCase().includes(whStockSearch.toLowerCase())) return false;
                                                                    const d = calcDays(batch.expiryDate);
                                                                    if (whBatchHsdFilter === 'all') return true;
                                                                    if (whBatchHsdFilter === 'usable') return d !== null && d > 5;
                                                                    if (whBatchHsdFilter === 'nearExpiry') return d !== null && d >= 0 && d <= 7;
                                                                    if (whBatchHsdFilter === 'expired') return d !== null && d < 0;
                                                                    return true;
                                                                })
                                                                .sort((a, b) => new Date(a.expiryDate || '9999') - new Date(b.expiryDate || '9999'))
                                                                .map(batch => {
                                                                    const d = calcDays(batch.expiryDate);
                                                                    const blocked = d !== null && d <= 5;
                                                                    return (
                                                                        <tr key={batch.id} style={{
                                                                            ...batchRowStyle(d),
                                                                            // làm mờ hàng bị chặn
                                                                            opacity: blocked ? 0.7 : 1,
                                                                        }}>
                                                                            <td className="ingredient-name">{batch.ingredient?.name || 'N/A'}</td>
                                                                            <td className="ingredient-unit">{batch.ingredient?.unit || '—'}</td>
                                                                            <td className={qtyClass(batch.remainingQuantity ?? 0)} style={{ color: 'var(--color-text-secondary)' }}>
                                                                                {batch.remainingQuantity ?? 0}
                                                                            </td>
                                                                            <td style={{ color: 'var(--color-text-secondary)', opacity: .6 }}>
                                                                                {batch.quantity ?? 0}
                                                                            </td>
                                                                            <td style={{ color: 'var(--color-text-secondary)' }}>
                                                                                {batch.importedAt ? fmtDate(batch.importedAt) : '—'}
                                                                            </td>
                                                                            <td style={{ color: 'var(--color-text-secondary)', fontWeight: blocked ? 700 : 400 }}>
                                                                                {fmtLocalDate(batch.expiryDate)}
                                                                            </td>
                                                                            <td><ExpiryBadge date={batch.expiryDate} /></td>
                                                                            <td><ExportBadge expiryDate={batch.expiryDate} /></td>
                                                                        </tr>
                                                                    );
                                                                })}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </>
                                        );
                                    })()
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
                                    onClick={() => { setSelectedBranch(b); setWhBatchHsdFilter('all'); }}
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
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                                <h3 style={{ color: 'var(--color-text-secondary)', margin: 0 }}>
                                    Tồn kho — {selectedBranch.name}{' '}
                                    ({branchViewMode === 'aggregate'
                                        ? `${branchIngredients.length} nguyên liệu`
                                        : `${branchBatches.length} lô`})
                                </h3>
                                <ViewToggle mode={branchViewMode} setMode={setBranchViewMode} />
                            </div>

                            {/* Tổng hợp */}
                            {branchViewMode === 'aggregate' && (
                                (() => {
                                    // Tính tồn kho chỉ từ lô còn hạn (daysToExpire >= 0)
                                    const validQtyMap = {};
                                    branchBatches
                                        .filter(b => b.daysToExpire !== undefined && b.daysToExpire !== null && b.daysToExpire >= 0)
                                        .forEach(b => {
                                            const name = b.ingredientName;
                                            if (!validQtyMap[name]) {
                                                validQtyMap[name] = { qty: 0, unit: b.unit };
                                            }
                                            validQtyMap[name].qty += (b.remainingQuantity ?? 0);
                                        });

                                    const validList = Object.entries(validQtyMap)
                                        .filter(([_, v]) => v.qty > 0)
                                        .map(([name, v]) => ({ name, qty: v.qty, unit: v.unit }));

                                    return validList.length === 0
                                        ? <div className="empty-state"><Store size={40} /><p>Chưa có nguyên liệu còn hạn</p></div>
                                        : (
                                            <div className="inventory-table-container">
                                                <table className="inventory-table">
                                                    <thead><tr>
                                                        {['Nguyên liệu', 'Đơn vị', 'Tồn kho (còn hạn)', 'Trạng thái'].map(h =>
                                                            <th key={h} style={{ color: 'var(--color-text-secondary)', fontWeight: 'bold' }}>{h}</th>
                                                        )}
                                                    </tr></thead>
                                                    <tbody>
                                                        {validList.map(item => (
                                                            <tr key={item.name}>
                                                                <td className="ingredient-name">{item.name}</td>
                                                                <td className="ingredient-unit">{item.unit || '—'}</td>
                                                                <td className={qtyClass(item.qty)} style={{ color: 'var(--color-text-secondary)' }}>
                                                                    {item.qty}
                                                                </td>
                                                                <td><StockBadge qty={item.qty} /></td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        );
                                })()
                            )}
                            {branchViewMode === 'batch' && (() => {
                                const pills = [
                                    { value: 'all', label: 'Tất cả', color: '#667eea' },
                                    { value: 'usable', label: <><Check size={12} /> Xuất được</>, color: '#10b981' },
                                    { value: 'nearExpiry', label: <><Clock size={12} /> Sắp hết hạn</>, color: '#f59e0b' },
                                    { value: 'expired', label: <><AlertTriangle size={12} /> Hết hạn</>, color: '#ef4444' },
                                ];
                                return (
                                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                                        {pills.map(p => (
                                            <button key={p.value} onClick={() => setWhBatchHsdFilter(p.value)} style={{
                                                padding: '5px 14px', borderRadius: 20,
                                                border: `1.5px solid ${p.color}`,
                                                background: whBatchHsdFilter === p.value ? p.color : 'transparent',
                                                color: whBatchHsdFilter === p.value ? '#fff' : p.color,
                                                cursor: 'pointer', fontSize: 13, fontWeight: 600,
                                                transition: 'all .15s'
                                            }}>{p.label}</button>
                                        ))}
                                    </div>
                                );
                            })()}
                            {/* Theo lô */}
                            {branchViewMode === 'batch' && (

                                branchBatches.length === 0
                                    ? <div className="empty-state"><Store size={40} /><p>Không có lô nào</p></div>
                                    : (
                                        <div className="inventory-table-container">
                                            <table className="inventory-table">
                                                <thead><tr>
                                                    {['Nguyên liệu', 'Đơn vị', 'Còn lại', 'Tổng nhập', 'Ngày nhập', 'HSD', 'Trạng thái HSD'].map(h =>
                                                        <th key={h} style={{ color: 'var(--color-text-secondary)', fontWeight: 'bold' }}>{h}</th>
                                                    )}
                                                </tr></thead>
                                                <tbody>
                                                    {[...branchBatches]
                                                        .filter(batch => {
                                                            const d = batch.daysToExpire;
                                                            if (whBatchHsdFilter === 'all') return true;
                                                            if (whBatchHsdFilter === 'usable') return d !== null && d !== undefined && d > 5;
                                                            if (whBatchHsdFilter === 'nearExpiry') return d !== null && d !== undefined && d >= 5 && d <= 7;
                                                            if (whBatchHsdFilter === 'expired') return d !== null && d !== undefined && d <= 1;
                                                            return true;
                                                        })
                                                        .sort((a, b) => (a.daysToExpire ?? 9999) - (b.daysToExpire ?? 9999))
                                                        .map(batch => {
                                                            const approxExpiry = (() => {
                                                                if (batch.daysToExpire === undefined) return '—';
                                                                const d = new Date();
                                                                d.setDate(d.getDate() + batch.daysToExpire);
                                                                return d.toLocaleDateString('vi-VN');
                                                            })();
                                                            return (
                                                                <tr key={batch.id} style={batchRowStyle(batch.daysToExpire)}>
                                                                    <td className="ingredient-name">{batch.ingredientName || 'N/A'}</td>
                                                                    <td className="ingredient-unit">{batch.unit || '—'}</td>
                                                                    <td className={qtyClass(batch.remainingQuantity ?? 0)} style={{ color: 'var(--color-text-secondary)' }}>
                                                                        {batch.remainingQuantity ?? 0}
                                                                    </td>
                                                                    <td style={{ color: 'var(--color-text-secondary)', opacity: .6 }}>
                                                                        {batch.quantity ?? 0}
                                                                    </td>
                                                                    <td style={{ color: 'var(--color-text-secondary)' }}>
                                                                        {batch.createdAt ? fmtDate(batch.createdAt) : '—'}
                                                                    </td>
                                                                    <td style={{ color: 'var(--color-text-secondary)', fontWeight: (batch.nearExpired || batch.expired) ? 600 : 400 }}>
                                                                        {approxExpiry}
                                                                    </td>
                                                                    <td><ExpiryBadge daysOverride={batch.daysToExpire} /></td>
                                                                </tr>
                                                            );
                                                        })}
                                                </tbody>
                                            </table>
                                        </div>
                                    )

                            )}
                        </div>

                    )}
                </div>
            )
            }

            {/* Yêu cầu */}
            {
                tab === 'requests' && (
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
                )
            }

            {/* Lịch sử */}
            {
                tab === 'history' && (
                    <div style={{ display: 'grid', gap: 20 }}>
                        {/* Sub-tabs */}
                        <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 0 }}>
                            {[
                                { id: 'export', label: <><Upload size={13} /> Lịch sử xuất kho</> },
                                { id: 'import', label: <><Download size={13} /> Lịch sử nhập kho</> }
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
                                                {[...exportHistory]
                                                    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                                                    .map(ex => (
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
                                                {[...importHistory]
                                                    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                                                    .map(item => (
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
                )
            }

            {/* Chi tiết yêu cầu */}
            {
                selectedReq && (
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
                )
            }

            {/* Chi tiết xuất kho */}
            {
                selectedExport && exportDetail && (
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
                                        {(exportDetail.export?.status === 'RECEIVED' || exportDetail.export?.status === 'APPROVED')
                                            && exportDetail.export?.approvedBy && (
                                                <>
                                                    <div className="modal-timeline-divider" />
                                                    <div className="modal-timeline-item">
                                                        <span className="modal-timeline-item-label"><CheckCircle size={13} /> Người duyệt</span>
                                                        <span className="modal-timeline-item-value">
                                                            {exportDetail.export?.approvedBy?.fullName}
                                                        </span>
                                                    </div>
                                                </>
                                            )}
                                        {exportDetail.export?.status === 'RECEIVED' && exportDetail.export?.receivedBy && (
                                            <>
                                                <div className="modal-timeline-divider" />
                                                <div className="modal-timeline-item">
                                                    <span className="modal-timeline-item-label"><Check size={13} /> Người nhận hàng</span>
                                                    <span className="modal-timeline-item-value">
                                                        {exportDetail.export?.receivedBy?.fullName}
                                                    </span>
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
                )
            }

            {/* Từ chối */}
            {
                rejectModal && (
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
                )
            }
            {
                deletingWh && (
                    <div className="modal-overlay" onClick={() => setDeletingWh(null)}>
                        <div className="modal-content" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <h2 className="modal-title">Xác nhận xóa kho</h2>
                                <button className="modal-close" onClick={() => setDeletingWh(null)}>
                                    <X size={16} />
                                </button>
                            </div>
                            <div className="modal-body">
                                <p style={{ color: 'var(--color-text-secondary)', marginBottom: 20 }}>
                                    Bạn có chắc muốn xóa kho <strong>"{deletingWh.name}"</strong>?
                                    <br />
                                    <span style={{ color: '#ef4444', fontSize: 13 }}>
                                        Kho phải không còn hàng tồn mới xóa được.
                                    </span>
                                </p>
                                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', alignItems: 'stretch' }}>
                                    <button
                                        style={{ width: 'auto', padding: '10px 20px', borderRadius: 8 }}
                                        onClick={() => setDeletingWh(null)}
                                    >
                                        Hủy
                                    </button>
                                    <button
                                        style={{
                                            padding: '10px 20px', border: 'none', borderRadius: 8,
                                            background: '#ef4444', color: '#fff', cursor: 'pointer',
                                            fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6
                                        }}
                                        onClick={() => deleteWarehouse(deletingWh.id)}
                                    >
                                        <X size={15} /> Xác nhận xóa
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}