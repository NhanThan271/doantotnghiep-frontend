import React, { useEffect, useState } from 'react';
import { Tag, Calendar, Percent, DollarSign, Eye, Package, ChevronUp, Store, RefreshCw } from 'lucide-react';
import styles from '../../layouts/AdminLayout.module.css';

export default function ApplyPromotions() {
    const [promotions, setPromotions] = useState([]);
    const [currentBranch, setCurrentBranch] = useState(null);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState(null);
    const [foods, setFoods] = useState({});
    const API_BASE_URL = 'http://localhost:8080';

    // Lấy thông tin chi nhánh hiện tại
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

    // Lấy danh sách promotions theo chi nhánh
    const fetchPromotions = async () => {
        if (!currentBranch?.id) return;

        const token = localStorage.getItem('token');
        setLoading(true);

        try {
            // Lấy tất cả promotions với DTO (có đầy đủ foods)
            const response = await fetch(`${API_BASE_URL}/api/promotions/all-dto`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Không thể lấy danh sách khuyến mãi');
            }

            const allPromotions = await response.json();
            console.log('All promotions:', allPromotions);

            // Lọc promotions theo chi nhánh hiện tại
            const branchPromotions = allPromotions.filter(promo =>
                promo.branchIds && promo.branchIds.includes(currentBranch.id)
            );

            console.log('Branch promotions:', branchPromotions);

            // Debug: Kiểm tra foods trong từng promotion
            branchPromotions.forEach((promo, index) => {
                console.log(`Promotion ${index} (${promo.name}):`, {
                    id: promo.id,
                    foodIds: promo.foodIds,
                    foods: promo.foods,
                    foodsLength: promo.foods?.length
                });
            });

            setPromotions(branchPromotions);

        } catch (err) {
            console.error('Lỗi khi lấy dữ liệu promotions:', err);
            alert('Không thể tải danh sách khuyến mãi. Vui lòng thử lại.');
            setPromotions([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCurrentBranch();
    }, []);

    useEffect(() => {
        if (currentBranch) {
            fetchPromotions();
        }
    }, [currentBranch]);

    // Bật/tắt promotion
    const togglePromotion = async (promotion) => {
        const token = localStorage.getItem('token');
        const updatedPromotion = {
            name: promotion.name,
            description: promotion.description,
            discountPercentage: promotion.discountPercentage,
            discountAmount: promotion.discountAmount,
            startDate: promotion.startDate,
            endDate: promotion.endDate,
            isActive: !promotion.isActive,
            foodIds: promotion.foodIds || [],
            branchIds: promotion.branchIds || []
        };

        try {
            const response = await fetch(`${API_BASE_URL}/api/promotions/${promotion.id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updatedPromotion)
            });

            if (!response.ok) {
                throw new Error('Cập nhật thất bại');
            }

            alert(`${promotion.isActive ? 'Tắt' : 'Bật'} khuyến mãi thành công!`);
            fetchPromotions();

        } catch (err) {
            console.error(err);
            alert('Không thể cập nhật khuyến mãi. Vui lòng thử lại!');
        }
    };

    // Mở/đóng chi tiết sản phẩm
    const toggleExpand = (promotionId) => {
        if (expandedId === promotionId) {
            setExpandedId(null);
        } else {
            setExpandedId(promotionId);
        }
    };

    // Format date
    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN');
    };

    // Kiểm tra promotion còn trong thời hạn
    const isPromotionValid = (promotion) => {
        const now = new Date();
        const start = new Date(promotion.startDate);
        const end = new Date(promotion.endDate);
        return now >= start && now <= end;
    };

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
                        <h2 className={styles.pageTitle}>Áp dụng Khuyến mãi</h2>
                        <p className={styles.branchInfo}>
                            <Store size={16} />
                            <span className={styles.branchName}>{currentBranch.name}</span>
                            {currentBranch.address && (
                                <span className={styles.branchAddress}>• {currentBranch.address}</span>
                            )}
                        </p>
                    </div>

                    <button
                        onClick={fetchPromotions}
                        disabled={loading}
                        className={`${styles.refreshButton} ${loading ? styles.refreshButtonDisabled : ''}`}
                    >
                        <RefreshCw size={18} className={loading ? styles.spinIcon : ''} />
                        Làm mới
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className={styles.tableCard}>
                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th style={{ width: '300px' }}>Tên chương trình</th>
                                <th style={{ width: '120px' }}>Giảm giá</th>
                                <th style={{ width: '200px' }}>Thời gian</th>
                                <th className={styles.textCenter} style={{ width: '120px' }}>Trạng thái</th>
                                <th className={styles.textCenter} style={{ width: '180px' }}>Hành động</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className={styles.emptyState}>
                                        <RefreshCw size={48} className={styles.spinIcon} style={{ margin: '0 auto 16px' }} />
                                        <p>Đang tải dữ liệu...</p>
                                    </td>
                                </tr>
                            ) : promotions.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className={styles.emptyState}>
                                        <Tag size={48} className={styles.emptyIcon} />
                                        <p>Chưa có chương trình khuyến mãi nào cho chi nhánh này</p>
                                    </td>
                                </tr>
                            ) : (
                                <>
                                    {promotions.map(p => {
                                        const isValid = isPromotionValid(p);
                                        const isExpanded = expandedId === p.id;
                                        const promotionFoods = p.foods || [];

                                        return (
                                            <React.Fragment key={p.id}>
                                                <tr>
                                                    <td>
                                                        <div className={styles.foodCell}>
                                                            <div style={{
                                                                width: '40px',
                                                                height: '40px',
                                                                background: 'rgba(212, 175, 55, 0.1)',
                                                                borderRadius: '8px',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                flexShrink: 0
                                                            }}>
                                                                <Tag size={20} color="var(--color-primary)" />
                                                            </div>
                                                            <div>
                                                                <div className={styles.foodName}>
                                                                    {p.name}
                                                                </div>
                                                                {p.description && (
                                                                    <div style={{
                                                                        fontSize: '12px',
                                                                        color: 'var(--color-text-secondary)',
                                                                        maxWidth: '250px',
                                                                        overflow: 'hidden',
                                                                        textOverflow: 'ellipsis',
                                                                        whiteSpace: 'nowrap'
                                                                    }}>
                                                                        {p.description}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                            {p.discountPercentage && (
                                                                <div style={{
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: '4px',
                                                                    color: 'var(--color-primary)',
                                                                    fontWeight: '600',
                                                                    fontSize: '14px'
                                                                }}>
                                                                    <Percent size={14} />
                                                                    <span>{p.discountPercentage}%</span>
                                                                </div>
                                                            )}
                                                            {p.discountAmount && (
                                                                <div style={{
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: '4px',
                                                                    color: 'var(--color-primary)',
                                                                    fontWeight: '600',
                                                                    fontSize: '14px'
                                                                }}>
                                                                    <DollarSign size={14} />
                                                                    <span>{parseFloat(p.discountAmount).toLocaleString('vi-VN')}đ</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '6px',
                                                            fontSize: '13px'
                                                        }}>
                                                            <Calendar size={14} style={{ color: 'var(--color-text-secondary)' }} />
                                                            <div>
                                                                <div>{formatDate(p.startDate)}</div>
                                                                <div style={{ color: 'var(--color-text-secondary)', fontSize: '12px' }}>
                                                                    đến {formatDate(p.endDate)}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className={styles.textCenter}>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center' }}>
                                                            <span className={isValid ? styles.badgeSuccess : styles.badgeDanger}>
                                                                {isValid ? 'Còn hạn' : 'Hết hạn'}
                                                            </span>
                                                            <span className={p.isActive ? styles.badgePrimary : styles.badgeInactive}>
                                                                {p.isActive ? 'Đang bật' : 'Đã tắt'}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className={styles.textCenter}>
                                                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                            <button
                                                                onClick={() => toggleExpand(p.id)}
                                                                style={{
                                                                    padding: '8px 12px',
                                                                    background: 'rgba(99, 102, 241, 0.1)',
                                                                    color: '#6366F1',
                                                                    border: '1px solid rgba(99, 102, 241, 0.3)',
                                                                    borderRadius: '8px',
                                                                    cursor: 'pointer',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: '4px',
                                                                    transition: 'all 0.2s',
                                                                    fontSize: '13px',
                                                                    fontWeight: '500'
                                                                }}
                                                                onMouseOver={(e) => {
                                                                    e.currentTarget.style.background = 'rgba(99, 102, 241, 0.2)';
                                                                }}
                                                                onMouseOut={(e) => {
                                                                    e.currentTarget.style.background = 'rgba(99, 102, 241, 0.1)';
                                                                }}
                                                            >
                                                                {isExpanded ? <ChevronUp size={16} /> : <Eye size={16} />}
                                                                {isExpanded ? 'Ẩn' : 'Xem SP'}
                                                            </button>
                                                            <button
                                                                onClick={() => togglePromotion(p)}
                                                                style={{
                                                                    padding: '8px 16px',
                                                                    background: p.isActive ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                                                                    color: p.isActive ? '#EF4444' : '#22C55E',
                                                                    border: p.isActive ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(34, 197, 94, 0.3)',
                                                                    borderRadius: '8px',
                                                                    cursor: 'pointer',
                                                                    transition: 'all 0.2s',
                                                                    fontSize: '13px',
                                                                    fontWeight: '600'
                                                                }}
                                                                onMouseOver={(e) => {
                                                                    if (p.isActive) {
                                                                        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                                                                    } else {
                                                                        e.currentTarget.style.background = 'rgba(34, 197, 94, 0.2)';
                                                                    }
                                                                }}
                                                                onMouseOut={(e) => {
                                                                    if (p.isActive) {
                                                                        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                                                                    } else {
                                                                        e.currentTarget.style.background = 'rgba(34, 197, 94, 0.1)';
                                                                    }
                                                                }}
                                                            >
                                                                {p.isActive ? 'Tắt' : 'Bật'}
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                                {isExpanded && (
                                                    <tr>
                                                        <td colSpan="5" style={{
                                                            padding: '20px 24px',
                                                            background: '#F9FAFB',
                                                            borderBottom: '1px solid #E5E7EB'
                                                        }}>
                                                            <div style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '8px',
                                                                marginBottom: '12px',
                                                                color: '#374151',
                                                                fontWeight: '600'
                                                            }}>
                                                                <Package size={18} />
                                                                <span>Sản phẩm được áp dụng ({p.foods?.length || 0})</span>
                                                            </div>
                                                            {(!p.foods || p.foods.length === 0) ? (
                                                                <p style={{
                                                                    color: '#6B7280',
                                                                    fontSize: '13px',
                                                                    fontStyle: 'italic',
                                                                    margin: 0
                                                                }}>
                                                                    Chưa có sản phẩm nào được áp dụng
                                                                </p>
                                                            ) : (
                                                                <div style={{
                                                                    display: 'grid',
                                                                    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                                                                    gap: '12px'
                                                                }}>
                                                                    {p.foods.map(food => (
                                                                        <div key={food.id} style={{
                                                                            padding: '12px',
                                                                            background: '#fff',
                                                                            borderRadius: '8px',
                                                                            border: '1px solid #E5E7EB',
                                                                            display: 'flex',
                                                                            gap: '12px',
                                                                            alignItems: 'center'
                                                                        }}>
                                                                            {food.imageUrl ? (
                                                                                <img
                                                                                    src={food.imageUrl.startsWith('http') ? food.imageUrl : `${API_BASE_URL}${food.imageUrl.startsWith('/') ? '' : '/'}${food.imageUrl}`}
                                                                                    alt={food.name}
                                                                                    style={{
                                                                                        width: '50px',
                                                                                        height: '50px',
                                                                                        objectFit: 'cover',
                                                                                        borderRadius: '6px',
                                                                                        flexShrink: 0
                                                                                    }}
                                                                                />
                                                                            ) : (
                                                                                <div style={{
                                                                                    width: '50px',
                                                                                    height: '50px',
                                                                                    background: 'rgba(212, 175, 55, 0.1)',
                                                                                    borderRadius: '6px',
                                                                                    display: 'flex',
                                                                                    alignItems: 'center',
                                                                                    justifyContent: 'center',
                                                                                    flexShrink: 0
                                                                                }}>
                                                                                    <Package size={24} style={{ color: 'var(--color-primary)' }} />
                                                                                </div>
                                                                            )}
                                                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                                                <div style={{
                                                                                    fontWeight: '600',
                                                                                    fontSize: '14px',
                                                                                    color: '#6B7280',
                                                                                    marginBottom: '4px',
                                                                                    overflow: 'hidden',
                                                                                    textOverflow: 'ellipsis',
                                                                                    whiteSpace: 'nowrap'
                                                                                }}>
                                                                                    {food.name}
                                                                                </div>
                                                                                <div style={{
                                                                                    fontSize: '12px',
                                                                                    color: '#6B7280',
                                                                                    display: 'flex',
                                                                                    gap: '8px',
                                                                                    alignItems: 'center'
                                                                                }}>
                                                                                    <span style={{ color: 'var(--color-primary)', fontWeight: '600' }}>
                                                                                        {food.price?.toLocaleString('vi-VN')}đ
                                                                                    </span>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        );
                                    })}
                                </>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}