import React, { useState, useEffect } from 'react';
import { Play, SkipForward, ChevronRight } from 'lucide-react';

const CinematicOverlay = ({ phase, onComplete }) => {
    const [step, setStep] = useState(0);
    const [isPlayingVideo, setIsPlayingVideo] = useState(true);

    // Auto-skip if no video is present for some reason
    useEffect(() => {
        if (isPlayingVideo && !phase.video) {
            setIsPlayingVideo(false);
        }
    }, [isPlayingVideo, phase.video]);

    const handleNext = () => {
        if (step < phase.dialogue.length - 1) {
            setStep(step + 1);
        } else {
            onComplete();
        }
    };

    if (isPlayingVideo && phase.video) {
        return (
            <div style={{
                position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                backgroundColor: 'black', zIndex: 20000, overflow: 'hidden'
            }}>
                <style>
                    {`
                    .cinematic-video {
                        width: 100%;
                        height: 100%;
                        object-fit: contain;
                    }
                    .skip-btn {
                        position: absolute;
                        bottom: 40px;
                        right: 40px;
                        background: rgba(0,0,0,0.5);
                        border: 1px solid white;
                        color: white;
                        padding: 10px 20px;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        gap: 10px;
                        z-index: 20001;
                    }
                    .skip-btn:hover {
                        background: rgba(0,0,0,0.8);
                    }
                    `}
                </style>
                <video
                    src={phase.video}
                    className="cinematic-video"
                    autoPlay
                    playsInline
                    onEnded={() => setIsPlayingVideo(false)}
                />
                <button
                    onClick={() => setIsPlayingVideo(false)}
                    className="skip-btn"
                >
                    SALTA INTRO <SkipForward size={16} />
                </button>
            </div>
        );
    }

    const currentLine = phase.dialogue[step];

    return (
        <div style={{
            position: 'fixed', bottom: 0, left: 0, width: '100vw', height: '100vh',
            background: 'rgba(0,0,0,0.4)', zIndex: 11000, display: 'flex', flexDirection: 'column',
            justifyContent: 'flex-end', pointerEvents: 'auto'
        }}>
            <div style={{
                background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.8) 70%, transparent 100%)',
                padding: '40px 60px', color: 'white', minHeight: '300px'
            }}>
                <div style={{ maxWidth: '900px', margin: '0 auto', position: 'relative' }}>
                    <h3 style={{ color: '#f1c40f', margin: '0 0 10px 0', fontSize: '1.2rem', textTransform: 'uppercase', letterSpacing: '2px' }}>
                        {currentLine.character}
                    </h3>
                    <p style={{ fontSize: '1.8rem', lineHeight: '1.4', margin: 0, fontWeight: '300' }}>
                        {currentLine.text}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '30px' }}>
                        <button
                            onClick={handleNext}
                            style={{
                                background: '#f1c40f', color: '#000', border: 'none',
                                padding: '12px 30px', fontWeight: 'bold', fontSize: '1.1rem',
                                borderRadius: '50px', cursor: 'pointer', display: 'flex',
                                alignItems: 'center', gap: '10px', boxShadow: '0 4px 15px rgba(241, 196, 15, 0.4)'
                            }}
                        >
                            {step < phase.dialogue.length - 1 ? 'SEGÜENT' : 'ENTRER AL JOC'}
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CinematicOverlay;
