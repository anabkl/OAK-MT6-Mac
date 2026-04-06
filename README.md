# ⬡ Lahra-MT6-Pro

> A next-generation macOS trading terminal — a modern, high-performance
> alternative to MetaTrader 5, built with **Tauri (Rust)** and **React +
> TypeScript** by **Anas Lahraoui & Othman Karam**.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Architecture](#architecture)
3. [Prerequisites](#prerequisites)
4. [Quick Start](#quick-start)
5. [Project Structure](#project-structure)
6. [Environment Variables](#environment-variables)
7. [Backend Microservices](#backend-microservices)
8. [Key Components](#key-components)
9. [Production Build](#production-build)
10. [Contributing](#contributing)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop shell | [Tauri v1](https://tauri.app) (Rust) |
| UI framework | [React 18](https://react.dev) + [TypeScript 5](https://www.typescriptlang.org) |
| Styling | [TailwindCSS 3](https://tailwindcss.com) — Bloomberg dark-mode palette |
| Charting | [TradingView Lightweight Charts 4](https://tradingview.github.io/lightweight-charts/) |
| State | [Zustand 4](https://zustand-demo.pmnd.rs) |
| Build | [Vite 5](https://vitejs.dev) |
| HTTP client | [reqwest](https://docs.rs/reqwest) (rustls, async) |
| Async runtime | [Tokio](https://tokio.rs) |
| Logging | [tracing](https://docs.rs/tracing) + tracing-subscriber |

---

## Architecture

```
┌─────────────────────────── macOS Desktop ───────────────────────────────┐
│                                                                          │
│  Tauri Window (WebView)                                                  │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  React + TypeScript UI                                           │   │
│  │  ┌────────────────┐  ┌──────────────┐  ┌────────────────────┐   │   │
│  │  │  TradingChart  │  │  OrderPanel  │  │    AIMonitor       │   │   │
│  │  │ (lightweight-  │  │  (BUY/SELL   │  │  (LSTM signals,    │   │   │
│  │  │  charts OHLCV) │  │   form +     │  │   confidence,      │   │   │
│  │  │                │  │   Tauri IPC) │  │   Apply to Order)  │   │   │
│  │  └────────────────┘  └──────────────┘  └────────────────────┘   │   │
│  │               Zustand Store (ticks · bars · signals · orders)    │   │
│  │               useTickWebSocket (auto-reconnect WebSocket)        │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                          │ Tauri IPC (invoke)                            │
│  Rust Core (src-tauri/)                                                  │
│  ┌────────────────────────────────────────────────────────────────┐     │
│  │  commands/brain.rs      →  fetch_ai_signal, fetch_ohlc_history │     │
│  │  commands/executor.rs   →  execute_order, get_open_positions,  │     │
│  │                             cancel_order                        │     │
│  │  state.rs               →  shared reqwest::Client + base URLs  │     │
│  └────────────────────────────────────────────────────────────────┘     │
│             │ reqwest (HTTP/JSON)         │ reqwest (HTTP/JSON)          │
└─────────────┼─────────────────────────────┼────────────────────────────┘
              │                             │
    ┌─────────▼──────────┐       ┌──────────▼──────────┐
    │  Python Brain      │       │  Java Executor       │
    │  FastAPI + LSTM    │       │  Spring Boot + OANDA │
    │  :8000             │       │  :8080               │
    └────────────────────┘       └─────────────────────┘
```

**Data flow for live ticks:**

```
Python Brain WS /ws/ticks/{symbol}
  → useTickWebSocket (React hook, auto-reconnect)
    → Zustand store (setLatestTick / appendOhlcBar / addSignal)
      → TradingChart.useEffect (setData on series — no re-render)
      → StatusBar / AIMonitor (selector subscriptions)
```

---

## Prerequisites

| Tool | Version | Install |
|---|---|---|
| **Node.js** | ≥ 20 LTS | `brew install node` |
| **Rust** | ≥ 1.70 (stable) | `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \| sh` |
| **Tauri CLI** | 1.x | `cargo install tauri-cli` |
| **Xcode CLT** | latest | `xcode-select --install` |
| **Docker** | ≥ 24 | [Docker Desktop](https://www.docker.com/products/docker-desktop/) |

---

## Quick Start

### 1 — Clone & install

```bash
git clone https://github.com/anabkl/OAK-MT6-Mac.git
cd OAK-MT6-Mac

# Install JS dependencies
npm install
```

### 2 — Configure environment

```bash
cp .env.example .env
# Edit .env if your Docker services run on non-default ports
```

### 3 — Start the Docker microservices

```bash
# From your microservices repo:
docker compose up -d brain executor
```

### 4 — Run in development mode

```bash
npm run tauri:dev
# or equivalently: cargo tauri dev
```

This command:
- Starts Vite dev server on `http://localhost:1420`
- Compiles the Rust backend with `cargo`
- Opens a native macOS window with hot-reload enabled

### 5 — Type-check only (no build)

```bash
npm run type-check
```

---

## Project Structure

```
OAK-MT6-Mac/
├── src/                           # React + TypeScript frontend
│   ├── components/
│   │   ├── Chart/
│   │   │   └── TradingChart.tsx   # Candlestick + volume chart (lightweight-charts)
│   │   ├── OrderPanel/
│   │   │   └── OrderPanel.tsx     # BUY/SELL form → Tauri execute_order command
│   │   ├── AIMonitor/
│   │   │   └── AIMonitor.tsx      # Live AI signal display + "Apply to Order" shortcut
│   │   └── StatusBar.tsx          # Bid/Ask/Spread + feed status + UTC clock
│   ├── hooks/
│   │   └── useTickWebSocket.ts    # Auto-reconnect WS hook (exponential back-off)
│   ├── store/
│   │   └── tradingStore.ts        # Zustand global state (ticks · bars · signals · orders)
│   ├── types/
│   │   └── trading.ts             # TypeScript interfaces shared across the frontend
│   ├── App.tsx                    # Root layout (header · chart · right panel · statusbar)
│   ├── main.tsx                   # React entry point
│   └── index.css                  # Tailwind directives + custom scrollbar + utilities
│
├── src-tauri/                     # Rust / Tauri backend
│   ├── src/
│   │   ├── commands/
│   │   │   ├── mod.rs
│   │   │   ├── brain.rs           # fetch_ai_signal, fetch_ohlc_history
│   │   │   └── executor.rs        # execute_order, get_open_positions, cancel_order
│   │   ├── error.rs               # AppError (serialisable, thiserror)
│   │   ├── models.rs              # Shared Rust structs (OhlcBar, AiSignal, OrderRequest …)
│   │   ├── state.rs               # AppState (reqwest Client + service URLs)
│   │   ├── lib.rs                 # run() entry point, Tauri builder
│   │   └── main.rs                # Binary entry point
│   ├── build.rs                   # tauri-build
│   ├── Cargo.toml
│   ├── icons/                     # App icons (add before bundling)
│   └── tauri.conf.json            # Tauri window / bundle / CSP config
│
├── index.html                     # HTML entry point
├── vite.config.ts
├── tsconfig.json
├── tsconfig.node.json
├── tailwind.config.js
├── postcss.config.js
├── package.json
├── .env.example                   # Environment variable template
└── .gitignore
```

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `VITE_WS_FEED_URL` | `ws://localhost:8000/ws/ticks` | WebSocket base URL for the Python Brain |
| `BRAIN_URL` | `http://localhost:8000` | Python Brain REST base URL (Rust backend) |
| `EXECUTOR_URL` | `http://localhost:8080` | Java Executor REST base URL (Rust backend) |
| `RUST_LOG` | `info` | Tracing filter (e.g. `lahra_mt6_pro=debug`) |

Copy `.env.example` to `.env` and customise before running.

---

## Backend Microservices

### Python Brain (FastAPI) — expected endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/signal/{symbol}` | Returns the latest `AiSignal` JSON |
| `GET` | `/api/ohlc/{symbol}?count=N&granularity=M5` | Returns `OhlcBar[]` JSON |
| `WS` | `/ws/ticks/{symbol}` | Streams `WsMessage<TickData \| OhlcBar \| AiSignal>` |

### Java Executor (Spring Boot) — expected endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/orders` | Places an `OrderRequest`, returns `OrderResponse` |
| `GET` | `/api/orders/open` | Returns `Position[]` |
| `DELETE` | `/api/orders/{id}` | Cancels a pending order, returns `OrderResponse` |

All JSON shapes are defined in `src/types/trading.ts` (TypeScript) and `src-tauri/src/models.rs` (Rust).

---

## Key Components

### `TradingChart`

- Uses `createChart` from `lightweight-charts` to render a candlestick series and a volume histogram.
- Subscribes to `useTradingStore` with a **selector** — only re-renders when `ohlcBars` changes.
- Chart series are updated imperatively (`.setData()`) inside a `useEffect`, keeping React
  render cycles off the hot path for maximum frame rate.
- A `ResizeObserver` automatically resizes the chart when the window changes.

### `useTickWebSocket`

- A single persistent WebSocket with **exponential back-off reconnection** (1 s → 30 s max).
- All message parsing happens in the `onmessage` handler; state updates go through
  Zustand **actions** — never `setState` inside the hook.
- Clean `useEffect` destructor prevents memory leaks.

### `OrderPanel`

- Calls the Tauri `execute_order` IPC command which proxies to the Java Executor.
- Handles loading states, error display, and success feedback without a global
  notification library.

### `AIMonitor`

- Displays the latest AI signal prominently with a confidence gauge bar.
- "Apply to Order Panel ↗" pre-fills the `OrderPanel` with signal TP/SL/direction.
- Scrollable signal history table.

---

## Production Build

```bash
# Build & bundle the macOS .app + .dmg
npm run tauri:build
```

Output is in `src-tauri/target/release/bundle/macos/`.

> **Code signing**: Set `signingIdentity` in `src-tauri/tauri.conf.json` and
> ensure your Apple Developer certificate is in Keychain before building for
> distribution.

---

## Contributing

1. Fork the repository and create a feature branch.
2. Follow the existing code style (Rust: `cargo fmt`, TS: `npm run lint`).
3. Open a pull request with a clear description of changes.

---

*Built with ❤️ by Anas Lahraoui & Othman Karam.*
