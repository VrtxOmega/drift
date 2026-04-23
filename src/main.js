// ══════════════════════════════════════════════════════
// DRIFT — Main Entry Point
// Orchestrates: landing → fetch → build scene → HUD → interact
// ══════════════════════════════════════════════════════

import { fetchUser, fetchRepos, fetchAllCommits, computeStats } from './github.js';
import { initScene, startLoop, onUpdate, flyTo, resetCamera, getRaycaster, scene, camera, enterGalaxy, exitGalaxy, isGalaxyDive } from './scene.js';
import { createBackgroundStars, createMilkyWay, updateAmbientBreathing } from './background.js';
import { createGalaxies, createConstellations, updateConstellations, galaxyGroups, galaxyMeta, setHoveredGalaxy, getGalaxyRotationSpeed, createGravitationalCenter, updateGravitationalCenter, classifyCommit } from './galaxy.js';
import { renderShareCard, copyShareCard, downloadShareCard } from './share.js';
import * as THREE from 'three';
// HERMES_CACHE_BUST_001


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
let activeCommitMap = null;  // Store for dive-mode commit rendering

let _diveExitBtn = null;   // Reference to toggle-able HUD button

// FIX: allocate one Raycaster and reuse it — avoids creating a new object on
// every mousemove event (which fires at 60+ fps while the mouse is moving).
const _sharedRaycaster = new THREE.Raycaster();

// ── Init ──
initScene(canvas);
createBackgroundStars();
// nebula removed — bloom was amplifying it into purple wash
startLoop();

// ── URL Deep-Link ──
// If the page loads with ?u=someuser, skip the landing screen and auto-launch.
(function checkUrlDeepLink() {
  const params = new URLSearchParams(window.location.search);
  const urlUser = params.get('u');
  if (urlUser) {
    $input.value = urlUser.trim();
    // Defer one tick so the scene is initialized
    setTimeout(launch, 50);
  }
})();

// ── Launch Flow ──
$launchBtn.addEventListener('click', launch);
$input.addEventListener('keydown', e => { if (e.key === 'Enter') launch(); });

// ── Keyboard Shortcuts ──
document.addEventListener('keydown', (e) => {
  // Don't fire when typing in the input field
  if (document.activeElement === $input) return;

  switch (e.key) {
    case ' ':  // Space — reset camera home
    case 'h':
    case 'H':
      if (!$hud.classList.contains('hidden')) {
        e.preventDefault();
        resetCamera();
        $galaxyPanel.classList.add('hidden');
      }
      break;
    case 'Escape':  // Dismiss any open overlay
      $galaxyPanel.classList.add('hidden');
      $shareModal.classList.add('hidden');
      break;
    case 's':
    case 'S':  // Share card
      if (!$hud.classList.contains('hidden') && currentUser && currentStats) {
        document.getElementById('btn-share').click();
      }
      break;
    case 'f':
    case 'F':  // Fullscreen toggle
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen?.();
      } else {
        document.exitFullscreen?.();
      }
      break;
  }
});

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
        stat('0', 'COMMITS', 'stat-commits'),
        stat('0', 'REPOS', 'stat-repos'),
        stat('—', 'MAX STREAK', 'stat-streak'),
        stat('—', 'TOP LANG'),
        stat('0', 'ACTIVE DAYS', 'stat-days')
      ].join('');
      return;
    }
    setProgress(35, `Found ${repos.length} repositories`);

    // 3. Fetch commits
    const commitMap = await fetchAllCommits(username, repos, msg => {
      // FIX: parse the percentage as a number before arithmetic.
      // msg.match(...)?.[1] returns a string; multiplying a string by 0.5 works
      // via JS coercion but is fragile and lint-unsafe. Use parseInt explicitly.
      const rawPct = parseInt(msg.match(/(\d+)%/)?.[1] ?? '0', 10);
      const pct = 35 + Math.round(rawPct * 0.5);
      setProgress(Math.min(85, pct), msg);
    });
    setProgress(88, 'Computing statistics...');

    // 4. Compute stats
    const stats = computeStats(repos, commitMap);
    currentStats = stats;
    activeCommitMap = commitMap;
    setProgress(92, 'Building galaxies...');

    // 5. Create Milky Way + gravitational center (adds atmosphere before galaxies appear)
    createMilkyWay();
    createGravitationalCenter();

    // 6. Create galaxies
    createGalaxies(repos, commitMap, stats);
    setProgress(96, 'Drawing constellations...');

    // 7. Create streak constellations (3D repo-linked)
    createConstellations(stats, commitMap, repos);
    setProgress(100, 'Universe ready');

    // 8. Transition to HUD
    await delay(500);
    $loading.classList.add('hidden');
    $hud.classList.remove('hidden');

    // Populate HUD
    $hudUser.textContent = `@${user.login}`;
    $hudStats.innerHTML = [
      stat('0', 'COMMITS', 'stat-commits'),
      stat('0', 'REPOS', 'stat-repos'),
      stat('0d', 'MAX STREAK', 'stat-streak'),
      stat(`${stats.topLanguage}`, 'TOP LANG'),
      stat('0', 'ACTIVE DAYS', 'stat-days')
    ].join('');

    // Trigger animations
    animateCountUp('stat-commits', stats.totalCommits, 2000);
    animateCountUp('stat-repos', stats.totalRepos, 1500);
    animateCountUp('stat-streak', stats.maxStreak, 1800, 'd');
    animateCountUp('stat-days', stats.activeDays, 1600);

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

