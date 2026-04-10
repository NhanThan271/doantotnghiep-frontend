import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
    Package,
    Clock,
    CheckCircle,
    XCircle,
    Search,
    Check,
    X,
    MapPin,
    Calendar,
    User,
    FileText,
    ArrowUpCircle,
    ArrowDownCircle,
    History,
    TrendingUp,
    AlertTriangle,
    ChevronRight
} from 'lucide-react';
import './InventoryManegement.css';
import io from 'socket.io-client';

const socket = io('http://localhost:3001');

export default function InventoryManagement() {
    const [activeTab, setActiveTab] = useState('overview');
    const [branches, setBranches] = useState([]);
    const [products, setProducts] = useState([]);
    const [ingredients, setIngredients] = useState([]);
    const [branchIngredients, setBranchIngredients] = useState([]);
    const [inventoryRequests, setInventoryRequests] = useState([]);
    const [requestItems, setRequestItems] = useState({});
    const [selectedBranch, setSelectedBranch] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterType, setFilterType] = useState('all');
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [loading, setLoading] = useState(false);
    const [rejectionNote, setRejectionNote] = useState('');
    const [showRejectModal, setShowRejectModal] = useState(null);
    const [notifications, setNotifications] = useState([]);

    const API_BASE_URL = 'http://localhost:8080';
    const user = JSON.parse(localStorage.getItem('user'));

    const processedRequests = useRef(new Set());

    // Socket connection
    useEffect(() => {
        console.log('🔌 Admin connecting to socket server...');

        // ĐĂNG KÝ ROLE ADMIN
        socket.emit('register-role', {
            role: 'admin',
            userId: user?.id
        });

        // ===== LẮNG NGHE YÊU CẦU MỚI TỪ MANAGER =====
        socket.on('new-inventory-request', (data) => {
            const requestKey = `${data.requestId}-${data.branchId}`;

            // Kiểm tra đã xử lý chưa
            if (processedRequests.current.has(requestKey)) {
                console.log('⏭️ Bỏ qua yêu cầu đã xử lý:', requestKey);
                return;
            }

            // Đánh dấu đã xử lý
            processedRequests.current.add(requestKey);
            addNotification({
                type: 'info',
                title: `📦 Đã nhận được yêu cầu nhập kho mới!`,
                message: `Chi nhánh ${data.branchName} yêu cầu nhập ${data.ingredientName} - Số lượng: ${data.quantity} ${data.unit}`,
                onClick: () => {
                    setActiveTab('requests');
                    setFilterStatus('PENDING');
                }
            });

            fetchInventoryRequests();
        });

        socket.on('inventory-updated', (data) => {
            fetchInventoryRequests();
            if (selectedBranch) {
                fetchBranchIngredients(selectedBranch.id);
            }
        });

        return () => {
            socket.off('new-inventory-request');
            socket.off('inventory-updated');
        };
    }, [selectedBranch, user?.id]);

    // Notification system
    const addNotification = (notification) => {
        const id = Date.now() + Math.random();
        setNotifications(prev => [...prev, { ...notification, id }]);

        // Auto remove after 8 seconds
        setTimeout(() => {
            removeNotification(id);
        }, 8000);
    };

    const removeNotification = (id) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    const POLLING_INTERVAL = 10000;

    useEffect(() => {
        fetchBranches();
        fetchProducts();
        fetchIngredients();
        fetchInventoryRequests();
    }, []);

    useEffect(() => {
        if (selectedBranch) {
            fetchBranchIngredients(selectedBranch.id);
        }
    }, [selectedBranch]);

    useEffect(() => {
        const intervalId = setInterval(() => {
            if (!selectedRequest && !showRejectModal) {
                fetchInventoryRequests();
                if (selectedBranch) {
                    fetchBranchIngredients(selectedBranch.id);
                }
            }
        }, POLLING_INTERVAL);

        return () => clearInterval(intervalId);
    }, [selectedBranch, selectedRequest, showRejectModal]);

    const fetchBranches = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/branches`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            setBranches(data);
            if (data.length > 0) setSelectedBranch(data[0]);
        } catch (error) {
            console.error('Error fetching branches:', error);
        }
    };

    const fetchProducts = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/foods`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            setProducts(data);
        } catch (error) {
            console.error('Error fetching products:', error);
        }
    };

    const fetchIngredients = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/ingredients`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            setIngredients(data);
        } catch (error) {
            console.error('Error fetching ingredients:', error);
        }
    };

    const fetchBranchIngredients = async (branchId) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/branch-ingredients/branch/${branchId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            setBranchIngredients(data);
        } catch (error) {
            console.error('Error fetching branch ingredients:', error);
            setBranchIngredients([]);
        }
    };

    const fetchInventoryRequests = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/inventory-requests`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch inventory requests');
            }

            const data = await response.json();
            setInventoryRequests(data);

            const itemsMap = {};
            for (const request of data) {
                try {
                    const itemsResponse = await fetch(
                        `${API_BASE_URL}/api/inventory-request-items/request/${request.id}`,
                        { headers: { Authorization: `Bearer ${token}` } }
                    );
                    if (itemsResponse.ok) {
                        const items = await itemsResponse.json();
                        itemsMap[request.id] = items;
                    }
                } catch (error) {
                    console.error(`Error fetching items for request ${request.id}:`, error);
                    itemsMap[request.id] = [];
                }
            }
            setRequestItems(itemsMap);
        } catch (error) {
            console.error('Error fetching inventory requests:', error);
            setInventoryRequests([]);
        }
    }, []);

    const approveRequest = async (requestId) => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const request = inventoryRequests.find(r => r.id === requestId);
            const items = getRequestItems(requestId);

            await fetch(`${API_BASE_URL}/api/inventory-requests/${requestId}/approve`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                }
            });

            // ===== GỬI THÔNG BÁO SOCKET ĐẾN MANAGER =====
            socket.emit('inventory-request-approved', {
                requestId,
                branchId: request?.branch?.id,
                branchName: request?.branch?.name,
                items: items.map(item => ({
                    ingredientId: item.ingredient?.id,
                    ingredientName: item.ingredient?.name,
                    quantity: item.quantity,
                    unit: item.ingredient?.unit
                })),
                approvedBy: user?.fullName || user?.username
            });

            // Thông báo thành công
            addNotification({
                type: 'success',
                title: `Đã duyệt yêu cầu #${requestId}`,
                message: `Chi nhánh: ${request?.branch?.name} - ${items.length} nguyên liệu`
            });

            await fetchInventoryRequests();
            if (selectedBranch) {
                await fetchBranchIngredients(selectedBranch.id);
            }
            setSelectedRequest(null);
        } catch (error) {
            console.error('Error approving request:', error);
            addNotification({
                type: 'error',
                title: 'Lỗi',
                message: 'Không thể duyệt yêu cầu'
            });
        } finally {
            setLoading(false);
        }
    };

    const rejectRequest = async (requestId, note) => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const request = inventoryRequests.find(r => r.id === requestId);

            await fetch(`${API_BASE_URL}/api/inventory-requests/${requestId}/reject`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(note)
            });

            // ===== GỬI THÔNG BÁO SOCKET ĐẾN MANAGER =====
            socket.emit('inventory-request-rejected', {
                requestId,
                branchId: request?.branch?.id,
                branchName: request?.branch?.name,
                note,
                rejectedBy: user?.fullName || user?.username
            });

            // Thông báo thành công
            addNotification({
                type: 'warning',
                title: `Đã từ chối yêu cầu #${requestId}`,
                message: `Chi nhánh: ${request?.branch?.name}`
            });

            await fetchInventoryRequests();
            setSelectedRequest(null);
            setShowRejectModal(null);
            setRejectionNote('');
        } catch (error) {
            console.error('Error rejecting request:', error);
            addNotification({
                type: 'error',
                title: 'Lỗi',
                message: 'Không thể từ chối yêu cầu'
            });
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status) => {
        const config = {
            PENDING: { class: 'status-pending', icon: Clock, text: 'Chờ duyệt' },
            APPROVED: { class: 'status-approved', icon: CheckCircle, text: 'Đã duyệt' },
            REJECTED: { class: 'status-rejected', icon: XCircle, text: 'Từ chối' }
        };
        const { class: className, icon: Icon, text } = config[status];

        return (
            <div className={`badge ${className}`}>
                <Icon size={16} />
                {text}
            </div>
        );
    };

    const getTypeBadge = (type) => {
        const isImport = type === 'IMPORT';
        return (
            <div className={`badge ${isImport ? 'type-import' : 'type-export'}`}>
                {isImport ? <ArrowDownCircle size={16} /> : <ArrowUpCircle size={16} />}
                {isImport ? 'Nhập kho' : 'Xuất kho'}
            </div>
        );
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleString('vi-VN');
    };

    const getStockStatus = (quantity) => {
        if (quantity === 0) return 'out-of-stock';
        if (quantity < 10) return 'low-stock';
        return '';
    };

    const getRequestItems = (requestId) => {
        return requestItems[requestId] || [];
    };

    const getRequestFirstIngredient = (requestId) => {
        const items = getRequestItems(requestId);
        return items.length > 0 ? items[0] : null;
    };

    const filteredRequests = inventoryRequests.filter(req => {
        const items = getRequestItems(req.id);
        const ingredientNames = items.map(item => item.ingredient?.name?.toLowerCase() || '').join(' ');
        const branchName = req.branch?.name?.toLowerCase() || '';
        const keyword = searchTerm.toLowerCase();

        const matchesSearch =
            ingredientNames.includes(keyword) ||
            branchName.includes(keyword);

        const matchesStatus =
            filterStatus === 'all' || req.status === filterStatus;

        const matchesType =
            filterType === 'all' || req.type === filterType;

        return matchesSearch && matchesStatus && matchesType;
    });

    const stats = {
        pending: inventoryRequests.filter(r => r.status === 'PENDING').length,
        approved: inventoryRequests.filter(r => r.status === 'APPROVED').length,
        rejected: inventoryRequests.filter(r => r.status === 'REJECTED').length,
        total: inventoryRequests.length
    };

    return (
        <div className="inventory-container">
            {/* Notification Toast Container */}
            <div style={{
                position: 'fixed',
                top: '20px',
                right: '20px',
                zIndex: 9999,
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                maxWidth: '400px'
            }}>
                {notifications.map((notif) => (
                    <div
                        key={notif.id}
                        onClick={() => {
                            if (notif.onClick) notif.onClick();
                            removeNotification(notif.id);
                        }}
                        style={{
                            background: notif.type === 'success'
                                ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                                : notif.type === 'warning'
                                    ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                                    : notif.type === 'error'
                                        ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                                        : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            color: 'white',
                            padding: '16px',
                            borderRadius: '12px',
                            boxShadow: '0 8px 16px rgba(0,0,0,0.3)',
                            cursor: notif.onClick ? 'pointer' : 'default',
                            animation: 'slideInRight 0.3s ease-out',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px'
                        }}
                    >
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            gap: '12px'
                        }}>
                            <div style={{ flex: 1 }}>
                                <strong style={{ fontSize: '15px', display: 'block', marginBottom: '4px' }}>
                                    {notif.title}
                                </strong>
                                <span style={{ fontSize: '13px', opacity: 0.9 }}>
                                    {notif.message}
                                </span>
                                {notif.onClick && (
                                    <span style={{ fontSize: '12px', opacity: 0.7, marginTop: '4px', display: 'block' }}>
                                        👉 Click để xem chi tiết
                                    </span>
                                )}
                            </div>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    removeNotification(notif.id);
                                }}
                                style={{
                                    background: 'rgba(255,255,255,0.2)',
                                    border: 'none',
                                    color: 'white',
                                    borderRadius: '50%',
                                    width: '24px',
                                    height: '24px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    flexShrink: 0
                                }}
                            >
                                <X size={14} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Header */}
            <div className="inventory-header">
                <h1>Quản Lý Kho Toàn Hệ Thống</h1>
                <p>
                    <Package size={16} />
                    Theo dõi và quản lý tồn kho, duyệt yêu cầu nhập xuất
                    <span style={{
                        marginLeft: '12px',
                        fontSize: '12px',
                        color: '#10B981',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                    }}>
                    </span>
                </p>
            </div>

            {/* Tabs */}
            <div className="inventory-tabs">
                {[
                    { id: 'overview', label: 'Tổng quan', icon: Package },
                    { id: 'requests', label: 'Yêu cầu nhập kho', icon: FileText, badge: stats.pending },
                    { id: 'inventory', label: 'Tồn kho chi nhánh', icon: TrendingUp },
                    { id: 'history', label: 'Lịch sử giao dịch', icon: History }
                ].map(tab => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`inventory-tab ${activeTab === tab.id ? 'active' : ''}`}
                        >
                            <Icon size={18} />
                            {tab.label}
                            {tab.badge > 0 && (
                                <span className="tab-badge">{tab.badge}</span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* REST OF THE CODE - Overview Tab */}
            {activeTab === 'overview' && (
                <div>
                    <div className="stats-grid">
                        <div className="stat-card pending">
                            <div className="stat-card-content">
                                <div className="stat-icon pending">
                                    <Clock size={24} color="#F59E0B" />
                                </div>
                                <div>
                                    <div className="stat-number pending">{stats.pending}</div>
                                    <div className="stat-label">Chờ duyệt</div>
                                </div>
                            </div>
                        </div>

                        <div className="stat-card approved">
                            <div className="stat-card-content">
                                <div className="stat-icon approved">
                                    <CheckCircle size={24} color="#10B981" />
                                </div>
                                <div>
                                    <div className="stat-number approved">{stats.approved}</div>
                                    <div className="stat-label">Đã duyệt</div>
                                </div>
                            </div>
                        </div>

                        <div className="stat-card rejected">
                            <div className="stat-card-content">
                                <div className="stat-icon rejected">
                                    <XCircle size={24} color="#EF4444" />
                                </div>
                                <div>
                                    <div className="stat-number rejected">{stats.rejected}</div>
                                    <div className="stat-label">Từ chối</div>
                                </div>
                            </div>
                        </div>

                        <div className="stat-card total">
                            <div className="stat-card-content">
                                <div className="stat-icon total">
                                    <Package size={24} color="#3B82F6" />
                                </div>
                                <div>
                                    <div className="stat-number total">{stats.total}</div>
                                    <div className="stat-label">Tổng yêu cầu</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="branch-inventory-section">
                        <h3>
                            <AlertTriangle size={20} style={{ display: 'inline', marginRight: '8px', color: '#F59E0B' }} />
                            Yêu cầu cần xử lý ({stats.pending})
                        </h3>

                        {inventoryRequests.filter(r => r.status === 'PENDING').length === 0 ? (
                            <div className="empty-state">
                                <CheckCircle size={64} style={{ margin: '0 auto', opacity: 0.2, color: '#10B981' }} />
                                <p>Không có yêu cầu nào đang chờ duyệt</p>
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gap: '16px' }}>
                                {inventoryRequests
                                    .filter(r => r.status === 'PENDING')
                                    .slice(0, 5)
                                    .map(request => (
                                        <div
                                            key={request.id}
                                            className="request-card"
                                            onClick={() => setSelectedRequest(request)}
                                        >
                                            <div className="request-header">
                                                <div className="request-content">
                                                    <div className="request-badges">
                                                        {getTypeBadge(request.type)}
                                                        {getStatusBadge(request.status)}
                                                    </div>
                                                    <h3 className="request-title">
                                                        {(() => {
                                                            const firstItem = getRequestFirstIngredient(request.id);
                                                            const items = getRequestItems(request.id);
                                                            if (!firstItem) return 'Không có nguyên liệu';
                                                            if (items.length === 1) return firstItem.ingredient?.name || 'N/A';
                                                            return `${firstItem.ingredient?.name || 'N/A'} (+${items.length - 1} NL khác)`;
                                                        })()}
                                                    </h3>
                                                    <div className="request-details">
                                                        <span className="request-detail-item">
                                                            <MapPin size={14} />
                                                            {request.branch?.name || 'N/A'}
                                                        </span>
                                                        <span className="request-detail-item">
                                                            <Package size={14} />
                                                            {(() => {
                                                                const items = getRequestItems(request.id);
                                                                return items.length === 1
                                                                    ? `${items[0]?.quantity || 0} ${items[0]?.ingredient?.unit || ''}`
                                                                    : `${items.length} nguyên liệu`;
                                                            })()}
                                                        </span>
                                                        <span className="request-detail-item">
                                                            <Calendar size={14} />
                                                            {formatDate(request.requestedAt)}
                                                        </span>
                                                    </div>
                                                </div>
                                                <ChevronRight size={20} color="rgba(255,255,255,0.3)" />
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        )}
                    </div>

                    <div className="branch-inventory-section">
                        <h3>Tình trạng kho theo chi nhánh</h3>
                        <div className="branch-buttons">
                            {branches.map(branch => (
                                <button
                                    key={branch.id}
                                    onClick={() => {
                                        setSelectedBranch(branch);
                                        setActiveTab('inventory');
                                    }}
                                    className="branch-button"
                                >
                                    <MapPin size={14} style={{ marginRight: '6px' }} />
                                    {branch.name}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Requests Tab */}
            {activeTab === 'requests' && (
                <div>
                    <div className="filters-container">
                        <div className="search-wrapper">
                            <Search size={20} className="search-icon" />
                            <input
                                type="text"
                                placeholder="Tìm kiếm yêu cầu..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="search-input"
                            />
                        </div>

                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="search-input1"
                        >
                            <option value="all">Tất cả trạng thái</option>
                            <option value="PENDING">Chờ duyệt</option>
                            <option value="APPROVED">Đã duyệt</option>
                            <option value="REJECTED">Từ chối</option>
                        </select>

                        <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                            className="search-input1"
                        >
                            <option value="all">Tất cả loại</option>
                            <option value="IMPORT">Nhập kho</option>
                            <option value="EXPORT">Xuất kho</option>
                        </select>
                    </div>

                    <div className="requests-list">
                        {filteredRequests.length === 0 ? (
                            <div className="empty-state">
                                <Package size={64} style={{ margin: '0 auto', opacity: 0.2 }} />
                                <p>Không tìm thấy yêu cầu nào</p>
                            </div>
                        ) : (
                            filteredRequests.map(request => (
                                <div
                                    key={request.id}
                                    className="request-card"
                                    onClick={() => setSelectedRequest(request)}
                                >
                                    <div className="request-header">
                                        <div className="request-content">
                                            <div className="request-badges">
                                                {getTypeBadge(request.type)}
                                                {getStatusBadge(request.status)}
                                            </div>
                                            <h3 className="request-title">
                                                {(() => {
                                                    const firstItem = getRequestFirstIngredient(request.id);
                                                    const items = getRequestItems(request.id);
                                                    if (!firstItem) return 'Không có nguyên liệu';
                                                    if (items.length === 1) return firstItem.ingredient?.name || 'N/A';
                                                    return `${firstItem.ingredient?.name || 'N/A'} (+${items.length - 1} NL khác)`;
                                                })()}
                                            </h3>
                                            <div className="request-details">
                                                <span className="request-detail-item">
                                                    <MapPin size={14} />
                                                    {request.branch?.name || 'N/A'}
                                                </span>
                                                <span className="request-detail-item">
                                                    <Package size={14} />
                                                    {(() => {
                                                        const items = getRequestItems(request.id);
                                                        return items.length === 1
                                                            ? `${items[0]?.quantity || 0} ${items[0]?.ingredient?.unit || ''}`
                                                            : `${items.length} nguyên liệu`;
                                                    })()}
                                                </span>
                                            </div>
                                        </div>

                                        {request.status === 'PENDING' && (
                                            <div className="request-actions">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        approveRequest(request.id);
                                                    }}
                                                    disabled={loading}
                                                    className="btn-approve"
                                                >
                                                    <Check size={16} />
                                                    Duyệt
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setShowRejectModal(request);
                                                    }}
                                                    className="btn-reject"
                                                >
                                                    <X size={16} />
                                                    Từ chối
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    <div className="request-footer">
                                        <div className="request-footer-item">
                                            <User size={14} />
                                            Người yêu cầu: {request.requestedBy?.fullName || 'N/A'}
                                        </div>
                                        <div className="request-footer-item">
                                            <Calendar size={14} />
                                            {formatDate(request.requestedAt)}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* Inventory Tab */}
            {activeTab === 'inventory' && (
                <div>
                    <div className="branch-inventory-section">
                        <h3>Chọn chi nhánh để xem tồn kho</h3>
                        <div className="branch-buttons">
                            {branches.map(branch => (
                                <button
                                    key={branch.id}
                                    onClick={() => setSelectedBranch(branch)}
                                    className={`branch-button ${selectedBranch?.id === branch.id ? 'active' : ''}`}
                                >
                                    {branch.name}
                                </button>
                            ))}
                        </div>

                        {selectedBranch && (
                            <>
                                <div className="branch-info">
                                    <div className="branch-info-name">
                                        <MapPin size={18} color="#3B82F6" />
                                        {selectedBranch.name}
                                    </div>
                                    <p className="branch-info-address">{selectedBranch.address}</p>
                                </div>

                                <div className="inventory-table-container">
                                    <table className="inventory-table">
                                        <thead>
                                            <tr>
                                                <th>Nguyên liệu</th>
                                                <th>Đơn vị</th>
                                                <th>Tồn kho</th>
                                                <th>Trạng thái</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {branchIngredients.length === 0 ? (
                                                <tr>
                                                    <td colSpan="4" style={{ textAlign: 'center', padding: '32px', color: 'rgba(255,255,255,0.4)' }}>
                                                        Chưa có nguyên liệu nào trong kho
                                                    </td>
                                                </tr>
                                            ) : (
                                                branchIngredients.map(item => (
                                                    <tr key={item.id}>
                                                        <td>
                                                            <div className="ingredient-name">
                                                                {item.ingredient?.name || 'N/A'}
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <div className="ingredient-unit">
                                                                {item.ingredient?.unit || 'N/A'}
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <div className={`quantity-value ${getStockStatus(item.quantity)}`}>
                                                                {item.quantity || 0}
                                                            </div>
                                                        </td>
                                                        <td>
                                                            {item.quantity === 0 ? (
                                                                <div className="badge status-rejected">
                                                                    <XCircle size={14} />
                                                                    Hết hàng
                                                                </div>
                                                            ) : item.quantity < 10 ? (
                                                                <div className="badge status-pending">
                                                                    <AlertTriangle size={14} />
                                                                    Sắp hết
                                                                </div>
                                                            ) : (
                                                                <div className="badge status-approved">
                                                                    <CheckCircle size={14} />
                                                                    Đủ hàng
                                                                </div>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* History Tab */}
            {activeTab === 'history' && (
                <div className="branch-inventory-section">
                    <h3>Lịch sử giao dịch kho</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {inventoryRequests
                            .filter(r => r.status !== 'PENDING')
                            .sort((a, b) => new Date(b.approvedAt) - new Date(a.approvedAt))
                            .map(request => (
                                <div key={request.id} className="history-item">
                                    <div className="history-header">
                                        <div>
                                            <div className="history-badges">
                                                {getTypeBadge(request.type)}
                                                {getStatusBadge(request.status)}
                                            </div>
                                            <h4 className="history-title">
                                                {(() => {
                                                    const firstItem = getRequestFirstIngredient(request.id);
                                                    const items = getRequestItems(request.id);
                                                    if (!firstItem) return 'Không có nguyên liệu';
                                                    if (items.length === 1) return firstItem.ingredient?.name || 'N/A';
                                                    return `${firstItem.ingredient?.name || 'N/A'} (+${items.length - 1} NL khác)`;
                                                })()}
                                            </h4>
                                            <div className="history-details">
                                                <MapPin size={14} style={{ display: 'inline', marginRight: '4px' }} />
                                                {request.branch?.name || 'N/A'} •{' '}
                                                {(() => {
                                                    const items = getRequestItems(request.id);
                                                    return items.length === 1
                                                        ? `${items[0]?.quantity || 0} ${items[0]?.ingredient?.unit || ''}`
                                                        : `${items.length} nguyên liệu`;
                                                })()}
                                            </div>
                                        </div>
                                        <div className="history-time">
                                            <div>
                                                <User size={14} style={{ display: 'inline', marginRight: '4px' }} />
                                                Yêu cầu: {request.requestedBy?.fullName || 'N/A'}
                                            </div>
                                            <div>{formatDate(request.requestedAt)}</div>
                                            {request.approvedAt && (
                                                <>
                                                    <div style={{ marginTop: '8px' }}>
                                                        <User size={14} style={{ display: 'inline', marginRight: '4px' }} />
                                                        {request.status === 'APPROVED' ? 'Duyệt' : 'Từ chối'}: {request.approvedBy?.fullName || 'N/A'}
                                                    </div>
                                                    <div>{formatDate(request.approvedAt)}</div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    {request.note && (
                                        <div style={{ marginTop: '12px', padding: '12px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', fontSize: '14px', color: 'rgba(255,255,255,0.8)' }}>
                                            <strong style={{ color: '#EF4444' }}>Lý do từ chối:</strong> {request.note}
                                        </div>
                                    )}
                                </div>
                            ))}
                    </div>
                </div>
            )}

            {/* Request Detail Modal */}
            {selectedRequest && (
                <div className="modal-overlay" onClick={() => setSelectedRequest(null)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">Chi tiết yêu cầu</h2>
                            <button onClick={() => setSelectedRequest(null)} className="modal-close">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="modal-badges">
                            {getTypeBadge(selectedRequest.type)}
                            {getStatusBadge(selectedRequest.status)}
                        </div>

                        <div className="modal-body">
                            <div className="modal-field">
                                <div className="modal-field-label">Danh sách nguyên liệu</div>
                                {(() => {
                                    const items = getRequestItems(selectedRequest.id);
                                    if (items.length === 0) {
                                        return <div className="modal-field-value">Không có nguyên liệu</div>;
                                    }
                                    return (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
                                            {items.map((item, index) => (
                                                <div
                                                    key={index}
                                                    style={{
                                                        background: 'rgba(255,255,255,0.05)',
                                                        border: '1px solid rgba(255,255,255,0.1)',
                                                        borderRadius: '8px',
                                                        padding: '12px',
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center'
                                                    }}
                                                >
                                                    <div>
                                                        <div style={{ fontWeight: '600', color: '#fff', marginBottom: '4px' }}>
                                                            {item.ingredient?.name || 'N/A'}
                                                        </div>
                                                        <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>
                                                            Đơn vị: {item.ingredient?.unit || 'N/A'}
                                                        </div>
                                                    </div>
                                                    <div style={{ fontSize: '18px', fontWeight: '700', color: '#667eea' }}>
                                                        Số lượng: {item.quantity}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    );
                                })()}
                            </div>

                            <div className="modal-field">
                                <div className="modal-field-label">Chi nhánh</div>
                                <div className="modal-field-value branch">
                                    <MapPin size={18} color="#3B82F6" />
                                    {selectedRequest.branch?.name || 'N/A'}
                                </div>
                            </div>

                            <div className="modal-field">
                                <div className="modal-field-label">Lý do</div>
                                <div className="modal-field-value reason">{selectedRequest.reason || 'Không có lý do'}</div>
                            </div>

                            {selectedRequest.note && (
                                <div className="modal-field rejection">
                                    <div className="modal-field-label rejection">Lý do từ chối</div>
                                    <div className="modal-field-value reason">{selectedRequest.note}</div>
                                </div>
                            )}

                            <div className="modal-timeline">
                                <div className="modal-timeline-title">Thời gian</div>
                                <div className="modal-timeline-items">
                                    <div className="modal-timeline-item">
                                        <div className="modal-timeline-item-label">
                                            <Calendar size={16} color="rgba(255,255,255,0.5)" />
                                            Thời gian yêu cầu
                                        </div>
                                        <div className="modal-timeline-item-value">
                                            {formatDate(selectedRequest.requestedAt)}
                                        </div>
                                    </div>
                                    {selectedRequest.approvedAt && (
                                        <>
                                            <div className="modal-timeline-divider" />
                                            <div className="modal-timeline-item">
                                                <div className="modal-timeline-item-label">
                                                    <User size={16} color="rgba(255,255,255,0.5)" />
                                                    Người {selectedRequest.status === 'APPROVED' ? 'duyệt' : 'từ chối'}
                                                </div>
                                                <div className="modal-timeline-item-value">
                                                    {selectedRequest.approvedBy?.fullName}
                                                </div>
                                            </div>
                                            <div className="modal-timeline-item">
                                                <div className="modal-timeline-item-label">
                                                    <Calendar size={16} color="rgba(255,255,255,0.5)" />
                                                    Thời gian {selectedRequest.status === 'APPROVED' ? 'duyệt' : 'từ chối'}
                                                </div>
                                                <div className="modal-timeline-item-value">
                                                    {formatDate(selectedRequest.approvedAt)}
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            {selectedRequest.status === 'PENDING' && (
                                <div className="modal-actions">
                                    <button
                                        onClick={() => approveRequest(selectedRequest.id)}
                                        disabled={loading}
                                        className="btn-modal-approve"
                                    >
                                        <CheckCircle size={20} />
                                        Duyệt yêu cầu
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowRejectModal(selectedRequest);
                                            setSelectedRequest(null);
                                        }}
                                        disabled={loading}
                                        className="btn-modal-reject"
                                    >
                                        <XCircle size={20} />
                                        Từ chối
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Reject Modal */}
            {showRejectModal && (
                <div className="modal-overlay" onClick={() => setShowRejectModal(null)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                        <div className="modal-header">
                            <h2 className="modal-title">Từ chối yêu cầu</h2>
                            <button onClick={() => setShowRejectModal(null)} className="modal-close">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="modal-body">
                            <div className="modal-field">
                                <div className="modal-field-label">Nguyên liệu</div>
                                <div className="modal-field-value">
                                    {(() => {
                                        const items = getRequestItems(showRejectModal.id);
                                        if (items.length === 0) return 'Không có nguyên liệu';
                                        return items.map(item => item.ingredient?.name).join(', ');
                                    })()}
                                </div>
                            </div>

                            <div className="modal-field">
                                <div className="modal-field-label">Chi nhánh</div>
                                <div className="modal-field-value">{showRejectModal.branch?.name || 'N/A'}</div>
                            </div>

                            <div className="modal-field">
                                <div className="modal-field-label">Lý do từ chối *</div>
                                <textarea
                                    value={rejectionNote}
                                    onChange={(e) => setRejectionNote(e.target.value)}
                                    placeholder="Nhập lý do từ chối yêu cầu này..."
                                    style={{
                                        width: '100%',
                                        minHeight: '100px',
                                        padding: '12px',
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '8px',
                                        color: '#fff',
                                        fontSize: '14px',
                                        resize: 'vertical'
                                    }}
                                />
                            </div>

                            <div className="modal-actions">
                                <button
                                    onClick={() => setShowRejectModal(null)}
                                    className="btn-modal-reject"
                                    style={{ background: 'rgba(255,255,255,0.05)' }}
                                >
                                    Hủy
                                </button>
                                <button
                                    onClick={() => {
                                        if (!rejectionNote.trim()) {
                                            addNotification({
                                                type: 'warning',
                                                title: '⚠️ Chú ý',
                                                message: 'Vui lòng nhập lý do từ chối'
                                            });
                                            return;
                                        }
                                        rejectRequest(showRejectModal.id, rejectionNote);
                                    }}
                                    disabled={loading || !rejectionNote.trim()}
                                    className="btn-modal-reject"
                                >
                                    <XCircle size={20} />
                                    Xác nhận từ chối
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* CSS Animations */}
            <style>{`
                @keyframes pulse {
                    0%, 100% {
                        opacity: 1;
                    }
                    50% {
                        opacity: 0.5;
                    }
                }
                
                @keyframes slideInRight {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                
                .pulse-dot {
                    width: 6px;
                    height: 6px;
                    border-radius: 50%;
                    background-color: #10B981;
                    animation: pulse 2s infinite;
                }
                
                .tab-badge {
                    background: #ef4444;
                    color: white;
                    border-radius: 12px;
                    padding: 2px 8px;
                    font-size: 11px;
                    font-weight: 700;
                    margin-left: 6px;
                }
            `}</style>
        </div>
    );
}