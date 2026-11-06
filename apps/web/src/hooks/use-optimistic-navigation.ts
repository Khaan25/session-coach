import { useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";

/**
 * The current item of a group of links (tabs, sidebar rows) that turns current on click, not when the new page lands.
 * Pass `navigate(value, href)` to `<Link onNavigate>`: it runs the router's push inside a transition, so `current` is
 * the clicked item and `pending` is true until the new page renders. Then both follow `actual` again, also when the
 * navigation fails.
 *
 * @param actual - The item the rendered page is for, such as the pathname or the `?repo=` filter.
 */
export function useOptimisticNavigation<T>(actual: T) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [current, setCurrent] = useOptimistic(actual);
  const navigate = (value: T, href: string) => (event: { preventDefault: () => void }) => {
    event.preventDefault();
    startTransition(() => {
      setCurrent(value);
      router.push(href);
    });
  };
  return { current, pending, navigate };
}
