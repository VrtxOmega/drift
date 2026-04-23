// ══════════════════════════════════════════════════════
// DRIFT — Three.js Scene Setup (Professional Grade)
// EffectComposer + UnrealBloomPass for real HDR bloom
// Camera, renderer, controls, resize, render loop
// ══════════════════════════════════════════════════════

import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

/** @type {THREE.Scene} */
export let scene;
/** @type {THREE.PerspectiveCamera} */
export let camera;
/** @type {THREE.WebGLRenderer} */
export let renderer;
/** @type {EffectComposer} */
let composer;

// Camera state
let theta = 0;
let phi = Math.PI / 2;
let radius = 85;
const RADIUS_MIN = 20;
const RADIUS_MAX = 200;
let isDragging = false;
let lastMouse = { x: 0, y: 0 };
let autoRotate = true;

// Tween state
let tweenActive = false;
let tweenStart = {};
let tweenEnd = {};
let tweenT = 0;
const TWEEN_DURATION = 1.5;

// Animation callbacks
const updateCallbacks = [];

/**
 * Render a clean, high-resolution snapshot for export (share card, PNG).
 * Temporarily resizes the renderer, renders one frame without bloom,
 * then restores the original state.
 * @param {number} width  Export width in pixels
 * @param {number} height Export height in pixels
 * @returns {HTMLCanvasElement} A new canvas containing the snapshot
 */
export function captureSnapshot(width, height) {
  if (!renderer || !scene || !camera) throw new Error('Scene not initialised');

  // ── Save state ──
  const oldW = renderer.domElement.width;
  const oldH = renderer.domElement.height;
  const oldPixelRatio = renderer.getPixelRatio();
  const oldAspect = camera.aspect;

  // ── Resize renderer to exact export dimensions ──
  renderer.setPixelRatio(1);
  renderer.setSize(width, height);

  // ── Adjust camera aspect to match export ratio ──
  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  // ── Render one clean frame (no bloom, direct renderer output) ──
  renderer.render(scene, camera);

  // ── Clone the pixel data into a new offscreen canvas ──
  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = width;
  exportCanvas.height = height;
  const eCtx = exportCanvas.getContext('2d');
  eCtx.drawImage(renderer.domElement, 0, 0);

  // ── Restore state ──
  // onResize() would query window.innerWidth/innerHeight, but the window
  // hasn't actually resized — only the renderer was temporarily adjusted.
  // Re-apply the saved pixel ratio first, then restore sizes using the
  // stored pre-swap values.
  renderer.setPixelRatio(oldPixelRatio);
  renderer.setSize(oldW / oldPixelRatio, oldH / oldPixelRatio);
  camera.aspect = oldAspect;
  camera.updateProjectionMatrix();

  return exportCanvas;
}

/**
 * Initialize the Three.js scene, camera, renderer + bloom pipeline.
 * @param {HTMLCanvasElement} canvas
 */
export function initScene(canvas) {
  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);  // absolute black

  // Camera — wider FOV for immersive 3D depth
  camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 600);
  updateCameraPosition();

  // Renderer — full native resolution, high-performance
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
    logarithmicDepthBuffer: true,
    preserveDrawingBuffer: true
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);  // Full native (NVIDIA can handle it)
  renderer.sortObjects = true;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  // ── Post-processing: UnrealBloom ──
  // This is what makes it professional — bright objects bleed light
  const renderPass = new RenderPass(scene, camera);
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    1.4,    // strength — dramatic space-glow
    0.5,    // radius — wider light bleed for atmospheric bloom
    0.3     // threshold — lower so more stars glow
  );

  composer = new EffectComposer(renderer);
  composer.addPass(renderPass);
  composer.addPass(bloomPass);

  // Events
  window.addEventListener('resize', onResize);
  canvas.addEventListener('mousedown', onMouseDown);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mouseup', onMouseUp);
  canvas.addEventListener('mouseleave', onMouseUp);
  canvas.addEventListener('wheel', onWheel, { passive: true });
  canvas.addEventListener('touchstart', onTouchStart, { passive: false });
  canvas.addEventListener('touchmove', onTouchMove, { passive: false });
  canvas.addEventListener('touchend', onTouchEnd);
}

