import { Collapsible, CollapsibleContent, CollapsibleRow } from "@/components/ui/collapsible";

/** A closed disclosure under a dashboard block that explains the block in a line or two. Costs nothing once learned. */
export function WhatsThis({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Collapsible>
      <CollapsibleRow size="sm">{label}</CollapsibleRow>
      <CollapsibleContent>
        <p className="px-2 pt-2 type-body-sm text-text-2">{children}</p>
      </CollapsibleContent>
    </Collapsible>
  );
}
