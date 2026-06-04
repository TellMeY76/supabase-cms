"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export function SplitActionsTable({
  children,
  className
}: {
  children: ReactNode;
  className?: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [hasHiddenRightContent, setHasHiddenRightContent] = useState(false);

  useEffect(() => {
    const root = rootRef.current;
    const scroller = root?.querySelector<HTMLElement>(".payload-table-split__scroll");
    if (!root || !scroller) return;

    const updateOverflowState = () => {
      const hiddenRightWidth = scroller.scrollWidth - scroller.clientWidth - scroller.scrollLeft;
      setHasHiddenRightContent(hiddenRightWidth > 2);
    };

    updateOverflowState();
    window.requestAnimationFrame(updateOverflowState);

    scroller.addEventListener("scroll", updateOverflowState, { passive: true });
    window.addEventListener("resize", updateOverflowState);

    const resizeObserver = new ResizeObserver(updateOverflowState);
    resizeObserver.observe(scroller);
    const table = scroller.querySelector("table");
    if (table) resizeObserver.observe(table);

    return () => {
      scroller.removeEventListener("scroll", updateOverflowState);
      window.removeEventListener("resize", updateOverflowState);
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div
      className={["payload-table-split", className].filter(Boolean).join(" ")}
      data-has-hidden-right-content={hasHiddenRightContent ? "true" : undefined}
      ref={rootRef}
    >
      {children}
    </div>
  );
}
