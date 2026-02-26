export type ToolType = 'select' | 'rect' | 'circle' | 'line' | 'arrow' | 'pencil' | 'hand' | 'eraser' | 'diamond' | 'image';
export type ShapeType = 'rect' | 'circle' | 'line' | 'arrow' | 'pencil' | 'select' | 'hand' | 'eraser' | 'diamond' | 'group' | 'image';

export interface BaseShape {
  id: string;
  type: ShapeType;
  x: number;
  y: number;
  strokeColor: string;
  strokeWidth: number;
  strokeStyle: 'solid' | 'dashed' | 'dotted';
}

export interface RectShape extends BaseShape {
  type: 'rect';
  width: number;
  height: number;
}

export interface DiamondShape extends BaseShape {
  type: 'diamond';
  width: number;
  height: number;
}

export interface CircleShape extends BaseShape {
  type: 'circle';
  radius: number;
}

export interface LineShape extends BaseShape {
  type: 'line' | 'arrow'; //both use start and end points
  endX: number;
  endY: number;
}

export interface PencilShape extends BaseShape {
  type: 'pencil';
  points: { x: number; y: number }[]; //array of coordinates for freehand
}

export interface GroupShape extends BaseShape {
  type: 'group';
  shapes: Shape[];
  width: number;
  height: number;
}

export interface ImageShape extends BaseShape {
  type: 'image';
  src: string;
  width: number;
  height: number;
  element?: HTMLImageElement; // Optional cached image element
}

export type Shape = RectShape | DiamondShape | CircleShape | LineShape | PencilShape | GroupShape | ImageShape;
