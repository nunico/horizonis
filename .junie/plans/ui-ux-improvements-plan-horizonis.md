---
sessionId: session-260516-141900-1ivb
---

# Requirements

### Overview & Goals

The goal of this task is to improve the visual feedback for navigation and selection in the Star Map and Solar System Map. By highlighting orbits and portal connections, users can better understand the relationship between celestial bodies and systems.

### Scope

- **Navigation & Search**: (Previously implemented) Navigation bar, breadcrumbs, and search functionality.
- **Inspector**: (Previously implemented) Keyboard shortcuts and auto-focus.
- **Advanced Map Highlighting**:
  - **Solar System Map**:
    - Highlight orbits when an object (star, planet, etc.) is hovered or selected.
    - Highlight the object itself when its orbit is hovered.
    - Make orbits interactive (hoverable and clickable).
  - **Star Map**:
    - Highlight portal connections when a system is hovered or selected.
    - Highlight both connected systems when a portal connection is hovered.
    - Make portal connections interactive (hoverable).

### User Stories

- **As a user**, I want to see which orbit belongs to which planet when I hover over it.
- **As a user**, I want to easily see all portal connections for a selected system in the star map.
- **As a user**, I want to identify which systems are connected by a portal by hovering over the portal line.

# Technical Design

### Current State

- `StarMap` and `SolarSystemMap` are PIXI-based visualizations.
- `Inspector` is a sidebar for editing entity names and viewing properties.
- Navigation is handled by `Backspace` (to cluster) and `Escape` (clear selection) in `+layout.svelte`.

### Proposed Changes

#### 1. Interactive Orbits (`SolarSystemMap.svelte`)

- **Orbit Graphics**: Convert orbits into interactive `PIXI.Graphics` objects.
- **Custom Hit Area**: Implement a ring-shaped hit area for orbits to support accurate hover detection on the orbit line.
- **Bidirectional Highlighting**:
  - Hovering a body highlights its orbit.
  - Hovering an orbit highlights the corresponding body.
- **Selection**: Keep the orbit highlighted if the body is selected.

#### 2. Interactive Portal Connections (`StarMap.svelte`)

- **Portal Graphics**: Change portal rendering from a single graphics object to individual interactive objects.
- **Connection Highlighting**:
  - Hovering/selecting a system highlights all its connected portals.
  - Hovering a portal line highlights both connected systems.
- **Deduplication**: Ensure portal connections are only rendered once per unique edge.

#### 3. State Management

- Use local Svelte state (e.g., `hoveredEntityId`, `hoveredPortalId`) to drive the PIXI rendering of highlights.
- Ensure `updateScales` and `drawPortals` react to hover/selection state changes.

### File Structure

- `src/lib/components/StarMap.svelte` (Modified)
- `src/lib/components/SolarSystemMap.svelte` (Modified)

### Testing Stack

- **Unit Tests**: `Vitest` with `@testing-library/svelte` for component verification and store logic.
- **E2E Tests**: `WebdriverIO` (with Deno) for cross-component workflows and navigation.
- **Coverage**: Aim for high coverage of new components and interaction logic (shortcuts, search).

### File Structure

- `src/lib/components/Navigation.svelte` (New)
- `src/lib/components/HelpOverlay.svelte` (New)
- `src/lib/components/Inspector.svelte` (Modified)
- `src/lib/components/StarMap.svelte` (Modified for selection/hover feedback)
- `src/lib/components/SolarSystemMap.svelte` (Modified for selection/hover feedback)
- `src/routes/+page.svelte` (Modified to include new components)
- `src/routes/+layout.svelte` (Modified for global keybindings)

# Testing

### Validation Approach

- **Unit Testing**:
  - Use `vitest` and `@testing-library/svelte` for component tests.
  - Test `Navigation.svelte`: breadcrumb rendering, back button visibility, and search state.
  - Test `Inspector.svelte`: keyboard shortcuts (`Enter`/`Escape`) and auto-focus logic.
  - Test `HelpOverlay.svelte`: toggle visibility and shortcut list display.
