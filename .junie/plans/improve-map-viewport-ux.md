---
sessionId: session-260516-160042-18lf
---

# Requirements

### Overview & Goals
The goal is to improve the user experience of the Star Map (cluster view) and Solar System Map by ensuring the content is always well-positioned and appropriately scaled.

### Requirements
- **Initial Visibility**: When opening the star map (cluster view), all stars must be visible.
- **Viewport Coverage**: The map content must always consume at least 60% of the viewport.
- **Constraint Enforcement**:
    - Prevent zooming out beyond the point where the map covers 60% of the viewport.
    - Prevent panning away from the map content, keeping it centered or within bounds.

# Technical Design

### Current Implementation
- `StarMap.svelte` and `SolarSystemMap.svelte` use `pixi-viewport` for rendering.
- Both components have an `updateZoomLimits` function that calculates a `minScale` based on the 60% rule.
- `StarMap` currently lacks initial zoom/centering logic.
- Panning prevention is currently implemented by pausing the `drag` plugin at the minimum zoom level, which is insufficient when zoomed in.

### Proposed Changes
- **StarMap Initial Fit**: Call `viewport.setZoom(minScale)` and `viewport.moveCenter(0,0)` when the cluster is first rendered.
- **Robust Panning Constraints**: 
    - Use `viewport.clamp({ direction: 'all', underflow: 'center', ... })` in both maps.
    - Define clamp bounds based on `maxClusterRadius` and `maxSystemRadius`.
    - This will center the content if it's smaller than the viewport (at min zoom) and prevent it from leaving the screen when larger (zoomed in).
- **Resize Handling**: Update the `resizeHandler` in both components to re-calculate zoom limits and clamp bounds, ensuring the 60% rule holds even after window resizing.
- **Testing Instrumentation**: Add `window.starMapDebug` to `StarMap.svelte` to match the pattern in `SolarSystemMap.svelte` and enable automated verification.

### File Structure
- `src/lib/components/StarMap.svelte`: Modify `onMount`, `renderCluster`, `updateZoomLimits`, and `resizeHandler`.
- `src/lib/components/SolarSystemMap.svelte`: Modify `updateZoomLimits` and `resizeHandler`.

# Testing

### Validation Approach
- **Manual Verification**: Resize the window and check if the map content scales appropriately to maintain 60% coverage. Attempt to pan away at different zoom levels.
- **Automated Tests**:
    - Add a test case for `StarMap` initial fit in `e2e-tests/test/specs/zoom-ux.e2e.js`.
    - Verify `minScale` values via debug instrumentation.

# Delivery Steps

### ✓ Step 1: Implement StarMap initial fit and robust constraints
The StarMap will correctly fit all stars within the viewport upon initial load and maintain strict zoom and pan limits.

- Add `viewport.setZoom(lastMinScale, true)` and `viewport.moveCenter(0, 0)` to `renderCluster` in `StarMap.svelte`.
- Implement `viewport.clamp()` in `updateZoomLimits` with `underflow: 'center'` to prevent panning away.
- Update `resizeHandler` to refresh zoom limits and scales on window resize.
- Expose `window.starMapDebug` for testing consistency.

### ✓ Step 2: Implement SolarSystemMap robust panning constraints
The SolarSystemMap will have improved panning constraints to prevent users from losing the system in the viewport.

- Replace manual `drag` pausing with `viewport.clamp()` using system boundaries and `underflow: 'center'`.
- Ensure `updateZoomLimits` is called during window resize to maintain the 60% viewport rule.
- Refine `maxSystemRadius` calculation to ensure it accurately covers all orbital regions and satellites.

### * Step 3: Verification and refinement
Verify that both maps satisfy the 60% viewport requirement and respond correctly to window resizes.

- Add or update E2E tests to verify `StarMap` initial fit.
- Test panning constraints at different zoom levels to ensure content stays in view.
- Verify that the 60% coverage is maintained across various viewport aspect ratios.