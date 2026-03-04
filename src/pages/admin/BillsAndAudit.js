import React, { useEffect, useState } from 'react';
import { FileText, Download, DollarSign, CreditCard, Clock, CheckCircle, XCircle, AlertCircle, Calendar, Search, Eye, Activity, Shield } from 'lucide-react';
import axios from 'axios';

export default function BillsAndAuditSystem() {
    const [activeTab, setActiveTab] = useState('bills');
    const [bills, setBills] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedBill, setSelectedBill] = useState(null);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [paymentStatusFilter, setPaymentStatusFilter] = useState('all');
    const [paymentMethodFilter, setPaymentMethodFilter] = useState('all');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    const API_BASE_URL = 'http://localhost:8080';

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };

            const [billsRes, usersRes] = await Promise.all([
                axios.get(`${API_BASE_URL}/api/employee/bills`, { headers }),
                axios.get(`${API_BASE_URL}/api/users`, { headers })
            ]);

            setBills(billsRes.data);
            setUsers(usersRes.data);
        } catch (error) {
            console.error('Lỗi khi tải dữ liệu:', error);
        } finally {
            setLoading(false);
        }
    };

    const exportBillPDF = async (billId) => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(
                `${API_BASE_URL}/api/employee/bills/${billId}/export`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                    responseType: 'blob'
                }
            );

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `bill_${billId}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error('Lỗi khi xuất PDF:', error);
            alert('Không thể xuất hóa đơn. Vui lòng thử lại!');
        }
    };

    const getPaymentStatusColor = (status) => {
        const colors = {
            PENDING: { bg: 'rgba(251, 191, 36, 0.1)', border: 'rgba(251, 191, 36, 0.3)', text: '#FBBF24', icon: Clock },
            PAID: { bg: 'rgba(16, 185, 129, 0.1)', border: 'rgba(16, 185, 129, 0.3)', text: '#10B981', icon: CheckCircle },
            FAILED: { bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.3)', text: '#EF4444', icon: XCircle },
            REFUNDED: { bg: 'rgba(139, 92, 246, 0.1)', border: 'rgba(139, 92, 246, 0.3)', text: '#8B5CF6', icon: AlertCircle }
        };
        return colors[status] || colors.PENDING;
    };

    const getPaymentStatusText = (status) => {
        const texts = {
            PENDING: 'Chờ thanh toán',
            PAID: 'Đã thanh toán',
            FAILED: 'Thất bại',
            REFUNDED: 'Đã hoàn tiền'
        };
        return texts[status] || status;
    };

    const getPaymentMethodText = (method) => {
        const texts = {
            CASH: 'Tiền mặt',
            CARD: 'Thẻ',
            MOMO: 'MoMo',
            BANKING: 'Chuyển khoản'
        };
        return texts[method] || method;
    };

    const formatDateTime = (dateTime) => {
        if (!dateTime) return 'N/A';
        const date = new Date(dateTime);
        return date.toLocaleString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(amount);
    };

    // Filter bills
    const filteredBills = bills.filter(bill => {
        const matchSearch =
            bill.id.toString().includes(searchTerm) ||
            bill.order?.id?.toString().includes(searchTerm);

        const matchStatus = paymentStatusFilter === 'all' || bill.paymentStatus === paymentStatusFilter;
        const matchMethod = paymentMethodFilter === 'all' || bill.paymentMethod === paymentMethodFilter;

        let matchDate = true;
        if (dateFrom || dateTo) {
            const billDate = new Date(bill.issuedAt || bill.createdAt);
            if (dateFrom) matchDate = matchDate && billDate >= new Date(dateFrom);
            if (dateTo) matchDate = matchDate && billDate <= new Date(dateTo + 'T23:59:59');
        }

        return matchSearch && matchStatus && matchMethod && matchDate;
    });

    // Calculate stats
    const stats = {
        total: bills.length,
        paid: bills.filter(b => b.paymentStatus === 'PAID').length,
        pending: bills.filter(b => b.paymentStatus === 'PENDING').length,
        revenue: bills
            .filter(b => b.paymentStatus === 'PAID')
            .reduce((sum, b) => sum + parseFloat(b.totalAmount || 0), 0)
    };

    // Audit logs from users
    const auditLogs = users.map(user => ({
        id: user.id,
        user: user.fullName || user.username,
        role: user.role,
        action: user.isActive ? 'Đang hoạt động' : 'Đã vô hiệu hóa',
        timestamp: user.updatedAt || user.createdAt,
        branch: user.branch?.name || 'N/A',
        status: user.isActive
    }));

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
                <h1 style={{
                    fontSize: '32px',
                    fontWeight: '800',
                    marginBottom: '8px',
                    background: 'linear-gradient(135deg, #8B5CF6, #A78BFA)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                }}>
                    Hóa đơn & Log Hệ thống
                </h1>
                <p style={{ color: '#94A3B8', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Shield size={16} />
                    Quản lý hóa đơn và theo dõi hoạt động hệ thống
                </p>
            </div>

            {/* Tabs */}
            <div style={{
                display: 'flex',
                gap: '12px',
                marginBottom: '24px',
                background: '#1A1A1A',
                padding: '8px',
                borderRadius: '16px',
                border: '1px solid #2D2D2D'
            }}>
                <button
                    onClick={() => setActiveTab('bills')}
                    style={{
                        flex: 1,
                        padding: '14px 24px',
                        background: activeTab === 'bills'
                            ? 'linear-gradient(135deg, #8B5CF6, #7C3AED)'
                            : 'transparent',
                        color: activeTab === 'bills' ? 'white' : '#94A3B8',
                        border: 'none',
                        borderRadius: '12px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        transition: 'all 0.3s'
                    }}
                >
                    <FileText size={20} />
                    Hóa đơn
                </button>
                <button
                    onClick={() => setActiveTab('audit')}
                    style={{
                        flex: 1,
                        padding: '14px 24px',
                        background: activeTab === 'audit'
                            ? 'linear-gradient(135deg, #8B5CF6, #7C3AED)'
                            : 'transparent',
                        color: activeTab === 'audit' ? 'white' : '#94A3B8',
                        border: 'none',
                        borderRadius: '12px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        transition: 'all 0.3s'
                    }}
                >
                    <Activity size={20} />
                    Log Hệ thống
                </button>
            </div>

            {/* Bills Tab */}
            {activeTab === 'bills' && (
                <>
                    {/* Stats */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(4, 1fr)',
                        gap: '16px',
                        marginBottom: '24px'
                    }}>
                        <div style={{
                            background: 'rgba(139, 92, 246, 0.1)',
                            border: '1px solid rgba(139, 92, 246, 0.2)',
                            borderRadius: '16px',
                            padding: '20px'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{
                                    width: '48px',
                                    height: '48px',
                                    background: 'rgba(139, 92, 246, 0.2)',
                                    borderRadius: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <FileText size={24} color="#8B5CF6" />
                                </div>
                                <div>
                                    <div style={{ fontSize: '28px', fontWeight: '700', color: '#8B5CF6' }}>
                                        {stats.total}
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#94A3B8' }}>Tổng hóa đơn</div>
                                </div>
                            </div>
                        </div>

                        <div style={{
                            background: 'rgba(16, 185, 129, 0.1)',
                            border: '1px solid rgba(16, 185, 129, 0.2)',
                            borderRadius: '16px',
                            padding: '20px'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{
                                    width: '48px',
                                    height: '48px',
                                    background: 'rgba(16, 185, 129, 0.2)',
                                    borderRadius: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <CheckCircle size={24} color="#10B981" />
                                </div>
                                <div>
                                    <div style={{ fontSize: '28px', fontWeight: '700', color: '#10B981' }}>
                                        {stats.paid}
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#94A3B8' }}>Đã thanh toán</div>
                                </div>
                            </div>
                        </div>

                        <div style={{
                            background: 'rgba(251, 191, 36, 0.1)',
                            border: '1px solid rgba(251, 191, 36, 0.2)',
                            borderRadius: '16px',
                            padding: '20px'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{
                                    width: '48px',
                                    height: '48px',
                                    background: 'rgba(251, 191, 36, 0.2)',
                                    borderRadius: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <Clock size={24} color="#FBBF24" />
                                </div>
                                <div>
                                    <div style={{ fontSize: '28px', fontWeight: '700', color: '#FBBF24' }}>
                                        {stats.pending}
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#94A3B8' }}>Chờ thanh toán</div>
                                </div>
                            </div>
                        </div>

                        <div style={{
                            background: 'rgba(59, 130, 246, 0.1)',
                            border: '1px solid rgba(59, 130, 246, 0.2)',
                            borderRadius: '16px',
                            padding: '20px'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{
                                    width: '48px',
                                    height: '48px',
                                    background: 'rgba(59, 130, 246, 0.2)',
                                    borderRadius: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <DollarSign size={24} color="#3B82F6" />
                                </div>
                                <div>
                                    <div style={{ fontSize: '20px', fontWeight: '700', color: '#3B82F6' }}>
                                        {formatCurrency(stats.revenue)}
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#94A3B8' }}>Doanh thu</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Filters */}
                    <div style={{
                        background: '#1A1A1A',
                        border: '1px solid #2D2D2D',
                        borderRadius: '16px',
                        padding: '20px',
                        marginBottom: '24px'
                    }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: '12px' }}>
                            <div style={{ position: 'relative' }}>
                                <Search size={20} style={{
                                    position: 'absolute',
                                    left: '16px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    color: '#64748B'
                                }} />
                                <input
                                    type="text"
                                    placeholder="Tìm theo mã hóa đơn..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '12px 12px 12px 48px',
                                        background: '#0F0F0F',
                                        border: '1px solid #2D2D2D',
                                        borderRadius: '12px',
                                        color: 'white',
                                        fontSize: '14px'
                                    }}
                                />
                            </div>

                            <select
                                value={paymentStatusFilter}
                                onChange={(e) => setPaymentStatusFilter(e.target.value)}
                                style={{
                                    padding: '12px 16px',
                                    background: '#0F0F0F',
                                    border: '1px solid #2D2D2D',
                                    borderRadius: '12px',
                                    color: 'white',
                                    fontSize: '14px',
                                    cursor: 'pointer'
                                }}
                            >
                                <option value="all">Tất cả trạng thái</option>
                                <option value="PENDING">Chờ thanh toán</option>
                                <option value="PAID">Đã thanh toán</option>
                                <option value="FAILED">Thất bại</option>
                                <option value="REFUNDED">Đã hoàn tiền</option>
                            </select>

                            <select
                                value={paymentMethodFilter}
                                onChange={(e) => setPaymentMethodFilter(e.target.value)}
                                style={{
                                    padding: '12px 16px',
                                    background: '#0F0F0F',
                                    border: '1px solid #2D2D2D',
                                    borderRadius: '12px',
                                    color: 'white',
                                    fontSize: '14px',
                                    cursor: 'pointer'
                                }}
                            >
                                <option value="all">Tất cả phương thức</option>
                                <option value="CASH">Tiền mặt</option>
                                <option value="CARD">Thẻ</option>
                                <option value="MOMO">MoMo</option>
                                <option value="BANKING">Chuyển khoản</option>
                            </select>

                            <input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                                style={{
                                    padding: '12px 16px',
                                    background: '#0F0F0F',
                                    border: '1px solid #2D2D2D',
                                    borderRadius: '12px',
                                    color: 'white',
                                    fontSize: '14px'
                                }}
                            />

                            <input
                                type="date"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                                style={{
                                    padding: '12px 16px',
                                    background: '#0F0F0F',
                                    border: '1px solid #2D2D2D',
                                    borderRadius: '12px',
                                    color: 'white',
                                    fontSize: '14px'
                                }}
                            />
                        </div>
                    </div>

                    {/* Bills Table */}
                    <div style={{
                        background: '#1A1A1A',
                        border: '1px solid #2D2D2D',
                        borderRadius: '16px',
                        overflow: 'hidden'
                    }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: '#0F0F0F', borderBottom: '1px solid #2D2D2D' }}>
                                    <th style={{ padding: '16px', textAlign: 'left', color: '#94A3B8', fontWeight: '600', fontSize: '13px' }}>Mã HĐ</th>
                                    <th style={{ padding: '16px', textAlign: 'left', color: '#94A3B8', fontWeight: '600', fontSize: '13px' }}>Đơn hàng</th>
                                    <th style={{ padding: '16px', textAlign: 'left', color: '#94A3B8', fontWeight: '600', fontSize: '13px' }}>Tổng tiền</th>
                                    <th style={{ padding: '16px', textAlign: 'left', color: '#94A3B8', fontWeight: '600', fontSize: '13px' }}>Phương thức</th>
                                    <th style={{ padding: '16px', textAlign: 'left', color: '#94A3B8', fontWeight: '600', fontSize: '13px' }}>Trạng thái</th>
                                    <th style={{ padding: '16px', textAlign: 'left', color: '#94A3B8', fontWeight: '600', fontSize: '13px' }}>Thời gian</th>
                                    <th style={{ padding: '16px', textAlign: 'center', color: '#94A3B8', fontWeight: '600', fontSize: '13px' }}>Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredBills.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" style={{ padding: '60px 20px', textAlign: 'center' }}>
                                            <FileText size={48} color="#64748B" style={{ margin: '0 auto 16px', opacity: 0.3 }} />
                                            <p style={{ color: '#94A3B8' }}>Không có hóa đơn nào</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredBills.map((bill) => {
                                        const statusColor = getPaymentStatusColor(bill.paymentStatus);
                                        const StatusIcon = statusColor.icon;

                                        return (
                                            <tr key={bill.id} style={{ borderBottom: '1px solid #2D2D2D' }}>
                                                <td style={{ padding: '16px', color: 'white', fontWeight: '600' }}>
                                                    #{bill.id}
                                                </td>
                                                <td style={{ padding: '16px', color: '#94A3B8' }}>
                                                    #{bill.order?.id || 'N/A'}
                                                </td>
                                                <td style={{ padding: '16px', color: 'white', fontWeight: '600' }}>
                                                    {formatCurrency(bill.totalAmount)}
                                                </td>
                                                <td style={{ padding: '16px' }}>
                                                    <div style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '6px',
                                                        padding: '6px 12px',
                                                        background: 'rgba(59, 130, 246, 0.1)',
                                                        border: '1px solid rgba(59, 130, 246, 0.2)',
                                                        borderRadius: '8px',
                                                        fontSize: '12px',
                                                        color: '#3B82F6'
                                                    }}>
                                                        <CreditCard size={14} />
                                                        {getPaymentMethodText(bill.paymentMethod)}
                                                    </div>
                                                </td>
                                                <td style={{ padding: '16px' }}>
                                                    <div style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '6px',
                                                        padding: '6px 12px',
                                                        background: statusColor.bg,
                                                        border: `1px solid ${statusColor.border}`,
                                                        borderRadius: '8px',
                                                        fontSize: '12px',
                                                        fontWeight: '600',
                                                        color: statusColor.text
                                                    }}>
                                                        <StatusIcon size={14} />
                                                        {getPaymentStatusText(bill.paymentStatus)}
                                                    </div>
                                                </td>
                                                <td style={{ padding: '16px', color: '#94A3B8', fontSize: '13px' }}>
                                                    {formatDateTime(bill.issuedAt || bill.createdAt)}
                                                </td>
                                                <td style={{ padding: '16px' }}>
                                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                        <button
                                                            onClick={() => setSelectedBill(bill)}
                                                            style={{
                                                                padding: '8px 12px',
                                                                background: 'rgba(139, 92, 246, 0.2)',
                                                                border: '1px solid rgba(139, 92, 246, 0.3)',
                                                                borderRadius: '8px',
                                                                color: '#8B5CF6',
                                                                cursor: 'pointer',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '4px'
                                                            }}
                                                        >
                                                            <Eye size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => exportBillPDF(bill.id)}
                                                            style={{
                                                                padding: '8px 12px',
                                                                background: 'rgba(16, 185, 129, 0.2)',
                                                                border: '1px solid rgba(16, 185, 129, 0.3)',
                                                                borderRadius: '8px',
                                                                color: '#10B981',
                                                                cursor: 'pointer',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '4px'
                                                            }}
                                                        >
                                                            <Download size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {/* Audit Tab */}
            {activeTab === 'audit' && (
                <div style={{
                    background: '#1A1A1A',
                    border: '1px solid #2D2D2D',
                    borderRadius: '16px',
                    overflow: 'hidden'
                }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: '#0F0F0F', borderBottom: '1px solid #2D2D2D' }}>
                                <th style={{ padding: '16px', textAlign: 'left', color: '#94A3B8', fontWeight: '600', fontSize: '13px' }}>ID</th>
                                <th style={{ padding: '16px', textAlign: 'left', color: '#94A3B8', fontWeight: '600', fontSize: '13px' }}>Người dùng</th>
                                <th style={{ padding: '16px', textAlign: 'left', color: '#94A3B8', fontWeight: '600', fontSize: '13px' }}>Vai trò</th>
                                <th style={{ padding: '16px', textAlign: 'left', color: '#94A3B8', fontWeight: '600', fontSize: '13px' }}>Chi nhánh</th>
                                <th style={{ padding: '16px', textAlign: 'left', color: '#94A3B8', fontWeight: '600', fontSize: '13px' }}>Hành động</th>
                                <th style={{ padding: '16px', textAlign: 'left', color: '#94A3B8', fontWeight: '600', fontSize: '13px' }}>Trạng thái</th>
                                <th style={{ padding: '16px', textAlign: 'left', color: '#94A3B8', fontWeight: '600', fontSize: '13px' }}>Thời gian</th>
                            </tr>
                        </thead>
                        <tbody>
                            {auditLogs.map((log) => (
                                <tr key={log.id} style={{ borderBottom: '1px solid #2D2D2D' }}>
                                    <td style={{ padding: '16px', color: 'white', fontWeight: '600' }}>
                                        #{log.id}
                                    </td>
                                    <td style={{ padding: '16px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{
                                                width: '32px',
                                                height: '32px',
                                                background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)',
                                                borderRadius: '8px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: 'white',
                                                fontWeight: '600',
                                                fontSize: '14px'
                                            }}>
                                                {log.user.charAt(0).toUpperCase()}
                                            </div>
                                            <span style={{ color: 'white', fontWeight: '500' }}>
                                                {log.user}
                                            </span>
                                        </div>
                                    </td>
                                    <td style={{ padding: '16px' }}>
                                        <div style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            padding: '6px 12px',
                                            background: log.role === 'ADMIN'
                                                ? 'rgba(239, 68, 68, 0.1)'
                                                : 'rgba(59, 130, 246, 0.1)',
                                            border: log.role === 'ADMIN'
                                                ? '1px solid rgba(239, 68, 68, 0.2)'
                                                : '1px solid rgba(59, 130, 246, 0.2)',
                                            borderRadius: '8px',
                                            fontSize: '12px',
                                            fontWeight: '600',
                                            color: log.role === 'ADMIN' ? '#EF4444' : '#3B82F6'
                                        }}>
                                            <Shield size={14} />
                                            {log.role}
                                        </div>
                                    </td>
                                    <td style={{ padding: '16px', color: '#94A3B8' }}>
                                        {log.branch}
                                    </td>
                                    <td style={{ padding: '16px', color: '#94A3B8' }}>
                                        {log.action}
                                    </td>
                                    <td style={{ padding: '16px' }}>
                                        <div style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            padding: '6px 12px',
                                            background: log.status
                                                ? 'rgba(16, 185, 129, 0.1)'
                                                : 'rgba(239, 68, 68, 0.1)',
                                            border: log.status
                                                ? '1px solid rgba(16, 185, 129, 0.2)'
                                                : '1px solid rgba(239, 68, 68, 0.2)',
                                            borderRadius: '8px',
                                            fontSize: '12px',
                                            fontWeight: '600',
                                            color: log.status ? '#10B981' : '#EF4444'
                                        }}>
                                            {log.status ? <CheckCircle size={14} /> : <XCircle size={14} />}
                                            {log.status ? 'Hoạt động' : 'Vô hiệu'}
                                        </div>
                                    </td>
                                    <td style={{ padding: '16px', color: '#94A3B8', fontSize: '13px' }}>
                                        {formatDateTime(log.timestamp)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Bill Detail Modal */}
            {selectedBill && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0, 0, 0, 0.8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    padding: '20px'
                }} onClick={() => setSelectedBill(null)}>
                    <div style={{
                        background: '#1A1A1A',
                        border: '1px solid #2D2D2D',
                        borderRadius: '20px',
                        maxWidth: '600px',
                        width: '100%',
                        maxHeight: '90vh',
                        overflow: 'auto',
                        padding: '32px'
                    }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h2 style={{ fontSize: '24px', fontWeight: '700', color: 'white', margin: 0 }}>
                                Chi tiết hóa đơn #{selectedBill.id}
                            </h2>
                            <button
                                onClick={() => setSelectedBill(null)}
                                style={{
                                    width: '36px',
                                    height: '36px',
                                    background: 'rgba(239, 68, 68, 0.2)',
                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                    borderRadius: '10px',
                                    color: '#EF4444',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '20px',
                                    fontWeight: '700'
                                }}
                            >
                                ×
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{
                                padding: '16px',
                                background: '#0F0F0F',
                                borderRadius: '12px',
                                border: '1px solid #2D2D2D'
                            }}>
                                <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '4px' }}>Mã đơn hàng</div>
                                <div style={{ fontSize: '16px', color: 'white', fontWeight: '600' }}>
                                    #{selectedBill.order?.id || 'N/A'}
                                </div>
                            </div>

                            <div style={{
                                padding: '16px',
                                background: '#0F0F0F',
                                borderRadius: '12px',
                                border: '1px solid #2D2D2D'
                            }}>
                                <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '4px' }}>Tổng tiền</div>
                                <div style={{ fontSize: '24px', color: '#10B981', fontWeight: '700' }}>
                                    {formatCurrency(selectedBill.totalAmount)}
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div style={{
                                    padding: '16px',
                                    background: '#0F0F0F',
                                    borderRadius: '12px',
                                    border: '1px solid #2D2D2D'
                                }}>
                                    <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '8px' }}>Phương thức</div>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        fontSize: '14px',
                                        color: '#3B82F6',
                                        fontWeight: '600'
                                    }}>
                                        <CreditCard size={16} />
                                        {getPaymentMethodText(selectedBill.paymentMethod)}
                                    </div>
                                </div>

                                <div style={{
                                    padding: '16px',
                                    background: '#0F0F0F',
                                    borderRadius: '12px',
                                    border: '1px solid #2D2D2D'
                                }}>
                                    <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '8px' }}>Trạng thái</div>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        fontSize: '14px',
                                        color: getPaymentStatusColor(selectedBill.paymentStatus).text,
                                        fontWeight: '600'
                                    }}>
                                        {React.createElement(getPaymentStatusColor(selectedBill.paymentStatus).icon, { size: 16 })}
                                        {getPaymentStatusText(selectedBill.paymentStatus)}
                                    </div>
                                </div>
                            </div>

                            <div style={{
                                padding: '16px',
                                background: '#0F0F0F',
                                borderRadius: '12px',
                                border: '1px solid #2D2D2D'
                            }}>
                                <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '4px' }}>Thời gian xuất</div>
                                <div style={{ fontSize: '14px', color: 'white', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Calendar size={16} color="#8B5CF6" />
                                    {formatDateTime(selectedBill.issuedAt || selectedBill.createdAt)}
                                </div>
                            </div>

                            {selectedBill.notes && (
                                <div style={{
                                    padding: '16px',
                                    background: '#0F0F0F',
                                    borderRadius: '12px',
                                    border: '1px solid #2D2D2D'
                                }}>
                                    <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '8px' }}>Ghi chú</div>
                                    <div style={{ fontSize: '14px', color: '#94A3B8', lineHeight: '1.6' }}>
                                        {selectedBill.notes}
                                    </div>
                                </div>
                            )}

                            <button
                                onClick={() => exportBillPDF(selectedBill.id)}
                                style={{
                                    width: '100%',
                                    padding: '14px',
                                    background: 'linear-gradient(135deg, #10B981, #059669)',
                                    border: 'none',
                                    borderRadius: '12px',
                                    color: 'white',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    fontSize: '15px',
                                    marginTop: '8px'
                                }}
                            >
                                <Download size={18} />
                                Tải xuất hóa đơn PDF
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Loading Overlay */}
            {loading && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0, 0, 0, 0.7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999
                }}>
                    <div style={{
                        background: '#1A1A1A',
                        border: '1px solid #2D2D2D',
                        borderRadius: '16px',
                        padding: '32px 48px',
                        textAlign: 'center'
                    }}>
                        <div style={{
                            width: '48px',
                            height: '48px',
                            border: '4px solid #2D2D2D',
                            borderTop: '4px solid #8B5CF6',
                            borderRadius: '50%',
                            margin: '0 auto 16px',
                            animation: 'spin 1s linear infinite'
                        }} />
                        <p style={{ color: '#94A3B8', margin: 0 }}>Đang tải dữ liệu...</p>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}