import JSZip from "jszip";
import { saveAs } from "file-saver";
import { Scene } from "../types";

export const exportGame = async (scene: Scene) => {
  const zip = new JSZip();

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Exported Game</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            background-color: orange;
            overflow: hidden;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            width: 100vw;
            touch-action: none;
        }
        #game-container {
            position: relative;
            width: 100%;
            height: 100%;
            display: flex;
            justify-content: center;
            align-items: center;
        }
        canvas {
            background-color: ${scene.backgroundColor};
            object-fit: contain;
            max-width: 100%;
            max-height: 100%;
        }
        #touch-controls {
            position: absolute;
            inset: 0;
            pointer-events: none;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            padding: 32px;
            z-index: 50;
        }
        .joystick-area {
            position: relative;
            width: 128px;
            height: 128px;
            background-color: rgba(31, 41, 55, 0.5);
            border-radius: 50%;
            border: 2px solid rgba(75, 85, 99, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            pointer-events: auto;
            touch-action: none;
        }
        .joystick-knob {
            width: 48px;
            height: 48px;
            background-color: rgba(6, 182, 212, 0.8);
            border-radius: 50%;
            position: absolute;
            box-shadow: 0 10px 15px -3px rgba(6, 182, 212, 0.5);
        }
        .action-button {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 24px;
            color: #22d3ee;
            background-color: rgba(31, 41, 55, 0.8);
            border: 2px solid rgba(6, 182, 212, 0.5);
            pointer-events: auto;
            touch-action: none;
            user-select: none;
        }
        .action-button:active {
            background-color: #0891b2;
            color: white;
            transform: scale(0.95);
        }
    </style>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/matter-js/0.19.0/matter.min.js"></script>
</head>
<body>
    <div id="game-container">
        <canvas id="gameCanvas"></canvas>
        <div id="touch-controls">
            <div class="joystick-area" id="joystick">
                <div class="joystick-knob" id="joystick-knob"></div>
            </div>
            <button class="action-button" id="action-btn">A</button>
        </div>
    </div>

    <script>
        // --- Object Pool ---
        class ObjectPool {
            constructor(factory, reset, initialSize = 0) {
                this.pool = [];
                this.factory = factory;
                this.reset = reset;
                for (let i = 0; i < initialSize; i++) {
                    this.pool.push(this.factory());
                }
            }
            get() {
                if (this.pool.length > 0) {
                    const obj = this.pool.pop();
                    this.reset(obj);
                    return obj;
                }
                return this.factory();
            }
            release(obj) {
                this.pool.push(obj);
            }
            clear() {
                this.pool = [];
            }
        }

        // --- Sound Manager ---
        class SoundManager {
            constructor() {
                this.audioContext = null;
                this.buffers = new Map();
                this.bgmSource = null;
                this.bgmGain = null;
                this.sfxGain = null;
                this.isUnlocked = false;
            }
            init() {
                if (this.audioContext) return;
                const AudioContextClass = window.AudioContext || window.webkitAudioContext;
                if (!AudioContextClass) return;
                this.audioContext = new AudioContextClass();
                this.bgmGain = this.audioContext.createGain();
                this.bgmGain.connect(this.audioContext.destination);
                this.sfxGain = this.audioContext.createGain();
                this.sfxGain.connect(this.audioContext.destination);
                this.unlockAudioContext();
            }
            unlockAudioContext() {
                if (this.isUnlocked || !this.audioContext) return;
                const unlock = () => {
                    if (!this.audioContext) return;
                    if (this.audioContext.state === 'suspended') this.audioContext.resume();
                    const buffer = this.audioContext.createBuffer(1, 1, 22050);
                    const source = this.audioContext.createBufferSource();
                    source.buffer = buffer;
                    source.connect(this.audioContext.destination);
                    source.start(0);
                    this.isUnlocked = true;
                    document.removeEventListener('touchstart', unlock);
                    document.removeEventListener('touchend', unlock);
                    document.removeEventListener('click', unlock);
                };
                document.addEventListener('touchstart', unlock, false);
                document.addEventListener('touchend', unlock, false);
                document.addEventListener('click', unlock, false);
            }
            async loadSound(url, id) {
                if (!this.audioContext) this.init();
                if (!this.audioContext) return;
                try {
                    const response = await fetch(url);
                    const arrayBuffer = await response.arrayBuffer();
                    const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
                    this.buffers.set(id, audioBuffer);
                } catch (e) { console.error(e); }
            }
            playSFX(id, volume = 1.0) {
                if (!this.audioContext || !this.isUnlocked) return;
                const buffer = this.buffers.get(id);
                if (!buffer || !this.sfxGain) return;
                const source = this.audioContext.createBufferSource();
                source.buffer = buffer;
                const gainNode = this.audioContext.createGain();
                gainNode.gain.value = volume;
                source.connect(gainNode);
                gainNode.connect(this.sfxGain);
                source.start(0);
            }
            playBGM(id, volume = 1.0, loop = true) {
                if (!this.audioContext || !this.isUnlocked) return;
                const buffer = this.buffers.get(id);
                if (!buffer || !this.bgmGain) return;
                this.stopBGM();
                this.bgmSource = this.audioContext.createBufferSource();
                this.bgmSource.buffer = buffer;
                this.bgmSource.loop = loop;
                this.bgmGain.gain.value = volume;
                this.bgmSource.connect(this.bgmGain);
                this.bgmSource.start(0);
            }
            stopBGM() {
                if (this.bgmSource) {
                    try { this.bgmSource.stop(); } catch (e) {}
                    this.bgmSource = null;
                }
            }
            setBGMVolume(volume) { if (this.bgmGain) this.bgmGain.gain.value = Math.max(0, Math.min(1, volume)); }
            setSFXVolume(volume) { if (this.sfxGain) this.sfxGain.gain.value = Math.max(0, Math.min(1, volume)); }
        }
        const soundManager = new SoundManager();

        // --- Capacitor Bridge Example ---
        const bridge = {
            vibrate: () => {
                if (window.Capacitor && window.Capacitor.Plugins.Haptics) {
                    window.Capacitor.Plugins.Haptics.vibrate();
                } else if (navigator.vibrate) {
                    navigator.vibrate(200);
                }
            }
        };

        const scene = ${JSON.stringify(scene)};
        const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');
        
        // Target resolution (e.g., 1920x1080)
        const TARGET_WIDTH = 1920;
        const TARGET_HEIGHT = 1080;
        
        // Aspect Ratio & Scaling (Letterboxing)
        function resizeCanvas() {
            const windowRatio = window.innerWidth / window.innerHeight;
            const targetRatio = TARGET_WIDTH / TARGET_HEIGHT;
            
            let drawWidth, drawHeight;
            
            if (windowRatio < targetRatio) {
                // Screen is narrower than target
                drawWidth = window.innerWidth;
                drawHeight = window.innerWidth / targetRatio;
            } else {
                // Screen is wider than target
                drawHeight = window.innerHeight;
                drawWidth = window.innerHeight * targetRatio;
            }
            
            canvas.style.width = drawWidth + 'px';
            canvas.style.height = drawHeight + 'px';
            
            // Internal resolution stays the same
            canvas.width = TARGET_WIDTH;
            canvas.height = TARGET_HEIGHT;
        }
        
        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();

        // Input State
        const input = { x: 0, y: 0, action: false };

        // Virtual Joystick Logic
        const joystick = document.getElementById('joystick');
        const knob = document.getElementById('joystick-knob');
        const actionBtn = document.getElementById('action-btn');
        const maxRadius = 50;
        let joystickCenter = { x: 0, y: 0 };
        let isDragging = false;

        joystick.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const rect = joystick.getBoundingClientRect();
            joystickCenter = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
            isDragging = true;
            handleJoystickMove(e);
        }, { passive: false });

        joystick.addEventListener('touchmove', handleJoystickMove, { passive: false });
        
        function handleJoystickMove(e) {
            if (!isDragging) return;
            e.preventDefault();
            const touch = Array.from(e.touches).find(t => t.clientX < window.innerWidth / 2);
            if (!touch) return;

            let dx = touch.clientX - joystickCenter.x;
            let dy = touch.clientY - joystickCenter.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist > maxRadius) {
                dx = (dx / dist) * maxRadius;
                dy = (dy / dist) * maxRadius;
            }

            knob.style.transform = \`translate(\${dx}px, \${dy}px)\`;
            input.x = dx / maxRadius;
            input.y = dy / maxRadius;
        }

        joystick.addEventListener('touchend', (e) => {
            e.preventDefault();
            isDragging = false;
            knob.style.transform = 'translate(0px, 0px)';
            input.x = 0;
            input.y = 0;
        });

        actionBtn.addEventListener('touchstart', (e) => { e.preventDefault(); input.action = true; });
        actionBtn.addEventListener('touchend', (e) => { e.preventDefault(); input.action = false; });

        // Physics Setup
        const engine = Matter.Engine.create();
        const bodies = {};
        
        scene.entities.forEach(entity => {
            if (entity.physics) {
                const w = entity.renderer.width * entity.transform.scale.x;
                const h = entity.renderer.height * entity.transform.scale.y;
                let body;
                if (entity.renderer.type === 'circle') {
                    body = Matter.Bodies.circle(entity.transform.position.x, entity.transform.position.y, w / 2, {
                        isStatic: entity.physics.isStatic,
                        angle: entity.transform.rotation * Math.PI / 180
                    });
                } else {
                    body = Matter.Bodies.rectangle(entity.transform.position.x, entity.transform.position.y, w, h, {
                        isStatic: entity.physics.isStatic,
                        angle: entity.transform.rotation * Math.PI / 180
                    });
                }
                Matter.World.add(engine.world, body);
                bodies[entity.id] = body;
            }
        });

        const imageCache = {};
        const particlesState = {};
        let lastTime = performance.now();
        let accumulator = 0;
        const fixedTimestep = scene.physics?.fixedTimestep || 1/60;

        function loop(time) {
            requestAnimationFrame(loop);
            const dt = (time - lastTime) / 1000;
            lastTime = time;
            
            accumulator += Math.min(dt, 0.1);

            while (accumulator >= fixedTimestep) {
                Matter.Engine.update(engine, fixedTimestep * 1000);
                accumulator -= fixedTimestep;
            }

            // Update Entities
            scene.entities.forEach(entity => {
                if (entity.physics && bodies[entity.id]) {
                    const body = bodies[entity.id];
                    entity.transform.position.x = body.position.x;
                    entity.transform.position.y = body.position.y;
                    entity.transform.rotation = body.angle * 180 / Math.PI;
                }

                // Particles
                if (entity.particles) {
                    if (!particlesState[entity.id]) particlesState[entity.id] = [];
                    const pool = particlesState[entity.id];
                    
                    for (let i = pool.length - 1; i >= 0; i--) {
                        const p = pool[i];
                        p.life -= dt;
                        if (p.life <= 0) {
                            pool.splice(i, 1);
                        } else {
                            p.x += p.vx * dt;
                            p.y += p.vy * dt;
                        }
                    }

                    if (entity.particles.emitting) {
                        const toEmit = entity.particles.emissionRate * dt;
                        const whole = Math.floor(toEmit);
                        const frac = toEmit - whole;
                        let emitCount = whole + (Math.random() < frac ? 1 : 0);
                        
                        while (emitCount > 0 && pool.length < entity.particles.maxParticles) {
                            const angle = (entity.particles.angle + (Math.random() - 0.5) * entity.particles.spread) * Math.PI / 180;
                            const speed = entity.particles.speed + (Math.random() - 0.5) * entity.particles.speedRange;
                            const life = entity.particles.lifetime + (Math.random() - 0.5) * entity.particles.lifetimeRange;
                            
                            pool.push({
                                x: entity.transform.position.x,
                                y: entity.transform.position.y,
                                vx: Math.cos(angle) * speed,
                                vy: Math.sin(angle) * speed,
                                life,
                                maxLife: life
                            });
                            emitCount--;
                        }
                    }
                }

                // Property Animations
                if (entity.propertyAnimations) {
                    entity.propertyAnimations.forEach(anim => {
                        if (anim.playing && anim.keyframes.length > 1) {
                            anim.currentTime += dt;
                            
                            let kf1 = anim.keyframes[0];
                            let kf2 = anim.keyframes[anim.keyframes.length - 1];
                            
                            const maxTime = kf2.time;
                            if (anim.currentTime > maxTime) {
                                if (anim.loop) {
                                    anim.currentTime %= maxTime;
                                } else {
                                    anim.currentTime = maxTime;
                                    anim.playing = false;
                                }
                            }

                            for (let i = 0; i < anim.keyframes.length - 1; i++) {
                                if (anim.currentTime >= anim.keyframes[i].time && anim.currentTime <= anim.keyframes[i+1].time) {
                                    kf1 = anim.keyframes[i];
                                    kf2 = anim.keyframes[i+1];
                                    break;
                                }
                            }

                            const t = (anim.currentTime - kf1.time) / (kf2.time - kf1.time);
                            const value = kf1.value + (kf2.value - kf1.value) * t;

                            const parts = anim.property.split('.');
                            let target = entity;
                            for (let i = 0; i < parts.length - 1; i++) {
                                target = target[parts[i]];
                            }
                            if (target) {
                                target[parts[parts.length - 1]] = value;
                            }
                        }
                    });
                }

                if (entity.script && entity.script.type === 'custom' && entity.script.content) {
                    try {
                        const runScript = new Function('entity', 'input', 'dt', 'bridge', 'soundManager', 'ObjectPool', entity.script.content);
                        runScript(entity, input, dt, bridge, soundManager, ObjectPool);
                    } catch (e) {
                        console.error(e);
                    }
                }
            });

            // Draw
            ctx.fillStyle = scene.backgroundColor;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.save();
            ctx.translate(canvas.width / 2, canvas.height / 2);
            
            const zoom = scene.camera?.zoom || 1;
            ctx.scale(zoom, zoom);
            
            // Camera follow
            let camX = 0, camY = 0;
            if (scene.camera?.targetId) {
                const target = scene.entities.find(e => e.id === scene.camera.targetId);
                if (target) {
                    camX = target.transform.position.x;
                    camY = target.transform.position.y;
                }
            }

            const nonUIEntities = scene.entities.filter(e => !e.transform.isUI);
            const uiEntities = scene.entities.filter(e => e.transform.isUI);

            const drawEntity = (entity, isUI) => {
                ctx.save();
                
                if (isUI) {
                    ctx.restore();
                    ctx.save();
                    
                    let x = entity.transform.position.x;
                    let y = entity.transform.position.y;
                    
                    if (entity.transform.anchor) {
                        const w = canvas.width;
                        const h = canvas.height;
                        switch (entity.transform.anchor) {
                            case 'top-left': break;
                            case 'top-center': x += w / 2; break;
                            case 'top-right': x += w; break;
                            case 'center-left': y += h / 2; break;
                            case 'center': x += w / 2; y += h / 2; break;
                            case 'center-right': x += w; y += h / 2; break;
                            case 'bottom-left': y += h; break;
                            case 'bottom-center': x += w / 2; y += h; break;
                            case 'bottom-right': x += w; y += h; break;
                        }
                    }
                    
                    ctx.translate(x, y);
                } else {
                    const parallax = entity.renderer.parallaxFactor ?? 1;
                    const px = camX * parallax;
                    const py = camY * parallax;
                    ctx.translate(entity.transform.position.x - px, entity.transform.position.y - py);
                }

                ctx.rotate(entity.transform.rotation * Math.PI / 180);
                ctx.scale(entity.transform.scale.x, entity.transform.scale.y);

                if (entity.renderer.type === 'rect') {
                    ctx.fillStyle = entity.renderer.color;
                    ctx.fillRect(-entity.renderer.width / 2, -entity.renderer.height / 2, entity.renderer.width, entity.renderer.height);
                } else if (entity.renderer.type === 'circle') {
                    ctx.fillStyle = entity.renderer.color;
                    ctx.beginPath();
                    ctx.arc(0, 0, entity.renderer.width / 2, 0, Math.PI * 2);
                    ctx.fill();
                } else if (entity.renderer.type === 'button') {
                    ctx.fillStyle = entity.renderer.color;
                    ctx.fillRect(-entity.renderer.width / 2, -entity.renderer.height / 2, entity.renderer.width, entity.renderer.height);
                    if (entity.renderer.text) {
                        ctx.fillStyle = '#ffffff';
                        ctx.font = \`\${entity.renderer.fontSize || 16}px Arial\`;
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText(entity.renderer.text, 0, 0);
                    }
                } else if (entity.renderer.type === 'sprite' && entity.renderer.spriteUrl) {
                    if (imageCache[entity.renderer.spriteUrl]) {
                        if (imageCache[entity.renderer.spriteUrl].complete) {
                            const img = imageCache[entity.renderer.spriteUrl];
                            const cols = entity.renderer.cols || 1;
                            const rows = entity.renderer.rows || 1;
                            const frame = entity.renderer.currentFrame || 0;
                            
                            const fw = img.width / cols;
                            const fh = img.height / rows;
                            const col = frame % cols;
                            const row = Math.floor(frame / cols);
                            
                            ctx.drawImage(img, col * fw, row * fh, fw, fh, -entity.renderer.width / 2, -entity.renderer.height / 2, entity.renderer.width, entity.renderer.height);
                        }
                    } else {
                        imageCache[entity.renderer.spriteUrl] = new Image();
                        imageCache[entity.renderer.spriteUrl].src = entity.renderer.spriteUrl;
                    }
                }

                // Tilemap
                if (entity.tilemap) {
                    const { tileSize, columns, rows, layers, tilesetUrl } = entity.tilemap;
                    const hw = (columns * tileSize) / 2;
                    const hh = (rows * tileSize) / 2;
                    
                    if (tilesetUrl) {
                        if (imageCache[tilesetUrl] && imageCache[tilesetUrl].complete) {
                            const img = imageCache[tilesetUrl];
                            const tilesPerRow = Math.floor(img.width / tileSize);
                            
                            layers.forEach(layer => {
                                for (let i = 0; i < layer.data.length; i++) {
                                    const tileIndex = layer.data[i];
                                    if (tileIndex > 0) {
                                        const tx = ((tileIndex - 1) % tilesPerRow) * tileSize;
                                        const ty = Math.floor((tileIndex - 1) / tilesPerRow) * tileSize;
                                        const dx = -hw + (i % columns) * tileSize;
                                        const dy = -hh + Math.floor(i / columns) * tileSize;
                                        ctx.drawImage(img, tx, ty, tileSize, tileSize, dx, dy, tileSize, tileSize);
                                    }
                                }
                            });
                        } else if (!imageCache[tilesetUrl]) {
                            imageCache[tilesetUrl] = new Image();
                            imageCache[tilesetUrl].src = tilesetUrl;
                        }
                    }
                }

                ctx.restore();

                // Draw Particles
                if (!isUI && entity.particles && particlesState[entity.id]) {
                    const pool = particlesState[entity.id];
                    pool.forEach(p => {
                        const progress = 1 - (p.life / p.maxLife);
                        const size = entity.particles.sizeStart + (entity.particles.sizeEnd - entity.particles.sizeStart) * progress;
                        
                        ctx.save();
                        const parallax = entity.renderer.parallaxFactor ?? 1;
                        const px = camX * parallax;
                        const py = camY * parallax;
                        ctx.translate(p.x - px, p.y - py);
                        
                        ctx.fillStyle = entity.particles.colorStart;
                        ctx.globalAlpha = p.life / p.maxLife;
                        ctx.beginPath();
                        ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.restore();
                    });
                }
            };

            nonUIEntities.forEach(e => drawEntity(e, false));
            uiEntities.forEach(e => drawEntity(e, true));

            ctx.restore();
        }

        requestAnimationFrame(loop);
    </script>
</body>
</html>
  `;

  // 2. Generate capacitor.config.json
  const capacitorConfig = {
    appId: "com.iceengine.game",
    appName: "ExportedGame",
    webDir: "dist",
    bundledWebRuntime: false,
  };

  // 3. Generate package.json for Capacitor project
  const packageJson = {
    name: "exported-game",
    version: "1.0.0",
    description: "Exported ICE Engine Game",
    dependencies: {
      "@capacitor/core": "latest",
      "@capacitor/android": "latest",
      "@capacitor/ios": "latest",
      "@capacitor/haptics": "latest",
    },
  };

  // Add files to ZIP
  zip.file("dist/index.html", htmlContent);
  zip.file("capacitor.config.json", JSON.stringify(capacitorConfig, null, 2));
  zip.file("package.json", JSON.stringify(packageJson, null, 2));

  // Generate and download ZIP
  const content = await zip.generateAsync({ type: "blob" });
  saveAs(content, "game_export.zip");
};
