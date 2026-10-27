# Typing Racing 3D — Starter Prototype

A responsive browser-game prototype built with React, Vite, and Three.js.

## Included
- Responsive dark racing-game UI for phones, tablets, laptops, and desktop
- 3D procedural track and car scene (no external paid assets)
- English, Bengali, Hindi, Arabic, Spanish, French, German, Russian, Japanese, and Chinese sample text
- Typing input, accuracy, WPM, progress, coins, and results
- Synthesized Premium Mechanical-style typing and game sound effects using Web Audio API
- Separate volume controls, master volume, mute, and browser-local settings
- Race countdown, nitro button, engine sound, victory/defeat result screen
- Basic local practice rival simulation

## Run locally
1. Install Node.js (LTS) from https://nodejs.org/
2. Extract the ZIP.
3. Open a terminal inside the extracted `typing-racing-3d` folder.
4. Run:
   ```bash
   npm install
   npm run dev
   ```
5. Open the local URL shown by Vite.

## Build check
```bash
npm run build
npm run preview
```

## Important current limitations
This is a frontend prototype, not a production-ready online game yet.
- Online rooms, real 2v2 multiplayer, server-side anti-cheat, accounts, cloud saves, shop purchases, and global leaderboards are not implemented.
- Coin rewards are local demo state and can be reset/modified in the browser. Do not use this version for real-value rewards.
- Multilingual typing uses sample passages and browser keyboard/input-method support. IME handling varies by browser and operating system.
- Synthesized audio is generated in code. It is an original placeholder sound design, not recorded mechanical keyboard or real engine audio.
- For real online play, add a Node.js + Socket.IO server and persistent database in a later milestone.

## GitHub upload
Create a repository named `typing-racing-3d`, then upload the extracted project files. Do not upload `.env` files containing secrets. This project has no API keys.
