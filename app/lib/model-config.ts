/**
 * Model configuration types and helpers.
 * Actual data comes from /api/aggregates → modelConfig field.
 * All components read from this instead of hardcoding model metadata.
 */

export interface ModelMeta {
  label: string;
  color: string;
  borderClass: string;
  fuelOptions: string[];
}

export type ModelConfigMap = Record<string, ModelMeta>;

const DEFAULT_META: ModelMeta = {
  label: "Unknown",
  color: "#6b7280",
  borderClass: "border-stone-300",
  fuelOptions: ["Petrol"],
};

export function getModelMeta(
  config: ModelConfigMap,
  key: string
): ModelMeta {
  return config[key] || { ...DEFAULT_META, label: key };
}

export function getColorsMap(
  config: ModelConfigMap
): Record<string, string> {
  const colors: Record<string, string> = {};
  for (const [key, meta] of Object.entries(config)) {
    colors[key] = meta.color;
  }
  return colors;
}

export function getFuelOptions(
  config: ModelConfigMap,
  modelKey: string
): string[] {
  return config[modelKey]?.fuelOptions || ["Petrol"];
}
