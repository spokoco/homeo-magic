"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface SymptomDetail {
  remedies: Record<string, number>;
}

export function useLazyData() {
  const [indexLoaded, setIndexLoaded] = useState(false);
  const [symptomIndex, setSymptomIndex] = useState<string[]>([]);
  const [remedyIndex, setRemedyIndex] = useState<Record<string, string>>({});

  // Cache for loaded body system data and remedy details
  const symptomDataRef = useRef<Record<string, SymptomDetail>>({});
  const [, forceUpdate] = useState(0);
  const cacheRef = useRef<Set<string>>(new Set());

  // Load indexes on mount
  useEffect(() => {
    async function loadIndexes() {
      const [sympRes, remRes] = await Promise.all([
        fetch("data/symptoms/index.json"),
        fetch("data/remedies/index.json"),
      ]);
      const sympData = await sympRes.json();
      const remData = await remRes.json();
      setSymptomIndex(sympData);
      setRemedyIndex(remData);
      setIndexLoaded(true);
    }
    loadIndexes();
  }, []);

  const fetchBodySystem = useCallback(
    async (bodySystem: string, subcategory: string) => {
      const cacheKey = `${bodySystem}/${subcategory}`;
      if (cacheRef.current.has(cacheKey)) return;

      const url = `data/symptoms/${bodySystem}/${subcategory}.json`;
      const res = await fetch(url);
      const data = await res.json();

      // Merge into symptom data cache
      Object.assign(symptomDataRef.current, data);
      cacheRef.current.add(cacheKey);
      forceUpdate((n) => n + 1);
    },
    []
  );

  const fetchRemedy = useCallback(async (abbrev: string) => {
    const cacheKey = `remedy:${abbrev}`;
    if (cacheRef.current.has(cacheKey)) return;

    const firstLetter = abbrev[0].toUpperCase();
    const safeName = abbrev.replace(/[^\w\-.]/g, "_");
    const url = `data/remedies/${firstLetter}/${safeName}.json`;
    const res = await fetch(url);
    await res.json();

    cacheRef.current.add(cacheKey);
    forceUpdate((n) => n + 1);
  }, []);

  const getSymptomData = useCallback(
    (name: string): SymptomDetail | undefined => {
      return symptomDataRef.current[name];
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [symptomDataRef.current]
  );

  return {
    indexLoaded,
    symptomIndex,
    remedyIndex,
    fetchBodySystem,
    fetchRemedy,
    getSymptomData,
    cache: cacheRef.current,
  };
}
