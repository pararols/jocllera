import React, { useState } from 'react';
import { Target, Activity, Settings, Map as MapIcon, ShieldAlert, MapPin, BarChart2, Compass, Award } from 'lucide-react';
import MobileGameMap from './MobileGameMap';

// Minigames
import ConnectTheDots from '../components/minigames/ConnectTheDots';
import MobileSliderBalance from './minigames/MobileSliderBalance';
import MobileHeatPumpHarmony from './minigames/MobileHeatPumpHarmony';
import MobileHeatHazeSabotage from './minigames/MobileHeatHazeSabotage';
import MobileAquiferDefense from './minigames/MobileAquiferDefense';
import MobileEvaporationRace from './minigames/MobileEvaporationRace';
import MobileAturemPlater from './minigames/MobileAturemPlater';
import RhythmGame from '../components/minigames/RhythmGame';
import CommunityEnergy from '../components/minigames/CommunityEnergy';
import MobilePavelloTycoon from './minigames/MobilePavelloTycoon';
import QuizSobirania from '../components/minigames/QuizSobirania';
import BalanceEnergetic from '../components/minigames/BalanceEnergetic';

import CinematicOverlay from '../components/CinematicOverlay';
import MusicPlayer from '../components/MusicPlayer';
import WelcomeScreen from '../components/WelcomeScreen';
import BadgesModal from '../components/BadgesModal';
import { NARRATIVE_PHASES } from '../data/narrative_content';
import gisData from '../data/gis_data.json';
const salaNovaBg = '/assets/sala_nova_interior.png';

