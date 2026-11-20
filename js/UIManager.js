/* =========================================
   UIManager.js — Modern Glassmorphism & Neon UI
   Spring-animated frosted glass panels, capsules & HUD
   ========================================= */

class UIManager {
    constructor(ctx, canvas) {
        this.ctx = ctx;
        this.canvas = canvas;
        this.buttons = [];
        this.mouseX = 0;
        this.mouseY = 0;
        this._time = 0;

        // HUD spring feedback state
        this._lastCombo = 0;
        this._comboSpring = new Spring1D(1, 320, 14, 1);
        this._scoreSpring = new Spring1D(1, 280, 16, 1);
        this._lastScore = 0;
    }

    // ── Glassmorphism Drawing Primitives ──

    drawGlassPanel(ctx, x, y, w, h, opts = {}) {
        const r = opts.radius !== undefined ? opts.radius : 14;
        const borderColor = opts.borderColor || 'rgba(255, 255, 255, 0.12)';
        const borderWidth = opts.borderWidth || 1;

        ctx.save();

        // Optional outer drop shadow / neon bloom
        if (opts.glowColor) {
            ctx.shadowColor = opts.glowColor;
            ctx.shadowBlur = opts.glowBlur !== undefined ? opts.glowBlur : 18;
        } else {
            ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
            ctx.shadowBlur = 16;
            ctx.shadowOffsetY = 6;
        }

        // Base multi-stop translucent glass fill
        const grad = ctx.createLinearGradient(x, y, x, y + h);
        grad.addColorStop(0, opts.topBg || 'rgba(22, 33, 58, 0.68)');
        grad.addColorStop(1, opts.bottomBg || 'rgba(10, 15, 28, 0.84)');

        Utils.roundRect(ctx, x, y, w, h, r);
        ctx.fillStyle = grad;
        ctx.fill();

        // Reset shadow for crisp strokes and highlights
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;

        // Subtle inner accent tint gradient
        if (opts.accentColor) {
            ctx.save();
            Utils.roundRect(ctx, x, y, w, h, r);
            ctx.clip();

            const accentGrad = ctx.createLinearGradient(x, y, x + w, y + h);
            accentGrad.addColorStop(0, this._withAlpha(opts.accentColor, opts.accentAlpha || 0.16));
            accentGrad.addColorStop(0.55, this._withAlpha(opts.accentColor, 0.03));
            accentGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = accentGrad;
            ctx.fillRect(x, y, w, h);
            ctx.restore();
        }

        // Crisp outer glass border
        Utils.roundRect(ctx, x, y, w, h, r);
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = borderWidth;
        ctx.stroke();

        // Top specular edge highlight
        const inset = Math.min(r, w * 0.25);
        if (w > inset * 2 + 8) {
            ctx.beginPath();
            ctx.moveTo(x + inset, y + 1);
            ctx.lineTo(x + w - inset, y + 1);
            ctx.strokeStyle = opts.highlightColor || 'rgba(255, 255, 255, 0.26)';
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        ctx.restore();
    }

    drawNeonPill(ctx, x, y, w, h, color, text, opts = {}) {
        const r = h / 2;
        ctx.save();

        if (opts.glow !== false) {
            ctx.shadowColor = color;
            ctx.shadowBlur = opts.glowBlur || 12;
        }

        Utils.roundRect(ctx, x, y, w, h, r);
        ctx.fillStyle = opts.bg || this._withAlpha(color, 0.16);
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.strokeStyle = opts.border || this._withAlpha(color, 0.75);
        ctx.lineWidth = opts.lineWidth || 1;
        ctx.stroke();

        if (text) {
            ctx.fillStyle = opts.textColor || color;
            ctx.font = opts.font || '600 11px Orbitron';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(text, x + w / 2, y + h / 2 + 0.5);
        }

        ctx.restore();
    }

    // ── Button System ──

    addButton(id, label, x, y, w, h, onClick, style = {}) {
        this.buttons.push({
            id,
            label,
            x,
            y,
            w,
            h,
            onClick,
            color: style.color || '#38bdf8',
            disabled: style.disabled || false,
            subtitle: style.subtitle || null,
            badge: style.badge || null,
            icon: style.icon || null,
            bestScore: style.bestScore || 0,
            scaleSpring: new Spring1D(0.88, 260, 18, 1),
            hoverSpring: new Spring1D(0, 220, 20, 1)
        });
        const btn = this.buttons[this.buttons.length - 1];
        btn.scaleSpring.setTarget(1.0);
    }

    clearButtons() {
        this.buttons = [];
    }

    updateMouse(x, y) {
        this.mouseX = x;
        this.mouseY = y;
    }

    update(dt) {
        this._time += dt || 0;
        this._comboSpring.update(dt);
        this._scoreSpring.update(dt);

        for (const btn of this.buttons) {
            const hovered = !btn.disabled && this.isHovered(btn);
            btn.hoverSpring.setTarget(hovered ? 1 : 0);
            btn.scaleSpring.setTarget(hovered ? 1.045 : 1.0);
            btn.hoverSpring.update(dt);
            btn.scaleSpring.update(dt);
        }
    }

    handleClick(x, y) {
        for (const btn of this.buttons) {
            if (btn.disabled) continue;
            const inX = x >= btn.x - btn.w / 2 && x <= btn.x + btn.w / 2;
            const inY = y >= btn.y - btn.h / 2 && y <= btn.y + btn.h / 2;
            if (inX && inY) {
                btn.scaleSpring.impulse(-1.8);
                btn.onClick();
                return true;
            }
        }
        return false;
    }

    isHovered(btn) {
        const inX = this.mouseX >= btn.x - btn.w / 2 && this.mouseX <= btn.x + btn.w / 2;
        const inY = this.mouseY >= btn.y - btn.h / 2 && this.mouseY <= btn.y + btn.h / 2;
        return inX && inY;
    }

    // ── Render ──

    renderButtons() {
        const ctx = this.ctx;
        for (const btn of this.buttons) {
            const hovered = !btn.disabled && this.isHovered(btn);
            const hVal = btn.hoverSpring ? btn.hoverSpring.value : (hovered ? 1 : 0);
            const sVal = btn.scaleSpring ? btn.scaleSpring.value : 1;
            const alpha = btn.disabled ? 0.38 : 1;

            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.translate(btn.x, btn.y);
            ctx.scale(sVal, sVal);

            const left = -btn.w / 2;
            const top = -btn.h / 2;
            const isCard = btn.h >= 65;
            const radius = isCard ? 16 : Math.min(btn.h / 2, 14);

            this.drawGlassPanel(ctx, left, top, btn.w, btn.h, {
                radius,
                topBg: hovered ? 'rgba(30, 44, 78, 0.78)' : 'rgba(18, 28, 50, 0.66)',
                bottomBg: 'rgba(10, 15, 28, 0.86)',
                accentColor: btn.color,
                accentAlpha: 0.1 + hVal * 0.14,
                borderColor: this._withAlpha(btn.color, 0.35 + hVal * 0.55),
                borderWidth: hovered ? 1.5 : 1,
                glowColor: !btn.disabled && hVal > 0.05 ? this._withAlpha(btn.color, 0.45 * hVal) : null,
                glowBlur: 18 * hVal
            });

            if (isCard) {
                // Card layout (e.g., HUB node cards)
                if (btn.badge) {
                    const badgeW = Math.min(btn.w - 24, Math.max(76, btn.badge.length * 7 + 18));
                    this.drawNeonPill(
                        ctx,
                        left + 12,
                        top + 10,
                        badgeW,
                        18,
                        btn.color,
                        btn.badge,
                        { font: '700 9px Orbitron', glow: !btn.disabled }
                    );
                }

                if (btn.bestScore > 0) {
                    ctx.fillStyle = '#94a3b8';
                    ctx.font = '600 10px Rajdhani';
                    ctx.textAlign = 'right';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(`BEST ${btn.bestScore}`, left + btn.w - 12, top + 19);
                }

                // Title
                ctx.fillStyle = '#f8fafc';
                ctx.font = '700 14px Orbitron';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';
                ctx.fillText(btn.label, left + 14, btn.badge ? top + 42 : -6);

                // Subtitle
                if (btn.subtitle) {
                    ctx.fillStyle = '#94a3b8';
                    ctx.font = '500 12px Rajdhani';
                    ctx.fillText(btn.subtitle, left + 14, btn.badge ? top + 62 : 14);
                }

                // Bottom neon indicator strip
                ctx.save();
                ctx.fillStyle = this._withAlpha(btn.color, 0.45 + hVal * 0.55);
                if (!btn.disabled) {
                    ctx.shadowColor = btn.color;
                    ctx.shadowBlur = 8;
                }
                Utils.roundRect(ctx, left + 14, top + btn.h - 4, btn.w - 28, 2.5, 1.5);
                ctx.fill();
                ctx.restore();
            } else {
                // Sleek capsule / pill button layout
                const hasSubtitle = btn.subtitle && btn.h >= 46;

                if (!btn.disabled) {
                    ctx.shadowColor = btn.color;
                    ctx.shadowBlur = 6 + hVal * 10;
                }
                ctx.fillStyle = hovered ? '#f8fafc' : btn.color;
                ctx.font = '700 14px Orbitron';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(btn.label, 0, hasSubtitle ? -7 : 0.5);

                if (hasSubtitle) {
                    ctx.shadowBlur = 0;
                    ctx.fillStyle = '#94a3b8';
                    ctx.font = '500 12px Rajdhani';
                    ctx.fillText(btn.subtitle, 0, 12);
                }
            }

            ctx.restore();
        }
    }

    renderEnergyBar(energy) {
        const ctx = this.ctx;
        const W = this.canvas.width;
        const panelW = 217;
        const panelH = 50;
        const px = W - panelW - 18;
        const py = 14;

        ctx.save();

        this.drawGlassPanel(ctx, px, py, panelW, panelH, {
            radius: 14,
            accentColor: '#38bdf8',
            accentAlpha: 0.12,
            borderColor: 'rgba(56, 189, 248, 0.25)'
        });

        // Header row: label + regen timer
        ctx.fillStyle = '#94a3b8';
        ctx.font = '700 9px Orbitron';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText('ENERGY CORE', px + 14, py + 14);

        const isFull = energy.current >= energy.max;
        const statusText = isFull ? 'MAX' : `+1 IN ${Utils.formatTime(energy.nextRegenIn)}`;
        ctx.fillStyle = isFull ? '#22c55e' : '#38bdf8';
        ctx.font = '600 10px Orbitron';
        ctx.textAlign = 'right';
        ctx.fillText(statusText, px + panelW - 14, py + 14);

        // 7 sleek glowing liquid-neon capsule cells
        const cellW = 22;
        const cellH = 12;
        const gap = 5;
        const startX = px + 14;
        const cellY = py + 28;

        for (let i = 0; i < energy.max; i++) {
            const cx = startX + i * (cellW + gap);
            const filled = i < energy.current;

            if (filled) {
                ctx.save();
                ctx.shadowColor = '#38bdf8';
                ctx.shadowBlur = 10;
                const cellGrad = ctx.createLinearGradient(cx, cellY, cx, cellY + cellH);
                cellGrad.addColorStop(0, '#38bdf8');
                cellGrad.addColorStop(1, '#3b82f6');
                Utils.roundRect(ctx, cx, cellY, cellW, cellH, 4);
                ctx.fillStyle = cellGrad;
                ctx.fill();

                // Inner white core highlight
                ctx.shadowBlur = 0;
                ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
                Utils.roundRect(ctx, cx + 3, cellY + 2, cellW - 6, 3, 1.5);
                ctx.fill();
                ctx.restore();
            } else {
                Utils.roundRect(ctx, cx, cellY, cellW, cellH, 4);
                ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
                ctx.fill();
                ctx.strokeStyle = 'rgba(148, 163, 184, 0.18)';
                ctx.lineWidth = 1;
                ctx.stroke();
            }
        }

        ctx.restore();
    }

    renderScore(score, combo) {
        const ctx = this.ctx;
        const px = 18;
        const py = 14;
        const panelW = 190;
        const panelH = 56;

        if (combo > this._lastCombo) {
            this._comboSpring.impulse(3.5);
        }
        this._lastCombo = combo;

        if (score > this._lastScore) {
            this._scoreSpring.impulse(1.6);
        }
        this._lastScore = score;

        ctx.save();

        this.drawGlassPanel(ctx, px, py, panelW, panelH, {
            radius: 14,
            accentColor: combo > 1 ? '#f59e0b' : '#38bdf8',
            accentAlpha: 0.12,
            borderColor: combo > 1 ? 'rgba(245, 158, 11, 0.35)' : 'rgba(255, 255, 255, 0.14)'
        });

        // Label
        ctx.fillStyle = '#94a3b8';
        ctx.font = '700 9px Orbitron';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText('SYSTEM SCORE', px + 14, py + 10);

        // 6-digit score with dim leading zeros and bright active digits
        const scoreStr = score.toString().padStart(6, '0');
        let firstNonZero = scoreStr.search(/[^0]/);
        if (firstNonZero === -1) firstNonZero = scoreStr.length - 1;

        const leadZeros = scoreStr.slice(0, firstNonZero);
        const activeDigits = scoreStr.slice(firstNonZero);

        ctx.save();
        const sScale = Utils.clamp(this._scoreSpring.value, 0.95, 1.12);
        ctx.translate(px + 14, py + 36);
        ctx.scale(sScale, sScale);
        ctx.font = '700 22px Orbitron';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';

        const leadW = leadZeros ? ctx.measureText(leadZeros).width : 0;
        if (leadZeros) {
            ctx.fillStyle = 'rgba(148, 163, 184, 0.3)';
            ctx.fillText(leadZeros, 0, 0);
        }

        ctx.shadowColor = 'rgba(56, 189, 248, 0.65)';
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#f8fafc';
        ctx.fillText(activeDigits, leadW, 0);
        ctx.restore();

        // Combo capsule pill
        if (combo > 1) {
            ctx.save();
            const cScale = Utils.clamp(this._comboSpring.value, 0.9, 1.35);
            const pillX = px + panelW + 10;
            const pillY = py + panelH / 2;
            ctx.translate(pillX + 46, pillY);
            ctx.scale(cScale, cScale);
            this.drawNeonPill(
                ctx,
                -46,
                -13,
                92,
                26,
                '#f59e0b',
                `COMBO x${combo}`,
                { font: '700 11px Orbitron', glowBlur: 14, textColor: '#fbbf24' }
            );
            ctx.restore();
        }

        ctx.restore();
    }

    _withAlpha(hexOrColor, alpha) {
        if (!hexOrColor || typeof hexOrColor !== 'string') {
            return `rgba(56, 189, 248, ${alpha})`;
        }
        if (hexOrColor.startsWith('#')) {
            let hex = hexOrColor.slice(1);
            if (hex.length === 3) {
                hex = hex.split('').map(c => c + c).join('');
            }
            const num = parseInt(hex, 16);
            if (!Number.isNaN(num)) {
                const r = (num >> 16) & 255;
                const g = (num >> 8) & 255;
                const b = num & 255;
                return `rgba(${r}, ${g}, ${b}, ${alpha})`;
            }
        }
        return hexOrColor;
    }
}
