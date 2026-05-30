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
        <div className="modalOverlay" onClick={onClose}>
            <div className="modalContainer" onClick={(e) => e.stopPropagation()}>
                {/* Modal Header */}
                <div className="modalHeader">
                    <h2 className="modalTitle">
                        {editingRoom ? 'Chỉnh sửa phòng' : 'Thêm phòng mới'}
                    </h2>
                    <button className="btnClose" onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>

                {/* Modal Body */}
                <form onSubmit={onSubmit} className="modalForm">
                    <div className="formGrid">
                        <div className="formGroup">
                            <label className="formLabel">Số phòng *</label>
                            <input
                                type="number"
                                className="formInput"
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

                        <div className="formGroup">
                            <label className="formLabel">Sức chứa (người) *</label>
                            <input
                                type="number"
                                className="formInput"
                                value={formData.capacity}
                                onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                                placeholder="VD: 2, 4, 6..."
                                required
                                min="1"
                            />
                        </div>

                        <div className="formGroup">
                            <label className="formLabel">Khu vực / Tầng *</label>
                            <input
                                type="text"
                                className="formInput"
                                value={formData.area}
                                onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                                placeholder="VD: Tầng 1, Khu A, Khu VIP..."
                                required
                            />
                        </div>

                        <div className="formGroup">
                            <label className="formLabel">Giá phòng (VNĐ) *</label>
                            <input
                                type="number"
                                className="formInput"
                                value={formData.roomFee}
                                onChange={(e) => setFormData({ ...formData, roomFee: e.target.value })}
                                placeholder="VD: 500000, 1000000..."
                                required
                                min="0"
                                step="1000"
                            />
                        </div>

                        <div className="formGroup">
                            <label className="formLabel">Trạng thái</label>
                            <select
                                className="formSelect"
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                            >
                                <option value="ACTIVE">Hoạt động</option>
                                <option value="MAINTENANCE">Bảo trì</option>
                            </select>
                        </div>
                    </div>

                    {/* Form Actions */}
                    <div className="formActions">
                        <button
                            type="button"
                            className="btnCancel"
                            onClick={onClose}
                        >
                            Hủy
                        </button>
                        <button
                            type="submit"
                            className="btnSubmit"
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