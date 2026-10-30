import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, useMapEvents, ImageOverlay, Polygon, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import gisData from '../data/gis_data.json';
import { Leaf, DollarSign, Wind, Flame, Droplets, Zap, ShieldAlert, Cpu, Coins, Ban, X, TreeDeciduous, Lock, Play } from 'lucide-react';
import SoundManager from '../logic/SoundManager';

// Fix for default marker icon in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// --- ICONS DEFINITION ---
// Static & stable Suit Icons so Leaflet never destroys DOM nodes during click/drag
const suitWalkingIcon = new L.divIcon({
    className: 'custom-enemy-icon',
    html: `
        <div title="Home de negre (Especulador) - Fes clic per expulsar-lo!" style="
            background: #0f172a;
            border-radius: 50%;
            padding: 4px;
            box-shadow: 0 0 20px rgba(239, 68, 68, 0.95);
            border: 2.5px solid #ef4444;
            cursor: pointer;
            pointer-events: auto;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 44px;
            height: 44px;
            animation: pulse 1.2s infinite;
        ">
            <span style="font-size: 26px; line-height: 1;">🕴️</span>
        </div>
    `,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -22]
});

const suitAttackingIcon = new L.divIcon({
    className: 'custom-enemy-icon-attacking',
    html: `
        <div title="🚨 SABOTATGE EN CURS! Fes clic per foragitar l'Home de Negre!" style="
            background: #dc2626;
            border-radius: 50%;
            padding: 4px;
            box-shadow: 0 0 25px rgba(239, 68, 68, 1), 0 0 10px #ffffff;
            border: 3px solid #ffffff;
            cursor: pointer;
            pointer-events: auto;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            width: 52px;
            height: 52px;
            animation: sabotageShake 0.25s infinite alternate;
            position: relative;
        ">
            <span style="font-size: 28px; line-height: 1;">🚨</span>
            <div style="
                position: absolute;
                bottom: -16px;
                background: #dc2626;
                color: white;
                font-size: 9px;
                font-weight: 900;
                padding: 1px 6px;
                border-radius: 6px;
                white-space: nowrap;
                box-shadow: 0 2px 6px rgba(0,0,0,0.6);
                border: 1px solid white;
                letter-spacing: 0.5px;
            ">
                ATACANT!
            </div>
        </div>
    `,
    iconSize: [52, 52],
    iconAnchor: [26, 26],
    popupAnchor: [0, -26]
});

const getSuitIcon = (isAttacking) => isAttacking ? suitAttackingIcon : suitWalkingIcon;

// Visual Marker for Liberated Rooftops (Solar & Sovereign) with explicit kW badge
const liberatedRooftopIcon = (power, id) => new L.divIcon({
    className: 'liberated-roof-icon',
    html: `
        <div onclick="if(window.__triggerRooftop){window.__triggerRooftop('${id}');}" style="width: 50px; height: 50px; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer;">
            <div class="roof-circle" style="
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                border: 2.5px solid #ffffff;
                border-radius: 50%;
                width: 32px;
                height: 32px;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 0 16px rgba(16, 185, 129, 0.95), 0 3px 8px rgba(0,0,0,0.4);
                position: relative;
            ">
                <span style="font-size: 15px; line-height: 1;">⚡</span>
            </div>
            <div style="
                background: #064e3b;
                color: #a7f3d0;
                font-size: 10px;
                font-weight: 900;
                padding: 1px 5px;
                border-radius: 6px;
                border: 1px solid #10b981;
                white-space: nowrap;
                margin-top: -5px;
                box-shadow: 0 2px 5px rgba(0,0,0,0.6);
                letter-spacing: -0.3px;
            ">
                ${(power !== undefined ? power : 0).toFixed(1)}k
            </div>
        </div>
    `,
    iconSize: [50, 50],
    iconAnchor: [25, 25],
    popupAnchor: [0, -25]
});

