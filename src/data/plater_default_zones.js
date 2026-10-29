import gisData from './gis_data.json';

/**
 * Tipus de terreny i polígons per defecte per al minijoc "Aturem el Plater".
 * Permet dibuixar i encertar amb el pinzell: bosc, riu, camí i camps.
 */

export const PLATER_ZONE_TYPES = {
    bosc: {
        id: 'bosc',
        label: 'Bosc Autòcton',
        shortLabel: 'Bosc',
        color: '#10b981',
        strokeColor: '#059669',
        icon: '🌳',
        toolLabel: 'Pinzell Bosc',
        desc: 'Bosc mediterrani i bosc de ribera del Ter'
    },
    riu: {
        id: 'riu',
        label: 'Riu Ter',
        shortLabel: 'Riu',
        color: '#3b82f6',
        strokeColor: '#1d4ed8',
        icon: '🌊',
        toolLabel: 'Pinzell Riu',
        desc: 'Curs natural d\'aigua, meandres i séquies'
    },
    cami: {
        id: 'cami',
        label: 'Camí Rural',
        shortLabel: 'Camí',
        color: '#d97706',
        strokeColor: '#b45309',
        icon: '🥾',
        toolLabel: 'Pinzell Camí',
        desc: 'Senders públics i camins rurals de la Llera'
    },
    camps: {
        id: 'camps',
        label: 'Camps Agrícoles',
        shortLabel: 'Camps',
        color: '#eab308',
        strokeColor: '#ca8a04',
        icon: '🌾',
        toolLabel: 'Pinzell Camps',
        desc: 'Camps de conreu, horta i agroecologia'
    }
};

/**
 * Polígons per defecte que cobreixen la zona amenaçada d'El Plater (Sant Jordi Desvalls).
 */
export const DEFAULT_PLATER_ZONES = [
    // 1. RIU TER (Curs fluvial a l'est de la zona)
    {
        id: 'plater_def_riu_1',
        name: 'Llera del Riu Ter',
        type: 'riu',
        points: [
            [42.0747, 2.9668],
            [42.0725, 2.9665],
            [42.0705, 2.9672],
            [42.0678, 2.9685],
            [42.0645, 2.9698],
            [42.0612, 2.9712],
            [42.0610, 2.9728],
            [42.0642, 2.9715],
            [42.0675, 2.9702],
            [42.0708, 2.9688],
            [42.0728, 2.9680],
            [42.0748, 2.9682]
        ]
    },
    // 2. BOSC DE RIBERA (Vora oest del riu)
    {
        id: 'plater_def_bosc_ribera',
        name: 'Bosc de Ribera del Ter',
        type: 'bosc',
        points: [
            [42.0745, 2.9648],
            [42.0720, 2.9646],
            [42.0695, 2.9655],
            [42.0665, 2.9668],
            [42.0632, 2.9680],
            [42.0605, 2.9695],
            [42.0612, 2.9712],
            [42.0645, 2.9698],
            [42.0678, 2.9685],
            [42.0705, 2.9672],
            [42.0725, 2.9665],
            [42.0747, 2.9668]
        ]
    },
    // 3. BOSC NORD (Massa forestal turó nord del Plater)
    {
        id: 'plater_def_bosc_nord',
        name: 'Bosc Nord d\'El Plater',
        type: 'bosc',
        points: [
            [42.0746, 2.9560],
            [42.0748, 2.9615],
            [42.0732, 2.9635],
            [42.0715, 2.9620],
            [42.0718, 2.9575],
            [42.0735, 2.9550]
        ]
    },
    // 4. CAMÍ RURAL DE LA LLERA (Corredor públic que travessa els camps)
    {
        id: 'plater_def_cami_central',
        name: 'Camí Vell de la Llera',
        type: 'cami',
        points: [
            [42.0730, 2.9535],
            [42.0710, 2.9572],
            [42.0688, 2.9610],
            [42.0655, 2.9645],
            [42.0620, 2.9675],
            [42.0615, 2.9682],
            [42.0652, 2.9652],
            [42.0685, 2.9618],
            [42.0708, 2.9578],
            [42.0728, 2.9540]
        ]
    },
    // 5. CAMÍ DE RIBA (Camí que voreja el bosc de ribera)
    {
        id: 'plater_def_cami_riba',
        name: 'Sender Fluvial del Ter',
        type: 'cami',
        points: [
            [42.0742, 2.9645],
            [42.0715, 2.9643],
            [42.0688, 2.9652],
            [42.0658, 2.9665],
            [42.0625, 2.9678],
            [42.0623, 2.9685],
            [42.0656, 2.9672],
            [42.0686, 2.9658],
            [42.0713, 2.9649],
            [42.0740, 2.9652]
        ]
    },
    // 6. CAMPS AGRÍCOLES NORD-OEST (Horta i conreus)
    {
        id: 'plater_def_camps_nord',
        name: 'Camps de la Plana Nord',
        type: 'camps',
        points: [
            [42.0735, 2.9545],
            [42.0718, 2.9575],
            [42.0715, 2.9620],
            [42.0700, 2.9635],
            [42.0688, 2.9610],
            [42.0710, 2.9572]
        ]
    },
    // 7. CAMPS AGRÍCOLES SUD (Camps fèrtils de la Llera)
    {
        id: 'plater_def_camps_sud',
        name: 'Camps Fèrtils de la Llera',
        type: 'camps',
        points: [
            [42.0710, 2.9535],
            [42.0688, 2.9560],
            [42.0655, 2.9590],
            [42.0620, 2.9625],
            [42.0618, 2.9670],
            [42.0655, 2.9645],
            [42.0688, 2.9610],
            [42.0710, 2.9572],
            [42.0725, 2.9538]
        ]
    }
];

