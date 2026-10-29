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
            icon: <Award size={28} color="#a855f7" />,
            title: "5. Fites Clau per a la Victòria",
            color: '#a855f7',
            desc: "• 3 teulades ➔ Assemblea veïnal a la Sala Nova 🏛️\n• Sala Nova lliure ➔ Ofensiva d'excedents al Pavelló 🏟️\n• 85% de teulades ➔ Batalla final: Aturem el Plater 🏁\n• 100% de teulades ➔ Expulsió definitiva dels Homes de Negre!"
        },
        {
            icon: <MousePointer size={28} color="#64748b" />,
            title: "6. Controls del Mapa",
            color: '#64748b',
            desc: "Arrossega per moure't pel municipi. Fes zoom amb la roda del ratolí, doble clic o pessigant la pantalla al mòbil. Pots alternar entre vista satèl·lit i mapa base amb el botó inferior."
        }
    ];

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            backgroundColor: 'rgba(2, 6, 23, 0.82)', zIndex: 12000,
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            backdropFilter: 'blur(6px)', padding: '16px'
        }} className="animate-fade-in">
            <div className="glass-panel" style={{
                width: '100%', maxWidth: '640px', maxHeight: '90vh',
                padding: '2rem', position: 'relative', display: 'flex',
                flexDirection: 'column', gap: '1.2rem', borderRadius: '20px',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                boxShadow: '0 20px 50px rgba(0,0,0,0.6)'
            }}>
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute', top: 16, right: 16,
                        background: 'rgba(255,255,255,0.08)', border: 'none',
                        color: '#cbd5e1', cursor: 'pointer', borderRadius: '50%',
                        width: '36px', height: '36px', display: 'flex',
                        alignItems: 'center', justifyContent: 'center'
                    }}
                >
                    <X size={20} />
                </button>

                <div style={{ textAlign: 'center', paddingRight: '20px' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#f1c40f', marginBottom: '6px' }}>
                        <BookOpen size={24} />
                        <span style={{ fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>
                            Guia de Resistència Veïnal
                        </span>
                    </div>
                    <h2 className="text-gradient" style={{ fontSize: '1.75rem', margin: 0, fontWeight: 900 }}>
                        Regles del Joc
                    </h2>
                    <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: '4px 0 0 0' }}>
                        Tot el que necessites saber per defensar Sant Jordi Desvalls i guanyar la partida.
                    </p>
                </div>

                <div style={{
                    display: 'flex', flexDirection: 'column', gap: '12px',
                    overflowY: 'auto', paddingRight: '6px', maxHeight: '52vh'
                }}>
                    {rules.map((rule, idx) => (
                        <div key={idx} style={{
                            background: 'rgba(15, 23, 42, 0.75)',
                            border: `1px solid ${rule.color}33`,
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
                                <span style={{ color: '#e2e8f0', fontSize: '0.85rem', lineHeight: 1.5, whiteSpace: 'pre-line' }}>
                                    {rule.desc}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '4px' }}>
                    <button
                        onClick={onClose}
                        className="btn btn-primary"
                        style={{
                            padding: '12px 32px', fontSize: '1rem', fontWeight: 800,
                            borderRadius: '12px', width: '100%'
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
