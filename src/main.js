// ══════════════════════════════════════════════════════
// DRIFT — Main Entry Point
// Orchestrates: landing → fetch → build scene → HUD → interact
// ══════════════════════════════════════════════════════

import { fetchUser, fetchRepos, fetchAllCommits, computeStats } from './github.js';
import { initScene, startLoop, onUpdate, flyTo, resetCamera, getRaycaster, scene, camera } from './scene.js';
import { createBackgroundStars, createMilkyWay, updateAmbientBreathing } from './background.js';
import { createGalaxies, createConstellations, updateConstellations, galaxyGroups, galaxyMeta, setHoveredGalaxy, getGalaxyRotationSpeed, createGravitationalCenter, updateGravitationalCenter } from './galaxy.js';
import { renderShareCard, copyShareCard, downloadShareCard } from './share.js';
import * as THREE from 'three';

// ── DOM Elements ──
const $landing    = document.getElementById('landing');
const $loading    = document.getElementById('loading');
const $hud        = document.getElementById('hud');
const $toast      = document.getElementById('toast');
const $tooltip    = document.getElementById('tooltip');
const $input      = document.getElementById('username-input');
const $launchBtn  = document.getElementById('launch-btn');
const $progress   = document.getElementById('progress-fill');
const $loadDetail = document.getElementById('loading-detail');
const $hudUser    = document.getElementById('hud-user');
const $hudStats   = document.getElementById('hud-stats');
const $shareModal = document.getElementById('share-modal');
const $shareCanvas= document.getElementById('share-canvas');
const $galaxyPanel= document.getElementById('galaxy-panel');
const $galaxyDetail = document.getElementById('galaxy-detail');
const canvas      = document.getElementById('drift-canvas');

// ── State ──
let currentUser = null;
let currentStats = null;

// ── Init ──
initScene(canvas);
createBackgroundStars();
// nebula removed — bloom was amplifying it into purple wash
startLoop();

// ── Launch Flow ──
$launchBtn.addEventListener('click', launch);
$input.addEventListener('keydown', e => { if (e.key === 'Enter') launch(); });

async function launch() {
  const username = $input.value.trim();
  if (!username) { $input.focus(); return; }

  // Show loading
  $landing.classList.add('hidden');
  $loading.classList.remove('hidden');
  setProgress(5, 'Fetching profile...');

  try {
    // 1. Fetch user profile
    const user = await fetchUser(username);
    currentUser = user;
    setProgress(15, 'Fetching repositories...');

    // 2. Fetch repos
    const repos = await fetchRepos(username, msg => setProgress(25, msg));
    if (repos.length === 0) {
      // Never-empty: even 0 repos = ambient presence
      createMilkyWay();
      setProgress(100, 'Empty universe — but something is here, waiting');
      await delay(1000);
      $loading.classList.add('hidden');
      $hud.classList.remove('hidden');
      $hudUser.textContent = `@${user.login}`;
      $hudStats.innerHTML = [
        stat('0', 'COMMITS'),
        stat('0', 'REPOS'),
        stat('—', 'MAX STREAK'),
        stat('—', 'TOP LANG'),
        stat('0', 'ACTIVE DAYS')
      ].join('');
      return;
    }
    setProgress(35, `Found ${repos.length} repositories`);

    // 3. Fetch commits
    const commitMap = await fetchAllCommits(username, repos, msg => {
      const pct = 35 + Math.round(msg.match(/(\d+)%/)?.[1] * 0.5 || 0);
      setProgress(Math.min(85, pct), msg);
    });
    setProgress(88, 'Computing statistics...');

    // 4. Compute stats
    const stats = computeStats(repos, commitMap);
    currentStats = stats;
    setProgress(92, 'Building galaxies...');

    // 5. Create Milky Way + gravitational center (adds atmosphere before galaxies appear)
    createMilkyWay();
    createGravitationalCenter();

    // 6. Create galaxies
    createGalaxies(repos, commitMap, stats);
    setProgress(96, 'Drawing constellations...');

    // 7. Create streak constellations
    createConstellations(stats);
    setProgress(100, 'Universe ready');

    // 8. Transition to HUD
    await delay(500);
    $loading.classList.add('hidden');
    $hud.classList.remove('hidden');

    // Populate HUD
    $hudUser.textContent = `@${user.login}`;
    $hudStats.innerHTML = [
      stat(stats.totalCommits.toLocaleString(), 'COMMITS'),
      stat(stats.totalRepos.toString(), 'REPOS'),
      stat(`${stats.maxStreak}d`, 'MAX STREAK'),
      stat(`${stats.topLanguage}`, 'TOP LANG'),
      stat(stats.activeDays.toString(), 'ACTIVE DAYS')
    ].join('');

    // Register hover system
    registerHover();

  } catch (err) {
    console.error('Launch error:', err);
    let msg = 'Something went wrong.';
    if (err.message === 'USER_NOT_FOUND') msg = `User "${username}" not found on GitHub.`;
    else if (err.message === 'NO_REPOS') msg = `User "${username}" has no public repositories.`;
    else if (err.message.startsWith('RATE_LIMITED')) msg = `GitHub API rate limited. ${err.message.split(': ')[1]}`;
    showToast(msg);
    $loading.classList.add('hidden');
    $landing.classList.remove('hidden');
  }
}

