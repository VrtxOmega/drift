// ══════════════════════════════════════════════════════
// DRIFT — Share Card Generator
// Renders a beautiful PNG share card from 3D scene + stats
// ══════════════════════════════════════════════════════

import { renderer } from './scene.js';

/**
 * Render a share card to the share canvas.
 * @param {HTMLCanvasElement} shareCanvas
 * @param {object} user - GitHub user object
 * @param {object} stats
 */
export function renderShareCard(shareCanvas, user, stats) {
  const SCALE = 2; // High-DPI export
  const W = 1200;
  const H = 630;
  
  shareCanvas.width = W * SCALE;
  shareCanvas.height = H * SCALE;
  const ctx = shareCanvas.getContext('2d');
  
  // Scale logical drawing context so all standard coordinates work normally
  ctx.scale(SCALE, SCALE);

  // ── Background ──
  ctx.fillStyle = '#060610';
  ctx.fillRect(0, 0, W, H);

  // Subtle gradient overlay
  const grad = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.6);
  grad.addColorStop(0, 'rgba(30, 20, 60, 0.3)');
  grad.addColorStop(1, 'rgba(6, 6, 16, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // ── 3D Scene Snapshot ──
  try {
    const sceneImg = renderer.domElement;
    // Draw the 3D canvas as the background
    ctx.globalAlpha = 0.6;
    ctx.drawImage(sceneImg, 0, 0, W, H);
    ctx.globalAlpha = 1.0;
  } catch (e) {
    // Fallback: just use the gradient
  }

  // ── Dark overlay for text readability ──
  const overlay = ctx.createLinearGradient(0, 0, 0, H);
  overlay.addColorStop(0, 'rgba(6, 6, 16, 0.3)');
  overlay.addColorStop(0.5, 'rgba(6, 6, 16, 0.1)');
  overlay.addColorStop(0.85, 'rgba(6, 6, 16, 0.7)');
  overlay.addColorStop(1, 'rgba(6, 6, 16, 0.9)');
  ctx.fillStyle = overlay;
  ctx.fillRect(0, 0, W, H);

  // ── Top-left: DRIFT branding ──
  ctx.fillStyle = '#c9b06b';
  ctx.font = '500 24px Georgia, serif';
  ctx.fillText('Ω', 40, 52);
  ctx.fillStyle = '#8a8aa0';
  ctx.font = '600 14px Inter, sans-serif';
  ctx.letterSpacing = '4px';
  ctx.fillText('DRIFT', 68, 50);

  // ── Top-right: avatar + username ──
  if (user.avatar_url) {
    const avatarSize = 40;
    const ax = W - 40 - avatarSize;
    const ay = 30;
    // Draw rounded avatar placeholder
    ctx.beginPath();
    ctx.arc(ax + avatarSize / 2, ay + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
    ctx.fillStyle = '#1a1a2e';
    ctx.fill();
    ctx.strokeStyle = 'rgba(201, 176, 107, 0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.fillStyle = '#e8e6e3';
  ctx.font = '500 14px Inter, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`@${user.login}`, W - 90, 55);
  ctx.textAlign = 'left';

  // ── Center: YOUR UNIVERSE ──
  ctx.fillStyle = '#c9b06b';
  ctx.textAlign = 'center';
  ctx.font = '300 12px Georgia, serif';
  ctx.fillText('Ω', W / 2 - 90, H * 0.45);
  ctx.fillText('Ω', W / 2 + 90, H * 0.45);
  ctx.font = '300 12px Inter, sans-serif';
  ctx.fillText('Y O U R   U N I V E R S E', W / 2, H * 0.45);
  ctx.textAlign = 'left';

  // ── Bottom stats bar ──
  const statsY = H - 100;
  const statData = [
    { value: stats.totalCommits.toLocaleString(), label: 'COMMITS' },
    { value: stats.totalRepos.toString(), label: 'REPOS' },
    { value: `${stats.maxStreak}d`, label: 'MAX STREAK' },
    { value: `${stats.topLanguage} (${stats.topLanguagePct}%)`, label: 'TOP LANGUAGE' },
    { value: stats.activeDays.toString(), label: 'ACTIVE DAYS' }
  ];

  const statWidth = W / (statData.length + 1);
  statData.forEach((s, i) => {
    const x = statWidth * (i + 0.8);
    ctx.fillStyle = '#e8e6e3';
    ctx.font = '700 28px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(s.value, x, statsY);
    ctx.fillStyle = '#4a4a6a';
    ctx.font = '500 9px Inter, sans-serif';
    ctx.fillText(s.label, x, statsY + 18);
  });
  ctx.textAlign = 'left';

  // ── Bottom tagline ──
  ctx.fillStyle = '#4a4a6a';
  ctx.textAlign = 'center';
  ctx.font = '400 10px Georgia, serif';
  ctx.fillText('Ω', W / 2 - 120, H - 24);
  ctx.font = '400 10px Inter, sans-serif';
  ctx.fillText('DRIFT — your code has a pulse  ·  drift.veritas.dev', W / 2 + 8, H - 24);
  ctx.textAlign = 'left';

  // ── Gold border lines ──
  ctx.strokeStyle = 'rgba(201, 176, 107, 0.15)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(40, H - 130);
  ctx.lineTo(W - 40, H - 130);
  ctx.stroke();
}

/**
 * Copy share canvas to clipboard.
 * @param {HTMLCanvasElement} canvas
 */
export async function copyShareCard(canvas) {
  try {
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': blob })
    ]);
    return true;
  } catch {
    return false;
  }
}

/**
 * Download share canvas as PNG.
 * @param {HTMLCanvasElement} canvas
 * @param {string} username
 */
export function downloadShareCard(canvas, username) {
  const link = document.createElement('a');
  link.download = `drift-${username}-universe.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}
