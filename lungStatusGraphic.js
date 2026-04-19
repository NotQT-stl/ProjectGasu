// ============================================================
// lungStatusGraphic.js — AeroGuard Lung Image Visualization
//
// Drives the uploaded lung PNG with AQI-responsive:
//   • CSS filter  — hue shifts green → gray as air quality worsens
//   • Breathing   — sinusoidal scale, slows/shrinks at high AQI
//   • Dust overlay— semi-transparent dark veil grows with AQI
//
// Public API (unchanged from SVG version):
//   new LungStatusGraphic(containerId)
//   instance.update(aqi)
// ============================================================

// ── AQI tier → visual state ───────────────────────────────────
// filter:     CSS filter string applied to the <img>
// dustOpacity:overlay darkness  (0 = none, 0.72 = dense smog)
// breathDur:  one full inhale/exhale cycle in seconds
// breathAmp:  peak scale increase at inhale (0.05 = 5% taller)
const AQI_STATES = [
  { maxAqi:  50, filter: 'saturate(1.20) brightness(1.05)',                          dustOpacity: 0.00, breathDur: 3.2,  breathAmp: 0.052 },
  { maxAqi: 100, filter: 'hue-rotate(-18deg) saturate(1.00)',                        dustOpacity: 0.08, breathDur: 4.2,  breathAmp: 0.040 },
  { maxAqi: 150, filter: 'hue-rotate(-38deg) saturate(0.72) brightness(0.92)',       dustOpacity: 0.22, breathDur: 5.5,  breathAmp: 0.028 },
  { maxAqi: 200, filter: 'hue-rotate(-58deg) saturate(0.42) brightness(0.80)',       dustOpacity: 0.40, breathDur: 7.2,  breathAmp: 0.016 },
  { maxAqi: 300, filter: 'grayscale(0.55) brightness(0.68)',                         dustOpacity: 0.56, breathDur: 10.0, breathAmp: 0.008 },
  { maxAqi: 500, filter: 'grayscale(1.00) brightness(0.48) contrast(0.85)',          dustOpacity: 0.72, breathDur: 14.0, breathAmp: 0.003 },
];

// ── Simple numeric lerp ───────────────────────────────────────
function lerp(a, b, t) { return a + (b - a) * t; }

export class LungStatusGraphic {
  #container   = null;
  #img         = null;
  #dust        = null;

  // Smooth transition state
  #cur = { dustOpacity: 0.00, breathDur: 3.2, breathAmp: 0.052 };
  #tgt = { ...this.#cur };

  // Breathing
  #breathPhase = 0;
  #lastTs      = null;
  #rafId       = null;

  static #LERP_T = 0.025; // fraction per frame — ~0.45 s to 63% of target

  /**
   * @param {string} containerId  id of the wrapper <div> in index.html
   */
  constructor(containerId) {
    this.#container = document.getElementById(containerId);
    if (!this.#container) {
      console.error(`[LungStatusGraphic] #${containerId} not found`);
      return;
    }
    this.#build();
    this.#startLoop();
  }

  // ── Build DOM ─────────────────────────────────────────────────
  #build() {
    this.#container.innerHTML = `
      <div class="lung-img-frame">
        <img
          src="lung.png"
          class="lung-img"
          alt="Lung health visualization"
          draggable="false"
        />
        <div class="lung-dust-overlay"></div>
      </div>
    `;
    this.#img  = this.#container.querySelector('.lung-img');
    this.#dust = this.#container.querySelector('.lung-dust-overlay');
  }

  // ── Public update — called every sensor tick ──────────────────
  update(aqi) {
    const state = AQI_STATES.find(s => aqi <= s.maxAqi) ?? AQI_STATES.at(-1);

    // Apply CSS filter immediately (transition handled by CSS transition property)
    if (this.#img) this.#img.style.filter = state.filter;

    // Set lerp targets for animated properties
    this.#tgt.dustOpacity = state.dustOpacity;
    this.#tgt.breathDur   = state.breathDur;
    this.#tgt.breathAmp   = state.breathAmp;
  }

  // ── rAF loop ──────────────────────────────────────────────────
  #startLoop() {
    const tick = (ts) => {
      this.#rafId = requestAnimationFrame(tick);

      const dt = this.#lastTs == null ? 16 : ts - this.#lastTs;
      this.#lastTs = ts;

      const T = LungStatusGraphic.#LERP_T;

      // Lerp animated properties toward target
      this.#cur.dustOpacity = lerp(this.#cur.dustOpacity, this.#tgt.dustOpacity, T);
      this.#cur.breathDur   = lerp(this.#cur.breathDur,   this.#tgt.breathDur,   T);
      this.#cur.breathAmp   = lerp(this.#cur.breathAmp,   this.#tgt.breathAmp,   T);

      // Advance breathing phase (0..1 wrapping)
      const cyclePx = this.#cur.breathDur * 1000;
      this.#breathPhase = (this.#breathPhase + dt / cyclePx) % 1;

      // Sinusoidal scale (peaks at phase=0.45 — slightly asymmetric like real breathing)
      const sin = Math.sin(this.#breathPhase * Math.PI * 2 - Math.PI / 2);
      const scale = 1 + this.#cur.breathAmp * ((sin + 1) / 2);

      // Apply breathing scale to the image frame
      if (this.#img) {
        this.#img.style.transform = `scaleY(${scale.toFixed(4)})`;
      }

      // Apply dust overlay opacity
      if (this.#dust) {
        this.#dust.style.opacity = this.#cur.dustOpacity.toFixed(4);
      }
    };

    this.#rafId = requestAnimationFrame(tick);
  }

  // ── Cleanup (call if the component is removed) ────────────────
  destroy() {
    if (this.#rafId) cancelAnimationFrame(this.#rafId);
  }
}
