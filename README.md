# Slate

Slate is a fast, local-first, and highly intuitive browser-based drawing and sketching application. Built with a custom HTML5 Canvas rendering engine, it offers a seamless whiteboarding experience right in your browser.

![Slate Preview](./apps/slate/public/icon.svg)

## Features

*   **Rich Drawing Tools**: Freehand pencil (powered by `perfect-freehand` for pressure-sensitive, weight-based ink), rectangles, diamonds, circles, straight lines, arrows, text blocks, and an eraser.
*   **Customization**: Easily change stroke colors, stroke widths (thin, bold, extra), and line styles (solid, dashed, dotted).
*   **Infinite Canvas**: Pan around the canvas and zoom in/out to focus on specific details.
*   **Layer Management**: Bring shapes to the front or send them to the back.
*   **Grouping**: Group multiple shapes together to move, scale, and manage them as a single unit.
*   **History**: Full Undo and Redo support (`Ctrl+Z` / `Ctrl+Y`).
*   **Local Persistence**: Your drawings are automatically saved to your browser's local storage so you never lose your work.
*   **Import/Export**: Add images to your canvas or export your entire drawing as a high-quality PNG.

## Tech Stack

*   **Framework**: [Next.js](https://nextjs.org/) (React)
*   **Monorepo Tooling**: [Turborepo](https://turbo.build/repo)
*   **Language**: [TypeScript](https://www.typescriptlang.org/)
*   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
*   **Icons**: [Lucide React](https://lucide.dev/)
*   **Drawing Utilities**: [perfect-freehand](https://github.com/steveruizok/perfect-freehand) for smooth, variable-width freehand strokes.
*   **Core Engine**: Native HTML5 Canvas API (`SlateEngine`)

## Folder Structure

This project is structured as a monorepo using Turborepo.

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
│           ├── layout.tsx         # Next.js app layout
│           └── page.tsx           # Main page entry point
├── packages/
│   ├── @repo/ui/                 # Shared React components library
│   ├── @repo/eslint-config/      # Shared ESLint configuration
│   └── @repo/typescript-config/  # Shared tsconfig settings
├── package.json
└── turbo.json                    # Workspace task runner config
```

## Project Setup

### Prerequisites

You need Node.js installed on your machine.

### Installation

Clone the repository and install the dependencies from the root directory:

```bash
npm install
```

### Running Locally

To start the development server, run:

```bash
npm run dev
```

This will run the Next.js app in development mode. Open [http://localhost:3000](http://localhost:3000) in your browser to start drawing.

### Build for Production

To build all apps and packages for production:

```bash
npm run build
```

