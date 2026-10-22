import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { Furniture, palette as p } from "./Furniture";
import type { ItemId, ScenarioSnapshot } from "../scenarios/ScenarioManager";

export class KitchenEnvironment {
  readonly root = new THREE.Group();
  readonly items: Record<ItemId, THREE.Group>;
  readonly targets: Record<ItemId, THREE.Group>;
  private origins = {
    cup: new THREE.Vector3(-1.1, 0.957, -1.66),
    plate: new THREE.Vector3(0.92, 0.957, -1.64),
  };
  private destinations = {
    cup: new THREE.Vector3(0.46, 0.795, 0.04),
    plate: new THREE.Vector3(-0.1, 0.795, 0.14),
  };
  private hintRings: Record<ItemId, THREE.Mesh>;
  constructor(scene: THREE.Scene) {
    scene.add(this.root);
    const f = new Furniture();
    const fixed = new THREE.Group();
    this.root.add(fixed);
    // Room shell and oak planks. Fixed meshes are batched by material below.
    f.box(fixed, [6.4, 0.12, 6.6], [0, -0.075, -0.15], p.oak);
    for (let i = 0; i < 25; i++) {
      f.box(
        fixed,
        [0.25, 0.018, 6.55],
        [-3.08 + i * 0.257, -0.008, -0.15],
        ["#d0b08b", "#c8a780", "#d8b994", "#d3b38c"][i % 4],
      );
    }
    f.box(fixed, [6.4, 3.1, 0.12], [0, 1.5, -2.64], p.plaster);
    f.box(fixed, [0.12, 3.1, 5.4], [-3.18, 1.5, -0.0], "#e1dfd1");
    f.box(fixed, [6.3, 0.1, 0.035], [0, 0.05, -2.55], p.cream);
    f.box(fixed, [0.035, 0.1, 5.4], [-3.1, 0.05, 0], p.cream);
    // Woven rug under the dining area.
    f.box(fixed, [3.15, 0.012, 2.15], [0.1, 0.012, 0.25], "#c5c1a6");
    for (const z of [-0.72, -0.67, 1.17, 1.22])
      f.box(fixed, [3.08, 0.003, 0.022], [0.1, 0.02, z], "#e1dcc4");
    // Lower cabinets, recessed toes, pale stone worktop.
    f.box(fixed, [4.6, 0.12, 0.57], [-0.45, 0.08, -2.16], "#5c6856");
    f.box(fixed, [4.6, 0.75, 0.66], [-0.45, 0.5, -2.15], p.sage);
    f.box(fixed, [4.72, 0.07, 0.84], [-0.45, 0.918, -2.08], "#e4dfce");
    for (let i = 0; i < 7; i++) {
      const x = -2.38 + i * 0.65;
      f.box(
        fixed,
        [0.625, 0.68, 0.027],
        [x, 0.51, -1.808],
        i % 2 ? "#899981" : p.sage,
      );
      f.box(fixed, [0.17, 0.017, 0.035], [x, 0.77, -1.78], "#c3b68e");
    }
    // Ceramic backsplash grid.
    f.box(fixed, [4.72, 0.54, 0.025], [-0.45, 1.21, -2.56], "#d1d4c8");
    for (let col = 0; col < 17; col++)
      for (let row = 0; row < 3; row++) {
        f.box(
          fixed,
          [0.27, 0.17, 0.025],
          [-2.68 + col * 0.28, 1.03 + row * 0.18, -2.54],
          "#f1efe3",
        );
      }
    // Left return and upper cupboard with oak open shelves.
    f.box(fixed, [0.66, 0.86, 1.22], [-2.42, 0.45, -1.15], p.sage);
    f.box(fixed, [0.83, 0.07, 1.3], [-2.42, 0.918, -1.14], "#e4dfce");
    f.box(fixed, [1.05, 0.85, 0.38], [-2.03, 1.99, -2.36], p.sage);
    for (const x of [-2.29, -1.77]) {
      f.box(fixed, [0.5, 0.81, 0.025], [x, 2, -2.154], "#899981");
      f.box(fixed, [0.025, 0.12, 0.035], [x + 0.16, 1.78, -2.13], "#c3b68e");
    }
    for (const y of [1.67, 2.12]) {
      f.box(fixed, [0.84, 0.045, 0.32], [1.4, y, -2.36], p.lightOak);
      f.cylinder(fixed, 0.06, 0.06, 0.17, [1.16, y + 0.11, -2.34], "#e9e3ce");
      f.cylinder(
        fixed,
        0.075,
        0.065,
        0.21,
        [1.43, y + 0.13, -2.35],
        y > 2 ? p.terracotta : "#abb19a",
      );
    }
    // Window, sky and simple landscape enclosed within its frame.
    f.box(fixed, [1.78, 1.2, 0.06], [-0.33, 2.02, -2.54], "#d4e5df");
    f.box(fixed, [1.72, 0.4, 0.025], [-0.33, 1.65, -2.49], "#b6c9a8");
    for (let i = 0; i < 5; i++) {
      const tree = new THREE.Mesh(
        new THREE.SphereGeometry(1, 16, 12),
        f.material(i % 2 ? "#abc3a6" : "#95b49a"),
      );
      tree.scale.set(0.23, 0.31 + (i % 2) * 0.08, 0.018);
      tree.position.set(-1.03 + i * 0.34, 1.82, -2.46);
      fixed.add(tree);
    }
    for (const x of [-1.25, 0.59])
      f.box(fixed, [0.09, 1.3, 0.12], [x, 2.02, -2.43], p.cream);
    for (const y of [1.39, 2.65])
      f.box(fixed, [1.93, 0.09, 0.13], [-0.33, y, -2.43], p.cream);
    f.box(fixed, [0.045, 1.2, 0.1], [-0.33, 2.02, -2.39], p.cream);
    f.box(fixed, [1.99, 0.065, 0.27], [-0.33, 1.375, -2.35], p.lightOak);
    f.plant(fixed, 0.35, 1.41, -2.31, 0.65);
    // Sink is constructed as a rim and basin, not an opaque overlay.
    f.box(fixed, [0.65, 0.022, 0.43], [-0.3, 0.963, -2.13], "#acb9b1");
    f.box(fixed, [0.52, 0.024, 0.32], [-0.3, 0.977, -2.13], "#7c928a");
    const faucetCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.3, 0.97, -2.39),
      new THREE.Vector3(-0.3, 1.25, -2.39),
      new THREE.Vector3(-0.3, 1.28, -2.23),
      new THREE.Vector3(-0.3, 1.17, -2.2),
    ]);
    fixed.add(
      new THREE.Mesh(
        new THREE.TubeGeometry(faucetCurve, 20, 0.016, 8, false),
        f.material(p.metal, 0.35),
      ),
    );
    // Coffee maker, wooden board and canisters.
    f.box(fixed, [0.33, 0.055, 0.31], [-1.48, 0.986, -2.13], p.charcoal);
    f.box(fixed, [0.3, 0.35, 0.14], [-1.48, 1.16, -2.22], "#dad9ce");
    f.box(fixed, [0.3, 0.08, 0.29], [-1.48, 1.31, -2.15], p.charcoal);
    f.cylinder(fixed, 0.075, 0.07, 0.16, [-1.48, 1.09, -2.07], "#736f5e");
    f.box(fixed, [0.22, 0.019, 0.35], [-0.98, 0.963, -2.19], p.oak);
    f.cylinder(fixed, 0.085, 0.085, 0.2, [-2.36, 1.05, -1.38], p.cream);
    for (let i = 0; i < 3; i++)
      f.box(fixed, [0.018, 0.25, 0.018], [-2.4 + i * 0.04, 1.23, -1.38], p.oak);
    f.plant(fixed, -2.42, 0.96, -2.18, 0.95);
    // Refrigerator.
    f.box(fixed, [0.76, 1.94, 0.76], [2.35, 0.98, -2.12], "#d6dcd1");
    f.box(fixed, [0.72, 1.21, 0.045], [2.35, 1.32, -1.72], "#e5e7dc");
    f.box(fixed, [0.72, 0.61, 0.045], [2.35, 0.39, -1.72], "#e5e7dc");
    f.box(fixed, [0.025, 0.39, 0.055], [2.08, 1.22, -1.675], "#8e9c8e");
    f.box(fixed, [0.025, 0.25, 0.055], [2.08, 0.47, -1.675], "#8e9c8e");
    f.box(fixed, [0.16, 0.18, 0.003], [2.45, 1.45, -1.692], "#d5be8b");
    // Dining table and placemat.
    f.box(fixed, [2.12, 0.075, 1.13], [0.12, 0.752, 0.13], p.lightOak);
    f.box(fixed, [1.82, 0.09, 0.83], [0.12, 0.67, 0.13], p.oak);
    for (const x of [-0.72, 0.96])
      for (const z of [-0.28, 0.54])
        f.box(fixed, [0.075, 0.68, 0.075], [x, 0.34, z], p.oak);
    f.box(fixed, [0.94, 0.004, 0.58], [0.14, 0.792, 0.14], "#e2d6b7");
    // Face each seat toward the table, with its backrest on the outside.
    f.chair(fixed, -1.24, 0.12, Math.PI / 2);
    f.chair(fixed, 1.47, 0.12, -Math.PI / 2);
    f.chair(fixed, -0.42, -0.78, 0);
    f.cylinder(fixed, 0.075, 0.09, 0.22, [0.83, 0.9, -0.12], "#eae3d1");
    f.plant(fixed, 2.15, 0, 0.05, 2.1);
    // Pendant and clock.
    f.cylinder(fixed, 0.012, 0.012, 0.28, [0.13, 3.14, 0.13], "#6c7364");
    f.cylinder(fixed, 0.08, 0.3, 0.21, [0.13, 2.9, 0.13], "#ded6bc");
    f.cylinder(fixed, 0.272, 0.272, 0.012, [0.13, 2.789, 0.13], "#f9efd3");
    const clock = f.cylinder(
      fixed,
      0.17,
      0.17,
      0.045,
      [2.35, 2.4, -2.53],
      p.oak,
    );
    clock.rotation.x = Math.PI / 2;
    const face = f.cylinder(
      fixed,
      0.15,
      0.15,
      0.01,
      [2.35, 2.4, -2.5],
      p.cream,
    );
    face.rotation.x = Math.PI / 2;
    f.box(fixed, [0.008, 0.1, 0.012], [2.35, 2.445, -2.483], p.charcoal);
    f.box(fixed, [0.07, 0.008, 0.012], [2.38, 2.4, -2.483], p.charcoal);
    this.batchFixed(fixed);

    this.items = { cup: f.cup(), plate: f.plate() };
    this.targets = {
      cup: this.createTarget(0.14),
      plate: this.createTarget(0.23),
    };
    this.hintRings = {
      cup: this.createRing(0.13),
      plate: this.createRing(0.21),
    };
    for (const id of ["cup", "plate"] as const) {
      this.root.add(this.items[id], this.targets[id], this.hintRings[id]);
      this.items[id].position.copy(this.origins[id]);
      this.targets[id].position.copy(this.destinations[id]);
      this.targets[id].position.y += 0.006;
      this.hintRings[id].position.copy(this.origins[id]);
      this.hintRings[id].position.y += 0.004;
      this.targets[id].visible = false;
      this.hintRings[id].visible = false;
    }
  }
  private createRing(radius: number): THREE.Mesh {
    const mesh = new THREE.Mesh(
      new THREE.RingGeometry(radius, radius + 0.014, 48),
      new THREE.MeshBasicMaterial({ color: "#536f58", side: THREE.DoubleSide }),
    );
    mesh.rotation.x = -Math.PI / 2;
    return mesh;
  }
  private createTarget(radius: number): THREE.Group {
    const group = new THREE.Group();
    group.add(this.createRing(radius));
    const disk = new THREE.Mesh(
      new THREE.CircleGeometry(radius, 40),
      new THREE.MeshBasicMaterial({
        color: "#a4c49b",
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    disk.rotation.x = -Math.PI / 2;
    group.add(disk);
    return group;
  }
  private batchFixed(root: THREE.Group): void {
    root.updateMatrixWorld(true);
    const batches = new Map<THREE.Material, THREE.BufferGeometry[]>();
    const originals = new Set<THREE.BufferGeometry>();
    root.traverse((object) => {
      if (!(object instanceof THREE.Mesh) || Array.isArray(object.material))
        return;
      const geometry = object.geometry.clone().applyMatrix4(object.matrixWorld);
      const list = batches.get(object.material) ?? [];
      list.push(geometry);
      batches.set(object.material, list);
      originals.add(object.geometry);
    });
    root.clear();
    for (const [material, geometries] of batches) {
      const merged = mergeGeometries(geometries);
      if (merged) {
        const mesh = new THREE.Mesh(merged, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        root.add(mesh);
      }
      geometries.forEach((geometry) => geometry.dispose());
    }
    originals.forEach((geometry) => geometry.dispose());
  }
  update(snapshot: Readonly<ScenarioSnapshot>, hints: boolean): void {
    for (const id of ["cup", "plate"] as const) {
      const placed = id === "cup" ? snapshot.cupPlaced : snapshot.platePlaced;
      this.items[id].position.copy(
        placed ? this.destinations[id] : this.origins[id],
      );
      this.targets[id].visible = snapshot.selected === id;
      const active =
        id === "cup"
          ? ["familiarization", "place-cup"].includes(snapshot.state)
          : snapshot.state === "place-plate";
      this.hintRings[id].visible = hints && active && !placed;
    }
  }
}
