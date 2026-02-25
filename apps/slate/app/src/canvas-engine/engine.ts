import { Shape, ShapeType } from "../config/types";
import { generateId } from "../config/utils";
import {getStroke} from "perfect-freehand";

export class SlateEngine {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private shapes: Shape[] = [];

    private isDrawing: boolean = false;
    private currentShape: Shape | null = null;
    
    private selectedTool: ShapeType = 'pencil';
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

        //get mouse position on screen
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;

        return{
            x : (screenX - this.camera.x) / this.camera.z,
            y : (screenY - this.camera.y) / this.camera.z,
        };

    }

    private handleMouseDown(e: MouseEvent) {
        this.isDrawing = true;
        const { x, y } = this.getMouseCoordinates(e);
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
        if (this.currentShape) this.shapes.push(this.currentShape);
        this.saveToLocalStorage();
        this.isDrawing = false;
        this.currentShape = null;
        this.render();
    }

    public render(): void {
        this.ctx.resetTransform();

        //clear canvas before drawing
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

       //slide/pan the paper 
        this.ctx.translate(this.camera.x, this.camera.y);

        //zoom the paper
        this.ctx.scale(this.camera.z, this.camera.z);

        for(const shape of this.shapes) {
            this.draw(shape);
        }
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
    private getSvgPathFromStroke(points: {x: number, y: number}[]) {
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

    private handleWheel(e : WheelEvent){
        e.preventDefault();  //stop browser from scrolling the page

        //checks if user is pinching the trackpad - ctrlKey implies pinch on trackpads
        if(e.ctrlKey || e.metaKey) {
            const ZOOM_SPEED = 0.005

            const zoomDelta = -e.deltaY * ZOOM_SPEED;
            const newZoom = Math.max(0.1, Math.min(5, this.camera.z + zoomDelta));

            // 2. Calculate where the mouse is in the world *before* zooming
            // We want to zoom towards the mouse pointer
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            const worldX = (mouseX - this.camera.x) / this.camera.z;
            const worldY = (mouseY - this.camera.y) / this.camera.z;

            // 3. Update Camera Zoom
            this.camera.z = newZoom;

            // 4. Adjust Pan so the mouse stays over the same world point
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
        if(saved) {
            try {
                this.shapes = JSON.parse(saved);
                this.render();
            } catch(e) {
                console.error("Failed to parse saved shapes");
            }
        }
    }
}