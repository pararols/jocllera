import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Zap, Sun, Home, CheckCircle } from 'lucide-react';
import '../../App.css'; // Ensure we have access to styles, or create specific ones

const ConnectTheDots = ({ onComplete, onClose }) => {
    const [path, setPath] = useState([]);
    const [completedPoints, setCompletedPoints] = useState([0]); // Start at point 0
    const [success, setSuccess] = useState(false);

    // 3 Points: Panel (top), Inverter (center), Grid (bottom)
    const points = [
        { id: 0, x: 50, y: 20, icon: <Sun size={32} color="#f1c40f" />, label: "Panell" },
        { id: 1, x: 50, y: 50, icon: <Zap size={32} color="#e67e22" />, label: "Inversor" },
        { id: 2, x: 50, y: 80, icon: <Home size={32} color="#2ecc71" />, label: "Xarxa" }
    ];

    const svgRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const [currentPos, setCurrentPos] = useState(null);

    const getRelativeCoords = (event) => {
        if (!svgRef.current) return { x: 0, y: 0 };
        const rect = svgRef.current.getBoundingClientRect();
        const clientX = event.touches ? event.touches[0].clientX : event.clientX;
        const clientY = event.touches ? event.touches[0].clientY : event.clientY;
        return {
            x: ((clientX - rect.left) / rect.width) * 100,
            y: ((clientY - rect.top) / rect.height) * 100
        };
    };

    const handleStart = (e) => {
        const coords = getRelativeCoords(e);
        // Check if starting near the last completed point
        const lastPoint = points[completedPoints[completedPoints.length - 1]];
        const dist = Math.hypot(coords.x - lastPoint.x, coords.y - lastPoint.y);

        if (dist < 10 && !success) {
            setIsDragging(true);
            setCurrentPos(coords);
        }
    };

    const handleMove = (e) => {
        if (!isDragging || success) return;
        const coords = getRelativeCoords(e);
        setCurrentPos(coords);

        // Check collision with next point
        const nextPointIndex = completedPoints.length;
        if (nextPointIndex < points.length) {
            const nextPoint = points[nextPointIndex];
            const dist = Math.hypot(coords.x - nextPoint.x, coords.y - nextPoint.y);

            if (dist < 10) {
                // Point Reached!
                setCompletedPoints(prev => [...prev, nextPointIndex]);
                if (nextPointIndex === points.length - 1) {
                    // Completed sequence
                    setSuccess(true);
                    setIsDragging(false);
                    setTimeout(onComplete, 1000); // Wait a bit to show success state
                }
            }
        }
    };

    const handleEnd = () => {
        setIsDragging(false);
        setCurrentPos(null);
    };

    // Render path lines
    const renderLines = () => {
        const lines = [];
        // Lines between completed points
        for (let i = 0; i < completedPoints.length - 1; i++) {
            const start = points[completedPoints[i]];
            const end = points[completedPoints[i + 1]];
            lines.push(
                <line
                    key={`line-${i}`}
                    x1={`${start.x}%`} y1={`${start.y}%`}
                    x2={`${end.x}%`} y2={`${end.y}%`}
                    stroke="#3498db" strokeWidth="4" strokeLinecap="round"
                />
            );
        }
        // Active dragging line
        if (isDragging && currentPos && completedPoints.length > 0) {
            const start = points[completedPoints[completedPoints.length - 1]];
            lines.push(
                <line
                    key="dragging-line"
                    x1={`${start.x}%`} y1={`${start.y}%`}
                    x2={`${currentPos.x}%`} y2={`${currentPos.y}%`}
                    stroke="#3498db" strokeWidth="4" strokeDasharray="5,5"
                />
            );
        }
        return lines;
    };


    // Use Portal to render outside the App root, directly in body
    return ReactDOM.createPortal(
        <div className="minigame-overlay">
            <div className="minigame-card scale-up-center">
                <div className="minigame-header">
                    <h3>Connexió Solar</h3>
                    <button onClick={onClose} className="close-btn">×</button>
                </div>

                <div className="minigame-content blue-print-bg">
                    {success && (
                        <div className="success-overlay">
                            <CheckCircle size={64} color="#2ecc71" className="pulsing-node" />
                            <h2>CONNECTAT!</h2>
                        </div>
                    )}

                    <svg
                        ref={svgRef}
                        className="minigame-svg"
                        onMouseDown={handleStart}
                        onMouseMove={handleMove}
                        onMouseUp={handleEnd}
                        onMouseLeave={handleEnd}
                        onTouchStart={handleStart}
                        onTouchMove={handleMove}
                        onTouchEnd={handleEnd}
                    >
                        {renderLines()}

                        {points.map((p, index) => {
                            const isCompleted = completedPoints.includes(index);
                            const isNext = index === completedPoints.length;

                            return (
                                <g key={p.id}>
                                    <circle
                                        cx={`${p.x}%`} cy={`${p.y}%`}
                                        r="6"
                                        fill={isCompleted ? "#2ecc71" : isNext ? "#f1c40f" : "#95a5a6"}
                                        stroke="white" strokeWidth="2"
                                        className={isNext && !success ? "pulsing-node" : ""}
                                    />
                                    <foreignObject x={`${p.x - 10}%`} y={`${p.y - 12}%`} width="20%" height="24%">
                                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                                            {p.icon}
                                        </div>
                                    </foreignObject>
                                    <text x={`${p.x + 15}%`} y={`${p.y + 2}%`} fill="white" fontSize="12" fontWeight="bold">{p.label}</text>
                                </g>
                            );
                        })}
                    </svg>
                    <p className="minigame-instruction">
                        {success ? "Energia Fluint!" : "Connecta els components (llisca el dit)"}
                    </p>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default ConnectTheDots;
