import React from 'react';
import { Play } from 'lucide-react';
import '../App.css';

const WelcomeScreen = ({ onStart }) => {
    return (
        <div className="welcome-overlay">
            <div className="welcome-gradient" />

            <div className="welcome-container">
                <h1 className="welcome-title">
                    L'Últim Cavaller de la Llera
                </h1>

                <h2 className="welcome-subtitle">
                    La Vall del Ter necessita la teva energia.
                </h2>

                <p className="welcome-text">
                    L'especulació d'El Plater amenaça amb cobrir la nostra terra i ofegar la sobirania del poble sota un mantell gris. Però l'esperança no està perduda...
                </p>

                <div className="welcome-mission">
                    <h3>LA TEVA MISSIÓ:</h3>
                    <ul>
                        <li><span>🌍</span> <strong>EXPLORA</strong> el mapa de Sant Jordi Desvalls.</li>
                        <li><span>⚡</span> <strong>ALLIBERA</strong> les teulades veïnals per generar energia neta.</li>
                        <li><span>🤝</span> <strong>CONNECTA</strong> els punts de resistència per debilitar la malla especulativa.</li>
                        <li><span>🎮</span> <strong>SUPERA</strong> els mini-jocs de conscienciació energètica per guanyar avantatge.</li>
                    </ul>
                </div>

                <p className="welcome-ready">
                    Estàs preparat per encapçalar la resistència i retornar el color a la Llera?
                </p>

                <button
                    onClick={onStart}
                    className="welcome-btn"
                >
                    <Play size={20} fill="currentColor" />
                    Acceptar i Començar l'Aventura
                </button>
            </div>
        </div>
    );
};

export default WelcomeScreen;
