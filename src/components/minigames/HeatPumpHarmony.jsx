import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { Activity, Zap, CheckCircle, Disc, Thermometer, Wind, Gauge } from 'lucide-react';
import '../../App.css';

const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 540;
const REQUIRED_SCORE = 30;

const HeatPumpHarmony = ({ onComplete, onClose, onImpact }) => {
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
        speed: 4
    });

    const lanes = [
        { id: 0, name: 'FLUX', icon: <Wind size={20} />, key: 'A', x: CANVAS_WIDTH * 0.25 },
        { id: 1, name: 'PRESSIÓ', icon: <Gauge size={20} />, key: 'S', x: CANVAS_WIDTH * 0.5 },
        { id: 2, name: 'TEMP', icon: <Thermometer size={20} />, key: 'D', x: CANVAS_WIDTH * 0.75 }
    ];

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
            s.spawnInterval = Math.max(600, s.spawnInterval - 10);
            s.speed = Math.min(8, s.speed + 0.05);
        }

        // Move notes
        s.notes.forEach(n => {
            n.y += s.speed;
        });

        // Miss check
        s.notes = s.notes.filter(n => {
            if (n.y > CANVAS_HEIGHT - 30) {
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
        ctx.fillRect(0, CANVAS_HEIGHT - 80, CANVAS_WIDTH, 80);
        ctx.strokeStyle = 'rgba(56,189,248,0.15)';
        ctx.lineWidth = 1;
        for (let i = 0; i < CANVAS_WIDTH; i += 60) {
            ctx.beginPath(); ctx.moveTo(i, CANVAS_HEIGHT - 80); ctx.lineTo(i + 40, CANVAS_HEIGHT); ctx.stroke();
        }

        // Background pipes (horizontal)
        [[60, '#1e3a5f', 14], [120, '#162d4a', 10], [200, '#1e3a5f', 8]].forEach(([y, col, r]) => {
            ctx.fillStyle = col;
            ctx.fillRect(0, y - r / 2, CANVAS_WIDTH, r);
            ctx.fillStyle = 'rgba(56,189,248,0.12)';
            ctx.fillRect(0, y - r / 2, CANVAS_WIDTH, r / 3);
        });

        // MAIN HEAT PUMP UNIT (center)
        const ux = CANVAS_WIDTH / 2 - 90, uy = 140, uw = 180, uh = 280;
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

        // Fan grill circles
        ctx.strokeStyle = 'rgba(56,189,248,0.3)'; ctx.lineWidth = 1.5;
        for (let r = 15; r <= 55; r += 14) {
            ctx.beginPath(); ctx.arc(ux + uw / 2, uy + 80, r, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.beginPath(); ctx.arc(ux + uw / 2, uy + 80, 10, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(56,189,248,0.5)'; ctx.fill();

        // Status light (pulsing)
        const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 300);
        ctx.beginPath(); ctx.arc(ux + 20, uy + 20, 6, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(34,197,94,${0.6 + 0.4 * pulse})`;
        ctx.shadowBlur = 12 * pulse; ctx.shadowColor = '#22c55e';
        ctx.fill(); ctx.shadowBlur = 0;

        // Control panel on unit
        ctx.fillStyle = '#0f2240';
        ctx.fillRect(ux + 20, uy + 180, uw - 40, 70);
        ctx.strokeStyle = 'rgba(56,189,248,0.3)'; ctx.lineWidth = 1;
        ctx.strokeRect(ux + 20, uy + 180, uw - 40, 70);
        // Mini gauges on panel
        [[ux + 45, uy + 210, '#f59e0b'], [ux + 90, uy + 210, '#22c55e'], [ux + 135, uy + 210, '#38bdf8']].forEach(([gx, gy, col]) => {
            ctx.beginPath(); ctx.arc(gx, gy, 12, 0, Math.PI * 2);
            ctx.fillStyle = '#071020'; ctx.fill();
            ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.stroke();
            ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx + 8 * Math.cos(-0.5), gy + 8 * Math.sin(-0.5));
            ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.stroke();
        });

        // Pipes from unit to lanes
        lanes.forEach((lane, i) => {
            const pipeY = uy + 60 + i * 50;
            ctx.strokeStyle = i === 0 ? '#0ea5e9' : i === 1 ? '#f59e0b' : '#ef4444';
            ctx.lineWidth = 8;
            ctx.beginPath();
            ctx.moveTo(ux + (i < 2 ? 0 : uw), pipeY);
            ctx.bezierCurveTo(lane.x - 100, pipeY, lane.x - 50, CANVAS_HEIGHT - 200, lane.x, CANVAS_HEIGHT - 200);
            ctx.stroke();
            // Pipe glow
            ctx.strokeStyle = `rgba(${i === 0 ? '14,165,233' : i === 1 ? '245,158,11' : '239,68,68'},0.25)`;
            ctx.lineWidth = 16;
            ctx.stroke();
        });

        // Lane columns (subtle)
        lanes.forEach(lane => {
            ctx.fillStyle = 'rgba(255,255,255,0.04)';
            ctx.fillRect(lane.x - 55, 0, 110, CANVAS_HEIGHT);
            // Target zone
            ctx.strokeStyle = 'rgba(56,189,248,0.4)';
            ctx.lineWidth = 2;
            ctx.setLineDash([8, 6]);
            ctx.beginPath(); ctx.moveTo(lane.x - 55, CANVAS_HEIGHT - 100); ctx.lineTo(lane.x + 55, CANVAS_HEIGHT - 100); ctx.stroke();
            ctx.setLineDash([]);
            // Target circle
            ctx.strokeStyle = 'rgba(56,189,248,0.5)'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(lane.x, CANVAS_HEIGHT - 100, 38, 0, Math.PI * 2); ctx.stroke();
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
        const noteIdx = s.notes.findIndex(n => n.lane === laneId && Math.abs(n.y - (CANVAS_HEIGHT - 100)) < 60);

        if (noteIdx !== -1) {
            const note = s.notes[noteIdx];
            const dist = Math.abs(note.y - (CANVAS_HEIGHT - 100));
            const isPerfect = dist < 20;

            s.notes.splice(noteIdx, 1);
            s.score += isPerfect ? 2 : 1;
            setScore(s.score);
            setCombo(c => c + 1);
            setFeedback({ text: isPerfect ? 'PERFECT!' : 'GOOD!', color: isPerfect ? '#f1c40f' : '#2ecc71' });

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

    // Keyboard support
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key.toUpperCase() === 'A') handleHit(0);
            if (e.key.toUpperCase() === 'S') handleHit(1);
            if (e.key.toUpperCase() === 'D') handleHit(2);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    return ReactDOM.createPortal(
        <div className="minigame-overlay">
            <div className="minigame-card scale-up-center" style={{ width: 'min(900px, 95vw)', height: 'min(700px, 90vh)', padding: 0, overflow: 'hidden', backgroundColor: '#0f172a', border: '2px solid #f1c40f' }}>
                <div className="minigame-header" style={{ padding: '12px 24px', background: 'rgba(15, 23, 42, 0.9)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Activity color="#f1c40f" size={24} />
                        <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Harmonia Tèrmica: Sintonització del Pavelló</h3>
                    </div>
                    <button onClick={onClose} className="close-btn">×</button>
                </div>

                <div style={{ position: 'relative', width: '100%', height: 'calc(100% - 60px)', background: '#020617' }}>
                    <canvas
                        ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT}
                        style={{ width: '100%', height: '100%', display: 'block' }}
                    />

                    {/* HUD */}
                    <div style={{ position: 'absolute', top: 20, left: 20, color: '#f1c40f', fontSize: '1.2rem', fontWeight: 'bold' }}>
                        SINCRONITZACIÓ: {score}/{REQUIRED_SCORE}
                    </div>
                    <div style={{ position: 'absolute', top: 20, right: 20, color: '#fff', fontSize: '1.5rem', fontWeight: '900' }}>
                        x{combo}
                    </div>

                    {feedback && (
                        <div style={{ position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%, -50%)', color: feedback.color, fontSize: '3rem', fontWeight: '900', textShadow: '0 0 20px rgba(0,0,0,0.5)', animation: 'floatUp 0.5s forwards' }}>
                            {feedback.text}
                        </div>
                    )}

                    {/* Controls Display */}
                    <div style={{ position: 'absolute', bottom: '10%', left: 0, width: '100%', display: 'flex', justifyContent: 'center', gap: 'max(10%, 20px)' }}>
                        {lanes.map(lane => (
                            <div key={lane.id} onClick={() => handleHit(lane.id)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                <div style={{ width: 60, height: 60, borderRadius: '50%', border: '2px solid #f1c40f', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(241, 196, 15, 0.1)', color: '#f1c40f', transition: 'all 0.1s' }}>
                                    {lane.icon}
                                </div>
                                <div style={{ color: 'white', fontWeight: 'bold', fontSize: '1.2rem', background: 'rgba(255,255,255,0.1)', padding: '2px 10px', borderRadius: '4px' }}>{lane.key}</div>
                            </div>
                        ))}
                    </div>

                    {gameState === 'success' && (
                        <div className="success-overlay fade-in" style={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', opacity: 1, zIndex: 100 }}>
                            <CheckCircle size={100} color="#2ecc71" style={{ filter: 'drop-shadow(0 0 15px #2ecc71)' }} />
                            <h2 style={{ color: '#2ecc71', fontSize: '2.5rem' }}>EFICIÈNCIA TOTAL!</h2>
                            <p style={{ color: 'white', fontSize: '1.2rem' }}>La bomba de calor del pavelló està optimitzada.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};

export default HeatPumpHarmony;
