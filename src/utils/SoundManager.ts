export class SoundManager {
  private audioContext: AudioContext | null = null;
  private buffers: Map<string, AudioBuffer> = new Map();
  private bgmSource: AudioBufferSourceNode | null = null;
  private bgmGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  
  private isUnlocked = false;

  constructor() {
    // AudioContext will be created on first user interaction
  }

  public init() {
    if (this.audioContext) return;
    
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) {
      console.warn("Web Audio API is not supported in this browser");
      return;
    }

    this.audioContext = new AudioContextClass();
    
    this.bgmGain = this.audioContext.createGain();
    this.bgmGain.connect(this.audioContext.destination);
    
    this.sfxGain = this.audioContext.createGain();
    this.sfxGain.connect(this.audioContext.destination);

    this.unlockAudioContext();
  }

  private unlockAudioContext() {
    if (this.isUnlocked || !this.audioContext) return;

    const unlock = () => {
      if (!this.audioContext) return;
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }
      
      // Play silent buffer to unlock
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

  public async loadSound(url: string, id: string) {
    if (!this.audioContext) this.init();
    if (!this.audioContext) return;

    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      this.buffers.set(id, audioBuffer);
    } catch (e) {
      console.error(`Failed to load sound ${id} from ${url}`, e);
    }
  }

  public playSFX(id: string, volume: number = 1.0) {
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

  public playBGM(id: string, volume: number = 1.0, loop: boolean = true) {
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

  public stopBGM() {
    if (this.bgmSource) {
      try {
        this.bgmSource.stop();
      } catch (e) {
        // Ignore if already stopped
      }
      this.bgmSource = null;
    }
  }

  public setBGMVolume(volume: number) {
    if (this.bgmGain) {
      this.bgmGain.gain.value = Math.max(0, Math.min(1, volume));
    }
  }

  public setSFXVolume(volume: number) {
    if (this.sfxGain) {
      this.sfxGain.gain.value = Math.max(0, Math.min(1, volume));
    }
  }
}

export const soundManager = new SoundManager();
