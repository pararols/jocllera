import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { Shield, Trees, Droplets, Bird, Sprout, CheckCircle, X } from 'lucide-react';
import gisData from '../../data/gis_data.json';
import '../../App.css';

const CANVAS_WIDTH = 540;
const CANVAS_HEIGHT = 960;
const RECOVERY_GOAL = 95;

const MobileAturemPlater = ({ onComplete, onClose }) => {
    const canvasRef = useRef(null);
    const drawingCanvasRef = useRef(null);
    const maskCanvasRef = useRef(null);
    const [recovery, setRecovery] = useState(0);
    const [selectedTool, setSelectedTool] = useState('forest');
    const [isDrawing, setIsDrawing] = useState(false);
    const [gameState, setGameState] = useState('playing');

    const targetPolygons = useRef([]);
    const canvasBounds = useRef({ minLat: 0, maxLat: 0, minLng: 0, maxLng: 0 });
    const assetsLoaded = useRef(false);

    const tools = {
        forest: { icon: <Trees size={20} />, label: 'Bosc', color: '#27ae60', stamp: '🌳' },
        water: { icon: <Droplets size={20} />, label: 'Riu', color: '#2980b9', stamp: '💧' },
        corridor: { icon: <Bird size={20} />, label: 'Corredor', color: '#8e44ad', stamp: '🦅' },
        fertile: { icon: <Sprout size={20} />, label: 'Camp', color: '#f1c40f', stamp: '🌾' }
    };

    useEffect(() => {
        const relevantZones = gisData.zones.filter(z =>
            z.type === 'prioritaria' || z.type === 'apta'
        );
        targetPolygons.current = relevantZones;

        let minLat = Infinity, maxLat = -Infinity;
        let minLng = Infinity, maxLng = -Infinity;

        relevantZones.forEach(zone => {
            zone.points.forEach(([lat, lng]) => {
                if (lat < minLat) minLat = lat;
                if (lat > maxLat) maxLat = lat;
                if (lng < minLng) minLng = lng;
                if (lng > maxLng) maxLng = lng;
            });
        });

        const latPadding = (maxLat - minLat) * 0.15;
        const lngPadding = (maxLng - minLng) * 0.15;

        canvasBounds.current = {
            minLat: minLat - latPadding,
            maxLat: maxLat + latPadding,
            minLng: minLng - lngPadding,
            maxLng: maxLng + lngPadding
        };

        assetsLoaded.current = true;
        
        // Timeout to ensure refs are set
        const timer = setTimeout(() => {
            drawBase();
            drawMask();
        }, 100);
        return () => clearTimeout(timer);
    }, []);

    const project = (lat, lng) => {
        const { minLat, maxLat, minLng, maxLng } = canvasBounds.current;
        const x = ((lng - minLng) / (maxLng - minLng)) * CANVAS_WIDTH;
        const y = CANVAS_HEIGHT - ((lat - minLat) / (maxLat - minLat)) * CANVAS_HEIGHT;
        return [x, y];
    };

    const drawMask = () => {
        const canvas = maskCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.fillStyle = 'white';

        targetPolygons.current.forEach(zone => {
            ctx.beginPath();
            zone.points.forEach(([lat, lng], i) => {
                const [px, py] = project(lat, lng);
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            });
            ctx.closePath();
            ctx.fill();
        });
    };

    const drawBase = () => {
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx || !assetsLoaded.current) return;

        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        targetPolygons.current.forEach(zone => {
            const color = zone.type === 'prioritaria' ? '#e67e22' : '#3498db';
            ctx.fillStyle = color;
            ctx.globalAlpha = 0.4;
            ctx.beginPath();
            zone.points.forEach(([lat, lng], i) => {
                const [px, py] = project(lat, lng);
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            });
            ctx.closePath();
            ctx.fill();

            ctx.strokeStyle = color;
            ctx.lineWidth = 3;
            ctx.globalAlpha = 0.8;
            ctx.stroke();
        });
        ctx.globalAlpha = 1.0;
    };

    const calculateRecovery = () => {
        if (!drawingCanvasRef.current || !maskCanvasRef.current) return;
        const drawingCtx = drawingCanvasRef.current.getContext('2d', { willReadFrequently: true });
        const maskCtx = maskCanvasRef.current.getContext('2d', { willReadFrequently: true });

        const drawingData = drawingCtx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT).data;
        const maskData = maskCtx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT).data;

        let targetPixels = 0;
        let recoveredPixels = 0;

        // Optimized sampling for mobile (every 4th pixel)
        for (let i = 0; i < maskData.length; i += 16) {
            if (maskData[i] > 128) {
                targetPixels++;
                if (drawingData[i + 3] > 0) {
                    recoveredPixels++;
                }
            }
        }

        const percentage = targetPixels > 0 ? Math.min(100, Math.round((recoveredPixels / targetPixels) * 100)) : 0;
        setRecovery(percentage);

        if (percentage >= RECOVERY_GOAL && gameState === 'playing') {
            setGameState('success');
            setTimeout(onComplete, 3000);
        }
    };

    const handleStart = (e) => {
        setIsDrawing(true);
        draw(e);
    };

    const handleMove = (e) => {
        if (!isDrawing) return;
        if (e.cancelable) e.preventDefault();
        draw(e);
    };

    const handleEnd = () => {
        setIsDrawing(false);
        calculateRecovery();
    };

    const draw = (e) => {
        const canvas = drawingCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();
        
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        
        const x = (clientX - rect.left) / rect.width * CANVAS_WIDTH;
        const y = (clientY - rect.top) / rect.height * CANVAS_HEIGHT;

        ctx.font = '32px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const jX = x + (Math.random() - 0.5) * 15;
        const jY = y + (Math.random() - 0.5) * 15;

        ctx.fillText(tools[selectedTool].stamp, jX, jY);
    };

    return ReactDOM.createPortal(
        <div className="minigame-overlay" style={{ touchAction: 'none' }}>
            <div className="minigame-card scale-up-center" style={{ width: '100vw', height: '100dvh', padding: 0, borderRadius: 0, background: '#000', display: 'flex', flexDirection: 'column' }}>
                {/* Header */}
                <div className="minigame-header" style={{ padding: '15px', background: '#064e3b', borderBottom: '1px solid #10b981' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Shield color="#10b981" size={24} />
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'white' }}>ATUREM EL PLATER</h3>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{ width: '100px', height: '8px', background: '#052e16', borderRadius: 4, overflow: 'hidden' }}>
                                    <div style={{ width: `${recovery}%`, height: '100%', background: '#10b981', transition: 'width 0.3s' }}></div>
                                </div>
                                <span style={{ color: '#10b981', fontWeight: 'bold', fontSize: '0.9rem' }}>{recovery}%</span>
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="close-btn" style={{ background: 'white' }}>×</button>
                </div>

                {/* Canvas Area */}
                <div style={{ position: 'relative', flex: 1, overflow: 'hidden', background: '#0f172a' }}>
                    <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} style={{ width: '100%', height: '100%', position: 'absolute' }} />
                    <canvas ref={drawingCanvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT}
                        onTouchStart={handleStart} onTouchMove={handleMove} onTouchEnd={handleEnd}
                        onMouseDown={handleStart} onMouseMove={handleMove} onMouseUp={handleEnd}
                        style={{ width: '100%', height: '100%', position: 'absolute', touchAction: 'none' }}
                    />
                    <canvas ref={maskCanvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} style={{ display: 'none' }} />
                </div>

                {/* Mobile Tools Toolbar */}
                <div style={{ display: 'flex', justifyContent: 'space-around', padding: '15px', background: '#1e293b', borderTop: '1px solid #334155' }}>
                    {Object.entries(tools).map(([id, tool]) => (
                        <button
                            key={id}
                            onClick={() => setSelectedTool(id)}
                            style={{
                                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px',
                                padding: '10px 15px', borderRadius: '12px', border: 'none',
                                background: selectedTool === id ? tool.color : 'rgba(255,255,255,0.05)',
                                color: 'white', transition: 'all 0.2s', width: '22%'
                            }}
                        >
                            {tool.icon}
                            <span style={{ fontSize: '0.7rem', fontWeight: 'bold' }}>{tool.label}</span>
                        </button>
                    ))}
                </div>

                {gameState === 'success' && (
                    <div className="success-overlay fade-in" style={{ background: 'rgba(6,78,59,0.95)' }}>
                        <CheckCircle size={100} color="#10b981" />
                        <h2 style={{ color: '#10b981', fontSize: '2.5rem', textAlign: 'center' }}>PLATER ATURAT!</h2>
                        <p style={{ color: 'white', textAlign: 'center', padding: '0 20px' }}>Has protegit el territori de l'especulació.</p>
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
};

export default MobileAturemPlater;
