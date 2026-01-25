import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useLocalStorage } from "@/hooks/useLocalStorage";

describe("useLocalStorage", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("should return initial value when localStorage is empty", () => {
    const { result } = renderHook(() => useLocalStorage("testKey", "initialValue"));
    const [value] = result.current;
    expect(value).toBe("initialValue");
  });

  it("should set value in localStorage", () => {
    const { result } = renderHook(() => useLocalStorage("testKey", "initial"));

    act(() => {
      const [, setValue] = result.current;
      setValue("newValue");
    });

    const [value] = result.current;
    expect(value).toBe("newValue");
    expect(localStorage.getItem("testKey")).toBe(JSON.stringify("newValue"));
  });

  it("should retrieve existing value from localStorage", () => {
    localStorage.setItem("existingKey", JSON.stringify("existingValue"));

    const { result } = renderHook(() => useLocalStorage("existingKey", "initial"));
    const [value] = result.current;

    expect(value).toBe("existingValue");
  });

  it("should handle objects", () => {
    const obj = { name: "John", age: 30 };
    const { result } = renderHook(() => useLocalStorage("userKey", obj));

    act(() => {
      const [, setValue] = result.current;
      setValue({ name: "Jane", age: 25 });
    });

    const [value] = result.current;
    expect(value).toEqual({ name: "Jane", age: 25 });
  });

  it("should handle arrays", () => {
    const { result } = renderHook(() => useLocalStorage<number[]>("arrayKey", []));

    act(() => {
      const [, setValue] = result.current;
      setValue([1, 2, 3]);
    });

    const [value] = result.current;
    expect(value).toEqual([1, 2, 3]);
  });

  it("should handle function updates", () => {
    const { result } = renderHook(() => useLocalStorage("counter", 0));

    act(() => {
      const [, setValue] = result.current;
      setValue((prev) => prev + 1);
    });

    expect(result.current[0]).toBe(1);

    act(() => {
      const [, setValue] = result.current;
      setValue((prev) => prev + 5);
    });

    expect(result.current[0]).toBe(6);
  });

  it("should remove value from localStorage", () => {
    localStorage.setItem("testKey", JSON.stringify("value"));
    const { result } = renderHook(() => useLocalStorage("testKey", "initial"));

    act(() => {
      const [, , removeValue] = result.current;
      removeValue();
    });

    const [value] = result.current;
    expect(value).toBe("initial");
    expect(localStorage.getItem("testKey")).toBeNull();
  });

  it("should handle corrupted localStorage data", () => {
    localStorage.setItem("corruptedKey", "not valid JSON");
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { result } = renderHook(() => useLocalStorage("corruptedKey", "fallback"));
    const [value] = result.current;

    expect(value).toBe("fallback");
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it("should handle null values", () => {
    const { result } = renderHook(() => useLocalStorage<string | null>("nullKey", null));

    act(() => {
      const [, setValue] = result.current;
      setValue("notNull");
    });

    expect(result.current[0]).toBe("notNull");

    act(() => {
      const [, setValue] = result.current;
      setValue(null);
    });

    expect(result.current[0]).toBe(null);
  });

  it("should handle boolean values", () => {
    const { result } = renderHook(() => useLocalStorage("boolKey", false));

    act(() => {
      const [, setValue] = result.current;
      setValue(true);
    });

    expect(result.current[0]).toBe(true);
    expect(localStorage.getItem("boolKey")).toBe("true");
  });

  it("should handle number values", () => {
    const { result } = renderHook(() => useLocalStorage("numberKey", 0));

    act(() => {
      const [, setValue] = result.current;
      setValue(42);
    });

    expect(result.current[0]).toBe(42);
  });

  it("should persist across re-renders", () => {
    const { result, rerender } = renderHook(() => useLocalStorage("persistKey", "initial"));

    act(() => {
      const [, setValue] = result.current;
      setValue("updated");
    });

    rerender();

    expect(result.current[0]).toBe("updated");
  });

  it("should sync across multiple hook instances", () => {
    const { result: result1 } = renderHook(() => useLocalStorage("sharedKey", "initial"));
    const { result: result2 } = renderHook(() => useLocalStorage("sharedKey", "initial"));

    act(() => {
      const [, setValue] = result1.current;
      setValue("synchronized");
    });

    // Both should have the same value
    expect(result1.current[0]).toBe("synchronized");
    expect(result2.current[0]).toBe("synchronized");
  });

  it("should handle storage events from other tabs", () => {
    const { result } = renderHook(() => useLocalStorage("tabKey", "initial"));

    // Simulate storage event from another tab
    act(() => {
      const storageEvent = new StorageEvent("storage", {
        key: "tabKey",
        newValue: JSON.stringify("fromOtherTab"),
      });
      window.dispatchEvent(storageEvent);
    });

    expect(result.current[0]).toBe("fromOtherTab");
  });

  it("should ignore storage events for different keys", () => {
    const { result } = renderHook(() => useLocalStorage("myKey", "initial"));

    act(() => {
      const storageEvent = new StorageEvent("storage", {
        key: "differentKey",
        newValue: JSON.stringify("shouldIgnore"),
      });
      window.dispatchEvent(storageEvent);
    });

    expect(result.current[0]).toBe("initial");
  });

  it("should cleanup event listeners on unmount", () => {
    const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");
    const { unmount } = renderHook(() => useLocalStorage("cleanupKey", "initial"));

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith("storage", expect.any(Function));
    removeEventListenerSpy.mockRestore();
  });

  it("should handle complex nested objects", () => {
    const complexObj = {
      user: {
        name: "John",
        preferences: {
          theme: "dark",
          notifications: true,
        },
      },
      items: [1, 2, 3],
    };

    const { result } = renderHook(() => useLocalStorage("complexKey", complexObj));

    act(() => {
      const [, setValue] = result.current;
      setValue({
        user: {
          name: "Jane",
          preferences: {
            theme: "light",
            notifications: false,
          },
        },
        items: [4, 5, 6],
      });
    });

    expect(result.current[0]).toEqual({
      user: {
        name: "Jane",
        preferences: {
          theme: "light",
          notifications: false,
        },
      },
      items: [4, 5, 6],
    });
  });

  it("should return initial value in SSR environment", () => {
    const originalWindow = global.window;
    // @ts-expect-error -- Mocking global window deletion for SSR test
    delete global.window;

    const { result } = renderHook(() => useLocalStorage("ssrKey", "ssrDefault"));

    expect(result.current[0]).toBe("ssrDefault");

    // Restore window
    global.window = originalWindow;
  });
});
