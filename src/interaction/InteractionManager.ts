import * as THREE from "three";

export interface Interactable {
  id: string;
  mesh: THREE.Object3D;
  enabled: boolean;
  label: string;
  onSelect(): void;
  onHover?(hovered: boolean): void;
}

/** Both desktop and XR use this registry, hit testing, and activation path. */
export class InteractionManager {
  private entries = new Map<string, Interactable>();
  private owners = new Map<THREE.Object3D, Interactable>();
  private objects: THREE.Object3D[] = [];
  private intersections: THREE.Intersection[] = [];
  private hovered = new Map<string, Interactable>();
  readonly raycaster = new THREE.Raycaster();
  register(entry: Interactable): () => void {
    if (this.entries.has(entry.id))
      throw new Error(`Duplicate interaction: ${entry.id}`);
    this.entries.set(entry.id, entry);
    this.owners.set(entry.mesh, entry);
    this.objects.push(entry.mesh);
    return () => {
      this.entries.delete(entry.id);
      this.owners.delete(entry.mesh);
      this.objects = this.objects.filter((object) => object !== entry.mesh);
      for (const [source, hover] of this.hovered)
        if (hover === entry) this.hover(source, null);
    };
  }
  setEnabled(id: string, enabled: boolean): void {
    const entry = this.entries.get(id);
    if (entry) entry.enabled = enabled;
    if (!enabled)
      for (const [source, hover] of this.hovered)
        if (hover === entry) this.hover(source, null);
  }
  setLabel(id: string, label: string): void {
    const entry = this.entries.get(id);
    if (entry) entry.label = label;
  }
  private visible(object: THREE.Object3D): boolean {
    let current: THREE.Object3D | null = object;
    while (current) {
      if (!current.visible) return false;
      current = current.parent;
    }
    return true;
  }
  hit(
    raycaster = this.raycaster,
  ): { entry: Interactable; distance: number } | null {
    this.intersections.length = 0;
    raycaster.intersectObjects(this.objects, true, this.intersections);
    for (const intersection of this.intersections) {
      let object: THREE.Object3D | null = intersection.object;
      while (object && !this.owners.has(object)) object = object.parent;
      const entry = object ? this.owners.get(object) : undefined;
      if (entry?.enabled && this.visible(entry.mesh))
        return { entry, distance: intersection.distance };
    }
    return null;
  }
  hover(source: string, entry: Interactable | null): void {
    const old = this.hovered.get(source);
    if (old === entry) return;
    this.hovered.delete(source);
    if (old && ![...this.hovered.values()].includes(old)) old.onHover?.(false);
    if (entry) {
      this.hovered.set(source, entry);
      entry.onHover?.(true);
    }
  }
  activate(id: string): boolean {
    const entry = this.entries.get(id);
    if (!entry?.enabled || !this.visible(entry.mesh)) return false;
    entry.onSelect();
    return true;
  }
  clearHover(): void {
    for (const source of [...this.hovered.keys()]) this.hover(source, null);
  }
  dispose(): void {
    this.clearHover();
    this.entries.clear();
    this.owners.clear();
    this.objects.length = 0;
  }
}

export function setObjectEmphasis(
  object: THREE.Object3D,
  hovered: boolean,
  selected: boolean,
): void {
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    const materials = Array.isArray(child.material)
      ? child.material
      : [child.material];
    for (const material of materials)
      if (material instanceof THREE.MeshStandardMaterial) {
        material.emissive.set("#91a46b");
        material.emissiveIntensity = selected ? 0.35 : hovered ? 0.22 : 0;
      }
  });
}
