import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

/**
 * Tests for lazy loading of symptom and remedy data.
 *
 * The lazy loading hook should be importable from "../useLazyData" and expose:
 *   - useLazyData(): { index, fetchBodySystem, fetchRemedy, cache, ... }
 *
 * Behavior:
 *   - On mount, fetches only the lightweight index (symptom names + body system mapping)
 *   - Full symptom data is fetched per body-system subcategory on demand
 *   - Remedy detail is fetched per remedy on demand
 *   - Previously fetched data is cached
 */

import { useLazyData } from "../useLazyData";

// ---------- mock data ----------

const mockSymptomIndex = [
  "Abdomen, pain",
  "Abdomen, pain, burning",
  "Head, pain",
  "Head, pain, forehead",
  "Extremities, pain, foot",
];

const mockAbdomenPain = {
  "Abdomen, pain": {
    remedies: { "Acon.": 3, "Nux-v.": 2 },
  },
  "Abdomen, pain, burning": {
    remedies: { "Ars.": 3, "Bell.": 1 },
  },
};

const mockHeadPain = {
  "Head, pain": {
    remedies: { "Bell.": 3, "Bry.": 2 },
  },
  "Head, pain, forehead": {
    remedies: { "Bell.": 3, "Nat-m.": 2 },
  },
};

const mockRemedyDetail = {
  "Acon.": {
    fullName: "Aconitum Napellus",
    symptoms: ["Abdomen, pain", "Head, pain"],
    totalScore: 5202,
  },
};

const mockRemedyIndex = {
  "Acon.": "Aconitum Napellus",
  "Ars.": "Arsenicum Album",
  "Bell.": "Belladonna",
  "Bry.": "Bryonia Alba",
  "Nux-v.": "Nux Vomica",
  "Nat-m.": "Natrum Muriaticum",
};

// ---------- fetch tracking ----------

let fetchCalls: string[] = [];
const originalFetch = global.fetch;

function mockFetch(url: string): Promise<Response> {
  fetchCalls.push(url);

  let data: unknown;

  if (url.includes("symptoms/index.json")) {
    data = mockSymptomIndex;
  } else if (url.includes("remedies/index.json")) {
    data = mockRemedyIndex;
  } else if (url.includes("symptoms/abdomen/pain.json") || url.includes("symptoms/Abdomen/pain.json")) {
    data = mockAbdomenPain;
  } else if (url.includes("symptoms/head/pain.json") || url.includes("symptoms/Head/pain.json")) {
    data = mockHeadPain;
  } else if (url.includes("remedies/") && url.includes("Acon")) {
    data = mockRemedyDetail;
  } else {
    return Promise.resolve(new Response(JSON.stringify({}), { status: 404 }));
  }

  return Promise.resolve(
    new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  );
}

// ---------- setup ----------

beforeEach(() => {
  fetchCalls = [];
  global.fetch = vi.fn(mockFetch) as unknown as typeof fetch;
});

afterEach(() => {
  global.fetch = originalFetch;
  vi.restoreAllMocks();
});

// ---------- tests ----------

