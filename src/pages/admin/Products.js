import React, { useEffect, useState } from 'react';
import { Edit2, Trash2, Package, Search, Grid, List, TrendingUp, AlertCircle } from 'lucide-react';
import styles from '../../layouts/AdminLayout.module.css';

export default function Products({ openAdd, openEdit, refreshTrigger }) {
    const [products, setProducts] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [viewMode, setViewMode] = useState('table');
    const API_BASE_URL = 'http://localhost:8080';

    const fetchProducts = () => {
        const token = localStorage.getItem('token');
        fetch(`${API_BASE_URL}/api/foods`, {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(res => res.ok ? res.json() : Promise.reject('Unauthorized hoặc lỗi khác'))
            .then(data => {
                console.log('Foods data:', data);
                setProducts(data);
            })
            .catch(err => console.error('Lỗi khi lấy dữ liệu:', err));
    };
    // Load lần đầu
    useEffect(() => {
        fetchProducts();
    }, []);

    // Refresh khi có trigger từ parent
    useEffect(() => {
        if (refreshTrigger) {
            fetchProducts();
        }
    }, [refreshTrigger]);

    const handleDelete = (id) => {
        const token = localStorage.getItem('token');
        if (window.confirm('Bạn có chắc muốn xóa sản phẩm này không?')) {
            fetch(`${API_BASE_URL}/api/foods/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            })
                .then(res => {
                    if (!res.ok) throw new Error('Xóa thất bại');
                    alert('Xóa sản phẩm thành công!');
                    fetchProducts();
                })
                .catch(err => console.error(err));
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

    // Filter logic
    const filteredProducts = products.filter(p => {
        const matchesSearch =
            (p.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (p.description?.toLowerCase() || '').includes(searchTerm.toLowerCase());

        const matchesFilter =
            filterStatus === 'all'
                ? true
                : filterStatus === 'active'
                    ? p.isActive === true
                    : p.isActive === false;

        return matchesSearch && matchesFilter;
    });

    // Stats calculation
    const activeProducts = products.filter(p => p.isActive).length;
    const totalValue = products.reduce((sum, p) => sum + (Number(p.price) || 0), 0);

    return (
        <div>
            {/* Enhanced Header with Stats */}
            <div style={{
                padding: '32px 24px 24px',
                background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.05) 0%, rgba(26, 26, 26, 0.8) 100%)',
                borderRadius: '20px',
                marginBottom: '24px',
                border: '1px solid var(--color-border)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
            }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '24px',
                    flexWrap: 'wrap',
                    gap: '16px'
                }}>
                    <div>
                        <h2 style={{
                            fontSize: '32px',
                            fontWeight: '800',
                            marginBottom: '8px',
                            background: 'linear-gradient(135deg, var(--color-primary-light))',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            letterSpacing: '-0.5px'
                        }}>
                            Quản lý Món Ăn
                        </h2>
                        <p style={{
                            color: 'var(--color-text-secondary)',
                            fontSize: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            <Package size={16} />
                            Tổng số: {products.length} món ăn
                        </p>
                    </div>
                    <button
                        onClick={openAdd}
                        style={{
                            padding: '14px 28px',
                            background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
                            color: '#000',
                            border: 'none',
                            borderRadius: '14px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            fontSize: '15px',
                            boxShadow: '0 4px 16px rgba(212, 175, 55, 0.3)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.transform = 'translateY(-3px)';
                            e.currentTarget.style.boxShadow = '0 8px 24px rgba(212, 175, 55, 0.5)';
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 4px 16px rgba(212, 175, 55, 0.3)';
                        }}
                    >
                        <Package size={18} />
                        Thêm món ăn
                    </button>
                </div>

                {/* Stats Cards */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '16px',
                    marginBottom: '24px'
                }}>
                    <div style={{
                        background: 'rgba(16, 185, 129, 0.1)',
                        border: '1px solid rgba(16, 185, 129, 0.2)',
                        borderRadius: '12px',
                        padding: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                    }}>
                        <div style={{
                            width: '48px',
                            height: '48px',
                            background: 'rgba(16, 185, 129, 0.2)',
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#10B981'
                        }}>
                            <Package size={24} />
                        </div>
                        <div>
                            <div style={{ fontSize: '24px', fontWeight: '700', color: '#10B981' }}>
                                {activeProducts}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                                Đang bán
                            </div>
                        </div>
                    </div>

                    <div style={{
                        background: 'rgba(212, 175, 55, 0.1)',
                        border: '1px solid rgba(212, 175, 55, 0.2)',
                        borderRadius: '12px',
                        padding: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                    }}>
                        <div style={{
                            width: '48px',
                            height: '48px',
                            background: 'rgba(212, 175, 55, 0.2)',
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--color-primary)'
                        }}>
                            <TrendingUp size={24} />
                        </div>
                        <div>
                            <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--color-primary)' }}>
                                {totalValue.toLocaleString('vi-VN')}đ
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                                Giá trị tồn kho
                            </div>
                        </div>
                    </div>

                    <div style={{
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        borderRadius: '12px',
                        padding: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                    }}>
                        <div style={{
                            width: '48px',
                            height: '48px',
                            background: 'rgba(239, 68, 68, 0.2)',
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#EF4444'
                        }}>
                            <AlertCircle size={24} />
                        </div>
                    </div>
                </div>

                {/* Search and Filter Bar */}
                <div style={{
                    display: 'flex',
                    gap: '12px',
                    flexWrap: 'wrap',
                    alignItems: 'center'
                }}>
                    <div style={{
                        flex: '1',
                        minWidth: '250px',
                        position: 'relative'
                    }}>
                        <Search size={20} style={{
                            position: 'absolute',
                            left: '16px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: 'var(--color-text-secondary)',
                            pointerEvents: 'none'
                        }} />
                        <input
                            type="text"
                            placeholder="Tìm kiếm sản phẩm..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '12px 16px 12px 48px',
                                background: 'var(--color-bg-dark)',
                                border: '1px solid var(--color-border)',
                                borderRadius: '12px',
                                color: 'var(--color-text-primary)',
                                fontSize: '14px',
                                outline: 'none',
                                transition: 'all 0.2s ease'
                            }}
                            onFocus={(e) => {
                                e.target.style.borderColor = 'var(--color-primary)';
                                e.target.style.boxShadow = '0 0 0 3px rgba(212, 175, 55, 0.1)';
                            }}
                            onBlur={(e) => {
                                e.target.style.borderColor = 'var(--color-border)';
                                e.target.style.boxShadow = 'none';
                            }}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            style={{
                                padding: '12px 16px',
                                background: 'var(--color-bg-dark)',
                                border: '1px solid var(--color-border)',
                                borderRadius: '12px',
                                color: 'var(--color-text-primary)',
                                fontSize: '14px',
                                cursor: 'pointer',
                                outline: 'none',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            <option value="all">Tất cả</option>
                            <option value="active">Còn hàng</option>
                            <option value="inactive">Hết hàng</option>
                        </select>

                        <div style={{
                            display: 'flex',
                            gap: '4px',
                            background: 'var(--color-bg-dark)',
                            border: '1px solid var(--color-border)',
                            borderRadius: '12px',
                            padding: '4px'
                        }}>
                            <button
                                onClick={() => setViewMode('table')}
                                style={{
                                    padding: '8px 12px',
                                    background: viewMode === 'table' ? 'var(--color-primary)' : 'transparent',
                                    color: viewMode === 'table' ? '#000' : 'var(--color-text-secondary)',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    display: 'flex',
                                    alignItems: 'center',
                                    fontWeight: '600'
                                }}
                            >
                                <List size={18} />
                            </button>
                            <button
                                onClick={() => setViewMode('grid')}
                                style={{
                                    padding: '8px 12px',
                                    background: viewMode === 'grid' ? 'var(--color-primary)' : 'transparent',
                                    color: viewMode === 'grid' ? '#000' : 'var(--color-text-secondary)',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    display: 'flex',
                                    alignItems: 'center',
                                    fontWeight: '600'
                                }}
                            >
                                <Grid size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Table View */}
            {viewMode === 'table' ? (
                <div className={styles['table-wrapper']} style={{
                    animation: 'fadeIn 0.3s ease',
                    borderRadius: '16px',
                    overflow: 'hidden'
                }}>
                    <table>
                        <thead>
                            <tr>
                                <th style={{ width: '100px' }}>Hình ảnh</th>
                                <th>Danh mục</th>
                                <th>Tên món ăn</th>
                                <th style={{ width: '150px' }}>Giá</th>
                                <th style={{ width: '120px' }}>Trạng thái</th>
                                <th style={{ width: '150px' }}>Hành động</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredProducts.length === 0 ? (
                                <tr>
                                    <td colSpan="6" style={{ textAlign: 'center', padding: '60px 20px' }}>
                                        <Package size={64} style={{
                                            margin: '0 auto 16px',
                                            opacity: 0.2,
                                            display: 'block'
                                        }} />
                                        <p style={{
                                            color: 'var(--color-text-secondary)',
                                            fontSize: '16px',
                                            fontWeight: '500'
                                        }}>
                                            {searchTerm || filterStatus !== 'all'
                                                ? 'Không tìm thấy sản phẩm nào'
                                                : 'Chưa có sản phẩm nào'}
                                        </p>
                                    </td>
                                </tr>
                            ) : (
                                filteredProducts.map(p => {
                                    const imageUrl = getImageUrl(p.imageUrl);
                                    return (
                                        <tr key={p.id} style={{
                                            animation: 'slideInUp 0.3s ease'
                                        }}>
                                            <td>
                                                <div style={{ position: 'relative' }}>
                                                    {imageUrl ? (
                                                        <img
                                                            src={imageUrl}
                                                            alt={p.name}
                                                            style={{
                                                                width: '70px',
                                                                height: '70px',
                                                                objectFit: 'cover',
                                                                borderRadius: '12px',
                                                                border: '2px solid var(--color-border)',
                                                                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
                                                            }}
                                                            onError={(e) => {
                                                                e.target.style.display = 'none';
                                                                e.target.nextSibling.style.display = 'flex';
                                                            }}
                                                        />
                                                    ) : null}
                                                    <div style={{
                                                        width: '70px',
                                                        height: '70px',
                                                        backgroundColor: 'var(--color-bg-dark)',
                                                        borderRadius: '12px',
                                                        border: '2px solid var(--color-border)',
                                                        display: imageUrl ? 'none' : 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center'
                                                    }}>
                                                        <Package size={28} style={{ opacity: 0.3 }} />
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <span style={{
                                                    padding: '6px 12px',
                                                    background: 'rgba(99, 102, 241, 0.1)',
                                                    borderRadius: '8px',
                                                    fontSize: '13px',
                                                    fontWeight: '600'
                                                }}>
                                                    {p.category?.name || 'Chưa có'}
                                                </span>
                                            </td>
                                            <td>
                                                <div>
                                                    <div style={{
                                                        fontWeight: '700',
                                                        marginBottom: '4px',
                                                        fontSize: '15px',
                                                        color: 'var(--color-text-primary)'
                                                    }}>
                                                        {p.name}
                                                    </div>
                                                    {p.description && (
                                                        <div style={{
                                                            fontSize: '13px',
                                                            color: 'var(--color-text-secondary)',
                                                            maxWidth: '350px',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            whiteSpace: 'nowrap'
                                                        }}>
                                                            {p.description}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td>
                                                <span style={{
                                                    fontWeight: '700',
                                                    fontSize: '16px',
                                                    color: 'var(--color-primary)'
                                                }}>
                                                    {p.price ? Number(p.price).toLocaleString('vi-VN') + 'đ' : '0đ'}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={p.isActive ? styles['badge-green'] : styles['badge-red']} style={{
                                                    padding: '6px 14px',
                                                    borderRadius: '10px',
                                                    fontSize: '13px',
                                                    fontWeight: '700'
                                                }}>
                                                    {p.isActive ? 'Đang bán' : 'Hết bán'}
                                                </span>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <button
                                                        onClick={() => openEdit('Product', p, fetchProducts)}
                                                        style={{
                                                            padding: '10px 14px',
                                                            background: 'rgba(59, 130, 246, 0.15)',
                                                            color: '#3B82F6',
                                                            border: '1px solid rgba(59, 130, 246, 0.3)',
                                                            borderRadius: '10px',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '4px',
                                                            transition: 'all 0.2s ease',
                                                            fontWeight: '600'
                                                        }}
                                                        onMouseOver={(e) => {
                                                            e.currentTarget.style.background = 'rgba(59, 130, 246, 0.25)';
                                                            e.currentTarget.style.transform = 'translateY(-2px)';
                                                        }}
                                                        onMouseOut={(e) => {
                                                            e.currentTarget.style.background = 'rgba(59, 130, 246, 0.15)';
                                                            e.currentTarget.style.transform = 'translateY(0)';
                                                        }}
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(p.id)}
                                                        style={{
                                                            padding: '10px 14px',
                                                            background: 'rgba(239, 68, 68, 0.15)',
                                                            color: '#EF4444',
                                                            border: '1px solid rgba(239, 68, 68, 0.3)',
                                                            borderRadius: '10px',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '4px',
                                                            transition: 'all 0.2s ease',
                                                            fontWeight: '600'
                                                        }}
                                                        onMouseOver={(e) => {
                                                            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.25)';
                                                            e.currentTarget.style.transform = 'translateY(-2px)';
                                                        }}
                                                        onMouseOut={(e) => {
                                                            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
                                                            e.currentTarget.style.transform = 'translateY(0)';
                                                        }}
                                                    >
                                                        <Trash2 size={16} />
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
            ) : (
                /* Grid View */
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                    gap: '20px',
                    animation: 'fadeIn 0.3s ease'
                }}>
                    {filteredProducts.length === 0 ? (
                        <div style={{
                            gridColumn: '1 / -1',
                            textAlign: 'center',
                            padding: '60px 20px',
                            background: 'var(--color-bg-card)',
                            borderRadius: '16px',
                            border: '1px solid var(--color-border)'
                        }}>
                            <Package size={64} style={{
                                margin: '0 auto 16px',
                                opacity: 0.2
                            }} />
                            <p style={{
                                color: 'var(--color-text-secondary)',
                                fontSize: '16px',
                                fontWeight: '500'
                            }}>
                                {searchTerm || filterStatus !== 'all'
                                    ? 'Không tìm thấy sản phẩm nào'
                                    : 'Chưa có sản phẩm nào'}
                            </p>
                        </div>
                    ) : (
                        filteredProducts.map(p => {
                            const imageUrl = getImageUrl(p.imageUrl);
                            return (
                                <div key={p.id} style={{
                                    background: 'var(--color-bg-card)',
                                    border: '1px solid var(--color-border)',
                                    borderRadius: '16px',
                                    overflow: 'hidden',
                                    transition: 'all 0.3s ease',
                                    animation: 'slideInUp 0.3s ease'
                                }}
                                    onMouseOver={(e) => {
                                        e.currentTarget.style.borderColor = 'var(--color-primary)';
                                        e.currentTarget.style.transform = 'translateY(-4px)';
                                        e.currentTarget.style.boxShadow = '0 12px 32px rgba(212, 175, 55, 0.2)';
                                    }}
                                    onMouseOut={(e) => {
                                        e.currentTarget.style.borderColor = 'var(--color-border)';
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = 'none';
                                    }}>
                                    {/* Image */}
                                    <div style={{
                                        width: '100%',
                                        height: '220px',
                                        position: 'relative',
                                        overflow: 'hidden',
                                        background: 'var(--color-bg-dark)'
                                    }}>
                                        {imageUrl ? (
                                            <img
                                                src={imageUrl}
                                                alt={p.name}
                                                style={{
                                                    width: '100%',
                                                    height: '100%',
                                                    objectFit: 'cover'
                                                }}
                                                onError={(e) => {
                                                    e.target.style.display = 'none';
                                                    e.target.nextSibling.style.display = 'flex';
                                                }}
                                            />
                                        ) : null}
                                        <div style={{
                                            width: '100%',
                                            height: '100%',
                                            display: imageUrl ? 'none' : 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}>
                                            <Package size={48} style={{ opacity: 0.2 }} />
                                        </div>

                                        {/* Status Badge */}
                                        <div style={{
                                            position: 'absolute',
                                            top: '12px',
                                            right: '12px'
                                        }}>
                                            <span className={p.isActive ? styles['badge-green'] : styles['badge-red']} style={{
                                                padding: '6px 12px',
                                                borderRadius: '8px',
                                                fontSize: '12px',
                                                fontWeight: '700',
                                                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)'
                                            }}>
                                                {p.isActive ? 'Còn hàng' : 'Hết hàng'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div style={{ padding: '20px' }}>
                                        <h3 style={{
                                            fontSize: '18px',
                                            fontWeight: '700',
                                            marginBottom: '8px',
                                            color: 'var(--color-text-primary)',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap'
                                        }}>
                                            {p.name}
                                        </h3>

                                        <div style={{
                                            fontSize: '12px',
                                            color: 'var(--color-text-secondary)',
                                            marginBottom: '8px'
                                        }}>
                                            {p.category?.name || 'Chưa có danh mục'}
                                        </div>

                                        {p.description && (
                                            <p style={{
                                                fontSize: '13px',
                                                color: 'var(--color-text-secondary)',
                                                marginBottom: '16px',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                display: '-webkit-box',
                                                WebkitLineClamp: 2,
                                                WebkitBoxOrient: 'vertical',
                                                minHeight: '40px'
                                            }}>
                                                {p.description}
                                            </p>
                                        )}

                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            marginBottom: '16px',
                                            paddingTop: '16px',
                                            borderTop: '1px solid var(--color-border)'
                                        }}>
                                            <div>
                                                <div style={{
                                                    fontSize: '11px',
                                                    color: 'var(--color-text-secondary)',
                                                    marginBottom: '4px',
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.5px'
                                                }}>
                                                    Giá bán
                                                </div>
                                                <div style={{
                                                    fontSize: '22px',
                                                    fontWeight: '800',
                                                    color: 'var(--color-primary)'
                                                }}>
                                                    {p.price ? Number(p.price).toLocaleString('vi-VN') + 'đ' : '0đ'}
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>

                                            </div>
                                        </div>

                                        {/* Action Buttons */}
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button
                                                onClick={() => openEdit('Food', p, fetchProducts)}
                                                style={{
                                                    flex: 1,
                                                    padding: '12px',
                                                    background: 'rgba(59, 130, 246, 0.15)',
                                                    color: '#3B82F6',
                                                    border: '1px solid rgba(59, 130, 246, 0.3)',
                                                    borderRadius: '10px',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '6px',
                                                    transition: 'all 0.2s ease',
                                                    fontWeight: '600',
                                                    fontSize: '14px'
                                                }}
                                                onMouseOver={(e) => {
                                                    e.currentTarget.style.background = 'rgba(59, 130, 246, 0.25)';
                                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                                }}
                                                onMouseOut={(e) => {
                                                    e.currentTarget.style.background = 'rgba(59, 130, 246, 0.15)';
                                                    e.currentTarget.style.transform = 'translateY(0)';
                                                }}
                                            >
                                                <Edit2 size={16} />
                                                Sửa
                                            </button>
                                            <button
                                                onClick={() => handleDelete(p.id)}
                                                style={{
                                                    flex: 1,
                                                    padding: '12px',
                                                    background: 'rgba(239, 68, 68, 0.15)',
                                                    color: '#EF4444',
                                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                                    borderRadius: '10px',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '6px',
                                                    transition: 'all 0.2s ease',
                                                    fontWeight: '600',
                                                    fontSize: '14px'
                                                }}
                                                onMouseOver={(e) => {
                                                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.25)';
                                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                                }}
                                                onMouseOut={(e) => {
                                                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
                                                    e.currentTarget.style.transform = 'translateY(0)';
                                                }}
                                            >
                                                <Trash2 size={16} />
                                                Xóa
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            )}

            {/* Custom Animations */}
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                
                @keyframes slideInUp {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                @keyframes fadeInDown {
                    from {
                        opacity: 0;
                        transform: translateY(-20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
            `}</style>
        </div>
    );
}