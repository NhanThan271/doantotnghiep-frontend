import { useState, useEffect } from 'react';
import { Eye, DollarSign, Users, Building2 } from 'lucide-react';
import styles from '../../layouts/AdminLayout.module.css';

const API_BASE_URL = '';

export default function SalaryTab({ employees, staffMap, branches }) {
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());
    const [salaries, setSalaries] = useState([]);
    const [loading, setLoading] = useState(false);
    const [detail, setDetail] = useState(null);
    const [selectedBranch, setSelectedBranch] = useState('all');

    const token = localStorage.getItem('token');
    const headers = { 'Authorization': `Bearer ${token}` };

    const filteredEmployees = selectedBranch === 'all'
        ? employees
        : employees.filter(emp => emp.branch?.id === parseInt(selectedBranch));

    useEffect(() => {
        if (employees?.length > 0) fetchAll();
    }, [month, year, employees, selectedBranch]);

    const fetchAll = async () => {
        setLoading(true);
        const results = await Promise.all(
            filteredEmployees.map(emp => {
                const staffInfo = staffMap?.[emp.id];
                if (!staffInfo?.id) return null;

                const staffId = staffInfo.id;

                return fetch(`${API_BASE_URL}/api/salary/${staffId}?month=${month}&year=${year}`, { headers })
                    .then(r => r.ok ? r.json() : null)
                    .then(data => data ? { ...data, staffName: emp.fullName || emp.username } : null)
                    .catch(() => null);
            })
        );
        setSalaries(results.filter(Boolean));
        setLoading(false);
    };

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h2 style={{
                        fontSize: '32px', fontWeight: '800', marginBottom: '8px',
                        background: 'linear-gradient(135deg, var(--color-primary-light))',
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
                    }}>Bảng lương</h2>
                </div>
                {/* Chọn tháng/năm */}
                <div style={{ display: 'flex', gap: '12px' }}>
                    <select
                        value={month}
                        onChange={e => setMonth(+e.target.value)}
                        style={{
                            padding: '10px 14px', background: '#2a2a2a',
                            border: '1px solid #3a3a3a', borderRadius: '10px',
                            color: '#fff', fontSize: '14px', cursor: 'pointer'
                        }}
                    >
                        {[...Array(12)].map((_, i) => (
                            <option key={i + 1} value={i + 1}>Tháng {i + 1}</option>
                        ))}
                    </select>
                    <select
                        value={year}
                        onChange={e => setYear(+e.target.value)}
                        style={{
                            padding: '10px 14px', background: '#2a2a2a',
                            border: '1px solid #3a3a3a', borderRadius: '10px',
                            color: '#fff', fontSize: '14px', cursor: 'pointer'
                        }}
                    >
                        {[2024, 2025, 2026].map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Bộ lọc chi nhánh */}
            <div style={{
                background: 'white',
                border: '1px solid var(--color-border)',
                borderRadius: '16px',
                padding: '20px',
                marginBottom: '20px',
                boxShadow: 'var(--shadow-sm)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    <Building2 size={20} color="var(--color-primary)" />
                    <h4 style={{ fontSize: '16px', fontWeight: '600', margin: 0, color: 'var(--color-text-secondary)' }}>
                        Lọc theo Chi nhánh
                    </h4>
                </div>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    {/* Nút tất cả */}
                    <button
                        onClick={() => setSelectedBranch('all')}
                        style={{
                            padding: '10px 20px',
                            background: selectedBranch === 'all'
                                ? 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))'
                                : 'var(--color-bg-secondary)',
                            color: selectedBranch === 'all' ? '#000' : 'var(--color-text-secondary)',
                            border: selectedBranch === 'all' ? 'none' : '1px solid var(--color-border)',
                            borderRadius: '10px', cursor: 'pointer', fontWeight: '600',
                            fontSize: '14px', transition: 'all 0.2s',
                            display: 'flex', alignItems: 'center', gap: '6px'
                        }}
                    >
                        <Users size={16} />
                        Tất cả chi nhánh ({employees.length})
                    </button>

                    {/* Nút từng chi nhánh */}
                    {branches?.map(branch => {
                        const empCount = employees.filter(e => e.branch?.id === branch.id).length;
                        const isSelected = selectedBranch === branch.id.toString();
                        return (
                            <button
                                key={branch.id}
                                onClick={() => setSelectedBranch(branch.id.toString())}
                                style={{
                                    padding: '10px 20px',
                                    background: isSelected
                                        ? 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))'
                                        : 'var(--color-bg-secondary)',
                                    color: isSelected ? '#000' : 'var(--color-text-secondary)',
                                    border: isSelected ? 'none' : '1px solid var(--color-border)',
                                    borderRadius: '10px', cursor: 'pointer', fontWeight: '600',
                                    fontSize: '14px', transition: 'all 0.2s',
                                    display: 'flex', alignItems: 'center', gap: '6px'
                                }}
                            >
                                <Building2 size={16} />
                                {branch.name} ({empCount})
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Table */}
            <div className={styles['table-wrapper1']}>
                <table>
                    <thead>
                        <tr>
                            <th>Nhân viên</th>
                            <th>Loại</th>
                            <th>Tổng ca làm</th>
                            <th>Ngày trễ</th>
                            <th>Tổng lương</th>
                            <th>Chi tiết</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-secondary)' }}>
                                    Đang tính lương...
                                </td>
                            </tr>
                        ) : salaries.length === 0 ? (
                            <tr>
                                <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-secondary)' }}>
                                    Không có dữ liệu lương tháng {month}/{year}
                                </td>
                            </tr>
                        ) : (
                            salaries.map(s => (
                                <tr key={s.staffId}>
                                    <td>
                                        <strong style={{ color: 'var(--color-text-secondary)' }}>{s.staffName}</strong>
                                    </td>
                                    <td>
                                        <span style={{
                                            padding: '4px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '600',
                                            background: s.employmentType === 'FULLTIME'
                                                ? 'rgba(245,158,11,0.1)' : 'rgba(107,114,128,0.1)',
                                            color: s.employmentType === 'FULLTIME' ? '#F59E0B' : '#6B7280'
                                        }}>
                                            {s.employmentType}
                                        </span>
                                    </td>
                                    <td>{s.totalDaysWorked} ca</td>
                                    <td style={{ color: s.lateDays > 0 ? '#EF4444' : 'inherit' }}>
                                        {s.lateDays} ngày
                                    </td>
                                    <td>
                                        <strong style={{ color: '#10B981', fontSize: '15px' }}>
                                            {s.totalSalary?.toLocaleString('vi-VN')}đ
                                        </strong>
                                    </td>
                                    <td>
                                        <button
                                            onClick={() => setDetail(s)}
                                            style={{
                                                padding: '8px 12px',
                                                background: 'rgba(16,185,129,0.1)', color: '#10B981',
                                                border: '1px solid rgba(16,185,129,0.3)',
                                                borderRadius: '8px', cursor: 'pointer',
                                                display: 'flex', alignItems: 'center', gap: '4px'
                                            }}
                                        >
                                            <Eye size={16} /> Xem
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal chi tiết lương */}
            {detail && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
                }}>
                    <div style={{
                        background: '#1a1a1a', border: '1px solid #2a2a2a',
                        borderRadius: '16px', padding: '28px', width: '420px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                            <div style={{
                                width: '44px', height: '44px', background: 'rgba(16,185,129,0.1)',
                                borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                <DollarSign size={22} color="#10B981" />
                            </div>
                            <div>
                                <h3 style={{ color: '#fff', fontSize: '17px', fontWeight: '700', margin: 0 }}>
                                    Chi tiết lương
                                </h3>
                                <p style={{ color: '#B8B8B8', fontSize: '13px', margin: 0 }}>
                                    {detail.staffName} — Tháng {month}/{year}
                                </p>
                            </div>
                        </div>

                        {/* Các dòng thông tin */}
                        {[
                            { label: 'Loại nhân viên', value: detail.employmentType },
                            { label: 'Số ca làm', value: `${detail.totalDaysWorked} ca` },
                            { label: 'Ngày đi trễ', value: `${detail.lateDays} ngày`, danger: detail.lateDays > 0 },
                            { label: 'Lương cơ bản', value: `${detail.baseSalary?.toLocaleString('vi-VN')}đ` },
                            detail.lateDays > 0 && {
                                label: 'Phạt đi trễ',
                                value: `- ${(detail.lateDays * 50000).toLocaleString('vi-VN')}đ`,
                                danger: true
                            },
                        ].filter(Boolean).map((row, i) => (
                            <div key={i} style={{
                                display: 'flex', justifyContent: 'space-between',
                                padding: '10px 0', borderBottom: '1px solid #2a2a2a',
                                fontSize: '14px'
                            }}>
                                <span style={{ color: '#B8B8B8' }}>{row.label}</span>
                                <span style={{ color: row.danger ? '#EF4444' : '#fff', fontWeight: '500' }}>
                                    {row.value}
                                </span>
                            </div>
                        ))}

                        {/* Tổng lương */}
                        <div style={{
                            display: 'flex', justifyContent: 'space-between',
                            padding: '14px 0', fontSize: '16px', fontWeight: '700'
                        }}>
                            <span style={{ color: '#B8B8B8' }}>Tổng lương</span>
                            <span style={{ color: '#10B981' }}>
                                {detail.totalSalary?.toLocaleString('vi-VN')}đ
                            </span>
                        </div>

                        <button
                            onClick={() => setDetail(null)}
                            style={{
                                width: '100%', padding: '12px', marginTop: '8px',
                                background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
                                border: 'none', borderRadius: '10px',
                                color: '#000', cursor: 'pointer', fontWeight: '600', fontSize: '14px'
                            }}
                        >
                            Đóng
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}