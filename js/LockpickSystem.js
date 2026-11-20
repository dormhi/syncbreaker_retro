/* =========================================
   LockpickSystem.js — Glassmorphic Radial Code Breaker
   lockpick-trainer (NoPixel 4.0) style + Neon Light Scanner
   ========================================= */

class LockpickSystem {
    constructor() {
        this.active = false;
        this.started = false;
        this.result = null;         // 'success' | 'fail' | null
        this.finished = false;
        this.onComplete = null;

        this.nodes = [];
        this.currentNodeIndex = 0;

        this.cursorAngle = 0;
        this.cursorSpeed = 90;

        this.difficulty = 1;
        this.hitTolerance = 25;

        this.resultTimer = 0;
        this.resultDuration = 1.5;
        this._animTime = 0;

        this.DIRECTIONS = ['up', 'down', 'left', 'right'];
        this.DIR_KEYS = {
            up: ['ArrowUp', 'KeyW'],
            down: ['ArrowDown', 'KeyS'],
            left: ['ArrowLeft', 'KeyA'],
            right: ['ArrowRight', 'KeyD']
        };
        this.DIR_SYMBOLS = {
            up: '↑',
            down: '↓',
            left: '←',
            right: '→'
        };
    }

    start(difficulty, onComplete) {
        this.difficulty = Utils.clamp(difficulty, 1, 6);
        this.onComplete = onComplete;
        this.result = null;
        this.finished = false;
        this.started = false;
        this.resultTimer = 0;
        this.currentNodeIndex = 0;
        this._animTime = 0;

        this._configure();
        this._generateNodes();

        const firstNodeAngle = this.nodes[0].angle;
        this.cursorAngle = (firstNodeAngle - 50 + 360) % 360;

        this.active = true;
    }

    _configure() {
        const nodeCounts = [4, 5, 5, 6, 6, 7];
        this.nodeCount = nodeCounts[this.difficulty - 1];

        const speeds = [70, 90, 110, 130, 160, 200];
        this.cursorSpeed = speeds[this.difficulty - 1];

        const tolerances = [28, 24, 20, 16, 13, 10];
        this.hitTolerance = tolerances[this.difficulty - 1];
    }

    _generateNodes() {
        this.nodes = [];
        const angleStep = 360 / this.nodeCount;

        for (let i = 0; i < this.nodeCount; i++) {
            const angle = (i * angleStep - 90 + 360) % 360;
            const dir = this.DIRECTIONS[Utils.randInt(0, 3)];

            this.nodes.push({
                angle,
                direction: dir,
                solved: false,
                failed: false,
                pulseSpring: new Spring1D(1, 320, 14, 1)
            });
        }
    }

    update(dt) {
        if (!this.active) return;
        this._animTime += dt;

        for (const node of this.nodes) {
            node.pulseSpring.update(dt);
        }

        if (this.result !== null) {
            this.resultTimer += dt;
            if (this.resultTimer >= this.resultDuration && !this.finished) {
                this.finished = true;
                if (this.onComplete) {
                    this.onComplete(this.result === 'success');
                }
            }
            return;
        }

        if (!this.started) return;

        this.cursorAngle = (this.cursorAngle + this.cursorSpeed * dt) % 360;
        this._checkMiss();
    }

    handleKey(code) {
        if (!this.active || this.result !== null) return false;

        const isDirectionKey = Object.values(this.DIR_KEYS).some(keys => keys.includes(code));
        if (!isDirectionKey) return false;

        if (!this.started) {
            this.started = true;
            return true;
        }

        const currentNode = this.nodes[this.currentNodeIndex];
        if (!currentNode || currentNode.solved) return false;

        const dist = this._angleDist(this.cursorAngle, currentNode.angle);
        if (dist > this.hitTolerance) {
            this._fail();
            return true;
        }

        const validKeys = this.DIR_KEYS[currentNode.direction];
        if (validKeys.includes(code)) {
            currentNode.solved = true;
            currentNode.pulseSpring.impulse(4.8);
            this.currentNodeIndex++;

            if (this.currentNodeIndex >= this.nodes.length) {
                this.result = 'success';
                this.resultTimer = 0;
            }
        } else {
            this._fail();
        }

        return true;
    }

