import { lazy, type ComponentType, type LazyExoticComponent } from "react";

// Each example is its own chunk, loaded by the page that shows it: a button page never downloads Recharts.
const modules = import.meta.glob<{ default: ComponentType }>("./*/*.tsx");
const cache = new Map<string, LazyExoticComponent<ComponentType>>();

/** The example's component, lazily loaded; `null` when the file does not exist. */
export function exampleComponent(slug: string, id: string): LazyExoticComponent<ComponentType> | null {
  const key = `./${slug}/${id}.tsx`;
  const load = modules[key];
  if (!load) return null;
  let component = cache.get(key);
  if (!component) {
    component = lazy(load);
    cache.set(key, component);
  }
  return component;
}
