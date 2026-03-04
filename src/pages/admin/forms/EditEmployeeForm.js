import React, { useState, useEffect } from 'react';
import { X, User, Lock, Mail, Phone, UserCircle, Shield, Upload, Building2 } from 'lucide-react';
import styles from '../../../layouts/AdminLayout.module.css';

export default function EditEmployeeForm({ employee, closeForm, onSave, refreshCallback }) {
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        fullName: '',
        email: '',
        phone: '',
        role: 'EMPLOYEE',
        branchId: '',
        isActive: true,
        imageUrl: '',
        image: null
    });
    const [branches, setBranches] = useState([]);
    const [imagePreview, setImagePreview] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [changePassword, setChangePassword] = useState(false);

    const API_BASE_URL = 'http://localhost:8080';

    // Load danh sách chi nhánh
    useEffect(() => {
        fetchBranches();
    }, []);

    const fetchBranches = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/branches`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setBranches(data);
            }
        } catch (err) {
            console.error('Lỗi khi tải danh sách chi nhánh:', err);
        }
    };

    // Load dữ liệu nhân viên khi component mount
    useEffect(() => {
        if (employee) {
            setFormData({
                username: employee.username || '',
                password: '',
                fullName: employee.fullName || '',
                email: employee.email || '',
                phone: employee.phone || '',
                role: employee.role || 'EMPLOYEE',
                branchId: employee.branchId || employee.branch?.id || '',
                isActive: employee.isActive !== undefined ? employee.isActive : true,
                imageUrl: employee.imageUrl || '',
                image: null
            });

            // Hiển thị ảnh hiện tại
            if (employee.imageUrl) {
                const fullImageUrl = employee.imageUrl.startsWith('http')
                    ? employee.imageUrl
                    : `${API_BASE_URL}/${employee.imageUrl}`;
                setImagePreview(fullImageUrl);
            }
        }
    }, [employee]);

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setError('');
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                setError('Kích thước ảnh không được vượt quá 5MB');
                return;
            }

            if (!file.type.startsWith('image/')) {
                setError('Vui lòng chọn file ảnh');
                return;
            }

            setFormData(prev => ({ ...prev, image: file, imageUrl: '' }));

            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveImage = () => {
        setFormData(prev => ({ ...prev, image: null }));
        if (employee.imageUrl) {
            const fullImageUrl = employee.imageUrl.startsWith('http')
                ? employee.imageUrl
                : `${API_BASE_URL}/${employee.imageUrl}`;
            setImagePreview(fullImageUrl);
        } else {
            setImagePreview(null);
        }
    };

    const validateForm = () => {
        if (!formData.username.trim()) {
            setError('Vui lòng nhập tên đăng nhập');
            return false;
        }
        if (formData.username.length < 3) {
            setError('Tên đăng nhập phải có ít nhất 3 ký tự');
            return false;
        }
        if (changePassword) {
            if (!formData.password) {
                setError('Vui lòng nhập mật khẩu mới');
                return false;
            }
            if (formData.password.length < 6) {
                setError('Mật khẩu phải có ít nhất 6 ký tự');
                return false;
            }
        }
        if (!formData.fullName.trim()) {
            setError('Vui lòng nhập họ tên đầy đủ');
            return false;
        }
        if (formData.email && !formData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
            setError('Email không hợp lệ');
            return false;
        }
        if (formData.phone && !formData.phone.match(/^[0-9]{10,11}$/)) {
            setError('Số điện thoại không hợp lệ (10-11 số)');
            return false;
        }
        if (!formData.branchId) {
            setError('Vui lòng chọn chi nhánh');
            return false;
        }
        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) return;

        setLoading(true);
        setError('');

        try {
            const token = localStorage.getItem('token');

            const formDataToSend = new FormData();
            formDataToSend.append('username', formData.username.trim());
            formDataToSend.append('fullName', formData.fullName.trim());
            formDataToSend.append('email', formData.email.trim() || '');
            formDataToSend.append('phone', formData.phone.trim() || '');
            formDataToSend.append('role', formData.role);
            formDataToSend.append('branchId', formData.branchId);
            formDataToSend.append('isActive', formData.isActive);

            if (changePassword && formData.password.trim()) {
                formDataToSend.append('password', formData.password.trim());
            }

            if (formData.image) {
                formDataToSend.append('image', formData.image);
            } else if (formData.imageUrl.trim()) {
                formDataToSend.append('imageUrl', formData.imageUrl.trim());
            }

            const response = await fetch(`${API_BASE_URL}/api/users/${employee.id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formDataToSend
            });

            if (!response.ok) {
                const errorData = await response.text();
                console.error('Lỗi từ server:', errorData);
                throw new Error(errorData || 'Cập nhật nhân viên thất bại');
            }

            const updatedUser = await response.json();
            console.log('✅ Cập nhật nhân viên thành công:', updatedUser);

            alert('Cập nhật nhân viên thành công!');

            if (refreshCallback && typeof refreshCallback === 'function') {
                console.log('🔄 Đang refresh danh sách nhân viên...');
                refreshCallback();
            }

            if (onSave) {
                onSave(updatedUser, 'employee');
            }

            closeForm();
        } catch (err) {
            console.error('❌ Lỗi khi cập nhật nhân viên:', err);
            setError(err.message || 'Không thể cập nhật nhân viên. Vui lòng thử lại!');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles['modal-backdrop']} onClick={closeForm}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px', maxHeight: '90vh', overflow: 'auto' }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '24px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            background: 'rgba(59, 130, 246, 0.1)',
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <UserCircle size={20} color="#3B82F6" />
                        </div>
                        <div>
                            <h2 style={{
                                fontSize: '20px',
                                fontWeight: '700',
                                margin: 0,
                                color: 'var(--color-text-primary)'
                            }}>
                                Sửa thông tin nhân viên
                            </h2>
                            <p style={{
                                fontSize: '13px',
                                color: 'var(--color-text-secondary)',
                                margin: '4px 0 0 0'
                            }}>
                                Cập nhật thông tin tài khoản
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={closeForm}
                        style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            border: '1px solid var(--color-border)',
                            background: 'transparent',
                            color: 'var(--color-text-secondary)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s'
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                            e.currentTarget.style.borderColor = '#EF4444';
                            e.currentTarget.style.color = '#EF4444';
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.borderColor = 'var(--color-border)';
                            e.currentTarget.style.color = 'var(--color-text-secondary)';
                        }}
                    >
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    {error && (
                        <div style={{
                            padding: '12px',
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            borderRadius: '8px',
                            color: '#EF4444',
                            fontSize: '14px',
                            marginBottom: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            <span>⚠️</span>
                            <span>{error}</span>
                        </div>
                    )}

                    <div style={{ marginBottom: '20px' }}>
                        <label style={{
                            display: 'block',
                            marginBottom: '8px',
                            fontSize: '14px',
                            fontWeight: '600',
                            color: 'var(--color-text-primary)'
                        }}>
                            Ảnh đại diện <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontWeight: '400' }}>(Tùy chọn)</span>
                        </label>

                        {imagePreview ? (
                            <div style={{ position: 'relative' }}>
                                <img
                                    src={imagePreview}
                                    alt="Preview"
                                    style={{
                                        width: '100%',
                                        height: '200px',
                                        objectFit: 'cover',
                                        borderRadius: '12px',
                                        border: '1px solid var(--color-border)'
                                    }}
                                />
                                {formData.image && (
                                    <button
                                        type="button"
                                        onClick={handleRemoveImage}
                                        style={{
                                            position: 'absolute',
                                            top: '8px',
                                            right: '8px',
                                            width: '32px',
                                            height: '32px',
                                            borderRadius: '8px',
                                            background: 'rgba(239, 68, 68, 0.9)',
                                            border: 'none',
                                            color: '#fff',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}
                                    >
                                        <X size={18} />
                                    </button>
                                )}
                                <label style={{
                                    position: 'absolute',
                                    bottom: '8px',
                                    right: '8px',
                                    padding: '8px 12px',
                                    background: 'rgba(0, 0, 0, 0.7)',
                                    backdropFilter: 'blur(8px)',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                    color: '#fff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    transition: 'all 0.2s'
                                }}
                                    onMouseOver={(e) => {
                                        e.currentTarget.style.background = 'rgba(0, 0, 0, 0.85)';
                                    }}
                                    onMouseOut={(e) => {
                                        e.currentTarget.style.background = 'rgba(0, 0, 0, 0.7)';
                                    }}
                                >
                                    <Upload size={14} />
                                    Đổi ảnh
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageChange}
                                        style={{ display: 'none' }}
                                    />
                                </label>
                            </div>
                        ) : (
                            <label style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                height: '200px',
                                border: '2px dashed var(--color-border)',
                                borderRadius: '12px',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                background: 'var(--color-bg-dark)'
                            }}
                                onMouseOver={(e) => {
                                    e.currentTarget.style.borderColor = '#3B82F6';
                                    e.currentTarget.style.background = 'rgba(59, 130, 246, 0.05)';
                                }}
                                onMouseOut={(e) => {
                                    e.currentTarget.style.borderColor = 'var(--color-border)';
                                    e.currentTarget.style.background = 'var(--color-bg-dark)';
                                }}
                            >
                                <Upload size={32} color="var(--color-text-secondary)" />
                                <p style={{
                                    marginTop: '12px',
                                    fontSize: '14px',
                                    color: 'var(--color-text-secondary)'
                                }}>
                                    Click để chọn ảnh đại diện
                                </p>
                                <p style={{
                                    fontSize: '12px',
                                    color: 'var(--color-text-secondary)',
                                    marginTop: '4px'
                                }}>
                                    PNG, JPG (max 5MB)
                                </p>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageChange}
                                    style={{ display: 'none' }}
                                />
                            </label>
                        )}
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <label style={{
                            display: 'block',
                            marginBottom: '8px',
                            fontSize: '14px',
                            fontWeight: '600',
                            color: 'var(--color-text-primary)'
                        }}>
                            Tên đăng nhập <span style={{ color: '#EF4444' }}>*</span>
                        </label>
                        <div style={{ position: 'relative' }}>
                            <User
                                size={18}
                                style={{
                                    position: 'absolute',
                                    left: '14px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    color: 'var(--color-text-secondary)'
                                }}
                            />
                            <input
                                type="text"
                                placeholder="Nhập tên đăng nhập"
                                value={formData.username}
                                onChange={(e) => handleChange('username', e.target.value)}
                                style={{ paddingLeft: '44px' }}
                                required
                            />
                        </div>
                        <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', margin: '4px 0 0 0' }}>
                            Tối thiểu 3 ký tự
                        </p>
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <label style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            cursor: 'pointer',
                            padding: '12px',
                            border: '1px solid var(--color-border)',
                            borderRadius: '10px',
                            background: changePassword ? 'rgba(59, 130, 246, 0.05)' : 'transparent',
                            transition: 'all 0.2s'
                        }}>
                            <input
                                type="checkbox"
                                checked={changePassword}
                                onChange={(e) => {
                                    setChangePassword(e.target.checked);
                                    if (!e.target.checked) {
                                        handleChange('password', '');
                                    }
                                }}
                                style={{ cursor: 'pointer' }}
                            />
                            <Lock size={16} style={{ color: 'var(--color-text-secondary)' }} />
                            <span style={{ fontSize: '14px', fontWeight: '500' }}>
                                Đổi mật khẩu
                            </span>
                        </label>
                    </div>

                    {changePassword && (
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{
                                display: 'block',
                                marginBottom: '8px',
                                fontSize: '14px',
                                fontWeight: '600',
                                color: 'var(--color-text-primary)'
                            }}>
                                Mật khẩu mới <span style={{ color: '#EF4444' }}>*</span>
                            </label>
                            <div style={{ position: 'relative' }}>
                                <Lock
                                    size={18}
                                    style={{
                                        position: 'absolute',
                                        left: '14px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        color: 'var(--color-text-secondary)'
                                    }}
                                />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="Nhập mật khẩu mới"
                                    value={formData.password}
                                    onChange={(e) => handleChange('password', e.target.value)}
                                    style={{ paddingLeft: '44px', paddingRight: '80px' }}
                                    required={changePassword}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    style={{
                                        position: 'absolute',
                                        right: '12px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        background: 'transparent',
                                        border: 'none',
                                        color: 'var(--color-text-secondary)',
                                        cursor: 'pointer',
                                        fontSize: '12px',
                                        fontWeight: '500',
                                        padding: '4px 8px'
                                    }}
                                >
                                    {showPassword ? 'Ẩn' : 'Hiện'}
                                </button>
                            </div>
                            <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', margin: '4px 0 0 0' }}>
                                Tối thiểu 6 ký tự
                            </p>
                        </div>
                    )}

                    <div style={{ marginBottom: '20px' }}>
                        <label style={{
                            display: 'block',
                            marginBottom: '8px',
                            fontSize: '14px',
                            fontWeight: '600',
                            color: 'var(--color-text-primary)'
                        }}>
                            Họ và tên <span style={{ color: '#EF4444' }}>*</span>
                        </label>
                        <div style={{ position: 'relative' }}>
                            <UserCircle
                                size={18}
                                style={{
                                    position: 'absolute',
                                    left: '14px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    color: 'var(--color-text-secondary)'
                                }}
                            />
                            <input
                                type="text"
                                placeholder="Nhập họ và tên đầy đủ"
                                value={formData.fullName}
                                onChange={(e) => handleChange('fullName', e.target.value)}
                                style={{ paddingLeft: '44px' }}
                                required
                            />
                        </div>
                    </div>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '16px',
                        marginBottom: '20px'
                    }}>
                        <div>
                            <label style={{
                                display: 'block',
                                marginBottom: '8px',
                                fontSize: '14px',
                                fontWeight: '600',
                                color: 'var(--color-text-primary)'
                            }}>
                                Email
                            </label>
                            <div style={{ position: 'relative' }}>
                                <Mail
                                    size={18}
                                    style={{
                                        position: 'absolute',
                                        left: '14px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        color: 'var(--color-text-secondary)'
                                    }}
                                />
                                <input
                                    type="email"
                                    placeholder="email@example.com"
                                    value={formData.email}
                                    onChange={(e) => handleChange('email', e.target.value)}
                                    style={{ paddingLeft: '44px' }}
                                />
                            </div>
                        </div>

                        <div>
                            <label style={{
                                display: 'block',
                                marginBottom: '8px',
                                fontSize: '14px',
                                fontWeight: '600',
                                color: 'var(--color-text-primary)'
                            }}>
                                Số điện thoại
                            </label>
                            <div style={{ position: 'relative' }}>
                                <Phone
                                    size={18}
                                    style={{
                                        position: 'absolute',
                                        left: '14px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        color: 'var(--color-text-secondary)'
                                    }}
                                />
                                <input
                                    type="tel"
                                    placeholder="0xxxxxxxxx"
                                    value={formData.phone}
                                    onChange={(e) => handleChange('phone', e.target.value)}
                                    style={{ paddingLeft: '44px' }}
                                />
                            </div>
                        </div>
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <label style={{
                            display: 'block',
                            marginBottom: '8px',
                            fontSize: '14px',
                            fontWeight: '600',
                            color: 'var(--color-text-primary)'
                        }}>
                            Vai trò <span style={{ color: '#EF4444' }}>*</span>
                        </label>
                        <div style={{ position: 'relative' }}>
                            <Shield
                                size={18}
                                style={{
                                    position: 'absolute',
                                    left: '14px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    color: 'var(--color-text-secondary)',
                                    pointerEvents: 'none',
                                    zIndex: 1
                                }}
                            />
                            <select
                                value={formData.role}
                                onChange={(e) => handleChange('role', e.target.value)}
                                style={{
                                    paddingLeft: '44px',
                                    appearance: 'none',
                                    backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 12 12\'%3E%3Cpath fill=\'%23666\' d=\'M6 9L1 4h10z\'/%3E%3C/svg%3E")',
                                    backgroundRepeat: 'no-repeat',
                                    backgroundPosition: 'right 14px center'
                                }}
                                required
                            >
                                <option value="EMPLOYEE">Nhân viên</option>
                                <option value="MANAGER">Quản lý</option>
                                <option value="KITCHEN">Nhân viên bếp</option>
                                <option value="ADMIN">Quản trị viên</option>
                            </select>
                        </div>
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <label style={{
                            display: 'block',
                            marginBottom: '8px',
                            fontSize: '14px',
                            fontWeight: '600',
                            color: 'var(--color-text-primary)'
                        }}>
                            Chi nhánh <span style={{ color: '#EF4444' }}>*</span>
                        </label>
                        <div style={{ position: 'relative' }}>
                            <Building2
                                size={18}
                                style={{
                                    position: 'absolute',
                                    left: '14px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    color: 'var(--color-text-secondary)',
                                    pointerEvents: 'none',
                                    zIndex: 1
                                }}
                            />
                            <select
                                value={formData.branchId}
                                onChange={(e) => handleChange('branchId', e.target.value)}
                                style={{
                                    paddingLeft: '44px',
                                    appearance: 'none',
                                    backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 12 12\'%3E%3Cpath fill=\'%23666\' d=\'M6 9L1 4h10z\'/%3E%3C/svg%3E")',
                                    backgroundRepeat: 'no-repeat',
                                    backgroundPosition: 'right 14px center'
                                }}
                                required
                                disabled={branches.length === 0}
                            >
                                {branches.length === 0 ? (
                                    <option value="">Đang tải...</option>
                                ) : (
                                    <>
                                        <option value="">Chọn chi nhánh</option>
                                        {branches.map(branch => (
                                            <option key={branch.id} value={branch.id}>
                                                {branch.name}
                                            </option>
                                        ))}
                                    </>
                                )}
                            </select>
                        </div>
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <label style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            cursor: 'pointer',
                            padding: '12px',
                            border: '1px solid var(--color-border)',
                            borderRadius: '10px',
                            background: formData.isActive ? 'rgba(59, 130, 246, 0.05)' : 'rgba(239, 68, 68, 0.05)',
                            transition: 'all 0.2s'
                        }}>
                            <input
                                type="checkbox"
                                checked={formData.isActive}
                                onChange={(e) => handleChange('isActive', e.target.checked)}
                                style={{ cursor: 'pointer' }}
                            />
                            <span style={{ fontSize: '14px', fontWeight: '500' }}>
                                Kích hoạt tài khoản
                            </span>
                            <span style={{
                                marginLeft: 'auto',
                                fontSize: '12px',
                                color: formData.isActive ? '#10B981' : '#EF4444',
                                fontWeight: '600'
                            }}>
                                {formData.isActive ? '✓ Hoạt động' : '✕ Vô hiệu hóa'}
                            </span>
                        </label>
                    </div>

                    {/* Buttons */}
                    <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                        <button
                            type="button"
                            onClick={closeForm}
                            disabled={loading}
                            style={{
                                flex: 1,
                                padding: '12px',
                                background: 'transparent',
                                color: 'var(--color-text-secondary)',
                                border: '1px solid var(--color-border)',
                                borderRadius: '12px',
                                fontWeight: '600',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                fontSize: '14px',
                                transition: 'all 0.2s',
                                opacity: loading ? 0.5 : 1
                            }}
                            onMouseOver={(e) => {
                                if (!loading) {
                                    e.currentTarget.style.background = 'var(--color-hover)';
                                    e.currentTarget.style.color = 'var(--color-text-primary)';
                                }
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.background = 'transparent';
                                e.currentTarget.style.color = 'var(--color-text-secondary)';
                            }}
                        >
                            Hủy
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                flex: 1,
                                padding: '12px',
                                background: loading
                                    ? 'var(--color-text-secondary)'
                                    : 'linear-gradient(135deg, #3B82F6, #2563EB)',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '12px',
                                fontWeight: '600',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                fontSize: '14px',
                                transition: 'transform 0.2s',
                                opacity: loading ? 0.6 : 1
                            }}
                            onMouseOver={(e) => {
                                if (!loading) e.currentTarget.style.transform = 'translateY(-2px)';
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                            }}
                        >
                            {loading ? 'Đang xử lý...' : 'Cập nhật'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}