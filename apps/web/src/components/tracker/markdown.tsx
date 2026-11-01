import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { Prose } from "@/components/ui/prose";

// Tracker notes in Markdown (GitHub flavour, for tables), on the small Prose.
export function Markdown({ children }: { children: string }) {
  return (
    <Prose size="sm">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </Prose>
  );
}
