import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Building2, Users, Coins, MessageSquare, Megaphone, Newspaper, Mail, Users2, CheckCircle, XCircle, Info, Sparkles, TrendingUp } from 'lucide-react';

import marketingIcon from '../../assets/expert_marketing.png';
import gameDesignIcon from '../../assets/expert_game_design.png';
import narrativeIcon from '../../assets/expert_narrative.png';

const PavelloTycoon = ({ onComplete, onClose, maxPower, rewardFactor }) => {
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
        <div className="tycoon-overlay" style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            background: 'rgba(0,0,0,0.85)', zIndex: 10000, display: 'flex', justifyContent: 'center', alignItems: 'center'
        }}>
            <div className="tycoon-card" style={{
                width: '95%', height: '95%', maxWidth: '1200px', background: '#f5f6fa',
                borderRadius: '20px', display: 'flex', flexDirection: 'column', overflow: 'hidden',
                color: '#2f3640', border: '5px solid #dcdde1', position: 'relative'
            }}>

                {/* HUD */}
                <div className="tycoon-hud" style={{ background: '#2f3640', color: 'white', padding: '10px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '70px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <Building2 color="#f1c40f" size={32} />
                        <div>
                            <h2 style={{ margin: 0, fontSize: '1.2rem' }}>Tycoon del Pavelló</h2>
                            {commPlan && <span style={{ fontSize: '0.8rem', color: commPlan.color }}>{commPlan.name}</span>}
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '30px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Coins color="#f1c40f" />
                            <span style={{ fontSize: '1.4rem', fontWeight: 'bold' }}>{budget}€</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Users color="#2ecc71" />
                            <span style={{ fontSize: '1.4rem', fontWeight: 'bold' }}>{participants} / {targetParticipants}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: turn > 6 ? '#e74c3c' : 'white' }}>
                            <TrendingUp size={20} />
                            <span style={{ fontSize: '1.1rem' }}>Setm. {turn > maxTurns ? maxTurns : turn} / {maxTurns}</span>
                        </div>
                        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', fontSize: '2rem', cursor: 'pointer' }}>×</button>
                    </div>
                </div>

                <div className="tycoon-content" style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

                    {/* Left: Experts */}
                    <div className="tycoon-experts" style={{ width: '280px', background: '#dcdde1', padding: '15px', display: 'flex', flexDirection: 'column', gap: '15px', borderRight: '2px solid #bdc3c7' }}>
                        <h3 style={{ margin: 0, borderBottom: '2px solid #2f3640', paddingBottom: '5px', fontSize: '1rem' }}>Estratègia i Experts</h3>
                        {Object.entries(experts).map(([key, expert]) => (
                            <div
                                key={key}
                                onClick={() => setExpertAdvice(expert)}
                                style={{
                                    background: 'white', padding: '10px', borderRadius: '12px',
                                    cursor: 'pointer', transition: 'transform 0.2s',
                                    border: `2px solid ${expert.color}`,
                                    display: 'flex', alignItems: 'center', gap: '10px'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                            >
                                <img src={expert.icon} alt={expert.name} style={{ width: '45px', height: '45px', borderRadius: '50%' }} />
                                <div>
                                    <div style={{ fontWeight: 'bold', fontSize: '0.8rem' }}>{expert.name}</div>
                                    <div style={{ fontSize: '0.6rem', color: '#7f8c8d' }}>Demana consell</div>
                                </div>
                            </div>
                        ))}

                        {expertAdvice && (
                            <div className="advice-bubble scale-up-center" style={{
                                background: 'white', padding: '15px', borderRadius: '12px',
                                border: `2px solid ${expertAdvice.color}`, flex: 1,
                                position: 'relative', marginTop: '10px'
                            }}>
                                <h4 style={{ margin: '0 0 5px 0', color: expertAdvice.color, fontSize: '0.9rem' }}>Consell:</h4>
                                <p style={{ margin: 0, fontSize: '0.9rem', fontStyle: 'italic' }}>"{expertAdvice.advice}"</p>
                            </div>
                        )}

                        {/* Word of Mouth Info */}
                        <div style={{ background: 'rgba(46, 204, 113, 0.1)', padding: '10px', borderRadius: '10px', marginTop: 'auto', border: '1px dashed #2ecc71' }}>
                            <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#27ae60', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <Sparkles size={14} /> DINÀMICA SOCIAL
                            </div>
                            <div style={{ fontSize: '0.75rem', marginTop: '5px' }}>
                                {participants > 10 ?
                                    `Els teus veïns estan recomanant el projecte! (+${Math.floor(participants * (commPlan?.id === 'grassroots' ? 0.15 : 0.05))} veïns/setm)` :
                                    "Necessites 10 veïns per activar el boca-orella."}
                            </div>
                        </div>
                    </div>

                    {/* Right: Game Operations */}
                    <div style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px', position: 'relative', overflowY: 'auto' }}>

                        {gameState === 'intro' && (
                            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(255,255,255,0.98)', zIndex: 100, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '40px', textAlign: 'center' }}>
                                <img src={gameDesignIcon} style={{ width: '100px', marginBottom: '15px' }} alt="intro" />
                                <h2 style={{ fontSize: '2rem' }}>Repte Tycoon: Pavelló Local</h2>
                                <p style={{ maxWidth: '600px', fontSize: '1.2rem', color: '#34495e' }}>
                                    L'especulació amenaça el nostre Pavelló. Necessitem que <strong>50 famílies</strong> s'uneixin a la comunitat energètica en <strong>8 setmanes</strong>.
                                </p>
                                <button
                                    onClick={() => setGameState('plan_selection')}
                                    style={{ padding: '15px 40px', fontSize: '1.3rem', fontWeight: 'bold', borderRadius: '50px', border: 'none', background: '#2ecc71', color: 'white', cursor: 'pointer', marginTop: '20px' }}
                                >
                                    TRIA L'ESTRATÈGIA
                                </button>
                            </div>
                        )}

                        {gameState === 'plan_selection' && (
                            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: '#f5f6fa', zIndex: 101, display: 'flex', flexDirection: 'column', padding: '40px' }}>
                                <h2 style={{ textAlign: 'center', marginBottom: '30px' }}>Selecciona un Pla de Comunicació</h2>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '25px', flex: 1 }}>
                                    {commPlans.map(plan => (
                                        <div
                                            key={plan.id}
                                            onClick={() => selectPlan(plan)}
                                            style={{
                                                background: 'white', border: `3px solid ${plan.color}`, borderRadius: '20px',
                                                padding: '30px', display: 'flex', flexDirection: 'column', gap: '20px',
                                                cursor: 'pointer', transition: 'all 0.3s ease', textAlign: 'center'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.transform = 'translateY(-10px)';
                                                e.currentTarget.style.boxShadow = `0 10px 30px ${plan.color}44`;
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.transform = 'translateY(0)';
                                                e.currentTarget.style.boxShadow = 'none';
                                            }}
                                        >
                                            <div style={{ color: plan.color, marginBottom: '10px' }}>{plan.icon}</div>
                                            <h3 style={{ margin: 0, color: plan.color }}>{plan.name}</h3>
                                            <p style={{ fontSize: '1rem', color: '#7f8c8d', flex: 1 }}>{plan.desc}</p>
                                            <button style={{ background: plan.color, color: 'white', border: 'none', padding: '10px', borderRadius: '10px', fontWeight: 'bold' }}>Tria aquest pla</button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="tycoon-actions" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
                            {actions.map(action => {
                                const cost = calculateCost(action);
                                const canAfford = budget >= cost;
                                return (
                                    <button
                                        key={action.id}
                                        onClick={() => handleAction(action)}
                                        disabled={!canAfford || gameState !== 'playing'}
                                        style={{
                                            background: canAfford ? 'white' : '#ecf0f1',
                                            border: `2px solid ${canAfford ? '#2f3640' : '#bdc3c7'}`,
                                            borderRadius: '15px', padding: '15px', textAlign: 'left',
                                            cursor: canAfford ? 'pointer' : 'not-allowed',
                                            transition: 'all 0.2s',
                                            display: 'flex', flexDirection: 'column', gap: '8px',
                                            opacity: canAfford ? 1 : 0.6
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div style={{ fontWeight: 'bold', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                {action.id === 'radio' && <Megaphone size={16} />}
                                                {action.id === 'talk' && <MessageSquare size={16} />}
                                                {action.id === 'social' && <Sparkles size={16} />}
                                                {action.id === 'letters' && <Mail size={16} />}
                                                {action.id === 'event' && <Users2 size={16} />}
                                                {action.name}
                                            </div>
                                            <div style={{ color: budget >= cost ? '#c0392b' : '#7f8c8d', fontWeight: 'bold' }}>
                                                {cost}€ {calculateCost(action) < action.cost && <span style={{ fontSize: '0.7rem', textDecoration: 'line-through', color: '#7f8c8d' }}>{action.cost}</span>}
                                            </div>
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: '#7f8c8d' }}>{action.effect}</div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.9rem', fontWeight: 'bold', color: '#2ecc71' }}>
                                            <Users size={14} /> +{action.gain[0]}-{action.gain[1]} veïns
                                            {commPlan?.id === 'digital' && (action.id === 'social' || action.id === 'radio') && <span style={{ fontSize: '0.7rem' }}>(+50% Pla Digital)</span>}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Recent Activity Logs */}
                        <div style={{ background: '#2f3640', color: '#ecf0f1', borderRadius: '15px', padding: '12px 20px', flex: 1, minHeight: '150px' }}>
                            <h4 style={{ margin: '0 0 8px 0', fontSize: '0.8rem', color: '#7f8c8d', borderBottom: '1px solid #3d4653', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <Info size={14} /> BITÀCOLA DE CAMPANYA
                            </h4>
                            {logs.map((log, i) => (
                                <div key={i} style={{ fontSize: '0.9rem', margin: '4px 0', opacity: 1 - (i * 0.15) }}>
                                    {log}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Victory Overlay */}
                {gameState === 'success' && (
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(39, 174, 96, 0.98)', zIndex: 1000, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '20px', color: 'white', padding: '40px', textAlign: 'center' }}>
                        <CheckCircle size={120} className="scale-up-center" />
                        <h2 style={{ fontSize: '3rem', margin: 0 }}>COMUNITAT CONSOLIDADA!</h2>
                        <p style={{ fontSize: '1.4rem', maxWidth: '700px' }}>
                            Increïble! Has aconseguit reunir {participants} veïns i veïnes. El Pavelló és ara el cor d'una revolució energètica sense precedents a Sant Jordi Desvalls.
                        </p>
                        <button onClick={finish} style={{ padding: '15px 50px', fontSize: '1.5rem', fontWeight: 'bold', borderRadius: '50px', border: 'none', background: 'white', color: '#27ae60', cursor: 'pointer', boxShadow: '0 10px 20px rgba(0,0,0,0.2)' }}>FINALITZA L'ÈXIT</button>
                    </div>
                )}

                {/* Failure Overlay */}
                {gameState === 'failure' && (
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(192, 57, 43, 0.98)', zIndex: 1000, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '20px', color: 'white', padding: '40px', textAlign: 'center' }}>
                        <XCircle size={120} />
                        <h2 style={{ fontSize: '3rem', margin: 0 }}>CAMPANYA FALLIDA</h2>
                        <p style={{ fontSize: '1.4rem', maxWidth: '700px' }}>
                            Només {participants} veïns... No hem arribat al mínim de 50. La gent està desanimada i l'ajuntament es planteja tancar el projecte.
                        </p>
                        <div style={{ display: 'flex', gap: '20px' }}>
                            <button onClick={() => window.location.reload()} style={{ padding: '12px 30px', fontSize: '1.1rem', fontWeight: 'bold', borderRadius: '50px', border: 'none', background: 'white', color: '#c0392b', cursor: 'pointer' }}>TORNA-HO A INTENTAR</button>
                            <button onClick={onClose} style={{ padding: '12px 30px', fontSize: '1.1rem', fontWeight: 'bold', borderRadius: '50px', border: 'none', background: 'rgba(255,255,255,0.2)', color: 'white', cursor: 'pointer' }}>RENUNCIA</button>
                        </div>
                    </div>
                )}
            </div>

            <style>{`
                .scale-up-center { animation: scale-up-center 0.4s cubic-bezier(0.390, 0.575, 0.565, 1.000) both; }
                @keyframes scale-up-center { 0% { transform: scale(0.5); } 100% { transform: scale(1); } }
            `}</style>
        </div>,
        document.body
    );
};

export default PavelloTycoon;
