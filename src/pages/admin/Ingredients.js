import React, { useEffect, useState } from 'react';
import { Edit2, Search, Grid, List, TrendingUp, AlertCircle, ShoppingBag } from 'lucide-react';
import styles from '../../layouts/AdminLayout.module.css';

export default function Ingredients({ openAdd, openEdit, refreshTrigger }) {
    const [ingredients, setIngredients] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [viewMode, setViewMode] = useState('table');
    const API_BASE_URL = 'http://localhost:8080';

    const fetchIngredients = () => {
        const token = localStorage.getItem('token');
        fetch(`${API_BASE_URL}/api/ingredients`, {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(res => res.ok ? res.json() : Promise.reject('Unauthorized hoặc lỗi khác'))
            .then(data => {
                console.log('Ingredients data:', data);
                setIngredients(data);
            })
            .catch(err => console.error('Lỗi khi lấy dữ liệu nguyên liệu:', err));
    };

    useEffect(() => {
        fetchIngredients();
    }, []);

    useEffect(() => {
        if (refreshTrigger) {
            fetchIngredients();
        }
    }, [refreshTrigger]);

    const handleDisable = (id, currentStatus) => {
        const token = localStorage.getItem('token');
        const action = currentStatus ? 'vô hiệu hóa' : 'kích hoạt';

        if (window.confirm(`Bạn có chắc muốn ${action} nguyên liệu này không?`)) {
            // Gọi API update với isActive đảo ngược
            fetch(`${API_BASE_URL}/api/ingredients/${id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ isActive: !currentStatus })
            })
                .then(res => {
                    if (!res.ok) throw new Error('Cập nhật thất bại');
                    alert(`${action.charAt(0).toUpperCase() + action.slice(1)} nguyên liệu thành công!`);
                    fetchIngredients();
                })
                .catch(err => console.error(err));
        }
    };

    // Filter logic
    const filteredIngredients = ingredients.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (item.unit && item.unit.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesFilter = filterStatus === 'all' ? true :
            filterStatus === 'active' ? item.isActive : !item.isActive;
        return matchesSearch && matchesFilter;
    });

    // Stats calculation
    const activeIngredients = ingredients.filter(item => item.isActive).length;
    const totalIngredients = ingredients.length;
    const inactiveIngredients = totalIngredients - activeIngredients;

    return (
        <div>
            {/* Enhanced Header with Stats */}
            <div style={{
                padding: '32px 24px 24px',
                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.05) 0%, rgba(26, 26, 26, 0.8) 100%)',
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
                            background: 'linear-gradient(135deg, #8B5CF6, #A78BFA)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            letterSpacing: '-0.5px'
                        }}>
                            Quản lý Nguyên liệu
                        </h2>
                        <p style={{
                            color: 'var(--color-text-secondary)',
                            fontSize: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            <ShoppingBag size={16} />
                            Tổng số: {totalIngredients} nguyên liệu
                        </p>
                    </div>
                    <button
                        onClick={openAdd}
                        style={{
                            padding: '14px 28px',
                            background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '14px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            fontSize: '15px',
                            boxShadow: '0 4px 16px rgba(139, 92, 246, 0.3)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.transform = 'translateY(-3px)';
                            e.currentTarget.style.boxShadow = '0 8px 24px rgba(139, 92, 246, 0.5)';
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 4px 16px rgba(139, 92, 246, 0.3)';
                        }}
                    >
                        <ShoppingBag size={18} />
                        Thêm nguyên liệu
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
                        background: 'rgba(139, 92, 246, 0.1)',
                        border: '1px solid rgba(139, 92, 246, 0.2)',
                        borderRadius: '12px',
                        padding: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                    }}>
                        <div style={{
                            width: '48px',
                            height: '48px',
                            background: 'rgba(139, 92, 246, 0.2)',
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#8B5CF6'
                        }}>
                            <ShoppingBag size={24} />
                        </div>
                        <div>
                            <div style={{ fontSize: '24px', fontWeight: '700', color: '#8B5CF6' }}>
                                {totalIngredients}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                                Tổng nguyên liệu
                            </div>
                        </div>
                    </div>

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
                            <TrendingUp size={24} />
                        </div>
                        <div>
                            <div style={{ fontSize: '24px', fontWeight: '700', color: '#10B981' }}>
                                {activeIngredients}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                                Đang hoạt động
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
                        <div>
                            <div style={{ fontSize: '24px', fontWeight: '700', color: '#EF4444' }}>
                                {inactiveIngredients}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                                Đã vô hiệu hóa
                            </div>
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
                            placeholder="Tìm kiếm nguyên liệu..."
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
                                e.target.style.borderColor = '#8B5CF6';
                                e.target.style.boxShadow = '0 0 0 3px rgba(139, 92, 246, 0.1)';
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
                            <option value="active">Hoạt động</option>
                            <option value="inactive">Đã vô hiệu hóa</option>
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
                                    background: viewMode === 'table' ? '#8B5CF6' : 'transparent',
                                    color: viewMode === 'table' ? '#fff' : 'var(--color-text-secondary)',
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
                                    background: viewMode === 'grid' ? '#8B5CF6' : 'transparent',
                                    color: viewMode === 'grid' ? '#fff' : 'var(--color-text-secondary)',
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
                                <th>Tên nguyên liệu</th>
                                <th style={{ width: '200px' }}>Khối lượng</th>
                                <th style={{ width: '150px' }}>Trạng thái</th>
                                <th style={{ width: '180px' }}>Hành động</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredIngredients.length === 0 ? (
                                <tr>
                                    <td colSpan="4" style={{ textAlign: 'center', padding: '60px 20px' }}>
                                        <ShoppingBag size={64} style={{
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
                                                ? 'Không tìm thấy nguyên liệu nào'
                                                : 'Chưa có nguyên liệu nào'}
                                        </p>
                                    </td>
                                </tr>
                            ) : (
                                filteredIngredients.map(item => (
                                    <tr key={item.id} style={{
                                        animation: 'slideInUp 0.3s ease'
                                    }}>
                                        <td>
                                            <div style={{
                                                fontWeight: '700',
                                                fontSize: '15px',
                                                color: 'var(--color-text-primary)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '12px'
                                            }}>
                                                <div style={{
                                                    width: '40px',
                                                    height: '40px',
                                                    background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)',
                                                    borderRadius: '10px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color: '#fff',
                                                    fontWeight: '800',
                                                    fontSize: '16px'
                                                }}>
                                                    {item.name.charAt(0).toUpperCase()}
                                                </div>
                                                {item.name}
                                            </div>
                                        </td>
                                        <td>
                                            <span style={{
                                                padding: '8px 16px',
                                                background: 'rgba(59, 130, 246, 0.15)',
                                                border: '1px solid rgba(59, 130, 246, 0.3)',
                                                borderRadius: '10px',
                                                fontWeight: '600',
                                                fontSize: '14px',
                                                color: '#3B82F6',
                                                display: 'inline-block'
                                            }}>
                                                {item.unit}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={item.isActive ? styles['badge-green'] : styles['badge-red']} style={{
                                                padding: '6px 14px',
                                                borderRadius: '10px',
                                                fontSize: '13px',
                                                fontWeight: '700'
                                            }}>
                                                {item.isActive ? 'Hoạt động' : 'Vô hiệu hóa'}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <button
                                                    onClick={() => openEdit('Ingredient', item, fetchIngredients)}
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
                                                    onClick={() => handleDisable(item.id, item.isActive)}
                                                    style={{
                                                        padding: '10px 14px',
                                                        background: item.isActive
                                                            ? 'rgba(239, 68, 68, 0.15)'
                                                            : 'rgba(16, 185, 129, 0.15)',
                                                        color: item.isActive ? '#EF4444' : '#10B981',
                                                        border: item.isActive
                                                            ? '1px solid rgba(239, 68, 68, 0.3)'
                                                            : '1px solid rgba(16, 185, 129, 0.3)',
                                                        borderRadius: '10px',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                        transition: 'all 0.2s ease',
                                                        fontWeight: '600'
                                                    }}
                                                    onMouseOver={(e) => {
                                                        e.currentTarget.style.background = item.isActive
                                                            ? 'rgba(239, 68, 68, 0.25)'
                                                            : 'rgba(16, 185, 129, 0.25)';
                                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                                    }}
                                                    onMouseOut={(e) => {
                                                        e.currentTarget.style.background = item.isActive
                                                            ? 'rgba(239, 68, 68, 0.15)'
                                                            : 'rgba(16, 185, 129, 0.15)';
                                                        e.currentTarget.style.transform = 'translateY(0)';
                                                    }}
                                                >
                                                    <AlertCircle size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            ) : (
                /* Grid View */
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                    gap: '20px',
                    animation: 'fadeIn 0.3s ease'
                }}>
                    {filteredIngredients.length === 0 ? (
                        <div style={{
                            gridColumn: '1 / -1',
                            textAlign: 'center',
                            padding: '60px 20px',
                            background: 'var(--color-bg-card)',
                            borderRadius: '16px',
                            border: '1px solid var(--color-border)'
                        }}>
                            <ShoppingBag size={64} style={{
                                margin: '0 auto 16px',
                                opacity: 0.2
                            }} />
                            <p style={{
                                color: 'var(--color-text-secondary)',
                                fontSize: '16px',
                                fontWeight: '500'
                            }}>
                                {searchTerm || filterStatus !== 'all'
                                    ? 'Không tìm thấy nguyên liệu nào'
                                    : 'Chưa có nguyên liệu nào'}
                            </p>
                        </div>
                    ) : (
                        filteredIngredients.map(item => (
                            <div key={item.id} style={{
                                background: 'var(--color-bg-card)',
                                border: '1px solid var(--color-border)',
                                borderRadius: '16px',
                                padding: '24px',
                                transition: 'all 0.3s ease',
                                animation: 'slideInUp 0.3s ease'
                            }}
                                onMouseOver={(e) => {
                                    e.currentTarget.style.borderColor = '#8B5CF6';
                                    e.currentTarget.style.transform = 'translateY(-4px)';
                                    e.currentTarget.style.boxShadow = '0 12px 32px rgba(139, 92, 246, 0.2)';
                                }}
                                onMouseOut={(e) => {
                                    e.currentTarget.style.borderColor = 'var(--color-border)';
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = 'none';
                                }}>

                                {/* Icon & Status Badge */}
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'flex-start',
                                    marginBottom: '20px'
                                }}>
                                    <div style={{
                                        width: '56px',
                                        height: '56px',
                                        background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)',
                                        borderRadius: '14px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#fff',
                                        fontWeight: '800',
                                        fontSize: '24px',
                                        boxShadow: '0 8px 20px rgba(139, 92, 246, 0.3)'
                                    }}>
                                        {item.name.charAt(0).toUpperCase()}
                                    </div>
                                    <span className={item.isActive ? styles['badge-green'] : styles['badge-red']} style={{
                                        padding: '6px 12px',
                                        borderRadius: '8px',
                                        fontSize: '12px',
                                        fontWeight: '700'
                                    }}>
                                        {item.isActive ? 'Hoạt động' : 'Vô hiệu hóa'}
                                    </span>
                                </div>

                                {/* Name */}
                                <h3 style={{
                                    fontSize: '20px',
                                    fontWeight: '700',
                                    marginBottom: '12px',
                                    color: 'var(--color-text-primary)',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                }}>
                                    {item.name}
                                </h3>

                                {/* Unit */}
                                <div style={{
                                    padding: '12px 16px',
                                    background: 'rgba(59, 130, 246, 0.1)',
                                    border: '1px solid rgba(59, 130, 246, 0.2)',
                                    borderRadius: '10px',
                                    marginBottom: '20px'
                                }}>
                                    <div style={{
                                        fontSize: '11px',
                                        color: 'var(--color-text-secondary)',
                                        marginBottom: '4px',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px'
                                    }}>
                                        Đơn vị
                                    </div>
                                    <div style={{
                                        fontSize: '16px',
                                        fontWeight: '700',
                                        color: '#3B82F6'
                                    }}>
                                        {item.unit}
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        onClick={() => openEdit('Ingredient', item, fetchIngredients)}
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
                                        onClick={() => handleDisable(item.id, item.isActive)}
                                        style={{
                                            flex: 1,
                                            padding: '12px',
                                            background: item.isActive
                                                ? 'rgba(239, 68, 68, 0.15)'
                                                : 'rgba(16, 185, 129, 0.15)',
                                            color: item.isActive ? '#EF4444' : '#10B981',
                                            border: item.isActive
                                                ? '1px solid rgba(239, 68, 68, 0.3)'
                                                : '1px solid rgba(16, 185, 129, 0.3)',
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
                                            e.currentTarget.style.background = item.isActive
                                                ? 'rgba(239, 68, 68, 0.25)'
                                                : 'rgba(16, 185, 129, 0.25)';
                                            e.currentTarget.style.transform = 'translateY(-2px)';
                                        }}
                                        onMouseOut={(e) => {
                                            e.currentTarget.style.background = item.isActive
                                                ? 'rgba(239, 68, 68, 0.15)'
                                                : 'rgba(16, 185, 129, 0.15)';
                                            e.currentTarget.style.transform = 'translateY(0)';
                                        }}
                                    >
                                        <AlertCircle size={16} />
                                        {item.isActive ? 'Tắt' : 'Bật'}
                                    </button>
                                </div>
                            </div>
                        ))
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
            `}</style>
        </div>
    );
}