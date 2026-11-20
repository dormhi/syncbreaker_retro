/* =========================================
   GameManager.js — Main Game Manager
   Modern Glassmorphism UI, Ambient Bokeh & State Coordination
   ========================================= */

class GameManager {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;

        // Subsystems
        this.state = new StateManager();
        this.energy = new EnergySystem();
        this.ui = new UIManager(ctx, canvas);
        this.lockpick = new LockpickSystem();
        this.levels = new LevelManager();
        this.levels.setUI(this.ui);

        // Background effects — Glass depth bokeh, particles & data rain
        this.bgTime = 0;
        this.bgParticles = this._createBgParticles(40);
        this.dataRain = this._createDataRain(22);
        this.bokehOrbs = [
            { baseX: 220, baseY: 180, rx: 90, ry: 55, speed: 0.25, radius: 220, color: 'rgba(56, 189, 248, 0.11)' },
            { baseX: 730, baseY: 220, rx: 75, ry: 70, speed: 0.19, radius: 250, color: 'rgba(59, 130, 246, 0.10)' },
            { baseX: 490, baseY: 490, rx: 110, ry: 50, speed: 0.22, radius: 230, color: 'rgba(168, 85, 247, 0.09)' }
        ];

        // Register state handlers
        this._registerStates();

        // Input
        this._setupInput();
    }

    // ── Game Loop ──

    update(dt) {
        this.energy.update(dt);
        this.bgTime += dt;
        this._updateBgParticles(dt);
        this._updateDataRain(dt);
        this.ui.update(dt);
        this.state.update(dt);
    }

    render(ctx) {
        const W = this.canvas.width;
        const H = this.canvas.height;

        ctx.clearRect(0, 0, W, H);
        this._renderBackground(ctx, W, H);
        this.state.render(ctx);
    }

    // ════════════════════════════════════════
    //  STATE HANDLER REGISTRATIONS
    // ════════════════════════════════════════

    _registerStates() {
        const S = this.state.STATES;

        // ── MENU ──
        this.state.register(S.MENU, {
            enter: () => {
                this.ui.clearButtons();
                Sound.startAmbient();
                const cx = this.canvas.width / 2;
                this.ui.addButton('start', '▶  START MISSION', cx, 528, 260, 52,
                    () => this.state.change(S.HUB),
                    { color: '#38bdf8' }
                );
            },
            render: (ctx) => {
                const W = this.canvas.width;
                const H = this.canvas.height;
                const cx = W / 2;

                // Hero Title with neon glow
                ctx.save();
                ctx.shadowColor = 'rgba(56, 189, 248, 0.65)';
                ctx.shadowBlur = 24;
                ctx.fillStyle = '#f8fafc';
                ctx.font = '900 42px Orbitron';
                ctx.textAlign = 'center';
                ctx.fillText('SYNCBREAKER', cx, 66);
                ctx.restore();

                // Subtitle neon capsule
                this.ui.drawNeonPill(
                    ctx,
                    cx - 165,
                    84,
                    330,
                    24,
                    '#ef4444',
                    '⚠ CYBER DEFENSE PROTOCOL // v2.0',
                    { font: '700 11px Orbitron', glowBlur: 12, textColor: '#fca5a5' }
                );

                // Frosted Glass Terminal Card
                const panelW = 660;
                const panelH = 338;
                const panelX = cx - panelW / 2;
                const panelY = 132;

                this.ui.drawGlassPanel(ctx, panelX, panelY, panelW, panelH, {
                    radius: 18,
                    accentColor: '#38bdf8',
                    accentAlpha: 0.1,
                    borderColor: 'rgba(255, 255, 255, 0.14)'
                });

                // Glass Header Bar
                ctx.save();
                Utils.roundRect(ctx, panelX + 1, panelY + 1, panelW - 2, 38, 17);
                ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
                ctx.fill();

                // Three glowing status dots
                const dotColors = ['#ef4444', '#f59e0b', '#22c55e'];
                dotColors.forEach((c, idx) => {
                    ctx.save();
                    ctx.shadowColor = c;
                    ctx.shadowBlur = 8;
                    ctx.fillStyle = c;
                    ctx.beginPath();
                    ctx.arc(panelX + 24 + idx * 16, panelY + 20, 4.5, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                });

                ctx.fillStyle = '#94a3b8';
                ctx.font = '700 11px Orbitron';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';
                ctx.fillText('SYSTEM DIAGNOSTIC // ACTIVE THREAT', panelX + 78, panelY + 20);

                // Divider line
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(panelX + 18, panelY + 40);
                ctx.lineTo(panelX + panelW - 18, panelY + 40);
                ctx.stroke();
                ctx.restore();

                // Mission Brief Cards inside terminal
                const rows = [
                    { tag: 'ALERT', color: '#ef4444', text: 'Your network is under active cyber attack. Malicious payloads detected.' },
                    { tag: 'TIMING', color: '#38bdf8', text: 'Strike [SPACE] or tap when the light blade aligns inside the neon zone.' },
                    { tag: 'BYPASS', color: '#f59e0b', text: 'Use Code Breaker (↑↓←→ / Swipe) to crack locked nodes or recover.' },
                    { tag: 'ENERGY', color: '#22c55e', text: 'Core charges regenerate over time — purge every node to unlock Endless.' }
                ];

                let rowY = panelY + 60;
                for (const row of rows) {
                    this.ui.drawGlassPanel(ctx, panelX + 22, rowY, panelW - 44, 52, {
                        radius: 12,
                        topBg: 'rgba(15, 23, 42, 0.55)',
                        bottomBg: 'rgba(10, 15, 28, 0.72)',
                        accentColor: row.color,
                        accentAlpha: 0.1,
                        borderColor: 'rgba(255, 255, 255, 0.08)'
                    });

                    this.ui.drawNeonPill(ctx, panelX + 34, rowY + 14, 72, 24, row.color, row.tag, {
                        font: '700 10px Orbitron',
                        glowBlur: 10
                    });

                    ctx.fillStyle = '#e2e8f0';
                    ctx.font = '500 14px Rajdhani';
                    ctx.textAlign = 'left';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(row.text, panelX + 120, rowY + 26);

                    rowY += 64;
                }

                // Start Button
                this.ui.renderButtons();

                // Footer version
                ctx.fillStyle = 'rgba(148, 163, 184, 0.45)';
                ctx.font = '500 12px Rajdhani';
                ctx.textAlign = 'center';
                ctx.fillText('v2.0 Glassmorphic Physics Edition — Computer Graphics Final Project', cx, H - 18);
            },
            exit: () => this.ui.clearButtons(),
            onKey: (e) => {
                if (e.code === 'Space' || e.code === 'Enter') this.state.change(S.HUB);
            }
        });

        // ── HUB (Level Selection) ──
        this.state.register(S.HUB, {
            enter: () => {
                this.ui.clearButtons();
                Sound.startAmbient();
                this._buildHubButtons();
            },
            render: (ctx) => {
                const W = this.canvas.width;
                const H = this.canvas.height;

                // Top-center glass header pill
                this.ui.drawGlassPanel(ctx, W / 2 - 200, 14, 400, 52, {
                    radius: 16,
                    accentColor: '#38bdf8',
                    accentAlpha: 0.12,
                    borderColor: 'rgba(56, 189, 248, 0.3)'
                });
                ctx.fillStyle = '#f8fafc';
                ctx.font = '700 17px Orbitron';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('INFECTED NODES', W / 2, 32);

                ctx.fillStyle = '#94a3b8';
                ctx.font = '500 12px Rajdhani';
                ctx.fillText('NETWORK TOPOLOGY // SELECT NODE TO PURGE', W / 2, 51);

                // Energy Core HUD
                this.ui.renderEnergyBar({
                    current: this.energy.currentEnergy,
                    max: this.energy.maxEnergy,
                    nextRegenIn: this.energy.getTimeToNextRegen()
                });

                // Glowing fiber-optic connections
                this._renderHubConnections(ctx);

                // Node Cards & Action Pills
                this.ui.renderButtons();

                // Footer glass hint pill
                this.ui.drawGlassPanel(ctx, W / 2 - 210, H - 52, 420, 32, {
                    radius: 16,
                    borderColor: 'rgba(255, 255, 255, 0.1)'
                });
                ctx.fillStyle = '#94a3b8';
                ctx.font = '500 12px Rajdhani';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('🔒 Use Code Breaker to bypass locked nodes (2 Energy)', W / 2, H - 36);
            },
            exit: () => this.ui.clearButtons(),
            onKey: (e) => {
                if (e.code === 'Escape') this.state.change(S.MENU);
            }
        });

        // ── LEVEL (Gameplay) ──
        this.state.register(S.LEVEL, {
            enter: () => { this.ui.clearButtons(); Sound.stopAmbient(); },
            update: (dt) => {
                this.levels.update(dt);

                if (this.levels.levelComplete === true) {
                    this.levels.levelComplete = 'handled';
                    setTimeout(() => this.state.change(S.HUB), 1500);
                }

                if (this.levels.levelFailed === true) {
                    this.levels.levelFailed = 'handled';
                    this.state.change(S.GAME_OVER, {
                        levelIndex: this.levels.currentLevelIndex,
                        score: this.levels.score,
                        usedRevive: this.levels.usedRevive
                    });
                }
            },
            render: (ctx) => {
                const W = this.canvas.width;
                const H = this.canvas.height;

                this.levels.render(ctx, W, H, this.ui);
                this.ui.renderScore(this.levels.score, this.levels.combo);
                this.ui.renderEnergyBar({
                    current: this.energy.currentEnergy,
                    max: this.energy.maxEnergy,
                    nextRegenIn: this.energy.getTimeToNextRegen()
                });

                // Frosted Glass Level Complete Overlay
                if (this.levels.levelComplete) {
                    ctx.save();
                    ctx.fillStyle = 'rgba(4, 7, 17, 0.55)';
                    ctx.fillRect(0, 0, W, H);

                    const mw = 400;
                    const mh = 150;
                    this.ui.drawGlassPanel(ctx, W / 2 - mw / 2, H / 2 - mh / 2, mw, mh, {
                        radius: 20,
                        accentColor: '#22c55e',
                        accentAlpha: 0.22,
                        borderColor: 'rgba(34, 197, 94, 0.65)',
                        glowColor: 'rgba(34, 197, 94, 0.45)',
                        glowBlur: 28
                    });

                    ctx.shadowColor = '#22c55e';
                    ctx.shadowBlur = 16;
                    ctx.fillStyle = '#f8fafc';
                    ctx.font = '900 28px Orbitron';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('NODE CLEANED!', W / 2, H / 2 - 24);

                    ctx.shadowBlur = 0;
                    this.ui.drawNeonPill(
                        ctx,
                        W / 2 - 140,
                        H / 2 + 12,
                        280,
                        32,
                        '#22c55e',
                        `SCORE: ${this.levels.score}  •  MAX COMBO: x${this.levels.maxCombo}`,
                        { font: '700 12px Orbitron', textColor: '#86efac' }
                    );
                    ctx.restore();
                }
            },
            exit: () => this.ui.clearButtons(),
            onKey: (e) => {
                if (e.code === 'Space') this.levels.hit();
                if (e.code === 'Escape') this.state.change(S.HUB);
            }
        });

        // ── LOCKPICK ──
        this.state.register(S.LOCKPICK, {
            enter: (context) => {
                this.ui.clearButtons();
                Sound.stopAmbient();
                const lCtx = context || {};
                this._lockpickReason = lCtx.reason || 'shortcut';
                this._lockpickLevelIndex = lCtx.levelIndex;
                this._lockpickScore = lCtx.score || 0;
                this._lockpickEndlessCtx = {
                    score: lCtx.endlessScore || 0,
                    wave: lCtx.endlessWave || 1,
                    maxCombo: lCtx.endlessMaxCombo || 0,
                    hitCount: lCtx.endlessHitCount || 0
                };

                const diff = lCtx.difficulty || 1;
                this.lockpick.start(diff, (success) => {
                    if (success) {
                        if (this._lockpickReason === 'shortcut') {
                            if (this._lockpickLevelIndex !== undefined) {
                                this.levels.levels[this._lockpickLevelIndex].unlocked = true;
                                this.levels._saveProgress();
                            }
                            this.state.change(S.HUB);
                        } else if (this._lockpickReason === 'revive') {
                            this.levels.lives = 1;
                            this.levels.levelFailed = false;
                            this.levels.usedRevive = true;
                            this.state.change(S.LEVEL);
                        } else if (this._lockpickReason === 'endless_revive') {
                            this.levels.lives = 1;
                            this.levels.levelFailed = false;
                            this.state.change(S.ENDLESS);
                        }
                    } else {
                        if (this._lockpickReason === 'revive') {
                            this.state.change(S.GAME_OVER, {
                                levelIndex: this._lockpickLevelIndex,
                                score: this._lockpickScore,
                                noRevive: true
                            });
                        } else if (this._lockpickReason === 'endless_revive') {
                            this.state.change(S.ENDLESS_OVER, {
                                ...this._lockpickEndlessCtx,
                                noRevive: true
                            });
                        } else {
                            this.state.change(S.HUB);
                        }
                    }
                });
            },
            update: (dt) => {
                this.lockpick.update(dt);
            },
            render: (ctx) => {
                const W = this.canvas.width;
                const H = this.canvas.height;

                const isRevive = this._lockpickReason === 'revive' || this._lockpickReason === 'endless_revive';
                const title = isRevive ? 'RECOVERY PROTOCOL' : 'CODE BREAKER';
                const subtitle = isRevive
                    ? 'Crack the radial cipher to restore your link'
                    : 'Align the scanner and press arrow keys / swipe';

                this.ui.drawGlassPanel(ctx, W / 2 - 200, 14, 400, 56, {
                    radius: 16,
                    accentColor: '#f59e0b',
                    accentAlpha: 0.14,
                    borderColor: 'rgba(245, 158, 11, 0.35)'
                });

                ctx.fillStyle = '#fbbf24';
                ctx.font = '700 18px Orbitron';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(title, W / 2, 34);

                ctx.fillStyle = '#94a3b8';
                ctx.font = '500 12px Rajdhani';
                ctx.fillText(subtitle, W / 2, 54);

                this.lockpick.render(ctx, W / 2, H / 2 + 24, this.ui);

                this.ui.renderEnergyBar({
                    current: this.energy.currentEnergy,
                    max: this.energy.maxEnergy,
                    nextRegenIn: this.energy.getTimeToNextRegen()
                });
            },
            exit: () => this.ui.clearButtons(),
            onKey: (e) => {
                this.lockpick.handleKey(e.code);
            }
        });

        // ── GAME OVER ──
        this.state.register(S.GAME_OVER, {
            enter: (context) => {
                this.ui.clearButtons();
                const cx = this.canvas.width / 2;
                const cy = this.canvas.height / 2;
                const lCtx = context || {};

                this._goScore = lCtx.score || 0;
                this._goLevelIndex = lCtx.levelIndex;
                this._noRevive = lCtx.noRevive || false;
                this._usedRevive = lCtx.usedRevive || false;

                const canRevive = !this._noRevive && !this._usedRevive && this.energy.canAfford('REVIVE');
                let btnY = canRevive ? cy + 20 : cy + 44;

                if (canRevive) {
                    const level = this.levels.levels[this._goLevelIndex];
                    this.ui.addButton('revive', '🔄 RECOVERY PROTOCOL (1⚡)', cx, btnY, 290, 44,
                        () => {
                            if (this.energy.spend('REVIVE')) {
                                this.state.change(S.LOCKPICK, {
                                    reason: 'revive',
                                    difficulty: level ? level.lockpickDiff : 1,
                                    levelIndex: this._goLevelIndex,
                                    score: this._goScore
                                });
                            }
                        },
                        { color: '#f59e0b' }
                    );
                    btnY += 56;
                }

                this.ui.addButton('retry', '↻ RETRY NODE', cx, btnY, 220, 42,
                    () => {
                        this.levels.startLevel(this._goLevelIndex);
                        this.state.change(S.LEVEL);
                    },
                    { color: '#38bdf8' }
                );

                this.ui.addButton('hub', '← NODE SELECT', cx, btnY + 52, 220, 40,
                    () => this.state.change(S.HUB),
                    { color: '#94a3b8' }
                );
            },
            render: (ctx) => {
                const W = this.canvas.width;
                const H = this.canvas.height;
                const cx = W / 2;
                const cy = H / 2;

                const mw = 460;
                const mh = 370;
                this.ui.drawGlassPanel(ctx, cx - mw / 2, cy - mh / 2 + 10, mw, mh, {
                    radius: 22,
                    accentColor: '#ef4444',
                    accentAlpha: 0.16,
                    borderColor: 'rgba(239, 68, 68, 0.4)',
                    glowColor: 'rgba(239, 68, 68, 0.25)',
                    glowBlur: 26
                });

                ctx.save();
                ctx.shadowColor = '#ef4444';
                ctx.shadowBlur = 16;
                ctx.fillStyle = '#f87171';
                ctx.font = '900 26px Orbitron';
                ctx.textAlign = 'center';
                ctx.fillText('OPERATION FAILED', cx, cy - 122);
                ctx.restore();

                // Stat summary glass box
                this.ui.drawGlassPanel(ctx, cx - 150, cy - 95, 300, 62, {
                    radius: 14,
                    borderColor: 'rgba(255, 255, 255, 0.1)'
                });
                ctx.fillStyle = '#94a3b8';
                ctx.font = '700 10px Orbitron';
                ctx.textAlign = 'center';
                ctx.fillText('FINAL SCORE', cx, cy - 75);
                ctx.fillStyle = '#f8fafc';
                ctx.font = '700 24px Orbitron';
                ctx.fillText(this._goScore.toString(), cx, cy - 48);

                if (this._noRevive) {
                    ctx.fillStyle = '#f87171';
                    ctx.font = '600 13px Rajdhani';
                    ctx.fillText('Recovery protocol failed', cx, cy - 12);
                } else if (this._usedRevive) {
                    ctx.fillStyle = '#fbbf24';
                    ctx.font = '600 13px Rajdhani';
                    ctx.fillText('Recovery already used on this node', cx, cy - 12);
                }

                this.ui.renderButtons();
            },
            exit: () => this.ui.clearButtons(),
            onKey: (e) => {
                if (e.code === 'Escape') this.state.change(S.HUB);
            }
        });

        // ── ENDLESS MODE ──
        this.state.register(S.ENDLESS, {
            enter: () => {
                this.ui.clearButtons();
                Sound.stopAmbient();
                if (!this.levels.endlessMode) {
                    this.levels.startEndless();
                }
            },
            update: (dt) => {
                this.levels.updateEndless(dt);

                if (this.levels.levelFailed === true) {
                    this.levels.levelFailed = 'handled';
                    this.state.change(S.ENDLESS_OVER, {
                        score: this.levels.score,
                        wave: this.levels.endlessWave,
                        maxCombo: this.levels.maxCombo,
                        hitCount: this.levels.hitCount
                    });
                }
            },
            render: (ctx) => {
                const W = this.canvas.width;
                const H = this.canvas.height;

                this.levels.renderEndless(ctx, W, H, this.ui);
                this.ui.renderScore(this.levels.score, this.levels.combo);
                this.ui.renderEnergyBar({
                    current: this.energy.currentEnergy,
                    max: this.energy.maxEnergy,
                    nextRegenIn: this.energy.getTimeToNextRegen()
                });
            },
            exit: () => this.ui.clearButtons(),
            onKey: (e) => {
                if (e.code === 'Space') this.levels.hitEndless();
                if (e.code === 'Escape') {
                    this.levels.endlessMode = false;
                    this.state.change(S.HUB);
                }
            }
        });

        // ── ENDLESS OVER ──
        this.state.register(S.ENDLESS_OVER, {
            enter: (context) => {
                this.ui.clearButtons();
                const cx = this.canvas.width / 2;
                const cy = this.canvas.height / 2;
                const lCtx = context || {};

                this._eoScore = lCtx.score || 0;
                this._eoWave = lCtx.wave || 1;
                this._eoMaxCombo = lCtx.maxCombo || 0;
                this._eoHitCount = lCtx.hitCount || 0;
                this._eoNoRevive = lCtx.noRevive || false;

                const canRevive = !this._eoNoRevive && this.energy.canAfford('REVIVE');
                let btnY = canRevive ? cy + 36 : cy + 56;

                if (canRevive) {
                    const lockDiff = Math.min(this._eoWave, 6);
                    this.ui.addButton('revive', '🔄 RECOVERY PROTOCOL (1⚡)', cx, btnY, 290, 44,
                        () => {
                            if (this.energy.spend('REVIVE')) {
                                this.state.change(S.LOCKPICK, {
                                    reason: 'endless_revive',
                                    difficulty: lockDiff,
                                    endlessScore: this._eoScore,
                                    endlessWave: this._eoWave,
                                    endlessMaxCombo: this._eoMaxCombo,
                                    endlessHitCount: this._eoHitCount
                                });
                            }
                        },
                        { color: '#f59e0b' }
                    );
                    btnY += 54;
                }

                this.ui.addButton('restart', '↻ RESTART', cx, btnY, 220, 42,
                    () => {
                        this.levels.endlessMode = false;
                        this.state.change(S.ENDLESS);
                    },
                    { color: '#38bdf8' }
                );

                this.ui.addButton('hub', '← NODE SELECT', cx, btnY + 50, 220, 40,
                    () => {
                        this.levels.endlessMode = false;
                        this.state.change(S.HUB);
                    },
                    { color: '#94a3b8' }
                );
            },
            render: (ctx) => {
                const W = this.canvas.width;
                const H = this.canvas.height;
                const cx = W / 2;
                const cy = H / 2;

                const mw = 480;
                const mh = 410;
                this.ui.drawGlassPanel(ctx, cx - mw / 2, cy - mh / 2 + 10, mw, mh, {
                    radius: 22,
                    accentColor: '#ef4444',
                    accentAlpha: 0.16,
                    borderColor: 'rgba(239, 68, 68, 0.4)',
                    glowColor: 'rgba(239, 68, 68, 0.25)',
                    glowBlur: 26
                });

                ctx.save();
                ctx.shadowColor = '#ef4444';
                ctx.shadowBlur = 16;
                ctx.fillStyle = '#f87171';
                ctx.font = '900 25px Orbitron';
                ctx.textAlign = 'center';
                ctx.fillText('DEFENSE COLLAPSED', cx, cy - 142);
                ctx.restore();

                // Main score display
                ctx.fillStyle = '#f8fafc';
                ctx.font = '700 32px Orbitron';
                ctx.textAlign = 'center';
                ctx.fillText(this._eoScore.toString(), cx, cy - 98);

                // Three mini stat glass cards
                const stats = [
                    { label: 'WAVE', value: `${this._eoWave}`, color: '#f59e0b' },
                    { label: 'HITS', value: `${this._eoHitCount}`, color: '#38bdf8' },
                    { label: 'MAX COMBO', value: `x${this._eoMaxCombo}`, color: '#22c55e' }
                ];
                const boxW = 124;
                const gap = 14;
                const startBX = cx - (boxW * 3 + gap * 2) / 2;
                stats.forEach((st, idx) => {
                    const bx = startBX + idx * (boxW + gap);
                    const by = cy - 76;
                    this.ui.drawGlassPanel(ctx, bx, by, boxW, 52, {
                        radius: 12,
                        accentColor: st.color,
                        accentAlpha: 0.12,
                        borderColor: 'rgba(255, 255, 255, 0.1)'
                    });
                    ctx.fillStyle = '#94a3b8';
                    ctx.font = '700 9px Orbitron';
                    ctx.textAlign = 'center';
                    ctx.fillText(st.label, bx + boxW / 2, by + 16);
                    ctx.fillStyle = st.color;
                    ctx.font = '700 18px Orbitron';
                    ctx.fillText(st.value, bx + boxW / 2, by + 37);
                });

                const best = this.levels._loadEndlessBest();
                if (this._eoScore >= best && best > 0) {
                    this.ui.drawNeonPill(ctx, cx - 80, cy - 14, 160, 24, '#f59e0b', '🏆 NEW RECORD!', {
                        font: '700 11px Orbitron',
                        textColor: '#fde68a'
                    });
                } else if (best > 0) {
                    ctx.fillStyle = '#94a3b8';
                    ctx.font = '600 12px Orbitron';
                    ctx.textAlign = 'center';
                    ctx.fillText(`BEST RECORD: ${best}`, cx, cy - 2);
                }

                if (this._eoNoRevive) {
                    ctx.fillStyle = '#f87171';
                    ctx.font = '500 13px Rajdhani';
                    ctx.textAlign = 'center';
                    ctx.fillText('Recovery protocol failed', cx, cy + 12);
                }

                this.ui.renderButtons();
            },
            exit: () => this.ui.clearButtons(),
            onKey: (e) => {
                if (e.code === 'Escape') this.state.change(S.HUB);
            }
        });

        const menuH = this.state._handlers[S.MENU];
        if (menuH) menuH.enter();
    }

    // ── HUB Buttons ──

    _buildHubButtons() {
        const W = this.canvas.width;
        const H = this.canvas.height;
        const levels = this.levels.levels;
        const cols = 3;
        const btnW = 220;
        const btnH = 82;
        const gapX = 24;
        const gapY = 22;
        const totalW = cols * btnW + (cols - 1) * gapX;
        const startX = (W - totalW) / 2 + btnW / 2;
        const startY = 148;

        this._hubPositions = [];

        for (let i = 0; i < levels.length; i++) {
            const level = levels[i];
            const col = i % cols;
            const row = Math.floor(i / cols);
            const x = startX + col * (btnW + gapX);
            const y = startY + row * (btnH + gapY);

            this._hubPositions.push({ x, y, w: btnW, h: btnH, level });

            if (level.unlocked) {
                const color = level.completed ? '#22c55e' : '#38bdf8';
                const badge = level.completed ? '✓ CLEANED' : '● ACTIVE';

                this.ui.addButton(`lvl${i}`, level.name, x, y, btnW, btnH,
                    () => {
                        this.levels.startLevel(i);
                        this.state.change(this.state.STATES.LEVEL);
                    },
                    {
                        color,
                        badge,
                        subtitle: level.desc,
                        bestScore: level.bestScore
                    }
                );
            } else {
                this.ui.addButton(`lvl${i}`, level.name, x, y, btnW, btnH,
                    () => {
                        if (this.energy.canAfford('SHORTCUT')) {
                            if (this.energy.spend('SHORTCUT')) {
                                this.state.change(this.state.STATES.LOCKPICK, {
                                    reason: 'shortcut',
                                    difficulty: level.lockpickDiff,
                                    levelIndex: i
                                });
                            }
                        }
                    },
                    {
                        color: '#64748b',
                        badge: '🔒 2⚡ LOCKED',
                        subtitle: level.desc
                    }
                );
            }
        }

        // Endless Mode pill
        const allDone = this.levels.isAllCompleted();
        const endlessY = 376;
        if (allDone) {
            const bestScore = this.levels._loadEndlessBest();
            const endlessSubtitle = bestScore > 0 ? `Best: ${bestScore}` : 'Unlimited wave defense';
            this.ui.addButton('endless', '∞ ENDLESS MODE', W / 2, endlessY, 280, 56,
                () => this.state.change(this.state.STATES.ENDLESS),
                { color: '#f59e0b', subtitle: endlessSubtitle }
            );
        } else {
            const remaining = this.levels.levels.filter(l => !l.completed).length;
            this.ui.addButton('endless', '🔒 ENDLESS MODE', W / 2, endlessY, 280, 56,
                () => { },
                { color: '#64748b', disabled: true, subtitle: `${remaining} nodes remaining` }
            );
        }

        // Bottom glass action pills
        this.ui.addButton('menu', '← MENU', 84, H - 36, 120, 36,
            () => this.state.change(S.MENU),
            { color: '#94a3b8' }
        );

        this.ui.addButton('reset', '🗑 RESET', W - 86, H - 36, 124, 36,
            () => {
                if (window.confirm('Are you sure you want to delete all data and start fresh?')) {
                    localStorage.removeItem('sb_progress');
                    localStorage.removeItem('sb_energy');
                    window.location.href = window.location.href;
                }
            },
            { color: '#ef4444' }
        );
    }

    _renderHubConnections(ctx) {
        if (!this._hubPositions || this._hubPositions.length < 2) return;

        ctx.save();
        for (let i = 0; i < this._hubPositions.length - 1; i++) {
            const a = this._hubPositions[i];
            const b = this._hubPositions[i + 1];
            const completed = a.level.completed;
            const active = a.level.unlocked && b.level.unlocked;

            const color = completed ? '#22c55e' : active ? '#38bdf8' : '#475569';
            const alpha = completed ? 0.55 : active ? 0.32 : 0.14;

            ctx.save();
            ctx.strokeStyle = this.ui._withAlpha(color, alpha);
            ctx.lineWidth = completed ? 2.5 : 1.5;
            if (completed || active) {
                ctx.shadowColor = color;
                ctx.shadowBlur = 10;
            }

            // Connect horizontally on same row, or smoothly step between row 0 (node 2) and row 1 (node 3)
            const sameRow = Math.abs(a.y - b.y) < 10;
            ctx.beginPath();
            if (sameRow) {
                const x1 = a.x + a.w / 2;
                const x2 = b.x - b.w / 2;
                ctx.moveTo(x1, a.y);
                ctx.lineTo(x2, b.y);
                ctx.stroke();

                // Animated traveling light pulse along active/completed conduit
                if (completed || active) {
                    const span = x2 - x1;
                    if (span > 0) {
                        const progress = ((this.bgTime * 1.1 + i * 0.35) % 1);
                        const px = x1 + span * progress;
                        ctx.fillStyle = '#ffffff';
                        ctx.beginPath();
                        ctx.arc(px, a.y, 2.5, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
            } else {
                const midY = (a.y + b.y) / 2;
                ctx.moveTo(a.x, a.y + a.h / 2);
                ctx.bezierCurveTo(a.x, midY, b.x, midY, b.x, b.y - b.h / 2);
                ctx.stroke();

                if (completed || active) {
                    const t = ((this.bgTime * 0.7 + i * 0.35) % 1);
                    const inv = 1 - t;
                    const y0 = a.y + a.h / 2;
                    const y3 = b.y - b.h / 2;
                    const px = inv * inv * inv * a.x + 3 * inv * inv * t * a.x + 3 * inv * t * t * b.x + t * t * t * b.x;
                    const py = inv * inv * inv * y0 + 3 * inv * inv * t * midY + 3 * inv * t * t * midY + t * t * t * y3;
                    ctx.fillStyle = '#ffffff';
                    ctx.beginPath();
                    ctx.arc(px, py, 2.8, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            ctx.restore();
        }
        ctx.restore();
    }

    // ── Input ──

    _setupInput() {
        const canvas = this.canvas;

        canvas.addEventListener('mousemove', (e) => {
            const rect = canvas.getBoundingClientRect();
            const x = (e.clientX - rect.left) * (canvas.width / rect.width);
            const y = (e.clientY - rect.top) * (canvas.height / rect.height);
            this.ui.updateMouse(x, y);
        });

        canvas.addEventListener('click', (e) => {
            const rect = canvas.getBoundingClientRect();
            const x = (e.clientX - rect.left) * (canvas.width / rect.width);
            const y = (e.clientY - rect.top) * (canvas.height / rect.height);
            this.ui.handleClick(x, y);
        });

        document.addEventListener('keydown', (e) => {
            if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
                e.preventDefault();
            }
            this.state.handleKey(e);
        });

        // ── MOBILE TOUCH SUPPORT ──
        let touchStartX = 0;
        let touchStartY = 0;

        canvas.addEventListener('touchstart', (e) => {
            if (e.touches.length > 0) {
                touchStartX = e.touches[0].clientX;
                touchStartY = e.touches[0].clientY;

                const rect = canvas.getBoundingClientRect();
                const x = (touchStartX - rect.left) * (canvas.width / rect.width);
                const y = (touchStartY - rect.top) * (canvas.height / rect.height);

                if (this.ui.handleClick(x, y)) {
                    e.preventDefault();
                    return;
                }

                const state = this.state.currentState;
                const S = this.state.STATES;

                if (state === S.LEVEL || state === S.ENDLESS || state === S.MENU || state === S.GAME_OVER || state === S.ENDLESS_OVER) {
                    e.preventDefault();
                    this.state.handleKey({ code: 'Space', preventDefault: () => {} });
                }
            }
        }, { passive: false });

        canvas.addEventListener('touchend', (e) => {
            if (e.changedTouches.length > 0) {
                const touchEndX = e.changedTouches[0].clientX;
                const touchEndY = e.changedTouches[0].clientY;

                const dx = touchEndX - touchStartX;
                const dy = touchEndY - touchStartY;

                if (this.state.currentState === this.state.STATES.LOCKPICK) {
                    const threshold = 30;

                    if (Math.abs(dx) > threshold || Math.abs(dy) > threshold) {
                        e.preventDefault();
                        if (Math.abs(dx) > Math.abs(dy)) {
                            if (dx > 0) this.state.handleKey({ code: 'ArrowRight', preventDefault: () => {} });
                            else this.state.handleKey({ code: 'ArrowLeft', preventDefault: () => {} });
                        } else {
                            if (dy > 0) this.state.handleKey({ code: 'ArrowDown', preventDefault: () => {} });
                            else this.state.handleKey({ code: 'ArrowUp', preventDefault: () => {} });
                        }
                    }
                }
            }
        }, { passive: false });

        canvas.style.cursor = 'pointer';
    }

    // ════════════════════════════════════════
    //  BACKGROUND EFFECTS & AMBIENT BOKEH
    // ════════════════════════════════════════

    _createBgParticles(count) {
        const particles = [];
        for (let i = 0; i < count; i++) {
            particles.push({
                x: Math.random() * 960,
                y: Math.random() * 640,
                size: Utils.randFloat(0.8, 2.2),
                speed: Utils.randFloat(5, 18),
                alpha: Utils.randFloat(0.12, 0.35),
                angle: Utils.randFloat(0, Math.PI * 2)
            });
        }
        return particles;
    }

    _createDataRain(count) {
        const drops = [];
        const chars = '01アイウエオカキクケコ⟡⟢⟣';
        for (let i = 0; i < count; i++) {
            drops.push({
                x: Utils.randFloat(0, 960),
                y: Utils.randFloat(-200, 640),
                speed: Utils.randFloat(28, 72),
                char: chars[Utils.randInt(0, chars.length - 1)],
                alpha: Utils.randFloat(0.05, 0.14),
                size: Utils.randInt(10, 14)
            });
        }
        return drops;
    }

    _updateBgParticles(dt) {
        for (const p of this.bgParticles) {
            p.x += Math.cos(p.angle) * p.speed * dt;
            p.y += Math.sin(p.angle) * p.speed * dt;
            p.angle += Utils.randFloat(-0.3, 0.3) * dt;

            if (p.x < -5) p.x = 965;
            if (p.x > 965) p.x = -5;
            if (p.y < -5) p.y = 645;
            if (p.y > 645) p.y = -5;
        }
    }

    _updateDataRain(dt) {
        const chars = '01アイウエオカキクケコ⟡⟢⟣';
        for (const d of this.dataRain) {
            d.y += d.speed * dt;
            if (d.y > 660) {
                d.y = Utils.randFloat(-60, -10);
                d.x = Utils.randFloat(0, 960);
                d.char = chars[Utils.randInt(0, chars.length - 1)];
            }
        }
    }

    _renderBackground(ctx, W, H) {
        // 1. Deep glass-cyber linear gradient
        const grad = ctx.createLinearGradient(0, 0, 0, H);
        grad.addColorStop(0, '#030712');
        grad.addColorStop(0.5, '#0a1022');
        grad.addColorStop(1, '#070b16');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);

        // 2. Ambient neon bokeh orbs (provide depth behind frosted glass panels)
        ctx.save();
        for (let i = 0; i < this.bokehOrbs.length; i++) {
            const orb = this.bokehOrbs[i];
            const ox = orb.baseX + Math.sin(this.bgTime * orb.speed + i * 2) * orb.rx;
            const oy = orb.baseY + Math.cos(this.bgTime * orb.speed * 0.8 + i) * orb.ry;
            const bGrad = ctx.createRadialGradient(ox, oy, 10, ox, oy, orb.radius);
            bGrad.addColorStop(0, orb.color);
            bGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = bGrad;
            ctx.beginPath();
            ctx.arc(ox, oy, orb.radius, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();

        // 3. Minimalist dot & crosshair coordinate grid
        ctx.save();
        const gridSize = 64;
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.05)';
        ctx.lineWidth = 0.6;
        for (let x = 0; x <= W; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, H);
            ctx.stroke();
        }
        for (let y = 0; y <= H; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(W, y);
            ctx.stroke();
        }

        // Tiny intersection dots
        ctx.fillStyle = 'rgba(56, 189, 248, 0.14)';
        for (let x = gridSize; x < W; x += gridSize) {
            for (let y = gridSize; y < H; y += gridSize) {
                ctx.fillRect(x - 0.8, y - 0.8, 1.6, 1.6);
            }
        }
        ctx.restore();

        // 4. Data rain
        ctx.save();
        for (const d of this.dataRain) {
            ctx.globalAlpha = d.alpha;
            ctx.fillStyle = '#38bdf8';
            ctx.font = d.size + 'px monospace';
            ctx.fillText(d.char, d.x, d.y);
        }
        ctx.restore();

        // 5. Floating dust particles
        ctx.save();
        for (const p of this.bgParticles) {
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = '#e2e8f0';
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }
}
