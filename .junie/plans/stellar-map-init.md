---
sessionId: session-260515-223106-o38b
---

# Requirements

### Overview & Goals

Build "Horizonis", an interactive stellar map desktop application that serves as a sci-fi worldbuilding tool. The app allows users to navigate a galaxy-scale star cluster and drill down into individual solar systems with realistic orbital diagrams.

### Scope

- **In Scope**:
  - Interactive 2D Canvas rendering for both Cluster and Solar System views.
  - Data-driven architecture with Rust as the source of truth.
  - Local JSON persistence for map data.
  - Core navigation: Zoom, Pan, Drill-down, and Back.
  - Detail inspector for stars, planets, and portals.
- **Out of Scope**:
  - 3D space flight simulation.
  - Procedural generation of entire clusters (focus is on manual/data-driven map).
  - Multi-user collaboration or cloud sync.

### User Stories

- **As a worldbuilder**, I want to see how my star systems are connected via portals so I can plan interstellar routes.
- **As a user**, I want to click on a star system to see its planets and their orbits in an AU-accurate scale.
- **As a user**, I want to save my map locally and have it persist between sessions.

# Technical Design

### Current Implementation

The project is currently empty, containing only the design document (`idea.md`) and tool configuration (`mise.toml`).

### Key Decisions

- **Frontend Framework**: SvelteKit in SPA mode for a reactive UI and fast desktop performance.
- **Rendering Engine**: **Pixi.js** for high-performance 2D WebGL rendering, capable of handling thousands of nodes and complex orbital paths.
- **Backend Core**: Rust with Tauri v2 for native performance and safe data management.
- **Data Format**: JSON for persistence, leveraging Rust's `serde` for robust serialization.
- **Unit Scale**: Astronomical Units (AU) used as the canonical distance unit in data, converted to pixels in the renderer via configurable scales.

### Proposed Changes

- **Backend (Rust)**:
  - Create a domain model matching the `idea.md` specs.
  - Implement a storage layer using `tauri::path::app_data_dir`.
  - Use `petgraph` for portal route calculations.
- **Frontend (Svelte/Deno)**:
  - Use `pixi-viewport` for standard map interactions.
  - Implement a dual-canvas system or a single adaptive canvas for the two view modes.
  - State management via Svelte stores to track `activeSystemId`, `selectedEntity`, and `viewMode`.

### Data Models (TypeScript)

```typescript
interface SolarSystem {
	id: string;
	name: string;
	stars: Star[];
	portals: Portal[];
	orbital_regions: OrbitalRegion[];
}

interface OrbitalBody {
	id: string;
	name: string;
	body_type: 'Planet' | 'Moon' | 'SpaceStation' | 'DwarfPlanet' | 'Comet';
	orbit_au: number;
	satellites: OrbitalBody[];
	tags: string[];
}
```

### File Structure

- `src-tauri/src/`:
  - `main.rs`: Tauri setup and command registration.
  - `models.rs`: Rust structs and enums.
  - `commands.rs`: Implementation of `get_cluster`, `save_cluster`, etc.
  - `storage.rs`: JSON file I/O logic.
- `src/`:
  - `lib/components/`: `StarMap.svelte`, `SolarSystemMap.svelte`, `Inspector.svelte`.
  - `lib/pixi/`: Rendering logic, AU-to-Pixel scaling, sprite management.
  - `lib/stores/`: `appState.ts`, `clusterData.ts`.
  - `routes/+layout.svelte`: Main app shell.

# Testing

### Validation Approach

Verification will be done by running the Tauri app in development mode and inspecting the rendered output against the data model.

### Key Scenarios

- **Data Load**: App starts, reads `cluster.json` (or default), and renders the Cluster View.
- **Navigation**: Clicking a system node successfully transitions to the Solar System View with correct orbital scaling.
- **Persistence**: Renaming a planet in the Inspector and clicking "Save" updates the local JSON file.
- **Scaling**: Switching between linear and log scales in the Solar System View correctly repositions planets.

