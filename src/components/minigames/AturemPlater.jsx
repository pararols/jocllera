import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import '../../App.css';
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

const RECOVERY_GOAL = 95;
const OFF_WIDTH = 2000;
const OFF_HEIGHT = 1600;

// Helper component per connectar els esdeveniments de zoom i moviment del mapa Leaflet
const MapController = ({ bounds, center, onMapReady, onMapUpdate }) => {
    const map = useMap();

    useEffect(() => {
        if (!map) return;

        map.dragging?.enable();
        map.touchZoom?.enable();

        if (bounds) {
            map.fitBounds(bounds, { padding: [35, 35], maxZoom: 16, animate: false });
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

const AturemPlater = ({ onComplete, onClose }) => {
    const containerRef = useRef(null);
    const coverCanvasRef = useRef(null);
    const offscreenCanvasRef = useRef(null);
    const mapInstanceRef = useRef(null);

    const [dimensions, setDimensions] = useState({ width: 790, height: 600 });
    const [recovery, setRecovery] = useState(0);
    const [categoryRecovery, setCategoryRecovery] = useState({
        bosc: 0,
        riu: 0,
        cami: 0,
        camps: 0
    });
    const [selectedTool, setSelectedTool] = useState('bosc');
    const [brushSize, setBrushSize] = useState(36);
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
    const isSpaceDownRef = useRef(false);

    // Suport de tecla espai per fer pan com a Figma/Photoshop
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.code === 'Space' && !e.repeat && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                isSpaceDownRef.current = true;
            }
        };
        const handleKeyUp = (e) => {
            if (e.code === 'Space') {
                isSpaceDownRef.current = false;
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, []);

    // Mides del contenidor
    useEffect(() => {
        const updateDims = () => {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                setDimensions({
                    width: Math.floor(rect.width) || 790,
                    height: Math.floor(rect.height) || 600
                });
            }
        };

        updateDims();
        window.addEventListener('resize', updateDims);
        return () => window.removeEventListener('resize', updateDims);
    }, []);

    // Conversió de coordenades geogràfiques a píxels de l'offscreenCanvas (Persistent)
    const latLngToOffscreen = useCallback((lat, lng) => {
        const gb = geoBoundsRef.current;
        if (!gb) return [0, 0];
        const x = ((lng - gb.minLng) / (gb.maxLng - gb.minLng)) * OFF_WIDTH;
        const y = ((gb.maxLat - lat) / (gb.maxLat - gb.minLat)) * OFF_HEIGHT;
        return [x, y];
    }, []);

    // Renderitza l'offscreenCanvas directament sobre la pantalla alineat amb el mapa Leaflet
    const renderCoverToScreen = useCallback((map) => {
        const canvas = coverCanvasRef.current;
        const offCanvas = offscreenCanvasRef.current;
        const gb = geoBoundsRef.current;
        if (!canvas || !offCanvas || !gb || !map) return;

        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Projecció de les cantonades nord-oest i sud-est al sistema de píxels de pantalla
        const pTL = map.latLngToContainerPoint([gb.maxLat, gb.minLng]);
        const pBR = map.latLngToContainerPoint([gb.minLat, gb.maxLng]);

        const destX = pTL.x;
        const destY = pTL.y;
        const destW = pBR.x - pTL.x;
        const destH = pBR.y - pTL.y;

        ctx.drawImage(offCanvas, destX, destY, destW, destH);
    }, []);

    // Inicialitza l'offscreenCanvas amb el polígon opac del Plater
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

        // Dibuixar els polígons del Plater amb estil fotovoltaic opac
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

            // 1. Fons fosc sòlid del macroparc
            offCtx.fillStyle = '#0f172a';
            offCtx.fill();

            // 2. Trama de panells fotovoltaics retallada
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

            // 3. Vora d'avís especulatiu
            offCtx.strokeStyle = '#e67e22';
            offCtx.lineWidth = 4;
            offCtx.setLineDash([14, 10]);
            offCtx.stroke();
            offCtx.restore();
        });

        // Cartell d'avís
        if (allThreats[0]?.points?.length > 0) {
            const firstPt = latLngToOffscreen(allThreats[0].points[0][0], allThreats[0].points[0][1]);
            offCtx.save();
            offCtx.fillStyle = 'rgba(220, 38, 38, 0.95)';
            offCtx.fillRect(firstPt[0] - 10, firstPt[1] - 45, 420, 40);
            offCtx.strokeStyle = '#fca5a5';
            offCtx.lineWidth = 2.5;
            offCtx.strokeRect(firstPt[0] - 10, firstPt[1] - 45, 420, 40);
            offCtx.fillStyle = '#ffffff';
            offCtx.font = 'bold 16px system-ui, sans-serif';
            offCtx.fillText('⚡ POLÍGON MACROPARC EL PLATER', firstPt[0] + 10, firstPt[1] - 20);
            offCtx.restore();
        }

        // Punts de mostreig per calcular percentatges de forma invariant amb el zoom
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

    // Carrega els polígons i inicialitza la geometria
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
            text: `⚠️ Aquí hi ha ${typeInfo.shortLabel}! Fes servir el ${typeInfo.toolLabel} ${typeInfo.icon}`,
            color: typeInfo.color
        });
        toastTimerRef.current = setTimeout(() => {
            setToast(null);
        }, 1800);
    }, []);

    // Sincronització del mapa
    const handleMapReady = useCallback((map) => {
        mapInstanceRef.current = map;
        setCurrentZoom(map.getZoom());
        renderCoverToScreen(map);
    }, [renderCoverToScreen]);

    const handleMapUpdate = useCallback((map) => {
        setCurrentZoom(map.getZoom());
        renderCoverToScreen(map);
    }, [renderCoverToScreen]);

    // Calcula els percentatges recuperats directament a l'offscreenCanvas (independent del nivell de zoom)
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
            // Timer de seguretat per si l'usuari no fa clic al botó de victòria
            const victoryTimer = setTimeout(() => {
                if (onComplete) onComplete();
            }, 12000);
            return () => clearTimeout(victoryTimer);
        }
    }, [gameState, onComplete]);

    // PINZELLADA GEOREFERENCIADA: Dibuixa a l'offscreenCanvas amb retall estricte al tipus de terreny
    const paintStroke = useCallback((screenP1, screenP2) => {
        const map = mapInstanceRef.current;
        const offCanvas = offscreenCanvasRef.current;
        const gb = geoBoundsRef.current;
        if (!map || !offCanvas || !gb) return;

        const offCtx = offCanvas.getContext('2d');

        // Polígons que corresponen al pinzell seleccionat
        const matchingZones = platerPolygonsRef.current.filter(z => z.type === selectedTool);
        if (matchingZones.length === 0) return;

        // Convertir punts de pantalla a LatLng i després a coordenades de l'offscreenCanvas
        const ll1 = map.containerPointToLatLng([screenP1.x, screenP1.y]);
        const ll2 = map.containerPointToLatLng([screenP2.x, screenP2.y]);
        const off1 = latLngToOffscreen(ll1.lat, ll1.lng);
        const off2 = latLngToOffscreen(ll2.lat, ll2.lng);

        // Càlcul de la mida del pinzell ajustada a l'escala de l'offscreenCanvas
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

        // Comprovació d'encert o error de zona sobre coordenades geogràfiques
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

        // RETALL ESTRICTE: Únicament es fa transparent el polígon del llapis actiu
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
        offCtx.clip(); // <--- Màscara estricta!

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

        // Actualitzar el canvas de pantalla
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

    // Gestió d'esdeveniments del ratolí (click premut desplaçar a web)
    const handlePointerDown = (e) => {
        const isRightClick = e.button === 2;
        const isMiddleClick = e.button === 1;
        const isPanMode = interactionMode === 'pan';

        // Si és mode Moure o s'utilitza botó dret/central/espai, activar Pan amb ratolí
        if (isPanMode || isRightClick || isMiddleClick || isSpaceDownRef.current) {
            isPanningRef.current = true;
            panStartRef.current = { x: e.clientX, y: e.clientY };
            return;
        }

        if (e.button !== 0) return; // Només clic esquerre per pintar

        const rect = coverCanvasRef.current.getBoundingClientRect();
        const pt = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        setIsDrawing(true);
        setLastPos(pt);
        paintStroke(pt, pt);
        SoundManager.playSFX('click');
    };

    const handlePointerMove = (e) => {
        // Desplaçament continu del mapa amb clic premut
        if (isPanningRef.current) {
            const dx = e.clientX - panStartRef.current.x;
            const dy = e.clientY - panStartRef.current.y;
            panStartRef.current = { x: e.clientX, y: e.clientY };
            const map = mapInstanceRef.current;
            if (map) {
                map.panBy([-dx, -dy], { animate: false });
            }
            return;
        }

        if (!isDrawing || !lastPos || interactionMode !== 'paint') return;
        const rect = coverCanvasRef.current.getBoundingClientRect();
        const pt = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        paintStroke(lastPos, pt);
        setLastPos(pt);
    };

    const handlePointerUp = () => {
        isPanningRef.current = false;
        if (!isDrawing) return;
        setIsDrawing(false);
        setLastPos(null);
        calculateRecoveryProgress();
    };

    // Gestió d'esdeveniments tàctils amb els dits (1 dit pinta o mou, 2 dits mouen i fan zoom)
    const handleTouchStart = (e) => {
        if (e.touches.length === 2) {
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

        if (interactionMode === 'pan') {
            isPanningRef.current = true;
            panStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            return;
        }

        if (interactionMode === 'paint' && e.touches.length === 1) {
            const rect = coverCanvasRef.current.getBoundingClientRect();
            const pt = { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
            setIsDrawing(true);
            setLastPos(pt);
            paintStroke(pt, pt);
            SoundManager.playSFX('click');
        }
    };

    const handleTouchMove = (e) => {
        // Gestió de 2 dits a mòbil: desplaçar i pessic per fer zoom simultani
        if (e.touches.length === 2) {
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

        // Gestió d'1 dit en mode Moure
        if (isPanningRef.current && e.touches.length === 1) {
            const dx = e.touches[0].clientX - panStartRef.current.x;
            const dy = e.touches[0].clientY - panStartRef.current.y;
            panStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            const map = mapInstanceRef.current;
            if (map) {
                map.panBy([-dx, -dy], { animate: false });
            }
            return;
        }

        if (!isDrawing || !lastPos || interactionMode !== 'paint') return;
        const rect = coverCanvasRef.current.getBoundingClientRect();
        const pt = { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
        paintStroke(lastPos, pt);
        setLastPos(pt);
    };

    const handleTouchEnd = () => {
        touchDistRef.current = null;
        touchMidRef.current = null;
        isPanningRef.current = false;
        if (!isDrawing) return;
        setIsDrawing(false);
        setLastPos(null);
        calculateRecoveryProgress();
    };

    // Suport de zoom amb la rodeta del ratolí sobre el canvas de pintura centrat al cursor
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

    // Controls de zoom manuals
    const handleZoomIn = () => {
        mapInstanceRef.current?.zoomIn(1);
    };

    const handleZoomOut = () => {
        mapInstanceRef.current?.zoomOut(1);
    };

    const handleCenterMap = () => {
        if (mapBoundsRef.current) {
            mapInstanceRef.current?.fitBounds(mapBoundsRef.current, { padding: [35, 35], maxZoom: 16 });
        } else if (mapCenterRef.current) {
            mapInstanceRef.current?.setView(mapCenterRef.current, 15);
        }
    };

    const handleResetDrawing = () => {
        initOffscreenCover();
        if (mapInstanceRef.current) {
            renderCoverToScreen(mapInstanceRef.current);
        }
        setRecovery(0);
        setCategoryRecovery({ bosc: 0, riu: 0, cami: 0, camps: 0 });
        setToast({ text: '🔄 Polígon del Plater restablert. Torna a començar!', color: '#38bdf8' });
        setTimeout(() => setToast(null), 2000);
    };

    return ReactDOM.createPortal(
        <div className="minigame-overlay" style={{ zIndex: 100000 }}>
            <div className="minigame-card scale-up-center" style={{
                width: 'min(1100px, 98vw)', padding: 0, overflow: 'hidden',
                backgroundColor: '#0f172a', border: '2px solid #10b981',
                boxShadow: '0 0 50px rgba(16, 185, 129, 0.4)', borderRadius: '16px'
            }}>
                {/* Header */}
                <div className="minigame-header" style={{
                    padding: '12px 22px', background: 'rgba(15, 23, 42, 0.98)',
                    borderBottom: '1px solid rgba(16, 185, 129, 0.4)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <Shield color="#10b981" size={28} />
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'white', fontWeight: 800, letterSpacing: '0.5px' }}>
                                ATUREM EL PLATER: RECUPERACIÓ DEL MUNICIPI
                            </h3>
                            <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8' }}>
                                Pots fer zoom al mapa amb la rodeta, pessic o botons +/-. Pinta per destapar el satèl·lit real!
                            </p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ color: recovery >= RECOVERY_GOAL ? '#10b981' : '#38bdf8', fontWeight: 800, fontSize: '1.25rem' }}>
                                {recovery}% RECUPERAT
                            </div>
                            <div style={{ width: '170px', height: '9px', background: '#1e293b', borderRadius: '5px', overflow: 'hidden', marginTop: '4px', border: '1px solid rgba(255,255,255,0.1)' }}>
                                <div style={{
                                    width: `${recovery}%`,
                                    height: '100%',
                                    background: recovery >= RECOVERY_GOAL ? '#10b981' : 'linear-gradient(90deg, #0284c7, #10b981)',
                                    transition: 'width 0.3s ease',
                                    boxShadow: '0 0 10px #10b981'
                                }}></div>
                            </div>
                        </div>
                        <button onClick={onClose} className="close-btn" style={{ fontSize: '1.7rem', background: 'none', border: 'none', color: 'white', cursor: 'pointer', lineHeight: 1 }}>×</button>
                    </div>
                </div>

                {/* Game Body */}
                <div style={{ display: 'flex', height: '620px', position: 'relative' }}>
                    {/* Tool Sidebar */}
                    <div style={{ width: '255px', background: '#1e293b', padding: '16px', display: 'flex', flexDirection: 'column', gap: '11px', borderRight: '1px solid #334155', zIndex: 10, overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h4 style={{ color: '#cbd5e1', margin: 0, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 800 }}>
                                Llapis del Territori
                            </h4>
                            <button
                                onClick={() => setMapProvider(p => p === 'google' ? 'icgc' : 'google')}
                                style={{
                                    background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
                                    color: '#38bdf8', fontSize: '0.7rem', padding: '3px 7px', borderRadius: '4px',
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
                                }}
                                title="Canvia el proveïdor de satèl·lit"
                            >
                                <Layers size={12} /> {mapProvider === 'google' ? 'Google' : 'ICGC'}
                            </button>
                        </div>

                        {/* 4 Tool Selectors (Bosc, Riu, Camí, Camps) */}
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
                                        display: 'flex', flexDirection: 'column', gap: '5px',
                                        padding: '9px 11px', borderRadius: '9px',
                                        border: isSel ? `2px solid ${tool.color}` : '1px solid rgba(255,255,255,0.08)',
                                        cursor: 'pointer', textAlign: 'left',
                                        background: isSel ? `${tool.color}25` : 'rgba(255,255,255,0.04)',
                                        color: 'white', transition: 'all 0.15s',
                                        boxShadow: isSel ? `0 0 14px ${tool.color}55` : 'none',
                                        transform: isSel ? 'scale(1.02)' : 'none'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                                            <span style={{ fontSize: '1.2rem' }}>{tool.icon}</span>
                                            <div>
                                                <div style={{ fontWeight: isSel ? 800 : 600, fontSize: '0.86rem', color: isSel ? tool.color : '#f1f5f9' }}>
                                                    {tool.label}
                                                </div>
                                                <div style={{ fontSize: '0.66rem', color: '#94a3b8' }}>{tool.toolLabel}</div>
                                            </div>
                                        </div>
                                        <span style={{ fontSize: '0.74rem', fontWeight: 800, color: pct >= 90 ? '#10b981' : tool.color }}>
                                            {pct}%
                                        </span>
                                    </div>

                                    {/* Mini barra de progrés */}
                                    <div style={{ width: '100%', height: '5px', background: 'rgba(0,0,0,0.4)', borderRadius: '3px', overflow: 'hidden' }}>
                                        <div style={{
                                            width: `${pct}%`, height: '100%',
                                            background: tool.color,
                                            transition: 'width 0.2s ease'
                                        }}></div>
                                    </div>
                                </button>
                            );
                        })}

                        {/* Mida del Pinzell */}
                        <div style={{ background: 'rgba(0,0,0,0.3)', padding: '9px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '0.72rem', marginBottom: '5px' }}>
                                <span>Mida del Pinzell:</span>
                                <strong style={{ color: '#38bdf8' }}>{brushSize}px</strong>
                            </div>
                            <div style={{ display: 'flex', gap: '5px' }}>
                                {[22, 36, 54].map(sz => (
                                    <button
                                        key={sz}
                                        onClick={() => setBrushSize(sz)}
                                        style={{
                                            flex: 1, padding: '5px 0', borderRadius: '5px', border: 'none',
                                            background: brushSize === sz ? '#38bdf8' : 'rgba(255,255,255,0.1)',
                                            color: brushSize === sz ? '#000' : '#fff', fontWeight: 'bold', fontSize: '0.72rem',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {sz === 22 ? 'Fi' : sz === 36 ? 'Mitjà' : 'Ample'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Mostrar/Ocultar Línies de Guia */}
                        <button
                            onClick={() => setShowGuides(g => !g)}
                            style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
                                background: showGuides ? 'rgba(16, 185, 129, 0.16)' : 'rgba(255,255,255,0.05)',
                                border: showGuides ? '1px solid rgba(16, 185, 129, 0.45)' : '1px solid rgba(255,255,255,0.12)',
                                color: showGuides ? '#6ee7b7' : '#94a3b8',
                                padding: '7px', borderRadius: '7px', cursor: 'pointer',
                                fontSize: '0.75rem', fontWeight: 600
                            }}
                        >
                            {showGuides ? <Eye size={14} /> : <EyeOff size={14} />}
                            {showGuides ? 'Línies Guia: Visibles' : 'Línies Guia: Ocultes'}
                        </button>

                        {/* Botó Reiniciar */}
                        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '7px' }}>
                            <button
                                onClick={handleResetDrawing}
                                style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                    background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)',
                                    color: '#fca5a5', padding: '7px', borderRadius: '7px', cursor: 'pointer',
                                    fontSize: '0.75rem', fontWeight: 600
                                }}
                            >
                                <RotateCcw size={13} /> Reiniciar polígon
                            </button>
                            <div style={{ padding: '7px 9px', background: 'rgba(0,0,0,0.3)', borderRadius: '6px', fontSize: '0.7rem', color: '#94a3b8', lineHeight: 1.35, border: '1px solid rgba(255,255,255,0.05)' }}>
                                💡 <strong>Navegació i Zoom:</strong> Pots desplaçar el mapa amb els botons ⬆️⬇️⬅️➡️, canviant a mode «Moure», arrossegant amb 2 dits a mòbil, o amb botó dret / roda / tecla Espai a web. Zoom amb la rodeta del ratolí o els botons +/-.
                            </div>
                        </div>
                    </div>

                    {/* Canvas & Satellite Map Area */}
                    <div ref={containerRef} style={{ position: 'relative', flex: 1, height: '100%', overflow: 'hidden' }}>
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

                                    <MapController 
                                        bounds={mapBoundsRef.current} 
                                        center={mapCenterRef.current} 
                                        onMapReady={handleMapReady}
                                        onMapUpdate={handleMapUpdate}
                                    />
                                </MapContainer>
                            )}
                        </div>

                        {/* 2. Opaque Speculative Plater Polygon Canvas (Z-Index 10) - Suporta Zoom i Pan Georeferenciats */}
                        <canvas
                            ref={coverCanvasRef}
                            width={dimensions.width}
                            height={dimensions.height}
                            onPointerDown={handlePointerDown}
                            onPointerMove={handlePointerMove}
                            onPointerUp={handlePointerUp}
                            onPointerLeave={handlePointerUp}
                            onTouchStart={handleTouchStart}
                            onTouchMove={handleTouchMove}
                            onTouchEnd={handleTouchEnd}
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
                                        <g key={`guide-${zone.id || idx}`}>
                                            <polygon
                                                points={ptsString}
                                                fill={`${tInfo.color}15`}
                                                stroke={tInfo.color}
                                                strokeWidth="2"
                                                strokeDasharray="6 4"
                                            />
                                            <text
                                                x={cx}
                                                y={cy}
                                                fill={tInfo.color}
                                                fontSize="11"
                                                fontWeight="800"
                                                textAnchor="middle"
                                                style={{ filter: 'drop-shadow(0 0 4px #000)' }}
                                            >
                                                {tInfo.icon} {tInfo.shortLabel}
                                            </text>
                                        </g>
                                    );
                                })}
                            </svg>
                        )}

                        {/* 4. Controls Flotants de Zoom i Navegació */}
                        <div style={{
                            position: 'absolute', top: 14, right: 14, zIndex: 30,
                            display: 'flex', flexDirection: 'column', gap: '6px'
                        }}>
                            {/* Selector de Mode: Pintar vs Moure */}
                            <div style={{
                                display: 'flex', background: 'rgba(15, 23, 42, 0.92)',
                                border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px',
                                overflow: 'hidden', boxShadow: '0 4px 15px rgba(0,0,0,0.4)', padding: '2px'
                            }}>
                                <button
                                    onClick={() => setInteractionMode('paint')}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '5px',
                                        padding: '6px 10px', border: 'none', borderRadius: '6px',
                                        background: interactionMode === 'paint' ? '#10b981' : 'transparent',
                                        color: interactionMode === 'paint' ? '#ffffff' : '#94a3b8',
                                        fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer'
                                    }}
                                    title="Mode Pintar (Destapa el mapa amb el pinzell)"
                                >
                                    <Paintbrush size={13} /> Pintar
                                </button>
                                <button
                                    onClick={() => setInteractionMode('pan')}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '5px',
                                        padding: '6px 10px', border: 'none', borderRadius: '6px',
                                        background: interactionMode === 'pan' ? '#38bdf8' : 'transparent',
                                        color: interactionMode === 'pan' ? '#0f172a' : '#94a3b8',
                                        fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer'
                                    }}
                                    title="Mode Moure (Arrossega per moure el mapa lliurement)"
                                >
                                    <Hand size={13} /> Moure
                                </button>
                            </div>

                            {/* Pan D-Pad & Zoom Controls */}
                            <div style={{
                                background: 'rgba(15, 23, 42, 0.94)', border: '1.5px solid rgba(255,255,255,0.2)',
                                borderRadius: '12px', padding: '6px', boxShadow: '0 6px 20px rgba(0,0,0,0.5)',
                                display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center', alignSelf: 'flex-end'
                            }}>
                                {/* D-Pad Buttons */}
                                <div style={{
                                    display: 'grid', gridTemplateColumns: 'repeat(3, 28px)', gridTemplateRows: 'repeat(3, 28px)',
                                    gap: '3px', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    <div />
                                    <button
                                        onClick={() => handlePan(0, -120)}
                                        style={{ width: '28px', height: '28px', border: 'none', background: 'rgba(255,255,255,0.12)', color: '#fff', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                        title="Desplaçar amunt"
                                    >
                                        <ChevronUp size={18} />
                                    </button>
                                    <div />
                                    <button
                                        onClick={() => handlePan(-120, 0)}
                                        style={{ width: '28px', height: '28px', border: 'none', background: 'rgba(255,255,255,0.12)', color: '#fff', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                        title="Desplaçar esquerra"
                                    >
                                        <ChevronLeft size={18} />
                                    </button>
                                    <button
                                        onClick={handleCenterMap}
                                        style={{ width: '28px', height: '28px', border: 'none', background: 'rgba(56, 189, 248, 0.25)', color: '#38bdf8', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                        title="Centrar mapa"
                                    >
                                        <Compass size={15} />
                                    </button>
                                    <button
                                        onClick={() => handlePan(120, 0)}
                                        style={{ width: '28px', height: '28px', border: 'none', background: 'rgba(255,255,255,0.12)', color: '#fff', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                        title="Desplaçar dreta"
                                    >
                                        <ChevronRight size={18} />
                                    </button>
                                    <div />
                                    <button
                                        onClick={() => handlePan(0, 120)}
                                        style={{ width: '28px', height: '28px', border: 'none', background: 'rgba(255,255,255,0.12)', color: '#fff', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                        title="Desplaçar avall"
                                    >
                                        <ChevronDown size={18} />
                                    </button>
                                    <div />
                                </div>

                                <div style={{ width: '100%', height: '1px', background: 'rgba(255,255,255,0.15)' }} />

                                {/* Zoom In & Out Buttons */}
                                <div style={{ display: 'flex', gap: '4px', width: '100%', justifyContent: 'center' }}>
                                    <button
                                        onClick={handleZoomIn}
                                        style={{ flex: 1, height: '28px', border: 'none', background: 'rgba(255,255,255,0.12)', color: '#fff', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                        title="Apropar el mapa (Zoom In)"
                                    >
                                        <Plus size={16} />
                                    </button>
                                    <button
                                        onClick={handleZoomOut}
                                        style={{ flex: 1, height: '28px', border: 'none', background: 'rgba(255,255,255,0.12)', color: '#fff', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                        title="Allunyar el mapa (Zoom Out)"
                                    >
                                        <Minus size={16} />
                                    </button>
                                </div>
                            </div>

                            {/* Indicador de Nivell de Zoom */}
                            <div style={{
                                alignSelf: 'flex-end', background: 'rgba(15, 23, 42, 0.85)',
                                padding: '2px 8px', borderRadius: '4px', fontSize: '0.68rem',
                                color: '#94a3b8', fontWeight: 'bold', border: '1px solid rgba(255,255,255,0.1)'
                            }}>
                                Zoom {currentZoom}
                            </div>
                        </div>

                        {/* 5. Feedback Toast */}
                        {toast && (
                            <div style={{
                                position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
                                background: 'rgba(15, 23, 42, 0.95)', border: `2px solid ${toast.color}`,
                                color: '#ffffff', padding: '9px 16px', borderRadius: '30px',
                                boxShadow: `0 4px 20px ${toast.color}66`, zIndex: 25,
                                fontSize: '0.84rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 7,
                                pointerEvents: 'none', animation: 'scale-up-center 0.2s ease'
                            }}>
                                {toast.text}
                            </div>
                        )}
                    </div>
                </div>

                {/* Victory Modal */}
                {gameState === 'success' && (
                    <div className="success-overlay" style={{
                        position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        background: 'radial-gradient(circle at center, rgba(6, 78, 59, 0.98) 0%, rgba(2, 44, 34, 0.99) 100%)',
                        zIndex: 100, textAlign: 'center', padding: '30px', animation: 'fadeIn 0.3s ease-out'
                    }}>
                        <div style={{
                            width: '86px', height: '86px', borderRadius: '50%',
                            background: 'rgba(16, 185, 129, 0.2)', border: '3px solid #10b981',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 0 35px rgba(16, 185, 129, 0.6)', marginBottom: '14px'
                        }}>
                            <CheckCircle size={52} color="#10b981" />
                        </div>

                        <div style={{
                            display: 'inline-flex', alignItems: 'center', gap: '8px',
                            padding: '6px 18px', borderRadius: '20px',
                            background: 'rgba(16, 185, 129, 0.25)', border: '1px solid #10b981',
                            color: '#6ee7b7', fontWeight: 800, fontSize: '0.85rem',
                            textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px'
                        }}>
                            ✨ Pantalla Superada amb Èxit!
                        </div>

                        <h2 style={{ color: '#ffffff', margin: '0 0 10px 0', fontSize: '2.7rem', fontWeight: 900, textShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
                            EL PLATER HA ESTAT ATURAT!
                        </h2>

                        <p style={{ color: '#a7f3d0', fontSize: '1.2rem', maxWidth: '680px', margin: '0 0 24px 0', lineHeight: 1.5, fontWeight: 500 }}>
                            Has descobert i salvat el 100% del territori amenaçat. La mobilització ciutadana i l'energia solar a les teulades han vençut l'especulació!
                        </p>

                        {/* Celebratory Points Cards */}
                        <div style={{
                            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px',
                            maxWidth: '780px', width: '100%', marginBottom: '26px'
                        }}>
                            <div style={{ background: 'rgba(6, 95, 70, 0.5)', border: '1px solid rgba(52, 211, 153, 0.35)', borderRadius: '14px', padding: '14px 10px' }}>
                                <div style={{ fontSize: '1.8rem', marginBottom: '6px' }}>🌳</div>
                                <div style={{ color: '#34d399', fontWeight: 800, fontSize: '0.92rem', marginBottom: '4px' }}>Bosc de Ribera</div>
                                <div style={{ color: '#e2e8f0', fontSize: '0.78rem' }}>Fauna i flora autòctones salvades</div>
                            </div>
                            <div style={{ background: 'rgba(6, 95, 70, 0.5)', border: '1px solid rgba(52, 211, 153, 0.35)', borderRadius: '14px', padding: '14px 10px' }}>
                                <div style={{ fontSize: '1.8rem', marginBottom: '6px' }}>🌊</div>
                                <div style={{ color: '#38bdf8', fontWeight: 800, fontSize: '0.92rem', marginBottom: '4px' }}>Riu Ter</div>
                                <div style={{ color: '#e2e8f0', fontSize: '0.78rem' }}>Aqüífers i ribera protegits</div>
                            </div>
                            <div style={{ background: 'rgba(6, 95, 70, 0.5)', border: '1px solid rgba(52, 211, 153, 0.35)', borderRadius: '14px', padding: '14px 10px' }}>
                                <div style={{ fontSize: '1.8rem', marginBottom: '6px' }}>🌾</div>
                                <div style={{ color: '#fbbf24', fontWeight: 800, fontSize: '0.92rem', marginBottom: '4px' }}>Camps Fèrtils</div>
                                <div style={{ color: '#e2e8f0', fontSize: '0.78rem' }}>Sobirania agrària i pagesia local</div>
                            </div>
                            <div style={{ background: 'rgba(6, 95, 70, 0.5)', border: '1px solid rgba(52, 211, 153, 0.35)', borderRadius: '14px', padding: '14px 10px' }}>
                                <div style={{ fontSize: '1.8rem', marginBottom: '6px' }}>🚶</div>
                                <div style={{ color: '#f472b6', fontWeight: 800, fontSize: '0.92rem', marginBottom: '4px' }}>Camins Rurals</div>
                                <div style={{ color: '#e2e8f0', fontSize: '0.78rem' }}>Passeig i patrimoni lliure</div>
                            </div>
                        </div>

                        <button
                            onClick={() => { if (onComplete) onComplete(); }}
                            style={{
                                padding: '16px 40px', fontSize: '1.15rem', fontWeight: 800,
                                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                color: '#ffffff', border: 'none', borderRadius: '14px', cursor: 'pointer',
                                boxShadow: '0 8px 30px rgba(16, 185, 129, 0.6)', transition: 'all 0.2s',
                                display: 'flex', alignItems: 'center', gap: '10px'
                            }}
                        >
                            🎉 CELEBRAR LA VICTÒRIA COMUNITÀRIA
                        </button>
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
};

export default AturemPlater;