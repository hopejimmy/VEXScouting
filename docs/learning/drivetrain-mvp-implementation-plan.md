# Drive Train MVP Implementation Plan

## 1. MVP outcome

Ship one locally testable bilingual Drive Train lesson that lets a learner:

1. identify the required real VEX IQ parts;
2. inspect and rotate an accurate four-wheel drive-train model;
3. follow ten animated assembly steps;
4. read what to do, why the part is used, and how to check the result;
5. complete a low-speed test and save lesson completion in the existing Learn module.

This MVP validates the learning experience and production workflow. It does not attempt to build a general CAD editor, automate all Cadasio authoring, or launch a paid course.

## 2. Technical decision

### CAD authoring

Use FreeCAD for the MVP and export a named STEP assembly.

Reasons:

- no subscription or commercial-use restriction from the CAD application;
- imports the official VEX STEP parts;
- keeps the experiment independent of an Onshape commercial subscription;
- can later be partially automated through FreeCAD's Python interface if repeated production justifies it.

Onshape remains the upgrade option when browser collaboration and faster assembly authoring become more valuable than the subscription cost. A custom Onshape MCP is explicitly out of MVP scope.

### Interactive instructions

Use one Cadasio Personal project with no more than ten steps.

- Cadasio owns 3D rendering, camera transitions, part motion, highlighting, and restore-view controls.
- Each step contains its teaching explanation and completion check in a Cadasio Step Panel or popup.
- The project uses Cadasio's supported embed workflow.
- The first release is a private/local product test, not the paid commercial launch.

Cadasio currently exposes no documented viewer callback API for synchronising its active step with our Next.js state. The MVP therefore does not duplicate a live step selector outside the viewer.

### Website integration

The existing Next.js Learn module owns:

- Chinese/English lesson introduction;
- objectives and mission;
- real-part checklist;
- responsive Cadasio embed shell;
- physical build and safety notice;
- final challenge and learner reflection;
- completion state through `useLessonProgress`.

Cadasio owns the ten internal build steps. Website progress is recorded at three reliable checkpoints instead of pretending to know the active iframe step:

1. parts ready;
2. build completed;
3. drive test completed.

## 3. Asset pipeline

```text
licensed VEX IQ STEP parts
          ↓
FreeCAD named assembly + physical verification
          ↓
drive-train.fcstd + drive-train.step + BOM.csv
          ↓
Cadasio ten-step interactive project
          ↓
published embed URL
          ↓
Next.js Drive Train lesson
```

Every imported part receives a stable internal name such as:

```text
frame.left.rail.front
frame.right.rail.front
drive.left.motor
drive.right.motor
drive.left.wheel
support.front.left.omni
power.brain
power.battery
```

Stable names are required before animation authoring so a CAD update does not make the step plan impossible to maintain.

## 4. Work packages

### WP1 — Rights and source manifest

Deliverables:

- `asset-manifest.yml` with source URL, part number, download date, rights holder, and permitted use;
- copy of written VEX commercial permission when received;
- explicit `prototype-only` status until permission is resolved.

Exit condition: every CAD input has a recorded source and no scraped Cadasio mesh is used.

### WP2 — Accurate CAD assembly

Deliverables:

- `drive-train.fcstd`;
- `drive-train.step`;
- `drive-train-bom.csv`;
- final-view screenshots for front, side, top, and bottom;
- physical-fit notes for hidden holes, shafts, spacers, and cable routing.

Validation:

- four wheels share a valid ground plane;
- wheel and motor axes are coaxial where required;
- no shaft, collar, cable, or wheel intersects a fixed part;
- left and right rails are parallel;
- all rotating parts have visible clearance;
- CAD BOM matches a physical kit layout.

Exit condition: an adult can reproduce the assembly physically from the model and identify no impossible connection.

### WP3 — Ten Cadasio steps

For each step, author:

- recommended camera;
- incoming part positions and motion;
- new-part highlight;
- assembly direction arrows;
- Chinese and English action text;
- why the part is used;
- completion check;
- common mistake or safety note.

Use the ten-step curriculum in `drivetrain-pilot.md` as the content source.

Exit condition: a new viewer can complete the full sequence without relying on a hidden connection or guessing a hole position.

### WP4 — Next.js lesson integration

Add:

- `src/data/drivetrain.ts` for bilingual lesson metadata and checkpoints;
- `src/components/learning/CadasioLessonViewer.tsx` for responsive embedding, loading, failure, full-screen, and external-open fallback;
- `src/app/learn/courses/drivetrain/page.tsx` for the lesson;
- a course card and progression link in the Learn landing page;
- an environment/config value for the published Cadasio URL, with no URL hard-coded into UI components.

The embed component must:

- preserve a useful aspect ratio on phone, tablet, and desktop;
- show an understandable fallback if third-party content is blocked;
- avoid claiming step-level progress it cannot observe;
- provide an accessible title and keyboard-reachable fallback link;
- avoid sending child identity data to Cadasio.

Exit condition: the lesson works locally in both languages and survives reload with checkpoint progress intact.

### WP5 — QA and learner test

Technical checks:

- production build, lint, and TypeScript pass;
- no console errors on lesson load;
- desktop and mobile layouts remain usable;
- Cadasio failure produces a fallback instead of an empty frame;
- language toggle does not reset lesson progress;
- no third-party keys or credentials are committed.

Learning checks with at least one first-time builder:

- can identify ordinary and omni wheels;
- can explain why the motors are independently controlled;
- can finish without asking which hidden hole to use;
- can perform the lifted-wheel low-speed test safely;
- can diagnose at least one intentional error such as reversed motor direction.

Exit condition: the learner completes the build and the observer records all hesitation points for revision.

## 5. Delivery sequence

1. Build and physically verify only the left drive module.
2. Import that partial assembly into Cadasio and create steps 1–3.
3. Embed the partial project in a temporary local lesson route.
4. Test rotation, step panels, mobile layout, and loading performance.
5. If the partial test passes, finish the mirrored side and full chassis.
6. Complete all ten Cadasio steps.
7. Connect final checkpoints, course navigation, and bilingual content.
8. Run technical QA and a first-time learner test.

This sequence is deliberately gated after step 3 so a Cadasio or import limitation is discovered before the complete model is authored.

## 6. MVP acceptance criteria

The MVP is successful only when all are true:

- the 3D model matches a physically buildable Drive Train;
- each connection is visible from at least one saved camera;
- the ten-step viewer loads and runs on desktop and mobile;
- every step includes action, reason, and check content;
- Chinese and English learners can use the lesson;
- completion persists in the existing browser progress system;
- no unsupported Cadasio internal API is used;
- asset sources and prototype licensing status are visible to the project team;
- the first-time learner test does not reveal an impossible or ambiguous build step.

## 7. Upgrade decision after the MVP

Continue with Cadasio Professional when the learner experience is strong and manual authoring time is acceptable.

Investigate a custom Three.js step player when any two of these become true:

- more than ten paid lessons are planned;
- Cadasio authoring becomes the production bottleneck;
- the website must know and control the exact active 3D step;
- course analytics require per-step events;
- bilingual content must switch instantly inside the viewer;
- an automated CAD-to-course pipeline becomes commercially important.

Only at that point should we evaluate an Onshape REST wrapper or MCP and a code-owned step JSON format.

## 8. Current blockers

The implementation can begin locally, but public commercial launch remains blocked by:

1. written permission for commercial use of applicable VEX CAD/content assets;
2. access to a physical VEX IQ kit for final fit and learner validation;
3. a Cadasio account and published project URL for the final embed.

No user password or API secret should be shared in chat or committed to the repository.
