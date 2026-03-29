# Slate

Slate is a fast, local-first, and highly intuitive browser-based drawing and sketching application. Built with a custom HTML5 Canvas rendering engine, it offers a seamless whiteboarding experience right in your browser.

<img width="1919" height="876" alt="image" src="https://github.com/user-attachments/assets/dd625597-ce90-430d-af74-169cad95220e" />

---

## Features

- **Rich Drawing Tools**: Freehand pencil (powered by `perfect-freehand` for pressure-sensitive, weight-based ink), rectangles, diamonds, circles, straight lines, arrows, text blocks, and an eraser.  
- **Customization**: Easily change stroke colors, stroke widths (thin, bold, extra), and line styles (solid, dashed, dotted).  
- **Infinite Canvas**: Smooth pan and zoom with proper world-to-screen coordinate transformations.  
- **Layer Management**: Bring shapes forward, send backward, and control rendering order.  
- **Grouping**: Group multiple shapes to move and scale them as a single unit.  
- **History System**: Undo and redo support (`Ctrl+Z` / `Ctrl+Y`).  
- **Local Persistence**: Auto-saves drawings to local storage.  
- **Import/Export**: Add images and export drawings as high-quality PNGs.  

---

## 🧠 Engine Architecture Highlights

- Built a **custom rendering engine** on top of the Canvas API (no external canvas libraries)  
- Uses a **camera model (x, y, zoom)** for infinite canvas navigation  
- Implements **Path2D caching** for efficient freehand rendering  
- Real-time **hit-testing system** for shape selection and interaction  
- Supports **multi-shape selection, resizing, and transformations**  
- Designed with hooks for **real-time collaboration (preview + commit model)**  

---

## Roadmap (Ongoing Improvements)

### Rendering & Performance
- [ ] 2-layer canvas architecture  
  -> Separate static (committed) and interaction (preview/selection) layers  
  -> Prevents full-canvas redraws; improves performance and scalability  

- [ ] Eliminate full-canvas re-renders  
  -> Current approach redraws entire scene per interaction  
  -> Leads to unnecessary GPU/CPU usage at scale  

- [ ] Dirty rectangle rendering  
  -> Redraw only affected regions instead of full canvas  
  -> Critical for large scenes and smooth interactions  

---

### Architecture Refactor
- [ ] Engine / Renderer / Controller separation  
  -> Improves modularity, testability, and scalability  
  -> Reduces coupling between logic and rendering  

- [ ] Decouple rendering from engine  
  -> Enables flexibility (e.g., WebGL/SVG backends)  
  -> Allows independent evolution of core logic  

---

### State & History
- [ ] Immutable or command-based state updates  
  -> Avoids mutation-related bugs in undo/redo and collaboration  
  -> Ensures predictable state transitions  

- [ ] Diff-based history system  
  -> Reduces memory overhead vs full snapshots  
  -> Improves performance for large scenes  

---

### Interaction & Hit Testing
- [ ] Spatial indexing (quadtree/grid)  
  -> Current O(n) hit-testing does not scale  
  -> Enables near constant-time interaction lookup  

- [ ] Optimized selection & drag  
  -> Prevents performance degradation with many objects  
  -> Ensures consistent interaction latency  

---

### Transform System
- [ ] Unified transform model (translate, scale, rotate)  
  -> Replaces manual position/size updates  
  -> Enables advanced transformations and cleaner logic  

- [ ] Transform-based resizing  
  -> Eliminates complex width/height mutations  
  -> Simplifies scaling and future feature additions  

---

### Asset & Text Handling
- [ ] Asset manager (image preload + cache)  
  -> Avoids side effects inside render loop  
  -> Ensures predictable and efficient rendering  

- [ ] Improved text rendering system  
  -> Fixes desync issues with zoom/pan  
  -> Aligns text behavior with canvas transformations  
---

## Tech Stack

- **Framework**: Next.js (React)  
- **Monorepo Tooling**: Turborepo  
- **Language**: TypeScript  
- **Styling**: Tailwind CSS  
- **Icons**: Lucide React  
- **Drawing Utilities**: perfect-freehand  
- **Core Engine**: Native HTML5 Canvas API (`SlateEngine`)  

---

## Folder Structure

```text
slate/
├── apps/
│   └── slate/                    # Main Next.js application
│       ├── public/               # Static assets & icons
│       └── app/
│           ├── src/
│           │   ├── canvas-engine/ # Core vanilla TS engine (engine.ts)
│           │   ├── components/    # React UI (Toolbar, Properties, Canvas)
│           │   └── config/        # Types, constants, tools
│           ├── layout.tsx
│           └── page.tsx
├── packages/
│   ├── @repo/ui/
│   ├── @repo/eslint-config/
│   └── @repo/typescript-config/
├── package.json
└── turbo.json
