import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Network, Battery, Activity, Zap, ShieldAlert, Radio, AlertTriangle } from 'lucide-react';
import './App.css';
import GameMap from './components/GameMap';
import ZoneEditor from './components/ZoneEditor';
import CinematicOverlay from './components/CinematicOverlay';
import MusicPlayer from './components/MusicPlayer';
import WelcomeScreen from './components/WelcomeScreen';

// Minigames
import ConnectTheDots from './components/minigames/ConnectTheDots';
import SliderBalance from './components/minigames/SliderBalance';
import HeatPumpHarmony from './components/minigames/HeatPumpHarmony';
import HeatHazeSabotage from './components/minigames/HeatHazeSabotage';
import AquiferDefense from './components/minigames/AquiferDefense';
import EvaporationRace from './components/minigames/EvaporationRace';
import AturemPlater from './components/minigames/AturemPlater';
import RhythmGame from './components/minigames/RhythmGame';
import CommunityEnergy from './components/minigames/CommunityEnergy';
import PavelloTycoon from './components/minigames/PavelloTycoon';
import gisData from './data/gis_data.json';
import { NARRATIVE_PHASES } from './data/narrative_content';
import { EnemySystem } from './logic/EnemySystem';

import salaNovaBg from './assets/sala_nova_interior.png';

