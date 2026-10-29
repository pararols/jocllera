import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, useMapEvents, ImageOverlay, Polygon, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import gisData from '../data/gis_data.json';
import { Leaf, DollarSign, Wind, Flame, Droplets, Zap, ShieldAlert, Cpu, Coins, Ban, X, TreeDeciduous, Map as MapIcon, Play, RotateCcw } from 'lucide-react';
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
        <div title="Home de negre (Especulador) - Toca per expulsar-lo!" style="
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
        <div title="🚨 SABOTATGE EN CURS! Toca per foragitar l'Home de Negre!" style="
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
        <div onclick="if(window.__triggerRooftopMobile){window.__triggerRooftopMobile('${id}');}" style="width: 50px; height: 50px; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; pointer-events: auto;">
            <div style="
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
        <div onclick="if(window.__triggerRooftopMobile){window.__triggerRooftopMobile('${id}');}" style="width: 50px; height: 50px; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; pointer-events: auto;">
            <div style="
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
        <div onclick="if(window.__triggerRooftopMobile){window.__triggerRooftopMobile('sala_nova_001');}" style="
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
            pointer-events: auto;
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
        <div onclick="if(window.__triggerRooftopMobile){window.__triggerRooftopMobile('pavello_001');}" style="
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
            pointer-events: auto;
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
            <div title="${title}" style="background: white; border-radius: 50%; padding: 3px; box-shadow: 0 4px 10px rgba(0,0,0,0.35); border: 2.5px solid ${borderColor}; cursor: pointer; pointer-events: auto; display: flex; align-items: center; justify-content: center; width: 36px; height: 36px;">
                <span style="font-size: 20px; line-height: 1;">${emoji}</span>
            </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        popupAnchor: [0, -18]
    });
    badIconCache[type] = icon;
    return icon;
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

