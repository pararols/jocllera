import React, { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import Phaser from 'phaser';
import SoundManager from '../../logic/SoundManager';

const QuizQuestions = [
    {
        q: "Què és la sobirania energètica?",
        a: "Generar i decidir sobre la nostra energia localment",
        b: "Comprar tota la llum a grans multinacionals",
        c: "Dependre del gas i petroli estrangers",
        correct: 'a'
    },
    {
        q: "Què defineix una Comunitat Energètica?",
        a: "Un negoci que busca el màxim lucre",
        b: "Veïns que comparteixen i gestionen energia neta",
        c: "Una taxa extra que cobra la companyia elèctrica",
        correct: 'b'
    },
    {
        q: "Com protegim la llera del riu Ter?",
        a: "Evitant macroprojectes agressius i cuidant l'aigua",
        b: "Construint més polígons de formigó al marge",
        c: "Canalitzant el riu amb canonades tancades",
        correct: 'a'
    },
    {
        q: "Quin benefici té l'autoconsum fotovoltaic a les teulades?",
        a: "Duplicar les emissions de CO2 del poble",
        b: "Aprofitar espais ja construïts sense danyar sòl agrícola",
        c: "Incrementar les pèrdues de transport a la xarxa",
        correct: 'b'
    },
    {
        q: "Què passa si una teulada genera més energia de la que consumeix?",
        a: "Es perd irremeiablement",
        b: "Pot compartir els excedents amb els veïns propers",
        c: "Produeix una fallada elèctrica obligada",
        correct: 'b'
    },
    {
        q: "Quin paper té la Sala Nova a Sant Jordi Desvalls?",
        a: "Un espai veïnal de trobada i assemblea comunitària",
        b: "La seu d'una empresa energètica especuladora",
        c: "Un magatzem de carburants fòssils",
        correct: 'a'
    },
    {
        q: "Per què les bateries locals són útils en una xarxa neta?",
        a: "Permeten emmagatzemar l'energia sobrant pel vespre",
        b: "Consumeixen energia contaminant contínuament",
        c: "Obliguen a apagar les plaques solars",
        correct: 'a'
    },
    {
        q: "Qui és el gran perill d'El Plater per a la comarca?",
        a: "Els ocells i la biodiversitat del bosc",
        b: "L'especulació que privatitza el benefici i malmet el paisatge",
        c: "Les cooperatives veïnals de consum conscient",
        correct: 'b'
    }
];

const QuizSobirania = ({ onComplete, onClose }) => {
    const parentRef = useRef(null);
    const gameRef = useRef(null);
    const onCompleteRef = useRef(onComplete);
    const onCloseRef = useRef(onClose);

    useEffect(() => {
        onCompleteRef.current = onComplete;
        onCloseRef.current = onClose;
    }, [onComplete, onClose]);

    useEffect(() => {
        const isPortrait = window.innerWidth <= 768 || window.innerHeight > window.innerWidth;
        const gameWidth = isPortrait ? 360 : 800;
        const gameHeight = isPortrait ? 600 : 600;

        let currentQuestionIndex = 0;
        let score = 0;
        let lives = 3;
        let platforms = [];
        let optionTexts = [];
        let questionText = null;
        let player = null;
        let stars = null;
        let livesText = null;
        let scoreText = null;
        let buttons = [];
        let isTransitioning = false;

        // Shuffle questions
        const shuffledQuestions = [...QuizQuestions].sort(() => 0.5 - Math.random());

        class QuizScene extends Phaser.Scene {
            constructor() {
                super('QuizScene');
            }

            preload() {
                // Check if textures already exist to avoid duplicate crash on restart
                if (!this.textures.exists('knight')) {
                    const knightCanvas = this.textures.createCanvas('knight', 32, 48);
                    const ctx = knightCanvas.context;
                    ctx.fillStyle = '#3498db';
                    ctx.fillRect(4, 16, 24, 24);
                    ctx.fillStyle = '#f1c40f';
                    ctx.fillRect(8, 6, 16, 10);
                    ctx.fillStyle = '#2c3e50';
                    ctx.fillRect(10, 8, 12, 4);
                    ctx.fillStyle = '#bdc3c7';
                    ctx.fillRect(26, 10, 4, 16);
                    ctx.fillStyle = '#7f8c8d';
                    ctx.fillRect(24, 22, 8, 2);
                    knightCanvas.refresh();
                }

                const platW = isPortrait ? 290 : 220;
                const platH = isPortrait ? 52 : 40;
                const platKey = isPortrait ? 'platform_p' : 'platform_d';

                if (!this.textures.exists(platKey)) {
                    const platformCanvas = this.textures.createCanvas(platKey, platW, platH);
                    const pCtx = platformCanvas.context;
                    pCtx.fillStyle = 'rgba(30, 41, 59, 0.95)';
                    pCtx.fillRect(0, 0, platW, platH);
                    pCtx.strokeStyle = '#3b82f6';
                    pCtx.lineWidth = 2;
                    pCtx.strokeRect(0, 0, platW, platH);
                    platformCanvas.refresh();
                }

                if (!this.textures.exists('star')) {
                    const starCanvas = this.textures.createCanvas('star', 10, 10);
                    const sCtx = starCanvas.context;
                    sCtx.fillStyle = '#f1c40f';
                    sCtx.fillRect(0, 0, 10, 10);
                    starCanvas.refresh();
                }
            }

            create() {
                const width = this.scale.width;
                const height = this.scale.height;
                const platKey = isPortrait ? 'platform_p' : 'platform_d';
                const platW = isPortrait ? 290 : 220;
                const platH = isPortrait ? 52 : 40;

                // Background
                this.add.graphics()
                    .fillGradientStyle(0x0f172a, 0x0f172a, 0x1e293b, 0x1e293b, 1)
                    .fillRect(0, 0, width, height);

                this.add.grid(width / 2, height / 2, width, height, 30, 30, 0, 0, 0xffffff, 0.04);

                // Header
                this.add.text(isPortrait ? 15 : 20, 18, "QUIZ SOBIRANIA", {
                    fontFamily: 'Outfit, sans-serif',
                    fontSize: isPortrait ? '16px' : '18px',
                    fontWeight: 'bold',
                    color: '#3b82f6'
                });

                // Close Button
                const closeBtn = this.add.text(width - (isPortrait ? 30 : 40), 16, '✕', {
                    fontSize: isPortrait ? '20px' : '24px',
                    color: '#94a3b8',
                    cursor: 'pointer'
                }).setInteractive();
                closeBtn.on('pointerdown', () => onCloseRef.current?.());

                // HUD Stats
                livesText = this.add.text(isPortrait ? 15 : 20, 46, `Vides: ❤️❤️❤️`, {
                    fontFamily: 'monospace',
                    fontSize: '14px',
                    color: '#ef4444'
                });

                scoreText = this.add.text(width - (isPortrait ? 120 : 150), 46, `Respostes: 0/3`, {
                    fontFamily: 'monospace',
                    fontSize: '14px',
                    color: '#10b981'
                });

                // Bottom Floor
                const floor = this.physics.add.staticGroup();
                const floorGraphics = this.add.graphics();
                floorGraphics.fillStyle(0x10b981, 1);
                floorGraphics.fillRect(0, height - 30, width, 30);
                const floorObj = this.add.zone(width / 2, height - 15, width, 30);
                this.physics.add.existing(floorObj, true);
                floor.add(floorObj);

                // Knight Player
                player = this.physics.add.sprite(width / 2, height - 70, 'knight');
                player.setCollideWorldBounds(true);
                player.setBounce(0.1);
                this.physics.add.collider(player, floor);

                // Particle Emitter for modern Phaser
                try {
                    stars = this.add.particles(0, 0, 'star', {
                        lifespan: 600,
                        speed: { min: 80, max: 200 },
                        scale: { start: 1, end: 0 },
                        emitting: false
                    });
                } catch (e) {
                    console.warn('Particle init warning', e);
                }

                // Layout configuration based on orientation
                let platformCoords = [];
                if (isPortrait) {
                    // Vertical stacking for portrait phones
                    platformCoords = [
                        { x: width / 2, y: 220 },
                        { x: width / 2, y: 310 },
                        { x: width / 2, y: 400 }
                    ];
                } else {
                    // Horizontal 3 platforms side by side
                    platformCoords = [
                        { x: 150, y: 320 },
                        { x: 400, y: 320 },
                        { x: 650, y: 320 }
                    ];
                }

                platforms = [];
                buttons = [];
                optionTexts = [];

                for (let i = 0; i < 3; i++) {
                    const pos = platformCoords[i];
                    const plat = this.physics.add.image(pos.x, pos.y, platKey);
                    plat.setImmovable(true);
                    plat.body.allowGravity = false;
                    platforms.push(plat);

                    this.physics.add.collider(player, plat);

                    const btn = this.add.zone(pos.x, pos.y, platW, platH).setInteractive({ useHandCursor: true });
                    buttons.push(btn);

                    const label = ['A', 'B', 'C'][i];
                    btn.on('pointerdown', () => {
                        this.selectAnswer(label, pos.x, pos.y);
                    });

                    btn.on('pointerover', () => {
                        if (!isTransitioning) plat.setTint(0x3b82f6);
                    });
                    btn.on('pointerout', () => {
                        plat.clearTint();
                    });

                    const optTextY = isPortrait ? pos.y : (pos.y + 70);
                    const optText = this.add.text(pos.x, optTextY, '', {
                        fontFamily: 'Inter, sans-serif',
                        fontSize: isPortrait ? '13px' : '14px',
                        color: '#f8fafc',
                        align: 'center',
                        wordWrap: { width: isPortrait ? 270 : 200 }
                    }).setOrigin(0.5);
                    optionTexts.push(optText);
                }

                // Question Text
                questionText = this.add.text(width / 2, isPortrait ? 115 : 140, '', {
                    fontFamily: 'Outfit, sans-serif',
                    fontSize: isPortrait ? '17px' : '22px',
                    color: '#ffffff',
                    fontWeight: 'bold',
                    align: 'center',
                    wordWrap: { width: isPortrait ? 320 : 700 }
                }).setOrigin(0.5);

                this.displayQuestion();
            }

            displayQuestion() {
                if (currentQuestionIndex >= shuffledQuestions.length) {
                    currentQuestionIndex = 0;
                }

                const question = shuffledQuestions[currentQuestionIndex];
                questionText.setText(question.q);
                optionTexts[0].setText(`A) ${question.a}`);
                optionTexts[1].setText(`B) ${question.b}`);
                optionTexts[2].setText(`C) ${question.c}`);

                player.setPosition(this.scale.width / 2, this.scale.height - 70);
                if (player.body) {
                    player.body.setAllowGravity(true);
                    player.setVelocity(0, 0);
                }
                isTransitioning = false;
            }

            selectAnswer(choice, targetX, targetY) {
                if (isTransitioning || lives <= 0) return;
                isTransitioning = true;

                SoundManager.playSFX('click');
                const letter = choice.toLowerCase();

                if (player.body) {
                    player.body.setAllowGravity(false);
                    player.setVelocity(0, 0);
                }

                this.tweens.add({
                    targets: player,
                    x: targetX,
                    y: targetY - 35,
                    duration: 400,
                    ease: 'Cubic.easeOut',
                    onComplete: () => {
                        if (player.body) player.body.setAllowGravity(true);
                        this.validateAnswer(letter);
                    }
                });
            }

            validateAnswer(letter) {
                const question = shuffledQuestions[currentQuestionIndex];

                if (letter === question.correct) {
                    score++;
                    scoreText.setText(`Respostes: ${score}/3`);

                    if (stars && typeof stars.explode === 'function') {
                        stars.explode(16, player.x, player.y);
                    }
                    SoundManager.playSFX('success');

                    if (score >= 3) {
                        this.add.text(this.scale.width / 2, isPortrait ? 490 : 490, 'SOBIRANIA ASSOLIDA! 🌟', {
                            fontFamily: 'Outfit, sans-serif',
                            fontSize: isPortrait ? '18px' : '24px',
                            color: '#10b981',
                            fontWeight: 'bold'
                        }).setOrigin(0.5);
                        this.time.delayedCall(1200, () => onCompleteRef.current?.());
                    } else {
                        currentQuestionIndex++;
                        this.time.delayedCall(900, () => this.displayQuestion());
                    }
                } else {
                    lives--;
                    const hearts = '❤️'.repeat(Math.max(0, lives)) + '🖤'.repeat(Math.max(0, 3 - lives));
                    livesText.setText(`Vides: ${hearts}`);

                    SoundManager.playSFX('defeat');
                    this.cameras.main.shake(250, 0.012);

                    if (lives <= 0) {
                        this.add.text(this.scale.width / 2, isPortrait ? 480 : 480, 'PARTIDA ACABADA', {
                            fontFamily: 'Outfit, sans-serif',
                            fontSize: isPortrait ? '22px' : '26px',
                            color: '#ef4444',
                            fontWeight: 'bold'
                        }).setOrigin(0.5);

                        const retryBtn = this.add.text(this.scale.width / 2, isPortrait ? 530 : 535, 'TORNAR A INTENTAR', {
                            fontFamily: 'Inter, sans-serif',
                            fontSize: '15px',
                            backgroundColor: '#3b82f6',
                            padding: { x: 16, y: 8 },
                            color: '#ffffff'
                        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

                        retryBtn.on('pointerdown', () => {
                            score = 0;
                            lives = 3;
                            currentQuestionIndex = 0;
                            livesText.setText(`Vides: ❤️❤️❤️`);
                            scoreText.setText(`Respostes: 0/3`);
                            retryBtn.destroy();
                            this.displayQuestion();
                        });
                    } else {
                        currentQuestionIndex++;
                        this.time.delayedCall(900, () => this.displayQuestion());
                    }
                }
            }
        }

        const config = {
            type: Phaser.AUTO,
            scale: {
                mode: Phaser.Scale.FIT,
                autoCenter: Phaser.Scale.CENTER_BOTH
            },
            width: gameWidth,
            height: gameHeight,
            parent: parentRef.current,
            physics: {
                default: 'arcade',
                arcade: {
                    gravity: { y: 600 },
                    debug: false
                }
            },
            scene: QuizScene
        };

        const game = new Phaser.Game(config);
        gameRef.current = game;

        return () => {
            if (gameRef.current) {
                gameRef.current.destroy(true);
            }
        };
    }, []);

    return ReactDOM.createPortal(
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            zIndex: 10000,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            backdropFilter: 'blur(6px)',
            padding: '10px'
        }}>
            <div style={{
                borderRadius: '16px',
                overflow: 'hidden',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                backgroundColor: '#0f172a',
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                maxWidth: '800px',
                height: '92vh',
                maxHeight: '620px',
                position: 'relative'
            }}>
                <button
                    onClick={() => onCloseRef.current?.()}
                    style={{
                        position: 'absolute',
                        top: 10,
                        right: 12,
                        zIndex: 1000,
                        background: 'rgba(30, 41, 59, 0.9)',
                        color: '#f8fafc',
                        border: '1px solid rgba(255, 255, 255, 0.25)',
                        borderRadius: '50%',
                        width: '32px',
                        height: '32px',
                        fontSize: '18px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                    title="Tancar"
                >×</button>
                <div ref={parentRef} style={{ width: '100%', height: '100%' }}></div>
            </div>
        </div>,
        document.body
    );
};

export default QuizSobirania;