/**
 * Algorisme Ray-Casting per comprovar si un punt [x, y] està dins d'un polígon.
 * @param {[number, number]} point - Coordenades del punt [x, y]
 * @param {Array<[number, number]>} polygon - Llista de vèrtexs del polígon
 * @returns {boolean}
 */
export function isPointInPolygon(point, polygon) {
    if (!polygon || polygon.length < 3) return false;
    const x = point[0];
    const y = point[1];
    let inside = false;

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i][0], yi = polygon[i][1];
        const xj = polygon[j][0], yj = polygon[j][1];

        const intersect = ((yi > y) !== (yj > y)) &&
            (x < (xj - xi) * (y - yi) / (yj - yi) + xi);

        if (intersect) inside = !inside;
    }

    return inside;
}

/**
 * Carrega els polígons del Plater des de localStorage, gisData o per defecte.
 */
export function loadPlaterPolygons() {
    let list = [];
    try {
        const saved = localStorage.getItem('llera_plater_polygons');
        if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) {
                list = parsed;
            }
        }
    } catch (e) {
        console.warn('Error llegint llera_plater_polygons:', e);
    }

    if (list.length === 0 && gisData.platerPolygons && Array.isArray(gisData.platerPolygons) && gisData.platerPolygons.length > 0) {
        list = gisData.platerPolygons;
    }

    if (list.length === 0) {
        return DEFAULT_PLATER_ZONES;
    }

    // Assegura que tots 4 tipus (bosc, riu, cami, camps) tinguin almenys una zona
    const presentTypes = new Set(list.map(p => p.type));
    DEFAULT_PLATER_ZONES.forEach(defPoly => {
        if (!presentTypes.has(defPoly.type)) {
            list.push(defPoly);
        }
    });

    return list;
}

/**
 * Desa els polígons del Plater a localStorage.
 */
export function savePlaterPolygons(polygons) {
    try {
        localStorage.setItem('llera_plater_polygons', JSON.stringify(polygons));
    } catch (e) {
        console.error('Error desant llera_plater_polygons:', e);
    }
}
