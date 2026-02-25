import { Shape, ShapeType, ToolType } from "../config/types";
import { generateId } from "../config/utils";
import { getStroke } from "perfect-freehand";

export class SlateEngine {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private shapes: Shape[] = [];
    private history: Shape[][] = [];
    private redoStack: Shape[][] = [];

    private isDrawing: boolean = false;
    private currentShape: Shape | null = null;
    private selectedShape: Shape | null = null;

    private selectedTool: ToolType = 'pencil';
    private strokeColor: string = "#000000";
    private strokeWidth: number = 2;

    private camera = { x: 0, y: 0, z: 1 }; // x, y : offset z : zoom level

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
        const dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.getBoundingClientRect();

        this.canvas.style.width = `${rect.width}px`;
        this.canvas.style.height = `${rect.height}px`;

        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;

        this.ctx.scale(dpr, dpr);
    }

    public setTool(tool: ToolType) {
        this.selectedTool = tool;
        if (tool !== 'select') {
            this.selectedShape = null;
            this.render();
        }
    }
    public setColor(color: string) { this.strokeColor = color; }
    public setWidth(width: number) { this.strokeWidth = width; }

    private attachListeners() {
        this.canvas.addEventListener("mousedown", this.handleMouseDown.bind(this));
        window.addEventListener("mousemove", this.handleMouseMove.bind(this));
        window.addEventListener("mouseup", this.handleMouseUp.bind(this));

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

        if (this.selectedTool === 'select') {
            const shape = this.getShapeAtPosition(x, y);
            this.selectedShape = shape;
            this.render();
            return;
        }

        this.isDrawing = true;
        const id = generateId();

        const base = { id, x, y, strokeColor: this.strokeColor, strokeWidth: this.strokeWidth };

        switch (this.selectedTool) {
            case "rect":
                this.currentShape = { ...base, type: 'rect', width: 0, height: 0 };
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
        if (!this.isDrawing || !this.currentShape) return;
        const { x, y } = this.getMouseCoordinates(e);

        switch (this.currentShape.type) {
            case "rect":
                this.currentShape.width = x - this.currentShape.x;
                this.currentShape.height = y - this.currentShape.y;
                break;
            case "circle":
                const dx = x - this.currentShape.x;
                const dy = y - this.currentShape.y;
                this.currentShape.radius = Math.sqrt(dx * dx + dy * dy);
                break;
            case "line":
            case "arrow":
                this.currentShape.endX = x;
                this.currentShape.endY = y;
                break;
            case "pencil":
                this.currentShape.points.push({ x, y });
                break;
        }
        this.render();
    }

    private handleMouseUp() {
        if (this.currentShape) {
            //push current state of canvas before adding new shape
            this.history.push([...this.shapes]);

            //add new shape
            this.shapes.push(this.currentShape)

            this.redoStack = [];

            this.saveToLocalStorage();
        };
        this.isDrawing = false;
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

        //clear canvas before drawing
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        //slide/pan the paper 
        this.ctx.translate(this.camera.x, this.camera.y);

        //zoom the paper
        this.ctx.scale(this.camera.z, this.camera.z);

        for (const shape of this.shapes) {
            this.draw(shape);
        }
    }

    private draw(shape: Shape): void {
        this.ctx.strokeStyle = shape.strokeColor;
        this.ctx.lineWidth = shape.strokeWidth;
        this.ctx.lineCap = "round";
        this.ctx.lineJoin = "round";

        //draw selection highlight
        if (this.selectedTool === 'select' && this.selectedShape?.id === shape.id) {
            this.ctx.save();
            this.ctx.strokeStyle = "#3b82f6"; // Blue-500
            this.ctx.lineWidth = 1.5;
            this.ctx.setLineDash([5, 5]);

            //draw bounding box for most shapes
            let padding = 8;
            let bx, by, bw, bh;

            switch (shape.type) {
                case 'rect':
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
            this.ctx.restore();
        }

        this.ctx.beginPath();

        switch (shape.type) {
            case "rect":
                this.ctx.strokeRect(shape.x, shape.y, shape.width, shape.height);
                break;
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
                //need 2 points to draw a shape
                if (shape.points.length < 2) break;

                //calculate the smooth outline
                const strokePath = this.getSvgPathFromStroke(shape.points);

                //fill colour since perfect-freehand creates a polygon
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
        } else {
            // Normal Scroll = Pan
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
                this.shapes = JSON.parse(saved);
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
}