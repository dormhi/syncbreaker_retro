/* =========================================
   PhysicsEngine.js — Custom 2D Physics Engine
   Spring-Damper dynamics, Slider kinematics,
   Coupled 1D Wave Bar, Camera Recoil & 2D Debris
   ========================================= */

/**
 * 1D Spring-Damper oscillator following Hooke's Law with viscous damping:
 *   a = (-k * (x - target) - c * v) / m
 */
class Spring1D {
    constructor(initial = 0, stiffness = 180, damping = 18, mass = 1) {
        this.value = initial;
        this.target = initial;
        this.velocity = 0;
        this.stiffness = stiffness;
        this.damping = damping;
        this.mass = Math.max(0.01, mass);
    }

    update(dt) {
        if (!dt || dt <= 0) return this.value;
        const step = Math.min(dt, 0.05);
        const displacement = this.value - this.target;
        const springForce = -this.stiffness * displacement;
        const dampingForce = -this.damping * this.velocity;
        const acceleration = (springForce + dampingForce) / this.mass;

        // Semi-implicit Euler integration for numerical stability
        this.velocity += acceleration * step;
        this.value += this.velocity * step;
        return this.value;
    }

    setTarget(target) {
        this.target = target;
    }

    impulse(force) {
        this.velocity += force / this.mass;
    }

    snap(val) {
        this.value = val;
        this.target = val;
        this.velocity = 0;
    }
}

/**
 * 2D Spring-Damper wrapping independent X and Y springs.
 */
class Spring2D {
    constructor(ix = 0, iy = 0, stiffness = 180, damping = 18, mass = 1) {
        this.x = new Spring1D(ix, stiffness, damping, mass);
        this.y = new Spring1D(iy, stiffness, damping, mass);
    }

    update(dt) {
        this.x.update(dt);
        this.y.update(dt);
    }

    setTarget(x, y) {
        this.x.setTarget(x);
        this.y.setTarget(y);
    }

    impulse(fx, fy) {
        this.x.impulse(fx);
        this.y.impulse(fy);
    }

    snap(x, y) {
        this.x.snap(x);
        this.y.snap(y);
    }
}

/**
 * Physical Camera Recoil & Trauma Shake controller.
 */
class CameraPhysics {
    constructor() {
        this.offset = new Spring2D(0, 0, 260, 16, 1);
        this.angle = new Spring1D(0, 220, 15, 1);
        this.trauma = 0;
        this._shakePhase = 0;
    }

    impulse(fx, fy, torque = 0, traumaAdd = 0) {
        this.offset.impulse(fx, fy);
        this.angle.impulse(torque);
        this.trauma = Math.min(1, this.trauma + traumaAdd);
    }

    update(dt) {
        if (!dt || dt <= 0) return;
        const step = Math.min(dt, 0.05);
        this.offset.update(step);
        this.angle.update(step);
        this.trauma = Math.max(0, this.trauma - step * 1.9);
        this._shakePhase += step * 52;
    }

    applyTransform(ctx, cx, cy) {
        ctx.save();
        const shakeMag = this.trauma * this.trauma * 7;
        const sx = shakeMag > 0.01 ? Math.sin(this._shakePhase * 1.3) * shakeMag : 0;
        const sy = shakeMag > 0.01 ? Math.cos(this._shakePhase * 1.7) * shakeMag : 0;
        const sRot = shakeMag > 0.01 ? Math.sin(this._shakePhase * 0.9) * (this.trauma * this.trauma * 0.008) : 0;

        ctx.translate(cx + this.offset.x.value + sx, cy + this.offset.y.value + sy);
        ctx.rotate(this.angle.value * (Math.PI / 180) + sRot);
        ctx.translate(-cx, -cy);
    }

    restoreTransform(ctx) {
        ctx.restore();
    }
}

/**
 * Timing Bar Slider Kinematics, Momentum, Squash-Stretch & Elastic Wall Bounce.
 */
class SliderPhysics {
    constructor() {
        this.position = 0;
        this.velocity = 1;
        this.direction = 1;
        this.targetSpeed = 1;
        this.accel = 14;

        this.squashX = new Spring1D(1, 320, 16, 1);
        this.squashY = new Spring1D(1, 320, 16, 1);
        this.leftBumperSpring = new Spring1D(0, 300, 18, 1);
        this.rightBumperSpring = new Spring1D(0, 300, 18, 1);
        this.trail = [];
        this._time = 0;
    }

    reset(speed = 1) {
        this.position = 0;
        this.direction = 1;
        this.targetSpeed = speed;
        this.velocity = speed;
        this.trail = [];
        this._time = 0;
        this.squashX.snap(1);
        this.squashY.snap(1);
        this.leftBumperSpring.snap(0);
        this.rightBumperSpring.snap(0);
    }

