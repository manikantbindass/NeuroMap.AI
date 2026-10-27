import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

export type Cloud = { positions: number[][]; values: number[] };
export function BrainView({
  cloud,
  rotate,
  threshold,
}: {
  cloud?: Cloud;
  rotate: boolean;
  threshold: number;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const el = host.current!;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      setFailed(true);
      return;
    }
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 2000);
    camera.position.set(210, 100, 250);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    el.appendChild(renderer.domElement);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = false;
    controls.autoRotate = rotate;
    controls.autoRotateSpeed = 0.7;
    controls.enablePan = false;
    controls.minDistance = 90;
    controls.maxDistance = 600;
    const positions: number[] = [];
    const colors: number[] = [];
    const color = new THREE.Color();
    if (cloud) {
      cloud.positions.forEach((p, i) => {
        if (cloud.values[i] >= threshold) {
          positions.push(...p);
          color.setHSL(
            0.49 + cloud.values[i] * 0.15,
            0.65,
            0.35 + cloud.values[i] * 0.4,
          );
          colors.push(color.r, color.g, color.b);
        }
      });
    } else {
      // Original procedural form, not a brain atlas or a subject reconstruction.
      for (let i = 0; i < 19000; i++) {
        const t = i * 2.399963;
        const v = 1 - (2 * (i + 0.5)) / 19000;
        const r = Math.sqrt(1 - v * v);
        const fold =
          1 +
          0.045 * Math.sin(t * 7 + v * 28) +
          0.035 * Math.cos(t * 11 - v * 18);
        const x = Math.cos(t) * r;
        const gap = x > 0 ? 3 : -3;
        positions.push(
          x * 63 * fold + gap,
          v * 80 * fold,
          Math.sin(t) * r * 61 * fold,
        );
        color.setHSL(
          0.49 + v * 0.05,
          0.6,
          0.45 + Math.sin(t * 7 + v * 28) * 0.13,
        );
        colors.push(color.r, color.g, color.b);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3),
    );
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    geometry.center();
    const material = new THREE.PointsMaterial({
      size: cloud ? 1.8 : 1.15,
      vertexColors: true,
      transparent: true,
      opacity: 0.82,
    });
    scene.add(new THREE.Points(geometry, material));
    const grid = new THREE.GridHelper(240, 16, 0x25344a, 0x162338);
    grid.position.y = -95;
    scene.add(grid);
    const render = () => renderer.render(scene, camera);
    controls.addEventListener("change", render);
    const observer = new ResizeObserver(() => {
      const w = el.clientWidth,
        h = el.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      render();
    });
    observer.observe(el);
    let frame = 0;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    controls.autoRotate = rotate && !reduced;
    const animate = () => {
      frame = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    if (controls.autoRotate) animate();
    else render();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      controls.removeEventListener("change", render);
      controls.dispose();
      geometry.dispose();
      material.dispose();
      grid.geometry.dispose();
      (grid.material as THREE.Material).dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [cloud, rotate, threshold]);
  return (
    <div
      className="brain-canvas"
      ref={host}
      role="img"
      aria-label={
        cloud
          ? "Interactive intensity-thresholded voxel point cloud; drag to orbit and scroll to zoom."
          : "Procedural brain-inspired synthetic form; not an anatomical model."
      }
    >
      {failed && (
        <p>
          3D is unavailable on this device. Image metadata and slice view remain
          available.
        </p>
      )}
    </div>
  );
}

export function Slice({ data }: { data: number[][] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current!;
    canvas.width = data.length;
    canvas.height = data[0]?.length || 1;
    const ctx = canvas.getContext("2d")!;
    const image = ctx.createImageData(canvas.width, canvas.height);
    data.forEach((row, x) =>
      row.forEach((v, y) => {
        const p = ((canvas.height - 1 - y) * canvas.width + x) * 4;
        image.data[p] =
          image.data[p + 1] =
          image.data[p + 2] =
            Math.round(v * 255);
        image.data[p + 3] = 255;
      }),
    );
    ctx.putImageData(image, 0, 0);
  }, [data]);
  return (
    <canvas
      ref={ref}
      className="slice"
      role="img"
      aria-label="Image index slice, grayscale intensity window from 1st to 99th percentile; not reoriented to radiological convention"
    />
  );
}
