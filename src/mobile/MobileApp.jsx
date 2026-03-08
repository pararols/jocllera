import React, { useState } from 'react';
import { Target, Activity, Settings, Map as MapIcon, ShieldAlert } from 'lucide-react';
import MobileGameMap from './MobileGameMap';

// Minigames
import ConnectTheDots from '../components/minigames/ConnectTheDots';
import SliderBalance from '../components/minigames/SliderBalance';
import HeatPumpHarmony from '../components/minigames/HeatPumpHarmony';
import HeatHazeSabotage from '../components/minigames/HeatHazeSabotage';
import MobileAquiferDefense from './minigames/MobileAquiferDefense';
import EvaporationRace from '../components/minigames/EvaporationRace';
import AturemPlater from '../components/minigames/AturemPlater';
import RhythmGame from '../components/minigames/RhythmGame';
import CommunityEnergy from '../components/minigames/CommunityEnergy';
import MobilePavelloTycoon from './minigames/MobilePavelloTycoon';

import CinematicOverlay from '../components/CinematicOverlay';
import MusicPlayer from '../components/MusicPlayer';
import WelcomeScreen from '../components/WelcomeScreen';
import { NARRATIVE_PHASES } from '../data/narrative_content';
import gisData from '../data/gis_data.json';

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
        calculateStats
    } = props;

    // Bottom Sheet Navigation State
    const [activeTab, setActiveTab] = useState('map'); // map, resources, actions

    const totalRooftopNodes = gisData.installations.filter(i => i.type === 'rooftop').length;
    const stats = calculateStats(liberatedNodes);

    return (
        <div className="mobile-app-container" style={{ display: 'flex', flexDirection: 'column', height: '100dvh', width: '100vw', overflow: 'hidden', backgroundColor: '#ecf0f1' }}>

            {/* TOP HEADER */}
            <header style={{ height: '60px', backgroundColor: '#fff', display: 'flex', justifyContent: 'center', alignItems: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.1)', zIndex: 10 }}>
                <h1 style={{ fontSize: '1.2rem', margin: 0, color: '#2c3e50', fontWeight: 'bold' }}>La Llera Viva</h1>
            </header>

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
                    />
                )}

                {activeTab === 'resources' && (
                    <div style={{ padding: '20px', height: '100%', overflowY: 'auto' }}>
                        <h2 style={{ fontSize: '1.4rem', marginBottom: '20px' }}>Els Teus Recursos</h2>

                        <div style={{ backgroundColor: 'white', padding: '15px', borderRadius: '12px', marginBottom: '15px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <strong style={{ color: '#2ecc71' }}>Estalvi (€)</strong>
                                <span>{Math.round(stats.currentMoney).toLocaleString()} / {Math.round(stats.maxMoney).toLocaleString()} €</span>
                            </div>
                            <div style={{ width: '100%', height: '8px', backgroundColor: '#ecf0f1', borderRadius: '4px' }}>
                                <div style={{ width: `${(stats.currentMoney / stats.maxMoney) * 100}%`, height: '100%', backgroundColor: '#2ecc71', borderRadius: '4px' }}></div>
                            </div>
                        </div>

                        <div style={{ backgroundColor: 'white', padding: '15px', borderRadius: '12px', marginBottom: '15px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <strong style={{ color: '#3498db' }}>CO2 Evitat (kg)</strong>
                                <span>{Math.round(stats.currentCO2).toLocaleString()} / {Math.round(stats.maxCO2).toLocaleString()} kg</span>
                            </div>
                            <div style={{ width: '100%', height: '8px', backgroundColor: '#ecf0f1', borderRadius: '4px' }}>
                                <div style={{ width: `${(stats.currentCO2 / stats.maxCO2) * 100}%`, height: '100%', backgroundColor: '#3498db', borderRadius: '4px' }}></div>
                            </div>
                        </div>

                        <div style={{ backgroundColor: '#fcf3cf', padding: '15px', borderRadius: '12px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <strong style={{ color: '#e67e22', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    <ShieldAlert size={18} /> Amenaça Especulativa
                                </strong>
                                <span style={{ fontWeight: 'bold', fontSize: '1.2rem', color: '#e74c3c' }}>{Math.round(corruptionLevel)}%</span>
                            </div>
                            <p style={{ fontSize: '0.85rem', color: '#7f8c8d', marginTop: '10px' }}>Atura els especuladors o el poble perdrà.</p>
                        </div>
                    </div>
                )}
            </main>

            {/* FINAL PHASE BUTTON */}
            {liberatedNodes.size === totalRooftopNodes && !activeMiniGame && (
                <div style={{ position: 'absolute', bottom: '80px', left: '0', right: '0', padding: '0 20px', zIndex: 100 }}>
                    <button
                        onClick={() => setActiveMiniGame('aturemPlater')}
                        style={{
                            width: '100%', padding: '15px', fontSize: '1.2rem', fontWeight: 'bold',
                            background: 'linear-gradient(135deg, #2ecc71 0%, #27ae60 100%)',
                            color: 'white', border: 'none', borderRadius: '12px',
                            boxShadow: '0 4px 12px rgba(46, 204, 113, 0.4)',
                            cursor: 'pointer'
                        }}
                    >
                        🏁 ATUREM EL PLATER!
                    </button>
                </div>
            )}

            {/* BOTTOM TAB NAVIGATION */}
            <nav style={{ height: '65px', backgroundColor: '#fff', display: 'flex', borderTop: '1px solid #e0e0e0', zIndex: 10 }}>
                <button
                    onClick={() => setActiveTab('map')}
                    style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: 'none', border: 'none', color: activeTab === 'map' ? '#3498db' : '#95a5a6' }}
                >
                    <MapIcon size={24} />
                    <span style={{ fontSize: '0.7rem', marginTop: '4px', fontWeight: activeTab === 'map' ? 'bold' : 'normal' }}>Mapa</span>
                </button>
                <button
                    onClick={() => setActiveTab('resources')}
                    style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: 'none', border: 'none', color: activeTab === 'resources' ? '#3498db' : '#95a5a6' }}
                >
                    <Activity size={24} />
                    <span style={{ fontSize: '0.7rem', marginTop: '4px', fontWeight: activeTab === 'resources' ? 'bold' : 'normal' }}>Recursos</span>
                </button>
            </nav>

            {/* MODALS & OVERLAYS */}
            {showStartModal && (
                <WelcomeScreen
                    onStart={() => {
                        setShowStartModal(false);
                        setShowCinematic(true);
                    }}
                />
            )}
            <MusicPlayer phase={gamePhase} />
            {showCinematic && (
                <CinematicOverlay
                    phase={NARRATIVE_PHASES[gamePhase]}
                    onComplete={() => {
                        setShowCinematic(false);
                        if (gamePhase === 0 && setGamePhase) {
                            setGamePhase(1);
                        }
                    }}
                />
            )}

            {showVictoryModal && (
                <div className="modal-overlay" style={{ padding: '20px' }}>
                    <div className="modal-content victory" style={{ width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
                        <img src="/cinematics/celdoni_peace.png" alt="Victòria" style={{ width: '100%', borderRadius: '12px', marginBottom: '20px' }} />
                        <h2>La Llera és Viva!</h2>
                        <p>Ho has aconseguit! Has connectat tots els punts de resistència.</p>
                        <button onClick={() => window.location.reload()} style={{ width: '100%', padding: '15px' }}>TORNAR A JUGAR</button>
                    </div>
                </div>
            )}

            {/* MINIGAMES LAYER (Z-INDEX 1000) */}
            {activeMiniGame && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100dvh', zIndex: 1000, backgroundColor: '#000' }}>
                    {activeMiniGame === 'connect' && <ConnectTheDots onComplete={() => handleLiberateNode(pendingNode.id)} onClose={() => setActiveMiniGame(null)} targetNode={pendingNode} />}
                    {activeMiniGame === 'slider' && <SliderBalance onComplete={() => handleLiberateNode(pendingNode.id)} onClose={() => setActiveMiniGame(null)} />}
                    {activeMiniGame === 'heatPump' && <HeatPumpHarmony onComplete={() => handleLiberateNode(pendingNode.id)} onClose={() => setActiveMiniGame(null)} />}
                    {activeMiniGame === 'rhythm' && <RhythmGame onComplete={() => handleLiberateNode(pendingNode.id)} onClose={() => setActiveMiniGame(null)} />}
                    {activeMiniGame === 'community' && <CommunityEnergy onComplete={() => handleLiberateNode(pendingNode.id)} onClose={() => setActiveMiniGame(null)} />}
                    {activeMiniGame === 'tycoon' && <MobilePavelloTycoon onComplete={(reward) => { setCo2Bonus(prev => prev + reward); handleLiberateNode(pendingNode.id); }} onClose={() => setActiveMiniGame(null)} />}
                    {activeMiniGame === 'heatHaze' && <HeatHazeSabotage onComplete={() => completeBadNode(pendingNode.id)} onClose={() => setActiveMiniGame(null)} onImpact={handleImpact} />}
                    {activeMiniGame === 'aquifer' && <MobileAquiferDefense onComplete={() => completeBadNode(pendingNode.id)} onClose={() => setActiveMiniGame(null)} onImpact={handleImpact} onPenalty={handlePenalty} />}
                    {activeMiniGame === 'evaporation' && <EvaporationRace onComplete={() => completeBadNode(pendingNode.id)} onClose={() => setActiveMiniGame(null)} onImpact={handleImpact} onPenalty={handlePenalty} />}
                    {activeMiniGame === 'aturemPlater' && <AturemPlater onComplete={() => { setActiveMiniGame(null); setShowVictoryModal(true); }} onClose={() => setActiveMiniGame(null)} />}
                </div>
            )}
        </div>
    );
};

export default MobileApp;
