"use client";
import { useEffect, useRef } from "react";

export function CustomCursor() {
  const dotRef  = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let rx = 0, ry = 0, raf: number;
    const dot  = dotRef.current!;
    const ring = ringRef.current!;

    const move = (e: MouseEvent) => {
      rx = e.clientX; ry = e.clientY;
      dot.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%)`;
    };

    const tick = () => {
      const cx = parseFloat(ring.dataset.x ?? "0");
      const cy = parseFloat(ring.dataset.y ?? "0");
      const nx = cx + (rx - cx) * 0.12;
      const ny = cy + (ry - cy) * 0.12;
      ring.dataset.x = String(nx);
      ring.dataset.y = String(ny);
      ring.style.transform = `translate(${nx}px, ${ny}px) translate(-50%, -50%)`;
      raf = requestAnimationFrame(tick);
    };

    const onEnter = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("a") || t.closest("button")) ring.classList.add("hover");
      else ring.classList.remove("hover");
    };

    document.addEventListener("mousemove", move);
    document.addEventListener("mouseover", onEnter);
    raf = requestAnimationFrame(tick);
    return () => {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseover", onEnter);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <>
      <div ref={dotRef}  className="cursor-dot" />
      <div ref={ringRef} className="cursor-ring" />
    </>
  );
}
