import { useState, useEffect } from 'react';
import { Edit2, Trash2, Plus, Clock } from 'lucide-react';
import styles from '../../layouts/AdminLayout.module.css';
import { showToast } from '../../hooks/useToast';

const API_BASE_URL = 'http://localhost:8080';

export default function ShiftTab() {
    const [shifts, setShifts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editTarget, setEditTarget] = useState(null);
    const [deleteConfirm, setDeleteConfirm] = useState(null);

    const [form, setForm] = useState({
        name: '',
        startTime: '',
        endTime: '',
        shiftAllowance: ''
    });

    const token = localStorage.getItem('token');
    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };

    useEffect(() => { fetchAll(); }, []);

    const fetchAll = () => {
        setLoading(true);
        fetch(`${API_BASE_URL}/api/shifts`, { headers })
            .then(r => r.ok ? r.json() : [])
            .then(data => setShifts(data))
            .catch(() => setShifts([]))
            .finally(() => setLoading(false));
    };

    const openAdd = () => {
        setEditTarget(null);
        setForm({ name: '', startTime: '', endTime: '', shiftAllowance: '' });
        setShowModal(true);
    };

    const openEdit = (shift) => {
        setEditTarget(shift);
        setForm({
            name: shift.name,
            startTime: shift.startTime?.slice(0, 5) || '',
            endTime: shift.endTime?.slice(0, 5) || '',
            shiftAllowance: shift.shiftAllowance || ''
        });
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!form.name.trim() || !form.startTime || !form.endTime) {
            showToast('error', 'Lỗi', 'Vui lòng điền đầy đủ thông tin');
            return;
        }
        if (form.startTime >= form.endTime) {
            showToast('error', 'Lỗi', 'Giờ bắt đầu phải trước giờ kết thúc');
            return;
        }

        const body = JSON.stringify({
            name: form.name.trim(),
            startTime: form.startTime,
            endTime: form.endTime,
            shiftAllowance: +form.shiftAllowance || 0
        });

        try {
            const url = editTarget
                ? `${API_BASE_URL}/api/shifts/${editTarget.id}`
                : `${API_BASE_URL}/api/shifts`;
            const method = editTarget ? 'PUT' : 'POST';

            const res = await fetch(url, { method, headers, body });
            if (!res.ok) throw new Error();

            showToast('success', 'Thành công', editTarget ? 'Cập nhật ca làm thành công!' : 'Thêm ca làm thành công!');
            setShowModal(false);
            fetchAll();
        } catch {
            showToast('error', 'Thất bại', 'Có lỗi xảy ra, vui lòng thử lại!');
        }
    };

    const handleDelete = (id) => setDeleteConfirm(id);

    const confirmDelete = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/shifts/${deleteConfirm}`, {
                method: 'DELETE', headers
            });
            if (!res.ok) throw new Error();
            showToast('success', 'Đã xóa', 'Xóa ca làm thành công!');
            setDeleteConfirm(null);
            fetchAll();
        } catch {
            showToast('error', 'Thất bại', 'Không thể xóa. Vui lòng thử lại!');
            setDeleteConfirm(null);
        }
    };

    if (loading) return (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
            <p style={{ color: 'var(--color-text-secondary)' }}>Đang tải...</p>
        </div>
    );

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h2 style={{
                        fontSize: '32px', fontWeight: '800', marginBottom: '8px',
                        background: 'linear-gradient(135deg, var(--color-primary-light))',
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
                    }}>Ca làm việc</h2>
                </div>
                <button
                    onClick={openAdd}
                    style={{
                        padding: '12px 24px',
                        background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
                        color: '#000', border: 'none', borderRadius: '12px',
                        fontWeight: '600', cursor: 'pointer', fontSize: '14px',
                        display: 'flex', alignItems: 'center', gap: '8px', transition: 'transform 0.2s'
                    }}
                    onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
                >
                    <Plus size={18} /> Thêm ca
                </button>
            </div>

            {/* Table */}
            <div className={styles['table-wrapper1']}>
                <table>
                    <thead>
                        <tr>
                            <th>Tên ca</th>
                            <th>Giờ bắt đầu</th>
                            <th>Giờ kết thúc</th>
                            <th>Số giờ</th>
                            <th>Phụ cấp ca</th>
                            <th>Hành động</th>
                        </tr>
                    </thead>
                    <tbody>
                        {shifts.length === 0 ? (
                            <tr>
                                <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-secondary)' }}>
                                    Chưa có ca làm nào
                                </td>
                            </tr>
                        ) : (
                            shifts.map(s => (
                                <tr key={s.id}>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Clock size={16} style={{ color: 'var(--color-text-secondary)' }} />
                                            <strong>{s.name}</strong>
                                        </div>
                                    </td>
                                    <td>{s.startTime?.slice(0, 5)}</td>
                                    <td>{s.endTime?.slice(0, 5)}</td>
                                    <td>{s.workingHours ? `${s.workingHours}h` : '—'}</td>
                                    <td>{s.shiftAllowance?.toLocaleString('vi-VN')}đ</td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button onClick={() => openEdit(s)} style={{
                                                padding: '8px 12px',
                                                background: 'rgba(59,130,246,0.1)', color: '#3B82F6',
                                                border: '1px solid rgba(59,130,246,0.3)',
                                                borderRadius: '8px', cursor: 'pointer',
                                                display: 'flex', alignItems: 'center', gap: '4px'
                                            }}>
                                                <Edit2 size={16} /> Sửa
                                            </button>
                                            <button onClick={() => handleDelete(s.id)} style={{
                                                padding: '8px 12px',
                                                background: 'rgba(239,68,68,0.1)', color: '#EF4444',
                                                border: '1px solid rgba(239,68,68,0.3)',
                                                borderRadius: '8px', cursor: 'pointer',
                                                display: 'flex', alignItems: 'center', gap: '4px'
                                            }}>
                                                <Trash2 size={16} /> Xóa
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal thêm/sửa */}
            {showModal && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
                }}>
                    <div style={{
                        background: '#1a1a1a', border: '1px solid #2a2a2a',
                        borderRadius: '16px', padding: '28px', width: '420px'
                    }}>
                        <h3 style={{ color: 'var(--color-text-secondary)', fontSize: '18px', fontWeight: '700', marginBottom: '20px' }}>
                            {editTarget ? 'Sửa ca làm' : 'Thêm ca làm'}
                        </h3>

                        {[
                            { label: 'Tên ca *', key: 'name', type: 'text', placeholder: 'VD: Ca sáng' },
                            { label: 'Giờ bắt đầu *', key: 'startTime', type: 'time' },
                            { label: 'Giờ kết thúc *', key: 'endTime', type: 'time' },
                            { label: 'Phụ cấp ca (VNĐ)', key: 'shiftAllowance', type: 'number', placeholder: 'VD: 50000' },
                        ].map(field => (
                            <div key={field.key} style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', color: 'var(--color-text-secondary)', fontSize: '13px', marginBottom: '6px' }}>
                                    {field.label}
                                </label>
                                <input
                                    type={field.type}
                                    value={form[field.key]}
                                    onChange={e => setForm({ ...form, [field.key]: e.target.value })}
                                    placeholder={field.placeholder}
                                    style={{
                                        width: '100%', padding: '10px 14px', background: '#2a2a2a',
                                        border: '1px solid #3a3a3a', borderRadius: '10px',
                                        color: 'var(--color-text-secondary)', fontSize: '14px', outline: 'none',
                                        boxSizing: 'border-box',
                                        colorScheme: 'dark'
                                    }}
                                />
                            </div>
                        ))}

                        <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                            <button onClick={() => setShowModal(false)} style={{
                                flex: 1, padding: '12px', background: 'transparent',
                                border: '1px solid #2a2a2a', borderRadius: '10px',
                                color: 'var(--color-text-secondary)', cursor: 'pointer', fontWeight: '600'
                            }}>Hủy</button>
                            <button onClick={handleSave} style={{
                                flex: 1, padding: '12px',
                                background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
                                border: 'none', borderRadius: '10px',
                                color: '#000', cursor: 'pointer', fontWeight: '600'
                            }}>{editTarget ? 'Cập nhật' : 'Thêm mới'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirm xóa — tương tự EmploymentTypeTab */}
            {deleteConfirm && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
                }}>
                    <div style={{
                        background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '16px',
                        padding: '28px', width: '380px', textAlign: 'center'
                    }}>
                        <h3 style={{ color: '#fff', marginBottom: '8px' }}>Xác nhận xóa ca làm?</h3>
                        <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px', marginBottom: '24px' }}>
                            Hành động này không thể hoàn tác!
                        </p>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button onClick={() => setDeleteConfirm(null)} style={{
                                flex: 1, padding: '12px', background: 'transparent',
                                border: '1px solid #2a2a2a', borderRadius: '10px',
                                color: 'var(--color-text-secondary)', cursor: 'pointer', fontWeight: '600'
                            }}>Hủy</button>
                            <button onClick={confirmDelete} style={{
                                flex: 1, padding: '12px',
                                background: 'linear-gradient(135deg, #EF4444, #DC2626)',
                                border: 'none', borderRadius: '10px',
                                color: '#fff', cursor: 'pointer', fontWeight: '600'
                            }}>Xóa</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}