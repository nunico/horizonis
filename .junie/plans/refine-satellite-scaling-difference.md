# Requirements

### Overview & Goals

Increase the visual distinction between satellites (moons) and their parent objects (planets/stars) to improve hierarchical clarity in the Solar System view.

### Scope

- **In Scope**:
  - Adjustment of `getVisualRadius` formula to increase size spread.
  - Adjustment of `getClampedScale` to enforce a stricter size ratio between parents and children.
  - Update unit tests to reflect new scaling constants.
- **Out of Scope**:
  - Changes to orbital distances.
  - Changes to labels or other UI elements.

### Functional Requirements

- Satellites must be significantly smaller than their parent objects, especially when both are clamped to minimum visual sizes.
- Larger celestial bodies (stars, gas giants) should still be distinguishable from smaller ones (terrestrial planets, moons) at a glance.

# Technical Design

### Proposed Changes

#### 1. Visual Radius Formula

Update `src/lib/pixi/scaling.ts`:
Modify `getVisualRadius` from `5 + Math.log10(...) * 4` to `4 + Math.log10(...) * 6`.
This increases the slope of the logarithmic scaling, making physical size differences translate to larger visual radius differences.

#### 2. Parent-Child Size Constraint

Update `src/lib/pixi/scaling.ts`:
Modify the clamping factor in `getClampedScale` from `0.8` to `0.5`.
This ensures that even when zoomed out, a satellite will be at most half the visual radius of its parent.

### File Structure

- `src/lib/pixi/scaling.ts`: Core scaling logic.
- `src/lib/pixi/scaling.test.ts`: Unit tests.
- `CHANGELOG.md`: Documentation.

# Testing

### Validation Approach

- **Automated Tests**: Run `deno task test` to ensure the new formulas work as expected and the hierarchy constraint is correctly applied.
- **Visual Verification**: (Implicitly checked by formula correctness) Ensure Moon/Earth and Sun/Planet ratios are more pronounced.

# Delivery Steps

### ✓ Step 1: Update scaling formulas and constraints

Modify `src/lib/pixi/scaling.ts` to use more aggressive scaling factors for better visual hierarchy.

### ✓ Step 2: Update unit tests and verify

Update `src/lib/pixi/scaling.test.ts` with the new expected values and run the test suite.

### ✓ Step 3: Document changes

Update `CHANGELOG.md` with the refinement.
