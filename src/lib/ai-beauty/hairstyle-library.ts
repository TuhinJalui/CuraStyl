/**
 * Hairstyle Library
 * 
 * Manages the collection of hairstyle assets for AR virtual try-on.
 * Provides at least 20 hairstyle options with metadata and categorization.
 * 
 * @see Design Document: Phase 6 - AR Virtual Makeover
 * @see Requirements: 3.8
 */

import type { HairstyleAsset } from './ar-overlay-renderer';

/**
 * Default hairstyle library
 * 
 * Note: In production, these would be actual PNG images with alpha transparency.
 * For MVP, we're using placeholder data URIs and external URLs.
 */
export const HAIRSTYLE_LIBRARY: HairstyleAsset[] = [
  {
    id: 'wolf-cut',
    name: 'Wolf Cut',
    category: 'Trendy',
    imageUrl: '/hairstyles/wolf-cut.png',
    scaleFactor: 1.6,
    offsetY: -0.6,
  },
  {
    id: 'curtain-bangs',
    name: 'Curtain Bangs',
    category: 'Classic',
    imageUrl: '/hairstyles/curtain-bangs.png',
    scaleFactor: 1.5,
    offsetY: -0.5,
  },
  {
    id: 'fade-cut',
    name: 'Fade Cut',
    category: 'Modern',
    imageUrl: '/hairstyles/fade-cut.png',
    scaleFactor: 1.4,
    offsetY: -0.4,
  },
  {
    id: 'layered-long',
    name: 'Layered Long',
    category: 'Elegant',
    imageUrl: '/hairstyles/layered-long.png',
    scaleFactor: 1.7,
    offsetY: -0.7,
  },
  {
    id: 'buzz-cut',
    name: 'Buzz Cut',
    category: 'Bold',
    imageUrl: '/hairstyles/buzz-cut.png',
    scaleFactor: 1.3,
    offsetY: -0.3,
  },
  {
    id: 'korean-perm',
    name: 'Korean Perm',
    category: 'Trendy',
    imageUrl: '/hairstyles/korean-perm.png',
    scaleFactor: 1.6,
    offsetY: -0.6,
  },
  {
    id: 'bob-cut',
    name: 'Bob Cut',
    category: 'Classic',
    imageUrl: '/hairstyles/bob-cut.png',
    scaleFactor: 1.5,
    offsetY: -0.5,
  },
  {
    id: 'pixie-cut',
    name: 'Pixie Cut',
    category: 'Chic',
    imageUrl: '/hairstyles/pixie-cut.png',
    scaleFactor: 1.4,
    offsetY: -0.4,
  },
  {
    id: 'side-part',
    name: 'Side Part',
    category: 'Professional',
    imageUrl: '/hairstyles/side-part.png',
    scaleFactor: 1.5,
    offsetY: -0.5,
  },
  {
    id: 'man-bun',
    name: 'Man Bun',
    category: 'Casual',
    imageUrl: '/hairstyles/man-bun.png',
    scaleFactor: 1.5,
    offsetY: -0.5,
  },
  {
    id: 'undercut',
    name: 'Undercut',
    category: 'Modern',
    imageUrl: '/hairstyles/undercut.png',
    scaleFactor: 1.4,
    offsetY: -0.4,
  },
  {
    id: 'quiff',
    name: 'Quiff',
    category: 'Stylish',
    imageUrl: '/hairstyles/quiff.png',
    scaleFactor: 1.5,
    offsetY: -0.5,
  },
  {
    id: 'beach-waves',
    name: 'Beach Waves',
    category: 'Casual',
    imageUrl: '/hairstyles/beach-waves.png',
    scaleFactor: 1.6,
    offsetY: -0.6,
  },
  {
    id: 'slicked-back',
    name: 'Slicked Back',
    category: 'Formal',
    imageUrl: '/hairstyles/slicked-back.png',
    scaleFactor: 1.5,
    offsetY: -0.5,
  },
  {
    id: 'afro',
    name: 'Afro',
    category: 'Bold',
    imageUrl: '/hairstyles/afro.png',
    scaleFactor: 1.8,
    offsetY: -0.8,
  },
  {
    id: 'braids',
    name: 'Braids',
    category: 'Elegant',
    imageUrl: '/hairstyles/braids.png',
    scaleFactor: 1.6,
    offsetY: -0.6,
  },
  {
    id: 'mohawk',
    name: 'Mohawk',
    category: 'Edgy',
    imageUrl: '/hairstyles/mohawk.png',
    scaleFactor: 1.5,
    offsetY: -0.6,
  },
  {
    id: 'pompadour',
    name: 'Pompadour',
    category: 'Vintage',
    imageUrl: '/hairstyles/pompadour.png',
    scaleFactor: 1.6,
    offsetY: -0.7,
  },
  {
    id: 'shag',
    name: 'Shag Cut',
    category: 'Retro',
    imageUrl: '/hairstyles/shag.png',
    scaleFactor: 1.6,
    offsetY: -0.6,
  },
  {
    id: 'mullet',
    name: 'Mullet',
    category: 'Trendy',
    imageUrl: '/hairstyles/mullet.png',
    scaleFactor: 1.7,
    offsetY: -0.6,
  },
];

