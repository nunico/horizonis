---
sessionId: session-260516-115353-neta
---

# Requirements

### Overview & Goals
Improve the Zoom UX in the Solar System view to provide better visibility of all objects, ensure a consistent sense of scale through logarithmic mapping, and prevent visual overlaps.

### Scope
- **In Scope**:
    - Logarithmic scaling for orbital distances in `SolarSystemMap`.
    - Logarithmic scaling for celestial body radii (stars, planets, moons).
    - Initial viewport fitting to show the entire system on entry.
    - Updated zoom limits (80% viewport fill for focused objects).
    - Overlap prevention logic updates.
- **Out of Scope**:
    - Changes to the Cluster view (StarMap) unless necessary for consistency.
    - Changes to the physical generation of systems (Rust backend).

### Functional Requirements
- **Initial Visibility**: On entering a solar system view, all stars, orbital objects, regions, and satellites must be visible.
- **Logarithmic Scale**: Both orbital distances and body sizes must use logarithmic scaling to balance relative size with visibility.
- **Overlap Avoidance**: No two objects (or an object and its orbit) should overlap visually.
- **Zoom Limit**: Zooming into a body should be capped when it fills 80% of the viewport width or height.
- **Satellite Visibility**: Satellites of a star should be visible when viewing the system.

# Technical Design

### Current Implementation
- Orbital scaling supports `linear` and `log`, but defaults to `linear`.
- Body radii use a square-root formula: `2 + Math.sqrt(radius_km) / 20`.
- Zoom limits are dynamic but include satellite systems in the "fill viewport" calculation.
- Initial view does not explicitly fit the system.

### Proposed Changes
#### 1. Logarithmic Scaling Formulae
- **Orbital Distance (AU to Pixels)**:
    Update `src/lib/pixi/scaling.ts` to:
    `Math.log10(au * 100 + 1) * config.auToPixels / 2`
    This provides better spread for small `au` values (satellites) while squashing large distances.
- **Body Radius (km to Pixels)**:
    Implement `getVisualRadius(radius_km)` using:
    `5 + Math.log10(radius_km) * 4`
    This ensures small moons are visible and large stars don't dominate the screen too much.

#### 2. Initial View Fitting
In `SolarSystemMap.svelte`, during `renderSystem`:
- Calculate `minScale` (already done in `updateZoomLimits`).
- Set `viewport.scale.set(minScale)`.
- Center viewport on `(0, 0)`.

#### 3. Zoom Constraints
In `updateZoomLimits`:
- `maxScale = (minViewportSize * 0.8) / (2 * focusedObject.baseRadius)`.
- This ensures the object body itself (ignoring satellites) takes up 80% of the screen at max zoom.

#### 4. Overlap Prevention
In `updateScales`:
- Maintain the logic that clamps object scale to `0.45 * distanceToNearestOrbit`.
- Since logarithmic scaling changes distances, ensure this ratio still prevents overlaps effectively.

### File Structure
- `src/lib/pixi/scaling.ts`: Update scaling formulas.
- `src/lib/components/SolarSystemMap.svelte`: Update rendering, zoom, and fitting logic.
- `src/lib/pixi/scaling.test.ts`: Update tests to match new formulas.
- `CHANGELOG.md`: Document changes.

# Testing

### Validation Approach
- **Visual Inspection**: Verify that the system fits the screen on entry.
- **Zoom Testing**: Verify that zooming into a planet stops at 80% viewport fill.
- **Overlap Check**: Zoom out and ensure bodies scale down before overlapping with their orbits or satellites.
- **Automated Tests**: Run existing Vitest tests to ensure no regressions in scaling logic.

### Key Scenarios
- Enter a multi-star system: Both stars and their planets should be visible.
- Zoom into a moon: The moon should fill 80% of the screen at max zoom.
- Toggle between Linear and Log modes: Verify the transition and that Log mode is now the default.

# Delivery Steps

### ✓ Step 1: Implement logarithmic scaling for orbits and celestial bodies
Update `src/lib/pixi/scaling.ts` and `src/lib/components/SolarSystemMap.svelte` to implement logarithmic scaling for both orbital distances and body radii.
- Change default `ScaleMode` to `log`.
- Update `auToPixels` log formula to handle small satellite orbits effectively.
- Replace square-root based `getVisualRadius` with a logarithmic formula.
- Unify star and orbital body radius calculations under the logarithmic model.
- Update `scaling.test.ts` to reflect the new formula.

### ✓ Step 2: Implement initial view fitting and 80% zoom limit
Modify `SolarSystemMap.svelte` to ensure the entire system is visible when entering the view and refine zoom constraints.
- Call `viewport.setZoom` with the calculated minimum scale in `renderSystem` to fit the whole system on initial load.
- Update `updateZoomLimits` to calculate `maxScale` such that the focused object (excluding its satellites) occupies at most 80% of the viewport.
- Ensure `updateFocus` and `updateZoomLimits` work correctly with the new scaling.

### ✓ Step 3: Refine overlap prevention and satellite visibility
Refine the overlap prevention and visibility logic in `SolarSystemMap.svelte`.
- Update `updateScales` to ensure celestial bodies do not overlap with their own orbits or their satellites' orbits under the new logarithmic model.
- Adjust satellite visibility thresholds to ensure satellites are visible when the system is viewed as a whole, as per requirements.
- Verify that labels stay readable and correctly positioned.

### ✓ Step 4: Final validation and documentation
Perform a final check of the UX, run existing tests, and update the changelog.
- Run `deno task test` (or equivalent) to ensure no regressions.
- Verify the Zoom UX manually or via existing E2E tests if possible.
- Update `CHANGELOG.md` with the new improvements.

### ✓ Step 5: Further reduce maximum allowed satellite-to-parent radius ratio
Refine the hierarchical size constraint to make the size difference between satellites and parents even more significant.
- Update `getClampedScale` in `src/lib/pixi/scaling.ts` to reduce the ratio from `0.5` to `0.4`.
- Update unit tests in `src/lib/pixi/scaling.test.ts` to reflect this change.
- Verify with `deno task test`.
- Update `CHANGELOG.md`.