function stat(value, label) {
  return `<div class="stat-item"><div class="stat-value">${value}</div><div class="stat-label">${label}</div></div>`;
}

function setProgress(pct, detail) {
  $progress.style.width = `${pct}%`;
  $loadDetail.textContent = detail;
}

// ── HUD Controls ──
document.getElementById('btn-home').addEventListener('click', () => {
  resetCamera();
  $galaxyPanel.classList.add('hidden');
});

document.getElementById('btn-share').addEventListener('click', () => {
  if (!currentUser || !currentStats) return;
  renderShareCard($shareCanvas, currentUser, currentStats);
  $shareModal.classList.remove('hidden');
});

document.getElementById('btn-back').addEventListener('click', () => {
  // Reload to reset state
  window.location.reload();
});

document.getElementById('close-share').addEventListener('click', () => {
  $shareModal.classList.add('hidden');
});

document.getElementById('btn-copy-share').addEventListener('click', async () => {
  const ok = await copyShareCard($shareCanvas);
  showToast(ok ? '✦ Copied to clipboard' : 'Copy failed — try download instead');
});

document.getElementById('btn-download-share').addEventListener('click', () => {
  downloadShareCard($shareCanvas, currentUser?.login || 'user');
  showToast('✦ Downloaded');
});

document.getElementById('close-galaxy').addEventListener('click', () => {
  $galaxyPanel.classList.add('hidden');
});

// ── Hover + Click System ──

function registerHover() {
  let hovered = null;

  canvas.addEventListener('mousemove', (e) => {
    const rc = getRaycaster(e.clientX, e.clientY);
    let found = null;

    for (const group of galaxyGroups) {
      const hits = rc.intersectObjects(group.children, true);
      if (hits.length > 0) {
        found = group.userData.repoName;
        break;
      }
    }

    if (found && found !== hovered) {
      hovered = found;
      setHoveredGalaxy(found);  // Hover slowdown
      const meta = galaxyMeta.get(found);
      if (meta) {
        const state = getEmotionalState(meta.lastPush, meta.commits);
        $tooltip.innerHTML = `
          <div class="tooltip-repo">${meta.name}</div>
          <div class="tooltip-lang">${meta.language} · ★ ${meta.stars}</div>
          <div class="tooltip-stats">${meta.commits} commits · <span class="tooltip-state tooltip-${state.class}">${state.label}</span></div>
        `;
        $tooltip.classList.remove('hidden');
      }
      canvas.style.cursor = 'pointer';
    } else if (!found && hovered) {
      hovered = null;
      setHoveredGalaxy(null);  // Release slowdown
      $tooltip.classList.add('hidden');
      canvas.style.cursor = 'grab';
    }

    if (!$tooltip.classList.contains('hidden')) {
      $tooltip.style.left = `${e.clientX + 16}px`;
      $tooltip.style.top = `${e.clientY - 10}px`;
    }
  });

  canvas.addEventListener('click', (e) => {
    const rc = getRaycaster(e.clientX, e.clientY);

    for (const group of galaxyGroups) {
      const hits = rc.intersectObjects(group.children, true);
      if (hits.length > 0) {
        const name = group.userData.repoName;
        const meta = galaxyMeta.get(name);
        if (meta) {
          flyTo(meta.position);
          showGalaxyDetail(meta);
        }
        break;
      }
    }
  });
}

