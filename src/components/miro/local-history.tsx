"use client";

import { useEffect, useState } from "react";
import type { MiroCategory } from "../../lib/posts";

const HISTORY_KEY = "miro_reading_history";

export function useLocalHistory() {
  const [history, setHistory] = useState<MiroCategory[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(HISTORY_KEY);
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch (e) {
      // ignore
    }
  }, []);

  const addCategory = (category: MiroCategory) => {
    setHistory((prev) => {
      const next = [category, ...prev.filter((c) => c !== category)].slice(0, 10);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
      return next;
    });
  };

  return { history, addCategory };
}

export function LocalHistoryTracker({ category }: { category: MiroCategory }) {
  const { addCategory } = useLocalHistory();

  useEffect(() => {
    addCategory(category);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  return null;
}
