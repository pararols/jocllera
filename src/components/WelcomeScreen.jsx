import React, { useState } from 'react';
import { Play, ArrowRight, ArrowLeft, Target, Zap, Globe, RotateCcw, BookOpen } from 'lucide-react';
import RulesModal from './RulesModal';

const WelcomeScreen = ({ onStart, onReset, savedProgressCount = 0 }) => {
    const [step, setStep] = useState(0);
    const [showRulesModal, setShowRulesModal] = useState(false);

    const steps = [
        {
            title: "L'Últim Cavaller de la Llera",
            subtitle: "Benvingut a la resistència",
            text: "L'especulació d'El Plater amenaça amb cobrir la nostra terra sota un mantell gris. La Vall del Ter necessita la teva energia per alliberar les 31 teulades i aturar l'amenaça abans que arribi al 100%.",
            icon: <Globe size={48} color="var(--color-primary)" />,
            action: "Següent"
        },
        {
            title: "Sobirania Energètica",
            subtitle: "Explora i actua",
            text: "Navega pel mapa i fes clic a les teulades per alliberar-les superant minijocs d'habilitat i coneixement. Atura els 'Homes de Negre' fent-hi clic quan intentin privatitzar el poble!",
            icon: <Zap size={48} color="var(--color-accent)" />,
            action: "Següent"
        },
        {
            title: "Regles i Dinàmica de Joc",
            subtitle: "Estratègia de resistència",
            text: "• Clic a teulada ➔ Supera el minijoc solar per alliberar-la.\n• Contagi 180m ➔ S'alliberen automàticament les teulades properes!\n• Clic a l'Home de Negre ➔ Expulsa'l abans que dreni els kW!\n• Fites ➔ Sala Nova (3 teulades), Pavelló i Aturem el Plater (85%).",
            icon: <BookOpen size={48} color="#f59e0b" />,
            action: "Següent"
        },
        {
            title: "Aturem el Plater!",
            subtitle: "L'objectiu final",
            text: "Allibera la Sala Nova (a partir de 3 teulades), connecta el Pavelló Municipal i assoleix el 85% de la sobirania del poble per desbloquejar la missió definitiva contra El Plater.",
            icon: <Target size={48} color="var(--color-warning)" />,
            action: "Començar l'Aventura"
        }
    ];

    const currentStep = steps[step];

    const handleNext = () => {
        if (step < steps.length - 1) {
            setStep(s => s + 1);
        } else {
            onStart();
        }
    };

    const handlePrev = () => {
        if (step > 0) {
            setStep(s => s - 1);
        }
    };

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} className="animate-fade-in">
            <div className="glass-panel" style={{ padding: '2.5rem', maxWidth: '520px', width: '92%', textAlign: 'center', position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.2rem', animation: 'fadeIn 0.5s ease-out' }}>
                    {currentStep.icon}
                </div>
                
                <h1 className="text-gradient" style={{ fontSize: '1.8rem', marginBottom: '0.4rem' }}>{currentStep.title}</h1>
                <h2 style={{ fontSize: '1.05rem', color: 'var(--color-text-muted)', marginBottom: '1.2rem' }}>{currentStep.subtitle}</h2>
                <p style={{ fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '2rem', minHeight: '90px' }}>
                    {currentStep.text}
                </p>

                {savedProgressCount > 0 && step === 0 && (
                    <div style={{ backgroundColor: 'rgba(46, 204, 113, 0.15)', border: '1px solid #2ecc71', borderRadius: '12px', padding: '12px', marginBottom: '20px', fontSize: '0.9rem' }}>
                        <div style={{ fontWeight: 'bold', color: '#2ecc71', marginBottom: '8px' }}>
                            Partida anterior trobada ({savedProgressCount} punts alliberats)
                        </div>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                            <button className="btn btn-primary" onClick={onStart} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                                Continuar partida
                            </button>
                            <button className="btn btn-secondary" onClick={onReset} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', color: '#e74c3c' }}>
                                <RotateCcw size={14} style={{ marginRight: '4px' }} /> Reiniciar de zero
                            </button>
                        </div>
                    </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ minWidth: '90px', textAlign: 'left' }}>
                        {step > 0 && (
                            <button className="btn btn-secondary" onClick={handlePrev} style={{ padding: '0.5rem 1rem' }}>
                                <ArrowLeft size={16} /> Anterior
                            </button>
                        )}
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                        {steps.map((_, i) => (
                            <div key={i} style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: i === step ? 'var(--color-primary)' : 'rgba(255,255,255,0.2)', transition: 'background-color 0.3s' }} />
                        ))}
                    </div>
                    <div style={{ minWidth: '90px', textAlign: 'right' }}>
                        <button className="btn btn-primary" onClick={handleNext} style={{ padding: '0.5rem 1rem' }}>
                            {step === steps.length - 1 ? <Play size={16} /> : <ArrowRight size={16} />} 
                            <span style={{ marginLeft: '5px' }}>{currentStep.action}</span>
                        </button>
                    </div>
                </div>

                <div style={{ marginTop: '1.4rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.9rem' }}>
                    <button
                        onClick={() => setShowRulesModal(true)}
                        style={{
                            background: 'none', border: 'none', color: '#f1c40f',
                            cursor: 'pointer', fontSize: '0.85rem', display: 'inline-flex',
                            alignItems: 'center', gap: '6px', fontWeight: 'bold'
                        }}
                    >
                        <BookOpen size={16} /> 📜 Veure totes les regles detallades
                    </button>
                </div>
            </div>

            <RulesModal isOpen={showRulesModal} onClose={() => setShowRulesModal(false)} />
        </div>
    );
};

export default WelcomeScreen;
