// ══════════════════════════════════════════════════════
// DRIFT — Share Card Generator
// Renders a beautiful PNG share card from 3D scene snapshot + stats
// ══════════════════════════════════════════════════════

import { captureSnapshot } from './scene.js';

/**
 * Render a share card to the share canvas.
 * @param {HTMLCanvasElement} shareCanvas
 * @param {object} user - GitHub user object
 * @param {object} stats
 */
export function renderShareCard(shareCanvas, user, stats) {
  const W = 2400;   // Export at 2× for high DPI
  const H = 1260;

  shareCanvas.width = W;
  shareCanvas.height = H;
  const ctx = shareCanvas.getContext('2d');

  // ── 3D Scene Snapshot (clean, no bloom, hi-res) ──
  let sceneImg;
  try {
    sceneImg = captureSnapshot(W, H);
  } catch (e) {
    sceneImg = null;
  }

  if (sceneImg) {
    ctx.drawImage(sceneImg, 0, 0, W, H);
  } else {
    // Fallback solid background
    ctx.fillStyle = '#060610';
    ctx.fillRect(0, 0, W, H);
  }

  // ── Dark overlay for text readability ──
  const overlay = ctx.createLinearGradient(0, 0, 0, H);
  overlay.addColorStop(0,   'rgba(6, 6, 16, 0.25)');
  overlay.addColorStop(0.5, 'rgba(6, 6, 16, 0.05)');
  overlay.addColorStop(0.85,'rgba(6, 6, 16, 0.65)');
  overlay.addColorStop(1,   'rgba(6, 6, 16, 0.88)');
  ctx.fillStyle = overlay;
  ctx.fillRect(0, 0, W, H);

  // ── Top-left: DRIFT branding ──
  ctx.fillStyle = '#c9b06b';
  ctx.font = '500 48px Georgia, serif';
  ctx.fillText('Ω', 80, 104);
  ctx.fillStyle = '#8a8aa0';
  ctx.font = '600 28px Inter, sans-serif';
  ctx.fillText('DRIFT', 136, 100);

  // ── Top-right: username ──
  ctx.fillStyle = '#e8e6e3';
  ctx.font = '500 28px Inter, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`@${user.login}`, W - 180, 110);
  ctx.textAlign = 'left';

  // ── Top-right: avatar image ──
  const avatarSize = 80;
  const ax = W - 140 - avatarSize;
  const ay = 60;
  if (user.avatar_url) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      ctx.save();
      ctx.beginPath();
      ctx.arc(ax + avatarSize / 2, ay + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(img, ax, ay, avatarSize, avatarSize);
      ctx.restore();
      ctx.beginPath();
      ctx.arc(ax + avatarSize / 2, ay + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(201, 176, 107, 0.5)';
      ctx.lineWidth = 3;
      ctx.stroke();
    };
    img.src = user.avatar_url;
  }
  // placeholder
  ctx.beginPath();
  ctx.arc(ax + avatarSize / 2, ay + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
  ctx.fillStyle = '#1a1a2e';
  ctx.fill();
  ctx.strokeStyle = 'rgba(201, 176, 107, 0.3)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // ── Center: YOUR UNIVERSE ──
  ctx.fillStyle = '#c9b06b';
  ctx.textAlign = 'center';
  ctx.font = '300 24px Georgia, serif';
  ctx.fillText('Ω', W / 2 - 180, H * 0.45);
  ctx.fillText('Ω', W / 2 + 180, H * 0.45);
  ctx.font = '300 24px Inter, sans-serif';
  ctx.fillText('Y O U R   U N I V E R S E', W / 2, H * 0.45);
  ctx.textAlign = 'left';

  // ── Bottom stats bar ──
  const statsY = H - 200;
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
    ctx.font = '700 56px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(s.value, x, statsY);
    ctx.fillStyle = '#4a4a6a';
    ctx.font = '500 18px Inter, sans-serif';
    ctx.fillText(s.label, x, statsY + 36);
  });
  ctx.textAlign = 'left';

  // ── Bottom tagline ──
  ctx.fillStyle = '#4a4a6a';
  ctx.textAlign = 'center';
  ctx.font = '400 20px Georgia, serif';
  ctx.fillText('Ω', W / 2 - 240, H - 48);
  ctx.font = '400 20px Inter, sans-serif';
  ctx.fillText('DRIFT — your code has a pulse  ·  vrtxomega.github.io/drift', W / 2 + 16, H - 48);
  ctx.textAlign = 'left';

  // ── Gold border lines ──
  ctx.strokeStyle = 'rgba(201, 176, 107, 0.15)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(80, H - 260);
  ctx.lineTo(W - 80, H - 260);
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
