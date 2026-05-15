import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { ShieldCheck, Sun, Droplets, Timer } from 'lucide-react';
import '../../App.css';
import { minigameAssets } from '../../data/minigame_assets';

// VERTICAL MOBILE CANVAS
const CANVAS_WIDTH = 540;
const CANVAS_HEIGHT = 960;
const NUM_STRIPS = 3; // Fewer strips on mobile to give more touch area
const STRIP_HEIGHT = (CANVAS_HEIGHT - 120) / NUM_STRIPS; // Leave room for top bar
const WIN_PERCENT = 100;
const TIME_LIMIT = 20;

const MobileEvaporationRace = ({ onComplete, onClose, onImpact, onPenalty }) => {
    const [gameState, setGameState] = useState('playing');
    const [coveredPercent, setCoveredPercent] = useState(0);
    const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
    const [assetsReady, setAssetsReady] = useState(false);

    const canvasRef = useRef(null);
    const requestRef = useRef();
    const imgPool = useRef(null);
    const imgBlanket = useRef(null);

    const strips = useRef(Array.from({ length: NUM_STRIPS }, () => ({ rightEdge: 0 })));
    const activeStrip = useRef(-1);
    const dragStartX = useRef(0);
    const dragStartEdge = useRef(0);

    const rays = useRef([]);
    const lastRaySpawn = useRef(0);
    const gameStateRef = useRef('playing');
    const frameCount = useRef(0);
    const startTimeRef = useRef(null);

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

        const elapsed = (time - startTimeRef.current) / 1000;
        const remaining = Math.max(0, TIME_LIMIT - elapsed);
        setTimeLeft(Math.ceil(remaining));

        if (remaining <= 0) {
            gameStateRef.current = 'failure';
            setGameState('failure');
            onPenalty?.(5);
            return;
        }

        if (frameCount.current - lastRaySpawn.current > 70) {
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
                    speed: 3 + Math.random() * 3,
                    size: 25 + Math.random() * 20,
                });
            }
            lastRaySpawn.current = frameCount.current;
        }

        rays.current.forEach(r => { r.y += r.speed; });
        rays.current = rays.current.filter(r => r.y < CANVAS_HEIGHT + 50);

        const pct = Math.round(getTotalCoveredFraction() * 100);
        setCoveredPercent(pct);

        if (pct >= WIN_PERCENT) {
            gameStateRef.current = 'success';
            setGameState('success');
            onImpact?.(1000);
            setTimeout(onComplete, 2500);
            return;
        }

        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        const hasPool = drawImageCover(ctx, imgPool.current, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        if (!hasPool) {
            ctx.fillStyle = '#0ea5e9'; ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        }

        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.lineWidth = 1;
        for (let s = 1; s < NUM_STRIPS; s++) {
            const y = 80 + s * STRIP_HEIGHT;
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CANVAS_WIDTH, y); ctx.stroke();
        }

        strips.current.forEach((strip, i) => {
            const sy = 80 + i * STRIP_HEIGHT;
            const sw = strip.rightEdge;

            if (sw > 0) {
                const hasImg = imgBlanket.current?.complete && imgBlanket.current.naturalWidth > 0;
                if (hasImg) {
                    ctx.drawImage(imgBlanket.current, 0, 0, imgBlanket.current.naturalWidth, imgBlanket.current.naturalHeight, 0, sy, sw, STRIP_HEIGHT);
                } else {
                    ctx.fillStyle = 'rgba(30,80,155,0.9)'; ctx.fillRect(0, sy, sw, STRIP_HEIGHT);
                }
                const isActive = activeStrip.current === i;
                ctx.strokeStyle = isActive ? '#38bdf8' : 'rgba(148,218,255,0.7)';
                ctx.lineWidth = isActive ? 8 : 4;
                ctx.beginPath(); ctx.moveTo(sw, sy); ctx.lineTo(sw, sy + STRIP_HEIGHT); ctx.stroke();
            }

            if (sw < CANVAS_WIDTH - 15) {
                const ax = sw + 10;
                const ay = sy + STRIP_HEIGHT / 2;
                ctx.fillStyle = 'rgba(56,189,248,0.9)';
                ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax + 35, ay - 18); ctx.lineTo(ax + 35, ay + 18); ctx.closePath(); ctx.fill();
            }
        });

        rays.current.forEach(ray => {
            const blanketRight = strips.current[ray.stripTarget]?.rightEdge ?? 0;
            if (ray.x < blanketRight) return;
            const rg = ctx.createRadialGradient(ray.x, ray.y, 0, ray.x, ray.y, ray.size);
            rg.addColorStop(0, 'rgba(255,220,50,1)');
            rg.addColorStop(1, 'rgba(255,50,0,0)');
            ctx.fillStyle = rg;
            ctx.beginPath(); ctx.arc(ray.x, ray.y, ray.size, 0, Math.PI * 2); ctx.fill();
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
            x: ((e.touches ? e.touches[0].clientX : e.clientX) - rect.left) / rect.width * CANVAS_WIDTH,
            y: ((e.touches ? e.touches[0].clientY : e.clientY) - rect.top) / rect.height * CANVAS_HEIGHT,
        };
    };

    const handleStart = (e) => {
        if (gameStateRef.current !== 'playing') return;
        const { x, y } = toCanvasCoords(e);
        const stripIdx = Math.floor((y - 80) / STRIP_HEIGHT);
        if (stripIdx < 0 || stripIdx >= NUM_STRIPS) return;
        activeStrip.current = stripIdx;
        dragStartX.current = x;
        dragStartEdge.current = strips.current[stripIdx].rightEdge;
    };

    const handleMove = (e) => {
        if (activeStrip.current < 0 || gameStateRef.current !== 'playing') return;
        if (e.cancelable) e.preventDefault();
        const { x } = toCanvasCoords(e);
        const delta = x - dragStartX.current;
        strips.current[activeStrip.current].rightEdge = Math.max(0, Math.min(CANVAS_WIDTH, dragStartEdge.current + delta));
    };

    const handleEnd = () => { activeStrip.current = -1; };

    return ReactDOM.createPortal(
        <div className="minigame-overlay" style={{ touchAction: 'none' }}>
            <div className="minigame-card scale-up-center" style={{ width: '100vw', height: '100dvh', padding: 0, borderRadius: 0, background: '#000' }}>
                <div className="minigame-header" style={{ padding: '15px', background: '#020617', borderBottom: '1px solid #0ea5e9' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Droplets color="#38bdf8" size={24} />
                        <h3 style={{ margin: 0, color: 'white' }}>Cursa d'Evaporació</h3>
                    </div>
                    <button onClick={onClose} className="close-btn" style={{ background: 'white' }}>×</button>
                </div>

                <div style={{ position: 'relative', height: 'calc(100% - 60px)' }}>
                    <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT}
                        onTouchStart={handleStart} onTouchMove={handleMove} onTouchEnd={handleEnd}
                        onMouseDown={handleStart} onMouseMove={handleMove} onMouseUp={handleEnd}
                        style={{ width: '100%', height: '100%', display: 'block' }}
                    />
                    
                    <div style={{ position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.7)', padding: '10px 20px', borderRadius: 20, color: '#38bdf8', fontWeight: 'bold' }}>
                        COBERTURA: {coveredPercent}%
                    </div>

                    <div style={{ position: 'absolute', bottom: 40, right: 20, color: timeLeft > 5 ? '#22c55e' : '#ef4444', fontSize: '2rem', fontWeight: 'bold' }}>
                        {timeLeft}s
                    </div>

                    {gameState === 'success' && (
                        <div className="success-overlay fade-in" style={{ background: 'rgba(2,6,23,0.9)' }}>
                            <ShieldCheck size={100} color="#22c55e" />
                            <h2 style={{ color: '#22c55e' }}>PISCINA PROTEGIDA!</h2>
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};

export default MobileEvaporationRace;
