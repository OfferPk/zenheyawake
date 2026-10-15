# ZenHeyawake (ヘヤワケ)

> **Calm, meditative Japanese Heyawake (Divided Rooms) logic puzzle with procedural acoustics.**

[![CI](https://github.com/OfferPk/zenheyawake/actions/workflows/ci.yml/badge.svg)](https://github.com/OfferPk/zenheyawake/actions/workflows/ci.yml)
[![Pages](https://github.com/OfferPk/zenheyawake/actions/workflows/pages.yml/badge.svg)](https://github.com/OfferPk/zenheyawake/actions/workflows/pages.yml)
[![Android](https://github.com/OfferPk/zenheyawake/actions/workflows/android.yml/badge.svg)](https://github.com/OfferPk/zenheyawake/actions/workflows/android.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## 🎮 Play Live
- **Web App / PWA**: [https://offerpk.github.io/zenheyawake/](https://offerpk.github.io/zenheyawake/)
- **Android APK**: Download `zenheyawake-apk` from [GitHub Actions Artifacts](https://github.com/OfferPk/zenheyawake/actions/workflows/android.yml) or latest [Releases](https://github.com/OfferPk/zenheyawake/releases).

---

## 📸 Screenshots

| Shoji Room Partitions | Fluid Stone Placement | Grand Monastery Layouts |
|:---:|:---:|:---:|
| *(Tactile stone & dot marking)* | *(Drag or tap to divide rooms)* | *(50 levels across 5 difficulty packs)* |

---

## 🌸 About the Game

ZenHeyawake is inspired by the classic Japanese pencil-and-paper puzzle **Heyawake** (ヘヤワケ, meaning "Divided Rooms"), popularized by Nikoli.

You partition Japanese shoji tea rooms with black ink stones to bring stillness and balance to the monastery floor:
1. **Room Clue Numbers**: Thick wooden lattice lines divide the grid into rectangular rooms. A number in the corner specifies **exactly how many black stones** exist in that room. Rooms without numbers can contain any count.
2. **No Adjacent Stones**: Black stones (●) can never touch orthogonally (sharing an edge). Diagonal touching is permitted.
3. **Single Connected White Complex**: All white floor cells must form a single, unbroken connected room complex. No white cell may be isolated.
4. **The Corridor Rule**: A straight horizontal or vertical line of white cells cannot cross through more than two rooms (it can visit at most 2 distinct rooms before being blocked by a black stone or the outer perimeter).

---

## ✨ Features

- **50 Handcrafted Levels**: 5 difficulty tiers (Engawa 6×6, Shoji 7×7, Tatami 8×8, Tokonoma 9×9, Daitokuji 10×10).
- **100% Unique Solutions**: Every single level has been verified by the built-in constraint solver.
- **Procedural Japanese Web Audio**:
  - Tactile wooden shoji slide and clack resonances.
  - Deep, smooth sumi ink stone placement clicks.
  - Soft bamboo ticks when marking confirmed white dots.
  - Harmonic Koto chords when room clues are satisfied without violations.
  - Resonant Japanese Buddhist temple victory bell (*Bonshō* 梵鐘) tuned to the sacred 108 Hz fundamental upon level completion.
- **Fluid Controls**:
  - Tap or drag across cells to place stones or dots smoothly.
  - Dedicated tool modes: Cycle (🔄), Stone (●), and Dot (·).
  - Real-time room validation glowing serene jade green when matched.
  - Dynamic corridor warning highlight guides player deduction.
- **Deductive Hint Engine**: Step-by-step logic guidance highlighting forced black stones, room capacities, adjacent white dots, and corridor breaks.
- **Unlimited Undo & Reset**: Experiment freely with full state history.
- **Offline & Private**: Built as a zero-dependency Progressive Web App (PWA) with Service Worker and Capacitor Android packaging. Zero ads, zero trackers, no permissions needed.

---

## 🛠️ Development & Build

### Prerequisites
- Node.js 18+ (tested on Node 22 & 24)
- npm

### Install Dependencies
```bash
npm ci
```

### Run Unit Tests
```bash
npm test
```

### Build Web Assets
```bash
npm run build
```
Generates production assets in `www/`.

### Android Build (Capacitor)
```bash
npx cap add android
npx cap sync android
cd android && ./gradlew assembleDebug
```

---

## 📄 License
MIT License. Created by OfferPk.