- **E2E Testing**:
  - Use `WebdriverIO` in `e2e-tests/`.
  - Create `navigation-flow.e2e.js` to verify searching for a system, jumping to it, and navigating back.
  - Verify keyboard shortcuts trigger the expected UI changes (e.g., `?` opens Help).
- **Manual Testing**:
  - Verify that the Navigation bar correctly reflects the current view and selection.
  - Test the Search functionality by typing partial names and selecting a system.
  - Verify that `Enter` and `Escape` work as expected in the Inspector.
  - Ensure the Help overlay appears when pressing `?`.
  - Check that the Back button correctly transitions from System to Cluster view.
- **Accessibility Check**:
  - Navigate the UI using only the keyboard.
  - Verify that all inputs have associated labels.
- **Regression Testing**:
  - Run `vitest` and `npm run test:e2e` to ensure no existing tests are broken.

# Delivery Steps

### ✓ Step 1: Implement Navigation Bar & Breadcrumbs

A new navigation bar with unit tests and breadcrumb logic.

- Create `src/lib/components/Navigation.svelte`.
- Implement a "Back" button visible only in `system` view.
- Add breadcrumbs showing `Cluster > [System Name] > [Selected Entity Name]`.
- Create `src/lib/components/Navigation.test.ts` to verify breadcrumb rendering and back button behavior.
- Integrate the `Navigation` component into `src/routes/+page.svelte`.

### ✓ Step 2: Add Search Functionality

Search feature with keyboard support and unit tests, covering systems and bodies.

- Add a search input to `Navigation.svelte`.
- Implement a search dropdown that filters systems AND orbital bodies from the `cluster` store.
- On selection: update `viewMode`, `activeSystemId`, and `selectedEntity` as appropriate.
- Add keyboard support for search (e.g., `/` to focus, `Esc` to blur).
- Update `Navigation.test.ts` to cover search filtering and keyboard interactions.

### ✓ Step 3: Implement Map Visual Feedback

Visual selection rings and hover tooltips for the PIXI maps.

- Add a selection highlight (ring/glow) to `StarMap.svelte` that tracks the selected system.
- Add a selection highlight to `SolarSystemMap.svelte` that tracks the selected star or body.
- Implement a simple tooltip component or PIXI overlay to show names on hover.
- Update `StarMap` and `SolarSystemMap` to change the cursor to a pointer on hover.

### ✓ Step 4: Enhance Inspector UX & Accessibility

Improved Inspector with keyboard shortcuts, auto-focus, and updated tests.

- Add keyboard shortcuts: `Enter` to save changes, `Escape` to cancel/close.
- Automatically focus the name input field when the Inspector opens.
- Add tooltips to the Save and Close buttons.
- Update `src/lib/components/Inspector.test.ts` to test keyboard saving, closing, and auto-focus.

### ✓ Step 5: Add Keyboard Shortcuts Help Overlay

Shortcut guide overlay with unit tests and global trigger.

- Create `src/lib/components/HelpOverlay.svelte`.
- Implement a modal that lists all keyboard shortcuts.
- Add a global listener for the `?` key to toggle the overlay.
- Create `src/lib/components/HelpOverlay.test.ts` to verify toggle logic and shortcut list.

### x Step 6: Implement E2E Tests for Navigation and UX

Full integration tests covering the new UI/UX features. (Skipped due to environment build limitations)

- Create `e2e-tests/test/specs/navigation-flow.e2e.js`.
- Test searching for a system/body and navigating to it.
- Test navigating back to the cluster view.
- Test opening the Help overlay via `?` and closing it.
- Test Inspector keyboard shortcuts in an E2E context.

### ✓ Step 7: Implement Advanced Map Highlighting (Orbits & Portals)

Highlighting of orbits and portal connections when objects are hovered or selected.

- **SolarSystemMap**:
  - Update `orbitNodes` to include entity IDs.
  - Implement ring-shaped hit areas for orbits.
  - Add hover/selection logic to orbit stroke styles.
  - Connect orbit hover to body highlighting.
- **StarMap**:
  - Refactor portal rendering to use individual interactive objects.
  - Implement line hit areas for portals.
  - Add highlight logic for systems and their connected portals.
