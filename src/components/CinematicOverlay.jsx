import React, { useState } from 'react';
import { ChevronRight } from 'lucide-react';

const CinematicOverlay = ({ phase, onComplete }) => {
    const [step, setStep] = useState(0);

    if (!phase) return null;

    const handleNext = () => {
        if (step < phase.dialogue.length - 1) {
            setStep(s => s + 1);
        } else {
            onComplete();
        }
    };

    if (phase.video) {
        return (
            <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100dvh',
                backgroundColor: '#000000',
                zIndex: 110000,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center'
            }}>
                <video
                    src={phase.video}
                    controls
                    autoPlay
                    playsInline
                    style={{
                        width: '100%',
                        maxHeight: '82vh',
                        objectFit: 'contain',
                        backgroundColor: '#000'
                    }}
                    onEnded={() => onComplete()}
                />
                <div style={{
                    position: 'absolute',
                    bottom: '24px',
                    display: 'flex',
                    justifyContent: 'center',
                    width: '100%',
                    padding: '0 20px',
                    pointerEvents: 'auto'
                }}>
                    <button
                        onClick={onComplete}
                        style={{
                            background: '#fbbf24',
                            color: '#0f172a',
                            border: 'none',
                            padding: '12px 28px',
                            fontWeight: 800,
                            fontSize: '1rem',
                            borderRadius: '50px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            boxShadow: '0 6px 20px rgba(251, 191, 36, 0.5)'
                        }}
                    >
                        SALTAR VÍDEO I CONTINUAR <ChevronRight size={20} />
                    </button>
                </div>
            </div>
        );
    }

    const currentLine = phase.dialogue[step];

    return (
        <div style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            width: '100vw',
            height: '100dvh',
            background: 'rgba(2, 6, 23, 0.75)',
            zIndex: 110000,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            pointerEvents: 'auto'
        }}>
            <div style={{
                background: '#090d16',
                borderTop: '3px solid #fbbf24',
                boxShadow: '0 -15px 40px rgba(0,0,0,0.95)',
                padding: '24px 20px',
                color: '#ffffff',
                minHeight: '180px'
            }}>
                <div style={{ maxWidth: '900px', margin: '0 auto', position: 'relative' }}>
                    <div style={{
                        display: 'inline-block',
                        backgroundColor: 'rgba(251, 191, 36, 0.15)',
                        border: '1.5px solid #fbbf24',
                        borderRadius: '6px',
                        padding: '4px 12px',
                        marginBottom: '12px'
                    }}>
                        <h3 style={{
                            color: '#fbbf24',
                            margin: 0,
                            fontSize: '0.95rem',
                            textTransform: 'uppercase',
                            letterSpacing: '1.5px',
                            fontWeight: 800
                        }}>
                            {currentLine.character}
                        </h3>
                    </div>

                    <p style={{
                        fontSize: '1.25rem',
                        lineHeight: '1.55',
                        margin: 0,
                        fontWeight: 600,
                        color: '#ffffff',
                        textShadow: '0 2px 6px rgba(0,0,0,0.95)'
                    }}>
                        {currentLine.text}
                    </p>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '22px' }}>
                        <button
                            onClick={handleNext}
                            style={{
                                background: '#fbbf24',
                                color: '#0f172a',
                                border: 'none',
                                padding: '12px 26px',
                                fontWeight: 800,
                                fontSize: '1rem',
                                borderRadius: '50px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                boxShadow: '0 4px 18px rgba(251, 191, 36, 0.5)'
                            }}
                        >
                            {step < phase.dialogue.length - 1 ? 'SEGÜENT' : 'ENTRAR AL JOC'}
                            <ChevronRight size={18} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CinematicOverlay;
