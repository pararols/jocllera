import React, { useState, useCallback, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useMapEvents, Polygon, Marker, Popup } from 'react-leaflet';
import { Pencil, Trash2, Download, Check, Save, Layers, MapPin, MousePointer2 } from 'lucide-react';
import gisData from '../data/gis_data.json';
import L from 'leaflet';

const ZoneEditor = ({ onSave, onClose }) => {
    const [zones, setZones] = useState(gisData.zones || []);
    const [markers, setMarkers] = useState(gisData.environmentalBads || []);
    const [currentPoints, setCurrentPoints] = useState([]);
    const [currentType, setCurrentType] = useState('prioritaria');
    const [editMode, setEditMode] = useState('polygon'); // 'polygon' or 'marker'
    const [markerType, setMarkerType] = useState('estufes_terrasses');
    const [editorActive, setEditorActive] = useState(true);

    const zoneTypes = {
        prioritaria: { label: 'Prioritària', color: '#e67e22', icon: '🟠' },
        apta: { label: 'Apta', color: '#3498db', icon: '🔵' },
        no_apta: { label: 'No Apta', color: '#e74c3c', icon: '🔴' }
    };

    const markerTypes = {
        estufes_terrasses: { label: 'Estufes', icon: '🔥', color: '#e67e22' },
        piscines_clim: { label: 'Piscines', icon: '💧', color: '#3498db' },
        camp_golf: { label: 'Golf', icon: '⛳', color: '#2ecc71' },
        bomba_calor: { label: 'Bomba Calor', icon: '❄️', color: '#9b59b6' },
        pavello: { label: 'FV Pavelló', icon: '🏢', color: '#f1c40f', unique: true },
        sala_nova: { label: 'FV Sala Nova', icon: '🏛️', color: '#f1c40f', unique: true }
    };

    // Instruction component for Leaflet
    const MapClickHandler = () => {
        useMapEvents({
            click(e) {
                if (!editorActive) return;
                const { lat, lng } = e.latlng;

                if (editMode === 'polygon') {
                    setCurrentPoints(prev => [...prev, [lat, lng]]);
                } else {
                    // Check for unique markers constraint
                    if (markerTypes[markerType]?.unique && markers.some(m => m.type === markerType)) {
                        alert(`Ja existeix un marcador de tipus ${markerTypes[markerType].label}. Elimina l'anterior primer.`);
                        return;
                    }

                    const newMarker = {
                        id: markerTypes[markerType]?.unique ? `${markerType}_001` : `bad-${Date.now()}`,
                        type: markerType,
                        coordinates: [lat, lng],
                        status: 'active'
                    };
                    setMarkers(prev => [...prev, newMarker]);
                }
            },
        });
        return null;
    };

    const finishPolygon = () => {
        if (currentPoints.length < 3) {
            alert("Calen almenys 3 punts per a un polígon.");
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
    };

    const deleteZone = (id) => {
        setZones(prev => prev.filter(z => z.id !== id));
    };

    const updateMarkerPos = (id, newCoords) => {
        setMarkers(prev => prev.map(m => m.id === id ? { ...m, coordinates: newCoords } : m));
    };

    const deleteMarker = (id) => {
        setMarkers(prev => prev.filter(m => m.id !== id));
    };

    const clearCurrent = () => {
        setCurrentPoints([]);
    };

    const exportData = () => {
        // Separate special markers (pavello, sala_nova) to update installations
        const specialMarkerTypes = ['pavello', 'sala_nova'];
        const updatedInstallations = [...gisData.installations];
        const filteredMarkers = [];

        markers.forEach(m => {
            if (specialMarkerTypes.includes(m.type)) {
                const idx = updatedInstallations.findIndex(inst => inst.type === m.type);
                if (idx !== -1) {
                    updatedInstallations[idx].coordinates = m.coordinates;
                } else {
                    // Add new if not exists (shouldn't happen with unique check but for safety)
                    updatedInstallations.push({
                        id: m.id,
                        type: m.type,
                        power: m.type === 'pavello' ? 127 : 17,
                        coordinates: m.coordinates,
                        owner: `Comunitat Energètica ${markerTypes[m.type].label}`
                    });
                }
            } else {
                filteredMarkers.push(m);
            }
        });

        const fullData = {
            ...gisData,
            installations: updatedInstallations,
            environmentalBads: filteredMarkers,
            zones: zones
        };
        const data = JSON.stringify(fullData, null, 2);
        navigator.clipboard.writeText(data).then(() => {
            alert("Dades completes copiades al porta-retalls! Enganxa-les a gis_data.json");
        });
    };

    return (
        <>
            {/* Map Overlay Elements */}
            <MapClickHandler />

            {/* Render Existing Zones */}
            {zones.map(zone => (
                <Polygon
                    key={zone.id}
                    positions={zone.points}
                    pathOptions={{ color: zoneTypes[zone.type].color, fillOpacity: 0.4 }}
                >
                    <Popup>
                        <strong>{zone.name}</strong><br />
                        Tipus: {zoneTypes[zone.type].label}<br />
                        <button onClick={(e) => { e.stopPropagation(); deleteZone(zone.id); }} style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer', padding: '5px 0' }}>Eliminar</button>
                    </Popup>
                </Polygon>
            ))}

            {/* Render Existing Markers */}
            {markers.map(marker => (
                <Marker
                    key={marker.id}
                    position={marker.coordinates}
                    draggable={true}
                    eventHandlers={{
                        dragend: (e) => {
                            const marker = e.target;
                            const position = marker.getLatLng();
                            updateMarkerPos(marker.id, [position.lat, position.lng]);
                        }
                    }}
                >
                    <Popup>
                        <strong>Minijoc: {markerTypes[marker.type]?.label}</strong><br />
                        Estat: {marker.status}<br />
                        <button onClick={(e) => { e.stopPropagation(); deleteMarker(marker.id); }} style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer', padding: '5px 0' }}>Eliminar</button>
                    </Popup>
                </Marker>
            ))}

            {/* Render Current In-Progress Polygon */}
            {currentPoints.length > 0 && (
                <>
                    <Polygon
                        positions={[...currentPoints, currentPoints[0]]}
                        pathOptions={{ color: zoneTypes[currentType].color, dashArray: '5, 10' }}
                    />
                    {currentPoints.map((pt, i) => (
                        <Marker key={i} position={pt} />
                    ))}
                </>
            )}

            {/* Editor UI Panel (Portal to Body) */}
            {ReactDOM.createPortal(
                <div className="zone-editor-pane" style={{
                    position: 'fixed', top: '20px', right: '20px',
                    width: '300px', backgroundColor: 'rgba(255,255,255,0.95)',
                    padding: '20px', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                    zIndex: 2000, fontFamily: 'sans-serif'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Pencil size={20} /> Zone Editor
                        </h3>
                        <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: '1.2rem', cursor: 'pointer' }}>×</button>
                    </div>

                    <div style={{ marginBottom: '15px' }}>
                        <div style={{ display: 'flex', gap: 5, marginBottom: 15, background: '#f0f0f0', padding: 5, borderRadius: 8 }}>
                            <button
                                onClick={() => setEditMode('polygon')}
                                style={{ flex: 1, padding: 8, borderRadius: 6, border: 'none', background: editMode === 'polygon' ? '#34495e' : 'transparent', color: editMode === 'polygon' ? 'white' : 'black', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}
                            >
                                <Layers size={16} /> Zones
                            </button>
                            <button
                                onClick={() => setEditMode('marker')}
                                style={{ flex: 1, padding: 8, borderRadius: 6, border: 'none', background: editMode === 'marker' ? '#34495e' : 'transparent', color: editMode === 'marker' ? 'white' : 'black', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}
                            >
                                <MapPin size={16} /> Gotes
                            </button>
                        </div>

                        {editMode === 'polygon' ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                <p style={{ fontSize: '0.75rem', color: '#666', marginBottom: 5 }}>Selecciona tipus de zona:</p>
                                {Object.entries(zoneTypes).map(([id, t]) => (
                                    <button
                                        key={id}
                                        onClick={() => setCurrentType(id)}
                                        style={{
                                            padding: '8px 12px', borderRadius: '6px', border: '1px solid #ccc',
                                            textAlign: 'left', cursor: 'pointer',
                                            background: currentType === id ? t.color : 'white',
                                            color: currentType === id ? 'white' : 'black',
                                            fontWeight: currentType === id ? 'bold' : 'normal',
                                            display: 'flex', alignItems: 'center', gap: 8
                                        }}
                                    >
                                        <span>{t.icon}</span> {t.label}
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                <p style={{ fontSize: '0.75rem', color: '#666', marginBottom: 5 }}>Selecciona minijoc:</p>
                                {Object.entries(markerTypes).map(([id, t]) => (
                                    <button
                                        key={id}
                                        onClick={() => setMarkerType(id)}
                                        style={{
                                            padding: '8px 12px', borderRadius: '6px', border: '1px solid #ccc',
                                            textAlign: 'left', cursor: 'pointer',
                                            background: markerType === id ? '#34495e' : 'white',
                                            color: markerType === id ? 'white' : 'black',
                                            fontWeight: markerType === id ? 'bold' : 'normal',
                                            display: 'flex', alignItems: 'center', gap: 8
                                        }}
                                    >
                                        <span>{t.icon}</span> {t.label}
                                    </button>
                                ))}
                                <p style={{ fontSize: '0.7rem', color: '#e67e22', marginTop: 10 }}>
                                    💡 <strong>Tip:</strong> Pots arrossegar les gotes existents al mapa per reubicar-les!
                                </p>
                            </div>
                        )}
                    </div>

                    {editMode === 'polygon' && (
                        <div style={{ display: 'flex', gap: 10, marginBottom: '20px' }}>
                            <button
                                onClick={finishPolygon}
                                disabled={currentPoints.length < 3}
                                style={{
                                    flex: 2, padding: '10px', borderRadius: '6px', border: 'none',
                                    backgroundColor: currentPoints.length >= 3 ? '#2ecc71' : '#bdc3c7',
                                    color: 'white', fontWeight: 'bold', cursor: currentPoints.length >= 3 ? 'pointer' : 'default'
                                }}
                            >
                                Tancar Polígon
                            </button>
                            <button onClick={clearCurrent} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #ccc', background: 'white' }}>
                                <Trash2 size={18} />
                            </button>
                        </div>
                    )}

                    <div style={{ borderTop: '1px solid #eee', paddingTop: '15px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: '10px', fontSize: '0.85rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Layers size={14} /> Zones:</span>
                                <strong>{zones.length}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><MapPin size={14} /> Gotes:</span>
                                <strong>{markers.length}</strong>
                            </div>
                        </div>
                        <button
                            onClick={exportData}
                            style={{
                                width: '100%', padding: '12px', borderRadius: '6px', border: 'none',
                                backgroundColor: '#3498db',
                                color: 'white', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                cursor: 'pointer'
                            }}
                        >
                            <Download size={18} /> Exportar JSON
                        </button>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
};

export default ZoneEditor;
