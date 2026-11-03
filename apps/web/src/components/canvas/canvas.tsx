"use client";

import {
  ArrowCounterClockwiseIcon,
  CornersOutIcon,
  DotsSixVerticalIcon,
  MinusIcon,
  PlusIcon,
} from "@phosphor-icons/react";
import { memo, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { TooltipProvider } from "@/components/ui/tooltip";

import { type Camera, clampZoom, loadLayout, type Point, saveLayout } from "./layout-store";

/** One live preview on the canvas. Membership, names and sizes live here in source, never in storage. */
export type CanvasItem = {
  /** Stable key for the saved position. Never reuse one for a different preview. */
  id: string;
  /** What the label shows and copies, e.g. `Review · answer first`. Unique. */
  name: string;
  width: number;
  height: number;
  x: number;
  y: number;
  render: () => React.ReactNode;
};

const DEFAULT_CAMERA: Camera = { x: 80, y: 80, z: 0.5 };
const FIT_PADDING = 48;
const KEY_PAN = 60;
const MOVE_STEP = 10;
const SAVE_DELAY_MS = 300;
/** A press that moves less than this is a click, not a pan. */
const DRAG_SLOP = 3;

type Gesture =
  | { kind: "pan"; pointerId: number; lastX: number; lastY: number; moved: boolean }
  | { kind: "move"; pointerId: number; id: string; startX: number; startY: number; from: Point }
  | { kind: "pinch"; last: { cx: number; cy: number; dist: number } }
  | null;

const isEditable = (el: Element | null) =>
  !!el &&
  (el instanceof HTMLInputElement ||
    el instanceof HTMLTextAreaElement ||
    el instanceof HTMLSelectElement ||
    (el as HTMLElement).isContentEditable);

/** Focus on a control or a field: Space belongs to it, not to the canvas. */
const ownsSpace = (el: Element | null) =>
  isEditable(el) ||
  !!el?.closest("button, a[href], [role='button'], [role='tab'], [role='menuitem']");

/** The nearest scroll area between `target` and `stop` that can still scroll that way. */
function scrollerFor(target: EventTarget | null, stop: HTMLElement, dx: number, dy: number) {
  let el = target instanceof Element ? target : null;
  const vertical = Math.abs(dy) >= Math.abs(dx);
  while (el && el !== stop) {
    if (el instanceof HTMLElement) {
      const style = getComputedStyle(el);
      if (vertical && /(auto|scroll)/.test(style.overflowY) && el.scrollHeight > el.clientHeight) {
        if (
          (dy < 0 && el.scrollTop > 0) ||
          (dy > 0 && el.scrollTop + el.clientHeight < el.scrollHeight - 1)
        )
          return el;
      }
      if (!vertical && /(auto|scroll)/.test(style.overflowX) && el.scrollWidth > el.clientWidth) {
        if (
          (dx < 0 && el.scrollLeft > 0) ||
          (dx > 0 && el.scrollLeft + el.clientWidth < el.scrollWidth - 1)
        )
          return el;
      }
    }
    el = el.parentElement;
  }
  return null;
}

/**
 * A pan-and-zoom workspace of live previews. The camera and item positions are written straight to the DOM once per
 * animation frame, so gestures never re-render a preview or lose what someone typed into it.
 */
export function Canvas({ items, title }: { items: CanvasItem[]; title: string }) {
  const shellRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const zoomTextRef = useRef<HTMLSpanElement>(null);
  const camera = useRef<Camera>({ ...DEFAULT_CAMERA });
  const positions = useRef(new Map<string, Point>(items.map((i) => [i.id, { x: i.x, y: i.y }])));
  const nodes = useRef(new Map<string, HTMLDivElement>());
  const sizes = useRef(new Map<string, { w: number; h: number }>());
  const gesture = useRef<Gesture>(null);
  const touches = useRef(new Map<number, { x: number; y: number }>());
  const spaceHeld = useRef(false);
  const suppressClick = useRef(false);
  const frame = useRef(0);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hadSavedCamera = useRef(false);
  const [notice, setNotice] = useState("");
  const helpId = useId();
  const moveHelpId = useId();

  const ids = useMemo(() => new Set(items.map((i) => i.id)), [items]);

  const paint = useCallback(() => {
    frame.current = 0;
    const { x, y, z } = camera.current;
    if (worldRef.current)
      worldRef.current.style.transform = `translate(${x}px, ${y}px) scale(${z})`;
    if (zoomTextRef.current) zoomTextRef.current.textContent = `${Math.round(z * 100)}%`;
  }, []);

  const schedule = useCallback(() => {
    if (!frame.current) frame.current = requestAnimationFrame(paint);
  }, [paint]);

  const flushSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = null;
    saveLayout({ camera: camera.current, positions: Object.fromEntries(positions.current) });
  }, []);

  const queueSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(flushSave, SAVE_DELAY_MS);
  }, [flushSave]);

  const setCamera = useCallback(
    (next: Camera) => {
      const z = clampZoom(next.z);
      if (![next.x, next.y, z].every(Number.isFinite)) return;
      camera.current = { x: next.x, y: next.y, z };
      schedule();
      queueSave();
    },
    [schedule, queueSave],
  );

  /** Zooms by `factor`, keeping the screen point (sx, sy) over the same canvas point. */
  const zoomAt = useCallback(
    (factor: number, sx: number, sy: number) => {
      const { x, y, z } = camera.current;
      const nz = clampZoom(z * factor);
      const k = nz / z;
      setCamera({ x: sx - (sx - x) * k, y: sy - (sy - y) * k, z: nz });
    },
    [setCamera],
  );

  const zoomCenter = useCallback(
    (factor: number) => {
      const shell = shellRef.current;
      if (shell) zoomAt(factor, shell.clientWidth / 2, shell.clientHeight / 2);
    },
    [zoomAt],
  );

  const bounds = useCallback((only?: string[]) => {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const [id, p] of positions.current) {
      if (only && !only.includes(id)) continue;
      const size = sizes.current.get(id);
      if (!size) continue;
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x + size.w);
      maxY = Math.max(maxY, p.y + size.h);
    }
    return Number.isFinite(minX) ? { minX, minY, maxX, maxY } : null;
  }, []);

  const fit = useCallback(
    (only?: string[], maxZoom = 1) => {
      const shell = shellRef.current;
      const b = bounds(only);
      if (!shell || !b) return;
      const w = shell.clientWidth - FIT_PADDING * 2;
      const h = shell.clientHeight - FIT_PADDING * 2;
      const z = clampZoom(Math.min(w / (b.maxX - b.minX), h / (b.maxY - b.minY), maxZoom));
      setCamera({
        x: (shell.clientWidth - (b.maxX - b.minX) * z) / 2 - b.minX * z,
        y: (shell.clientHeight - (b.maxY - b.minY) * z) / 2 - b.minY * z,
        z,
      });
    },
    [bounds, setCamera],
  );

  const reveal = useCallback((id: string) => fit([id], 1), [fit]);

  const placeItem = useCallback((id: string) => {
    const node = nodes.current.get(id);
    const p = positions.current.get(id);
    if (node && p) node.style.transform = `translate(${p.x}px, ${p.y}px)`;
  }, []);

  // Saved layout first, then measure every item and fit once the previews have laid out.
  useEffect(() => {
    const saved = loadLayout(ids);
    for (const [id, p] of Object.entries(saved.positions)) positions.current.set(id, p);
    for (const id of ids) placeItem(id);
    if (saved.camera) {
      camera.current = saved.camera;
      hadSavedCamera.current = true;
    }
    paint();

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const id = (entry.target as HTMLElement).dataset.canvasItem;
        if (id) {
          const el = entry.target as HTMLElement;
          sizes.current.set(id, { w: el.offsetWidth, h: el.offsetHeight });
        }
      }
    });
    for (const node of nodes.current.values()) ro.observe(node);

    let settle = 0;
    if (!hadSavedCamera.current) {
      settle = requestAnimationFrame(() => {
        settle = requestAnimationFrame(() => fit());
      });
    }
    return () => {
      ro.disconnect();
      cancelAnimationFrame(settle);
    };
  }, [ids, fit, paint, placeItem]);

  // Wheel needs a non-passive listener so it can stop the page from scrolling or zooming.
  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;
    const onWheel = (e: WheelEvent) => {
      const rect = shell.getBoundingClientRect();
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        zoomAt(Math.exp(-e.deltaY * 0.01), e.clientX - rect.left, e.clientY - rect.top);
        return;
      }
      if (scrollerFor(e.target, shell, e.deltaX, e.deltaY)) return;
      e.preventDefault();
      const { x, y, z } = camera.current;
      setCamera({ x: x - e.deltaX, y: y - e.deltaY, z });
    };
    shell.addEventListener("wheel", onWheel, { passive: false });
    return () => shell.removeEventListener("wheel", onWheel);
  }, [setCamera, zoomAt]);

  // Space arms panning anywhere, unless a control or field has focus. Held keys clear when the window loses focus.
  useEffect(() => {
    const clear = () => {
      spaceHeld.current = false;
      shellRef.current?.removeAttribute("data-space");
    };
    const down = (e: KeyboardEvent) => {
      if (e.code !== "Space" || e.repeat || ownsSpace(document.activeElement)) return;
      spaceHeld.current = true;
      shellRef.current?.setAttribute("data-space", "");
      e.preventDefault();
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === "Space") clear();
    };
    const hidden = () => {
      if (document.hidden) clear();
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", clear);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", clear);
      document.removeEventListener("visibilitychange", hidden);
    };
  }, []);

  // No horizontal overscroll while the canvas is open, so a sideways trackpad pan never swipes back in history.
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const before = [html.style.overscrollBehaviorX, body.style.overscrollBehaviorX];
    html.style.overscrollBehaviorX = "none";
    body.style.overscrollBehaviorX = "none";
    window.addEventListener("pagehide", flushSave);
    return () => {
      html.style.overscrollBehaviorX = before[0];
      body.style.overscrollBehaviorX = before[1];
      window.removeEventListener("pagehide", flushSave);
      if (saveTimer.current) flushSave();
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, [flushSave]);

  const endGesture = useCallback(() => {
    const g = gesture.current;
    gesture.current = null;
    if (g?.kind === "move" || g?.kind === "pan" || g?.kind === "pinch") queueSave();
  }, [queueSave]);

  const startPan = (e: React.PointerEvent) => {
    gesture.current = {
      kind: "pan",
      pointerId: e.pointerId,
      lastX: e.clientX,
      lastY: e.clientY,
      moved: false,
    };
    shellRef.current?.setPointerCapture(e.pointerId);
  };

  const onPointerDownCapture = (e: React.PointerEvent) => {
    if (e.pointerType === "touch") {
      touches.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (touches.current.size === 2) {
        const [a, b] = [...touches.current.values()];
        gesture.current = {
          kind: "pinch",
          last: {
            cx: (a.x + b.x) / 2,
            cy: (a.y + b.y) / 2,
            dist: Math.hypot(a.x - b.x, a.y - b.y),
          },
        };
      }
      return;
    }
    // Middle button, or Space with the primary button, pans from anywhere, over previews too.
    if (e.button === 1 || (e.button === 0 && spaceHeld.current)) {
      e.preventDefault();
      e.stopPropagation();
      startPan(e);
    }
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (gesture.current || e.button !== 0 || e.pointerType === "touch") return;
    if (e.target === shellRef.current || e.target === worldRef.current) startPan(e);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const g = gesture.current;
    if (e.pointerType === "touch" && touches.current.has(e.pointerId)) {
      touches.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (g?.kind === "pinch" && touches.current.size === 2) {
        const rect = shellRef.current!.getBoundingClientRect();
        const [a, b] = [...touches.current.values()];
        const now = {
          cx: (a.x + b.x) / 2,
          cy: (a.y + b.y) / 2,
          dist: Math.hypot(a.x - b.x, a.y - b.y),
        };
        const { x, y, z } = camera.current;
        camera.current = { x: x + now.cx - g.last.cx, y: y + now.cy - g.last.cy, z };
        if (g.last.dist > 0) zoomAt(now.dist / g.last.dist, now.cx - rect.left, now.cy - rect.top);
        else schedule();
        g.last = now;
      }
      return;
    }
    if (!g || g.kind === "pinch" || g.pointerId !== e.pointerId) return;
    if (g.kind === "pan") {
      const dx = e.clientX - g.lastX;
      const dy = e.clientY - g.lastY;
      if (Math.abs(dx) + Math.abs(dy) > DRAG_SLOP) g.moved = true;
      g.lastX = e.clientX;
      g.lastY = e.clientY;
      const { x, y, z } = camera.current;
      setCamera({ x: x + dx, y: y + dy, z });
      return;
    }
    const z = camera.current.z;
    const next = {
      x: g.from.x + (e.clientX - g.startX) / z,
      y: g.from.y + (e.clientY - g.startY) / z,
    };
    positions.current.set(g.id, next);
    const node = nodes.current.get(g.id);
    if (node) node.style.transform = `translate(${next.x}px, ${next.y}px)`;
  };

  const onPointerEnd = (e: React.PointerEvent) => {
    if (e.pointerType === "touch") {
      touches.current.delete(e.pointerId);
      if (gesture.current?.kind === "pinch" && touches.current.size < 2) endGesture();
      return;
    }
    const g = gesture.current;
    if (!g || g.kind === "pinch" || g.pointerId !== e.pointerId) return;
    // After a pan, the release must not click, copy or follow a link.
    if (e.type === "pointerup" && g.kind === "pan" && g.moved) suppressClick.current = true;
    if (shellRef.current?.hasPointerCapture(e.pointerId))
      shellRef.current.releasePointerCapture(e.pointerId);
    endGesture();
  };

  const onClickCapture = (e: React.MouseEvent) => {
    if (suppressClick.current) {
      suppressClick.current = false;
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    // Links never navigate away from the canvas. A link to `#item-<id>` shows that preview instead.
    const link = (e.target as Element).closest("a[href]");
    if (!link) return;
    e.preventDefault();
    const href = link.getAttribute("href") ?? "";
    const target = href.startsWith("#item-") ? href.slice(6) : null;
    if (target && ids.has(target)) reveal(target);
    else setNotice(`Links are off on the canvas (${href}).`);
  };

  const onAuxClick = (e: React.MouseEvent) => {
    // Middle-click is a pan here, never autoscroll or open-in-new-tab.
    if (e.button === 1) e.preventDefault();
  };

  const onShellKeyDown = (e: React.KeyboardEvent) => {
    if (e.target !== shellRef.current) return;
    const { x, y, z } = camera.current;
    const keys: Record<string, () => void> = {
      ArrowLeft: () => setCamera({ x: x + KEY_PAN, y, z }),
      ArrowRight: () => setCamera({ x: x - KEY_PAN, y, z }),
      ArrowUp: () => setCamera({ x, y: y + KEY_PAN, z }),
      ArrowDown: () => setCamera({ x, y: y - KEY_PAN, z }),
      "+": () => zoomCenter(1.2),
      "=": () => zoomCenter(1.2),
      "-": () => zoomCenter(1 / 1.2),
      "0": () => setCamera(DEFAULT_CAMERA),
      "1": () => fit(),
    };
    const run = keys[e.key];
    if (run) {
      e.preventDefault();
      run();
    }
  };

  const startMove = useCallback((id: string, e: React.PointerEvent) => {
    if (e.button !== 0 || spaceHeld.current) return;
    e.preventDefault();
    e.stopPropagation();
    gesture.current = {
      kind: "move",
      pointerId: e.pointerId,
      id,
      startX: e.clientX,
      startY: e.clientY,
      from: { ...positions.current.get(id)! },
    };
    shellRef.current?.setPointerCapture(e.pointerId);
  }, []);

  const nudge = useCallback(
    (id: string, dx: number, dy: number) => {
      const p = positions.current.get(id)!;
      positions.current.set(id, { x: p.x + dx, y: p.y + dy });
      placeItem(id);
      queueSave();
    },
    [placeItem, queueSave],
  );

  // Keyboard focus that lands offscreen pulls the camera to it, since the page itself never scrolls.
  const onFocusCapture = (e: React.FocusEvent) => {
    const shell = shellRef.current;
    const item = (e.target as Element).closest<HTMLElement>("[data-canvas-item]");
    if (!shell || !item || e.target === shell) return;
    shell.scrollTop = 0;
    shell.scrollLeft = 0;
    const r = (e.target as Element).getBoundingClientRect();
    const s = shell.getBoundingClientRect();
    if (r.right < s.left || r.left > s.right || r.bottom < s.top || r.top > s.bottom) {
      const { x, y, z } = camera.current;
      setCamera({
        x: x + (s.left + s.width / 2 - (r.left + r.width / 2)),
        y: y + (s.top + s.height / 2 - (r.top + r.height / 2)),
        z,
      });
    }
  };

  // Re-placed from the live position on every attach, so a re-render never snaps an item back to its source spot.
  const register = useCallback(
    (id: string, node: HTMLDivElement | null) => {
      if (!node) return void nodes.current.delete(id);
      nodes.current.set(id, node);
      placeItem(id);
    },
    [placeItem],
  );

  return (
    <TooltipProvider>
      <div className="fixed inset-0 bg-page">
        <h1 className="sr-only">{title}</h1>
        <p id={helpId} className="sr-only">
          Canvas. Arrow keys pan, plus and minus zoom, 1 fits everything, 0 resets the view. Hold
          Space and drag, or drag with the middle button, to pan over previews.
        </p>
        <p id={moveHelpId} className="sr-only">
          Drag to move this preview, or use the arrow keys. Hold Shift to move further.
        </p>
        <div
          ref={shellRef}
          tabIndex={0}
          role="application"
          aria-describedby={helpId}
          className="absolute inset-0 cursor-default touch-pan-x touch-pan-y overflow-hidden overscroll-none outline-none focus-visible:focus-ring-inset data-space:cursor-grab"
          onPointerDownCapture={onPointerDownCapture}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
          onLostPointerCapture={onPointerEnd}
          onClickCapture={onClickCapture}
          onAuxClick={onAuxClick}
          onKeyDown={onShellKeyDown}
          onFocusCapture={onFocusCapture}
        >
          <div ref={worldRef} className="absolute top-0 left-0 origin-top-left">
            {items.map((item) => (
              <CanvasEntry
                key={item.id}
                item={item}
                register={register}
                onMoveStart={startMove}
                onNudge={nudge}
                moveHelpId={moveHelpId}
              />
            ))}
          </div>
        </div>
        <div
          className="absolute right-4 bottom-4 flex items-center gap-2"
          aria-label="Canvas view"
          role="toolbar"
        >
          <span aria-live="polite" className="type-body-sm text-text-2">
            {notice}
          </span>
          <Button
            variant="secondary"
            size="icon"
            aria-label="Zoom out"
            onClick={() => zoomCenter(1 / 1.2)}
          >
            <MinusIcon aria-hidden="true" />
          </Button>
          <span
            ref={zoomTextRef}
            className="type-label text-text-2 tabular-nums"
            aria-label="Zoom level"
          >
            50%
          </span>
          <Button
            variant="secondary"
            size="icon"
            aria-label="Zoom in"
            onClick={() => zoomCenter(1.2)}
          >
            <PlusIcon aria-hidden="true" />
          </Button>
          <Button variant="secondary" size="icon" aria-label="Fit everything" onClick={() => fit()}>
            <CornersOutIcon aria-hidden="true" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            aria-label="Reset the view"
            onClick={() => setCamera(DEFAULT_CAMERA)}
          >
            <ArrowCounterClockwiseIcon aria-hidden="true" />
          </Button>
          <ThemeToggle />
        </div>
        <p className="absolute bottom-4 left-4 hidden type-body-sm text-text-3 md:block">
          <Kbd>Space</Kbd> + drag to pan · <Kbd>Ctrl</Kbd> + scroll to zoom · click a name to copy
          it
        </p>
      </div>
    </TooltipProvider>
  );
}

