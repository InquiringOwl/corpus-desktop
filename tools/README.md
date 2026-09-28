# Rebuilding the app content

1. `zexport.py` — run with Blender's Python (`pip install bpy==4.2.0`) against Z-Anatomy's `Startup.blend`; exports each body system to `exp/*.pkl` (world-space meshes and nerve/vessel curves).
2. `build.py` — classifies structures, converts curves to tubes, decimates, rigs 22 skeletal segments (joint pivots from bone contact regions), computes skin weights and muscle anchors, and writes `out/*.bin` + `out/manifest.json`. Needs `numpy scipy trimesh fast-simplification`.
3. `src/` — the app source: `frag.html` (layout and styles), `corpus.js` (3D engine and UI), `histo.js` (procedural histology slides).
4. `mkdesk.py` — assembles `app/index.html` and copies data for the desktop build (paths inside are from the original build machine; adjust them).
