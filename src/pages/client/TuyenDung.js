// src/pages/client/TuyenDung.js
import React, { useState } from 'react';
import {
    Briefcase,
    MapPin,
    Clock,
    DollarSign,
    Users,
    Coffee,
    ChefHat,
    Phone,
    Mail,
    Send,
    CheckCircle,
    User,
    GraduationCap,
    Heart,
    TrendingUp,
    Shield
} from 'lucide-react';
import './TuyenDung.css';

const TuyenDung = () => {
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        phone: '',
        position: '',
        experience: '',
        message: '',
        cv: null
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState(null);

    // Danh sách vị trí tuyển dụng
    const positions = [
        {
            id: 1,
            title: 'Phục vụ',
            icon: <Coffee size={24} />,
            salary: '8 - 12 triệu',
            time: 'Full-time / Part-time',
            location: 'Tất cả chi nhánh',
            requirements: [
                'Nhanh nhẹn, thân thiện',
                'Giao tiếp tốt',
                'Có kinh nghiệm là lợi thế'
            ],
            benefits: [
                'Đào tạo nghiệp vụ',
                'Thưởng doanh thu',
                'Ăn ca miễn phí'
            ]
        },
        {
            id: 2,
            title: 'Đầu bếp',
            icon: <ChefHat size={24} />,
            salary: '12 - 20 triệu',
            time: 'Full-time',
            location: 'Tất cả chi nhánh',
            requirements: [
                'Có kinh nghiệm 1-2 năm',
                'Đam mê ẩm thực',
                'Sáng tạo món mới'
            ],
            benefits: [
                'Môi trường chuyên nghiệp',
                'Cơ hội thăng tiến',
                'Bảo hiểm đầy đủ'
            ]
        },
        {
            id: 3,
            title: 'Thu ngân',
            icon: <DollarSign size={24} />,
            salary: '9 - 13 triệu',
            time: 'Full-time',
            location: 'Tất cả chi nhánh',
            requirements: [
                'Thành thạo tin học văn phòng',
                'Trung thực, cẩn thận',
                'Có kinh nghiệm là lợi thế'
            ],
            benefits: [
                'Ca làm việc ổn định',
                'Thưởng KPIs',
                'Chế độ đãi ngộ tốt'
            ]
        },
        {
            id: 4,
            title: 'Quản lý',
            icon: <Users size={24} />,
            salary: '18 - 25 triệu',
            time: 'Full-time',
            location: 'Quận 1, Quận 7',
            requirements: [
                'Có kinh nghiệm quản lý F&B',
                'Kỹ năng lãnh đạo tốt',
                'Tiếng Anh giao tiếp'
            ],
            benefits: [
                'Lương thưởng hấp dẫn',
                'Cơ hội phát triển',
                'Du lịch hàng năm'
            ]
        }
    ];

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleFileChange = (e) => {
        setFormData(prev => ({
            ...prev,
            cv: e.target.files[0]
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        // Simulate API call
        setTimeout(() => {
            setSubmitStatus({
                type: 'success',
                message: 'Gửi đơn ứng tuyển thành công! Chúng tôi sẽ liên hệ với bạn sớm nhất.'
            });
            setIsSubmitting(false);

            // Reset form
            setFormData({
                fullName: '',
                email: '',
                phone: '',
                position: '',
                experience: '',
                message: '',
                cv: null
            });

            // Clear status after 5 seconds
            setTimeout(() => setSubmitStatus(null), 5000);
        }, 1500);
    };

    return (
        <div className="tuyen-dung-page">
            {/* Hero Section */}
            <div className="hero-section">
                <div className="hero-overlay"></div>
                <div className="container">
                    <div className="hero-content">
                        <span className="hero-eyebrow">Cơ hội nghề nghiệp</span>
                        <h1 className="hero-title">
                            Gia nhập đội ngũ
                            <span>của chúng tôi</span>
                        </h1>
                        <p className="hero-subtitle">
                            Cùng chúng tôi tạo nên những trải nghiệm ẩm thực tuyệt vời nhất
                        </p>
                        <div className="stats">
                            <div className="stat">
                                <span className="stat-number">500+</span>
                                <span className="stat-label">Nhân viên</span>
                            </div>
                            <div className="stat">
                                <span className="stat-number">10+</span>
                                <span className="stat-label">Chi nhánh</span>
                            </div>
                            <div className="stat">
                                <span className="stat-number">5+</span>
                                <span className="stat-label">Năm phát triển</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="scroll-indicator">Scroll</div>
            </div>

            {/* Why Join Us */}
            <div className="why-join">
                <div className="container">
                    <span className="section-label">Vì sao chọn chúng tôi</span>
                    <h2 className="section-title">Môi trường làm việc lý tưởng</h2>
                    <div className="benefits-grid">
                        <div className="benefit-card">
                            <div className="benefit-icon"><TrendingUp size={22} /></div>
                            <h3>Cơ hội thăng tiến</h3>
                            <p>Lộ trình phát triển rõ ràng, đào tạo bài bản cho nhân viên tại mọi cấp độ.</p>
                        </div>
                        <div className="benefit-card">
                            <div className="benefit-icon"><Heart size={22} /></div>
                            <h3>Môi trường thân thiện</h3>
                            <p>Văn hóa làm việc chuyên nghiệp, năng động và sáng tạo, nơi mỗi người đều được trân trọng.</p>
                        </div>
                        <div className="benefit-card">
                            <div className="benefit-icon"><Shield size={22} /></div>
                            <h3>Đãi ngộ tốt</h3>
                            <p>Lương thưởng hấp dẫn, bảo hiểm đầy đủ, cùng nhiều phúc lợi hấp dẫn khác.</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Positions */}
            <div className="positions">
                <div className="container">
                    <span className="section-label">Đang tuyển dụng</span>
                    <h2 className="section-title">Vị trí mở tuyển</h2>
                    <div className="positions-grid">
                        {positions.map(position => (
                            <div key={position.id} className="position-card">
                                <div className="position-header">
                                    <div className="position-icon">{position.icon}</div>
                                    <h3>{position.title}</h3>
                                </div>
                                <div className="position-details">
                                    <div className="detail">
                                        <DollarSign size={15} />
                                        <span>{position.salary}</span>
                                    </div>
                                    <div className="detail">
                                        <Clock size={15} />
                                        <span>{position.time}</span>
                                    </div>
                                    <div className="detail">
                                        <MapPin size={15} />
                                        <span>{position.location}</span>
                                    </div>
                                </div>
                                <div className="position-section">
                                    <strong>Yêu cầu</strong>
                                    <ul>
                                        {position.requirements.map((req, idx) => (
                                            <li key={idx}>{req}</li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="position-section">
                                    <strong>Quyền lợi</strong>
                                    <ul>
                                        {position.benefits.map((benefit, idx) => (
                                            <li key={idx}>{benefit}</li>
                                        ))}
                                    </ul>
                                </div>
                                <button
                                    className="apply-btn"
                                    onClick={() => {
                                        document.getElementById('application-form').scrollIntoView({ behavior: 'smooth' });
                                        setFormData(prev => ({ ...prev, position: position.title }));
                                    }}
                                >
                                    Ứng tuyển ngay
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Application Form */}
            <div id="application-form" className="application-form">
                <div className="container">
                    <span className="section-label">Tham gia cùng chúng tôi</span>
                    <h2 className="section-title">Gửi đơn ứng tuyển</h2>
                    {submitStatus && (
                        <div className={`submit-status ${submitStatus.type}`}>
                            <CheckCircle size={20} />
                            <span>{submitStatus.message}</span>
                        </div>
                    )}
                    <form onSubmit={handleSubmit}>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Họ và tên *</label>
                                <div className="input-icon">
                                    <User size={16} />
                                    <input
                                        type="text"
                                        name="fullName"
                                        value={formData.fullName}
                                        onChange={handleInputChange}
                                        required
                                        placeholder="Nhập họ tên đầy đủ"
                                    />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Email *</label>
                                <div className="input-icon">
                                    <Mail size={16} />
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        required
                                        placeholder="example@email.com"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Số điện thoại *</label>
                                <div className="input-icon">
                                    <Phone size={16} />
                                    <input
                                        type="tel"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleInputChange}
                                        required
                                        placeholder="0xx xxx xxxx"
                                    />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Vị trí ứng tuyển *</label>
                                <div className="input-icon">
                                    <Briefcase size={16} />
                                    <select
                                        name="position"
                                        value={formData.position}
                                        onChange={handleInputChange}
                                        required
                                    >
                                        <option value="">Chọn vị trí</option>
                                        {positions.map(pos => (
                                            <option key={pos.id} value={pos.title}>{pos.title}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Kinh nghiệm làm việc</label>
                            <div className="input-icon">
                                <GraduationCap size={16} />
                                <textarea
                                    name="experience"
                                    value={formData.experience}
                                    onChange={handleInputChange}
                                    rows="3"
                                    placeholder="Mô tả ngắn gọn về kinh nghiệm của bạn..."
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Thư giới thiệu (tùy chọn)</label>
                            <textarea
                                name="message"
                                value={formData.message}
                                onChange={handleInputChange}
                                rows="4"
                                placeholder="Giới thiệu về bản thân và lý do bạn muốn gia nhập đội ngũ của chúng tôi..."
                            />
                        </div>

                        <div className="form-group">
                            <label>Đính kèm CV (PDF, DOC, DOCX)</label>
                            <div className="file-input">
                                <input
                                    type="file"
                                    accept=".pdf,.doc,.docx"
                                    onChange={handleFileChange}
                                />
                                <span className="file-name">
                                    {formData.cv ? formData.cv.name : 'Nhấn để chọn file CV của bạn'}
                                </span>
                            </div>
                        </div>

                        <button type="submit" className="submit-btn" disabled={isSubmitting}>
                            {isSubmitting ? (
                                <>
                                    <div className="spinner"></div>
                                    Đang gửi...
                                </>
                            ) : (
                                <>
                                    <Send size={16} />
                                    Gửi đơn ứng tuyển
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>

            {/* Contact Info */}
            <div className="contact-info">
                <div className="container">
                    <h3>Liên hệ tuyển dụng</h3>
                    <div className="contact-details">
                        <div className="contact-item">
                            <Phone size={22} />
                            <div>
                                <strong>Hotline tuyển dụng</strong>
                                <p>1900 1234</p>
                            </div>
                        </div>
                        <div className="contact-item">
                            <Mail size={22} />
                            <div>
                                <strong>Email</strong>
                                <p>hr@nhahang.com</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TuyenDung;