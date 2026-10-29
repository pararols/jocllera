import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, Music } from 'lucide-react';
import SoundManager from '../logic/SoundManager';

const MusicPlayer = ({ phase, isMobile = false, canAturarPlater = false }) => {
    const [muted, setMuted] = useState(true); // Start muted to avoid autoplay blocks

    useEffect(() => {
        SoundManager.setMute(muted);
    }, [muted]);

    const handleToggle = (e) => {
        if (e) {
            e.stopPropagation();
            if (e.preventDefault) e.preventDefault();
        }
        setMuted(prev => !prev);
    };

    // Mobile mode: stylish round button with speaker icon only
    if (isMobile) {
        return (
            <div
                style={{
                    position: 'fixed',
                    bottom: canAturarPlater ? '142px' : '76px',
                    right: '16px',
                    zIndex: 1000,
                    transition: 'bottom 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    pointerEvents: 'auto'
                }}
            >
                <button
                    onClick={handleToggle}
                    aria-label={muted ? "Activar música" : "Silenciar música"}
                    title={muted ? "Activar música" : "Silenciar música"}
                    style={{
                        width: '46px',
                        height: '46px',
                        borderRadius: '50%',
                        backgroundColor: muted ? 'rgba(15, 23, 42, 0.92)' : '#f59e0b',
                        border: `2px solid ${muted ? 'rgba(255, 255, 255, 0.25)' : '#fde047'}`,
                        color: muted ? '#cbd5e1' : '#0f172a',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: muted
                            ? '0 4px 14px rgba(0, 0, 0, 0.45)'
                            : '0 0 16px rgba(245, 158, 11, 0.75), 0 4px 12px rgba(0, 0, 0, 0.35)',
                        cursor: 'pointer',
                        padding: 0,
                        backdropFilter: 'blur(8px)',
                        WebkitBackdropFilter: 'blur(8px)',
                        transition: 'transform 0.15s ease, background-color 0.2s ease, box-shadow 0.2s ease',
                        outline: 'none',
                        touchAction: 'manipulation'
                    }}
                    onPointerDown={e => { e.currentTarget.style.transform = 'scale(0.92)'; }}
                    onPointerUp={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                    onPointerLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                >
                    {muted ? <VolumeX size={22} strokeWidth={2.2} /> : <Volume2 size={24} strokeWidth={2.4} />}
                </button>
            </div>
        );
    }

    // Desktop mode
    return (
        <div
            className="music-player-desktop"
            style={{
                position: 'fixed', bottom: '20px', right: '20px', zIndex: 10000,
                background: 'rgba(0,0,0,0.85)', padding: '12px 25px', borderRadius: '50px',
                color: 'white', display: 'flex', alignItems: 'center', gap: '15px',
                border: `2px solid ${muted ? '#7f8c8d' : '#f1c40f'}`,
                backdropFilter: 'blur(8px)', boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
                transition: 'all 0.3s ease',
                pointerEvents: 'auto'
            }}
        >
            <button
                onClick={handleToggle}
                style={{
                    background: muted ? '#34495e' : '#f1c40f',
                    border: 'none', color: muted ? 'white' : 'black',
                    width: '40px', height: '40px', borderRadius: '50%',
                    cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center',
                    transition: 'all 0.2s',
                    outline: 'none',
                    boxShadow: muted ? 'none' : '0 0 10px #f1c40f'
                }}
                title={muted ? "Activar música" : "Silenciar música"}
            >
                {muted ? <VolumeX size={20} /> : <Volume2 size={24} />}
            </button>

            <div style={{ display: 'flex', flexDirection: 'column', cursor: 'pointer' }} onClick={handleToggle}>
                <div style={{ fontSize: '0.65rem', color: '#bdc3c7', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Music size={10} /> {muted ? 'MÚSICA ATURADA' : 'ARA SONA:'}
                </div>
                <div style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>
                    {muted ? 'Clica per activar' : 'Digital Overdrive'}
                </div>
            </div>

            {!muted && (
                <div className="audio-visualizer" style={{ display: 'flex', gap: '3px', alignItems: 'flex-end', height: '18px' }}>
                    <div className="bar" style={{ width: '4px', height: '100%', background: '#f1c40f', animation: 'bounce 0.8s infinite alternate' }}></div>
                    <div className="bar" style={{ width: '4px', height: '60%', background: '#f1c40f', animation: 'bounce 0.5s infinite alternate' }}></div>
                    <div className="bar" style={{ width: '3px', height: '80%', background: '#f1c40f', animation: 'bounce 1s infinite alternate' }}></div>
                </div>
            )}

            <style>{`
                @keyframes bounce {
                    0% { height: 20%; }
                    100% { height: 100%; }
                }
                @media (max-width: 768px) {
                    .music-player-desktop {
                        padding: 0 !important;
                        background: transparent !important;
                        border: none !important;
                        box-shadow: none !important;
                        bottom: 76px !important;
                        right: 16px !important;
                    }
                    .music-player-desktop > div {
                        display: none !important;
                    }
                    .music-player-desktop button {
                        width: 46px !important;
                        height: 46px !important;
                        box-shadow: 0 4px 14px rgba(0,0,0,0.45) !important;
                    }
                }
            `}</style>
        </div>
    );
};

export default MusicPlayer;
