import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createSafeLocalStorageForPinia,
  isStorageQuotaError,
  resetStorageFailureSessionGateForTests,
  safeGetItem,
  safeSetItem,
  setStorageFailureHandler,
} from "~/utils/storageSafe";

describe("storageSafe", () => {
  describe("isStorageQuotaError", () => {
    it("returns true for DOMException QuotaExceededError", () => {
      const e = new DOMException("full", "QuotaExceededError");
      expect(isStorageQuotaError(e)).toBe(true);
    });

    it("returns true for Error named QuotaExceededError", () => {
      const e = new Error("x");
      e.name = "QuotaExceededError";
      expect(isStorageQuotaError(e)).toBe(true);
    });

    it("returns true when message contains QuotaExceeded", () => {
      expect(isStorageQuotaError(new Error("QuotaExceededError simulation"))).toBe(true);
    });

    it("returns false for unrelated errors", () => {
      expect(isStorageQuotaError(new Error("nope"))).toBe(false);
    });
  });

  describe("safeGetItem / safeSetItem", () => {
    it("safeGetItem returns ok false without throwing when getItem throws", () => {
      const storage = {
        getItem: () => {
          throw new Error("blocked");
        },
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
        key: vi.fn(),
        length: 0,
      } as unknown as Storage;
      const r = safeGetItem(storage, "k");
      expect(r.ok).toBe(false);
      expect(r.value).toBeNull();
      expect(r.errorCode).toBe("STORAGE_READ_FAILED");
    });

    it("safeSetItem returns quota code when setItem throws quota", () => {
      const storage = {
        getItem: vi.fn(),
        setItem: () => {
          const e = new DOMException("q", "QuotaExceededError");
          throw e;
        },
        removeItem: vi.fn(),
        clear: vi.fn(),
        key: vi.fn(),
        length: 0,
      } as unknown as Storage;
      const r = safeSetItem(storage, "k", "v");
      expect(r.ok).toBe(false);
      expect(r.errorCode).toBe("STORAGE_QUOTA_EXCEEDED");
    });
  });

  describe("createSafeLocalStorageForPinia", () => {
    beforeEach(() => {
      resetStorageFailureSessionGateForTests();
      setStorageFailureHandler(undefined);
    });

    afterEach(() => {
      vi.unstubAllGlobals();
      resetStorageFailureSessionGateForTests();
      setStorageFailureHandler(undefined);
    });

    it("setItem does not throw when localStorage throws QuotaExceededError", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const handler = vi.fn();
      setStorageFailureHandler(handler);

      const setItem = vi.fn(() => {
        const e = new DOMException("q", "QuotaExceededError");
        throw e;
      });
      const storageMock = { getItem: vi.fn(), setItem, length: 0 } as unknown as Storage;
      vi.stubGlobal("window", { localStorage: storageMock });

      const adapter = createSafeLocalStorageForPinia();
      expect(() => adapter.setItem("cladle-game-store", "{}")).not.toThrow();
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0]![0]!.code).toBe("STORAGE_QUOTA_EXCEEDED");
      warnSpy.mockRestore();
    });

    it("notifies at most once per session for multiple write failures", () => {
      vi.spyOn(console, "warn").mockImplementation(() => {});
      const handler = vi.fn();
      setStorageFailureHandler(handler);

      const setItem = vi.fn(() => {
        throw new Error("fail");
      });
      vi.stubGlobal("window", {
        localStorage: { getItem: vi.fn(), setItem, length: 0 },
      });

      const adapter = createSafeLocalStorageForPinia();
      adapter.setItem("a", "1");
      adapter.setItem("b", "2");
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });
});
