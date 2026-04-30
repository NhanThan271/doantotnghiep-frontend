import React, { useEffect, useState } from 'react';
import { Edit2, Trash2, Package } from 'lucide-react';
import styles from '../../layouts/AdminLayout.module.css';

export default function Categories({ openAdd, openEdit, refreshTrigger }) {
    const [categories, setCategories] = useState([]);
    const API_BASE_URL = 'http://localhost:8080';

    const fetchCategories = () => {
        const token = localStorage.getItem('token');
        fetch(`${API_BASE_URL}/api/categories`, {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(res => res.ok ? res.json() : Promise.reject('Unauthorized hoặc lỗi khác'))
            .then(data => {
                console.log('Categories data:', data);
                setCategories(data);
            })
            .catch(err => console.error('Lỗi khi lấy dữ liệu danh mục:', err));
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    // ✅ Tự động refresh khi có trigger từ parent component
    useEffect(() => {
        if (refreshTrigger) {
            fetchCategories();
        }
    }, [refreshTrigger]);

    const handleDelete = (id) => {
        const token = localStorage.getItem('token');
        if (window.confirm('Bạn có chắc muốn xóa danh mục này không?')) {
            fetch(`${API_BASE_URL}/api/categories/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            })
                .then(res => {
                    if (!res.ok) throw new Error('Xóa thất bại');
                    alert('Xóa danh mục thành công!');
                    fetchCategories();
                })
                .catch(err => console.error(err));
        }
    };

    // Hàm xử lý URL hình ảnh
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

    return (
        <div>
            <div style={{
                padding: '24px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px'
            }}>
                <div>
                    <h2 style={{
                        fontSize: '32px',
                        fontWeight: '800',
                        marginBottom: '8px',
                        color: '#D4AF37',
                        letterSpacing: '-0.5px'
                    }}>
                        Quản lý Danh mục
                    </h2>
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>
                        Tổng số: {categories.length} danh mục
                    </p>
                </div>
                <button
                    onClick={openAdd}
                    style={{
                        padding: '12px 24px',
                        background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
                        color: '#000',
                        border: 'none',
                        borderRadius: '12px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'transform 0.2s',
                        fontSize: '14px'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                    + Thêm danh mục
                </button>
            </div>

            <div className={styles['table-wrapper']}>
                <table>
                    <thead>
                        <tr>
                            <th style={{ width: '100px' }}>Hình ảnh</th>
                            <th>Tên danh mục</th>
                            <th>Mô tả</th>
                            <th style={{ width: '150px' }}>Ngày tạo</th>
                            <th style={{ width: '150px' }}>Hành động</th>
                        </tr>
                    </thead>
                    <tbody>
                        {categories.length === 0 ? (
                            <tr>
                                <td colSpan="5" style={{ textAlign: 'center', padding: '40px' }}>
                                    <Package size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
                                    <p style={{ color: 'var(--color-text-secondary)' }}>
                                        Chưa có danh mục nào
                                    </p>
                                </td>
                            </tr>
                        ) : (
                            categories.map(c => {
                                const imageUrl = getImageUrl(c.imageUrl);
                                return (
                                    <tr key={c.id}>
                                        <td>
                                            {imageUrl ? (
                                                <img
                                                    src={imageUrl}
                                                    alt={c.name}
                                                    style={{
                                                        width: '60px',
                                                        height: '60px',
                                                        objectFit: 'cover',
                                                        borderRadius: '8px',
                                                        border: '1px solid var(--color-border)'
                                                    }}
                                                    onError={(e) => {
                                                        console.error('Image load error:', imageUrl);
                                                        e.target.style.display = 'none';
                                                        e.target.nextSibling.style.display = 'flex';
                                                    }}
                                                />
                                            ) : null}
                                            <div
                                                style={{
                                                    width: '60px',
                                                    height: '60px',
                                                    backgroundColor: 'var(--color-bg-dark)',
                                                    borderRadius: '8px',
                                                    border: '1px solid var(--color-border)',
                                                    display: imageUrl ? 'none' : 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}
                                            >
                                                <Package size={24} style={{ opacity: 0.3 }} />
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ color: 'var(--color-text-secondary)', fontWeight: '600' }}>
                                                {c.name}
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{
                                                fontSize: '14px',
                                                color: 'var(--color-text-secondary)',
                                                maxWidth: '400px',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap'
                                            }}>
                                                {c.description || 'Chưa có mô tả'}
                                            </div>
                                        </td>
                                        <td>
                                            <span style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
                                                {c.createdAt ? new Date(c.createdAt).toLocaleDateString('vi-VN') : '-'}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <button
                                                    onClick={() => openEdit('Category', c)}
                                                    style={{
                                                        padding: '8px 12px',
                                                        background: 'rgba(59, 130, 246, 0.1)',
                                                        color: '#3B82F6',
                                                        border: '1px solid rgba(59, 130, 246, 0.3)',
                                                        borderRadius: '8px',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                        transition: 'all 0.2s'
                                                    }}
                                                    onMouseOver={(e) => {
                                                        e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)';
                                                    }}
                                                    onMouseOut={(e) => {
                                                        e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)';
                                                    }}
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(c.id)}
                                                    style={{
                                                        padding: '8px 12px',
                                                        background: 'rgba(239, 68, 68, 0.1)',
                                                        color: '#EF4444',
                                                        border: '1px solid rgba(239, 68, 68, 0.3)',
                                                        borderRadius: '8px',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                        transition: 'all 0.2s'
                                                    }}
                                                    onMouseOver={(e) => {
                                                        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                                                    }}
                                                    onMouseOut={(e) => {
                                                        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
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
        </div>
    );
}