// Visual Marker for Pending Rooftops with explicit kW badge
const pendingRooftopIcon = (power, id) => new L.divIcon({
    className: 'pending-roof-icon',
    html: `
        <div onclick="if(window.__triggerRooftop){window.__triggerRooftop('${id}');}" style="width: 50px; height: 50px; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer;">
            <div class="roof-circle" style="
                background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
                border: 2.5px solid #cbd5e1;
                border-radius: 50%;
                width: 30px;
                height: 30px;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 3px 8px rgba(0,0,0,0.5), 0 0 10px rgba(59, 130, 246, 0.4);
                color: #f8fafc;
                font-size: 13px;
            ">
                ☀️
            </div>
            <div style="
                background: #0f172a;
                color: #cbd5e1;
                font-size: 10px;
                font-weight: 800;
                padding: 1px 5px;
                border-radius: 6px;
                border: 1px solid #475569;
                white-space: nowrap;
                margin-top: -5px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.5);
            ">
                ${(power !== undefined ? power : 0).toFixed(1)}k
            </div>
        </div>
    `,
    iconSize: [50, 50],
    iconAnchor: [25, 25],
    popupAnchor: [0, -25]
});

// Sala Nova Icon
const getSalaNovaIcon = (isLiberated) => new L.divIcon({
    className: 'sala-nova-icon',
    html: `
        <div onclick="if(window.__triggerRooftop){window.__triggerRooftop('sala_nova_001');}" class="roof-circle" style="
            background: ${isLiberated ? 'linear-gradient(135deg, #10b981, #047857)' : 'linear-gradient(135deg, #3b82f6, #1d4ed8)'};
            border: 3px solid ${isLiberated ? '#facc15' : '#ffffff'};
            border-radius: 50%;
            width: 44px;
            height: 44px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            box-shadow: 0 0 18px ${isLiberated ? 'rgba(16, 185, 129, 0.95)' : 'rgba(59, 130, 246, 0.85)'};
            cursor: pointer;
        ">
            <span style="font-size: 20px; line-height: 1;">🏛️</span>
            <span style="
                position: absolute;
                bottom: -7px;
                background: ${isLiberated ? '#10b981' : '#1e293b'};
                color: #ffffff;
                font-size: 9px;
                font-weight: 800;
                border-radius: 4px;
                padding: 1px 5px;
                white-space: nowrap;
                border: 1px solid rgba(255,255,255,0.4);
            ">${isLiberated ? 'ALLIBERADA' : 'ASSEMBLEA'}</span>
        </div>
    `,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -24]
});

// Pavelló Icon
const getPavelloIcon = (isLiberated) => new L.divIcon({
    className: 'pavello-icon',
    html: `
        <div onclick="if(window.__triggerRooftop){window.__triggerRooftop('pavello_001');}" class="roof-circle" style="
            background: ${isLiberated ? 'linear-gradient(135deg, #f59e0b, #b45309)' : 'linear-gradient(135deg, #8b5cf6, #6d28d9)'};
            border: 3px solid ${isLiberated ? '#10b981' : '#ffffff'};
            border-radius: 50%;
            width: 48px;
            height: 48px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            box-shadow: 0 0 20px ${isLiberated ? 'rgba(245, 158, 11, 0.95)' : 'rgba(139, 92, 246, 0.85)'};
            cursor: pointer;
        ">
            <span style="font-size: 22px; line-height: 1;">🏟️</span>
            <span style="
                position: absolute;
                bottom: -7px;
                background: ${isLiberated ? '#f59e0b' : '#1e293b'};
                color: #ffffff;
                font-size: 9px;
                font-weight: 800;
                border-radius: 4px;
                padding: 1px 5px;
                white-space: nowrap;
                border: 1px solid rgba(255,255,255,0.4);
            ">${isLiberated ? 'COOPERATIVA' : 'PAVELLÓ'}</span>
        </div>
    `,
    iconSize: [48, 48],
    iconAnchor: [24, 24],
    popupAnchor: [0, -26]
});

