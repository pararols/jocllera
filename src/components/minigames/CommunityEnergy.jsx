import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom';
import { Users, AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import bgImage from '../../assets/community_bg.png';
import neighborImage from '../../assets/neighbors.png';
import trapImage from '../../assets/greenwashing_trap.png';

const CommunityEnergy = ({ onComplete, onClose, maxPower, rewardFactor, backgroundOverride }) => {
    const [timeLeft, setTimeLeft] = useState(60);
    const [currentPower, setCurrentPower] = useState(0);
    const [gameState, setGameState] = useState('playing'); // playing, success, failure
    const [entities, setEntities] = useState([]);
    const [floats, setFloats] = useState([]);

    const goal = maxPower * 0.5;
    const spawnTimerRef = useRef();

    const spawnEntity = useCallback(() => {
        const isTrap = Math.random() < 0.25; // 25% chance of trap
        const id = Date.now() + Math.random();
        const x = Math.random() * 80 + 10; // 10% to 90%
        const y = Math.random() * 60 + 20; // 20% to 80%
        const kw = isTrap ? 0 : [0.5, 1, 1.5, 2][Math.floor(Math.random() * 4)];

        const newEntity = { id, x, y, kw, isTrap, life: 3.0 }; // Lives for 3 seconds
        setEntities(prev => [...prev, newEntity]);
    }, []);

    useEffect(() => {
        if (gameState !== 'playing') return;

        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    setGameState('failure');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        spawnTimerRef.current = setInterval(spawnEntity, 1200);

        return () => {
            clearInterval(timer);
            clearInterval(spawnTimerRef.current);
        };
    }, [gameState, spawnEntity]);

    // Animation & Lifecycle for entities
    useEffect(() => {
        const anim = setInterval(() => {
            setEntities(prev => prev.map(e => ({ ...e, life: e.life - 0.1, y: e.y - 0.5 }))
                .filter(e => e.life > 0));
        }, 100);
        return () => clearInterval(anim);
    }, []);

    const handleEntityClick = (entity, e) => {
        if (gameState !== 'playing') return;
        e.stopPropagation();

        if (entity.isTrap) {
            setCurrentPower(prev => Math.max(0, prev - 2));
            setFloats(prev => [...prev, { id: Date.now(), x: entity.x, y: entity.y, text: '-2kW Greenwash!', type: 'trap' }]);
        } else {
            const nextPower = currentPower + entity.kw;
            setCurrentPower(nextPower);
            setFloats(prev => [...prev, { id: Date.now(), x: entity.x, y: entity.y, text: `+${entity.kw}kW`, type: 'gain' }]);

            if (nextPower >= goal) {
                setGameState('success');
                setTimeout(() => onComplete(rewardFactor), 2000);
            }
        }

        setEntities(prev => prev.filter(e => e.id !== entity.id));
        setTimeout(() => {
            setFloats(prev => prev.slice(1));
        }, 1000);
    };

    return ReactDOM.createPortal(
        <div className="minigame-overlay" style={{ zIndex: 10000 }}>
            <div className="minigame-card scale-up-center" style={{ width: '85%', height: '85%', maxWidth: '1000px', padding: 0, overflow: 'hidden', position: 'relative' }}>
                {/* Header */}
                <div className="minigame-header" style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, background: 'rgba(0,0,0,0.7)', padding: '10px 20px', color: 'white' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <Users color="#3498db" />
                        <h2 style={{ margin: 0, fontSize: '1.2rem' }}>Comunitat Energètica</h2>
                    </div>
                    <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <Clock size={20} />
                            <span style={{ fontWeight: 'bold' }}>{timeLeft}s</span>
                        </div>
                        <button onClick={onClose} className="close-btn" style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
                    </div>
                </div>

                {/* Game Area */}
                <div style={{
                    position: 'relative',
                    width: '100%',
                    height: '100%',
                    backgroundImage: `url(${backgroundOverride || bgImage})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    cursor: 'crosshair',
                    backgroundColor: '#2c3e50'
                }}>
                    {/* Progress Bar Container */}
                    <div style={{
                        position: 'absolute',
                        bottom: 40,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: '80%',
                        zIndex: 20,
                        textAlign: 'center'
                    }}>
                        <div style={{ marginBottom: '8px', color: 'white', fontWeight: 'bold', textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>
                            Suma de Veïns: {currentPower.toFixed(1)} / {goal.toFixed(1)} kW (Mínim 50%)
                        </div>
                        <div style={{
                            width: '100%',
                            height: '24px',
                            background: 'rgba(0,0,0,0.5)',
                            borderRadius: '12px',
                            overflow: 'hidden',
                            border: '2px solid rgba(255,255,255,0.3)'
                        }}>
                            <div style={{
                                width: `${Math.min(100, (currentPower / goal) * 100)}%`,
                                height: '100%',
                                background: 'linear-gradient(90deg, #3498db, #2ecc71)',
                                transition: 'width 0.3s ease',
                                boxShadow: '0 0 10px #2ecc71'
                            }}></div>
                        </div>
                    </div>

                    {/* Entities */}
                    {entities.map(e => (
                        <div
                            key={e.id}
                            onClick={(evt) => handleEntityClick(e, evt)}
                            style={{
                                position: 'absolute',
                                left: `${e.x}%`,
                                top: `${e.y}%`,
                                transform: 'translate(-50%, -50%)',
                                cursor: 'pointer',
                                transition: 'opacity 0.2s',
                                opacity: e.life < 0.5 ? e.life * 2 : 1,
                                zIndex: 15
                            }}
                        >
                            <div className="entity-bubble" style={{
                                width: '90px',
                                height: '90px',
                                background: e.isTrap ? 'rgba(231, 76, 60, 0.3)' : 'rgba(46, 204, 113, 0.3)',
                                borderRadius: '50%',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: `3px solid ${e.isTrap ? '#e74c3c' : '#2ecc71'}`,
                                gap: '2px',
                                boxShadow: `0 0 15px ${e.isTrap ? '#e74c3c' : '#2ecc71'}`,
                                backdropFilter: 'blur(2px)'
                            }}>
                                <img
                                    src={e.isTrap ? trapImage : neighborImage}
                                    style={{ width: '60px', height: '60px', objectFit: 'contain' }}
                                    alt="entity"
                                />
                                <span style={{ fontSize: '0.8rem', fontWeight: '900', color: 'white', textShadow: '1px 1px 2px black' }}>
                                    {e.isTrap ? '???' : `+${e.kw}kW`}
                                </span>
                            </div>
                        </div>
                    ))}

                    {/* Floating Feedback */}
                    {floats.map(f => (
                        <div key={f.id} style={{
                            position: 'absolute',
                            left: `${f.x}%`,
                            top: `${f.y}%`,
                            color: f.type === 'trap' ? '#ff4757' : '#2ed573',
                            fontWeight: 'bold',
                            fontSize: '1.8rem',
                            textShadow: '2px 2px 4px rgba(0,0,0,1)',
                            animation: 'floatUp 1s forwards',
                            pointerEvents: 'none',
                            zIndex: 100
                        }}>
                            {f.text}
                        </div>
                    ))}

                    {/* Success Overlay */}
                    {gameState === 'success' && (
                        <div className="success-overlay" style={{ background: 'rgba(39, 174, 96, 0.9)', zIndex: 1000, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '20px' }}>
                            <CheckCircle size={100} color="white" className="scale-up-center" />
                            <h2 style={{ fontSize: '3rem', color: 'white', margin: 0, textAlign: 'center' }}>SOBIRANIA ACONSEGUIDA!</h2>
                            <p style={{ fontSize: '1.5rem', color: 'white', margin: 0 }}>La comunitat ha reduït l'especulació.</p>
                        </div>
                    )}

                    {/* Failure Overlay */}
                    {gameState === 'failure' && (
                        <div className="failure-overlay" style={{ background: 'rgba(192, 57, 43, 0.9)', zIndex: 1000, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '20px' }}>
                            <AlertTriangle size={100} color="white" />
                            <h2 style={{ fontSize: '3rem', color: 'white', margin: 0 }}>DERROTA</h2>
                            <p style={{ fontSize: '1.5rem', color: 'white', margin: 0, textAlign: 'center' }}>El Greenwashing ha confós els veïns i veïnes.</p>
                            <button
                                onClick={() => { setGameState('playing'); setCurrentPower(0); setTimeLeft(60); setEntities([]); }}
                                style={{ padding: '12px 24px', fontSize: '1.2rem', fontWeight: 'bold', borderRadius: '8px', border: 'none', background: 'white', color: '#c0392b', cursor: 'pointer' }}
                            >
                                Reintenta la Resistència
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                @keyframes floatUp {
                    0% { transform: translateY(0); opacity: 1; }
                    100% { transform: translateY(-120px); opacity: 0; }
                }
                .entity-bubble {
                    animation: floatHorizontal 1.5s infinite alternate ease-in-out;
                }
                @keyframes floatHorizontal {
                    0% { transform: translate(-5px, 0); }
                    100% { transform: translate(5px, 0); }
                }
                .scale-up-center {
                    animation: scale-up-center 0.4s cubic-bezier(0.390, 0.575, 0.565, 1.000) both;
                }
                @keyframes scale-up-center {
                    0% { transform: scale(0.5); }
                    100% { transform: scale(1); }
                }
            `}</style>
        </div>,
        document.body
    );
};

export default CommunityEnergy;