type EntryProps = {
  item: CanvasItem;
  register: (id: string, node: HTMLDivElement | null) => void;
  onMoveStart: (id: string, e: React.PointerEvent) => void;
  onNudge: (id: string, dx: number, dy: number) => void;
  moveHelpId: string;
};

/** One preview: its copyable name and move handle above it, then the live content at its own size. */
const CanvasEntry = memo(function CanvasEntry({
  item,
  register,
  onMoveStart,
  onNudge,
  moveHelpId,
}: EntryProps) {
  const { id, name, width, height, render } = item;
  const [copy, setCopy] = useState<"idle" | "copied" | "manual">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const manualRef = useRef<HTMLInputElement>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  useEffect(() => {
    if (copy === "manual") manualRef.current?.select();
  }, [copy]);

  const copyName = () => {
    const done = () => {
      setCopy("copied");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopy("idle"), 1500);
    };
    if (!navigator.clipboard?.writeText) {
      setCopy("manual");
      return;
    }
    navigator.clipboard.writeText(name).then(done, () => setCopy("manual"));
  };

  const onHandleKey = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? MOVE_STEP * 5 : MOVE_STEP;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const move = moves[e.key];
    if (!move) return;
    e.preventDefault();
    e.stopPropagation();
    onNudge(id, move[0], move[1]);
  };

  return (
    <div
      ref={(node) => register(id, node)}
      data-canvas-item={id}
      id={`item-${id}`}
      className="absolute top-0 left-0 flex flex-col gap-2"
    >
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label={`Move ${name}`}
          aria-describedby={moveHelpId}
          className="flex size-8 cursor-default touch-none items-center justify-center rounded-soft text-text-3 hover:bg-hover hover:text-text-1 focus-visible:focus-ring"
          onPointerDown={(e) => onMoveStart(id, e)}
          onKeyDown={onHandleKey}
        >
          <DotsSixVerticalIcon aria-hidden="true" className="size-5" />
        </button>
        {copy === "manual" ? (
          <input
            ref={manualRef}
            readOnly
            value={name}
            aria-label="Name to copy"
            onBlur={() => setCopy("idle")}
            className="bg-transparent type-heading-sm text-text-1 outline-none focus-visible:focus-ring"
          />
        ) : (
          <button
            type="button"
            title="Copy this name"
            className="cursor-default rounded-soft px-1 text-start type-heading-sm text-text-1 hover:text-text-2 focus-visible:focus-ring"
            onClick={copyName}
          >
            {name}
          </button>
        )}
        <span aria-live="polite" className="type-label-sm text-text-3">
          {copy === "copied" ? "Copied" : ""}
        </span>
      </div>
      <div
        ref={(node) => {
          if (node) {
            node.style.width = `${width}px`;
            node.style.height = `${height}px`;
          }
        }}
        className="overflow-auto rounded-soft border border-hair bg-background"
      >
        {render()}
      </div>
    </div>
  );
});