const badIconCache = {};
const getBadIcon = (type) => {
    if (badIconCache[type]) return badIconCache[type];
    let emoji = '🔥';
    let borderColor = '#d35400';
    let title = 'Amenaça ecològica';
    if (type === 'camp_golf') {
        emoji = '💧';
        borderColor = '#2980b9';
        title = "Camp de golf (Sobreexplotació d'aigua)";
    } else if (type === 'piscines_clim') {
        emoji = '🏊';
        borderColor = '#16a085';
        title = "Piscina climatitzada (Evaporació)";
    } else if (type === 'bomba_calor') {
        emoji = '❄️';
        borderColor = '#8e44ad';
        title = "Bomba de calor ineficient";
    } else if (type === 'estufes_terrasses') {
        emoji = '🔥';
        borderColor = '#e67e22';
        title = "Estufes de terrasses (Malgastament tèrmic)";
    }
    const icon = new L.divIcon({
        className: 'custom-bad-icon',
        html: `
            <div title="${title}" style="background: white; border-radius: 50%; padding: 3px; box-shadow: 0 4px 10px rgba(0,0,0,0.35); border: 2.5px solid ${borderColor}; cursor: pointer; pointer-events: auto; display: flex; align-items: center; justify-content: center; width: 34px; height: 34px;">
                <span style="font-size: 18px; line-height: 1;">${emoji}</span>
            </div>
        `,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
        popupAnchor: [0, -18]
    });
    badIconCache[type] = icon;
    return icon;
};

const MapEventListener = ({ lastDamageEvent, addDamageText, onMapClickRoof }) => {
    const map = useMap();
    useMapEvents({
        click: (e) => {
            if (onMapClickRoof) {
                onMapClickRoof(e.latlng, e.containerPoint);
            }
        }
    });
    React.useEffect(() => {
        if (lastDamageEvent) {
            const pt = map.latLngToContainerPoint([lastDamageEvent.lat, lastDamageEvent.lng]);
            addDamageText(pt, lastDamageEvent);
        }
    }, [lastDamageEvent, map, addDamageText]);
    return null;
};

const getMinigameName = (inst) => {
    if (inst.id === 'pavello_001') return 'Gestió de Cooperativa (Tycoon)';
    if (inst.type === 'sala_nova' || inst.type === 'pavello') return 'Assemblea Comunitària';
    if (inst.minigame === 'connect') return 'Connecta el cablejat';
    if (inst.minigame === 'slider') return "Sintonitza l'inversor";
    if (inst.minigame === 'rhythm') return 'Freqüència de xarxa (Ritme)';
    if (inst.minigame === 'quiz') return 'Quiz de sobirania';
    if (inst.minigame === 'balance') return 'Balanç energètic';
    if (inst.power < 3.5) return 'Connecta el cablejat';
    if (inst.power < 5) return "Sintonitza l'inversor";
    return 'Balanç energètic';
};

