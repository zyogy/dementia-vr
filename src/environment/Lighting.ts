import * as THREE from "three";
export function addLighting(scene: THREE.Scene): void {
  scene.add(new THREE.HemisphereLight("#fff6e5", "#c2b69b", 2.25));
  const sun = new THREE.DirectionalLight("#fff1d8", 2.5);
  sun.position.set(-2.8, 5.5, 2.2);
  sun.target.position.set(0, 0.4, -1);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -4;
  sun.shadow.camera.right = 4;
  sun.shadow.camera.top = 4;
  sun.shadow.camera.bottom = -4;
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 13;
  sun.shadow.normalBias = 0.035;
  sun.shadow.bias = -0.0002;
  scene.add(sun, sun.target);
}