function updateCameraPosition() {
  if (!camera) return;
  camera.position.set(
    radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
  camera.lookAt(0, 0, 0);
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
}

// ── Mouse Controls ──

function onMouseDown(e) {
  isDragging = true;
  autoRotate = false;
  lastMouse = { x: e.clientX, y: e.clientY };
}

function onMouseMove(e) {
  if (!isDragging) return;
  const dx = e.clientX - lastMouse.x;
  const dy = e.clientY - lastMouse.y;
  theta -= dx * 0.005;
  phi -= dy * 0.005;
  phi = Math.max(0.1, Math.min(Math.PI - 0.1, phi));
  lastMouse = { x: e.clientX, y: e.clientY };
  updateCameraPosition();
}

function onMouseUp() {
  isDragging = false;
}

function onWheel(e) {
  radius += e.deltaY * 0.05;
  radius = Math.max(RADIUS_MIN, Math.min(RADIUS_MAX, radius));
  updateCameraPosition();
}

// ── Touch Controls ──

let lastTouch = { x: 0, y: 0 };
let lastPinchDist = 0;  // distance between two fingers

function getTouchDist(e) {
  const dx = e.touches[0].clientX - e.touches[1].clientX;
  const dy = e.touches[0].clientY - e.touches[1].clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

function onTouchStart(e) {
  if (e.touches.length === 1) {
    isDragging = true;
    autoRotate = false;
    lastTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    e.preventDefault();
  } else if (e.touches.length === 2) {
    // Begin pinch — stop pan drag
    isDragging = false;
    lastPinchDist = getTouchDist(e);
    e.preventDefault();
  }
}

function onTouchMove(e) {
  if (e.touches.length === 2) {
    // Pinch-zoom: scale radius by inverse of finger distance change
    const dist = getTouchDist(e);
    if (lastPinchDist > 0) {
      const delta = lastPinchDist - dist;  // positive = fingers coming together = zoom out (increase radius)
      radius += delta * 0.4;
      radius = Math.max(RADIUS_MIN, Math.min(RADIUS_MAX, radius));
      updateCameraPosition();
    }
    lastPinchDist = dist;
    e.preventDefault();
    return;
  }
  if (!isDragging || e.touches.length !== 1) return;
  const dx = e.touches[0].clientX - lastTouch.x;
  const dy = e.touches[0].clientY - lastTouch.y;
  theta -= dx * 0.005;
  phi -= dy * 0.005;
  phi = Math.max(0.1, Math.min(Math.PI - 0.1, phi));
  lastTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  updateCameraPosition();
  e.preventDefault();
}

function onTouchEnd(e) {
  if (e.touches.length < 2) lastPinchDist = 0;
  if (e.touches.length === 0) isDragging = false;
}

/**
 * Register a callback for each animation frame.
 * @param {function} fn - Receives (deltaTime, elapsedTime)
 */
export function onUpdate(fn) {
  updateCallbacks.push(fn);
}

/**
 * Tween camera to look at a 3D position.
 * @param {THREE.Vector3} target
 */
export function flyTo(target) {
  const dir = target.clone().normalize();
  tweenStart = { theta, phi, radius };
  tweenEnd = {
    theta: Math.atan2(dir.z, dir.x),
    phi: Math.acos(dir.y),  // FIX: removed the pointless `/ 1` that was here
    radius: Math.max(RADIUS_MIN + 5, radius * 0.7)
  };
  tweenT = 0;
  tweenActive = true;
  autoRotate = false;
}

/** Is the camera currently in galaxy-dive mode? */
let _isDive = false;
export function isGalaxyDive() { return _isDive; }

/**
 * Fly camera INTO a galaxy for commit-inspection mode.
 * @param {THREE.Vector3} targetGalaxyPos
 */
export function enterGalaxy(targetGalaxyPos) {
  const dir = targetGalaxyPos.clone().normalize();
  tweenStart = { theta, phi, radius };
  tweenEnd = {
    theta: Math.atan2(dir.z, dir.x),
    phi: Math.acos(dir.y),
    // Place camera ~10 units from galaxy center, looking straight at it
    radius: 12
  };
  tweenT = 0;
  tweenActive = true;
  autoRotate = false;
  _isDive = true;
}

/**
 * Fly camera back out to the universal home view.
 */
export function exitGalaxy() {
  tweenStart = { theta, phi, radius };
  tweenEnd = { theta: 0, phi: Math.PI / 2, radius: 85 };
  tweenT = 0;
  tweenActive = true;
  _isDive = false;
  autoRotate = true;
}

/**
 * Reset camera to home position.
 */
export function resetCamera() {
  tweenStart = { theta, phi, radius };
  tweenEnd = { theta: 0, phi: Math.PI / 2, radius: 85 };
  tweenT = 0;
  tweenActive = true;
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Start the render loop — uses EffectComposer for bloom.
 */
export function startLoop() {
  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    const dt = clock.getDelta();
    const elapsed = clock.getElapsedTime();

    // Auto-rotate
    if (autoRotate && !isDragging && !tweenActive) {
      theta += 0.0003;
      updateCameraPosition();
    }

    // Camera tween
    if (tweenActive) {
      tweenT += dt / TWEEN_DURATION;
      if (tweenT >= 1) {
        tweenT = 1;
        tweenActive = false;
      }
      const t = easeOutCubic(tweenT);
      theta = tweenStart.theta + (tweenEnd.theta - tweenStart.theta) * t;
      phi = tweenStart.phi + (tweenEnd.phi - tweenStart.phi) * t;
      radius = tweenStart.radius + (tweenEnd.radius - tweenStart.radius) * t;
      updateCameraPosition();
    }

    // Update callbacks
    for (const fn of updateCallbacks) {
      try { fn(dt, elapsed); } catch (e) { console.error('Update error:', e); }
    }

    // Render through bloom composer (not raw renderer)
    composer.render();
  }

  animate();
}

/**
 * Get raycaster from screen coordinates.
 * Accepts an optional existing Raycaster to populate in-place (avoids allocation).
 * @param {number} x - Screen X
 * @param {number} y - Screen Y
 * @param {THREE.Raycaster} [rc] - Optional raycaster to reuse
 * @returns {THREE.Raycaster}
 */
export function getRaycaster(x, y, rc) {
  // FIX: accept a pre-allocated Raycaster so callers in hot paths (mousemove)
  // can avoid creating a new object on every event.
  if (!rc) rc = new THREE.Raycaster();
  const mouse = new THREE.Vector2(
    (x / window.innerWidth) * 2 - 1,
    -(y / window.innerHeight) * 2 + 1
  );
  rc.setFromCamera(mouse, camera);
  return rc;
}