    update(dt, onBounce = null) {
        if (!dt || dt <= 0) return;
        const step = Math.min(dt, 0.05);
        this._time += step;

        // Smooth acceleration toward target velocity
        const desiredVel = this.direction * this.targetSpeed;
        this.velocity += (desiredVel - this.velocity) * Math.min(1, this.accel * step);

        // Integrate position
        this.position += this.velocity * step;

        // Elastic boundary reflection
        if (this.position >= 1) {
            this.position = 1;
            this.direction = -1;
            this.velocity = this.direction * this.targetSpeed * 0.92;
            this.squashX.impulse(-2.8);
            this.squashY.impulse(2.4);
            this.rightBumperSpring.impulse(9.5);
            if (onBounce) onBounce(1);
        } else if (this.position <= 0) {
            this.position = 0;
            this.direction = 1;
            this.velocity = this.direction * this.targetSpeed * 0.92;
            this.squashX.impulse(-2.8);
            this.squashY.impulse(2.4);
            this.leftBumperSpring.impulse(9.5);
            if (onBounce) onBounce(0);
        }

        // Update physical springs
        this.squashX.update(step);
        this.squashY.update(step);
        this.leftBumperSpring.update(step);
        this.rightBumperSpring.update(step);

        // Decay trail samples and record current fluid position
        for (let i = this.trail.length - 1; i >= 0; i--) {
            this.trail[i].alpha -= step * 4.8;
            if (this.trail[i].alpha <= 0.02) {
                this.trail.splice(i, 1);
            }
        }

        this.trail.unshift({
            pos: this.position,
            yOffset: Math.sin(this._time * 24) * 1.4,
            alpha: 1,
            width: 8 + Math.min(10, Math.abs(this.velocity) * 3)
        });

        if (this.trail.length > 18) {
            this.trail.length = 18;
        }
    }

    triggerHitImpulse(result) {
        if (result === 'perfect') {
            this.squashX.impulse(3.5);
            this.squashY.impulse(-2.0);
        } else if (result === 'good') {
            this.squashX.impulse(2.2);
            this.squashY.impulse(-1.6);
        } else {
            this.squashX.impulse(-2.4);
            this.squashY.impulse(2.2);
        }
    }
}

/**
 * 1D Coupled Spring Oscillator along the Timing Bar.
 * Propagates smooth kinetic ripples on hits, movement, and edge bounces.
 */
class WaveBarPhysics {
    constructor(nodeCount = 48) {
        this.nodeCount = nodeCount;
        this.nodes = [];
        this.stiffness = 210;
        this.damping = 9;
        this.spread = 240;
        this.reset();
    }

    reset() {
        this.nodes = [];
        for (let i = 0; i < this.nodeCount; i++) {
            this.nodes.push({ y: 0, vy: 0 });
        }
    }

    update(dt) {
        if (!dt || dt <= 0) return;
        const step = Math.min(dt, 0.04);
        const subSteps = 2;
        const subDt = step / subSteps;
        const n = this.nodeCount;

        for (let s = 0; s < subSteps; s++) {
            // 1. Local spring restoring force + damping
            for (let i = 0; i < n; i++) {
                const node = this.nodes[i];
                const acc = -this.stiffness * node.y - this.damping * node.vy;
                node.vy += acc * subDt;
                node.y += node.vy * subDt;
            }

            // 2. Coupled wave neighbor tension
            const deltas = new Array(n).fill(0);
            for (let i = 0; i < n; i++) {
                const leftY = i > 0 ? this.nodes[i - 1].y : 0;
                const rightY = i < n - 1 ? this.nodes[i + 1].y : 0;
                const laplacian = leftY + rightY - 2 * this.nodes[i].y;
                deltas[i] = this.spread * laplacian * subDt;
            }

            for (let i = 0; i < n; i++) {
                this.nodes[i].vy += deltas[i];
            }

            // Pin endpoints gently so the bar sits cleanly inside its bumpers
            this.nodes[0].y *= 0.5;
            this.nodes[n - 1].y *= 0.5;
        }
    }

    pluck(normPos, force, radiusNodes = 4) {
        const centerIdx = Math.max(0, Math.min(this.nodeCount - 1, normPos * (this.nodeCount - 1)));
        const sigmaSq = Math.max(0.5, radiusNodes * radiusNodes * 0.45);
        const start = Math.max(0, Math.floor(centerIdx - radiusNodes * 2));
        const end = Math.min(this.nodeCount - 1, Math.ceil(centerIdx + radiusNodes * 2));

        for (let i = start; i <= end; i++) {
            const dist = i - centerIdx;
            const weight = Math.exp(-(dist * dist) / (2 * sigmaSq));
            this.nodes[i].vy += force * weight;
        }
    }
}

/**
 * 2D Rigid-Body Debris & Shockwave Simulation.
 * Handles glass/neon shard kinematics, gravity, drag, angular velocity, and floor restitution.
 */
class PhysicsWorld2D {
    constructor() {
        this.debris = [];
        this.shockwaves = [];
    }

