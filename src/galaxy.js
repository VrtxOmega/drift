// ══════════════════════════════════════════════════════
// DRIFT — Galaxy Generator v2 (Mountaintop Visuals)
// Each repo is a galaxy: spiral or elliptical.
// Commits are stars within each galaxy.
// Constellation lines are subtle gold arcs.
// ══════════════════════════════════════════════════════

import * as THREE from 'three';
import { scene } from './scene.js';

// Language → color mapping (vibrant, saturated)
const LANG_COLORS = {
  JavaScript:  new THREE.Color(0xf0db4f),
  TypeScript:  new THREE.Color(0x4a9eff),
  Python:      new THREE.Color(0x4b8bbe),
  Rust:        new THREE.Color(0xff6e40),
  Go:          new THREE.Color(0x00d4aa),
  Java:        new THREE.Color(0xe76f00),
  'C++':       new THREE.Color(0xf34b7d),
  C:           new THREE.Color(0x6295cb),   // more visible blue instead of gray
  'C#':        new THREE.Color(0x68d666),
  Ruby:        new THREE.Color(0xff3333),
  PHP:         new THREE.Color(0x7a86b8),
  Swift:       new THREE.Color(0xff6b3d),
  Kotlin:      new THREE.Color(0xb48eff),
  Solidity:    new THREE.Color(0x8a5cf5),
  HTML:        new THREE.Color(0xff6347),
  CSS:         new THREE.Color(0x7b55d4),
  Shell:       new THREE.Color(0x89e051),
  Dart:        new THREE.Color(0x00c4b0),
  Vue:         new THREE.Color(0x41b883),
  Svelte:      new THREE.Color(0xff3e00),
  Makefile:    new THREE.Color(0x427819),
  Perl:        new THREE.Color(0x0298c3),
  Assembly:    new THREE.Color(0x6E4C13),
  default:     new THREE.Color(0x8a8aa0)
};

// Commit message → type classification
function classifyCommit(message) {
  const m = (message || '').toLowerCase();
  if (/^(feat|add|new|implement|create)/i.test(m)) return 'feature';
  if (/^(fix|bug|patch|resolve|hotfix)/i.test(m)) return 'fix';
  if (/^(refactor|clean|restructure|reorganize)/i.test(m)) return 'refactor';
  if (/^(doc|readme|comment|update doc)/i.test(m)) return 'docs';
  if (/^(test|spec|coverage)/i.test(m)) return 'test';
  if (/^(ci|build|deploy|release|bump|version)/i.test(m)) return 'ci';
  if (/^(style|lint|format)/i.test(m)) return 'style';
  if (/^merge/i.test(m)) return 'merge';
  return 'other';
}

const COMMIT_COLORS = {
  feature: new THREE.Color(0x4a9eff),  // bright blue
  fix:     new THREE.Color(0xffaa33),  // warm amber
  refactor:new THREE.Color(0x4acfcf),  // teal
  docs:    new THREE.Color(0xbbbbdd),  // silver
  test:    new THREE.Color(0x5ce87a),  // green
  ci:      new THREE.Color(0xa06ef5),  // purple
  style:   new THREE.Color(0xff6ea8),  // pink
  merge:   new THREE.Color(0xc9b06b),  // gold
  other:   new THREE.Color(0x99aacc)   // blue-gray (brighter)
};

/** All visible galaxy groups for raycasting */
export const galaxyGroups = [];

/** Repo metadata map (name → details) */
export const galaxyMeta = new Map();

/** Hover slowdown state */
let _hoveredGalaxyName = null;

/** Set which galaxy is being hovered (null = none) */
export function setHoveredGalaxy(name) { _hoveredGalaxyName = name; }

/** Get rotation speed for a galaxy (slows near hovered) */
export function getGalaxyRotationSpeed(group) {
  if (!_hoveredGalaxyName) return 1.0;
  if (group.userData.repoName === _hoveredGalaxyName) return 0.15; // nearly stop
  // Nearby galaxies also slow slightly
  const hovered = galaxyGroups.find(g => g.userData.repoName === _hoveredGalaxyName);
  if (!hovered) return 1.0;
  const dist = group.position.distanceTo(hovered.position);
  if (dist < 30) return 0.3;
  if (dist < 60) return 0.6;
  return 1.0;
}

/**
 * Generate all galaxies from repo + commit data.
 */
