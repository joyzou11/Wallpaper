
export type ColorMode = 'natural' | 'grayscale' | 'cyber' | 'heat' | 'matrix';
export type ParticleShape = 'circle' | 'square' | 'cross' | 'char' | 'matrix' | 'blocks' | 'ascii' | 'geometric';
export type AnimationMode = 'none' | 'wave' | 'ripple' | 'scan' | 'jitter';
export type ScreenEffect = 'grid' | 'focus' | 'random' | 'drift' | 'pan';

export interface ParticleSettings {
  pixelSize: number; // Size of the grid cell
  threshold: number; // Brightness threshold (0-255)
  density: number; // Probability of rendering a pixel (0.0 - 1.0)
  colorMode: ColorMode; // Visual theme
  hueShift: number; // Color rotation in degrees
  shape: ParticleShape; // Visual element style
  animationMode: AnimationMode; // Dynamic movement effect
  glow: number; // Neon glow intensity (shadow blur radius)
  // Layout offsets for Screen Effects
  offsetX: number; 
  offsetY: number;
}

export const DEFAULT_SETTINGS: ParticleSettings = {
  pixelSize: 8, // Increased default for better text visibility
  threshold: 20, 
  density: 1.0,
  colorMode: 'natural',
  hueShift: 0,
  shape: 'matrix', // Changed default to show off new features
  animationMode: 'wave', 
  glow: 0, 
  offsetX: 0,
  offsetY: 0,
};
