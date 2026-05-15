import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { CheckCircle, Wind, X } from 'lucide-react';
import { minigameAssets } from '../../data/minigame_assets';
import '../../App.css';

// VERTICAL LAYOUT FOR MOBILE
const CANVAS_WIDTH = 540;
const CANVAS_HEIGHT = 960;

// How many people per stove
const PEOPLE_PER_STOVE = 3;

// Initial stove setup - VERTICALLY STACKED
const INITIAL_STOVES = [
    { id: 0, x: 270, y: 250 },
    { id: 1, x: 270, y: 550 },
    { id: 2, x: 270, y: 850 },
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

const MobileHeatHazeSabotage = ({ onComplete, onClose, onImpact }) => {
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
            // Move toward center top door and scale down
            const dx = 270 - person.x;
            const dy = -50 - person.y;
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
        if (!person.hasJacket) {
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(8, -22); ctx.lineTo(16, -20); ctx.stroke();
            ctx.fillStyle = '#e74c3c';
            ctx.beginPath(); ctx.arc(16, -20, 1.5, 0, Math.PI * 2); ctx.fill();

            if (frame % 30 < 15) {
                ctx.fillStyle = 'rgba(255,255,255,0.4)';
                ctx.beginPath(); ctx.arc(20, -28 - (frame % 20), 4, 0, Math.PI * 2); ctx.fill();
            }
        }

        ctx.restore();
    };

    const drawStove = (ctx, stove, frame) => {
        ctx.save();
        ctx.translate(stove.x, stove.y);

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.beginPath(); ctx.ellipse(-2, 25, 30, 8, 0, 0, Math.PI * 2); ctx.fill();

        // Base tank
        ctx.fillStyle = stove.off ? '#7f8c8d' : '#8e44ad';
        ctx.beginPath(); ctx.roundRect(-25, 5, 46, 20, 4); ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fillRect(-25, 5, 20, 20); // shading

        // Pole
        ctx.fillStyle = '#2c3e50';
        ctx.fillRect(-6, -80, 8, 85);

        // Top reflector
        ctx.fillStyle = '#ecf0f1';
        ctx.beginPath(); ctx.ellipse(-2, -85, 40, 10, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#bdc3c7';
        ctx.beginPath(); ctx.ellipse(-2, -83, 38, 8, 0, 0, Math.PI * 2); ctx.fill();

        // Flame
        if (!stove.off) {
            const flicker = Math.random() * 4;
            // Halo
            ctx.fillStyle = 'rgba(230, 126, 34, 0.4)';
            ctx.beginPath(); ctx.ellipse(-2, -65, 35 + flicker, 15 + flicker, 0, 0, Math.PI * 2); ctx.fill();

            // Core flame
            ctx.fillStyle = '#f39c12';
            ctx.beginPath(); ctx.moveTo(-2, -75 - flicker); ctx.lineTo(-12, -60); ctx.lineTo(8, -60); ctx.fill();

            // Bright center
            ctx.fillStyle = '#f1c40f';
            ctx.beginPath(); ctx.moveTo(-2, -70 - flicker); ctx.lineTo(-8, -60); ctx.lineTo(4, -60); ctx.fill();

            // Heat haze lines
            ctx.strokeStyle = 'rgba(255, 100, 0, 0.5)';
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(-20, -90 - (frame % 10)); ctx.lineTo(-20, -110 - (frame % 10)); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(15, -95 - ((frame + 5) % 10)); ctx.lineTo(15, -115 - ((frame + 5) % 10)); ctx.stroke();
        }

        ctx.restore();
    };

    const animate = useCallback(() => {
        if (!canvasRef.current || gameStateRef.current !== 'playing') return;
        const ctx = canvasRef.current.getContext('2d');
        frameCount.current++;
        const frame = frameCount.current;

        // Clear & Draw Bar floor
        ctx.fillStyle = '#2c3e50';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Tiles
        ctx.strokeStyle = '#34495e'; ctx.lineWidth = 1;
        for (let x = 0; x < CANVAS_WIDTH; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CANVAS_HEIGHT); ctx.stroke(); }
        for (let y = 0; y < CANVAS_HEIGHT; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CANVAS_WIDTH, y); ctx.stroke(); }

        // Bar interior context
        if (assetsLoaded.current) {
            // Draw bar roughly at top
            ctx.drawImage(assetBar.current, 0, 0, CANVAS_WIDTH, 120);
        } else {
            // Fallback bar drawing
            ctx.fillStyle = '#8e44ad';
            ctx.fillRect(0, 0, CANVAS_WIDTH, 120);
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.fillRect(0, 100, CANVAS_WIDTH, 20);
            ctx.fillStyle = '#fff'; ctx.font = '24px Arial'; ctx.fillText('INTERIOR', 20, 60);
        }

        // Draw entities ordered by Y to fake depth
        const drawables = [
            ...stovesRef.current.map(s => ({ ...s, type: 'stove' })),
            ...peopleRef.current.map(p => ({ ...p, type: 'person' }))
        ].sort((a, b) => a.y - b.y);

        drawables.forEach(d => {
            if (d.type === 'stove') drawStove(ctx, d, frame);
            if (d.type === 'person') drawPerson(ctx, d, frame);
        });

        // Draw dragged jacket
        if (draggingJacket.current) {
            ctx.save();
            ctx.translate(jacketPos.current.x, jacketPos.current.y);
            // Floating jacket icon
            ctx.fillStyle = '#1b4d3e';
            ctx.beginPath(); ctx.roundRect(-15, -20, 30, 40, 8); ctx.fill();
            ctx.strokeStyle = '#2ecc71'; ctx.lineWidth = 2;
            ctx.strokeRect(-15, -20, 30, 40);
            ctx.strokeStyle = '#7fffb2'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(-6, -5); ctx.lineTo(-2, 0); ctx.lineTo(8, -10); ctx.stroke();
            ctx.restore();
        }

        // Draw floating texts
        setFloatingTexts(prev => {
            const next = [];
            prev.forEach(ft => {
                ctx.fillStyle = `rgba(${ft.color === 'red' ? '231,76,60' : '46,204,113'}, ${ft.life / 60})`;
                ctx.font = 'bold 24px Arial';
                ctx.fillText(ft.text, ft.x, ft.y);
                ft.y -= 1.5;
                ft.life--;
                if (ft.life > 0) next.push(ft);
            });
            return next;
        });

        // Check Logic: IF an entire stove group has jackets, it turns off
        let activeStoves = 0;
        let activeCigs = 0;

        stovesRef.current.forEach(stove => {
            const stovePeople = peopleRef.current.filter(p => p.stoveId === stove.id && !p.hasJacket);
            const everyoneHasJacket = (stovePeople.length === 0);

            if (everyoneHasJacket && !stove.off) {
                // Turn off stove!
                stove.off = true;
                setFloatingTexts(prev => [...prev, { text: 'ESTUFA APAGADA!', x: stove.x - 60, y: stove.y - 120, life: 60, color: 'green' }]);
                // Trigger people entering bar
                peopleRef.current.forEach(p => {
                    if (p.stoveId === stove.id) p.entering = true;
                });
            }

            if (!stove.off) activeStoves++;
            activeCigs += stovePeople.length;
        });

        if (stoveCount !== activeStoves) setStoveCount(activeStoves);
        if (cigaretteCount !== activeCigs) setCigaretteCount(activeCigs);

        if (activeStoves === 0 && gameStateRef.current === 'playing') {
            gameStateRef.current = 'success';
            setGameState('success');
            setTimeout(() => {
                onComplete();
            }, 2500);
        }

        requestRef.current = requestAnimationFrame(animate);
    }, [stoveCount, cigaretteCount]);

    useEffect(() => {
        requestRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(requestRef.current);
    }, [animate]);

    // Input Handling
    const getCoords = (e) => {
        if (!canvasRef.current) return { x: 0, y: 0 };
        const rect = canvasRef.current.getBoundingClientRect();
        // Calculate true scale mapping (Mobile screens fit the canvas but CSS shrinks it)
        const scaleX = CANVAS_WIDTH / rect.width;
        const scaleY = CANVAS_HEIGHT / rect.height;
        
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        
        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    };

    const handleInputStart = (e) => {
        if (gameState !== 'playing') return;
        draggingJacket.current = true;
        jacketPos.current = getCoords(e);
    };

    const handleInputMove = (e) => {
        if (!draggingJacket.current) return;
        e.preventDefault(); // prevent scrolling while dragging on mobile
        jacketPos.current = getCoords(e);
    };

    const handleInputEnd = (e) => {
        if (!draggingJacket.current) return;
        draggingJacket.current = false;
        const endPos = jacketPos.current;

        // Check if dropped on a person needing a jacket
        const hitRadius = 40;
        let successfulDrop = false;

        for (let i = 0; i < peopleRef.current.length; i++) {
            const p = peopleRef.current[i];
            if (!p.hasJacket && !p.entering) {
                const dist = Math.hypot(p.x - endPos.x, p.y - endPos.y);
                if (dist < hitRadius) {
                    p.hasJacket = true;
                    successfulDrop = true;
                    // Provide positive feedback impact
                    onImpact?.(10);
                    // Add floating text
                    setFloatingTexts(prev => [...prev, { text: '+ Abric', x: p.x, y: p.y - 50, life: 60, color: 'green' }]);
                    break;
                }
            }
        }

        if (!successfulDrop) {
            setFloatingTexts(prev => [...prev, { text: 'Fallat', x: endPos.x, y: endPos.y, life: 30, color: 'red' }]);
        }
    };

    return ReactDOM.createPortal(
        <div className="minigame-overlay" style={{ touchAction: 'none' }}>
            <div className="minigame-card scale-up-center" style={{ width: '100vw', height: '100dvh', padding: 0, overflow: 'hidden', backgroundColor: '#2c3e50', borderRadius: 0 }}>
                {/* Header */}
                <div className="minigame-header" style={{ padding: '15px', background: '#e74c3c' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Wind color="white" size={24} />
                        <h3 style={{ margin: 0, color: 'white' }}>Sabotatge de Malbaratament</h3>
                    </div>
                    <button onClick={onClose} className="close-btn" style={{ background: 'white', color: '#e74c3c' }}><X size={20} /></button>
                </div>

                {/* HUD */}
                <div style={{ position: 'absolute', top: '70px', left: '20px', right: '20px', zIndex: 10, display: 'flex', justifyContent: 'space-between' }}>
                    <div style={{ background: 'rgba(0,0,0,0.6)', padding: '10px 15px', borderRadius: '8px', color: '#f39c12', fontWeight: 'bold' }}>
                        🔥 Estufes Inútils: {stoveCount}
                    </div>
                </div>

                <div style={{ position: 'relative', width: '100%', height: 'calc(100% - 60px)', background: '#34495e', cursor: draggingJacket.current ? 'grabbing' : 'grab' }}
                    onMouseDown={handleInputStart}
                    onMouseMove={handleInputMove}
                    onMouseUp={handleInputEnd}
                    onMouseLeave={handleInputEnd}
                    onTouchStart={handleInputStart}
                    onTouchMove={handleInputMove}
                    onTouchEnd={handleInputEnd}
                >
                    <canvas
                        ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT}
                        style={{ width: '100%', height: '100%', display: 'block' }}
                    />

                    {/* Instruction Layer if taking too long - Optional */}
                    {frameCount.current < 200 && gameState === 'playing' && (
                        <div style={{ position: 'absolute', bottom: '15%', left: '50%', transform: 'translate(-50%)', background: 'rgba(0,0,0,0.8)', padding: '15px', borderRadius: '12px', color: 'white', textAlign: 'center', pointerEvents: 'none', width: '80%' }}>
                            👇 <b>ARROSSEGA I DEIXA ANAR</b><br/>Llança abrics als clients perquè s'apaguin les estufes i entrin dins!
                        </div>
                    )}

                    {gameState === 'success' && (
                        <div className="success-overlay fade-in" style={{ backgroundColor: 'rgba(39, 174, 96, 0.9)', zIndex: 100 }}>
                            <CheckCircle size={80} color="white" />
                            <h2 style={{ color: 'white', fontSize: '2rem', textAlign: 'center', margin: '20px' }}>ESTUFES ELIMINADES!</h2>
                            <p style={{ color: 'white', fontSize: '1.1rem', textAlign: 'center' }}>S'han acabat els puros i l'energia llençada al carrer.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};

export default MobileHeatHazeSabotage;
