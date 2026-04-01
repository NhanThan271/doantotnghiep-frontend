import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Search, RefreshCw, MapPin, X, Plus, AlertCircle, Clock, FileText, Beaker, ChefHat, TrendingDown, CheckCircle } from 'lucide-react';
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
    const [filteredIngredients, setFilteredIngredients] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStock, setFilterStock] = useState('all');
    const [currentBranch, setCurrentBranch] = useState(null);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('ingredients');
    const [showRequestModal, setShowRequestModal] = useState(false);
    const [selectedIngredient, setSelectedIngredient] = useState(null);
    const [requestForm, setRequestForm] = useState({
        ingredientId: '',
        quantity: '',
        reason: ''
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

        setTimeout(() => {
            removeNotification(id);
        }, 8000);
    };

    const removeNotification = (id) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };
    // Socket connection
    useEffect(() => {
        if (!currentBranch?.id) {
            console.log('⏳ Waiting for currentBranch to load...');
            return;
        }

        console.log('🔌 Manager connecting to socket server...');
        console.log('📊 Current branch:', currentBranch);

        // ĐĂNG KÝ ROLE MANAGER SAU KHI ĐÃ CÓ BRANCH
        socket.emit('register-role', {
            role: 'manager',
            userId: user?.id,
            branchId: currentBranch.id
        });

        console.log('✅ Sent register-role:', {
            role: 'manager',
            userId: user?.id,
            branchId: currentBranch.id
        });

        // ===== LẮNG NGHE KHI ADMIN DUYỆT YÊU CẦU =====
        socket.on('inventory-request-status-changed', (data) => {
            const responseKey = `${data.requestId}-${data.status}`;

            // Kiểm tra đã xử lý chưa
            if (processedResponses.current.has(responseKey)) {
                console.log('⏭️ Bỏ qua response đã xử lý:', responseKey);
                return;
            }

            // Đánh dấu đã xử lý
            processedResponses.current.add(responseKey);

            if (data.status === 'APPROVED') {
                addNotification({
                    type: 'success',
                    title: `Yêu cầu nhập kho đã được duyệt!`,
                    message: `Yêu cầu #${data.requestId} của bạn đã được Admin phê duyệt. ${data.items?.length || 0} nguyên liệu đã được thêm vào kho.`,
                    onClick: () => {
                        setActiveTab('requests');
                    }
                });
                fetchInventoryRequests();
                fetchBranchIngredients();
            }
            else if (data.status === 'REJECTED') {
                addNotification({
                    type: 'error',
                    title: `Yêu cầu nhập kho bị từ chối`,
                    message: `Yêu cầu #${data.requestId} đã bị từ chối. Lý do: ${data.note || 'Không có lý do'}`,
                    onClick: () => {
                        setActiveTab('requests');
                    }
                });
                fetchInventoryRequests();
            }
        });

        // LẮNG NGHE KHI INVENTORY ĐƯỢC CẬP NHẬT
        socket.on('inventory-updated', (data) => {
            console.log('📦 Inventory updated:', data);

            if (data.branchId === currentBranch?.id) {
                fetchBranchIngredients();
            }
        });

        // Cleanup
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

            if (!response.ok) throw new Error('Không thể tải danh sách nguyên liệu');

            const data = await response.json();
            setAllIngredients(data);
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

    const fetchBranchIngredients = useCallback(async () => {
        if (!currentBranch?.id) return;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(
                `${API_BASE_URL}/api/branch-ingredients/branch/${currentBranch.id}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (!response.ok) throw new Error('Không thể tải danh sách nguyên liệu');

            const data = await response.json();
            setBranchIngredients(data);
            setFilteredIngredients(data);
        } catch (error) {
            console.error('Lỗi khi tải nguyên liệu:', error);
        }
    }, [currentBranch?.id]);

    const fetchRecipes = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/recipes`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Không thể tải công thức');

            const data = await response.json();
            setRecipes(data);
        } catch (error) {
            console.error('Lỗi khi tải công thức:', error);
        }
    };

    const fetchProducts = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/foods`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Không thể tải sản phẩm');

            const data = await response.json();
            setProducts(data);
        } catch (error) {
            console.error('Lỗi khi tải sản phẩm:', error);
        }
    };

    const fetchInventoryRequests = useCallback(async () => {
        if (!currentBranch?.id) return;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(
                `${API_BASE_URL}/api/inventory-requests/branch/${currentBranch.id}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (!response.ok) throw new Error('Không thể tải yêu cầu kho');

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
            console.error('Lỗi khi tải yêu cầu kho:', error);
        }
    }, [currentBranch?.id]);

    useEffect(() => {
        fetchCurrentBranch();
        fetchAllIngredients();
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

        if (filterStock === 'low') {
            filtered = filtered.filter(bi => bi.quantity < 10 && bi.quantity > 0);
        } else if (filterStock === 'out') {
            filtered = filtered.filter(bi => bi.quantity === 0);
        }

        if (searchTerm) {
            filtered = filtered.filter(bi =>
                bi.ingredient?.name?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        setFilteredIngredients(filtered);
    }, [branchIngredients, filterStock, searchTerm]);

    const calculateProductAvailability = (productId) => {
        const productRecipes = recipes.filter(r => r.product?.id === productId);

        if (productRecipes.length === 0) {
            return { canMake: 0, limitedBy: null };
        }

        let minQuantity = Infinity;
        let limitingIngredient = null;

        productRecipes.forEach(recipe => {
            const branchIng = branchIngredients.find(
                bi => bi.ingredient?.id === recipe.ingredient?.id
            );

            if (!branchIng || branchIng.quantity === 0) {
                minQuantity = 0;
                limitingIngredient = recipe.ingredient;
                return;
            }

            const possibleQuantity = Math.floor(branchIng.quantity / recipe.quantityRequired);
            if (possibleQuantity < minQuantity) {
                minQuantity = possibleQuantity;
                limitingIngredient = recipe.ingredient;
            }
        });

        return {
            canMake: minQuantity === Infinity ? 0 : minQuantity,
            limitedBy: minQuantity === 0 || minQuantity < 10 ? limitingIngredient : null
        };
    };

    const createInventoryRequest = async () => {
        if (!requestForm.ingredientId) {
            addNotification({
                type: 'warning',
                title: '⚠️ Chú ý',
                message: 'Vui lòng chọn nguyên liệu'
            });
            return;
        }

        if (!requestForm.quantity || requestForm.quantity <= 0) {
            addNotification({
                type: 'warning',
                title: '⚠️ Chú ý',
                message: 'Vui lòng nhập số lượng hợp lệ'
            });
            return;
        }

        if (!requestForm.reason.trim()) {
            addNotification({
                type: 'warning',
                title: '⚠️ Chú ý',
                message: 'Vui lòng nhập lý do yêu cầu'
            });
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const userStr = localStorage.getItem('user');
            const user = userStr ? JSON.parse(userStr) : null;

            const requestData = {
                branch: currentBranch,
                requestedBy: user,
                status: 'PENDING',
                reason: requestForm.reason
            };

            const response = await fetch(`${API_BASE_URL}/api/inventory-requests`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(requestData)
            });

            if (!response.ok) throw new Error('Không thể tạo yêu cầu');

            const createdRequest = await response.json();

            const itemResponse = await fetch(
                `${API_BASE_URL}/api/inventory-request-items?requestId=${createdRequest.id}&ingredientId=${requestForm.ingredientId}&quantity=${requestForm.quantity}`,
                {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            if (!itemResponse.ok) throw new Error('Không thể thêm nguyên liệu vào yêu cầu');

            const ingredient = allIngredients.find(i => i.id === parseInt(requestForm.ingredientId));

            // ===== GỬI THÔNG BÁO SOCKET ĐẾN ADMIN =====
            socket.emit('inventory-request-created', {
                requestId: createdRequest.id,
                branchId: currentBranch.id,
                branchName: currentBranch.name,
                ingredientName: ingredient?.name || 'N/A',
                quantity: requestForm.quantity,
                unit: ingredient?.unit || '',
                reason: requestForm.reason,
                requestedBy: user?.fullName || user?.username
            });

            addNotification({
                type: 'success',
                title: 'Thành công',
                message: 'Đã gửi yêu cầu đến Admin! Chờ phê duyệt.',
                onClick: () => {
                    setActiveTab('requests');
                }
            });

            setShowRequestModal(false);
            setRequestForm({ ingredientId: '', quantity: '', reason: '' });
            setSelectedIngredient(null);

            await fetchInventoryRequests();
        } catch (error) {
            console.error('Lỗi khi tạo yêu cầu:', error);
            addNotification({
                type: 'error',
                title: 'Lỗi',
                message: 'Không thể tạo yêu cầu. Vui lòng thử lại.'
            });
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
            'APPROVED': { text: 'Đã duyệt', class: styles.badgeSuccess, icon: CheckCircle },
            'REJECTED': { text: 'Từ chối', class: styles.badgeDanger, icon: X }
        };
        return statusMap[status] || { text: status, class: styles.badgeInactive, icon: AlertCircle };
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    };

    const getCurrentStock = (ingredientId) => {
        const branchIng = branchIngredients.find(bi => bi.ingredient?.id === parseInt(ingredientId));
        return branchIng ? branchIng.quantity : 0;
    };

    const getRequestItems = (requestId) => {
        return requestItems[requestId] || [];
    };

    const stats = {
        totalIngredients: branchIngredients.length,
        lowStock: branchIngredients.filter(bi => bi.quantity < 10 && bi.quantity > 0).length,
        outOfStock: branchIngredients.filter(bi => bi.quantity === 0).length,
        pendingRequests: inventoryRequests.filter(r => r.status === 'PENDING').length
    };

    return (
        <div className={styles.pageContainer}>
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
            <div className={styles.headerCard}>
                <div className={styles.headerTop}>
                    <div>
                        <h2 className={styles.pageTitle}>Quản lý Kho Chi nhánh</h2>
                        {currentBranch && (
                            <p className={styles.branchInfo}>
                                <MapPin size={16} />
                                <span className={styles.branchName}>{currentBranch.name}</span>
                                {currentBranch.address && (
                                    <span className={styles.branchAddress}>• {currentBranch.address}</span>
                                )}
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
                        )}
                    </div>
                </div>

                {/* Statistics Cards */}
                <div className={styles.statsGrid}>
                    <div className={styles.statCardPrimary}>
                        <div className={styles.statIcon}>
                            <Beaker size={24} />
                        </div>
                        <div>
                            <div className={styles.statValue}>{stats.totalIngredients}</div>
                            <div className={styles.statLabel}>Tổng nguyên liệu</div>
                        </div>
                    </div>

                    <div className={styles.statCardPrimary}>
                        <div className={styles.statIcon}>
                            <TrendingDown size={24} />
                        </div>
                        <div>
                            <div className={styles.statValue}>{stats.lowStock}</div>
                            <div className={styles.statLabel}>Sắp hết</div>
                        </div>
                    </div>

                    <div className={styles.statCardDanger}>
                        <div className={styles.statIcon}>
                            <AlertCircle size={24} />
                        </div>
                        <div>
                            <div className={styles.statValue}>{stats.outOfStock}</div>
                            <div className={styles.statLabel}>Hết hàng</div>
                        </div>
                    </div>

                    <div className={styles.statCardPrimary}>
                        <div className={styles.statIcon}>
                            <Clock size={24} />
                        </div>
                        <div>
                            <div className={styles.statValue}>{stats.pendingRequests}</div>
                            <div className={styles.statLabel}>Yêu cầu chờ duyệt</div>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div style={{
                    display: 'flex',
                    gap: '12px',
                    marginTop: '24px',
                    borderBottom: '1px solid var(--color-border)',
                    paddingBottom: '0'
                }}>
                    <button
                        onClick={() => setActiveTab('ingredients')}
                        style={{
                            padding: '12px 24px',
                            background: activeTab === 'ingredients' ? 'rgba(139, 92, 246, 0.1)' : 'transparent',
                            color: activeTab === 'ingredients' ? '#8B5CF6' : 'var(--color-text-secondary)',
                            border: 'none',
                            borderBottom: activeTab === 'ingredients' ? '2px solid #8B5CF6' : '2px solid transparent',
                            cursor: 'pointer',
                            fontWeight: '600',
                            fontSize: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            transition: 'all 0.2s'
                        }}
                    >
                        <Beaker size={18} />
                        Tồn kho nguyên liệu
                    </button>
                    <button
                        onClick={() => setActiveTab('requests')}
                        style={{
                            padding: '12px 24px',
                            background: activeTab === 'requests' ? 'rgba(139, 92, 246, 0.1)' : 'transparent',
                            color: activeTab === 'requests' ? '#8B5CF6' : 'var(--color-text-secondary)',
                            border: 'none',
                            borderBottom: activeTab === 'requests' ? '2px solid #8B5CF6' : '2px solid transparent',
                            cursor: 'pointer',
                            fontWeight: '600',
                            fontSize: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            transition: 'all 0.2s',
                            position: 'relative'
                        }}
                    >
                        <FileText size={18} />
                        Yêu cầu nhập kho
                        {stats.pendingRequests > 0 && (
                            <span style={{
                                position: 'absolute',
                                top: '4px',
                                right: '4px',
                                background: '#EF4444',
                                color: 'white',
                                borderRadius: '10px',
                                padding: '2px 6px',
                                fontSize: '11px',
                                fontWeight: '700'
                            }}>
                                {stats.pendingRequests}
                            </span>
                        )}
                    </button>
                </div>

                {/* Search and Filter (only for ingredients tab) */}
                {activeTab === 'ingredients' && (
                    <div className={styles.filterBar} style={{ marginTop: '20px' }}>
                        <div className={styles.searchBox}>
                            <Search size={20} className={styles.searchIcon} />
                            <input
                                type="text"
                                placeholder="Tìm nguyên liệu..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className={styles.searchInput}
                            />
                        </div>

                        <div className={styles.filterControls}>
                            <select
                                value={filterStock}
                                onChange={(e) => setFilterStock(e.target.value)}
                                className={styles.filterSelect}
                                style={{
                                    padding: '12px 16px',
                                    background: 'var(--color-bg-dark)',
                                    border: '1px solid var(--color-border)',
                                    borderRadius: '12px',
                                    color: 'var(--color-text-primary)',
                                    fontSize: '14px',
                                    cursor: 'pointer',
                                    outline: 'none',
                                    transition: 'all 0.2s ease',
                                    minWidth: '150px'
                                }}
                            >
                                <option value="all">Tất cả tồn kho</option>
                                <option value="low">Sắp hết (&lt; 10)</option>
                                <option value="out">Hết hàng</option>
                            </select>

                            <button
                                onClick={() => setShowRequestModal(true)}
                                className={styles.actionButtonSuccess}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '10px 20px'
                                }}
                            >
                                <Plus size={18} />
                                Tạo yêu cầu nhập kho
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Content based on active tab */}
            <div className={styles.tableCard}>
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
                                        style={{
                                            border: `2px solid ${stockStatus.color}30`,
                                            borderRadius: '12px',
                                            padding: '20px',
                                            backgroundColor: '#2c2c2e',
                                            transition: 'all 0.2s'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.transform = 'translateY(-4px)';
                                            e.currentTarget.style.borderColor = stockStatus.color;
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.transform = 'translateY(0)';
                                            e.currentTarget.style.borderColor = `${stockStatus.color}30`;
                                        }}
                                    >
                                        <div style={{
                                            width: '56px',
                                            height: '56px',
                                            background: `${stockStatus.color}20`,
                                            borderRadius: '14px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            marginBottom: '16px'
                                        }}>
                                            <Beaker size={28} color={stockStatus.color} />
                                        </div>

                                        <h3 style={{
                                            fontSize: '18px',
                                            fontWeight: '700',
                                            color: '#e5e7eb',
                                            marginBottom: '8px'
                                        }}>
                                            {branchIng.ingredient?.name || 'N/A'}
                                        </h3>

                                        <p style={{
                                            fontSize: '13px',
                                            color: '#9ca3af',
                                            marginBottom: '16px'
                                        }}>
                                            Đơn vị: {branchIng.ingredient?.unit || 'N/A'}
                                        </p>

                                        <div style={{
                                            padding: '12px',
                                            background: '#1c1c1e',
                                            borderRadius: '8px',
                                            marginBottom: '12px'
                                        }}>
                                            <div style={{
                                                fontSize: '11px',
                                                color: '#9ca3af',
                                                marginBottom: '4px',
                                                textTransform: 'uppercase'
                                            }}>
                                                Tồn kho
                                            </div>
                                            <div style={{
                                                fontSize: '24px',
                                                fontWeight: '700',
                                                color: stockStatus.color
                                            }}>
                                                {branchIng.quantity}
                                            </div>
                                        </div>

                                        <span className={stockStatus.class} style={{
                                            display: 'inline-block',
                                            width: '100%',
                                            textAlign: 'center'
                                        }}>
                                            {stockStatus.text}
                                        </span>
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}

                {activeTab === 'requests' && (
                    <div style={{ padding: '20px' }}>
                        {inventoryRequests.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                                <FileText size={48} style={{ margin: '0 auto 16px', opacity: 0.3, color: '#9ca3af' }} />
                                <p style={{ color: '#9ca3af', fontSize: '16px' }}>Chưa có yêu cầu nào</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {inventoryRequests.map((request) => {
                                    const statusInfo = getRequestStatusBadge(request.status);
                                    const StatusIcon = statusInfo.icon;
                                    const items = getRequestItems(request.id);

                                    return (
                                        <div
                                            key={`request-${request.id}`}
                                            style={{
                                                border: '1px solid var(--color-border)',
                                                borderRadius: '12px',
                                                padding: '20px',
                                                backgroundColor: '#2c2c2e',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            <div style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'flex-start',
                                                marginBottom: '16px'
                                            }}>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                                                        <p style={{
                                                            fontSize: '18px',
                                                            fontWeight: '700',
                                                            color: '#e5e7eb',
                                                        }}>
                                                            Yêu cầu #{request.id}
                                                        </p>
                                                        <span className={statusInfo.class} style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '6px'
                                                        }}>
                                                            <StatusIcon size={16} />
                                                            {statusInfo.text}
                                                        </span>
                                                    </div>

                                                    {items.length > 0 && (
                                                        <div style={{
                                                            background: '#1c1c1e',
                                                            borderRadius: '8px',
                                                            padding: '12px',
                                                            marginBottom: '12px'
                                                        }}>
                                                            <div style={{
                                                                fontSize: '12px',
                                                                color: '#9ca3af',
                                                                marginBottom: '8px',
                                                                fontWeight: '600',
                                                                textTransform: 'uppercase'
                                                            }}>
                                                                Nguyên liệu yêu cầu
                                                            </div>
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                                {items.map((item, idx) => (
                                                                    <div key={idx} style={{
                                                                        display: 'flex',
                                                                        justifyContent: 'space-between',
                                                                        alignItems: 'center',
                                                                        padding: '8px 12px',
                                                                        background: 'rgba(139, 92, 246, 0.1)',
                                                                        border: '1px solid rgba(139, 92, 246, 0.2)',
                                                                        borderRadius: '6px'
                                                                    }}>
                                                                        <span style={{
                                                                            color: '#e5e7eb',
                                                                            fontWeight: '600',
                                                                            fontSize: '14px'
                                                                        }}>
                                                                            {item.ingredient?.name || 'N/A'}
                                                                        </span>
                                                                        <span style={{
                                                                            color: '#8B5CF6',
                                                                            fontWeight: '700',
                                                                            fontSize: '15px'
                                                                        }}>
                                                                            {item.quantity} {item.ingredient?.unit || ''}
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {request.reason && (
                                                <div style={{
                                                    fontSize: '14px',
                                                    color: '#e5e7eb',
                                                    marginBottom: '12px',
                                                    padding: '12px',
                                                    background: '#1c1c1e',
                                                    borderRadius: '8px',
                                                    borderLeft: '3px solid #8B5CF6'
                                                }}>
                                                    <strong style={{ color: '#8B5CF6' }}>Lý do:</strong> {request.reason}
                                                </div>
                                            )}

                                            {request.note && request.status === 'REJECTED' && (
                                                <div style={{
                                                    fontSize: '13px',
                                                    color: '#EF4444',
                                                    padding: '12px',
                                                    background: 'rgba(239, 68, 68, 0.1)',
                                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                                    borderRadius: '8px',
                                                    borderLeft: '3px solid #EF4444'
                                                }}>
                                                    <strong>Lý do từ chối:</strong> {request.note}
                                                </div>
                                            )}

                                            {request.approvedBy && (
                                                <div style={{
                                                    fontSize: '12px',
                                                    color: '#9ca3af',
                                                    marginTop: '12px',
                                                    paddingTop: '12px',
                                                    borderTop: '1px solid rgba(255,255,255,0.1)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px'
                                                }}>
                                                    <CheckCircle size={14} color="#10B981" />
                                                    {request.status === 'APPROVED' ? 'Duyệt' : 'Từ chối'} bởi: <strong>{request.approvedBy.fullName || request.approvedBy.username}</strong>
                                                    {request.approvedAt && ` • ${formatDate(request.approvedAt)}`}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
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
                                <p className={styles.modalSubtitle}>Chọn nguyên liệu cần nhập</p>
                            </div>
                            <button
                                onClick={() => {
                                    setShowRequestModal(false);
                                    setRequestForm({ ingredientId: '', quantity: '', reason: '' });
                                }}
                                className={styles.modalCloseButton}
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div className={styles.modalBody}>
                            <div style={{ marginBottom: '20px' }}>
                                <label className={styles.infoLabel} style={{ display: 'block', marginBottom: '8px' }}>
                                    Nguyên liệu *
                                </label>
                                <select
                                    value={requestForm.ingredientId}
                                    onChange={(e) => setRequestForm({ ...requestForm, ingredientId: e.target.value })}
                                    className={styles.searchInput}
                                    style={{ width: '100%' }}
                                >
                                    <option value="">-- Chọn nguyên liệu --</option>
                                    {allIngredients.map((ingredient) => {
                                        const currentStock = getCurrentStock(ingredient.id);
                                        return (
                                            <option key={ingredient.id} value={ingredient.id}>
                                                {ingredient.name} {ingredient.unit}
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <label className={styles.infoLabel} style={{ display: 'block', marginBottom: '8px' }}>
                                    Số lượng nhập *
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    step="0.01"
                                    value={requestForm.quantity}
                                    onChange={(e) => setRequestForm({ ...requestForm, quantity: e.target.value })}
                                    className={styles.searchInput}
                                    placeholder="Nhập số lượng..."
                                    style={{ width: '100%' }}
                                />
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <label className={styles.infoLabel} style={{ display: 'block', marginBottom: '8px' }}>
                                    Lý do yêu cầu *
                                </label>
                                <textarea
                                    value={requestForm.reason}
                                    onChange={(e) => setRequestForm({ ...requestForm, reason: e.target.value })}
                                    className={styles.searchInput}
                                    placeholder="Nhập lý do yêu cầu nhập kho..."
                                    rows="4"
                                    style={{ width: '100%', resize: 'vertical' }}
                                />
                            </div>

                            <div className={styles.modalActions}>
                                <button
                                    onClick={() => {
                                        setShowRequestModal(false);
                                        setRequestForm({ ingredientId: '', quantity: '', reason: '' });
                                    }}
                                    className={styles.buttonDanger}
                                >
                                    <X size={20} />
                                    Hủy
                                </button>
                                <button
                                    onClick={createInventoryRequest}
                                    className={styles.buttonSuccess}
                                >
                                    <Plus size={20} />
                                    Gửi yêu cầu
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Loading Overlay */}
            {loading && (
                <div className={styles.loadingOverlay}>
                    <div className={styles.loadingModal}>
                        <RefreshCw size={48} className={styles.spinIcon} />
                        <p>Đang tải dữ liệu...</p>
                    </div>
                </div>
            )}

            {/* CSS Animations */}
            <style jsx>{`
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
            `}</style>
        </div>
    );
}