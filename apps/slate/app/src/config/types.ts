export type ToolType = 'select' | 'rect' | 'circle' | 'line' | 'arrow' | 'pencil' | 'hand' | 'eraser' | 'diamond';
export type ShapeType = 'rect' | 'circle' | 'line' | 'arrow' | 'pencil' | 'select' | 'hand' | 'eraser' | 'diamond';

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

export type Shape = RectShape | DiamondShape | CircleShape | LineShape | PencilShape;
