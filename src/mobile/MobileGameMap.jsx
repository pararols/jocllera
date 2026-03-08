import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, ImageOverlay, Polygon } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import gisData from '../data/gis_data.json';
import { Leaf, DollarSign, Wind, Flame, Droplets, Zap, ShieldAlert, Cpu, Coins, Ban, X, TreeDeciduous } from 'lucide-react';

// Fix for default marker icon in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// --- CUSTOM ICONS ---
// Instantiated ONCE outside the component so they don't force Leaflet to recreate the DOM 
// every 100ms when the marker moves, which breaks the click events.
const suitIcon = new L.divIcon({
    className: 'custom-enemy-icon',
    html: `
        <div style="background: white; border-radius: 50%; padding: 4px; box-shadow: 0 4px 8px rgba(0,0,0,0.3); border: 2px solid #e74c3c; cursor: pointer; pointer-events: auto;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2c3e50" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="7" r="4" />
                <path d="M5.5 21v-2a4 4 0 0 1 4-4h5a4 4 0 0 1 4 4v2" />
                <path d="M12 11l-1 4.5l1 1.5l1-1.5l-1-4.5" fill="#e74c3c" stroke="none" />
                <path d="M12 11l-1 4.5l1 1.5l1-1.5l-1-4.5" stroke="#2c3e50" stroke-width="1" fill="none" />
            </svg>
        </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20]
});

const badIcon = new L.divIcon({
    className: 'custom-bad-icon',
    html: `
        <div style="background: white; border-radius: 50%; padding: 4px; box-shadow: 0 4px 8px rgba(0,0,0,0.3); border: 2px solid #d35400; cursor: pointer; pointer-events: auto;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#d35400" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
            </svg>
        </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20]
});
// --------------------

// We create an internal component to access the Leaflet map instance for coordinate projection
const MapEventListener = ({ lastDamageEvent, addDamageText }) => {
    const map = useMap();
    React.useEffect(() => {
        if (lastDamageEvent) {
            const pt = map.latLngToContainerPoint([lastDamageEvent.lat, lastDamageEvent.lng]);
            addDamageText(pt, lastDamageEvent);
        }
    }, [lastDamageEvent, map, addDamageText]);
    return null;
};

