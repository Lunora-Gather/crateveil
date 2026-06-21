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

*   **📺 Premium Glassmorphism Console**: A centered glowing game console featuring a scrolling grid backdrop, subtle crt flicker, vignette framing, and bright neon teal borders.
*   **🔊 Procedural Audio Synthesis**: Ambient background drone hums and action sound effects (steps, pushes, wall bumps, chimes) are synthesized dynamically in code using the browser's native **Web Audio API**—zero audio file downloads required.
*   **📱 Native-Feel Swipe & D-pad Controls**: Play comfortably on desktop with W/A/S/D or Arrow keys, or on mobile viewports using either the touch-screen D-pad or intuitive swipe gestures.
*   **🧮 Auto-Responsive Board Scaling**: Intelligent grid calculations subtract inner margins, borders, and gaps to ensure even the largest level maps fit perfectly on portrait mobile screens or side-by-side desktop layouts without clipping.
*   **🌓 Dual Display Modes**: Switch on-the-fly between a realistic **CRT Scanline Filter** mode and a clean, high-contrast **Dark Monochrome** mode.
*   **💾 Local Data Persistence**: High scores (best moves), cleared levels, sound toggles, and current level index are saved automatically using `localStorage`.

---

## 🎮 Navigation & Keyboard Controls

### Gameplay Controls
| Action | Keyboard Shortcut | Mobile / Touch |
| :--- | :--- | :--- |
| **Move Player** | `W`/`A`/`S`/`D` or `Arrow Keys` | Swipe in direction OR Tap D-pad (`▲` `◀` `▶` `▼`) |
| **Undo Move** | `U` | Tap `Undo` |
| **Restart Level** | `R` | Tap `Restart` |
| **Next Level** | `N` (Active after level clear) | Tap `Next Level` |
| **Back / Exit** | `Escape` | Tap `Menu` / `Back` |

---

## 🛠️ Architecture & Tech Stack

Crateveil is built entirely with vanilla web technologies to maintain high performance, low load times, and a compact asset profile:

```
src/
├── main.js        # Bootstraps event bindings, callbacks, and screen transitions
├── game.js        # Core Sokoban state machine (history stack, move validation, win checker)
├── renderer.js    # Procedural board drawer and dynamic grid coordinate cell sizing
├── input.js       # Listens to physical keyboards, click buttons, and swipe touch paths
├── sound.js       # Real-time Web Audio API synthesizer nodes (chimes, hums, thumps)
├── storage.js     # Manages high score persistence and progress saves
├── ui.js          # Synchronizes hud updates, settings panel states, and lists
└── style.css      # Custom HSL tokens, scanline overlays, neon glows, and shake animations
```

---

## ⚙️ Local Installation & Development

To run or build the project locally, ensure you have [Node.js](https://nodejs.org/) installed.

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/Lunora-Gather/crateveil.git
    cd crateveil
    ```

2.  **Install bundling dependencies**:
    ```bash
    npm install
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

## 🌐 Deployment to GitHub Pages

The repository contains a custom GitHub Action workflow configuration in `.github/workflows/deploy.yml` that automatically builds and deploys the site to GitHub Pages whenever you push commits to the `main` branch.

To enable:
1. Push this project repository to GitHub under the name `crateveil`.
2. Navigate to repository **Settings** &rarr; **Pages**.
3. Under **Build and deployment** &rarr; **Source**, select **GitHub Actions**.

---

## 📄 License
This project is open-source software licensed under the [MIT License](LICENSE).