function App() {
  const [liberatedNodes, setLiberatedNodes] = useState(new Set());
  const [clearedBads, setClearedBads] = useState(new Set()); // For environmental drains
  const [enemies, setEnemies] = useState([]);
  const [showStartModal, setShowStartModal] = useState(true);
  const [showVictoryModal, setShowVictoryModal] = useState(false);
  const [lastDamageEvent, setLastDamageEvent] = useState(null);
  const [co2Bonus, setCo2Bonus] = useState(0);
  const [speculationPenalty, setSpeculationPenalty] = useState(0);
  const [speculationReduction, setSpeculationReduction] = useState(0);
  const [showEditor, setShowEditor] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [mapType, setMapType] = useState('ortho'); // 'light' or 'ortho'

  // Energy Community Mechanics
  const [communityPower, setCommunityPower] = useState(0);
  const [energyPoints, setEnergyPoints] = useState(50);

  // Mobile HUD Toggle
  const [isMobileHudExpanded, setIsMobileHudExpanded] = useState(false);

  // Narrative State
  const [gamePhase, setGamePhase] = useState(0);
  const [showCinematic, setShowCinematic] = useState(false);
  const [seenPhases, setSeenPhases] = useState(new Set());

  const handleAdminAuth = () => {
    if (isAdmin) {
      setIsAdmin(false);
      setShowEditor(false);
      return;
    }
    const pass = prompt("Entra el codi d'administrador:");
    if (pass === "123456") {
      setIsAdmin(true);
    } else {
      alert("Codi incorrecte!");
    }
  };

  // Calculate total rooftop nodes for the formula
  const totalRooftopNodes = gisData.installations.filter(i => i.type === 'rooftop').length;

  // Calculate Totals for HUD
  // Formula: Power * 1350 * 0.29 (CO2) / 0.18 (Money)
  const calculateStats = (nodesSet) => {
    let currentCO2 = 0;
    let currentMoney = 0;
    let maxCO2 = 0;
    let maxMoney = 0;

    gisData.installations.forEach(inst => {
      if (inst.type !== 'rooftop') return;

      const energy = inst.power * 1350; // kWh/year
      const co2 = energy * 0.29;
      const money = energy * 0.18;

      maxCO2 += co2;
      maxMoney += money;

      if (nodesSet.has(inst.id)) {
        currentCO2 += co2;
        currentMoney += money;
      }
    });

    currentCO2 += co2Bonus; // Add penalties or bonuses from mini-games
    // Ensure we don't drop below 0 for display (optional)
    if (currentCO2 < 0) currentCO2 = 0;

    return { currentCO2, currentMoney, maxCO2, maxMoney };
  };

  const { currentCO2, currentMoney, maxCO2, maxMoney } = calculateStats(liberatedNodes);

  const handleImpact = (value) => {
    setCo2Bonus(prev => prev + value);
  };

  const handlePenalty = (value) => {
    setSpeculationPenalty(prev => prev + value);
  };

  // Corruption starts at 100. Min corruption is 20 (100 - 80).
  // Formula: Current Corruption = (100 - (liberatedNodes.size * (80 / totalRooftopNodes))) + speculationPenalty - speculationReduction
  const corruptionLevel = Math.max(0, Math.min(100, (100 - (liberatedNodes.size * (80 / totalRooftopNodes))) + speculationPenalty - speculationReduction));


  const [activeMiniGame, setActiveMiniGame] = useState(null);
  const [pendingNode, setPendingNode] = useState(null);

  const damageRef = React.useRef({});

  // PHASE MANAGEMENT
  useEffect(() => {
    const nodes = liberatedNodes.size;
    let nextPhase = gamePhase;

    // Phase 4: All nodes
    if (nodes >= totalRooftopNodes) nextPhase = 4;
    // Phase 3: High count (20+)
    else if (nodes >= NARRATIVE_PHASES[3].threshold) nextPhase = 3;
    // Phase 2: Pavello liberated
    else if (liberatedNodes.has('pavello_001')) nextPhase = 2;
    // Phase 1: 3 nodes (Threshold defined in data)
    else if (nodes >= NARRATIVE_PHASES[1].threshold) nextPhase = 1;

    if (nextPhase > gamePhase && !seenPhases.has(nextPhase)) {
      setGamePhase(nextPhase);
      setShowCinematic(true);
      setSeenPhases(prev => new Set(prev).add(nextPhase));
    }
  }, [liberatedNodes, gamePhase, seenPhases, totalRooftopNodes]);

  // Initial Tutorial Phase
  useEffect(() => {
    if (!seenPhases.has(0)) {
      setShowCinematic(true);
      setSeenPhases(new Set([0]));
    }
  }, []);

  // ENEMY LOOP
  useEffect(() => {
    if (liberatedNodes.size === 0) return; // Only spawn if there are targets

    const interval = setInterval(() => {
      if (activeMiniGame || showCinematic) return; // PAUSE MOVEMENT DURING MINIGAMES OR CINEMATICS

      setEnemies(prevEnemies => {
        // 1. Move existing enemies
        let newEnemies = EnemySystem.moveEnemies(prevEnemies);
        let newlyConqueredNodes = new Set();

        // 2. Check for "Conquest" (Reaching target)
        newEnemies = newEnemies.filter(enemy => {
          if (enemy.reachedTarget) {
            const targetInst = gisData.installations.find(i => i.id === enemy.targetId);
            const powerRequired = targetInst ? Math.ceil(targetInst.power) : 1;

            damageRef.current[enemy.targetId] = (damageRef.current[enemy.targetId] || 0) + 1;

            if (damageRef.current[enemy.targetId] >= powerRequired) {
              // Un-liberate the node
              setLiberatedNodes(prevNodes => {
                if (prevNodes.has(enemy.targetId)) {
                  const newSet = new Set(prevNodes);
                  newSet.delete(enemy.targetId);
                  return newSet;
                }
                return prevNodes;
              });
              newlyConqueredNodes.add(enemy.targetId);
              delete damageRef.current[enemy.targetId]; // Reset damage history
              console.log("Node corrupted!", enemy.targetId);

              if (targetInst) {
                setLastDamageEvent({
                  id: Date.now() + Math.random(),
                  lat: targetInst.coordinates[0],
                  lng: targetInst.coordinates[1],
                  text: 'CORROMPUT!',
                  type: 'critical'
                });
              }

            } else {
              console.log(`Enemy impact: ${damageRef.current[enemy.targetId]}/${powerRequired}`);
              if (targetInst) {
                setLastDamageEvent({
                  id: Date.now() + Math.random(),
                  lat: targetInst.coordinates[0],
                  lng: targetInst.coordinates[1],
                  text: `${damageRef.current[enemy.targetId]}/${powerRequired}`,
                  type: 'warning'
                });
              }
            }
            return false; // Enemy disappears after reaching target, regardless of full conquest
          }
          return true;
        });

        // 3. Remove other enemies heading to nodes that were JUST conquered
        if (newlyConqueredNodes.size > 0) {
          newEnemies = newEnemies.filter(enemy => !newlyConqueredNodes.has(enemy.targetId));
        }

        // 4. Spawning Logic (Random chance)
        // Adjust spawn rate slightly: 3% per tick = 3 enemies per 10 seconds approx max to keep up with power requirements
        if (newEnemies.length < 10 && Math.random() < 0.03) {
          const targets = gisData.installations.filter(i => liberatedNodes.has(i.id)).map(i => ({
            id: i.id,
            lat: i.coordinates[0],
            lng: i.coordinates[1]
          }));

          if (targets.length > 0) {
            const newEnemy = EnemySystem.spawnEnemy(Date.now(), null, targets);
            if (newEnemy) newEnemies.push(newEnemy);
          }
        }

        return newEnemies;
      });
    }, 100); // 10 ticks per second

    return () => clearInterval(interval);
  }, [liberatedNodes, activeMiniGame, showCinematic]);

  const handleEnemyClick = (enemyId) => {
    const enemy = enemies.find(e => e.id === enemyId);
    if (!enemy) return;

    // 1. Play Defeat Sound (Web Audio API)
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.1);
    } catch (e) {
      console.warn("Audio Context error", e);
    }

    // 2. Clear enemy
    setEnemies(prev => prev.filter(e => e.id !== enemyId));

    // 3. Floating Text
    setLastDamageEvent({
      id: Date.now() + Math.random(),
      lat: enemy.lat,
      lng: enemy.lng,
      text: 'FORA!',
      type: 'defeat'
    });
  };

  const handleBadNodeClick = (badId, type) => {
    if (clearedBads.has(badId)) return;
    setPendingNode({ id: badId, type });
    if (type === 'estufes_terrasses') {
      setActiveMiniGame('heatHaze');
    } else if (type === 'camp_golf') {
      setActiveMiniGame('aquifer');
    } else if (type === 'piscines_clim') {
      setActiveMiniGame('evaporation');
    } else if (type === 'bomba_calor') {
      setActiveMiniGame('heatPump');
    } else {
      alert("Minijoc en construcció! Properament: " + type);
      setPendingNode(null);
    }
  };

  const handleLiberateNode = (id, power, owner, latlng, containerPoint) => {
    if (liberatedNodes.has(id)) return;

    // Trigger Mini-game based on Type or Power
    const node = gisData.installations.find(i => i.id === id);

    // Store pending node details
    setPendingNode({ id, power, owner, latlng, containerPoint });

    if (node?.id === 'pavello_001') {
      setActiveMiniGame('tycoon');
    } else if (node?.type === 'sala_nova' || node?.type === 'pavello') {
      setActiveMiniGame('community');
    } else if (power < 5) {
      setActiveMiniGame('connect');
    } else if (power >= 5 && power < 10) {
      setActiveMiniGame('slider');
    } else {
      // Larger installations (>= 10kW)
      setActiveMiniGame('rhythm');
    }
  };

  const completeLiberation = (id, reduction = 0) => {
    const newSet = new Set(liberatedNodes);
    newSet.add(id);
    setLiberatedNodes(newSet);
    if (reduction > 0) {
      setSpeculationReduction(prev => prev + reduction);
    }
    setActiveMiniGame(null);
    setPendingNode(null);
  };

  const completeBadNode = (id) => {
    const newBads = new Set(clearedBads);
    newBads.add(id);
    setClearedBads(newBads);
    setActiveMiniGame(null);
    setPendingNode(null);
  };

  return (
    <div className="App">
      {/* ADMIN & DEV TOOLS */}
      <div className="admin-tools" style={{ position: 'fixed', bottom: 20, left: 20, zIndex: 5000, display: 'flex', gap: '10px' }}>
        <button
          onClick={handleAdminAuth}
          style={{
            padding: '8px 12px', background: isAdmin ? '#27ae60' : '#34495e',
            color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer',
            fontSize: '0.8rem', fontWeight: 'bold'
          }}
        >
          {isAdmin ? 'Admin OK' : 'Administrador'}
        </button>

        <button
          onClick={() => setMapType(mapType === 'ortho' ? 'light' : 'ortho')}
          style={{
            padding: '8px 12px', background: '#3498db',
            color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer',
            fontSize: '0.8rem', fontWeight: 'bold'
          }}
        >
          {mapType === 'ortho' ? '🗺️ Mapa Base' : '🛰️ Ortofoto'}
        </button>

        {isAdmin && (
          <>
            <button
              onClick={() => setShowEditor(!showEditor)}
              style={{
                padding: '8px 12px', background: showEditor ? '#e74c3c' : '#34495e',
                color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer',
                fontSize: '0.8rem', fontWeight: 'bold'
              }}
            >
              {showEditor ? 'Tancar Editor GIS' : 'Obrir Editor GIS'}
            </button>

            <button
              onClick={() => setActiveMiniGame('aturemPlater')}
              style={{
                padding: '8px 12px', background: '#f1c40f',
                color: '#2c3e50', border: 'none', borderRadius: '4px', cursor: 'pointer',
                fontSize: '0.8rem', fontWeight: 'bold'
              }}
            >
              🕹️ Aturem el Plater
            </button>
          </>
        )}
      </div>
      {/* ... (Header and HUD remain the same) ... */}

      {/* HUD Header */}
      <header className={`game-header ${isMobileHudExpanded ? 'expanded' : 'collapsed'}`}>
        <div className="header-content">
          <h1 className="header-title">L'Últim Cavaller de la Llera</h1>
          <button
            className="mobile-hud-toggle"
            onClick={() => setIsMobileHudExpanded(!isMobileHudExpanded)}
          >
            {isMobileHudExpanded ? 'Tancar Info ▲' : 'Veure Recursos ▼'}
          </button>
        </div>
      </header>

      {/* RESOURCE HUD (LEFT) */}
      <div className={`resource-hud ${isMobileHudExpanded ? 'expanded' : 'collapsed'}`}>
        <h3 style={{ color: '#e74c3c' }}>📡 Amenaça Especulativa: {Math.round(corruptionLevel)}%</h3>
        <h3>Impacte Comunitari (Anual)</h3>
        {/* ... (Resource content) ... */}
        <div className="resource-item">
          <div className="resource-label">
            <span>Estalvi (€)</span>
            <span>{Math.round(currentMoney).toLocaleString()} / {Math.round(maxMoney).toLocaleString()} €</span>
          </div>
          <div className="resource-bar-container">
            <div
              className="resource-bar bar-money"
              style={{ width: `${(currentMoney / maxMoney) * 100}%` }}
            ></div>
          </div>
        </div>

        <div className="resource-item">
          <div className="resource-label">
            <span>CO2 Evitat (kg)</span>
            <span>{Math.round(currentCO2).toLocaleString()} / {Math.round(maxCO2).toLocaleString()} kg</span>
          </div>
          <div className="resource-bar-container">
            <div
              className="resource-bar bar-co2"
              style={{ width: `${(currentCO2 / maxCO2) * 100}%` }}
            ></div>
          </div>
        </div>
      </div>

      <main style={{ position: 'relative', width: '100%', height: '100%' }}>
        <GameMap
          corruptionLevel={corruptionLevel}
          liberatedNodes={liberatedNodes}
          onLiberateNode={handleLiberateNode}
          enemies={enemies}
          onEnemyClick={handleEnemyClick}
          clearedBads={clearedBads}
          onBadNodeClick={handleBadNodeClick}
          lastDamageEvent={lastDamageEvent}
          isEditorMode={showEditor}
          mapType={mapType}
        >
          {showEditor && <ZoneEditor onClose={() => setShowEditor(false)} />}
        </GameMap>
      </main>

      {/* MINIGAMES OVERLAY (Now Top Level) */}
      {activeMiniGame === 'connect' && (
        <div style={{ position: 'relative', zIndex: 9999 }}>
          {/* Lazy load or direct import if moved to App */}
          <ConnectTheDots
            onComplete={() => completeLiberation(pendingNode.id)}
            onClose={() => setActiveMiniGame(null)}
          />
        </div>
      )}

      {activeMiniGame === 'slider' && (
        <SliderBalance
          onComplete={() => completeLiberation(pendingNode.id)}
          onClose={() => setActiveMiniGame(null)}
        />
      )}

      {activeMiniGame === 'heatPump' && (
        <HeatPumpHarmony
          onComplete={() => completeBadNode(pendingNode.id)}
          onClose={() => setActiveMiniGame(null)}
          onImpact={handleImpact}
        />
      )}

      {activeMiniGame === 'rhythm' && (
        <RhythmGame
          onComplete={() => completeLiberation(pendingNode.id)}
          onClose={() => setActiveMiniGame(null)}
        />
      )}

      {activeMiniGame === 'community' && (
        <CommunityEnergy
          onComplete={(reduction) => completeLiberation(pendingNode.id, reduction)}
          onClose={() => setActiveMiniGame(null)}
          maxPower={pendingNode.power}
          rewardFactor={pendingNode.id === 'pavello_001' ? 70 : 20}
          backgroundOverride={pendingNode.id === 'sala_nova_001' ? salaNovaBg : null}
        />
      )}

      {activeMiniGame === 'tycoon' && (
        <PavelloTycoon
          onComplete={(reduction) => completeLiberation(pendingNode.id, reduction)}
          onClose={() => setActiveMiniGame(null)}
          maxPower={pendingNode.power}
          rewardFactor={70}
        />
      )}

      {activeMiniGame === 'heatHaze' && (
        <HeatHazeSabotage
          onComplete={() => completeBadNode(pendingNode.id)}
          onClose={() => setActiveMiniGame(null)}
          onImpact={handleImpact}
        />
      )}

      {activeMiniGame === 'aquifer' && (
        <AquiferDefense
          onComplete={() => completeBadNode(pendingNode.id)}
          onClose={() => setActiveMiniGame(null)}
          onImpact={handleImpact}
          onPenalty={handlePenalty}
        />
      )}

      {activeMiniGame === 'evaporation' && (
        <EvaporationRace
          onComplete={() => completeBadNode(pendingNode.id)}
          onClose={() => setActiveMiniGame(null)}
          onImpact={handleImpact}
          onPenalty={handlePenalty}
        />
      )}

      {activeMiniGame === 'aturemPlater' && (
        <AturemPlater
          onComplete={() => {
            setActiveMiniGame(null);
            setShowVictoryModal(true);
          }}
          onClose={() => setActiveMiniGame(null)}
        />
      )}

      {/* FINAL PHASE BUTTON */}
      {liberatedNodes.size === totalRooftopNodes && !activeMiniGame && (
        <div style={{
          position: 'absolute', bottom: '120px', left: '50%', transform: 'translateX(-50%)',
          zIndex: 900, textAlign: 'center'
        }}>
          <button
            onClick={() => setActiveMiniGame('aturemPlater')}
            style={{
              padding: '15px 30px', fontSize: '1.2rem', fontWeight: 'bold',
              background: 'linear-gradient(135deg, #2ecc71 0%, #27ae60 100%)',
              color: 'white', border: 'none', borderRadius: '50px',
              boxShadow: '0 8px 16px rgba(46, 204, 113, 0.4)',
              cursor: 'pointer', transition: 'all 0.3s ease',
              animation: 'pulse-green 2s infinite'
            }}
            className="final-phase-btn"
          >
            🏁 ATUREM EL PLATER!
          </button>
          <p style={{
            color: 'white', marginTop: '10px', fontSize: '0.9rem',
            textShadow: '0 2px 4px rgba(0,0,0,0.8)', background: 'rgba(0,0,0,0.5)',
            padding: '4px 12px', borderRadius: '20px'
          }}>
            Recupera el territori definitiu!
          </p>
        </div>
      )}

      {/* NARRATIVE SYSTEM */}
      <MusicPlayer phase={gamePhase} />

      {showCinematic && (
        <CinematicOverlay
          phase={NARRATIVE_PHASES[gamePhase]}
          onComplete={() => setShowCinematic(false)}
        />
      )}

      {/* MODALS & OVERLAYS */}

      {/* START MODAL */}
      {showStartModal && (
        <WelcomeScreen onStart={() => setShowStartModal(false)} />
      )}

      {/* VICTORY MODAL */}
      {showVictoryModal && (
        <div className="modal-overlay">
          <div className="modal-content victory">
            <img
              src="/cinematics/celdoni_peace.png"
              alt="Victòria"
              style={{ width: '100%', maxHeight: '400px', objectFit: 'cover', borderRadius: '12px', marginBottom: '20px', border: '5px solid #f1c40f' }}
            />
            <h2>La Llera és Viva!</h2>
            <p>
              Ho has aconseguit! Has connectat tots els punts de resistència.
            </p>
            <p>
              La malla grisa s'ha trencat i el color ha tornat als carrers de Sant Jordi Desvalls.
              L'especulació s'ha reduït al mínim estructural (20%), però la comunitat està alerta i unida.
            </p>
            <p className="quote">"Que tremolin els gegants, que aquí hi ha poble!"</p>
            <button onClick={() => window.location.reload()}>TORNAR A COMENÇAR</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
