<div align="center">
  <img src="https://raw.githubusercontent.com/VrtxOmega/Gravity-Omega/master/omega_icon.png" width="100" alt="VERITAS" />
  <h1>DRIFT</h1>
  <p><strong>Real-Time 3D Visualization of Your GitHub Universe</strong></p>
  <p><em>Your code has a pulse.</em></p>
</div>

![Status](https://img.shields.io/badge/Status-ACTIVE-success?style=for-the-badge&labelColor=000000&color=d4af37)
![Stack](https://img.shields.io/badge/Stack-Three.js%20%2B%20GitHub%20API-informational?style=for-the-badge&labelColor=000000)
![Type](https://img.shields.io/badge/Type-Web%20App-blue?style=for-the-badge&labelColor=000000)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge&labelColor=000000)

---

Every repo becomes a galaxy. Every commit becomes a star. Every streak draws a constellation across your sky.

DRIFT transforms your GitHub activity into a living 3D star field. Connect your GitHub account and watch your development history render as an explorable celestial map — repos as star clusters, commits as points of light, contribution streaks as orbital paths.

![DRIFT Preview](drift-preview.png)

## Features

- **3D Galaxy Scene** - Repos rendered as navigable star clusters in a Three.js scene
- **Commit Stars** - Individual commits visualized as luminous points with size proportional to diff magnitude
- **Streak Constellations** - Contribution streaks drawn as connecting orbital paths
- **Real-Time Sync** - Live connection to GitHub API for up-to-date visualization
- **Camera Controls** - Orbit, zoom, and fly through your development universe
- **Repo Filtering** - Focus on specific repositories or view the full constellation
- **Time Scrubbing** - Scrub through your commit history to watch the galaxy evolve
- **Dark Nebula Aesthetic** - Deep-space color palette with luminous gold accents

## Quick Start

`ash
npm install
npm run dev
`

Open your browser and connect your GitHub account. Your development universe renders in real-time.

## Architecture

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Renderer** | Three.js | WebGL 3D scene, particle systems, orbital mechanics |
| **Data Layer** | GitHub REST API | Repository, commit, and contribution data |
| **UI** | HTML/CSS/JS | Controls, filtering, time scrubber |

## License

MIT

---

<div align="center">
  <sub>Built by <a href="https://github.com/VrtxOmega">RJ Lopez</a> | VERITAS Framework</sub>
</div>