export function createGalaxies(repos, commitMap, stats) {
  const n = repos.length;
  const SPHERE_R = 50;
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));

  // Find max commits for relative sizing
  let maxCommits = 1;
  for (const [, c] of commitMap) maxCommits = Math.max(maxCommits, c.length);

  for (let i = 0; i < n; i++) {
    const repo = repos[i];
    const commits = commitMap.get(repo.name) || [];

    // Fibonacci sphere positioning
    const y = 1 - (i / (n - 1 || 1)) * 2;
    const radiusAtY = Math.sqrt(1 - y * y);
    const thetaF = goldenAngle * i;
    const pos = new THREE.Vector3(
      radiusAtY * Math.cos(thetaF) * SPHERE_R,
      y * SPHERE_R,
      radiusAtY * Math.sin(thetaF) * SPHERE_R
    );

    const group = createSingleGalaxy(repo, commits, pos, maxCommits);
    galaxyGroups.push(group);

    galaxyMeta.set(repo.name, {
      name: repo.name,
      description: repo.description || 'No description',
      language: repo.language || 'Unknown',
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      commits: commits.length,
      lastPush: repo.pushed_at,
      url: repo.html_url,
      position: pos
    });
  }
}

/** Material references for gravitational center animation */
let gravCoreMat = null;
let gravHaloMat = null;

/**
 * Create the gravitational center anchor — a soft, pulsing radial glow
 * at the origin. Makes even sparse universes feel like a system that exists.
 * "Something is here, waiting."
 */
