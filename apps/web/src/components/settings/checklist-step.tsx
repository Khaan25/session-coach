import { SectionHeader } from "@/components/setup/section-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

/**
 * One section of /settings: a header row with its title, a Set or Check this badge and what it changes in the review
 * loop, over one frame that holds the control.
 *
 * @param title - The section's name, rendered as its h2.
 * @param changes - What this setting changes, in a sentence.
 * @param done - Set (true) or Check this (false); undefined shows no badge, for a section the page can't judge.
 * @param children - The control: fields, a list or a link.
 */
export function ChecklistStep({
  title,
  changes,
  done,
  children,
}: {
  title: string;
  changes: React.ReactNode;
  done?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <SectionHeader
        title={title}
        description={changes}
        meta={
          done !== undefined && (
            <Badge variant={done ? "success" : "outline"}>{done ? "Set" : "Check this"}</Badge>
          )
        }
      />
      <Card>
        <CardContent>{children}</CardContent>
      </Card>
    </section>
  );
}