    clear() {
        this.debris = [];
        this.shockwaves = [];
    }

    spawnShatter(x, y, color, count = 12, options = {}) {
        const speed = options.speed || 200;
        const floorY = options.floorY !== undefined ? options.floorY : y + 100;
        const gravity = options.gravity !== undefined ? options.gravity : 460;

        for (let i = 0; i < count; i++) {
            const angle = -Math.PI + Math.random() * Math.PI * 2;
            const launchSpeed = speed * (0.35 + Math.random() * 0.85);
            const vx = Math.cos(angle) * launchSpeed;
            const vy = Math.sin(angle) * launchSpeed - 85 - Math.random() * 90;
            const maxLife = 0.75 + Math.random() * 0.55;

            this.debris.push({
                x: x + (Math.random() - 0.5) * 14,
                y: y + (Math.random() - 0.5) * 10,
                vx,
                vy,
                angle: Math.random() * Math.PI * 2,
                angularVel: (Math.random() - 0.5) * 16,
                w: 5 + Math.random() * 9,
                h: 3 + Math.random() * 6,
                shape: Math.random() > 0.45 ? 'shard' : 'capsule',
                color,
                alpha: 1,
                life: maxLife,
                maxLife,
                gravity,
                drag: 0.985,
                restitution: 0.58,
                floorY
            });
        }
    }

    spawnShockwave(x, y, color, maxRadius = 110, speed = 280) {
        this.shockwaves.push({
            x,
            y,
            radius: 6,
            maxRadius,
            speed,
            color,
            alpha: 0.95,
            lineWidth: 3.5
        });
    }

    update(dt) {
        if (!dt || dt <= 0) return;
        const step = Math.min(dt, 0.05);
        const dragFactor = Math.pow(0.985, step * 60);

        for (let i = this.debris.length - 1; i >= 0; i--) {
            const d = this.debris[i];
            d.vy += d.gravity * step;
            d.vx *= dragFactor;
            d.vy *= dragFactor;

            d.x += d.vx * step;
            d.y += d.vy * step;
            d.angle += d.angularVel * step;

            // Floor / rail collision bounce with restitution
            if (d.y >= d.floorY && d.vy > 0) {
                d.y = d.floorY;
                d.vy = -d.vy * d.restitution;
                d.vx *= 0.82;
                d.angularVel *= 0.7;
                if (Math.abs(d.vy) < 18) {
                    d.vy = 0;
                }
            }

            d.life -= step;
            d.alpha = Math.max(0, d.life / d.maxLife);
            if (d.life <= 0) {
                this.debris.splice(i, 1);
            }
        }

        for (let i = this.shockwaves.length - 1; i >= 0; i--) {
            const sw = this.shockwaves[i];
            sw.radius += sw.speed * step;
            sw.speed *= Math.pow(0.93, step * 60);
            const progress = sw.radius / sw.maxRadius;
            sw.alpha = Math.max(0, 1 - progress);
            sw.lineWidth = Math.max(0.8, 3.5 * (1 - progress * 0.75));
            if (sw.radius >= sw.maxRadius || sw.alpha <= 0.01) {
                this.shockwaves.splice(i, 1);
            }
        }
    }

    render(ctx) {
        // Shockwave rings
        for (const sw of this.shockwaves) {
            ctx.save();
            ctx.globalAlpha = sw.alpha;
            ctx.strokeStyle = sw.color;
            ctx.lineWidth = sw.lineWidth;
            ctx.shadowColor = sw.color;
            ctx.shadowBlur = 14;
            ctx.beginPath();
            ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        // Glass / neon debris shards
        for (const d of this.debris) {
            ctx.save();
            ctx.globalAlpha = d.alpha;
            ctx.translate(d.x, d.y);
            ctx.rotate(d.angle);
            ctx.shadowColor = d.color;
            ctx.shadowBlur = 10;

            if (d.shape === 'shard') {
                ctx.beginPath();
                ctx.moveTo(-d.w * 0.6, -d.h * 0.4);
                ctx.lineTo(d.w * 0.5, -d.h * 0.25);
                ctx.lineTo(d.w * 0.4, d.h * 0.5);
                ctx.lineTo(-d.w * 0.35, d.h * 0.35);
                ctx.closePath();
                ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
                ctx.fill();
                ctx.strokeStyle = d.color;
                ctx.lineWidth = 1.4;
                ctx.stroke();
            } else {
                Utils.roundRect(ctx, -d.w * 0.5, -d.h * 0.5, d.w, d.h, d.h * 0.5);
                ctx.fillStyle = d.color;
                ctx.fill();
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
                ctx.lineWidth = 0.8;
                ctx.stroke();
            }

            ctx.restore();
        }
    }
}

if (typeof window !== 'undefined') {
    window.PhysicsEngine = {
        Spring1D,
        Spring2D,
        CameraPhysics,
        SliderPhysics,
        WaveBarPhysics,
        PhysicsWorld2D
    };
}
