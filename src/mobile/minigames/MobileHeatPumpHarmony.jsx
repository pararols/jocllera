import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { Activity, Zap, CheckCircle, Disc, Thermometer, Wind, Gauge } from 'lucide-react';
import '../../App.css';

// VERTICAL MOBILE CANVAS
const CANVAS_WIDTH = 540;
const CANVAS_HEIGHT = 960;
const REQUIRED_SCORE = 30;

const MobileHeatPumpHarmony = ({ onComplete, onClose, onImpact }) => {
    const [gameState, setGameState] = useState('playing'); // playing, success, failure
    const [score, setScore] = useState(0);
    const [combo, setCombo] = useState(0);
    const [feedback, setFeedback] = useState(null);

    const canvasRef = useRef(null);
    const requestRef = useRef();
    const stateRef = useRef({
        notes: [],
        lastSpawn: 0,
        spawnInterval: 1200,
        score: 0,
        speed: 5
    });

    // Spread lanes evenly across the vertical width
    const lanes = [
        { id: 0, name: 'FLUX', icon: <Wind size={20} />, key: '1', x: CANVAS_WIDTH * 0.2 },
        { id: 1, name: 'PRESSIÓ', icon: <Gauge size={20} />, key: '2', x: CANVAS_WIDTH * 5 },
        { id: 2, name: 'TEMP', icon: <Thermometer size={20} />, key: '3', x: CANVAS_WIDTH * 0.8 }
    ];

    // Wait, let's fix the lanes, 0.2, 0.5, 0.8:
    lanes[1].x = CANVAS_WIDTH * 0.5;

    const animate = useCallback((time) => {
        if (!canvasRef.current || gameState !== 'playing') return;
        const ctx = canvasRef.current.getContext('2d');
        const s = stateRef.current;

        // 1. Logic
        // Spawn notes
        if (time - s.lastSpawn > s.spawnInterval) {
            const lane = Math.floor(Math.random() * 3);
            s.notes.push({
                lane,
                y: -50,
                id: Date.now()
            });
            s.lastSpawn = time;
            s.spawnInterval = Math.max(700, s.spawnInterval - 10);
            s.speed = Math.min(10, s.speed + 0.05); // Faster on mobile due to long screen
        }

        // Move notes
        s.notes.forEach(n => {
            n.y += s.speed;
        });

        // Miss check (HIT ZONE is around CANVAS_HEIGHT - 180 on mobile to leave room for HUD)
        const HIT_Y = CANVAS_HEIGHT - 220;
        
        s.notes = s.notes.filter(n => {
            if (n.y > HIT_Y + 80) {
                setFeedback({ text: 'MISS!', color: '#e74c3c' });
                setCombo(0);
                setTimeout(() => setFeedback(null), 500);
                return false;
            }
            return true;
        });

        // 2. Render
        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // --- BACKGROUND: Machine Room ---
        // Walls: dark gradient
        const wallGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
        wallGrad.addColorStop(0, '#0c1a2e');
        wallGrad.addColorStop(1, '#071020');
        ctx.fillStyle = wallGrad;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Floor
        ctx.fillStyle = '#0a1520';
        ctx.fillRect(0, HIT_Y + 20, CANVAS_WIDTH, CANVAS_HEIGHT - (HIT_Y + 20));
        ctx.strokeStyle = 'rgba(56,189,248,0.15)';
        ctx.lineWidth = 1;
        for (let i = 0; i < CANVAS_WIDTH; i += 60) {
            ctx.beginPath(); ctx.moveTo(i, HIT_Y + 20); ctx.lineTo(i + 40, CANVAS_HEIGHT); ctx.stroke();
        }

        // MAIN HEAT PUMP UNIT (top center)
        const uw = 300, uh = 200;
        const ux = (CANVAS_WIDTH - uw) / 2, uy = 80;
        
        // Body
        const unitGrad = ctx.createLinearGradient(ux, 0, ux + uw, 0);
        unitGrad.addColorStop(0, '#1a3a5c');
        unitGrad.addColorStop(0.5, '#23527c');
        unitGrad.addColorStop(1, '#1a3a5c');
        ctx.fillStyle = unitGrad;
        ctx.beginPath();
        ctx.roundRect(ux, uy, uw, uh, 12);
        ctx.fill();
        ctx.strokeStyle = 'rgba(56,189,248,0.6)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Fan grill circles (side by side inside unit)
        ctx.strokeStyle = 'rgba(56,189,248,0.3)'; ctx.lineWidth = 1.5;
        for(let offset of [-60, 60]){
            for (let r = 15; r <= 55; r += 14) {
                ctx.beginPath(); ctx.arc(ux + uw / 2 + offset, uy + 100, r, 0, Math.PI * 2); ctx.stroke();
            }
            ctx.beginPath(); ctx.arc(ux + uw / 2 + offset, uy + 100, 10, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(56,189,248,0.5)'; ctx.fill();
        }

        // Status light (pulsing)
        const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 300);
        ctx.beginPath(); ctx.arc(ux + 20, uy + 20, 6, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(34,197,94,${0.6 + 0.4 * pulse})`;
        ctx.shadowBlur = 12 * pulse; ctx.shadowColor = '#22c55e';
        ctx.fill(); ctx.shadowBlur = 0;

        // Pipes dropping DOWN from unit to lanes
        lanes.forEach((lane, i) => {
            const pipeX = ux + 50 + (i * 100);
            ctx.strokeStyle = i === 0 ? '#0ea5e9' : i === 1 ? '#f59e0b' : '#ef4444';
            ctx.lineWidth = 8;
            ctx.beginPath();
            ctx.moveTo(pipeX, uy + uh);
            ctx.bezierCurveTo(pipeX, uy + uh + 100, lane.x, uy + uh + 150, lane.x, HIT_Y - 50);
            ctx.stroke();
            // Pipe glow
            ctx.strokeStyle = `rgba(${i === 0 ? '14,165,233' : i === 1 ? '245,158,11' : '239,68,68'},0.25)`;
            ctx.lineWidth = 16;
            ctx.stroke();
        });

        // Lane columns (subtle)
        lanes.forEach(lane => {
            ctx.fillStyle = 'rgba(255,255,255,0.04)';
            ctx.fillRect(lane.x - 45, 0, 90, CANVAS_HEIGHT);
            // Target zone
            ctx.strokeStyle = 'rgba(56,189,248,0.4)';
            ctx.lineWidth = 2;
            ctx.setLineDash([8, 6]);
            ctx.beginPath(); ctx.moveTo(lane.x - 45, HIT_Y); ctx.lineTo(lane.x + 45, HIT_Y); ctx.stroke();
            ctx.setLineDash([]);
            // Target circle
            ctx.strokeStyle = 'rgba(56,189,248,0.7)'; ctx.lineWidth = 4;
            ctx.beginPath(); ctx.arc(lane.x, HIT_Y, 40, 0, Math.PI * 2); ctx.stroke();
            ctx.fillStyle = 'rgba(56,189,248,0.1)'; ctx.fill();
        });

        // Notes
        s.notes.forEach(n => {
            const lx = lanes[n.lane].x;
            const col = n.lane === 0 ? '#38bdf8' : n.lane === 1 ? '#f59e0b' : '#ef4444';
            // Pulse trail
            const trailGrad = ctx.createRadialGradient(lx, n.y, 2, lx, n.y, 36);
            trailGrad.addColorStop(0, col);
            trailGrad.addColorStop(0.6, col.replace(')', ',0.4)').replace('rgb', 'rgba'));
            trailGrad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = trailGrad;
            ctx.beginPath(); ctx.arc(lx, n.y, 36, 0, Math.PI * 2); ctx.fill();
            // Core
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(lx, n.y, 10, 0, Math.PI * 2); ctx.fill();
        });

        requestRef.current = requestAnimationFrame(animate);
    }, [gameState]);

    useEffect(() => {
        requestRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(requestRef.current);
    }, [animate]);

    const handleHit = (laneId) => {
        const s = stateRef.current;
        const HIT_Y = CANVAS_HEIGHT - 220;
        // Find notes near the hit line
        const noteIdx = s.notes.findIndex(n => n.lane === laneId && Math.abs(n.y - HIT_Y) < 80);

        if (noteIdx !== -1) {
            const note = s.notes[noteIdx];
            const dist = Math.abs(note.y - HIT_Y);
            const isPerfect = dist < 25;

            s.notes.splice(noteIdx, 1);
            s.score += isPerfect ? 2 : 1;
            setScore(s.score);
            setCombo(c => c + 1);
            setFeedback({ text: isPerfect ? 'PERFECT!' : 'BÉ!', color: isPerfect ? '#f1c40f' : '#2ecc71' });

            if (s.score >= REQUIRED_SCORE) {
                setGameState('success');
                onImpact?.(1500);
                setTimeout(onComplete, 2000);
            }
        } else {
            setFeedback({ text: 'MISS!', color: '#e74c3c' });
            setCombo(0);
        }
        setTimeout(() => setFeedback(null), 500);
    };

    return ReactDOM.createPortal(
        <div className="minigame-overlay" style={{ touchAction: 'none' }}>
            <div className="minigame-card scale-up-center" style={{ width: '100vw', height: '100dvh', padding: 0, overflow: 'hidden', backgroundColor: '#0f172a', border: 'none', borderRadius: 0 }}>
                {/* Header */}
                <div className="minigame-header" style={{ padding: '15px', background: 'rgba(15, 23, 42, 0.9)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Activity color="#f1c40f" size={24} />
                        <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'white' }}>Harmonia Tèrmica</h3>
                    </div>
                    <button onClick={onClose} className="close-btn" style={{ background: 'white' }}>×</button>
                </div>

                <div style={{ position: 'relative', width: '100%', height: 'calc(100% - 60px)', background: '#020617' }}>
                    <canvas
                        ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT}
                        style={{ width: '100%', height: '100%', display: 'block' }}
                    />

                    {/* HUD */}
                    <div style={{ position: 'absolute', top: 15, left: 15, color: '#f1c40f', fontSize: '1.2rem', fontWeight: 'bold', background: 'rgba(0,0,0,0.5)', padding: '5px 10px', borderRadius: '8px' }}>
                        {score}/{REQUIRED_SCORE}
                    </div>
                    <div style={{ position: 'absolute', top: 15, right: 15, color: '#fff', fontSize: '1.5rem', fontWeight: '900', background: 'rgba(0,0,0,0.5)', padding: '5px 10px', borderRadius: '8px'  }}>
                        x{combo}
                    </div>

                    {feedback && (
                        <div style={{ position: 'absolute', top: '35%', left: '50%', transform: 'translate(-50%, -50%)', color: feedback.color, fontSize: '3.5rem', fontWeight: '900', textShadow: '0 0 20px rgba(0,0,0,0.8)', animation: 'floatUp 0.5s forwards', zIndex: 50 }}>
                            {feedback.text}
                        </div>
                    )}

                    {/* Touch Hit Buttons (Aligned with CANVAS_HEIGHT - 220, CSS bottom: 12% is approx right for 100dvh) */}
                    <div style={{ position: 'absolute', bottom: '8%', left: 0, width: '100%', display: 'flex', justifyContent: 'space-around', alignItems: 'flex-end', padding: '0 10px' }}>
                        {lanes.map((lane, i) => (
                            <div 
                                key={lane.id} 
                                onTouchStart={(e) => { e.preventDefault(); handleHit(lane.id); }} 
                                onMouseDown={(e) => { e.preventDefault(); handleHit(lane.id);}}
                                style={{ 
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', cursor: 'pointer',
                                    width: '30%', padding: '15px 0', background: 'rgba(255,255,255,0.05)', borderRadius: '16px', border: i === 0 ? '2px solid #0ea5e9' : i === 1 ? '2px solid #f59e0b' : '2px solid #ef4444'
                                }}
                            >
                                <div style={{ color: i === 0 ? '#0ea5e9' : i === 1 ? '#f59e0b' : '#ef4444' }}>
                                    {lane.icon}
                                </div>
                                <div style={{ color: 'white', fontWeight: 'bold', fontSize: '1rem', textAlign: 'center' }}>
                                    {lane.name}
                                </div>
                            </div>
                        ))}
                    </div>

                    {gameState === 'success' && (
                        <div className="success-overlay fade-in" style={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', opacity: 1, zIndex: 100 }}>
                            <CheckCircle size={100} color="#2ecc71" style={{ filter: 'drop-shadow(0 0 15px #2ecc71)' }} />
                            <h2 style={{ color: '#2ecc71', fontSize: '2.5rem', textAlign: 'center' }}>EFICIÈNCIA TOTAL!</h2>
                            <p style={{ color: 'white', fontSize: '1.2rem', textAlign: 'center' }}>Bomba de calor optimitzada.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};

export default MobileHeatPumpHarmony;
