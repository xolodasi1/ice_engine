export class InputManager {
  private keysDown: Set<string> = new Set();
  private keysPressed: Set<string> = new Set();
  private mousePosition: { x: number; y: number } = { x: 0, y: 0 };
  private mouseButtonsDown: Set<number> = new Set();
  private mouseButtonsPressed: Set<number> = new Set();
  private isEnabled: boolean = false;

  constructor() {
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
  }

  public init() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('mousemove', this.handleMouseMove);
    window.addEventListener('mousedown', this.handleMouseDown);
    window.addEventListener('mouseup', this.handleMouseUp);
  }

  public destroy() {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('mousemove', this.handleMouseMove);
    window.removeEventListener('mousedown', this.handleMouseDown);
    window.removeEventListener('mouseup', this.handleMouseUp);
  }

  public setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
    if (!enabled) {
      this.keysDown.clear();
      this.keysPressed.clear();
      this.mouseButtonsDown.clear();
      this.mouseButtonsPressed.clear();
    }
  }

  public update() {
    // Clear 'pressed' states at the end of the frame
    this.keysPressed.clear();
    this.mouseButtonsPressed.clear();
  }

  public isKeyDown(key: string): boolean {
    return this.isEnabled && this.keysDown.has(key);
  }

  public isKeyPressed(key: string): boolean {
    return this.isEnabled && this.keysPressed.has(key);
  }

  public isMouseButtonDown(button: number): boolean {
    return this.isEnabled && this.mouseButtonsDown.has(button);
  }

  public isMouseButtonPressed(button: number): boolean {
    return this.isEnabled && this.mouseButtonsPressed.has(button);
  }

  public getMousePosition(): { x: number; y: number } {
    return { ...this.mousePosition };
  }

  private handleKeyDown(e: KeyboardEvent) {
    if (!this.isEnabled) return;
    if (!this.keysDown.has(e.code)) {
      this.keysPressed.add(e.code);
    }
    this.keysDown.add(e.code);
  }

  private handleKeyUp(e: KeyboardEvent) {
    if (!this.isEnabled) return;
    this.keysDown.delete(e.code);
  }

  private handleMouseMove(e: MouseEvent) {
    if (!this.isEnabled) return;
    this.mousePosition = { x: e.clientX, y: e.clientY };
  }

  private handleMouseDown(e: MouseEvent) {
    if (!this.isEnabled) return;
    if (!this.mouseButtonsDown.has(e.button)) {
      this.mouseButtonsPressed.add(e.button);
    }
    this.mouseButtonsDown.add(e.button);
  }

  private handleMouseUp(e: MouseEvent) {
    if (!this.isEnabled) return;
    this.mouseButtonsDown.delete(e.button);
  }
}
