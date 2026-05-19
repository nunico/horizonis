# Horizonis

Horizonis is a specialized tool designed to help you map out fictional star clusters and solar systems. While primarily tailored for the RPG **Coriolis: The Third Horizon**, its procedural generation and interactive maps are adaptable for any space-faring universe or tabletop campaign.

## 🚀 Key Features

- **Interactive Star Maps**: Navigate through vast star clusters with a high-performance rendering engine.
- **Solar System Exploration**: Drill down into individual systems to view planets, moons, and other celestial bodies.
- **Procedural Generation**: Create unique, detailed systems on the fly using Rust-powered generation logic.
- **Detailed Inspector**: Access and manage technical data for every celestial entity.
- **Multi-Platform Support**: Use it as a lightweight web application or a powerful desktop tool.

## 🛠️ Tech Stack

- **Frontend**: [Svelte 5](https://svelte.dev/) & [SvelteKit](https://kit.svelte.dev/)
- **Rendering**: [Pixi.js 8](https://pixijs.com/)
- **Desktop**: [Tauri 2](https://tauri.app/)
- **Core Logic**: [Rust](https://www.rust-lang.org/) (via WASM for web and native for desktop)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) & [Lucide Icons](https://lucide.dev/)
- **Monorepo Management**: [Nx](https://nx.dev/) & [pnpm](https://pnpm.io/)
- **Runtime Environment**: [mise](https://mise.jdx.dev/)

## 📦 Getting Started

### Prerequisites

This project uses **mise** to manage its runtime environment (Node.js, Rust, etc.) and **pnpm** for package management.

```bash
# Install dependencies
pnpm install
```

### Development

Horizonis supports concurrent development for both Web and Desktop targets.

```bash
# Run both Web and Desktop in dev mode
pnpm dev

# Run Web only
pnpm web:dev

# Run Desktop only
pnpm desktop:dev
```

### Building

```bash
# Build both targets
pnpm build
```

## 🧪 Testing

The project includes unit tests for logic and Svelte components, as well as E2E tests for the full user flow.

```bash
# Run all unit tests
pnpm test

# Run end-to-end tests
pnpm e2e
```

## ⚖️ License

Horizonis is licensed under the [GNU Affero General Public License v3.0 (AGPL-3.0-only)](LICENSE).
