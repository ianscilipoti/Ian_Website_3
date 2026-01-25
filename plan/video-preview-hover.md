# Video Preview on Hover - Implementation Plan

## Goal
When hovering over a project card on the home page, play a preview video if the project has a `preview.mp4` file. Projects without a video should continue showing just the static image.

## Current State
- Projects with `preview.mp4`: `lighting`, `lowpoly`, `visualizer`, `genArt`
- Projects without: `cities`, `effects`, `painter`, `VRthesis`
- The `Content.astro` component receives an `image` prop and renders it
- The home page (`index.astro`) maps over projects and passes `project.data.previewImg?.src` as the image

## Implementation Steps

### 1. Add `previewVideo` to project frontmatter schema
**File:** `src/content/projects/*/index.md` (for projects with videos)

Add a `previewVideo` field to the frontmatter of projects that have preview.mp4:
```yaml
previewVideo: preview.mp4
```

Projects to update:
- `lighting/index.md`
- `lowpoly/index.md`
- `visualizer/index.md`
- `genArt/index.md`

### 2. Update Content.astro component
**File:** `src/components/Content.astro`

#### 2a. Add video prop to interface
```typescript
export interface Props {
  title: string;
  date?: string;
  description?: string;
  href?: string;
  image?: string;
  video?: string;  // <-- Add this
  color?: 'purple' | 'green' | 'blue';
}
```

#### 2b. Update the image container markup
Replace the image-only rendering with a container that includes both image and video:
```astro
{image && (
  <div class="content-card__image">
    <img src={image} alt={title} />
    {video && (
      <video
        src={video}
        muted
        loop
        playsinline
        preload="metadata"
        class="content-card__video"
      />
    )}
  </div>
)}
```

#### 2c. Add CSS for video overlay
```scss
&__video {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
  transition: opacity 0.3s ease;
}

&:hover &__video {
  opacity: 1;
}
```

Also update `&__image` to have `position: relative` for the absolute video positioning.

#### 2d. Add client-side JavaScript for play/pause
Add a `<script>` tag to handle hover play/pause:
```html
<script>
  document.querySelectorAll('.content-card').forEach(card => {
    const video = card.querySelector('.content-card__video');
    if (video) {
      card.addEventListener('mouseenter', () => {
        video.currentTime = 0;
        video.play();
      });
      card.addEventListener('mouseleave', () => {
        video.pause();
      });
    }
  });
</script>
```

### 3. Update index.astro to pass video prop
**File:** `src/pages/index.astro`

Update the Content component usage to pass the video:
```astro
<Content
  title={project.data.title}
  date="January 2025"
  description={project.data.description}
  href={`/projects/${project.id}`}
  image={project.data.previewImg?.src}
  video={project.data.previewVideo?.src}
  color={project.data.color}
/>
```

## Alternative Approach: Auto-detect videos

Instead of adding frontmatter, we could auto-detect `preview.mp4` files at build time using Astro's `import.meta.glob`. This would:
- Avoid needing to update each project's frontmatter
- Automatically pick up new videos when added

```astro
// In index.astro
const videoFiles = import.meta.glob('/src/content/projects/*/preview.mp4', { as: 'url' });

// Then match videos to projects by folder name
```

**Trade-off:** More "magic" but less explicit control.

## Considerations

1. **Video file size**: Preview videos should be short (2-5 seconds) and compressed for web
2. **Mobile**: Consider disabling video on mobile (touch devices don't have hover)
3. **Preloading**: Using `preload="metadata"` avoids loading full videos until needed
4. **Accessibility**: Videos are muted and decorative, so no captions needed
5. **Performance**: Videos only play on hover, not on page load

## Files to Modify
1. `src/content/projects/lighting/index.md` - add previewVideo
2. `src/content/projects/lowpoly/index.md` - add previewVideo
3. `src/content/projects/visualizer/index.md` - add previewVideo
4. `src/content/projects/genArt/index.md` - add previewVideo
5. `src/components/Content.astro` - add video prop, markup, styles, and script
6. `src/pages/index.astro` - pass video prop to Content
