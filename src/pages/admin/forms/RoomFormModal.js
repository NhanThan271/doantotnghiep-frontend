import React from 'react';
import { X, Save } from 'lucide-react';
import './TableFormModal.css';

export default function RoomFormModal({
    showModal,
    editingRoom,
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
                        {editingRoom ? 'Chỉnh sửa phòng' : 'Thêm phòng mới'}
                    </h2>
                    <button className="btn-close" onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>

                {/* Modal Body */}
                <form onSubmit={onSubmit} className="modal-form">
                    <div className="form-grid">
                        <div className="form-group">
                            <label className="form-label">Số phòng *</label>
                            <input
                                type="number"
                                className="form-input"
                                value={formData.number}
                                onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                                placeholder="VD: 1, 2, 3..."
                                required
                                min="1"
                                disabled={!!editingRoom}
                            />
                            {editingRoom && (
                                <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                                    Số phòng không thể thay đổi sau khi tạo
                                </p>
                            )}
                        </div>

                        <div className="form-group">
                            <label className="form-label">Sức chứa (người) *</label>
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

                        <div className="form-group">
                            <label className="form-label">Khu vực / Tầng *</label>
                            <input
                                type="text"
                                className="form-input"
                                value={formData.area}
                                onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                                placeholder="VD: Tầng 1, Khu A, Khu VIP..."
                                required
                            />
                        </div>

                        <div className="form-group">
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
                        <button
                            type="button"
                            className="btn-cancel"
                            onClick={onClose}
                        >
                            Hủy
                        </button>
                        <button
                            type="submit"
                            className="btn-submit"
                            disabled={loading}
                        >
                            <Save size={18} />
                            {loading ? 'Đang lưu...' : (editingRoom ? 'Cập nhật' : 'Tạo mới')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}