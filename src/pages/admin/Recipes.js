import React, { useEffect, useState } from 'react';
import { Edit2, Search, ChefHat, Trash2, Plus, ChevronDown, ChevronUp, TrendingUp, AlertCircle, FlaskConical } from 'lucide-react';
import styles from '../../layouts/AdminLayout.module.css';

export default function Recipes({ openAdd, openEdit, refreshTrigger }) {
    const [recipes, setRecipes] = useState([]);
    const [products, setProducts] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterProduct, setFilterProduct] = useState('all');
    const [expandedFoodId, setExpandedFoodId] = useState(null);
    const API_BASE_URL = 'http://localhost:8080';

    const fetchRecipes = () => {
        const token = localStorage.getItem('token');
        fetch(`${API_BASE_URL}/api/recipes`, {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(res => res.ok ? res.json() : Promise.reject('Unauthorized hoặc lỗi khác'))
            .then(data => {
                console.log('Recipes data:', data);
                setRecipes(data);
            })
            .catch(err => console.error('Lỗi khi lấy dữ liệu công thức:', err));
    };

    const fetchProducts = () => {
        const token = localStorage.getItem('token');
        fetch(`${API_BASE_URL}/api/foods`, {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(res => res.ok ? res.json() : Promise.reject('Error'))
            .then(data => setProducts(data))
            .catch(err => console.error('Lỗi khi lấy products:', err));
    };

    useEffect(() => {
        fetchRecipes();
        fetchProducts();
    }, []);

    useEffect(() => {
        if (refreshTrigger) {
            fetchRecipes();
        }
    }, [refreshTrigger]);

    // Xóa toàn bộ công thức của 1 món (xóa từng recipe theo id)
    const handleDeleteGroup = async (ingredientIds) => {
        if (!window.confirm('Bạn có chắc muốn xóa toàn bộ công thức của món này không?')) return;
        const token = localStorage.getItem('token');
        try {
            await Promise.all(
                ingredientIds.map(id =>
                    fetch(`${API_BASE_URL}/api/recipes/${id}`, {
                        method: 'DELETE',
                        headers: { Authorization: `Bearer ${token}` }
                    })
                )
            );
            alert('Xóa công thức thành công!');
            fetchRecipes();
            setExpandedFoodId(null);
        } catch (err) {
            console.error('Lỗi xóa:', err);
            alert('Xóa thất bại, vui lòng thử lại.');
        }
    };

    // Nhóm recipes theo food
    const groupedRecipes = {};
    recipes.forEach(r => {
        const foodId = r.food?.id;
        if (!foodId) return;
        if (!groupedRecipes[foodId]) {
            groupedRecipes[foodId] = {
                food: r.food,
                ingredients: []
            };
        }
        groupedRecipes[foodId].ingredients.push({
            id: r.id,
            name: r.ingredient?.name,
            quantity: r.quantityRequired,
            unit: r.ingredient?.unit
        });
    });

    // Filter theo search + filterProduct
    const filteredGroups = Object.values(groupedRecipes).filter(group => {
        const matchesSearch =
            group.food?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            group.ingredients.some(i => i.name?.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesFilter =
            filterProduct === 'all' ? true : String(group.food?.id) === filterProduct;
        return matchesSearch && matchesFilter;
    });

    // Stats
    const totalRecipes = recipes.length;
    const uniqueProducts = Object.keys(groupedRecipes).length;
    const avgIngredientsPerProduct = uniqueProducts > 0 ? (totalRecipes / uniqueProducts).toFixed(1) : 0;

    const toggleExpand = (foodId) => {
        setExpandedFoodId(prev => prev === foodId ? null : foodId);
    };

    return (
        <div>
            {/* Header */}
            <div style={{
                padding: '32px 24px 24px',
                background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.05) 0%, rgba(26, 26, 26, 0.8) 100%)',
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
                            background: 'linear-gradient(135deg, #F97316, #FB923C)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            letterSpacing: '-0.5px'
                        }}>
                            Quản lý Công thức
                        </h2>
                        <p style={{
                            color: 'var(--color-text-secondary)',
                            fontSize: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            <ChefHat size={16} />
                            Tổng số: {totalRecipes} công thức
                        </p>
                    </div>
                    <button
                        onClick={openAdd}
                        style={{
                            padding: '14px 28px',
                            background: 'linear-gradient(135deg, #F97316, #EA580C)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '14px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            fontSize: '15px',
                            boxShadow: '0 4px 16px rgba(249, 115, 22, 0.3)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.transform = 'translateY(-3px)';
                            e.currentTarget.style.boxShadow = '0 8px 24px rgba(249, 115, 22, 0.5)';
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 4px 16px rgba(249, 115, 22, 0.3)';
                        }}
                    >
                        <Plus size={18} />
                        Thêm công thức
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
                        background: 'rgba(249, 115, 22, 0.1)',
                        border: '1px solid rgba(249, 115, 22, 0.2)',
                        borderRadius: '12px', padding: '16px',
                        display: 'flex', alignItems: 'center', gap: '12px'
                    }}>
                        <div style={{
                            width: '48px', height: '48px',
                            background: 'rgba(249, 115, 22, 0.2)', borderRadius: '10px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#F97316'
                        }}>
                            <ChefHat size={24} />
                        </div>
                        <div>
                            <div style={{ fontSize: '24px', fontWeight: '700', color: '#F97316' }}>{totalRecipes}</div>
                            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Tổng công thức</div>
                        </div>
                    </div>

                    <div style={{
                        background: 'rgba(16, 185, 129, 0.1)',
                        border: '1px solid rgba(16, 185, 129, 0.2)',
                        borderRadius: '12px', padding: '16px',
                        display: 'flex', alignItems: 'center', gap: '12px'
                    }}>
                        <div style={{
                            width: '48px', height: '48px',
                            background: 'rgba(16, 185, 129, 0.2)', borderRadius: '10px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#10B981'
                        }}>
                            <TrendingUp size={24} />
                        </div>
                        <div>
                            <div style={{ fontSize: '24px', fontWeight: '700', color: '#10B981' }}>{uniqueProducts}</div>
                            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Sản phẩm có công thức</div>
                        </div>
                    </div>

                    <div style={{
                        background: 'rgba(59, 130, 246, 0.1)',
                        border: '1px solid rgba(59, 130, 246, 0.2)',
                        borderRadius: '12px', padding: '16px',
                        display: 'flex', alignItems: 'center', gap: '12px'
                    }}>
                        <div style={{
                            width: '48px', height: '48px',
                            background: 'rgba(59, 130, 246, 0.2)', borderRadius: '10px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#3B82F6'
                        }}>
                            <AlertCircle size={24} />
                        </div>
                        <div>
                            <div style={{ fontSize: '24px', fontWeight: '700', color: '#3B82F6' }}>{avgIngredientsPerProduct}</div>
                            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>TB nguyên liệu/món</div>
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
                            placeholder="Tìm kiếm công thức..."
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
                                e.target.style.borderColor = '#F97316';
                                e.target.style.boxShadow = '0 0 0 3px rgba(249, 115, 22, 0.1)';
                            }}
                            onBlur={(e) => {
                                e.target.style.borderColor = 'var(--color-border)';
                                e.target.style.boxShadow = 'none';
                            }}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                        <select
                            value={filterProduct}
                            onChange={(e) => setFilterProduct(e.target.value)}
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
                            <option value="all">Tất cả món ăn</option>
                            {products.map(food => (
                                <option key={food.id} value={food.id}>
                                    {food.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Accordion List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', animation: 'fadeIn 0.3s ease' }}>
                {filteredGroups.length === 0 ? (
                    <div style={{
                        textAlign: 'center', padding: '60px 20px',
                        background: 'var(--color-bg-card)',
                        borderRadius: '16px', border: '1px solid var(--color-border)'
                    }}>
                        <ChefHat size={64} style={{ margin: '0 auto 16px', opacity: 0.2, display: 'block' }} />
                        <p style={{ color: 'var(--color-text-secondary)', fontSize: '16px', fontWeight: '500' }}>
                            {searchTerm || filterProduct !== 'all' ? 'Không tìm thấy công thức nào' : 'Chưa có công thức nào'}
                        </p>
                    </div>
                ) : (
                    filteredGroups.map(group => {
                        const isOpen = expandedFoodId === group.food.id;
                        return (
                            <div key={group.food.id} style={{
                                background: 'var(--color-bg-card)',
                                border: `1px solid ${isOpen ? 'rgba(249, 115, 22, 0.4)' : 'var(--color-border)'}`,
                                borderRadius: '16px',
                                overflow: 'hidden',
                                transition: 'all 0.25s ease',
                                boxShadow: isOpen ? '0 8px 32px rgba(249, 115, 22, 0.12)' : 'none'
                            }}>
                                {/* Accordion Header */}
                                <div
                                    onClick={() => toggleExpand(group.food.id)}
                                    style={{
                                        display: 'flex', alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '20px 24px',
                                        cursor: 'pointer',
                                        background: isOpen ? 'rgba(249, 115, 22, 0.06)' : 'transparent',
                                        transition: 'background 0.2s ease',
                                        userSelect: 'none'
                                    }}
                                    onMouseOver={(e) => { if (!isOpen) e.currentTarget.style.background = 'rgba(249, 115, 22, 0.03)'; }}
                                    onMouseOut={(e) => { if (!isOpen) e.currentTarget.style.background = 'transparent'; }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                        <div style={{
                                            width: '48px', height: '48px', flexShrink: 0,
                                            background: isOpen
                                                ? 'linear-gradient(135deg, #F97316, #EA580C)'
                                                : 'rgba(249, 115, 22, 0.15)',
                                            borderRadius: '12px',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            color: isOpen ? '#fff' : '#F97316',
                                            fontWeight: '800', fontSize: '20px',
                                            transition: 'all 0.25s ease',
                                            boxShadow: isOpen ? '0 4px 16px rgba(249, 115, 22, 0.35)' : 'none'
                                        }}>
                                            {group.food?.name?.charAt(0).toUpperCase() || 'F'}
                                        </div>

                                        <div>
                                            <div style={{
                                                fontWeight: '700', fontSize: '17px',
                                                color: 'var(--color-text-primary)', marginBottom: '4px'
                                            }}>
                                                {group.food?.name}
                                            </div>
                                            <div style={{
                                                fontSize: '13px', color: 'var(--color-text-secondary)',
                                                display: 'flex', alignItems: 'center', gap: '6px'
                                            }}>
                                                <FlaskConical size={13} />
                                                {group.ingredients.length} nguyên liệu
                                                {!isOpen && (
                                                    <span style={{ color: 'rgba(249,115,22,0.7)', marginLeft: '4px' }}>
                                                        · {group.ingredients.slice(0, 2).map(i => i.name).join(', ')}{group.ingredients.length > 2 ? '...' : ''}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div style={{ display: 'flex', gap: '8px' }} onClick={e => e.stopPropagation()}>
                                            <button
                                                onClick={() => openEdit('Recipe', group, fetchRecipes)}
                                                style={{
                                                    padding: '8px 16px',
                                                    background: 'rgba(59, 130, 246, 0.15)',
                                                    color: '#3B82F6',
                                                    border: '1px solid rgba(59, 130, 246, 0.3)',
                                                    borderRadius: '10px', cursor: 'pointer',
                                                    display: 'flex', alignItems: 'center', gap: '6px',
                                                    transition: 'all 0.2s ease',
                                                    fontWeight: '600', fontSize: '14px'
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
                                                <Edit2 size={15} />
                                                Sửa
                                            </button>

                                            <button
                                                onClick={() => handleDeleteGroup(group.ingredients.map(i => i.id))}
                                                style={{
                                                    padding: '8px 16px',
                                                    background: 'rgba(239, 68, 68, 0.15)',
                                                    color: '#EF4444',
                                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                                    borderRadius: '10px', cursor: 'pointer',
                                                    display: 'flex', alignItems: 'center', gap: '6px',
                                                    transition: 'all 0.2s ease',
                                                    fontWeight: '600', fontSize: '14px'
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
                                                <Trash2 size={15} />
                                                Xóa
                                            </button>
                                        </div>

                                        <div style={{ color: isOpen ? '#F97316' : 'var(--color-text-secondary)', transition: 'color 0.2s ease' }}>
                                            {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                        </div>
                                    </div>
                                </div>

                                {/* Accordion Body */}
                                <div style={{
                                    maxHeight: isOpen ? '800px' : '0',
                                    overflow: 'hidden',
                                    transition: 'max-height 0.35s cubic-bezier(0.4, 0, 0.2, 1)'
                                }}>
                                    <div
                                        className={styles['table-wrapper']}
                                        style={{ borderTop: '1px solid var(--color-border)', borderRadius: '0', margin: '0' }}
                                    >
                                        <table className={styles.dataTable}>
                                            <thead>
                                                <tr>
                                                    <th style={{ width: '50px' }}>#</th>
                                                    <th>Nguyên liệu</th>
                                                    <th style={{ width: '200px' }}>Định lượng</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {group.ingredients.map((ing, idx) => (
                                                    <tr key={ing.id} style={{
                                                        animation: isOpen ? `slideInUp 0.3s ease ${idx * 0.05}s both` : 'none'
                                                    }}>
                                                        <td style={{ color: 'var(--color-text-secondary)', fontWeight: '600' }}>
                                                            {idx + 1}
                                                        </td>
                                                        <td>
                                                            <b>{ing.name}</b>
                                                        </td>
                                                        <td>
                                                            <span style={{
                                                                padding: '4px 12px',
                                                                background: 'rgba(16, 185, 129, 0.1)',
                                                                border: '1px solid rgba(16, 185, 129, 0.2)',
                                                                borderRadius: '20px',
                                                                fontSize: '13px', fontWeight: '700',
                                                                color: '#10B981'
                                                            }}>
                                                                {ing.quantity} {ing.unit}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

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