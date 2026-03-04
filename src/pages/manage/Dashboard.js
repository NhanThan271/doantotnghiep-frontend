import React, { useEffect, useState } from 'react';
import { Store, TrendingUp, DollarSign, Users, Clock, Calendar, Activity, CheckCircle, LayoutGrid } from 'lucide-react';

export default function BranchDashboard() {
    const [stats, setStats] = useState({
        branchName: '',
        todayRevenue: 0,
        monthRevenue: 0,
        todayOrders: 0,
        occupiedTables: 0,
        totalTables: 0,
        activeEmployees: 0,
        completedOrders: 0
    });
    const [loading, setLoading] = useState(true);
    const [recentOrders, setRecentOrders] = useState([]);
    const [error, setError] = useState(null);

    const API_BASE = 'http://localhost:8080';

    useEffect(() => {
        fetchBranchData();
    }, []);

    const fetchBranchData = async () => {
        setLoading(true);
        setError(null);

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('Vui lòng đăng nhập lại');
            }

            const headers = { Authorization: `Bearer ${token}` };

            // 1. LẤY BRANCH ID
            const branchId = await getBranchId(headers);
            if (!branchId) {
                throw new Error('Không tìm thấy chi nhánh của bạn');
            }

            // 2. GỌI TẤT CẢ API SONG SONG
            const [branchData, ordersData, tablesData, shiftsData] = await Promise.all([
                fetchBranch(branchId, headers),
                fetchOrders(headers),
                fetchTables(headers),
                fetchShifts(branchId, headers)
            ]);

            // 3. LỌC DỮ LIỆU THEO CHI NHÁNH
            const branchOrders = filterOrdersByBranch(ordersData, branchId);
            const branchTables = filterTablesByBranch(tablesData, branchId);
            const todayShifts = filterTodayShifts(shiftsData);

            // 4. TÍNH TOÁN CÁC CHỈ SỐ
            const today = getTodayDateString();
            const todayOrders = filterTodayOrders(branchOrders, today);

            const calculatedStats = {
                branchName: branchData.name || 'Chi nhánh',
                todayRevenue: calculateRevenue(todayOrders, 'PAID'),
                monthRevenue: calculateMonthRevenue(branchOrders),
                todayOrders: todayOrders.length,
                occupiedTables: countOccupiedTables(branchTables),
                totalTables: branchTables.length,
                activeEmployees: todayShifts.length,
                completedOrders: countCompletedOrders(todayOrders)
            };

            setStats(calculatedStats);

            // 5. LẤY 5 ĐƠN GẦN NHẤT
            const recent = getRecentOrders(branchOrders, 5);
            setRecentOrders(recent);

            console.log('✅ Dashboard data loaded successfully');

        } catch (error) {
            console.error('❌ Lỗi khi tải dashboard:', error);
            setError(error.message || 'Không thể tải dữ liệu dashboard');
        } finally {
            setLoading(false);
        }
    };

    // ==================== HELPER FUNCTIONS ====================

    const getBranchId = async (headers) => {
        const userStr = localStorage.getItem('user');
        const user = userStr ? JSON.parse(userStr) : null;
        let branchId = user?.branch?.id || user?.branchId;

        if (!branchId) {
            const res = await fetch(`${API_BASE}/api/auth/me`, { headers });
            if (!res.ok) throw new Error('Không thể lấy thông tin tài khoản');
            const userData = await res.json();
            branchId = userData.branch?.id || userData.branchId;
        }

        return branchId;
    };

    const fetchBranch = async (branchId, headers) => {
        const res = await fetch(`${API_BASE}/api/branches/${branchId}`, { headers });
        if (!res.ok) throw new Error('Không thể tải thông tin chi nhánh');
        return res.json();
    };

    const fetchOrders = async (headers) => {
        const res = await fetch(`${API_BASE}/api/customer/orders`, { headers });
        if (!res.ok) throw new Error('Không thể tải đơn hàng');
        return res.json();
    };

    const fetchTables = async (headers) => {
        const res = await fetch(`${API_BASE}/api/customer/tables`, { headers });
        if (!res.ok) throw new Error('Không thể tải danh sách bàn');
        return res.json();
    };

    const fetchShifts = async (branchId, headers) => {
        const res = await fetch(`${API_BASE}/api/work-shifts/branch/${branchId}`, { headers });
        if (!res.ok) throw new Error('Không thể tải ca làm việc');
        return res.json();
    };

    const filterOrdersByBranch = (orders, branchId) => {
        return orders.filter(order => {
            // Kiểm tra qua table.branch hoặc branch trực tiếp
            const orderBranchId = order.branch?.id || order.table?.branch?.id;
            return orderBranchId === branchId;
        });
    };

    const filterTablesByBranch = (tables, branchId) => {
        return tables.filter(table => table.branch?.id === branchId);
    };

    const filterTodayShifts = (shifts) => {
        const today = getTodayDateString();
        return shifts.filter(shift => {
            const shiftDate = shift.shiftDate?.split('T')[0];
            return shiftDate === today;
        });
    };

    const getTodayDateString = () => {
        return new Date().toLocaleDateString('en-CA', {
            timeZone: 'Asia/Ho_Chi_Minh'
        });
    };

    const filterTodayOrders = (orders, today) => {
        return orders.filter(order => {
            const orderDate = order.createdAt?.split('T')[0] ||
                order.orderDate?.split('T')[0];
            return orderDate === today;
        });
    };

    const calculateRevenue = (orders, status) => {
        return orders
            .filter(order => order.status === status)
            .reduce((sum, order) => sum + parseFloat(order.totalAmount || 0), 0);
    };

    const calculateMonthRevenue = (orders) => {
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();

        return orders
            .filter(order => {
                if (order.status !== 'PAID') return false;
                const orderDate = new Date(order.createdAt || order.orderDate);
                return orderDate.getMonth() === currentMonth &&
                    orderDate.getFullYear() === currentYear;
            })
            .reduce((sum, order) => sum + parseFloat(order.totalAmount || 0), 0);
    };

    const countOccupiedTables = (tables) => {
        return tables.filter(table => table.status === 'OCCUPIED').length;
    };

    const countCompletedOrders = (orders) => {
        return orders.filter(order =>
            order.status === 'COMPLETED' || order.status === 'PAID'
        ).length;
    };

    const getRecentOrders = (orders, limit) => {
        return orders
            .sort((a, b) => {
                const dateA = new Date(a.createdAt || a.orderDate);
                const dateB = new Date(b.createdAt || b.orderDate);
                return dateB - dateA;
            })
            .slice(0, limit);
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(amount || 0);
    };

    const formatDateTime = (dateTime) => {
        if (!dateTime) return 'N/A';
        const date = new Date(dateTime);
        return date.toLocaleString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getOrderStatusColor = (status) => {
        const colors = {
            PENDING: { bg: 'rgba(251, 191, 36, 0.1)', text: '#FBBF24' },
            CONFIRMED: { bg: 'rgba(59, 130, 246, 0.1)', text: '#3B82F6' },
            PREPARING: { bg: 'rgba(139, 92, 246, 0.1)', text: '#8B5CF6' },
            COMPLETED: { bg: 'rgba(16, 185, 129, 0.1)', text: '#10B981' },
            PAID: { bg: 'rgba(34, 197, 94, 0.1)', text: '#22C55E' },
            CANCELED: { bg: 'rgba(239, 68, 68, 0.1)', text: '#EF4444' }
        };
        return colors[status] || colors.PENDING;
    };

    const getOrderStatusText = (status) => {
        const texts = {
            PENDING: 'Chờ xác nhận',
            CONFIRMED: 'Đã xác nhận',
            PREPARING: 'Đang chuẩn bị',
            COMPLETED: 'Hoàn thành',
            PAID: 'Đã thanh toán',
            CANCELED: 'Đã hủy'
        };
        return texts[status] || status;
    };

    // ==================== RENDER ====================

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                color: '#94A3B8'
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{
                        width: '48px',
                        height: '48px',
                        border: '4px solid #2D2D2D',
                        borderTop: '4px solid #8B5CF6',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        margin: '0 auto 16px'
                    }}></div>
                    <p style={{ fontSize: '16px' }}>Đang tải dữ liệu chi nhánh...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                color: '#EF4444'
            }}>
                <div style={{ textAlign: 'center', maxWidth: '400px', padding: '24px' }}>
                    <div style={{
                        fontSize: '48px',
                        marginBottom: '16px'
                    }}>⚠️</div>
                    <h2 style={{ marginBottom: '8px' }}>Lỗi tải dữ liệu</h2>
                    <p style={{ color: '#94A3B8', marginBottom: '24px' }}>{error}</p>
                    <button
                        onClick={fetchBranchData}
                        style={{
                            padding: '12px 24px',
                            background: '#8B5CF6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: '600'
                        }}
                    >
                        Thử lại
                    </button>
                </div>
            </div>
        );
    }

    const statsCards = [
        {
            title: 'Chi nhánh',
            value: stats.branchName,
            icon: Store,
            color: '#8B5CF6',
            bgColor: 'rgba(139, 92, 246, 0.1)'
        },
        {
            title: 'Doanh thu hôm nay',
            value: formatCurrency(stats.todayRevenue),
            icon: TrendingUp,
            color: '#10B981',
            bgColor: 'rgba(16, 185, 129, 0.1)',
            subtitle: `${stats.todayOrders} đơn hàng`
        },
        {
            title: 'Doanh thu tháng này',
            value: formatCurrency(stats.monthRevenue),
            icon: DollarSign,
            color: '#D4AF37',
            bgColor: 'rgba(212, 175, 55, 0.1)'
        },
        {
            title: 'Bàn đang sử dụng',
            value: `${stats.occupiedTables}/${stats.totalTables}`,
            icon: LayoutGrid,
            color: '#3B82F6',
            bgColor: 'rgba(59, 130, 246, 0.1)',
            subtitle: stats.totalTables > 0
                ? `${Math.round(stats.occupiedTables / stats.totalTables * 100)}% công suất`
                : '0% công suất'
        },
        {
            title: 'Nhân viên làm việc',
            value: stats.activeEmployees,
            icon: Users,
            color: '#F59E0B',
            bgColor: 'rgba(245, 158, 11, 0.1)',
            subtitle: 'Ca hôm nay'
        },
        {
            title: 'Đơn hoàn thành',
            value: stats.completedOrders,
            icon: CheckCircle,
            color: '#22C55E',
            bgColor: 'rgba(34, 197, 94, 0.1)',
            subtitle: `/${stats.todayOrders} đơn hôm nay`
        }
    ];

    return (
        <div style={{ maxWidth: '1600px', margin: '0 auto', padding: '24px' }}>
            {/* Header */}
            <div style={{
                padding: '32px 24px',
                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.05) 0%, rgba(26, 26, 26, 0.8) 100%)',
                borderRadius: '20px',
                marginBottom: '24px',
                border: '1px solid rgba(139, 92, 246, 0.2)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1 style={{
                            fontSize: '32px',
                            fontWeight: '800',
                            marginBottom: '8px',
                            background: 'linear-gradient(135deg, #8B5CF6, #A78BFA)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent'
                        }}>
                            Dashboard Chi Nhánh
                        </h1>
                        <p style={{
                            color: '#94A3B8',
                            fontSize: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            margin: 0
                        }}>
                            <Activity size={16} />
                            Theo dõi hoạt động chi nhánh của bạn
                        </p>
                    </div>
                    <button
                        onClick={fetchBranchData}
                        style={{
                            padding: '10px 20px',
                            background: 'rgba(139, 92, 246, 0.1)',
                            border: '1px solid rgba(139, 92, 246, 0.3)',
                            borderRadius: '8px',
                            color: '#8B5CF6',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: '600',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(139, 92, 246, 0.2)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(139, 92, 246, 0.1)';
                        }}
                    >
                        🔄 Làm mới
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '16px',
                marginBottom: '24px'
            }}>
                {statsCards.map((stat, index) => {
                    const Icon = stat.icon;
                    return (
                        <div
                            key={index}
                            style={{
                                background: '#1A1A1A',
                                border: '1px solid #2D2D2D',
                                borderRadius: '16px',
                                padding: '24px',
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
                                        color: '#94A3B8',
                                        fontSize: '13px',
                                        marginBottom: '8px',
                                        fontWeight: '500'
                                    }}>
                                        {stat.title}
                                    </p>
                                    <h3 style={{
                                        fontSize: index === 0 ? '20px' : '28px',
                                        fontWeight: '700',
                                        color: 'white',
                                        margin: 0
                                    }}>
                                        {stat.value}
                                    </h3>
                                    {stat.subtitle && (
                                        <p style={{
                                            fontSize: '11px',
                                            color: '#64748B',
                                            marginTop: '4px'
                                        }}>
                                            {stat.subtitle}
                                        </p>
                                    )}
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

                            {/* Decorative background */}
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

            {/* Recent Orders & Quick Stats */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr',
                gap: '16px'
            }}>
                {/* Recent Orders */}
                <div style={{
                    background: '#1A1A1A',
                    border: '1px solid #2D2D2D',
                    borderRadius: '16px',
                    padding: '24px'
                }}>
                    <h3 style={{
                        fontSize: '18px',
                        fontWeight: '600',
                        marginBottom: '16px',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        <Clock size={20} color="#8B5CF6" />
                        Đơn hàng gần đây
                    </h3>

                    {recentOrders.length === 0 ? (
                        <p style={{
                            color: '#64748B',
                            textAlign: 'center',
                            padding: '40px 0',
                            fontSize: '14px'
                        }}>
                            Chưa có đơn hàng nào
                        </p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {recentOrders.map(order => {
                                const statusColor = getOrderStatusColor(order.status);
                                return (
                                    <div
                                        key={order.id}
                                        style={{
                                            padding: '16px',
                                            background: '#0F0F0F',
                                            borderRadius: '12px',
                                            border: '1px solid #2D2D2D',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center'
                                        }}
                                    >
                                        <div>
                                            <div style={{
                                                fontSize: '14px',
                                                fontWeight: '600',
                                                color: 'white',
                                                marginBottom: '4px'
                                            }}>
                                                Đơn #{order.id} - Bàn {order.table?.number || 'N/A'}
                                            </div>
                                            <div style={{
                                                fontSize: '12px',
                                                color: '#64748B'
                                            }}>
                                                {formatDateTime(order.createdAt || order.orderDate)}
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{
                                                fontSize: '16px',
                                                fontWeight: '700',
                                                color: '#10B981',
                                                marginBottom: '4px'
                                            }}>
                                                {formatCurrency(order.totalAmount)}
                                            </div>
                                            <div style={{
                                                display: 'inline-block',
                                                padding: '4px 10px',
                                                background: statusColor.bg,
                                                borderRadius: '6px',
                                                fontSize: '11px',
                                                fontWeight: '600',
                                                color: statusColor.text
                                            }}>
                                                {getOrderStatusText(order.status)}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Quick Summary */}
                <div style={{
                    background: '#1A1A1A',
                    border: '1px solid #2D2D2D',
                    borderRadius: '16px',
                    padding: '24px'
                }}>
                    <h3 style={{
                        fontSize: '18px',
                        fontWeight: '600',
                        marginBottom: '16px',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        <Calendar size={20} color="#8B5CF6" />
                        Tóm tắt hôm nay
                    </h3>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{
                            padding: '16px',
                            background: '#0F0F0F',
                            borderRadius: '12px',
                            border: '1px solid #2D2D2D'
                        }}>
                            <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '4px' }}>
                                Tổng đơn hàng
                            </div>
                            <div style={{ fontSize: '24px', fontWeight: '700', color: '#3B82F6' }}>
                                {stats.todayOrders}
                            </div>
                        </div>

                        <div style={{
                            padding: '16px',
                            background: '#0F0F0F',
                            borderRadius: '12px',
                            border: '1px solid #2D2D2D'
                        }}>
                            <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '4px' }}>
                                Hoàn thành
                            </div>
                            <div style={{ fontSize: '24px', fontWeight: '700', color: '#10B981' }}>
                                {stats.completedOrders}
                            </div>
                        </div>

                        <div style={{
                            padding: '16px',
                            background: '#0F0F0F',
                            borderRadius: '12px',
                            border: '1px solid #2D2D2D'
                        }}>
                            <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '4px' }}>
                                Trung bình/đơn
                            </div>
                            <div style={{ fontSize: '18px', fontWeight: '700', color: '#D4AF37' }}>
                                {stats.todayOrders > 0
                                    ? formatCurrency(stats.todayRevenue / stats.todayOrders)
                                    : formatCurrency(0)
                                }
                            </div>
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