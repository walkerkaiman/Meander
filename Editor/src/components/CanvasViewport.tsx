import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle
} from 'react';

interface ViewportTransform {
  scale: number;
  x: number;
  y: number;
}

interface CanvasViewportProps {
  children: React.ReactNode;
  className?: string;
  // Optional callbacks to expose transform changes
  onTransformChange?: (t: ViewportTransform) => void;
}

/**
 * CanvasViewport owns pan/zoom state and applies it via a single CSS transform
 * on its internal div. It exposes its transform via onTransformChange so that
 * parent components (e.g., mini-map) can mirror the view.
 */
export const CanvasViewport = forwardRef(function CanvasViewport(
  {
    children,
    className = '',
    onTransformChange
  }: CanvasViewportProps,
  ref
) {
  const viewportRef = useRef<HTMLDivElement>(null);

  // We store transform in a ref to avoid React re-renders each mousemove.
  const transformRef = useRef<ViewportTransform>({ scale: 1, x: 0, y: 0 });
  const [, forceRerender] = useState(0); // Only to trigger occasional updates

  // ---- Helpers to mutate transform ----
  const applyTransform = useCallback(() => {
    const { scale, x, y } = transformRef.current;
    if (viewportRef.current) {
      viewportRef.current.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
    }
    onTransformChange?.(transformRef.current);
  }, [onTransformChange]);

  const scheduleApply = useRef<number | null>(null);
  const requestApply = () => {
    if (scheduleApply.current == null) {
      scheduleApply.current = requestAnimationFrame(() => {
        scheduleApply.current = null;
        applyTransform();
      });
    }
  };

  // ---- Panning ----
  const isPanningRef = useRef(false);
  const lastPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      isPanningRef.current = true;
      lastPosRef.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isPanningRef.current) return;
    const dx = e.clientX - lastPosRef.current.x;
    const dy = e.clientY - lastPosRef.current.y;
    lastPosRef.current = { x: e.clientX, y: e.clientY };

    transformRef.current.x += dx;
    transformRef.current.y += dy;
    requestApply();
  };

  const stopPanning = () => {
    isPanningRef.current = false;
  };

  // ---- Zooming ----
  const handleWheel = (e: WheelEvent) => {
    e.preventDefault();
    const rect = viewportRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const { scale, x, y } = transformRef.current;
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.5, Math.min(2, scale * zoomFactor));
    const scaleDiff = newScale / scale;

    transformRef.current = {
      scale: newScale,
      x: mouseX - (mouseX - x) * scaleDiff,
      y: mouseY - (mouseY - y) * scaleDiff
    };
    requestApply();
  };

  // ---- Mount/unmount listeners ----
  useEffect(() => {
    applyTransform();
    const handleMove = (e: MouseEvent) => handleMouseMove(e);
    const handleUp = () => stopPanning();
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    viewportRef.current?.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      viewportRef.current?.removeEventListener('wheel', handleWheel as any);
    };
  }, [applyTransform]);

  // Expose imperative setTransform
  useImperativeHandle(ref, () => ({
    setTransform: (t: ViewportTransform) => {
      transformRef.current = { ...t };
      applyTransform();
    },
    getTransform: () => ({ ...transformRef.current })
  }));

  return (
    <div
      ref={viewportRef}
      className={`canvas-viewport ${className}`}
      style={{ width: '100%', height: '100%', transformOrigin: '0 0', position: 'relative' }}
      onMouseDown={handleMouseDown}
      // Double-click to reset
      onDoubleClick={() => {
        transformRef.current = { scale: 1, x: 0, y: 0 };
        applyTransform();
        forceRerender(s => s + 1);
      }}
    >
      {children}
    </div>
  );
});

export default CanvasViewport;
