export const NARRATIVE_PHASES = {
    0: {
        title: "El Silenci de la Llera",
        description: "El Plater arriba amb promeses buides. El poble està dividit i poruc.",
        threshold: 0,
        image: "/cinematics/celdoni_intro.png",
        dialogue: [
            { character: "Celdoni", text: "Escolta'm bé, jove... el Plater no és una instal·lació d'energia, és una operació de saqueig." },
            { character: "Celdoni", text: "Aquests 'Suits' (els homes de gris) no busquen sobirania; busquen segrestar el territori per vendre'l al millor postor." },
            { character: "Celdoni", text: "Volen cobrir-ho tot de vidre i formigó per inflar el valor de les accions, sense importar-los qui hi viu o què hi creix." },
            { character: "Celdoni", text: "Hem de protegir cada teulada. Ens cal ser com uns veritables Quixots. Allibera 3 teulades veïnals per trencar el seu primer cercle de control!" }
        ]
    },
    1: {
        title: "L'Assemblea a la Sala Nova",
        description: "La primera espurna d'unió. Reuneix la gent a la Sala Nova.",
        threshold: 3, // nodes liberated
        image: "/cinematics/celdoni_strike.png",
        dialogue: [
            { character: "Antònia", text: "Ja en som uns quants! Els veïns estan començant a veure que l'especulació ens roba el futur." },
            { character: "Celdoni", text: "Amb aquest cop de llança, cada kW que generem nosaltres és un euro que no va a les butxaques dels especuladors." },
            { character: "Celdoni", text: "La Sala Nova és on tot va començar. Ves-hi i ajuda a l'Antònia a organitzar la comunitat!" }
        ]
    },
    2: {
        title: "L'Ofensiva del Pavelló",
        description: "El projecte guanya escala. El Pavelló és la clau de la xarxa.",
        threshold: 10, // After Sala Nova is liberated (logic in App.jsx)
        image: "/cinematics/celdoni_charge.png",
        dialogue: [
            { character: "Celdoni", text: "Ho sentiu? És el soroll de la gent movent-se. Però el Plater està enviant més 'Suits' cap al Pavelló." },
            { character: "Marketing Expert", text: "Necessitem una campanya de comunicació massiva. Si el Pavelló cau, la xarxa cau." },
            { character: "Celdoni", text: "Llavors carregarem contra ells! Amb rodes i plaques solars! Que tremolin els falsos gegants!" }
        ]
    },
    3: {
        title: "L'Hora dels Gegants",
        description: "El territori està despert. La batalla final s'apropa.",
        threshold: 20,
        image: "/cinematics/celdoni_charge.png",
        dialogue: [
            { character: "Antònia", text: "Mai havíem estat tan units. Mira el color que torna als camps!" },
            { character: "Celdoni", text: "El Plater està desesperat. Estan plegant les rases d'amagat. No podem aturar la càrrega ara. Falta poc!" }
        ]
    },
    4: {
        title: "Aturem el Plater",
        description: "Confrontació directa per la sobirania definitiva.",
        threshold: 100, // Logic: all rooftop nodes
        image: "/cinematics/celdoni_dome.png",
        dialogue: [
            { character: "Celdoni", text: "És l'hora, amic. Alça el camp de sobirania! Enfronta't a la malla definitiva. Per la Llera, per Sant Jordi!" }
        ]
    }
};