function stat(value, label, id = '') {
  const idAttr = id ? ` id="${id}"` : '';
  return `<div class="stat-item"><div class="stat-value"${idAttr}>${value}</div><div class="stat-label">${label}</div></div>`;
}

function animateCountUp(elementId, endValue, duration = 1500, suffix = '') {
  const el = document.getElementById(elementId);
  if (!el) return;
  const startTime = performance.now();
  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 4);
    const current = Math.floor(ease * endValue);
    el.textContent = current.toLocaleString() + suffix;
    if (progress < 1) requestAnimationFrame(update);
    else el.textContent = endValue.toLocaleString() + suffix;
  }
  requestAnimationFrame(update);
}

function setProgress(pct, detail) {
  $progress.style.width = `${pct}%`;
  $loadDetail.textContent = detail;
}

// ── HUD Controls ──
document.getElementById('btn-home').addEventListener('click', () => {
  if (isGalaxyDive()) {
    exitGalaxy();
    $galaxyPanel.classList.add('hidden');
  } else {
    resetCamera();
    $galaxyPanel.classList.add('hidden');
  }
});

document.getElementById('btn-share').addEventListener('click', () => {
  if (!currentUser || !currentStats) return;
  // Frame the perfect cinematic shot before capturing
  resetCamera();
  showToast('Framing universe...');

  // Wait for the 1.5s camera tween to finish
  setTimeout(() => {
    renderShareCard($shareCanvas, currentUser, currentStats);
    $shareModal.classList.remove('hidden');
  }, 1600);
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
  showToast(ok ? 'Ω Copied to clipboard' : 'Copy failed — try download instead');
});

document.getElementById('btn-download-share').addEventListener('click', () => {
  downloadShareCard($shareCanvas, currentUser?.login || 'user');
  showToast('Ω Downloaded');
});

document.getElementById('close-galaxy').addEventListener('click', () => {
  $galaxyPanel.classList.add('hidden');
});

// ── Hover + Click System ──

