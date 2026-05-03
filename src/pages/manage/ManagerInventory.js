import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
    Search, RefreshCw, MapPin, X, Plus, AlertCircle, Clock,
    FileText, Beaker, TrendingDown, CheckCircle, History,
    ArrowDownToLine, ArrowUpFromLine, Package
} from 'lucide-react';
import io from 'socket.io-client';
import styles from '../../layouts/AdminLayout.module.css';

const socket = io('http://localhost:3001');

export default function ManagerInventoryManagement() {
    const [branchIngredients, setBranchIngredients] = useState([]);
    const [allIngredients, setAllIngredients] = useState([]);
    const [recipes, setRecipes] = useState([]);
    const [products, setProducts] = useState([]);
    const [inventoryRequests, setInventoryRequests] = useState([]);
    const [requestItems, setRequestItems] = useState({});
    const [inventoryHistory, setInventoryHistory] = useState([]);
    const [filteredIngredients, setFilteredIngredients] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStock, setFilterStock] = useState('all');
    const [historyFilter, setHistoryFilter] = useState('all');
    const [historySearch, setHistorySearch] = useState('');
    const [currentBranch, setCurrentBranch] = useState(null);
    const [loading, setLoading] = useState(false);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('ingredients');
    const [showRequestModal, setShowRequestModal] = useState(false);
    const [warehouses, setWarehouses] = useState([]);
    const [requestForm, setRequestForm] = useState({
        warehouseId: '', reason: '', type: 'IMPORT',
        items: [{ ingredientId: '', quantity: '' }]
    });
    const [notifications, setNotifications] = useState([]);

    const API_BASE_URL = 'http://localhost:8080';
    const user = JSON.parse(localStorage.getItem('user'));
    const POLLING_INTERVAL = 10000;
    const processedResponses = useRef(new Set());

    // Notification system
    const addNotification = (notification) => {
        const id = Date.now() + Math.random();
        setNotifications(prev => [...prev, { ...notification, id }]);
        setTimeout(() => removeNotification(id), 8000);
    };

    const removeNotification = (id) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    // Socket connection
    useEffect(() => {
        if (!currentBranch?.id) return;

        socket.emit('register-role', {
            role: 'manager',
            userId: user?.id,
            branchId: currentBranch.id
        });

        socket.on('inventory-request-status-changed', (data) => {
            const responseKey = `${data.requestId}-${data.status}`;
            if (processedResponses.current.has(responseKey)) return;
            processedResponses.current.add(responseKey);

            if (data.status === 'APPROVED') {
                addNotification({
                    type: 'success',
                    title: 'Yêu cầu nhập kho đã được duyệt!',
                    message: `Yêu cầu #${data.requestId} đã được Admin phê duyệt. ${data.items?.length || 0} nguyên liệu đã được thêm vào kho.`,
                    onClick: () => setActiveTab('requests')
                });
                fetchInventoryRequests();
                fetchBranchIngredients();
                if (activeTab === 'history') fetchInventoryHistory();
            } else if (data.status === 'REJECTED') {
                addNotification({
                    type: 'error',
                    title: 'Yêu cầu nhập kho bị từ chối',
                    message: `Yêu cầu #${data.requestId} đã bị từ chối. Lý do: ${data.note || 'Không có lý do'}`,
                    onClick: () => setActiveTab('requests')
                });
                fetchInventoryRequests();
            }
        });

        socket.on('inventory-updated', (data) => {
            if (data.branchId === currentBranch?.id) {
                fetchBranchIngredients();
            }
        });

        return () => {
            socket.off('inventory-request-status-changed');
            socket.off('inventory-updated');
        };
    }, [currentBranch?.id, user?.id]);

    const fetchAllIngredients = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/ingredients`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!response.ok) throw new Error();
            const data = await response.json();
            setAllIngredients(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Lỗi khi tải danh sách nguyên liệu:', error);
        }
    };

    const fetchCurrentBranch = async () => {
        try {
            const token = localStorage.getItem('token');
            const userStr = localStorage.getItem('user');
            const user = userStr ? JSON.parse(userStr) : null;
            let branchId = user?.branch?.id || user?.branchId;

            if (!branchId) {
                const userRes = await fetch(`${API_BASE_URL}/api/auth/me`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (userRes.ok) {
                    const userData = await userRes.json();
                    branchId = userData.branch?.id;
                }
            }

            if (branchId) {
                const branchRes = await fetch(`${API_BASE_URL}/api/branches/${branchId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (branchRes.ok) {
                    const branchData = await branchRes.json();
                    setCurrentBranch(branchData);
                }
            }
        } catch (error) {
            console.error('Lỗi khi lấy thông tin chi nhánh:', error);
        }
    };

    const fetchWarehouses = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/api/warehouses`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) setWarehouses(await res.json());
            const data = await res.json();
            setWarehouses(Array.isArray(data) ? data : []);
        } catch (e) { console.error('Lỗi khi tải kho tổng:', e); }
    };

    const fetchBranchIngredients = useCallback(async () => {
        if (!currentBranch?.id) return;
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(
                `${API_BASE_URL}/api/branch-ingredients/branch/${currentBranch.id}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (!response.ok) throw new Error();
            const data = await response.json();
            setBranchIngredients(Array.isArray(data) ? data : []);
            setFilteredIngredients(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Lỗi khi tải nguyên liệu:', error);
        }
    }, [currentBranch?.id]);

    const fetchInventoryRequests = useCallback(async () => {
        if (!currentBranch?.id) return;
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(
                `${API_BASE_URL}/api/inventory-requests/branch/${currentBranch.id}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (!response.ok) throw new Error();
            const data = await response.json();
            setInventoryRequests(Array.isArray(data) ? data : []);
            const itemsMap = {};
            for (const request of data) {
                try {
                    const itemsResponse = await fetch(
                        `${API_BASE_URL}/api/inventory-request-items/request/${request.id}`,
                        { headers: { Authorization: `Bearer ${token}` } }
                    );
                    if (itemsResponse.ok) {
                        itemsMap[request.id] = await itemsResponse.json();
                    }
                } catch {
                    itemsMap[request.id] = [];
                }
            }
            setRequestItems(itemsMap);
        } catch (error) {
            console.error('Lỗi khi tải yêu cầu kho:', error);
        }
    }, [currentBranch?.id]);

    const fetchInventoryHistory = useCallback(async () => {
        if (!currentBranch?.id) return;
        setHistoryLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(
                `${API_BASE_URL}/api/branch-inventory/history/${currentBranch.id}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (!response.ok) throw new Error();
            const data = await response.json();
            setInventoryHistory(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Lỗi khi tải lịch sử kho:', error);
        } finally {
            setHistoryLoading(false);
        }
    }, [currentBranch?.id]);

    useEffect(() => {
        fetchCurrentBranch();
        fetchAllIngredients();
        fetchWarehouses();
    }, []);

    useEffect(() => {
        if (currentBranch) {
            fetchBranchIngredients();
            fetchRecipes();
            fetchProducts();
            fetchInventoryRequests();
        }
    }, [currentBranch, fetchBranchIngredients, fetchInventoryRequests]);

    useEffect(() => {
        if (activeTab === 'history' && currentBranch?.id) {
            fetchInventoryHistory();
        }
    }, [activeTab, currentBranch?.id]);

    useEffect(() => {
        if (!currentBranch?.id) return;
        const intervalId = setInterval(() => {
            if (!showRequestModal) {
                fetchInventoryRequests();
                fetchBranchIngredients();
            }
        }, POLLING_INTERVAL);
        return () => clearInterval(intervalId);
    }, [currentBranch?.id, showRequestModal, fetchInventoryRequests, fetchBranchIngredients]);

    useEffect(() => {
        let filtered = branchIngredients;
        if (filterStock === 'low') filtered = filtered.filter(bi => bi.quantity < 10 && bi.quantity > 0);
        else if (filterStock === 'out') filtered = filtered.filter(bi => bi.quantity === 0);
        if (searchTerm) {
            filtered = filtered.filter(bi =>
                bi.ingredient?.name?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        setFilteredIngredients(filtered);
    }, [branchIngredients, filterStock, searchTerm]);

    const fetchRecipes = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/recipes`, { headers: { Authorization: `Bearer ${token}` } });
            if (!response.ok) throw new Error();
            setRecipes(await response.json());
        } catch { }
    };

    const addFormItem = () =>
        setRequestForm(f => ({ ...f, items: [...f.items, { ingredientId: '', quantity: '' }] }));

    const removeFormItem = (index) =>
        setRequestForm(f => ({ ...f, items: f.items.filter((_, i) => i !== index) }));

    const updateFormItem = (index, field, value) =>
        setRequestForm(f => ({
            ...f,
            items: f.items.map((item, i) => i === index ? { ...item, [field]: value } : item)
        }));

    const fetchProducts = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/foods`, { headers: { Authorization: `Bearer ${token}` } });
            if (!response.ok) throw new Error();
            setProducts(await response.json());
        } catch { }
    };

    const confirmReceived = async (requestId) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(
                `${API_BASE_URL}/api/inventory-requests/${requestId}/confirm-received`,
                { method: 'PUT', headers: { Authorization: `Bearer ${token}` } }
            );
            if (!response.ok) throw new Error();

            addNotification({
                type: 'success',
                title: 'Xác nhận thành công',
                message: 'Đã xác nhận nhận hàng. Kho chi nhánh đã được cập nhật.'
            });
            fetchInventoryRequests();
            fetchBranchIngredients();
        } catch {
            addNotification({ type: 'error', title: 'Lỗi', message: 'Không thể xác nhận. Vui lòng thử lại.' });
        }
    };

    const createInventoryRequest = async () => {
        if (!requestForm.warehouseId)
            return addNotification({ type: 'warning', title: ' Chú ý', message: 'Vui lòng chọn kho tổng' });
        if (!requestForm.reason.trim())
            return addNotification({ type: 'warning', title: ' Chú ý', message: 'Vui lòng nhập lý do yêu cầu' });

        const validItems = requestForm.items.filter(
            i => i.ingredientId && Number(i.quantity) > 0
        );
        if (validItems.length === 0)
            return addNotification({ type: 'warning', title: ' Chú ý', message: 'Cần ít nhất 1 nguyên liệu với số lượng hợp lệ' });

        try {
            const token = localStorage.getItem('token');

            const dto = {
                branchId: currentBranch.id,
                warehouseId: Number(requestForm.warehouseId),
                type: requestForm.type,
                reason: requestForm.reason,
                items: validItems.map(i => ({
                    ingredientId: Number(i.ingredientId),
                    quantity: Number(i.quantity)
                }))
            };

            const response = await fetch(`${API_BASE_URL}/api/inventory-requests`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(dto)
            });

            if (!response.ok) {
                const err = await response.text();
                throw new Error(err);
            }

            const createdRequest = await response.json();

            // Emit socket thông báo admin
            const firstItem = validItems[0];
            const ingredient = allIngredients.find(i => i.id === Number(firstItem.ingredientId));
            socket.emit('inventory-request-created', {
                requestId: createdRequest.id,
                branchId: currentBranch.id,
                branchName: currentBranch.name,
                ingredientName: validItems.length === 1 ? (ingredient?.name || 'N/A') : `${validItems.length} nguyên liệu`,
                quantity: validItems.reduce((s, i) => s + Number(i.quantity), 0),
                reason: requestForm.reason,
                requestedBy: user?.fullName || user?.username
            });

            addNotification({
                type: 'success', title: 'Thành công',
                message: 'Đã gửi yêu cầu đến Admin! Chờ phê duyệt.',
                onClick: () => setActiveTab('requests')
            });

            setShowRequestModal(false);
            setRequestForm({ warehouseId: '', reason: '', type: 'IMPORT', items: [{ ingredientId: '', quantity: '' }] });
            await fetchInventoryRequests();
        } catch (e) {
            console.error(e);
            addNotification({ type: 'error', title: 'Lỗi', message: 'Không thể tạo yêu cầu. Vui lòng thử lại.' });
        }
    };

    const getStockStatus = (quantity) => {
        if (quantity === 0) return { text: 'Hết hàng', class: styles.badgeDanger, color: '#EF4444' };
        if (quantity < 10) return { text: 'Sắp hết', class: styles.badgeWarning, color: '#F59E0B' };
        return { text: 'Còn đủ', class: styles.badgeSuccess, color: '#10B981' };
    };

    const getRequestStatusBadge = (status) => {
        const statusMap = {
            'PENDING': { text: 'Chờ duyệt', class: styles.badgeWarning, icon: Clock },
            'APPROVED': { text: 'Đã duyệt, chờ nhận hàng', class: styles.badgeSuccess, icon: CheckCircle },
            'RECEIVED': { text: 'Đã nhận hàng', class: styles.badgeSuccess, icon: CheckCircle },
            'REJECTED': { text: 'Từ chối', class: styles.badgeDanger, icon: X }
        };
        return statusMap[status] || { text: status, class: styles.badgeInactive, icon: AlertCircle };
    };

    const getHistoryTypeInfo = (type) => {
        const typeMap = {
            'IMPORT': { text: 'Nhập từ kho tổng', icon: ArrowDownToLine, color: '#10B981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.2)' },
            'EXPORT': { text: 'Xuất nội bộ', icon: ArrowUpFromLine, color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)' },
            'SALE': { text: 'Xuất bán hàng', icon: Package, color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)', border: 'rgba(139,92,246,0.2)' },
        };
        return typeMap[type] || { text: type, icon: History, color: '#9CA3AF', bg: 'rgba(156,163,175,0.1)', border: 'rgba(156,163,175,0.2)' };
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Intl.DateTimeFormat('vi-VN', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        }).format(new Date(dateString));
    };

    const getCurrentStock = (ingredientId) => {
        const branchIng = branchIngredients.find(bi => bi.ingredient?.id === parseInt(ingredientId));
        return branchIng ? branchIng.quantity : 0;
    };

    const getRequestItems = (requestId) => requestItems[requestId] || [];

    const getFilteredHistory = () => {
        let filtered = inventoryHistory;
        if (historyFilter !== 'all') filtered = filtered.filter(h => h.type === historyFilter);
        if (historySearch) {
            filtered = filtered.filter(h =>
                h.ingredientName?.toLowerCase().includes(historySearch.toLowerCase()) ||
                h.createdBy?.toLowerCase().includes(historySearch.toLowerCase())
            );
        }
        return filtered;
    };

    const stats = {
        totalIngredients: branchIngredients.length,
        lowStock: branchIngredients.filter(bi => bi.quantity < 10 && bi.quantity > 0).length,
        outOfStock: branchIngredients.filter(bi => bi.quantity === 0).length,
        pendingRequests: inventoryRequests.filter(r => r.status === 'PENDING').length
    };

    const tabConfig = [
        { key: 'ingredients', label: 'Tồn kho', icon: Beaker },
        { key: 'requests', label: 'Yêu cầu nhập kho', icon: FileText, badge: stats.pendingRequests },
        { key: 'history', label: 'Lịch sử kho', icon: History }
    ];

    return (
        <div className={styles.pageContainer}>
            {/* Notification Toast */}
            <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '400px' }}>
                {notifications.map((notif) => (
                    <div
                        key={notif.id}
                        onClick={() => { if (notif.onClick) notif.onClick(); removeNotification(notif.id); }}
                        style={{
                            background: notif.type === 'success' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                                : notif.type === 'warning' ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                                    : notif.type === 'error' ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                                        : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            color: 'white', padding: '16px', borderRadius: '12px',
                            boxShadow: '0 8px 16px rgba(0,0,0,0.3)', cursor: notif.onClick ? 'pointer' : 'default',
                            animation: 'slideInRight 0.3s ease-out', display: 'flex', flexDirection: 'column', gap: '4px'
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                            <div style={{ flex: 1 }}>
                                <strong style={{ fontSize: '15px', display: 'block', marginBottom: '4px' }}>{notif.title}</strong>
                                <span style={{ fontSize: '13px', opacity: 0.9 }}>{notif.message}</span>
                                {notif.onClick && <span style={{ fontSize: '12px', opacity: 0.7, marginTop: '4px', display: 'block' }}>👉 Click để xem chi tiết</span>}
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); removeNotification(notif.id); }}
                                style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                                <X size={14} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Header */}
            <div className={styles.headerCard}>
                <div className={styles.headerTop}>
                    <div>
                        <h2 className={styles.pageTitle}>Quản lý Kho Chi nhánh</h2>
                        {currentBranch && (
                            <p className={styles.branchInfo}>
                                <MapPin size={16} />
                                <span className={styles.branchName}>{currentBranch.name}</span>
                                {currentBranch.address && <span className={styles.branchAddress}>• {currentBranch.address}</span>}
                            </p>
                        )}
                    </div>
                </div>

                {/* Stats */}
                <div className={styles.statsGrid}>
                    <div className={styles.statCardPrimary}>
                        <div className={styles.statIcon}><Beaker size={24} /></div>
                        <div><div className={styles.statValue}>{stats.totalIngredients}</div><div className={styles.statLabel}>Tổng nguyên liệu</div></div>
                    </div>
                    <div className={styles.statCardPrimary}>
                        <div className={styles.statIcon}><TrendingDown size={24} /></div>
                        <div><div className={styles.statValue}>{stats.lowStock}</div><div className={styles.statLabel}>Sắp hết</div></div>
                    </div>
                    <div className={styles.statCardDanger}>
                        <div className={styles.statIcon}><AlertCircle size={24} /></div>
                        <div><div className={styles.statValue}>{stats.outOfStock}</div><div className={styles.statLabel}>Hết hàng</div></div>
                    </div>
                    <div className={styles.statCardPrimary}>
                        <div className={styles.statIcon}><Clock size={24} /></div>
                        <div><div className={styles.statValue}>{stats.pendingRequests}</div><div className={styles.statLabel}>Yêu cầu chờ duyệt</div></div>
                    </div>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: '4px', marginTop: '24px', borderBottom: '1px solid var(--color-border)', paddingBottom: '0' }}>
                    {tabConfig.map(({ key, label, icon: Icon, badge }) => (
                        <button
                            key={key}
                            onClick={() => setActiveTab(key)}
                            style={{
                                padding: '12px 24px',
                                background: activeTab === key ? 'rgba(139, 92, 246, 0.1)' : 'transparent',
                                color: activeTab === key ? '#8B5CF6' : 'var(--color-text-secondary)',
                                border: 'none',
                                borderBottom: activeTab === key ? '2px solid #8B5CF6' : '2px solid transparent',
                                cursor: 'pointer', fontWeight: '600', fontSize: '14px',
                                display: 'flex', alignItems: 'center', gap: '8px',
                                transition: 'all 0.2s', position: 'relative'
                            }}
                        >
                            <Icon size={18} />
                            {label}
                            {badge > 0 && (
                                <span style={{
                                    background: '#EF4444', color: 'white', borderRadius: '10px',
                                    padding: '2px 6px', fontSize: '11px', fontWeight: '700'
                                }}>{badge}</span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Filters for ingredients tab */}
                {activeTab === 'ingredients' && (
                    <div className={styles.filterBar} style={{ marginTop: '20px' }}>
                        <div className={styles.searchBox}>
                            <Search size={20} className={styles.searchIcon} />
                            <input type="text" placeholder="Tìm nguyên liệu..." value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)} className={styles.searchInput} />
                        </div>
                        <div className={styles.filterControls}>
                            <select value={filterStock} onChange={(e) => setFilterStock(e.target.value)}
                                className={styles.filterSelect}
                                style={{ padding: '12px 16px', background: 'rgb(243, 244, 246)', border: '1px solid var(--color-border)', borderRadius: '12px', color: 'var(--color-text-secondary)', fontSize: '14px', cursor: 'pointer', outline: 'none', minWidth: '150px' }}>
                                <option value="all">Tất cả tồn kho</option>
                                <option value="low">Sắp hết (&lt; 10)</option>
                                <option value="out">Hết hàng</option>
                            </select>
                            <button onClick={() => setShowRequestModal(true)} className={styles.actionButtonSuccess}
                                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px' }}>
                                <Plus size={18} />
                                Tạo yêu cầu nhập kho
                            </button>
                        </div>
                    </div>
                )}

                {/* Filters for history tab */}
                {activeTab === 'history' && (
                    <div className={styles.filterBar} style={{ marginTop: '20px' }}>
                        <div className={styles.searchBox}>
                            <Search size={20} className={styles.searchIcon} />
                            <input type="text" placeholder="Tìm nguyên liệu, người thực hiện..." value={historySearch}
                                onChange={(e) => setHistorySearch(e.target.value)} className={styles.searchInput} />
                        </div>
                        <div className={styles.filterControls}>
                            <select value={historyFilter} onChange={(e) => setHistoryFilter(e.target.value)}
                                style={{ padding: '12px 16px', background: 'rgb(243, 244, 246)', border: '1px solid var(--color-border)', borderRadius: '12px', color: 'var(--color-text-secondary)', fontSize: '14px', cursor: 'pointer', outline: 'none', minWidth: '170px' }}>
                                <option value="all">Tất cả giao dịch</option>
                                <option value="IMPORT">Nhập từ kho tổng</option>
                                <option value="EXPORT">Xuất nội bộ</option>
                                <option value="SALE">Xuất bán hàng</option>
                            </select>
                            <button onClick={fetchInventoryHistory} className={styles.actionButtonPrimary}
                                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: 'rgb(243, 244, 246)', color: '#B8B8B8', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
                                <RefreshCw size={18} />
                                Làm mới
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Content */}
            <div className={styles.tableCard}>

                {/* ===== TAB: TỒN KHO ===== */}
                {activeTab === 'ingredients' && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px', padding: '20px' }}>
                        {filteredIngredients.length === 0 ? (
                            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px 20px' }}>
                                <Beaker size={48} style={{ margin: '0 auto 16px', opacity: 0.3, color: '#9ca3af' }} />
                                <p style={{ color: '#9ca3af', fontSize: '16px' }}>Không có nguyên liệu nào</p>
                            </div>
                        ) : (
                            filteredIngredients.map((branchIng, index) => {
                                const stockStatus = getStockStatus(branchIng.quantity);
                                return (
                                    <div
                                        key={`bi-${branchIng.id || index}`}
                                        style={{ border: `2px solid ${stockStatus.color}30`, borderRadius: '12px', padding: '20px', backgroundColor: '#F7F0EA', transition: 'all 0.2s' }}
                                        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = stockStatus.color; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = `${stockStatus.color}30`; }}
                                    >
                                        <div style={{ width: '56px', height: '56px', background: `${stockStatus.color}20`, borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                                            <Beaker size={28} color={stockStatus.color} />
                                        </div>
                                        <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#B8B8B8', marginBottom: '8px' }}>
                                            {branchIng.ingredient?.name || 'N/A'}
                                        </h3>
                                        <p style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '16px' }}>
                                            Đơn vị: {branchIng.ingredient?.unit || 'N/A'}
                                        </p>
                                        <div style={{ border: `2px solid ${stockStatus.color}30`, padding: '12px', background: '#fff', borderRadius: '8px', marginBottom: '12px' }}>
                                            <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '4px', textTransform: 'uppercase' }}>Tồn kho</div>
                                            <div style={{ fontSize: '24px', fontWeight: '700', color: stockStatus.color }}>{branchIng.quantity}</div>
                                        </div>
                                        <span className={stockStatus.class} style={{ display: 'inline-block', width: '100%', textAlign: 'center' }}>
                                            {stockStatus.text}
                                        </span>
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}

                {/* ===== TAB: YÊU CẦU NHẬP KHO ===== */}
                {activeTab === 'requests' && (
                    <div style={{ padding: '20px' }}>
                        {/* Summary row */}
                        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
                            {[
                                { label: 'Tất cả', count: inventoryRequests.length, color: '#8B5CF6' },
                                { label: 'Chờ duyệt', count: inventoryRequests.filter(r => r.status === 'PENDING').length, color: '#F59E0B' },
                                { label: 'Đã duyệt', count: inventoryRequests.filter(r => r.status === 'APPROVED').length, color: '#10B981' },
                                { label: 'Từ chối', count: inventoryRequests.filter(r => r.status === 'REJECTED').length, color: '#EF4444' }
                            ].map(({ label, count, color }) => (
                                <div key={label} style={{ padding: '10px 18px', background: `${color}15`, border: `1px solid ${color}30`, borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '20px', fontWeight: '700', color }}>{count}</span>
                                    <span style={{ fontSize: '13px', color: '#9ca3af' }}>{label}</span>
                                </div>
                            ))}
                            <button
                                onClick={() => setShowRequestModal(true)}
                                className={styles.actionButtonSuccess}
                                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', marginLeft: 'auto' }}
                            >
                                <Plus size={18} />
                                Tạo yêu cầu mới
                            </button>
                        </div>

                        {inventoryRequests.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                                <FileText size={48} style={{ margin: '0 auto 16px', opacity: 0.3, color: '#9ca3af' }} />
                                <p style={{ color: '#9ca3af', fontSize: '16px' }}>Chưa có yêu cầu nào</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {[...inventoryRequests]
                                    .sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt))
                                    .map((request) => {
                                        const statusInfo = getRequestStatusBadge(request.status);
                                        const StatusIcon = statusInfo.icon;
                                        const items = getRequestItems(request.id);
                                        return (
                                            <div key={`request-${request.id}`}
                                                style={{ border: '1px solid var(--color-border)', borderRadius: '12px', padding: '20px', backgroundColor: '#F7F0EA', transition: 'all 0.2s' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                                                            <p style={{ fontSize: '18px', fontWeight: '700', color: '#B8B8B8' }}>Yêu cầu #{request.id}</p>
                                                            <span className={statusInfo.class} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                <StatusIcon size={16} />{statusInfo.text}
                                                            </span>
                                                            <span style={{ fontSize: '12px', color: '#9ca3af', marginLeft: 'auto' }}>
                                                                {formatDate(request.requestedAt)}
                                                            </span>
                                                        </div>

                                                        {items.length > 0 && (
                                                            <div style={{ background: '#fff', borderRadius: '8px', padding: '12px', marginBottom: '12px' }}>
                                                                <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '8px', fontWeight: '600', textTransform: 'uppercase' }}>
                                                                    Nguyên liệu yêu cầu ({items.length} loại)
                                                                </div>
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                                    {items.map((item, idx) => {
                                                                        const currentQty = getCurrentStock(item.ingredient?.id);
                                                                        return (
                                                                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#F7F0EA', border: '1px solid rgba(139, 92, 246, 0.2)', borderRadius: '6px' }}>
                                                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                                                    <span style={{ color: '#B8B8B8', fontWeight: '600', fontSize: '14px' }}>{item.ingredient?.name || 'N/A'}</span>
                                                                                    <span style={{ color: '#B8B8B8', fontSize: '12px' }}>Tồn hiện tại: {currentQty} {item.ingredient?.unit || ''}</span>
                                                                                </div>
                                                                                <span style={{ color: '#8B5CF6', fontWeight: '700', fontSize: '15px' }}>
                                                                                    +{item.quantity} {item.ingredient?.unit || ''}
                                                                                </span>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {request.reason && (
                                                    <div style={{ fontSize: '14px', color: '#B8B8B8', marginBottom: '12px', padding: '12px', background: '#fff', borderRadius: '8px', borderLeft: '3px solid #8B5CF6' }}>
                                                        <strong style={{ color: '#8B5CF6' }}>Lý do:</strong> {request.reason}
                                                    </div>
                                                )}

                                                {request.note && request.status === 'REJECTED' && (
                                                    <div style={{ fontSize: '13px', color: '#EF4444', padding: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', borderLeft: '3px solid #EF4444' }}>
                                                        <strong>Lý do từ chối:</strong> {request.note}
                                                    </div>
                                                )}

                                                {request.approvedBy && (
                                                    <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <CheckCircle size={14} color="#10B981" />
                                                        {request.status === 'REJECTED' ? 'Từ chối' : 'Duyệt'} bởi:{' '}
                                                        <strong>{request.approvedBy.fullName || request.approvedBy.username}</strong>
                                                        {request.approvedAt && ` • ${formatDate(request.approvedAt)}`}
                                                    </div>
                                                )}
                                                {/* Nút xác nhận nhận hàng */}
                                                {request.status === 'APPROVED' && (
                                                    <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                                                        <div style={{
                                                            padding: '12px', marginBottom: '12px',
                                                            background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)',
                                                            borderRadius: '8px', fontSize: '13px', color: '#F59E0B'
                                                        }}>
                                                            Admin đã duyệt và xuất hàng từ kho tổng. Vui lòng xác nhận đã nhận hàng để cập nhật tồn kho chi nhánh.
                                                        </div>
                                                        <button
                                                            onClick={() => confirmReceived(request.id)}
                                                            style={{
                                                                display: 'flex', alignItems: 'center', gap: '8px',
                                                                padding: '10px 20px', background: '#10B981', color: 'white',
                                                                border: 'none', borderRadius: '8px', cursor: 'pointer',
                                                                fontSize: '14px', fontWeight: '600'
                                                            }}
                                                        >
                                                            <CheckCircle size={18} />
                                                            Xác nhận đã nhận hàng
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                            </div>
                        )}
                    </div>
                )}

                {/* ===== TAB: LỊCH SỬ KHO ===== */}
                {activeTab === 'history' && (
                    <div style={{ padding: '20px' }}>
                        {historyLoading ? (
                            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                                <RefreshCw size={40} style={{ margin: '0 auto 16px', color: '#8B5CF6', animation: 'spin 1s linear infinite' }} />
                                <p style={{ color: '#9ca3af', fontSize: '16px' }}>Đang tải lịch sử...</p>
                            </div>
                        ) : getFilteredHistory().length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                                <History size={48} style={{ margin: '0 auto 16px', opacity: 0.3, color: '#9ca3af' }} />
                                <p style={{ color: '#9ca3af', fontSize: '16px' }}>Chưa có lịch sử giao dịch</p>
                            </div>
                        ) : (
                            <>
                                {/* Summary chips for history */}
                                <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
                                    {[
                                        { label: 'Tất cả', value: 'all', count: inventoryHistory.length, color: '#8B5CF6' },
                                        { label: 'Nhập từ kho tổng', value: 'IMPORT', count: inventoryHistory.filter(h => h.type === 'IMPORT').length, color: '#10B981' },
                                        { label: 'Xuất nội bộ', value: 'EXPORT', count: inventoryHistory.filter(h => h.type === 'EXPORT').length, color: '#F59E0B' },
                                        { label: 'Xuất bán hàng', value: 'SALE', count: inventoryHistory.filter(h => h.type === 'SALE').length, color: '#8B5CF6' }
                                    ].map(({ label, value, count, color }) => (
                                        <div key={value}
                                            onClick={() => setHistoryFilter(value)}
                                            style={{
                                                padding: '8px 16px', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s',
                                                background: historyFilter === value ? `${color}25` : `${color}10`,
                                                border: `1px solid ${historyFilter === value ? color : `${color}30`}`,
                                                display: 'flex', alignItems: 'center', gap: '8px'
                                            }}>
                                            <span style={{ fontSize: '18px', fontWeight: '700', color }}>{count}</span>
                                            <span style={{ fontSize: '13px', color: historyFilter === value ? '#e5e7eb' : '#9ca3af' }}>{label}</span>
                                        </div>
                                    ))}
                                </div>

                                {/* Timeline-style history list */}
                                <div style={{ position: 'relative' }}>
                                    {/* Timeline line */}
                                    <div style={{ position: 'absolute', left: '27px', top: '0', bottom: '0', width: '2px', background: 'rgba(139,92,246,0.2)', zIndex: 0 }} />

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {getFilteredHistory().map((record, index) => {
                                            const typeInfo = getHistoryTypeInfo(record.type);
                                            const TypeIcon = typeInfo.icon;
                                            return (
                                                <div key={`history-${record.id || index}`} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
                                                    {/* Timeline dot */}
                                                    <div style={{
                                                        width: '56px', height: '56px', flexShrink: 0,
                                                        background: typeInfo.bg, border: `2px solid ${typeInfo.border}`,
                                                        borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        boxShadow: `0 0 0 4px #1c1c1e`
                                                    }}>
                                                        <TypeIcon size={22} color={typeInfo.color} />
                                                    </div>

                                                    {/* Card */}
                                                    <div style={{
                                                        flex: 1, border: `1px solid ${typeInfo.border}`,
                                                        borderRadius: '12px', padding: '16px', backgroundColor: '#2c2c2e',
                                                        borderLeft: `3px solid ${typeInfo.color}`
                                                    }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                                <span style={{ fontSize: '15px', fontWeight: '700', color: '#e5e7eb' }}>
                                                                    {record.ingredientName || 'Nhiều nguyên liệu'}
                                                                </span>
                                                                <span style={{ padding: '3px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', background: typeInfo.bg, color: typeInfo.color, border: `1px solid ${typeInfo.border}` }}>
                                                                    {typeInfo.text}
                                                                </span>
                                                            </div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#9ca3af', fontSize: '12px' }}>
                                                                <Clock size={13} />
                                                                {formatDate(record.createdAt)}
                                                            </div>
                                                        </div>

                                                        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                                                            {record.quantity !== undefined && (
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                    <span style={{ fontSize: '12px', color: '#9ca3af' }}>Số lượng:</span>
                                                                    <span style={{ fontSize: '15px', fontWeight: '700', color: typeInfo.color }}>
                                                                        {record.type === 'IMPORT' ? '+' : '-'}{record.quantity} {record.unit || ''}
                                                                    </span>
                                                                </div>
                                                            )}
                                                            {record.createdBy && (
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                    <span style={{ fontSize: '12px', color: '#9ca3af' }}>Thực hiện bởi:</span>
                                                                    <span style={{ fontSize: '13px', color: '#e5e7eb', fontWeight: '500' }}>{record.createdBy}</span>
                                                                </div>
                                                            )}
                                                            {record.requestId && (
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                    <span style={{ fontSize: '12px', color: '#9ca3af' }}>Phiếu yêu cầu:</span>
                                                                    <span style={{ fontSize: '13px', color: '#8B5CF6', fontWeight: '500' }}>#{record.requestId}</span>
                                                                </div>
                                                            )}
                                                            {record.warehouseName && (
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                    <span style={{ fontSize: '12px', color: '#9ca3af' }}>Kho tổng:</span>
                                                                    <span style={{ fontSize: '13px', color: '#e5e7eb', fontWeight: '500' }}>{record.warehouseName}</span>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {record.note && (
                                                            <div style={{ marginTop: '10px', padding: '8px 12px', background: '#1c1c1e', borderRadius: '6px', fontSize: '13px', color: '#9ca3af' }}>
                                                                <strong style={{ color: '#e5e7eb' }}>Ghi chú:</strong> {record.note}
                                                            </div>
                                                        )}

                                                        {/* Items detail if multiple */}
                                                        {record.items && record.items.length > 0 && (
                                                            <div style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                                                {record.items.map((item, i) => (
                                                                    <span key={i} style={{ padding: '4px 10px', background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: '6px', fontSize: '12px', color: '#8B5CF6' }}>
                                                                        {item.ingredientName}: {record.type === 'IMPORT' ? '+' : '-'}{item.quantity} {item.unit || ''}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Create Request Modal */}
            {showRequestModal && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <div className={styles.modalHeader}>
                            <div>
                                <h2 className={styles.modalTitle}>Tạo yêu cầu nhập kho</h2>
                                <p className={styles.modalSubtitle}>Chọn nguyên liệu cần nhập từ kho tổng</p>
                            </div>
                            <button onClick={() => {
                                setShowRequestModal(false);
                                setRequestForm({ warehouseId: '', reason: '', type: 'IMPORT', items: [{ ingredientId: '', quantity: '' }] });
                            }} className={styles.modalCloseButton}>
                                <X size={24} />
                            </button>
                        </div>

                        <div className={styles.modalBody}>

                            {/* Chọn kho tổng */}
                            <div style={{ marginBottom: '20px' }}>
                                <label className={styles.infoLabel} style={{ display: 'block', marginBottom: '8px' }}>Kho tổng *</label>
                                <select
                                    value={requestForm.warehouseId}
                                    onChange={(e) => setRequestForm({ ...requestForm, warehouseId: e.target.value })}
                                    className={styles.searchInput1} style={{ width: '100%' }}>
                                    <option value="">-- Chọn kho tổng --</option>
                                    {warehouses.map(w => (
                                        <option key={w.id} value={w.id}>{w.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Danh sách nguyên liệu (multi-item) */}
                            <div style={{ marginBottom: '20px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <label className={styles.infoLabel}>Nguyên liệu *</label>
                                    <button onClick={addFormItem} style={{ fontSize: '13px', color: '#8B5CF6', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <Plus size={14} /> Thêm nguyên liệu
                                    </button>
                                </div>
                                {requestForm.items.map((item, index) => (
                                    <div key={index} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                                        <select
                                            value={item.ingredientId}
                                            onChange={(e) => updateFormItem(index, 'ingredientId', e.target.value)}
                                            className={styles.searchInput1} style={{ flex: 2 }}>
                                            <option value="">-- Chọn nguyên liệu --</option>
                                            {allIngredients.map(ing => (
                                                <option key={ing.id} value={ing.id}>
                                                    {ing.name} ({ing.unit}) — Tồn: {getCurrentStock(ing.id)}
                                                </option>
                                            ))}
                                        </select>
                                        <input
                                            type="number" min="0.01" step="0.01"
                                            placeholder="Số lượng"
                                            value={item.quantity}
                                            onChange={(e) => updateFormItem(index, 'quantity', e.target.value)}
                                            className={styles.searchInput1} style={{ flex: 1 }} />
                                        {requestForm.items.length > 1 && (
                                            <button onClick={() => removeFormItem(index)}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', padding: '4px' }}>
                                                <X size={18} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {requestForm.ingredientId && (
                                <div style={{ marginBottom: '20px', padding: '12px', background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: '8px' }}>
                                    <div style={{ fontSize: '13px', color: '#9ca3af' }}>Tồn kho hiện tại</div>
                                    <div style={{ fontSize: '22px', fontWeight: '700', color: '#8B5CF6' }}>
                                        {getCurrentStock(requestForm.ingredientId)} {allIngredients.find(i => i.id === parseInt(requestForm.ingredientId))?.unit || ''}
                                    </div>
                                </div>
                            )}

                            {/* Lý do */}
                            <div style={{ marginBottom: '20px' }}>
                                <label className={styles.infoLabel} style={{ display: 'block', marginBottom: '8px' }}>Lý do yêu cầu *</label>
                                <textarea
                                    value={requestForm.reason}
                                    onChange={(e) => setRequestForm({ ...requestForm, reason: e.target.value })}
                                    className={styles.searchInput1} placeholder="Nhập lý do yêu cầu nhập kho..."
                                    rows="3" style={{ width: '100%', resize: 'vertical' }} />
                            </div>

                            <div className={styles.modalActions}>
                                <button onClick={() => { setShowRequestModal(false); setRequestForm({ warehouseId: '', reason: '', type: 'IMPORT', items: [{ ingredientId: '', quantity: '' }] }); }}
                                    className={styles.buttonDanger}><X size={20} /> Hủy</button>
                                <button onClick={createInventoryRequest} className={styles.buttonSuccess}>
                                    <Plus size={20} /> Gửi yêu cầu</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {loading && (
                <div className={styles.loadingOverlay}>
                    <div className={styles.loadingModal}>
                        <RefreshCw size={48} className={styles.spinIcon} />
                        <p>Đang tải dữ liệu...</p>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
                @keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                .pulse-dot { width: 6px; height: 6px; border-radius: 50%; background-color: #10B981; animation: pulse 2s infinite; }
            `}</style>
        </div>
    );
}