const MobileGameMap = ({
    corruptionLevel,
    liberatedNodes,
    onLiberateNode,
    enemies,
    onEnemyClick,
    clearedBads,
    onBadNodeClick,
    lastDamageEvent,
    mapType = 'ortho',
    setMapType,
    totalRooftopNodes,
    contagionWave,
    nodePowers
}) => {
    const position = gisData.center;
    const [feedbackItems, setFeedbackItems] = React.useState([]);
    const [selectedNode, setSelectedNode] = React.useState(null);
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

    const lastTapRef = React.useRef(0);
    const handleNodeTap = (inst, e) => {
        const now = Date.now();
        if (now - lastTapRef.current < 350) return;
        lastTapRef.current = now;

        // If an enemy is currently attacking this rooftop, expelling the enemy happens IMMEDIATELY,
        // and we STILL proceed to launch the minigame!
        const attackingEnemy = corruptionLevel > 0 ? enemies?.find(en => en.targetId === inst.id && (en.isAttacking || en.reachedTarget)) : null;
        if (attackingEnemy && onEnemyClick) {
            onEnemyClick(attackingEnemy.id);
        }

        const posX = e?.containerPoint ? e.containerPoint.x : window.innerWidth / 2;
        const posY = e?.containerPoint ? e.containerPoint.y : window.innerHeight / 2;
        
        // Direct tap-to-play: immediately open the minigame on mobile just like desktop!
        setLastInteraction({ id: inst.id, power: inst.power, x: posX, y: posY });
        onLiberateNode(inst.id, inst.power, inst.owner, e?.latlng, e?.containerPoint);
    };

    const handleMapClickRoof = (latlng, containerPoint) => {
        // Find if user tapped within 75 meters of any installation (generous click radius)
        let closest = null;
        let minDist = 75;
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
            handleNodeTap(closest, { latlng, containerPoint });
        }
    };

    React.useEffect(() => {
        window.__triggerRooftopMobile = (id) => {
            const inst = gisData.installations.find(i => i.id === id);
            if (inst) {
                handleNodeTap(inst);
            }
        };
        return () => {
            delete window.__triggerRooftopMobile;
        };
    }, [enemies, onEnemyClick, onLiberateNode]);

    const handleConfirmLiberate = () => {
        if (!selectedNode) return;
        const { id, power, owner, latlng, containerPoint } = selectedNode;
        setLastInteraction({ id, power, x: containerPoint ? containerPoint.x : window.innerWidth / 2, y: containerPoint ? containerPoint.y : window.innerHeight / 2 });
        setSelectedNode(null);
        onLiberateNode(id, power, owner, latlng, containerPoint);
    };

    React.useEffect(() => {
        if (lastInteraction && liberatedNodes && liberatedNodes.has(lastInteraction.id) && !lastInteraction.played) {
            triggerFeedback(lastInteraction.power, { x: lastInteraction.x, y: lastInteraction.y - 40 });
            setLastInteraction(prev => ({ ...prev, played: true }));
        }
    }, [liberatedNodes, lastInteraction]);

    return (
        <div className="mobile-game-map" style={{ width: '100%', height: '100%', position: 'relative' }}>
            {/* Filter applies ONLY to map tiles, preserving 100% saturation for markers & UI */}
            <style>{`
                .leaflet-tile-pane {
                    filter: grayscale(${corruptionLevel}%) contrast(${100 + corruptionLevel / 2}%);
                    transition: filter 0.6s ease-out;
                }
                @keyframes sabotageShake {
                    0% { transform: scale(1.05) rotate(-6deg); }
                    100% { transform: scale(1.18) rotate(6deg); }
                }
            `}</style>

            <div style={{ height: '100%', width: '100%', position: 'relative' }}>
                <MapContainer
                    center={position}
                    zoom={15}
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
                            opacity={overlay.opacity * (corruptionLevel / 100)}
                            zIndex={10}
                        />
                    ))}

                    {/* 180m Contagion Wave Circle */}
                    {contagionWave && (
                        <Circle
                            center={contagionWave.center}
                            radius={contagionWave.radius}
                            pathOptions={{
                                color: '#10b981',
                                fillColor: '#10b981',
                                fillOpacity: 0.22,
                                weight: 3,
                                dashArray: '8, 8'
                            }}
                        />
                    )}

                    {/* Installations */}
                    {gisData.installations.map((inst) => {
                        if (inst.type !== 'rooftop' && inst.type !== 'pavello' && inst.type !== 'sala_nova') return null;

                        const isLiberated = liberatedNodes && liberatedNodes.has(inst.id);

                        let markerIcon;
                        let zIndex = isLiberated ? 800 : 750;

                        const currentPower = nodePowers && nodePowers[inst.id] !== undefined ? nodePowers[inst.id] : inst.power;

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
                                    click: (e) => {
                                        if (e.originalEvent) {
                                            e.originalEvent.stopPropagation();
                                        }
                                        if (attackingEnemy && onEnemyClick) {
                                            onEnemyClick(attackingEnemy.id);
                                        }
                                        handleNodeTap(inst, e);
                                    }
                                }}
                            >
                                <Popup
                                    offset={[0, -20]}
                                    closeButton={true}
                                    autoPan={false}
                                    className="rooftop-map-popup"
                                >
                                    <div style={{ textAlign: 'center', fontFamily: 'var(--font-main)', padding: '2px 4px', userSelect: 'none' }}>
                                        <div style={{ fontWeight: 800, fontSize: '14px', color: '#f8fafc', marginBottom: '2px' }}>
                                            {inst.owner}
                                        </div>
                                        <div style={{ color: attackingEnemy ? '#ef4444' : (isLiberated ? '#10b981' : '#f59e0b'), fontWeight: 'bold', fontSize: '12px', marginBottom: '8px' }}>
                                            {attackingEnemy ? '🚨 SOTA ATAC DE HOMES DE NEGRE!' : (isLiberated ? `⚡ Alliberada (${currentPower.toFixed(1)} kW)` : `🎮 ${getMinigameName(inst)} (${currentPower.toFixed(1)} kW)`)}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleNodeTap(inst, e);
                                                const closeBtn = e.target.closest?.('.leaflet-popup')?.querySelector('.leaflet-popup-close-button');
                                                if (closeBtn) closeBtn.click();
                                            }}
                                            style={{
                                                background: attackingEnemy ? 'linear-gradient(135deg, #ef4444, #b91c1c)' : (isLiberated ? 'linear-gradient(135deg, #3b82f6, #1d4ed8)' : 'linear-gradient(135deg, #10b981, #059669)'),
                                                color: '#ffffff',
                                                border: 'none',
                                                borderRadius: '8px',
                                                padding: '8px 18px',
                                                fontSize: '12px',
                                                fontWeight: 800,
                                                cursor: 'pointer',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                boxShadow: '0 3px 8px rgba(0,0,0,0.3)',
                                                transition: 'transform 0.1s'
                                            }}
                                        >
                                            <Play size={14} fill="#ffffff" /> {attackingEnemy ? '🛡️ EXPULSAR I JUGAR' : (isLiberated ? 'REJUGAR MINIJOC' : 'JUGAR ARA')}
                                        </button>
                                    </div>
                                </Popup>
                            </Marker>
                        );
                    })}

                    {/* Environmental Threats */}
                    {gisData.environmentalBads.map((bad) => {
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

                    {/* Enemies (Homes de negre) */}
                    {corruptionLevel > 0 && enemies && enemies.map((enemy) => (
                        <React.Fragment key={`mobile-enemy-frag-${enemy.id}`}>
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
                                key={`mobile-enemy-marker-${enemy.id}`}
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
            </div>

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

            {/* Bottom Sheet Modal for Mobile Touch Selection */}
            {selectedNode && (
                <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    backgroundColor: 'white', borderTopLeftRadius: '20px', borderTopRightRadius: '20px',
                    padding: '20px', boxShadow: '0 -4px 20px rgba(0,0,0,0.25)', zIndex: 1200,
                    animation: 'slideUp 0.25s ease-out'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '24px' }}>
                                {selectedNode.type === 'sala_nova' ? '🏛️' : selectedNode.type === 'pavello' ? '🏟️' : selectedNode.isLiberated ? '⚡' : '🏠'}
                            </span>
                            <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#1e293b' }}>{selectedNode.owner}</h3>
                        </div>
                        <button
                            onClick={() => setSelectedNode(null)}
                            style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', fontSize: '1.2rem', color: '#64748b', cursor: 'pointer' }}
                        >×</button>
                    </div>

                    <div style={{ display: 'flex', gap: '15px', marginBottom: '15px', fontSize: '0.9rem', color: '#475569' }}>
                        <div>Potència: <strong style={{ color: '#0f172a' }}>{selectedNode.power} kW</strong></div>
                        <div>Estat: <strong style={{ color: selectedNode.isLiberated ? '#10b981' : '#f59e0b' }}>
                            {selectedNode.isLiberated ? '✅ Alliberada' : '⚡ Pendent'}
                        </strong></div>
                    </div>

                    {selectedNode.isLiberated ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '12px', color: '#15803d', fontSize: '0.9rem', textAlign: 'center', fontWeight: 'bold' }}>
                                ✅ Aquesta instal·lació ja forma part de la comunitat energètica!
                            </div>
                            <button
                                onClick={handleConfirmLiberate}
                                style={{
                                    width: '100%', padding: '12px', borderRadius: '12px', border: 'none',
                                    backgroundColor: '#3b82f6', color: 'white', fontWeight: 'bold', fontSize: '1rem',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer'
                                }}
                            >
                                <RotateCcw size={18} /> REJUGAR EL MINIJOC
                            </button>
                        </div>
                    ) : (
                        <div>
                            <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '12px' }}>
                                Minijoc: <strong style={{ color: '#2563eb' }}>{selectedNode.minigameName}</strong>
                            </div>
                            <button
                                onClick={handleConfirmLiberate}
                                style={{
                                    width: '100%', padding: '14px', borderRadius: '12px', border: 'none',
                                    backgroundColor: '#10b981', color: 'white', fontWeight: 'bold', fontSize: '1.05rem',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)', cursor: 'pointer'
                                }}
                            >
                                <Play size={20} /> JUGAR I ALLIBERAR
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default MobileGameMap;
