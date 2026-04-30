import React, { useEffect, useState } from 'react';
import { Package, TrendingUp, DollarSign, ShoppingCart, Users, Building2, Award, Activity } from 'lucide-react';
import styles from '../../layouts/AdminLayout.module.css';

export default function Dashboard() {
    const [stats, setStats] = useState({
        totalProducts: 0,
        todayRevenue: 0,
        totalRevenue: 0,
        totalOrders: 0,
        totalEmployees: 0,
        pendingOrders: 0
    });

    const [branchRevenue, setBranchRevenue] = useState([]);
    const [topProducts, setTopProducts] = useState([]);
    const [branchStatus, setBranchStatus] = useState({ active: 0, inactive: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('token');
        const API_BASE = 'http://localhost:8080';

        Promise.all([
            // Tổng sản phẩm
            fetch(`${API_BASE}/api/foods`, {
                headers: { 'Authorization': `Bearer ${token}` }
            }).then(res => res.ok ? res.json() : []).catch(() => []),

            // Tổng doanh thu & đơn hàng
            fetch(`${API_BASE}/api/admin/revenue/overview`, {
                headers: { 'Authorization': `Bearer ${token}` }
            }).then(res => res.ok ? res.json() : {}).catch(() => ({})),

            // Tổng nhân viên
            fetch(`${API_BASE}/api/users`, {
                headers: { 'Authorization': `Bearer ${token}` }
            }).then(res => res.ok ? res.json() : []).catch(() => []),

            // Danh sách đơn hàng (để tính theo chi nhánh)
            fetch(`${API_BASE}/api/customer/orders`, {
                headers: { 'Authorization': `Bearer ${token}` }
            }).then(res => res.ok ? res.json() : []).catch(() => []),

            // Danh sách chi nhánh
            fetch(`${API_BASE}/api/branches`, {
                headers: { 'Authorization': `Bearer ${token}` }
            }).then(res => res.ok ? res.json() : []).catch(() => []),
        ])
            .then(([productsData, revenueData, usersData, ordersData, branchesData, orderItemsData]) => {
                console.log('Products:', productsData);
                console.log('Revenue:', revenueData);
                console.log('Orders:', ordersData);
                console.log('Branches:', branchesData);

                // Xử lý stats cơ bản
                const totalProducts = Array.isArray(productsData) ? productsData.length : 0;
                const totalRevenue = revenueData.totalRevenue || 0;
                const totalOrders = revenueData.totalOrders || 0;

                const today = new Date().toLocaleDateString('en-CA', {
                    timeZone: 'Asia/Ho_Chi_Minh'
                });

                const dailyRevenue = revenueData.dailyRevenue || [];
                const todayData = dailyRevenue.find(d => {
                    const revenueDate = d.date?.split('T')[0];
                    return revenueDate === today;
                });

                const todayRevenue = todayData ? todayData.revenue : 0;
                const totalEmployees = Array.isArray(usersData)
                    ? usersData.filter(user => user.role === 'EMPLOYEE').length
                    : 0;

                setStats({
                    totalProducts,
                    todayRevenue,
                    totalRevenue,
                    totalOrders,
                    totalEmployees,
                    pendingOrders: 0
                });

                // Tính doanh thu theo chi nhánh
                calculateBranchRevenue(ordersData, branchesData);

                // Tính top sản phẩm bán chạy
                calculateTopProductsFromOrders(ordersData);

                // Đếm chi nhánh active/inactive
                if (Array.isArray(branchesData)) {
                    const active = branchesData.filter(b => b.isActive === true).length;
                    const inactive = branchesData.filter(b => b.isActive === false).length;
                    setBranchStatus({ active, inactive });
                }
            })
            .catch(err => {
                console.error('Lỗi khi lấy dữ liệu dashboard:', err);
            })
            .finally(() => {
                setLoading(false);
            });
    }, []);

    const calculateBranchRevenue = (orders, branches) => {

        console.log('=== KIỂM TRA DỮ LIỆU ===');
        console.log('Tổng số orders:', orders?.length);
        console.log('Chi tiết orders:', orders);
        console.log('Tổng số branches:', branches?.length);
        console.log('Chi tiết branches:', branches);

        if (!Array.isArray(orders) || !Array.isArray(branches)) {
            console.log('❌ Dữ liệu không hợp lệ');
            return;
        }

        if (!Array.isArray(orders) || !Array.isArray(branches)) return;

        const paidOrders = orders.filter(o => o.status === 'PAID');
        console.log('Số đơn hàng PAID:', paidOrders.length);
        console.log('Mẫu đơn hàng PAID:', paidOrders[0]);
        console.log('Branch trong order:', paidOrders[0]?.branch);
        console.log('BranchId trong order:', paidOrders[0]?.branchId);
        const revenueByBranch = {};

        paidOrders.forEach(order => {
            const branchId = order.branch?.id;
            if (branchId) {
                if (!revenueByBranch[branchId]) {
                    const branch = branches.find(b => b.id === branchId);
                    revenueByBranch[branchId] = {
                        id: branchId,
                        name: branch?.name || `Chi nhánh ${branchId}`,
                        revenue: 0,
                        orders: 0
                    };
                }
                revenueByBranch[branchId].revenue += order.totalAmount || 0;
                revenueByBranch[branchId].orders += 1;
            }
        });

        const branchRevenueArray = Object.values(revenueByBranch)
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5); // Top 5 chi nhánh

        setBranchRevenue(branchRevenueArray);
    };

    const calculateTopProductsFromOrders = (orders) => {
        if (!Array.isArray(orders)) return;

        console.log('=== TÍNH TOP SẢN PHẨM TỪ ORDERS ===');

        const productSales = {};

        // Chỉ tính các đơn đã thanh toán
        const paidOrders = orders.filter(o => o.status === 'PAID');
        console.log('Số đơn PAID:', paidOrders.length);

        paidOrders.forEach(order => {
            if (!order.items || !Array.isArray(order.items)) return;

            order.items.forEach(item => {
                const productId = item.product?.id;
                const productName = item.product?.name || 'Sản phẩm';
                const quantity = item.quantity || 0;
                const price = item.price || 0;
                const revenue = price * quantity;

                if (productId) {
                    if (!productSales[productId]) {
                        productSales[productId] = {
                            id: productId,
                            name: productName,
                            quantity: 0,
                            revenue: 0
                        };
                    }
                    productSales[productId].quantity += quantity;
                    productSales[productId].revenue += revenue;
                }
            });
        });

        const topProductsArray = Object.values(productSales)
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 5);

        console.log('Top sản phẩm:', topProductsArray);
        setTopProducts(topProductsArray);
    };

    const statsCards = [
        {
            title: 'Tổng sản phẩm',
            value: stats.totalProducts,
            icon: Package,
            color: '#3B82F6',
            bgColor: 'rgba(59, 130, 246, 0.1)'
        },
        {
            title: 'Doanh thu hôm nay',
            value: stats.todayRevenue.toLocaleString('vi-VN') + 'đ',
            icon: TrendingUp,
            color: '#10B981',
            bgColor: 'rgba(16, 185, 129, 0.1)'
        },
        {
            title: 'Tổng doanh thu',
            value: stats.totalRevenue.toLocaleString('vi-VN') + 'đ',
            icon: DollarSign,
            color: '#D4AF37',
            bgColor: 'rgba(212, 175, 55, 0.1)'
        },
        {
            title: 'Tổng đơn hàng',
            value: stats.totalOrders,
            icon: ShoppingCart,
            color: '#8B5CF6',
            bgColor: 'rgba(139, 92, 246, 0.1)'
        },
        {
            title: 'Tổng nhân viên',
            value: stats.totalEmployees,
            icon: Users,
            color: '#F59E0B',
            bgColor: 'rgba(245, 158, 11, 0.1)'
        }
    ];

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '400px',
                color: 'var(--color-text-secondary)'
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div className="spinner" style={{
                        width: '40px',
                        height: '40px',
                        border: '4px solid var(--color-border)',
                        borderTop: '4px solid var(--color-secondary)',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        margin: '0 auto 16px'
                    }}></div>
                    <p>Đang tải dữ liệu...</p>
                </div>
            </div>
        );
    }

    return (
        <div>
            <div style={{ marginBottom: '32px' }}>
                <h2 style={{
                    fontSize: '32px',
                    fontWeight: '800',
                    marginBottom: '8px',
                    color: '#D4AF37',
                    letterSpacing: '-0.5px',

                }}>
                    Dashboard
                </h2>
                <p style={{
                    color: 'var(--color-text-secondary)',
                    fontSize: '14px'
                }}>
                    Tổng quan hoạt động kinh doanh
                </p>
            </div>

            {/* Stats Cards */}
            <div className={styles['grid-4']}>
                {statsCards.map((stat, index) => {
                    const Icon = stat.icon;
                    return (
                        <div
                            key={index}
                            className={styles.card}
                            style={{
                                position: 'relative',
                                overflow: 'hidden',
                                transition: 'transform 0.2s, box-shadow 0.2s',
                                cursor: 'pointer'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-4px)';
                                e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.4)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '';
                            }}
                        >
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'flex-start',
                                marginBottom: '16px'
                            }}>
                                <div>
                                    <p style={{
                                        color: 'var(--color-text-secondary)',
                                        fontSize: '14px',
                                        marginBottom: '8px',
                                        fontWeight: '500'
                                    }}>
                                        {stat.title}
                                    </p>
                                    <h3 style={{
                                        fontSize: '28px',
                                        fontWeight: '700',
                                        color: 'var(--color-text-secondary)',
                                        margin: 0
                                    }}>
                                        {stat.value}
                                    </h3>
                                </div>
                                <div style={{
                                    width: '48px',
                                    height: '48px',
                                    borderRadius: '12px',
                                    background: stat.bgColor,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0
                                }}>
                                    <Icon size={24} color={stat.color} />
                                </div>
                            </div>
                            {stat.trend && (
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    fontSize: '12px',
                                    color: '#10B981',
                                    fontWeight: '600'
                                }}>
                                </div>
                            )}
                            <div style={{
                                position: 'absolute',
                                right: '-20px',
                                bottom: '-20px',
                                width: '100px',
                                height: '100px',
                                borderRadius: '50%',
                                background: stat.bgColor,
                                opacity: 0.3,
                                filter: 'blur(40px)'
                            }}></div>
                        </div>
                    );
                })}
            </div>

            {/* Doanh thu theo chi nhánh & Top sản phẩm */}
            <div className={styles['grid-2']} style={{ marginTop: '32px' }}>
                {/* Doanh thu theo chi nhánh */}
                <div className={styles.card}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '20px'
                    }}>
                        <Building2 size={20} color="#3B82F6" />
                        <h4 style={{
                            fontSize: '16px',
                            fontWeight: '600',
                            color: 'var(--color-text-secondary)',
                            margin: 0
                        }}>
                            Doanh thu theo Chi nhánh
                        </h4>
                    </div>
                    {branchRevenue.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {branchRevenue.map((branch, idx) => (
                                <div key={branch.id} style={{
                                    padding: '12px',
                                    background: 'var(--color-bg-secondary)',
                                    borderRadius: '8px',
                                    border: '1px solid var(--color-border)'
                                }}>
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        marginBottom: '8px'
                                    }}>
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px'
                                        }}>
                                            <div style={{
                                                width: '24px',
                                                height: '24px',
                                                borderRadius: '6px',
                                                color: 'var(--color-text-secondary)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '12px',
                                                fontWeight: '600'
                                            }}>
                                                {idx + 1}
                                            </div>
                                            <span style={{
                                                fontSize: '14px',
                                                fontWeight: '600',
                                                color: 'var(--color-text-secondary)'
                                            }}>
                                                {branch.name}
                                            </span>
                                        </div>
                                        <span style={{
                                            fontSize: '14px',
                                            fontWeight: '700',
                                            color: 'var(--color-text-secondary)'
                                        }}>
                                            {branch.revenue.toLocaleString('vi-VN')}đ
                                        </span>
                                    </div>
                                    <div style={{
                                        fontSize: '12px',
                                        color: 'var(--color-text-secondary)',
                                        paddingLeft: '32px'
                                    }}>
                                        {branch.orders} đơn hàng
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p style={{
                            textAlign: 'center',
                            color: 'var(--color-text-secondary)',
                            fontSize: '14px',
                            padding: '20px'
                        }}>
                            Chưa có dữ liệu doanh thu
                        </p>
                    )}
                </div>

                {/* Top sản phẩm bán chạy */}
                <div className={styles.card}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '20px'
                    }}>
                        <Award size={20} color="#F59E0B" />
                        <h4 style={{
                            fontSize: '16px',
                            fontWeight: '600',
                            color: 'var(--color-text-secondary)',
                            margin: 0
                        }}>
                            Top Sản phẩm Bán chạy
                        </h4>
                    </div>
                    {topProducts.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {topProducts.map((product, idx) => (
                                <div key={product.id} style={{
                                    padding: '12px',
                                    background: 'var(--color-bg-secondary)',
                                    borderRadius: '8px',
                                    border: '1px solid var(--color-border)'
                                }}>
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        marginBottom: '8px'
                                    }}>
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            flex: 1
                                        }}>
                                            <div style={{
                                                width: '24px',
                                                height: '24px',
                                                borderRadius: '6px',
                                                background: idx === 0 ? '#F59E0B' : idx === 1 ? '#8B5CF6' : '#3B82F6',
                                                color: 'var(--color-text-secondary)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '12px',
                                                fontWeight: '600'
                                            }}>
                                                {idx + 1}
                                            </div>
                                            <span style={{
                                                fontSize: '14px',
                                                fontWeight: '600',
                                                color: 'var(--color-text-secondary)'
                                            }}>
                                                {product.name}
                                            </span>
                                        </div>
                                        <span style={{
                                            fontSize: '14px',
                                            fontWeight: '700',
                                            color: 'var(--color-secondary)'
                                        }}>
                                            {product.quantity} sp
                                        </span>
                                    </div>
                                    <div style={{
                                        fontSize: '12px',
                                        color: 'var(--color-text-secondary)',
                                        paddingLeft: '32px'
                                    }}>
                                        Doanh thu: {product.revenue.toLocaleString('vi-VN')}đ
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p style={{
                            textAlign: 'center',
                            color: 'var(--color-text-secondary)',
                            fontSize: '14px',
                            padding: '20px'
                        }}>
                            Chưa có dữ liệu sản phẩm
                        </p>
                    )}
                </div>
            </div>

            {/* Thống kê nhanh */}
            <div className={styles['grid-2']} style={{ marginTop: '32px' }}>
                {/* Chi nhánh hoạt động */}
                <div className={styles.card}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '20px'
                    }}>
                        <Activity size={20} color="#10B981" />
                        <h4 style={{
                            fontSize: '16px',
                            fontWeight: '600',
                            color: 'var(--color-text-secondary)',
                            margin: 0
                        }}>
                            Trạng thái Chi nhánh
                        </h4>
                    </div>
                    <div style={{ display: 'flex', gap: '16px' }}>
                        <div style={{
                            flex: 1,
                            padding: '16px',
                            background: 'rgba(16, 185, 129, 0.1)',
                            borderRadius: '8px',
                            border: '1px solid rgba(16, 185, 129, 0.3)'
                        }}>
                            <div style={{
                                fontSize: '32px',
                                fontWeight: '700',
                                color: '#10B981',
                                marginBottom: '4px'
                            }}>
                                {branchStatus.active}
                            </div>
                            <div style={{
                                fontSize: '14px',
                                color: 'var(--color-text-secondary)'
                            }}>
                                Đang hoạt động
                            </div>
                        </div>
                        <div style={{
                            flex: 1,
                            padding: '16px',
                            background: 'rgba(239, 68, 68, 0.1)',
                            borderRadius: '8px',
                            border: '1px solid rgba(239, 68, 68, 0.3)'
                        }}>
                            <div style={{
                                fontSize: '32px',
                                fontWeight: '700',
                                color: '#EF4444',
                                marginBottom: '4px'
                            }}>
                                {branchStatus.inactive}
                            </div>
                            <div style={{
                                fontSize: '14px',
                                color: 'var(--color-text-secondary)'
                            }}>
                                Tạm khóa
                            </div>
                        </div>
                    </div>
                </div>

                {/* Doanh thu */}
                <div className={styles.card}>
                    <h4 style={{
                        fontSize: '16px',
                        fontWeight: '600',
                        marginBottom: '16px',
                        color: 'var(--color-text-secondary)'
                    }}>
                        Doanh thu
                    </h4>
                    <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            marginBottom: '8px'
                        }}>
                            <span style={{ color: 'var(--color-text-secondary)' }}>
                                Hôm nay
                            </span>
                            <span style={{
                                fontWeight: '600',
                                color: 'var(--color-text-secondary)'
                            }}>
                                {stats.todayRevenue.toLocaleString('vi-VN')}đ
                            </span>
                        </div>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            marginBottom: '8px'
                        }}>
                            <span style={{ color: 'var(--color-text-secondary)' }}>
                                Tổng cộng
                            </span>
                            <span style={{
                                fontWeight: '600',
                                color: 'var(--color-text-secondary)'
                            }}>
                                {stats.totalRevenue.toLocaleString('vi-VN')}đ
                            </span>
                        </div>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between'
                        }}>
                            <span style={{ color: 'var(--color-text-secondary)' }}>
                                Trung bình/đơn
                            </span>
                            <span style={{
                                fontWeight: '600',
                                color: 'var(--color-text-secondary)'
                            }}>
                                {stats.totalOrders > 0
                                    ? Math.round(stats.totalRevenue / stats.totalOrders).toLocaleString('vi-VN')
                                    : 0
                                }đ
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}