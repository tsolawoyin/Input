"use client";

import { useEffect, useRef } from "react";
import renderMathInElement from "./helpers/auto-render";

import { cn } from "@/lib/utils";

function Render({
  html,
  className = "",
}: {
  html: string;
  className?: string;
}) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    renderMathInElement(containerRef.current, {
      delimiters: [
        { left: "$$", right: "$$", display: true },
        { left: "$", right: "$", display: false },
        { left: "\\(", right: "\\)", display: false },
        { left: "\\[", right: "\\]", display: true },
      ],
    });
  }, [html]); // re-run whenever the underlying content changes

  return (
    <div
      ref={containerRef}
      className={cn(
        "min-w-0 flex-1 overflow-x-auto[overflow-wrap:anywhere]",
        className,
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export default Render;
