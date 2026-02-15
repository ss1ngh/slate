import { Shape, ShapeType } from "../config/types";

export class SlateEngine {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private shapes: Shape[] = [];

    private isDrawing: boolean = false;
    private currentShape: Shape | null = null;
    
    private selectedTool: ShapeType = 'pencil';
    private strokeColor: string = "#000000";
    private strokeWidth: number = 2;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        const context = canvas.getContext("2d", { alpha: false });
        if (!context) throw new Error("Could not get canvas context");
        this.ctx = context;

        this.initDPI();
        this.attachListeners();
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

    public setTool(tool: ShapeType) { this.selectedTool = tool; }
    public setColor(color: string) { this.strokeColor = color; }
    public setWidth(width: number) { this.strokeWidth = width; }

    private attachListeners() {
        this.canvas.addEventListener("mousedown", this.handleMouseDown.bind(this));
        window.addEventListener("mousemove", this.handleMouseMove.bind(this));
        window.addEventListener("mouseup", this.handleMouseUp.bind(this));
    }

    private getMouseCoordinates(e: MouseEvent) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        };
    }

    private handleMouseDown(e: MouseEvent) {
        this.isDrawing = true;
        const { x, y } = this.getMouseCoordinates(e);
        const id = Date.now().toString();

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
        if (this.currentShape) this.shapes.push(this.currentShape);
        this.isDrawing = false;
        this.currentShape = null;
        this.render();
    }

    public render(): void {
        this.ctx.save();
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.fillStyle = "#ffffff"; //canvas background
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.restore();

        for (const shape of this.shapes) this.draw(shape);
        if (this.currentShape) this.draw(this.currentShape);
    }

    private draw(shape: Shape): void {
        this.ctx.strokeStyle = shape.strokeColor;
        this.ctx.lineWidth = shape.strokeWidth;
        this.ctx.lineCap = "round";
        this.ctx.lineJoin = "round";
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
                const firstPoint = shape.points[0];
                if (!firstPoint) break;
                this.ctx.moveTo(firstPoint.x, firstPoint.y);
                for (const pt of shape.points) {
                    this.ctx.lineTo(pt.x, pt.y);
                }
                this.ctx.stroke();
                break;
            }
        }
    }

    private drawArrow(x1: number, y1: number, x2: number, y2: number) {
        const headLength = 15; 
        const angle = Math.atan2(y2 - y1, x2 - x1);

        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        //draw the arrow head
        this.ctx.lineTo(x2 - headLength * Math.cos(angle - Math.PI / 6), y2 - headLength * Math.sin(angle - Math.PI / 6));
        this.ctx.moveTo(x2, y2);
        this.ctx.lineTo(x2 - headLength * Math.cos(angle + Math.PI / 6), y2 - headLength * Math.sin(angle + Math.PI / 6));
        this.ctx.stroke();
    }

    public handleResize() {
        this.initDPI();
        this.render();
    }
}