export function createGravitationalCenter() {
  // Inner core: warm, soft sphere
  const coreGeo = new THREE.SphereGeometry(1.5, 24, 24);
  gravCoreMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(0xffb347),
    transparent: true,
    opacity: 0.08,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const core = new THREE.Mesh(coreGeo, gravCoreMat);
  scene.add(core);

  // Outer halo: larger, dimmer
  const haloGeo = new THREE.SphereGeometry(5, 24, 24);
  gravHaloMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(0x1a0a3e),
    transparent: true,
    opacity: 0.04,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const halo = new THREE.Mesh(haloGeo, gravHaloMat);
  scene.add(halo);

  // Radial dust ring — faint particles orbiting the origin
  const ringCount = 200;
  const ringPos = new Float32Array(ringCount * 3);
  for (let i = 0; i < ringCount; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 3 + Math.random() * 8;
    ringPos[i * 3] = r * Math.cos(a);
    ringPos[i * 3 + 1] = (Math.random() - 0.5) * 2;
    ringPos[i * 3 + 2] = r * Math.sin(a);
  }
  const ringGeo = new THREE.BufferGeometry();
  ringGeo.setAttribute('position', new THREE.BufferAttribute(ringPos, 3));
  const ringMat = new THREE.PointsMaterial({
    color: 0xffb347,
    size: 0.3,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.12,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const ring = new THREE.Points(ringGeo, ringMat);
  scene.add(ring);
}

/**
 * Animate the gravitational center glow.
 * Called from the render loop.
 */
export function updateGravitationalCenter(elapsed) {
  if (gravCoreMat) {
    const pulse = 0.5 + 0.5 * Math.sin(elapsed * 0.8);
    gravCoreMat.opacity = 0.05 + pulse * 0.06;
  }
  if (gravHaloMat) {
    const pulse = 0.5 + 0.5 * Math.sin(elapsed * 0.5 + 1.0);
    gravHaloMat.opacity = 0.02 + pulse * 0.03;
  }
}

/**
 * Create a single galaxy (repo) at a position.
 * v3: Sparse amplification — fewer commits = bigger per-star impact
 *     Minimum galaxy size raised so low-activity users feel present
 */
function createSingleGalaxy(repo, commits, position, maxCommits) {
  const group = new THREE.Group();
  group.position.copy(position);
  group.userData = { repoName: repo.name };

  const langColor = LANG_COLORS[repo.language] || LANG_COLORS.default;
  // Scale galaxy size: minimum 3 (never tiny), max 7
  const relSize = commits.length / maxCommits;
  const galaxySize = 3 + relSize * 4;
  const isSpiral = commits.length > 15;

  // SPARSE AMPLIFICATION: fewer commits = bigger individual star impact
  const sparseFactor = commits.length < 5 ? 2.5 :
                       commits.length < 15 ? 1.8 :
                       commits.length < 50 ? 1.3 : 1.0;

  // ── Galaxy core glow (MUCH softer — smaller, more transparent) ──
  const coreGeo = new THREE.SphereGeometry(galaxySize * 0.12, 16, 16);
  const coreMat = new THREE.MeshBasicMaterial({
    color: langColor.clone().lerp(new THREE.Color(0xffffff), 0.3),
    transparent: true,
    opacity: 0.25,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const core = new THREE.Mesh(coreGeo, coreMat);
  group.add(core);

  // ── Halo sprite (subtler, more colorful) ──
  const haloCanvas = document.createElement('canvas');
  haloCanvas.width = 128;
  haloCanvas.height = 128;
  const hctx = haloCanvas.getContext('2d');
  const grad = hctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  const c = langColor;
  grad.addColorStop(0, `rgba(${Math.round(c.r*255)},${Math.round(c.g*255)},${Math.round(c.b*255)},0.2)`);
  grad.addColorStop(0.2, `rgba(${Math.round(c.r*255)},${Math.round(c.g*255)},${Math.round(c.b*255)},0.08)`);
  grad.addColorStop(0.5, `rgba(${Math.round(c.r*255)},${Math.round(c.g*255)},${Math.round(c.b*255)},0.02)`);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  hctx.fillStyle = grad;
  hctx.fillRect(0, 0, 128, 128);

  const haloTex = new THREE.CanvasTexture(haloCanvas);
  const haloMat = new THREE.SpriteMaterial({
    map: haloTex,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const halo = new THREE.Sprite(haloMat);
  halo.scale.set(galaxySize * 2.5, galaxySize * 2.5, 1);
  group.add(halo);

  // ── Commit stars (BIGGER, BRIGHTER, more vivid) ──
  if (commits.length > 0) {
    const starCount = commits.length;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const now = Date.now();

    for (let j = 0; j < starCount; j++) {
      const commit = commits[j];
      const msg = commit.commit?.message || '';
      const type = classifyCommit(msg);
      const commitColor = COMMIT_COLORS[type];
      const date = new Date(commit.commit?.author?.date || now);
      const dayAge = (now - date.getTime()) / 86400000;

      let x, y, z;
      if (isSpiral) {
        // 2-arm spiral — wider spread, more galaxy-like
        const arm = j % 2;
        const t = j / starCount;
        const armAngle = arm * Math.PI + t * Math.PI * 4; // tighter spiral
        const armR = (0.15 + t * 0.85) * galaxySize * 1.6;
        const scatter = (Math.random() - 0.5) * galaxySize * 0.4;
        const vScatter = (Math.random() - 0.5) * galaxySize * 0.08;
        x = armR * Math.cos(armAngle) + scatter;
        y = vScatter;
        z = armR * Math.sin(armAngle) + scatter;
      } else {
        // Elliptical — flattened sphere
        const r = Math.pow(Math.random(), 0.5) * galaxySize * 1.2;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        x = r * Math.sin(phi) * Math.cos(theta);
        y = r * Math.cos(phi) * 0.2;
        z = r * Math.sin(phi) * Math.sin(theta);
      }

      positions[j * 3] = x;
      positions[j * 3 + 1] = y;
      positions[j * 3 + 2] = z;

      // Blend commit type color with language color for unique galaxy tint
      const blended = commitColor.clone().lerp(langColor, 0.2);
      // Redshift aging
      const ageFactor = Math.min(1, dayAge / 180);
      const aged = blended.lerp(new THREE.Color(0xe8a84c), ageFactor * 0.12);
      // Boost brightness for fresh commits
      if (dayAge < 7) {
        aged.lerp(new THREE.Color(0xffffff), 0.3);
      } else if (dayAge < 30) {
        aged.lerp(new THREE.Color(0xffffff), 0.1);
      }
      colors[j * 3] = aged.r;
      colors[j * 3 + 1] = aged.g;
      colors[j * 3 + 2] = aged.b;
    }

    const _dummy = new THREE.Object3D();
    const starGeo = new THREE.OctahedronGeometry(0.3 * sparseFactor, 0); // Geometric diamonds instead of flat squares
    const starMat = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const stars = new THREE.InstancedMesh(starGeo, starMat, starCount);

    for (let j = 0; j < starCount; j++) {
      _dummy.position.set(positions[j*3], positions[j*3+1], positions[j*3+2]);
      _dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      _dummy.updateMatrix();
      stars.setMatrixAt(j, _dummy.matrix);
      stars.setColorAt(j, new THREE.Color(colors[j*3], colors[j*3+1], colors[j*3+2]));
    }
    stars.instanceMatrix.needsUpdate = true;
    if (stars.instanceColor) stars.instanceColor.needsUpdate = true;
    
    group.add(stars);
  }

  // ── Dust cloud (faint particles around the galaxy for depth) ──
  if (commits.length > 5) {
    const dustCount = Math.min(80, commits.length);
    const dustPos = new Float32Array(dustCount * 3);
    for (let d = 0; d < dustCount; d++) {
      const r = (0.5 + Math.random()) * galaxySize * 1.3;
      const a = Math.random() * Math.PI * 2;
      dustPos[d * 3] = r * Math.cos(a) + (Math.random() - 0.5) * galaxySize * 0.4;
      dustPos[d * 3 + 1] = (Math.random() - 0.5) * galaxySize * 0.12;
      dustPos[d * 3 + 2] = r * Math.sin(a) + (Math.random() - 0.5) * galaxySize * 0.4;
    }
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
    const dustMat = new THREE.PointsMaterial({
      color: langColor.clone().lerp(new THREE.Color(0xffffff), 0.5),
      size: 0.2,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.15,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    group.add(new THREE.Points(dustGeo, dustMat));
  }

  scene.add(group);
  return group;
}

// ══════════════════════════════════════════════════════
// NEURAL SYNAPSE CONSTELLATION SYSTEM
// Living, pulsing, firing connections between streak days
// ══════════════════════════════════════════════════════

/** Stores all animated synapse data for the render loop */
const synapses = [];

/**
 * Create streak constellations as living neural synapses.
 * v3: Pulsing lines, energy pulses traveling along curves,
 *     glowing nodes, electric gold + cyan highlights
 */
export function createConstellations(stats) {
  const dailyCommits = stats.dailyCommits;
  const dates = Object.keys(dailyCommits).sort();
  if (dates.length < 2) return;

  // Find consecutive day streaks — minimum 4 days
  const streaks = [];
  let current = [dates[0]];

  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1]);
    const curr = new Date(dates[i]);
    const gap = Math.floor((curr - prev) / 86400000);
    if (gap <= 1) {
      current.push(dates[i]);
    } else {
      if (current.length >= 4) streaks.push([...current]);
      current = [dates[i]];
    }
  }
  if (current.length >= 4) streaks.push(current);

  // Top 5 longest streaks
  streaks.sort((a, b) => b.length - a.length);
  const topStreaks = streaks.slice(0, 5);

  for (let si = 0; si < topStreaks.length; si++) {
    const streak = topStreaks[si];
    const intensity = Math.min(1, streak.length / 14);

    // Map dates to 3D positions
    const points = streak.map((d) => {
      const dayOfYear = Math.floor((new Date(d) - new Date(d.slice(0, 4) + '-01-01')) / 86400000);
      const goldenAngle = Math.PI * (3 - Math.sqrt(5));
      const y = 1 - (dayOfYear / 365) * 2;
      const r = Math.sqrt(1 - y * y);
      const theta = goldenAngle * dayOfYear;
      return new THREE.Vector3(
        r * Math.cos(theta) * 52,
        y * 52,
        r * Math.sin(theta) * 52
      );
    });

    // Smooth curve
    const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal', 0.5);
    const resolution = streak.length * 8;
    const curvePoints = curve.getPoints(resolution);

    // ── 1. BASE LINE: electric gold ──
    const lineGeo = new THREE.BufferGeometry().setFromPoints(curvePoints);
    const lineMat = new THREE.LineBasicMaterial({
      color: new THREE.Color(0xffc850),
      transparent: true,
      opacity: 0.30 + intensity * 0.30,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const line = new THREE.Line(lineGeo, lineMat);
    scene.add(line);

    // ── 2. GLOW LINE: electric blue outer glow (gold + blue = electric) ──
    const glowMat = new THREE.LineBasicMaterial({
      color: new THREE.Color(0x4a9eff),
      transparent: true,
      opacity: 0.06 + intensity * 0.10,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      linewidth: 1
    });
    const glowLine = new THREE.Line(lineGeo.clone(), glowMat);
    scene.add(glowLine);

    // ── 3. MEANINGFUL NODES: each dot = a commit day, sized by commits that day ──
    const nodeMats = [];
    for (let ni = 0; ni < points.length; ni++) {
      const dayDate = streak[ni];
      const dayCommits = dailyCommits[dayDate] || 1;
      // Size scales with significance: 1 commit = small, 10+ = large
      const nodeRadius = 0.35 + Math.min(dayCommits / 8, 0.8) + intensity * 0.15;
      const nodeGeo = new THREE.IcosahedronGeometry(nodeRadius, 0); // Geometric mesh hub instead of flat sphere
      // Color shifts: low commits = blue-white, high commits = hot gold
      const commitHeat = Math.min(1, dayCommits / 10);
      const nodeColor = new THREE.Color().lerpColors(
        new THREE.Color(0x88bbff),  // cool blue (few commits)
        new THREE.Color(0xffd700),  // hot gold (many commits)
        commitHeat
      );
      const nodeMat = new THREE.MeshBasicMaterial({
        color: nodeColor,
        transparent: true,
        opacity: 0.7 + commitHeat * 0.3,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        wireframe: true // Creates the intricate connection feel
      });
      const node = new THREE.Mesh(nodeGeo, nodeMat);
      node.position.copy(points[ni]);
      scene.add(node);
      nodeMats.push(nodeMat);
    }

    // ── 4. ENERGY PULSES: particles that travel along the curve ──
    // Multiple pulses per synapse, staggered
    const pulseCount = 2 + Math.floor(intensity * 3); // 2-5 pulses
    const pulseMats = [];
    const pulseSprites = [];
    const pulsePhases = [];

    // Create a glowing pulse texture
    const pulseCanvas = document.createElement('canvas');
    pulseCanvas.width = 64;
    pulseCanvas.height = 64;
    const pctx = pulseCanvas.getContext('2d');
    const pGrad = pctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    pGrad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');   // white-hot core
    pGrad.addColorStop(0.08, 'rgba(180, 220, 255, 0.95)'); // electric blue flash
    pGrad.addColorStop(0.2, 'rgba(255, 200, 80, 0.7)');   // gold ring
    pGrad.addColorStop(0.4, 'rgba(255, 170, 50, 0.3)');    // amber
    pGrad.addColorStop(0.65, 'rgba(74, 158, 255, 0.08)');  // blue ember
    pGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    pctx.fillStyle = pGrad;
    pctx.fillRect(0, 0, 64, 64);
    const pulseTex = new THREE.CanvasTexture(pulseCanvas);

    for (let pi = 0; pi < pulseCount; pi++) {
      const pMat = new THREE.SpriteMaterial({
        map: pulseTex,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        opacity: 0.0
      });
      const sprite = new THREE.Sprite(pMat);
      const baseSize = 1.0 + intensity * 1.5;
      sprite.scale.set(baseSize, baseSize, 1);
      sprite.position.copy(points[0]);
      scene.add(sprite);
      pulseMats.push(pMat);
      pulseSprites.push(sprite);
      pulsePhases.push(pi / pulseCount); // stagger evenly
    }

    // Store synapse data for animation
    synapses.push({
      curve,
      curveLength: curve.getLength(),
      lineMat,
      glowMat,
      nodeMats,
      pulseSprites,
      pulseMats,
      pulsePhases,
      pulseCount,
      intensity,
      speed: 0.08 + intensity * 0.12, // faster for longer streaks
      nodePositions: points
    });
  }
}

/**
 * Update all constellation synapses each frame.
 * Call this from the render loop via onUpdate.
 * @param {number} dt - Delta time
 * @param {number} elapsed - Total elapsed time
 */
export function updateConstellations(dt, elapsed) {
  for (const syn of synapses) {
    // ── Pulse base line opacity ──
    const basePulse = 0.5 + 0.5 * Math.sin(elapsed * 1.5 + syn.intensity * 10);
    syn.lineMat.opacity = (0.20 + syn.intensity * 0.25) * (0.6 + basePulse * 0.4);
    syn.glowMat.opacity = (0.06 + syn.intensity * 0.10) * (0.4 + basePulse * 0.6);

    // ── Pulse node glow ──
    for (let ni = 0; ni < syn.nodeMats.length; ni++) {
      const nodePhase = elapsed * 2.0 + ni * 1.7;
      const nodePulse = 0.5 + 0.5 * Math.sin(nodePhase);
      syn.nodeMats[ni].opacity = 0.3 + nodePulse * 0.6 * syn.intensity;
    }

    // ── Move energy pulses along the curve ──
    for (let pi = 0; pi < syn.pulseCount; pi++) {
      // Advance phase
      syn.pulsePhases[pi] += dt * syn.speed;
      if (syn.pulsePhases[pi] > 1.0) syn.pulsePhases[pi] -= 1.0;

      const t = syn.pulsePhases[pi];
      const pos = syn.curve.getPointAt(t);
      syn.pulseSprites[pi].position.copy(pos);

      // Pulse intensity: bright in the middle of travel, fades at ends
      const edgeFade = Math.min(t * 5, (1 - t) * 5, 1.0);
      const flicker = 0.7 + 0.3 * Math.sin(elapsed * 8 + pi * 3.14);
      syn.pulseMats[pi].opacity = edgeFade * flicker * (0.5 + syn.intensity * 0.5);

      // Scale shimmer
      const sizeBase = 1.0 + syn.intensity * 1.5;
      const sizePulse = sizeBase * (0.8 + 0.4 * Math.sin(elapsed * 6 + pi * 2));
      syn.pulseSprites[pi].scale.set(sizePulse, sizePulse, 1);
    }
  }
}
