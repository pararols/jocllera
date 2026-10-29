import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { ShieldCheck, AlertCircle, Waves, Droplet } from 'lucide-react';
import '../../App.css';
import { minigameAssets } from '../../data/minigame_assets';
import SoundManager from '../../logic/SoundManager';

const WIN_PERCENT = 80;
const LOSS_PERCENT = 100;
const GRAVITY = 0.04;

const MobileAquiferDefense = ({ onComplete, onClose, onImpact, onPenalty }) => {
    const [gameState, setGameState] = useState('playing'); // playing, success, failure
    const [savedPercent, setSavedPercent] = useState(0);
    const [lostPercent, setLostPercent] = useState(0);

    const [windowSize] = useState({ w: window.innerWidth, h: window.innerHeight });

    // Dynamic Dimensions for Mobile Portrait
    const CANVAS_WIDTH = windowSize.w;
    const CANVAS_HEIGHT = Math.round(windowSize.h * 0.82);
    const ZONE_WIDTH = Math.round(CANVAS_WIDTH * 0.32);
    const BOTTOM_HEIGHT = Math.round(CANVAS_HEIGHT * 0.22);
    const SIDE_TOP_MARGIN = 70;

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
            canv.width = w;
            canv.height = h;
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
            if (len > 12) {
                linesRef.current.push({ ...currentLineRef.current, life: 3.0 });
                try { SoundManager.playSFX('click'); } catch (err) {}
            }
            currentLineRef.current = null;
        }
        isDrawingRef.current = false;
    }, []);

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

        // 1. Drops generation
        if (gameState === 'playing' && Math.random() < 0.055 && dropsRef.current.length < 20) {
            dropsRef.current.push({
                x: ZONE_WIDTH + 20 + Math.random() * (CANVAS_WIDTH - 2 * ZONE_WIDTH - 40),
                y: -10,
                vx: (Math.random() - 0.5) * 1.4,
                vy: 1.6 + Math.random() * 1.0,
                radius: 6,
                handled: false
            });
        }

        // 2. Physics & Collisions
        dropsRef.current = dropsRef.current.filter(drop => {
            drop.vy += GRAVITY;
            drop.x += drop.vx;
            drop.y += drop.vy;

            // Bounce on lines
            linesRef.current.forEach(l => {
                const dx = l.x2 - l.x1;
                const dy = l.y2 - l.y1;
                const len = Math.sqrt(dx * dx + dy * dy);
                if (len < 5) return;

                let nx = -dy / len;
                let ny = dx / len;

                const dotVel = drop.vx * nx + drop.vy * ny;
                if (dotVel > 0) {
                    nx = -nx;
                    ny = -ny;
                }

                let t = ((drop.x - l.x1) * dx + (drop.y - l.y1) * dy) / (len * len);
                t = Math.max(0, Math.min(1, t));
                const closeX = l.x1 + t * dx;
                const closeY = l.y1 + t * dy;
                const distSq = (drop.x - closeX) ** 2 + (drop.y - closeY) ** 2;

                if (distSq < (drop.radius + 6) ** 2) {
                    const dot = drop.vx * nx + drop.vy * ny;
                    drop.vx = (drop.vx - 2 * dot * nx) * 0.85;
                    drop.vy = (drop.vy - 2 * dot * ny) * 0.85;
                    drop.x = closeX + nx * (drop.radius + 4);
                    drop.y = closeY + ny * (drop.radius + 4);
                }
            });

            // Scoring
            // Left: Granges Locals
            if (drop.x < ZONE_WIDTH && drop.y > SIDE_TOP_MARGIN && drop.y < CANVAS_HEIGHT - BOTTOM_HEIGHT) {
                if (!drop.handled) {
                    drop.handled = true;
                    savedDropsCountRef.current += 1;
                    const pct = Math.min(100, Math.round((savedDropsCountRef.current / 18) * 100));
                    setSavedPercent(pct);
                    try { SoundManager.playSFX('connect'); } catch (e) {}
                }
                mctx.fillStyle = 'white';
                mctx.beginPath();
                mctx.arc(drop.x, drop.y, 40, 0, Math.PI * 2);
                mctx.fill();
            }
            // Right: Ter i Bosc
            else if (drop.x > CANVAS_WIDTH - ZONE_WIDTH && drop.y > SIDE_TOP_MARGIN && drop.y < CANVAS_HEIGHT - BOTTOM_HEIGHT) {
                if (!drop.handled) {
                    drop.handled = true;
                    savedDropsCountRef.current += 1;
                    const pct = Math.min(100, Math.round((savedDropsCountRef.current / 18) * 100));
                    setSavedPercent(pct);
                    try { SoundManager.playSFX('connect'); } catch (e) {}
                }
                mctx.fillStyle = 'white';
                mctx.beginPath();
                mctx.arc(drop.x, drop.y, 40, 0, Math.PI * 2);
                mctx.fill();
            }
            // Bottom: Camp de Golf
            else if (drop.y > CANVAS_HEIGHT - BOTTOM_HEIGHT + 15) {
                if (!drop.handled) {
                    drop.handled = true;
                    lostDropsCountRef.current += 1;
                    const pct = Math.min(100, Math.round((lostDropsCountRef.current / 22) * 100));
                    setLostPercent(pct);
                }
                mctx.fillStyle = 'rgba(231, 76, 60, 0.6)';
                mctx.beginPath();
                mctx.arc(drop.x, drop.y, 30, 0, Math.PI * 2);
                mctx.fill();
            }

            return drop.y < CANVAS_HEIGHT + 40 && drop.x > -40 && drop.x < CANVAS_WIDTH + 40;
        });

        // Decay lines
        linesRef.current = linesRef.current.filter(l => {
            l.life -= 0.007;
            return l.life > 0;
        });

        // 3. Render Canvas
        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        const skyImg = getImg('sky', minigameAssets.aquifer.sky);
        drawImageCover(ctx, skyImg, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        ctx.drawImage(grayLayerRef.current, 0, 0);

        const tempCanv = document.createElement('canvas');
        tempCanv.width = CANVAS_WIDTH;
        tempCanv.height = CANVAS_HEIGHT;
        const tctx = tempCanv.getContext('2d');
        tctx.drawImage(colorLayerRef.current, 0, 0);
        tctx.globalCompositeOperation = 'destination-in';
        tctx.drawImage(maskCanvasRef.current, 0, 0);
        ctx.drawImage(tempCanv, 0, 0);

        // Lines
        ctx.lineWidth = 5;
        linesRef.current.forEach(l => {
            ctx.strokeStyle = `rgba(52, 152, 219, ${Math.min(1.0, l.life)})`;
            ctx.shadowColor = '#3498db';
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.moveTo(l.x1, l.y1);
            ctx.lineTo(l.x2, l.y2);
            ctx.stroke();
        });
        ctx.shadowBlur = 0;

        if (currentLineRef.current) {
            ctx.strokeStyle = '#2ecc71';
            ctx.lineWidth = 4;
            ctx.setLineDash([6, 4]);
            ctx.beginPath();
            ctx.moveTo(currentLineRef.current.x1, currentLineRef.current.y1);
            ctx.lineTo(currentLineRef.current.x2, currentLineRef.current.y2);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Drops
        dropsRef.current.forEach(d => {
            ctx.fillStyle = '#00d2ff';
            ctx.shadowBlur = 8;
            ctx.shadowColor = '#00a8ff';
            ctx.beginPath();
            ctx.arc(d.x, d.y, d.radius, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.shadowBlur = 0;

        // Labels
        ctx.font = 'bold 13px Inter, sans-serif';
        ctx.fillStyle = '#2ecc71';
        ctx.fillText('🌿 GRANGES', 10, SIDE_TOP_MARGIN + 24);

        ctx.textAlign = 'right';
        ctx.fillStyle = '#3498db';
        ctx.fillText('🌊 EL TER', CANVAS_WIDTH - 10, SIDE_TOP_MARGIN + 24);

        ctx.textAlign = 'center';
        ctx.fillStyle = '#e74c3c';
        ctx.fillText('⚠️ CAMP DE GOLF', CANVAS_WIDTH / 2, CANVAS_HEIGHT - 15);
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
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, backgroundColor: '#000', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '12px 16px', background: 'rgba(15, 23, 42, 1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, zIndex: 10, borderBottom: '1px solid #1e293b' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Waves color="#3498db" size={22} />
                    <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#f8fafc' }}>Defensa de l'Aqüífer</h3>
                </div>
                <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', fontSize: '1.5rem', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer' }}>×</button>
            </div>

            <div style={{ position: 'relative', width: '100%', flex: 1, touchAction: 'none', backgroundColor: '#000', overflow: 'hidden' }}>
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

                {/* Score Pills */}
                <div style={{ position: 'absolute', top: 10, left: 10, right: 10, display: 'flex', justifyContent: 'space-between', pointerEvents: 'none' }}>
                    <div style={{ color: '#2ecc71', backgroundColor: 'rgba(15, 23, 42, 0.9)', padding: '5px 12px', borderRadius: '15px', border: '1.5px solid #2ecc71', fontWeight: 'bold', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Droplet size={14} /> RECUPERAT: {savedPercent}%
                    </div>
                    <div style={{ color: '#e74c3c', backgroundColor: 'rgba(15, 23, 42, 0.9)', padding: '5px 12px', borderRadius: '15px', border: '1.5px solid #e74c3c', fontWeight: 'bold', fontSize: '0.85rem' }}>
                        GOLF: {lostPercent}%
                    </div>
                </div>

                <div style={{ position: 'absolute', bottom: 15, left: 20, right: 20, color: '#f1f5f9', textAlign: 'center', fontSize: '0.8rem', pointerEvents: 'none', background: 'rgba(0,0,0,0.65)', padding: '6px 12px', borderRadius: '20px' }}>
                    Fes lliscar el dit per dibuixar trampolins cap als costats
                </div>

                {gameState === 'success' && (
                    <div className="fade-in" style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.95)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', zIndex: 20, textAlign: 'center', padding: '20px' }}>
                        <ShieldCheck size={90} color="#2ecc71" style={{ filter: 'drop-shadow(0 0 20px #2ecc71)', marginBottom: '15px' }} />
                        <h2 style={{ color: '#2ecc71', fontSize: '1.8rem', margin: '0 0 10px 0' }}>L'AIGUA HA TORNAT!</h2>
                        <p style={{ color: 'white', fontSize: '1rem' }}>Has defensat l'aigua del Ter i les granges del poble.</p>
                    </div>
                )}

                {gameState === 'failure' && (
                    <div className="fade-in" style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(20, 10, 10, 0.95)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', zIndex: 20, pointerEvents: 'auto', textAlign: 'center', padding: '20px' }}>
                        <AlertCircle size={90} color="#e74c3c" style={{ filter: 'drop-shadow(0 0 20px #e74c3c)', marginBottom: '15px' }} />
                        <h2 style={{ color: '#e74c3c', fontSize: '1.8rem', margin: '0 0 10px 0' }}>AQÜÍFER ESGOTAT</h2>
                        <p style={{ color: 'white', fontSize: '0.95rem' }}>La gespa artificial i el formigó han drenat el riu.</p>
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
                            style={{ padding: '12px 28px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem', marginTop: '20px', width: '100%', maxWidth: '280px' }}
                        >
                            REINTENTAR LA DEFENSA
                        </button>
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
};

export default MobileAquiferDefense;