function showGalaxyDetail(meta) {
  $galaxyDetail.innerHTML = `
    <div class="galaxy-name">${meta.name}</div>
    <div class="galaxy-desc">${meta.description}</div>
    <div class="galaxy-meta">
      <div class="galaxy-meta-item"><strong>${meta.commits}</strong> commits</div>
      <div class="galaxy-meta-item"><strong>${meta.language}</strong></div>
      <div class="galaxy-meta-item">★ <strong>${meta.stars}</strong></div>
      <div class="galaxy-meta-item">🔀 <strong>${meta.forks}</strong></div>
      <div class="galaxy-meta-item">Last push <strong>${formatRelative(meta.lastPush)}</strong></div>
    </div>
  `;
  $galaxyPanel.classList.remove('hidden');
}

// ── Utilities ──

function showToast(msg) {
  $toast.textContent = msg;
  $toast.classList.remove('hidden');
  setTimeout(() => $toast.classList.add('hidden'), 3500);
}

function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function formatRelative(dateStr) {
  if (!dateStr) return 'unknown';
  const d = new Date(dateStr);
  const now = new Date();
  const days = Math.floor((now - d) / 86400000);
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

// ── Galaxy rotation + constellation synapse animation + ambient breathing ──
onUpdate((dt, elapsed) => {
  // Galaxy rotation with hover slowdown
  for (const group of galaxyGroups) {
    const speed = getGalaxyRotationSpeed(group);
    group.rotation.y += dt * 0.05 * speed;
  }
  // Constellation neural synapses
  updateConstellations(dt, elapsed);
  // Global ambient breathing (never dead)
  updateAmbientBreathing(elapsed);
  // Gravitational center pulse
  updateGravitationalCenter(elapsed);
});

// ── Emotional State System ──
// Maps repo activity to emotional labels — a full language
function getEmotionalState(lastPush, commitCount) {
  if (!lastPush) return { label: 'unknown', class: 'dormant' };
  const days = Math.floor((Date.now() - new Date(lastPush).getTime()) / 86400000);

  // Compound states: activity + recency
  if (days <= 1 && commitCount > 20) return { label: '🔥 exploding', class: 'alive' };
  if (days <= 1) return { label: '⚡ firing', class: 'alive' };
  if (days <= 7 && commitCount > 20) return { label: '⚡ surging', class: 'alive' };
  if (days <= 7) return { label: '✨ active', class: 'active' };
  if (days <= 30) return { label: 'quiet', class: 'quiet' };
  if (days <= 90 && commitCount < 5) return { label: '🌱 emerging', class: 'active' };
  if (days <= 90) return { label: 'resting', class: 'quiet' };
  if (days <= 365 && commitCount < 3) return { label: '🌱 emerging', class: 'active' };
  if (days <= 365) return { label: 'dormant', class: 'dormant' };
  if (commitCount > 50) return { label: 'archived', class: 'dormant' };
  return { label: 'deep sleep', class: 'dormant' };
}
