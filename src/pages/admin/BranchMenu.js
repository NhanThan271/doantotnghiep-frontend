import React, { useEffect, useState } from 'react';
import { Store, Package, DollarSign, ToggleLeft, ToggleRight, Check, X, Search, MapPin } from 'lucide-react';
import axios from 'axios';
import './BranchMenu.css';

export default function BranchMenuDistribution() {
    const [branches, setBranches] = useState([]);
    const [products, setProducts] = useState([]);
    const [branchProducts, setBranchProducts] = useState([]);
    const [selectedBranch, setSelectedBranch] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [editingPrice, setEditingPrice] = useState({});
    const [loading, setLoading] = useState(false);
    const API_BASE_URL = 'http://localhost:8080';

    useEffect(() => {
        fetchBranches();
    }, []);

    useEffect(() => {
        if (selectedBranch) {
            fetchProductsWithPromotions(selectedBranch.id);
            fetchBranchProducts(selectedBranch.id);
        }
    }, [selectedBranch]);

    const fetchProductsWithPromotions = async (branchId) => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(
                `${API_BASE_URL}/api/branch-foods/branch/${branchId}/with-promotions`,
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );
            console.log('foods with promotions:', response.data);
            setProducts(response.data);
        } catch (error) {
            console.error('Lỗi khi lấy sản phẩm có khuyến mãi:', error);
        }
    };

    const fetchBranches = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_BASE_URL}/api/branches`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setBranches(response.data);
            if (response.data.length > 0 && !selectedBranch) {
                setSelectedBranch(response.data[0]);
            }
        } catch (error) {
            console.error('Lỗi khi lấy chi nhánh:', error);
        }
    };

    const fetchBranchProducts = async (branchId) => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(
                `${API_BASE_URL}/api/branch-foods/branch/${branchId}`,
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );
            setBranchProducts(response.data);
        } catch (error) {
            console.error('Lỗi khi lấy sản phẩm chi nhánh:', error);
        }
    };

    const getBranchProduct = (foodId) => {
        return branchProducts.find(bp => {
            const bpProductId = bp.food?.id;
            return Number(bpProductId) === Number(foodId);
        });
    };

    const toggleProductStatus = async (food) => {
        const token = localStorage.getItem('token');
        const branchProduct = getBranchProduct(food.id);

        setLoading(true);

        try {
            let updatedBP;

            if (branchProduct) {
                updatedBP = {
                    ...branchProduct,
                    isActive: !branchProduct.isActive
                };

                await axios.post(`${API_BASE_URL}/api/branch-foods`, updatedBP, {
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`
                    }
                });
            } else {
                updatedBP = {
                    branch: { id: selectedBranch.id },
                    food: { id: food.id },
                    customPrice: null,
                    isActive: true
                };

                await axios.post(`${API_BASE_URL}/api/branch-foods`, updatedBP, {
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`
                    }
                });
            }

            // ⭐ Reload lại cả 2 API
            await fetchBranchProducts(selectedBranch.id);
            await fetchProductsWithPromotions(selectedBranch.id);

        } catch (error) {
            console.error('Lỗi:', error);
        } finally {
            setLoading(false);
        }
    };

    const updateCustomPrice = async (food, customPrice) => {
        const token = localStorage.getItem('token');
        const branchProduct = getBranchProduct(food.id);

        setLoading(true);

        const price = customPrice === '' ? null : parseFloat(customPrice);

        try {
            if (branchProduct) {
                const updatedBP = {
                    ...branchProduct,
                    customPrice: price
                };
                await axios.post(`${API_BASE_URL}/api/branch-foods`, updatedBP, {
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`
                    }
                });
            } else {
                const newBP = {
                    branch: { id: selectedBranch.id },
                    product: { id: food.id },
                    customPrice: price,
                    isActive: true
                };
                await axios.post(`${API_BASE_URL}/api/branch-foods`, newBP, {
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`
                    }
                });
            }

            // ⭐ Reload lại cả 2 API
            await fetchBranchProducts(selectedBranch.id);
            await fetchProductsWithPromotions(selectedBranch.id);
            setEditingPrice({});
        } catch (error) {
            console.error('Lỗi:', error);
        } finally {
            setLoading(false);
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

    const filteredProducts = products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());

        if (filterStatus === 'active') {
            return matchesSearch && p.isActive;
        } else if (filterStatus === 'inactive') {
            return matchesSearch && !p.isActive;
        }
        return matchesSearch;
    });

    const activeCount = products.filter(p => p.isActive).length;
    const customPriceCount = products.filter(p => p.branchPrice !== p.originalPrice).length;

    return (
        <div>
            {/* Header */}
            <div style={{
                padding: '32px 24px 24px',
                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.05) 0%, rgba(26, 26, 26, 0.8) 100%)',
                borderRadius: '20px',
                marginBottom: '24px',
                border: '1px solid rgba(139, 92, 246, 0.2)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
            }}>
                <h2 style={{
                    fontSize: '32px',
                    fontWeight: '800',
                    marginBottom: '8px',
                    background: 'linear-gradient(135deg, #8B5CF6, #A78BFA)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    letterSpacing: '-0.5px'
                }}>
                    Phân phối Menu Chi nhánh
                </h2>
                <p style={{
                    color: 'var(--color-text-secondary)',
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}>
                    <Store size={16} />
                    Quản lý món ăn theo từng chi nhánh
                </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '24px' }}>
                {/* Branches Sidebar */}
                <div style={{
                    background: 'var(--color-bg-card)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '16px',
                    padding: '20px',
                    height: 'fit-content'
                }}>
                    <h3 style={{
                        fontSize: '16px',
                        fontWeight: '700',
                        marginBottom: '16px',
                        color: 'var(--color-text-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        <MapPin size={18} />
                        Chi nhánh
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {branches.map(branch => (
                            <button
                                key={branch.id}
                                onClick={() => setSelectedBranch(branch)}
                                className={selectedBranch?.id === branch.id ? 'branch-btn-active' : 'branch-btn'}
                            >
                                <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                                    {branch.name}
                                </div>
                                <div style={{
                                    fontSize: '12px',
                                    opacity: 0.8,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                }}>
                                    {branch.address}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Main Content */}
                <div>
                    {selectedBranch && (
                        <>
                            {/* Stats */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(3, 1fr)',
                                gap: '16px',
                                marginBottom: '24px'
                            }}>
                                <div style={{
                                    background: 'rgba(16, 185, 129, 0.1)',
                                    border: '1px solid rgba(16, 185, 129, 0.2)',
                                    borderRadius: '12px',
                                    padding: '16px'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
                                            <Check size={24} />
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '24px', fontWeight: '700', color: '#10B981' }}>
                                                {activeCount}
                                            </div>
                                            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                                                Đang bán
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div style={{
                                    background: 'rgba(139, 92, 246, 0.1)',
                                    border: '1px solid rgba(139, 92, 246, 0.2)',
                                    borderRadius: '12px',
                                    padding: '16px'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
                                            <DollarSign size={24} />
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '24px', fontWeight: '700', color: '#8B5CF6' }}>
                                                {customPriceCount}
                                            </div>
                                            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                                                Giá riêng
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div style={{
                                    background: 'rgba(59, 130, 246, 0.1)',
                                    border: '1px solid rgba(59, 130, 246, 0.2)',
                                    borderRadius: '12px',
                                    padding: '16px'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
                                            <Package size={24} />
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '24px', fontWeight: '700', color: '#3B82F6' }}>
                                                {products.length}
                                            </div>
                                            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                                                Tổng món
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Search & Filter */}
                            <div style={{
                                display: 'flex',
                                gap: '12px',
                                marginBottom: '20px',
                                flexWrap: 'wrap',
                                alignItems: 'center'
                            }}>
                                <div style={{ flex: '1', minWidth: '250px', position: 'relative' }}>
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
                                        className='search-input'
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
                                    />
                                </div>

                                <select
                                    value={filterStatus}
                                    onChange={(e) => setFilterStatus(e.target.value)}
                                    className='search-input1'
                                >
                                    <option value="all">Tất cả</option>
                                    <option value="active">Đang bán</option>
                                    <option value="inactive">Không bán</option>
                                </select>
                            </div>

                            {/* Products Grid */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                                gap: '20px',
                                animation: 'fadeIn 0.3s ease'
                            }}>
                                {filteredProducts.length === 0 ? (
                                    <div className='empty-state'>
                                        <Package size={64} style={{
                                            margin: '0 auto 16px',
                                            opacity: 0.2,
                                            display: 'block'
                                        }} />
                                        <p>
                                            {searchTerm || filterStatus !== 'all'
                                                ? 'Không tìm thấy sản phẩm nào'
                                                : 'Chưa có sản phẩm nào'}
                                        </p>
                                    </div>
                                ) : (
                                    filteredProducts.map(product => {
                                        // ⭐ Backend đã tính toán sẵn
                                        const isActive = product.isActive;
                                        const branchPrice = product.branchPrice;
                                        const finalPrice = product.finalPrice;
                                        const hasPromotion = product.hasPromotion;
                                        const imageUrl = getImageUrl(product.imageUrl);
                                        const isEditing = editingPrice[product.id] !== undefined;
                                        const branchProduct = getBranchProduct(product.id);
                                        const customPrice = branchProduct?.customPrice;

                                        return (
                                            <div key={product.id} className='product-card' style={{
                                                border: `1px solid ${isActive ? 'rgba(16, 185, 129, 0.3)' : 'var(--color-border)'}`,
                                                opacity: loading ? 0.6 : 1
                                            }}>
                                                {/* Image */}
                                                <div className='product-image-container'>
                                                    {imageUrl ? (
                                                        <img
                                                            src={imageUrl}
                                                            alt={product.name}
                                                            className='product-image'
                                                            onError={(e) => {
                                                                e.target.style.display = 'none';
                                                                e.target.nextSibling.style.display = 'flex';
                                                            }}
                                                        />
                                                    ) : null}
                                                    <div className='product-image-placeholder' style={{
                                                        display: imageUrl ? 'none' : 'flex'
                                                    }}>
                                                        <Package size={48} style={{ opacity: 0.2 }} />
                                                    </div>

                                                    {/* Toggle Button */}
                                                    <button
                                                        onClick={() => toggleProductStatus(product)}
                                                        disabled={loading}
                                                        className={isActive ? 'toggle-btn-active' : 'toggle-btn-inactive'}
                                                    >
                                                        {isActive ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                                                        {isActive ? 'Đang bán' : 'Không bán'}
                                                    </button>

                                                    {/* Promotion Badge */}
                                                    {hasPromotion && (
                                                        <div style={{
                                                            position: 'absolute',
                                                            top: '12px',
                                                            left: '12px',
                                                            padding: '6px 12px',
                                                            background: 'linear-gradient(135deg, #D4AF37, #F4E4C1)',
                                                            color: '#000',
                                                            borderRadius: '8px',
                                                            fontSize: '12px',
                                                            fontWeight: '700',
                                                            boxShadow: '0 4px 12px rgba(212, 175, 55, 0.4)',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '4px'
                                                        }}>
                                                            {product.discountPercentage
                                                                ? `-${product.discountPercentage}%`
                                                                : `-${parseFloat(product.discountAmount).toLocaleString('vi-VN')}đ`}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Content */}
                                                <div style={{ padding: '20px' }}>
                                                    <h3 className='product-title'>
                                                        {product.name}
                                                    </h3>

                                                    {product.description && (
                                                        <p className='product-description'>
                                                            {product.description}
                                                        </p>
                                                    )}

                                                    {/* Promotion Info */}
                                                    {hasPromotion && (
                                                        <div style={{
                                                            background: 'rgba(212, 175, 55, 0.1)',
                                                            border: '1px solid rgba(212, 175, 55, 0.3)',
                                                            borderRadius: '8px',
                                                            padding: '8px 12px',
                                                            marginBottom: '12px',
                                                            fontSize: '12px',
                                                            color: '#D4AF37',
                                                            fontWeight: '600'
                                                        }}>
                                                            {product.promotionName}
                                                        </div>
                                                    )}

                                                    {/* Price Section */}
                                                    <div style={{
                                                        borderTop: '1px solid var(--color-border)',
                                                        paddingTop: '16px',
                                                        marginBottom: '16px'
                                                    }}>
                                                        <div style={{
                                                            display: 'flex',
                                                            justifyContent: 'space-between',
                                                            alignItems: 'center',
                                                            marginBottom: '12px'
                                                        }}>
                                                            <div>
                                                                <div className='price-label'>
                                                                    {customPrice ? 'Giá riêng' : 'Giá gốc'}
                                                                </div>
                                                                <div className='price-value' style={{
                                                                    color: hasPromotion ? 'var(--color-text-secondary)' : '#8B5CF6',
                                                                    textDecoration: hasPromotion ? 'line-through' : 'none',
                                                                    fontSize: hasPromotion ? '16px' : '18px'
                                                                }}>
                                                                    {parseFloat(branchPrice).toLocaleString('vi-VN')}đ
                                                                </div>
                                                            </div>

                                                            {hasPromotion && (
                                                                <div style={{ textAlign: 'right' }}>
                                                                    <div className="price-label">
                                                                        Giá khuyến mãi
                                                                    </div>
                                                                    <div style={{
                                                                        fontSize: '22px',
                                                                        fontWeight: '800',
                                                                        color: '#D4AF37'
                                                                    }}>
                                                                        {parseFloat(finalPrice).toLocaleString('vi-VN')}đ
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Custom Price Input */}
                                                        {isActive && (
                                                            <div>
                                                                {isEditing ? (
                                                                    <div style={{ display: 'flex', gap: '8px' }}>
                                                                        <input
                                                                            type="number"
                                                                            placeholder="Nhập giá riêng..."
                                                                            defaultValue={customPrice || ''}
                                                                            onChange={(e) => {
                                                                                setEditingPrice({
                                                                                    ...editingPrice,
                                                                                    [product.id]: e.target.value
                                                                                });
                                                                            }}
                                                                            className='price-input'
                                                                        />
                                                                        <button
                                                                            onClick={() => updateCustomPrice(product, editingPrice[product.id])}
                                                                            disabled={loading}
                                                                            className='btn-confirm'
                                                                        >
                                                                            <Check size={18} />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => {
                                                                                const newEditing = { ...editingPrice };
                                                                                delete newEditing[product.id];
                                                                                setEditingPrice(newEditing);
                                                                            }}
                                                                            className='btn-cancel'
                                                                        >
                                                                            <X size={18} />
                                                                        </button>
                                                                    </div>
                                                                ) : (
                                                                    <button
                                                                        onClick={() => setEditingPrice({ ...editingPrice, [product.id]: customPrice || '' })}
                                                                        className='btn-set-price'
                                                                    >
                                                                        {customPrice ? 'Sửa giá riêng' : 'Đặt giá riêng'}
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>

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