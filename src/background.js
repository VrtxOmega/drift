// ══════════════════════════════════════════════════════
// DRIFT — Background Renderer + Ambient Breathing System
// Nebula, Milky Way band, star field, global pulse
// Never empty — always alive, just quiet
// ══════════════════════════════════════════════════════

import * as THREE from 'three';
import { scene } from './scene.js';

/** Generate a radial glow sprite texture for professional star rendering */
function createStarGlowTexture() {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
  grad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
  grad.addColorStop(0.1, 'rgba(255, 255, 255, 0.8)');
  grad.addColorStop(0.3, 'rgba(200, 210, 255, 0.3)');
  grad.addColorStop(0.6, 'rgba(150, 170, 255, 0.05)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  return tex;
}

const starGlowTex = createStarGlowTexture();

/** Stored references for animation */
let starFieldMat = null;
let milkyWayMat = null;
let nebulaMat = null;

/**
 * Create the background star field.
 * ~3000 random stars at various distances.
 */
export function createBackgroundStars() {
  const count = 6000;  // doubled for richer starfield
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const r = 100 + Math.random() * 80;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.cos(phi);
    positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);

    // Slightly blue-white tints
    const warmth = Math.random();
    colors[i * 3] = 0.6 + warmth * 0.35;
    colors[i * 3 + 1] = 0.6 + warmth * 0.3;
    colors[i * 3 + 2] = 0.7 + warmth * 0.3;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  starFieldMat = new THREE.PointsMaterial({
    vertexColors: true,
    size: 1.2,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    map: starGlowTex  // Radial glow sprite — no more flat squares
  });

  const points = new THREE.Points(geo, starFieldMat);
  points.renderOrder = -3;
  scene.add(points);
  return points;
}

/**
 * Create the Milky Way band — a great circle of particles.
 */
export function createMilkyWay() {
  const count = 8000;  // doubled for denser galactic band
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);

  const tilt = 63 * Math.PI / 180;
  const rot = 123 * Math.PI / 180;

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const r = 95 + Math.random() * 10;
    const spread = (Math.random() - 0.5) * 20;
    const vSpread = (Math.random() - 0.5) * 12;

    let x = r * Math.cos(angle) + spread;
    let y = vSpread;
    let z = r * Math.sin(angle) + spread;

    const y2 = y * Math.cos(tilt) - z * Math.sin(tilt);
    const z2 = y * Math.sin(tilt) + z * Math.cos(tilt);
    const x2 = x * Math.cos(rot) - z2 * Math.sin(rot);
    const z3 = x * Math.sin(rot) + z2 * Math.cos(rot);

    positions[i * 3] = x2;
    positions[i * 3 + 1] = y2;
    positions[i * 3 + 2] = z3;

    const isCore = Math.abs(spread) < 6;
    if (isCore) {
      colors[i * 3] = 0.75 + Math.random() * 0.25;
      colors[i * 3 + 1] = 0.70 + Math.random() * 0.25;
      colors[i * 3 + 2] = 0.80 + Math.random() * 0.2;
    } else {
      colors[i * 3] = 0.55 + Math.random() * 0.25;
      colors[i * 3 + 1] = 0.50 + Math.random() * 0.2;
      colors[i * 3 + 2] = 0.65 + Math.random() * 0.3;
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  milkyWayMat = new THREE.PointsMaterial({
    vertexColors: true,
    size: 0.9,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.2,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    map: starGlowTex  // Same glow sprite for uniform quality
  });

  const points = new THREE.Points(geo, milkyWayMat);
  points.renderOrder = -1;
  scene.add(points);
  return points;
}

/**
 * Create a subtle nebula fog via a BackSide sphere.
 */
export function createNebula() {
  const geo = new THREE.SphereGeometry(130, 32, 32);

  nebulaMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(0x020208),  // near-black, not purple
    side: THREE.BackSide,
    transparent: true,
    opacity: 0.03,  // barely visible — just the faintest depth hint
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  const mesh = new THREE.Mesh(geo, nebulaMat);
  mesh.renderOrder = -2;
  scene.add(mesh);
  return mesh;
}

/**
 * Global ambient breathing system.
 * Makes the entire scene feel alive — slow pulse on stars,
 * milky way, and nebula. Never dead, just quiet.
 * @param {number} elapsed - Total elapsed time from clock
 */
export function updateAmbientBreathing(elapsed) {
  // Star field: gentle brightness breathing (4s cycle)
  if (starFieldMat) {
    const starBreath = 0.5 + 0.5 * Math.sin(elapsed * 0.4);
    starFieldMat.opacity = 0.60 + starBreath * 0.15;
  }

  // Milky Way: slower, deeper breath (7s cycle)
  if (milkyWayMat) {
    const mwBreath = 0.5 + 0.5 * Math.sin(elapsed * 0.25 + 1.0);
    milkyWayMat.opacity = 0.12 + mwBreath * 0.06;
  }

  // Nebula: very slow color shift (12s cycle) — subtle warmth pulse
  if (nebulaMat) {
    const nebBreath = 0.5 + 0.5 * Math.sin(elapsed * 0.15 + 2.0);
    nebulaMat.opacity = 0.06 + nebBreath * 0.04;
    // Shift between cool purple and slightly warm
    const r = 0x1a / 255 + nebBreath * 0.03;
    const g = 0x0a / 255 + nebBreath * 0.01;
    const b = 0x3e / 255 - nebBreath * 0.02;
    nebulaMat.color.setRGB(r, g, b);
  }
}
