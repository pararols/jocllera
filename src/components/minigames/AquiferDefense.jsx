import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { ShieldCheck, AlertCircle, Droplets, Waves } from 'lucide-react';
import '../../App.css';
import { minigameAssets } from '../../data/minigame_assets';

// Constants for 16:9 Aspect Ratio
const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 540;
const ZONE_WIDTH = 220;
const BOTTOM_HEIGHT = 120;
const SIDE_TOP_MARGIN = 100;
const GRID_SIZE = 15;
const WIN_PERCENT = 90;
const LOSS_PERCENT = 90;
const GRAVITY = 0.025;

const AquiferDefense = ({ onComplete, onClose, onImpact, onPenalty }) => {
    const [gameState, setGameState] = useState('playing'); // playing, success, failure
    const [savedPercent, setSavedPercent] = useState(0);
    const [lostPercent, setLostPercent] = useState(0);

    const canvasRef = useRef(null);
    const maskCanvasRef = useRef(null);
    const grayLayerRef = useRef(null);
    const colorLayerRef = useRef(null);

    const requestRef = useRef();
    const dropsRef = useRef([]);
    const linesRef = useRef([]);
    const currentLineRef = useRef(null);
    const lastScoreUpdateRef = useRef(0);
    const assetsLoadedRef = useRef(false);

    // Grid tracking
    const farmGrid = useRef(new Set());
    const riverGrid = useRef(new Set());
    const golfGrid = useRef(new Set());

    const totalFarmRiverPixels = (ZONE_WIDTH * (CANVAS_HEIGHT - BOTTOM_HEIGHT - SIDE_TOP_MARGIN) * 2) / (GRID_SIZE * GRID_SIZE);
    const totalGolfPixels = (CANVAS_WIDTH * BOTTOM_HEIGHT) / (GRID_SIZE * GRID_SIZE);

    // Initialize offscreen buffers
    useEffect(() => {
        const initBuffer = (w, h) => {
            const canv = document.createElement('canvas');
            canv.width = w; canv.height = h;
            return canv;
        };

        maskCanvasRef.current = initBuffer(CANVAS_WIDTH, CANVAS_HEIGHT);
        const mctx = maskCanvasRef.current.getContext('2d');
        // Start with fully transparent mask (cleared)
        mctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        grayLayerRef.current = initBuffer(CANVAS_WIDTH, CANVAS_HEIGHT);
        colorLayerRef.current = initBuffer(CANVAS_WIDTH, CANVAS_HEIGHT);

        // Pre-render static layers once images are ready
        const checkAssets = setInterval(() => {
            const images = ['farm', 'river', 'golf', 'sky'].map(k => getImg(k, minigameAssets.aquifer[k]));
            if (images.every(img => img.complete)) {
                renderStaticLayers();
                assetsLoadedRef.current = true;
                clearInterval(checkAssets);
            }
        }, 100);

        return () => clearInterval(checkAssets);
    }, []);

    const renderStaticLayers = () => {
        const gctx = grayLayerRef.current.getContext('2d');
        const cctx = colorLayerRef.current.getContext('2d');

        const draw = (ctx, isGray) => {
            if (isGray) ctx.filter = 'grayscale(100%) brightness(0.3) contrast(1.2)';

            const sideH = CANVAS_HEIGHT - BOTTOM_HEIGHT - SIDE_TOP_MARGIN;
            drawImageCover(ctx, getImg('farm', minigameAssets.aquifer.farm), 0, SIDE_TOP_MARGIN, ZONE_WIDTH, sideH);
            drawImageCover(ctx, getImg('river', minigameAssets.aquifer.river), CANVAS_WIDTH - ZONE_WIDTH, SIDE_TOP_MARGIN, ZONE_WIDTH, sideH);
            drawImageCover(ctx, getImg('golf', minigameAssets.aquifer.golf), 0, CANVAS_HEIGHT - BOTTOM_HEIGHT, CANVAS_WIDTH, BOTTOM_HEIGHT);

            ctx.filter = 'none';
        };

        draw(gctx, true);
        draw(cctx, false);
    };

    const handlePointerDown = (e) => {
        if (gameState !== 'playing') return;
        const rect = canvasRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * CANVAS_WIDTH;
        const y = ((e.clientY - rect.top) / rect.height) * CANVAS_HEIGHT;
        currentLineRef.current = { x1: x, y1: y, x2: x, y2: y, life: 1.0 };
        if (canvasRef.current.setPointerCapture) canvasRef.current.setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e) => {
        if (!currentLineRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * CANVAS_WIDTH;
        const y = ((e.clientY - rect.top) / rect.height) * CANVAS_HEIGHT;
        currentLineRef.current.x2 = x;
        currentLineRef.current.y2 = y;
    };

    const handlePointerUp = () => {
        if (currentLineRef.current) {
            linesRef.current.push({ ...currentLineRef.current, life: 2.0 });
            currentLineRef.current = null;
        }
    };

    const drawImageCover = (ctx, img, x, y, w, h) => {
        if (!img || !img.complete) return;
        const imgW = img.width;
        const imgH = img.height;
        const imgRatio = imgW / imgH;
        const targetRatio = w / h;

        let sx, sy, sw, sh;
        if (imgRatio > targetRatio) {
            sw = imgH * targetRatio; sh = imgH;
            sx = (imgW - sw) / 2; sy = 0;
        } else {
            sw = imgW; sh = imgW / targetRatio;
            sx = 0; sy = (imgH - sh) / 2;
        }
        ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
    };

    const animate = useCallback((time) => {
        const canvas = canvasRef.current;
        if (!canvas || !maskCanvasRef.current || !assetsLoadedRef.current) {
            requestRef.current = requestAnimationFrame(animate);
            return;
        }
        const ctx = canvas.getContext('2d');
        const mctx = maskCanvasRef.current.getContext('2d');

        // 1. Physics & Logic
        if (Math.random() < 0.05 && dropsRef.current.length < 30) {
            dropsRef.current.push({
                x: ZONE_WIDTH + Math.random() * (CANVAS_WIDTH - 2 * ZONE_WIDTH),
                y: -15,
                vx: (Math.random() - 0.5) * 1.2,
                vy: 1.5 + Math.random(),
                radius: 5
            });
        }

        dropsRef.current = dropsRef.current.filter(drop => {
            drop.vy += GRAVITY;
            drop.x += drop.vx;
            drop.y += drop.vy;

            linesRef.current.forEach(l => {
                if (checkCollision(l, drop)) {
                    const dx = l.x2 - l.x1; const dy = l.y2 - l.y1;
                    const mag = Math.sqrt(dx * dx + dy * dy);
                    let nx = -dy / mag; let ny = dx / mag;
                    if (drop.vx * nx + drop.vy * ny > 0) { nx = -nx; ny = -ny; }
                    const dot = drop.vx * nx + drop.vy * ny;
                    drop.vx = (drop.vx - 2 * dot * nx) * 0.7;
                    drop.vy = (drop.vy - 2 * dot * ny) * 0.7;
                    drop.x += nx * 4; drop.y += ny * 4;
                }
            });

            // Inpaint logic (paints every frame it is inside)
            if (drop.x < ZONE_WIDTH && drop.y > SIDE_TOP_MARGIN && drop.y < CANVAS_HEIGHT - BOTTOM_HEIGHT) {
                paint(drop.x, drop.y, farmGrid);
                mctx.fillStyle = 'white'; mctx.beginPath(); mctx.arc(drop.x, drop.y, 20, 0, Math.PI * 2); mctx.fill();
            } else if (drop.x > CANVAS_WIDTH - ZONE_WIDTH && drop.y > SIDE_TOP_MARGIN && drop.y < CANVAS_HEIGHT - BOTTOM_HEIGHT) {
                paint(drop.x, drop.y, riverGrid);
                mctx.fillStyle = 'white'; mctx.beginPath(); mctx.arc(drop.x, drop.y, 20, 0, Math.PI * 2); mctx.fill();
            } else if (drop.y > CANVAS_HEIGHT - BOTTOM_HEIGHT) {
                paint(drop.x, drop.y, golfGrid);
                mctx.fillStyle = 'white'; mctx.beginPath(); mctx.arc(drop.x, drop.y, 20, 0, Math.PI * 2); mctx.fill();
            }

            // Only kill if it leaves the canvas bounds (plus a small margin)
            return drop.y < CANVAS_HEIGHT + 50 && drop.x > -50 && drop.x < CANVAS_WIDTH + 50;
        });

        linesRef.current = linesRef.current.filter(l => { l.life -= 0.008; return l.life > 0; });

        // 2. Rendering Pipeline
        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Layer 0: Sky (Background)
        const skyImg = getImg('sky', minigameAssets.aquifer.sky);
        drawImageCover(ctx, skyImg, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Layer 1: Grayscale Side/Bottom Zones
        ctx.drawImage(grayLayerRef.current, 0, 0);

        // Layer 2: Masked Color Revelation
        // We draw the color layer onto a temp buffer masked by maskCanvas
        const tempCanvas = document.createElement('canvas'); // Still using temp for the compositeop but let's try to optimize next iteration
        tempCanvas.width = CANVAS_WIDTH; tempCanvas.height = CANVAS_HEIGHT;
        const tctx = tempCanvas.getContext('2d');
        tctx.drawImage(colorLayerRef.current, 0, 0);
        tctx.globalCompositeOperation = 'destination-in';
        tctx.drawImage(maskCanvasRef.current, 0, 0);
        ctx.drawImage(tempCanvas, 0, 0);

        // Layer 3: Trampolines
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 4;
        linesRef.current.forEach(l => {
            ctx.globalAlpha = Math.min(1.0, l.life);
            ctx.beginPath(); ctx.moveTo(l.x1, l.y1); ctx.lineTo(l.x2, l.y2); ctx.stroke();
        });
        ctx.globalAlpha = 1.0;

        if (currentLineRef.current) {
            ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.setLineDash([8, 8]);
            ctx.beginPath(); ctx.moveTo(currentLineRef.current.x1, currentLineRef.current.y1); ctx.lineTo(currentLineRef.current.x2, currentLineRef.current.y2); ctx.stroke(); ctx.setLineDash([]);
        }

        // Layer 4: Drops (VISIBLE ON TOP OF EVERYTHING)
        ctx.fillStyle = '#00a8ff';
        ctx.shadowBlur = 8; ctx.shadowColor = '#00a8ff';
        dropsRef.current.forEach(d => {
            ctx.beginPath(); ctx.arc(d.x, d.y, d.radius, 0, Math.PI * 2); ctx.fill();
        });
        ctx.shadowBlur = 0;

        // Layer 5: Labels & HUD
        ctx.font = 'bold 16px Inter'; ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.shadowBlur = 4; ctx.shadowColor = 'black';
        const labelY = SIDE_TOP_MARGIN + 25;
        ctx.fillText('GRANGES LOCALS', 20, labelY);
        ctx.textAlign = 'right';
        ctx.fillText('EL TER I BOSC', CANVAS_WIDTH - 20, labelY);
        ctx.textAlign = 'left';
        ctx.fillText('CAMP DE GOLF', 20, CANVAS_HEIGHT - 20);
        ctx.shadowBlur = 0;

        // Progress updates
        if (time - lastScoreUpdateRef.current > 400) {
            setSavedPercent(Math.min(100, Math.round(((farmGrid.current.size + riverGrid.current.size) / totalFarmRiverPixels) * 100)));
            setLostPercent(Math.min(100, Math.round((golfGrid.current.size / totalGolfPixels) * 100)));
            lastScoreUpdateRef.current = time;
        }

        requestRef.current = requestAnimationFrame(animate);
    }, [gameState]);

    useEffect(() => {
        requestRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(requestRef.current);
    }, [animate]);

    useEffect(() => {
        if (savedPercent >= WIN_PERCENT && gameState === 'playing') {
            setGameState('success');
            onImpact?.(1000);
            setTimeout(onComplete, 3000);
        }
        if (lostPercent >= LOSS_PERCENT && gameState === 'playing') {
            setGameState('failure');
            onImpact?.(-500);
            onPenalty?.(5);
        }
    }, [savedPercent, lostPercent, gameState]);

    const imgCache = useRef({});
    const getImg = (key, b64) => {
        if (!imgCache.current[key]) {
            const img = new Image(); img.src = b64; imgCache.current[key] = img;
        }
        return imgCache.current[key];
    };

    const paint = (x, y, gridRef) => {
        const gx = Math.floor(x / GRID_SIZE); const gy = Math.floor(y / GRID_SIZE);
        gridRef.current.add(`${gx},${gy}`);
    };

    const checkCollision = (line, drop) => {
        const dx = line.x2 - line.x1; const dy = line.y2 - line.y1;
        const l2 = dx * dx + dy * dy; if (l2 === 0) return false;
        let t = ((drop.x - line.x1) * dx + (drop.y - line.y1) * dy) / l2;
        t = Math.max(0, Math.min(1, t));
        const distSq = (drop.x - (line.x1 + t * dx)) ** 2 + (drop.y - (line.y1 + t * dy)) ** 2;
        return distSq < (drop.radius + 4) ** 2;
    };

    return ReactDOM.createPortal(
        <div className="minigame-overlay">
            <div className="minigame-card scale-up-center" style={{ width: 'min(980px, 95vw)', padding: 0, overflow: 'hidden', backgroundColor: '#000', border: '2px solid #3498db' }}>
                <div className="minigame-header" style={{ padding: '12px 24px', background: 'rgba(15, 23, 42, 0.9)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Waves color="#3498db" size={24} />
                        <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Defensa de l'Aqüífer: Restauració Visual</h3>
                    </div>
                    <button onClick={onClose} className="close-btn">×</button>
                </div>

                <div style={{ position: 'relative', width: '100%', height: '0', paddingBottom: '56.25%', margin: '0 auto', touchAction: 'none', backgroundColor: '#000' }}>
                    <canvas
                        ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT}
                        onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp}
                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'block', cursor: 'crosshair' }}
                    />

                    {!assetsLoadedRef.current && (
                        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: 'white' }}>
                            Carregant ecosistema...
                        </div>
                    )}

                    <div style={{ position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '40px', pointerEvents: 'none' }}>
                        <div style={{ color: '#2ecc71', backgroundColor: 'rgba(0,0,0,0.85)', padding: '8px 25px', borderRadius: '30px', border: '2px solid #2ecc71', fontWeight: 'bold', fontSize: '1.1rem', boxShadow: '0 0 15px rgba(46, 204, 113, 0.3)' }}>
                            RIU I GRANGES: {savedPercent}%
                        </div>
                        <div style={{ color: '#e74c3c', backgroundColor: 'rgba(0,0,0,0.85)', padding: '8px 25px', borderRadius: '30px', border: '2px solid #e74c3c', fontWeight: 'bold', fontSize: '1.1rem', boxShadow: '0 0 15px rgba(231, 76, 60, 0.3)' }}>
                            CAMP DE GOLF: {lostPercent}%
                        </div>
                    </div>

                    <div style={{ position: 'absolute', bottom: 130, left: '50%', transform: 'translateX(-50%)', color: 'rgba(255,255,255,0.6)', textAlign: 'center', fontSize: '0.9rem', pointerEvents: 'none' }}>
                        Dibuixa línies per desviar les gotes cap als costats
                    </div>

                    {gameState === 'success' && (
                        <div className="success-overlay fade-in" style={{ backgroundColor: 'rgba(15, 23, 42, 0.85)', opacity: 1 }}>
                            <ShieldCheck size={120} color="#2ecc71" style={{ filter: 'drop-shadow(0 0 20px #2ecc71)' }} />
                            <h2 style={{ color: '#2ecc71', fontSize: '2.5rem', marginBottom: 0 }}>L'AIGUA HA TORNAT!</h2>
                            <p style={{ color: 'white', fontSize: '1.2rem' }}>Has restaurat el bosc de ribera i l'agricultura local.</p>
                        </div>
                    )}

                    {gameState === 'failure' && (
                        <div className="success-overlay fade-in" style={{ backgroundColor: 'rgba(20, 10, 10, 0.95)', opacity: 1, pointerEvents: 'auto' }}>
                            <AlertCircle size={120} color="#e74c3c" style={{ filter: 'drop-shadow(0 0 20px #e74c3c)' }} />
                            <h2 style={{ color: '#e74c3c', fontSize: '2.5rem' }}>AQÜÍFER ESPLUAT</h2>
                            <p style={{ color: 'white' }}>El formigó i la gespa artificial han vençut.</p>
                            <button
                                onClick={() => {
                                    setGameState('playing'); setSavedPercent(0); setLostPercent(0);
                                    dropsRef.current = []; linesRef.current = [];
                                    farmGrid.current.clear(); riverGrid.current.clear(); golfGrid.current.clear();
                                    const mctx = maskCanvasRef.current.getContext('2d');
                                    mctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
                                }}
                                style={{ padding: '12px 40px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.1rem', marginTop: '20px' }}
                            >REINTENTAR LA DEFENSA</button>
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};

export default AquiferDefense;
