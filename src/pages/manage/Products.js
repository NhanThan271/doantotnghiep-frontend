import React, { useEffect, useState } from 'react';
import { Package, Search, Grid, List, TrendingUp, AlertCircle, Store, Eye, RefreshCw } from 'lucide-react';
import styles from '../../layouts/AdminLayout.module.css';

export default function BranchMenuManager() {
    const [menuItems, setMenuItems] = useState([]);
    const [currentBranch, setCurrentBranch] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [viewMode, setViewMode] = useState('table');
    const [loading, setLoading] = useState(false);
    const API_BASE_URL = 'http://localhost:8080';

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

                if (!userRes.ok) {
                    throw new Error('Không thể lấy thông tin user');
                }

                const userData = await userRes.json();
                branchId = userData.branch?.id;

                if (branchId) {
                    localStorage.setItem('user', JSON.stringify({
                        ...user,
                        branchId,
                        branch: userData.branch
                    }));
                }
            }

            if (!branchId) {
                alert('Tài khoản của bạn chưa được gán chi nhánh. Vui lòng liên hệ quản trị viên.');
                return;
            }

            const branchRes = await fetch(`${API_BASE_URL}/api/branches/${branchId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (branchRes.ok) {
                const branchData = await branchRes.json();
                setCurrentBranch(branchData);
            }

        } catch (error) {
            console.error('Lỗi khi lấy thông tin chi nhánh:', error);
            alert('Không thể lấy thông tin chi nhánh. Vui lòng thử lại.');
        }
    };

    const fetchBranchMenu = async () => {
        if (!currentBranch?.id) return;

        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(
                `${API_BASE_URL}/api/branch-products/branch/${currentBranch.id}/with-promotions`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (!response.ok) {
                throw new Error('Không thể tải menu');
            }

            const data = await response.json();
            console.log('Menu data:', data);
            setMenuItems(data);
        } catch (error) {
            console.error('Lỗi khi tải menu:', error);
            alert('Không thể tải menu. Vui lòng thử lại.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCurrentBranch();
    }, []);

    useEffect(() => {
        if (currentBranch) {
            fetchBranchMenu();
        }
    }, [currentBranch]);

    const toggleProductStatus = async (branchProductId, currentStatus) => {
        try {
            const token = localStorage.getItem('token');
            const updatedStatus = !currentStatus;

            const response = await fetch(
                `${API_BASE_URL}/api/branch-products/${branchProductId}/toggle-status`,
                {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ isActive: updatedStatus })
                }
            );

            if (!response.ok) {
                throw new Error('Cập nhật thất bại');
            }

            fetchBranchMenu();
        } catch (error) {
            console.error('Lỗi khi cập nhật trạng thái:', error);
            alert('Không thể cập nhật trạng thái món ăn. Vui lòng thử lại.');
        }
    };

    const getImageUrl = (imageUrl) => {
        if (!imageUrl) return null;
        if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
            return imageUrl;
        }
        if (imageUrl.startsWith('/')) {
            return `${API_BASE_URL}${imageUrl}`;
        }
        return `${API_BASE_URL}/${imageUrl}`;
    };

    const filteredItems = menuItems.filter(item => {
        const matchesSearch = item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.categoryName?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter = filterStatus === 'all' ? true :
            filterStatus === 'active' ? item.isActive : !item.isActive;
        return matchesSearch && matchesFilter;
    });

    const activeItems = menuItems.filter(m => m.isActive).length;
    const totalValue = menuItems.reduce((sum, m) => sum + (m.finalPrice || m.basePrice || 0) * (m.stockQuantity || 0), 0);
    const lowStockCount = menuItems.filter(m => m.stockQuantity < 10).length;

    if (!currentBranch) {
        return (
            <div className={styles.loadingContainer}>
                <RefreshCw size={48} className={styles.spinIcon} />
                <p className={styles.loadingText}>Đang tải thông tin chi nhánh...</p>
            </div>
        );
    }

    return (
        <div className={styles.pageContainer}>
            {/* Header */}
            <div className={styles.headerCard}>
                <div className={styles.headerTop}>
                    <div>
                        <h2 className={styles.pageTitle}>Quản lý Menu Chi nhánh</h2>
                        <p className={styles.branchInfo}>
                            <Store size={16} />
                            <span className={styles.branchName}>{currentBranch.name}</span>
                            {currentBranch.address && (
                                <span className={styles.branchAddress}>• {currentBranch.address}</span>
                            )}
                        </p>
                    </div>

                    <button
                        onClick={fetchBranchMenu}
                        disabled={loading}
                        className={`${styles.refreshButton} ${loading ? styles.refreshButtonDisabled : ''}`}
                    >
                        <RefreshCw size={18} className={loading ? styles.spinIcon : ''} />
                        Làm mới
                    </button>
                </div>

                {/* Stats Cards */}
                <div className={styles.statsGrid}>
                    <div className={styles.statCardSuccess}>
                        <div className={styles.statIcon}>
                            <Eye size={24} />
                        </div>
                        <div>
                            <div className={styles.statValue}>{activeItems}</div>
                            <div className={styles.statLabel}>Đang bán</div>
                        </div>
                    </div>

                    <div className={styles.statCardPrimary}>
                        <div className={styles.statIcon}>
                            <TrendingUp size={24} />
                        </div>
                        <div>
                            <div className={styles.statValue}>{totalValue.toLocaleString('vi-VN')}đ</div>
                            <div className={styles.statLabel}>Giá trị tồn kho</div>
                        </div>
                    </div>

                    <div className={styles.statCardDanger}>
                        <div className={styles.statIcon}>
                            <AlertCircle size={24} />
                        </div>
                        <div>
                            <div className={styles.statValue}>{lowStockCount}</div>
                            <div className={styles.statLabel}>Sắp hết hàng</div>
                        </div>
                    </div>
                </div>

                {/* Search and Filter Bar */}
                <div className={styles.filterBar}>
                    <div className={styles.searchBox}>
                        <Search size={20} className={styles.searchIcon} />
                        <input
                            type="text"
                            placeholder="Tìm kiếm món ăn..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={styles.searchInput}
                        />
                    </div>

                    <div className={styles.filterControls}>
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
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
                            <option value="all">Tất cả</option>
                            <option value="active">Đang bán</option>
                            <option value="inactive">Ngừng bán</option>
                        </select>

                        <div className={styles.viewModeToggle}>
                            <button
                                onClick={() => setViewMode('table')}
                                className={viewMode === 'table' ? styles.viewModeActive : styles.viewModeInactive}
                            >
                                <List size={18} />
                            </button>
                            <button
                                onClick={() => setViewMode('grid')}
                                className={viewMode === 'grid' ? styles.viewModeActive : styles.viewModeInactive}
                            >
                                <Grid size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* TABLE VIEW */}
            {viewMode === 'table' && (
                <div className={styles.tableCard}>
                    <div className={styles.tableWrapper}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Món ăn</th>
                                    <th className={styles.textRight}>Giá bán</th>
                                    <th className={styles.textCenter}>Trạng thái</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredItems.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className={styles.emptyState}>
                                            <Package size={48} className={styles.emptyIcon} />
                                            <p>Không tìm thấy món ăn nào</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredItems.map((item) => (
                                        <tr key={item.id}>
                                            <td>
                                                <div className={styles.productCell}>
                                                    {item.imageUrl ? (
                                                        <img
                                                            src={getImageUrl(item.imageUrl)}
                                                            alt={item.name}
                                                            className={styles.productImage}
                                                        />
                                                    ) : (
                                                        <div className={styles.productImagePlaceholder}>
                                                            <Package size={24} />
                                                        </div>
                                                    )}
                                                    <span className={styles.productName}>{item.name}</span>
                                                </div>
                                            </td>
                                            <td className={styles.textRight}>
                                                <div className={styles.priceCell}>
                                                    <span className={styles.finalPrice}>
                                                        {item.finalPrice?.toLocaleString('vi-VN')}đ
                                                    </span>
                                                    {item.discountPercentage > 0 && (
                                                        <span className={styles.discount}>
                                                            -{item.discountPercentage}%
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            <td className={styles.textCenter}>
                                                <span className={item.isActive ? styles.badgeSuccess : styles.badgeInactive}>
                                                    {item.isActive ? 'Đang bán' : 'Ngừng bán'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* GRID VIEW */}
            {viewMode === 'grid' && (
                <div className={styles.gridContainer}>
                    {filteredItems.length === 0 ? (
                        <div className={styles.gridEmptyState}>
                            <Package size={48} className={styles.emptyIcon} />
                            <p>Không tìm thấy món ăn nào</p>
                        </div>
                    ) : (
                        filteredItems.map((item) => (
                            <div key={item.id} className={styles.gridCard}>
                                {/* Image */}
                                <div className={styles.gridCardImage}>
                                    {item.imageUrl ? (
                                        <img src={getImageUrl(item.imageUrl)} alt={item.name} />
                                    ) : (
                                        <div className={styles.gridCardImagePlaceholder}>
                                            <Package size={48} />
                                        </div>
                                    )}

                                    {/* Badges */}
                                    <div className={styles.gridCardBadges}>
                                        <span className={item.isActive ? styles.gridBadgeSuccess : styles.gridBadgeInactive}>
                                            {item.isActive ? 'Đang bán' : 'Ngừng bán'}
                                        </span>
                                        {item.discountPercentage > 0 && (
                                            <span className={styles.gridBadgeDanger}>
                                                -{item.discountPercentage}%
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Content */}
                                <div className={styles.gridCardContent}>
                                    <h3 className={styles.gridCardTitle}>{item.name}</h3>
                                    <p className={styles.gridCardCategory}>{item.categoryName}</p>

                                    <div className={styles.gridCardPrice}>
                                        <div>
                                            <div className={styles.gridCardFinalPrice}>
                                                {item.finalPrice?.toLocaleString('vi-VN')}đ
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Loading Overlay */}
            {loading && (
                <div className={styles.loadingOverlay}>
                    <div className={styles.loadingModal}>
                        <RefreshCw size={48} className={styles.spinIcon} />
                        <p>Đang tải menu...</p>
                    </div>
                </div>
            )}
        </div>
    );
}