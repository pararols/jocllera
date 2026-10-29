import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Network, Battery, Activity, Zap, ShieldAlert, Radio, AlertTriangle, Compass, Award, BookOpen } from 'lucide-react';
import GameMap from './components/GameMap';
import ZoneEditor from './components/ZoneEditor';
import CinematicOverlay from './components/CinematicOverlay';
import MusicPlayer from './components/MusicPlayer';
import WelcomeScreen from './components/WelcomeScreen';
import MobileApp from './mobile/MobileApp';
import BadgesModal from './components/BadgesModal';
import RulesModal from './components/RulesModal';

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
import QuizSobirania from './components/minigames/QuizSobirania';
import BalanceEnergetic from './components/minigames/BalanceEnergetic';
import gisData from './data/gis_data.json';
import { NARRATIVE_PHASES } from './data/narrative_content';
import { EnemySystem } from './logic/EnemySystem';
import SoundManager from './logic/SoundManager';
import { REWARDS } from './data/rewards';

const salaNovaBg = '/assets/sala_nova_interior.png';

function App() {
  // Local storage state
  const [liberatedNodes, setLiberatedNodes] = useState(() => {
    const saved = localStorage.getItem('llera_liberatedNodes');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  const [clearedBads, setClearedBads] = useState(() => {
    const saved = localStorage.getItem('llera_clearedBads');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  const [seenPhases, setSeenPhases] = useState(() => {
    const saved = localStorage.getItem('llera_seenPhases');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  const [co2Bonus, setCo2Bonus] = useState(() => Number(localStorage.getItem('llera_co2Bonus')) || 0);
  const [speculationPenalty, setSpeculationPenalty] = useState(() => Number(localStorage.getItem('llera_speculationPenalty')) || 0);
  const [speculationReduction, setSpeculationReduction] = useState(() => Number(localStorage.getItem('llera_speculationReduction')) || 0);
  const [gamePhase, setGamePhase] = useState(() => Number(localStorage.getItem('llera_gamePhase')) || 0);

  // Persistence
  useEffect(() => localStorage.setItem('llera_liberatedNodes', JSON.stringify(Array.from(liberatedNodes))), [liberatedNodes]);
  useEffect(() => localStorage.setItem('llera_clearedBads', JSON.stringify(Array.from(clearedBads))), [clearedBads]);
  useEffect(() => localStorage.setItem('llera_seenPhases', JSON.stringify(Array.from(seenPhases))), [seenPhases]);
  useEffect(() => localStorage.setItem('llera_co2Bonus', co2Bonus.toString()), [co2Bonus]);
  useEffect(() => localStorage.setItem('llera_speculationPenalty', speculationPenalty.toString()), [speculationPenalty]);
  useEffect(() => localStorage.setItem('llera_speculationReduction', speculationReduction.toString()), [speculationReduction]);
  useEffect(() => localStorage.setItem('llera_gamePhase', gamePhase.toString()), [gamePhase]);

  // Current power per rooftop/community node (dynamically drained by Homes de Negre)
  const [nodePowers, setNodePowers] = useState(() => {
    const saved = localStorage.getItem('llera_nodePowers');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    const initial = {};
    gisData.installations.forEach(inst => {
      initial[inst.id] = inst.power;
    });
    return initial;
  });

  const nodePowersRef = useRef(nodePowers);
  useEffect(() => {
    nodePowersRef.current = nodePowers;
  }, [nodePowers]);

  useEffect(() => {
    localStorage.setItem('llera_nodePowers', JSON.stringify(nodePowers));
  }, [nodePowers]);

  // Load custom coords from editor if previously moved
  useEffect(() => {
    try {
      const saved = localStorage.getItem('llera_custom_coords');
      if (saved) {
        const coordsMap = JSON.parse(saved);
        // Clean out legacy overlapping bads if present in user's localStorage
        delete coordsMap['bad-1771899256524'];
        delete coordsMap['bad-1771899265388'];
        localStorage.setItem('llera_custom_coords', JSON.stringify(coordsMap));

        Object.entries(coordsMap).forEach(([id, coords]) => {
          if (!Array.isArray(coords) || coords.length < 2) return;
          const inst = gisData.installations?.find(i => i.id === id || ((id === 'pavello' || id === 'sala_nova') && i.type === id));
          if (inst) inst.coordinates = coords;
          const bad = gisData.environmentalBads?.find(b => b.id === id);
          if (bad) bad.coordinates = coords;
        });
      }
    } catch (e) {
      console.error('Error loading custom coords:', e);
    }
  }, []);

  const [enemies, setEnemies] = useState([]);
  const [showStartModal, setShowStartModal] = useState(true);
  const [showVictoryModal, setShowVictoryModal] = useState(false);
  const [lastDamageEvent, setLastDamageEvent] = useState(null);
  
  const [showEditor, setShowEditor] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [mapType, setMapType] = useState('ortho');

  const [isMobileHudExpanded, setIsMobileHudExpanded] = useState(false);
  const [showCinematic, setShowCinematic] = useState(false);
  const [showBadges, setShowBadges] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [contagionToast, setContagionToast] = useState(null);
  const [contagionWave, setContagionWave] = useState(null);

  const isDevMode = import.meta.env.DEV;

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

  const totalRooftopNodes = gisData.installations.filter(i => i.type === 'rooftop').length;
  const liberatedRooftopsCount = Array.from(liberatedNodes).filter(id => {
    const inst = gisData.installations.find(i => i.id === id);
    return inst && inst.type === 'rooftop';
  }).length;
  const allRooftopsLiberated = totalRooftopNodes > 0 && liberatedRooftopsCount >= totalRooftopNodes;
  const hasSalaNova = liberatedNodes.has('sala_nova_001');
  const hasPavello = liberatedNodes.has('pavello_001');
  const canAturarPlater = liberatedRooftopsCount >= Math.ceil(totalRooftopNodes * 0.85) && hasSalaNova && hasPavello;

  // Narrative mission text
  const getCurrentMission = () => {
    if (allRooftopsLiberated) {
      return "🏆 Victòria total! Totes les teulades estan alliberades i els Homes de Negre foragitats!";
    }
    if (liberatedRooftopsCount < 3) {
      return `Missió 1: Allibera 3 teulades veïnals (${liberatedRooftopsCount}/3)`;
    }
    if (!hasSalaNova) {
      return "Missió 2: Fes clic a la Sala Nova 🏛️ per aprovar la Comunitat!";
    }
    if (!hasPavello) {
      return "Missió 3: Fes clic al Pavelló 🏟️ per generar excedents comunitaris!";
    }
    const target85 = Math.ceil(totalRooftopNodes * 0.85);
    if (liberatedRooftopsCount < target85) {
      return `Missió 4: Allibera el 85% de les teulades (${liberatedRooftopsCount}/${target85})`;
    }
    return "Missió Final: Prem 'Aturem el Plater' per alliberar la Llera definitivament!";
  };

  const calculateStats = (nodesSet) => {
    let currentCO2 = 0;
    let currentMoney = 0;
    let maxCO2 = 0;
    let maxMoney = 0;

    gisData.installations.forEach(inst => {
      if (inst.type !== 'rooftop') return;
      const power = nodePowers && nodePowers[inst.id] !== undefined ? nodePowers[inst.id] : inst.power;
      const energy = power * 1350;
      const co2 = energy * 0.29;
      const money = energy * 0.18;
      maxCO2 += inst.power * 1350 * 0.29;
      maxMoney += inst.power * 1350 * 0.18;
      if (nodesSet.has(inst.id)) {
        currentCO2 += co2;
        currentMoney += money;
      }
    });

    currentCO2 += co2Bonus;
    if (currentCO2 < 0) currentCO2 = 0;

    return { currentCO2, currentMoney, maxCO2, maxMoney };
  };

  const { currentCO2, currentMoney, maxCO2, maxMoney } = calculateStats(liberatedNodes);

  const handleImpact = (value) => setCo2Bonus(prev => prev + value);
  const handlePenalty = (value) => setSpeculationPenalty(prev => prev + value);

  const corruptionLevel = Math.max(0, Math.min(100, (100 - (liberatedRooftopsCount * (80 / totalRooftopNodes))) + speculationPenalty - speculationReduction));

  const [activeMiniGame, setActiveMiniGame] = useState(null);
  const [pendingNode, setPendingNode] = useState(null);
  const damageRef = useRef({});

  // PHASE MANAGEMENT
  useEffect(() => {
    const nodes = Array.from(liberatedNodes).filter(id => {
      const inst = gisData.installations.find(i => i.id === id);
      return inst && inst.type === 'rooftop';
    }).length;
    let nextPhase = gamePhase;

    if (nodes >= Math.ceil(totalRooftopNodes * 0.85) && liberatedNodes.has('sala_nova_001') && liberatedNodes.has('pavello_001')) nextPhase = 4;
    else if (nodes >= NARRATIVE_PHASES[3].threshold) nextPhase = 3;
    else if (liberatedNodes.has('pavello_001')) nextPhase = 2;
    else if (liberatedNodes.has('sala_nova_001') || nodes >= NARRATIVE_PHASES[1].threshold) nextPhase = 1;

    if (nextPhase > gamePhase && !seenPhases.has(nextPhase)) {
      setGamePhase(nextPhase);
      setShowCinematic(true);
      setSeenPhases(prev => new Set(prev).add(nextPhase));
    }
  }, [liberatedNodes, gamePhase, seenPhases, totalRooftopNodes]);

  const handleStartGame = () => {
    setShowStartModal(false);
    if (!seenPhases.has(0)) {
      setShowCinematic(true);
      setSeenPhases(prev => new Set(prev).add(0));
    }
  };

  const handleResetGame = () => {
    localStorage.clear();
    setLiberatedNodes(new Set());
    setClearedBads(new Set());
    setSeenPhases(new Set());
    setCo2Bonus(0);
    setSpeculationPenalty(0);
    setSpeculationReduction(0);
    const initial = {};
    gisData.installations.forEach(inst => {
      initial[inst.id] = inst.power;
    });
    setNodePowers(initial);
    nodePowersRef.current = initial;
    setGamePhase(0);
    setEnemies([]);
    setShowStartModal(false);
    setShowCinematic(true);
    setSeenPhases(new Set([0]));
  };

  // CELEBRACIÓ I EXPULSIÓ DELS HOMES DE NEGRE QUAN S'ALLIBEREN TOTES LES TEULADES
  const prevAllLiberatedRef = useRef(false);
  useEffect(() => {
    if (allRooftopsLiberated) {
      setEnemies([]);
      if (!prevAllLiberatedRef.current) {
        prevAllLiberatedRef.current = true;
        SoundManager.playSFX('victory');
        setContagionToast({
          message: "🎉 TOTES LES TEULADES ALLIBERADES! Els Homes de Negre han estat definitivament expulsats de Sant Jordi Desvalls!",
          id: Date.now()
        });
      }
    } else {
      prevAllLiberatedRef.current = false;
    }
  }, [allRooftopsLiberated]);

  // ENEMY LOOP (HOMES DE NEGRE)
  useEffect(() => {
    // Si s'han alliberat totes les teulades, atura completament els homes de negre i neteja el mapa
    if (allRooftopsLiberated) {
      setEnemies([]);
      return;
    }

    const interval = setInterval(() => {
      // Pause enemy sabotage and attack loop while playing a minigame, cinematic, in Map Editor Mode, or when all rooftops are liberated
      if (activeMiniGame || showCinematic || showEditor || allRooftopsLiberated) return;

      setEnemies(prevEnemies => {
        if (allRooftopsLiberated) return [];
        let newEnemies = EnemySystem.moveEnemies(prevEnemies);
        let newlyConqueredNodes = new Set();

        newEnemies = newEnemies.filter(enemy => {
          // If the target is no longer liberated, the enemy gives up
          if (!liberatedNodes.has(enemy.targetId)) {
            return false;
          }

          if (enemy.reachedTarget) {
            const targetInst = gisData.installations.find(i => i.id === enemy.targetId);
            const currentPressure = (enemy.pressure || 0) + 1;
            enemy.pressure = currentPressure;
            enemy.isAttacking = true;

            // When attack starts (tick 1), play alarm and trigger visual alert
            if (currentPressure === 1) {
              SoundManager.playSFX('alarm');
              if (targetInst) {
                setLastDamageEvent({
                  id: Date.now() + Math.random(),
                  lat: targetInst.coordinates[0],
                  lng: targetInst.coordinates[1],
                  text: '🚨 ATAC ALS PANELLS!',
                  type: 'warning'
                });
                setContagionToast(`🚨 ALERTA: Un Home de Negre està drenant la teulada de ${targetInst.owner}! Fes-hi clic per foragitar-lo!`);
              }
            } 
            
            // Every 10 ticks (approx 1s), drain a portion 0.1 - 0.5 kW
            if (currentPressure % 10 === 0) {
              const drain = Number((0.15 + Math.random() * 0.35).toFixed(1)); // 0.1 - 0.5 kW
              const currentP = nodePowersRef.current[enemy.targetId] !== undefined 
                ? nodePowersRef.current[enemy.targetId] 
                : (targetInst?.power || 5);
              const nextP = Math.max(0, Number((currentP - drain).toFixed(1)));

              nodePowersRef.current[enemy.targetId] = nextP;
              setNodePowers(prev => ({
                ...prev,
                [enemy.targetId]: nextP
              }));

              SoundManager.playSFX('drain');

              if (targetInst) {
                setLastDamageEvent({
                  id: Date.now() + Math.random(),
                  lat: targetInst.coordinates[0],
                  lng: targetInst.coordinates[1],
                  text: `-${drain.toFixed(1)} kW! (${nextP.toFixed(1)} kW)`,
                  type: 'warning'
                });
              }

              // If fully drained to 0 kW, the rooftop is completely privatized
              if (nextP <= 0.05) {
                setLiberatedNodes(prevNodes => {
                  const newSet = new Set(prevNodes);
                  newSet.delete(enemy.targetId);
                  return newSet;
                });
                newlyConqueredNodes.add(enemy.targetId);
                setSpeculationPenalty(prev => prev + 2);
                SoundManager.playSFX('damage');

                if (targetInst) {
                  setLastDamageEvent({
                    id: Date.now() + Math.random(),
                    lat: targetInst.coordinates[0],
                    lng: targetInst.coordinates[1],
                    text: `💥 0 kW PRIVATITZAT!`,
                    type: 'critical'
                  });
                  setContagionToast(`💥 PRIVATITZAT! Els Homes de Negre han exhaurit tota l'energia de ${targetInst.owner}!`);
                }

                return false;
              }
            }

            // After 50 ticks (5 seconds) of attack, enemy flees if not defeated
            if (currentPressure >= 50) {
              SoundManager.playSFX('warning');
              if (targetInst) {
                setContagionToast(`💨 L'Home de Negre ha fugit amb energia robada de ${targetInst.owner}! Pots realliberar-la per recarregar-la.`);
              }
              return false;
            }

            // Keep enemy active on map while attacking
            return true;
          }
          return true;
        });

        if (newlyConqueredNodes.size > 0) {
          newEnemies = newEnemies.filter(enemy => !newlyConqueredNodes.has(enemy.targetId));
        }

        // Target ONLY liberated rooftops (user requirement: "els homes de negre han d'anar a les teulades alliberades")
        // Quan totes les teulades estan alliberades, no es generen nous enemics
        if (allRooftopsLiberated) return [];
        const candidateTargets = gisData.installations.filter(i => liberatedNodes.has(i.id) && i.type === 'rooftop');

        // Only spawn enemies if there are liberated rooftops to target
        if (candidateTargets.length > 0) {
          const maxEnemies = Math.min(candidateTargets.length, gamePhase === 0 ? 2 : (gamePhase === 1 ? 4 : 6));
          if (newEnemies.length < maxEnemies && Math.random() < 0.08) {
            const targets = candidateTargets.map(i => ({
              id: i.id,
              lat: i.coordinates[0],
              lng: i.coordinates[1]
            }));

            const enemyId = 'enemy-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
            const newEnemy = EnemySystem.spawnEnemy(enemyId, null, targets);
            if (newEnemy) newEnemies.push(newEnemy);
          }
        }

        return newEnemies;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [liberatedNodes, activeMiniGame, showCinematic, gamePhase, showEditor, allRooftopsLiberated]);

  const handleEnemyClick = (enemyId) => {
    setEnemies(prev => {
      const enemy = (enemyId ? prev.find(e => e.id === enemyId) : null) || prev.find(e => e.isAttacking) || prev[0];
      if (!enemy) return prev;

      SoundManager.playSFX('defeat');
      setLastDamageEvent({
        id: Date.now() + Math.random(),
        lat: enemy.lat,
        lng: enemy.lng,
        text: '🛡️ +DEFENSAT! Expulsat!',
        type: 'defeat'
      });

      setContagionToast("🛡️ Has foragitat l'Home de Negre a temps! La teulada continua sota sobirania popular.");
      return prev.filter(e => e.id !== enemy.id);
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
    const node = gisData.installations.find(i => i.id === id);

    // Direct access to key community landmarks without blocking alerts
    if (id === 'sala_nova_001') {
      setActiveMiniGame('community');
      setPendingNode({ id, power: power || 30, owner: owner || 'Sala Nova', latlng, containerPoint });
      return;
    }

    if (id === 'pavello_001') {
      setActiveMiniGame('tycoon');
      setPendingNode({ id, power: power || 50, owner: owner || 'Pavelló Municipal', latlng, containerPoint });
      return;
    }

    // Minigame assignment based on installation or power
    if (node?.minigame) {
      setActiveMiniGame(node.minigame);
    } else if (power < 3.5) {
      setActiveMiniGame('connect');
    } else if (power >= 3.5 && power < 5) {
      setActiveMiniGame('slider');
    } else {
      setActiveMiniGame('balance');
    }
    setPendingNode({ id, power, owner, latlng, containerPoint });
  };

  const completeLiberation = (id, customReduction = 0) => {
    const targetId = (typeof id === 'string' && id) ? id : pendingNode?.id;
    if (!targetId) {
      console.warn("completeLiberation: targetId not found", id, pendingNode);
      setActiveMiniGame(null);
      setPendingNode(null);
      return;
    }

    const newSet = new Set(liberatedNodes);
    newSet.add(targetId);

    // Apply speculation reduction
    const node = gisData.installations.find(i => i.id === targetId);
    if (node) {
      setNodePowers(prev => ({
        ...prev,
        [targetId]: node.power
      }));
      nodePowersRef.current[targetId] = node.power;
    }

    let reduction = customReduction;
    if (reduction === 0 && node) {
      if (node.id === 'pavello_001') reduction = REWARDS.tycoon.speculationReduction;
      else if (node.type === 'sala_nova') reduction = REWARDS.community.speculationReduction;
      else reduction = 2;
    }

    // Contagi Veïnal (Neighbor Contagion Effect):
    // Liberates all unliberated neighbor rooftops within 180m!
    // Fallback: If no unliberated rooftop is within 180m, takes closest unliberated neighbor up to 450m.
    if (node && node.type === 'rooftop') {
      const candidates = gisData.installations
        .filter(other => other.type === 'rooftop' && other.id !== targetId && !newSet.has(other.id))
        .map(other => {
          const dLat = (node.coordinates[0] - other.coordinates[0]) * 111072;
          const dLng = (node.coordinates[1] - other.coordinates[1]) * 82660;
          const distance = Math.hypot(dLat, dLng);
          return { ...other, distance };
        })
        .sort((a, b) => a.distance - b.distance);

      let neighborsToLiberate = candidates.filter(c => c.distance <= 180);

      // Fallback for isolated rooftops or when nearby are already liberated:
      if (neighborsToLiberate.length === 0 && candidates.length > 0 && candidates[0].distance <= 450) {
        neighborsToLiberate = [candidates[0]];
      }

      if (neighborsToLiberate.length > 0) {
        neighborsToLiberate.forEach((neighbor, idx) => {
          newSet.add(neighbor.id);
          reduction += 2;
          setNodePowers(prev => ({
            ...prev,
            [neighbor.id]: neighbor.power
          }));
          nodePowersRef.current[neighbor.id] = neighbor.power;
          setTimeout(() => {
            setLastDamageEvent({
              id: Date.now() + Math.random(),
              lat: neighbor.coordinates[0],
              lng: neighbor.coordinates[1],
              text: '⚡ CONTAGI VEÏNAL!',
              type: 'defeat'
            });
          }, 350 + idx * 250);
        });

        // Trigger visual 180m contagion circle wave on the map
        setContagionWave({
          center: [node.coordinates[0], node.coordinates[1]],
          radius: 180,
          id: Date.now()
        });
        setTimeout(() => {
          setContagionWave(null);
        }, 5000);

        // Trigger toast notification
        const count = neighborsToLiberate.length;
        const names = neighborsToLiberate.map(n => n.owner || 'Veí de Sant Jordi');
        const toastMsg = count === 1
          ? `⚡ CONTAGI VEÏNAL! S'ha alliberat també ${names[0]} (${Math.round(neighborsToLiberate[0].distance)}m)!`
          : `⚡ CONTAGI VEÏNAL! S'han alliberat ${count} teulades veïnes en el radi de 180m!`;

        setContagionToast({
          message: toastMsg,
          count,
          names,
          id: Date.now()
        });
        setTimeout(() => {
          setContagionToast(null);
        }, 5500);
      }
    }

    setLiberatedNodes(newSet);
    if (reduction > 0) setSpeculationReduction(prev => prev + reduction);

    setActiveMiniGame(null);
    setPendingNode(null);
    SoundManager.playSFX('victory');
  };

  const completeBadNode = (id) => {
    const newBads = new Set(clearedBads);
    newBads.add(id);
    setClearedBads(newBads);

    const badObj = gisData.environmentalBads.find(b => b.id === id);
    if (badObj) {
      const rKey = badObj.type === 'camp_golf' ? 'aquifer' 
                 : badObj.type === 'piscines_clim' ? 'evaporation' 
                 : badObj.type === 'estufes_terrasses' ? 'heatHaze' 
                 : 'heatPump';
      const r = REWARDS[rKey] || { co2: 500, penaltyReduction: 5 };
      setCo2Bonus(prev => prev + r.co2);
      setSpeculationPenalty(prev => Math.max(0, prev - r.penaltyReduction));
    }

    setActiveMiniGame(null);
    setPendingNode(null);
    SoundManager.playSFX('victory');
  };

  const [isMobileDevice, setIsMobileDevice] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobileDevice(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (isMobileDevice) {
    return (
      <MobileApp
        liberatedNodes={liberatedNodes}
        clearedBads={clearedBads}
        enemies={enemies}
        showStartModal={showStartModal}
        setShowStartModal={setShowStartModal}
        showVictoryModal={showVictoryModal}
        setShowVictoryModal={setShowVictoryModal}
        lastDamageEvent={lastDamageEvent}
        co2Bonus={co2Bonus}
        gamePhase={gamePhase}
        showCinematic={showCinematic}
        setShowCinematic={setShowCinematic}
        activeMiniGame={activeMiniGame}
        setActiveMiniGame={setActiveMiniGame}
        pendingNode={pendingNode}
        setPendingNode={setPendingNode}
        corruptionLevel={corruptionLevel}
        setGamePhase={setGamePhase}
        handleLiberateNode={handleLiberateNode}
        handleEnemyClick={handleEnemyClick}
        handleBadNodeClick={handleBadNodeClick}
        handleImpact={handleImpact}
        handlePenalty={handlePenalty}
        completeBadNode={completeBadNode}
        calculateStats={calculateStats}
        completeLiberation={completeLiberation}
        mapType={mapType}
        setMapType={setMapType}
        currentMission={getCurrentMission()}
        onResetGame={handleResetGame}
        onStartGame={handleStartGame}
        contagionToast={contagionToast}
        setContagionToast={setContagionToast}
        contagionWave={contagionWave}
        nodePowers={nodePowers}
      />
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden' }}>
      {/* Dev / Admin Bar */}
      {isDevMode && (
        <div className="glass-panel" style={{ position: 'absolute', bottom: 20, left: 20, zIndex: 5000, padding: '10px', display: 'flex', gap: '10px' }}>
          <button className={isAdmin ? 'btn btn-primary' : 'btn btn-secondary'} onClick={handleAdminAuth}>
            {isAdmin ? 'Admin OK' : 'Administrador'}
          </button>
          <button className="btn btn-secondary" onClick={() => setMapType(mapType === 'ortho' ? 'light' : 'ortho')}>
            {mapType === 'ortho' ? '🗺️ Mapa Base' : '🛰️ Ortofoto'}
          </button>
          {isAdmin && (
            <>
              <button className="btn btn-secondary" style={{ backgroundColor: showEditor ? 'var(--color-warning)' : 'transparent' }} onClick={() => setShowEditor(!showEditor)}>
                {showEditor ? 'Tancar Editor' : 'Obrir Editor'}
              </button>
              <button className="btn btn-primary" onClick={() => setActiveMiniGame('aturemPlater')}>
                🕹️ Aturem el Plater
              </button>
            </>
          )}
        </div>
      )}

      {/* TOP DESKTOP HUD */}
      <header className="glass-panel" style={{
        position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)', 
        zIndex: 1000, padding: '0.8rem 1.8rem', display: 'flex', gap: '1.8rem', alignItems: 'center',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)', borderRadius: '16px'
      }}>
        <h1 className="text-gradient" style={{ fontSize: '1.35rem', margin: 0, fontWeight: 'bold' }}>L'Últim Cavaller</h1>
        
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Teulades</span>
            <span style={{ color: '#10b981', fontWeight: 'bold', fontSize: '1rem' }}>{liberatedRooftopsCount} / {totalRooftopNodes}</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Sala Nova</span>
            <span style={{ color: hasSalaNova ? '#10b981' : '#3b82f6', fontWeight: 'bold', fontSize: '0.9rem' }}>
              {hasSalaNova ? '✅ Alliberada' : '🏛️ Pendent'}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Pavelló</span>
            <span style={{ color: hasPavello ? '#10b981' : '#f59e0b', fontWeight: 'bold', fontSize: '0.9rem' }}>
              {hasPavello ? '✅ Alliberat' : '🏟️ Pendent'}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Amenaça</span>
            <span style={{ color: 'var(--color-warning)', fontWeight: 'bold', fontSize: '1rem' }}>{Math.round(corruptionLevel)}%</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Estalvi</span>
            <span style={{ color: 'var(--color-accent)', fontWeight: 'bold', fontSize: '1rem' }}>{Math.round(currentMoney).toLocaleString()}€</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>CO2 Evitat</span>
            <span style={{ color: 'var(--color-primary)', fontWeight: 'bold', fontSize: '1rem' }}>{Math.round(currentCO2).toLocaleString()} kg</span>
          </div>
          <button className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} onClick={() => setShowRules(true)}>
            <BookOpen size={16} color="#38bdf8" /> Regles
          </button>
          <button className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} onClick={() => setShowBadges(true)}>
            <Award size={16} color="#f1c40f" /> Insígnies
          </button>
        </div>
      </header>

      {/* Mission Banner on Desktop */}
      <div style={{
        position: 'absolute', top: 86, left: '50%', transform: 'translateX(-50%)',
        zIndex: 900, backgroundColor: 'rgba(15, 23, 42, 0.92)', color: '#f8fafc',
        padding: '6px 20px', borderRadius: '20px', border: '1px solid rgba(59, 130, 246, 0.45)',
        fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.3)', pointerEvents: 'none'
      }}>
        <Compass size={16} color="#38bdf8" />
        <span>{getCurrentMission()}</span>
      </div>

      {/* CONTAGI VEÏNAL TOAST BANNER (DESKTOP) */}
      {contagionToast && (
        <div style={{
          position: 'fixed',
          top: '90px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10000,
          backgroundColor: '#064e3b',
          border: '2px solid #10b981',
          borderRadius: '14px',
          padding: '12px 24px',
          color: '#ecfdf5',
          boxShadow: '0 8px 30px rgba(16, 185, 129, 0.5), 0 4px 12px rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          maxWidth: '90vw',
          pointerEvents: 'auto',
          animation: 'fadeInSlideDown 0.3s ease-out'
        }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            backgroundColor: '#10b981',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '22px',
            flexShrink: 0,
            boxShadow: '0 0 14px rgba(16, 185, 129, 0.9)'
          }}>
            ⚡
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.82rem', color: '#6ee7b7', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Contagi Comunitari (180m)
            </span>
            <span style={{ fontSize: '0.95rem', color: '#ffffff', fontWeight: 700 }}>
              {contagionToast.message}
            </span>
          </div>
          <button
            onClick={() => setContagionToast(null)}
            style={{
              background: 'none',
              border: 'none',
              color: '#a7f3d0',
              fontSize: '22px',
              lineHeight: 1,
              cursor: 'pointer',
              padding: '0 6px',
              marginLeft: '8px',
              fontWeight: 'bold'
            }}
          >
            ×
          </button>
        </div>
      )}

      <main style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
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
          isMobileHudExpanded={isMobileHudExpanded}
          contagionWave={contagionWave}
          nodePowers={nodePowers}
        >
          {showEditor && <ZoneEditor onClose={() => setShowEditor(false)} />}
        </GameMap>
      </main>

      {/* MINIGAMES OVERLAYS */}
      {activeMiniGame && (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 9999 }}>
          {activeMiniGame === 'connect' && <ConnectTheDots onComplete={() => completeLiberation(pendingNode?.id)} onClose={() => setActiveMiniGame(null)} targetNode={pendingNode} />}
          {activeMiniGame === 'slider' && <SliderBalance onComplete={() => completeLiberation(pendingNode?.id)} onClose={() => setActiveMiniGame(null)} />}
          {activeMiniGame === 'heatPump' && <HeatPumpHarmony onComplete={() => completeBadNode(pendingNode?.id)} onClose={() => setActiveMiniGame(null)} onImpact={handleImpact} />}
          {activeMiniGame === 'rhythm' && <RhythmGame onComplete={() => completeLiberation(pendingNode?.id)} onClose={() => setActiveMiniGame(null)} />}
          {activeMiniGame === 'community' && <CommunityEnergy onComplete={(reduction) => completeLiberation(pendingNode?.id, reduction)} onClose={() => setActiveMiniGame(null)} maxPower={pendingNode?.power} rewardFactor={pendingNode?.id === 'pavello_001' ? 70 : 20} backgroundOverride={pendingNode?.id === 'sala_nova_001' ? salaNovaBg : null} />}
          {activeMiniGame === 'tycoon' && <PavelloTycoon onComplete={(reduction) => completeLiberation(pendingNode?.id, reduction)} onClose={() => setActiveMiniGame(null)} maxPower={pendingNode?.power} rewardFactor={70} />}
          {activeMiniGame === 'quiz' && <QuizSobirania onComplete={() => completeLiberation(pendingNode?.id)} onClose={() => setActiveMiniGame(null)} />}
          {activeMiniGame === 'balance' && <BalanceEnergetic onComplete={() => completeLiberation(pendingNode?.id)} onClose={() => setActiveMiniGame(null)} />}
          {activeMiniGame === 'heatHaze' && <HeatHazeSabotage onComplete={() => completeBadNode(pendingNode?.id)} onClose={() => setActiveMiniGame(null)} onImpact={handleImpact} />}
          {activeMiniGame === 'aquifer' && <AquiferDefense onComplete={() => completeBadNode(pendingNode?.id)} onClose={() => setActiveMiniGame(null)} onImpact={handleImpact} onPenalty={handlePenalty} />}
          {activeMiniGame === 'evaporation' && <EvaporationRace onComplete={() => completeBadNode(pendingNode?.id)} onClose={() => setActiveMiniGame(null)} onImpact={handleImpact} onPenalty={handlePenalty} />}
          {activeMiniGame === 'aturemPlater' && <AturemPlater onComplete={() => { setActiveMiniGame(null); setShowVictoryModal(true); }} onClose={() => setActiveMiniGame(null)} />}
        </div>
      )}

      {canAturarPlater && !activeMiniGame && (
        <div style={{ position: 'absolute', bottom: '110px', left: '50%', transform: 'translateX(-50%)', zIndex: 900, textAlign: 'center' }}>
          <button onClick={() => setActiveMiniGame('aturemPlater')} className="btn btn-primary animate-fade-in" style={{ padding: '16px 36px', fontSize: '1.25rem', animation: 'pulse-green 2s infinite', boxShadow: '0 6px 20px rgba(46, 204, 113, 0.5)' }}>
            🏁 ATUREM EL PLATER!
          </button>
        </div>
      )}

      <MusicPlayer phase={gamePhase} />

      {showCinematic && (
        <CinematicOverlay phase={NARRATIVE_PHASES[gamePhase]} onComplete={() => setShowCinematic(false)} />
      )}

      {showStartModal && (
        <WelcomeScreen
          onStart={handleStartGame}
          onReset={handleResetGame}
          savedProgressCount={liberatedNodes.size}
        />
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

      <RulesModal
        isOpen={showRules}
        onClose={() => setShowRules(false)}
      />

      {showVictoryModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          backgroundColor: 'rgba(2, 6, 23, 0.88)', backdropFilter: 'blur(8px)',
          zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
          <div className="glass-panel animate-fade-in" style={{
            maxWidth: '680px', width: '100%', maxHeight: '90vh', overflowY: 'auto',
            padding: '2.2rem 2.6rem', textAlign: 'center', borderRadius: '24px',
            border: '2px solid rgba(16, 185, 129, 0.6)',
            boxShadow: '0 20px 60px rgba(16, 185, 129, 0.35), 0 0 40px rgba(0, 0, 0, 0.8)'
          }}>
            <video
              src="/cinematics/ffinal.mp4"
              poster="/cinematics/celdoni_victory_epic.png"
              autoPlay
              loop
              controls
              playsInline
              style={{ width: '100%', maxHeight: '250px', objectFit: 'cover', borderRadius: '16px', marginBottom: '1.2rem', boxShadow: '0 8px 24px rgba(0,0,0,0.5)', border: '1px solid rgba(16, 185, 129, 0.4)' }}
            />
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 16px', borderRadius: '20px', backgroundColor: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', color: '#10b981', fontWeight: 800, fontSize: '0.85rem', marginBottom: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
              🏆 Victòria Comunitària Total
            </div>
            <h2 className="text-gradient" style={{ fontSize: '2.3rem', margin: '0 0 0.8rem 0', fontWeight: 900 }}>
              La Llera és Viva i Sobirana!
            </h2>
            <p style={{ margin: '0 0 1.5rem 0', fontSize: '1.05rem', color: '#e2e8f0', lineHeight: 1.6 }}>
              Has aturat el macroprojecte especulatiu del Plater i consolidat la xarxa d'energia solar a les teulades del poble! El bosc de ribera, els camps fèrtils i les aigües del Ter continuen bategant per a les properes generacions.
            </p>

            {/* Victory Key Milestones */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', marginBottom: '1.8rem' }}>
              <div style={{ background: 'rgba(15, 23, 42, 0.7)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '4px' }}>⚡</div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Teulades Lliures</div>
                <div style={{ fontWeight: 800, color: '#10b981', fontSize: '1rem' }}>{liberatedRooftopsCount} / {totalRooftopNodes}</div>
              </div>
              <div style={{ background: 'rgba(15, 23, 42, 0.7)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '4px' }}>🛡️</div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Homes de Negre</div>
                <div style={{ fontWeight: 800, color: '#10b981', fontSize: '1rem' }}>Foragitats</div>
              </div>
              <div style={{ background: 'rgba(15, 23, 42, 0.7)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '4px' }}>🌳</div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>El Plater</div>
                <div style={{ fontWeight: 800, color: '#10b981', fontSize: '1rem' }}>Salvat</div>
              </div>
              <div style={{ background: 'rgba(15, 23, 42, 0.7)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '4px' }}>💶</div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Estalvi Veïnal</div>
                <div style={{ fontWeight: 800, color: '#f59e0b', fontSize: '1rem' }}>{Math.round(currentMoney).toLocaleString()}€</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                className="btn btn-primary"
                onClick={() => setShowVictoryModal(false)}
                style={{ padding: '14px 28px', fontSize: '1.05rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                🗺️ Explorar el Municipi en Pau
              </button>
              <button
                className="btn btn-secondary"
                onClick={handleResetGame}
                style={{ padding: '14px 24px', fontSize: '1rem', color: '#cbd5e1' }}
              >
                🔄 Tornar a Jugar de Zero
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
