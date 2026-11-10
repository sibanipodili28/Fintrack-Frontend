import '@testing-library/jest-dom/vitest';

// jsdom has no ResizeObserver, which Recharts' ResponsiveContainer needs. Real browsers do.
class ResizeObserverStub {
  observe() { /* no-op */ }
  unobserve() { /* no-op */ }
  disconnect() { /* no-op */ }
}
(globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = ResizeObserverStub;
