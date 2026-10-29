import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { 
    Shield, CheckCircle, RotateCcw, Layers, Eye, EyeOff,
    Plus, Minus, Compass, Hand, Paintbrush,
    ChevronUp, ChevronDown, ChevronLeft, ChevronRight
} from 'lucide-react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import gisData from '../../data/gis_data.json';
import SoundManager from '../../logic/SoundManager';
import { 
    PLATER_ZONE_TYPES, 
    loadPlaterPolygons, 
    isPointInPolygon 
} from '../../data/plater_default_zones';
import '../../App.css';

const RECOVERY_GOAL = 95;
const OFF_WIDTH = 2000;
const OFF_HEIGHT = 1600;

const MobileMapController = ({ bounds, center, onMapReady, onMapUpdate }) => {
    const map = useMap();

    useEffect(() => {
        if (!map) return;

        map.dragging?.enable();
        map.touchZoom?.enable();

        if (bounds) {
            map.fitBounds(bounds, { padding: [20, 20], maxZoom: 16, animate: false });
        } else if (center) {
            map.setView(center, 15, { animate: false });
        }

        if (onMapReady) onMapReady(map);

        const handleUpdate = () => {
            if (onMapUpdate) onMapUpdate(map);
        };

        map.on('move', handleUpdate);
        map.on('zoom', handleUpdate);
        map.on('viewreset', handleUpdate);
        map.on('resize', handleUpdate);

        return () => {
            map.off('move', handleUpdate);
            map.off('zoom', handleUpdate);
            map.off('viewreset', handleUpdate);
            map.off('resize', handleUpdate);
        };
    }, [map, bounds, center]);

    return null;
};

