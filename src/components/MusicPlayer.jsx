import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Music } from 'lucide-react';

const MusicPlayer = ({ phase }) => {
    const [muted, setMuted] = useState(true); // Start muted to avoid autoplay blocks
    const audioRef = useRef(null);
    const audioPath = "/assets/Digital_Overdrive.mp3";

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = 0.3;
            if (!muted) {
                const playPromise = audioRef.current.play();
                if (playPromise !== undefined) {
                    playPromise.catch(error => {
                        console.log("Audio play failed (autoplay block?):", error);
                        setMuted(true);
                    });
                }
            } else {
                audioRef.current.pause();
            }
        }
    }, [muted]);

    const handleToggle = (e) => {
        if (e) e.stopPropagation();
        setMuted(prev => !prev);
    };

    return (
        <div style={{
            position: 'fixed', bottom: '20px', right: '20px', zIndex: 10000,
            background: 'rgba(0,0,0,0.85)', padding: '12px 25px', borderRadius: '50px',
            color: 'white', display: 'flex', alignItems: 'center', gap: '15px',
            border: `2px solid ${muted ? '#7f8c8d' : '#f1c40f'}`,
            backdropFilter: 'blur(8px)', boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
            transition: 'all 0.3s ease',
            pointerEvents: 'auto'
        }}>
            <audio
                ref={audioRef}
                src={audioPath}
                loop
                preload="auto"
                onError={(e) => console.error("Audio Load Error:", e)}
            />

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
            `}</style>
        </div>
    );
};

export default MusicPlayer;
