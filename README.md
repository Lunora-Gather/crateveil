# 🗃️ CRATEVEIL
> **A Premium Retro-Futuristic Sokoban Terminal Game**

---

<p align="center">
  <b>Push the crates. Reveal the maze. Connect the terminal.</b><br>
  Crateveil is a high-fidelity warehouse-keeper puzzle game built for modern browsers with a deep, animated cyberpunk aesthetic. Featuring dynamic board scaling, custom-synthesized real-time audio, and rich tactile feedback, it replicates a classic CRT console grid while maintaining pixel-perfect responsiveness.
</p>

<p align="center">
  <a href="https://lunora-gather.github.io/crateveil/" target="_blank">
    <img src="https://img.shields.io/badge/PLAY_LIVE_DEMO-Play_Now!-00ffd5?style=for-the-badge&logo=googleplay&logoColor=05060a" alt="Play Live Demo">
  </a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Tech-HTML5_/_CSS3_/_JS_ES6-teal?style=for-the-badge" alt="Tech Stack">
  <img src="https://img.shields.io/badge/Audio-Web_Audio_API_Synthesizer-orange?style=for-the-badge" alt="Audio Synthesizer">
  <img src="https://img.shields.io/badge/Layout-Glassmorphic_Responsive-blue?style=for-the-badge" alt="Responsive Grid">
</p>

---

## 📟 Cyber-Terminal Features

*   **📺 Premium Glassmorphism Console**: A centered glowing game console with a grid backdrop, CRT scanlines, vignette framing, and neon teal borders.
*   **🔊 Procedural Audio Synthesis**: Ambient background drone hums and action sound effects (steps, pushes, wall bumps, chimes) are synthesized dynamically in code using the browser's native **Web Audio API**—zero audio file downloads required.
*   **📱 Native-Feel Swipe & D-pad Controls**: Play comfortably on desktop with W/A/S/D or Arrow keys, or on mobile viewports using either the touch-screen D-pad or intuitive swipe gestures.
*   **🧮 Auto-Responsive Board Scaling**: The board scales to its available space on mobile and desktop. Short viewports can scroll to reach the controls.
*   **🌓 Dual Display Modes**: Switch on-the-fly between a realistic **CRT Scanline Filter** mode and a clean, high-contrast **Dark Monochrome** mode.
*   **💾 Local Data Persistence**: Unfinished boards and their full undo history are saved per level alongside best scores, cleared levels, and preferences. Continue Game resumes the last selected board. Restart clears that board's checkpoint. Reset Progress clears all boards and scores while keeping sound and theme preferences.

---

## 🎮 Navigation & Keyboard Controls

### Gameplay Controls
| Action | Keyboard Shortcut | Mobile / Touch |
| :--- | :--- | :--- |
| **Move Player** | `W`/`A`/`S`/`D` or `Arrow Keys` | Swipe in direction OR Tap D-pad (`▲` `◀` `▶` `▼`) |
| **Undo Move** | `U` | Tap `Undo` |
| **Restart Level** | `R` | Tap `Restart` |
| **Next Level** | `N` (Active after level clear) | Tap `Next Level` |
| **Back / Close Dialog** | `Escape` | Tap `Menu` / `Back` |

---

## 🛠️ Architecture & Tech Stack

Crateveil is built entirely with vanilla web technologies to maintain high performance, low load times, and a compact asset profile:

```
src/
├── main.js        # Bootstraps event bindings, callbacks, and screen transitions
├── game.js        # Movement, undo, and win detection
├── levels.js      # The 15 level maps
├── renderer.js    # Reusable board tiles and responsive sizing
├── input.js       # Listens to physical keyboards, click buttons, and swipe touch paths
├── sound.js       # Real-time Web Audio API synthesizer nodes (chimes, hums, thumps)
├── storage.js     # Manages high score persistence and progress saves
├── ui.js          # Synchronizes hud updates, settings panel states, and lists
└── style.css      # Custom HSL tokens, scanline overlays, neon glows, and shake animations
```

---

## ⚙️ Local Installation & Development

To run or build the project locally, use [Node.js](https://nodejs.org/) 20.19+ on the 20.x line, or 22.12 or newer.

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/Lunora-Gather/crateveil.git
    cd crateveil
    ```

2.  **Install bundling dependencies**:
    ```bash
    npm ci
    ```

3.  **Launch local hot-reload dev server**:
    ```bash
    npm run dev
    ```

4.  **Package optimized assets for production**:
    ```bash
    npm run build
    ```

5.  **Preview the compiled production bundle**:
    ```bash
    npm run preview
    ```

---

## Verification

- `npm test` solves all 15 maps using an independent breadth-first search and replays each solution through the game engine. It also checks checkpoints, legacy saves, interleaved score writes, and the audio lifecycle.
- `npm run test:safari` builds the production site and opens it in the installed macOS Safari. It clears all 15 levels, checks layout at eight viewport sizes, reloads an unfinished board, and exercises shared storage in two open game pages. It uses an isolated localhost port and leaves existing Safari windows open.

## 🌐 Deployment to GitHub Pages

The workflow in `.github/workflows/deploy.yml` runs tests and builds the site on pull requests and pushes to `main`. On `main`, it deploys the build artifact to GitHub Pages.

Set **Settings → Pages → Build and deployment → Source** to **GitHub Actions**. Repositories using the former `gh-pages` branch setup need to switch the source before running the updated workflow. The production base path is `/crateveil/`.

---

## 📄 License
This project is open-source software licensed under the [MIT License](LICENSE).

Outfit and Share Tech Mono ship with the game under the SIL Open Font License. [Outfit license](public/licenses/outfit.txt) · [Share Tech Mono license](public/licenses/share-tech-mono.txt)
