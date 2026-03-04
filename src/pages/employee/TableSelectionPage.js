import React, { useEffect, useState } from "react";
import axiosClient from "../../api/axiosClient";
import TableSelectionModal from "./TableSelectionModal";

const TableSelectionPage = ({ show, onSelect, onClose }) => {
    const [tables, setTables] = useState([]);

    // Lấy danh sách bàn
    const fetchTables = async () => {
        try {
            const response = await axiosClient.get("/customer/tables");
            const mappedTables = response.data.map((t) => ({
                id: t.id,
                number: t.number,
                status: t.status === "FREE" ? "available" : "busy",
            }));
            setTables(mappedTables);
        } catch (error) {
            console.error("Lỗi khi lấy danh sách bàn:", error);
        }
    };

    useEffect(() => {
        if (show) fetchTables();
    }, [show]);

    // Khi chọn bàn
    const handleSelectTable = (tableNumber) => {
        // Chỉ cập nhật số bàn đã chọn cho UI
        if (onSelect) onSelect(tableNumber);
        if (onClose) onClose(); // đóng modal
    };

    // Render modal
    if (!show) return null;

    return (
        <TableSelectionModal
            show={show}
            tables={tables}
            selectTable={handleSelectTable}
            onClose={onClose}
        />
    );
};

export default TableSelectionPage;
