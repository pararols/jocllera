import React from 'react';
import { Award, Lock, CheckCircle, X, Shield, Zap, TrendingUp, Heart } from 'lucide-react';

const BADGES_LIST = [
    {
        id: 'first_roof',
        name: "Primer Pas",
        desc: "Allibera la teva primera teulada veïnal.",
        icon: <Zap size={32} color="#f1c40f" />,
        check: (state) => state.liberatedCount >= 1
    },
    {
        id: 'pavello',
        name: "Comunitat Activa",
        desc: "Activa la Comunitat Energètica del Pavelló.",
        icon: <TrendingUp size={32} color="#3498db" />,
        check: (state) => state.hasPavello
    },
    {
        id: 'spec_cleared',
        name: "Resistència Activa",
        desc: "Atura el primer projecte o consum especulatiu.",
        icon: <Shield size={32} color="#e74c3c" />,
        check: (state) => state.clearedBadsCount >= 1
    },
    {
        id: 'halfway',
        name: "Mitja Llera Estalviada",
        desc: "Aconsegueix sobirania energètica a la meitat de teulades.",
        icon: <Award size={32} color="#9b59b6" />,
        check: (state) => state.liberatedCount >= Math.ceil(state.totalRooftops / 2)
    },
    {
        id: 'victory_ready',
        name: "Cavaller de la Llera",
        desc: "Allibera totes les teulades del poble de Sant Jordi.",
        icon: <Heart size={32} color="#2ecc71" />,
        check: (state) => state.liberatedCount === state.totalRooftops
    }
];

const BadgesModal = ({ isOpen, onClose, gameState }) => {
    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100dvh',
            backgroundColor: 'rgba(2, 6, 23, 0.90)', zIndex: 120000,
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            backdropFilter: 'blur(8px)', padding: '16px'
        }} className="animate-fade-in">
            <div style={{
                width: '100%', maxWidth: '520px', maxHeight: '92dvh',
                background: '#0f172a',
                padding: '2rem', position: 'relative', display: 'flex', flexDirection: 'column', gap: '1.2rem',
                borderRadius: '20px', border: '1.5px solid rgba(255, 255, 255, 0.2)',
                boxShadow: '0 25px 60px rgba(0,0,0,0.95), 0 0 30px rgba(245, 158, 11, 0.12)',
                color: '#ffffff'
            }}>
                <button 
                    onClick={onClose} 
                    style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.12)', border: 'none', color: '#f8fafc', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                >
                    <X size={20} />
                </button>

                <div style={{ textAlign: 'center' }}>
                    <h2 style={{ fontSize: '1.75rem', margin: '0 0 5px 0', fontWeight: 900, color: '#fbbf24', textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>Insígnies de Resistència</h2>
                    <p style={{ color: '#e2e8f0', fontSize: '0.92rem', margin: 0, fontWeight: 500 }}>El teu progrés recuperant la sobirania local.</p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '52dvh', overflowY: 'auto', paddingRight: '5px' }}>
                    {BADGES_LIST.map((badge) => {
                        const unlocked = badge.check(gameState);
                        return (
                            <div key={badge.id} style={{
                                display: 'flex', alignItems: 'center', gap: '15px',
                                padding: '12px 14px', borderRadius: '12px',
                                backgroundColor: unlocked ? '#1e293b' : 'rgba(30, 41, 59, 0.5)',
                                border: `1px solid ${unlocked ? '#10b981' : 'rgba(255, 255, 255, 0.1)'}`,
                                opacity: unlocked ? 1 : 0.65,
                                transition: 'all 0.3s ease'
                            }}>
                                <div style={{
                                    width: '56px', height: '56px', borderRadius: '50%',
                                    backgroundColor: unlocked ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.3)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    flexShrink: 0, border: unlocked ? '1px solid rgba(255,255,255,0.2)' : 'none'
                                }}>
                                    {unlocked ? badge.icon : <Lock size={24} color="#7f8c8d" />}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <h4 style={{ margin: '0 0 4px 0', fontSize: '1rem', color: unlocked ? '#ffffff' : '#95a5a6' }}>
                                        {badge.name}
                                    </h4>
                                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                                        {badge.desc}
                                    </p>
                                </div>
                                {unlocked && <CheckCircle size={20} color="#2ecc71" />}
                            </div>
                        );
                    })}
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1rem' }}>
                    <button className="btn btn-primary" onClick={onClose} style={{ padding: '0.5rem 2rem' }}>
                        Tancar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BadgesModal;