describe("Lazy loading", () => {
  // 1. Initial page load fetches only index, not full data
  it("fetches only index files on initial load", async () => {
    const { result } = renderHook(() => useLazyData());

    await waitFor(() => {
      expect(result.current.indexLoaded).toBe(true);
    });

    // Should have fetched index files
    const indexFetches = fetchCalls.filter(
      (url) => url.includes("index.json")
    );
    expect(indexFetches.length).toBeGreaterThan(0);

    // Should NOT have fetched full symptom files
    const symptomDataFetches = fetchCalls.filter(
      (url) =>
        url.includes("symptoms/") &&
        !url.includes("index.json")
    );
    expect(symptomDataFetches).toHaveLength(0);

    // Should NOT have fetched individual remedy files
    const remedyDataFetches = fetchCalls.filter(
      (url) =>
        url.includes("remedies/") &&
        !url.includes("index.json")
    );
    expect(remedyDataFetches).toHaveLength(0);
  });

  // 2. Selecting a symptom triggers fetch for body system subcategory
  it("fetches body system subcategory when symptom selected", async () => {
    const { result } = renderHook(() => useLazyData());

    await waitFor(() => {
      expect(result.current.indexLoaded).toBe(true);
    });

    fetchCalls = []; // Reset to track only new fetches

    await act(async () => {
      await result.current.fetchBodySystem("Abdomen", "pain");
    });

    const abdomenFetches = fetchCalls.filter((url) =>
      url.toLowerCase().includes("abdomen")
    );
    expect(abdomenFetches.length).toBeGreaterThan(0);
  });

  // 3. Clicking a remedy triggers fetch for remedy detail
  it("fetches remedy detail when requested", async () => {
    const { result } = renderHook(() => useLazyData());

    await waitFor(() => {
      expect(result.current.indexLoaded).toBe(true);
    });

    fetchCalls = [];

    await act(async () => {
      await result.current.fetchRemedy("Acon.");
    });

    const remedyFetches = fetchCalls.filter((url) =>
      url.includes("Acon")
    );
    expect(remedyFetches.length).toBeGreaterThan(0);
  });

  // 4. Previously fetched data is cached (no duplicate fetches)
  it("caches fetched data and does not re-fetch", async () => {
    const { result } = renderHook(() => useLazyData());

    await waitFor(() => {
      expect(result.current.indexLoaded).toBe(true);
    });

    // First fetch
    await act(async () => {
      await result.current.fetchBodySystem("Abdomen", "pain");
    });

    const firstFetchCount = fetchCalls.filter((url) =>
      url.toLowerCase().includes("abdomen")
    ).length;

    // Second fetch — should use cache
    await act(async () => {
      await result.current.fetchBodySystem("Abdomen", "pain");
    });

    const secondFetchCount = fetchCalls.filter((url) =>
      url.toLowerCase().includes("abdomen")
    ).length;

    // Should not have made additional network requests
    expect(secondFetchCount).toBe(firstFetchCount);
  });

  // 5. App works correctly with data arriving incrementally
  it("provides symptom data incrementally as body systems are loaded", async () => {
    const { result } = renderHook(() => useLazyData());

    await waitFor(() => {
      expect(result.current.indexLoaded).toBe(true);
    });

    // Initially no symptom detail data loaded
    expect(result.current.getSymptomData("Abdomen, pain")).toBeUndefined();

    // Load abdomen data
    await act(async () => {
      await result.current.fetchBodySystem("Abdomen", "pain");
    });

    // Now abdomen symptoms should be available
    const abdomenData = result.current.getSymptomData("Abdomen, pain");
    expect(abdomenData).toBeDefined();
    expect(abdomenData?.remedies).toBeDefined();
    expect(abdomenData?.remedies["Acon."]).toBe(3);

    // Head data still not available
    expect(result.current.getSymptomData("Head, pain")).toBeUndefined();

    // Load head data
    await act(async () => {
      await result.current.fetchBodySystem("Head", "pain");
    });

    // Now both are available
    expect(result.current.getSymptomData("Head, pain")).toBeDefined();
    expect(result.current.getSymptomData("Abdomen, pain")).toBeDefined();
  });

  // 6. Repertorization results identical with lazy-loaded vs monolithic data
  it("produces correct repertorization with lazy-loaded data", async () => {
    const { result } = renderHook(() => useLazyData());

    await waitFor(() => {
      expect(result.current.indexLoaded).toBe(true);
    });

    // Load needed body systems
    await act(async () => {
      await result.current.fetchBodySystem("Abdomen", "pain");
      await result.current.fetchBodySystem("Head", "pain");
    });

    // Get symptom data for repertorization
    const abdomenPain = result.current.getSymptomData("Abdomen, pain");
    const headPain = result.current.getSymptomData("Head, pain");

    expect(abdomenPain).toBeDefined();
    expect(headPain).toBeDefined();

    // Verify the data matches what we'd expect from the monolithic file
    expect(abdomenPain!.remedies["Acon."]).toBe(3);
    expect(abdomenPain!.remedies["Nux-v."]).toBe(2);
    expect(headPain!.remedies["Bell."]).toBe(3);
    expect(headPain!.remedies["Bry."]).toBe(2);
  });
});