const MobileAturemPlater = ({ onComplete, onClose }) => {
    const containerRef = useRef(null);
    const coverCanvasRef = useRef(null);
    const offscreenCanvasRef = useRef(null);
    const mapInstanceRef = useRef(null);

    const [dimensions, setDimensions] = useState({ width: 360, height: 600 });
    const [recovery, setRecovery] = useState(0);
    const [categoryRecovery, setCategoryRecovery] = useState({
        bosc: 0,
        riu: 0,
        cami: 0,
        camps: 0
    });
    const [selectedTool, setSelectedTool] = useState('bosc');
    const [brushSize, setBrushSize] = useState(30);
    const [interactionMode, setInteractionMode] = useState('paint'); // 'paint' | 'pan'
    const [showGuides, setShowGuides] = useState(true);
    const [isDrawing, setIsDrawing] = useState(false);
    const [lastPos, setLastPos] = useState(null);
    const [gameState, setGameState] = useState('playing');
    const [mapProvider, setMapProvider] = useState('google');
    const [toast, setToast] = useState(null);
    const [currentZoom, setCurrentZoom] = useState(15);

    const platerPolygonsRef = useRef([]);
    const platerThreatPolygonsRef = useRef([]);
    const geoBoundsRef = useRef(null);
    const samplePointsRef = useRef({ bosc: [], riu: [], cami: [], camps: [] });
    const mapBoundsRef = useRef(null);
    const mapCenterRef = useRef(gisData.center || [42.0719, 2.9569]);
    const toastTimerRef = useRef(null);
    const lastWheelTimeRef = useRef(0);
    const isPanningRef = useRef(false);
    const panStartRef = useRef({ x: 0, y: 0 });
    const touchDistRef = useRef(null);
    const touchMidRef = useRef(null);

    // Mides dinàmiques
    useEffect(() => {
        const updateDims = () => {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                setDimensions({
                    width: Math.floor(rect.width) || window.innerWidth,
                    height: Math.floor(rect.height) || (window.innerHeight - 150)
                });
            }
        };

        updateDims();
        window.addEventListener('resize', updateDims);
        return () => window.removeEventListener('resize', updateDims);
    }, []);

    const latLngToOffscreen = useCallback((lat, lng) => {
        const gb = geoBoundsRef.current;
        if (!gb) return [0, 0];
        const x = ((lng - gb.minLng) / (gb.maxLng - gb.minLng)) * OFF_WIDTH;
        const y = ((gb.maxLat - lat) / (gb.maxLat - gb.minLat)) * OFF_HEIGHT;
        return [x, y];
    }, []);

    const renderCoverToScreen = useCallback((map) => {
        const canvas = coverCanvasRef.current;
        const offCanvas = offscreenCanvasRef.current;
        const gb = geoBoundsRef.current;
        if (!canvas || !offCanvas || !gb || !map) return;

        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const pTL = map.latLngToContainerPoint([gb.maxLat, gb.minLng]);
        const pBR = map.latLngToContainerPoint([gb.minLat, gb.maxLng]);

        const destX = pTL.x;
        const destY = pTL.y;
        const destW = pBR.x - pTL.x;
        const destH = pBR.y - pTL.y;

        ctx.drawImage(offCanvas, destX, destY, destW, destH);
    }, []);

    const initOffscreenCover = useCallback(() => {
        if (!offscreenCanvasRef.current) {
            const off = document.createElement('canvas');
            off.width = OFF_WIDTH;
            off.height = OFF_HEIGHT;
            offscreenCanvasRef.current = off;
        }

        const offCanvas = offscreenCanvasRef.current;
        const offCtx = offCanvas.getContext('2d');
        offCtx.clearRect(0, 0, OFF_WIDTH, OFF_HEIGHT);

        const allThreats = [
            ...platerThreatPolygonsRef.current,
            ...platerPolygonsRef.current
        ];

        if (allThreats.length === 0) return;

        allThreats.forEach(zone => {
            if (!zone.points || zone.points.length < 3) return;

            const offPoints = zone.points.map(([lat, lng]) => latLngToOffscreen(lat, lng));

            offCtx.save();
            offCtx.beginPath();
            offPoints.forEach(([x, y], i) => {
                if (i === 0) offCtx.moveTo(x, y);
                else offCtx.lineTo(x, y);
            });
            offCtx.closePath();

            // 1. Fons fosc sòlid
            offCtx.fillStyle = '#0f172a';
            offCtx.fill();

            // 2. Trama de panells fotovoltaics
            offCtx.save();
            offCtx.clip();
            offCtx.strokeStyle = 'rgba(245, 158, 11, 0.35)';
            offCtx.lineWidth = 1.5;
            const gridSize = 24;
            for (let x = 0; x < OFF_WIDTH; x += gridSize) {
                offCtx.beginPath();
                offCtx.moveTo(x, 0);
                offCtx.lineTo(x, OFF_HEIGHT);
                offCtx.stroke();
            }
            for (let y = 0; y < OFF_HEIGHT; y += gridSize) {
                offCtx.beginPath();
                offCtx.moveTo(0, y);
                offCtx.lineTo(OFF_WIDTH, y);
                offCtx.stroke();
            }
            offCtx.restore();

            // 3. Vora d'avís
            offCtx.strokeStyle = '#e67e22';
            offCtx.lineWidth = 4;
            offCtx.setLineDash([14, 10]);
            offCtx.stroke();
            offCtx.restore();
        });

        // Punts de mostreig per càlcul invariant de recuperació
        const newSamples = { bosc: [], riu: [], cami: [], camps: [] };
        const step = 14;

        platerPolygonsRef.current.forEach(zone => {
            if (!zone.points || zone.points.length < 3) return;
            const offPts = zone.points.map(([lat, lng]) => latLngToOffscreen(lat, lng));

            let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
            offPts.forEach(([x, y]) => {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            });

            for (let x = Math.floor(minX); x <= Math.ceil(maxX); x += step) {
                for (let y = Math.floor(minY); y <= Math.ceil(maxY); y += step) {
                    if (isPointInPolygon([x, y], offPts)) {
                        if (newSamples[zone.type]) {
                            newSamples[zone.type].push([x, y]);
                        }
                    }
                }
            }
        });

        samplePointsRef.current = newSamples;
    }, [latLngToOffscreen]);

    useEffect(() => {
        const loadedPolys = loadPlaterPolygons();
        platerPolygonsRef.current = loadedPolys;

        const threatZones = (gisData.zones || []).filter(z => z.type === 'prioritaria' || z.type === 'apta');
        platerThreatPolygonsRef.current = threatZones.length > 0 ? threatZones : loadedPolys;

        const townCenter = gisData.center || [42.0719, 2.9569];
        let minLat = townCenter[0], maxLat = townCenter[0];
        let minLng = townCenter[1], maxLng = townCenter[1];

        const allP = [...loadedPolys, ...platerThreatPolygonsRef.current];
        allP.forEach(zone => {
            zone.points.forEach(([lat, lng]) => {
                if (lat < minLat) minLat = lat;
                if (lat > maxLat) maxLat = lat;
                if (lng < minLng) minLng = lng;
                if (lng > maxLng) maxLng = lng;
            });
        });

        const latPad = (maxLat - minLat) * 0.15 || 0.005;
        const lngPad = (maxLng - minLng) * 0.15 || 0.005;

        geoBoundsRef.current = {
            minLat: minLat - latPad,
            maxLat: maxLat + latPad,
            minLng: minLng - lngPad,
            maxLng: maxLng + lngPad
        };

        mapBoundsRef.current = L.latLngBounds(
            [minLat - latPad * 0.5, minLng - lngPad * 0.5],
            [maxLat + latPad * 0.5, maxLng + lngPad * 0.5]
        );
        mapCenterRef.current = [(minLat + maxLat) / 2, (minLng + maxLng) / 2];

        initOffscreenCover();
    }, [initOffscreenCover]);

    const showMismatchFeedback = useCallback((expectedType) => {
        const typeInfo = PLATER_ZONE_TYPES[expectedType];
        if (!typeInfo) return;

        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        setToast({
            text: `⚠️ És ${typeInfo.shortLabel}! Usa el ${typeInfo.toolLabel} ${typeInfo.icon}`,
            color: typeInfo.color
        });
        toastTimerRef.current = setTimeout(() => {
            setToast(null);
        }, 1800);
    }, []);

    const handleMapReady = useCallback((map) => {
        mapInstanceRef.current = map;
        setCurrentZoom(map.getZoom());
        renderCoverToScreen(map);
    }, [renderCoverToScreen]);

    const handleMapUpdate = useCallback((map) => {
        setCurrentZoom(map.getZoom());
        renderCoverToScreen(map);
    }, [renderCoverToScreen]);

    const calculateRecoveryProgress = useCallback(() => {
        const offCanvas = offscreenCanvasRef.current;
        if (!offCanvas) return;
        const offCtx = offCanvas.getContext('2d', { willReadFrequently: true });
        const imgData = offCtx.getImageData(0, 0, OFF_WIDTH, OFF_HEIGHT).data;

        const newCategoryRecovery = { bosc: 0, riu: 0, cami: 0, camps: 0 };
        let totalSamples = 0;
        let totalRestored = 0;

        ['bosc', 'riu', 'cami', 'camps'].forEach(type => {
            const samples = samplePointsRef.current[type] || [];
            if (samples.length === 0) {
                newCategoryRecovery[type] = 100;
                return;
            }

            let restored = 0;
            for (let i = 0; i < samples.length; i++) {
                const [x, y] = samples[i];
                if (x >= 0 && x < OFF_WIDTH && y >= 0 && y < OFF_HEIGHT) {
                    const alpha = imgData[(y * OFF_WIDTH + x) * 4 + 3];
                    if (alpha < 60) {
                        restored++;
                    }
                }
            }

            const pct = Math.min(100, Math.round((restored / samples.length) * 100));
            newCategoryRecovery[type] = pct;
            totalSamples += samples.length;
            totalRestored += restored;
        });

        const totalPct = totalSamples > 0 
            ? Math.min(100, Math.round((totalRestored / totalSamples) * 100)) 
            : 0;

        setCategoryRecovery(newCategoryRecovery);
        setRecovery(totalPct);

        if (totalPct >= RECOVERY_GOAL && gameState === 'playing') {
            setGameState('success');
            SoundManager.playSFX('victory');
            const victoryTimer = setTimeout(() => {
                if (onComplete) onComplete();
            }, 12000);
            return () => clearTimeout(victoryTimer);
        }
    }, [gameState, onComplete]);

    const paintStroke = useCallback((screenP1, screenP2) => {
        const map = mapInstanceRef.current;
        const offCanvas = offscreenCanvasRef.current;
        const gb = geoBoundsRef.current;
        if (!map || !offCanvas || !gb) return;

        const offCtx = offCanvas.getContext('2d');
        const matchingZones = platerPolygonsRef.current.filter(z => z.type === selectedTool);
        if (matchingZones.length === 0) return;

        const ll1 = map.containerPointToLatLng([screenP1.x, screenP1.y]);
        const ll2 = map.containerPointToLatLng([screenP2.x, screenP2.y]);
        const off1 = latLngToOffscreen(ll1.lat, ll1.lng);
        const off2 = latLngToOffscreen(ll2.lat, ll2.lng);

        const pTL = map.latLngToContainerPoint([gb.maxLat, gb.minLng]);
        const pBR = map.latLngToContainerPoint([gb.minLat, gb.maxLng]);
        const screenWidth = Math.abs(pBR.x - pTL.x) || 1;
        const scaleFactor = OFF_WIDTH / screenWidth;
        const effectiveBrushSize = Math.max(10, brushSize * scaleFactor);

        const dx = off2[0] - off1[0];
        const dy = off2[1] - off1[1];
        const dist = Math.hypot(dx, dy);
        const stepSize = Math.max(4, Math.floor(effectiveBrushSize * 0.22));
        const steps = Math.max(1, Math.floor(dist / stepSize));

        let strokeMatched = false;
        let mismatchType = null;

        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const curLat = ll1.lat + (ll2.lat - ll1.lat) * t;
            const curLng = ll1.lng + (ll2.lng - ll1.lng) * t;

            for (const zone of platerPolygonsRef.current) {
                if (isPointInPolygon([curLat, curLng], zone.points)) {
                    if (zone.type === selectedTool) {
                        strokeMatched = true;
                    } else if (!mismatchType) {
                        mismatchType = zone.type;
                    }
                }
            }
        }

        offCtx.save();
        offCtx.beginPath();
        matchingZones.forEach(zone => {
            const offPts = zone.points.map(([lat, lng]) => latLngToOffscreen(lat, lng));
            offPts.forEach(([x, y], i) => {
                if (i === 0) offCtx.moveTo(x, y);
                else offCtx.lineTo(x, y);
            });
            offCtx.closePath();
        });
        offCtx.clip();

        offCtx.globalCompositeOperation = 'destination-out';

        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const x = off1[0] + dx * t;
            const y = off1[1] + dy * t;

            const rad = offCtx.createRadialGradient(x, y, effectiveBrushSize * 0.25, x, y, effectiveBrushSize);
            rad.addColorStop(0, 'rgba(0, 0, 0, 1)');
            rad.addColorStop(0.85, 'rgba(0, 0, 0, 0.95)');
            rad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            offCtx.fillStyle = rad;
            offCtx.beginPath();
            offCtx.arc(x, y, effectiveBrushSize, 0, Math.PI * 2);
            offCtx.fill();
        }

        offCtx.restore();
        renderCoverToScreen(map);

        if (!strokeMatched && mismatchType) {
            showMismatchFeedback(mismatchType);
        }
    }, [brushSize, latLngToOffscreen, renderCoverToScreen, selectedTool, showMismatchFeedback]);

    // Funció de desplaçament (Pan) manual i amb botons
    const handlePan = (dx, dy) => {
        const map = mapInstanceRef.current;
        if (!map) return;
        map.panBy([dx, dy], { animate: true, duration: 0.25 });
    };

    const handlePointerStart = (e) => {
        // Multi-touch a mòbil (2 dits per fer pan i zoom)
        if (e.touches && e.touches.length === 2) {
            setIsDrawing(false);
            setLastPos(null);
            isPanningRef.current = true;
            const t1 = e.touches[0];
            const t2 = e.touches[1];
            touchDistRef.current = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
            touchMidRef.current = {
                x: (t1.clientX + t2.clientX) / 2,
                y: (t1.clientY + t2.clientY) / 2
            };
            return;
        }

        const isRightClick = e.button === 2;
        const isMiddleClick = e.button === 1;
        const isPanMode = interactionMode === 'pan';

        // Si és mode Moure o s'utilitza botó dret/central, activar desplaçament
        if (isPanMode || isRightClick || isMiddleClick) {
            isPanningRef.current = true;
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            panStartRef.current = { x: clientX, y: clientY };
            return;
        }

        if (e.button && e.button !== 0) return; // Només botó primari

        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const rect = coverCanvasRef.current.getBoundingClientRect();
        const pt = { x: clientX - rect.left, y: clientY - rect.top };
        setIsDrawing(true);
        setLastPos(pt);
        paintStroke(pt, pt);
        SoundManager.playSFX('click');
    };

    const handlePointerMove = (e) => {
        // Gestió de 2 dits a mòbil: pan i pinch zoom
        if (e.touches && e.touches.length === 2) {
            const t1 = e.touches[0];
            const t2 = e.touches[1];
            const curDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
            const curMid = {
                x: (t1.clientX + t2.clientX) / 2,
                y: (t1.clientY + t2.clientY) / 2
            };

            const map = mapInstanceRef.current;
            if (!map) return;

            if (touchMidRef.current) {
                const dx = curMid.x - touchMidRef.current.x;
                const dy = curMid.y - touchMidRef.current.y;
                map.panBy([-dx, -dy], { animate: false });
            }
            touchMidRef.current = curMid;

            if (touchDistRef.current) {
                const distDiff = curDist - touchDistRef.current;
                if (distDiff > 35) {
                    map.zoomIn(1);
                    touchDistRef.current = curDist;
                } else if (distDiff < -35) {
                    map.zoomOut(1);
                    touchDistRef.current = curDist;
                }
            }
            return;
        }

        // Pan amb 1 dit en mode Moure o arrossegament de ratolí
        if (isPanningRef.current) {
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            const dx = clientX - panStartRef.current.x;
            const dy = clientY - panStartRef.current.y;
            panStartRef.current = { x: clientX, y: clientY };
            const map = mapInstanceRef.current;
            if (map) {
                map.panBy([-dx, -dy], { animate: false });
            }
            return;
        }

        if (!isDrawing || !lastPos || interactionMode !== 'paint') return;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const rect = coverCanvasRef.current.getBoundingClientRect();
        const pt = { x: clientX - rect.left, y: clientY - rect.top };
        paintStroke(lastPos, pt);
        setLastPos(pt);
    };

    const handlePointerEnd = () => {
        touchDistRef.current = null;
        touchMidRef.current = null;
        isPanningRef.current = false;
        if (!isDrawing) return;
        setIsDrawing(false);
        setLastPos(null);
        calculateRecoveryProgress();
    };

    // Zoom amb la rodeta del ratolí
    const handleCanvasWheel = (e) => {
        e.preventDefault();
        const now = Date.now();
        if (now - lastWheelTimeRef.current < 90) return;
        lastWheelTimeRef.current = now;

        const map = mapInstanceRef.current;
        if (!map) return;

        const rect = coverCanvasRef.current?.getBoundingClientRect();
        const mousePt = rect ? [e.clientX - rect.left, e.clientY - rect.top] : [dimensions.width / 2, dimensions.height / 2];
        const mouseLatLng = map.containerPointToLatLng(mousePt);

        const zoomDelta = e.deltaY < 0 ? 1 : -1;
        const currentZ = map.getZoom();
        const targetZoom = Math.min(20, Math.max(12, currentZ + zoomDelta));
        if (targetZoom !== currentZ) {
            map.setZoomAround(mouseLatLng, targetZoom);
        }
    };

    const handleZoomIn = () => mapInstanceRef.current?.zoomIn(1);
    const handleZoomOut = () => mapInstanceRef.current?.zoomOut(1);
    const handleCenterMap = () => {
        if (mapBoundsRef.current) {
            mapInstanceRef.current?.fitBounds(mapBoundsRef.current, { padding: [20, 20], maxZoom: 16 });
        } else if (mapCenterRef.current) {
            mapInstanceRef.current?.setView(mapCenterRef.current, 15);
        }
    };

    const handleReset = () => {
        initOffscreenCover();
        if (mapInstanceRef.current) {
            renderCoverToScreen(mapInstanceRef.current);
        }
        setRecovery(0);
        setCategoryRecovery({ bosc: 0, riu: 0, cami: 0, camps: 0 });
        setToast({ text: '🔄 Polígon restablert!', color: '#38bdf8' });
        setTimeout(() => setToast(null), 1800);
    };

    return ReactDOM.createPortal(
        <div className="minigame-overlay" style={{ touchAction: 'none', zIndex: 10000 }}>
            <div className="minigame-card scale-up-center" style={{ width: '100vw', height: '100dvh', padding: 0, borderRadius: 0, background: '#0f172a', display: 'flex', flexDirection: 'column' }}>
                {/* Mobile Header */}
                <div className="minigame-header" style={{ padding: '8px 12px', background: 'rgba(15, 23, 42, 0.98)', borderBottom: '1px solid rgba(16, 185, 129, 0.4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <Shield color="#10b981" size={20} />
                        <div>
                            <h3 style={{ margin: 0, fontSize: '0.94rem', color: 'white', fontWeight: 800 }}>ATUREM EL PLATER</h3>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: '2px' }}>
                                <div style={{ width: '75px', height: '6px', background: '#1e293b', borderRadius: 3, overflow: 'hidden' }}>
                                    <div style={{ width: `${recovery}%`, height: '100%', background: '#10b981', transition: 'width 0.2s' }}></div>
                                </div>
                                <span style={{ color: recovery >= RECOVERY_GOAL ? '#10b981' : '#38bdf8', fontWeight: 'bold', fontSize: '0.78rem' }}>{recovery}%</span>
                            </div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <button
                            onClick={() => setShowGuides(g => !g)}
                            style={{ background: showGuides ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.1)', border: 'none', color: showGuides ? '#6ee7b7' : '#94a3b8', padding: '4px 6px', borderRadius: '5px', fontSize: '0.68rem', display: 'flex', alignItems: 'center', gap: 3 }}
                            title="Línies guia"
                        >
                            {showGuides ? <Eye size={12} /> : <EyeOff size={12} />}
                        </button>
                        <button
                            onClick={() => setMapProvider(p => p === 'google' ? 'icgc' : 'google')}
                            style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#38bdf8', padding: '4px 6px', borderRadius: '5px', fontSize: '0.68rem', display: 'flex', alignItems: 'center', gap: 3 }}
                        >
                            <Layers size={12} /> {mapProvider === 'google' ? 'Google' : 'ICGC'}
                        </button>
                        <button onClick={onClose} className="close-btn" style={{ background: 'white', border: 'none', borderRadius: '50%', width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', cursor: 'pointer', lineHeight: 1 }}>×</button>
                    </div>
                </div>

                {/* Canvas & Map Area */}
                <div ref={containerRef} style={{ position: 'relative', flex: 1, overflow: 'hidden' }}>
                    {/* 1. Base Map Layer (Leaflet Google Satellite) */}
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1 }}>
                        {mapBoundsRef.current && (
                            <MapContainer
                                center={mapCenterRef.current}
                                zoom={15}
                                style={{ width: '100%', height: '100%' }}
                                dragging={interactionMode === 'pan'}
                                scrollWheelZoom={true}
                                zoomControl={false}
                                doubleClickZoom={false}
                                touchZoom={true}
                                keyboard={false}
                            >
                                {mapProvider === 'google' ? (
                                    <TileLayer
                                        url="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
                                        attribution="&copy; Google Maps Satèl·lit"
                                        maxZoom={20}
                                    />
                                ) : (
                                    <TileLayer
                                        url="https://geoserveis.icgc.cat/icc_mapesmultibase/noutm/wmts/orto/GRID3857/{z}/{x}/{y}.png"
                                        attribution="&copy; ICGC Ortofoto"
                                        maxZoom={20}
                                    />
                                )}

                                <MobileMapController 
                                    bounds={mapBoundsRef.current} 
                                    center={mapCenterRef.current} 
                                    onMapReady={handleMapReady}
                                    onMapUpdate={handleMapUpdate}
                                />
                            </MapContainer>
                        )}
                    </div>

                    {/* 2. Opaque Speculative Plater Polygon Canvas (Z-Index 10) */}
                    <canvas
                        ref={coverCanvasRef}
                        width={dimensions.width}
                        height={dimensions.height}
                        onTouchStart={handlePointerStart}
                        onTouchMove={handlePointerMove}
                        onTouchEnd={handlePointerEnd}
                        onMouseDown={handlePointerStart}
                        onMouseMove={handlePointerMove}
                        onMouseUp={handlePointerEnd}
                        onWheel={handleCanvasWheel}
                        onContextMenu={(e) => e.preventDefault()}
                        style={{
                            position: 'absolute', top: 0, left: 0, zIndex: 10,
                            touchAction: 'none',
                            cursor: interactionMode === 'pan' ? 'grab' : 'crosshair',
                            pointerEvents: 'auto'
                        }}
                    />

                    {/* 3. Línies Guia Dinàmiques sincronitzades amb el zoom (SVG) */}
                    {showGuides && mapInstanceRef.current && (
                        <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 15 }}>
                            {platerPolygonsRef.current.map((zone, idx) => {
                                const tInfo = PLATER_ZONE_TYPES[zone.type] || PLATER_ZONE_TYPES.bosc;
                                const screenPts = zone.points.map(([lat, lng]) => {
                                    const p = mapInstanceRef.current.latLngToContainerPoint([lat, lng]);
                                    return [p.x, p.y];
                                });
                                const ptsString = screenPts.map(p => `${p[0]},${p[1]}`).join(' ');
                                const center = screenPts.reduce((acc, p) => [acc[0] + p[0], acc[1] + p[1]], [0, 0]);
                                const cx = center[0] / screenPts.length;
                                const cy = center[1] / screenPts.length;

                                return (
                                    <g key={`mguide-${zone.id || idx}`}>
                                        <polygon
                                            points={ptsString}
                                            fill={`${tInfo.color}15`}
                                            stroke={tInfo.color}
                                            strokeWidth="1.8"
                                            strokeDasharray="5 3"
                                        />
                                        <text
                                            x={cx}
                                            y={cy}
                                            fill={tInfo.color}
                                            fontSize="10"
                                            fontWeight="800"
                                            textAnchor="middle"
                                            style={{ filter: 'drop-shadow(0 0 3px #000)' }}
                                        >
                                            {tInfo.icon} {tInfo.shortLabel}
                                        </text>
                                    </g>
                                );
                            })}
                        </svg>
                    )}

                    {/* 4. Controls Flotants de Zoom i Pan (Mòbil) */}
                    <div style={{
                        position: 'absolute', top: 10, right: 10, zIndex: 30,
                        display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end'
                    }}>
                        <div style={{
                            display: 'flex', background: 'rgba(15, 23, 42, 0.94)',
                            border: '1.5px solid rgba(255,255,255,0.2)', borderRadius: '6px',
                            overflow: 'hidden', padding: '2px'
                        }}>
                            <button
                                onClick={() => setInteractionMode('paint')}
                                style={{
                                    padding: '5px 8px', border: 'none', borderRadius: '4px',
                                    background: interactionMode === 'paint' ? '#10b981' : 'transparent',
                                    color: interactionMode === 'paint' ? '#ffffff' : '#94a3b8',
                                    fontSize: '0.68rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 3
                                }}
                            >
                                <Paintbrush size={11} /> Pintar
                            </button>
                            <button
                                onClick={() => setInteractionMode('pan')}
                                style={{
                                    padding: '5px 8px', border: 'none', borderRadius: '4px',
                                    background: interactionMode === 'pan' ? '#38bdf8' : 'transparent',
                                    color: interactionMode === 'pan' ? '#0f172a' : '#94a3b8',
                                    fontSize: '0.68rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 3
                                }}
                            >
                                <Hand size={11} /> Moure
                            </button>
                        </div>

                        {/* D-Pad Pan & Zoom cluster (Mobile) */}
                        <div style={{
                            background: 'rgba(15, 23, 42, 0.94)', border: '1.5px solid rgba(255,255,255,0.2)',
                            borderRadius: '10px', padding: '5px', boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
                            display: 'flex', flexDirection: 'column', gap: '5px', alignItems: 'center'
                        }}>
                            <div style={{
                                display: 'grid', gridTemplateColumns: 'repeat(3, 24px)', gridTemplateRows: 'repeat(3, 24px)',
                                gap: '3px', alignItems: 'center', justifyContent: 'center'
                            }}>
                                <div />
                                <button
                                    onClick={() => handlePan(0, -100)}
                                    style={{ width: '24px', height: '24px', border: 'none', background: 'rgba(255,255,255,0.12)', color: '#fff', borderRadius: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                    title="Desplaçar amunt"
                                >
                                    <ChevronUp size={16} />
                                </button>
                                <div />
                                <button
                                    onClick={() => handlePan(-100, 0)}
                                    style={{ width: '24px', height: '24px', border: 'none', background: 'rgba(255,255,255,0.12)', color: '#fff', borderRadius: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                    title="Desplaçar esquerra"
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                <button
                                    onClick={handleCenterMap}
                                    style={{ width: '24px', height: '24px', border: 'none', background: 'rgba(56, 189, 248, 0.25)', color: '#38bdf8', borderRadius: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                    title="Centrar mapa"
                                >
                                    <Compass size={13} />
                                </button>
                                <button
                                    onClick={() => handlePan(100, 0)}
                                    style={{ width: '24px', height: '24px', border: 'none', background: 'rgba(255,255,255,0.12)', color: '#fff', borderRadius: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                    title="Desplaçar dreta"
                                >
                                    <ChevronRight size={16} />
                                </button>
                                <div />
                                <button
                                    onClick={() => handlePan(0, 100)}
                                    style={{ width: '24px', height: '24px', border: 'none', background: 'rgba(255,255,255,0.12)', color: '#fff', borderRadius: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                    title="Desplaçar avall"
                                >
                                    <ChevronDown size={16} />
                                </button>
                                <div />
                            </div>

                            <div style={{ width: '100%', height: '1px', background: 'rgba(255,255,255,0.15)' }} />

                            <div style={{ display: 'flex', gap: '3px', width: '100%' }}>
                                <button
                                    onClick={handleZoomIn}
                                    style={{ flex: 1, height: '24px', border: 'none', background: 'rgba(255,255,255,0.12)', color: '#fff', borderRadius: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    title="Zoom In"
                                >
                                    <Plus size={14} />
                                </button>
                                <button
                                    onClick={handleZoomOut}
                                    style={{ flex: 1, height: '24px', border: 'none', background: 'rgba(255,255,255,0.12)', color: '#fff', borderRadius: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    title="Zoom Out"
                                >
                                    <Minus size={14} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* 5. Feedback Toast */}
                    {toast && (
                        <div style={{
                            position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)',
                            background: 'rgba(15, 23, 42, 0.95)', border: `2px solid ${toast.color}`,
                            color: '#ffffff', padding: '8px 14px', borderRadius: '20px',
                            boxShadow: `0 3px 15px ${toast.color}66`, zIndex: 25,
                            fontSize: '0.8rem', fontWeight: 'bold', pointerEvents: 'none',
                            whiteSpace: 'nowrap', animation: 'scale-up-center 0.2s ease'
                        }}>
                            {toast.text}
                        </div>
                    )}
                </div>

                {/* Mobile Tools Toolbar */}
                <div style={{ padding: '8px 12px', background: '#1e293b', borderTop: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '6px' }}>
                        {Object.entries(PLATER_ZONE_TYPES).map(([id, tool]) => {
                            const isSel = selectedTool === id && interactionMode === 'paint';
                            const pct = categoryRecovery[id] || 0;
                            return (
                                <button
                                    key={id}
                                    onClick={() => {
                                        setSelectedTool(id);
                                        setInteractionMode('paint');
                                    }}
                                    style={{
                                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
                                        padding: '6px 4px', borderRadius: '8px',
                                        border: isSel ? `2px solid ${tool.color}` : '1px solid rgba(255,255,255,0.08)',
                                        background: isSel ? `${tool.color}25` : 'rgba(255,255,255,0.04)',
                                        color: 'white', flex: 1,
                                        boxShadow: isSel ? `0 2px 8px ${tool.color}77` : 'none'
                                    }}
                                >
                                    <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>{tool.icon}</span>
                                    <span style={{ fontSize: '0.65rem', fontWeight: isSel ? 'bold' : 'normal', color: isSel ? tool.color : '#f1f5f9' }}>
                                        {tool.shortLabel}
                                    </span>
                                    <span style={{ fontSize: '0.6rem', color: pct >= 90 ? '#10b981' : '#94a3b8' }}>
                                        {pct}%
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
                        <div style={{ display: 'flex', gap: '4px' }}>
                            {[20, 32, 46].map(sz => (
                                <button
                                    key={sz}
                                    onClick={() => setBrushSize(sz)}
                                    style={{
                                        padding: '3px 8px', borderRadius: '5px', border: 'none',
                                        background: brushSize === sz ? '#38bdf8' : 'rgba(255,255,255,0.1)',
                                        color: brushSize === sz ? '#000' : '#fff', fontWeight: 'bold', fontSize: '0.68rem'
                                    }}
                                >
                                    {sz === 20 ? 'Fi' : sz === 32 ? 'Mitjà' : 'Gran'}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={handleReset}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '3px',
                                background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)',
                                color: '#fca5a5', padding: '4px 8px', borderRadius: '5px', fontSize: '0.68rem', cursor: 'pointer'
                            }}
                        >
                            <RotateCcw size={11} /> Reiniciar
                        </button>
                    </div>
                </div>

                {gameState === 'success' && (
                    <div className="success-overlay fade-in" style={{
                        position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                        background: 'radial-gradient(circle at center, rgba(6, 78, 59, 0.98) 0%, rgba(2, 44, 34, 0.99) 100%)',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        padding: '20px', textAlign: 'center', zIndex: 100, overflowY: 'auto'
                    }}>
                        <div style={{
                            width: '64px', height: '64px', borderRadius: '50%',
                            background: 'rgba(16, 185, 129, 0.2)', border: '2px solid #10b981',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 0 25px rgba(16, 185, 129, 0.6)', marginBottom: '10px'
                        }}>
                            <CheckCircle size={40} color="#10b981" />
                        </div>

                        <div style={{
                            display: 'inline-flex', alignItems: 'center', gap: '6px',
                            padding: '4px 14px', borderRadius: '16px',
                            background: 'rgba(16, 185, 129, 0.25)', border: '1px solid #10b981',
                            color: '#6ee7b7', fontWeight: 800, fontSize: '0.78rem',
                            textTransform: 'uppercase', marginBottom: '8px'
                        }}>
                            ✨ Pantalla Superada!
                        </div>

                        <h2 style={{ color: '#ffffff', fontSize: '1.9rem', margin: '0 0 8px 0', fontWeight: 900 }}>
                            PLATER ATURAT!
                        </h2>

                        <p style={{ color: '#a7f3d0', margin: '0 0 16px 0', fontSize: '0.95rem', lineHeight: 1.4 }}>
                            Has salvat el 100% del territori amenaçat. La pressió ciutadana i l'energia a les teulades han vençut l'especulació!
                        </p>

                        <div style={{
                            display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px',
                            width: '100%', maxWidth: '320px', marginBottom: '18px'
                        }}>
                            <div style={{ background: 'rgba(6, 95, 70, 0.5)', border: '1px solid rgba(52, 211, 153, 0.3)', borderRadius: '10px', padding: '10px' }}>
                                <div style={{ fontSize: '1.3rem' }}>🌳</div>
                                <div style={{ color: '#34d399', fontWeight: 800, fontSize: '0.8rem' }}>Bosc de Ribera</div>
                            </div>
                            <div style={{ background: 'rgba(6, 95, 70, 0.5)', border: '1px solid rgba(52, 211, 153, 0.3)', borderRadius: '10px', padding: '10px' }}>
                                <div style={{ fontSize: '1.3rem' }}>🌊</div>
                                <div style={{ color: '#38bdf8', fontWeight: 800, fontSize: '0.8rem' }}>Riu Ter Protegit</div>
                            </div>
                            <div style={{ background: 'rgba(6, 95, 70, 0.5)', border: '1px solid rgba(52, 211, 153, 0.3)', borderRadius: '10px', padding: '10px' }}>
                                <div style={{ fontSize: '1.3rem' }}>🌾</div>
                                <div style={{ color: '#fbbf24', fontWeight: 800, fontSize: '0.8rem' }}>Camps Salvats</div>
                            </div>
                            <div style={{ background: 'rgba(6, 95, 70, 0.5)', border: '1px solid rgba(52, 211, 153, 0.3)', borderRadius: '10px', padding: '10px' }}>
                                <div style={{ fontSize: '1.3rem' }}>🚶</div>
                                <div style={{ color: '#f472b6', fontWeight: 800, fontSize: '0.8rem' }}>Camins Lliures</div>
                            </div>
                        </div>

                        <button
                            onClick={() => { if (onComplete) onComplete(); }}
                            style={{
                                width: '100%', maxWidth: '320px', padding: '14px', fontSize: '1rem', fontWeight: 800,
                                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                color: '#ffffff', border: 'none', borderRadius: '12px', cursor: 'pointer',
                                boxShadow: '0 6px 20px rgba(16, 185, 129, 0.5)'
                            }}
                        >
                            🎉 CELEBRAR LA VICTÒRIA
                        </button>
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
};

export default MobileAturemPlater;