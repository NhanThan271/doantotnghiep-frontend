import React, { useEffect, useState } from 'react';
import { Edit2, Trash2, MapPin } from 'lucide-react';
import styles from '../../layouts/AdminLayout.module.css';
import { showToast } from '../../hooks/useToast';

export default function Branches({ openAdd, openEdit, refreshTrigger }) {
    const [branches, setBranches] = useState([]);
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const API_BASE_URL = 'http://localhost:8080';

    const fetchBranches = () => {
        const token = localStorage.getItem('token');
        fetch(`${API_BASE_URL}/api/branches`, {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(res => res.ok ? res.json() : Promise.reject('Unauthorized hoặc lỗi khác'))
            .then(data => {
                console.log('Branches data:', data);
                setBranches(data);
            })
            .catch(err => console.error('Lỗi khi lấy dữ liệu chi nhánh:', err));
    };

    useEffect(() => {
        fetchBranches();
    }, []);

    // ✅ Tự động refresh khi có trigger từ parent component
    useEffect(() => {
        if (refreshTrigger) {
            fetchBranches();
        }
    }, [refreshTrigger]);

    const handleDelete = (id) => {
        setDeleteConfirm(id);
    };

    const confirmDelete = () => {
        const token = localStorage.getItem('token');
        fetch(`${API_BASE_URL}/api/branches/${deleteConfirm}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(res => {
                if (!res.ok) throw new Error('Xóa thất bại');
                showToast('success', 'Xóa thành công!', 'Chi nhánh đã được xóa.');
                setDeleteConfirm(null);
                fetchBranches();
            })
            .catch(err => {
                console.error(err);
                showToast('error', 'Xóa thất bại', 'Không thể xóa chi nhánh. Vui lòng thử lại!');
                setDeleteConfirm(null);
            });

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
                        background: 'linear-gradient(135deg, var(--color-primary-light))',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        letterSpacing: '-0.5px'
                    }}>
                        Quản lý Chi nhánh
                    </h2>
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>
                        Tổng số: {branches.length} chi nhánh
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
                    + Thêm chi nhánh
                </button>
            </div>

            <div className={styles['table-wrapper']}>
                <table>
                    <thead>
                        <tr>
                            <th>Tên chi nhánh</th>
                            <th>Địa chỉ</th>
                            <th>Số điện thoại</th>
                            <th style={{ width: '120px' }}>Trạng thái</th>
                            <th style={{ width: '150px' }}>Ngày tạo</th>
                            <th style={{ width: '150px' }}>Hành động</th>
                        </tr>
                    </thead>
                    <tbody>
                        {branches.length === 0 ? (
                            <tr>
                                <td colSpan="6" style={{ textAlign: 'center', padding: '40px' }}>
                                    <MapPin size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
                                    <p style={{ color: 'var(--color-text-secondary)' }}>
                                        Chưa có chi nhánh nào
                                    </p>
                                </td>
                            </tr>
                        ) : (
                            branches.map(b => (
                                <tr key={b.id}>
                                    <td>
                                        <div style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-secondary)' }}>
                                            <MapPin size={18} />
                                            {b.name}
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{
                                            fontSize: '14px',
                                            color: 'var(--color-text-secondary)',
                                            maxWidth: '300px',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap'
                                        }}>
                                            {b.address || 'Chưa có địa chỉ'}
                                        </div>
                                    </td>
                                    <td>
                                        <span style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
                                            {b.phone || '-'}
                                        </span>
                                    </td>
                                    <td>
                                        <span style={{
                                            display: 'inline-block',
                                            padding: '6px 12px',
                                            borderRadius: '20px',
                                            fontSize: '13px',
                                            fontWeight: '600',
                                            background: b.isActive
                                                ? 'rgba(34, 197, 94, 0.1)'
                                                : 'rgba(156, 163, 175, 0.1)',
                                            color: b.isActive ? '#22C55E' : '#9CA3AF',
                                            border: b.isActive
                                                ? '1px solid rgba(34, 197, 94, 0.3)'
                                                : '1px solid rgba(156, 163, 175, 0.3)',
                                            whiteSpace: 'nowrap'
                                        }}>
                                            {b.isActive ? 'Hoạt động' : 'Ngừng'}
                                        </span>
                                    </td>
                                    <td>
                                        <span style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
                                            {b.createdAt ? new Date(b.createdAt).toLocaleDateString('vi-VN') : '-'}
                                        </span>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button
                                                onClick={() => openEdit('Branch', b)}
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
                                                onClick={() => handleDelete(b.id)}
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
                            ))
                        )}
                    </tbody>
                </table>
            </div>
            {deleteConfirm && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
                }}>
                    <div style={{
                        background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '16px',
                        padding: '28px', width: '380px', textAlign: 'center',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
                    }}>
                        <div style={{
                            width: '56px', height: '56px', background: 'rgba(239,68,68,0.1)',
                            borderRadius: '50%', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', margin: '0 auto 16px'
                        }}>
                            <Trash2 size={24} color="#EF4444" />
                        </div>
                        <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>
                            Xác nhận xóa
                        </h3>
                        <p style={{ color: '#B8B8B8', fontSize: '14px', marginBottom: '24px' }}>
                            Bạn có chắc muốn xóa chi nhánh này? Hành động này không thể hoàn tác!
                        </p>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button onClick={() => setDeleteConfirm(null)} style={{
                                flex: 1, padding: '12px', background: 'transparent',
                                border: '1px solid #2a2a2a', borderRadius: '10px',
                                color: '#B8B8B8', cursor: 'pointer', fontWeight: '600'
                            }}>
                                Hủy
                            </button>
                            <button onClick={confirmDelete} style={{
                                flex: 1, padding: '12px',
                                background: 'linear-gradient(135deg, #EF4444, #DC2626)',
                                border: 'none', borderRadius: '10px',
                                color: '#fff', cursor: 'pointer', fontWeight: '600'
                            }}>
                                Xóa
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}