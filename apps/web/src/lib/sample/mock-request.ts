// Stands in for an API call in the UI mocks, so toasts and pending states behave as they will.
// TODO(zia): delete once each caller calls its real route.
export function mockRequest<T>(value: T, delayMs = 700): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), delayMs));
}
