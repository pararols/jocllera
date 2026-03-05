import React from 'react';
import { Play } from 'lucide-react';

const WelcomeScreen = ({ onStart }) => {
    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, width: '100vw', height: '100vh',
            zIndex: 30000,
            backgroundImage: 'url(/cinematics/celdoni_intro.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white'
        }}>
            {/* Dark gradient overlay for readability */}
            <div style={{
                position: 'absolute',
                top: 0, left: 0, width: '100vw', height: '100vh',
                background: 'linear-gradient(135deg, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.7) 50%, rgba(0,0,0,0.4) 100%)',
                zIndex: 0
            }} />

            <div style={{
                position: 'relative',
                zIndex: 1,
                maxWidth: '800px',
                padding: '40px',
                background: 'rgba(20, 20, 25, 0.6)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '16px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                textAlign: 'center'
            }}>
                <h1 style={{
                    fontSize: '3rem',
                    fontWeight: '900',
                    textTransform: 'uppercase',
                    letterSpacing: '4px',
                    margin: '0 0 10px 0',
                    color: '#f1c40f',
                    textShadow: '0 2px 10px rgba(241, 196, 15, 0.3)'
                }}>
                    L'Últim Cavaller de la Llera
                </h1>

                <h2 style={{
                    fontSize: '1.5rem',
                    fontWeight: '300',
                    margin: '0 0 30px 0',
                    color: '#ecf0f1',
                    letterSpacing: '1px'
                }}>
                    La Vall del Ter necessita la teva energia.
                </h2>

                <p style={{
                    fontSize: '1.1rem',
                    lineHeight: '1.6',
                    marginBottom: '30px',
                    color: '#bdc3c7',
                    textAlign: 'left'
                }}>
                    L'especulació d'El Plater amenaça amb cobrir la nostra terra i ofegar la sobirania del poble sota un mantell gris. Però l'esperança no està perduda...
                </p>

                <div style={{
                    textAlign: 'left',
                    background: 'rgba(0,0,0,0.3)',
                    padding: '20px',
                    borderRadius: '8px',
                    marginBottom: '40px'
                }}>
                    <h3 style={{ margin: '0 0 15px 0', color: '#f1c40f', fontSize: '1.2rem' }}>LA TEVA MISSIÓ:</h3>
                    <ul style={{
                        listStyleType: 'none',
                        padding: 0,
                        margin: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                    }}>
                        <li><span style={{ marginRight: '10px', fontSize: '1.2rem' }}>🌍</span> <strong>EXPLORA</strong> el mapa de Sant Jordi Desvalls.</li>
                        <li><span style={{ marginRight: '10px', fontSize: '1.2rem' }}>⚡</span> <strong>ALLIBERA</strong> les teulades veïnals per generar energia neta.</li>
                        <li><span style={{ marginRight: '10px', fontSize: '1.2rem' }}>🤝</span> <strong>CONNECTA</strong> els punts de resistència per debilitar la malla especulativa.</li>
                        <li><span style={{ marginRight: '10px', fontSize: '1.2rem' }}>🎮</span> <strong>SUPERA</strong> els mini-jocs de conscienciació energètica per guanyar avantatge.</li>
                    </ul>
                </div>

                <p style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '25px', color: '#ecf0f1' }}>
                    Estàs preparat per encapçalar la resistència i retornar el color a la Llera?
                </p>

                <button
                    onClick={onStart}
                    style={{
                        background: 'linear-gradient(90deg, #f1c40f 0%, #f39c12 100%)',
                        color: '#000',
                        border: 'none',
                        padding: '16px 40px',
                        fontSize: '1.2rem',
                        fontWeight: 'bold',
                        borderRadius: '50px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '12px',
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                        boxShadow: '0 6px 20px rgba(241, 196, 15, 0.4)',
                        transition: 'transform 0.2s, box-shadow 0.2s'
                    }}
                    onMouseOver={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 8px 25px rgba(241, 196, 15, 0.6)';
                    }}
                    onMouseOut={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 6px 20px rgba(241, 196, 15, 0.4)';
                    }}
                >
                    <Play size={20} fill="currentColor" />
                    Acceptar i Començar l'Aventura
                </button>
            </div>
        </div>
    );
};

export default WelcomeScreen;
