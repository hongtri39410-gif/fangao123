
export type VisualStyle = 'VANGOGH' | 'FIRE' | 'NEON_FLUID';

export interface RenderConfig {
  visualStyle: VisualStyle;
  particleCount: number;
  baseSpeed: number;
  traceOpacity: number; // Controls the "smear" or trail length (0-1)
  brushSize: number;
  jitter: number; // Randomness in direction
  colorVibrance: number; // Saturation booster
  interactionStrength: number; // Force of attraction towards motion
  motionDecay: number; // How quickly the motion gravity fades (0-1)
  motionThreshold: number; // Minimum pixel change to register motion
}

export interface AudioData {
  bass: number; // 0-255, low frequency energy
  mid: number;  // 0-255
  treble: number; // 0-255, high frequency energy
  isPlaying: boolean;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}
