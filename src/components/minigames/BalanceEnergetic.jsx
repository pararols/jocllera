import React, { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import Phaser from 'phaser';
import SoundManager from '../../logic/SoundManager';

const BalanceEnergetic = ({ onComplete, onClose }) => {
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
        const gameHeight = isPortrait ? 640 : 600;

        let timer = 15; // Hold balance for 15 seconds to win
        let frequency = 50.0; // Target 50Hz
        let demand = 95; // Grid consumption (kW)
        let solarProd = 45; // Solar production (kW)
        let windProd = 30; // Wind production (kW)
        let batteryStorage = 50; // Battery level (kWh)
        let batteryMode = 0; // -1: Discharging (Add to grid), 0: Idle, 1: Charging (Store excess)

        let timerText = null;
        let freqText = null;
        let demandText = null;
        let solarText = null;
        let windText = null;
        let batteryText = null;
        let statusText = null;
        let balancePointer = null;

        let solarActive = true;
        let windActive = true;
        let isCollapsed = false;
        let isVictorious = false;
        let simEvent = null;
        let timerEvent = null;

        class BalanceScene extends Phaser.Scene {
            constructor() {
                super('BalanceScene');
            }

            preload() {
                if (!this.textures.exists('dial')) {
                    const dialCanvas = this.textures.createCanvas('dial', 300, 100);
                    const ctx = dialCanvas.context;
                    ctx.strokeStyle = '#7f8c8d';
                    ctx.lineWidth = 4;
                    ctx.arc(150, 90, 80, Math.PI, 0);
                    ctx.stroke();

                    // Danger zone (Red)
                    ctx.strokeStyle = '#ef4444';
                    ctx.lineWidth = 10;
                    ctx.beginPath();
                    ctx.arc(150, 90, 75, Math.PI, Math.PI + Math.PI/6);
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.arc(150, 90, 75, -Math.PI/6, 0);
                    ctx.stroke();

                    // Warning zone (Yellow)
                    ctx.strokeStyle = '#f59e0b';
                    ctx.beginPath();
                    ctx.arc(150, 90, 75, Math.PI + Math.PI/6, Math.PI + Math.PI/3);
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.arc(150, 90, 75, -Math.PI/3, -Math.PI/6);
                    ctx.stroke();

                    // Stable zone (Green)
                    ctx.strokeStyle = '#10b981';
                    ctx.beginPath();
                    ctx.arc(150, 90, 75, Math.PI + Math.PI/3, -Math.PI/3);
                    ctx.stroke();
                    dialCanvas.refresh();
                }

                if (!this.textures.exists('needle')) {
                    const needleCanvas = this.textures.createCanvas('needle', 10, 80);
                    const nCtx = needleCanvas.context;
                    nCtx.fillStyle = '#f8fafc';
                    nCtx.beginPath();
                    nCtx.moveTo(5, 0);
                    nCtx.lineTo(10, 80);
                    nCtx.lineTo(0, 80);
                    nCtx.closePath();
                    nCtx.fill();
                    needleCanvas.refresh();
                }
            }

            create() {
                const width = this.scale.width;
                const height = this.scale.height;

                // Reset variables
                timer = 15;
                frequency = 50.0;
                batteryStorage = 50;
                batteryMode = 0;
                solarActive = true;
                windActive = true;
                isCollapsed = false;
                isVictorious = false;

                // Background
                this.add.graphics()
                    .fillGradientStyle(0x0f172a, 0x0f172a, 0x1e293b, 0x1e293b, 1)
                    .fillRect(0, 0, width, height);

                this.add.grid(width / 2, height / 2, width, height, 30, 30, 0, 0, 0xffffff, 0.03);

                // Title
                this.add.text(isPortrait ? 15 : 20, 16, "BALANÇ ENERGÈTIC", {
                    fontFamily: 'Outfit, sans-serif',
                    fontSize: isPortrait ? '16px' : '18px',
                    fontWeight: 'bold',
                    color: '#3b82f6'
                });

                // Close Button
                const closeBtn = this.add.text(width - (isPortrait ? 30 : 40), 14, '✕', {
                    fontSize: isPortrait ? '20px' : '24px',
                    color: '#94a3b8',
                    cursor: 'pointer'
                }).setInteractive();
                closeBtn.on('pointerdown', () => onCloseRef.current?.());

                // Help instructions
                this.add.text(width / 2, isPortrait ? 52 : 60, "Mantingues la freqüència a 50.0 Hz amb la producció i bateria!", {
                    fontFamily: 'Inter, sans-serif',
                    fontSize: isPortrait ? '12px' : '13px',
                    color: '#94a3b8',
                    align: 'center',
                    wordWrap: { width: isPortrait ? 330 : 700 }
                }).setOrigin(0.5);

                // Timer Display
                timerText = this.add.text(width / 2, isPortrait ? 90 : 105, `Temps d'Estabilitat: ${timer}s`, {
                    fontFamily: 'Outfit, sans-serif',
                    fontSize: isPortrait ? '18px' : '22px',
                    color: '#ffffff',
                    fontWeight: 'bold'
                }).setOrigin(0.5);

                // Power Dial & Needle
                const dialY = isPortrait ? 175 : 230;
                this.add.image(width / 2, dialY, 'dial');
                balancePointer = this.add.image(width / 2, dialY + 80, 'needle');
                balancePointer.setOrigin(0.5, 1);

                freqText = this.add.text(width / 2, dialY + 105, "50.00 Hz", {
                    fontFamily: 'monospace',
                    fontSize: isPortrait ? '26px' : '30px',
                    color: '#10b981',
                    fontWeight: 'bold'
                }).setOrigin(0.5);

                statusText = this.add.text(width / 2, dialY + 135, "ESTABLE", {
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '13px',
                    fontWeight: 'bold',
                    color: '#10b981'
                }).setOrigin(0.5);

                // Controls Layout
                if (isPortrait) {
                    // Mobile Portrait 2x2 Grid
                    const cardW = 155;
                    const cardH = 92;
                    const col1X = 95;
                    const col2X = 265;
                    const row1Y = 385;
                    const row2Y = 495;

                    // 1. Solar
                    const solarP = this.add.graphics();
                    solarP.fillStyle(0x1e293b, 0.9).lineStyle(1, 0xf59e0b).fillRoundedRect(col1X - cardW/2, row1Y - cardH/2, cardW, cardH, 8).strokeRoundedRect(col1X - cardW/2, row1Y - cardH/2, cardW, cardH, 8);
                    this.add.text(col1X, row1Y - 26, "SOLAR", { fontSize: '13px', color: '#f59e0b', fontWeight: 'bold' }).setOrigin(0.5);
                    solarText = this.add.text(col1X, row1Y - 4, `${solarProd} kW`, { fontSize: '16px', color: '#ffffff', fontWeight: 'bold' }).setOrigin(0.5);
                    const solarBtn = this.add.text(col1X, row1Y + 24, "ON / OFF", { fontSize: '12px', color: '#ffffff', backgroundColor: '#d97706', padding: { x: 12, y: 5 } }).setOrigin(0.5).setInteractive({ useHandCursor: true });
                    solarBtn.on('pointerdown', () => {
                        if (isCollapsed || isVictorious) return;
                        SoundManager.playSFX('click');
                        solarActive = !solarActive;
                        solarBtn.setBackgroundColor(solarActive ? '#d97706' : '#64748b');
                    });

                    // 2. Wind
                    const windP = this.add.graphics();
                    windP.fillStyle(0x1e293b, 0.9).lineStyle(1, 0x3b82f6).fillRoundedRect(col2X - cardW/2, row1Y - cardH/2, cardW, cardH, 8).strokeRoundedRect(col2X - cardW/2, row1Y - cardH/2, cardW, cardH, 8);
                    this.add.text(col2X, row1Y - 26, "TURBINA", { fontSize: '13px', color: '#3b82f6', fontWeight: 'bold' }).setOrigin(0.5);
                    windText = this.add.text(col2X, row1Y - 4, `${windProd} kW`, { fontSize: '16px', color: '#ffffff', fontWeight: 'bold' }).setOrigin(0.5);
                    const windBtn = this.add.text(col2X, row1Y + 24, "ON / OFF", { fontSize: '12px', color: '#ffffff', backgroundColor: '#2563eb', padding: { x: 12, y: 5 } }).setOrigin(0.5).setInteractive({ useHandCursor: true });
                    windBtn.on('pointerdown', () => {
                        if (isCollapsed || isVictorious) return;
                        SoundManager.playSFX('click');
                        windActive = !windActive;
                        windBtn.setBackgroundColor(windActive ? '#2563eb' : '#64748b');
                    });

                    // 3. Battery
                    const batP = this.add.graphics();
                    batP.fillStyle(0x1e293b, 0.9).lineStyle(1, 0x10b981).fillRoundedRect(col1X - cardW/2, row2Y - cardH/2, cardW, cardH, 8).strokeRoundedRect(col1X - cardW/2, row2Y - cardH/2, cardW, cardH, 8);
                    this.add.text(col1X, row2Y - 26, "BATERIA", { fontSize: '13px', color: '#10b981', fontWeight: 'bold' }).setOrigin(0.5);
                    batteryText = this.add.text(col1X, row2Y - 4, `${Math.round(batteryStorage)}% (Espera)`, { fontSize: '13px', color: '#ffffff' }).setOrigin(0.5);
                    const batModeBtn = this.add.text(col1X, row2Y + 24, "EN ESPERA", { fontSize: '11px', color: '#ffffff', backgroundColor: '#059669', padding: { x: 8, y: 5 } }).setOrigin(0.5).setInteractive({ useHandCursor: true });
                    batModeBtn.on('pointerdown', () => {
                        if (isCollapsed || isVictorious) return;
                        SoundManager.playSFX('click');
                        if (batteryMode === 0) {
                            batteryMode = -1;
                            batModeBtn.setText("DESCÀRREGA (+)").setBackgroundColor('#ea580c');
                        } else if (batteryMode === -1) {
                            batteryMode = 1;
                            batModeBtn.setText("CÀRREGA (-)").setBackgroundColor('#2563eb');
                        } else {
                            batteryMode = 0;
                            batModeBtn.setText("EN ESPERA").setBackgroundColor('#059669');
                        }
                    });

                    // 4. Demand
                    const demP = this.add.graphics();
                    demP.fillStyle(0x1e293b, 0.9).lineStyle(1, 0xef4444).fillRoundedRect(col2X - cardW/2, row2Y - cardH/2, cardW, cardH, 8).strokeRoundedRect(col2X - cardW/2, row2Y - cardH/2, cardW, cardH, 8);
                    this.add.text(col2X, row2Y - 26, "CONSUM", { fontSize: '13px', color: '#ef4444', fontWeight: 'bold' }).setOrigin(0.5);
                    demandText = this.add.text(col2X, row2Y - 2, `${demand} kW`, { fontSize: '18px', color: '#ef4444', fontWeight: 'bold' }).setOrigin(0.5);
                    this.add.text(col2X, row2Y + 24, "VARIABLE", { fontSize: '11px', color: '#94a3b8' }).setOrigin(0.5);

                } else {
                    // Desktop Horizontal 4 Cards
                    const panelY = 460;

                    // Solar
                    const solarPanel = this.add.graphics();
                    solarPanel.fillStyle(0x1e293b, 0.9).lineStyle(1, 0xf59e0b).fillRoundedRect(50, panelY, 150, 95, 8).strokeRoundedRect(50, panelY, 150, 95, 8);
                    this.add.text(125, panelY + 18, "SOLAR", { fontSize: '14px', color: '#f59e0b', fontWeight: 'bold' }).setOrigin(0.5);
                    solarText = this.add.text(125, panelY + 44, `${solarProd} kW`, { fontSize: '18px', color: '#ffffff', fontWeight: 'bold' }).setOrigin(0.5);
                    const solarBtn = this.add.text(125, panelY + 74, "ON / OFF", { fontSize: '12px', color: '#ffffff', backgroundColor: '#d97706', padding: { x: 12, y: 5 } }).setOrigin(0.5).setInteractive({ useHandCursor: true });
                    solarBtn.on('pointerdown', () => {
                        if (isCollapsed || isVictorious) return;
                        SoundManager.playSFX('click');
                        solarActive = !solarActive;
                        solarBtn.setBackgroundColor(solarActive ? '#d97706' : '#64748b');
                    });

                    // Wind
                    const windPanel = this.add.graphics();
                    windPanel.fillStyle(0x1e293b, 0.9).lineStyle(1, 0x3b82f6).fillRoundedRect(220, panelY, 150, 95, 8).strokeRoundedRect(220, panelY, 150, 95, 8);
                    this.add.text(295, panelY + 18, "TURBINA", { fontSize: '14px', color: '#3b82f6', fontWeight: 'bold' }).setOrigin(0.5);
                    windText = this.add.text(295, panelY + 44, `${windProd} kW`, { fontSize: '18px', color: '#ffffff', fontWeight: 'bold' }).setOrigin(0.5);
                    const windBtn = this.add.text(295, panelY + 74, "ON / OFF", { fontSize: '12px', color: '#ffffff', backgroundColor: '#2563eb', padding: { x: 12, y: 5 } }).setOrigin(0.5).setInteractive({ useHandCursor: true });
                    windBtn.on('pointerdown', () => {
                        if (isCollapsed || isVictorious) return;
                        SoundManager.playSFX('click');
                        windActive = !windActive;
                        windBtn.setBackgroundColor(windActive ? '#2563eb' : '#64748b');
                    });

                    // Battery
                    const batteryPanel = this.add.graphics();
                    batteryPanel.fillStyle(0x1e293b, 0.9).lineStyle(1, 0x10b981).fillRoundedRect(390, panelY, 170, 95, 8).strokeRoundedRect(390, panelY, 170, 95, 8);
                    this.add.text(475, panelY + 18, "BATERIA", { fontSize: '14px', color: '#10b981', fontWeight: 'bold' }).setOrigin(0.5);
                    batteryText = this.add.text(475, panelY + 44, `${Math.round(batteryStorage)}% (En espera)`, { fontSize: '15px', color: '#ffffff' }).setOrigin(0.5);
                    const batModeBtn = this.add.text(475, panelY + 74, "MODE: EN ESPERA", { fontSize: '11px', color: '#ffffff', backgroundColor: '#059669', padding: { x: 10, y: 5 } }).setOrigin(0.5).setInteractive({ useHandCursor: true });
                    batModeBtn.on('pointerdown', () => {
                        if (isCollapsed || isVictorious) return;
                        SoundManager.playSFX('click');
                        if (batteryMode === 0) {
                            batteryMode = -1;
                            batModeBtn.setText("DESCÀRREGA (+)").setBackgroundColor('#ea580c');
                        } else if (batteryMode === -1) {
                            batteryMode = 1;
                            batModeBtn.setText("CÀRREGA (-)").setBackgroundColor('#2563eb');
                        } else {
                            batteryMode = 0;
                            batModeBtn.setText("MODE: EN ESPERA").setBackgroundColor('#059669');
                        }
                    });

                    // Demand
                    const demandPanel = this.add.graphics();
                    demandPanel.fillStyle(0x1e293b, 0.9).lineStyle(1, 0xef4444).fillRoundedRect(580, panelY, 170, 95, 8).strokeRoundedRect(580, panelY, 170, 95, 8);
                    this.add.text(665, panelY + 18, "CONSUM", { fontSize: '14px', color: '#ef4444', fontWeight: 'bold' }).setOrigin(0.5);
                    demandText = this.add.text(665, panelY + 46, `${demand} kW`, { fontSize: '20px', color: '#ef4444', fontWeight: 'bold' }).setOrigin(0.5);
                }

                // Core Physics Loop
                simEvent = this.time.addEvent({
                    delay: 200,
                    loop: true,
                    callback: this.updatePhysicsSim,
                    callbackScope: this
                });

                // 1-second Countdown Loop
                timerEvent = this.time.addEvent({
                    delay: 1000,
                    loop: true,
                    callback: this.tickTimer,
                    callbackScope: this
                });
            }

            updatePhysicsSim() {
                if (isCollapsed || isVictorious) return;

                if (solarActive) {
                    solarProd = 40 + Math.sin(this.time.now / 3000) * 12 + Math.random() * 4;
                } else {
                    solarProd = 0;
                }

                if (windActive) {
                    windProd = 28 + Math.cos(this.time.now / 5000) * 10 + Math.random() * 4;
                } else {
                    windProd = 0;
                }

                demand = 88 + Math.sin(this.time.now / 7000) * 35 + Math.random() * 6;

                let batteryExchange = 0;
                if (batteryMode === 1 && batteryStorage < 100) {
                    batteryExchange = -28;
                    batteryStorage += 0.22;
                } else if (batteryMode === -1 && batteryStorage > 0) {
                    batteryExchange = 38;
                    batteryStorage -= 0.28;
                }

                if (batteryStorage > 100) batteryStorage = 100;
                if (batteryStorage < 0) {
                    batteryStorage = 0;
                    batteryMode = 0;
                }

                const totalGen = solarProd + windProd + batteryExchange;
                const balance = totalGen - demand;

                // Moderate frequency drift
                frequency += balance * 0.0035;
                frequency = frequency * 0.98 + 50.0 * 0.02;

                if (solarText) solarText.setText(`${Math.round(solarProd)} kW`);
                if (windText) windText.setText(`${Math.round(windProd)} kW`);
                if (demandText) demandText.setText(`${Math.round(demand)} kW`);

                let batState = "En espera";
                if (batteryMode === 1) batState = "Càrrega";
                if (batteryMode === -1) batState = "Descàrrega";
                if (batteryText) batteryText.setText(`${Math.round(batteryStorage)}% (${batState})`);

                if (freqText) freqText.setText(`${frequency.toFixed(2)} Hz`);

                const freqOffset = frequency - 50.0;
                const angle = Phaser.Math.Clamp(freqOffset * 45, -90, 90);
                if (balancePointer) balancePointer.setAngle(angle);

                if (Math.abs(freqOffset) < 0.2) {
                    freqText.setColor('#10b981');
                    statusText.setText("XARXA ESTABLE").setColor('#10b981');
                } else if (Math.abs(freqOffset) < 0.5) {
                    freqText.setColor('#f59e0b');
                    statusText.setText("DESVIACIÓ MODERADA").setColor('#f59e0b');
                } else {
                    freqText.setColor('#ef4444');
                    statusText.setText("PERILL DE COL·LAPS!").setColor('#ef4444');
                }

                if (frequency < 47.8 || frequency > 52.2) {
                    this.triggerCollapse();
                }
            }

            tickTimer() {
                if (isCollapsed || isVictorious) return;

                const freqOffset = Math.abs(frequency - 50.0);
                if (freqOffset <= 0.4) {
                    timer--;
                    if (timer < 0) timer = 0;
                    if (timerText) timerText.setText(`Temps d'Estabilitat: ${timer}s`);

                    if (timer === 0) {
                        this.triggerVictory();
                    }
                } else {
                    if (timerText) timerText.setText("XARXA INESTABLE (COMPTA PARAT)");
                }
            }

            triggerVictory() {
                isVictorious = true;
                if (simEvent) simEvent.remove();
                if (timerEvent) timerEvent.remove();

                SoundManager.playSFX('success');

                const alertY = isPortrait ? 300 : 200;
                this.add.text(this.scale.width / 2, alertY, 'XARXA ESTABILITZADA! 🌟', {
                    fontFamily: 'Outfit, sans-serif',
                    fontSize: isPortrait ? '22px' : '36px',
                    color: '#10b981',
                    fontWeight: 'bold'
                }).setOrigin(0.5);

                this.time.delayedCall(1200, () => onCompleteRef.current?.());
            }

            triggerCollapse() {
                isCollapsed = true;
                if (simEvent) simEvent.remove();
                if (timerEvent) timerEvent.remove();

                SoundManager.playSFX('defeat');
                this.cameras.main.shake(300, 0.015);

                const alertY = isPortrait ? 300 : 200;
                this.add.text(this.scale.width / 2, alertY, 'SISTEMA COL·LAPSAT!', {
                    fontFamily: 'Outfit, sans-serif',
                    fontSize: isPortrait ? '24px' : '36px',
                    color: '#ef4444',
                    fontWeight: 'bold'
                }).setOrigin(0.5);

                const retry = this.add.text(this.scale.width / 2, alertY + 55, 'TORNAR A INTENTAR', {
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '16px',
                    backgroundColor: '#ef4444',
                    padding: { x: 18, y: 10 },
                    color: '#ffffff'
                }).setOrigin(0.5).setInteractive({ useHandCursor: true });

                retry.on('pointerdown', () => {
                    retry.destroy();
                    this.scene.restart();
                });
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
                    gravity: { y: 0 },
                    debug: false
                }
            },
            scene: BalanceScene
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
                maxHeight: '640px',
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
                        width: 32,
                        height: 32,
                        fontSize: 18,
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

export default BalanceEnergetic;
