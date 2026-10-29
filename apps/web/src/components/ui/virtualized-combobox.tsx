"use client";

import * as React from "react";
import { Combobox as ComboboxPrimitive } from "@base-ui/react/combobox";
import { useVirtualizer, type VirtualItem } from "@tanstack/react-virtual";
import { cn } from "cn";

import { ComboboxItem, listMaxHeightClass } from "@/components/ui/combobox";

/*
 * Externally virtualized list parts for `Combobox`.
 *
 * Base UI does not virtualize; it exposes `virtualized` on the root, which stops
 * it assuming every item is mounted, and leaves the windowing to the caller.
 * These parts are that caller, written once, because the fiddly half is not the
 * windowing - it is the two places where the two libraries have to agree:
 *
 * 1. Filtering stays Base UI's. `useFilteredItems` is read here rather than the
 *    caller passing a filtered array, so the query in the input and the rows on
 *    screen cannot drift apart.
 * 2. Scrolling the highlighted row into view stops working when the target row
 *    is unmounted, so `useComboboxVirtualizer` puts that back - see the note on
 *    the handler for which cases actually need it.
 *
 * Use this only when the list is genuinely long. Up to roughly a thousand rows,
 * `React.memo` on the item component is the cheaper answer and keeps the plain
 * `ComboboxList`; virtualization is what keeps *opening* the popup fast once the
 * mount cost of the full list dominates.
 */

type Virtualizer = ReturnType<typeof useVirtualizer<HTMLDivElement, Element>>;

/** ComboboxItem's own min height (menu-item's --row-sm), so the first paint lands on the measured height. */
const DEFAULT_ITEM_SIZE = 32;

/** ComboboxList's `p-1`, moved into the virtualizer since it owns the scroll box. */
const LIST_PADDING = 4;

type ComboboxVirtualizerContextValue = {
  /** The virtualizer's callback ref, which measures each row as it mounts. */
  measureElement: Virtualizer["measureElement"];
  /** Filtered length, not total: it is what `aria-setsize` has to report. */
  count: number;
};

const ComboboxVirtualizerContext = React.createContext<ComboboxVirtualizerContextValue | null>(
  null,
);

/**
 * Owns the virtualizer handle and the highlight/scroll bridge back to Base UI.
 * Spread `onItemHighlighted` onto `Combobox` and pass `virtualizerRef` to
 * `ComboboxVirtualizedList`.
 */
function useComboboxVirtualizer() {
  const virtualizerRef = React.useRef<Virtualizer | null>(null);

  /*
   * Base UI scrolls the highlighted item into view by calling `scrollIntoView`
   * on its element, which a windowed list has usually unmounted. Deferring to
   * the virtualizer for every highlight would fight its own pointer/keyboard
   * scrolling, so this only covers the two cases where the target is reliably
   * outside the rendered window: `none` (the programmatic jump to the selected
   * item when the popup opens) and keyboard wrap-around at either end.
   *
   * The microtask matters - the virtualizer has to see the new count/offsets
   * from this render before it is asked to scroll.
   */
  const onItemHighlighted = React.useCallback(
    (item: unknown, { reason, index }: ComboboxPrimitive.Root.HighlightEventDetails) => {
      const virtualizer = virtualizerRef.current;

      if (!item || !virtualizer) {
        return;
      }

      const isStart = index === 0;
      const isEnd = index === virtualizer.options.count - 1;
      const shouldScroll = reason === "none" || (reason === "keyboard" && (isStart || isEnd));

      if (!shouldScroll) {
        return;
      }

      queueMicrotask(() => {
        virtualizer.scrollToIndex(index, { align: isEnd ? "start" : "end" });
      });
    },
    [],
  );

  return { virtualizerRef, onItemHighlighted };
}

type ComboboxVirtualizedListProps<Item> = {
  /**
   * The popup's open state. The virtualizer measures nothing while closed, so
   * the root has to be controlled for this to work.
   */
  open: boolean;
  /** From `useComboboxVirtualizer`. */
  virtualizerRef: React.RefObject<Virtualizer | null>;
  /** Estimated row height in px, before measurement. */
  estimateSize?: number;
  /** Rows kept mounted beyond the viewport, each side. */
  overscan?: number;
  /** Applied to the scroll container. */
  className?: string;
  /** Renders one row; return a `ComboboxVirtualizedItem`. */
  children: (item: Item, virtualItem: VirtualItem) => React.ReactNode;
};

