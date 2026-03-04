import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { ShieldCheck, Sun, Droplets, Timer } from 'lucide-react';
import '../../App.css';
import { minigameAssets } from '../../data/minigame_assets';

const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 540;
const NUM_STRIPS = 4;
const STRIP_HEIGHT = CANVAS_HEIGHT / NUM_STRIPS;
const WIN_PERCENT = 100;
const TIME_LIMIT = 20; // seconds

const EvaporationRace = ({ onComplete, onClose, onImpact, onPenalty }) => {
    const [gameState, setGameState] = useState('playing');
    const [coveredPercent, setCoveredPercent] = useState(0);
    const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
    const [assetsReady, setAssetsReady] = useState(false);

    const canvasRef = useRef(null);
    const requestRef = useRef();
    const imgPool = useRef(null);
    const imgBlanket = useRef(null);

    // Each strip: rightEdge = how far the blanket extends from left (0 = none covered)
    const strips = useRef(Array.from({ length: NUM_STRIPS }, () => ({ rightEdge: 0 })));
    const activeStrip = useRef(-1);
    const dragStartX = useRef(0);
    const dragStartEdge = useRef(0);

    const rays = useRef([]);
    const lastRaySpawn = useRef(0);
    const gameStateRef = useRef('playing');
    const frameCount = useRef(0);
    const startTimeRef = useRef(null);

    // Load images
    useEffect(() => {
        const pool = new Image();
        const blanket = new Image();
        let loaded = 0;
        const onLoad = () => { loaded++; if (loaded >= 2) setAssetsReady(true); };
        pool.onload = onLoad; pool.onerror = onLoad;
        blanket.onload = onLoad; blanket.onerror = onLoad;
        pool.src = minigameAssets?.evaporation?.pool || '';
        blanket.src = minigameAssets?.evaporation?.blanket || '';
        imgPool.current = pool;
        imgBlanket.current = blanket;
    }, []);

    const drawImageCover = (ctx, img, x, y, w, h) => {
        if (!img?.complete || !img.naturalWidth) return false;
        const ir = img.naturalWidth / img.naturalHeight;
        const cr = w / h;
        let sx, sy, sw, sh;
        if (ir > cr) { sh = img.naturalHeight; sw = sh * cr; sx = (img.naturalWidth - sw) / 2; sy = 0; }
        else { sw = img.naturalWidth; sh = sw / cr; sx = 0; sy = (img.naturalHeight - sh) / 2; }
        ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
        return true;
    };

    const getTotalCoveredFraction = () => {
        return strips.current.reduce((sum, s) => sum + s.rightEdge, 0) / (CANVAS_WIDTH * NUM_STRIPS);
    };

    const animate = useCallback((time) => {
        if (gameStateRef.current !== 'playing') return;
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx) return;

        frameCount.current++;
        if (!startTimeRef.current) startTimeRef.current = time;

        // --- Timer ---
        const elapsed = (time - startTimeRef.current) / 1000;
        const remaining = Math.max(0, TIME_LIMIT - elapsed);
        setTimeLeft(Math.ceil(remaining));

        if (remaining <= 0) {
            gameStateRef.current = 'failure';
            setGameState('failure');
            onPenalty?.(5);
            return;
        }

        // --- Ray spawning every ~80 frames ---
        if (frameCount.current - lastRaySpawn.current > 80) {
            const exposed = strips.current
                .map((s, i) => ({ i, exposed: CANVAS_WIDTH - s.rightEdge }))
                .filter(x => x.exposed > 30);
            if (exposed.length > 0) {
                const target = exposed[Math.floor(Math.random() * exposed.length)];
                const exposedStart = strips.current[target.i].rightEdge;
                rays.current.push({
                    x: exposedStart + 10 + Math.random() * (CANVAS_WIDTH - exposedStart - 20),
                    y: -40,
                    stripTarget: target.i,
                    speed: 2.5 + Math.random() * 2,
                    size: 20 + Math.random() * 15,
                });
            }
            lastRaySpawn.current = frameCount.current;
        }

        rays.current.forEach(r => { r.y += r.speed; });
        rays.current = rays.current.filter(r => r.y < CANVAS_HEIGHT + 50);

        // --- Check win ---
        const pct = Math.round(getTotalCoveredFraction() * 100);
        setCoveredPercent(pct);

        if (pct >= WIN_PERCENT) {
            gameStateRef.current = 'success';
            setGameState('success');
            onImpact?.(1000);         // 1000 kg CO2
            setTimeout(onComplete, 2500);
            return;
        }

        // --- RENDER ---
        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // 1. Pool background
        const hasPool = drawImageCover(ctx, imgPool.current, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        if (!hasPool) {
            const g = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
            g.addColorStop(0, '#0ea5e9'); g.addColorStop(1, '#0369a1');
            ctx.fillStyle = g; ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
            ctx.strokeStyle = '#bae6fd'; ctx.lineWidth = 20;
            ctx.strokeRect(30, 30, CANVAS_WIDTH - 60, CANVAS_HEIGHT - 60);
        }

        // 2. Water shimmer
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 1.5;
        const so = (frameCount.current * 0.7) % 60;
        for (let i = -60; i < CANVAS_WIDTH + 60; i += 60) {
            ctx.beginPath();
            ctx.moveTo(i + so, 0);
            ctx.lineTo(i + CANVAS_HEIGHT * 0.12 + so, CANVAS_HEIGHT);
            ctx.stroke();
        }

        // 3. Strip dividers
        ctx.strokeStyle = 'rgba(255,255,255,0.18)';
        ctx.lineWidth = 1;
        for (let s = 1; s < NUM_STRIPS; s++) {
            ctx.beginPath(); ctx.moveTo(0, s * STRIP_HEIGHT); ctx.lineTo(CANVAS_WIDTH, s * STRIP_HEIGHT); ctx.stroke();
        }

        // 4. Blanket strips
        strips.current.forEach((strip, i) => {
            const sy = i * STRIP_HEIGHT;
            const sw = strip.rightEdge;

            // Blanket fill
            if (sw > 0) {
                const hasImg = imgBlanket.current?.complete && imgBlanket.current.naturalWidth > 0;
                if (hasImg) {
                    ctx.drawImage(imgBlanket.current, 0, 0, imgBlanket.current.naturalWidth, imgBlanket.current.naturalHeight, 0, sy, sw, STRIP_HEIGHT);
                } else {
                    const bg = ctx.createLinearGradient(0, 0, sw, 0);
                    bg.addColorStop(0, 'rgba(15,55,100,0.92)');
                    bg.addColorStop(1, 'rgba(30,80,155,0.88)');
                    ctx.fillStyle = bg; ctx.fillRect(0, sy, sw, STRIP_HEIGHT);
                    ctx.fillStyle = 'rgba(100,180,255,0.25)';
                    for (let bx = 20; bx < sw; bx += 30) {
                        for (let by = sy + 15; by < sy + STRIP_HEIGHT; by += 30) {
                            ctx.beginPath(); ctx.arc(bx, by, 10, 0, Math.PI * 2); ctx.fill();
                        }
                    }
                }
                // Edge
                const isActive = activeStrip.current === i;
                ctx.strokeStyle = isActive ? '#38bdf8' : 'rgba(148,218,255,0.7)';
                ctx.lineWidth = isActive ? 5 : 3;
                ctx.beginPath(); ctx.moveTo(sw, sy); ctx.lineTo(sw, sy + STRIP_HEIGHT); ctx.stroke();
            }

            // Arrow indicator
            if (sw < CANVAS_WIDTH - 10) {
                const ax = sw + 8;
                const ay = sy + STRIP_HEIGHT / 2;
                ctx.fillStyle = 'rgba(56,189,248,0.85)';
                ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax + 28, ay - 13); ctx.lineTo(ax + 28, ay + 13); ctx.closePath(); ctx.fill();
            } else {
                // Checkmark if complete
                ctx.fillStyle = 'rgba(34,197,94,0.85)';
                ctx.font = 'bold 24px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('✓', CANVAS_WIDTH - 30, sy + STRIP_HEIGHT / 2 + 8);
            }

            // Strip label
            const stripPct = Math.round((strip.rightEdge / CANVAS_WIDTH) * 100);
            ctx.fillStyle = 'rgba(0,0,0,0.55)';
            ctx.fillRect(CANVAS_WIDTH - 80, sy + STRIP_HEIGHT / 2 - 13, 72, 26);
            ctx.fillStyle = stripPct >= 100 ? '#22c55e' : '#bae6fd';
            ctx.font = 'bold 13px Inter, sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText(`F${i + 1}: ${stripPct}%`, CANVAS_WIDTH - 8, sy + STRIP_HEIGHT / 2 + 5);
        });

        // 5. Timer bar at top
        const timerFrac = remaining / TIME_LIMIT;
        const timerColor = timerFrac > 0.5 ? '#22c55e' : timerFrac > 0.25 ? '#f59e0b' : '#ef4444';
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(0, 0, CANVAS_WIDTH, 10);
        ctx.fillStyle = timerColor;
        ctx.fillRect(0, 0, CANVAS_WIDTH * timerFrac, 10);

        // 6. Solar rays
        rays.current.forEach(ray => {
            const blanketRight = strips.current[ray.stripTarget]?.rightEdge ?? 0;
            if (ray.x < blanketRight) return; // under blanket
            const rg = ctx.createRadialGradient(ray.x, ray.y, 0, ray.x, ray.y, ray.size);
            rg.addColorStop(0, 'rgba(255,220,50,0.95)');
            rg.addColorStop(0.5, 'rgba(255,100,0,0.5)');
            rg.addColorStop(1, 'rgba(255,50,0,0)');
            ctx.fillStyle = rg;
            ctx.beginPath(); ctx.arc(ray.x, ray.y, ray.size, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = 'rgba(255,240,100,0.5)';
            ctx.lineWidth = 1.5;
            for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
                ctx.beginPath();
                ctx.moveTo(ray.x + Math.cos(a) * ray.size * 0.5, ray.y + Math.sin(a) * ray.size * 0.5);
                ctx.lineTo(ray.x + Math.cos(a) * ray.size * 1.5, ray.y + Math.sin(a) * ray.size * 1.5);
                ctx.stroke();
            }
        });

        requestRef.current = requestAnimationFrame(animate);
    }, []);

    useEffect(() => {
        if (!assetsReady) return;
        requestRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(requestRef.current);
    }, [animate, assetsReady]);

    const toCanvasCoords = (e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        return {
            x: ((e.clientX - rect.left) / rect.width) * CANVAS_WIDTH,
            y: ((e.clientY - rect.top) / rect.height) * CANVAS_HEIGHT,
        };
    };

    const handlePointerDown = (e) => {
        if (gameStateRef.current !== 'playing') return;
        const { x, y } = toCanvasCoords(e);
        const stripIdx = Math.floor(y / STRIP_HEIGHT);
        if (stripIdx < 0 || stripIdx >= NUM_STRIPS) return;
        activeStrip.current = stripIdx;
        dragStartX.current = x;
        dragStartEdge.current = strips.current[stripIdx].rightEdge;
        e.currentTarget.setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e) => {
        if (activeStrip.current < 0 || gameStateRef.current !== 'playing') return;
        const { x } = toCanvasCoords(e);
        const delta = x - dragStartX.current;
        const newEdge = Math.max(0, Math.min(CANVAS_WIDTH, dragStartEdge.current + delta));
        strips.current[activeStrip.current].rightEdge = newEdge;
    };

    const handlePointerUp = () => { activeStrip.current = -1; };

    const resetGame = () => {
        strips.current = Array.from({ length: NUM_STRIPS }, () => ({ rightEdge: 0 }));
        rays.current = [];
        lastRaySpawn.current = 0;
        frameCount.current = 0;
        startTimeRef.current = null;
        gameStateRef.current = 'playing';
        setGameState('playing');
        setTimeLeft(TIME_LIMIT);
        setCoveredPercent(0);
        cancelAnimationFrame(requestRef.current);
        requestRef.current = requestAnimationFrame(animate);
    };

    const timerColor = timeLeft > 10 ? '#22c55e' : timeLeft > 5 ? '#f59e0b' : '#ef4444';

    return ReactDOM.createPortal(
        <div className="minigame-overlay">
            <div className="minigame-card scale-up-center" style={{
                width: 'min(980px, 98vw)', padding: 0, overflow: 'hidden',
                backgroundColor: '#000', border: '2px solid #0ea5e9'
            }}>
                <div className="minigame-header" style={{ padding: '10px 20px', background: 'rgba(2,6,23,0.95)', borderBottom: '1px solid #0ea5e9' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Droplets color="#38bdf8" size={22} />
                        <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'white' }}>Cursa d'Evaporació: Piscina Sostenible</h3>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        {/* Timer display */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: timerColor, fontWeight: 'bold', fontSize: '1.2rem', fontVariantNumeric: 'tabular-nums' }}>
                            <Timer size={18} />
                            {timeLeft}s
                        </div>
                        <button onClick={onClose} className="close-btn">×</button>
                    </div>
                </div>

                {!assetsReady && (
                    <div style={{ background: '#020617', height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38bdf8' }}>
                        Carregant...
                    </div>
                )}

                <div style={{ position: 'relative', display: assetsReady ? 'block' : 'none' }}>
                    <canvas
                        ref={canvasRef}
                        width={CANVAS_WIDTH} height={CANVAS_HEIGHT}
                        onPointerDown={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        onPointerLeave={handlePointerUp}
                        style={{ width: '100%', display: 'block', cursor: 'grab', touchAction: 'none' }}
                    />

                    {/* Coverage HUD */}
                    <div style={{
                        position: 'absolute', top: 18, left: '50%', transform: 'translateX(-50%)',
                        background: 'rgba(2,6,23,0.85)', border: '2px solid #38bdf8', borderRadius: 30,
                        padding: '5px 20px', color: '#38bdf8', fontWeight: 'bold', fontSize: '1rem', whiteSpace: 'nowrap'
                    }}>
                        COBERTURA: {coveredPercent}% / {WIN_PERCENT}%
                    </div>

                    {/* Instruction */}
                    <div style={{
                        position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)',
                        color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem', textAlign: 'center',
                        background: 'rgba(0,0,0,0.5)', padding: '4px 12px', borderRadius: 8, whiteSpace: 'nowrap'
                    }}>
                        Arrossega cada franja cap a la dreta · Cal cobrir el 100% en {TIME_LIMIT}s
                    </div>

                    {gameState === 'success' && (
                        <div className="success-overlay" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(2,6,23,0.9)', gap: 12 }}>
                            <ShieldCheck size={90} color="#22c55e" style={{ filter: 'drop-shadow(0 0 20px #22c55e)' }} />
                            <h2 style={{ color: '#22c55e', margin: 0, fontSize: '2.2rem' }}>PISCINA PROTEGIDA!</h2>
                            <p style={{ color: '#bae6fd', fontSize: '1.1rem', margin: 0 }}>Has estès els 4 cobertors. <strong style={{ color: '#22c55e' }}>-1.000 kg CO₂!</strong></p>
                        </div>
                    )}

                    {gameState === 'failure' && (
                        <div className="success-overlay" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(30,5,5,0.93)', gap: 12, pointerEvents: 'auto' }}>
                            <Sun size={90} color="#ef4444" style={{ filter: 'drop-shadow(0 0 20px #ef4444)' }} />
                            <h2 style={{ color: '#ef4444', margin: 0, fontSize: '2.2rem' }}>TEMPS ESGOTAT!</h2>
                            <p style={{ color: '#fca5a5', fontSize: '1rem', margin: 0 }}>No has cobert tota la piscina a temps. L'especulació augmenta.</p>
                            <button onClick={resetGame} style={{
                                marginTop: 10, padding: '10px 36px', background: '#ef4444', color: 'white',
                                border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 'bold',
                                fontSize: '1rem', pointerEvents: 'auto'
                            }}>REINTENTAR</button>
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};

export default EvaporationRace;
