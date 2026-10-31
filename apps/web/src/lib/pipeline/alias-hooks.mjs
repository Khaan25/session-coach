// Node resolve hook for run-extract.ts: maps the app's `@/x` alias to `src/x.ts`, so call-model.ts loads outside Next.

const SRC = new URL("../../", import.meta.url);

export function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    return nextResolve(new URL(`${specifier.slice(2)}.ts`, SRC).href, context);
  }
  return nextResolve(specifier, context);
}
