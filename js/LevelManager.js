/* =========================================
   LevelManager.js — Level Manager & Physics-Driven Timing Bar
   Fluid neon light capsule timing bar + 2D physics integration
   ========================================= */

class LevelManager {
    constructor() {
        this.levels = this._createLevels();
        this.currentLevelIndex = -1;
        this.currentLevel = null;
        this.ui = null;

        // In-game stats
        this.score = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.lives = 3;
        this.maxLives = 3;
        this.hitCount = 0;
        this.timer = 0;
        this.usedRevive = false; // 1 revive per level

        // Timing bar state (kept synced with SliderPhysics)
        this.barPosition = 0;
        this.barSpeed = 1;
        this.barDirection = 1;
        this.targetZoneStart = 0;
        this.targetZoneEnd = 0;

        // Physics subsystems
        this.slider = new SliderPhysics();
        this.waveBar = new WaveBarPhysics(48);
        this.physicsWorld = new PhysicsWorld2D();
        this.camera = new CameraPhysics();
        this.barOffsetSpring = new Spring2D(0, 0, 280, 16, 1);
        this.zoneStartSpring = new Spring1D(0.3, 240, 18, 1);
        this.zoneWidthSpring = new Spring1D(0.2, 240, 18, 1);
        this.zoneHitSpring = new Spring1D(1, 320, 14, 1);
        this.feedbackSpring = new Spring1D(1, 300, 14, 1);

        // Hit feedback
        this.lastHitResult = null;
        this.hitAnimTimer = 0;

        // State
        this.levelComplete = false;
        this.levelFailed = false;

        // Particles & animation state
        this.particles = [];
        this.bgObjects = [];
        this.hitFlashTimer = 0;
        this.gameTime = 0;
        this._lastW = 960;
        this._lastH = 640;

        // Endless mode fields
        this.endlessMode = false;
        this.endlessWave = 1;
        this.endlessHitsInWave = 0;
        this.endlessHitsPerWave = 5;
        this.endlessWaveFlash = 0;
        this.endlessBest = this._loadEndlessBest();

        this._loadProgress();
    }

    setUI(ui) {
        this.ui = ui;
    }

    _createLevels() {
        return [
            { id: 1, name: 'CLEAR_LOGS', desc: 'Delete the attacker\'s log files', difficulty: 1, barSpeed: 0.7, targetSize: 0.22, requiredHits: 8, maxTime: 25, unlocked: true, completed: false, bestScore: 0, lockpickDiff: 1 },
            { id: 2, name: 'CLOSE_PORTS', desc: 'Shut down open backdoors', difficulty: 2, barSpeed: 0.9, targetSize: 0.18, requiredHits: 10, maxTime: 28, unlocked: false, completed: false, bestScore: 0, lockpickDiff: 2 },
            { id: 3, name: 'REMOVE_MALWARE', desc: 'Detect and remove malicious software', difficulty: 3, barSpeed: 1.1, targetSize: 0.15, requiredHits: 12, maxTime: 30, unlocked: false, completed: false, bestScore: 0, lockpickDiff: 3 },
            { id: 4, name: 'RESET_CREDS', desc: 'Reset compromised credentials', difficulty: 4, barSpeed: 1.4, targetSize: 0.12, requiredHits: 14, maxTime: 35, unlocked: false, completed: false, bestScore: 0, lockpickDiff: 4 },
            { id: 5, name: 'FIREWALL', desc: 'Rebuild the firewall', difficulty: 5, barSpeed: 1.7, targetSize: 0.10, requiredHits: 16, maxTime: 40, unlocked: false, completed: false, bestScore: 0, lockpickDiff: 5 },
            { id: 6, name: 'CUT_ACCESS', desc: 'Completely sever the attacker\'s connection', difficulty: 6, barSpeed: 2.0, targetSize: 0.08, requiredHits: 18, maxTime: 60, unlocked: false, completed: false, bestScore: 0, lockpickDiff: 6 }
        ];
    }

    startLevel(index) {
        if (index < 0 || index >= this.levels.length) return false;
        const level = this.levels[index];
        if (!level.unlocked) return false;

        this.endlessMode = false;
        this.currentLevelIndex = index;
        this.currentLevel = level;

        this.score = 0;
        this.combo = 0;
        this.maxCombo = 0;

        // Dynamic lives based on difficulty
        if (index <= 2) {
            this.maxLives = 3;
        } else if (index <= 4) {
            this.maxLives = 4;
        } else {
            this.maxLives = 5;
        }
        this.lives = this.maxLives;
        this.hitCount = 0;
        this.barPosition = 0;
        this.barSpeed = level.barSpeed;
        this.barDirection = 1;
        this.levelComplete = false;
        this.levelFailed = false;
        this.lastHitResult = null;
        this.hitAnimTimer = 0;
        this.particles = [];
        this.timer = level.maxTime;
        this.usedRevive = false;
        this.hitFlashTimer = 0;

        this._resetPhysics(level.barSpeed);
        this._generateTargetZone(true);
        this._initBgObjects();
        return true;
    }

    _resetPhysics(speed) {
        this.slider.reset(speed);
        this.waveBar.reset();
        this.physicsWorld.clear();
        this.camera = new CameraPhysics();
        this.barOffsetSpring.snap(0, 0);
        this.zoneHitSpring.snap(1);
        this.feedbackSpring.snap(1);
    }

    update(dt) {
        if (!this.currentLevel || this.levelComplete || this.levelFailed) return;

        this.gameTime += dt;
        if (this.hitFlashTimer > 0) this.hitFlashTimer = Math.max(0, this.hitFlashTimer - dt * 3);

        // Countdown timer
        this.timer -= dt;
        if (this.timer <= 0) {
            this.timer = 0;
            this._checkEnd();
            return;
        }

        this._updateCommonPhysics(dt);
    }

