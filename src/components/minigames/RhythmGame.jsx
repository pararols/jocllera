import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { Zap, CheckCircle, Disc } from 'lucide-react';
import '../../App.css';

const RhythmGame = ({ onComplete, onClose }) => {
    const [gameState, setGameState] = useState('waiting'); // waiting, playing, success, failure
    const [score, setScore] = useState(0);
    const [combo, setCombo] = useState(0);
    const [scale, setScale] = useState(2.0); // Ring scale starts large
    const [targetScale] = useState(1.0); // Target is 1.0
    const [feedback, setFeedback] = useState(null); // 'PERFECT!', 'MISS', etc.

    const requestRef = useRef();
    const startTimeRef = useRef();
    const speedRef = useRef(0.02); // Shrink speed (Restored)

    // Game Constants
    const REQUIRED_HITS = 5;
    const TOLERANCE = 0.15; // Accepted error margin

    // Loop
    const animate = useCallback((time) => {
        if (!startTimeRef.current) startTimeRef.current = time;

        // Update Scale
        setScale(prev => {
            let next = prev - speedRef.current;

            // Loop / Miss Condition
            if (next < 0.5) {
                // Missed the beat (too late)
                handleMiss();
                return 2.0; // Reset
            }
            return next;
        });

        requestRef.current = requestAnimationFrame(animate);
    }, []);

    // Start Game
    useEffect(() => {
        setGameState('playing');
        requestRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(requestRef.current);
    }, [animate]);

    const handleMiss = () => {
        setCombo(0);
        setFeedback({ text: 'MISS', color: '#e74c3c' });
        setTimeout(() => setFeedback(null), 500);
        // Maybe penalty?
    };

    const handleHit = () => {
        const diff = Math.abs(scale - targetScale);

        if (diff < TOLERANCE) {
            // HIT!
            const isPerfect = diff < 0.05;
            const points = isPerfect ? 2 : 1;
            const newScore = score + points;

            setScore(newScore);
            setCombo(c => c + 1);
            setFeedback({
                text: isPerfect ? 'PERFECT!' : 'GOOD!',
                color: isPerfect ? '#f1c40f' : '#2ecc71'
            });

            // Speed up slightly
            speedRef.current += 0.002;

            // Reset Ring
            setScale(2.0);

            // Win Condition
            if (newScore >= REQUIRED_HITS) {
                cancelAnimationFrame(requestRef.current);
                setGameState('success');
                setTimeout(onComplete, 1500);
            }
        } else {
            // Clicked too early or too late (but mostly early if scale > 0.5)
            handleMiss();
        }

        setTimeout(() => setFeedback(null), 500);
    };

    return ReactDOM.createPortal(
        <div className="minigame-overlay">
            <div className="minigame-card scale-up-center" style={{ border: gameState === 'success' ? '2px solid #2ecc71' : '1px solid rgba(255,255,255,0.1)' }}>
                <div className="minigame-header">
                    <h3>Protocol de Xarxa {'>'}10kW</h3>
                    <button onClick={onClose} className="close-btn">×</button>
                </div>

                <div className="minigame-content blue-print-bg"
                    onClick={handleHit}
                    style={{
                        cursor: 'pointer',
                        justifyContent: 'center',
                        alignItems: 'center',
                        position: 'relative',
                        overflow: 'hidden'
                    }}
                >
                    {gameState === 'success' ? (
                        <div className="success-overlay" style={{ pointerEvents: 'none' }}>
                            <CheckCircle size={64} color="#2ecc71" className="pulsing-node" />
                            <h2>CARREGAT!</h2>
                        </div>
                    ) : (
                        <>
                            {/* Score & Combo */}
                            <div style={{ position: 'absolute', top: 20, left: 20, color: '#bdc3c7', fontSize: '0.9rem' }}>
                                CÀRREGA: {score}/{REQUIRED_HITS}
                            </div>
                            <div style={{ position: 'absolute', top: 20, right: 20, color: '#f1c40f', fontSize: '1.2rem', fontWeight: 'bold' }}>
                                x{combo}
                            </div>

                            {/* Feedback Text */}
                            {feedback && (
                                <div style={{
                                    position: 'absolute',
                                    top: '20%',
                                    left: '50%',
                                    transform: 'translate(-50%, -50%)',
                                    color: feedback.color,
                                    fontSize: '2rem',
                                    fontWeight: '900',
                                    textShadow: '0 0 10px rgba(0,0,0,0.5)',
                                    animation: 'floatUp 0.5s forwards'
                                }}>
                                    {feedback.text}
                                </div>
                            )}

                            {/* Target Circle */}
                            <div style={{
                                width: '100px',
                                height: '100px',
                                borderRadius: '50%',
                                border: '4px solid rgba(255,255,255,0.3)',
                                position: 'absolute',
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                boxShadow: '0 0 20px rgba(52, 152, 219, 0.2)'
                            }}>
                                <Zap size={40} color="#3498db" />
                            </div>

                            {/* Shrinking Ring */}
                            <div style={{
                                width: '100px',
                                height: '100px',
                                borderRadius: '50%',
                                border: '4px solid #f1c40f',
                                position: 'absolute',
                                transform: `scale(${scale})`,
                                opacity: scale < 0.5 ? 0 : 1,
                                boxShadow: '0 0 15px #f1c40f',
                                pointerEvents: 'none' // Click passes through to container
                            }}></div>

                            <p className="minigame-instruction" style={{ bottom: '10%', position: 'absolute' }}>
                                Clica quan els cercles coincideixin!
                            </p>
                        </>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};

export default RhythmGame;
