# Animated Background Implementation Plan

## Overview

Add an animated 3D/WebGL background to the homepage "above the fold" section (`.top-fold`), creating visual interest while maintaining readability and performance.

---

## Recommendation: Three.js over WebGPU

### Three.js (Recommended)

| Pros | Cons |
|------|------|
| 98%+ browser support | Slightly older API design |
| Massive ecosystem & examples | WebGL 2.0 limitations |
| Well-documented | |
| Easy fallbacks for older devices | |
| Active community & maintenance | |
| Proven performance patterns | |

### WebGPU

| Pros | Cons |
|------|------|
| Modern, lower-level API | ~70% browser support (Chrome, Edge, Firefox behind flag) |
| Better GPU compute access | Safari support still experimental |
| Future of web graphics | Smaller ecosystem, fewer examples |
| | Steeper learning curve |
| | Requires fallback implementation anyway |

### Verdict

**Use Three.js.** For a portfolio site background:
- Browser compatibility is critical (visitors use varied devices)
- The animation won't need GPU compute features
- Three.js has better Astro/Vite integration examples
- You can always migrate to WebGPU later via Three.js's WebGPU renderer

---

## Architecture

```
src/
├── components/
│   ├── AnimatedBackground.astro    # Astro wrapper component
│   └── three/
│       ├── BackgroundScene.ts      # Three.js scene setup
│       ├── shaders/                # Custom GLSL shaders (optional)
│       │   ├── vertex.glsl
│       │   └── fragment.glsl
│       └── utils.ts                # Helper functions
├── pages/
│   └── index.astro                 # Import AnimatedBackground
└── styles/
    └── global.scss                 # Z-index & positioning updates
```

---

## Implementation Steps

### Phase 1: Setup

1. **Install Three.js**
   ```bash
   npm install three
   npm install -D @types/three
   ```

2. **Create the Astro wrapper component** (`src/components/AnimatedBackground.astro`)
   ```astro
   ---
   // No server-side code needed
   ---
   <div id="animated-bg" class="animated-background"></div>

   <script>
     import { initScene } from '../three/BackgroundScene';

     // Only run on client
     if (typeof window !== 'undefined') {
       initScene(document.getElementById('animated-bg'));
     }
   </script>

   <style lang="scss">
     .animated-background {
       position: absolute;
       top: 0;
       left: 0;
       width: 100%;
       height: 100%;
       z-index: 0;
       pointer-events: none;
     }
   </style>
   ```

3. **Update homepage structure** (`src/pages/index.astro`)
   ```astro
   <section class="top-fold">
     <AnimatedBackground />
     <div class="top-fold__content">
       <!-- existing content with z-index: 1 -->
     </div>
   </section>
   ```

### Phase 2: Three.js Scene

4. **Create the scene module** (`src/components/three/BackgroundScene.ts`)
   ```typescript
   import * as THREE from 'three';

   export function initScene(container: HTMLElement | null) {
     if (!container) return;

     // Scene setup
     const scene = new THREE.Scene();
     const camera = new THREE.PerspectiveCamera(
       75,
       container.clientWidth / container.clientHeight,
       0.1,
       1000
     );

     const renderer = new THREE.WebGLRenderer({
       alpha: true,        // Transparent background
       antialias: true,
       powerPreference: 'low-power'  // Battery-friendly
     });

     renderer.setSize(container.clientWidth, container.clientHeight);
     renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
     container.appendChild(renderer.domElement);

     // Add geometry/particles/animation here
     // ...

     // Animation loop
     function animate() {
       requestAnimationFrame(animate);
       // Update animations
       renderer.render(scene, camera);
     }

     animate();

     // Handle resize
     window.addEventListener('resize', () => {
       camera.aspect = container.clientWidth / container.clientHeight;
       camera.updateProjectionMatrix();
       renderer.setSize(container.clientWidth, container.clientHeight);
     });

     // Cleanup on navigation (for SPA behavior)
     return () => {
       renderer.dispose();
     };
   }
   ```

### Phase 3: Styling Integration

5. **Update global.scss**
   ```scss
   .top-fold {
     position: relative;  // Add this
     // ... existing styles

     &__content {
       position: relative;
       z-index: 1;
     }
   }

   // Reduce motion for accessibility
   @media (prefers-reduced-motion: reduce) {
     .animated-background {
       display: none;
     }
   }
   ```

---

## Animation Ideas

Given your portfolio focus on 3D graphics and generative art, consider:

| Concept | Complexity | Performance |
|---------|------------|-------------|
| **Floating particles** | Low | Excellent |
| **Gradient mesh distortion** | Medium | Good |
| **Geometric shapes (low-poly style)** | Medium | Good |
| **Noise-based terrain** | Medium-High | Moderate |
| **Voronoi patterns** | Medium | Good |
| **Abstract blob/metaballs** | High | Moderate |

### Recommended: Subtle particle field or gradient mesh

- Complements your generative art projects
- Won't distract from content
- Performs well on all devices
- Can incorporate your brand colors (purple, green, blue)

---

## Performance Considerations

1. **Limit pixel ratio**: Cap at 2x to prevent GPU strain on high-DPI displays
2. **Use `powerPreference: 'low-power'`**: Better battery life on laptops
3. **Pause when off-screen**: Use IntersectionObserver to stop animation when scrolled away
4. **Reduce geometry on mobile**: Detect viewport width and simplify scene
5. **Provide fallback**: Static gradient for WebGL failures

```typescript
// Performance-aware initialization
const isMobile = window.innerWidth < 768;
const particleCount = isMobile ? 500 : 2000;

// Visibility-based animation pause
const observer = new IntersectionObserver((entries) => {
  isVisible = entries[0].isIntersecting;
});
observer.observe(container);
```

---

## Fallback Strategy

```typescript
// Check WebGL support
function hasWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch (e) {
    return false;
  }
}

// In initScene:
if (!hasWebGL()) {
  container.classList.add('animated-background--fallback');
  return;
}
```

CSS fallback:
```scss
.animated-background--fallback {
  background: linear-gradient(
    135deg,
    rgba($color-purple-primary, 0.1),
    rgba($color-green-primary, 0.1),
    rgba($color-blue-primary, 0.1)
  );
}
```

---

## File Checklist

- [ ] `npm install three @types/three`
- [ ] Create `src/components/AnimatedBackground.astro`
- [ ] Create `src/components/three/BackgroundScene.ts`
- [ ] Update `src/pages/index.astro` - wrap top-fold content
- [ ] Update `src/styles/global.scss` - positioning & fallbacks
- [ ] Test on mobile devices
- [ ] Test with `prefers-reduced-motion`
- [ ] Verify Lighthouse performance score

---

## Timeline Estimate

| Task | Effort |
|------|--------|
| Setup & scaffolding | 1-2 hours |
| Basic particle/geometry animation | 2-4 hours |
| Polish & performance tuning | 2-3 hours |
| Testing & fallbacks | 1-2 hours |

---

## Resources

- [Three.js Documentation](https://threejs.org/docs/)
- [Three.js Examples](https://threejs.org/examples/)
- [Astro Client-Side Scripts](https://docs.astro.build/en/guides/client-side-scripts/)
- [drei (Three.js helpers)](https://github.com/pmndrs/drei) - optional utility library
