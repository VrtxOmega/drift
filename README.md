# DRIFT

> **Real-time 3D visualization of your GitHub development universe — sovereign, local-rendered, operator-grade.**

<a href="https://vrtxomega.github.io/drift/"><img src="https://img.shields.io/badge/Live%20Site-GitHub%20Pages-2ea44f?style=for-the-badge"></a>
![Status](https://img.shields.io/badge/Status-ACTIVE-success?style=for-the-badge&labelColor=000000&color=d4af37)
![Stack](https://img.shields.io/badge/Stack-Three.js%20%2B%20GitHub%20API-informational?style=for-the-badge&labelColor=000000)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge&labelColor=000000)

**Live Site:** https://vrtxomega.github.io/drift/

---

## ECOSYSTEM CANON: The Cartography Layer

Within the VERITAS & Sovereign Ecosystem, intelligence without visibility is execution without accountability. DRIFT serves as the Cartography Layer — a deterministic rendering surface that maps every commit, repository, and contribution streak from the GitHub data plane into a navigable three-dimensional field. It does not interpret; it renders exactly what the data states, with no interpolation or narrative embellishment. Operators use DRIFT to audit their own output with the same rigorous clarity applied across the entire Omega Universe. Where the Omega Brain governs intelligence and VERITAS validates pipelines, DRIFT makes the execution record tangible.

---

## OVERVIEW

DRIFT is a client-side web application that connects to the GitHub REST API and renders a real-time 3D star field from repository and commit data. Each repository becomes a navigable star cluster; each commit becomes a luminous point scaled to its diff magnitude; each contribution streak traces a connecting orbital path across the scene. The application runs entirely in the browser using Three.js and requires no server-side infrastructure beyond static hosting.

---

## FEATURES

- **3D Galaxy Rendering** — Repositories rendered as discrete star clusters within a WebGL scene powered by Three.js
- **Commit-Scaled Stars** — Each commit visualized as a luminous point; size is proportional to diff magnitude for immediate signal density assessment
- **Streak Constellations** — Contribution streaks drawn as connecting orbital paths, preserving chronological structure
- **Live GitHub API Sync** — Direct REST API connection provides up-to-date repository and commit data without a backend proxy
- **Full Camera Controls** — Orbit, zoom, and free-fly navigation through the rendered development field
- **Repository Filter** — Isolate a specific repository or render the full multi-repo constellation simultaneously
- **Time Scrubber** — Traverse commit history chronologically to observe the galaxy's structural evolution
- **Dark Nebula Aesthetic** — Deep-space color palette with luminous gold accents consistent with the Gold & Obsidian design doctrine
- **Zero Server Dependency** — All rendering and data aggregation occurs client-side; no telemetry, no backend state

---

## ARCHITECTURE

```
┌─────────────────────────────────────────────────────────┐
│                        DRIFT                            │
│              Client-Side Web Application                │
└──────────────────────────┬──────────────────────────────┘
                           │
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
   ┌───────────────┐ ┌───────────────┐ ┌───────────────┐
   │  Data Layer   │ │ Render Engine │ │   UI Layer    │
   │               │ │               │ │               │
   │  GitHub REST  │ │   Three.js    │ │  HTML/CSS/JS  │
   │  API v3       │ │   WebGL       │ │  Controls     │
   │  (Auth token) │ │   Particles   │ │  Filters      │
   └───────┬───────┘ └───────┬───────┘ └───────┬───────┘
           │                 │                 │
           └─────────────────┼─────────────────┘
                             ▼
                  ┌─────────────────────┐
                  │   Scene Graph       │
                  │  ┌───────────────┐  │
                  │  │ Star Clusters │  │
                  │  │   (Repos)     │  │
                  │  ├───────────────┤  │
                  │  │  Star Points  │  │
                  │  │  (Commits)    │  │
                  │  ├───────────────┤  │
                  │  │   Orbitals    │  │
                  │  │   (Streaks)   │  │
                  │  └───────────────┘  │
                  └─────────────────────┘
```

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Renderer** | Three.js | WebGL 3D scene, particle systems, orbital mechanics |
| **Data Layer** | GitHub REST API v3 | Repository, commit, and contribution data |
| **UI Controls** | HTML / CSS / Vanilla JS | Filtering, time scrubber, camera controls |
| **Build Tool** | Vite | Module bundling, local dev server, static build |

---

## QUICKSTART

### Prerequisites

- Node.js 18+ and npm / yarn / pnpm
- A GitHub personal access token (classic or fine-grained, `repo:read` scope)

### Installation

```bash
# npm
npm install

# yarn
yarn install

# pnpm
pnpm install
```

### Development

```bash
# npm
npm run dev

# yarn
yarn dev

# pnpm
pnpm dev
```

Open `http://localhost:5173` in your browser. Enter your GitHub username and personal access token when prompted. Your development universe renders in real-time.

### Production Build

```bash
# npm
npm run build

# yarn
yarn build

# pnpm
pnpm build
```

Build output is written to `dist/`. Deploy to any static host (GitHub Pages, Netlify, Vercel).

---

## CONFIGURATION

DRIFT is configured at runtime via the browser UI. No `.env` file is required for standard operation.

| Parameter | Source | Description |
|-----------|--------|-------------|
| `GitHub Username` | UI input | Target GitHub account to visualize |
| `Personal Access Token` | UI input | Read-only GitHub PAT (`repo` scope); never transmitted beyond the GitHub API |
| `Repository Filter` | UI control | Limit rendering to a single named repository |
| `Time Range` | UI scrubber | Restrict visualization to a specific commit date window |

> **Note:** The PAT is held in browser memory only for the duration of the session. DRIFT does not persist tokens to localStorage or transmit them to any third-party endpoint.

---

## SECURITY & SOVEREIGNTY

- **Client-side only.** All API calls originate from the browser directly to `api.github.com`. No intermediate server handles or stores credentials.
- **No telemetry.** DRIFT collects no usage data, analytics, or error reporting. The application is stateless across sessions.
- **Minimal token scope.** Only `repo:read` (or equivalent fine-grained read access) is required. Write scopes are neither required nor recommended.
- **Local rendering.** The Three.js scene is computed and rendered entirely within the browser's WebGL context. No data leaves the client beyond the GitHub API requests initiated by the operator.
- **VERITAS-aligned.** DRIFT adheres to the Omega Universe doctrine of zero-cloud dependency for data processing. The visualization layer does not introduce any hidden network surface area beyond the declared GitHub API integration.

---

## ROADMAP

| Milestone | Status | Description |
|-----------|--------|-------------|
| Core 3D rendering | Complete | Three.js scene with repo clusters and commit stars |
| GitHub REST integration | Complete | Live API sync for repos and commits |
| Camera controls | Complete | Orbit, zoom, and fly-through navigation |
| Streak constellations | Complete | Contribution streak orbital path rendering |
| Time scrubber | Complete | Chronological commit history traversal |
| VERITAS audit overlay | Planned | Pipeline status overlay sourced from omega-brain-mcp |
| Omega Brain integration | Planned | Display VERITAS gate states per repository |
| Sovereign token auth | Planned | Replace browser-entered PAT with VERITAS-issued ephemeral token |
| Export / snapshot | Planned | Save current galaxy view as PNG or shareable URL |

---

## OMEGA UNIVERSE

DRIFT is one node in the VERITAS & Sovereign Ecosystem. The full architecture:

| Repository | Role |
|------------|------|
| [omega-brain-mcp](https://github.com/VrtxOmega/omega-brain-mcp) | Central intelligence — 10-gate VERITAS pipeline, cross-session memory, cryptographic audit ledger |
| [Ollama-Omega](https://github.com/VrtxOmega/Ollama-Omega) | Sovereign Ollama bridge — local and cloud model inference via MCP |
| [Aegis](https://github.com/VrtxOmega/Aegis) | Hardware governance and system security layer |
| [aegis-rewrite](https://github.com/VrtxOmega/aegis-rewrite) | Next-generation Aegis architecture |
| [veritas-vault](https://github.com/VrtxOmega/veritas-vault) | Ephemeral and persistent sovereign intelligence storage |
| [SovereignMedia](https://github.com/VrtxOmega/SovereignMedia) | All-in-one sovereign media platform |
| [sovereign-arcade](https://github.com/VrtxOmega/sovereign-arcade) | AAA web meta-arcade suite — premium UI and application layer |

---

## LICENSE

MIT — see [LICENSE](LICENSE) for full terms.

---

<div align="center">
  <sub>Built by <a href="https://github.com/VrtxOmega">RJ Lopez</a> — VERITAS &amp; Sovereign Ecosystem</sub>
</div>