    _checkMiss() {
        if (this.currentNodeIndex >= this.nodes.length) return;
        const currentNode = this.nodes[this.currentNodeIndex];
        if (!currentNode || currentNode.solved) return;

        const dist = this._angleDist(this.cursorAngle, currentNode.angle);
        const past = this._isAnglePast(this.cursorAngle, currentNode.angle, this.hitTolerance + 5);

        if (past && dist > this.hitTolerance + 5) {
            this._fail();
        }
    }

    _isAnglePast(cursorAngle, nodeAngle, margin) {
        const diff = ((cursorAngle - nodeAngle) % 360 + 360) % 360;
        return diff > margin && diff < 180;
    }

    _angleDist(a, b) {
        const diff = Math.abs(((a - b) % 360 + 360) % 360);
        return diff > 180 ? 360 - diff : diff;
    }

    _fail() {
        const currentNode = this.nodes[this.currentNodeIndex];
        if (currentNode) {
            currentNode.failed = true;
            currentNode.pulseSpring.impulse(-3.8);
        }
        this.result = 'fail';
        this.resultTimer = 0;
    }

    // ════════════════════════════════════════
    //  RENDER (Modern Glassmorphism & Neon)
    // ════════════════════════════════════════

    render(ctx, cx, cy, ui = null) {
        if (!this.active) return;

        const radius = 142;
        const nodeSize = 36;
        const total = this.nodes.length;
        const solved = this.nodes.filter(n => n.solved).length;
        const frac = total > 0 ? solved / total : 0;

        ctx.save();
        ctx.translate(cx, cy);

        // 0. Frosted circular glass backing plate
        ctx.save();
        const plateGrad = ctx.createRadialGradient(0, -30, 20, 0, 0, radius + 42);
        plateGrad.addColorStop(0, 'rgba(30, 44, 78, 0.55)');
        plateGrad.addColorStop(1, 'rgba(10, 15, 28, 0.85)');
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 26;
        ctx.beginPath();
        ctx.arc(0, 0, radius + 42, 0, Math.PI * 2);
        ctx.fillStyle = plateGrad;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.restore();

        // Outer decorative rotating ring
        ctx.save();
        ctx.rotate(this.cursorAngle * Math.PI / 180 * 0.35);
        ctx.beginPath();
        ctx.arc(0, 0, radius + 24, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.18)';
        ctx.lineWidth = 1;
        ctx.setLineDash([6, 14]);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();

        // Inner decorative counter-rotating ring
        ctx.save();
        ctx.rotate(-this.cursorAngle * Math.PI / 180 * 0.5);
        ctx.beginPath();
        ctx.arc(0, 0, radius - 34, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.14)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 9]);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();

        // 1. Main circular neon track
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Glowing arc progress ring along radius
        if (frac > 0) {
            ctx.save();
            ctx.shadowColor = this.result === 'fail' ? '#ef4444' : '#22c55e';
            ctx.shadowBlur = 14;
            ctx.beginPath();
            ctx.arc(0, 0, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac);
            ctx.strokeStyle = this.result === 'fail' ? '#ef4444' : '#22c55e';
            ctx.lineWidth = 3.5;
            ctx.lineCap = 'round';
            ctx.stroke();
            ctx.restore();
        }

        // 2. Connection polygon lines
        this._drawConnections(ctx, radius);

        // 3. Center frosted core & lock icon
        this._drawLockIcon(ctx);

        // 4. Directional Node Pills
        for (let i = 0; i < this.nodes.length; i++) {
            this._drawNode(ctx, this.nodes[i], i, radius, nodeSize);
        }

        // 5. Rotating Neon Light Scanner Cursor with 25-degree Comet Arc Trail
        if (this.result === null) {
            this._drawCursor(ctx, radius);
        }

        // 6. Sleek capsule progress bar
        this._drawProgressBar(ctx, radius, ui);

        // 7. Start prompt pill
        if (!this.started && this.result === null) {
            if (ui) {
                ui.drawNeonPill(ctx, -125, radius + 76, 250, 26, '#38bdf8', 'PRESS ARROW KEY OR SWIPE TO START', {
                    font: '600 10px Orbitron',
                    glowBlur: 10
                });
            } else {
                ctx.fillStyle = '#94a3b8';
                ctx.font = '600 13px Rajdhani';
                ctx.textAlign = 'center';
                ctx.fillText('Press an arrow key to start', 0, radius + 86);
            }
        }

        // 8. Result banner
        if (this.result !== null) {
            this._drawResult(ctx, radius, ui);
        }

        ctx.restore();
    }

    _drawConnections(ctx, radius) {
        ctx.save();
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.14)';
        ctx.lineWidth = 1;
        for (let i = 0; i < this.nodes.length; i++) {
            const a = this.nodes[i];
            const b = this.nodes[(i + 1) % this.nodes.length];
            const ax = Math.cos(Utils.degToRad(a.angle)) * radius;
            const ay = Math.sin(Utils.degToRad(a.angle)) * radius;
            const bx = Math.cos(Utils.degToRad(b.angle)) * radius;
            const by = Math.sin(Utils.degToRad(b.angle)) * radius;
            ctx.beginPath();
            ctx.moveTo(ax, ay);
            ctx.lineTo(bx, by);
            ctx.stroke();
        }
        ctx.restore();
    }

    _drawLockIcon(ctx) {
        const s = 20;
        const isOpen = this.result === 'success';
        const isFail = this.result === 'fail';
        const color = isOpen ? '#22c55e' : isFail ? '#ef4444' : '#38bdf8';

        ctx.save();
        // Subtle core glass circle
        ctx.beginPath();
        ctx.arc(0, 0, 32, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.shadowColor = color;
        ctx.shadowBlur = 12;
        ctx.fillStyle = isOpen ? 'rgba(34, 197, 94, 0.25)' : 'rgba(56, 189, 248, 0.14)';
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        Utils.roundRect(ctx, -s / 2, -2, s, s * 0.78, 4);
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(0, -2, s * 0.34, Math.PI, 0, false);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.6;
        ctx.stroke();
        ctx.restore();
    }

    _drawNode(ctx, node, index, radius, size) {
        const rad = Utils.degToRad(node.angle);
        const nx = Math.cos(rad) * radius;
        const ny = Math.sin(rad) * radius;
        const half = size / 2;
        const isActive = index === this.currentNodeIndex && this.result === null;
        const scale = node.pulseSpring ? Utils.clamp(node.pulseSpring.value, 0.8, 1.35) : 1;

        ctx.save();
        ctx.translate(nx, ny);
        ctx.scale(scale, scale);

        let bgColor, borderColor, textColor, glowColor;

        if (node.solved) {
            bgColor = 'rgba(34, 197, 94, 0.24)';
            borderColor = '#22c55e';
            textColor = '#f8fafc';
            glowColor = '#22c55e';
        } else if (node.failed) {
            bgColor = 'rgba(239, 68, 68, 0.26)';
            borderColor = '#ef4444';
            textColor = '#fca5a5';
            glowColor = '#ef4444';
        } else if (isActive) {
            bgColor = 'rgba(56, 189, 248, 0.26)';
            borderColor = '#38bdf8';
            textColor = '#ffffff';
            glowColor = '#38bdf8';
        } else {
            bgColor = 'rgba(15, 23, 42, 0.86)';
            borderColor = 'rgba(148, 163, 184, 0.35)';
            textColor = '#64748b';
            glowColor = null;
        }

        if (glowColor) {
            ctx.shadowColor = glowColor;
            ctx.shadowBlur = isActive ? 16 : 12;
        }

        Utils.roundRect(ctx, -half, -half, size, size, 10);
        ctx.fillStyle = bgColor;
        ctx.fill();
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = isActive || node.solved || node.failed ? 2 : 1.2;
        ctx.stroke();

        ctx.shadowBlur = 0;
        ctx.fillStyle = textColor;
        ctx.font = '700 18px Rajdhani';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.DIR_SYMBOLS[node.direction], 0, 1);

        ctx.restore();
    }

    _drawCursor(ctx, radius) {
        const rad = Utils.degToRad(this.cursorAngle);
        const cx = Math.cos(rad) * radius;
        const cy = Math.sin(rad) * radius;
        const currentNode = this.nodes[this.currentNodeIndex];
        const aligned = currentNode && !currentNode.solved && this._angleDist(this.cursorAngle, currentNode.angle) <= this.hitTolerance;
        const cursorColor = aligned ? '#22c55e' : '#38bdf8';

        ctx.save();

        // Comet arc trail (25 degrees trailing behind scanner)
        const trailDeg = 25;
        for (let i = 1; i <= 5; i++) {
            const a0 = Utils.degToRad(this.cursorAngle - (trailDeg * (i - 1)) / 5);
            const a1 = Utils.degToRad(this.cursorAngle - (trailDeg * i) / 5);
            ctx.beginPath();
            ctx.arc(0, 0, radius, a1, a0);
            ctx.strokeStyle = aligned
                ? `rgba(34, 197, 94, ${(1 - i / 6) * 0.7})`
                : `rgba(56, 189, 248, ${(1 - i / 6) * 0.7})`;
            ctx.lineWidth = 5 * (1 - i / 7);
            ctx.lineCap = 'round';
            ctx.stroke();
        }

        // Laser scanner beam from center
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(cx, cy);
        ctx.strokeStyle = aligned ? 'rgba(34, 197, 94, 0.45)' : 'rgba(56, 189, 248, 0.28)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Neon light orb cursor
        ctx.shadowColor = cursorColor;
        ctx.shadowBlur = aligned ? 20 : 14;
        ctx.beginPath();
        ctx.arc(cx, cy, aligned ? 8 : 6.5, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(cx, cy, aligned ? 12 : 10, 0, Math.PI * 2);
        ctx.strokeStyle = cursorColor;
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.restore();
    }

    _drawProgressBar(ctx, radius, ui) {
        const total = this.nodes.length;
        const solved = this.nodes.filter(n => n.solved).length;
        const barW = 160;
        const barH = 6;
        const y = radius + 52;

        ctx.save();
        Utils.roundRect(ctx, -barW / 2, y, barW, barH, 3);
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 0.8;
        ctx.stroke();

        if (solved > 0) {
            ctx.shadowColor = '#38bdf8';
            ctx.shadowBlur = 10;
            ctx.fillStyle = '#38bdf8';
            Utils.roundRect(ctx, -barW / 2, y, barW * (solved / total), barH, 3);
            ctx.fill();
        }

        ctx.shadowBlur = 0;
        ctx.fillStyle = '#94a3b8';
        ctx.font = '600 11px Orbitron';
        ctx.textAlign = 'center';
        ctx.fillText(`${solved} / ${total} NODES`, 0, y + 18);
        ctx.restore();
    }

    _drawResult(ctx, radius, ui) {
        const isSuccess = this.result === 'success';
        const color = isSuccess ? '#22c55e' : '#ef4444';
        const text = isSuccess ? 'ACCESS GRANTED' : 'BREACH FAILED';

        ctx.save();
        if (ui) {
            ui.drawNeonPill(ctx, -110, -radius - 66, 220, 34, color, text, {
                font: '700 15px Orbitron',
                glowBlur: 18,
                textColor: '#f8fafc'
            });
        } else {
            ctx.shadowColor = color;
            ctx.shadowBlur = 12;
            ctx.fillStyle = color;
            ctx.font = '700 20px Orbitron';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(text, 0, -radius - 48);
        }
        ctx.restore();
    }
}
