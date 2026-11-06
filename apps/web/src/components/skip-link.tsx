/** The first tab stop on a page with a nav: jumps keyboard users past it to the `<main id="main">` of the layout. */
export function SkipLink() {
  return (
    <a
      href="#main"
      className="frame sr-only rounded-soft bg-page type-body text-text-1 focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-(--z-overlay) focus:px-3 focus:py-2"
    >
      Skip to content
    </a>
  );
}
