import React from 'react';
import { X, Save } from 'lucide-react';
import './TableFormModal.css';

export default function TableFormModal({
    showModal,
    editingTable,
    formData,
    setFormData,
    loading,
    onClose,
    onSubmit
}) {
    if (!showModal) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-container" onClick={(e) => e.stopPropagation()}>
                {/* Modal Header */}
                <div className="modal-header">
                    <h2 className="modal-title">
                        {editingTable ? 'Chỉnh sửa bàn' : 'Thêm bàn mới'}
                    </h2>
                    <button className="btn-close" onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>

                {/* Modal Body */}
                <form onSubmit={onSubmit} className="modal-form">
                    <div className="form-grid">

                        {/* Loại bàn — đặt đầu tiên vì ảnh hưởng các field sau */}
                        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                            <label className="form-label">Loại bàn *</label>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                {[
                                    { value: 'PHYSICAL', label: '🪑 Bàn tại quán', desc: 'Phục vụ tại chỗ' },
                                    { value: 'TAKEAWAY', label: '🛵 Mang đi', desc: 'Đơn mang đi / giao hàng' }
                                ].map(opt => (
                                    <label
                                        key={opt.value}
                                        style={{
                                            flex: 1,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '10px',
                                            padding: '12px 16px',
                                            border: `2px solid ${formData.type === opt.value ? '#3B82F6' : '#e5e7eb'}`,
                                            borderRadius: '10px',
                                            cursor: 'pointer',
                                            background: formData.type === opt.value
                                                ? 'rgba(59,130,246,0.06)' : 'transparent',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        <input
                                            type="radio"
                                            name="tableType"
                                            value={opt.value}
                                            checked={formData.type === opt.value}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                type: e.target.value,
                                                // Reset area nếu chuyển sang TAKEAWAY
                                                area: e.target.value === 'TAKEAWAY' ? 'TAKEAWAY' : ''
                                            })}
                                            style={{ accentColor: '#3B82F6' }}
                                        />
                                        <div>
                                            <div style={{ fontWeight: '600', fontSize: '14px' }}>{opt.label}</div>
                                            <div style={{ fontSize: '12px', color: '#6b7280' }}>{opt.desc}</div>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Số bàn */}
                        <div className="form-group">
                            <label className="form-label">Số bàn *</label>
                            <input
                                type="number"
                                className="form-input"
                                value={formData.number}
                                onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                                placeholder="VD: 1, 2, 3..."
                                required
                                min="1"
                            />
                        </div>

                        {/* Sức chứa */}
                        <div className="form-group">
                            <label className="form-label">Sức chứa *</label>
                            <input
                                type="number"
                                className="form-input"
                                value={formData.capacity}
                                onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                                placeholder="VD: 2, 4, 6..."
                                required
                                min="1"
                            />
                        </div>

                        {/* Khu vực — chỉ hiện khi PHYSICAL */}
                        {formData.type === 'PHYSICAL' && (
                            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                <label className="form-label">Khu vực / Tầng *</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.area}
                                    onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                                    placeholder="VD: Tầng 1, Khu A, Ngoài trời..."
                                    required
                                />
                            </div>
                        )}

                        {/* Trạng thái */}
                        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                            <label className="form-label">Trạng thái</label>
                            <select
                                className="form-select"
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                            >
                                <option value="FREE">Trống</option>
                                <option value="OCCUPIED">Đang dùng</option>
                                <option value="RESERVED">Đã đặt</option>
                            </select>
                        </div>
                    </div>

                    {/* Form Actions */}
                    <div className="form-actions">
                        <button type="button" className="btn-cancel" onClick={onClose}>
                            Hủy
                        </button>
                        <button type="submit" className="btn-submit" disabled={loading}>
                            <Save size={18} />
                            {loading ? 'Đang lưu...' : (editingTable ? 'Cập nhật' : 'Tạo mới')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}