import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { Activity, Zap, CheckCircle } from 'lucide-react';
import '../../App.css';

const SliderBalance = ({ onComplete, onClose }) => {
    const [sliderValue, setSliderValue] = useState(50);
    const [targetValue, setTargetValue] = useState(50);
    const [score, setScore] = useState(0);
    const [isSuccess, setIsSuccess] = useState(false);
    const [glitch, setGlitch] = useState(false);

    // Refs for stable interval access
    const stateRef = useRef({ slider: 50, target: 50, score: 0 });

    // Initialize state on mount ONLY
    useEffect(() => {
        stateRef.current = { slider: 50, target: 50, score: 0 };
        setSliderValue(50);
        setTargetValue(50);
        setScore(0);
        setGlitch(false);
        setIsSuccess(false);
    }, []);

    const onCompleteRef = useRef(onComplete);

    // Keep the onComplete ref updated without triggering effects
    useEffect(() => {
        onCompleteRef.current = onComplete;
    }, [onComplete]);

    // Game Loop
    useEffect(() => {
        const interval = setInterval(() => {
            // Read target from ref
            let currentTarget = stateRef.current.target;
            const change = (Math.random() - 0.5) * 10;
            let nextTarget = currentTarget + change;
            if (nextTarget < 10) nextTarget = 10;
            if (nextTarget > 90) nextTarget = 90;

            stateRef.current.target = nextTarget;
            setTargetValue(nextTarget);

            // Check distance using refs
            const dist = Math.abs(stateRef.current.slider - nextTarget);
            let nextScore = stateRef.current.score;

            if (dist < 50) { // Green Zone width approx 50 (100px total width)
                nextScore = Math.min(nextScore + 2, 100);
                setGlitch(false);
            } else {
                nextScore = Math.max(nextScore - 5, 0);
                setGlitch(true);
            }

            stateRef.current.score = nextScore;
            setScore(nextScore);

            if (nextScore >= 100) {
                setIsSuccess(true);
                // clear interval so it stops updating
                clearInterval(interval);
                setTimeout(() => {
                    if (onCompleteRef.current) onCompleteRef.current();
                }, 1500);
            }

        }, 100);

        return () => clearInterval(interval);
    }, []);

    const handleSliderChange = (e) => {
        const val = parseInt(e.target.value);
        stateRef.current.slider = val;
        setSliderValue(val);
    };

    // Render Portal
    return ReactDOM.createPortal(
        <div className="minigame-overlay">
            <div className={`minigame-card scale-up-center ${glitch ? 'glitch-border' : ''}`}>
                <div className="minigame-header">
                    <h3>Sintonització (5-10kW)</h3>
                    <button onClick={onClose} className="close-btn">×</button>
                </div>

                <div className="minigame-content blue-print-bg" style={{ justifyContent: 'center', gap: '2rem' }}>

                    {isSuccess ? (
                        <div className="success-overlay" style={{ pointerEvents: 'auto', position: 'absolute', zIndex: 10 }}>
                            <CheckCircle size={64} color="#2ecc71" className="pulsing-node" />
                            <h2>ESTABILITZAT!</h2>
                        </div>
                    ) : (
                        <>
                            {/* Visualizer */}
                            <div style={{
                                width: '100%',
                                height: '150px',
                                background: '#000',
                                borderRadius: '8px',
                                position: 'relative',
                                overflow: 'hidden',
                                border: '1px solid #333'
                            }}>
                                {/* Target Zone Indicator */}
                                <div style={{
                                    position: 'absolute',
                                    left: `${targetValue}%`,
                                    top: 0,
                                    bottom: 0,
                                    width: '100px', /* Tolerance zone (100px width) */
                                    background: 'rgba(46, 204, 113, 0.3)',
                                    transform: 'translateX(-50%)',
                                    transition: 'left 0.1s linear',
                                    borderLeft: '1px dashed #2ecc71',
                                    borderRight: '1px dashed #2ecc71'
                                }}></div>

                                {/* Player Cursor Indicator */}
                                <div style={{
                                    position: 'absolute',
                                    left: `${sliderValue}%`,
                                    top: '20%',
                                    bottom: '20%',
                                    width: '4px',
                                    background: glitch ? '#e74c3c' : '#3498db',
                                    transform: 'translateX(-50%)',
                                    transition: 'left 0.05s linear',
                                    boxShadow: `0 0 10px ${glitch ? '#e74c3c' : '#3498db'}`
                                }}></div>

                                {/* Sine Wave Simulation (CSS trick or simplified) */}
                                <div style={{
                                    position: 'absolute',
                                    bottom: '10px',
                                    left: '10px',
                                    color: glitch ? '#e74c3c' : '#2ecc71',
                                    fontSize: '0.8rem',
                                    fontFamily: 'monospace'
                                }}>
                                    FREQ: {isSuccess ? 'STABLE' : (50 + (Math.random() * (glitch ? 10 : 1))).toFixed(2)} Hz
                                </div>
                            </div>

                            {/* Progress Bar */}
                            <div style={{ width: '100%', height: '10px', background: '#333', borderRadius: '5px' }}>
                                <div style={{
                                    width: `${score}%`,
                                    height: '100%',
                                    background: 'linear-gradient(90deg, #f1c40f, #2ecc71)',
                                    borderRadius: '5px',
                                    transition: 'width 0.1s linear'
                                }}></div>
                            </div>

                            {/* Controls */}
                            <div style={{ width: '100%', marginTop: '20px' }}>
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={sliderValue}
                                    onChange={handleSliderChange}
                                    style={{ width: '100%', accentColor: '#3498db', height: '30px' }}
                                />
                                <p style={{ color: '#aaa', textAlign: 'center', fontSize: '0.9rem', marginTop: '10px' }}>
                                    Mantingues la línia blava dins la zona verda
                                </p>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};

export default SliderBalance;