const MobileApp = (props) => {
    const {
        liberatedNodes,
        clearedBads,
        enemies,
        showStartModal,
        setShowStartModal,
        showVictoryModal,
        setShowVictoryModal,
        lastDamageEvent,
        co2Bonus,
        gamePhase,
        setGamePhase,
        showCinematic,
        setShowCinematic,
        activeMiniGame,
        setActiveMiniGame,
        pendingNode,
        setPendingNode,
        corruptionLevel,
        handleLiberateNode,
        handleEnemyClick,
        handleBadNodeClick,
        handleImpact,
        handlePenalty,
        completeBadNode,
        calculateStats,
        completeLiberation,
        mapType,
        setMapType,
        currentMission,
        onResetGame,
        onStartGame,
        contagionToast,
        setContagionToast,
        contagionWave
    } = props;

    // Bottom Sheet Navigation State
    const [activeTab, setActiveTab] = useState('map'); // map, resources
    const [showBadges, setShowBadges] = useState(false);

    const totalRooftopNodes = gisData.installations.filter(i => i.type === 'rooftop').length;
    const liberatedRooftopsCount = Array.from(liberatedNodes).filter(id => {
        const inst = gisData.installations.find(i => i.id === id);
        return inst && inst.type === 'rooftop';
    }).length;
    const canAturarPlater = liberatedRooftopsCount >= Math.ceil(totalRooftopNodes * 0.85) && liberatedNodes.has('sala_nova_001') && liberatedNodes.has('pavello_001');
    const stats = calculateStats(liberatedNodes);

    return (
        <div className="mobile-app-container" style={{ display: 'flex', flexDirection: 'column', height: '100dvh', width: '100vw', overflow: 'hidden', backgroundColor: '#f8fafc' }}>

            {/* TOP HEADER */}
            <header style={{ height: '54px', backgroundColor: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 16px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', zIndex: 10 }}>
                <h1 style={{ fontSize: '1.1rem', margin: 0, color: '#1e293b', fontWeight: 'bold' }}>La Llera Viva</h1>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                        Teulades: <strong style={{ color: '#10b981' }}>{liberatedRooftopsCount}/{totalRooftopNodes}</strong>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                        Amenaça: <strong style={{ color: '#ef4444' }}>{Math.round(corruptionLevel)}%</strong>
                    </div>
                </div>
            </header>

            {/* MISSION SUB-BAR */}
            {currentMission && (
                <div style={{ backgroundColor: '#0f172a', color: '#e2e8f0', padding: '6px 14px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '6px', zIndex: 9 }}>
                    <Compass size={14} color="#38bdf8" style={{ flexShrink: 0 }} />
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{currentMission}</span>
                </div>
            )}

            {/* CONTAGI VEÏNAL TOAST BANNER (MOBILE) */}
            {contagionToast && (
                <div style={{
                    position: 'fixed',
                    top: '60px',
                    left: '12px',
                    right: '12px',
                    zIndex: 10000,
                    backgroundColor: '#064e3b',
                    border: '2px solid #10b981',
                    borderRadius: '12px',
                    padding: '10px 14px',
                    color: '#ecfdf5',
                    boxShadow: '0 8px 24px rgba(16, 185, 129, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    pointerEvents: 'auto'
                }}>
                    <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor: '#10b981',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '18px',
                        flexShrink: 0
                    }}>
                        ⚡
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                        <span style={{ fontSize: '0.72rem', color: '#6ee7b7', fontWeight: 800, textTransform: 'uppercase' }}>
                            Contagi Comunitari (180m)
                        </span>
                        <span style={{ fontSize: '0.84rem', color: '#ffffff', fontWeight: 600 }}>
                            {contagionToast.message}
                        </span>
                    </div>
                    <button
                        onClick={() => setContagionToast && setContagionToast(null)}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: '#a7f3d0',
                            fontSize: '20px',
                            cursor: 'pointer',
                            padding: '0 4px',
                            fontWeight: 'bold'
                        }}
                    >
                        ×
                    </button>
                </div>
            )}

            {/* MAIN CONTENT AREA */}
            <main style={{ flex: 1, position: 'relative' }}>
                {activeTab === 'map' && (
                    <MobileGameMap
                        corruptionLevel={corruptionLevel}
                        liberatedNodes={liberatedNodes}
                        onLiberateNode={handleLiberateNode}
                        enemies={enemies}
                        onEnemyClick={handleEnemyClick}
                        clearedBads={clearedBads}
                        onBadNodeClick={handleBadNodeClick}
                        lastDamageEvent={lastDamageEvent}
                        mapType={mapType}
                        setMapType={setMapType}
                        totalRooftopNodes={totalRooftopNodes}
                        contagionWave={contagionWave}
                        nodePowers={props.nodePowers}
                    />
                )}

                {activeTab === 'resources' && (
                    <div style={{ padding: '20px', height: '100%', overflowY: 'auto' }}>
                        <h2 style={{ fontSize: '1.3rem', marginBottom: '16px', color: '#1e293b' }}>Els Teus Recursos</h2>

                        <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '12px', marginBottom: '12px', boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <strong style={{ color: '#10b981' }}>Estalvi (€)</strong>
                                <span style={{ fontWeight: 'bold' }}>{Math.round(stats.currentMoney).toLocaleString()} / {Math.round(stats.maxMoney).toLocaleString()} €</span>
                            </div>
                            <div style={{ width: '100%', height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px' }}>
                                <div style={{ width: `${Math.min(100, (stats.currentMoney / (stats.maxMoney || 1)) * 100)}%`, height: '100%', backgroundColor: '#10b981', borderRadius: '4px' }}></div>
                            </div>
                        </div>

                        <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '12px', marginBottom: '12px', boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <strong style={{ color: '#3b82f6' }}>CO2 Evitat (kg)</strong>
                                <span style={{ fontWeight: 'bold' }}>{Math.round(stats.currentCO2).toLocaleString()} / {Math.round(stats.maxCO2).toLocaleString()} kg</span>
                            </div>
                            <div style={{ width: '100%', height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px' }}>
                                <div style={{ width: `${Math.min(100, (stats.currentCO2 / (stats.maxCO2 || 1)) * 100)}%`, height: '100%', backgroundColor: '#3b82f6', borderRadius: '4px' }}></div>
                            </div>
                        </div>

                        <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fef3c7', padding: '16px', borderRadius: '12px', marginBottom: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <strong style={{ color: '#d97706', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <ShieldAlert size={18} /> Amenaça Especulativa
                                </strong>
                                <span style={{ fontWeight: 'bold', fontSize: '1.2rem', color: '#dc2626' }}>{Math.round(corruptionLevel)}%</span>
                            </div>
                            <p style={{ fontSize: '0.85rem', color: '#78716c', margin: '8px 0 0 0' }}>Expulsa els 'Homes de Negre' fent-hi clic per protegir el poble.</p>
                        </div>

                        <button 
                            onClick={() => setShowBadges(true)}
                            style={{ 
                                width: '100%', padding: '14px', borderRadius: '12px',
                                backgroundColor: '#1e293b', color: 'white', border: 'none', fontWeight: 'bold',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                boxShadow: '0 4px 10px rgba(0,0,0,0.15)', cursor: 'pointer'
                            }}
                        >
                            <Award size={20} color="#facc15" /> Veure Insígnies de la Resistència
                        </button>
                    </div>
                )}
            </main>

            {/* FINAL PHASE BUTTON */}
            {canAturarPlater && !activeMiniGame && (
                <div style={{ position: 'absolute', bottom: '75px', left: '0', right: '0', padding: '0 16px', zIndex: 100 }}>
                    <button
                        onClick={() => setActiveMiniGame('aturemPlater')}
                        style={{
                            width: '100%', padding: '14px', fontSize: '1.15rem', fontWeight: 'bold',
                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            color: 'white', border: 'none', borderRadius: '12px',
                            boxShadow: '0 4px 14px rgba(16, 185, 129, 0.45)',
                            cursor: 'pointer'
                        }}
                    >
                        🏁 ATUREM EL PLATER!
                    </button>
                </div>
            )}

            {/* BOTTOM TAB NAVIGATION */}
            <nav style={{ height: '60px', backgroundColor: '#fff', display: 'flex', borderTop: '1px solid #e2e8f0', zIndex: 10 }}>
                <button
                    onClick={() => setActiveTab('map')}
                    style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: 'none', border: 'none', color: activeTab === 'map' ? '#2563eb' : '#94a3b8', cursor: 'pointer' }}
                >
                    <MapIcon size={22} />
                    <span style={{ fontSize: '0.72rem', marginTop: '3px', fontWeight: activeTab === 'map' ? 'bold' : 'normal' }}>Mapa</span>
                </button>
                <button
                    onClick={() => setActiveTab('resources')}
                    style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: 'none', border: 'none', color: activeTab === 'resources' ? '#2563eb' : '#94a3b8', cursor: 'pointer' }}
                >
                    <Activity size={22} />
                    <span style={{ fontSize: '0.72rem', marginTop: '3px', fontWeight: activeTab === 'resources' ? 'bold' : 'normal' }}>Recursos</span>
                </button>
            </nav>

            {/* MODALS & OVERLAYS */}
            {showStartModal && (
                <WelcomeScreen
                    onStart={onStartGame || (() => {
                        setShowStartModal(false);
                        setShowCinematic(true);
                    })}
                    onReset={onResetGame}
                    savedProgressCount={liberatedNodes.size}
                />
            )}
            
            <MusicPlayer phase={gamePhase} />

            {showCinematic && (
                <CinematicOverlay
                    phase={NARRATIVE_PHASES[gamePhase]}
                    onComplete={() => {
                        setShowCinematic(false);
                    }}
                />
            )}

            {showVictoryModal && (
                <div className="modal-overlay" style={{ padding: '16px', zIndex: 100000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="modal-content victory" style={{ width: '100%', maxWidth: '420px', maxHeight: '90vh', overflowY: 'auto', textAlign: 'center', padding: '20px', borderRadius: '20px', border: '2px solid rgba(16, 185, 129, 0.6)' }}>
                        <img src="/cinematics/celdoni_peace.png" alt="Victòria" style={{ width: '100%', maxHeight: '160px', objectFit: 'cover', borderRadius: '14px', marginBottom: '12px' }} />
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '16px', backgroundColor: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', color: '#10b981', fontWeight: 800, fontSize: '0.75rem', marginBottom: '8px', textTransform: 'uppercase' }}>
                            🏆 Victòria Comunitària Total
                        </div>
                        <h2 style={{ color: '#10b981', margin: '0 0 8px 0', fontSize: '1.6rem', fontWeight: 900 }}>La Llera és Viva!</h2>
                        <p style={{ margin: '0 0 16px 0', fontSize: '0.9rem', color: '#475569', lineHeight: 1.5 }}>
                            Has aturat el macroprojecte especulatiu del Plater i alliberat totes les teulades! El Ter, els boscos i els camps estan salvats.
                        </p>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '16px' }}>
                            <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                                <div style={{ fontSize: '1.2rem' }}>⚡</div>
                                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Teulades</div>
                                <div style={{ fontWeight: 800, color: '#10b981', fontSize: '0.9rem' }}>{liberatedRooftopsCount}/{totalRooftopNodes}</div>
                            </div>
                            <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                                <div style={{ fontSize: '1.2rem' }}>🛡️</div>
                                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Homes de Negre</div>
                                <div style={{ fontWeight: 800, color: '#10b981', fontSize: '0.9rem' }}>Foragitats</div>
                            </div>
                            <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                                <div style={{ fontSize: '1.2rem' }}>🌳</div>
                                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>El Plater</div>
                                <div style={{ fontWeight: 800, color: '#10b981', fontSize: '0.9rem' }}>Salvat</div>
                            </div>
                            <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                                <div style={{ fontSize: '1.2rem' }}>💶</div>
                                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Estalvi</div>
                                <div style={{ fontWeight: 800, color: '#f59e0b', fontSize: '0.9rem' }}>{Math.round(currentMoney).toLocaleString()}€</div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <button
                                onClick={() => setShowVictoryModal(false)}
                                style={{
                                    width: '100%', padding: '12px', borderRadius: '10px', border: 'none',
                                    backgroundColor: '#10b981', color: 'white', fontWeight: 'bold', fontSize: '0.95rem',
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                                }}
                            >
                                🗺️ Explorar el Municipi en Pau
                            </button>
                            <button
                                onClick={onResetGame}
                                style={{
                                    width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #cbd5e1',
                                    backgroundColor: 'transparent', color: '#64748b', fontWeight: '600', fontSize: '0.85rem',
                                    cursor: 'pointer'
                                }}
                            >
                                🔄 Tornar a Jugar de Zero
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MINIGAMES LAYER */}
            {activeMiniGame && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100dvh', zIndex: 99999, backgroundColor: '#000' }}>
                    {activeMiniGame === 'connect' && <ConnectTheDots onComplete={() => completeLiberation(pendingNode?.id)} onClose={() => setActiveMiniGame(null)} targetNode={pendingNode} />}
                    {activeMiniGame === 'slider' && <MobileSliderBalance onComplete={() => completeLiberation(pendingNode?.id)} onClose={() => setActiveMiniGame(null)} />}
                    {activeMiniGame === 'heatPump' && <MobileHeatPumpHarmony onComplete={() => completeBadNode(pendingNode?.id)} onClose={() => setActiveMiniGame(null)} onImpact={handleImpact} />}
                    {activeMiniGame === 'rhythm' && <RhythmGame onComplete={() => completeLiberation(pendingNode?.id)} onClose={() => setActiveMiniGame(null)} />}
                    {activeMiniGame === 'community' && <CommunityEnergy onComplete={(reward) => completeLiberation(pendingNode?.id, reward)} onClose={() => setActiveMiniGame(null)} maxPower={pendingNode?.power} rewardFactor={20} backgroundOverride={pendingNode?.id === 'sala_nova_001' ? salaNovaBg : null} />}
                    {activeMiniGame === 'tycoon' && <MobilePavelloTycoon onComplete={(reward) => completeLiberation(pendingNode?.id, reward || 70)} onClose={() => setActiveMiniGame(null)} maxPower={pendingNode?.power} rewardFactor={70} />}
                    {activeMiniGame === 'quiz' && <QuizSobirania onComplete={() => completeLiberation(pendingNode?.id)} onClose={() => setActiveMiniGame(null)} />}
                    {activeMiniGame === 'balance' && <BalanceEnergetic onComplete={() => completeLiberation(pendingNode?.id)} onClose={() => setActiveMiniGame(null)} />}
                    {activeMiniGame === 'heatHaze' && <MobileHeatHazeSabotage onComplete={() => completeBadNode(pendingNode?.id)} onClose={() => setActiveMiniGame(null)} onImpact={handleImpact} />}
                    {activeMiniGame === 'aquifer' && <MobileAquiferDefense onComplete={() => completeBadNode(pendingNode?.id)} onClose={() => setActiveMiniGame(null)} onImpact={handleImpact} onPenalty={handlePenalty} />}
                    {activeMiniGame === 'evaporation' && <MobileEvaporationRace onComplete={() => completeBadNode(pendingNode?.id)} onClose={() => setActiveMiniGame(null)} onImpact={handleImpact} onPenalty={handlePenalty} />}
                    {activeMiniGame === 'aturemPlater' && <MobileAturemPlater onComplete={() => { setActiveMiniGame(null); setShowVictoryModal(true); }} onClose={() => setActiveMiniGame(null)} />}
                </div>
            )}

            <BadgesModal 
                isOpen={showBadges} 
                onClose={() => setShowBadges(false)} 
                gameState={{
                    liberatedCount: liberatedNodes.size,
                    hasPavello: liberatedNodes.has('pavello_001'),
                    clearedBadsCount: clearedBads.size,
                    totalRooftops: totalRooftopNodes
                }} 
            />
        </div>
    );
};

export default MobileApp;
