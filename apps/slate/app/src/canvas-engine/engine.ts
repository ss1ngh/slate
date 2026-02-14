import { Shape } from "../config/types";

export class SlateEngine {
    private canvas! : HTMLCanvasElement;
    private ctx! : CanvasRenderingContext2D;
    private shapes : Shape[] = [];

    constructor(canvas : HTMLCanvasElement) {
        this.canvas = canvas;
        const context = canvas.getContext("2d");
        if(!context) throw new Error ("Could not get canvas context");
        this.ctx = context;
    }

    public render(){
        //clear everything
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        //draw shapes
        this.shapes.forEach((shape) => {
            this.ctx.strokeStyle = shape.strokeColor;
            this.ctx.lineWidth = shape.strokeWidth;

            if(shape.type == "rect"){
                this.ctx.strokeRect(shape.x, shape.y, shape.width, shape.height);
            }

            //we'll add more shapes here
        })
    }
}