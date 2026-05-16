---
sessionId: session-260516-141900-1ivb
---

# Requirements

### Overview & Goals
The goal of this task is to improve the User Interface (UI) and User Experience (UX) of the Horizonis application. Currently, the application has a functional but minimal UI. Navigation is mainly driven by hidden keyboard shortcuts, and the Inspector lacks common UX patterns like keyboard saving and auto-focus.

### Scope
- **Navigation**: Add a visible navigation bar with breadcrumbs and a back button.
- **Search**: Implement a search feature to quickly find and jump to solar systems and celestial bodies.
- **Inspector**: Improve the editing experience with keyboard shortcuts, better focus management, and polished visuals.
- **Visual Feedback**: Add hover effects and selection highlights to the interactive maps.
- **Help**: Add a discoverable way to learn about keyboard shortcuts.
- **Accessibility**: Ensure components are usable with a keyboard and have proper labels.

### User Stories
- **As a user**, I want to see where I am in the stellar map so that I don't get lost.
- **As a user**, I want to search for a specific system by name so that I can find it quickly.
- **As a user**, I want to save my changes in the Inspector by pressing Enter, instead of having to click the Save button.
- **As a user**, I want to know what keyboard shortcuts are available so that I can use the app more efficiently.

# Technical Design

### Current State
- `StarMap` and `SolarSystemMap` are PIXI-based visualizations.
- `Inspector` is a sidebar for editing entity names and viewing properties.
- Navigation is handled by `Backspace` (to cluster) and `Escape` (clear selection) in `+layout.svelte`.

### Proposed Changes

#### 1. Navigation Component (`src/lib/components/Navigation.svelte`)
- Positioned at the top of the screen.
- **Breadcrumbs**: `Cluster` > `[System]` > `[Entity]`.
- **Search**: A text input with a dropdown for filtered system results.
- **Back Button**: Icon-only button to return to the cluster view.

#### 2. Inspector Enhancements (`src/lib/components/Inspector.svelte`)
- **Focus**: Use a Svelte action or `onMount` to focus the name input when the component is rendered.
- **Keybindings**: 
    - `Enter` -> `handleSave()`
    - `Escape` -> `selectedEntity.set(null)`
- **Visuals**: Use `lucide-svelte` icons consistently and improve Tailwind grouping.

#### 3. Help Overlay (`src/lib/components/HelpOverlay.svelte`)
- A simple backdrop-blur modal.
- Shows a list of keys and their actions.
- Toggled by a global `keydown` listener for `?`.

#### 4. Search Logic
- Search will operate on the `cluster` store.
- It will match system and orbital body names using a simple case-insensitive substring match.
- Selecting a result will:
    - For systems: set `viewMode = 'system'`, `activeSystemId = system.id`, and `selectedEntity = null`.
    - For bodies: set `viewMode = 'system'`, `activeSystemId = system.id`, and `selectedEntity = body`.

#### 5. Map Visual Feedback
- **Selection Highlight**: A persistent ring/glow around the `selectedEntity` in both `StarMap` and `SolarSystemMap`.
- **Hover Tooltips**: A small, floating label near the mouse showing the name of the system or body being hovered.
- **Cursor**: Change cursor to `pointer` when hovering over clickable objects.

#### 6. Accessibility & Keyboard Support
- **Navigation**: Keyboard focusable buttons with `aria-label`.
- **Search**: `/` to focus, arrow keys to navigate results, `Enter` to select, `Esc` to close.
- **Inspector**: `Tab` order optimization, auto-focus on name input, keyboard shortcuts for primary actions.
- **Help**: Modal with proper focus trapping and `Esc` to close.

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

### * Step 2: Add Search Functionality
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

### ✓ Step 7: UI Polish & Final Refinement
Final touches to the UI and documentation.

- Improve the initial loading screen in `src/routes/+page.svelte` with a more engaging animation.
- Ensure consistent color usage and typography across all UI components.
- Update `CHANGELOG.md` with all improvements and testing additions.