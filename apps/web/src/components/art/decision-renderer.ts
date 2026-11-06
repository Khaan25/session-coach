import * as THREE from "three";
import gsap from "gsap";

export type SculptureChapter = "session" | "decision" | "review";
export type DecisionScene = {
  setChapter: (chapter: SculptureChapter) => void;
  dispose: () => void;
};

/** A continuous path with three checkpoints: the same visual language as the review schedule. */
export function createDecisionScene(host: HTMLElement, initial: SculptureChapter): DecisionScene {
  const css = getComputedStyle(host);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas unavailable");
  const color = (token: string) => {
    context.clearRect(0, 0, 1, 1);
    context.fillStyle = css.getPropertyValue(token).trim();
    context.fillRect(0, 0, 1, 1);
    const pixel = context.getImageData(0, 0, 1, 1).data;
    return new THREE.Color(`rgb(${pixel[0]},${pixel[1]},${pixel[2]})`);
  };
  const paper = color("--sculpture-paper"),
    blue = color("--sculpture-blue"),
    ink = color("--sculpture-ink");
  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    powerPreference: "low-power",
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0, 0);
  host.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 30);
  camera.position.set(0, 0, 9);
  scene.add(new THREE.AmbientLight(paper, 2.3));
  const key = new THREE.DirectionalLight(paper, 4);
  key.position.set(-3, 5, 7);
  scene.add(key);
  const edge = new THREE.DirectionalLight(blue, 2);
  edge.position.set(4, -2, 2);
  scene.add(edge);
  const rig = new THREE.Group();
  scene.add(rig);
  const points = Array.from({ length: 151 }, (_, i) => {
    const t = (i / 150) * Math.PI * 2;
    return new THREE.Vector3(Math.cos(t) * 2.1, Math.sin(t) * 1.1, Math.sin(t * 2) * 0.6);
  });
  const curve = new THREE.CatmullRomCurve3(points, true);
  const loop = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 200, 0.21, 16, true),
    new THREE.MeshPhysicalMaterial({
      color: blue,
      metalness: 0.24,
      roughness: 0.24,
      clearcoat: 1,
      clearcoatRoughness: 0.1,
    }),
  );
  rig.add(loop);
  const checkpoints = [0.09, 0.4, 0.73].map((t) => {
    const group = new THREE.Group();
    group.position.copy(curve.getPoint(t));
    const node = new THREE.Mesh(
      new THREE.SphereGeometry(0.34, 24, 16),
      new THREE.MeshStandardMaterial({ color: paper, roughness: 0.3, metalness: 0.08 }),
    );
    group.add(node);
    const dot = new THREE.Mesh(
      new THREE.SphereGeometry(0.11, 16, 12),
      new THREE.MeshStandardMaterial({ color: ink, roughness: 0.3 }),
    );
    dot.position.z = 0.29;
    group.add(dot);
    rig.add(group);
    return group;
  });
  const media = matchMedia("(prefers-reduced-motion: reduce)");
  let visible = true,
    disposed = false,
    chapter = initial;
  let tween: gsap.core.Tween | undefined;
  const render = () => {
    if (!disposed && visible) renderer.render(scene, camera);
  };
  const setChapter = (next: SculptureChapter, animate = true) => {
    chapter = next;
    tween?.kill();
    const rotations = {
      session: { x: 0.1, y: -0.3, z: -0.12 },
      decision: { x: 0.3, y: 0.25, z: 0.12 },
      review: { x: 0.14, y: -0.1, z: -0.16 },
    };
    tween = gsap.to(rig.rotation, {
      ...rotations[next],
      duration: media.matches || !animate ? 0 : 1.05,
      ease: "power3.inOut",
      onUpdate: render,
      onComplete: render,
    });
    checkpoints.forEach((node, index) =>
      node.scale.setScalar(next === "review" ? 1 : index === 0 ? 1 : 0.65),
    );
    render();
  };
  const resize = () => {
    const width = host.clientWidth,
      height = host.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.position.z = width / height < 1.3 ? 11 : 8;
    camera.updateProjectionMatrix();
    render();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  const intersection = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    render();
  });
  intersection.observe(host);
  const pointer = (event: PointerEvent) => {
    if (media.matches || event.pointerType === "touch") return;
    const bounds = host.getBoundingClientRect();
    gsap.to(rig.position, {
      x: ((event.clientX - bounds.left) / bounds.width - 0.5) * 0.18,
      y: -((event.clientY - bounds.top) / bounds.height - 0.5) * 0.12,
      duration: 0.7,
      overwrite: true,
      onUpdate: render,
    });
  };
  const leave = () => {
    gsap.to(rig.position, { x: 0, y: 0, duration: media.matches ? 0 : 0.7, onUpdate: render });
  };
  const preference = () => setChapter(chapter, false);
  host.addEventListener("pointermove", pointer);
  host.addEventListener("pointerleave", leave);
  media.addEventListener("change", preference);
  resize();
  setChapter(initial, false);
  return {
    setChapter,
    dispose: () => {
      disposed = true;
      tween?.kill();
      gsap.killTweensOf(rig.position);
      observer.disconnect();
      intersection.disconnect();
      host.removeEventListener("pointermove", pointer);
      host.removeEventListener("pointerleave", leave);
      media.removeEventListener("change", preference);
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => material.dispose());
        }
      });
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    },
  };
}
