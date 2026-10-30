import React, { useState } from 'react';
import { Play, ArrowRight, ArrowLeft, Target, Zap, Globe, RotateCcw, BookOpen, Shield, Users } from 'lucide-react';
import RulesModal from './RulesModal';

const WelcomeScreen = ({ onStart, onReset, savedProgressCount = 0 }) => {
    const [step, setStep] = useState(0);
    const [showRulesModal, setShowRulesModal] = useState(false);

    const steps = [
        {
            title: "L'ÚLTIM CAVALLER DE LA LLERA",
            subtitle: "La Vall del Ter necessita la teva energia.",
            text: "L'especulació d'El Plater amenaça amb cobrir la nostra terra i ofegar la sobirania del poble sota un mantell gris. Però l'esperança no està perduda...",
            icon: <Globe size={48} color="#38bdf8" />,
            missionBox: true,
            action: "Següent"
        },
        {
            title: "Sobirania Energètica",
            subtitle: "Explora, connecta i allibera",
            text: "Navega pel municipi de Sant Jordi Desvalls i fes clic a les teulades per alliberar-les superant minijocs solars d'habilitat i equilibri.\n\nAtura els «Homes de Negre» fent-hi clic quan intentin privatitzar el poble!",
            icon: <Zap size={48} color="#f59e0b" />,
            action: "Següent"
        },
        {
            title: "Regles i Dinàmica de Joc",
            subtitle: "Estratègia de resistència",
            icon: <BookOpen size={48} color="#10b981" />,
            rulesList: [
                { icon: "⚡", title: "Clic a Teulada", desc: "Supera el minijoc solar per alliberar-la i sumar energia verda.", color: "#10b981" },
                { icon: "🌊", title: "Contagi Veïnal (180m)", desc: "En alliberar una teulada, s'alliberen en cadena les teulades properes!", color: "#38bdf8" },
                { icon: "🕵️", title: "Homes de Negre", desc: "Fes-hi clic ràpidament per expulsar-los abans que robin kW!", color: "#ef4444" },
                { icon: "🏛️", title: "Fites Clau", desc: "Sala Nova (3 teulades), Pavelló d'Excedents i Batalla Final (85%).", color: "#f59e0b" }
            ],
            action: "Següent"
        },
        {
            title: "Aturem el Plater!",
            subtitle: "L'objectiu final",
            text: "Allibera la Sala Nova (a partir de 3 teulades), connecta el Pavelló Municipal i assoleix el 85% de la sobirania del poble per desbloquejar la missió definitiva contra El Plater.",
            icon: <Target size={48} color="#ec4899" />,
            action: "Començar l'Aventura"
        }
    ];

    const currentStep = steps[Math.min(step, steps.length - 1)] || steps[0];

    const handleNext = () => {
        if (step >= steps.length - 1) {
            onStart();
            return;
        }
        setStep(s => Math.min(steps.length - 1, s + 1));
    };

    const handlePrev = () => {
        setStep(s => Math.max(0, s - 1));
    };

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100dvh',
                backgroundColor: 'rgba(2, 6, 23, 0.90)',
                zIndex: 100000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backdropFilter: 'blur(8px)',
                padding: '16px'
            }}
            className="animate-fade-in"
        >
            <div
                style={{
                    background: '#0f172a',
                    border: '1.5px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '20px',
                    boxShadow: '0 25px 60px rgba(0,0,0,0.95), 0 0 35px rgba(245, 158, 11, 0.15)',
                    padding: '2rem 1.8rem',
                    maxWidth: '540px',
                    width: '100%',
                    maxHeight: '94dvh',
                    overflowY: 'auto',
                    textAlign: 'center',
                    position: 'relative',
                    color: '#ffffff'
                }}
            >
                <button
                    onClick={onStart}
                    style={{
                        position: 'absolute',
                        top: '14px',
                        right: '14px',
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        color: '#cbd5e1',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'background 0.2s'
                    }}
                    title="Saltar intro i anar al mapa"
                >
                    ✕
                </button>

                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem', animation: 'fadeIn 0.4s ease-out' }}>
                    {currentStep.icon}
                </div>
                
                <h1 style={{
                    fontSize: '1.65rem',
                    fontWeight: 900,
                    color: '#fbbf24',
                    textShadow: '0 2px 10px rgba(0,0,0,0.9)',
                    letterSpacing: '0.5px',
                    marginBottom: '0.35rem',
                    lineHeight: 1.2
                }}>
                    {currentStep.title}
                </h1>

                <h2 style={{
                    fontSize: '1.05rem',
                    color: '#e2e8f0',
                    fontWeight: 600,
                    marginBottom: '1.1rem'
                }}>
                    {currentStep.subtitle}
                </h2>

                {currentStep.missionBox && (
                    <div style={{
                        backgroundColor: '#1e293b',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: '12px',
                        padding: '14px 16px',
                        margin: '14px 0 18px 0',
                        textAlign: 'left',
                        boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.5)'
                    }}>
                        <div style={{
                            fontSize: '0.85rem',
                            fontWeight: 900,
                            color: '#fbbf24',
                            textTransform: 'uppercase',
                            letterSpacing: '1px',
                            marginBottom: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}>
                            🎯 LA TEVA MISSIÓ:
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '9px', fontSize: '0.92rem', color: '#f8fafc' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ fontSize: '1.25rem', flexShrink: 0 }}>🌍</span>
                                <span><strong style={{ color: '#38bdf8' }}>EXPLORA</strong> el mapa de Sant Jordi Desvalls.</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ fontSize: '1.25rem', flexShrink: 0 }}>⚡</span>
                                <span><strong style={{ color: '#10b981' }}>ALLIBERA</strong> les teulades veïnals per generar energia neta.</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ fontSize: '1.25rem', flexShrink: 0 }}>🤝</span>
                                <span><strong style={{ color: '#f59e0b' }}>CONNECTA</strong> els punts de resistència (ona de 180m).</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ fontSize: '1.25rem', flexShrink: 0 }}>🎮</span>
                                <span><strong style={{ color: '#ec4899' }}>SUPERA</strong> els mini-jocs i expulsa els Homes de Negre.</span>
                            </div>
                        </div>
                    </div>
                )}

                {currentStep.rulesList ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left', marginBottom: '1.6rem' }}>
                        {currentStep.rulesList.map((r, i) => (
                            <div
                                key={i}
                                style={{
                                    background: '#1e293b',
                                    borderLeft: `4px solid ${r.color}`,
                                    borderTop: '1px solid rgba(255,255,255,0.06)',
                                    borderRight: '1px solid rgba(255,255,255,0.06)',
                                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                                    borderRadius: '8px',
                                    padding: '10px 14px',
                                    display: 'flex',
                                    gap: '10px',
                                    alignItems: 'center'
                                }}
                            >
                                <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>{r.icon}</span>
                                <div style={{ fontSize: '0.88rem', lineHeight: 1.4 }}>
                                    <strong style={{ color: r.color }}>{r.title}:</strong>{' '}
                                    <span style={{ color: '#f1f5f9' }}>{r.desc}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p style={{
                        fontSize: '0.98rem',
                        lineHeight: 1.6,
                        color: '#f8fafc',
                        fontWeight: 500,
                        whiteSpace: 'pre-line',
                        marginBottom: '1.8rem',
                        minHeight: currentStep.missionBox ? 'auto' : '85px',
                        textShadow: '0 1px 3px rgba(0,0,0,0.8)'
                    }}>
                        {currentStep.text}
                    </p>
                )}

                {savedProgressCount > 0 && step === 0 && (
                    <div style={{
                        backgroundColor: 'rgba(16, 185, 129, 0.15)',
                        border: '1.5px solid #10b981',
                        borderRadius: '12px',
                        padding: '12px',
                        marginBottom: '18px',
                        fontSize: '0.92rem'
                    }}>
                        <div style={{ fontWeight: 800, color: '#34d399', marginBottom: '8px' }}>
                            Partida anterior trobada ({savedProgressCount} punts alliberats)
                        </div>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                            <button
                                onClick={onStart}
                                style={{
                                    backgroundColor: '#10b981',
                                    color: '#ffffff',
                                    border: 'none',
                                    borderRadius: '8px',
                                    padding: '8px 16px',
                                    fontSize: '0.88rem',
                                    fontWeight: 700,
                                    cursor: 'pointer'
                                }}
                            >
                                Continuar partida
                            </button>
                            <button
                                onClick={onReset}
                                style={{
                                    backgroundColor: 'transparent',
                                    border: '1px solid #ef4444',
                                    color: '#f87171',
                                    borderRadius: '8px',
                                    padding: '8px 14px',
                                    fontSize: '0.88rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                }}
                            >
                                <RotateCcw size={14} /> Reiniciar de zero
                            </button>
                        </div>
                    </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                    <div style={{ minWidth: '95px', textAlign: 'left' }}>
                        {step > 0 && (
                            <button
                                onClick={handlePrev}
                                style={{
                                    backgroundColor: '#334155',
                                    color: '#f8fafc',
                                    border: '1px solid rgba(255,255,255,0.15)',
                                    borderRadius: '10px',
                                    padding: '10px 16px',
                                    fontSize: '0.9rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}
                            >
                                <ArrowLeft size={16} /> Anterior
                            </button>
                        )}
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                        {steps.map((_, i) => (
                            <div
                                key={i}
                                style={{
                                    width: i === step ? '22px' : '9px',
                                    height: '9px',
                                    borderRadius: '6px',
                                    backgroundColor: i === step ? '#fbbf24' : 'rgba(255,255,255,0.25)',
                                    transition: 'all 0.3s ease'
                                }}
                            />
                        ))}
                    </div>

                    <div style={{ minWidth: '95px', textAlign: 'right' }}>
                        <button
                            onClick={handleNext}
                            style={{
                                backgroundColor: '#fbbf24',
                                color: '#0f172a',
                                border: 'none',
                                borderRadius: '10px',
                                padding: '10px 18px',
                                fontSize: '0.92rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                boxShadow: '0 4px 15px rgba(251, 191, 36, 0.45)'
                            }}
                        >
                            {step === steps.length - 1 ? <Play size={16} fill="#0f172a" /> : null}
                            <span>{currentStep.action}</span>
                            {step < steps.length - 1 ? <ArrowRight size={16} /> : null}
                        </button>
                    </div>
                </div>

                <div style={{ marginTop: '1.4rem', borderTop: '1px solid rgba(255,255,255,0.12)', paddingTop: '0.9rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <button
                        onClick={() => setShowRulesModal(true)}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: '#fbbf24',
                            cursor: 'pointer',
                            fontSize: '0.88rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontWeight: 700
                        }}
                    >
                        <BookOpen size={16} /> 📜 Veure totes les regles
                    </button>
                    <button
                        onClick={onStart}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: '#94a3b8',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            textDecoration: 'underline'
                        }}
                    >
                        Saltar intro i jugar ara →
                    </button>
                </div>
            </div>

            <RulesModal isOpen={showRulesModal} onClose={() => setShowRulesModal(false)} />
        </div>
    );
};

export default WelcomeScreen;