function registerHover() {
  let hovered = null;

  canvas.addEventListener('mousemove', (e) => {
    // FIX: reuse the shared Raycaster instead of allocating a new one every frame.
    // getRaycaster now accepts an optional Raycaster to populate in-place.
    const rc = getRaycaster(e.clientX, e.clientY, _sharedRaycaster);
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
    const rc = getRaycaster(e.clientX, e.clientY, _sharedRaycaster);

    for (const group of galaxyGroups) {
      const hits = rc.intersectObjects(group.children, true);
      if (hits.length > 0) {
        const name = group.userData.repoName;
        const meta = galaxyMeta.get(name);
        if (meta) {
          enterGalaxy(meta.position);
          showGalaxyDetail(meta);
        }
        break;
      }
    }
  });
}

function showGalaxyDetail(meta) {
  // ── Commit type bar ──
  let langBarHTML = '';
  if (meta.commitBreakdown && Object.keys(meta.commitBreakdown).length > 0) {
    const COMMIT_BAR_COLORS = {
      feature: '#4a9eff', fix: '#ffaa33', refactor:'#4acfcf', docs:'#bbbbdd',
      test:'#5ce87a', ci:'#a06ef5', style:'#ff6ea8', merge:'#c9b06b', other:'#99aacc'
    };
    const total = Object.values(meta.commitBreakdown).reduce((a, b) => a + b, 0);
    const segments = Object.entries(meta.commitBreakdown)
      .filter(([, v]) => v > 0).sort(([, a], [, b]) => b - a)
      .map(([type, count]) => {
        const pct = ((count/ total)*100).toFixed(1);
        return `<div class="lang-bar-seg" style="width:${pct}%;background:${COMMIT_BAR_COLORS[type]||'#99aacc'};" title="${type}: ${count} (${pct}%)"></div>`;
      }).join('');
    langBarHTML = `<div class="lang-bar-wrap"><div class="lang-bar">${segments}</div></div>`;
  }

  // ── Recent commits (dive-mode only) ──
  let commitsHTML = '';
  const commits = activeCommitMap ? activeCommitMap.get(meta.name) || [] : [];
  const recent = commits.slice(0, 6).map(c => ({
    msg: (c.commit?.message || '').split('\n')[0].slice(0, 72),
    type: classifyCommit(c.commit?.message || ''),
    date: c.commit?.author?.date,
    hash: c.sha?.slice(0, 7) || ''
  }));
  if (recent.length > 0) {
    const COMMIT_COLORS = {
      feature:'#4a9eff', fix:'#ffaa33', refactor:'#4acfcf', docs:'#bbbbdd',
      test:'#5ce87a', ci:'#a06ef5', style:'#ff6ea8', merge:'#c9b06b', other:'#99aacc'
    };
    commitsHTML = `<div class="dive-commits">
      <div class="dive-commits-header">RECENT COMMITS</div>
      ` + recent.map(c => `
        <div class="dive-commit">
          <span class="dive-commit-dot" style="background:${COMMIT_COLORS[c.type]||'#99aacc'}"></span>
          <span class="dive-commit-msg" title="${c.msg}"\u003e${c.msg}</span\u003e
          <span class="dive-commit-meta"\u003e${formatRelative(c.date)} · ${c.hash}</span\u003e
        </div>
      `).join('') + `
    </div>`;
  }

  $galaxyDetail.innerHTML = `
    <div class="galaxy-name">${meta.name}</div>
    <div class="galaxy-desc">${meta.description}</div>
    ${langBarHTML}
    <div class="galaxy-meta">
      <div class="galaxy-meta-item"><strong>${meta.commits}</strong> commits</div>
      <div class="galaxy-meta-item"><strong>${meta.language}</strong></div>
      <div class="galaxy-meta-item">★ <strong>${meta.stars}</strong></div>
      <div class="galaxy-meta-item">🔀 <strong>${meta.forks}</strong></div>
      <div class="galaxy-meta-item">Last push <strong>${formatRelative(meta.lastPush)}</strong></div>
    </div>
    ${commitsHTML}
    <a class="galaxy-link" href="https://github.com/${currentUser?.login}/${meta.name}" target="_blank" rel="noopener">↗ View on GitHub</a>
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
