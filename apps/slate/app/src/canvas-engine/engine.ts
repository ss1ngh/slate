import { DiamondShape, Shape, ShapeType, ToolType, ImageShape } from "../config/types";
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
    private pendingImageSrc: string | null = null;

    private currentShape: Shape | null = null;
    public selectedShapes: Shape[] = [];
    private selectionBox: { x: number, y: number, w: number, h: number } | null = null;
    private isBoxSelecting: boolean = false;

    private selectedTool: ToolType = 'pencil';
    private strokeColor: string = "#000000";
    private strokeWidth: number = 2;
    private strokeStyle: 'solid' | 'dashed' | 'dotted' = 'solid';

    private camera = { x: 0, y: 0, z: 1 }; // x, y : offset z : zoom level

    public setZoom(deltaZ: number) {
        let newZoom = this.camera.z + deltaZ;
        newZoom = Math.max(0.1, Math.min(newZoom, 5));

        //calculate center of screen
        const rect = this.canvas.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        //convert screen center to world coordinates
        const worldX = (centerX - this.camera.x) / this.camera.z;
        const worldY = (centerY - this.camera.y) / this.camera.z;

        this.camera.z = newZoom;

        //adjust pan so the center stays fixed
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
            this.selectedShapes = [];
            if (this.onSelectionChange) this.onSelectionChange(null);
            this.render();
        }
    }

    public setPendingImage(src: string) {
        this.pendingImageSrc = src;
        this.setTool('image');
        if (this.onToolChange) this.onToolChange('image');
        this.canvas.style.cursor = 'crosshair';
    }

    public setColor(color: string) {
        this.strokeColor = color;
        if (this.selectedShapes.length > 0 && this.selectedTool === 'select') {
            this.history.push([...this.shapes]);
            this.selectedShapes.forEach(s => s.strokeColor = color);
            this.saveToLocalStorage();
            this.render();
        }
    }

    public setWidth(width: number) {
        this.strokeWidth = width;
        if (this.selectedShapes.length > 0 && this.selectedTool === 'select') {
            this.history.push([...this.shapes]);
            this.selectedShapes.forEach(s => s.strokeWidth = width);
            this.saveToLocalStorage();
            this.render();
        }
    }

    public setStrokeStyle(style: 'solid' | 'dashed' | 'dotted') {
        this.strokeStyle = style;
        if (this.selectedShapes.length > 0 && this.selectedTool === 'select') {
            this.history.push([...this.shapes]);
            this.selectedShapes.forEach(s => s.strokeStyle = style);
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
            if ((e.key === "Delete" || e.key === "Backspace") && this.selectedShapes.length > 0) {
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

    private spawnTextOverlay(worldX: number, worldY: number, id: string, screenX: number, screenY: number) {
        const textarea = document.createElement('textarea');
        textarea.style.position = 'absolute';
        textarea.style.left = `${screenX}px`;
        textarea.style.top = `${screenY}px`;
        textarea.style.margin = '0';
        textarea.style.padding = '0';
        textarea.style.border = '1px dashed #6366f1';
        textarea.style.outline = 'none';
        textarea.style.resize = 'none';
        textarea.style.overflow = 'hidden';
        textarea.style.background = 'transparent';

        const fontSize = 24;
        textarea.style.font = `${fontSize * this.camera.z}px sans-serif`;
        textarea.style.color = this.strokeColor;
        textarea.style.lineHeight = '1.2';
        textarea.style.whiteSpace = 'pre';
        textarea.style.zIndex = '1000';

        const adjustSize = () => {
            textarea.style.height = 'auto';
            textarea.style.height = textarea.scrollHeight + 'px';
            textarea.style.width = Math.max(100, textarea.value.length * (15 * this.camera.z)) + 'px';
        };

        textarea.addEventListener('input', adjustSize);

        const commitText = () => {
            const text = textarea.value.trim();
            if (text) {
                const newTextShape: any = {
                    id,
                    type: 'text',
                    x: worldX,
                    y: worldY,
                    text: textarea.value, // keep raw value with newlines
                    fontSize: 24,
                    strokeColor: this.strokeColor,
                    strokeWidth: this.strokeWidth,
                    strokeStyle: this.strokeStyle
                };

                this.ctx.font = `24px sans-serif`;
                let maxWidth = 0;
                const lines = newTextShape.text.split('\n');
                for (const line of lines) {
                    const metrics = this.ctx.measureText(line);
                    if (metrics.width > maxWidth) maxWidth = metrics.width;
                }
                newTextShape.width = maxWidth;
                newTextShape.height = 24 * 1.2 * lines.length;

                this.history.push([...this.shapes]);
                this.shapes.push(newTextShape);
                this.selectedShapes = [newTextShape];
                if (this.onSelectionChange) this.onSelectionChange(newTextShape);
                this.redoStack = [];
                this.saveToLocalStorage();
                this.render();
            }
            if (textarea.parentNode) {
                textarea.parentNode.removeChild(textarea);
            }
        };

        textarea.addEventListener('blur', commitText);
        textarea.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                textarea.value = '';
                textarea.blur();
            } else if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                textarea.blur();
            }
        });

        this.canvas.parentElement?.appendChild(textarea);

        setTimeout(() => {
            textarea.focus();
            adjustSize();
        }, 10);
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

        if (this.selectedTool === 'image' && this.pendingImageSrc) {
            const id = generateId();
            const src = this.pendingImageSrc;
            const img = new Image();
            img.src = src;

            const base = { id, x, y, strokeColor: this.strokeColor, strokeWidth: this.strokeWidth, strokeStyle: this.strokeStyle };
            const newImageShape: ImageShape = {
                ...base,
                type: 'image',
                src,
                width: 100,
                height: 100,
                element: img
            };

            this.history.push([...this.shapes]);
            this.shapes.push(newImageShape);
            this.redoStack = [];

            this.selectedShapes = [newImageShape];
            if (this.onSelectionChange) this.onSelectionChange(newImageShape);
            this.selectedTool = 'select';
            if (this.onToolChange) this.onToolChange('select');

            this.pendingImageSrc = null;
            this.canvas.style.cursor = 'default';

            img.onload = () => {
                newImageShape.width = img.naturalWidth;
                newImageShape.height = img.naturalHeight;
                this.render();
                this.saveToLocalStorage();
            };

            this.render();
            return;
        }

        if (this.selectedTool === 'text') {
            const id = generateId();
            this.spawnTextOverlay(x, y, id, e.clientX, e.clientY);
            this.selectedTool = 'select';
            if (this.onToolChange) this.onToolChange('select');
            return;
        }

        if (this.selectedTool === 'select') {
            const shape = this.getShapeAtPosition(x, y);

            if (this.selectedShapes.length === 1) {
                const handle = this.hitTestHandle(this.selectedShapes[0]!, x, y);
                if (handle) {
                    this.isResizing = true;
                    this.resizeHandle = handle;
                    this.resizeOrigShape = JSON.parse(JSON.stringify(this.selectedShapes[0]));
                    this.history.push([...this.shapes]);
                    return;
                }
            }

            if (shape && this.selectedShapes.some(s => s.id === shape.id)) {
                this.isDragging = true;
                this.dragStartPos = { x, y };
                this.history.push([...this.shapes]);
            } else {
                if (shape) {
                    this.selectedShapes = [shape];
                } else {
                    this.isBoxSelecting = true;
                    this.selectionBox = { x, y, w: 0, h: 0 };
                    this.selectedShapes = [];
                }
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
            this.selectedShapes = [hitShape];
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
        if (this.isResizing && this.selectedShapes.length === 1) {
            this.applyResize(x, y);
            this.render();
            return;
        }

        if (this.isBoxSelecting && this.selectionBox) {
            this.selectionBox.w = x - this.selectionBox.x;
            this.selectionBox.h = y - this.selectionBox.y;
            this.render();
            return;
        }

        if (this.isDragging && this.selectedShapes.length > 0) {
            const dx = x - this.dragStartPos.x;
            const dy = y - this.dragStartPos.y;

            this.selectedShapes.forEach(selectedShape => {
                this.moveShape(selectedShape, dx, dy);
            });

            this.dragStartPos = { x, y };
            this.render();
            return;
        }

        if (this.selectedTool === 'select' && this.selectedShapes.length === 1) {
            const handle = this.hitTestHandle(this.selectedShapes[0]!, x, y);
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
        } else if (this.selectedTool === 'select' && this.selectedShapes.length > 1) {
            this.canvas.style.cursor = 'default';
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

        //stop box selecting
        if (this.isBoxSelecting && this.selectionBox) {
            this.isBoxSelecting = false;

            // find all shapes that intersect with the selection box
            const { x, y, w, h } = this.selectionBox;
            const minX = Math.min(x, x + w);
            const maxX = Math.max(x, x + w);
            const minY = Math.min(y, y + h);
            const maxY = Math.max(y, y + h);

            this.selectedShapes = this.shapes.filter(shape => {
                const bounds = this.getShapeBounds(shape);
                return (
                    bounds.minX >= minX && bounds.maxX <= maxX &&
                    bounds.minY >= minY && bounds.maxY <= maxY
                ) || (
                        // Also include shapes that partially intersect
                        !(bounds.maxX < minX || bounds.minX > maxX || bounds.maxY < minY || bounds.minY > maxY)
                    );
            });

            this.selectionBox = null;
            if (this.onSelectionChange) {
                // Return first shape or null for backward compatibility of simple cases,
                // component will need to inspect engine.selectedShapes for full array
                this.onSelectionChange(this.selectedShapes.length > 0 ? this.selectedShapes[0]! : null);
            }
            this.render();
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
            this.selectedShapes = [drawn];
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
        if (this.selectedShapes.length === 0) return;

        //save history
        this.history.push([...this.shapes]);

        const idsToDelete = new Set(this.selectedShapes.map(s => s.id));
        this.shapes = this.shapes.filter(s => !idsToDelete.has(s.id));
        this.selectedShapes = [];
        this.redoStack = [];

        this.saveToLocalStorage();
        this.render();
    }


    private moveShape(shape: Shape, dx: number, dy: number) {
        switch (shape.type) {
            case 'rect':
            case 'image':
            case 'diamond':
            case 'circle':
            case 'text':
            case 'line':
            case 'arrow':
                shape.x += dx;
                shape.y += dy;
                if ('endX' in shape) {
                    shape.endX += dx;
                    shape.endY += dy;
                }
                break;
            case 'pencil':
                shape.x += dx;
                shape.y += dy;
                shape.points = shape.points.map(p => ({
                    x: p.x + dx,
                    y: p.y + dy
                }));
                this.pathCache.set(shape, this.getSvgPathFromStroke(shape.points));
                break;
            case 'group':
                shape.x += dx;
                shape.y += dy;
                shape.shapes.forEach(child => this.moveShape(child, dx, dy));
                break;
        }
    }

    private scaleShape(child: Shape, origChild: Shape, oMinX: number, oMinY: number, scaleX: number, scaleY: number, newGroupX: number, newGroupY: number) {
        const relX = origChild.x - oMinX;
        const relY = origChild.y - oMinY;

        switch (child.type) {
            case 'rect':
            case 'image':
            case 'diamond':
                child.x = newGroupX + relX * scaleX;
                child.y = newGroupY + relY * scaleY;
                child.width = (origChild as any).width * scaleX;
                child.height = (origChild as any).height * scaleY;
                break;
            case 'text':
                child.x = newGroupX + relX * scaleX;
                child.y = newGroupY + relY * scaleY;
                child.width = (origChild as any).width * Math.abs(scaleX);
                child.height = (origChild as any).height * Math.abs(scaleY);
                child.fontSize = (origChild as any).fontSize * Math.abs(scaleY);
                break;
            case 'circle':
                child.x = newGroupX + relX * scaleX;
                child.y = newGroupY + relY * scaleY;
                child.radius = (origChild as any).radius * Math.max(Math.abs(scaleX), Math.abs(scaleY));
                break;
            case 'line':
            case 'arrow':
                child.x = newGroupX + relX * scaleX;
                child.y = newGroupY + relY * scaleY;
                child.endX = newGroupX + ((origChild as any).endX - oMinX) * scaleX;
                child.endY = newGroupY + ((origChild as any).endY - oMinY) * scaleY;
                break;
            case 'pencil':
                child.points = (origChild as any).points.map((p: any) => ({
                    x: newGroupX + (p.x - oMinX) * scaleX,
                    y: newGroupY + (p.y - oMinY) * scaleY
                }));
                this.pathCache.set(child, this.getSvgPathFromStroke(child.points));
                break;
            case 'group':
                child.x = newGroupX + relX * scaleX;
                child.y = newGroupY + relY * scaleY;
                child.width = (origChild as any).width * scaleX;
                child.height = (origChild as any).height * scaleY;
                child.shapes.forEach((gc, i) => {
                    this.scaleShape(gc, (origChild as any).shapes[i]!, oMinX, oMinY, scaleX, scaleY, newGroupX, newGroupY);
                });
                break;
        }
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

    private getShapeBounds(shape: Shape) {
        let minX = shape.x, maxX = shape.x, minY = shape.y, maxY = shape.y;

        switch (shape.type) {
            case 'rect':
            case 'image':
            case 'diamond':
            case 'text':
                maxX = shape.x + Math.max(0, shape.width || 0);
                maxY = shape.y + Math.max(0, shape.height || 0);
                minX = shape.x + Math.min(0, shape.width || 0);
                minY = shape.y + Math.min(0, shape.height || 0);
                break;
            case 'circle':
                minX = shape.x - shape.radius;
                maxX = shape.x + shape.radius;
                minY = shape.y - shape.radius;
                maxY = shape.y + shape.radius;
                break;
            case 'line':
            case 'arrow':
                minX = Math.min(shape.x, shape.endX);
                maxX = Math.max(shape.x, shape.endX);
                minY = Math.min(shape.y, shape.endY);
                maxY = Math.max(shape.y, shape.endY);
                break;
            case 'pencil':
                const xs = shape.points.map(p => p.x);
                const ys = shape.points.map(p => p.y);
                minX = Math.min(...xs);
                maxX = Math.max(...xs);
                minY = Math.min(...ys);
                maxY = Math.max(...ys);
                break;
            case 'group':
                minX = shape.x;
                minY = shape.y;
                maxX = shape.x + shape.width;
                maxY = shape.y + shape.height;
                break;
        }
        return { minX, maxX, minY, maxY };
    }

    private getShapeAtPosition(x: number, y: number): Shape | null {
        const HIT_THRESHOLD = 10; //px

        for (let i = this.shapes.length - 1; i >= 0; i--) {
            const shape = this.shapes[i];
            if (!shape) continue;

            switch (shape.type) {
                case 'rect':
                case 'image':
                case 'text': {
                    const w = shape.width || 0;
                    const h = shape.height || 0;
                    const minX = Math.min(shape.x, shape.x + w);
                    const maxX = Math.max(shape.x, shape.x + w);
                    const minY = Math.min(shape.y, shape.y + h);
                    const maxY = Math.max(shape.y, shape.y + h);
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
                case 'group': {
                    if (x >= shape.x && x <= shape.x + shape.width && y >= shape.y && y <= shape.y + shape.height) {
                        return shape;
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
        if (this.selectedTool === 'select') {
            for (const shape of this.selectedShapes) {
                this.drawSelectionHighlight(shape);
            }
        }

        // 7. Draw selection box
        if (this.isBoxSelecting && this.selectionBox) {
            this.ctx.save();
            const { x, y, w, h } = this.selectionBox;
            this.ctx.fillStyle = 'rgba(99, 102, 241, 0.1)';
            this.ctx.fillRect(x, y, w, h);
            this.ctx.strokeStyle = 'rgba(99, 102, 241, 0.8)';
            this.ctx.lineWidth = 1 / this.camera.z;
            this.ctx.strokeRect(x, y, w, h);
            this.ctx.restore();
        }

        this.ctx.restore();
    }

    private drawSelectionHighlight(shape: Shape): void {
        this.ctx.save();
        const pz = this.camera.z;

        //bounding box
        this.ctx.strokeStyle = "#818cf8";
        this.ctx.lineWidth = 1.5 / pz;
        this.ctx.setLineDash([5 / pz, 4 / pz]);

        const padding = 8;
        let bx = 0, by = 0, bw = 0, bh = 0;

        switch (shape.type) {
            case 'rect':
            case 'image':
            case 'text':
                bx = Math.min(shape.x, shape.x + (shape.width || 0)) - padding;
                by = Math.min(shape.y, shape.y + (shape.height || 0)) - padding;
                bw = Math.abs(shape.width || 0) + padding * 2;
                bh = Math.abs(shape.height || 0) + padding * 2;
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
            case 'group':
                bx = shape.x - padding;
                by = shape.y - padding;
                bw = shape.width + padding * 2;
                bh = shape.height + padding * 2;
                break;
        }

        this.ctx.strokeRect(bx, by, bw, bh);

        //draw resize handles
        this.ctx.setLineDash([]);
        this.ctx.strokeStyle = '#818cf8';
        this.ctx.fillStyle = '#ffffff';
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

    private draw(shape: Shape, context: CanvasRenderingContext2D = this.ctx): void {
        context.strokeStyle = shape.strokeColor;
        context.lineWidth = shape.strokeWidth;
        context.lineCap = "round";
        context.lineJoin = "round";

        // Apply dash pattern based on strokeStyle
        const dash =
            shape.strokeStyle === 'dashed' ? [shape.strokeWidth * 4, shape.strokeWidth * 2.5] :
                shape.strokeStyle === 'dotted' ? [2, shape.strokeWidth * 2.5] :
                    [];
        context.setLineDash(dash);

        context.beginPath();

        switch (shape.type) {
            case "group":
                // draw all children independently
                for (const child of shape.shapes) {
                    this.draw(child, context);
                }
                break;
            case "text":
                context.fillStyle = shape.strokeColor;
                context.font = `${shape.fontSize}px sans-serif`;
                context.textBaseline = 'top';

                const lines = shape.text.split('\n');
                let curY = shape.y;
                for (let line of lines) {
                    context.fillText(line, shape.x, curY);
                    curY += shape.fontSize * 1.2;
                }
                break;
            case "rect":
                context.strokeRect(shape.x, shape.y, shape.width, shape.height);
                break;
            case "image":
                if (shape.element && shape.element.complete) {
                    context.drawImage(shape.element, shape.x, shape.y, shape.width, shape.height);
                } else if (!shape.element) {
                    const img = new Image();
                    img.src = shape.src;
                    shape.element = img;
                    img.onload = () => {
                        if (context === this.ctx) this.render();
                    };
                } else {
                    context.fillStyle = '#f1f5f9';
                    context.fillRect(shape.x, shape.y, shape.width, shape.height);
                }
                if (shape.strokeWidth > 0 && shape.strokeColor !== 'transparent') {
                    context.strokeRect(shape.x, shape.y, shape.width, shape.height);
                }
                break;
            case "diamond": {
                const cx = shape.x + shape.width / 2;
                const cy = shape.y + shape.height / 2;
                context.moveTo(cx, shape.y);                          // top
                context.lineTo(shape.x + shape.width, cy);            // right
                context.lineTo(cx, shape.y + shape.height);           // bottom
                context.lineTo(shape.x, cy);                          // left
                context.closePath();
                context.stroke();
                break;
            }
            case "circle":
                context.arc(shape.x, shape.y, shape.radius, 0, Math.PI * 2);
                context.stroke();
                break;
            case "line":
                context.moveTo(shape.x, shape.y);
                context.lineTo(shape.endX, shape.endY);
                context.stroke();
                break;
            case "arrow":
                this.drawArrow(shape.x, shape.y, shape.endX, shape.endY, context);
                break;
            case "pencil": {
                if (shape.points.length < 2) break;

                // Use cached path if available
                let strokePath = this.pathCache.get(shape);
                if (!strokePath) {
                    strokePath = this.getSvgPathFromStroke(shape.points);
                    this.pathCache.set(shape, strokePath);
                }

                context.fillStyle = shape.strokeColor;
                context.fill(strokePath);
                break;
            }
        }
    }

    private drawArrow(x1: number, y1: number, x2: number, y2: number, context: CanvasRenderingContext2D = this.ctx) {
        const headLength = 20;
        const angle = Math.atan2(y2 - y1, x2 - x1);

        //draw main line
        context.beginPath();
        context.moveTo(x1, y1);
        context.lineTo(x2, y2);
        context.stroke();

        //draw arrowhead
        context.beginPath();
        context.moveTo(x2, y2);

        //left wing
        context.lineTo(
            x2 - headLength * Math.cos(angle - Math.PI / 6),
            y2 - headLength * Math.sin(angle - Math.PI / 6)
        );

        //right wing
        context.moveTo(x2, y2);
        context.lineTo(
            x2 - headLength * Math.cos(angle + Math.PI / 6),
            y2 - headLength * Math.sin(angle + Math.PI / 6)
        );

        context.stroke();
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

                let shapesArray = parsed;
                if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && parsed.shapes) {
                    shapesArray = parsed.shapes;
                }

                this.shapes = shapesArray.map((s: any) => ({
                    ...s,
                    strokeStyle: s.strokeStyle ?? 'solid',
                }));
                this.render();
            } catch (e) {
                console.error("Failed to parse saved shapes");
            }
        }
    }

    public exportImage() {
        if (this.shapes.length === 0) return;

        // Calculate global bounding box
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const shape of this.shapes) {
            const bounds = this.getShapeBounds(shape);
            if (bounds.minX < minX) minX = bounds.minX;
            if (bounds.minY < minY) minY = bounds.minY;
            if (bounds.maxX > maxX) maxX = bounds.maxX;
            if (bounds.maxY > maxY) maxY = bounds.maxY;
        }

        // Add padding
        const padding = 40;
        minX -= padding;
        minY -= padding;
        maxX += padding;
        maxY += padding;

        const width = maxX - minX;
        const height = maxY - minY;

        // Use a high scale for high resolution output
        const exportScale = 3;

        const offscreenCanvas = document.createElement('canvas');
        offscreenCanvas.width = width * exportScale;
        offscreenCanvas.height = height * exportScale;

        const ctx = offscreenCanvas.getContext('2d');
        if (!ctx) return;

        // Draw white background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, offscreenCanvas.width, offscreenCanvas.height);

        // Apply scale and offset so the entire bounding box is rendered tightly 
        ctx.scale(exportScale, exportScale);
        ctx.translate(-minX, -minY);

        // Render all shapes
        for (const shape of this.shapes) {
            this.draw(shape, ctx);
        }

        // Trigger download
        const dataUrl = offscreenCanvas.toDataURL('image/png', 1.0);
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataUrl);
        downloadAnchorNode.setAttribute("download", "slate_drawing_" + Date.now() + ".png");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    }

    public importDrawing(jsonString: string) {
        try {
            const parsed = JSON.parse(jsonString);
            let shapesArray = parsed;
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && parsed.shapes) {
                shapesArray = parsed.shapes;
            }

            this.history.push([...this.shapes]);

            // Handle loading raw exported array or wrapped objects
            if (Array.isArray(shapesArray)) {
                this.shapes = shapesArray.map((s: any) => ({
                    ...s,
                    strokeStyle: s.strokeStyle ?? 'solid',
                }));
            }

            this.selectedShapes = [];
            this.redoStack = [];

            this.saveToLocalStorage();
            this.render();
        } catch (e) {
            console.error("Failed to import drawing:", e);
            alert("Invalid drawing file.");
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

    public bringForward() {
        if (this.selectedShapes.length === 0) return;
        this.history.push([...this.shapes]);
        // Sort selected shapes by their current index to maintain relative order
        const sortedSelected = [...this.selectedShapes].sort((a, b) =>
            this.shapes.findIndex(s => s.id === b.id) - this.shapes.findIndex(s => s.id === a.id)
        );

        for (const shape of sortedSelected) {
            const index = this.shapes.findIndex(s => s.id === shape.id);
            if (index > -1 && index < this.shapes.length - 1) {
                // Swap with the shape above it
                const temp = this.shapes[index + 1]!;
                this.shapes[index + 1] = shape;
                this.shapes[index] = temp;
            }
        }
        this.saveToLocalStorage();
        this.render();
    }

    public sendBackward() {
        if (this.selectedShapes.length === 0) return;
        this.history.push([...this.shapes]);
        // Sort selected shapes by their current index to maintain relative order (top to bottom)
        const sortedSelected = [...this.selectedShapes].sort((a, b) =>
            this.shapes.findIndex(s => s.id === a.id) - this.shapes.findIndex(s => s.id === b.id)
        );

        for (const shape of sortedSelected) {
            const index = this.shapes.findIndex(s => s.id === shape.id);
            if (index > 0) {
                // Swap with the shape below it
                const temp = this.shapes[index - 1]!;
                this.shapes[index - 1] = shape;
                this.shapes[index] = temp;
            }
        }
        this.saveToLocalStorage();
        this.render();
    }

    public bringToFront() {
        if (this.selectedShapes.length === 0) return;
        this.history.push([...this.shapes]);

        // Remove all selected shapes from current positions
        const selectedIds = new Set(this.selectedShapes.map(s => s.id));
        const unselectedShapes = this.shapes.filter(s => !selectedIds.has(s.id));

        // Sort selected shapes to maintain relative original order
        const sortedSelected = [...this.selectedShapes].sort((a, b) =>
            this.shapes.findIndex(s => s.id === a.id) - this.shapes.findIndex(s => s.id === b.id)
        );

        // Append all selected shapes to the end
        this.shapes = [...unselectedShapes, ...sortedSelected];
        this.saveToLocalStorage();
        this.render();
    }

    public sendToBack() {
        if (this.selectedShapes.length === 0) return;
        this.history.push([...this.shapes]);

        // Remove all selected shapes from current positions
        const selectedIds = new Set(this.selectedShapes.map(s => s.id));
        const unselectedShapes = this.shapes.filter(s => !selectedIds.has(s.id));

        // Sort selected shapes to maintain relative original order
        const sortedSelected = [...this.selectedShapes].sort((a, b) =>
            this.shapes.findIndex(s => s.id === a.id) - this.shapes.findIndex(s => s.id === b.id)
        );

        // Prepend all selected shapes to the beginning
        this.shapes = [...sortedSelected, ...unselectedShapes];
        this.saveToLocalStorage();
        this.render();
    }


    public clearCanvas() {
        if (this.shapes.length === 0) return;

        // Save history for undo
        this.history.push([...this.shapes]);
        this.shapes = [];
        this.selectedShapes = [];
        this.redoStack = [];

        this.saveToLocalStorage();
        this.render();
    }


    public groupShapes() {
        if (this.selectedShapes.length < 2) return;

        this.history.push([...this.shapes]);

        // Find bounding box for all selected
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const shape of this.selectedShapes) {
            const bounds = this.getShapeBounds(shape);
            minX = Math.min(minX, bounds.minX);
            minY = Math.min(minY, bounds.minY);
            maxX = Math.max(maxX, bounds.maxX);
            maxY = Math.max(maxY, bounds.maxY);
        }

        const groupShape: Shape = {
            id: generateId(),
            type: 'group',
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY,
            shapes: [...this.selectedShapes],
            strokeColor: 'transparent',
            strokeWidth: 0,
            strokeStyle: 'solid'
        };

        // remove grouped shapes from main shapes array
        const idsToRemove = new Set(this.selectedShapes.map(s => s.id));
        this.shapes = this.shapes.filter(s => !idsToRemove.has(s.id));

        // add group shape
        this.shapes.push(groupShape);
        this.selectedShapes = [groupShape];

        if (this.onSelectionChange) this.onSelectionChange(groupShape);

        this.saveToLocalStorage();
        this.render();
    }

    public ungroupShapes() {
        if (this.selectedShapes.length !== 1 || this.selectedShapes[0]?.type !== 'group') return;

        this.history.push([...this.shapes]);
        const group = this.selectedShapes[0];

        // Calculate offset since group might have been moved
        const dx = group.x - Math.min(...group.shapes.map(s => this.getShapeBounds(s).minX));
        const dy = group.y - Math.min(...group.shapes.map(s => this.getShapeBounds(s).minY));

        const updatedChildren = group.shapes.map(s => {
            const newShape = JSON.parse(JSON.stringify(s)); // quick deep clone
            switch (newShape.type) {
                case 'rect':
                case 'diamond':
                case 'circle':
                case 'line':
                case 'arrow':
                case 'group':
                    newShape.x += dx;
                    newShape.y += dy;
                    if ('endX' in newShape) {
                        newShape.endX += dx;
                        newShape.endY += dy;
                    }
                    if (newShape.type === 'group') {
                        // recursive offset... skipping full deep recursive offset for simplicity now 
                        // since nested grouping might need more complex logic.  
                    }
                    break;
                case 'pencil':
                    newShape.x += dx;
                    newShape.y += dy;
                    newShape.points = newShape.points.map((p: any) => ({
                        x: p.x + dx,
                        y: p.y + dy
                    }));
                    break;
            }
            return newShape;
        });

        // remove group shape
        this.shapes = this.shapes.filter(s => s.id !== group.id);

        // add children
        this.shapes.push(...updatedChildren);
        this.selectedShapes = updatedChildren;

        if (this.onSelectionChange) {
            this.onSelectionChange(this.selectedShapes[0] || null);
        }

        this.saveToLocalStorage();
        this.render();
    }

    //resize
    private getHandlePositions(shape: Shape): { id: string; x: number; y: number }[] {
        switch (shape.type) {
            case 'rect':
            case 'image':
            case 'text':
            case 'diamond': {
                const w = shape.width || 0;
                const h = shape.height || 0;
                const minX = Math.min(shape.x, shape.x + w);
                const minY = Math.min(shape.y, shape.y + h);
                const maxX = Math.max(shape.x, shape.x + w);
                const maxY = Math.max(shape.y, shape.y + h);
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
            case 'group': {
                const minX = shape.x;
                const minY = shape.y;
                const maxX = shape.x + shape.width;
                const maxY = shape.y + shape.height;
                const mx = (minX + maxX) / 2, my = (minY + maxY) / 2;
                return [
                    { id: 'tl', x: minX, y: minY }, { id: 't', x: mx, y: minY }, { id: 'tr', x: maxX, y: minY },
                    { id: 'r', x: maxX, y: my },
                    { id: 'br', x: maxX, y: maxY }, { id: 'b', x: mx, y: maxY }, { id: 'bl', x: minX, y: maxY },
                    { id: 'l', x: minX, y: my },
                ];
            }
        }
        return [];
    }

    private hitTestHandle(shape: Shape, px: number, py: number): string | null {
        const HIT = 9 / this.camera.z;

        //small handle squares (high priority)
        for (const h of this.getHandlePositions(shape)) {
            if (Math.abs(px - h.x) <= HIT && Math.abs(py - h.y) <= HIT) return h.id;
        }

        //proximity to the full selection bounding box border
        //skipped for line/arrow — they only have endpoint handles
        if (shape.type === 'line' || shape.type === 'arrow') return null;

        const pad = 8;
        let bx: number, by: number, bx2: number, by2: number;
        switch (shape.type) {
            case 'rect': case 'image': case 'text': case 'diamond': {
                const w = shape.width || 0;
                const h = shape.height || 0;
                bx = Math.min(shape.x, shape.x + w) - pad;
                by = Math.min(shape.y, shape.y + h) - pad;
                bx2 = Math.max(shape.x, shape.x + w) + pad;
                by2 = Math.max(shape.y, shape.y + h) + pad;
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

        //corners first
        if (nearT && nearL) return 'tl';
        if (nearT && nearR) return 'tr';
        if (nearB && nearL) return 'bl';
        if (nearB && nearR) return 'br';
        //edges — only if within the bbox span
        if (nearT && inX) return 't';
        if (nearB && inX) return 'b';
        if (nearL && inY) return 'l';
        if (nearR && inY) return 'r';

        return null;
    }

    private applyResize(px: number, py: number) {
        const shape = this.selectedShapes[0];
        const orig = this.resizeOrigShape;
        const handle = this.resizeHandle;
        if (!shape || !orig || !handle) return;

        if ((orig.type === 'rect' || orig.type === 'diamond' || orig.type === 'group' || orig.type === 'image' || orig.type === 'text') &&
            (shape.type === 'rect' || shape.type === 'diamond' || shape.type === 'group' || shape.type === 'image' || shape.type === 'text')) {
            const oMinX = Math.min(orig.x, orig.x + (orig.width || 0));
            const oMinY = Math.min(orig.y, orig.y + (orig.height || 0));
            const oMaxX = Math.max(orig.x, orig.x + (orig.width || 0));
            const oMaxY = Math.max(orig.y, orig.y + (orig.height || 0));
            const origW = oMaxX - oMinX;
            const origH = oMaxY - oMinY;

            let minX = oMinX, minY = oMinY, maxX = oMaxX, maxY = oMaxY;
            if (handle === 'tl' || handle === 'l' || handle === 'bl') minX = px;
            if (handle === 'tr' || handle === 'r' || handle === 'br') maxX = px;
            if (handle === 'tl' || handle === 't' || handle === 'tr') minY = py;
            if (handle === 'bl' || handle === 'b' || handle === 'br') maxY = py;
            shape.x = minX; shape.y = minY;
            shape.width = maxX - minX; shape.height = maxY - minY;

            if (shape.type === 'group' && orig.type === 'group') {
                const scaleX = shape.width / (origW || 1);
                const scaleY = shape.height / (origH || 1);

                shape.shapes.forEach((child, i) => {
                    this.scaleShape(child, orig.shapes[i]!, oMinX, oMinY, scaleX, scaleY, shape.x, shape.y);
                });
            }

            if (shape.type === 'text' && orig.type === 'text') {
                // Determine scale primarily from height, unless doing a purely horizontal resize
                let scale = 1;
                if (handle === 'l' || handle === 'r') {
                    scale = Math.abs((shape.width || 1) / (origW || 1));
                } else {
                    scale = Math.abs((shape.height || 1) / (origH || 1));
                }

                shape.fontSize = Math.max(4, (orig as any).fontSize * scale);

                // Recalculate precise dimensions
                this.ctx.font = `${shape.fontSize}px sans-serif`;
                let maxWidth = 0;
                const lines = shape.text.split('\n');
                for (const line of lines) {
                    const metrics = this.ctx.measureText(line);
                    if (metrics.width > maxWidth) maxWidth = metrics.width;
                }

                const calcWidth = maxWidth;
                const calcHeight = shape.fontSize * 1.2 * lines.length;

                // Fix anchor point so text grows in the direction of the handle
                if (handle === 'tl' || handle === 'l' || handle === 'bl') {
                    shape.x = oMaxX - calcWidth;
                } else {
                    shape.x = oMinX;
                }

                if (handle === 'tl' || handle === 't' || handle === 'tr') {
                    shape.y = oMaxY - calcHeight;
                } else {
                    shape.y = oMinY;
                }

                shape.width = calcWidth;
                shape.height = calcHeight;
            }
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
