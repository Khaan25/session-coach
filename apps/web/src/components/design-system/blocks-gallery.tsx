import { DecisionSearchBlock } from "./blocks/decision-search-block";
import { DialogPatternsBlock } from "./blocks/dialog-patterns-block";
import {
  ActivityLoadingBlock,
  RecentActivityBlock,
  ReviewPrefsBlock,
  ReviewProgressBlock,
} from "./blocks/session-blocks";
import { ToastPatternsBlock } from "./blocks/toast-patterns-block";
import { GallerySection } from "./gallery-section";

// A block is a whole card assembled from components/ui, so review catches composition problems (spacing between
// slots, label and control pairing, where the primary action sits) that one component alone never shows. Static
// data only. Copy a block into a feature and wire it up there; never import these from product code.
const BLOCKS = [
  {
    name: "Virtualized combobox",
    note: "10,000 rows, one screenful mounted.",
    Component: DecisionSearchBlock,
  },
  {
    name: "Toast patterns",
    note: "Undo, promise, dedup, stacking and placement.",
    Component: ToastPatternsBlock,
  },
  {
    name: "Dialog patterns",
    note: "Close confirmation, nesting and interior scroll.",
    Component: DialogPatternsBlock,
  },
  {
    name: "Preference list",
    note: "Label and description at the start, switch at the end.",
    Component: ReviewPrefsBlock,
  },
  {
    name: "Activity list",
    note: "Two-line rows, a trailing date, row rules.",
    Component: RecentActivityBlock,
  },
  {
    name: "Progress",
    note: "The overall meter, the steps behind it, one in trouble.",
    Component: ReviewProgressBlock,
  },
  {
    name: "Loading state",
    note: "Skeleton in the activity list's geometry.",
    Component: ActivityLoadingBlock,
  },
];

function BlocksGallery() {
  return (
    <GallerySection
      id="blocks"
      title="Blocks"
      description="Whole cards built from the components above."
    >
      <div className="grid items-start gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {BLOCKS.map(({ name, note, Component }) => (
          <section key={name} aria-label={name} className="flex flex-col gap-2">
            <div className="flex flex-col gap-0.5">
              <h3 className="type-label text-text-1">{name}</h3>
              <p className="type-body-sm text-text-2">{note}</p>
            </div>
            <Component />
          </section>
        ))}
      </div>
    </GallerySection>
  );
}

export { BlocksGallery };
