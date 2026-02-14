export type ShapeType = 'rect' | 'circle' | 'pencil' | 'line' | 'arrow' | 'text';

export interface BaseShape {
    id: string;
    type: ShapeType;
    x: number; // Starting X
    y: number; // Starting Y
    strokeColor: string;
    strokeWidth: number;
}

export interface RectShape extends BaseShape {
    type: 'rect';
    width: number;
    height: number;
}

export interface CircleShape extends BaseShape {
    type: 'circle';
    radius: number;
}

export interface LineShape extends BaseShape {
    type : 'line' | 'arrow'
    endX : number;
    endY : number;
}

export interface PencilShape extends BaseShape {
    type : 'pencil';
    points : {x : number, y: number}[]; //array of every mouse movement
}

export interface TextShape extends BaseShape {
  type: 'text';
  text: string;
  fontSize: number;
}

export type Shape = RectShape | CircleShape | PencilShape | LineShape | TextShape;