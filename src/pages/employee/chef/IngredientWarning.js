// components/kitchen/IngredientWarning.js
import React, { useState, useEffect } from 'react';
import { AlertTriangle, Package, TrendingDown, X, ChevronDown, ChevronUp } from 'lucide-react';
import { kitchenAPI } from '../../services/api';

const IngredientWarning = ({ branchId, onClose, autoRefresh = true }) => {
    const [warnings, setWarnings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState(false);
    const [refreshInterval, setRefreshInterval] = useState(null);

    useEffect(() => {
        fetchWarnings();

        if (autoRefresh) {
            const interval = setInterval(fetchWarnings, 30000); // Refresh mỗi 30 giây
            setRefreshInterval(interval);
        }

        return () => {
            if (refreshInterval) clearInterval(refreshInterval);
        };
    }, [branchId, autoRefresh]);

    const fetchWarnings = async () => {
        if (!branchId) return;

        setLoading(true);
        try {
            const data = await kitchenAPI.getLowStockWarnings(branchId);
            setWarnings(data);
        } catch (error) {
            console.error('Error fetching warnings:', error);
        } finally {
            setLoading(false);
        }
    };

    const getWarningColor = (status) => {
        switch (status) {
            case 'critical': return { bg: '#fee2e2', border: '#ef4444', text: '#dc2626', icon: '#ef4444' };
            case 'warning': return { bg: '#fef3c7', border: '#f59e0b', text: '#d97706', icon: '#f59e0b' };
            default: return { bg: '#f1f5f9', border: '#64748b', text: '#475569', icon: '#64748b' };
        }
    };

    const getStatusText = (status, quantity) => {
        if (quantity <= 0) return 'Đã hết';
        if (status === 'critical') return 'Cực kỳ ít';
        return 'Sắp hết';
    };

    if (loading && warnings.length === 0) {
        return null;
    }

    if (warnings.length === 0) {
        return null;
    }

    const criticalCount = warnings.filter(w => w.status === 'critical').length;
    const warningCount = warnings.filter(w => w.status === 'warning').length;

    return (
        <div style={{
            position: 'fixed',
            top: '80px',
            right: '20px',
            zIndex: 9999,
            width: '380px',
            maxWidth: 'calc(100vw - 40px)'
        }}>
            <div style={{
                background: 'white',
                borderRadius: '12px',
                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
                overflow: 'hidden',
                border: '1px solid #e2e8f0'
            }}>
                {/* Header */}
                <div style={{
                    padding: '16px',
                    background: criticalCount > 0 ? '#fee2e2' : '#fef3c7',
                    borderBottom: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {criticalCount > 0 ? (
                            <AlertTriangle size={24} color="#ef4444" />
                        ) : (
                            <TrendingDown size={24} color="#f59e0b" />
                        )}
                        <div>
                            <strong style={{ color: '#1e293b', fontSize: '15px' }}>
                                ⚠️ Cảnh báo nguyên liệu
                            </strong>
                            <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>
                                {criticalCount > 0
                                    ? `${criticalCount} nguyên liệu đã hết, ${warningCount} sắp hết`
                                    : `${warningCount} nguyên liệu sắp hết`
                                }
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '4px',
                            borderRadius: '4px',
                            color: '#64748b'
                        }}
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div style={{ padding: '12px' }}>
                    <button
                        onClick={() => setExpanded(!expanded)}
                        style={{
                            width: '100%',
                            padding: '8px',
                            background: '#f8fafc',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            fontSize: '13px',
                            fontWeight: '500',
                            color: '#475569'
                        }}
                    >
                        <span>📋 Chi tiết nguyên liệu</span>
                        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>

                    {expanded && (
                        <div style={{ marginTop: '12px', maxHeight: '300px', overflowY: 'auto' }}>
                            {warnings.map((warning, idx) => {
                                const colors = getWarningColor(warning.status);
                                return (
                                    <div key={idx} style={{
                                        padding: '10px',
                                        borderBottom: '1px solid #e2e8f0',
                                        background: idx % 2 === 0 ? '#fafafa' : 'white',
                                        borderRadius: '6px',
                                        marginBottom: '4px'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <strong style={{ fontSize: '14px', color: '#1e293b' }}>
                                                    {warning.name}
                                                </strong>
                                                <div style={{ fontSize: '11px', color: '#64748b' }}>
                                                    {warning.unit}
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{
                                                    fontSize: '16px',
                                                    fontWeight: 'bold',
                                                    color: colors.text
                                                }}>
                                                    {warning.quantity.toFixed(2)} {warning.unit}
                                                </div>
                                                <span style={{
                                                    display: 'inline-block',
                                                    padding: '2px 8px',
                                                    borderRadius: '12px',
                                                    fontSize: '10px',
                                                    background: colors.bg,
                                                    color: colors.text
                                                }}>
                                                    {getStatusText(warning.status, warning.quantity)}
                                                </span>
                                            </div>
                                        </div>
                                        <div style={{
                                            marginTop: '8px',
                                            height: '4px',
                                            background: '#e2e8f0',
                                            borderRadius: '2px',
                                            overflow: 'hidden'
                                        }}>
                                            <div style={{
                                                width: `${Math.min(100, (warning.quantity / warning.threshold) * 100)}%`,
                                                height: '100%',
                                                background: colors.border,
                                                transition: 'width 0.3s'
                                            }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div style={{
                    padding: '12px 16px',
                    background: '#f8fafc',
                    borderTop: '1px solid #e2e8f0',
                    fontSize: '12px',
                    color: '#64748b',
                    textAlign: 'center'
                }}>
                    <Package size={14} style={{ display: 'inline', marginRight: '4px' }} />
                    Vui lòng nhập kho bổ sung để tránh gián đoạn phục vụ
                </div>
            </div>
        </div>
    );
};

export default IngredientWarning;