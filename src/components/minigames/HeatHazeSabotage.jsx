import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { CheckCircle, Wind, X } from 'lucide-react';
import { minigameAssets } from '../../data/minigame_assets';

const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 540;

// How many people per stove
const PEOPLE_PER_STOVE = 3;

// Initial stove setup
const INITIAL_STOVES = [
    { id: 0, x: 180, y: 350 },
    { id: 1, x: 480, y: 360 },
    { id: 2, x: 780, y: 350 },
];

// People arranged around each stove
const buildPeople = () => {
    const people = [];
    const offsets = [
        [-65, -10], [65, -10], [0, 50]
    ];
    INITIAL_STOVES.forEach(stove => {
        offsets.forEach((off, pi) => {
            people.push({
                id: `s${stove.id}p${pi}`,
                stoveId: stove.id,
                x: stove.x + off[0],
                y: stove.y + off[1],
                hasJacket: false,
                entering: false,
                gone: false,
                scale: 1.0,
                shiverOffset: 0
            });
        });
    });
    return people;
};

const HeatHazeSabotage = ({ onComplete, onClose, onImpact }) => {
    const canvasRef = useRef(null);
    const requestRef = useRef();
    const frameCount = useRef(0);

    const assetBar = useRef(new Image());
    const assetStove = useRef(new Image());
    const assetsLoaded = useRef(false);

    const stovesRef = useRef(INITIAL_STOVES.map(s => ({ ...s, off: false })));
    const peopleRef = useRef(buildPeople());

    // Dragging state
    const draggingJacket = useRef(false);
    const jacketPos = useRef({ x: 0, y: 0 });

    const [stoveCount, setStoveCount] = useState(INITIAL_STOVES.length);
    const [cigaretteCount, setCigaretteCount] = useState(INITIAL_STOVES.length * PEOPLE_PER_STOVE);
    const [floatingTexts, setFloatingTexts] = useState([]);
    const [gameState, setGameState] = useState('playing');
    const gameStateRef = useRef('playing');

    useEffect(() => {
        assetBar.current.src = minigameAssets.heatHaze.bar;
        assetStove.current.src = minigameAssets.heatHaze.stove;

        let loaded = 0;
        const check = () => {
            loaded++;
            if (loaded === 2) assetsLoaded.current = true;
        };
        assetBar.current.onload = check;
        assetStove.current.onload = check;
    }, []);

    const drawPerson = (ctx, person, frame) => {
        if (person.gone) return;

        let px = person.x;
        let py = person.y;

        if (person.entering) {
            // Move toward center door (approx 480, 260) and scale down
            const dx = 480 - person.x;
            const dy = 260 - person.y;
            px += dx * 0.05;
            py += dy * 0.05;
            person.x = px;
            person.y = py;
            person.scale *= 0.96;
            if (person.scale < 0.1) {
                person.gone = true;
                return;
            }
        }

        ctx.save();
        ctx.translate(px, py);
        ctx.scale(person.scale, person.scale);

        // Shivering animation if cold
        if (!person.hasJacket && !person.entering) {
            const shiver = Math.sin(frame * 0.8) * 1.5;
            ctx.translate(shiver, 0);
        }

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath(); ctx.ellipse(0, 35, 18, 6, 0, 0, Math.PI * 2); ctx.fill();

        // Legs
        ctx.strokeStyle = '#222'; ctx.lineWidth = 6;
        ctx.beginPath(); ctx.moveTo(-5, 15); ctx.lineTo(-8, 33); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(5, 15); ctx.lineTo(8, 33); ctx.stroke();

        // Body
        ctx.fillStyle = person.hasJacket ? '#1b4d3e' : '#4a326b';
        ctx.beginPath(); ctx.roundRect(-14, -15, 28, 35, 6); ctx.fill();

        // Jacket details
        if (person.hasJacket) {
            ctx.strokeStyle = '#2ecc71'; ctx.lineWidth = 2;
            ctx.strokeRect(-14, -15, 28, 35);
            // Zipper/Center Line
            ctx.beginPath(); ctx.moveTo(0, -15); ctx.lineTo(0, 20); ctx.stroke();
            // Checkmark
            ctx.strokeStyle = '#7fffb2'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(-5, 0); ctx.lineTo(-1, 5); ctx.lineTo(7, -5); ctx.stroke();
        }

        // Head
        ctx.fillStyle = '#e5c298';
        ctx.beginPath(); ctx.arc(0, -25, 12, 0, Math.PI * 2); ctx.fill();
        // Hair
        ctx.fillStyle = '#2c1e00';
        ctx.beginPath(); ctx.arc(0, -31, 10, Math.PI, Math.PI * 2); ctx.fill();

        // Cigarette & Smoke
        if (!person.hasJacket && !person.entering) {
            ctx.fillStyle = '#fff';
            ctx.fillRect(12, -22, 10, 3);
            ctx.fillStyle = '#e67e22';
            ctx.fillRect(20, -22, 2, 3);

            ctx.strokeStyle = 'rgba(255,255,255,0.4)';
            for (let i = 0; i < 3; i++) {
                const sy = -30 - i * 15 - (frame * 0.5 % 15);
                const sx = 22 + Math.sin(frame * 0.1 + i) * 4;
                ctx.beginPath(); ctx.arc(sx, sy, 2 + i, 0, Math.PI * 2); ctx.stroke();
            }
        }

        ctx.restore();
    };

    const drawStoveAsset = (ctx, stove, frame) => {
        const sw = 100, sh = 160;
        if (assetsLoaded.current) {
            ctx.save();
            if (stove.off) ctx.filter = 'grayscale(1) brightness(0.5)';
            ctx.drawImage(assetStove.current, stove.x - sw / 2, stove.y - sh + 70, sw, sh);
            ctx.restore();
        }

        if (!stove.off) {
            // Animated heat effect
            const glowR = 35 + 8 * Math.sin(frame * 0.1);
            const grad = ctx.createRadialGradient(stove.x, stove.y - 60, 0, stove.x, stove.y - 60, glowR);
            grad.addColorStop(0, 'rgba(255,100,0,0.4)');
            grad.addColorStop(1, 'rgba(255,50,0,0)');
            ctx.fillStyle = grad;
            ctx.beginPath(); ctx.arc(stove.x, stove.y - 60, glowR, 0, Math.PI * 2); ctx.fill();
        }
    };

    const drawJacketTool = (ctx, x, y) => {
        ctx.save();
        ctx.translate(x, y);
        // Premium Jacket Icon
        ctx.fillStyle = '#1b4d3e';
        ctx.beginPath(); ctx.roundRect(-25, -20, 50, 40, 8); ctx.fill();
        ctx.strokeStyle = '#2ecc71'; ctx.lineWidth = 3;
        ctx.strokeRect(-25, -20, 50, 40);
        ctx.fillStyle = '#2ecc71';
        ctx.font = '24px serif';
        ctx.textAlign = 'center';
        ctx.fillText('🧥', 0, 10);
        ctx.restore();
    };

    const animate = useCallback(() => {
        if (gameStateRef.current !== 'playing' && gameStateRef.current !== 'success') return;
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx) return;

        frameCount.current++;
        const frame = frameCount.current;

        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // 1. Bar Background
        if (assetsLoaded.current) {
            ctx.drawImage(assetBar.current, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        } else {
            ctx.fillStyle = '#111';
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        }

        // 2. Stoves (Behind people)
        stovesRef.current.forEach(s => drawStoveAsset(ctx, s, frame));

        // 3. People
        peopleRef.current.forEach(p => drawPerson(ctx, p, frame));

        // 4. Jacket Tray
        const trayX = 890, trayY = 460;
        if (!draggingJacket.current) {
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.beginPath(); ctx.roundRect(830, 410, 120, 90, 12); ctx.fill();
            ctx.strokeStyle = '#2ecc71'; ctx.lineWidth = 2;
            ctx.strokeRect(830, 410, 120, 90);
            ctx.fillStyle = '#fff'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
            ctx.fillText('JAQUETES', trayX, 430);
            drawJacketTool(ctx, trayX, trayY + 5);
        } else {
            drawJacketTool(ctx, jacketPos.current.x, jacketPos.current.y);
        }

        if (gameStateRef.current === 'playing') {
            requestRef.current = requestAnimationFrame(animate);
        }
    }, []);

    useEffect(() => {
        requestRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(requestRef.current);
    }, [animate]);

    const toCanvas = (e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        return {
            x: ((e.clientX - rect.left) / rect.width) * CANVAS_WIDTH,
            y: ((e.clientY - rect.top) / rect.height) * CANVAS_HEIGHT,
        };
    };

    const handlePointerDown = (e) => {
        const { x, y } = toCanvas(e);
        if (Math.hypot(x - 890, y - 460) < 50) {
            draggingJacket.current = true;
            jacketPos.current = { x, y };
            e.currentTarget.setPointerCapture(e.pointerId);
        }
    };

    const handlePointerMove = (e) => {
        if (!draggingJacket.current) return;
        const { x, y } = toCanvas(e);
        jacketPos.current = { x, y };
    };

    const handlePointerUp = (e) => {
        if (!draggingJacket.current) return;
        draggingJacket.current = false;
        const { x, y } = toCanvas(e);

        let hit = null;
        peopleRef.current.forEach(p => {
            if (!p.hasJacket && !p.gone && !p.entering) {
                if (Math.hypot(x - p.x, y - p.y) < 45) hit = p;
            }
        });

        if (hit) {
            hit.hasJacket = true;
            const stove = stovesRef.current.find(s => s.id === hit.stoveId);
            const stovePeople = peopleRef.current.filter(p => p.stoveId === hit.stoveId && !p.gone);

            if (stovePeople.every(p => p.hasJacket) && !stove.off) {
                stove.off = true;
                setTimeout(() => {
                    stovePeople.forEach(p => p.entering = true);
                    const newStoveCount = stovesRef.current.filter(s => !s.off).length;
                    const newCigCount = peopleRef.current.filter(p => !p.gone && !p.entering).length;
                    setStoveCount(newStoveCount);
                    setCigaretteCount(newCigCount);

                    const id = Date.now();
                    setFloatingTexts(prev => [...prev, { id, text: '🚭 1 fumador menys!', x: 480, y: 200 }]);
                    setTimeout(() => setFloatingTexts(prev => prev.filter(t => t.id !== id)), 2000);

                    if (newStoveCount === 0) {
                        gameStateRef.current = 'success';
                        setGameState('success');
                        onImpact?.(800);
                        setTimeout(onComplete, 3000);
                    }
                }, 600);
            }
        }
    };

    return ReactDOM.createPortal(
        <div className="minigame-overlay">
            <div className="minigame-card scale-up-center" style={{
                width: 'min(980px, 98vw)', padding: 0, overflow: 'hidden',
                backgroundColor: '#111', border: '2px solid #c9a84c'
            }}>
                {/* Header */}
                <div className="minigame-header" style={{ padding: '10px 20px', background: 'rgba(20,10,0,0.95)', borderBottom: '1px solid #c9a84c' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Wind color="#e74c3c" size={20} />
                        <h3 style={{ margin: 0, fontSize: '1rem', color: 'white' }}>Sabotatge de les Estufes de Terrassa</h3>
                    </div>
                    <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                        {/* Counters */}
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', color: '#e74c3c', fontWeight: 'bold' }}>
                            🔥 {stoveCount} estuf{stoveCount !== 1 ? 'es' : 'a'}
                        </div>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', color: '#bdc3c7', fontWeight: 'bold' }}>
                            🚬 {cigaretteCount}
                        </div>
                        <button onClick={onClose} className="close-btn">×</button>
                    </div>
                </div>

                {/* Canvas */}
                <div style={{ position: 'relative' }}>
                    <canvas
                        ref={canvasRef}
                        width={CANVAS_WIDTH} height={CANVAS_HEIGHT}
                        onPointerDown={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        style={{ width: '100%', display: 'block', cursor: draggingJacket.current ? 'grabbing' : 'default', touchAction: 'none' }}
                    />

                    {/* Floating texts */}
                    {floatingTexts.map(t => (
                        <div key={t.id} style={{
                            position: 'absolute', left: t.x / CANVAS_WIDTH * 100 + '%', top: t.y / CANVAS_HEIGHT * 100 + '%',
                            transform: 'translate(-50%, -50%)', color: '#2ecc71', fontWeight: '900',
                            fontSize: '1.4rem', textShadow: '0 2px 8px rgba(0,0,0,0.8)',
                            animation: 'floatUp 2s forwards', pointerEvents: 'none', whiteSpace: 'nowrap'
                        }}>
                            {t.text}
                        </div>
                    ))}

                    {/* Instructions */}
                    <div style={{
                        position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
                        color: 'rgba(255,255,255,0.85)', fontSize: '0.85rem', textAlign: 'center', width: '90%',
                        background: 'rgba(0,0,0,0.6)', padding: '6px 10px', borderRadius: 6,
                        pointerEvents: 'none', zIndex: 10
                    }}>
                        Arrossega les jaquetes 🧥 fins a cada persona per escalfar-les i apagar les estufes
                    </div>

                    {gameState === 'success' && (
                        <div className="success-overlay" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(10,30,10,0.92)', gap: 12 }}>
                            <CheckCircle size={90} color="#2ecc71" style={{ filter: 'drop-shadow(0 0 20px #2ecc71)' }} />
                            <h2 style={{ color: '#2ecc71', margin: 0, fontSize: '2rem' }}>TERRASSA TANCADA!</h2>
                            <p style={{ color: '#a8e6c4', fontSize: '1rem', margin: 0 }}>Tothom té jaqueta i les estufes estan apagades. 🚭</p>
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};

export default HeatHazeSabotage;
