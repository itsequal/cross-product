const HELP_GAME = 'WASD / flechas mover · SPACE análisis · V vectores · C cono · R reiniciar';
const HELP_MATH = 'Arrastra para orbitar los vectores · SPACE volver · R reiniciar';

const FORMULA = 'θ = atan2(|F × P|, F · P). El producto cruz da el lado y sin θ; el producto punto da cos θ. El campo de visión compara θ con la mitad del FOV. La distancia limita el rango y un raycast comprueba las paredes. El producto cruz, por sí solo, no decide la detección.';

function formatSigned(value) {
  return value.toFixed(3);
}

/**
 * DOM panel. It only reads plain numbers and strings from the detection snapshot.
 */
export class HUD {
  constructor() {
    this.root = document.getElementById('hud');
    this.visibility = document.getElementById('hud-visibility');
    this.mathBlock = document.getElementById('hud-math');
    this.compare = document.getElementById('hud-compare');
    this.formula = document.getElementById('hud-formula');
    this.legend = document.getElementById('hud-legend');
    this.help = document.getElementById('hud-help');
    this.badge = document.getElementById('hud-badge');
    this.banner = document.getElementById('banner');
    this.bannerTitle = document.getElementById('banner-title');
    this.bannerSub = document.getElementById('banner-sub');

    this.fields = {
      distance: document.getElementById('val-distance'),
      fov: document.getElementById('val-fov'),
      angle: document.getElementById('val-angle'),
      dot: document.getElementById('val-dot'),
      cross: document.getElementById('val-cross'),
      crossLength: document.getElementById('val-cross-length'),
      side: document.getElementById('val-side'),
      range: document.getElementById('val-range'),
    };

    this.formula.textContent = FORMULA;
    this.help.textContent = HELP_GAME;
    this._mode = 'game';
    this._status = 'playing';
  }

  update(state) {
    if (state.mode !== this._mode) {
      this._mode = state.mode;
      const math = state.showMath;
      this.mathBlock.hidden = !math;
      this.compare.hidden = !math;
      this.formula.hidden = !math;
      this.legend.hidden = !math;
      this.badge.hidden = !math;
      this.root.classList.toggle('is-math', math);
      this.help.textContent = math ? HELP_MATH : HELP_GAME;
    }

    this.visibility.textContent = state.visibility;
    this.visibility.dataset.state = state.visibility;

    if (state.showMath) {
      const insideAngle = state.angleDeg <= state.halfFovDeg + 0.05;
      const relation = insideAngle ? '≤' : '>';
      let verdict = insideAngle ? 'dentro del ángulo' : 'fuera del FOV';
      if (insideAngle && state.blocked) verdict = 'dentro del ángulo, pared bloquea';
      else if (insideAngle && !state.inRange) verdict = 'en ángulo, fuera de rango';
      this.compare.textContent = `${state.angleDeg.toFixed(1)}° ${relation} ${state.halfFovDeg.toFixed(0)}° → ${verdict}`;

      this.fields.distance.textContent = state.distance.toFixed(2);
      this.fields.range.textContent = state.inRange ? 'dentro' : 'fuera';
      this.fields.fov.textContent = `${state.fovDeg.toFixed(0)}°  (½ = ${state.halfFovDeg.toFixed(0)}°)`;
      this.fields.angle.textContent = `${state.angleDeg.toFixed(1)}°`;
      this.fields.dot.textContent = formatSigned(state.dot);
      this.fields.cross.textContent = `(${formatSigned(state.crossX)}, ${formatSigned(state.crossY)}, ${formatSigned(state.crossZ)})`;
      this.fields.crossLength.textContent = state.parallel
        ? `${state.crossLength.toFixed(3)}  ≈ 0 — vectores paralelos`
        : `${state.crossLength.toFixed(3)}  = sin θ`;
      this.fields.side.textContent = state.side;
    }

    const ended = (state.status === 'detected' || state.status === 'goal') && state.mode === 'game';
    this.banner.hidden = !ended;
    if (state.status !== this._status) {
      this._status = state.status;
      this.banner.classList.toggle('is-goal', state.status === 'goal');
      this.banner.classList.toggle('is-detected', state.status === 'detected');
      if (state.status === 'detected') {
        this.bannerTitle.textContent = 'DETECTADO';
        this.bannerSub.textContent = 'El ángulo y la distancia cayeron dentro del campo de visión. Pulsa R para reiniciar o SPACE para inspeccionar los vectores.';
      } else if (state.status === 'goal') {
        this.bannerTitle.textContent = 'MISIÓN COMPLETADA';
        this.bannerSub.textContent = 'Llegaste a la meta sin entrar en la zona roja. Pulsa R para reiniciar.';
      }
    }
  }
}
