import React, { useRef, useEffect, useState } from 'react';
import { Scene, Entity, TransformComponent } from '../types';
import Matter from 'matter-js';
import { soundManager } from '../utils/SoundManager';
import { ObjectPool } from '../utils/ObjectPool';

interface GameCanvasProps {
  scene: Scene;
  isPlaying: boolean;
  onUpdate?: (entities: Entity[]) => void;
  selectedEntityId?: string | null;
  onSelectEntity?: (id: string | null) => void;
  inputRef?: React.MutableRefObject<{ x: number; y: number; action: boolean }>;
  deviceSize?: { width: number; height: number };
  onEntityTransformChange?: (id: string, transform: TransformComponent) => void;
  isReadOnly?: boolean;
}

const GameCanvas: React.FC<GameCanvasProps> = ({
  scene,
  isPlaying,
  onUpdate,
  selectedEntityId,
  onSelectEntity,
  inputRef,
  deviceSize = { width: 800, height: 600 },
  onEntityTransformChange,
  isReadOnly = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  const entitiesRef = useRef<Entity[]>(JSON.parse(JSON.stringify(scene.entities)));
  const lastTimeRef = useRef<number>(0);
  
  // Dragging State
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  // Resizing State
  const [isResizing, setIsResizing] = useState<string | null>(null);
  const resizeStart = useRef({ x: 0, y: 0, sx: 0, sy: 0, w: 0, h: 0 });

  // Panning State
  const [isPanning, setIsPanning] = useState(false);
  const lastPanPos = useRef({ x: 0, y: 0 });

  // Camera State
  const cameraOffset = useRef({ x: deviceSize.width / 2, y: deviceSize.height / 2 });

  // Physics State
  const matterEngineRef = useRef<Matter.Engine | null>(null);
  const matterBodiesRef = useRef<{ [id: string]: Matter.Body }>({});
  const particlesRef = useRef<Record<string, any[]>>({});

  // Sync entities when scene changes (only if not playing to avoid overwriting simulation)
  useEffect(() => {
    if (!isPlaying) {
      entitiesRef.current = JSON.parse(JSON.stringify(scene.entities));
      draw();
    }
  }, [scene, isPlaying]);

  // Focus camera on selected entity
  useEffect(() => {
    if (selectedEntityId && !isPlaying && !isReadOnly) {
      const entity = entitiesRef.current.find(e => e.id === selectedEntityId);
      if (entity) {
        cameraOffset.current = { ...entity.transform.position };
        draw();
      }
    }
  }, [selectedEntityId, isPlaying, isReadOnly]);

  const accumulatorRef = useRef<number>(0);

  const update = (dt: number) => {
    if (!isPlaying) return;

    const fixedTimestep = scene.physics?.fixedTimestep || 1/60;
    accumulatorRef.current += dt;

    while (accumulatorRef.current >= fixedTimestep) {
      if (matterEngineRef.current) {
          Matter.Engine.update(matterEngineRef.current, fixedTimestep * 1000);
      }
      accumulatorRef.current -= fixedTimestep;
    }

    const newEntities = entitiesRef.current.map((entity) => {
      // Sync Physics
      if (entity.physics && matterBodiesRef.current[entity.id]) {
          const body = matterBodiesRef.current[entity.id];
          entity.transform.position.x = body.position.x;
          entity.transform.position.y = body.position.y;
          entity.transform.rotation = body.angle * 180 / Math.PI;
      }

      // Particles
      if (entity.particles) {
        if (!particlesRef.current[entity.id]) particlesRef.current[entity.id] = [];
        const pool = particlesRef.current[entity.id];
        
        // Update existing
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

        // Emit new
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
            
            // Find current keyframes
            let kf1 = anim.keyframes[0];
            let kf2 = anim.keyframes[anim.keyframes.length - 1];
            
            // Loop logic
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

            // Lerp
            const t = (anim.currentTime - kf1.time) / (kf2.time - kf1.time);
            const value = kf1.value + (kf2.value - kf1.value) * t;

            // Apply value (simplified, assuming transform.position.x etc)
            const parts = anim.property.split('.');
            let target: any = entity;
            for (let i = 0; i < parts.length - 1; i++) {
              target = target[parts[i]];
            }
            if (target) {
              target[parts[parts.length - 1]] = value;
            }
          }
        });
      }

      // Custom Scripts
      if (entity.script?.type === 'custom' && entity.script.content) {
        try {
            // Create a safe-ish execution context
            // We pass 'entity', 'input', 'dt'
            // Mask window and document
            const mockBridge = { vibrate: () => console.log('Vibrate called in editor') };
            const runScript = new Function('entity', 'input', 'dt', 'bridge', 'soundManager', 'ObjectPool', 'window', 'document', entity.script.content);
            runScript(entity, inputRef?.current || { x: 0, y: 0, action: false }, dt, mockBridge, soundManager, ObjectPool, undefined, undefined);
        } catch (e) {
            console.error(`Error in script for entity ${entity.name}:`, e);
        }
      }

      return entity;
    });

    entitiesRef.current = newEntities;
    if (onUpdate) {
      // onUpdate(newEntities); // Optional: sync back to React state if needed, but costly
    }
  };

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.fillStyle = scene.backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    // Apply Camera Transform
    ctx.translate(canvas.width / 2, canvas.height / 2);
    
    const zoom = scene.camera?.zoom || 1;
    ctx.scale(zoom, zoom);

    // Draw Entities
    // Sort by some z-index if needed, but for now just order in array
    // We'll draw non-UI first, then UI
    const nonUIEntities = entitiesRef.current.filter(e => !e.transform.isUI);
    const uiEntities = entitiesRef.current.filter(e => e.transform.isUI);

    const drawEntity = (entity: Entity, isUI: boolean) => {
      ctx.save();
      
      if (isUI) {
        // Reset transform to screen space
        ctx.restore(); // Undo camera transform
        ctx.save(); // Save screen space state
        
        let x = entity.transform.position.x;
        let y = entity.transform.position.y;
        
        // Handle anchors
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
        const camX = cameraOffset.current.x * parallax;
        const camY = cameraOffset.current.y * parallax;
        ctx.translate(entity.transform.position.x - camX, entity.transform.position.y - camY);
      }

      ctx.rotate((entity.transform.rotation * Math.PI) / 180);
      ctx.scale(entity.transform.scale.x, entity.transform.scale.y);

      if (entity.renderer.type === 'rect') {
        ctx.fillStyle = entity.renderer.color;
        ctx.fillRect(
          -entity.renderer.width / 2,
          -entity.renderer.height / 2,
          entity.renderer.width,
          entity.renderer.height
        );
      } else if (entity.renderer.type === 'circle') {
        ctx.fillStyle = entity.renderer.color;
        ctx.beginPath();
        ctx.arc(0, 0, entity.renderer.width / 2, 0, Math.PI * 2);
        ctx.fill();
      } else if (entity.renderer.type === 'button') {
        // Draw Button Background
        ctx.fillStyle = entity.renderer.color;
        ctx.fillRect(
          -entity.renderer.width / 2,
          -entity.renderer.height / 2,
          entity.renderer.width,
          entity.renderer.height
        );
        
        // Draw Text
        if (entity.renderer.text) {
            ctx.fillStyle = '#ffffff';
            ctx.font = `${entity.renderer.fontSize || 16}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(entity.renderer.text, 0, 0);
        }
      } else if (entity.renderer.type === 'sprite' && entity.renderer.spriteUrl) {
          if (!(window as any).imageCache) (window as any).imageCache = {};
          const cache = (window as any).imageCache;
          
          if (cache[entity.renderer.spriteUrl]) {
              if (cache[entity.renderer.spriteUrl].complete) {
                  const img = cache[entity.renderer.spriteUrl];
                  const cols = entity.renderer.cols || 1;
                  const rows = entity.renderer.rows || 1;
                  const frame = entity.renderer.currentFrame || 0;
                  
                  const frameWidth = img.width / cols;
                  const frameHeight = img.height / rows;
                  
                  const col = frame % cols;
                  const row = Math.floor(frame / cols);
                  
                  ctx.drawImage(
                      img,
                      col * frameWidth,
                      row * frameHeight,
                      frameWidth,
                      frameHeight,
                      -entity.renderer.width / 2,
                      -entity.renderer.height / 2,
                      entity.renderer.width,
                      entity.renderer.height
                  );
              }
          } else {
              cache[entity.renderer.spriteUrl] = new Image();
              cache[entity.renderer.spriteUrl].src = entity.renderer.spriteUrl;
          }
      }

      // Tilemap
      if (entity.tilemap) {
        const { tileSize, columns, rows, layers, tilesetUrl } = entity.tilemap;
        const hw = (columns * tileSize) / 2;
        const hh = (rows * tileSize) / 2;
        
        // Draw grid if selected
        if (!isPlaying && !isReadOnly && entity.id === selectedEntityId) {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
          ctx.lineWidth = 1 / zoom;
          ctx.beginPath();
          for (let x = 0; x <= columns; x++) {
            ctx.moveTo(-hw + x * tileSize, -hh);
            ctx.lineTo(-hw + x * tileSize, hh);
          }
          for (let y = 0; y <= rows; y++) {
            ctx.moveTo(-hw, -hh + y * tileSize);
            ctx.lineTo(hw, -hh + y * tileSize);
          }
          ctx.stroke();
        }

        // Draw tiles
        if (tilesetUrl) {
          if (!(window as any).imageCache) (window as any).imageCache = {};
          const cache = (window as any).imageCache;
          if (cache[tilesetUrl] && cache[tilesetUrl].complete) {
            const img = cache[tilesetUrl];
            const tilesPerRow = Math.floor(img.width / tileSize);
            
            layers.forEach(layer => {
              for (let i = 0; i < layer.data.length; i++) {
                const tileIndex = layer.data[i];
                if (tileIndex > 0) { // 0 is empty
                  const tx = ((tileIndex - 1) % tilesPerRow) * tileSize;
                  const ty = Math.floor((tileIndex - 1) / tilesPerRow) * tileSize;
                  const dx = -hw + (i % columns) * tileSize;
                  const dy = -hh + Math.floor(i / columns) * tileSize;
                  ctx.drawImage(img, tx, ty, tileSize, tileSize, dx, dy, tileSize, tileSize);
                }
              }
            });
          } else if (!cache[tilesetUrl]) {
            cache[tilesetUrl] = new Image();
            cache[tilesetUrl].src = tilesetUrl;
          }
        }
      }

      // Selection Outline
      if (!isPlaying && !isReadOnly && entity.id === selectedEntityId) {
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 2 / zoom; // Keep line width consistent regardless of zoom
        if (entity.renderer.type === 'circle') {
          ctx.beginPath();
          ctx.arc(0, 0, entity.renderer.width / 2 + 2, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          const hw = entity.renderer.width / 2;
          const hh = entity.renderer.height / 2;
          ctx.strokeRect(-hw - 2, -hh - 2, entity.renderer.width + 4, entity.renderer.height + 4);
          
          // Draw resize handles
          ctx.fillStyle = '#00ffff';
          const hs = 6 / zoom; // handle size
          ctx.fillRect(-hw - 2 - hs/2, -hh - 2 - hs/2, hs, hs); // tl
          ctx.fillRect(hw + 2 - hs/2, -hh - 2 - hs/2, hs, hs);  // tr
          ctx.fillRect(-hw - 2 - hs/2, hh + 2 - hs/2, hs, hs);  // bl
          ctx.fillRect(hw + 2 - hs/2, hh + 2 - hs/2, hs, hs);   // br
        }
      }

      ctx.restore();

      // Draw Particles (in world space)
      if (!isUI && entity.particles && particlesRef.current[entity.id]) {
        const pool = particlesRef.current[entity.id];
        pool.forEach(p => {
          const progress = 1 - (p.life / p.maxLife);
          // Interpolate color and size (simplified)
          const size = entity.particles!.sizeStart + (entity.particles!.sizeEnd - entity.particles!.sizeStart) * progress;
          
          ctx.save();
          const parallax = entity.renderer.parallaxFactor ?? 1;
          const camX = cameraOffset.current.x * parallax;
          const camY = cameraOffset.current.y * parallax;
          ctx.translate(p.x - camX, p.y - camY);
          
          ctx.fillStyle = entity.particles!.colorStart; // Ideally interpolate color
          ctx.globalAlpha = p.life / p.maxLife; // Fade out
          ctx.beginPath();
          ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        });
      }
    };

    nonUIEntities.forEach(e => drawEntity(e, false));
    uiEntities.forEach(e => drawEntity(e, true));

    ctx.restore(); // Restore Camera Transform
  };

  const loop = (time: number) => {
    const dt = (time - lastTimeRef.current) / 1000;
    lastTimeRef.current = time;

    update(Math.min(dt, 0.1)); // Cap dt
    draw();

    if (isPlaying) {
      requestRef.current = requestAnimationFrame(loop);
    }
  };

  useEffect(() => {
    if (isPlaying) {
      lastTimeRef.current = performance.now();
      
      // Initialize Matter.js
      const engine = Matter.Engine.create();
      matterEngineRef.current = engine;
      matterBodiesRef.current = {};

      entitiesRef.current.forEach(entity => {
        if (entity.physics) {
          const w = entity.renderer.width * entity.transform.scale.x;
          const h = entity.renderer.height * entity.transform.scale.y;
          
          let body;
          if (entity.renderer.type === 'circle') {
            body = Matter.Bodies.circle(
              entity.transform.position.x,
              entity.transform.position.y,
              w / 2,
              {
                isStatic: entity.physics.isStatic,
                angle: entity.transform.rotation * Math.PI / 180,
                friction: 0.5,
                restitution: 0.2
              }
            );
          } else {
            body = Matter.Bodies.rectangle(
              entity.transform.position.x,
              entity.transform.position.y,
              w,
              h,
              {
                isStatic: entity.physics.isStatic,
                angle: entity.transform.rotation * Math.PI / 180,
                friction: 0.5,
                restitution: 0.2
              }
            );
          }
          
          if (entity.physics.gravityScale !== undefined) {
              // Matter.js doesn't have per-body gravity scale directly, 
              // but we can adjust mass or apply custom forces.
              // For simplicity, we'll just use global gravity for now.
          }

          Matter.World.add(engine.world, body);
          matterBodiesRef.current[entity.id] = body;
        }
      });

      requestRef.current = requestAnimationFrame(loop);
    } else {
      cancelAnimationFrame(requestRef.current);
      
      // Cleanup Matter.js
      if (matterEngineRef.current) {
        Matter.Engine.clear(matterEngineRef.current);
        matterEngineRef.current = null;
        matterBodiesRef.current = {};
      }
      
      draw(); // Draw once when stopping
    }
    return () => cancelAnimationFrame(requestRef.current);
  }, [isPlaying]);

  // --- Input Handling (Mouse/Touch) ---

  const getCanvasCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { screenX: 0, screenY: 0, clientX: 0, clientY: 0 };

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if ('touches' in e) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else {
        clientX = (e as React.MouseEvent).clientX;
        clientY = (e as React.MouseEvent).clientY;
    }

    // Calculate scale factors
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const rawX = (clientX - rect.left) * scaleX;
    const rawY = (clientY - rect.top) * scaleY;

    const zoom = scene.camera?.zoom || 1;

    return {
      screenX: (rawX - canvas.width / 2) / zoom,
      screenY: (rawY - canvas.height / 2) / zoom,
      clientX,
      clientY
    };
  };

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (isPlaying || isReadOnly) return;
    
    const { screenX, screenY, clientX, clientY } = getCanvasCoordinates(e);

    // Check Resize Handles first if an entity is selected
    if (selectedEntityId) {
      const entity = entitiesRef.current.find(e => e.id === selectedEntityId);
      if (entity && entity.renderer.type !== 'circle') {
        const parallax = entity.renderer.parallaxFactor ?? 1;
        const camX = cameraOffset.current.x * parallax;
        const camY = cameraOffset.current.y * parallax;
        
        const ex = entity.transform.position.x - camX;
        const ey = entity.transform.position.y - camY;
        
        const w = entity.renderer.width * entity.transform.scale.x;
        const h = entity.renderer.height * entity.transform.scale.y;
        
        // Transform mouse to local space
        const dx = screenX - ex;
        const dy = screenY - ey;
        const angle = -entity.transform.rotation * Math.PI / 180;
        const localX = dx * Math.cos(angle) - dy * Math.sin(angle);
        const localY = dx * Math.sin(angle) + dy * Math.cos(angle);

        const hw = w / 2;
        const hh = h / 2;
        const zoom = scene.camera?.zoom || 1;
        const hs = 10 / zoom; // hit area size

        const isHit = (hx: number, hy: number) => Math.abs(localX - hx) < hs && Math.abs(localY - hy) < hs;

        let handle = null;
        if (isHit(-hw, -hh)) handle = 'tl';
        else if (isHit(hw, -hh)) handle = 'tr';
        else if (isHit(-hw, hh)) handle = 'bl';
        else if (isHit(hw, hh)) handle = 'br';

        if (handle) {
          setIsResizing(handle);
          resizeStart.current = { 
            x: screenX, y: screenY, 
            sx: entity.transform.scale.x, 
            sy: entity.transform.scale.y,
            w: entity.renderer.width,
            h: entity.renderer.height
          };
          return;
        }
      }
    }

    // Hit Test Entity
    const clickedEntity = [...entitiesRef.current].reverse().find((entity) => {
      const parallax = entity.renderer.parallaxFactor ?? 1;
      const camX = cameraOffset.current.x * parallax;
      const camY = cameraOffset.current.y * parallax;
      
      const ex = entity.transform.position.x - camX;
      const ey = entity.transform.position.y - camY;
      
      const w = entity.renderer.width * entity.transform.scale.x;
      const h = entity.renderer.height * entity.transform.scale.y;

      const dx = screenX - ex;
      const dy = screenY - ey;
      const angle = -entity.transform.rotation * Math.PI / 180;
      const localX = dx * Math.cos(angle) - dy * Math.sin(angle);
      const localY = dx * Math.sin(angle) + dy * Math.cos(angle);

      if (entity.renderer.type === 'circle') {
          return Math.sqrt(localX * localX + localY * localY) <= w / 2;
      }

      return (
        localX >= -w / 2 &&
        localX <= w / 2 &&
        localY >= -h / 2 &&
        localY <= h / 2
      );
    });

    if (clickedEntity) {
      if (onSelectEntity) onSelectEntity(clickedEntity.id);
      setIsDragging(true);
      const parallax = clickedEntity.renderer.parallaxFactor ?? 1;
      const camX = cameraOffset.current.x * parallax;
      const camY = cameraOffset.current.y * parallax;
      dragOffset.current = {
        x: screenX - (clickedEntity.transform.position.x - camX),
        y: screenY - (clickedEntity.transform.position.y - camY),
      };
    } else {
      if (onSelectEntity) onSelectEntity(null);
      setIsPanning(true);
      lastPanPos.current = { x: clientX, y: clientY };
    }
  };

  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (isPlaying || isReadOnly) return;

    if (isResizing && selectedEntityId) {
        const { screenX, screenY } = getCanvasCoordinates(e);
        const entityIndex = entitiesRef.current.findIndex(e => e.id === selectedEntityId);
        if (entityIndex !== -1) {
            const entity = entitiesRef.current[entityIndex];
            
            // Calculate delta in local space to handle rotation correctly
            const dx = screenX - resizeStart.current.x;
            const dy = screenY - resizeStart.current.y;
            
            const angle = -entity.transform.rotation * Math.PI / 180;
            const localDx = dx * Math.cos(angle) - dy * Math.sin(angle);
            const localDy = dx * Math.sin(angle) + dy * Math.cos(angle);

            let newSx = resizeStart.current.sx;
            let newSy = resizeStart.current.sy;

            // Adjust scale based on which handle is dragged
            // We divide by original width/height to get scale delta
            if (isResizing.includes('l')) newSx -= localDx / resizeStart.current.w * 2;
            if (isResizing.includes('r')) newSx += localDx / resizeStart.current.w * 2;
            if (isResizing.includes('t')) newSy -= localDy / resizeStart.current.h * 2;
            if (isResizing.includes('b')) newSy += localDy / resizeStart.current.h * 2;

            entity.transform.scale = { 
                x: Math.max(0.1, newSx), 
                y: Math.max(0.1, newSy) 
            };
            draw();
        }
        return;
    }

    if (isPanning) {
        const { clientX, clientY } = getCanvasCoordinates(e);
        const dx = clientX - lastPanPos.current.x;
        const dy = clientY - lastPanPos.current.y;
        
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const zoom = scene.camera?.zoom || 1;

        cameraOffset.current.x -= (dx * scaleX) / zoom;
        cameraOffset.current.y -= (dy * scaleY) / zoom;
        lastPanPos.current = { x: clientX, y: clientY };
        draw();
        return;
    }

    if (isDragging && selectedEntityId) {
        const { screenX, screenY } = getCanvasCoordinates(e);
        const entityIndex = entitiesRef.current.findIndex(e => e.id === selectedEntityId);
        if (entityIndex !== -1) {
            const entity = entitiesRef.current[entityIndex];
            const parallax = entity.renderer.parallaxFactor ?? 1;
            const camX = cameraOffset.current.x * parallax;
            const camY = cameraOffset.current.y * parallax;
            
            entitiesRef.current[entityIndex].transform.position = {
                x: screenX - dragOffset.current.x + camX,
                y: screenY - dragOffset.current.y + camY
            };
            draw();
        }
    }
  };

  const handlePointerUp = () => {
    if (isPlaying || isReadOnly) return;
    
    if (isResizing) {
        setIsResizing(null);
        if (selectedEntityId && onEntityTransformChange) {
            const entity = entitiesRef.current.find(e => e.id === selectedEntityId);
            if (entity) {
                onEntityTransformChange(selectedEntityId, entity.transform);
            }
        }
    }

    if (isPanning) {
        setIsPanning(false);
    }

    if (isDragging) {
        setIsDragging(false);
        if (selectedEntityId && onEntityTransformChange) {
            const entity = entitiesRef.current.find(e => e.id === selectedEntityId);
            if (entity) {
                onEntityTransformChange(selectedEntityId, entity.transform);
            }
        }
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (isPlaying || isReadOnly || !selectedEntityId) return;
    
    // Prevent default scrolling
    // e.preventDefault(); // React synthetic events don't support preventDefault for passive listeners well, but we can try.
    
    const entityIndex = entitiesRef.current.findIndex(ent => ent.id === selectedEntityId);
    if (entityIndex !== -1) {
        const entity = entitiesRef.current[entityIndex];
        const scaleDelta = e.deltaY > 0 ? -0.1 : 0.1;
        const newScaleX = Math.max(0.1, entity.transform.scale.x + scaleDelta);
        const newScaleY = Math.max(0.1, entity.transform.scale.y + scaleDelta);
        
        entity.transform.scale = { x: newScaleX, y: newScaleY };
        draw();
        
        if (onEntityTransformChange) {
            onEntityTransformChange(selectedEntityId, entity.transform);
        }
    }
  };

  return (
    <canvas
      ref={canvasRef}
      width={deviceSize.width}
      height={deviceSize.height}
      className={`bg-black shadow-lg ${isReadOnly ? '' : 'cursor-crosshair'}`}
      style={{ 
        width: '100%', 
        height: '100%', 
        objectFit: 'contain',
        touchAction: 'none' 
      }}
      onMouseDown={handlePointerDown}
      onMouseMove={handlePointerMove}
      onMouseUp={handlePointerUp}
      onMouseLeave={handlePointerUp}
      onTouchStart={handlePointerDown}
      onTouchMove={handlePointerMove}
      onTouchEnd={handlePointerUp}
      onWheel={handleWheel}
    />
  );
};

export default GameCanvas;
