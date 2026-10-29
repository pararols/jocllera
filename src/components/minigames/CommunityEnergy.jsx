import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom';
import { Users, AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import SoundManager from '../../logic/SoundManager';

const defaultBgImage = '/assets/community_bg.png';

// 5 Original Types of Allies (Sumen kW)
const ALLY_TYPES = [
    {
        id: 'iaia_conxita',
        name: 'Iaia Conxita',
        role: 'Teixidora de Xarxa',
        icon: '👵',
        badge: '🧶⚡',
        kw: 1.5,
        phrase: 'El sol és de tothom!',
        color: '#10b981',
        bg: 'linear-gradient(135deg, rgba(16, 185, 129, 0.4), rgba(5, 150, 105, 0.7))',
        border: '#10b981'
    },
    {
        id: 'pagesa_maria',
        name: 'Pagesa de la Llera',
        role: 'Hort Agrovoltaic',
        icon: '👩‍🌾',
        badge: '🍅☀️',
        kw: 2.0,
        phrase: 'Terra viva i energia neta!',
        color: '#22c55e',
        bg: 'linear-gradient(135deg, rgba(34, 197, 94, 0.4), rgba(21, 128, 61, 0.7))',
        border: '#22c55e'
    },
    {
        id: 'enginyer_ateneu',
        name: 'Enginyer Popular',
        role: 'Bateries Obertes',
        icon: '🧑‍🔧',
        badge: '🔋⚡',
        kw: 1.2,
        phrase: 'Tecnologia lliure i comunitària!',
        color: '#06b6d4',
        bg: 'linear-gradient(135deg, rgba(6, 182, 212, 0.4), rgba(14, 116, 144, 0.7))',
        border: '#06b6d4'
    },
    {
        id: 'forn_proximitat',
        name: 'Forner del Poble',
        role: 'Forn Solar Km 0',
        icon: '🧑‍🍳',
        badge: '🥖☀️',
        kw: 1.8,
        phrase: 'Pa artesà cuit amb sol!',
        color: '#f59e0b',
        bg: 'linear-gradient(135deg, rgba(245, 158, 11, 0.4), rgba(180, 83, 9, 0.7))',
        border: '#f59e0b'
    },
    {
        id: 'familia_futur',
        name: 'Futur Comunitari',
        role: 'Infants per la Llera',
        icon: '👧',
        badge: '🪁🌱',
        kw: 2.5,
        phrase: 'Sense fums ni especulació!',
        color: '#a855f7',
        bg: 'linear-gradient(135deg, rgba(168, 85, 247, 0.4), rgba(126, 34, 206, 0.7))',
        border: '#a855f7'
    }
];

// 5 Original Types of Greenwashing Traps (Resten kW)
const TRAP_TYPES = [
    {
        id: 'broker_voltor',
        name: 'Broker Fons Voltor',
        role: 'Especulador "Verd"',
        icon: '🤵',
        badge: '💼☣️',
        penalty: 2.0,
        phrase: 'Macroparc buit d\'inversors!',
        color: '#ef4444',
        bg: 'linear-gradient(135deg, rgba(239, 68, 68, 0.45), rgba(185, 28, 28, 0.75))',
        border: '#ef4444'
    },
    {
        id: 'macro_excavadora',
        name: 'Macro-Bulldozer',
        role: 'Arrasant Oliveres',
        icon: '🚜',
        badge: '🪓⚠️',
        penalty: 2.5,
        phrase: 'Camps centenaris trinxats!',
        color: '#dc2626',
        bg: 'linear-gradient(135deg, rgba(220, 38, 38, 0.45), rgba(153, 27, 27, 0.75))',
        border: '#dc2626'
    },
    {
        id: 'llop_comercial',
        name: 'Llop de l\'Oligopoli',
        role: 'Tarifa Camuflada',
        icon: '🐺',
        badge: '🌼⚡',
        penalty: 2.0,
        phrase: 'Factura trampa amb flor!',
        color: '#ea580c',
        bg: 'linear-gradient(135deg, rgba(234, 88, 12, 0.45), rgba(194, 65, 12, 0.75))',
        border: '#ea580c'
    },
    {
        id: 'certificat_fals',
        name: 'Certificat "Eco-Bluf"',
        role: 'Paper Mullat',
        icon: '📜',
        badge: '💨❌',
        penalty: 1.5,
        phrase: 'Fum i compensació fictícia!',
        color: '#b91c1c',
        bg: 'linear-gradient(135deg, rgba(185, 28, 28, 0.45), rgba(127, 29, 29, 0.75))',
        border: '#b91c1c'
    },
    {
        id: 'lletra_petita',
        name: 'Lletra Petita Oculta',
        role: 'Hipoteca 30 Anys',
        icon: '🔍',
        badge: '⛓️📑',
        penalty: 2.2,
        phrase: 'Expropiació dels excedents!',
        color: '#991b1b',
        bg: 'linear-gradient(135deg, rgba(153, 27, 27, 0.45), rgba(69, 10, 10, 0.75))',
        border: '#991b1b'
    }
];

const CommunityEnergy = ({ onComplete, onClose, maxPower, rewardFactor, backgroundOverride }) => {
    const [timeLeft, setTimeLeft] = useState(60);
    const [currentPower, setCurrentPower] = useState(0);
    const [gameState, setGameState] = useState('playing'); // playing, success, failure
    const [entities, setEntities] = useState([]);
    const [floats, setFloats] = useState([]);

    const goal = maxPower * 0.5;
    const spawnTimerRef = useRef();

    const spawnEntity = useCallback(() => {
        const isTrap = Math.random() < 0.28; // 28% de probabilitat de parany
        const template = isTrap
            ? TRAP_TYPES[Math.floor(Math.random() * TRAP_TYPES.length)]
            : ALLY_TYPES[Math.floor(Math.random() * ALLY_TYPES.length)];

        const id = Date.now() + Math.random();
        const x = Math.random() * 76 + 12; // 12% to 88%
        const y = Math.random() * 55 + 22; // 22% to 77%

        const newEntity = {
            id,
            x,
            y,
            isTrap,
            template,
            kw: isTrap ? 0 : template.kw,
            penalty: isTrap ? template.penalty : 0,
            life: 3.2
        };
        setEntities(prev => [...prev, newEntity]);
    }, []);

    useEffect(() => {
        if (gameState !== 'playing') return;

        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    setGameState('failure');
                    SoundManager.playSFX('defeat');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        spawnTimerRef.current = setInterval(spawnEntity, 1100);

        return () => {
            clearInterval(timer);
            clearInterval(spawnTimerRef.current);
        };
    }, [gameState, spawnEntity]);

    // Animation & Lifecycle for entities
    useEffect(() => {
        const anim = setInterval(() => {
            setEntities(prev => prev.map(e => ({ ...e, life: e.life - 0.1, y: e.y - 0.4 }))
                .filter(e => e.life > 0));
        }, 100);
        return () => clearInterval(anim);
    }, []);

    const handleEntityClick = (entity, e) => {
        if (gameState !== 'playing') return;
        e.stopPropagation();

        if (entity.isTrap) {
            SoundManager.playSFX('warning');
            const penalty = entity.penalty;
            setCurrentPower(prev => Math.max(0, prev - penalty));
            setFloats(prev => [...prev, {
                id: Date.now() + Math.random(),
                x: entity.x,
                y: entity.y,
                text: `-${penalty.toFixed(1)}kW ${entity.template.name}! "${entity.template.phrase}"`,
                type: 'trap'
            }]);
        } else {
            SoundManager.playSFX('click');
            const nextPower = currentPower + entity.kw;
            setCurrentPower(nextPower);
            setFloats(prev => [...prev, {
                id: Date.now() + Math.random(),
                x: entity.x,
                y: entity.y,
                text: `+${entity.kw.toFixed(1)}kW ${entity.template.name}! "${entity.template.phrase}"`,
                type: 'gain'
            }]);

            if (nextPower >= goal) {
                setGameState('success');
                SoundManager.playSFX('victory');
                setTimeout(() => onComplete(rewardFactor), 2000);
            }
        }

        setEntities(prev => prev.filter(e => e.id !== entity.id));
        setTimeout(() => {
            setFloats(prev => prev.slice(1));
        }, 1400);
    };

    return ReactDOM.createPortal(
        <div className="minigame-overlay" style={{ zIndex: 10000 }}>
            <div className="minigame-card scale-up-center" style={{ width: '88%', height: '88%', maxWidth: '1050px', padding: 0, overflow: 'hidden', position: 'relative', borderRadius: '16px' }}>
                {/* Header */}
                <div className="minigame-header" style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(8px)', padding: '12px 24px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <Users color="#38bdf8" size={26} />
                        <div>
                            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Assemblea Solar: Sala Nova</h2>
                            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Clica els veïns i aliats per sumar potència. Esquiva els voltors del greenwashing!</span>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(0,0,0,0.4)', padding: '6px 14px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.15)' }}>
                            <Clock size={18} color="#f59e0b" />
                            <span style={{ fontWeight: 'bold', fontSize: '1.1rem', color: timeLeft <= 10 ? '#ef4444' : '#ffffff' }}>{timeLeft}s</span>
                        </div>
                        <button onClick={onClose} className="close-btn" style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.6rem', cursor: 'pointer', lineHeight: 1 }}>×</button>
                    </div>
                </div>

                {/* Game Area */}
                <div style={{
                    position: 'relative',
                    width: '100%',
                    height: '100%',
                    backgroundImage: `url(${backgroundOverride || '/assets/sala_nova_interior.png' || defaultBgImage})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    cursor: 'crosshair',
                    backgroundColor: '#1e293b'
                }}>
                    {/* Progress Bar Container */}
                    <div style={{
                        position: 'absolute',
                        bottom: 30,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: '82%',
                        zIndex: 20,
                        textAlign: 'center',
                        background: 'rgba(15, 23, 42, 0.85)',
                        backdropFilter: 'blur(6px)',
                        padding: '12px 20px',
                        borderRadius: '16px',
                        border: '1px solid rgba(255,255,255,0.15)',
                        boxShadow: '0 8px 30px rgba(0,0,0,0.5)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: 'white', fontWeight: 'bold', fontSize: '0.95rem' }}>
                            <span>🤝 Potència Comunitària Reunida</span>
                            <span style={{ color: currentPower >= goal ? '#10b981' : '#38bdf8' }}>
                                {currentPower.toFixed(1)} / {goal.toFixed(1)} kW (Objectiu 50%)
                            </span>
                        </div>
                        <div style={{
                            width: '100%',
                            height: '22px',
                            background: 'rgba(0,0,0,0.6)',
                            borderRadius: '11px',
                            overflow: 'hidden',
                            border: '1px solid rgba(255,255,255,0.2)'
                        }}>
                            <div style={{
                                width: `${Math.min(100, (currentPower / goal) * 100)}%`,
                                height: '100%',
                                background: currentPower >= goal
                                    ? 'linear-gradient(90deg, #10b981, #34d399)'
                                    : 'linear-gradient(90deg, #0284c7, #10b981)',
                                transition: 'width 0.3s ease',
                                boxShadow: '0 0 12px #10b981'
                            }}></div>
                        </div>
                    </div>

                    {/* Entities (Original Allies & Greenwashing Traps) */}
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
                                width: '102px',
                                height: '102px',
                                background: e.template.bg,
                                borderRadius: '50%',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: `3px solid ${e.template.border}`,
                                boxShadow: `0 0 18px ${e.template.border}, inset 0 0 10px rgba(255,255,255,0.2)`,
                                backdropFilter: 'blur(3px)',
                                position: 'relative',
                                userSelect: 'none'
                            }}>
                                {/* Avatar Icon & Mini-badge */}
                                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <span style={{ fontSize: '36px', lineHeight: 1 }}>{e.template.icon}</span>
                                    <span style={{
                                        position: 'absolute',
                                        bottom: -6,
                                        right: -10,
                                        fontSize: '14px',
                                        background: 'rgba(0,0,0,0.7)',
                                        borderRadius: '50%',
                                        padding: '2px 4px',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.5)'
                                    }}>
                                        {e.template.badge}
                                    </span>
                                </div>

                                {/* Label & Value Tag */}
                                <div style={{
                                    fontSize: '0.62rem',
                                    fontWeight: 800,
                                    color: '#ffffff',
                                    textShadow: '1px 1px 3px black',
                                    marginTop: '4px',
                                    maxWidth: '85px',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    textAlign: 'center'
                                }}>
                                    {e.template.name}
                                </div>

                                <span style={{
                                    fontSize: '0.72rem',
                                    fontWeight: '900',
                                    color: e.isTrap ? '#fca5a5' : '#86efac',
                                    textShadow: '1px 1px 2px black',
                                    background: 'rgba(0,0,0,0.7)',
                                    padding: '1px 7px',
                                    borderRadius: '10px',
                                    marginTop: '2px',
                                    border: `1px solid ${e.isTrap ? '#ef4444' : '#22c55e'}`
                                }}>
                                    {e.isTrap ? `⚠️ -${e.penalty.toFixed(1)}kW` : `+${e.kw.toFixed(1)}kW`}
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
                            color: f.type === 'trap' ? '#ef4444' : '#10b981',
                            fontWeight: 'bold',
                            fontSize: '1.25rem',
                            textShadow: '2px 2px 6px rgba(0,0,0,1)',
                            animation: 'floatUp 1.3s forwards',
                            pointerEvents: 'none',
                            zIndex: 100,
                            whiteSpace: 'nowrap',
                            background: 'rgba(0,0,0,0.75)',
                            padding: '4px 12px',
                            borderRadius: '8px',
                            border: `1.5px solid ${f.type === 'trap' ? '#ef4444' : '#10b981'}`
                        }}>
                            {f.text}
                        </div>
                    ))}

                    {/* Success Overlay */}
                    {gameState === 'success' && (
                        <div className="success-overlay" style={{ background: 'rgba(16, 185, 129, 0.95)', zIndex: 1000, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '20px', padding: '20px', textAlign: 'center' }}>
                            <CheckCircle size={90} color="white" className="scale-up-center" />
                            <h2 style={{ fontSize: '2.6rem', color: 'white', margin: 0 }}>SOBIRANIA ACONSEGUIDA!</h2>
                            <p style={{ fontSize: '1.3rem', color: 'white', margin: 0, maxWidth: '600px' }}>
                                L'Assemblea de la Sala Nova ha unit el poble! S'ha reduït l'especulació i la comunitat té el control de la seva energia.
                            </p>
                        </div>
                    )}

                    {/* Failure Overlay */}
                    {gameState === 'failure' && (
                        <div className="failure-overlay" style={{ background: 'rgba(220, 38, 38, 0.95)', zIndex: 1000, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '20px', padding: '20px', textAlign: 'center' }}>
                            <AlertTriangle size={90} color="white" />
                            <h2 style={{ fontSize: '2.6rem', color: 'white', margin: 0 }}>ASSEMBLEA FRACTURADA</h2>
                            <p style={{ fontSize: '1.3rem', color: 'white', margin: 0, maxWidth: '600px' }}>
                                Els paranys del Greenwashing i els macroprojectes han confós els veïns i veïnes.
                            </p>
                            <button
                                onClick={() => { setGameState('playing'); setCurrentPower(0); setTimeLeft(60); setEntities([]); }}
                                style={{ padding: '12px 26px', fontSize: '1.15rem', fontWeight: 'bold', borderRadius: '10px', border: 'none', background: 'white', color: '#dc2626', cursor: 'pointer', boxShadow: '0 4px 15px rgba(0,0,0,0.3)' }}
                            >
                                Reintenta la Resistència
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                @keyframes floatUp {
                    0% { transform: translateY(0) scale(1); opacity: 1; }
                    100% { transform: translateY(-130px) scale(1.05); opacity: 0; }
                }
                .entity-bubble {
                    animation: floatHorizontal 1.6s infinite alternate ease-in-out;
                    transition: transform 0.15s;
                }
                .entity-bubble:hover {
                    transform: scale(1.1);
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
