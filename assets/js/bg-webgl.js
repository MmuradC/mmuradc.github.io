/* bg-webgl.js — realistic pond for mmuradc.github.io.
   WebGL shader: per-pixel wave height field (procedural capillary waves +
   real expanding rain rings with damping + edge reflection), shaded with
   true normals, Fresnel sky reflection and specular glints.
   Drops are fed as a uniform array (x, y, born, amp) — max 24 alive.
   Falls back to a plain gradient if WebGL is unavailable.

   Public controls:  window.MMCWATER = { dropsPerSec, speed, mult }      */
(function () {
  'use strict';

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── knobs (also exposed to console) ─────────────────────────────── */
  const CFG = window.MMCWATER = window.MMCWATER = window.MMCWATER
    ? window.MMCWATER
    : {
        dropsPerSec: 0.8,     // ambient rain — pond mostly serene
        bigDropChance: 0.25,
        speed: 0.22,          // ring expansion (UV units/s)
        mult: 1.0,            // overall wave amplitude
        fallTime: 0.30,       // seconds a drop spends falling (shader: FALL)
        lamp: [0.38, 0.7, 0.95]  // warm lamp direction (normalized in shader)
      };

  /* URL overrides for testing: index.html?rain=12 drops/s */
  try {
    const q = new URLSearchParams(location.search);
    if (q.has('rain')) CFG.dropsPerSec = Math.max(0.1, +q.get('rain') || 0.8);
  } catch (e) { /* no URLSearchParams — fine */ }

  const canvas = document.getElementById('bgCanvas');
  if (!canvas) return;

  const gl = canvas.getContext('webgl', { antialias: false, alpha: false });
  if (!gl) {
    // graceful fallback: static gradient so the page still works
    canvas.style.background =
      'radial-gradient(ellipse at 34% 26%, #123046 0%, #0a1830 45%, #050b14 100%)';
    return;
  }

  const MAX_R = 24;
  const WRAP_T = 120.0;   // shader clock wrap (s) — keep in sync with TWRAP in the shader

  /* ── shaders ─────────────────────────────────────────────────────── */
  const VS = `
    attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;

  const FS = `
    precision highp float;
    uniform vec2  uRes;
    uniform float uTime;
    uniform vec4  uR[${MAX_R}];       // x,y (uv), born (s), amp
    uniform vec3  uLamp;
    uniform float uSpeed;

    const float TWRAP = ${WRAP_T.toFixed(1)};   // wrapped clock (set from JS WRAP_T)

    const float PI = 3.14159265;

    /* GPU-safe hash (Hoskins): no huge-magnitude sin()/dot(), so the
       lattice value cannot collapse into hard steps on real hardware */
    float hash(vec2 p){
      vec3 p3 = fract(vec3(p.xyx) * 0.1031);
      p3 += dot(p3, p3.yzx + 33.33);
      return fract((p3.x + p3.y) * p3.z);
    }

    /* smooth value noise + 2 octaves */
    float noise(vec2 p){
      vec2 i = floor(p), f = fract(p);
      vec2 u = f*f*(3.0-2.0*f);
      float a = hash(i), b = hash(i+vec2(1,0)), c = hash(i+vec2(0,1)), d = hash(i+vec2(1,1));
      return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
    }

    /**/ mat2 ROT = mat2(0.9063, -0.4226, 0.4226, 0.9063);  // 25° — breaks the square lattice

    /* height of one rain ring at radius/age */
    float ringH(float r, float age, float amp, float speed){
      if (age < 0.0) return 0.0;
      float R = age * speed;                       // wavefront radius
      float k = 34.0;                              // spatial frequency
      float spread = 0.055;                        // ring width in uv
      float env = exp(-abs(r - R) / spread);       // lives only near the front
      float dampRate = exp(-age * 1.15);           // energy fades with age
      float edge  = max(0.0, 1.0 - r / max(age*speed, 0.001));
      return amp * env * dampRate * edge * sin((r - R) * k);
    }

    /* sparse rain streaks falling through the 'air' above the surface:
       REMOVED — replace with per-drop streaks coupled to the rings (below).
    float rainStreak(vec2 uv, float t){
      vec2 cell = vec2(floor(uv.x * 140.0), floor(uv.y * 30.0 - t * 260.0));
      float h = hash(cell);
      if (h < 0.986) return 0.0;
      float xf = fract(uv.x * 140.0);
      float yf = fract(uv.y * 30.0 - t * 260.0);
      float core = (1.0 - abs(xf - 0.5) * 2.0) * smoothstep(0.0, 0.25, yf) * smoothstep(1.0, 0.65, yf);
      return core * (0.5 + h * 0.9);
    } */

    float height(vec2 uv, float t){
      float h = 0.0;
      // capillary chop: small crossing ripples so the surface undulates
      // (noise octaves rotated so their square lattice cannot tile visibly)
      h += sin(uv.x * 23.0 + t * 1.7 + noise(ROT * (uv*3.0+t*0.2))*3.0) * 0.014;
      h += sin(uv.y * 31.0 - t * 1.3) * 0.012;
      h += sin((uv.x + uv.y) * 15.0 + t) * 0.015;
      h += (noise(ROT * (uv * 9.0 + vec2(t * .12, -t * .07))) - .5) * 0.045;
      // rain rings — R.z is the LANDING time; age<0 = still falling
      for (int i = 0; i < ${MAX_R}; i++){
        vec4 R = uR[i];
        if (R.w <= 0.0) continue;
        float r = distance(uv, R.xy) + 0.001;
        h += ringH(r, t - R.z, R.w, uSpeed);
      }
      return h;
    }

    const float FALL = 0.30;               // match JS CFG fallTime (s)

    /* per-drop falling streak: descends toward the EXACT landing point
       during age<0, accelerating near impact — then the ring takes over */
    vec3 dropStreak(vec4 R, vec2 uv, float t, float lampPool){
      float age = t - R.z;
      if (age >= 0.0 || R.w <= 0.0) return vec3(0.0);
      float p = 1.0 + age / FALL;                        // 0 spawn → 1 impact
      float yc = R.y - (1.0 - p) * 0.34;                 // start ~1/3 screen up
      float len = 0.010 + 0.055 * p * p;                 // motion blur trail
      float dx  = (uv.x - R.x) * (uRes.x / uRes.y);      // aspect-correct
      float core = exp(-abs(dx) / (0.0009 + 0.0016 * p));
      float inY  = smoothstep(yc - len, yc, uv.y)        // trail ABOVE head
                 * smoothstep(yc + 0.004, yc, uv.y);     // hard cut at tip
      float a = core * inY * (0.25 + 0.75 * p) * clamp(R.w / 0.7, 0.35, 1.35);
      return vec3(0.72, 0.78, 0.90) * a * 0.55
           + vec3(1.00, 0.70, 0.40) * a * lampPool * 0.6;
    }

    void main(){
      vec2 uv = gl_FragCoord.xy / uRes;            // 0..1, y up
      uv.y = 1.0 - uv.y;                           // top-left origin like CSS
      float t = uTime;

      /* normal via finite differences */
      float e = 1.5 / uRes.x;
      float h  = height(uv, t);
      float hx = height(uv + vec2(e, 0.0), t) - height(uv - vec2(e, 0.0), t);
      float hy = height(uv + vec2(0.0, e), t) - height(uv - vec2(0.0, e), t);
      vec3 n = normalize(vec3(-hx * uRes.x * e * 400.0, -hy * uRes.y * e * 400.0, 1.0));

      /* deep water base: vertical depth + soft caustic noise pools.
         richer, darker teal so panels and text pop against it.
         cloud = two rotated octaves at different scales — no square cells */
      vec3 deep = mix(vec3(0.020, 0.062, 0.105), vec3(0.005, 0.014, 0.030), uv.y);
      float cloud = noise(ROT * (uv * 4.0 + vec2(t * .05))) * 0.7
                  + noise(uv * vec2(9.3, 10.7) + vec2(-t * .08, t * .06)) * 0.3;
      deep *= 0.70 + cloud * 0.55;

      /* mist patches drifting across the surface: two octaves, rotated,
         wide ramp so no plateau/square structure can appear */
      float mist = noise(ROT * (uv * vec2(3.0, 4.5) + vec2(t * .03, -t * .045))) * 0.65
                 + noise(ROT * (uv * vec2(6.4, 8.2) - vec2(t * .05, -t * .03))) * 0.35;
      mist = smoothstep(0.30, 1.10, mist);
      deep += vec3(0.30, 0.42, 0.50) * mist * 0.075;

      /* fresnel-ish sky reflection (dusk sky: cool zenith, warm horizon) */
      vec3 skyA = vec3(0.16, 0.24, 0.36);          // cool night zenith
      vec3 skyB = vec3(0.55, 0.38, 0.22);          // warm dusk horizon
      float fr = pow(1.0 - abs(n.z), 2.0);
      vec3 ref = mix(skyA, skyB, clamp(1.0 - uv.y * 1.4, 0.0, 1.0));

      /* specular glint (moon hard, lamp soft) */
      vec3 L = normalize(uLamp);
      vec3 V = vec3(0.0, 0.0, 1.0);
      vec3 Hn = normalize(L + V);
      float spec = pow(max(dot(n, Hn), 0.0), 70.0);

      /* combine */
      vec3 col = mix(deep, ref, fr * 0.72);

      /* warm lamp pool sitting on the water near the lamp direction */
      vec2 lampUV = vec2(0.38, 0.72);
      float dLamp = distance(uv * vec2(uRes.x / uRes.y, 1.0), lampUV * vec2(uRes.x / uRes.y, 1.0));
      float lampPool = exp(-dLamp * dLamp * 7.0);
      col += vec3(1.0, 0.60, 0.28) * lampPool * (0.30 + 0.55 * lampPool);

      /* sparkle glints where wave crests catch light */
      float crest = max(0.0, h);
      col += vec3(0.65, 0.80, 0.95) * crest * crest * 0.55;
      col += vec3(1.0, 0.92, 0.78) * spec * 0.9;

      /* per-drop falling streaks, tied 1:1 to the rings */
      for (int i = 0; i < ${MAX_R}; i++){
        vec4 R = uR[i];
        if (R.w <= 0.0) continue;
        float ageS = t - R.z;
        if (ageS >= 0.0 || ageS < -FALL) continue;
        col += dropStreak(R, uv, t, lampPool);
        // impact flash — barely started ring gets a bright pop
        if (ageS > -0.02) {
          float fl = (1.0 + ageS / 0.02) * max(0.0, 1.0 - ageS * 14.0);
          float d = distance(uv * vec2(uRes.x / uRes.y, 1.0), R.xy * vec2(uRes.x / uRes.y, 1.0));
          col += vec3(0.85, 0.88, 1.0) * fl * clamp(R.w, 0.3, 1.0) * exp(-d * 260.0) * 0.55;
        }
      }

      /* vignette */
      float vg = smoothstep(1.25, 0.35, distance(uv, vec2(.5)));
      col *= 0.48 + vg * 0.52;

      /* dither: breaks 8-bit banding on the dark gradients —
         without this, iso-value patches read as square-ish blocks */
      col += (hash(gl_FragCoord.xy + vec2(t * 61.0, t * 41.0)) - 0.5) * (1.8 / 255.0);

      gl_FragColor = vec4(col, 1.0);
    }
  `;

  /* ── compile ─────────────────────────────────────────────────────── */
  function sh(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
      console.error(gl.getShaderInfoLog(s), src);
    return s;
  }
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(prog));
    canvas.style.background =
      'radial-gradient(ellipse at 34% 26%, #123046 0%, #0a1830 45%, #050b14 100%)';
    return;
  }
  gl.useProgram(prog);

  // fullscreen triangle
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
  const locP = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(locP);
  gl.vertexAttribPointer(locP, 2, gl.FLOAT, false, 0, 0);

  const uRes  = gl.getUniformLocation(prog, 'uRes');
  const uTime = gl.getUniformLocation(prog, 'uTime');
  const uR    = gl.getUniformLocation(prog, 'uR');
  const uLamp = gl.getUniformLocation(prog, 'uLamp');
  const uSpeed = gl.getUniformLocation(prog, 'uSpeed');

  /* ── state ───────────────────────────────────────────────────────── */
  let dpr = 1, VW = 0, VH = 0;
  const ripples = new Float32Array(MAX_R * 4);   // x, y, born, amp
  let slot = 0, t0 = performance.now() / 1000;

  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    VW = innerWidth; VH = innerHeight;
    canvas.width = VW * dpr; canvas.height = VH * dpr;
    canvas.style.width = VW + 'px'; canvas.style.height = VH + 'px';
    gl.viewport(0, 0, canvas.width, canvas.height);
  }

  function addDrop(x, y, amp, fall) {
    if (!VW) return;
    if (fall === undefined) fall = CFG.fallTime;
    // born = LANDING time in the WRAPPED shader clock domain (TWRAP):
    // the streak falls toward (x,y), then the ring starts at the tip
    ripples[slot * 4]     = x / VW;
    ripples[slot * 4 + 1] = y / VH;
    ripples[slot * 4 + 2] = (performance.now() / 1000 - t0 + fall) % WRAP_T;
    ripples[slot * 4 + 3] = amp;
    slot = (slot + 1) % MAX_R;
  }

  let acc = 0, last = performance.now();

  function frame(nowMs) {
    const now = nowMs / 1000 - t0;
    const dt = Math.min(nowMs - last, 50); last = nowMs;

    const rate = reduced ? CFG.dropsPerSec * 0.5 : CFG.dropsPerSec;
    acc += dt / 1000 * rate;
    while (acc >= 1) {
      acc -= 1;
      addDrop(Math.random() * VW, Math.random() * VH,
              (Math.random() < CFG.bigDropChance ? 0.55 : 0.16 + Math.random() * 0.28) * CFG.mult);
    }

    // feed uniforms
    gl.uniform2f(uRes, canvas.width, canvas.height);
    // wrap the shader clock so sin() arguments stay small on real GPUs
    // (period = 120 s; all animated layers are incommensurate so the
    // loop seam is invisible, and float precision never degrades)
    gl.uniform1f(uTime, now % 120.0);
    gl.uniform3f(uLamp, CFG.lamp[0], CFG.lamp[1], CFG.lamp[2]);
    gl.uniform1f(uSpeed, CFG.speed);
    const pack = [];
    for (let i = 0; i < MAX_R; i++) {
      pack.push(ripples[i*4], ripples[i*4+1], ripples[i*4+2], ripples[i*4+3]);
    }
    gl.uniform4fv(uR, pack);

    gl.drawArrays(gl.TRIANGLES, 0, 3);
    requestAnimationFrame(frame);
  }

  addEventListener('pointerdown', e => {
    addDrop(e.clientX, e.clientY, 0.85 * CFG.mult, 0);   // click = instant, matches the plip
    if (window.MMC_SFX) MMC_SFX.play('drop');
    setTimeout(() => addDrop(e.clientX + (Math.random()-.5)*30, e.clientY + (Math.random()-.5)*30, 0.4), 170);
  });
  addEventListener('resize', resize);
  resize();
  requestAnimationFrame(frame);
})();
