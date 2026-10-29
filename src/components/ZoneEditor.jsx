import React, { useState, useCallback, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { useMap, useMapEvents, Polygon, Marker, Popup, ImageOverlay, Tooltip } from 'react-leaflet';
import { 
    Pencil, Trash2, Download, Check, Save, Layers, MapPin, 
    MousePointer2, RefreshCw, Crosshair, Search, Building2, 
    Sun, AlertTriangle, X, Move, Eye, Sprout
} from 'lucide-react';
import gisData from '../data/gis_data.json';
import L from 'leaflet';
import { 
    PLATER_ZONE_TYPES, 
    loadPlaterPolygons, 
    savePlaterPolygons, 
    DEFAULT_PLATER_ZONES 
} from '../data/plater_default_zones';

const ZoneEditor = ({ onSave, onClose }) => {
    const map = useMap();

    // 1. STATE INITIALIZATION (Incorporating saved custom coords)
    const [installations, setInstallations] = useState(() => {
        let savedCoords = {};
        try {
            savedCoords = JSON.parse(localStorage.getItem('llera_custom_coords') || '{}');
        } catch (e) {}

        return (gisData.installations || []).map(inst => {
            const coords = savedCoords[inst.id] || ((inst.type === 'pavello' || inst.type === 'sala_nova') ? savedCoords[inst.type] : null) || inst.coordinates;
            inst.coordinates = coords;
            return {
                ...inst,
                coordinates: [...coords]
            };
        });
    });

    const [bads, setBads] = useState(() => {
        let savedCoords = {};
        try {
            savedCoords = JSON.parse(localStorage.getItem('llera_custom_coords') || '{}');
        } catch (e) {}

        return (gisData.environmentalBads || []).map(bad => {
            const coords = savedCoords[bad.id] || savedCoords[bad.type] || bad.coordinates;
            bad.coordinates = coords;
            return {
                ...bad,
                coordinates: [...coords]
            };
        });
    });

    const [zones, setZones] = useState(() => {
        return (gisData.zones || []).map(z => ({
            ...z,
            points: z.points.map(pt => [...pt])
        }));
    });

    // Editor modes: 'move' (default!), 'polygon', 'threat', 'plater'
    const [editMode, setEditMode] = useState('move');
    const [filterCategory, setFilterCategory] = useState('all'); // 'all', 'special', 'rooftops', 'threats'
    const [searchQuery, setSearchQuery] = useState('');
    const [toastMessage, setToastMessage] = useState(null);

    // Polygon drawing state (general zones)
    const [currentPoints, setCurrentPoints] = useState([]);
    const [currentType, setCurrentType] = useState('prioritaria');

    // New threat adding state
    const [threatType, setThreatType] = useState('estufes_terrasses');

    // Plater specific zones state (bosc, riu, cami, camps)
    const [platerPolygons, setPlaterPolygons] = useState(() => loadPlaterPolygons());
    const [currentPlaterType, setCurrentPlaterType] = useState('bosc');
    const [selectedPlaterPolyId, setSelectedPlaterPolyId] = useState(null);

    const zoneTypes = {
        prioritaria: { label: 'Prioritària', color: '#e67e22', icon: '🟠' },
        apta: { label: 'Apta', color: '#3498db', icon: '🔵' },
        no_apta: { label: 'No Apta', color: '#e74c3c', icon: '🔴' }
    };

    const threatConfig = {
        estufes_terrasses: { label: 'Estufes de Terrasses', icon: '🔥', color: '#e67e22', badge: 'ESTUFES' },
        piscines_clim: { label: 'Piscines Climatitzades', icon: '🏊', color: '#3498db', badge: 'PISCINA' },
        camp_golf: { label: 'Camp de Golf', icon: '⛳', color: '#2ecc71', badge: 'GOLF' },
        bomba_calor: { label: 'Bomba de Calor Ineficient', icon: '❄️', color: '#9b59b6', badge: 'BOMBA' }
    };

    // Auto-dismiss toast
    useEffect(() => {
        if (!toastMessage) return;
        const timer = setTimeout(() => setToastMessage(null), 3500);
        return () => clearTimeout(timer);
    }, [toastMessage]);

    // Fly to Plater / Municipality when entering 'plater' edit mode
    useEffect(() => {
        if (editMode === 'plater' && map) {
            map.flyTo(gisData.center || [42.0719, 2.9569], 15, { duration: 0.8 });
            setCurrentPoints([]);
            setSelectedPlaterPolyId(null);
        } else {
            setSelectedPlaterPolyId(null);
        }
    }, [editMode, map]);

    // Map Click Handler (Active for polygon, threat, or plater zone adding)
    const MapClickHandler = () => {
        useMapEvents({
            click(e) {
                const { lat, lng } = e.latlng;

                if (editMode === 'polygon') {
                    setCurrentPoints(prev => [...prev, [lat, lng]]);
                } else if (editMode === 'plater') {
                    // Si s'està editant un polígon existent, un clic a un espai buit del mapa deselecciona l'edició
                    if (selectedPlaterPolyId && currentPoints.length === 0) {
                        setSelectedPlaterPolyId(null);
                        setToastMessage("Edició de vèrtexs finalitzada");
                        return;
                    }
                    setCurrentPoints(prev => [...prev, [lat, lng]]);
                } else if (editMode === 'threat') {
                    const newBad = {
                        id: `bad_${threatType}_${Date.now()}`,
                        type: threatType,
                        coordinates: [lat, lng]
                    };
                    setBads(prev => [...prev, newBad]);
                    gisData.environmentalBads.push(newBad);
                    try {
                        const saved = JSON.parse(localStorage.getItem('llera_custom_coords') || '{}');
                        saved[newBad.id] = [lat, lng];
                        localStorage.setItem('llera_custom_coords', JSON.stringify(saved));
                    } catch (err) {}
                    setToastMessage(`✅ Afegida nova amenaça: ${threatConfig[threatType]?.label || threatType}`);
                }
            },
        });
        return null;
    };

    // UPDATE INSTALLATION POSITION (Pavelló, Sala Nova, or any Rooftop Minigame)
    const updateInstallationPos = (id, newCoords) => {
        setInstallations(prev => prev.map(inst => inst.id === id ? { ...inst, coordinates: newCoords } : inst));

        // Immediately update live in-memory gisData
        const target = gisData.installations?.find(i => i.id === id || ((id === 'pavello' || id === 'sala_nova') && i.type === id));
        if (target) {
            target.coordinates = newCoords;
        }

        // Save to localStorage for instant persistence across reloads
        try {
            const saved = JSON.parse(localStorage.getItem('llera_custom_coords') || '{}');
            saved[id] = newCoords;
            if (target?.type === 'pavello' || target?.type === 'sala_nova') {
                saved[target.type] = newCoords;
            }
            localStorage.setItem('llera_custom_coords', JSON.stringify(saved));
        } catch (e) {
            console.error('Error saving custom coords:', e);
        }

        const name = target?.owner || (target?.type === 'pavello' ? 'Pavelló Municipal' : (target?.type === 'sala_nova' ? 'Sala Nova' : `Teulada #${id}`));
        setToastMessage(`📍 Mogut: ${name} → [${newCoords[0].toFixed(5)}, ${newCoords[1].toFixed(5)}]`);
    };

    const nudgeInstallationPos = (id, deltaLat, deltaLng) => {
        const inst = installations.find(i => i.id === id);
        if (!inst || !inst.coordinates) return;
        const newCoords = [
            Number((inst.coordinates[0] + deltaLat).toFixed(6)),
            Number((inst.coordinates[1] + deltaLng).toFixed(6))
        ];
        updateInstallationPos(id, newCoords);
    };

    // UPDATE ENVIRONMENTAL BAD POSITION
    const updateBadPos = (id, newCoords) => {
        setBads(prev => prev.map(b => b.id === id ? { ...b, coordinates: newCoords } : b));

        const target = gisData.environmentalBads?.find(b => b.id === id);
        if (target) {
            target.coordinates = newCoords;
        }

        try {
            const saved = JSON.parse(localStorage.getItem('llera_custom_coords') || '{}');
            saved[id] = newCoords;
            localStorage.setItem('llera_custom_coords', JSON.stringify(saved));
        } catch (e) {
            console.error('Error saving custom coords:', e);
        }

        const label = threatConfig[target?.type]?.label || id;
        setToastMessage(`📍 Moguda amenaça: ${label} → [${newCoords[0].toFixed(5)}, ${newCoords[1].toFixed(5)}]`);
    };

    const nudgeBadPos = (id, deltaLat, deltaLng) => {
        const bad = bads.find(b => b.id === id);
        if (!bad || !bad.coordinates) return;
        const newCoords = [
            Number((bad.coordinates[0] + deltaLat).toFixed(6)),
            Number((bad.coordinates[1] + deltaLng).toFixed(6))
        ];
        updateBadPos(id, newCoords);
    };

    const deleteBad = (id) => {
        setBads(prev => prev.filter(b => b.id !== id));
        gisData.environmentalBads = gisData.environmentalBads.filter(b => b.id !== id);
        try {
            const saved = JSON.parse(localStorage.getItem('llera_custom_coords') || '{}');
            delete saved[id];
            localStorage.setItem('llera_custom_coords', JSON.stringify(saved));
        } catch (e) {}
        setToastMessage(`🗑️ Amenaça eliminada`);
    };

    const flyToCoords = (coords) => {
        if (!coords || coords.length < 2) return;
        map.flyTo(coords, 18, { duration: 0.8 });
    };

    // POLYGON MANAGEMENT
    const finishPolygon = () => {
        if (currentPoints.length < 3) {
            alert("Calen almenys 3 punts per a tancar un polígon.");
            return;
        }
        const newZone = {
            id: `zone-${Date.now()}`,
            type: currentType,
            points: currentPoints,
            name: `${zoneTypes[currentType].label} ${zones.length + 1}`
        };
        setZones(prev => [...prev, newZone]);
        setCurrentPoints([]);
        setToastMessage(`📐 Nova zona ${zoneTypes[currentType].label} creada!`);
    };

    const deleteZone = (id) => {
        setZones(prev => prev.filter(z => z.id !== id));
        setToastMessage(`🗑️ Zona eliminada`);
    };

    // PLATER LAYERS MANAGEMENT (Bosc, Riu, Camí, Camps)
    const finishPlaterPolygon = () => {
        if (currentPoints.length < 3) {
            alert("Calen almenys 3 punts per a tancar el polígon de terreny.");
            return;
        }
        const typeInfo = PLATER_ZONE_TYPES[currentPlaterType] || PLATER_ZONE_TYPES.bosc;
        const count = platerPolygons.filter(p => p.type === currentPlaterType).length + 1;
        const newPoly = {
            id: `plater_${currentPlaterType}_${Date.now()}`,
            name: `${typeInfo.shortLabel} #${count}`,
            type: currentPlaterType,
            points: currentPoints
        };
        const updated = [...platerPolygons, newPoly];
        setPlaterPolygons(updated);
        savePlaterPolygons(updated);
        setCurrentPoints([]);
        setToastMessage(`✅ Polígon de ${typeInfo.shortLabel} creat pel joc Aturem el Plater!`);
    };

    const deletePlaterPolygon = (id) => {
        const updated = platerPolygons.filter(p => p.id !== id);
        setPlaterPolygons(updated);
        savePlaterPolygons(updated);
        setToastMessage(`🗑️ Polígon del Plater eliminat`);
    };

    const resetPlaterPolygons = () => {
        if (window.confirm("Vols restaurar els polígons del Plater per defecte (Bosc, Riu, Camí i Camps)?")) {
            setPlaterPolygons(DEFAULT_PLATER_ZONES);
            savePlaterPolygons(DEFAULT_PLATER_ZONES);
            setSelectedPlaterPolyId(null);
            setToastMessage(`🔄 Polígons del Plater restablerts per defecte`);
        }
    };

    // EDICIÓ DINÀMICA DE VÈRTEXS ARROSSEGAR
    const updatePlaterVertex = (polyId, vertexIndex, newCoords, shouldSave = true) => {
        setPlaterPolygons(prev => {
            const updated = prev.map(p => {
                if (p.id !== polyId) return p;
                const newPoints = [...p.points];
                newPoints[vertexIndex] = [newCoords[0], newCoords[1]];
                return { ...p, points: newPoints };
            });
            if (shouldSave) {
                savePlaterPolygons(updated);
            }
            return updated;
        });
        if (shouldSave) {
            setToastMessage("📍 Vèrtex actualitzat");
        }
    };

    const insertPlaterVertex = (polyId, insertIndex, coords) => {
        setPlaterPolygons(prev => {
            const updated = prev.map(p => {
                if (p.id !== polyId) return p;
                const newPoints = [...p.points];
                newPoints.splice(insertIndex, 0, [coords[0], coords[1]]);
                return { ...p, points: newPoints };
            });
            savePlaterPolygons(updated);
            return updated;
        });
        setToastMessage("➕ Nou vèrtex afegit! Ara el pots arrossegar");
    };

    const deletePlaterVertex = (polyId, vertexIndex) => {
        setPlaterPolygons(prev => {
            const updated = prev.map(p => {
                if (p.id !== polyId) return p;
                if (p.points.length <= 3) return p;
                const newPoints = p.points.filter((_, idx) => idx !== vertexIndex);
                return { ...p, points: newPoints };
            });
            savePlaterPolygons(updated);
            return updated;
        });
        setToastMessage("🗑️ Vèrtex eliminat");
    };

    // CANVI DE TIPUS DE TERRENY D'UN POLÍGON EXISTENT (ex: de Camps a Bosc, Riu, Camí)
    const changePlaterPolygonType = (polyId, newType) => {
        const newTypeInfo = PLATER_ZONE_TYPES[newType];
        if (!newTypeInfo) return;

        setPlaterPolygons(prev => {
            const count = prev.filter(p => p.type === newType && p.id !== polyId).length + 1;
            const updated = prev.map(p => {
                if (p.id !== polyId) return p;
                return {
                    ...p,
                    type: newType,
                    name: `${newTypeInfo.shortLabel} #${count}`
                };
            });
            savePlaterPolygons(updated);
            return updated;
        });
        setToastMessage(`🔄 Tipus canviat a: ${newTypeInfo.shortLabel} ${newTypeInfo.icon}`);
    };

    const createVertexIcon = (color) => L.divIcon({
        className: 'custom-vertex-handle',
        html: `
            <div style="
                width: 15px;
                height: 15px;
                background: #ffffff;
                border: 3.5px solid ${color};
                border-radius: 50%;
                box-shadow: 0 2px 7px rgba(0,0,0,0.6);
                cursor: grab;
                transition: transform 0.1s ease;
            "></div>
        `,
        iconSize: [15, 15],
        iconAnchor: [7.5, 7.5]
    });

    const createMidpointIcon = (color) => L.divIcon({
        className: 'custom-midpoint-handle',
        html: `
            <div style="
                width: 11px;
                height: 11px;
                background: ${color};
                border: 2px solid #ffffff;
                border-radius: 50%;
                box-shadow: 0 1px 4px rgba(0,0,0,0.5);
                opacity: 0.9;
                cursor: pointer;
            "></div>
        `,
        iconSize: [11, 11],
        iconAnchor: [5.5, 5.5]
    });

    // EXPORT & DIRECT SAVE
    const exportData = async () => {
        savePlaterPolygons(platerPolygons);
        const fullData = {
            ...gisData,
            installations: installations,
            environmentalBads: bads,
            zones: zones,
            platerPolygons: platerPolygons
        };

        // Mutate live gisData
        Object.assign(gisData, fullData);

        const dataStr = JSON.stringify(fullData, null, 2);

        let savedDirectly = false;
        try {
            const resp = await fetch('/api/save-gis', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: dataStr
            });
            if (resp.ok) savedDirectly = true;
        } catch (e) {
            console.error('Save to /api/save-gis failed:', e);
        }

        // Copy to clipboard
        if (navigator.clipboard) {
            try { await navigator.clipboard.writeText(dataStr); } catch (e) {}
        }

        // Auto download file
        try {
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'gis_data.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (e) {
            console.error('Download error:', e);
        }

        if (savedDirectly) {
            alert("✅ Dades guardades directament a 'src/data/gis_data.json', copiades al porta-retalls i descarregades com a fitxer!");
        } else {
            alert("✅ Dades copiades al porta-retalls i descarregades com a 'gis_data.json'!");
        }

        if (onSave) onSave(fullData);
    };

    const resetToOriginal = () => {
        if (window.confirm("Vols restablir totes les posicions de teulades, Pavelló, Sala Nova i amenaces a l'estat original de gis_data.json?")) {
            localStorage.removeItem('llera_custom_coords');
            window.location.reload();
        }
    };

    // STABLE ICONS CACHE (Prevents Leaflet from destroying marker DOM nodes during re-renders)
    const editorIconCache = useMemo(() => new Map(), []);
    const badEditorIconCache = useMemo(() => new Map(), []);

    // ICONS GENERATION FOR DRAGGABLE MARKERS
    const getEditorInstallationIcon = useCallback((inst) => {
        const cacheKey = `${inst.id}-${inst.type}-${inst.minigame || ''}-${inst.power}`;
        if (editorIconCache.has(cacheKey)) {
            return editorIconCache.get(cacheKey);
        }

        let bg = 'linear-gradient(135deg, #3b82f6, #1d4ed8)';
        let borderColor = '#ffffff';
        let icon = '☀️';
        let label = 'TEULADA';
        let badgeText = `${inst.power}k`;

        if (inst.type === 'sala_nova') {
            bg = 'linear-gradient(135deg, #10b981, #047857)';
            borderColor = '#facc15';
            icon = '🏛️';
            label = 'SALA NOVA';
            badgeText = '17k';
        } else if (inst.type === 'pavello') {
            bg = 'linear-gradient(135deg, #f59e0b, #b45309)';
            borderColor = '#ffffff';
            icon = '🏟️';
            label = 'PAVELLÓ';
            badgeText = '127k';
        } else {
            // Rooftop minigames
            const gameConfig = {
                connect: { icon: '🔌', bg: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', label: 'CONNECT' },
                slider: { icon: '⚖️', bg: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', label: 'SLIDER' },
                rhythm: { icon: '🎵', bg: 'linear-gradient(135deg, #ec4899, #be185d)', label: 'RITME' },
                quiz: { icon: '❓', bg: 'linear-gradient(135deg, #06b6d4, #0e7490)', label: 'QUIZ' },
                balance: { icon: '⚡', bg: 'linear-gradient(135deg, #10b981, #059669)', label: 'BALANÇ' }
            };
            const cfg = gameConfig[inst.minigame] || { icon: '☀️', bg: 'linear-gradient(135deg, #475569, #334155)', label: 'MINIJOC' };
            bg = cfg.bg;
            icon = cfg.icon;
            label = cfg.label;
        }

        const divIcon = L.divIcon({
            className: 'editor-inst-icon',
            html: `
                <div style="
                    width: 46px;
                    height: 52px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    cursor: grab;
                    user-select: none;
                    pointer-events: auto;
                " title="${inst.owner || inst.id} (${label}) - Arrossega per moure">
                    <div style="
                        background: ${bg};
                        border: 2.5px solid ${borderColor};
                        border-radius: 50%;
                        width: 36px;
                        height: 36px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 19px;
                        box-shadow: 0 4px 12px rgba(0,0,0,0.6), 0 0 10px rgba(255,255,255,0.4);
                        pointer-events: none;
                    ">
                        ${icon}
                    </div>
                    <div style="
                        background: #0f172a;
                        color: #f8fafc;
                        font-size: 9px;
                        font-weight: 800;
                        padding: 1px 5px;
                        border-radius: 5px;
                        border: 1px solid rgba(255,255,255,0.4);
                        white-space: nowrap;
                        margin-top: -5px;
                        box-shadow: 0 2px 5px rgba(0,0,0,0.6);
                        pointer-events: none;
                    ">
                        ${badgeText} • ${label}
                    </div>
                </div>
            `,
            iconSize: [46, 52],
            iconAnchor: [23, 26],
            popupAnchor: [0, -26]
        });

        editorIconCache.set(cacheKey, divIcon);
        return divIcon;
    }, [editorIconCache]);

    const getEditorBadIcon = useCallback((bad) => {
        const cacheKey = `${bad.id}-${bad.type}`;
        if (badEditorIconCache.has(cacheKey)) {
            return badEditorIconCache.get(cacheKey);
        }

        const cfg = threatConfig[bad.type] || { icon: '🔥', color: '#e67e22', badge: 'AMENAÇA' };
        const divIcon = L.divIcon({
            className: 'editor-bad-icon',
            html: `
                <div style="
                    width: 44px;
                    height: 50px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    cursor: grab;
                    user-select: none;
                    pointer-events: auto;
                " title="${cfg.label || bad.type} - Arrossega per moure">
                    <div style="
                        background: ${cfg.color};
                        border: 2.5px solid #ffffff;
                        border-radius: 50%;
                        width: 34px;
                        height: 34px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 18px;
                        box-shadow: 0 4px 10px rgba(0,0,0,0.6);
                        pointer-events: none;
                    ">
                        ${cfg.icon}
                    </div>
                    <div style="
                        background: #450a0a;
                        color: #fecaca;
                        font-size: 9px;
                        font-weight: 800;
                        padding: 1px 5px;
                        border-radius: 5px;
                        border: 1px solid rgba(239, 68, 68, 0.4);
                        white-space: nowrap;
                        margin-top: -5px;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.6);
                        pointer-events: none;
                    ">
                        ${cfg.badge}
                    </div>
                </div>
            `,
            iconSize: [44, 50],
            iconAnchor: [22, 25],
            popupAnchor: [0, -25]
        });

        badEditorIconCache.set(cacheKey, divIcon);
        return divIcon;
    }, [badEditorIconCache]);

    // Filter elements for the list view
    const filteredElements = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        let list = [];

        // Special buildings
        const special = installations.filter(i => i.type === 'pavello' || i.type === 'sala_nova').map(i => ({
            ...i,
            category: 'special',
            displayName: i.type === 'pavello' ? 'Pavelló Municipal (Tycoon)' : 'Sala Nova (Assemblea Solar)',
            displayIcon: i.type === 'pavello' ? '🏟️' : '🏛️',
            badge: `${i.power} kW`
        }));

        // Rooftop minigames
        const rooftops = installations.filter(i => i.type === 'rooftop').map(i => {
            const gameIcons = { connect: '🔌', slider: '⚖️', rhythm: '🎵', quiz: '❓', balance: '⚡' };
            return {
                ...i,
                category: 'rooftops',
                displayName: `${i.owner || 'Veí'} (#${i.id})`,
                displayIcon: gameIcons[i.minigame] || '☀️',
                badge: `${i.power} kW • ${(i.minigame || 'minijoc').toUpperCase()}`
            };
        });

        // Environmental threats
        const threats = bads.map(b => ({
            ...b,
            category: 'threats',
            displayName: threatConfig[b.type]?.label || b.type,
            displayIcon: threatConfig[b.type]?.icon || '🔥',
            badge: 'AMENAÇA'
        }));

        if (filterCategory === 'all') list = [...special, ...rooftops, ...threats];
        else if (filterCategory === 'special') list = special;
        else if (filterCategory === 'rooftops') list = rooftops;
        else if (filterCategory === 'threats') list = threats;

        if (query) {
            list = list.filter(el => 
                el.displayName.toLowerCase().includes(query) ||
                (el.minigame && el.minigame.toLowerCase().includes(query)) ||
                (el.id && el.id.toLowerCase().includes(query))
            );
        }

        return list;
    }, [installations, bads, filterCategory, searchQuery]);

    return (
        <>
            <MapClickHandler />

            {/* PLATER MACRO-PARC SPECULATION POLYGONS (Highlighting the Plater area on the real terrain) */}
            {editMode === 'plater' && gisData.zones?.filter(z => z.type === 'prioritaria' || z.type === 'apta').map(z => (
                <Polygon
                    key={`editor-threat-plater-${z.id}`}
                    positions={z.points}
                    interactive={false}
                    pathOptions={{
                        color: '#e67e22',
                        fillColor: '#f59e0b',
                        fillOpacity: 0.18,
                        weight: 2.5,
                        dashArray: '8, 6'
                    }}
                />
            ))}

            {/* PLATER MEGA-PROJECT CARTOGRAPHY (Semi-transparent in 'plater' mode for tracing) */}
            {editMode === 'plater' && gisData.speculationOverlays?.map(overlay => (
                <ImageOverlay
                    key={`editor-overlay-${overlay.id}`}
                    url={overlay.url}
                    bounds={overlay.bounds}
                    opacity={0.4}
                    zIndex={400}
                    interactive={false}
                />
            ))}

            {/* PLATER EXCLUSIVE TERRAIN POLYGONS (Bosc, Riu, Camí, Camps) */}
            {(editMode === 'plater') && platerPolygons.map(poly => {
                const tInfo = PLATER_ZONE_TYPES[poly.type] || PLATER_ZONE_TYPES.bosc;
                const isSelected = selectedPlaterPolyId === poly.id;
                return (
                    <Polygon
                        key={`editor-plater-${poly.id}`}
                        positions={poly.points}
                        pathOptions={{
                            color: isSelected ? '#ffffff' : tInfo.strokeColor,
                            fillColor: tInfo.color,
                            fillOpacity: isSelected ? 0.5 : 0.35,
                            weight: isSelected ? 4 : 3,
                            dashArray: isSelected ? '4, 4' : (poly.type === 'cami' ? '6, 6' : undefined)
                        }}
                        eventHandlers={{
                            click: (e) => {
                                if (currentPoints.length === 0) {
                                    e.originalEvent?.stopPropagation();
                                    setSelectedPlaterPolyId(isSelected ? null : poly.id);
                                    if (!isSelected) {
                                        setToastMessage(`✏️ Editant vèrtexs de: ${poly.name}. Arrossega els punts blancs!`);
                                    }
                                }
                            }
                        }}
                    >
                        <Popup>
                            <div style={{ textAlign: 'center', padding: '4px' }}>
                                <strong style={{ fontSize: '13px', color: '#0f172a' }}>{tInfo.icon} {poly.name}</strong><br />
                                <span style={{ fontSize: '11px', color: tInfo.strokeColor, fontWeight: 700 }}>
                                    {tInfo.label} ({tInfo.desc})
                                </span><br />
                                <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', marginTop: '6px' }}>
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedPlaterPolyId(isSelected ? null : poly.id);
                                            map.closePopup();
                                        }} 
                                        style={{ color: '#2563eb', border: '1px solid #2563eb', background: '#fff', borderRadius: '4px', cursor: 'pointer', padding: '3px 8px', fontSize: '11px', fontWeight: 'bold' }}
                                    >
                                        {isSelected ? '✓ Tancar Vèrtexs' : '✏️ Editar Vèrtexs'}
                                    </button>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); deletePlaterPolygon(poly.id); }} 
                                        style={{ color: '#ef4444', border: '1px solid #ef4444', background: '#fff', borderRadius: '4px', cursor: 'pointer', padding: '3px 8px', fontSize: '11px', fontWeight: 'bold' }}
                                    >
                                        Eliminar
                                    </button>
                                </div>

                                {/* Selector de canvi de tipus de terreny al Popup */}
                                <div style={{ marginTop: '8px', borderTop: '1px solid #e2e8f0', paddingTop: '6px' }}>
                                    <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 'bold' }}>Canviar tipus:</span>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', marginTop: '4px' }}>
                                        {Object.entries(PLATER_ZONE_TYPES).map(([typeId, t]) => (
                                            <button
                                                key={typeId}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    changePlaterPolygonType(poly.id, typeId);
                                                }}
                                                style={{
                                                    padding: '3px 6px',
                                                    borderRadius: '4px',
                                                    border: poly.type === typeId ? `2px solid ${t.strokeColor}` : '1px solid #cbd5e1',
                                                    background: poly.type === typeId ? t.color : '#ffffff',
                                                    color: poly.type === typeId ? '#ffffff' : '#0f172a',
                                                    fontWeight: poly.type === typeId ? 800 : 600,
                                                    fontSize: '10px',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    justifyContent: 'center'
                                                }}
                                            >
                                                <span>{t.icon}</span> {t.shortLabel}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </Popup>
                    </Polygon>
                );
            })}

            {/* DRAGGABLE VERTEX HANDLES & MIDPOINTS FOR SELECTED PLATER POLYGON */}
            {editMode === 'plater' && selectedPlaterPolyId && (() => {
                const activePoly = platerPolygons.find(p => p.id === selectedPlaterPolyId);
                if (!activePoly || !activePoly.points) return null;
                const tInfo = PLATER_ZONE_TYPES[activePoly.type] || PLATER_ZONE_TYPES.bosc;
                const color = tInfo.strokeColor || tInfo.color;

                return (
                    <React.Fragment key={`vtx-group-${activePoly.id}`}>
                        {/* Vèrtexs arrossegables */}
                        {activePoly.points.map((pt, i) => (
                            <Marker
                                key={`vtx-${activePoly.id}-${i}`}
                                position={pt}
                                draggable={true}
                                icon={createVertexIcon(color)}
                                zIndexOffset={10000}
                                eventHandlers={{
                                    dragstart: () => {
                                        map.dragging.disable();
                                    },
                                    drag: (e) => {
                                        const newPos = e.target.getLatLng();
                                        updatePlaterVertex(activePoly.id, i, [newPos.lat, newPos.lng], false);
                                    },
                                    dragend: (e) => {
                                        map.dragging.enable();
                                        const newPos = e.target.getLatLng();
                                        updatePlaterVertex(activePoly.id, i, [newPos.lat, newPos.lng], true);
                                    },
                                    contextmenu: (e) => {
                                        e.originalEvent?.preventDefault();
                                        if (activePoly.points.length > 3) {
                                            deletePlaterVertex(activePoly.id, i);
                                        } else {
                                            setToastMessage("⚠️ Un polígon ha de tenir com a mínim 3 vèrtexs!");
                                        }
                                    }
                                }}
                            >
                                <Tooltip direction="top" offset={[0, -8]}>
                                    Vèrtex #{i + 1} (Arrossega per moure, Clic dret per eliminar)
                                </Tooltip>
                            </Marker>
                        ))}

                        {/* Punts intermedis per afegir nous vèrtexs */}
                        {activePoly.points.map((pt, i) => {
                            const nextPt = activePoly.points[(i + 1) % activePoly.points.length];
                            const midPt = [(pt[0] + nextPt[0]) / 2, (pt[1] + nextPt[1]) / 2];
                            return (
                                <Marker
                                    key={`mid-${activePoly.id}-${i}`}
                                    position={midPt}
                                    icon={createMidpointIcon(color)}
                                    zIndexOffset={9000}
                                    eventHandlers={{
                                        click: (e) => {
                                            e.originalEvent?.stopPropagation();
                                            insertPlaterVertex(activePoly.id, i + 1, midPt);
                                        }
                                    }}
                                >
                                    <Tooltip direction="top" offset={[0, -6]}>
                                        ➕ Clic per afegir un vèrtex aquí
                                    </Tooltip>
                                </Marker>
                            );
                        })}
                    </React.Fragment>
                );
            })()}

            {/* 1. RENDER GENERAL ZONES (Interactive only in polygon mode) */}
            {zones.map(zone => (
                <Polygon
                    key={zone.id}
                    positions={zone.points}
                    interactive={editMode === 'polygon'}
                    pathOptions={{ color: zoneTypes[zone.type]?.color || '#3498db', fillOpacity: 0.35, weight: 2 }}
                >
                    {editMode === 'polygon' && (
                        <Popup>
                            <strong>{zone.name}</strong><br />
                            Tipus: {zoneTypes[zone.type]?.label || zone.type}<br />
                            <button 
                                onClick={(e) => { e.stopPropagation(); deleteZone(zone.id); }} 
                                style={{ color: '#ef4444', border: 'none', background: 'none', cursor: 'pointer', padding: '5px 0', fontWeight: 'bold' }}
                            >
                                Eliminar Zona
                            </button>
                        </Popup>
                    )}
                </Polygon>
            ))}

            {/* In-progress Polygon (General or Plater) */}
            {currentPoints.length > 0 && (
                <>
                    <Polygon
                        positions={[...currentPoints, currentPoints[0]]}
                        pathOptions={{ 
                            color: editMode === 'plater' 
                                ? (PLATER_ZONE_TYPES[currentPlaterType]?.color || '#10b981')
                                : (zoneTypes[currentType]?.color || '#3498db'), 
                            dashArray: '5, 10',
                            weight: 3
                        }}
                    />
                    {currentPoints.map((pt, i) => (
                        <Marker key={i} position={pt} interactive={false} />
                    ))}
                </>
            )}

            {/* 2. RENDER ALL INSTALLATIONS AS DRAGGABLE (Pavelló, Sala Nova, all 31 Rooftops) */}
            {installations.map(inst => (
                <Marker
                    key={`editor-inst-${inst.id}`}
                    position={inst.coordinates}
                    draggable={true}
                    icon={getEditorInstallationIcon(inst)}
                    zIndexOffset={inst.type === 'pavello' ? 6000 : (inst.type === 'sala_nova' ? 5500 : 4000)}
                    eventHandlers={{
                        dragstart: (e) => {
                            map.dragging.disable();
                            if (e.target && e.target.closePopup) {
                                e.target.closePopup();
                            }
                        },
                        dragend: (e) => {
                            map.dragging.enable();
                            const newPos = e.target.getLatLng();
                            updateInstallationPos(inst.id, [newPos.lat, newPos.lng]);
                        }
                    }}
                >
                    <Popup offset={[0, -20]} closeButton={true} autoPan={false}>
                        <div style={{ textAlign: 'center', minWidth: '160px', padding: '4px' }}>
                            <strong style={{ fontSize: '13px', display: 'block', color: '#0f172a' }}>
                                {inst.owner || inst.id}
                            </strong>
                            <span style={{ fontSize: '11px', color: '#2563eb', fontWeight: 700, display: 'block', margin: '2px 0 6px 0' }}>
                                {inst.type === 'pavello' ? 'Pavelló (Tycoon)' : (inst.type === 'sala_nova' ? 'Sala Nova (Assemblea)' : `Minijoc: ${(inst.minigame || 'solar').toUpperCase()}`)} • {inst.power} kW
                            </span>
                            <div style={{ fontSize: '10px', color: '#64748b', fontFamily: 'monospace', marginBottom: '8px' }}>
                                [{inst.coordinates[0].toFixed(5)}, {inst.coordinates[1].toFixed(5)}]
                            </div>
                            <div style={{ fontSize: '11px', color: '#059669', fontWeight: 600 }}>
                                ✋ Clica i arrossega sobre el mapa per moure'l
                            </div>
                        </div>
                    </Popup>
                </Marker>
            ))}

            {/* 3. RENDER ALL ENVIRONMENTAL BADS AS DRAGGABLE */}
            {bads.map(bad => (
                <Marker
                    key={`editor-bad-${bad.id}`}
                    position={bad.coordinates}
                    draggable={true}
                    icon={getEditorBadIcon(bad)}
                    zIndexOffset={4500}
                    eventHandlers={{
                        dragstart: (e) => {
                            map.dragging.disable();
                            if (e.target && e.target.closePopup) {
                                e.target.closePopup();
                            }
                        },
                        dragend: (e) => {
                            map.dragging.enable();
                            const newPos = e.target.getLatLng();
                            updateBadPos(bad.id, [newPos.lat, newPos.lng]);
                        }
                    }}
                >
                    <Popup offset={[0, -20]} closeButton={true} autoPan={false}>
                        <div style={{ textAlign: 'center', minWidth: '150px', padding: '4px' }}>
                            <strong style={{ fontSize: '13px', display: 'block', color: '#b91c1c' }}>
                                {threatConfig[bad.type]?.icon} {threatConfig[bad.type]?.label || bad.type}
                            </strong>
                            <div style={{ fontSize: '10px', color: '#64748b', fontFamily: 'monospace', margin: '4px 0 8px 0' }}>
                                [{bad.coordinates[0].toFixed(5)}, {bad.coordinates[1].toFixed(5)}]
                            </div>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (window.confirm(`Eliminar aquesta amenaça?`)) {
                                        deleteBad(bad.id);
                                    }
                                }}
                                style={{
                                    color: '#ef4444',
                                    border: '1px solid #ef4444',
                                    background: '#fff',
                                    borderRadius: '5px',
                                    cursor: 'pointer',
                                    padding: '3px 8px',
                                    fontSize: '11px',
                                    fontWeight: 700
                                }}
                            >
                                Eliminar
                            </button>
                        </div>
                    </Popup>
                </Marker>
            ))}

            {/* 4. FLOATING FEEDBACK TOAST */}
            {toastMessage && ReactDOM.createPortal(
                <div style={{
                    position: 'fixed',
                    bottom: '80px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: 'rgba(15, 23, 42, 0.94)',
                    color: '#f8fafc',
                    padding: '10px 20px',
                    borderRadius: '24px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                    zIndex: 9999,
                    fontSize: '13px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    border: '1px solid rgba(255,255,255,0.2)',
                    pointerEvents: 'none',
                    animation: 'fadeInSlideUp 0.2s ease-out'
                }}>
                    {toastMessage}
                </div>,
                document.body
            )}

            {/* 5. EDITOR CONTROL PANEL (Portal) */}
            {ReactDOM.createPortal(
                <div className="zone-editor-pane" style={{
                    position: 'fixed',
                    top: '20px',
                    right: '20px',
                    width: '350px',
                    maxHeight: '92vh',
                    backgroundColor: 'rgba(255, 255, 255, 0.98)',
                    borderRadius: '16px',
                    boxShadow: '0 12px 40px rgba(0,0,0,0.3)',
                    zIndex: 8000,
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    border: '1px solid #e2e8f0'
                }}>
                    {/* Header */}
                    <div style={{
                        padding: '14px 18px',
                        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                        color: '#ffffff',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Pencil size={18} color="#facc15" />
                            <strong style={{ fontSize: '15px', letterSpacing: '-0.2px' }}>Mode Editor de Mapa</strong>
                        </div>
                        <button 
                            onClick={onClose} 
                            style={{ 
                                background: 'rgba(255,255,255,0.15)', 
                                border: 'none', 
                                color: '#ffffff', 
                                width: '28px', 
                                height: '28px', 
                                borderRadius: '50%', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                cursor: 'pointer',
                                transition: 'background 0.2s'
                            }}
                        >
                            <X size={16} />
                        </button>
                    </div>

                    {/* Mode Selector Tabs */}
                    <div style={{ display: 'flex', padding: '10px 14px', gap: '6px', backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}>
                        <button
                            onClick={() => setEditMode('move')}
                            style={{
                                flex: 1,
                                padding: '8px 6px',
                                borderRadius: '8px',
                                border: 'none',
                                background: editMode === 'move' ? '#0f172a' : '#ffffff',
                                color: editMode === 'move' ? '#ffffff' : '#475569',
                                fontSize: '12px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '5px',
                                boxShadow: editMode === 'move' ? '0 2px 6px rgba(15,23,42,0.3)' : 'none'
                            }}
                        >
                            <Move size={14} /> Moure Elements
                        </button>
                        <button
                            onClick={() => setEditMode('polygon')}
                            style={{
                                flex: 1,
                                padding: '8px 6px',
                                borderRadius: '8px',
                                border: 'none',
                                background: editMode === 'polygon' ? '#0f172a' : '#ffffff',
                                color: editMode === 'polygon' ? '#ffffff' : '#475569',
                                fontSize: '12px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '5px',
                                boxShadow: editMode === 'polygon' ? '0 2px 6px rgba(15,23,42,0.3)' : 'none'
                            }}
                        >
                            <Layers size={14} /> Zones
                        </button>
                        <button
                            onClick={() => setEditMode('threat')}
                            style={{
                                flex: 1,
                                padding: '8px 6px',
                                borderRadius: '8px',
                                border: 'none',
                                background: editMode === 'threat' ? '#0f172a' : '#ffffff',
                                color: editMode === 'threat' ? '#ffffff' : '#475569',
                                fontSize: '12px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '5px',
                                boxShadow: editMode === 'threat' ? '0 2px 6px rgba(15,23,42,0.3)' : 'none'
                            }}
                        >
                            <AlertTriangle size={14} /> + Amenaça
                        </button>
                        <button
                            onClick={() => setEditMode('plater')}
                            style={{
                                flex: 1.15,
                                padding: '8px 4px',
                                borderRadius: '8px',
                                border: 'none',
                                background: editMode === 'plater' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : '#ffffff',
                                color: editMode === 'plater' ? '#ffffff' : '#059669',
                                fontSize: '11px',
                                fontWeight: 800,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '4px',
                                boxShadow: editMode === 'plater' ? '0 2px 8px rgba(16,185,129,0.4)' : 'none'
                            }}
                            title="Dibuixa polígons de Bosc, Riu, Camí i Camps exclusivament pel joc Aturem el Plater"
                        >
                            <Sprout size={13} /> Capes Plater
                        </button>
                    </div>

                    {/* Mode Body */}
                    <div style={{ flex: 1, padding: '14px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {editMode === 'move' && (
                            <>
                                <div style={{ background: '#ecfdf5', border: '1px solid #6ee7b7', borderRadius: '10px', padding: '10px 12px' }}>
                                    <div style={{ fontSize: '12px', color: '#065f46', lineHeight: 1.4 }}>
                                        ✋ <strong>Arrossega qualsevol icona directament al mapa:</strong> Sala Nova, Pavelló o qualsevol de les 31 teulades de minijocs. Es desen a l'instant!
                                    </div>
                                </div>

                                {/* Category Filters */}
                                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                    {[
                                        { id: 'all', label: `Tots (${installations.length + bads.length})` },
                                        { id: 'special', label: '🏛️ Clau (2)' },
                                        { id: 'rooftops', label: '🎮 Teulades (31)' },
                                        { id: 'threats', label: '⚠️ Amenaces (9)' }
                                    ].map(cat => (
                                        <button
                                            key={cat.id}
                                            onClick={() => setFilterCategory(cat.id)}
                                            style={{
                                                padding: '4px 8px',
                                                borderRadius: '6px',
                                                border: '1px solid',
                                                borderColor: filterCategory === cat.id ? '#0f172a' : '#cbd5e1',
                                                background: filterCategory === cat.id ? '#0f172a' : '#f8fafc',
                                                color: filterCategory === cat.id ? '#ffffff' : '#475569',
                                                fontSize: '11px',
                                                fontWeight: 700,
                                                cursor: 'pointer'
                                            }}
                                        >
                                            {cat.label}
                                        </button>
                                    ))}
                                </div>

                                {/* Search Input */}
                                <div style={{ position: 'relative' }}>
                                    <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                    <input
                                        type="text"
                                        placeholder="Filtrar per nom o minijoc..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '8px 10px 8px 30px',
                                            borderRadius: '8px',
                                            border: '1px solid #cbd5e1',
                                            fontSize: '12px',
                                            outline: 'none',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                </div>

                                {/* Elements List */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '220px', overflowY: 'auto' }}>
                                    {filteredElements.map(el => (
                                        <div 
                                            key={`list-${el.id}`}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                padding: '8px 10px',
                                                borderRadius: '8px',
                                                backgroundColor: '#f8fafc',
                                                border: '1px solid #e2e8f0',
                                                fontSize: '12px'
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                                                <span style={{ fontSize: '16px' }}>{el.displayIcon}</span>
                                                <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                                    <strong style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#1e293b' }}>
                                                        {el.displayName}
                                                    </strong>
                                                    <span style={{ fontSize: '10px', color: '#64748b' }}>
                                                        {el.badge}
                                                    </span>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                                                {/* Micro nudge direction buttons */}
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 16px)', gridTemplateRows: 'repeat(2, 14px)', gap: '1px', alignItems: 'center', justifyContent: 'center' }} title="Ajust fi de posició (~10m)">
                                                    <span />
                                                    <button
                                                        type="button"
                                                        onClick={() => el.category === 'threats' ? nudgeBadPos(el.id, 0.0001, 0) : nudgeInstallationPos(el.id, 0.0001, 0)}
                                                        style={{ background: '#e2e8f0', border: 'none', borderRadius: '2px', padding: 0, fontSize: '9px', cursor: 'pointer', lineHeight: '14px', textAlign: 'center' }}
                                                        title="Moure al Nord (+10m)"
                                                    >▲</button>
                                                    <span />
                                                    <button
                                                        type="button"
                                                        onClick={() => el.category === 'threats' ? nudgeBadPos(el.id, 0, -0.0001) : nudgeInstallationPos(el.id, 0, -0.0001)}
                                                        style={{ background: '#e2e8f0', border: 'none', borderRadius: '2px', padding: 0, fontSize: '9px', cursor: 'pointer', lineHeight: '14px', textAlign: 'center' }}
                                                        title="Moure a l'Oest (-10m)"
                                                    >◀</button>
                                                    <button
                                                        type="button"
                                                        onClick={() => el.category === 'threats' ? nudgeBadPos(el.id, -0.0001, 0) : nudgeInstallationPos(el.id, -0.0001, 0)}
                                                        style={{ background: '#e2e8f0', border: 'none', borderRadius: '2px', padding: 0, fontSize: '9px', cursor: 'pointer', lineHeight: '14px', textAlign: 'center' }}
                                                        title="Moure al Sud (-10m)"
                                                    >▼</button>
                                                    <button
                                                        type="button"
                                                        onClick={() => el.category === 'threats' ? nudgeBadPos(el.id, 0, 0.0001) : nudgeInstallationPos(el.id, 0, 0.0001)}
                                                        style={{ background: '#e2e8f0', border: 'none', borderRadius: '2px', padding: 0, fontSize: '9px', cursor: 'pointer', lineHeight: '14px', textAlign: 'center' }}
                                                        title="Moure a l'Est (+10m)"
                                                    >▶</button>
                                                </div>

                                                <button
                                                    onClick={() => flyToCoords(el.coordinates)}
                                                    style={{
                                                        background: '#ffffff',
                                                        border: '1px solid #cbd5e1',
                                                        borderRadius: '6px',
                                                        padding: '4px 6px',
                                                        fontSize: '11px',
                                                        fontWeight: 700,
                                                        color: '#2563eb',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '3px'
                                                    }}
                                                    title="Centrar càmera al mapa"
                                                >
                                                    <Crosshair size={12} /> Centrar
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    {filteredElements.length === 0 && (
                                        <div style={{ textAlign: 'center', color: '#94a3b8', padding: '15px 0', fontSize: '12px' }}>
                                            Cap element trobat
                                        </div>
                                    )}
                                </div>
                            </>
                        )}

                        {editMode === 'polygon' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
                                    Clica al mapa per marcar els vèrtexs del nou polígon:
                                </p>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    {Object.entries(zoneTypes).map(([id, t]) => (
                                        <button
                                            key={id}
                                            onClick={() => setCurrentType(id)}
                                            style={{
                                                padding: '8px 12px',
                                                borderRadius: '8px',
                                                border: '1px solid',
                                                borderColor: currentType === id ? t.color : '#cbd5e1',
                                                background: currentType === id ? t.color : '#ffffff',
                                                color: currentType === id ? '#ffffff' : '#0f172a',
                                                fontWeight: currentType === id ? 'bold' : 'normal',
                                                fontSize: '12px',
                                                textAlign: 'left',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px'
                                            }}
                                        >
                                            <span>{t.icon}</span> {t.label}
                                        </button>
                                    ))}
                                </div>
                                <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                                    <button
                                        onClick={finishPolygon}
                                        disabled={currentPoints.length < 3}
                                        style={{
                                            flex: 1,
                                            padding: '10px',
                                            borderRadius: '8px',
                                            border: 'none',
                                            background: currentPoints.length >= 3 ? '#10b981' : '#cbd5e1',
                                            color: '#ffffff',
                                            fontWeight: 700,
                                            fontSize: '12px',
                                            cursor: currentPoints.length >= 3 ? 'pointer' : 'default'
                                        }}
                                    >
                                        Tancar Polígon ({currentPoints.length} punts)
                                    </button>
                                    <button
                                        onClick={() => setCurrentPoints([])}
                                        disabled={currentPoints.length === 0}
                                        style={{
                                            padding: '10px 14px',
                                            borderRadius: '8px',
                                            border: '1px solid #cbd5e1',
                                            background: '#ffffff',
                                            color: '#ef4444',
                                            cursor: currentPoints.length > 0 ? 'pointer' : 'default'
                                        }}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        )}

                        {editMode === 'plater' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '10px 12px', fontSize: '11px', color: '#166534', lineHeight: 1.4 }}>
                                    <strong>🎯 Dibuixa polígons sobre el terreny real</strong> per a <em>Aturem el Plater</em>.
                                    Al joc, el jugador haurà d'encertar cada terreny amb el seu pinzell per esborrar la capa del Plater i recuperar l'estat actual!
                                    <div style={{ marginTop: '5px', color: '#15803d', fontStyle: 'italic' }}>
                                        💡 La cartografia del Plater es mostra mig transparent per facilitar el traçat sobre el mapa.
                                    </div>
                                </div>

                                <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    1. Tria el tipus a dibuixar:
                                </label>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                                    {Object.entries(PLATER_ZONE_TYPES).map(([id, t]) => (
                                        <button
                                            key={id}
                                            onClick={() => setCurrentPlaterType(id)}
                                            style={{
                                                padding: '8px 10px',
                                                borderRadius: '8px',
                                                border: '1.5px solid',
                                                borderColor: currentPlaterType === id ? t.strokeColor : '#e2e8f0',
                                                background: currentPlaterType === id ? t.color : '#ffffff',
                                                color: currentPlaterType === id ? '#ffffff' : '#0f172a',
                                                fontWeight: currentPlaterType === id ? 800 : 600,
                                                fontSize: '11px',
                                                textAlign: 'left',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                boxShadow: currentPlaterType === id ? `0 2px 6px ${t.color}66` : 'none'
                                            }}
                                        >
                                            <span style={{ fontSize: '14px' }}>{t.icon}</span> {t.shortLabel}
                                        </button>
                                    ))}
                                </div>

                                <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                                    <button
                                        onClick={finishPlaterPolygon}
                                        disabled={currentPoints.length < 3}
                                        style={{
                                            flex: 1,
                                            padding: '10px 8px',
                                            borderRadius: '8px',
                                            border: 'none',
                                            background: currentPoints.length >= 3 ? '#10b981' : '#cbd5e1',
                                            color: '#ffffff',
                                            fontWeight: 800,
                                            fontSize: '12px',
                                            cursor: currentPoints.length >= 3 ? 'pointer' : 'default',
                                            boxShadow: currentPoints.length >= 3 ? '0 2px 8px rgba(16,185,129,0.4)' : 'none'
                                        }}
                                    >
                                        Tancar Polígon ({currentPoints.length} pts)
                                    </button>
                                    <button
                                        onClick={() => setCurrentPoints([])}
                                        disabled={currentPoints.length === 0}
                                        title="Cancel·lar punts actuals"
                                        style={{
                                            padding: '10px 12px',
                                            borderRadius: '8px',
                                            border: '1px solid #cbd5e1',
                                            background: '#ffffff',
                                            color: '#ef4444',
                                            cursor: currentPoints.length > 0 ? 'pointer' : 'default'
                                        }}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>

                                {selectedPlaterPolyId && (() => {
                                    const active = platerPolygons.find(p => p.id === selectedPlaterPolyId);
                                    if (!active) return null;
                                    const tInfo = PLATER_ZONE_TYPES[active.type] || PLATER_ZONE_TYPES.bosc;
                                    return (
                                        <div style={{
                                            background: '#eff6ff',
                                            border: '1.5px solid #3b82f6',
                                            borderRadius: '10px',
                                            padding: '10px 12px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '8px'
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div>
                                                    <div style={{ fontSize: '12px', fontWeight: 800, color: '#1d4ed8' }}>
                                                        ✏️ Editant: {tInfo.icon} {active.name}
                                                    </div>
                                                    <div style={{ fontSize: '10px', color: '#64748b' }}>
                                                        Arrossega els vèrtexs blancs o canvia el tipus
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        setSelectedPlaterPolyId(null);
                                                        setToastMessage("Edició de polígon desada!");
                                                    }}
                                                    style={{
                                                        background: '#3b82f6',
                                                        color: '#fff',
                                                        border: 'none',
                                                        borderRadius: '6px',
                                                        padding: '4px 10px',
                                                        fontSize: '11px',
                                                        fontWeight: 'bold',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    ✓ Fet
                                                </button>
                                            </div>

                                            {/* Selector ràpid per canviar tipus de terreny (ex: de Camps a Bosc) */}
                                            <div style={{ background: 'rgba(255,255,255,0.8)', borderRadius: '6px', padding: '6px 8px', border: '1px solid #bfdbfe' }}>
                                                <span style={{ fontSize: '10px', fontWeight: 700, color: '#1e40af', textTransform: 'uppercase' }}>
                                                    Canviar Tipus de Terreny:
                                                </span>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', marginTop: '4px' }}>
                                                    {Object.entries(PLATER_ZONE_TYPES).map(([typeId, t]) => (
                                                        <button
                                                            key={typeId}
                                                            onClick={() => changePlaterPolygonType(active.id, typeId)}
                                                            style={{
                                                                padding: '4px 6px',
                                                                borderRadius: '5px',
                                                                border: active.type === typeId ? `2px solid ${t.strokeColor}` : '1px solid #cbd5e1',
                                                                background: active.type === typeId ? t.color : '#ffffff',
                                                                color: active.type === typeId ? '#ffffff' : '#0f172a',
                                                                fontWeight: active.type === typeId ? 800 : 600,
                                                                fontSize: '10.5px',
                                                                cursor: 'pointer',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '4px',
                                                                justifyContent: 'center'
                                                            }}
                                                        >
                                                            <span>{t.icon}</span> {t.shortLabel}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                                        Polígons del Plater ({platerPolygons.length})
                                    </span>
                                    <button
                                        onClick={resetPlaterPolygons}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            color: '#2563eb',
                                            fontSize: '10px',
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '3px'
                                        }}
                                        title="Restaurar polígons per defecte"
                                    >
                                        <RefreshCw size={11} /> Per defecte
                                    </button>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', maxHeight: '180px', overflowY: 'auto' }}>
                                    {platerPolygons.map(p => {
                                        const tInfo = PLATER_ZONE_TYPES[p.type] || PLATER_ZONE_TYPES.bosc;
                                        const isSel = selectedPlaterPolyId === p.id;
                                        return (
                                            <div
                                                key={p.id}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    padding: '6px 8px',
                                                    borderRadius: '6px',
                                                    background: isSel ? '#eff6ff' : '#f8fafc',
                                                    border: isSel ? '2px solid #3b82f6' : `1px solid ${tInfo.color}66`,
                                                    boxShadow: isSel ? '0 0 8px rgba(59, 130, 246, 0.4)' : 'none',
                                                    fontSize: '11px'
                                                }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <span>{tInfo.icon}</span>
                                                    <div>
                                                        <strong style={{ color: isSel ? '#1d4ed8' : '#1e293b' }}>{p.name}</strong>
                                                        <span style={{ color: '#64748b', marginLeft: '4px', fontSize: '10px' }}>({p.points?.length || 0} pts)</span>
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', gap: '4px' }}>
                                                    <button
                                                        onClick={() => {
                                                            const nextId = isSel ? null : p.id;
                                                            setSelectedPlaterPolyId(nextId);
                                                            if (nextId) {
                                                                setToastMessage(`✏️ Editant vèrtexs de: ${p.name}. Arrossega'ls al mapa!`);
                                                                if (p.points && p.points.length > 0) {
                                                                    flyToCoords(p.points[0]);
                                                                }
                                                            }
                                                        }}
                                                        style={{
                                                            background: isSel ? '#3b82f6' : '#fff',
                                                            border: '1px solid #3b82f6',
                                                            borderRadius: '4px',
                                                            padding: '2px 5px',
                                                            fontSize: '10px',
                                                            color: isSel ? '#fff' : '#2563eb',
                                                            cursor: 'pointer'
                                                        }}
                                                        title={isSel ? "Finalitzar edició de vèrtexs" : "Editar vèrtexs (arrossegar)"}
                                                    >
                                                        <Pencil size={11} />
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            if (p.points && p.points.length > 0) {
                                                                flyToCoords(p.points[0]);
                                                            }
                                                        }}
                                                        style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '2px 5px', fontSize: '10px', color: '#2563eb', cursor: 'pointer' }}
                                                        title="Centrar mapa"
                                                    >
                                                        <Crosshair size={11} />
                                                    </button>
                                                    <button
                                                        onClick={() => deletePlaterPolygon(p.id)}
                                                        style={{ background: '#fff', border: '1px solid #fca5a5', borderRadius: '4px', padding: '2px 5px', fontSize: '10px', color: '#ef4444', cursor: 'pointer' }}
                                                        title="Eliminar"
                                                    >
                                                        <Trash2 size={11} />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {platerPolygons.length === 0 && (
                                        <div style={{ textAlign: 'center', color: '#94a3b8', padding: '12px 0', fontSize: '11px' }}>
                                            No hi ha polígons dibuixats. Fes clic sobre el mapa per començar!
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {editMode === 'threat' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
                                    Selecciona el tipus d'amenaça i clica al mapa per situar-la:
                                </p>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    {Object.entries(threatConfig).map(([id, t]) => (
                                        <button
                                            key={id}
                                            onClick={() => setThreatType(id)}
                                            style={{
                                                padding: '8px 12px',
                                                borderRadius: '8px',
                                                border: '1px solid',
                                                borderColor: threatType === id ? '#0f172a' : '#cbd5e1',
                                                background: threatType === id ? '#0f172a' : '#ffffff',
                                                color: threatType === id ? '#ffffff' : '#0f172a',
                                                fontWeight: threatType === id ? 700 : 500,
                                                fontSize: '12px',
                                                textAlign: 'left',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px'
                                            }}
                                        >
                                            <span style={{ fontSize: '16px' }}>{t.icon}</span> {t.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer Actions */}
                    <div style={{ padding: '12px 14px', borderTop: '1px solid #e2e8f0', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <button
                            onClick={exportData}
                            style={{
                                width: '100%',
                                padding: '12px',
                                borderRadius: '10px',
                                border: 'none',
                                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                color: '#ffffff',
                                fontSize: '13px',
                                fontWeight: 800,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                cursor: 'pointer',
                                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)'
                            }}
                        >
                            <Download size={16} /> Desar i Exportar (gis_data.json)
                        </button>
                        <button
                            onClick={resetToOriginal}
                            style={{
                                width: '100%',
                                padding: '7px',
                                borderRadius: '8px',
                                border: '1px solid #cbd5e1',
                                backgroundColor: '#ffffff',
                                color: '#64748b',
                                fontSize: '11px',
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                cursor: 'pointer'
                            }}
                        >
                            <RefreshCw size={13} /> Restablir posicions inicials
                        </button>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
};

export default ZoneEditor;