const GameMap = ({ corruptionLevel, liberatedNodes, onLiberateNode, enemies, onEnemyClick, clearedBads, onBadNodeClick, lastDamageEvent, children, isEditorMode, mapType = 'ortho', isMobileHudExpanded }) => {
    const position = gisData.center; // Sant Jordi Desvalls center
    const [feedbackItems, setFeedbackItems] = React.useState([]);
    const [activeInfo, setActiveInfo] = React.useState(null);
    const [lastInteraction, setLastInteraction] = React.useState(null);


    // Audio Context Ref
    const audioCtxRef = React.useRef(null);

    React.useEffect(() => {
        // Initialize Audio Context on first user interaction (browser policy)
        const initAudio = () => {
            if (!audioCtxRef.current) {
                audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
            }
        };
        window.addEventListener('click', initAudio, { once: true });
        return () => window.removeEventListener('click', initAudio);
    }, []);

    const playTocSound = () => {
        if (!audioCtxRef.current) return;
        const ctx = audioCtxRef.current;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(150, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.1);

        gain.gain.setValueAtTime(0.5, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
    };

    const playEnemyHitSound = () => {
        if (!audioCtxRef.current) return;
        const ctx = audioCtxRef.current;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(80, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(20, ctx.currentTime + 0.2);

        gain.gain.setValueAtTime(0.8, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
    };

    const triggerFeedback = (power, containerPoint) => {
        playTocSound(); // TOC!

        // Calculate Values
        const energy = power * 1350;
        const savedMoney = Math.round(energy * 0.18);
        const savedCO2 = Math.round(energy * 0.29);

        // Add Visual Feedback with more spacing
        // Y goes UP (negative) for floating text
        const newFeedbacks = [
            { id: Date.now() + 'money', x: containerPoint.x, y: containerPoint.y - 50, text: `+${savedMoney} €`, icon: <Coins size={24} />, type: 'money' },
            { id: Date.now() + 'co2', x: containerPoint.x, y: containerPoint.y - 120, text: `-${savedCO2} kg CO2`, type: 'co2' },
            { id: Date.now() + 'bad', x: containerPoint.x, y: containerPoint.y - 190, icon: <Ban size={24} />, text: 'Especulació', type: 'bad' }
        ];

        setFeedbackItems(prev => [...prev, ...newFeedbacks]);

        // Cleanup after animation
        setTimeout(() => {
            setFeedbackItems(prev => prev.filter(item => !newFeedbacks.find(f => f.id === item.id)));
        }, 3000);
    };

    // Use useCallback so it's stable for the useEffect listener
    const addDamageText = React.useCallback((containerPoint, evt) => {
        playEnemyHitSound();
        const newFeedback = {
            id: evt.id,
            x: containerPoint.x,
            y: containerPoint.y - 30,
            text: evt.text,
            type: evt.type === 'critical' ? 'bad' : 'damage',
            icon: evt.type === 'critical' ? <Ban size={20} /> : <ShieldAlert size={20} />
        };

        setFeedbackItems(prev => [...prev, newFeedback]);

        setTimeout(() => {
            setFeedbackItems(prev => prev.filter(item => item.id !== evt.id));
        }, 3000);
    }, []);

    const handleLiberateAttempt = (id, power, owner, latlng, containerPoint) => {
        // Always show info card first
        setActiveInfo({
            id, owner, power,
            x: containerPoint.x,
            y: containerPoint.y + 40,
            isLiberated: liberatedNodes && liberatedNodes.has(id)
        });

        if (!liberatedNodes || liberatedNodes.has(id)) return; // Already liberated

        // Track for feedback
        setLastInteraction({ id, power, x: containerPoint.x, y: containerPoint.y });

        // Delegate to Parent (App.jsx) to decide on Mini-game
        onLiberateNode(id, power, owner, latlng, containerPoint);
    };

    // Trigger feedback when a valid interaction finally completes
    React.useEffect(() => {
        if (lastInteraction && liberatedNodes.has(lastInteraction.id) && !lastInteraction.played) {
            triggerFeedback(lastInteraction.power, { x: lastInteraction.x, y: lastInteraction.y - 40 });

            // Mark as played to prevent duplicate feedback
            setLastInteraction(prev => ({ ...prev, played: true }));

            // Optionally update UI card if still visible
            setActiveInfo(prev => prev && prev.id === lastInteraction.id ? { ...prev, isLiberated: true } : prev);
        }
    }, [liberatedNodes, lastInteraction]);

    // Auto-hide info card after 3 seconds
    React.useEffect(() => {
        let timer;
        if (activeInfo) {
            timer = setTimeout(() => {
                setActiveInfo(null);
            }, 3000);
        }
        return () => {
            if (timer) clearTimeout(timer);
        };
    }, [activeInfo]);

    // CSS Filter applied to the wrapper, NOT the MapContainer directly (safer for Leaflet)
    const wrapperStyle = {
        height: '100vh',
        width: '100%',
        position: 'relative',
        filter: isEditorMode ? 'none' : `grayscale(${corruptionLevel}%) contrast(${100 + corruptionLevel / 2}%) hue-rotate(-${corruptionLevel / 5}deg)`,
        transition: 'filter 0.5s ease-out' // Faster transition for responsiveness
    };

    return (
        <div className="map-wrapper" style={wrapperStyle}>
            {/* Minigame Overlay Removed from here */}

            <MapContainer
                center={position}
                zoom={16}
                style={{ height: '100%', width: '100%', borderRadius: '12px' }}
                zoomControl={false}
            >
                <MapEventListener lastDamageEvent={lastDamageEvent} addDamageText={addDamageText} />

                {mapType === 'ortho' ? (
                    <TileLayer
                        url="https://geoserveis.icgc.cat/icc_mapesmultibase/noutm/wmts/orto/GRID3857/{z}/{x}/{y}.png"
                        attribution='&copy; <a href="https://www.icgc.cat">Institut Cartogràfic i Geològic de Catalunya</a>'
                    />
                ) : (
                    <TileLayer
                        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                    />
                )}

                {/* GIS Speculation Overlays (Priority Zones) */}
                {gisData.speculationOverlays && gisData.speculationOverlays.map(overlay => (
                    <ImageOverlay
                        key={overlay.id}
                        url={overlay.url}
                        bounds={overlay.bounds}
                        opacity={isEditorMode ? 1.0 : overlay.opacity * (corruptionLevel / 100)} // Variable opacity based on corruption
                        zIndex={10}
                    />
                ))}

                {/* Custom Saved Zones (Polygons) */}
                {gisData.zones && gisData.zones.map(zone => {
                    const zoneColors = {
                        prioritaria: '#e67e22',
                        apta: '#3498db',
                        no_apta: '#e74c3c'
                    };
                    return (
                        <Polygon
                            key={zone.id}
                            positions={zone.points}
                            pathOptions={{
                                color: zoneColors[zone.type] || '#7f8c8d',
                                fillColor: zoneColors[zone.type] || '#95a5a6',
                                fillOpacity: 0.4,
                                weight: 2
                            }}
                        />
                    );
                })}

                {children}

                {/* Good Energy Installations (Rooftop Solar) */}
                {!isEditorMode && gisData.installations.map((inst) => {
                    if (inst.type !== 'rooftop' && inst.type !== 'pavello' && inst.type !== 'sala_nova') return null;


                    const isLiberated = liberatedNodes && liberatedNodes.has(inst.id);


                    // Dynamic Radius based on Power
                    let radius = 6;
                    if (inst.power >= 5 && inst.power < 10) radius = 10;
                    if (inst.power >= 10) radius = 20;
                    if (inst.type === 'pavello') radius = 35; // Pavello is big
                    if (inst.type === 'sala_nova') radius = 25; // Sala Nova is medium-big

                    return (
                        <Circle
                            key={inst.id}
                            center={inst.coordinates}
                            pathOptions={{
                                color: isLiberated ? ((inst.type === 'pavello' || inst.type === 'sala_nova') ? '#f1c40f' : '#2ecc71') : '#7f8c8d',
                                fillColor: isLiberated ? ((inst.type === 'pavello' || inst.type === 'sala_nova') ? '#f39c12' : '#27ae60') : '#95a5a6',
                                fillOpacity: isLiberated ? 0.8 : 0.4,
                                weight: (inst.type === 'pavello' || inst.type === 'sala_nova') ? 5 : (isLiberated ? 3 : 1)
                            }}
                            radius={radius}
                            className={isLiberated ? 'pulsing-node' : ''}
                            eventHandlers={{
                                click: (e) => handleLiberateAttempt(inst.id, inst.power, inst.owner, e.latlng, e.containerPoint)
                            }}
                        />
                    );
                })}

                {/* Bad Energy Projects (Speculation) */}
                {!isEditorMode && gisData.installations.map((inst) => (
                    inst.type === 'industrial_project' && (
                        <Circle
                            key={inst.id}
                            center={inst.coordinates}
                            pathOptions={{ color: '#2c3e50', fillColor: '#95a5a6', fillOpacity: 0.6, dashArray: '10, 10' }}
                            radius={150} // Large impact area
                        >
                            <Popup>
                                <strong>PROJECTE ESPECULATIU</strong><br />
                                Amenaça: {inst.threatLevel.toUpperCase()}<br />
                                <em>Drenant recursos...</em>
                            </Popup>
                        </Circle>
                    )
                ))}

                {/* Environmental Bads (Drains) */}
                {!isEditorMode && gisData.environmentalBads.map((bad) => {
                    if (clearedBads && clearedBads.has(bad.id)) return null;

                    return (
                        <Marker
                            key={bad.id}
                            position={bad.coordinates}
                            icon={badIcon}
                            eventHandlers={{
                                click: () => {
                                    if (onBadNodeClick) onBadNodeClick(bad.id, bad.type);
                                }
                            }}
                        />
                    );
                })}

                {/* ENEMIES (The Suits) */}
                {!isEditorMode && enemies && enemies.map((enemy) => {
                    return (
                        <Marker
                            key={enemy.id}
                            position={[enemy.lat, enemy.lng]}
                            icon={suitIcon}
                            eventHandlers={{
                                click: () => {
                                    if (onEnemyClick) onEnemyClick(enemy.id);
                                }
                            }}
                        />
                    );
                })}

            </MapContainer>

            {/* Grid Overlay for Speculation Effect (High Corruption) */}
            <div
                className="speculation-grid-overlay"
                style={{
                    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 400,
                    backgroundImage: `linear-gradient(rgba(0,0,0,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.5) 1px, transparent 1px)`,
                    backgroundSize: '50px 50px',
                    opacity: corruptionLevel > 50 ? (corruptionLevel - 50) / 50 : 0, // Only visible above 50%
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

            {/* Custom Node Info Card (Active Popup Replacement) */}
            {activeInfo && (
                <div
                    className="node-info-card"
                    style={{ left: activeInfo.x, top: activeInfo.y }}
                >
                    <div className="node-info-close" onClick={() => setActiveInfo(null)}><X size={16} /></div>
                    {activeInfo.isLiberated ?
                        <TreeDeciduous size={32} color="#2ecc71" style={{ margin: '0 auto', display: 'block' }} /> :
                        <Zap size={24} color="#7f8c8d" style={{ margin: '0 auto', display: 'block' }} />
                    }
                    <h3>{activeInfo.owner}</h3>
                    <p style={{ margin: '5px 0', fontSize: '0.9rem' }}>Power: <strong>{activeInfo.power} kW</strong></p>
                    <p style={{ margin: '5px 0', fontSize: '0.8rem', color: '#27ae60' }}>
                        {activeInfo.isLiberated ? 'SOBIRANIA ENERGÈTICA' : 'ACTIVAT'}
                    </p>

                </div>
            )}

        </div>
    );
};

export default MobileGameMap;
