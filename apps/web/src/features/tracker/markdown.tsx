import { cn } from "cn";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Tracker notes in Markdown (GitHub flavour, for tables). Styled here rather than through the shared Prose, so the
// tracker stays removable in one folder: body text, code blocks in a well, tables that scroll sideways on a phone.
// data-prose keeps the design system's link underline (base.css).
const markdownClass = cn(
  "type-body text-text-2",
  "[&_h2]:mt-6 [&_h2]:mb-2 [&_h2]:type-heading-sm [&_h2]:text-text-1 [&_h2:first-child]:mt-0",
  "[&_p]:my-3 [&_strong]:font-medium [&_strong]:text-text-1",
  "[&_li]:ps-1 [&_li]:marker:text-text-3 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:ps-6 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:ps-6",
  "[&_code]:rounded-inner [&_code]:bg-well [&_code]:px-1 [&_code]:type-code-sm [&_code]:text-text-1",
  "[&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:rounded-soft [&_pre]:bg-well [&_pre]:p-3 [&_pre_code]:bg-transparent [&_pre_code]:p-0",
  "[&_table]:my-3 [&_table]:block [&_table]:overflow-x-auto [&_td]:px-3 [&_td]:py-2 [&_td]:align-top",
  "[&_th]:px-3 [&_th]:py-2 [&_th]:text-start [&_th]:type-label [&_th]:text-text-1",
  "[&_tbody_tr]:border-t [&_tbody_tr]:border-line-row",
);

export function Markdown({ children }: { children: string }) {
  return (
    <div data-prose="" className={markdownClass}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}
