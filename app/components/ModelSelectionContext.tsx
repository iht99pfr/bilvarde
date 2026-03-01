"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import type { ModelConfigMap } from "@/app/lib/model-config";

interface ModelSelectionContextType {
  selectedModels: Set<string>;
  toggleModel: (key: string) => void;
  availableModels: string[];
  modelConfig: ModelConfigMap;
  loading: boolean;
  fuelFilter: string;
  setFuelFilter: (fuel: string) => void;
}

const ModelSelectionCtx = createContext<ModelSelectionContextType>({
  selectedModels: new Set(),
  toggleModel: () => {},
  availableModels: [],
  modelConfig: {},
  loading: true,
  fuelFilter: "Alla",
  setFuelFilter: () => {},
});

export function useModelSelection() {
  return useContext(ModelSelectionCtx);
}

const STORAGE_KEY = "helanotan_selected_models";
const DEFAULT_MODELS = ["XC60", "XC40", "RAV4"];

function loadFromStorage(): string[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return null;
}

function saveToStorage(models: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(models));
  } catch {}
}

export function ModelSelectionProvider({ children }: { children: ReactNode }) {
  const [modelConfig, setModelConfig] = useState<ModelConfigMap>({});
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [selectedModels, setSelectedModels] = useState<Set<string>>(new Set(DEFAULT_MODELS));
  const [loading, setLoading] = useState(true);
  const [fuelFilter, setFuelFilter] = useState("Alla");

  useEffect(() => {
    fetch("/api/aggregates")
      .then((r) => r.json())
      .then((data) => {
        const config: ModelConfigMap = data.modelConfig || {};
        setModelConfig(config);
        const keys = Object.keys(config);
        setAvailableModels(keys);

        // Restore from localStorage, but validate against available models
        const stored = loadFromStorage();
        if (stored) {
          const valid = stored.filter((k) => keys.includes(k));
          if (valid.length > 0) {
            setSelectedModels(new Set(valid));
          }
        }
        setLoading(false);
      });
  }, []);

  const toggleModel = useCallback((key: string) => {
    setSelectedModels((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        // Don't allow deselecting the last model
        if (next.size <= 1) return prev;
        next.delete(key);
      } else {
        next.add(key);
      }
      saveToStorage([...next]);
      return next;
    });
  }, []);

  return (
    <ModelSelectionCtx.Provider value={{ selectedModels, toggleModel, availableModels, modelConfig, loading, fuelFilter, setFuelFilter }}>
      {children}
    </ModelSelectionCtx.Provider>
  );
}
