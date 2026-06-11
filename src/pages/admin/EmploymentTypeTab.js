import { useState, useEffect } from 'react';
import { Edit2, Trash2, Plus, Briefcase } from 'lucide-react';
import styles from '../../layouts/AdminLayout.module.css';
import { showToast } from '../../hooks/useToast';

const API_BASE_URL = '';

export default function EmploymentTypeTab() {
    const [types, setTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editTarget, setEditTarget] = useState(null);
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [form, setForm] = useState({
        name: '',
        maxShiftPerMonth: '',
        salaryCoefficient: ''
    });

    const token = localStorage.getItem('token');
    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };

    useEffect(() => { fetchAll(); }, []);

    const fetchAll = () => {
        setLoading(true);
        fetch(`${API_BASE_URL}/api/employment-types`, { headers })
            .then(r => r.ok ? r.json() : [])
            .then(data => setTypes(data))
            .catch(() => setTypes([]))
            .finally(() => setLoading(false));
    };

    const openAdd = () => {
        setEditTarget(null);
        setForm({ name: '', maxShiftPerMonth: '', salaryCoefficient: '' });
        setShowModal(true);
    };

    const openEdit = (type) => {
        setEditTarget(type);
        setForm({
            name: type.name,
            maxShiftPerMonth: type.maxShiftPerMonth,
            salaryCoefficient: type.salaryCoefficient
        });
        setShowModal(true);
    };

    const handleSave = async () => {
        // Validate
        if (!form.name.trim()) {
            showToast('error', 'Lỗi', 'Vui lòng nhập tên loại nhân viên');
            return;
        }
        if (!form.maxShiftPerMonth || +form.maxShiftPerMonth <= 0) {
            showToast('error', 'Lỗi', 'Max shift/tháng phải lớn hơn 0');
            return;
        }
        if (!form.salaryCoefficient || +form.salaryCoefficient <= 0) {
            showToast('error', 'Lỗi', 'Hệ số lương phải lớn hơn 0');
            return;
        }

        const body = JSON.stringify({
            name: form.name.trim(),
            maxShiftPerMonth: +form.maxShiftPerMonth,
            salaryCoefficient: +form.salaryCoefficient
        });

        try {
            const url = editTarget
                ? `${API_BASE_URL}/api/employment-types/${editTarget.id}`
                : `${API_BASE_URL}/api/employment-types`;
            const method = editTarget ? 'PUT' : 'POST';

            const res = await fetch(url, { method, headers, body });
            if (!res.ok) throw new Error();

            showToast('success', 'Thành công', editTarget ? 'Cập nhật thành công!' : 'Thêm mới thành công!');
            setShowModal(false);
            fetchAll();
        } catch {
            showToast('error', 'Thất bại', 'Có lỗi xảy ra, vui lòng thử lại!');
        }
    };

    const handleDelete = (id) => setDeleteConfirm(id);

    const confirmDelete = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/employment-types/${deleteConfirm}`, {
                method: 'DELETE', headers
            });
            if (!res.ok) throw new Error();
            showToast('success', 'Đã xóa', 'Xóa loại nhân viên thành công!');
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
                    }}>Loại nhân viên</h2>
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
                    <Plus size={18} /> Thêm loại nhân viên
                </button>
            </div>

            {/* Table */}
            <div className={styles['table-wrapper1']}>
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Tên loại</th>
                            <th>Max Shift / Tháng</th>
                            <th>Hệ số lương</th>
                            <th>Hành động</th>
                        </tr>
                    </thead>
                    <tbody>
                        {types.length === 0 ? (
                            <tr>
                                <td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-secondary)' }}>
                                    Chưa có loại nhân viên nào
                                </td>
                            </tr>
                        ) : (
                            types.map(t => (
                                <tr key={t.id}>
                                    <td>{t.id}</td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Briefcase size={16} style={{ color: 'var(--color-text-secondary)' }} />
                                            <strong>{t.name}</strong>
                                        </div>
                                    </td>
                                    <td>{t.maxShiftPerMonth} ca</td>
                                    <td>
                                        <span style={{
                                            padding: '4px 12px',
                                            background: 'rgba(245,158,11,0.1)',
                                            color: '#F59E0B',
                                            borderRadius: '8px',
                                            fontWeight: '600',
                                            fontSize: '13px'
                                        }}>
                                            × {t.salaryCoefficient}
                                        </span>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button
                                                onClick={() => openEdit(t)}
                                                style={{
                                                    padding: '8px 12px',
                                                    background: 'rgba(59,130,246,0.1)', color: '#3B82F6',
                                                    border: '1px solid rgba(59,130,246,0.3)',
                                                    borderRadius: '8px', cursor: 'pointer',
                                                    display: 'flex', alignItems: 'center', gap: '4px'
                                                }}
                                            >
                                                <Edit2 size={16} /> Sửa
                                            </button>
                                            <button
                                                onClick={() => handleDelete(t.id)}
                                                style={{
                                                    padding: '8px 12px',
                                                    background: 'rgba(239,68,68,0.1)', color: '#EF4444',
                                                    border: '1px solid rgba(239,68,68,0.3)',
                                                    borderRadius: '8px', cursor: 'pointer',
                                                    display: 'flex', alignItems: 'center', gap: '4px'
                                                }}
                                            >
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
                        borderRadius: '16px', padding: '28px', width: '420px',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
                    }}>
                        <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: '700', marginBottom: '20px' }}>
                            {editTarget ? 'Sửa loại nhân viên' : 'Thêm loại nhân viên'}
                        </h3>

                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', color: '#B8B8B8', fontSize: '13px', marginBottom: '6px' }}>
                                Tên loại *
                            </label>
                            <input
                                value={form.name}
                                onChange={e => setForm({ ...form, name: e.target.value })}
                                placeholder="VD: Fulltime, Parttime..."
                                style={{
                                    width: '100%', padding: '10px 14px', background: '#2a2a2a',
                                    border: '1px solid #3a3a3a', borderRadius: '10px',
                                    color: '#fff', fontSize: '14px', outline: 'none',
                                    boxSizing: 'border-box'
                                }}
                            />
                        </div>

                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', color: '#B8B8B8', fontSize: '13px', marginBottom: '6px' }}>
                                Max shift / tháng *
                            </label>
                            <input
                                type="number"
                                min="1"
                                value={form.maxShiftPerMonth}
                                onChange={e => setForm({ ...form, maxShiftPerMonth: e.target.value })}
                                placeholder="VD: 26"
                                style={{
                                    width: '100%', padding: '10px 14px', background: '#2a2a2a',
                                    border: '1px solid #3a3a3a', borderRadius: '10px',
                                    color: '#fff', fontSize: '14px', outline: 'none',
                                    boxSizing: 'border-box'
                                }}
                            />
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', color: '#B8B8B8', fontSize: '13px', marginBottom: '6px' }}>
                                Hệ số lương *
                            </label>
                            <input
                                type="number"
                                min="0.1"
                                step="0.1"
                                value={form.salaryCoefficient}
                                onChange={e => setForm({ ...form, salaryCoefficient: e.target.value })}
                                placeholder="VD: 1.5"
                                style={{
                                    width: '100%', padding: '10px 14px', background: '#2a2a2a',
                                    border: '1px solid #3a3a3a', borderRadius: '10px',
                                    color: '#fff', fontSize: '14px', outline: 'none',
                                    boxSizing: 'border-box'
                                }}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                                onClick={() => setShowModal(false)}
                                style={{
                                    flex: 1, padding: '12px', background: 'transparent',
                                    border: '1px solid #2a2a2a', borderRadius: '10px',
                                    color: '#B8B8B8', cursor: 'pointer', fontWeight: '600'
                                }}
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleSave}
                                style={{
                                    flex: 1, padding: '12px',
                                    background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
                                    border: 'none', borderRadius: '10px',
                                    color: '#000', cursor: 'pointer', fontWeight: '600'
                                }}
                            >
                                {editTarget ? 'Cập nhật' : 'Thêm mới'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirm xóa */}
            {deleteConfirm && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
                }}>
                    <div style={{
                        background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '16px',
                        padding: '28px', width: '380px', textAlign: 'center'
                    }}>
                        <h3 style={{ color: '#fff', marginBottom: '8px' }}>Xác nhận xóa</h3>
                        <p style={{ color: '#B8B8B8', fontSize: '14px', marginBottom: '24px' }}>
                            Hành động này không thể hoàn tác!
                        </p>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button onClick={() => setDeleteConfirm(null)} style={{
                                flex: 1, padding: '12px', background: 'transparent',
                                border: '1px solid #2a2a2a', borderRadius: '10px',
                                color: '#B8B8B8', cursor: 'pointer', fontWeight: '600'
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