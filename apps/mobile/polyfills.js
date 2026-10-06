// Hermes (React Native) has no FinalizationRegistry. @colyseus/schema creates one at module load for a
// server-side GC backstop the client never needs, so a no-op is safe.
if (typeof globalThis.FinalizationRegistry === "undefined") {
  globalThis.FinalizationRegistry = class FinalizationRegistry {
    register() {}
    unregister() {
      return false;
    }
  };
}
