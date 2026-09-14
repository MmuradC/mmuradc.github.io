/* ==========================================================================
   blocks.js — floating tetromino background for mmuradc.github.io
   --------------------------------------------------------------------------
   A full-viewport canvas of tetrominoes drifting slowly downward behind the
   page content. Pieces stay grid-aligned, fall smoothly, sway sideways and
   turn 90 degrees every few seconds. Three depth layers keep near pieces
   bigger, brighter and faster than far ones, which gives the whole thing
   parallax without any real 3D.

   Drop-in requirements:
     <div id="canvasHolder"><canvas id="blocksCanvas"></canvas></div>
   plus the matching #canvasHolder / #blocksCanvas rules in the stylesheet.

   Tune everything from CONFIG below, or live from the console:
     MMCBlocks.config({ alpha: [0.05, 0.13], maxPieces: 14 })
   ========================================================================== */

(function () {
	'use strict';

	var canvas = document.getElementById('blocksCanvas');
	if (!canvas) {
		console.warn('[blocks] #blocksCanvas not found in the document');
		return;
	}
	var ctx = canvas.getContext('2d');
	if (!ctx) return;

	/* ── configuration ─────────────────────────────────────────────────── */

	var CONFIG = {
		density:     0.000028,   // pieces per css pixel of viewport area
		minPieces:   10,
		maxPieces:   28,

		baseCell:    36,         // px cell size at depth 1.0
		cellGap:     3,          // px gap between adjacent blocks
		depth:       [0.55, 1.30],

		speed:       [0.30, 0.95],   // rows per second, before depth scaling
		sway:        [0.12, 0.50],   // cells of sideways drift
		swayFreq:    [0.10, 0.34],   // radians per second
		rotateEvery: [3.5, 10.0],    // seconds between 90-degree turns

		alpha:       [0.10, 0.26],   // per-piece opacity range
		parallax:    12,             // px of pointer parallax
		fadeIn:      2.4             // seconds
	};

	/* Kept to the site's gold / orange / red / vanilla palette. */
	var COLORS = [
		[255, 193, 0],    // gold
		[255, 130, 0],    // orange
		[255, 64, 48],    // red
		[255, 234, 174]   // vanilla
	];

	/* ── tetromino geometry ───────────────────────────────────────────── */

	var SHAPES = {
		I: [[1, 1, 1, 1]],
		O: [[1, 1], [1, 1]],
		T: [[1, 1, 1], [0, 1, 0]],
		S: [[0, 1, 1], [1, 1, 0]],
		Z: [[1, 1, 0], [0, 1, 1]],
		J: [[1, 0, 0], [1, 1, 1]],
		L: [[0, 0, 1], [1, 1, 1]]
	};

	var KINDS = Object.keys(SHAPES);

	function rotateCW(m) {
		var h = m.length, w = m[0].length, out = [], y, x;
		for (y = 0; y < w; y++) {
			out.push([]);
			for (x = 0; x < h; x++) out[y].push(m[h - 1 - x][y]);
		}
		return out;
	}

	/*
	 * ROTATIONS[kind] = the four 90-degree states of that piece.
	 * CELLS[kind][rot] = cell centres as offsets from the piece centre,
	 * in units of one cell, so a piece can be rotated about its own middle
	 * rather than about the corner of its bounding box.
	 */
	var ROTATIONS = {}, CELLS = {};

	KINDS.forEach(function (kind) {
		var mats = [SHAPES[kind]], m = SHAPES[kind], i;

		for (i = 0; i < 3; i++) {
			m = rotateCW(m);
			mats.push(m);
		}

		ROTATIONS[kind] = mats;

		CELLS[kind] = mats.map(function (mat) {
			var h = mat.length, w = mat[0].length, out = [], y, x;

			for (y = 0; y < h; y++) {
				for (x = 0; x < w; x++) {
					if (mat[y][x]) out.push([x - w / 2 + 0.5, y - h / 2 + 0.5]);
				}
			}

			return out;
		});
	});

	/* ── state ─────────────────────────────────────────────────────────── */

	var reduceMotion = window.matchMedia
		&& window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	var W = 0, H = 0, dpr = 1;
	var pieces = [];
	var vignette = null;
	var time = 0, last = 0, raf = 0, intro = 0;
	var pointer = { tx: 0, ty: 0, x: 0, y: 0 };

	function rand(a, b) { return a + Math.random() * (b - a); }
	function pick(a)    { return a[(Math.random() * a.length) | 0]; }
	function rgba(c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }

	/* ── a single drifting piece ───────────────────────────────────────── */

	function Piece(first) {
		var d0 = CONFIG.depth[0], d1 = CONFIG.depth[1];
		var t = Math.random();          // 0 = far away, 1 = right in front

		this.kind = pick(KINDS);
		this.rot = (Math.random() * 4) | 0;

		this.depth = d0 + t * (d1 - d0);
		this.cell = CONFIG.baseCell * this.depth;
		this.cols = Math.ceil(W / this.cell) + 4;
		this.rows = Math.ceil(H / this.cell) + 4;

		this.alpha = rand(CONFIG.alpha[0], CONFIG.alpha[1]) * (0.70 + 0.50 * t);
		this.speed = rand(CONFIG.speed[0], CONFIG.speed[1]) * (0.60 + 0.70 * t);

		this.swayAmp = rand(CONFIG.sway[0], CONFIG.sway[1]);
		this.swayFreq = rand(CONFIG.swayFreq[0], CONFIG.swayFreq[1]);
		this.phase = rand(0, Math.PI * 2);

		this.rotTimer = rand(CONFIG.rotateEvery[0], CONFIG.rotateEvery[1]);
		this.pulse = rand(0, Math.PI * 2);

		this.x = rand(-2, this.cols + 2);
		this.y = first ? rand(-2, this.rows + 2) : rand(-6, -2);

		this.size = this.cell - CONFIG.cellGap;

		setColor(this, pick(COLORS));
	}

	/* Gradient lives in the piece's local space: the draw call translates to
	   the cell and paints under that transform, so it only needs building
	   once per colour change. */
	function setColor(p, color) {
		var half = p.size / 2;

		p.color = color;
		p.grad = ctx.createLinearGradient(-half, -half, half, half);
		p.grad.addColorStop(0, rgba(color, 0.95));
		p.grad.addColorStop(1, rgba(color, 0.28));
	}

	/* ── build / resize ────────────────────────────────────────────────── */

	function rebuild() {
		dpr = Math.min(window.devicePixelRatio || 1, 2);
		W = canvas.clientWidth || window.innerWidth;
		H = canvas.clientHeight || window.innerHeight;

		canvas.width = Math.max(1, Math.round(W * dpr));
		canvas.height = Math.max(1, Math.round(H * dpr));
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

		var count = Math.round(W * H * CONFIG.density);
		count = Math.max(count, CONFIG.minPieces);
		count = Math.min(count, CONFIG.maxPieces);

		pieces = [];
		for (var i = 0; i < count; i++) pieces.push(new Piece(true));

		// far pieces are drawn first so nearer ones overlap them
		pieces.sort(function (a, b) { return a.depth - b.depth; });

		// soft vignette keeps the middle of the page readable over the motion
		var g = ctx.createRadialGradient(
			W / 2, H * 0.45, Math.min(W, H) * 0.12,
			W / 2, H * 0.50, Math.max(W, H) * 0.78
		);
		g.addColorStop(0, 'rgba(10,9,3,0)');
		g.addColorStop(1, 'rgba(10,9,3,0.62)');
		vignette = g;
	}

	/* ── simulation ────────────────────────────────────────────────────── */

	function respawn(p) {
		p.y = rand(-6, -2);
		p.x = rand(-2, p.cols + 2);
		p.kind = pick(KINDS);
		p.rot = (Math.random() * 4) | 0;
		p.swayAmp = rand(CONFIG.sway[0], CONFIG.sway[1]);
		p.speed = rand(CONFIG.speed[0], CONFIG.speed[1]) * (0.60 + 0.70 * (p.depth - CONFIG.depth[0]) / (CONFIG.depth[1] - CONFIG.depth[0]));
		setColor(p, pick(COLORS));
	}

	function update(dt) {
		for (var i = 0; i < pieces.length; i++) {
			var p = pieces[i];

			p.y += p.speed * dt;

			p.rotTimer -= dt;
			if (p.rotTimer <= 0) {
				p.rot = (p.rot + 1) % 4;
				p.rotTimer = rand(CONFIG.rotateEvery[0], CONFIG.rotateEvery[1]);
			}

			if (p.y > p.rows + 3) respawn(p);
		}

		// ease the pointer parallax so it never snaps
		var k = Math.min(1, dt * 3);
		pointer.x += (pointer.tx - pointer.x) * k;
		pointer.y += (pointer.ty - pointer.y) * k;
	}

	/* ── rendering ─────────────────────────────────────────────────────── */

	function rr(c, x, y, w, h, r) {
		c.moveTo(x + r, y);
		c.lineTo(x + w - r, y);
		c.quadraticCurveTo(x + w, y, x + w, y + r);
		c.lineTo(x + w, y + h - r);
		c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
		c.lineTo(x + r, y + h);
		c.quadraticCurveTo(x, y + h, x, y + h - r);
		c.lineTo(x, y + r);
		c.quadraticCurveTo(x, y, x + r, y);
		c.closePath();
	}

	function drawPiece(p) {
		var cells = CELLS[p.kind][p.rot];
		var cell = p.cell;
		var size = p.size;
		var half = size / 2;
		var radius = Math.min(size * 0.20, 9);

		var cx = (p.x + Math.sin(time * p.swayFreq + p.phase) * p.swayAmp) * cell;
		var cy = p.y * cell;

		// slow per-piece breathing so the field never looks frozen
		var a = p.alpha * intro * (0.82 + 0.18 * Math.sin(time * 0.6 + p.pulse));
		if (a <= 0.002) return;

		ctx.save();
		ctx.globalAlpha = a;
		ctx.translate(cx + pointer.x, cy + pointer.y);

		// one path for the whole piece, so the glow wraps the silhouette
		ctx.beginPath();
		for (var i = 0; i < cells.length; i++) {
			rr(ctx,
				cells[i][0] * cell - half,
				cells[i][1] * cell - half,
				size, size, radius);
		}

		ctx.shadowColor = rgba(p.color, 0.70);
		ctx.shadowBlur = cell * 0.50;
		ctx.fillStyle = p.grad;
		ctx.fill();

		ctx.shadowBlur = 0;
		ctx.lineWidth = 1;
		ctx.strokeStyle = rgba(p.color, 0.85);
		ctx.stroke();

		ctx.restore();
	}

	function draw() {
		ctx.clearRect(0, 0, W, H);

		ctx.globalAlpha = 1;
		if (vignette) {
			ctx.fillStyle = vignette;
			ctx.fillRect(0, 0, W, H);
		}

		for (var i = 0; i < pieces.length; i++) drawPiece(pieces[i]);

		ctx.globalAlpha = 1;
		ctx.shadowBlur = 0;
	}

	/* ── loop ──────────────────────────────────────────────────────────── */

	function frame(now) {
		var dt = (now - last) / 1000;
		last = now;
		if (dt > 0.1) dt = 0.1;          // tab was backgrounded, don't jump

		time += dt;
		intro = Math.min(1, time / CONFIG.fadeIn);

		update(dt);
		draw();

		raf = requestAnimationFrame(frame);
	}

	function start() {
		if (raf) return;
		last = performance.now();
		raf = requestAnimationFrame(frame);
	}

	function stop() {
		if (!raf) return;
		cancelAnimationFrame(raf);
		raf = 0;
	}

	/* ── events ────────────────────────────────────────────────────────── */

	var resizeTimer = 0;

	window.addEventListener('resize', function () {
		clearTimeout(resizeTimer);
		resizeTimer = setTimeout(function () {
			rebuild();
			if (reduceMotion) { intro = 1; draw(); }
		}, 140);
	});

	document.addEventListener('visibilitychange', function () {
		if (document.hidden) stop();
		else if (!reduceMotion) start();
	});

	window.addEventListener('pointermove', function (e) {
		if (reduceMotion) return;
		pointer.tx = ((e.clientX / W) - 0.5) * 2 * CONFIG.parallax;
		pointer.ty = ((e.clientY / H) - 0.5) * 2 * CONFIG.parallax;
	}, { passive: true });

	/* ── go ────────────────────────────────────────────────────────────── */

	rebuild();

	if (reduceMotion) {
		intro = 1;        // no animation loop, just one still frame
		draw();
	} else {
		start();
	}

	window.MMCBlocks = {
		config: function (opts) {
			if (!opts) return CONFIG;
			for (var k in opts) {
				if (Object.prototype.hasOwnProperty.call(CONFIG, k)) CONFIG[k] = opts[k];
			}
			rebuild();
			if (reduceMotion) { intro = 1; draw(); }
			return CONFIG;
		},
		rebuild: rebuild,
		pieces:  function () { return pieces; },
		cells:   function (kind, rot) { return CELLS[kind][rot]; }
	};

})();
