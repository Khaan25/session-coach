/**
 * Whether a Storage error means the object isn't there, as opposed to Storage failing. Storage answers a missing
 * object with HTTP 400 and `statusCode: "404"` (or 404 itself, or the `NoSuchKey` / `not_found` code), so the HTTP
 * status alone can't tell them apart.
 *
 * @param error - The `error` of a Storage call.
 */
export function isMissingObject(error: {
  status?: number;
  statusCode?: string;
  code?: string;
}): boolean {
  return (
    error.status === 404 ||
    error.statusCode === "404" ||
    error.code === "NoSuchKey" ||
    error.code === "not_found"
  );
}
