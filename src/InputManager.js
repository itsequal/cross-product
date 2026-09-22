const TOGGLE_CODES = {
  Space: 'math',
  KeyM: 'math',
  KeyR: 'reset',
  KeyV: 'vectors',
  KeyC: 'cone',
};

/**
 * Keyboard state. Movement keys are a held set; mode keys are one-shot toggles.
 */
export class InputManager {
  constructor() {
    this.keys = new Set();
    this._toggles = [];
    this._onKeyDown = (event) => {
      if (event.code === 'Space' || event.code.startsWith('Arrow')) {
        event.preventDefault();
      }
      if (event.repeat) return;
      this.keys.add(event.code);
      const toggle = TOGGLE_CODES[event.code];
      if (toggle) this._toggles.push(toggle);
    };
    this._onKeyUp = (event) => {
      this.keys.delete(event.code);
    };
    this._onBlur = () => {
      this.keys.clear();
    };
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('blur', this._onBlur);
  }

  /** World XZ intent. W moves toward -Z (top of the tactical view). */
  axis() {
    let x = 0;
    let z = 0;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x += 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) z += 1;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) z -= 1;
    return { x, z };
  }

  consumeToggles() {
    if (this._toggles.length === 0) return this._toggles;
    const pending = this._toggles;
    this._toggles = [];
    return pending;
  }
}
