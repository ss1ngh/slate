  'use client'

  import React, { useEffect, useRef, useState } from 'react'
  import { SlateEngine } from '../canvas-engine/engine';
  import { ShapeType } from '../config/types';
  import Toolbar from './ui/Toolbar';

  export default function Canvas() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const engineRef = useRef<SlateEngine | null>(null);

    const [activeTool, setActiveTool] = useState<ShapeType>('pencil');

    useEffect(() => {
      if(canvasRef.current && !engineRef.current) {
        engineRef.current = new SlateEngine(canvasRef.current);
      }

      const handleResize = () => {
        if (engineRef.current) {
          engineRef.current.handleResize();
        }
      };

      window.addEventListener("resize", handleResize);

      //cleanup
      return () => {
        window.removeEventListener("resize", handleResize);
      };
    }, []);

    //onchange of active tool - re  
    useEffect(()=> {
      if(engineRef.current) {
        engineRef.current.setTool(activeTool);
      }
    }, [activeTool]);

    //render DOM element
    return (
      <div className='relative w-full h-screen'>

        <Toolbar
        activeTool={activeTool}
        onToolChange={setActiveTool}
        />

        <canvas
          ref={canvasRef}
          className="fixed inset-0 w-full bg-slate-50 touch-none"
          onContextMenu={(e) => e.preventDefault()}
        />
        
      </div>
    );
  }