/**
 * Hairstyle Library Manager
 * 
 * Manages hairstyle assets with caching and preloading capabilities.
 */
export class HairstyleLibraryManager {
  private styles: Map<string, HairstyleAsset> = new Map();
  private loadedImages: Map<string, HTMLImageElement> = new Map();
  
  constructor(styles: HairstyleAsset[] = HAIRSTYLE_LIBRARY) {
    styles.forEach(style => {
      this.styles.set(style.id, style);
    });
  }
  
  /**
   * Get all available hairstyles
   */
  getAllStyles(): HairstyleAsset[] {
    return Array.from(this.styles.values());
  }
  
  /**
   * Get hairstyle by ID
   */
  getStyle(id: string): HairstyleAsset | undefined {
    return this.styles.get(id);
  }
  
  /**
   * Get hairstyles by category
   */
  getStylesByCategory(category: string): HairstyleAsset[] {
    return this.getAllStyles().filter(style => style.category === category);
  }
  
  /**
   * Get all categories
   */
  getCategories(): string[] {
    const categories = new Set<string>();
    this.styles.forEach(style => categories.add(style.category));
    return Array.from(categories);
  }
  
  /**
   * Preload hairstyle images
   * 
   * @param styleIds - Optional array of style IDs to preload (preloads all if not specified)
   * @returns Promise that resolves when all images are loaded
   */
  async preloadStyles(styleIds?: string[]): Promise<void> {
    const idsToLoad = styleIds || Array.from(this.styles.keys());
    
    const promises = idsToLoad.map(id => {
      const style = this.styles.get(id);
      if (!style) return Promise.resolve();
      
      return new Promise<void>((resolve, reject) => {
        // Skip if already loaded
        if (this.loadedImages.has(id)) {
          resolve();
          return;
        }
        
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        img.onload = () => {
          this.loadedImages.set(id, img);
          resolve();
        };
        
        img.onerror = () => {
          console.warn(`Failed to preload hairstyle image: ${style.imageUrl}`);
          resolve(); // Don't reject, just skip this image
        };
        
        img.src = style.imageUrl;
      });
    });
    
    await Promise.all(promises);
  }
  
  /**
   * Get preloaded image for a style
   */
  getLoadedImage(styleId: string): HTMLImageElement | undefined {
    return this.loadedImages.get(styleId);
  }
  
  /**
   * Clear preloaded images to free memory
   */
  clearCache(): void {
    this.loadedImages.clear();
  }
}

/**
 * Create placeholder hairstyle images
 * 
 * Generates simple colored rectangles as placeholder hairstyles for development/testing.
 * Replace with actual hairstyle PNG assets in production.
 */
export function createPlaceholderHairstyleImages(): void {
  // This would be called in development to generate placeholder images
  // In production, use actual designer-created hairstyle assets
  
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) return;
  
  HAIRSTYLE_LIBRARY.forEach((style, index) => {
    // Draw simple gradient as placeholder
    const gradient = ctx.createLinearGradient(0, 0, 512, 512);
    const hue = (index * 360 / HAIRSTYLE_LIBRARY.length);
    gradient.addColorStop(0, `hsl(${hue}, 70%, 60%)`);
    gradient.addColorStop(1, `hsl(${hue}, 70%, 40%)`);
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 512);
    
    // Add style name text
    ctx.fillStyle = 'white';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(style.name, 256, 256);
    
    // Convert to data URL (in production, save as PNG files)
    // style.imageUrl = canvas.toDataURL('image/png');
  });
}
