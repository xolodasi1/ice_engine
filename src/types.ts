export type Vector2 = { x: number; y: number };

export type EntityType = 'rect' | 'circle' | 'sprite' | 'button' | 'tilemap' | 'particles';

export type ComponentType = 'transform' | 'physics' | 'renderer' | 'script' | 'particles' | 'tilemap';

export type AnchorType = 'top-left' | 'top-center' | 'top-right' | 'center-left' | 'center' | 'center-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';

export interface TransformComponent {
  position: Vector2;
  rotation: number;
  scale: Vector2;
  isUI?: boolean;
  anchor?: AnchorType;
}

export interface PhysicsComponent {
  velocity: Vector2;
  isStatic: boolean;
  gravityScale: number;
}

export interface SpriteAnimation {
  name: string;
  frames: number[]; // indices of frames
  fps: number;
}

export interface RendererComponent {
  type: EntityType;
  color: string;
  width: number;
  height: number; // or radius for circle
  spriteUrl?: string;
  text?: string; // For buttons
  fontSize?: number; // For buttons
  // Sprite Animator
  cols?: number;
  rows?: number;
  animations?: SpriteAnimation[];
  currentAnimation?: string;
  currentFrame?: number;
  // Parallax
  parallaxFactor?: number;
}

export interface ScriptComponent {
  type: 'none' | 'custom';
  name?: string; // Script name
  content?: string; // The user's script code
}

export interface ParticleEmitterComponent {
  emitting: boolean;
  maxParticles: number;
  emissionRate: number; // particles per second
  lifetime: number;
  lifetimeRange: number;
  speed: number;
  speedRange: number;
  angle: number; // base direction
  spread: number; // angle spread in degrees
  colorStart: string;
  colorEnd: string;
  sizeStart: number;
  sizeEnd: number;
}

export interface TilemapLayer {
  name: string;
  data: number[]; // 1D array representing 2D grid
}

export interface TilemapComponent {
  tileSize: number;
  columns: number;
  rows: number;
  layers: TilemapLayer[];
  tilesetUrl?: string;
}

export interface Keyframe {
  time: number; // in seconds
  value: number;
}

export interface PropertyAnimation {
  name: string;
  property: string; // e.g., 'transform.position.x'
  keyframes: Keyframe[];
  loop: boolean;
  playing: boolean;
  currentTime: number;
}

export interface Entity {
  id: string;
  name: string;
  transform: TransformComponent;
  physics?: PhysicsComponent;
  renderer: RendererComponent;
  script?: ScriptComponent;
  particles?: ParticleEmitterComponent;
  tilemap?: TilemapComponent;
  propertyAnimations?: PropertyAnimation[];
  prefabId?: string;
}

export interface CameraSettings {
  position: Vector2;
  zoom: number;
  targetId?: string | null;
  lerpSpeed: number;
}

export interface PhysicsSettings {
  fixedTimestep: number; // e.g., 1/60
}

export interface Scene {
  entities: Entity[];
  backgroundColor: string;
  camera?: CameraSettings;
  physics?: PhysicsSettings;
}

export interface Asset {
  id: string;
  name: string;
  type: 'image' | 'audio' | 'script' | 'prefab';
  url: string;
  data?: string; // For storing JSON data like prefabs
}

export interface Project {
  id: string;
  name: string;
  createdAt: number;
  scene: Scene;
  assets?: Asset[];
}