    _updateCommonPhysics(dt) {
        // Update slider kinematics and elastic boundary bounce
        this.slider.targetSpeed = this.barSpeed;
        this.slider.update(dt, (boundaryPos) => {
            this.waveBar.pluck(boundaryPos, 26, 3);
            this.barOffsetSpring.impulse(boundaryPos === 1 ? 48 : -48, 0);
        });

        this.barPosition = this.slider.position;
        this.barDirection = this.slider.direction;

        // Continuous subtle fluid wake turbulence from cursor movement
        this.waveBar.pluck(this.barPosition, this.slider.velocity * 0.8, 2);

        // Update all coupled physics simulations
        this.waveBar.update(dt);
        this.physicsWorld.update(dt);
        this.camera.update(dt);
        this.barOffsetSpring.update(dt);
        this.zoneStartSpring.update(dt);
        this.zoneWidthSpring.update(dt);
        this.zoneHitSpring.update(dt);
        this.feedbackSpring.update(dt);

        // Hit feedback text timer
        if (this.lastHitResult) {
            this.hitAnimTimer -= dt;
            if (this.hitAnimTimer <= 0) this.lastHitResult = null;
        }

        // Symbol particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vy += 150 * dt;
            p.life -= p.decay * dt;
            if (p.life <= 0) this.particles.splice(i, 1);
        }
    }

    _triggerHitPhysics(pos, result, theme) {
        const W = this._lastW || 960;
        const H = this._lastH || 640;
        const barX = W * 0.12;
        const barW = W * 0.76;
        const barY = H * 0.56;
        const hitX = barX + pos * barW;

        this.slider.triggerHitImpulse(result);
        this.feedbackSpring.snap(0.75);
        this.feedbackSpring.setTarget(1.0);

        if (result === 'perfect') {
            this.feedbackSpring.impulse(4.2);
            this.zoneHitSpring.impulse(4.5);
            this.waveBar.pluck(pos, 180, 6);
            this.barOffsetSpring.impulse(0, 110);
            this.camera.impulse(0, 90, (pos - 0.5) * 0.4, 0.35);
            this.physicsWorld.spawnShatter(hitX, barY, theme.hitColors.perfect, 18, { floorY: barY + 95, speed: 240 });
            this.physicsWorld.spawnShockwave(hitX, barY, theme.hitColors.perfect, 130, 340);
            this.physicsWorld.spawnShockwave(hitX, barY, '#ffffff', 75, 260);
        } else if (result === 'good') {
            this.feedbackSpring.impulse(2.8);
            this.zoneHitSpring.impulse(2.8);
            this.waveBar.pluck(pos, 110, 5);
            this.barOffsetSpring.impulse(0, 70);
            this.camera.impulse(0, 50, 0, 0.18);
            this.physicsWorld.spawnShatter(hitX, barY, theme.hitColors.good, 11, { floorY: barY + 95, speed: 170 });
            this.physicsWorld.spawnShockwave(hitX, barY, theme.hitColors.good, 90, 260);
        } else {
            this.feedbackSpring.impulse(3.0);
            this.waveBar.pluck(pos, -150, 7);
            this.barOffsetSpring.impulse((Math.random() - 0.5) * 220, -90);
            this.camera.impulse((Math.random() - 0.5) * 180, -70, (Math.random() - 0.5) * 1.2, 0.65);
            this.physicsWorld.spawnShatter(hitX, barY, '#ef4444', 14, { floorY: barY + 95, speed: 190 });
            this.physicsWorld.spawnShockwave(hitX, barY, '#ef4444', 100, 280);
        }
    }

    hit() {
        if (!this.currentLevel || this.levelComplete || this.levelFailed) return;

        const pos = this.barPosition;
        const inZone = pos >= this.targetZoneStart && pos <= this.targetZoneEnd;
        const theme = getLevelTheme(this.currentLevel.id);

        if (inZone) {
            const center = (this.targetZoneStart + this.targetZoneEnd) / 2;
            const dist = Math.abs(pos - center) / ((this.targetZoneEnd - this.targetZoneStart) / 2);

            if (dist < 0.35) {
                this.combo++;
                this.score += 100 * this.combo;
                this.lastHitResult = 'perfect';
                this._spawnParticles(pos, theme.hitColors.perfect, 8);
                this._triggerHitPhysics(pos, 'perfect', theme);
                Sound.playPerfect(theme);
                this.hitFlashTimer = 1;
            } else {
                this.combo++;
                this.score += 50 * this.combo;
                this.lastHitResult = 'good';
                this._spawnParticles(pos, theme.hitColors.good, 5);
                this._triggerHitPhysics(pos, 'good', theme);
                Sound.playGood(theme);
                this.hitFlashTimer = 0.6;
            }
            this.hitCount++;
            if (this.combo > this.maxCombo) this.maxCombo = this.combo;
        } else {
            this.combo = 0;
            this.lives--;
            this.lastHitResult = 'miss';
            this._spawnParticles(pos, theme.hitColors.miss, 6);
            this._triggerHitPhysics(pos, 'miss', theme);
            Sound.playMiss();

            if (this.lives <= 0) {
                this.levelFailed = true;
                Sound.playLevelFail();
                return;
            }
        }

        this.hitAnimTimer = 0.55;
        this._generateTargetZone(false);
        this.barSpeed = Math.min(this.barSpeed + 0.015, 3.5);
        this._checkEnd();
    }

    _checkEnd() {
        if (this.hitCount >= this.currentLevel.requiredHits) {
            this.levelComplete = true;
            this._onComplete();
        } else if (this.timer <= 0 && !this.levelComplete) {
            this.levelFailed = true;
        }
    }

    _onComplete() {
        const l = this.currentLevel;
        if (this.score > l.bestScore) l.bestScore = this.score;
        l.completed = true;
        const next = this.currentLevelIndex + 1;
        if (next < this.levels.length) this.levels[next].unlocked = true;
        this._saveProgress();
        Sound.playLevelComplete();
    }

    _generateTargetZone(snap = false) {
        const size = this.currentLevel.targetSize;
        const start = Utils.randFloat(0.06, 0.94 - size);
        this.targetZoneStart = start;
        this.targetZoneEnd = start + size;

        if (snap) {
            this.zoneStartSpring.snap(start);
            this.zoneWidthSpring.snap(size);
        } else {
            this.zoneStartSpring.setTarget(start);
            this.zoneWidthSpring.setTarget(size);
        }
    }

    _spawnParticles(barPos, color, count) {
        const theme = getLevelTheme(this.currentLevel.id);
        const syms = theme.particleSymbols;
        for (let i = 0; i < count; i++) {
            this.particles.push({
                barPos, color,
                symbol: syms[Utils.randInt(0, syms.length - 1)],
                x: 0, y: 0,
                vx: Utils.randFloat(-95, 95),
                vy: Utils.randFloat(-135, -35),
                life: 1,
                decay: Utils.randFloat(1.3, 2.4),
                size: Utils.randFloat(2.5, 5)
            });
        }
    }

    // ── Render (Standard Level) ──

    render(ctx, W, H, ui = null) {
        if (!this.currentLevel) return;
        this._lastW = W;
        this._lastH = H;
        if (ui) this.ui = ui;

        const theme = getLevelTheme(this.currentLevel.id);
        const t = this.gameTime;

        // Level-specific background animation
        this._renderLevelBg(ctx, W, H, theme, t);

        // Screen-space hit flash
        if (this.hitFlashTimer > 0) {
            ctx.save();
            ctx.globalAlpha = this.hitFlashTimer * 0.07;
            ctx.fillStyle = theme.zoneColor;
            ctx.fillRect(0, 0, W, H);
            ctx.restore();
        }

        // Fluid Light Timing Bar + Physics
        this._renderTimingBar(ctx, W, H, theme, t);

        // Top HUD Info
        this._renderInfo(ctx, W, H, theme);
    }

    // ── Shared Fluid Light Timing Bar Renderer ──

    _renderTimingBar(ctx, W, H, theme, t) {
        const barX = W * 0.12;
        const barW = W * 0.76;
        const barY = H * 0.56;

        this.camera.applyTransform(ctx, W / 2, H / 2);

        const bx = barX + this.barOffsetSpring.x.value;
        const by = barY + this.barOffsetSpring.y.value;

        // ── Layer 1: Outer Frosted Glass Chassis ──
        this._drawGlass(ctx, bx - 24, by - 36, barW + 48, 72, {
            radius: 36,
            topBg: 'rgba(18, 28, 52, 0.65)',
            bottomBg: 'rgba(8, 13, 25, 0.84)',
            accentColor: theme.zoneColor,
            accentAlpha: 0.1,
            borderColor: 'rgba(255, 255, 255, 0.13)',
            glowColor: this._withAlpha(theme.barGlow, 0.22),
            glowBlur: 22
        });

        // Subtle scale ticks inside chassis
        ctx.save();
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.16)';
        ctx.lineWidth = 1;
        for (let i = 1; i < 20; i++) {
            const tx = bx + (i / 20) * barW;
            const major = i % 5 === 0;
            const len = major ? 5 : 3;
            ctx.beginPath();
            ctx.moveTo(tx, by - 24);
            ctx.lineTo(tx, by - 24 + len);
            ctx.moveTo(tx, by + 24 - len);
            ctx.lineTo(tx, by + 24);
            ctx.stroke();
        }
        ctx.restore();

        // Elastic Neon Bumpers on Left & Right ends
        this._drawBumper(ctx, bx - 9, by, this.slider.leftBumperSpring.value, theme.indicatorColor);
        this._drawBumper(ctx, bx + barW + 9, by, this.slider.rightBumperSpring.value, theme.indicatorColor);

        // ── Layer 2: Inner Recessed Light Track & Coupled Wave Ribbon ──
        ctx.save();
        Utils.roundRect(ctx, bx, by - 14, barW, 28, 14);
        ctx.fillStyle = 'rgba(4, 7, 17, 0.85)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Clip inside recessed track for fluid wave curve
        ctx.save();
        Utils.roundRect(ctx, bx, by - 14, barW, 28, 14);
        ctx.clip();

        const nodes = this.waveBar.nodes;
        const nodeCount = nodes.length;
        if (nodeCount > 1) {
            ctx.beginPath();
            const stepX = barW / (nodeCount - 1);
            ctx.moveTo(bx, by + Utils.clamp(nodes[0].y, -11, 11));
            for (let i = 0; i < nodeCount - 1; i++) {
                const x0 = bx + i * stepX;
                const y0 = by + Utils.clamp(nodes[i].y, -11, 11);
                const x1 = bx + (i + 1) * stepX;
                const y1 = by + Utils.clamp(nodes[i + 1].y, -11, 11);
                const mx = (x0 + x1) * 0.5;
                const my = (y0 + y1) * 0.5;
                ctx.quadraticCurveTo(x0, y0, mx, my);
            }
            const lastY = by + Utils.clamp(nodes[nodeCount - 1].y, -11, 11);
            ctx.lineTo(bx + barW, lastY);

            ctx.shadowColor = theme.zoneColor;
            ctx.shadowBlur = 10;
            ctx.strokeStyle = this._withAlpha(theme.zoneColor, 0.55);
            ctx.lineWidth = 2;
            ctx.stroke();

            // Subtle mirrored secondary harmonic ribbon
            ctx.shadowBlur = 0;
            ctx.beginPath();
            ctx.moveTo(bx, by - Utils.clamp(nodes[0].y, -11, 11) * 0.5);
            for (let i = 0; i < nodeCount - 1; i++) {
                const x0 = bx + i * stepX;
                const y0 = by - Utils.clamp(nodes[i].y, -11, 11) * 0.5;
                const x1 = bx + (i + 1) * stepX;
                const y1 = by - Utils.clamp(nodes[i + 1].y, -11, 11) * 0.5;
                ctx.quadraticCurveTo(x0, y0, (x0 + x1) * 0.5, (y0 + y1) * 0.5);
            }
            ctx.strokeStyle = this._withAlpha(theme.accentSecondary || theme.indicatorColor, 0.25);
            ctx.lineWidth = 1.2;
            ctx.stroke();
        }
        ctx.restore();
        ctx.restore();

        // ── Layer 3: Multi-Zone Glowing Neon Target Capsule ──
        const zStart = Utils.clamp(this.zoneStartSpring.value, 0.02, 0.96);
        const zWidth = Utils.clamp(this.zoneWidthSpring.value, 0.03, 0.4);
        const zoneX = bx + zStart * barW;
        const zoneW = zWidth * barW;
        const zScaleY = Utils.clamp(this.zoneHitSpring.value, 0.85, 1.35);
        const zoneH = 32 * zScaleY;
        const zoneR = Math.min(16, zoneW * 0.45);
        const breathe = 0.86 + Math.sin(t * 3.5) * 0.14;

        ctx.save();
        ctx.globalAlpha = breathe;
        ctx.shadowColor = theme.zoneColor;
        ctx.shadowBlur = 18;

        const zoneGrad = ctx.createLinearGradient(zoneX, by - zoneH / 2, zoneX + zoneW, by + zoneH / 2);
        zoneGrad.addColorStop(0, this._withAlpha(theme.zoneColor, 0.22));
        zoneGrad.addColorStop(0.5, this._withAlpha(theme.accentSecondary || theme.zoneColor, 0.34));
        zoneGrad.addColorStop(1, this._withAlpha(theme.zoneColor, 0.22));

        Utils.roundRect(ctx, zoneX, by - zoneH / 2, zoneW, zoneH, zoneR);
        ctx.fillStyle = zoneGrad;
        ctx.fill();

        ctx.strokeStyle = theme.zoneColor;
        ctx.lineWidth = 1.8;
        ctx.stroke();

        // Inner Perfect Sweet-Spot Core (central 35%)
        const perfW = Math.max(6, zoneW * 0.35);
        const perfX = zoneX + (zoneW - perfW) / 2;
        const perfH = zoneH * 0.76;
        const perfR = Math.min(10, perfW * 0.45);

        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 12;
        Utils.roundRect(ctx, perfX, by - perfH / 2, perfW, perfH, perfR);
        ctx.fillStyle = this._withAlpha(theme.accentSecondary || theme.zoneColor, 0.45);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.72)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // White-hot center hairline & micro-brackets
        const centerX = zoneX + zoneW / 2;
        ctx.shadowBlur = 8;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(centerX, by - perfH / 2 + 3);
        ctx.lineTo(centerX, by + perfH / 2 - 3);
        ctx.stroke();
        ctx.restore();

        // ── Layer 4: Fluid Light Cursor & Comet Ribbon Trail ──
        const trail = this.slider.trail;
        if (trail.length > 1) {
            ctx.save();
            for (let i = 1; i < trail.length; i++) {
                const prev = trail[i - 1];
                const curr = trail[i];
                const x1 = bx + prev.pos * barW;
                const y1 = by + prev.yOffset;
                const x2 = bx + curr.pos * barW;
                const y2 = by + curr.yOffset;
                const fade = Math.max(0, curr.alpha) * (1 - i / trail.length);
                const w = Math.max(2, (1 - i / trail.length) * 16);

                ctx.strokeStyle = this._withAlpha(theme.indicatorColor, fade * 0.55);
                ctx.lineWidth = w;
                ctx.lineCap = 'round';
                ctx.shadowColor = theme.indicatorColor;
                ctx.shadowBlur = 10 * fade;
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();
            }
            ctx.restore();
        }

        // Fluid Light Orb / Blade Cursor with squash-and-stretch
        const ix = bx + this.barPosition * barW;
        const sx = Utils.clamp(this.slider.squashX.value, 0.65, 1.45);
        const sy = Utils.clamp(this.slider.squashY.value, 0.65, 1.45);

        ctx.save();
        ctx.translate(ix, by);
        ctx.scale(sx, sy);

        // Outer radial neon aura
        const aura = ctx.createRadialGradient(0, 0, 2, 0, 0, 32);
        aura.addColorStop(0, this._withAlpha(theme.indicatorColor, 0.55));
        aura.addColorStop(0.45, this._withAlpha(theme.indicatorColor, 0.18));
        aura.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = aura;
        ctx.beginPath();
        ctx.arc(0, 0, 32, 0, Math.PI * 2);
        ctx.fill();

        // Vertical light-blade pill
        ctx.shadowColor = theme.indicatorColor;
        ctx.shadowBlur = 18;
        const bladeGrad = ctx.createLinearGradient(0, -21, 0, 21);
        bladeGrad.addColorStop(0, theme.accentSecondary || theme.indicatorColor);
        bladeGrad.addColorStop(0.5, '#ffffff');
        bladeGrad.addColorStop(1, theme.indicatorColor);
        Utils.roundRect(ctx, -7, -21, 14, 42, 7);
        ctx.fillStyle = bladeGrad;
        ctx.fill();

        // Inner pure white hot core
        ctx.shadowBlur = 6;
        Utils.roundRect(ctx, -2.5, -14, 5, 28, 2.5);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.restore();

        // Floating glassmorphic icon micro-badge & pointer above cursor
        const bob = Math.sin(t * 6) * 2.5;
        ctx.save();
        ctx.translate(ix, by + bob);

        // Downward precision laser pointer triangle
        ctx.fillStyle = theme.indicatorColor;
        ctx.shadowColor = theme.indicatorColor;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(0, -25);
        ctx.lineTo(-5, -32);
        ctx.lineTo(5, -32);
        ctx.closePath();
        ctx.fill();

        // Frosted micro-capsule housing icon
        this._drawGlass(ctx, -16, -64, 32, 28, {
            radius: 10,
            accentColor: theme.indicatorColor,
            accentAlpha: 0.22,
            borderColor: this._withAlpha(theme.indicatorColor, 0.65),
            glowColor: this._withAlpha(theme.indicatorColor, 0.35),
            glowBlur: 12
        });
        ctx.shadowBlur = 0;
        ctx.font = `${theme.iconSize || 20}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(theme.icon, 0, -50);
        ctx.restore();

        // ── Layer 5: Physical Debris Shards, Shockwaves & Spring Hit Banner ──
        this.physicsWorld.render(ctx);

        // Subtle symbol particles
        for (const p of this.particles) {
            ctx.save();
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            const px = bx + p.barPos * barW + p.x;
            const py = by + p.y;
            if (p.size > 3 && p.symbol) {
                ctx.font = `${Math.round(p.size * 3 * p.life)}px monospace`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(p.symbol, px, py);
            } else {
                ctx.beginPath();
                ctx.arc(px, py, p.size * p.life, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }

        // Spring-animated floating hit feedback banner
        if (this.lastHitResult) {
            const text = theme.hitWords[this.lastHitResult];
            const color = theme.hitColors[this.lastHitResult];
            const alpha = Utils.clamp(this.hitAnimTimer / 0.55, 0, 1);
            const fScale = Utils.clamp(this.feedbackSpring.value, 0.75, 1.35);

            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.translate(W / 2, by - 94);
            ctx.scale(fScale, fScale);

            const bannerW = Math.max(150, text.length * 16 + 44);
            this._drawGlass(ctx, -bannerW / 2, -20, bannerW, 38, {
                radius: 19,
                accentColor: color,
                accentAlpha: 0.25,
                borderColor: this._withAlpha(color, 0.8),
                glowColor: this._withAlpha(color, 0.5),
                glowBlur: 18
            });

            ctx.shadowColor = color;
            ctx.shadowBlur = 12;
            ctx.fillStyle = '#f8fafc';
            ctx.font = '700 18px Orbitron';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(text, 0, 0);
            ctx.restore();
        }

        // Bottom control hint pill
        ctx.save();
        ctx.fillStyle = 'rgba(148, 163, 184, 0.55)';
        ctx.font = '500 12px Rajdhani';
        ctx.textAlign = 'center';
        ctx.fillText('PRESS [SPACE] OR TAP WHEN THE LIGHT BLADE ENTERS THE GLOWING CAPSULE', W / 2, H - 24);
        ctx.restore();

        this.camera.restoreTransform(ctx);
    }

    _drawBumper(ctx, x, y, springVal, color) {
        const energy = Utils.clamp(Math.abs(springVal), 0, 1.5);
        const h = 24 + energy * 12;
        const w = 5 - Math.min(2, energy * 1.4);

        ctx.save();
        ctx.shadowColor = color;
        ctx.shadowBlur = 6 + energy * 14;
        Utils.roundRect(ctx, x - w / 2, y - h / 2, w, h, w / 2);
        ctx.fillStyle = energy > 0.15 ? '#f8fafc' : this._withAlpha(color, 0.65);
        ctx.fill();
        ctx.restore();
    }

    _renderInfo(ctx, W, H, theme) {
        ctx.save();

        // Top-center floating glassmorphic level card
        const cardW = 340;
        const cardH = 74;
        const cardX = W / 2 - cardW / 2;
        const cardY = 14;

        this._drawGlass(ctx, cardX, cardY, cardW, cardH, {
            radius: 16,
            accentColor: theme.zoneColor,
            accentAlpha: 0.14,
            borderColor: this._withAlpha(theme.zoneColor, 0.35)
        });

        // Header line: codeTag // LEVEL NAME
        ctx.fillStyle = theme.zoneColor;
        ctx.font = '700 13px Orbitron';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${theme.codeTag}  //  ${this.currentLevel.name}`, W / 2, cardY + 18);

        // Description
        ctx.fillStyle = '#94a3b8';
        ctx.font = '500 12px Rajdhani';
        ctx.fillText(this.currentLevel.desc, W / 2, cardY + 35);

        // Segmented Neon Progress Bar
        const total = this.currentLevel.requiredHits;
        const innerW = cardW - 36;
        const gap = 3;
        const segW = (innerW - (total - 1) * gap) / total;
        const segH = 7;
        const segX0 = cardX + 18;
        const segY = cardY + 50;

        for (let i = 0; i < total; i++) {
            const sx = segX0 + i * (segW + gap);
            const filled = i < this.hitCount;
            ctx.save();
            if (filled) {
                ctx.shadowColor = theme.zoneColor;
                ctx.shadowBlur = 8;
                ctx.fillStyle = theme.zoneColor;
            } else {
                ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
            }
            Utils.roundRect(ctx, sx, segY, segW, segH, 3);
            ctx.fill();
            if (!filled) {
                ctx.strokeStyle = 'rgba(148, 163, 184, 0.18)';
                ctx.lineWidth = 0.8;
                ctx.stroke();
            }
            ctx.restore();
        }

        // Secondary top-right status strip (below Energy Bar)
        const stripW = 217;
        const stripH = 38;
        const stripX = W - stripW - 18;
        const stripY = 72;
        const urgent = this.timer < 10;

        this._drawGlass(ctx, stripX, stripY, stripW, stripH, {
            radius: 12,
            accentColor: urgent ? '#ef4444' : '#38bdf8',
            accentAlpha: urgent ? 0.2 : 0.08,
            borderColor: urgent ? 'rgba(239, 68, 68, 0.45)' : 'rgba(255, 255, 255, 0.12)'
        });

        // Integrity diamonds (lives) on left half of strip
        const maxL = this.maxLives || 3;
        for (let i = 0; i < maxL; i++) {
            const lx = stripX + 18 + i * 18;
            const ly = stripY + stripH / 2;
            const alive = i < this.lives;
            ctx.save();
            ctx.translate(lx, ly);
            ctx.rotate(Math.PI / 4);
            if (alive) {
                ctx.shadowColor = '#ef4444';
                ctx.shadowBlur = 8;
                ctx.fillStyle = '#fb7185';
                ctx.fillRect(-4.5, -4.5, 9, 9);
            } else {
                ctx.strokeStyle = 'rgba(239, 68, 68, 0.28)';
                ctx.lineWidth = 1.2;
                ctx.strokeRect(-4.5, -4.5, 9, 9);
            }
            ctx.restore();
        }

        // Timer countdown on right half
        ctx.fillStyle = urgent ? '#f87171' : '#e2e8f0';
        ctx.font = '700 14px Orbitron';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(Utils.formatTime(this.timer), stripX + stripW - 14, stripY + stripH / 2 + 0.5);

        ctx.restore();
    }

    // ── Persistence ──

    _saveProgress() {
        try {
            const data = this.levels.map(l => ({ id: l.id, unlocked: l.unlocked, completed: l.completed, bestScore: l.bestScore }));
            localStorage.setItem('sb_progress', JSON.stringify(data));
        } catch (e) { }
    }

    _loadProgress() {
        try {
            const data = JSON.parse(localStorage.getItem('sb_progress'));
            if (!data) return;
            for (const s of data) {
                const l = this.levels.find(x => x.id === s.id);
                if (l) { l.unlocked = s.unlocked; l.completed = s.completed; l.bestScore = s.bestScore; }
            }
        } catch (e) { }
    }

    // ════════════════════════════════════════
    //  ENDLESS MODE
    // ════════════════════════════════════════

    isAllCompleted() {
        return this.levels.every(l => l.completed);
    }

    startEndless() {
        this.endlessMode = true;
        this.currentLevelIndex = -1;
        this.currentLevel = {
            id: 999,
            name: 'ENDLESS_MODE',
            desc: 'Permanent defense — survive as long as you can',
            barSpeed: 0.6,
            targetSize: 0.24,
            requiredHits: Infinity,
            maxTime: Infinity,
            lockpickDiff: 1
        };

        this.score = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.lives = 6;
        this.maxLives = 6;
        this.hitCount = 0;
        this.barPosition = 0;
        this.barSpeed = this.currentLevel.barSpeed;
        this.barDirection = 1;
        this.levelComplete = false;
        this.levelFailed = false;
        this.lastHitResult = null;
        this.hitAnimTimer = 0;
        this.particles = [];
        this.timer = Infinity;
        this.usedRevive = false;
        this.hitFlashTimer = 0;

        // Wave system
        this.endlessWave = 1;
        this.endlessHitsInWave = 0;
        this.endlessHitsPerWave = 5;
        this.endlessWaveFlash = 0;

        this.endlessBest = this._loadEndlessBest();

        this._resetPhysics(this.barSpeed);
        this._generateTargetZone(true);
        this._initBgObjects();
    }

    hitEndless() {
        if (!this.currentLevel || this.levelFailed) return;

        const pos = this.barPosition;
        const inZone = pos >= this.targetZoneStart && pos <= this.targetZoneEnd;
        const theme = getLevelTheme(this.currentLevel.id);

        if (inZone) {
            const center = (this.targetZoneStart + this.targetZoneEnd) / 2;
            const dist = Math.abs(pos - center) / ((this.targetZoneEnd - this.targetZoneStart) / 2);

            if (dist < 0.35) {
                this.combo++;
                this.score += 100 * this.combo * this.endlessWave;
                this.lastHitResult = 'perfect';
                this._spawnParticles(pos, theme.hitColors.perfect, 8);
                this._triggerHitPhysics(pos, 'perfect', theme);
                Sound.playPerfect(theme);
                this.hitFlashTimer = 1;
            } else {
                this.combo++;
                this.score += 50 * this.combo * this.endlessWave;
                this.lastHitResult = 'good';
                this._spawnParticles(pos, theme.hitColors.good, 5);
                this._triggerHitPhysics(pos, 'good', theme);
                Sound.playGood(theme);
                this.hitFlashTimer = 0.6;
            }
            this.hitCount++;
            this.endlessHitsInWave++;
            if (this.combo > this.maxCombo) this.maxCombo = this.combo;

            if (this.endlessHitsInWave >= this.endlessHitsPerWave) {
                this.endlessWave++;
                this.endlessHitsInWave = 0;
                this.endlessWaveFlash = 1.0;
                this._endlessScaleUp();
                Sound.playWaveUp();
            }
        } else {
            this.combo = 0;
            this.lives--;
            this.lastHitResult = 'miss';
            this._spawnParticles(pos, theme.hitColors.miss, 6);
            this._triggerHitPhysics(pos, 'miss', theme);
            Sound.playMiss();

            if (this.lives <= 0) {
                this.levelFailed = true;
                this._saveEndlessBest();
                Sound.playLevelFail();
                return;
            }
        }

        this.hitAnimTimer = 0.55;
        this._generateTargetZone(false);
        this.barSpeed = Math.min(this.barSpeed + 0.008, 4.0);
    }

    _endlessScaleUp() {
        this.currentLevel.targetSize = Math.max(this.currentLevel.targetSize - 0.012, 0.05);
        this.currentLevel.barSpeed = Math.min(this.currentLevel.barSpeed + 0.15, 4.0);
        this.barSpeed = this.currentLevel.barSpeed;
        this.currentLevel.lockpickDiff = Math.min(this.endlessWave, 6);
        if (this.endlessWave % 3 === 0) {
            this.lives = Math.min(this.lives + 1, 6);
        }
    }

    updateEndless(dt) {
        if (!this.currentLevel || this.levelFailed) return;

        this.gameTime += dt;
        if (this.hitFlashTimer > 0) this.hitFlashTimer = Math.max(0, this.hitFlashTimer - dt * 3);
        if (this.endlessWaveFlash > 0) this.endlessWaveFlash = Math.max(0, this.endlessWaveFlash - dt * 2);

        this._updateCommonPhysics(dt);
    }

    renderEndless(ctx, W, H, ui = null) {
        if (!this.currentLevel) return;
        this._lastW = W;
        this._lastH = H;
        if (ui) this.ui = ui;

        const theme = getLevelTheme(this.currentLevel.id);
        const t = this.gameTime;

        this._renderLevelBg(ctx, W, H, theme, t);

        if (this.hitFlashTimer > 0) {
            ctx.save();
            ctx.globalAlpha = this.hitFlashTimer * 0.07;
            ctx.fillStyle = theme.zoneColor;
            ctx.fillRect(0, 0, W, H);
            ctx.restore();
        }

        if (this.endlessWaveFlash > 0) {
            ctx.save();
            ctx.globalAlpha = this.endlessWaveFlash * 0.14;
            ctx.fillStyle = '#f59e0b';
            ctx.fillRect(0, 0, W, H);
            ctx.restore();
        }

        this._renderTimingBar(ctx, W, H, theme, t);
        this._renderEndlessInfo(ctx, W, H, theme);
    }

    _renderEndlessInfo(ctx, W, H, theme) {
        ctx.save();

        const cardW = 340;
        const cardH = 74;
        const cardX = W / 2 - cardW / 2;
        const cardY = 14;

        this._drawGlass(ctx, cardX, cardY, cardW, cardH, {
            radius: 16,
            accentColor: '#f59e0b',
            accentAlpha: 0.15,
            borderColor: 'rgba(245, 158, 11, 0.38)'
        });

        ctx.fillStyle = '#fbbf24';
        ctx.font = '700 14px Orbitron';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`WAVE ${this.endlessWave}  //  ENDLESS_MODE`, W / 2, cardY + 18);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '500 12px Rajdhani';
        ctx.fillText(`Hits in wave: ${this.endlessHitsInWave}/${this.endlessHitsPerWave}  •  Total: ${this.hitCount}`, W / 2, cardY + 35);

        // 5 segmented wave capsules
        const total = this.endlessHitsPerWave;
        const innerW = cardW - 60;
        const gap = 6;
        const segW = (innerW - (total - 1) * gap) / total;
        const segH = 7;
        const segX0 = cardX + 30;
        const segY = cardY + 50;

        for (let i = 0; i < total; i++) {
            const sx = segX0 + i * (segW + gap);
            const filled = i < this.endlessHitsInWave;
            ctx.save();
            if (filled) {
                ctx.shadowColor = '#f59e0b';
                ctx.shadowBlur = 8;
                ctx.fillStyle = '#fbbf24';
            } else {
                ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
            }
            Utils.roundRect(ctx, sx, segY, segW, segH, 3);
            ctx.fill();
            if (!filled) {
                ctx.strokeStyle = 'rgba(148, 163, 184, 0.18)';
                ctx.lineWidth = 0.8;
                ctx.stroke();
            }
            ctx.restore();
        }

        // Secondary top-right status strip (below Energy Bar)
        const stripW = 217;
        const stripH = 38;
        const stripX = W - stripW - 18;
        const stripY = 72;

        this._drawGlass(ctx, stripX, stripY, stripW, stripH, {
            radius: 12,
            accentColor: '#f59e0b',
            accentAlpha: 0.1,
            borderColor: 'rgba(255, 255, 255, 0.12)'
        });

        const slots = Math.max(this.lives, 6);
        for (let i = 0; i < slots; i++) {
            const lx = stripX + 16 + i * 16;
            const ly = stripY + stripH / 2;
            const alive = i < this.lives;
            ctx.save();
            ctx.translate(lx, ly);
            ctx.rotate(Math.PI / 4);
            if (alive) {
                ctx.shadowColor = '#ef4444';
                ctx.shadowBlur = 7;
                ctx.fillStyle = '#fb7185';
                ctx.fillRect(-4, -4, 8, 8);
            } else {
                ctx.strokeStyle = 'rgba(239, 68, 68, 0.25)';
                ctx.lineWidth = 1;
                ctx.strokeRect(-4, -4, 8, 8);
            }
            ctx.restore();
        }

        ctx.fillStyle = '#94a3b8';
        ctx.font = '600 10px Orbitron';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(`BEST ${this.endlessBest}`, stripX + stripW - 12, stripY + stripH / 2 + 0.5);

        ctx.restore();
    }

    _saveEndlessBest() {
        if (this.score > this.endlessBest) {
            this.endlessBest = this.score;
            try { localStorage.setItem('sb_endless_best', this.score); } catch (e) { }
        }
    }

    _loadEndlessBest() {
        try { return parseInt(localStorage.getItem('sb_endless_best')) || 0; } catch (e) { return 0; }
    }

    // ── Glass Helper Delegation ──

    _drawGlass(ctx, x, y, w, h, opts = {}) {
        if (this.ui && typeof this.ui.drawGlassPanel === 'function') {
            this.ui.drawGlassPanel(ctx, x, y, w, h, opts);
            return;
        }
        ctx.save();
        Utils.roundRect(ctx, x, y, w, h, opts.radius || 14);
        ctx.fillStyle = 'rgba(15, 23, 42, 0.72)';
        ctx.fill();
        ctx.strokeStyle = opts.borderColor || 'rgba(255, 255, 255, 0.12)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
    }

    _withAlpha(hexOrColor, alpha) {
        if (this.ui && typeof this.ui._withAlpha === 'function') {
            return this.ui._withAlpha(hexOrColor, alpha);
        }
        if (hexOrColor && hexOrColor.startsWith('#')) {
            let hex = hexOrColor.slice(1);
            if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
            const num = parseInt(hex, 16);
            if (!Number.isNaN(num)) {
                return `rgba(${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}, ${alpha})`;
            }
        }
        return hexOrColor;
    }

    // ════════════════════════════════════════
    //  LEVEL BACKGROUND ANIMATIONS
    // ════════════════════════════════════════

    _initBgObjects() {
        this.bgObjects = [];
        const theme = getLevelTheme(this.currentLevel.id);
        const type = theme.bgType;

        if (type === 'binary' || type === 'password') {
            for (let i = 0; i < 12; i++) {
                this.bgObjects.push({
                    x: Math.random(),
                    y: Math.random(),
                    speed: 0.02 + Math.random() * 0.04,
                    char: (theme.bgChars || '01')[Math.floor(Math.random() * (theme.bgChars || '01').length)],
                    size: 10 + Math.random() * 8,
                    alpha: 0.04 + Math.random() * 0.06,
                });
            }
        } else if (type === 'scanlines') {
            for (let i = 0; i < 6; i++) {
                this.bgObjects.push({
                    y: Math.random(),
                    speed: 0.005 + Math.random() * 0.01,
                    width: 0.3 + Math.random() * 0.5,
                    alpha: 0.03 + Math.random() * 0.04,
                });
            }
        } else if (type === 'virus') {
            for (let i = 0; i < 8; i++) {
                const chars = theme.bgChars || '☠';
                this.bgObjects.push({
                    x: Math.random(),
                    y: Math.random(),
                    vx: (Math.random() - 0.5) * 0.01,
                    vy: (Math.random() - 0.5) * 0.008,
                    char: chars[Math.floor(Math.random() * chars.length)],
                    size: 14 + Math.random() * 12,
                    alpha: 0.04 + Math.random() * 0.06,
                    rot: Math.random() * Math.PI * 2,
                    rotSpeed: (Math.random() - 0.5) * 0.5,
                });
            }
        } else if (type === 'embers') {
            for (let i = 0; i < 15; i++) {
                this.bgObjects.push({
                    x: Math.random(),
                    y: 0.8 + Math.random() * 0.3,
                    speed: 0.02 + Math.random() * 0.04,
                    size: 1 + Math.random() * 3,
                    alpha: 0.06 + Math.random() * 0.1,
                    drift: (Math.random() - 0.5) * 0.005,
                });
            }
        } else if (type === 'electric') {
            for (let i = 0; i < 4; i++) {
                this.bgObjects.push({
                    x1: Math.random(), y1: Math.random() * 0.4 + 0.1,
                    x2: Math.random(), y2: Math.random() * 0.4 + 0.4,
                    timer: Math.random() * 3,
                    interval: 1.5 + Math.random() * 3,
                    alpha: 0,
                });
            }
        }
    }

    _renderLevelBg(ctx, W, H, theme, t) {
        if (!this.bgObjects || this.bgObjects.length === 0) return;
        const type = theme.bgType;

        ctx.save();

        if (type === 'binary' || type === 'password') {
            ctx.textAlign = 'center';
            for (const o of this.bgObjects) {
                o.y += o.speed * 0.016;
                if (o.y > 1.1) {
                    o.y = -0.05;
                    o.x = Math.random();
                    o.char = (theme.bgChars || '01')[Math.floor(Math.random() * (theme.bgChars || '01').length)];
                }
                ctx.globalAlpha = o.alpha;
                ctx.fillStyle = theme.bgColor;
                ctx.font = `${o.size}px monospace`;
                ctx.fillText(o.char, o.x * W, o.y * H);
            }
        } else if (type === 'scanlines') {
            for (const o of this.bgObjects) {
                o.y += o.speed * 0.016;
                if (o.y > 1.2) o.y = -0.1;
                ctx.globalAlpha = o.alpha;
                ctx.strokeStyle = theme.bgColor;
                ctx.lineWidth = 1;
                ctx.setLineDash([4, 8]);
                const startX = (1 - o.width) * W * 0.5;
                ctx.beginPath();
                ctx.moveTo(startX, o.y * H);
                ctx.lineTo(startX + o.width * W, o.y * H);
                ctx.stroke();
                ctx.setLineDash([]);
            }
        } else if (type === 'virus') {
            for (const o of this.bgObjects) {
                o.x += o.vx * 0.016;
                o.y += o.vy * 0.016;
                o.rot += o.rotSpeed * 0.016;
                if (o.x < -0.05) o.x = 1.05;
                if (o.x > 1.05) o.x = -0.05;
                if (o.y < -0.05) o.y = 1.05;
                if (o.y > 1.05) o.y = -0.05;

                ctx.globalAlpha = o.alpha;
                ctx.save();
                ctx.translate(o.x * W, o.y * H);
                ctx.rotate(o.rot);
                ctx.font = `${o.size}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(o.char, 0, 0);
                ctx.restore();
            }
        } else if (type === 'embers') {
            for (const o of this.bgObjects) {
                o.y -= o.speed * 0.016;
                o.x += o.drift;
                if (o.y < -0.05) {
                    o.y = 1.0 + Math.random() * 0.2;
                    o.x = Math.random();
                }
                ctx.globalAlpha = Math.max(0, o.alpha * (1 - Math.abs(o.y - 0.5) * 1.5));
                ctx.fillStyle = theme.bgColor;
                ctx.beginPath();
                ctx.arc(o.x * W, o.y * H, o.size, 0, Math.PI * 2);
                ctx.fill();
            }
        } else if (type === 'electric') {
            for (const o of this.bgObjects) {
                o.timer += 0.016;
                if (o.timer > o.interval) {
                    o.timer = 0;
                    o.alpha = 0.14;
                    o.x1 = Math.random();
                    o.y1 = 0.1 + Math.random() * 0.3;
                    o.x2 = Math.random();
                    o.y2 = 0.5 + Math.random() * 0.3;
                }
                if (o.alpha > 0) {
                    o.alpha *= 0.92;
                    ctx.globalAlpha = o.alpha;
                    ctx.strokeStyle = theme.bgColor;
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.moveTo(o.x1 * W, o.y1 * H);
                    const segments = 3;
                    for (let s = 1; s <= segments; s++) {
                        const frac = s / (segments + 1);
                        const mx = o.x1 + (o.x2 - o.x1) * frac + (Math.random() - 0.5) * 0.1;
                        const my = o.y1 + (o.y2 - o.y1) * frac + (Math.random() - 0.5) * 0.05;
                        ctx.lineTo(mx * W, my * H);
                    }
                    ctx.lineTo(o.x2 * W, o.y2 * H);
                    ctx.stroke();
                }
            }
        }

        ctx.restore();
    }
}
