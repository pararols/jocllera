import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { ShieldCheck, AlertCircle, Waves, Droplet } from 'lucide-react';
import '../../App.css';
import { minigameAssets } from '../../data/minigame_assets';
import SoundManager from '../../logic/SoundManager';

// Constants for 16:9 Aspect Ratio
const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 540;
const ZONE_WIDTH = 220;
const BOTTOM_HEIGHT = 120;
const SIDE_TOP_MARGIN = 80;
const WIN_PERCENT = 80;
const LOSS_PERCENT = 100;
const GRAVITY = 0.035;

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
    const isDrawingRef = useRef(false);
    const savedDropsCountRef = useRef(0);
    const lostDropsCountRef = useRef(0);
    const assetsLoadedRef = useRef(false);

    // Initialize offscreen buffers
    useEffect(() => {
        const initBuffer = (w, h) => {
            const canv = document.createElement('canvas');
            canv.width = w; canv.height = h;
            return canv;
        };

        maskCanvasRef.current = initBuffer(CANVAS_WIDTH, CANVAS_HEIGHT);
        const mctx = maskCanvasRef.current.getContext('2d');
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
        }, 80);

        return () => clearInterval(checkAssets);
    }, []);

    const renderStaticLayers = () => {
        const gctx = grayLayerRef.current.getContext('2d');
        const cctx = colorLayerRef.current.getContext('2d');

        const draw = (ctx, isGray) => {
            if (isGray) ctx.filter = 'grayscale(100%) brightness(0.35) contrast(1.1)';

            const sideH = CANVAS_HEIGHT - BOTTOM_HEIGHT - SIDE_TOP_MARGIN;
            drawImageCover(ctx, getImg('farm', minigameAssets.aquifer.farm), 0, SIDE_TOP_MARGIN, ZONE_WIDTH, sideH);
            drawImageCover(ctx, getImg('river', minigameAssets.aquifer.river), CANVAS_WIDTH - ZONE_WIDTH, SIDE_TOP_MARGIN, ZONE_WIDTH, sideH);
            drawImageCover(ctx, getImg('golf', minigameAssets.aquifer.golf), 0, CANVAS_HEIGHT - BOTTOM_HEIGHT, CANVAS_WIDTH, BOTTOM_HEIGHT);

            ctx.filter = 'none';
        };

        draw(gctx, true);
        draw(cctx, false);
    };

    const getCanvasPos = (e) => {
        if (!canvasRef.current) return { x: 0, y: 0 };
        const rect = canvasRef.current.getBoundingClientRect();
        return {
            x: ((e.clientX - rect.left) / rect.width) * CANVAS_WIDTH,
            y: ((e.clientY - rect.top) / rect.height) * CANVAS_HEIGHT
        };
    };

    const handlePointerDown = (e) => {
        if (gameState !== 'playing') return;
        const pos = getCanvasPos(e);
        isDrawingRef.current = true;
        currentLineRef.current = { x1: pos.x, y1: pos.y, x2: pos.x, y2: pos.y, life: 1.0 };
    };

    const handlePointerMove = useCallback((e) => {
        if (!isDrawingRef.current || !currentLineRef.current) return;
        const pos = getCanvasPos(e);
        currentLineRef.current.x2 = pos.x;
        currentLineRef.current.y2 = pos.y;
    }, []);

    const handlePointerUp = useCallback(() => {
        if (isDrawingRef.current && currentLineRef.current) {
            const dx = currentLineRef.current.x2 - currentLineRef.current.x1;
            const dy = currentLineRef.current.y2 - currentLineRef.current.y1;
            const len = Math.sqrt(dx * dx + dy * dy);
            // Only create if line has minimum length
            if (len > 15) {
                linesRef.current.push({ ...currentLineRef.current, life: 2.8 });
                try { SoundManager.playSFX('click'); } catch (err) {}
            }
            currentLineRef.current = null;
        }
        isDrawingRef.current = false;
    }, []);

    // Global listeners for pointer release outside canvas
    useEffect(() => {
        window.addEventListener('pointerup', handlePointerUp);
        window.addEventListener('pointercancel', handlePointerUp);
        return () => {
            window.removeEventListener('pointerup', handlePointerUp);
            window.removeEventListener('pointercancel', handlePointerUp);
        };
    }, [handlePointerUp]);

    const drawImageCover = (ctx, img, x, y, w, h) => {
        if (!img || !img.complete) return;
        const imgW = img.width || 1;
        const imgH = img.height || 1;
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

        // 1. Drop Generation
        if (gameState === 'playing' && Math.random() < 0.06 && dropsRef.current.length < 25) {
            dropsRef.current.push({
                x: ZONE_WIDTH + 40 + Math.random() * (CANVAS_WIDTH - 2 * ZONE_WIDTH - 80),
                y: -10,
                vx: (Math.random() - 0.5) * 1.5,
                vy: 1.8 + Math.random() * 1.2,
                radius: 6,
                handled: false
            });
        }

        // 2. Physics & Collisions
        dropsRef.current = dropsRef.current.filter(drop => {
            drop.vy += GRAVITY;
            drop.x += drop.vx;
            drop.y += drop.vy;

            // Bounce on player lines
            linesRef.current.forEach(l => {
                const dx = l.x2 - l.x1;
                const dy = l.y2 - l.y1;
                const len = Math.sqrt(dx * dx + dy * dy);
                if (len < 5) return;

                // Unit normal pointing towards the drop
                let nx = -dy / len;
                let ny = dx / len;

                // Make sure normal points against drop trajectory
                const dotVel = drop.vx * nx + drop.vy * ny;
                if (dotVel > 0) {
                    nx = -nx;
                    ny = -ny;
                }

                // Check distance to segment
                let t = ((drop.x - l.x1) * dx + (drop.y - l.y1) * dy) / (len * len);
                t = Math.max(0, Math.min(1, t));
                const closeX = l.x1 + t * dx;
                const closeY = l.y1 + t * dy;
                const distSq = (drop.x - closeX) ** 2 + (drop.y - closeY) ** 2;

                if (distSq < (drop.radius + 6) ** 2) {
                    const dot = drop.vx * nx + drop.vy * ny;
                    // Reflect velocity
                    drop.vx = (drop.vx - 2 * dot * nx) * 0.85;
                    drop.vy = (drop.vy - 2 * dot * ny) * 0.85;
                    // Push out
                    drop.x = closeX + nx * (drop.radius + 4);
                    drop.y = closeY + ny * (drop.radius + 4);
                }
            });

            // Scoring & Area Revelation
            // Left Zone: Granges Locals
            if (drop.x < ZONE_WIDTH && drop.y > SIDE_TOP_MARGIN && drop.y < CANVAS_HEIGHT - BOTTOM_HEIGHT) {
                if (!drop.handled) {
                    drop.handled = true;
                    savedDropsCountRef.current += 1;
                    const pct = Math.min(100, Math.round((savedDropsCountRef.current / 20) * 100));
                    setSavedPercent(pct);
                    try { SoundManager.playSFX('connect'); } catch (e) {}
                }
                mctx.fillStyle = 'white';
                mctx.beginPath();
                mctx.arc(drop.x, drop.y, 45, 0, Math.PI * 2);
                mctx.fill();
            }
            // Right Zone: El Ter i Bosc
            else if (drop.x > CANVAS_WIDTH - ZONE_WIDTH && drop.y > SIDE_TOP_MARGIN && drop.y < CANVAS_HEIGHT - BOTTOM_HEIGHT) {
                if (!drop.handled) {
                    drop.handled = true;
                    savedDropsCountRef.current += 1;
                    const pct = Math.min(100, Math.round((savedDropsCountRef.current / 20) * 100));
                    setSavedPercent(pct);
                    try { SoundManager.playSFX('connect'); } catch (e) {}
                }
                mctx.fillStyle = 'white';
                mctx.beginPath();
                mctx.arc(drop.x, drop.y, 45, 0, Math.PI * 2);
                mctx.fill();
            }
            // Bottom Zone: Camp de Golf (Waste/Loss)
            else if (drop.y > CANVAS_HEIGHT - BOTTOM_HEIGHT + 20) {
                if (!drop.handled) {
                    drop.handled = true;
                    lostDropsCountRef.current += 1;
                    const pct = Math.min(100, Math.round((lostDropsCountRef.current / 25) * 100));
                    setLostPercent(pct);
                }
                mctx.fillStyle = 'rgba(231, 76, 60, 0.6)';
                mctx.beginPath();
                mctx.arc(drop.x, drop.y, 35, 0, Math.PI * 2);
                mctx.fill();
            }

            // Remove drops that exit canvas
            return drop.y < CANVAS_HEIGHT + 40 && drop.x > -40 && drop.x < CANVAS_WIDTH + 40;
        });

        // Decay lines smoothly
        linesRef.current = linesRef.current.filter(l => {
            l.life -= 0.007;
            return l.life > 0;
        });

        // 3. Render Canvas Pipeline
        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Layer 0: Sky background
        const skyImg = getImg('sky', minigameAssets.aquifer.sky);
        drawImageCover(ctx, skyImg, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Layer 1: Grayscale zones
        ctx.drawImage(grayLayerRef.current, 0, 0);

        // Layer 2: Color revelation with mask
        const tempCanv = document.createElement('canvas');
        tempCanv.width = CANVAS_WIDTH;
        tempCanv.height = CANVAS_HEIGHT;
        const tctx = tempCanv.getContext('2d');
        tctx.drawImage(colorLayerRef.current, 0, 0);
        tctx.globalCompositeOperation = 'destination-in';
        tctx.drawImage(maskCanvasRef.current, 0, 0);
        ctx.drawImage(tempCanv, 0, 0);

        // Layer 3: Trampolines
        ctx.lineWidth = 5;
        linesRef.current.forEach(l => {
            ctx.strokeStyle = `rgba(52, 152, 219, ${Math.min(1.0, l.life)})`;
            ctx.shadowColor = '#3498db';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.moveTo(l.x1, l.y1);
            ctx.lineTo(l.x2, l.y2);
            ctx.stroke();
        });
        ctx.shadowBlur = 0;

        // Current active line while drawing
        if (currentLineRef.current) {
            ctx.strokeStyle = '#2ecc71';
            ctx.lineWidth = 4;
            ctx.setLineDash([8, 6]);
            ctx.beginPath();
            ctx.moveTo(currentLineRef.current.x1, currentLineRef.current.y1);
            ctx.lineTo(currentLineRef.current.x2, currentLineRef.current.y2);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Layer 4: Drops with glow
        dropsRef.current.forEach(d => {
            ctx.fillStyle = '#00d2ff';
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#00a8ff';
            ctx.beginPath();
            ctx.arc(d.x, d.y, d.radius, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.shadowBlur = 0;

        // Layer 5: Zone Labels
        ctx.font = 'bold 16px Inter, sans-serif';
        ctx.fillStyle = '#2ecc71';
        ctx.fillText('🌿 GRANGES LOCALS', 20, SIDE_TOP_MARGIN + 30);

        ctx.textAlign = 'right';
        ctx.fillStyle = '#3498db';
        ctx.fillText('🌊 EL TER I BOSC', CANVAS_WIDTH - 20, SIDE_TOP_MARGIN + 30);

        ctx.textAlign = 'center';
        ctx.fillStyle = '#e74c3c';
        ctx.fillText('⚠️ CAMP DE GOLF (ESPECULACIÓ)', CANVAS_WIDTH / 2, CANVAS_HEIGHT - 20);
        ctx.textAlign = 'left';

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
            try { SoundManager.playSFX('victory'); } catch (e) {}
            setTimeout(onComplete, 2500);
        }
        if (lostPercent >= LOSS_PERCENT && gameState === 'playing') {
            setGameState('failure');
            onImpact?.(-500);
            onPenalty?.(5);
            try { SoundManager.playSFX('defeat'); } catch (e) {}
        }
    }, [savedPercent, lostPercent, gameState, onComplete, onImpact, onPenalty]);

    const imgCache = useRef({});
    const getImg = (key, b64) => {
        if (!imgCache.current[key]) {
            const img = new Image();
            img.src = b64;
            imgCache.current[key] = img;
        }
        return imgCache.current[key];
    };

    return ReactDOM.createPortal(
        <div className="minigame-overlay">
            <div className="minigame-card scale-up-center" style={{ width: 'min(980px, 95vw)', padding: 0, overflow: 'hidden', backgroundColor: '#000', border: '2px solid #3498db', borderRadius: '16px', boxShadow: '0 10px 40px rgba(0,0,0,0.8)' }}>
                <div className="minigame-header" style={{ padding: '12px 24px', background: 'rgba(15, 23, 42, 0.95)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1e293b' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Waves color="#3498db" size={24} />
                        <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#f8fafc' }}>Defensa de l'Aqüífer: Salvem l'Aigua del Ter</h3>
                    </div>
                    <button onClick={onClose} className="close-btn" style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.8rem', cursor: 'pointer', lineHeight: 1 }}>×</button>
                </div>

                <div style={{ position: 'relative', width: '100%', height: '0', paddingBottom: '56.25%', margin: '0 auto', touchAction: 'none', backgroundColor: '#000' }}>
                    <canvas
                        ref={canvasRef}
                        width={CANVAS_WIDTH}
                        height={CANVAS_HEIGHT}
                        onPointerDown={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'block', cursor: 'crosshair', touchAction: 'none' }}
                    />

                    {!assetsLoadedRef.current && (
                        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: 'white', fontWeight: 'bold' }}>
                            Carregant ecosistema...
                        </div>
                    )}

                    <div className="aquifer-scores" style={{ position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '25px', pointerEvents: 'none' }}>
                        <div style={{ color: '#2ecc71', backgroundColor: 'rgba(15, 23, 42, 0.85)', padding: '6px 20px', borderRadius: '30px', border: '2px solid #2ecc71', fontWeight: 'bold', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Droplet size={18} /> AIGUA RECUPERADA: {savedPercent}% / {WIN_PERCENT}%
                        </div>
                        <div style={{ color: '#e74c3c', backgroundColor: 'rgba(15, 23, 42, 0.85)', padding: '6px 20px', borderRadius: '30px', border: '2px solid #e74c3c', fontWeight: 'bold', fontSize: '1rem' }}>
                            PERDUDA AL GOLF: {lostPercent}%
                        </div>
                    </div>

                    <div style={{ position: 'absolute', bottom: 125, left: '50%', transform: 'translateX(-50%)', color: '#e2e8f0', background: 'rgba(0,0,0,0.6)', padding: '4px 16px', borderRadius: '20px', textAlign: 'center', fontSize: '0.85rem', pointerEvents: 'none' }}>
                        Dibuixa línies amb el ratolí per desviar les gotes cap als costats
                    </div>

                    {gameState === 'success' && (
                        <div className="success-overlay fade-in" style={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
                            <ShieldCheck size={100} color="#2ecc71" style={{ filter: 'drop-shadow(0 0 20px #2ecc71)' }} />
                            <h2 style={{ color: '#2ecc71', fontSize: '2.2rem', margin: '15px 0 5px 0' }}>L'AIGUA HA TORNAT!</h2>
                            <p style={{ color: 'white', fontSize: '1.1rem' }}>Has restaurat el bosc de ribera i l'agricultura local.</p>
                        </div>
                    )}

                    {gameState === 'failure' && (
                        <div className="success-overlay fade-in" style={{ backgroundColor: 'rgba(20, 10, 10, 0.95)', position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 50, pointerEvents: 'auto' }}>
                            <AlertCircle size={100} color="#e74c3c" style={{ filter: 'drop-shadow(0 0 20px #e74c3c)' }} />
                            <h2 style={{ color: '#e74c3c', fontSize: '2.2rem', margin: '15px 0 5px 0' }}>AQÜÍFER ESGOTAT</h2>
                            <p style={{ color: 'white', marginBottom: '20px' }}>El formigó i la gespa artificial han drenat l'aigua.</p>
                            <button
                                onClick={() => {
                                    setGameState('playing');
                                    setSavedPercent(0);
                                    setLostPercent(0);
                                    savedDropsCountRef.current = 0;
                                    lostDropsCountRef.current = 0;
                                    dropsRef.current = [];
                                    linesRef.current = [];
                                    const mctx = maskCanvasRef.current.getContext('2d');
                                    mctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
                                }}
                                style={{ padding: '12px 36px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem', boxShadow: '0 4px 15px rgba(231,76,60,0.4)' }}
                            >
                                REINTENTAR LA DEFENSA
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};

export default AquiferDefense;
