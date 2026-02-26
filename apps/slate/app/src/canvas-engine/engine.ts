import { DiamondShape, Shape, ShapeType, ToolType } from "../config/types";
import { generateId } from "../config/utils";
import { getStroke } from "perfect-freehand";

export class SlateEngine {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private shapes: Shape[] = [];
    private history: Shape[][] = [];
    private redoStack: Shape[][] = [];
    private dpr: number = 1;
    private pathCache = new WeakMap<Shape, Path2D>();

    public onZoomChange?: (zoom: number) => void;
    public onSelectionChange?: (shape: Shape | null) => void;
    public onToolChange?: (tool: ToolType) => void;

    private isDrawing: boolean = false;
    private isDragging: boolean = false;
    private isPanning: boolean = false;
    private isResizing: boolean = false;
    private resizeHandle: string | null = null;
    private resizeOrigShape: Shape | null = null;
    private panStart = { x: 0, y: 0 };
    private dragStartPos = { x: 0, y: 0 };

    private currentShape: Shape | null = null;
    private selectedShape: Shape | null = null;

    private selectedTool: ToolType = 'pencil';
    private strokeColor: string = "#000000";
    private strokeWidth: number = 2;
    private strokeStyle: 'solid' | 'dashed' | 'dotted' = 'solid';

    private camera = { x: 0, y: 0, z: 1 }; // x, y : offset z : zoom level

    public setZoom(deltaZ: number) {
        let newZoom = this.camera.z + deltaZ;
        newZoom = Math.max(0.1, Math.min(newZoom, 5));

        // Calculate center of screen
        const rect = this.canvas.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        // Convert screen center to world coordinates
        const worldX = (centerX - this.camera.x) / this.camera.z;
        const worldY = (centerY - this.camera.y) / this.camera.z;

        this.camera.z = newZoom;

        // Adjust pan so the center stays fixed
        this.camera.x = centerX - worldX * newZoom;
        this.camera.y = centerY - worldY * newZoom;

        if (this.onZoomChange) this.onZoomChange(Math.round(this.camera.z * 100));
        this.render();
    }

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        const context = canvas.getContext("2d", { alpha: false });
        if (!context) throw new Error("Could not get canvas context");
        this.ctx = context;