function ComboboxVirtualizedList<Item>({
  open,
  virtualizerRef,
  estimateSize = DEFAULT_ITEM_SIZE,
  overscan = 20,
  className,
  children,
}: ComboboxVirtualizedListProps<Item>) {
  const filteredItems = ComboboxPrimitive.useFilteredItems<Item>();
  const scrollElementRef = React.useRef<HTMLDivElement | null>(null);

  const virtualizer = useVirtualizer({
    enabled: open,
    count: filteredItems.length,
    getScrollElement: () => scrollElementRef.current,
    estimateSize: () => estimateSize,
    overscan,
    paddingStart: LIST_PADDING,
    paddingEnd: LIST_PADDING,
    scrollPaddingStart: LIST_PADDING,
    scrollPaddingEnd: LIST_PADDING,
  });

  React.useImperativeHandle(virtualizerRef, () => virtualizer);

  // The popup mounts on open, so the scroll box is new every time and the
  // sizes measured against the previous one are stale.
  const handleScrollElementRef = React.useCallback(
    (element: HTMLDivElement | null) => {
      scrollElementRef.current = element;

      if (element) {
        virtualizer.measure();
      }
    },
    [virtualizer],
  );

  const totalSize = virtualizer.getTotalSize();

  const contextValue = React.useMemo(
    () => ({ measureElement: virtualizer.measureElement, count: filteredItems.length }),
    [virtualizer, filteredItems.length],
  );

  // Base UI still sets `data-empty` on the popup from its own filtering, so
  // ComboboxEmpty covers the no-results state and this renders nothing.
  if (filteredItems.length === 0) {
    return null;
  }

  return (
    <ComboboxPrimitive.List data-slot="combobox-list" className="p-0">
      <div
        role="presentation"
        ref={handleScrollElementRef}
        /*
         * Shrinks to the content until it hits ComboboxList's ceiling, so a
         * three-result search is not a mostly-empty 320px box. The scrollbar
         * is left visible on purpose: it is the only cue to how deep a list
         * this long goes.
         */
        className={cn(
          "h-(--total-size) scroll-fade-y overflow-y-auto overscroll-contain px-1",
          listMaxHeightClass,
          className,
        )}
        style={{ "--total-size": `${totalSize}px` } as React.CSSProperties}
      >
        <div role="presentation" className="relative h-(--total-size) w-full">
          <ComboboxVirtualizerContext.Provider value={contextValue}>
            {virtualizer.getVirtualItems().map((virtualItem) => {
              const item = filteredItems[virtualItem.index];

              return item === undefined ? null : children(item, virtualItem);
            })}
          </ComboboxVirtualizerContext.Provider>
        </div>
      </div>
    </ComboboxPrimitive.List>
  );
}

function ComboboxVirtualizedItem({
  virtualItem,
  className,
  style,
  ...props
}: Omit<ComboboxPrimitive.Item.Props, "className" | "style"> & {
  className?: string;
  style?: React.CSSProperties;
  virtualItem: VirtualItem;
}) {
  const context = React.useContext(ComboboxVirtualizerContext);

  if (!context) {
    throw new Error("ComboboxVirtualizedItem must be rendered inside ComboboxVirtualizedList.");
  }

  const { measureElement, count } = context;

  return (
    <ComboboxItem
      data-slot="combobox-virtualized-item"
      data-index={virtualItem.index}
      index={virtualItem.index}
      ref={measureElement}
      /*
       * Only the windowed rows are in the DOM, so a screen reader would
       * otherwise announce "1 of 12" against a list of ten thousand.
       */
      aria-setsize={count}
      aria-posinset={virtualItem.index + 1}
      className={cn(
        "absolute inset-x-0 top-0 h-(--item-size) translate-y-(--item-start)",
        className,
      )}
      style={
        {
          "--item-size": `${virtualItem.size}px`,
          "--item-start": `${virtualItem.start}px`,
          ...style,
        } as React.CSSProperties
      }
      {...props}
    />
  );
}

export { ComboboxVirtualizedItem, ComboboxVirtualizedList, useComboboxVirtualizer };
