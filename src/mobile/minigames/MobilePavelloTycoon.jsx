import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Building2, Users, Coins, MessageSquare, Megaphone, Newspaper, Mail, Users2, CheckCircle, XCircle, Info, Sparkles, TrendingUp } from 'lucide-react';

import marketingIcon from '../../assets/expert_marketing.png';
import gameDesignIcon from '../../assets/expert_game_design.png';
import narrativeIcon from '../../assets/expert_narrative.png';

const MobilePavelloTycoon = ({ onComplete, onClose, maxPower, rewardFactor }) => {
    const [budget, setBudget] = useState(500);
    const [participants, setParticipants] = useState(1);
    const [turn, setTurn] = useState(1);
    const [gameState, setGameState] = useState('intro'); // intro, plan_selection, playing, success, failure
    const [commPlan, setCommPlan] = useState(null);
    const [logs, setLogs] = useState(["Benvingut! L'objectiu és arribar a 50 participants per a la comunitat energètica del Pavelló."]);
    const [expertAdvice, setExpertAdvice] = useState(null);
    const [passiveGrowth, setPassiveGrowth] = useState(0);

    const maxTurns = 8;
    const targetParticipants = 50;

    const commPlans = [
        {
            id: 'grassroots',
            name: 'Proximitat (Poble)',
            desc: 'Focalitza en el porta a porta. Cartes i Xerrades costen un 50% menys. El boca-orella és molt potent.',
            icon: <Mail size={40} />,
            color: '#e67e22'
        },
        {
            id: 'digital',
            name: 'Impacte Digital',
            desc: 'Estratègia agressiva en xarxes. Social Media i Ràdio donen un +50% de veïns.',
            icon: <Megaphone size={40} />,
            color: '#3498db'
        },
        {
            id: 'coop',
            name: 'Model Cooperatiu',
            desc: 'Comença amb més fons (+200€). Les xerrades generen un creixement passiu constant.',
            icon: <Users2 size={40} />,
            color: '#2ecc71'
        }
    ];

    const experts = {
        marketing: {
            name: "Marketing Specialist",
            icon: marketingIcon,
            advice: commPlan?.id === 'digital' ? "Amb el pla digital, les xarxes volaran!" : "Invertir en publicitat digital ens donarà un impuls immediat.",
            color: "#3498db"
        },
        gameDesign: {
            name: "Game Designer",
            icon: gameDesignIcon,
            advice: "El boca-orella és clau quan tens molta gent. Cada veí en porta un altre!",
            color: "#2ecc71"
        },
        narrative: {
            name: "Narrative Designer",
            icon: narrativeIcon,
            advice: "Si triem el model de proximitat, la gent del poble confiarà més en nosaltres.",
            color: "#f1c40f"
        }
    };

    const actions = [
        { id: 'radio', name: 'Ràdio Local', cost: 100, gain: [4, 8], effect: 'Propaganda tradicional.' },
        { id: 'talk', name: 'Xerrada Informativa', cost: 50, gain: [2, 5], effect: 'Confiança directa.' },
        { id: 'social', name: 'Xarxes Socials', cost: 80, gain: [3, 10], effect: 'Arribada als joves.' },
        { id: 'letters', name: 'Bústia i Cartes', cost: 30, gain: [1, 3], effect: 'Tothom rep la notícia.' },
        { id: 'event', name: 'Dinar Popular', cost: 200, gain: [12, 25], effect: 'Gran ressò local.' }
    ];

    const selectPlan = (plan) => {
        setCommPlan(plan);
        if (plan.id === 'coop') setBudget(prev => prev + 200);
        setGameState('playing');
        setLogs(prev => [`Has seleccionat el pla: ${plan.name}`, ...prev]);
    };

    const handleAction = (action) => {
        if (budget < calculateCost(action)) return;
        if (turn > maxTurns) return;

        let gain = Math.floor(Math.random() * (action.gain[1] - action.gain[0] + 1)) + action.gain[0];

        // Apply Plan Buffs
        if (commPlan.id === 'digital' && (action.id === 'social' || action.id === 'radio')) {
            gain = Math.floor(gain * 1.5);
        }

        const cost = calculateCost(action);

        setBudget(prev => prev - cost);
        setParticipants(prev => {
            const next = prev + gain;
            if (next >= targetParticipants) {
                setGameState('success');
            }
            return next;
        });

        // Passive growth logic for Coop
        if (commPlan.id === 'coop' && action.id === 'talk') {
            setPassiveGrowth(prev => prev + 1);
        }

        processTurn(gain, action.name);
    };

    const calculateCost = (action) => {
        if (commPlan?.id === 'grassroots' && (action.id === 'letters' || action.id === 'talk')) {
            return Math.floor(action.cost * 0.5);
        }
        return action.cost;
    };

    const processTurn = (gain, actionName) => {
        // Word of Mouth / Passive effects
        let wom = 0;
        if (participants > 10) {
            const rate = commPlan.id === 'grassroots' ? 0.15 : 0.05;
            wom = Math.floor(participants * rate);
        }

        const totalIncrease = gain + wom + passiveGrowth;

        setParticipants(prev => {
            const next = prev + wom + passiveGrowth;
            if (next >= targetParticipants) setGameState('success');
            return next;
        });

        setTurn(prev => {
            const nextTurn = prev + 1;
            if (nextTurn > maxTurns && participants + totalIncrease < targetParticipants) {
                setGameState('failure');
            }
            return nextTurn;
        });

        const womMsg = wom > 0 ? ` +${wom} pel boca-orella!` : "";
        const passiveMsg = passiveGrowth > 0 ? ` +${passiveGrowth} pel compromís coop!` : "";
        setLogs(prev => [`Setmana ${turn}: ${actionName} (+${gain})${womMsg}${passiveMsg}`, ...prev.slice(0, 5)]);
        setExpertAdvice(null);
    };

    const finish = () => {
        onComplete(rewardFactor);
    };

    return ReactDOM.createPortal(
        <div className="mobile-tycoon-overlay" style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100dvh',
            background: '#f5f6fa', zIndex: 10000, display: 'flex', flexDirection: 'column',
            overflow: 'hidden', color: '#2f3640'
        }}>
            {/* Top HUD */}
            <div style={{
                background: '#2f3640', color: 'white', padding: '15px 20px',
                display: 'flex', flexDirection: 'column', gap: '10px', flexShrink: 0,
                boxShadow: '0 4px 10px rgba(0,0,0,0.2)', zIndex: 10
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Building2 color="#f1c40f" size={24} />
                        <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Pavelló Tycoon</h2>
                    </div>
                    <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', fontSize: '1.5rem', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>×</button>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Coins color="#f1c40f" size={18} />
                        <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{budget}€</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Users color="#2ecc71" size={18} />
                        <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{participants}/{targetParticipants}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: turn > 6 ? '#e74c3c' : 'white' }}>
                        <TrendingUp size={16} />
                        <span style={{ fontSize: '1rem' }}>T{turn > maxTurns ? maxTurns : turn}/{maxTurns}</span>
                    </div>
                </div>
                {commPlan && <div style={{ fontSize: '0.85rem', color: commPlan.color, textAlign: 'center', fontWeight: 'bold' }}>Estratègia: {commPlan.name}</div>}
            </div>

            {/* Mobile Content Area (Vertical) */}
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto' }}>

                {/* Horizontal Experts Bar */}
                {gameState === 'playing' && (
                    <div style={{
                        display: 'flex', overflowX: 'auto', gap: '15px', padding: '15px',
                        background: '#dcdde1', borderBottom: '2px solid #bdc3c7', flexShrink: 0
                    }}>
                        {Object.entries(experts).map(([key, expert]) => (
                            <div
                                key={key}
                                onClick={() => setExpertAdvice(expertAdvice === expert ? null : expert)}
                                style={{
                                    background: expertAdvice === expert ? expert.color : 'white',
                                    color: expertAdvice === expert ? 'white' : '#2c3e50',
                                    padding: '8px 12px', borderRadius: '20px', cursor: 'pointer',
                                    border: `2px solid ${expert.color}`, display: 'flex', alignItems: 'center', gap: '8px',
                                    minWidth: 'max-content', transition: 'all 0.2s',
                                    boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
                                }}
                            >
                                <img src={expert.icon} alt={expert.name} style={{ width: '24px', height: '24px', borderRadius: '50%' }} />
                                <span style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>{expert.name}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Expert Advice Bubble (If Active) */}
                {gameState === 'playing' && expertAdvice && (
                    <div className="scale-up-center" style={{
                        margin: '15px', background: 'white', padding: '15px', borderRadius: '12px',
                        border: `2px solid ${expertAdvice.color}`, boxShadow: '0 4px 10px rgba(0,0,0,0.05)'
                    }}>
                        <h4 style={{ margin: '0 0 5px 0', color: expertAdvice.color, fontSize: '0.9rem' }}>{expertAdvice.name} diu:</h4>
                        <p style={{ margin: 0, fontSize: '1rem', fontStyle: 'italic' }}>"{expertAdvice.advice}"</p>
                    </div>
                )}

                {/* Main Screens */}
                <div style={{ padding: '15px', display: 'flex', flexDirection: 'column', gap: '15px', flex: 1 }}>

                    {gameState === 'intro' && (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: '20px' }}>
                            <img src={gameDesignIcon} style={{ width: '120px', marginBottom: '20px' }} alt="intro" />
                            <h2 style={{ fontSize: '1.8rem', color: '#2c3e50' }}>Repte Tycoon</h2>
                            <p style={{ fontSize: '1.1rem', color: '#34495e', margin: '20px 0' }}>
                                L'especulació amenaça el nostre Pavelló. Necessitem que <strong>50 famílies</strong> s'uneixin a la comunitat energètica en <strong>8 setmanes</strong>.
                            </p>
                            <button
                                onClick={() => setGameState('plan_selection')}
                                style={{
                                    width: '100%', padding: '18px', fontSize: '1.2rem', fontWeight: 'bold',
                                    borderRadius: '12px', border: 'none', background: '#2ecc71', color: 'white',
                                    boxShadow: '0 4px 15px rgba(46, 204, 113, 0.4)'
                                }}
                            >
                                TRIA ESTRATÈGIA
                            </button>
                        </div>
                    )}

                    {gameState === 'plan_selection' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <h2 style={{ textAlign: 'center', fontSize: '1.4rem', margin: '10px 0' }}>Com ho comunicarem?</h2>
                            {commPlans.map(plan => (
                                <button
                                    key={plan.id}
                                    onClick={() => selectPlan(plan)}
                                    style={{
                                        background: 'white', border: `3px solid ${plan.color}`, borderRadius: '15px',
                                        padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                                        textAlign: 'left', boxShadow: '0 4px 10px rgba(0,0,0,0.05)'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '10px' }}>
                                        <div style={{ color: plan.color }}>{plan.icon}</div>
                                        <h3 style={{ margin: 0, color: plan.color, fontSize: '1.2rem' }}>{plan.name}</h3>
                                    </div>
                                    <p style={{ fontSize: '0.95rem', color: '#7f8c8d', margin: '0 0 15px 0' }}>{plan.desc}</p>
                                    <div style={{ background: plan.color, color: 'white', padding: '10px', borderRadius: '8px', fontWeight: 'bold', width: '100%', textAlign: 'center', fontSize: '1.1rem' }}>
                                        Seleccionar
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    {gameState === 'playing' && (
                        <>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {actions.map(action => {
                                    const cost = calculateCost(action);
                                    const canAfford = budget >= cost;
                                    return (
                                        <button
                                            key={action.id}
                                            onClick={() => handleAction(action)}
                                            disabled={!canAfford}
                                            style={{
                                                background: canAfford ? 'white' : '#ecf0f1',
                                                border: `2px solid ${canAfford ? '#bdc3c7' : '#e0e0e0'}`,
                                                borderRadius: '12px', padding: '18px 15px', textAlign: 'left',
                                                display: 'flex', flexDirection: 'column', gap: '10px',
                                                opacity: canAfford ? 1 : 0.5, boxShadow: canAfford ? '0 2px 8px rgba(0,0,0,0.05)' : 'none'
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div style={{ fontWeight: 'bold', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '10px', color: '#2c3e50' }}>
                                                    {action.id === 'radio' && <Megaphone size={20} color="#3498db" />}
                                                    {action.id === 'talk' && <MessageSquare size={20} color="#e67e22" />}
                                                    {action.id === 'social' && <Sparkles size={20} color="#9b59b6" />}
                                                    {action.id === 'letters' && <Mail size={20} color="#f1c40f" />}
                                                    {action.id === 'event' && <Users2 size={20} color="#e74c3c" />}
                                                    {action.name}
                                                </div>
                                                <div style={{ color: budget >= cost ? '#c0392b' : '#7f8c8d', fontWeight: 'bold', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                    {cost}€ {calculateCost(action) < action.cost && <span style={{ fontSize: '0.8rem', textDecoration: 'line-through', color: '#95a5a6' }}>{action.cost}</span>}
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div style={{ fontSize: '0.85rem', color: '#7f8c8d' }}>{action.effect}</div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '1rem', fontWeight: 'bold', color: '#27ae60', background: 'rgba(46, 204, 113, 0.1)', padding: '4px 8px', borderRadius: '6px' }}>
                                                    <Users size={16} /> +{action.gain[0]}-{action.gain[1]}
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Activity Logs (Mobile style) */}
                            <div style={{ background: '#2c3e50', color: 'white', borderRadius: '12px', padding: '15px', marginTop: '10px' }}>
                                <h4 style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: '#bdc3c7', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    <Info size={16} /> ÚLTIMES ACTIVITATS
                                </h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {logs.slice(0, 3).map((log, i) => (
                                        <div key={i} style={{ fontSize: '0.9rem', opacity: 1 - (i * 0.25), borderLeft: i === 0 ? '3px solid #f1c40f' : '3px solid transparent', paddingLeft: '8px' }}>
                                            {log}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Victory / Defeat Overlays */}
            {(gameState === 'success' || gameState === 'failure') && (
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                    background: gameState === 'success' ? 'rgba(39, 174, 96, 0.95)' : 'rgba(192, 57, 43, 0.95)',
                    zIndex: 1000, display: 'flex', flexDirection: 'column', justifyContent: 'center',
                    alignItems: 'center', padding: '30px', textAlign: 'center', color: 'white',
                    backdropFilter: 'blur(10px)'
                }}>
                    {gameState === 'success' ? <CheckCircle size={100} className="scale-up-center" /> : <XCircle size={100} />}
                    <h2 style={{ fontSize: '2.5rem', margin: '20px 0 10px 0' }}>
                        {gameState === 'success' ? "COMUNITAT CREADA!" : "CAMPANYA FALLIDA"}
                    </h2>
                    <p style={{ fontSize: '1.2rem', marginBottom: '40px' }}>
                        {gameState === 'success'
                            ? `Increïble! Has aconseguit reunir ${participants} veïns. El Pavelló és nostre!`
                            : `Només has reunit ${participants} veïns. El projecte no pot tirar endavant.`}
                    </p>

                    {gameState === 'success' ? (
                        <button onClick={finish} style={{ width: '100%', padding: '20px', fontSize: '1.3rem', fontWeight: 'bold', borderRadius: '15px', border: 'none', background: 'white', color: '#27ae60', boxShadow: '0 8px 15px rgba(0,0,0,0.2)' }}>
                            CONTINUAR
                        </button>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', width: '100%' }}>
                            <button onClick={onClose} style={{ width: '100%', padding: '20px', fontSize: '1.2rem', fontWeight: 'bold', borderRadius: '15px', border: 'none', background: 'white', color: '#c0392b' }}>
                                TANCAR
                            </button>
                        </div>
                    )}
                </div>
            )}

            <style>{`
                .scale-up-center { animation: scale-up-center 0.4s cubic-bezier(0.390, 0.575, 0.565, 1.000) both; }
                @keyframes scale-up-center { 0% { transform: scale(0.8); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
            `}</style>
        </div>,
        document.body
    );
};

export default MobilePavelloTycoon;
