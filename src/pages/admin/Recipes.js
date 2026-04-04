import React, { useEffect, useState } from 'react';
import { Edit2, Search, Grid, List, TrendingUp, AlertCircle, ChefHat, Trash2, Plus } from 'lucide-react';
import styles from '../../layouts/AdminLayout.module.css';

export default function Recipes({ openAdd, openEdit, refreshTrigger }) {
    const [recipes, setRecipes] = useState([]);
    const [products, setProducts] = useState([]);
    const [ingredients, setIngredients] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterProduct, setFilterProduct] = useState('all');
    const [viewMode, setViewMode] = useState('table');
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

    const fetchIngredients = () => {
        const token = localStorage.getItem('token');
        fetch(`${API_BASE_URL}/api/ingredients/active`, {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(res => res.ok ? res.json() : Promise.reject('Error'))
            .then(data => setIngredients(data))
            .catch(err => console.error('Lỗi khi lấy ingredients:', err));
    };

    useEffect(() => {
        fetchRecipes();
        fetchProducts();
        fetchIngredients();
    }, []);

    useEffect(() => {
        if (refreshTrigger) {
            fetchRecipes();
        }
    }, [refreshTrigger]);

    const handleDeleteGroup = (ingredients) => {
        const token = localStorage.getItem('token');

        if (window.confirm('Xóa toàn bộ công thức của món này?')) {

            Promise.all(
                ingredients.map(i =>
                    fetch(`${API_BASE_URL}/api/recipes/${i.id}`, {
                        method: 'DELETE',
                        headers: { Authorization: `Bearer ${token}` }
                    })
                )
            )
                .then(() => {
                    alert('Xóa thành công!');
                    fetchRecipes();
                })
                .catch(err => console.error(err));
        }
    };

    // Filter logic
    const filteredRecipes = recipes.filter(item => {

        const productName = item.product?.name || '';
        const ingredientName = item.ingredient?.name || '';

        const matchesSearch =
            productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            ingredientName.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesFilter =
            filterProduct === 'all'
                ? true
                : item.product?.id === parseInt(filterProduct);

        return matchesSearch && matchesFilter;
    });

    const groupedRecipes = {};

    filteredRecipes.forEach(r => {
        const productId = r.product?.id || 'unknown';

        if (!groupedRecipes[productId]) {
            groupedRecipes[productId] = {
                product: r.product,
                ingredients: []
            };
        }

        groupedRecipes[productId].ingredients.push({
            id: r.id,
            name: r.ingredient?.name,
            quantity: r.quantityRequired,
            unit: r.ingredient?.unit
        });
    });

    // Stats calculation
    const totalRecipes = recipes.length;
    const uniqueProducts = new Set(recipes.map(r => r.product?.id)).size;
    const avgIngredientsPerProduct = uniqueProducts > 0 ? (totalRecipes / uniqueProducts).toFixed(1) : 0;

    return (
        <div>
            {/* Enhanced Header with Stats */}
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
                        borderRadius: '12px',
                        padding: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                    }}>
                        <div style={{
                            width: '48px',
                            height: '48px',
                            background: 'rgba(249, 115, 22, 0.2)',
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#F97316'
                        }}>
                            <ChefHat size={24} />
                        </div>
                        <div>
                            <div style={{ fontSize: '24px', fontWeight: '700', color: '#F97316' }}>
                                {totalRecipes}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                                Tổng công thức
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
                                {uniqueProducts}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                                Sản phẩm có công thức
                            </div>
                        </div>
                    </div>

                    <div style={{
                        background: 'rgba(59, 130, 246, 0.1)',
                        border: '1px solid rgba(59, 130, 246, 0.2)',
                        borderRadius: '12px',
                        padding: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                    }}>
                        <div style={{
                            width: '48px',
                            height: '48px',
                            background: 'rgba(59, 130, 246, 0.2)',
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#3B82F6'
                        }}>
                            <AlertCircle size={24} />
                        </div>
                        <div>
                            <div style={{ fontSize: '24px', fontWeight: '700', color: '#3B82F6' }}>
                                {avgIngredientsPerProduct}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                                TB nguyên liệu/món
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
                            <option value="all">Tất cả sản phẩm</option>
                            {products.map(product => (
                                <option key={product.id} value={product.id}>
                                    {product.name}
                                </option>
                            ))}
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
                                    background: viewMode === 'table' ? '#F97316' : 'transparent',
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
                                    background: viewMode === 'grid' ? '#F97316' : 'transparent',
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
                                <th>Sản phẩm</th>
                                <th>Nguyên liệu</th>
                                <th style={{ width: '180px' }}>Định lượng</th>
                                <th style={{ width: '180px' }}>Hành động</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Object.values(groupedRecipes).length === 0 ? (
                                <tr>
                                    <td colSpan="4" style={{ textAlign: 'center', padding: '40px' }}>
                                        Không có công thức
                                    </td>
                                </tr>
                            ) : (
                                Object.values(groupedRecipes).map(group => (
                                    <tr key={group.product?.id || Math.random()}>

                                        {/* PRODUCT */}
                                        <td>
                                            <b>{group.product?.name || 'Không có tên'}</b>
                                        </td>

                                        {/* INGREDIENT LIST */}
                                        <td>
                                            {group.ingredients.map((ing, i) => (
                                                <div key={i}>
                                                    {ing.name}
                                                </div>
                                            ))}
                                        </td>

                                        {/* QUANTITY */}
                                        <td>
                                            {group.ingredients.map((ing, i) => (
                                                <div key={i}>
                                                    {ing.quantity} {ing.unit}
                                                </div>
                                            ))}
                                        </td>

                                        {/* ACTION */}
                                        <td>

                                            <button
                                                onClick={() =>
                                                    openEdit(
                                                        'Recipe',
                                                        group,
                                                        fetchRecipes
                                                    )
                                                }
                                            >
                                                Sửa
                                            </button>

                                            <button
                                                onClick={() => handleDeleteGroup(group.ingredients)}
                                            >
                                                Xóa
                                            </button>

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
                    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                    gap: '20px',
                    animation: 'fadeIn 0.3s ease'
                }}>
                    {filteredRecipes.length === 0 ? (
                        <div style={{
                            gridColumn: '1 / -1',
                            textAlign: 'center',
                            padding: '60px 20px',
                            background: 'var(--color-bg-card)',
                            borderRadius: '16px',
                            border: '1px solid var(--color-border)'
                        }}>
                            <ChefHat size={64} style={{
                                margin: '0 auto 16px',
                                opacity: 0.2
                            }} />
                            <p style={{
                                color: 'var(--color-text-secondary)',
                                fontSize: '16px',
                                fontWeight: '500'
                            }}>
                                {searchTerm || filterProduct !== 'all'
                                    ? 'Không tìm thấy công thức nào'
                                    : 'Chưa có công thức nào'}
                            </p>
                        </div>
                    ) : (
                        filteredRecipes.map(item => (
                            <div key={item.id} style={{
                                background: 'var(--color-bg-card)',
                                border: '1px solid var(--color-border)',
                                borderRadius: '16px',
                                padding: '24px',
                                transition: 'all 0.3s ease',
                                animation: 'slideInUp 0.3s ease'
                            }}
                                onMouseOver={(e) => {
                                    e.currentTarget.style.borderColor = '#F97316';
                                    e.currentTarget.style.transform = 'translateY(-4px)';
                                    e.currentTarget.style.boxShadow = '0 12px 32px rgba(249, 115, 22, 0.2)';
                                }}
                                onMouseOut={(e) => {
                                    e.currentTarget.style.borderColor = 'var(--color-border)';
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = 'none';
                                }}>

                                {/* Icon */}
                                <div style={{
                                    marginBottom: '20px'
                                }}>
                                    <div style={{
                                        width: '56px',
                                        height: '56px',
                                        background: 'linear-gradient(135deg, #F97316, #EA580C)',
                                        borderRadius: '14px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#fff',
                                        fontWeight: '800',
                                        fontSize: '24px',
                                        boxShadow: '0 8px 20px rgba(249, 115, 22, 0.3)'
                                    }}>
                                        {item.product?.name?.charAt(0).toUpperCase() || 'P'}
                                    </div>
                                </div>

                                {/* Product Name */}
                                <h3 style={{
                                    fontSize: '20px',
                                    fontWeight: '700',
                                    marginBottom: '16px',
                                    color: 'var(--color-text-primary)',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                }}>
                                    {item.product?.name || 'N/A'}
                                </h3>

                                {/* Ingredient */}
                                <div style={{
                                    padding: '12px 16px',
                                    background: 'rgba(139, 92, 246, 0.1)',
                                    border: '1px solid rgba(139, 92, 246, 0.2)',
                                    borderRadius: '10px',
                                    marginBottom: '12px'
                                }}>
                                    <div style={{
                                        fontSize: '11px',
                                        color: 'var(--color-text-secondary)',
                                        marginBottom: '4px',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px'
                                    }}>
                                        Nguyên liệu
                                    </div>
                                    <div style={{
                                        fontSize: '16px',
                                        fontWeight: '700',
                                        color: '#8B5CF6'
                                    }}>
                                        {item.ingredient?.name || 'N/A'}
                                    </div>
                                </div>

                                {/* Quantity */}
                                <div style={{
                                    padding: '12px 16px',
                                    background: 'rgba(16, 185, 129, 0.1)',
                                    border: '1px solid rgba(16, 185, 129, 0.2)',
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
                                        Định lượng
                                    </div>
                                    <div style={{
                                        fontSize: '20px',
                                        fontWeight: '700',
                                        color: '#10B981'
                                    }}>
                                        {item.quantityRequired} {item.ingredient?.unit || ''}
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        onClick={() => openEdit('Recipe', item, fetchRecipes)}
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
                                        onClick={() => handleDeleteGroup(item.id)}
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