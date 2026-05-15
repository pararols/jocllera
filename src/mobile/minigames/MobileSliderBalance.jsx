import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { Activity, Zap, CheckCircle, X } from 'lucide-react';
import '../../App.css';

const MobileSliderBalance = ({ onComplete, onClose }) => {
    const [sliderValue, setSliderValue] = useState(50);
    const [targetValue, setTargetValue] = useState(50);
    const [score, setScore] = useState(0);
    const [isSuccess, setIsSuccess] = useState(false);
    const [glitch, setGlitch] = useState(false);

    const stateRef = useRef({ slider: 50, target: 50, score: 0 });
    const onCompleteRef = useRef(onComplete);

    useEffect(() => {
        onCompleteRef.current = onComplete;
    }, [onComplete]);

    useEffect(() => {
        const interval = setInterval(() => {
            let currentTarget = stateRef.current.target;
            const change = (Math.random() - 0.5) * 12;
            let nextTarget = Math.max(15, Math.min(85, currentTarget + change));

            stateRef.current.target = nextTarget;
            setTargetValue(nextTarget);

            const dist = Math.abs(stateRef.current.slider - nextTarget);
            let nextScore = stateRef.current.score;

            if (dist < 12) { // Tighter tolerance on mobile but bigger visual
                nextScore = Math.min(nextScore + 3, 100);
                setGlitch(false);
            } else {
                nextScore = Math.max(nextScore - 6, 0);
                setGlitch(true);
            }

            stateRef.current.score = nextScore;
            setScore(nextScore);

            if (nextScore >= 100) {
                setIsSuccess(true);
                clearInterval(interval);
                setTimeout(() => {
                    if (onCompleteRef.current) onCompleteRef.current();
                }, 1500);
            }
        }, 80);

        return () => clearInterval(interval);
    }, []);

    const handleInput = (e) => {
        const val = parseInt(e.target.value);
        stateRef.current.slider = val;
        setSliderValue(val);
    };

    return ReactDOM.createPortal(
        <div className="minigame-overlay">
            <div className={`minigame-card scale-up-center ${glitch ? 'glitch-border' : ''}`} style={{ width: '100vw', height: '100dvh', padding: 0, borderRadius: 0, background: '#0f172a' }}>
                <div className="minigame-header" style={{ padding: '20px', background: '#3498db' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Zap color="white" size={24} />
                        <h3 style={{ margin: 0, color: 'white' }}>Sintonització Elèctrica</h3>
                    </div>
                    <button onClick={onClose} className="close-btn" style={{ background: 'white' }}><X size={20} /></button>
                </div>

                <div style={{ padding: '30px 20px', height: 'calc(100% - 75px)', display: 'flex', flexDirection: 'column', gap: '40px' }}>
                    
                    {/* Visualizer - VERTICAL OSCILLOGRAM */}
                    <div style={{
                        flex: 1,
                        width: '100%',
                        background: '#000',
                        borderRadius: '16px',
                        position: 'relative',
                        overflow: 'hidden',
                        border: '2px solid #1e293b',
                        boxShadow: 'inset 0 0 40px rgba(0,0,0,1)'
                    }}>
                        {/* Target Zone - Horizontal Band */}
                        <div style={{
                            position: 'absolute',
                            left: 0,
                            right: 0,
                            top: `${targetValue}%`,
                            height: '24%', 
                            background: 'rgba(46, 204, 113, 0.2)',
                            transform: 'translateY(-50%)',
                            transition: 'top 0.1s linear',
                            borderTop: '2px dashed #2ecc71',
                            borderBottom: '2px dashed #2ecc71',
                            zIndex: 1
                        }}></div>

                        {/* Player Line - Horizontal Line moving vertically */}
                        <div style={{
                            position: 'absolute',
                            left: 0,
                            right: 0,
                            top: `${sliderValue}%`,
                            height: '4px',
                            background: glitch ? '#ef4444' : '#3498db',
                            transform: 'translateY(-50%)',
                            transition: 'top 0.05s linear',
                            boxShadow: `0 0 20px ${glitch ? '#ef4444' : '#3498db'}`,
                            zIndex: 2
                        }}></div>

                        {/* Background Grid */}
                        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
                        
                        <div style={{ position: 'absolute', bottom: 20, left: 20, color: glitch ? '#ef4444' : '#2ecc71', fontFamily: 'monospace', fontSize: '1rem' }}>
                            SIGNAL: {glitch ? 'UNSTABLE' : 'LOCKED'}
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div style={{ width: '100%', height: '20px', background: '#1e293b', borderRadius: '10px', padding: '3px' }}>
                        <div style={{
                            width: `${score}%`,
                            height: '100%',
                            background: 'linear-gradient(90deg, #3498db, #2ecc71)',
                            borderRadius: '8px',
                            transition: 'width 0.1s linear'
                        }}></div>
                    </div>

                    {/* Controls - VERTICAL TYPE SLIDER */}
                    <div style={{ height: '30%', minHeight: '150px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ position: 'relative', width: '80%', height: '60px' }}>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={sliderValue}
                                onChange={handleInput}
                                style={{ 
                                    width: '100%', 
                                    accentColor: '#3498db', 
                                    height: '50px',
                                    transform: 'rotate(0deg)' // keeping it horizontal for easier thumb usage on bottom
                                }}
                            />
                        </div>
                        <p style={{ color: '#94a3b8', textAlign: 'center', fontSize: '1rem', marginTop: '20px' }}>
                            <b>LLISCA EL DIT</b><br/>Mantingues la línia blava dins la zona de sintonització verda.
                        </p>
                    </div>

                    {isSuccess && (
                        <div className="success-overlay fade-in" style={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', zIndex: 100 }}>
                            <CheckCircle size={100} color="#22c55e" />
                            <h2 style={{ color: '#22c55e', fontSize: '2.5rem' }}>FREQUÈNCIA FIXADA!</h2>
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};

export default MobileSliderBalance;
