import React from "react";

const TablesPage = () => {
    return (
        <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(6,1fr)",
            gap: 15
        }}>
            {Array.from({ length: 18 }).map((_, i) => (
                <div
                    key={i}
                    style={{
                        height: 100,
                        borderRadius: 10,
                        background: i % 4 === 0
                            ? "linear-gradient(135deg,#06b6d4,#3b82f6)"
                            : "white",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                        alignItems: "center",
                        fontWeight: "bold",
                        cursor: "pointer"
                    }}
                >
                    LỖ {i + 1}
                    <div style={{ fontSize: 12 }}>
                        {i % 4 === 0 ? "00:10:25" : "Bàn trống"}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default TablesPage;