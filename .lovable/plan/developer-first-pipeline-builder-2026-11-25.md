# Developer-first pipeline builder

## What you will see

- A new public DriftWatch landing screen for indie developers, with direct access to the existing monitoring console.
- One-click voice and agentic stack presets, plus editable vendor, model, and tracking-mode controls.
- A responsive pipeline canvas that flows horizontally on desktop and vertically on narrow screens.
- A dark diff inspector with clearly labelled synthetic examples, copyable raw diffs, and impact explanations tailored to the selected stack layer.
- Existing colors, typography, dashboard views, and watch-running behavior remain intact.

## Implementation

1. Extend the typed pipeline data with display labels, vendor/model choices, and safe layer-specific example selection.
2. Build the landing screen, preset picker, pipeline canvas, component editor, and diff inspector as focused components.
3. Connect the landing screen and existing console in `src/routes/index.tsx`; keep the console reachable without signing in.
4. Update route metadata and add semantic terminal/diff tokens to `src/styles.css`.
5. Add focused tests for preset loading and stack editing behavior, then verify desktop and 573px mobile flows in the browser.

## Technical notes

- This step is frontend-only: it does not create customer accounts, persist a new stack, send alerts, or claim that sample diffs are real vendor announcements.  
We need to build backedn stack for accounts creation as well, it should have native google, microsoft, github auth
    

- The existing live watch engine remains unchanged and available through “Open console”.