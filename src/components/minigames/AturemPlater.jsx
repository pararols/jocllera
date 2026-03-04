import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { Shield, Trees, Droplets, Bird, Sprout, CheckCircle, X } from 'lucide-react';
import gisData from '../../data/gis_data.json';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const RECOVERY_GOAL = 95;

const AturemPlater = ({ onComplete, onClose }) => {
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
        fertile: { icon: <Sprout size={20} />, label: 'Camp Fèrtil', color: '#f1c40f', stamp: '🌾' }
    };

    useEffect(() => {
        // Filter zones for Prioritària and Apta
        const relevantZones = gisData.zones.filter(z =>
            z.type === 'prioritaria' || z.type === 'apta'
        );
        targetPolygons.current = relevantZones;

        // Calculate bounding box for projection
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

        // Add some padding to the bounds
        const latPadding = (maxLat - minLat) * 0.1;
        const lngPadding = (maxLng - minLng) * 0.1;

        canvasBounds.current = {
            minLat: minLat - latPadding,
            maxLat: maxLat + latPadding,
            minLng: minLng - lngPadding,
            maxLng: maxLng + lngPadding
        };

        assetsLoaded.current = true;
        drawBase();
        drawMask();
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
        // Draw a light background map feel (simulated orthophoto look)
        ctx.fillStyle = '#2c3e50';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Draw the polygons
        targetPolygons.current.forEach(zone => {
            const color = zone.type === 'prioritaria' ? '#e67e22' : '#3498db';
            ctx.fillStyle = color;
            ctx.globalAlpha = 0.6;
            ctx.beginPath();
            zone.points.forEach(([lat, lng], i) => {
                const [px, py] = project(lat, lng);
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            });
            ctx.closePath();
            ctx.fill();

            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.globalAlpha = 1.0;
            ctx.stroke();
        });
    };

    const calculateRecovery = () => {
        const drawingCtx = drawingCanvasRef.current.getContext('2d', { willReadFrequently: true });
        const maskCtx = maskCanvasRef.current.getContext('2d', { willReadFrequently: true });

        const drawingData = drawingCtx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT).data;
        const maskData = maskCtx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT).data;

        let targetPixels = 0;
        let recoveredPixels = 0;

        for (let i = 0; i < maskData.length; i += 4) {
            // If mask is white (part of target polygons)
            if (maskData[i] > 128) {
                targetPixels++;
                // If user has drawn here
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

    const handlePointerDown = (e) => {
        setIsDrawing(true);
        draw(e);
    };

    const handlePointerMove = (e) => {
        if (!isDrawing) return;
        draw(e);
    };

    const handlePointerUp = () => {
        setIsDrawing(false);
        calculateRecovery();
    };

    const draw = (e) => {
        const canvas = drawingCanvasRef.current;
        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        ctx.font = '24px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Add some jitter for "natural" look
        const jX = x + (Math.random() - 0.5) * 10;
        const jY = y + (Math.random() - 0.5) * 10;

        ctx.fillText(tools[selectedTool].stamp, jX, jY);
    };

    return ReactDOM.createPortal(
        <div className="minigame-overlay" style={{ zIndex: 10000 }}>
            <div className="minigame-card scale-up-center" style={{
                width: 'min(980px, 98vw)', padding: 0, overflow: 'hidden',
                backgroundColor: '#111', border: '2px solid #2ecc71',
                boxShadow: '0 0 40px rgba(46, 204, 113, 0.3)'
            }}>
                {/* Header */}
                <div className="minigame-header" style={{ padding: '15px 20px', background: 'rgba(20,40,20,0.95)', borderBottom: '1px solid #2ecc71' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Shield color="#2ecc71" size={24} />
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'white' }}>ATUREM EL PLATER</h3>
                            <p style={{ margin: 0, fontSize: '0.8rem', color: '#a8e6c4' }}>Recupera el territori marcant zones d'alt valor natural</p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ color: '#2ecc71', fontWeight: 'bold', fontSize: '1.2rem' }}>
                                {recovery}% RECOBRAT
                            </div>
                            <div style={{ width: '150px', height: '6px', background: '#333', borderRadius: '3px', marginTop: '4px' }}>
                                <div style={{ width: `${recovery}%`, height: '100%', background: '#2ecc71', transition: 'width 0.3s' }}></div>
                            </div>
                        </div>
                        <button onClick={onClose} className="close-btn" style={{ fontSize: '1.5rem', background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>×</button>
                    </div>
                </div>

                {/* Game Body */}
                <div style={{ display: 'flex', background: '#e0e0e0', height: '600px' }}>
                    {/* Tool Sidebar */}
                    <div style={{ width: '180px', background: '#2c3e50', padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <h4 style={{ color: '#ecf0f1', margin: '0 0 10px 0', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Eines de Protecció</h4>
                        {Object.entries(tools).map(([id, tool]) => (
                            <button
                                key={id}
                                onClick={() => setSelectedTool(id)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '10px',
                                    padding: '12px', borderRadius: '8px', border: 'none',
                                    cursor: 'pointer', textAlign: 'left',
                                    background: selectedTool === id ? tool.color : 'rgba(255,255,255,0.05)',
                                    color: 'white', transition: 'all 0.2s',
                                    boxShadow: selectedTool === id ? `0 4px 12px ${tool.color}66` : 'none',
                                    transform: selectedTool === id ? 'translateX(5px)' : 'none'
                                }}
                            >
                                {tool.icon}
                                <span style={{ fontWeight: selectedTool === id ? 'bold' : 'normal' }}>{tool.label}</span>
                            </button>
                        ))}

                        <div style={{ marginTop: 'auto', padding: '15px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', fontSize: '0.8rem', color: '#bdc3c7', lineHeight: '1.4' }}>
                            <strong>Instruccions:</strong><br />
                            Pinta sobre la zona ocre fins que les teves marques cobreixin el 95% del projecte especulatiu.
                        </div>
                    </div>

                    {/* Canvas Area */}
                    <div style={{ position: 'relative', flex: 1, overflow: 'hidden', cursor: 'crosshair', background: '#34495e' }}>
                        <canvas
                            ref={canvasRef}
                            width={CANVAS_WIDTH} height={CANVAS_HEIGHT}
                            style={{ position: 'absolute', top: 0, left: 0 }}
                        />
                        <canvas
                            ref={drawingCanvasRef}
                            width={CANVAS_WIDTH} height={CANVAS_HEIGHT}
                            onPointerDown={handlePointerDown}
                            onPointerMove={handlePointerMove}
                            onPointerUp={handlePointerUp}
                            style={{ position: 'absolute', top: 0, left: 0, touchAction: 'none' }}
                        />
                        {/* Hidden mask canvas for intersection logic */}
                        <canvas
                            ref={maskCanvasRef}
                            width={CANVAS_WIDTH} height={CANVAS_HEIGHT}
                            style={{ display: 'none' }}
                        />
                    </div>
                </div>

                {gameState === 'success' && (
                    <div className="success-overlay" style={{
                        position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        background: 'rgba(10,30,10,0.95)', gap: 20, zIndex: 100
                    }}>
                        <div className="scale-up-center" style={{ textAlign: 'center' }}>
                            <CheckCircle size={100} color="#2ecc71" style={{ filter: 'drop-shadow(0 0 20px #2ecc71)' }} />
                            <h2 style={{ color: '#2ecc71', margin: '20px 0 0 0', fontSize: '2.5rem', fontWeight: '900' }}>PLATER ATURAT!</h2>
                            <p style={{ color: '#a8e6c4', fontSize: '1.2rem', maxWidth: '500px' }}>
                                Has protegit el territori. Els veïns i la natura t'ho agraeixen. La victòria és nostra! ✊🌻
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
};

export default AturemPlater;