### Edge Cases

- **Empty Systems**: Systems with no planets or stars should render gracefully.
- **Recursive Satellites**: Moons of moons (stations) should render in correct hierarchy.
- **Missing Data File**: App should create a default template if no JSON file exists.

# Delivery Steps

### ✓ Step 1: Project Scaffolding & Setup

Initialize the Tauri v2 and SvelteKit project using Deno as the runtime.

- Run `deno run -A npm:create-tauri-app@latest` (or equivalent) to scaffold the project.
- Configure SvelteKit for SPA mode using `@sveltejs/adapter-static`.
- Setup the project structure with `src-tauri` for Rust and `src` for Svelte.
- Install necessary frontend dependencies: `pixi.js`, `viewport` for Pixi, `lucide-svelte`, `tailwindcss`.
- Install backend crates: `serde`, `serde_json`, `uuid`, `petgraph`, `tauri`.

### ✓ Step 2: Data Models & Backend Infrastructure

Define the core data structures and Tauri commands in Rust.

- Implement the structs (`StarCluster`, `SolarSystem`, `Portal`, etc.) in `src-tauri/src/models.rs` as specified in `idea.md`.
- Create corresponding TypeScript types in `src/lib/types/stellar.ts`.
- Implement stub Tauri commands: `get_cluster`, `get_system`, `save_cluster`, `find_portal_route`.
- Setup a basic `StorageManager` in Rust to handle JSON I/O in the app data directory.

### ✓ Step 3: Implement Star Cluster View (Galaxy Scale)

Build the Star Cluster View using Pixi.js.

- Implement a `StarMap` component that initializes a Pixi.js application.
- Create rendering logic for Star Systems as interactive nodes.
- Implement Portal rendering using lines/arcs between nodes, including labels for jump routes.
- Add pan and zoom functionality using `pixi-viewport`.
- Implement click-to-drill-down logic to transition to the Solar System view.

### ✓ Step 4: Implement Solar System View (Orbital Scale)

Build the Solar System View with AU-scaled orbital rendering.

- Implement the `SolarSystemMap` component using Pixi.js.
- Create a coordinate system that handles AU-to-Pixel conversion (linear and log scales).
- Implement orbital path rendering (ellipses) and body rendering (Stars, Planets, Moons).
- Add support for binary/trinary star systems with multiple orbital centers.
- Render orbital regions like asteroid belts as annular bands.

### ✓ Step 5: UI Integration, State, and Persistence

Connect the views with UI panels and implement data persistence.

- Create the Detail Inspector panel to show properties of selected bodies/systems.
- Implement the "Back to Cluster" navigation and view-switching state.
- Wire up the `save_cluster` command to persist changes made in the UI (e.g. renaming systems).
- Add keyboard shortcuts (`Escape`, `F`, `G`) and global UI controls (filters, layer toggles).
- Verify 60fps performance and smooth transitions between views.

### ✓ Step 6: Advanced Procedural Generation in Rust
Reimplement the cluster generation in Rust with astro-physical principles and non-crossing portals.

- Implement `src-tauri/src/generation.rs` with logic for star systems (mass, density, gravity).
- Enhance `models.rs` to include physical properties (mass, radius) for stars and orbital bodies.
- Implement portal generation using a planar graph approach (e.g. Delaunay triangulation + pruning) to ensure no crossings.
- Integrate the generator into the backend to initialize the default cluster procedurally.
- Update tests to verify the new procedural logic.

### ✓ Step 7: Refine Rendering and Readability
Improve the visual experience by ensuring labels and objects maintain consistent scale and handling overlapping satellites.

- Implement constant-size scaling for stars, planets, and labels across all zoom levels.
- Implement proximity-based culling for satellites in the Solar System view to prevent overlap with parent bodies.
- Ensure text labels remain readable by adjusting their scale inversely to the viewport zoom.
- Verify that zoom primarily affects distances rather than object sizes.
