import React from 'react';
import { X, BookOpen, Zap, ShieldAlert, Users, Target, MousePointer, Award } from 'lucide-react';

const RulesModal = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    const rules = [
        {
            icon: <Target size={28} color="#10b981" />,
            title: "1. L'Objectiu Principal",
            color: '#10b981',
            desc: "L'especulació d'El Plater amenaça de cobrir el terme amb formigó i vidre. L'amenaça comença al 100%: cada teulada alliberada la redueix, acumulant estalvi econòmic per al poble i tones de CO₂ evitades."
        },
        {
            icon: <Zap size={28} color="#f59e0b" />,
            title: "2. Com Alliberar Teulades",
            color: '#f59e0b',
            desc: "Fes clic a les teulades amenaçades (punts vermells i taronges al mapa) per obrir el seu minijoc solar (Connectar circuits, Regular inversor o Equilibrar xarxa). En superar-lo, la teulada serà lliure (verda)!"
        },
        {
            icon: <Users size={28} color="#38bdf8" />,
            title: "3. L'Ona de Contagi Veïnal (180 m)",
            color: '#38bdf8',
            desc: "Quan alliberes una teulada, l'entusiasme s'escampa: s'activa una ona circular que allibera automàticament totes les teulades veïnes en un radi de 180 metres!"
        },
        {
            icon: <ShieldAlert size={28} color="#ef4444" />,
            title: "4. Alerta: Els Homes de Negre!",
            color: '#ef4444',
            desc: "Agents de l'especulació caminen cap a les teulades lliures per drenar-ne els kW. Fes clic ràpidament sobre l'Home de Negre per expulsar-lo abans que privatitzi la instal·lació!"
        },
        {
            icon: <Award size={28} color="#c084fc" />,
            title: "5. Fites Clau per a la Victòria",
            color: '#c084fc',
            desc: "• 3 teulades ➔ Assemblea veïnal a la Sala Nova 🏛️\n• Sala Nova lliure ➔ Ofensiva d'excedents al Pavelló 🏟️\n• 85% de teulades ➔ Batalla final: Aturem el Plater 🏁\n• 100% de teulades ➔ Expulsió definitiva dels Homes de Negre!"
        },
        {
            icon: <MousePointer size={28} color="#94a3b8" />,
            title: "6. Controls del Mapa",
            color: '#94a3b8',
            desc: "Arrossega per moure't pel municipi. Fes zoom amb la roda del ratolí, doble clic o pessigant la pantalla al mòbil. Pots alternar entre vista satèl·lit i mapa base amb el botó inferior."
        }
    ];

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100dvh',
            backgroundColor: 'rgba(2, 6, 23, 0.90)', zIndex: 120000,
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            backdropFilter: 'blur(8px)', padding: '16px'
        }} className="animate-fade-in">
            <div style={{
                width: '100%', maxWidth: '640px', maxHeight: '92dvh',
                background: '#0f172a',
                padding: '2rem', position: 'relative', display: 'flex',
                flexDirection: 'column', gap: '1.2rem', borderRadius: '20px',
                border: '1.5px solid rgba(255, 255, 255, 0.2)',
                boxShadow: '0 25px 60px rgba(0,0,0,0.95), 0 0 30px rgba(245, 158, 11, 0.12)',
                color: '#ffffff'
            }}>
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute', top: 16, right: 16,
                        background: 'rgba(255,255,255,0.12)', border: 'none',
                        color: '#f8fafc', cursor: 'pointer', borderRadius: '50%',
                        width: '36px', height: '36px', display: 'flex',
                        alignItems: 'center', justifyContent: 'center'
                    }}
                >
                    <X size={20} />
                </button>

                <div style={{ textAlign: 'center', paddingRight: '20px' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#fbbf24', marginBottom: '6px' }}>
                        <BookOpen size={24} />
                        <span style={{ fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>
                            Guia de Resistència Veïnal
                        </span>
                    </div>
                    <h2 style={{ fontSize: '1.75rem', margin: 0, fontWeight: 900, color: '#fbbf24', textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>
                        Regles del Joc
                    </h2>
                    <p style={{ color: '#e2e8f0', fontSize: '0.92rem', margin: '6px 0 0 0', fontWeight: 500 }}>
                        Tot el que necessites saber per defensar Sant Jordi Desvalls i guanyar la partida.
                    </p>
                </div>

                <div style={{
                    display: 'flex', flexDirection: 'column', gap: '12px',
                    overflowY: 'auto', paddingRight: '6px', maxHeight: '54dvh'
                }}>
                    {rules.map((rule, idx) => (
                        <div key={idx} style={{
                            background: '#1e293b',
                            border: `1px solid ${rule.color}44`,
                            borderLeft: `4px solid ${rule.color}`,
                            borderRadius: '12px',
                            padding: '12px 16px',
                            display: 'flex',
                            gap: '14px',
                            alignItems: 'flex-start'
                        }}>
                            <div style={{ flexShrink: 0, marginTop: '2px' }}>
                                {rule.icon}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <span style={{ fontWeight: 800, color: rule.color, fontSize: '0.95rem' }}>
                                    {rule.title}
                                </span>
                                <span style={{ color: '#f8fafc', fontSize: '0.88rem', lineHeight: 1.5, whiteSpace: 'pre-line', fontWeight: 400 }}>
                                    {rule.desc}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '4px' }}>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '12px 32px', fontSize: '1rem', fontWeight: 800,
                            borderRadius: '12px', width: '100%',
                            backgroundColor: '#fbbf24', color: '#0f172a',
                            border: 'none', cursor: 'pointer',
                            boxShadow: '0 4px 15px rgba(251, 191, 36, 0.45)'
                        }}
                    >
                        Entès, a defensar la Llera! ✊
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RulesModal;
