export type ShapeType = 'rect' | 'circle' | 'pencil' | 'line'

export interface BaseShape {
    id : string;
    type : ShapeType;
    x : number;
    y : number;
    strokeColor : string;
    strokeWidth : number;
}

export interface RectShape extends BaseShape {
    type : 'rect';
    width : number;
    length : number;
}

export interface Circle extends BaseShape {
    type : 'circle'
}