        this.initDPI();
        this.attachListeners();
        this.loadFromLocalStorage();
    }

    private initDPI() {
        this.dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.getBoundingClientRect();

        this.canvas.style.width = `${rect.width}px`;
        this.canvas.style.height = `${rect.height}px`;

        this.canvas.width = rect.width * this.dpr;
        this.canvas.height = rect.height * this.dpr;

        this.ctx.scale(this.dpr, this.dpr);
    }

    public setTool(tool: ToolType) {
        this.selectedTool = tool;
        // Update cursor
        if (tool === 'hand') {
            this.canvas.style.cursor = 'grab';
        } else if (tool === 'eraser') {
            this.canvas.style.cursor = 'crosshair';
        } else {
            this.canvas.style.cursor = 'default';
        }
        if (tool !== 'select') {
            this.selectedShape = null;
            if (this.onSelectionChange) this.onSelectionChange(null);
            this.render();
        }
    }

    public setColor(color: string) {
        this.strokeColor = color;
        if (this.selectedShape && this.selectedTool === 'select') {
            // Update selected shape color
            this.history.push([...this.shapes]);
            this.selectedShape.strokeColor = color;
            this.saveToLocalStorage();
            this.render();
        }
    }

    public setWidth(width: number) {
        this.strokeWidth = width;
        if (this.selectedShape && this.selectedTool === 'select') {
            this.history.push([...this.shapes]);
            this.selectedShape.strokeWidth = width;
            this.saveToLocalStorage();
            this.render();
        }
    }

    public setStrokeStyle(style: 'solid' | 'dashed' | 'dotted') {
        this.strokeStyle = style;
        if (this.selectedShape && this.selectedTool === 'select') {
            this.history.push([...this.shapes]);
            this.selectedShape.strokeStyle = style;
            this.saveToLocalStorage();
            this.render();
        }
    }

    private attachListeners() {
        this.canvas.addEventListener("mousedown", this.handleMouseDown.bind(this));
        window.addEventListener("mousemove", this.handleMouseMove.bind(this));
        window.addEventListener("mouseup", this.handleMouseUp.bind(this));
        this.canvas.addEventListener("wheel", this.handleWheel.bind(this), { passive: false });

        //delete key listener
        window.addEventListener("keydown", (e) => {
            if ((e.key === "Delete" || e.key === "Backspace") && this.selectedShape) {
                this.deleteSelectedShape();
            }
        });
    }

    private getMouseCoordinates(e: MouseEvent) {
        const rect = this.canvas.getBoundingClientRect();

        //get mouse position on screen
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;

        return {
            x: (screenX - this.camera.x) / this.camera.z,
            y: (screenY - this.camera.y) / this.camera.z,
        };

    }

    private handleMouseDown(e: MouseEvent) {
        const { x, y } = this.getMouseCoordinates(e);

        // Hand tool: start panning
        if (this.selectedTool === 'hand') {
            this.isPanning = true;
            this.panStart = { x: e.clientX - this.camera.x, y: e.clientY - this.camera.y };
            this.canvas.style.cursor = 'grabbing';
            return;
        }

        // Eraser tool: erase shape under cursor immediately
        if (this.selectedTool === 'eraser') {
            const shape = this.getShapeAtPosition(x, y);
            if (shape) {
                this.history.push([...this.shapes]);
                this.shapes = this.shapes.filter(s => s.id !== shape.id);
                this.redoStack = [];
                this.saveToLocalStorage();
                this.render();
            }
            this.isDrawing = true; // allow drag-erase
            return;
        }

        if (this.selectedTool === 'select') {
            const shape = this.getShapeAtPosition(x, y);

            if (this.selectedShape) {
                const handle = this.hitTestHandle(this.selectedShape, x, y);
                if (handle) {
                    this.isResizing = true;
                    this.resizeHandle = handle;
                    this.resizeOrigShape = JSON.parse(JSON.stringify(this.selectedShape));
                    this.history.push([...this.shapes]);
                    return;
                }
            }

            if (shape && shape.id === this.selectedShape?.id) {
                this.isDragging = true;
                this.dragStartPos = { x, y };
                this.history.push([...this.shapes]);
            } else {
                this.selectedShape = shape;
                if (this.onSelectionChange) this.onSelectionChange(shape);
            }

            this.render();
            return;
        }

        //smart click-to-select: if clicking an existing shape while in any drawing tool,
        //auto-switch to select and show its handles instead of starting a new draw.
        const hitShape = this.getShapeAtPosition(x, y);
        if (hitShape) {
            this.selectedTool = 'select';
            this.selectedShape = hitShape;
            if (this.onSelectionChange) this.onSelectionChange(hitShape);
            if (this.onToolChange) this.onToolChange('select');
            this.canvas.style.cursor = 'default';
            this.render();
            return;
        }

        this.isDrawing = true;
        const id = generateId();

        const base = { id, x, y, strokeColor: this.strokeColor, strokeWidth: this.strokeWidth, strokeStyle: this.strokeStyle };

        switch (this.selectedTool) {
            case "rect":
                this.currentShape = { ...base, type: 'rect', width: 0, height: 0 };
                break;
            case "diamond":
                this.currentShape = { ...base, type: 'diamond', width: 0, height: 0 };
                break;
            case "circle":
                this.currentShape = { ...base, type: 'circle', radius: 0 };
                break;
            case "line":
            case "arrow":
                this.currentShape = { ...base, type: this.selectedTool, endX: x, endY: y };
                break;
            case "pencil":
                this.currentShape = { ...base, type: 'pencil', points: [{ x, y }] };
                break;
        }
    }

    private handleMouseMove(e: MouseEvent) {
        const { x, y } = this.getMouseCoordinates(e);

        // Hand tool panning
        if (this.isPanning) {
            this.camera.x = e.clientX - this.panStart.x;
            this.camera.y = e.clientY - this.panStart.y;
            this.render();
            return;
        }

        // Drag-erase while holding mouse button with eraser
        if (this.selectedTool === 'eraser' && this.isDrawing) {
            const shape = this.getShapeAtPosition(x, y);
            if (shape) {
                this.history.push([...this.shapes]);
                this.shapes = this.shapes.filter(s => s.id !== shape.id);
                this.redoStack = [];
                this.saveToLocalStorage();
                this.render();
            }
            return;
        }

        //resize shape via handle
        if (this.isResizing && this.selectedShape) {
            this.applyResize(x, y);
            this.render();
            return;
        }

        if (this.isDragging && this.selectedShape) {
            const dx = x - this.dragStartPos.x;
            const dy = y - this.dragStartPos.y;

            switch (this.selectedShape.type) {
                case 'rect':
                case 'diamond':
                case 'circle':
                case 'line':
                case 'arrow':
                    this.selectedShape.x += dx;
                    this.selectedShape.y += dy;
                    if ('endX' in this.selectedShape) {
                        this.selectedShape.endX += dx;
                        this.selectedShape.endY += dy;
                    }
                    break;
                case 'pencil':
                    this.selectedShape.x += dx;
                    this.selectedShape.y += dy;
                    this.selectedShape.points = this.selectedShape.points.map(p => ({
                        x: p.x + dx,
                        y: p.y + dy
                    }));
                    // Refresh cache after move
                    this.pathCache.set(this.selectedShape, this.getSvgPathFromStroke(this.selectedShape.points));
                    break;
            }

            this.dragStartPos = { x, y };
            this.render();
            return;
        }

        if (this.selectedTool === 'select' && this.selectedShape) {
            const handle = this.hitTestHandle(this.selectedShape, x, y);
            if (handle) {
                const cursorMap: Record<string, string> = {
                    tl: 'nwse-resize', br: 'nwse-resize',
                    tr: 'nesw-resize', bl: 'nesw-resize',
                    t: 'ns-resize', b: 'ns-resize',
                    l: 'ew-resize', r: 'ew-resize',
                    start: 'crosshair', end: 'crosshair',
                    n: 'ns-resize', s: 'ns-resize',
                    e: 'ew-resize', w: 'ew-resize',
                };
                this.canvas.style.cursor = cursorMap[handle] || 'crosshair';
            } else {
                this.canvas.style.cursor = 'default';
            }
        }

        if (!this.isDrawing || !this.currentShape) return;

        switch (this.currentShape.type) {
            case "rect":
            case "diamond":
                this.currentShape.width = x - this.currentShape.x;
                this.currentShape.height = y - this.currentShape.y;
                break;
            case "circle":
                const dxCircle = x - this.currentShape.x;
                const dyCircle = y - this.currentShape.y;
                this.currentShape.radius = Math.sqrt(dxCircle * dxCircle + dyCircle * dyCircle);
                break;
            case "line":
            case "arrow":
                this.currentShape.endX = x;
                this.currentShape.endY = y;
                break;
            case "pencil":
                this.currentShape.points.push({ x, y });
                // Update path cache while drawing
                this.pathCache.set(this.currentShape, this.getSvgPathFromStroke(this.currentShape.points));
                break;
        }
        this.render();
    }

    private handleMouseUp() {
        //stop panning
        if (this.isPanning) {
            this.isPanning = false;
            this.canvas.style.cursor = 'grab';
            return;
        }

        //stop resizing
        if (this.isResizing) {
            this.isResizing = false;
            this.resizeHandle = null;
            this.resizeOrigShape = null;
            this.saveToLocalStorage();
            this.render();
            return;
        }

        if (this.currentShape) {
            const drawn = this.currentShape;
            this.history.push([...this.shapes]);
            this.shapes.push(drawn);
            this.redoStack = [];

            //auto-select the just-drawn shape
            this.selectedShape = drawn;
            if (this.onSelectionChange) this.onSelectionChange(drawn);
            this.selectedTool = 'select';
            if (this.onToolChange) this.onToolChange('select');
            this.canvas.style.cursor = 'default';

            this.saveToLocalStorage();
        }

        if (this.isDragging) {
            this.saveToLocalStorage();
        }

        this.isDrawing = false;
        this.isDragging = false;
        this.currentShape = null;
        this.render();
    }

    private deleteSelectedShape() {
        if (!this.selectedShape) return;

        //save history
        this.history.push([...this.shapes]);

        this.shapes = this.shapes.filter(s => s.id !== this.selectedShape?.id);
        this.selectedShape = null;
        this.redoStack = [];

        this.saveToLocalStorage();
        this.render();
    }


    private distanceToSegment(x: number, y: number, x1: number, y1: number, x2: number, y2: number) {
        const A = x - x1;
        const B = y - y1;
        const C = x2 - x1;
        const D = y2 - y1;

        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        let param = -1;

        if (lenSq !== 0) param = dot / lenSq;

        let xx, yy;

        if (param < 0) {
            xx = x1;
            yy = y1;
        } else if (param > 1) {
            xx = x2;
            yy = y2;
        } else {
            xx = x1 + param * C;
            yy = y1 + param * D;
        }

        const dx = x - xx;
        const dy = y - yy;
        return Math.sqrt(dx * dx + dy * dy);
    }

    private getShapeAtPosition(x: number, y: number): Shape | null {
        const HIT_THRESHOLD = 10; //px

        for (let i = this.shapes.length - 1; i >= 0; i--) {
            const shape = this.shapes[i];
            if (!shape) continue;

            switch (shape.type) {
                case 'rect': {
                    const minX = Math.min(shape.x, shape.x + shape.width);
                    const maxX = Math.max(shape.x, shape.x + shape.width);
                    const minY = Math.min(shape.y, shape.y + shape.height);
                    const maxY = Math.max(shape.y, shape.y + shape.height);
                    if (x >= minX && x <= maxX && y >= minY && y <= maxY) return shape;
                    break;
                }
                case 'diamond': {
                    // Hit-test diamond as bounding box (approximate)
                    const cx = shape.x + shape.width / 2;
                    const cy = shape.y + shape.height / 2;
                    const hw = Math.abs(shape.width) / 2;
                    const hh = Math.abs(shape.height) / 2;
                    if (hw > 0 && hh > 0) {
                        const nx = Math.abs(x - cx) / hw;
                        const ny = Math.abs(y - cy) / hh;
                        if (nx + ny <= 1) return shape;
                    }
                    break;
                }
                case 'circle': {
                    const dx = x - shape.x;
                    const dy = y - shape.y;
                    if (Math.sqrt(dx * dx + dy * dy) <= shape.radius) return shape;
                    break;
                }
                case 'line':
                case 'arrow': {
                    const dist = this.distanceToSegment(x, y, shape.x, shape.y, shape.endX, shape.endY);
                    if (dist <= HIT_THRESHOLD) return shape;
                    break;
                }
                case 'pencil': {
                    for (let j = 0; j < shape.points.length - 1; j++) {
                        const p1 = shape.points[j]!;
                        const p2 = shape.points[j + 1]!;
                        const dist = this.distanceToSegment(x, y, p1.x, p1.y, p2.x, p2.y);
                        if (dist <= HIT_THRESHOLD) return shape;
                    }
                    break;
                }
            }
        }
        return null;
    }

    public render(): void {
        this.ctx.resetTransform();

        // 1. Clear the entire canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // 2. Draw background
        this.ctx.scale(this.dpr, this.dpr);
        this.ctx.fillStyle = "#ffffff";
        this.ctx.fillRect(0, 0, this.canvas.width / this.dpr, this.canvas.height / this.dpr);

        // 3. Setup transformations (zoom/pan) with save/restore
        this.ctx.save();
        this.ctx.translate(this.camera.x, this.camera.y);
        this.ctx.scale(this.camera.z, this.camera.z);

        // 4. Redraw all committed shapes
        for (const shape of this.shapes) {
            this.draw(shape);
        }

        // 5. Draw the in-progress shape being dragged (zero-lag preview)
        if (this.currentShape) {
            this.draw(this.currentShape);
        }

        // 6. Draw selection highlight on top of everything
        if (this.selectedTool === 'select' && this.selectedShape) {
            this.drawSelectionHighlight(this.selectedShape);
        }

        this.ctx.restore();
    }

    private drawSelectionHighlight(shape: Shape): void {
        this.ctx.save();
        const pz = this.camera.z;

        //bounding box
        this.ctx.strokeStyle = "#93c5fd";
        this.ctx.lineWidth = 1.5 / pz;
        this.ctx.setLineDash([5 / pz, 4 / pz]);

        const padding = 8;
        let bx = 0, by = 0, bw = 0, bh = 0;

        switch (shape.type) {
            case 'rect':
                bx = Math.min(shape.x, shape.x + shape.width) - padding;
                by = Math.min(shape.y, shape.y + shape.height) - padding;
                bw = Math.abs(shape.width) + padding * 2;
                bh = Math.abs(shape.height) + padding * 2;
                break;
            case 'diamond':
                bx = Math.min(shape.x, shape.x + shape.width) - padding;
                by = Math.min(shape.y, shape.y + shape.height) - padding;
                bw = Math.abs(shape.width) + padding * 2;
                bh = Math.abs(shape.height) + padding * 2;
                break;
            case 'circle':
                bx = shape.x - shape.radius - padding;
                by = shape.y - shape.radius - padding;
                bw = shape.radius * 2 + padding * 2;
                bh = shape.radius * 2 + padding * 2;
                break;
            case 'line':
            case 'arrow':
                bx = Math.min(shape.x, shape.endX) - padding;
                by = Math.min(shape.y, shape.endY) - padding;
                bw = Math.abs(shape.endX - shape.x) + padding * 2;
                bh = Math.abs(shape.endY - shape.y) + padding * 2;
                break;
            case 'pencil':
                const xs = shape.points.map(p => p.x);
                const ys = shape.points.map(p => p.y);
                bx = Math.min(...xs) - padding;
                by = Math.min(...ys) - padding;
                bw = Math.max(...xs) - bx + padding;
                bh = Math.max(...ys) - by + padding;
                break;
        }

        this.ctx.strokeRect(bx, by, bw, bh);

        //draw resize handles
        this.ctx.setLineDash([]);
        this.ctx.strokeStyle = '#93c5fd';
        this.ctx.fillStyle = '#eff6ff';
        this.ctx.lineWidth = 1.5 / pz;
        const hs = 5 / pz; // half-size of handle square in world units

        const handles = this.getHandlePositions(shape);
        for (const h of handles) {
            this.ctx.beginPath();
            this.ctx.rect(h.x - hs, h.y - hs, hs * 2, hs * 2);
            this.ctx.fill();
            this.ctx.stroke();
        }

        this.ctx.restore();
    }

    private draw(shape: Shape): void {
        this.ctx.strokeStyle = shape.strokeColor;
        this.ctx.lineWidth = shape.strokeWidth;
        this.ctx.lineCap = "round";
        this.ctx.lineJoin = "round";

        // Apply dash pattern based on strokeStyle
        const dash =
            shape.strokeStyle === 'dashed' ? [shape.strokeWidth * 4, shape.strokeWidth * 2.5] :
                shape.strokeStyle === 'dotted' ? [2, shape.strokeWidth * 2.5] :
                    [];
        this.ctx.setLineDash(dash);

        this.ctx.beginPath();

        switch (shape.type) {
            case "rect":
                this.ctx.strokeRect(shape.x, shape.y, shape.width, shape.height);
                break;
            case "diamond": {
                const cx = shape.x + shape.width / 2;
                const cy = shape.y + shape.height / 2;
                this.ctx.moveTo(cx, shape.y);                          // top
                this.ctx.lineTo(shape.x + shape.width, cy);            // right
                this.ctx.lineTo(cx, shape.y + shape.height);           // bottom
                this.ctx.lineTo(shape.x, cy);                          // left
                this.ctx.closePath();
                this.ctx.stroke();
                break;
            }
            case "circle":
                this.ctx.arc(shape.x, shape.y, shape.radius, 0, Math.PI * 2);
                this.ctx.stroke();
                break;
            case "line":
                this.ctx.moveTo(shape.x, shape.y);
                this.ctx.lineTo(shape.endX, shape.endY);
                this.ctx.stroke();
                break;
            case "arrow":
                this.drawArrow(shape.x, shape.y, shape.endX, shape.endY);
                break;
            case "pencil": {
                if (shape.points.length < 2) break;

                // Use cached path if available
                let strokePath = this.pathCache.get(shape);
                if (!strokePath) {
                    strokePath = this.getSvgPathFromStroke(shape.points);
                    this.pathCache.set(shape, strokePath);
                }

                this.ctx.fillStyle = shape.strokeColor;
                this.ctx.fill(strokePath);
                break;
            }
        }
    }

    private drawArrow(x1: number, y1: number, x2: number, y2: number) {
        const headLength = 20;
        const angle = Math.atan2(y2 - y1, x2 - x1);

        //draw main line
        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.stroke();

        //draw arrowhead
        this.ctx.beginPath();
        this.ctx.moveTo(x2, y2);

        //left wing
        this.ctx.lineTo(
            x2 - headLength * Math.cos(angle - Math.PI / 6),
            y2 - headLength * Math.sin(angle - Math.PI / 6)
        );

        //right wing
        this.ctx.moveTo(x2, y2);
        this.ctx.lineTo(
            x2 - headLength * Math.cos(angle + Math.PI / 6),
            y2 - headLength * Math.sin(angle + Math.PI / 6)
        );

        this.ctx.stroke();
    }

    //convert stroke points into a Path2D object for smoother lines
    private getSvgPathFromStroke(points: { x: number, y: number }[]) {
        const strokePoints = getStroke(points, {
            size: 10, //ink width
            thinning: 0.5, //pressure sensitivity
            smoothing: 0.5,
            streamline: 0.5,
        });

        if (!strokePoints.length) return new Path2D();
        const d = strokePoints.reduce(
            (acc, [x0, y0], i, arr) => {
                const [x1, y1] = arr[(i + 1) % arr.length]!;
                acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
                return acc;
            },
            ["M", ...strokePoints[0]!, "Q"]
        );

        d.push("Z");
        return new Path2D(d.join(" "));
    }

    public handleResize() {
        this.initDPI();
        this.render();
    }

    private handleWheel(e: WheelEvent) {
        e.preventDefault();  //stop browser from scrolling the page

        //checks if user is pinching the trackpad - ctrlKey implies pinch on trackpads
        if (e.ctrlKey || e.metaKey) {
            const ZOOM_SPEED = 0.005

            const zoomDelta = -e.deltaY * ZOOM_SPEED;
            const newZoom = Math.max(0.1, Math.min(5, this.camera.z + zoomDelta));

            //calculate where the mouse is in the world *before* zooming
            //we want to zoom towards the mouse pointer
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            const worldX = (mouseX - this.camera.x) / this.camera.z;
            const worldY = (mouseY - this.camera.y) / this.camera.z;

            //update camera zoom
            this.camera.z = newZoom;

            //adjust pan so the mouse stays over the same world point
            this.camera.x = mouseX - worldX * newZoom;
            this.camera.y = mouseY - worldY * newZoom;

            if (this.onZoomChange) this.onZoomChange(Math.round(this.camera.z * 100));
        } else {
            //normal scroll = pan
            this.camera.x -= e.deltaX;
            this.camera.y -= e.deltaY;
        }
        this.render();
    }

    //local storage
    private saveToLocalStorage() {
        localStorage.setItem('slate_shapes', JSON.stringify(this.shapes));
    }


    private loadFromLocalStorage() {
        const saved = localStorage.getItem('slate_shapes');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                // Migrate old shapes that predate strokeStyle field
                this.shapes = parsed.map((s: any) => ({
                    ...s,
                    strokeStyle: s.strokeStyle ?? 'solid',
                }));
                this.render();
            } catch (e) {
                console.error("Failed to parse saved shapes");
            }
        }
    }


    public undo() {
        if (this.history.length === 0) return;

        //save current state to the redo stack
        this.redoStack.push([...this.shapes]);

        this.shapes = this.history.pop()!;

        //update storage
        this.saveToLocalStorage();
        this.render();
    }


    public redo() {
        if (this.redoStack.length === 0) return;

        //save current state to history
        this.history.push([...this.shapes]);

        this.shapes = this.redoStack.pop()!;

        //update storage
        this.saveToLocalStorage();
        this.render();
    }


    public clearCanvas() {
        if (this.shapes.length === 0) return;

        // Save history for undo
        this.history.push([...this.shapes]);
        this.shapes = [];
        this.selectedShape = null;
        this.redoStack = [];

        this.saveToLocalStorage();
        this.render();
    }

    // ── Resize helpers ────────────────────────────────────────────────────

    private getHandlePositions(shape: Shape): { id: string; x: number; y: number }[] {
        switch (shape.type) {
            case 'rect':
            case 'diamond': {
                const minX = Math.min(shape.x, shape.x + shape.width);
                const minY = Math.min(shape.y, shape.y + shape.height);
                const maxX = Math.max(shape.x, shape.x + shape.width);
                const maxY = Math.max(shape.y, shape.y + shape.height);
                const mx = (minX + maxX) / 2, my = (minY + maxY) / 2;
                return [
                    { id: 'tl', x: minX, y: minY }, { id: 't', x: mx, y: minY }, { id: 'tr', x: maxX, y: minY },
                    { id: 'r', x: maxX, y: my },
                    { id: 'br', x: maxX, y: maxY }, { id: 'b', x: mx, y: maxY }, { id: 'bl', x: minX, y: maxY },
                    { id: 'l', x: minX, y: my },
                ];
            }
            case 'circle': {
                const { x: cx, y: cy, radius: r } = shape;
                return [
                    { id: 'n', x: cx, y: cy - r },
                    { id: 'e', x: cx + r, y: cy },
                    { id: 's', x: cx, y: cy + r },
                    { id: 'w', x: cx - r, y: cy },
                ];
            }
            case 'line':
            case 'arrow':
                return [
                    { id: 'start', x: shape.x, y: shape.y },
                    { id: 'end', x: shape.endX, y: shape.endY },
                ];
            case 'pencil': {
                const xs = shape.points.map(p => p.x);
                const ys = shape.points.map(p => p.y);
                const minX = Math.min(...xs), maxX = Math.max(...xs);
                const minY = Math.min(...ys), maxY = Math.max(...ys);
                return [
                    { id: 'tl', x: minX, y: minY }, { id: 'tr', x: maxX, y: minY },
                    { id: 'br', x: maxX, y: maxY }, { id: 'bl', x: minX, y: maxY },
                ];
            }
        }
    }

    private hitTestHandle(shape: Shape, px: number, py: number): string | null {
        const HIT = 9 / this.camera.z;

        // 1. Small handle squares (high priority)
        for (const h of this.getHandlePositions(shape)) {
            if (Math.abs(px - h.x) <= HIT && Math.abs(py - h.y) <= HIT) return h.id;
        }

        // 2. Proximity to the full selection bounding box border
        // (skipped for line/arrow — they only have endpoint handles)
        if (shape.type === 'line' || shape.type === 'arrow') return null;

        const pad = 8;
        let bx: number, by: number, bx2: number, by2: number;
        switch (shape.type) {
            case 'rect': case 'diamond': {
                bx = Math.min(shape.x, shape.x + shape.width) - pad;
                by = Math.min(shape.y, shape.y + shape.height) - pad;
                bx2 = Math.max(shape.x, shape.x + shape.width) + pad;
                by2 = Math.max(shape.y, shape.y + shape.height) + pad;
                break;
            }
            case 'circle': {
                bx = shape.x - shape.radius - pad; by = shape.y - shape.radius - pad;
                bx2 = shape.x + shape.radius + pad; by2 = shape.y + shape.radius + pad;
                break;
            }
            case 'pencil': {
                const xs = shape.points.map(p => p.x), ys = shape.points.map(p => p.y);
                bx = Math.min(...xs) - pad; by = Math.min(...ys) - pad;
                bx2 = Math.max(...xs) + pad; by2 = Math.max(...ys) + pad;
                break;
            }
            default: return null;
        }

        const EDGE = 7 / this.camera.z;
        const nearL = Math.abs(px - bx) <= EDGE;
        const nearR = Math.abs(px - bx2) <= EDGE;
        const nearT = Math.abs(py - by) <= EDGE;
        const nearB = Math.abs(py - by2) <= EDGE;
        const inX = px >= bx - EDGE && px <= bx2 + EDGE;
        const inY = py >= by - EDGE && py <= by2 + EDGE;

        // Corners first
        if (nearT && nearL) return 'tl';
        if (nearT && nearR) return 'tr';
        if (nearB && nearL) return 'bl';
        if (nearB && nearR) return 'br';
        // Edges — only if within the bbox span
        if (nearT && inX) return 't';
        if (nearB && inX) return 'b';
        if (nearL && inY) return 'l';
        if (nearR && inY) return 'r';

        return null;
    }

    private applyResize(px: number, py: number) {
        const shape = this.selectedShape;
        const orig = this.resizeOrigShape;
        const handle = this.resizeHandle;
        if (!shape || !orig || !handle) return;

        if ((orig.type === 'rect' || orig.type === 'diamond') && (shape.type === 'rect' || shape.type === 'diamond')) {
            const oMinX = Math.min(orig.x, orig.x + orig.width);
            const oMinY = Math.min(orig.y, orig.y + orig.height);
            const oMaxX = Math.max(orig.x, orig.x + orig.width);
            const oMaxY = Math.max(orig.y, orig.y + orig.height);
            let minX = oMinX, minY = oMinY, maxX = oMaxX, maxY = oMaxY;
            if (handle === 'tl' || handle === 'l' || handle === 'bl') minX = px;
            if (handle === 'tr' || handle === 'r' || handle === 'br') maxX = px;
            if (handle === 'tl' || handle === 't' || handle === 'tr') minY = py;
            if (handle === 'bl' || handle === 'b' || handle === 'br') maxY = py;
            shape.x = minX; shape.y = minY;
            shape.width = maxX - minX; shape.height = maxY - minY;
        }

        if (orig.type === 'circle' && shape.type === 'circle') {
            if (handle === 'e' || handle === 'w') shape.radius = Math.abs(px - orig.x);
            if (handle === 'n' || handle === 's') shape.radius = Math.abs(py - orig.y);
        }

        if ((orig.type === 'line' || orig.type === 'arrow') && (shape.type === 'line' || shape.type === 'arrow')) {
            if (handle === 'start') { shape.x = px; shape.y = py; }
            if (handle === 'end') { shape.endX = px; shape.endY = py; }
        }

        if (orig.type === 'pencil' && shape.type === 'pencil') {
            const oXs = orig.points.map(p => p.x), oYs = orig.points.map(p => p.y);
            const oMinX = Math.min(...oXs), oMaxX = Math.max(...oXs);
            const oMinY = Math.min(...oYs), oMaxY = Math.max(...oYs);
            let minX = oMinX, minY = oMinY, maxX = oMaxX, maxY = oMaxY;
            if (handle === 'tl' || handle === 'bl') minX = px;
            if (handle === 'tr' || handle === 'br') maxX = px;
            if (handle === 'tl' || handle === 'tr') minY = py;
            if (handle === 'bl' || handle === 'br') maxY = py;
            const sx = (oMaxX - oMinX) > 0 ? (maxX - minX) / (oMaxX - oMinX) : 1;
            const sy = (oMaxY - oMinY) > 0 ? (maxY - minY) / (oMaxY - oMinY) : 1;
            shape.points = orig.points.map(p => ({
                x: minX + (p.x - oMinX) * sx,
                y: minY + (p.y - oMinY) * sy,
            }));
            this.pathCache.set(shape, this.getSvgPathFromStroke(shape.points));
        }
    }
}
