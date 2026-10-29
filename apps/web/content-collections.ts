import { defineCollection, defineConfig } from "@content-collections/core";
import { compileMarkdown } from "@content-collections/markdown";
import { z } from "zod";

// Legal pages are Markdown in content/legal, validated here and compiled to HTML at build time,
// so /privacy and /terms stay static. `slug` is the file name: privacy.md is /privacy.
const legal = defineCollection({
  name: "legal",
  directory: "content/legal",
  include: "*.md",
  schema: z.object({
    title: z.string(),
    description: z.string(),
    // ISO date of the last change, shown on the page.
    updated: z.iso.date(),
    // A draft shows the "Draft: not legal advice" notice until a person reviews it.
    draft: z.boolean(),
    content: z.string(),
  }),
  transform: async (document, context) => ({
    ...document,
    slug: document._meta.path,
    html: await compileMarkdown(context, document),
  }),
});

export default defineConfig({
  content: [legal],
});
