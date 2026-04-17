import React, { useState } from 'react';
import { X, Briefcase, ChevronRight, CheckCircle2, AlertCircle } from 'lucide-react';
import styles from '../../../layouts/AdminLayout.module.css';

const POSITIONS = [
    { value: 'WAITER', label: 'Phục vụ' },
    { value: 'CHEF', label: 'Đầu bếp' },
    { value: 'CASHIER', label: 'Thu ngân' },
    { value: 'STOCK', label: 'Kho' },
];

export default function StaffPositionForm({ employee, staffInfo, closeForm, onSave }) {
    // staffInfo: { id, position } nếu đã có staff record; null nếu chưa
    const [selectedPosition, setSelectedPosition] = useState(
        staffInfo?.position || 'WAITER'
    );
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const API_BASE_URL = 'http://localhost:8080';
    const isEdit = !!staffInfo?.id;

    const handleSubmit = async () => {
        setLoading(true);
        setError('');

        try {
            const token = localStorage.getItem('token');

            if (isEdit) {
                // Sửa chức vụ: PUT /api/staff/{id}/position?position=WAITER
                const res = await fetch(
                    `${API_BASE_URL}/api/staff/${staffInfo.id}/position?position=${selectedPosition}`,
                    {
                        method: 'PUT',
                        headers: { 'Authorization': `Bearer ${token}` }
                    }
                );
                if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    throw new Error(err.message || 'Cập nhật chức vụ thất bại');
                }
            } else {
                // Gán chức vụ mới: POST /api/staff?userId=&branchId=&position=
                const res = await fetch(
                    `${API_BASE_URL}/api/staff?userId=${employee.id}&branchId=${employee.branch?.id}&position=${selectedPosition}`,
                    {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}` }
                    }
                );
                if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    throw new Error(err.message || 'Gán chức vụ thất bại');
                }
            }

            if (onSave) onSave();
            closeForm();
        } catch (err) {
            setError(err.message || 'Có lỗi xảy ra, vui lòng thử lại!');
        } finally {
            setLoading(false);
        }
    };

    const currentPos = POSITIONS.find(p => p.value === selectedPosition);

    return (
        <div className={styles['modal-backdrop']} onClick={closeForm}>
            <div
                className={styles.modal}
                onClick={e => e.stopPropagation()}
                style={{ maxWidth: '420px', padding: '28px' }}
            >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            width: '40px', height: '40px',
                            background: 'rgba(139, 92, 246, 0.1)',
                            borderRadius: '10px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <Briefcase size={20} color="#8B5CF6" />
                        </div>
                        <div>
                            <h2 style={{ fontSize: '18px', fontWeight: '700', margin: 0, color: 'var(--color-text-primary)' }}>
                                {isEdit ? 'Sửa chức vụ' : 'Gán chức vụ'}
                            </h2>
                            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: '3px 0 0 0' }}>
                                {employee.fullName || employee.username}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={closeForm}
                        style={{
                            width: '32px', height: '32px', borderRadius: '8px',
                            border: '1px solid var(--color-border)', background: 'transparent',
                            color: 'var(--color-text-secondary)', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}
                        onMouseOver={e => {
                            e.currentTarget.style.background = 'rgba(239,68,68,0.1)';
                            e.currentTarget.style.borderColor = '#EF4444';
                            e.currentTarget.style.color = '#EF4444';
                        }}
                        onMouseOut={e => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.borderColor = 'var(--color-border)';
                            e.currentTarget.style.color = 'var(--color-text-secondary)';
                        }}
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Error */}
                {error && (
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        padding: '12px', marginBottom: '16px',
                        background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                        borderRadius: '8px', color: '#EF4444', fontSize: '14px'
                    }}>
                        <AlertCircle size={16} />
                        <span>{error}</span>
                    </div>
                )}

                {/* Nếu là MANAGER thì không có position */}
                {employee.role === 'MANAGER' ? (
                    <div style={{
                        padding: '20px', textAlign: 'center',
                        background: 'rgba(245,158,11,0.08)',
                        border: '1px solid rgba(245,158,11,0.2)',
                        borderRadius: '12px', color: '#F59E0B'
                    }}>
                        <span style={{ fontSize: '32px' }}>👔</span>
                        <p style={{ margin: '12px 0 0 0', fontWeight: '600' }}>Quản lý chi nhánh</p>
                        <p style={{ margin: '4px 0 0 0', fontSize: '13px', opacity: 0.8 }}>
                            Role MANAGER không có chức vụ cụ thể
                        </p>
                    </div>
                ) : (
                    <>
                        <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '14px' }}>
                            Chọn chức vụ phù hợp với nhân viên:
                        </p>

                        {/* Position cards */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
                            {POSITIONS.map(pos => {
                                const isSelected = selectedPosition === pos.value;
                                return (
                                    <button
                                        key={pos.value}
                                        type="button"
                                        onClick={() => setSelectedPosition(pos.value)}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '14px',
                                            padding: '14px 16px', borderRadius: '12px', cursor: 'pointer',
                                            border: isSelected
                                                ? '2px solid #8B5CF6'
                                                : '1px solid var(--color-border)',
                                            background: isSelected
                                                ? 'rgba(139,92,246,0.08)'
                                                : 'var(--color-bg-secondary)',
                                            transition: 'all 0.15s', textAlign: 'left', width: '100%'
                                        }}
                                        onMouseOver={e => {
                                            if (!isSelected) e.currentTarget.style.borderColor = '#8B5CF6';
                                        }}
                                        onMouseOut={e => {
                                            if (!isSelected) e.currentTarget.style.borderColor = 'var(--color-border)';
                                        }}
                                    >
                                        <span style={{ fontSize: '28px', lineHeight: 1 }}>{pos.emoji}</span>
                                        <div style={{ flex: 1 }}>
                                            <div style={{
                                                fontWeight: '600', fontSize: '14px',
                                                color: isSelected ? '#8B5CF6' : 'var(--color-text-primary)'
                                            }}>
                                                {pos.label}
                                            </div>
                                            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                                                {pos.desc}
                                            </div>
                                        </div>
                                        {isSelected && <CheckCircle2 size={20} color="#8B5CF6" />}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Buttons */}
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                                type="button"
                                onClick={closeForm}
                                disabled={loading}
                                style={{
                                    flex: 1, padding: '12px', background: 'transparent',
                                    color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)',
                                    borderRadius: '12px', fontWeight: '600', cursor: 'pointer',
                                    fontSize: '14px', transition: 'all 0.2s'
                                }}
                                onMouseOver={e => {
                                    e.currentTarget.style.background = 'var(--color-hover)';
                                    e.currentTarget.style.color = 'var(--color-text-primary)';
                                }}
                                onMouseOut={e => {
                                    e.currentTarget.style.background = 'transparent';
                                    e.currentTarget.style.color = 'var(--color-text-secondary)';
                                }}
                            >
                                Hủy
                            </button>
                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={loading}
                                style={{
                                    flex: 1, padding: '12px',
                                    background: loading ? 'var(--color-text-secondary)' : 'linear-gradient(135deg, #8B5CF6, #7C3AED)',
                                    color: '#fff', border: 'none', borderRadius: '12px',
                                    fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer',
                                    fontSize: '14px', transition: 'transform 0.2s',
                                    opacity: loading ? 0.6 : 1,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                                }}
                                onMouseOver={e => { if (!loading) e.currentTarget.style.transform = 'translateY(-2px)'; }}
                                onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
                            >
                                {loading ? 'Đang lưu...' : (
                                    <>
                                        {isEdit ? 'Cập nhật' : 'Gán chức vụ'}
                                        <ChevronRight size={16} />
                                    </>
                                )}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}