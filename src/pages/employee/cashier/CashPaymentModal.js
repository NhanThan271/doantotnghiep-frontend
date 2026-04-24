import React, { useState, useEffect } from "react";
import { X, DollarSign, CheckCircle, AlertCircle, Zap } from "lucide-react";
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

    // Hàm làm tròn số tiền đến hàng nghìn
    const roundToNearestThousand = (amount) => {
        const remainder = amount % 1000;
        if (remainder < 500) {
            return Math.floor(amount / 1000) * 1000;
        } else {
            return Math.ceil(amount / 1000) * 1000;
        }
    };

    // Sử dụng số tiền đã làm tròn để thanh toán
    const roundedTotalAmount = roundToNearestThousand(totalAmount);

    const handleConfirm = async () => {
        const received = parseFloat(receivedAmount);

        if (isNaN(received)) {
            setError("Vui lòng nhập số tiền khách đưa");
            return;
        }

        // So sánh với số tiền đã làm tròn
        if (received < roundedTotalAmount) {
            setError(`Số tiền khách đưa (${received.toLocaleString()}đ) phải lớn hơn hoặc bằng tổng tiền (${formatCurrency(roundedTotalAmount)})`);
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

    // Generate suggested amounts
    const getSuggestedAmounts = () => {
        const suggestions = [];
        const denominations = [500000, 200000, 100000, 50000, 20000, 10000];

        for (let denom of denominations) {
            if (denom >= roundedTotalAmount) {
                suggestions.push(denom);
            }
        }

        const rounded10k = Math.ceil(roundedTotalAmount / 10000) * 10000;
        const rounded50k = Math.ceil(roundedTotalAmount / 50000) * 50000;
        const rounded100k = Math.ceil(roundedTotalAmount / 100000) * 100000;

        if (rounded10k > roundedTotalAmount && !suggestions.includes(rounded10k)) {
            suggestions.push(rounded10k);
        }
        if (rounded50k > roundedTotalAmount && !suggestions.includes(rounded50k)) {
            suggestions.push(rounded50k);
        }
        if (rounded100k > roundedTotalAmount && !suggestions.includes(rounded100k)) {
            suggestions.push(rounded100k);
        }

        return [...new Set(suggestions)].sort((a, b) => a - b).slice(0, 5);
    };

    const handleSetExactAmount = () => {
        // Nhập số tiền đã làm tròn
        setReceivedAmount(roundedTotalAmount.toString());
        setError("");
    };

    const handleSetSuggestedAmount = (amount) => {
        setReceivedAmount(amount.toString());
        setError("");
    };

    const change = receivedAmount ? parseFloat(receivedAmount) - roundedTotalAmount : 0;
    const isValid = receivedAmount && parseFloat(receivedAmount) >= roundedTotalAmount;

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
                    {/* Total Amount - Hiển thị số đã làm tròn */}
                    <div className={styles.totalSection}>
                        <label className={styles.label}>Tổng tiền cần thanh toán</label>
                        <div className={styles.totalAmount}>{formatCurrency(roundedTotalAmount)}</div>
                        {roundedTotalAmount !== totalAmount && (
                            <div className={styles.originalAmountHint}>
                                (Đã làm tròn từ {formatCurrency(totalAmount)})
                            </div>
                        )}
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

                        {/* Exact Amount Button */}
                        <button
                            onClick={handleSetExactAmount}
                            className={styles.exactAmountBtn}
                            type="button"
                        >
                            <Zap size={16} />
                            Nhập đúng số tiền {formatCurrency(roundedTotalAmount)}
                        </button>

                        {/* Suggested Amounts */}
                        <div className={styles.suggestedSection}>
                            <label className={styles.suggestedLabel}>Gợi ý:</label>
                            <div className={styles.suggestedButtons}>
                                {getSuggestedAmounts().map((amount, index) => (
                                    <button
                                        key={index}
                                        onClick={() => handleSetSuggestedAmount(amount)}
                                        className={styles.suggestedBtn}
                                        type="button"
                                    >
                                        {formatCurrency(amount)}
                                    </button>
                                ))}
                            </div>
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