import * as THREE from "three";

export const palette = {
  plaster: "#ede9dd",
  sage: "#81927b",
  darkSage: "#526854",
  oak: "#c49a6b",
  lightOak: "#d6b487",
  cream: "#f6f2e4",
  charcoal: "#424940",
  metal: "#8c9a96",
  terracotta: "#b97252",
};
export class Furniture {
  private materials = new Map<string, THREE.MeshStandardMaterial>();
  private boxes = new THREE.BoxGeometry(1, 1, 1);
  private cylinders = new Map<number, THREE.CylinderGeometry>();
  material(color: string, roughness = 0.8): THREE.MeshStandardMaterial {
    const key = `${color}:${roughness}`;
    let material = this.materials.get(key);
    if (!material) {
      material = new THREE.MeshStandardMaterial({ color, roughness });
      this.materials.set(key, material);
    }
    return material;
  }
  box(
    parent: THREE.Object3D,
    size: number[],
    position: number[],
    color: string,
  ): THREE.Mesh {
    const mesh = new THREE.Mesh(this.boxes, this.material(color));
    mesh.scale.set(size[0], size[1], size[2]);
    mesh.position.set(position[0], position[1], position[2]);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  cylinder(
    parent: THREE.Object3D,
    top: number,
    bottom: number,
    height: number,
    position: number[],
    color: string,
    segments = 32,
  ): THREE.Mesh {
    let geometry = this.cylinders.get(segments);
    // Varying top/bottom ratios need their own geometry. Identical cylinders share a unit primitive.
    if (!geometry) {
      geometry = new THREE.CylinderGeometry(1, 1, 1, segments);
      this.cylinders.set(segments, geometry);
    }
    const mesh = new THREE.Mesh(
      top === bottom
        ? geometry
        : new THREE.CylinderGeometry(top, bottom, height, segments),
      this.material(color),
    );
    if (top === bottom) mesh.scale.set(top, height, bottom);
    mesh.position.set(position[0], position[1], position[2]);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  chair(parent: THREE.Object3D, x: number, z: number, rotation: number): void {
    // The seat faces local +Z; its backrest is on local -Z.
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    group.rotation.y = rotation;
    parent.add(group);
    this.box(group, [0.48, 0.065, 0.46], [0, 0.46, 0], palette.lightOak);
    this.box(group, [0.46, 0.27, 0.055], [0, 0.81, -0.2], palette.oak);
    for (const px of [-0.18, 0.18])
      for (const pz of [-0.17, 0.17]) {
        this.box(group, [0.045, 0.44, 0.045], [px, 0.22, pz], palette.oak);
      }
    for (const px of [-0.2, 0.2])
      this.box(group, [0.035, 0.49, 0.04], [px, 0.69, -0.2], palette.oak);
    this.box(group, [0.42, 0.028, 0.4], [0, 0.505, 0], "#a6ad92");
  }
  plant(
    parent: THREE.Object3D,
    x: number,
    y: number,
    z: number,
    scale = 1,
  ): void {
    const group = new THREE.Group();
    group.position.set(x, y, z);
    group.scale.setScalar(scale);
    parent.add(group);
    this.cylinder(group, 0.13, 0.095, 0.19, [0, 0.095, 0], palette.terracotta);
    this.cylinder(group, 0.115, 0.115, 0.012, [0, 0.193, 0], "#605345");
    const leafGeometry = new THREE.SphereGeometry(1, 12, 8);
    for (let i = 0; i < 7; i++) {
      const angle = i * 2.4;
      const leaf = new THREE.Mesh(
        leafGeometry,
        this.material(i % 2 ? "#627e57" : "#8b9a67"),
      );
      leaf.position.set(
        Math.sin(angle) * 0.085,
        0.27 + (i % 3) * 0.06,
        Math.cos(angle) * 0.085,
      );
      leaf.scale.set(0.045, 0.145, 0.055);
      leaf.rotation.z = Math.sin(angle) * 0.7;
      leaf.rotation.x = Math.cos(angle) * 0.7;
      group.add(leaf);
      leaf.castShadow = true;
    }
  }
  cup(): THREE.Group {
    const group = new THREE.Group();
    group.name = "Sage breakfast cup";
    // Hollow ceramic silhouette, a solid base, and a thick handle.
    const points = [
      new THREE.Vector2(0.065, 0),
      new THREE.Vector2(0.072, 0.012),
      new THREE.Vector2(0.082, 0.15),
      new THREE.Vector2(0.072, 0.15),
      new THREE.Vector2(0.062, 0.021),
      new THREE.Vector2(0, 0.021),
    ];
    const mat = this.material("#81977c", 0.55).clone();
    const body = new THREE.Mesh(new THREE.LatheGeometry(points, 40), mat);
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);
    const handle = new THREE.Mesh(
      new THREE.TorusGeometry(0.047, 0.013, 12, 24),
      mat,
    );
    handle.position.set(0.092, 0.083, 0);
    group.add(handle);
    handle.castShadow = true;
    return group;
  }
  plate(): THREE.Group {
    const group = new THREE.Group();
    group.name = "Cream breakfast plate";
    const points = [
      new THREE.Vector2(0, 0.01),
      new THREE.Vector2(0.13, 0.01),
      new THREE.Vector2(0.165, 0.033),
      new THREE.Vector2(0.17, 0.04),
      new THREE.Vector2(0.159, 0.046),
      new THREE.Vector2(0.125, 0.023),
      new THREE.Vector2(0, 0.023),
    ];
    const mesh = new THREE.Mesh(
      new THREE.LatheGeometry(points, 48),
      this.material("#f6ebd3", 0.45).clone(),
    );
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(0.152, 0.0025, 6, 48),
      this.material("#b4a182"),
    );
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.042;
    group.add(rim);
    return group;
  }
}
