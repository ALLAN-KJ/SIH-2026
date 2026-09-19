import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface Props {
  riskScore: number | null; // null means no result yet (loading or idle)
  isQuantumSafe?: boolean;
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const CryptographicTunnel: React.FC<Props> = ({ riskScore, isQuantumSafe }) => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mountRef.current || prefersReducedMotion()) return;

    // ── Setup Scene ──
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x09090b, 0.05);

    // ── Setup Camera ──
    const camera = new THREE.PerspectiveCamera(75, mountRef.current.clientWidth / mountRef.current.clientHeight, 0.1, 1000);
    camera.position.z = 15;

    // ── Setup Renderer ──
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limit pixel ratio for performance
    mountRef.current.appendChild(renderer.domElement);

    // ── Create Tunnel Lattice ──
    const radius = 5;
    const length = 40;
    const segments = 32;
    const radialSegments = 16;
    const geometry = new THREE.CylinderGeometry(radius, radius, length, radialSegments, segments, true);
    
    // Convert to wireframe
    const wireframeGeometry = new THREE.WireframeGeometry(geometry);
    
    // Initial color based on state
    let targetColor = new THREE.Color(0x27272a); // Default neutral border color
    if (riskScore !== null) {
      if (riskScore >= 70) {
        targetColor = new THREE.Color(0xf87171); // Critical Red
      } else if (riskScore <= 30) {
        targetColor = new THREE.Color(0x34d399); // Strong Emerald
      } else {
        targetColor = new THREE.Color(0xfbbf24); // Weak Amber
      }
    }

    const material = new THREE.LineBasicMaterial({ 
      color: targetColor,
      transparent: true,
      opacity: 0.6
    });

    const tunnel = new THREE.LineSegments(wireframeGeometry, material);
    tunnel.rotation.x = Math.PI / 2; // Point down the Z axis
    scene.add(tunnel);

    // Particles inside the tunnel
    const particlesGeometry = new THREE.BufferGeometry();
    const particlesCount = 200;
    const posArray = new Float32Array(particlesCount * 3);
    for(let i = 0; i < particlesCount * 3; i+=3) {
      // Random position within the cylinder
      const r = Math.random() * (radius - 0.5);
      const theta = Math.random() * 2 * Math.PI;
      const y = (Math.random() - 0.5) * length;
      posArray[i] = r * Math.cos(theta);
      posArray[i+1] = y;
      posArray[i+2] = r * Math.sin(theta);
    }
    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    const particlesMaterial = new THREE.PointsMaterial({
      size: 0.05,
      color: targetColor,
      transparent: true,
      opacity: 0.8
    });
    const particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
    tunnel.add(particlesMesh);

    // ── Mouse Interaction (Parallax) ──
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;
    const windowHalfX = window.innerWidth / 2;
    const windowHalfY = window.innerHeight / 2;

    const onDocumentMouseMove = (event: MouseEvent) => {
      mouseX = (event.clientX - windowHalfX) * 0.001;
      mouseY = (event.clientY - windowHalfY) * 0.001;
    };
    document.addEventListener('mousemove', onDocumentMouseMove);

    // ── Animation Loop ──
    let animationFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Base rotation
      tunnel.rotation.z = elapsedTime * 0.1;
      
      // If critical, add some jitter/fracture effect
      if (riskScore !== null && riskScore >= 70) {
        tunnel.rotation.x = Math.PI / 2 + Math.sin(elapsedTime * 10) * 0.02;
        tunnel.rotation.y = Math.cos(elapsedTime * 12) * 0.02;
        material.opacity = 0.4 + Math.sin(elapsedTime * 8) * 0.2;
      } else if (riskScore !== null && riskScore <= 30) {
         // Lock solid
         tunnel.rotation.x = Math.PI / 2;
         tunnel.rotation.y = 0;
         material.opacity = 0.8;
      }

      // Parallax easing
      targetX = mouseX * 0.5;
      targetY = mouseY * 0.5;
      
      tunnel.rotation.y += 0.05 * (targetX - tunnel.rotation.y);
      tunnel.rotation.x += 0.05 * ((Math.PI/2 + targetY) - tunnel.rotation.x);
      
      // Scroll effect
      const scrollY = window.scrollY;
      camera.position.z = 15 - (scrollY * 0.005);
      
      renderer.render(scene, camera);
    };
    animate();

    // ── Resize Handler ──
    const handleResize = () => {
      if (!mountRef.current) return;
      camera.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    // ── Cleanup ──
    return () => {
      cancelAnimationFrame(animationFrameId);
      document.removeEventListener('mousemove', onDocumentMouseMove);
      window.removeEventListener('resize', handleResize);
      if (mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }
      geometry.dispose();
      wireframeGeometry.dispose();
      material.dispose();
      particlesGeometry.dispose();
      particlesMaterial.dispose();
      renderer.dispose();
    };
  }, [riskScore, isQuantumSafe]);

  if (prefersReducedMotion()) {
    return null; // Fallback for reduced motion
  }

  return (
    <div 
      ref={mountRef} 
      style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        width: '100%', 
        height: '100vh', 
        zIndex: -1,
        pointerEvents: 'none',
        opacity: riskScore !== null ? 0.4 : 1 // Dim when results are showing
      }} 
    />
  );
};