const GameMap = ({ corruptionLevel, liberatedNodes, onLiberateNode, enemies, onEnemyClick, clearedBads, onBadNodeClick, lastDamageEvent, children, isEditorMode, mapType = 'ortho', isMobileHudExpanded, contagionWave, nodePowers }) => {
    const position = gisData.center;
    const [feedbackItems, setFeedbackItems] = React.useState([]);
    const [activeInfo, setActiveInfo] = React.useState(null);
    const [lastInteraction, setLastInteraction] = React.useState(null);

    const playTocSound = () => SoundManager.playSFX('click');
    const playEnemyHitSound = () => SoundManager.playSFX('defeat');

    const triggerFeedback = (power, containerPoint) => {
        playTocSound();
        const energy = power * 1350;
        const savedMoney = Math.round(energy * 0.18);
        const savedCO2 = Math.round(energy * 0.29);
        const uniqueId = Date.now() + '-' + Math.random();

        const newFeedbacks = [
            { id: uniqueId + '-money', x: containerPoint.x, y: containerPoint.y - 50, text: `+${savedMoney} €`, icon: <Coins size={24} />, type: 'money' },
            { id: uniqueId + '-co2', x: containerPoint.x, y: containerPoint.y - 120, text: `-${savedCO2} kg CO2`, type: 'co2' },
            { id: uniqueId + '-bad', x: containerPoint.x, y: containerPoint.y - 190, icon: <Ban size={24} />, text: 'Especulació', type: 'bad' }
        ];

        setFeedbackItems(prev => [...prev, ...newFeedbacks]);
        setTimeout(() => {
            setFeedbackItems(prev => prev.filter(item => !newFeedbacks.find(f => f.id === item.id)));
        }, 3000);
    };

    const addDamageText = React.useCallback((containerPoint, evt) => {
        playEnemyHitSound();
        const feedbackId = 'damage-' + evt.id + '-' + Math.random();
        const newFeedback = {
            id: feedbackId,
            x: containerPoint.x,
            y: containerPoint.y - 30,
            text: evt.text,
            type: evt.type === 'critical' ? 'bad' : evt.type === 'defeat' ? 'money' : 'damage',
            icon: evt.type === 'critical' ? <Ban size={20} /> : <ShieldAlert size={20} />
        };

        setFeedbackItems(prev => [...prev, newFeedback]);
        setTimeout(() => {
            setFeedbackItems(prev => prev.filter(item => item.id !== feedbackId));
        }, 3000);
    }, []);

    const lastInteractionRef = React.useRef(0);
    const handleLiberateAttempt = (inst, latlng, containerPoint) => {
        const now = Date.now();
        if (now - lastInteractionRef.current < 200) return;
        lastInteractionRef.current = now;

        // If an enemy is currently attacking this rooftop, expelling the enemy happens IMMEDIATELY,
        // and we STILL proceed to launch the minigame so the user can play or defend!
        const attackingEnemy = corruptionLevel > 0 ? enemies?.find(e => e.targetId === inst.id && (e.isAttacking || e.reachedTarget)) : null;
        if (attackingEnemy && onEnemyClick) {
            onEnemyClick(attackingEnemy.id);
        }

        const posX = containerPoint ? containerPoint.x : (window.innerWidth / 2);
        const posY = containerPoint ? (containerPoint.y + 40) : (window.innerHeight / 2);

        // Trigger minigame play
        setLastInteraction({ id: inst.id, power: inst.power, x: posX, y: posY });
        onLiberateNode(inst.id, inst.power, inst.owner, latlng, containerPoint);
    };

    const handleMapClickRoof = (latlng, containerPoint) => {
        if (isEditorMode) return;
        const now = Date.now();
        if (now - lastInteractionRef.current < 200) return;

        // Check if user clicked anywhere on a rooftop building footprint (strictly within 18m)
        let closest = null;
        let minDist = 18;
        gisData.installations.forEach(inst => {
            if (inst.type !== 'rooftop' && inst.type !== 'pavello' && inst.type !== 'sala_nova') return;
            const dLat = (inst.coordinates[0] - latlng.lat) * 111072;
            const dLng = (inst.coordinates[1] - latlng.lng) * 82660;
            const dist = Math.hypot(dLat, dLng);
            if (dist < minDist) {
                minDist = dist;
                closest = inst;
            }
        });
        if (closest) {
            handleLiberateAttempt(closest, latlng, containerPoint);
        }
    };

    React.useEffect(() => {
        window.__triggerRooftop = (id) => {
            const inst = gisData.installations.find(i => i.id === id);
            if (inst) {
                handleLiberateAttempt(inst);
            }
        };
        return () => {
            delete window.__triggerRooftop;
        };
    }, [enemies, onEnemyClick, onLiberateNode]);

    React.useEffect(() => {
        if (lastInteraction && liberatedNodes && liberatedNodes.has(lastInteraction.id) && !lastInteraction.played) {
            triggerFeedback(lastInteraction.power, { x: lastInteraction.x, y: lastInteraction.y - 40 });
            setLastInteraction(prev => ({ ...prev, played: true }));
        }
    }, [liberatedNodes, lastInteraction]);

    return (
        <div className="map-wrapper" style={{ height: '100vh', width: '100%', position: 'relative' }}>
            {/* Filter applies ONLY to map tiles, preserving 100% saturation for markers & UI */}
            <style>{`
                .leaflet-tile-pane {
                    filter: ${isEditorMode ? 'none' : `grayscale(${corruptionLevel}%) contrast(${100 + corruptionLevel / 2}%)`};
                    transition: filter 0.6s ease-out;
                }
                @keyframes sabotageShake {
                    0% { transform: scale(1.05) rotate(-6deg); }
                    100% { transform: scale(1.18) rotate(6deg); }
                }
                .pending-roof-icon, .liberated-roof-icon, .sala-nova-icon, .pavello-icon {
                    cursor: pointer !important;
                }
                /* Ressaltat net amb vora radiant instantani, sense filtres pesats ni canvis de z-index que bloquegin el clic */
                .pending-roof-icon:hover .roof-circle, .liberated-roof-icon:hover .roof-circle, .sala-nova-icon:hover, .pavello-icon:hover {
                    box-shadow: 0 0 16px #fbbf24 !important;
                    border-color: #fbbf24 !important;
                }
            `}</style>

            <MapContainer
                center={position}
                zoom={16}
                zoomSnap={0.5}
                style={{ height: '100%', width: '100%' }}
                zoomControl={false}
            >
                <MapEventListener lastDamageEvent={lastDamageEvent} addDamageText={addDamageText} onMapClickRoof={handleMapClickRoof} />

                {/* Vista Satèl·lit / Ortofoto Oficial ICGC */}
                <TileLayer
                    url="https://geoserveis.icgc.cat/icc_mapesmultibase/noutm/wmts/orto/GRID3857/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.icgc.cat">ICGC</a> Ortofoto'
                    maxZoom={19}
                />

                {gisData.speculationOverlays && gisData.speculationOverlays.map(overlay => (
                    <ImageOverlay
                        key={overlay.id}
                        url={overlay.url}
                        bounds={overlay.bounds}
                        opacity={isEditorMode ? 1.0 : overlay.opacity * (corruptionLevel / 100)}
                        zIndex={10}
                        interactive={false}
                    />
                ))}

                {!isEditorMode && gisData.zones && gisData.zones.map(zone => {
                    const zoneColors = {
                        prioritaria: '#e67e22',
                        apta: '#3498db',
                        no_apta: '#e74c3c'
                    };
                    return (
                        <Polygon
                            key={zone.id}
                            positions={zone.points}
                            interactive={false}
                            pathOptions={{
                                color: zoneColors[zone.type] || '#7f8c8d',
                                fillColor: zoneColors[zone.type] || '#95a5a6',
                                fillOpacity: 0.25,
                                weight: 2,
                                interactive: false
                            }}
                        />
                    );
                })}

                {children}

                {/* 180m Contagion Wave Circle */}
                {contagionWave && (
                    <Circle
                        center={contagionWave.center}
                        radius={contagionWave.radius}
                        interactive={false}
                        pathOptions={{
                            color: '#10b981',
                            fillColor: '#10b981',
                            fillOpacity: 0.22,
                            weight: 3,
                            dashArray: '8, 8',
                            interactive: false
                        }}
                    />
                )}

                {/* Installations: Prominent visual markers (handled by ZoneEditor when in editor mode) */}
                {!isEditorMode && gisData.installations.map((inst) => {
                    if (inst.type !== 'rooftop' && inst.type !== 'pavello' && inst.type !== 'sala_nova') return null;

                    const isLiberated = liberatedNodes && liberatedNodes.has(inst.id);
                    const currentPower = nodePowers && nodePowers[inst.id] !== undefined ? nodePowers[inst.id] : inst.power;

                    // Pick explicit marker icon with high zIndex so markers are always interactable
                    let markerIcon;
                    let zIndex = isLiberated ? 800 : 750;

                    if (inst.type === 'sala_nova') {
                        markerIcon = getSalaNovaIcon(isLiberated);
                        zIndex = 850;
                    } else if (inst.type === 'pavello') {
                        markerIcon = getPavelloIcon(isLiberated);
                        zIndex = 900;
                    } else if (isLiberated) {
                        markerIcon = liberatedRooftopIcon(currentPower, inst.id);
                    } else {
                        markerIcon = pendingRooftopIcon(currentPower, inst.id);
                    }

                    const attackingEnemy = corruptionLevel > 0 ? enemies?.find(en => en.targetId === inst.id && (en.isAttacking || en.reachedTarget)) : null;

                    return (
                        <Marker
                            key={`${inst.id}-${isLiberated ? 'lib' : 'pend'}`}
                            position={inst.coordinates}
                            icon={markerIcon}
                            zIndexOffset={zIndex}
                            eventHandlers={{
                                click: () => {
                                    if (attackingEnemy && onEnemyClick) {
                                        onEnemyClick(attackingEnemy.id);
                                    }
                                    handleLiberateAttempt(inst);
                                }
                            }}
                        />
                    );
                })}

                {/* Bad Energy Projects */}
                {!isEditorMode && gisData.installations.map((inst) => (
                    inst.type === 'industrial_project' && (
                        <Circle
                            key={inst.id}
                            center={inst.coordinates}
                            pathOptions={{ color: '#2c3e50', fillColor: '#95a5a6', fillOpacity: 0.6, dashArray: '10, 10' }}
                            radius={150}
                            interactive={false}
                        />
                    )
                ))}

                {/* Environmental Threats */}
                {!isEditorMode && gisData.environmentalBads.map((bad) => {
                    if (clearedBads && clearedBads.has(bad.id)) return null;

                    return (
                        <Marker
                            key={bad.id}
                            position={bad.coordinates}
                            icon={getBadIcon(bad.type)}
                            zIndexOffset={400}
                            eventHandlers={{
                                click: () => {
                                    if (onBadNodeClick) onBadNodeClick(bad.id, bad.type);
                                }
                            }}
                        />
                    );
                })}

                {/* ENEMIES (The Suits / Homes de negre) */}
                {!isEditorMode && corruptionLevel > 0 && enemies && enemies.map((enemy) => (
                    <React.Fragment key={`enemy-frag-${enemy.id}`}>
                        {enemy.isAttacking && (
                            <Circle
                                center={[enemy.lat, enemy.lng]}
                                radius={22}
                                interactive={false}
                                pathOptions={{
                                    color: '#ef4444',
                                    fillColor: '#ef4444',
                                    fillOpacity: 0.35,
                                    weight: 3,
                                    dashArray: '5, 5',
                                    interactive: false
                                }}
                            />
                        )}
                        <Marker
                            key={`enemy-marker-${enemy.id}`}
                            position={[enemy.lat, enemy.lng]}
                            icon={getSuitIcon(enemy.isAttacking)}
                            zIndexOffset={9999}
                            eventHandlers={{
                                click: (e) => {
                                    L.DomEvent.stopPropagation(e);
                                    if (onEnemyClick) onEnemyClick(enemy.id);
                                }
                            }}
                        />
                    </React.Fragment>
                ))}

            </MapContainer>

            {/* Grid Overlay for High Corruption */}
            <div
                className="speculation-grid-overlay"
                style={{
                    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 400,
                    backgroundImage: `linear-gradient(rgba(0,0,0,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.5) 1px, transparent 1px)`,
                    backgroundSize: '50px 50px',
                    opacity: corruptionLevel > 50 ? (corruptionLevel - 50) / 50 : 0,
                    transition: 'opacity 0.5s'
                }}
            ></div>

            {/* Floating Feedback Elements */}
            {feedbackItems.map(item => (
                <div
                    key={item.id}
                    className={`floating-feedback feedback-${item.type}`}
                    style={{ left: item.x, top: item.y }}
                >
                    {item.icon} {item.text}
                </div>
            ))}
        </div>
    );
};

export default GameMap;
