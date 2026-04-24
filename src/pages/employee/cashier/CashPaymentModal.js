import React, { useState, useEffect } from "react";
import { X, DollarSign, CheckCircle, AlertCircle } from "lucide-react";
import styles from "./CashPaymentModal.module.css";

const CashPaymentModal = ({ show, onClose, onConfirm, totalAmount }) => {
    const [receivedAmount, setReceivedAmount] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!show) {
            setReceivedAmount("");
            setError("");
        }
    }, [show]);

    if (!show) return null;

    const handleConfirm = async () => {
        const received = parseFloat(receivedAmount);

        if (isNaN(received)) {
            setError("Vui lòng nhập số tiền khách đưa");
            return;
        }

        if (received < totalAmount) {
            setError(`Số tiền khách đưa (${received.toLocaleString()}đ) phải lớn hơn hoặc bằng tổng tiền (${totalAmount.toLocaleString()}đ)`);
            return;
        }

        setError("");
        setIsProcessing(true);
        try {
            await onConfirm();
            onClose();
        } catch (error) {
            console.error("Payment error:", error);
            setError("Có lỗi xảy ra khi thanh toán!");
        } finally {
            setIsProcessing(false);
        }
    };

    const formatCurrency = (amount) => {
        if (!amount || isNaN(amount)) return "0đ";
        return amount.toLocaleString('vi-VN') + 'đ';
    };

    const change = receivedAmount ? parseFloat(receivedAmount) - totalAmount : 0;
    const isValid = receivedAmount && parseFloat(receivedAmount) >= totalAmount;

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modalContainer} onClick={(e) => e.stopPropagation()}>

                {/* Header */}
                <div className={styles.modalHeader}>
                    <div className={styles.headerTitle}>
                        <DollarSign size={24} className={styles.headerIcon} />
                        <h3>Thanh toán tiền mặt</h3>
                    </div>
                    <button onClick={onClose} className={styles.closeBtn}>
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className={styles.modalContent}>
                    {/* Total Amount */}
                    <div className={styles.totalSection}>
                        <label className={styles.label}>Tổng tiền cần thanh toán</label>
                        <div className={styles.totalAmount}>{formatCurrency(totalAmount)}</div>
                    </div>

                    {/* Received Amount Input */}
                    <div className={styles.inputSection}>
                        <label className={styles.label}>Tiền khách đưa</label>
                        <div className={styles.inputWrapper}>
                            <span className={styles.inputCurrency}>₫</span>
                            <input
                                type="number"
                                className={`${styles.amountInput} ${error ? styles.inputError : ""}`}
                                value={receivedAmount}
                                onChange={(e) => {
                                    setReceivedAmount(e.target.value);
                                    setError("");
                                }}
                                placeholder="Nhập số tiền khách đưa"
                                autoFocus
                            />
                        </div>
                        {error && (
                            <div className={styles.errorMessage}>
                                <AlertCircle size={14} />
                                <span>{error}</span>
                            </div>
                        )}
                    </div>

                    {/* Change Amount */}
                    {isValid && (
                        <div className={styles.changeSection}>
                            <div className={styles.changeLabel}>
                                <CheckCircle size={18} />
                                <span>Tiền thừa trả khách</span>
                            </div>
                            <div className={styles.changeAmount}>
                                {formatCurrency(change)}
                            </div>
                        </div>
                    )}

                    {/* Info Message */}
                    <div className={styles.infoMessage}>
                        <span>💡</span>
                        <span>Vui lòng kiểm tra kỹ số tiền trước khi xác nhận</span>
                    </div>
                </div>

                {/* Footer */}
                <div className={styles.modalFooter}>
                    <button onClick={onClose} className={styles.cancelBtn} disabled={isProcessing}>
                        Hủy bỏ
                    </button>
                    <button
                        onClick={handleConfirm}
                        className={`${styles.confirmBtn} ${!isValid ? styles.disabled : ""}`}
                        disabled={!isValid || isProcessing}
                    >
                        {isProcessing ? (
                            <>
                                <span className={styles.spinner}></span>
                                Đang xử lý...
                            </>
                        ) : (
                            "Xác nhận thanh toán"
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CashPaymentModal;