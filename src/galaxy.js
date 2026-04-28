// ══════════════════════════════════════════════════════
// DRIFT — Galaxy Generator v2 (Mountaintop Visuals)
// Each repo is a galaxy: spiral or elliptical.
// Commits are stars within each galaxy.
// Constellation lines are subtle gold arcs.
// ══════════════════════════════════════════════════════

import * as THREE from 'three';
import { scene, onUpdate } from './scene.js';

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
export function classifyCommit(message) {
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

    // Build commit type breakdown for the galaxy panel language bar
    const breakdown = {};
    for (const commit of commits) {
      const type = classifyCommit(commit.commit?.message || '');
      breakdown[type] = (breakdown[type] || 0) + 1;
    }

    galaxyMeta.set(repo.name, {
      name: repo.name,
      description: repo.description || 'No description',
      language: repo.language || 'Unknown',
      stars: repo.stargazers_count,
      forks: repo.forkCount,
      commits: commits.length,
      lastPush: repo.pushedAt,
      url: repo.html_url,
      position: pos,
      commitBreakdown: breakdown,
      galaxySize: group.userData.galaxySize
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
  group.userData.galaxySize = galaxySize;
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

    // ── ANIMATED BIRTH OUT ──
    stars.count = 0;
    let birthT = 0;
    const TOTAL_TIME = 1.5; // 1.5 seconds birth duration
    onUpdate((dt) => {
      if (birthT >= 1.0) return; // done — skip cheaply
      birthT += dt / TOTAL_TIME;
      if (birthT > 1.0) birthT = 1.0;
      const ea = 1 - Math.pow(1 - birthT, 3); // Ease out cubic
      stars.count = Math.floor(ea * starCount);
    });

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
/**
 * Create 3D repo-to-repo constellation arcs.
 * v4: Links connect actual galaxy positions in 3D space.
 *     Same-day commits and temporal proximity create the arcs.
 *     Arcs bow outward from the universe center for depth.
 */
export function createConstellations(stats, commitMap, repos) {
  // Build a map: date -> set of repo names with commits that day
  const dayToRepos = new Map();
  for (const [repoName, commits] of commitMap) {
    if (!commits || commits.length === 0) continue;
    for (const c of commits) {
      const date = c.commit?.author?.date?.slice(0, 10);
      if (!date) continue;
      if (!dayToRepos.has(date)) dayToRepos.set(date, new Set());
      dayToRepos.get(date).add(repoName);
    }
  }

  // Compute link strength between every pair of repos
  const linkStrength = new Map(); // key: "repoA|repoB" (sorted), value: strength

  // Same-day contribution strength
  for (const [, repoSet] of dayToRepos) {
    const repoList = Array.from(repoSet);
    if (repoList.length < 2) continue;
    for (let i = 0; i < repoList.length; i++) {
      for (let j = i + 1; j < repoList.length; j++) {
        const a = repoList[i];
        const b = repoList[j];
        const key = a < b ? `${a}|${b}` : `${b}|${a}`;
        linkStrength.set(key, (linkStrength.get(key) || 0) + 1);
      }
    }
  }

  // Temporal proximity boost (repos pushed within 7 days)
  const sortedByPush = [...repos].filter(r => r.pushedAt).sort((a, b) =>
    new Date(a.pushedAt) - new Date(b.pushedAt)
  );
  for (let i = 0; i < sortedByPush.length - 1; i++) {
    const r1 = sortedByPush[i];
    const r2 = sortedByPush[i + 1];
    const days = (new Date(r2.pushedAt) - new Date(r1.pushedAt)) / 86400000;
    if (days <= 7) {
      const key = r1.name < r2.name ? `${r1.name}|${r2.name}` : `${r2.name}|${r1.name}`;
      const existing = linkStrength.get(key) || 0;
      linkStrength.set(key, existing + (1 - days / 7) * 0.5);
    }
  }

  // Convert to array and pick top links
  const links = [];
  for (const [key, strength] of linkStrength) {
    const [from, to] = key.split('|');
    links.push({ from, to, strength });
  }
  links.sort((a, b) => b.strength - a.strength);

  const MAX_LINKS = Math.min(25, links.length);
  const topLinks = links.slice(0, MAX_LINKS);

  // For each link, create a crystalline synapse bridge between the two galaxies
  for (const link of topLinks) {
    const meta1 = galaxyMeta.get(link.from);
    const meta2 = galaxyMeta.get(link.to);
    if (!meta1 || !meta2) continue;

    const p1Raw = meta1.position;
    const p2Raw = meta2.position;

    // Offset endpoints slightly outward so crystals don't start inside the galaxy
    const offset1 = (meta1.galaxySize || 3) * 0.5;
    const offset2 = (meta2.galaxySize || 3) * 0.5;
    const p1 = p1Raw.clone().add(p1Raw.clone().normalize().multiplyScalar(offset1));
    const p2 = p2Raw.clone().add(p2Raw.clone().normalize().multiplyScalar(offset2));

    const dist = p1.distanceTo(p2);
    const intensity = Math.min(1, 0.3 + link.strength * 0.2);

    // ══════════════════════════════════════════════════════
    // 1. FAINT BACKBONE — straight line, almost invisible
    // ══════════════════════════════════════════════════════
    const spineGeo = new THREE.BufferGeometry().setFromPoints([p1, p2]);
    const spineMat = new THREE.LineBasicMaterial({
      color: new THREE.Color(0xffc850),
      transparent: true,
      opacity: 0.04 + intensity * 0.04,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const spineLine = new THREE.Line(spineGeo, spineMat);
    scene.add(spineLine);

    // ══════════════════════════════════════════════════════
    // 2. CRYSTAL NODES — static faceted gems along the path
    //    Icosahedrons + Octahedrons, wireframe, gold→blue
    // ══════════════════════════════════════════════════════
    const crystalCount = 3 + Math.floor(intensity * 4); // 3-7 crystals
    const nodeMeshes = [];
    const nodeMats = [];
    const nodePositions = [];

    for (let ci = 0; ci < crystalCount; ci++) {
      const t = ci / (crystalCount - 1 || 1);
      const pos = new THREE.Vector3().lerpVectors(p1, p2, t);

      // Slight outward jitter for organic feel
      const jitter = (Math.random() - 0.5) * dist * 0.08;
      pos.y += jitter;

      const isIco = ci % 2 === 0; // alternate shapes
      const radius = (0.25 + Math.random() * 0.25) + intensity * 0.35;
      const geo = isIco
        ? new THREE.IcosahedronGeometry(radius, 0)
        : new THREE.OctahedronGeometry(radius, 0);

      const color = new THREE.Color().lerpColors(
        new THREE.Color(0xffc850), // gold
        new THREE.Color(0x4a9eff), // blue
        intensity * (0.3 + t * 0.7) // gradient along path
      );

      const mat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.0, // start invisible, reveal during birth
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        wireframe: true
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(pos);
      mesh.visible = true;
      // Each crystal gets its own tumble rotation offset
      mesh.userData = {
        rotSpeed: {
          x: (Math.random() - 0.5) * 0.8,
          y: (Math.random() - 0.5) * 0.8,
          z: (Math.random() - 0.5) * 0.8
        },
        revealT: t // birth sequence: reveal when birthT passes this
      };
      scene.add(mesh);

      nodeMeshes.push(mesh);
      nodeMats.push(mat);
      nodePositions.push(pos.clone());
    }

    // ══════════════════════════════════════════════════════
    // 3. TRAVELING CRYSTAL PULSES — 3D gems that move p1→p2
    // ══════════════════════════════════════════════════════
    const pulseCount = 1 + Math.floor(intensity * 2); // 1-3 pulses
    const pulseMeshes = [];
    const pulseMats = [];
    const pulsePhases = [];

    for (let pi = 0; pi < pulseCount; pi++) {
      const isIco = pi % 2 === 0;
      const radius = 0.3 + intensity * 0.4;
      const geo = isIco
        ? new THREE.IcosahedronGeometry(radius, 0)
        : new THREE.OctahedronGeometry(radius, 0);

      const color = new THREE.Color().lerpColors(
        new THREE.Color(0xffffff), // bright core
        new THREE.Color(0x4a9eff), // electric blue
        intensity
      );

      const mat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        wireframe: true
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(p1);
      mesh.visible = false;
      mesh.userData = {
        rotSpeed: { x: 2.0, y: 1.5, z: 1.0 } // fast tumble
      };
      scene.add(mesh);

      pulseMeshes.push(mesh);
      pulseMats.push(mat);
      pulsePhases.push(pi / pulseCount);
    }

    synapses.push({
      p1,
      p2,
      dist,
      spineMat,
      nodeMeshes,
      nodeMats,
      nodePositions,
      pulseMeshes,
      pulseMats,
      pulsePhases,
      pulseCount,
      intensity,
      speed: 0.06 + intensity * 0.10,
      birthT: 0
    });
  }
}

/**
 * Update all crystalline synapses each frame.
 * Call this from the render loop via onUpdate.
 * @param {number} dt - Delta time
 * @param {number} elapsed - Total elapsed time
 */
export function updateConstellations(dt, elapsed) {
  for (const syn of synapses) {
    // ── Execute Birth Sequence ──
    // Crystals cascade-reveal from p1 to p2 over 2 seconds
    if (syn.birthT < 1.0) {
      syn.birthT += dt / 2.0;
      if (syn.birthT > 1.0) syn.birthT = 1.0;
      const ea = 1 - Math.pow(1 - syn.birthT, 3);

      // Reveal spine line
      syn.spineMat.opacity = (0.04 + syn.intensity * 0.04) * ea;

      // Cascade: reveal crystals whose revealT <= birthT
      for (let ni = 0; ni < syn.nodeMeshes.length; ni++) {
        const reveal = syn.nodeMeshes[ni].userData.revealT;
        const prog = (ea - reveal * 0.9) / 0.1; // each crystal fades in over 0.1
        syn.nodeMats[ni].opacity = Math.max(0, Math.min(1, prog)) * (0.5 + syn.intensity * 0.3);
      }

      // Reveal traveling pulses after some crystals exist
      if (ea > 0.15) {
        for (const mesh of syn.pulseMeshes) {
          mesh.visible = true;
        }
      }
    }

    // ── Animate static crystal nodes ──
    // Slow tumble rotation + subtle opacity breathing
    for (let ni = 0; ni < syn.nodeMeshes.length; ni++) {
      const mesh = syn.nodeMeshes[ni];
      const rs = mesh.userData.rotSpeed;
      mesh.rotation.x += rs.x * dt;
      mesh.rotation.y += rs.y * dt;
      mesh.rotation.z += rs.z * dt;

      // Opacity: base + gentle sine wave
      const nodePhase = elapsed * 1.5 + ni * 1.3;
      const nodePulse = 0.5 + 0.5 * Math.sin(nodePhase);
      const targetOpacity = syn.birthT >= 1.0
        ? (0.3 + nodePulse * 0.5) * (0.4 + syn.intensity * 0.5)
        : syn.nodeMats[ni].opacity;
      syn.nodeMats[ni].opacity = targetOpacity;
    }

    // ── Animate traveling crystal pulses ──
    // Gems move straight from p1 to p2, fast-rotating, fading at ends
    for (let pi = 0; pi < syn.pulseCount; pi++) {
      syn.pulsePhases[pi] += dt * syn.speed;
      if (syn.pulsePhases[pi] > 1.0) syn.pulsePhases[pi] -= 1.0;

      const t = syn.pulsePhases[pi];
      const pos = new THREE.Vector3().lerpVectors(syn.p1, syn.p2, t);
      syn.pulseMeshes[pi].position.copy(pos);

      // Fast rotation for sparkle
      const mesh = syn.pulseMeshes[pi];
      const rs = mesh.userData.rotSpeed;
      mesh.rotation.x += rs.x * dt;
      mesh.rotation.y += rs.y * dt;
      mesh.rotation.z += rs.z * dt;

      // Edge fade at endpoints, bright in middle
      const edgeFade = Math.min(t * 6, (1 - t) * 6, 1.0);
      const flicker = 0.6 + 0.4 * Math.sin(elapsed * 10 + pi * 3.14);
      syn.pulseMats[pi].opacity = edgeFade * flicker * (0.5 + syn.intensity * 0.5);

      // Color shift: gold→white at peak travel
      const travelColor = new THREE.Color().lerpColors(
        new THREE.Color(0xffc850),
        new THREE.Color(0xffffff),
        Math.sin(t * Math.PI)
      );
      syn.pulseMats[pi].color.copy(travelColor);
    }
  }
}
