
import React, { useRef, useEffect, useCallback } from 'react';
import { RenderConfig, AudioData, Particle } from '../types';

interface RendererProps {
  config: RenderConfig;
  audioData: AudioData;
  isBroadcastMode: boolean;
  onExitBroadcast: () => void;
  cameraId: string;
}

const Renderer: React.FC<RendererProps> = ({ config, audioData, isBroadcastMode, onExitBroadcast, cameraId }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);
  
  // Optimization: Grid for flow vectors and motion detection
  const gridResolution = 10; 
  const colsRef = useRef(0);
  const rowsRef = useRef(0);

  const flowGridRef = useRef<{x: number, y: number}[]>([]);
  const motionGridRef = useRef<Float32Array>(new Float32Array(0));
  const prevLumGridRef = useRef<Float32Array>(new Float32Array(0));

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isBroadcastMode) {
        onExitBroadcast();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isBroadcastMode, onExitBroadcast]);

  useEffect(() => {
    let isMounted = true;

    const startVideo = async () => {
      // Stop existing stream to avoid conflicts
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }

      try {
        const constraints: MediaStreamConstraints = {
          video: { 
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 },
            deviceId: cameraId ? { exact: cameraId } : undefined
          } 
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        
        if (!isMounted) {
          // Component unmounted while loading, clean up immediately
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        streamRef.current = stream;
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          // Handle play() promise to avoid "interrupted by new load request" error
          try {
            await videoRef.current.play();
          } catch (playErr: any) {
            // AbortError is expected if we switch cameras quickly
            if (playErr.name !== 'AbortError') {
              console.warn("Video playback interrupted or failed:", playErr);
            }
          }
        }
      } catch (err) {
        console.error("Error accessing webcam:", err);
        
        // Fallback strategy: If specific camera ID fails (e.g. permission denied for that specific ID), try generic access
        if (cameraId && isMounted) {
            try {
                console.log("Attempting fallback to default camera...");
                const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true });
                if (!isMounted) {
                    fallbackStream.getTracks().forEach(t => t.stop());
                    return;
                }
                streamRef.current = fallbackStream;
                if (videoRef.current) {
                    videoRef.current.srcObject = fallbackStream;
                    try { await videoRef.current.play(); } catch(e) {}
                }
            } catch (fallbackErr) {
                console.error("Fallback camera access failed:", fallbackErr);
            }
        }
      }
    };
    
    startVideo();

    return () => {
      isMounted = false;
      if (streamRef.current) {
         streamRef.current.getTracks().forEach(track => track.stop());
         streamRef.current = null;
      }
    };
  }, [cameraId]);

  const initParticles = useCallback((width: number, height: number) => {
    const particles: Particle[] = [];
    for (let i = 0; i < config.particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: 0,
        vy: 0,
        life: Math.random() * 100,
        maxLife: 50 + Math.random() * 50,
        color: 'rgba(0,0,0,0)',
        size: Math.random() * config.brushSize + 1
      });
    }
    particlesRef.current = particles;
  }, [config.particleCount, config.brushSize]);

  // Adjust particle count dynamically
  useEffect(() => {
    if (!canvasRef.current) return;
    const currentCount = particlesRef.current.length;
    const { width, height } = canvasRef.current;
    
    if (config.particleCount > currentCount) {
      for (let i = currentCount; i < config.particleCount; i++) {
        particlesRef.current.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: 0,
          vy: 0,
          life: Math.random() * 100,
          maxLife: 50 + Math.random() * 50,
          color: 'rgba(0,0,0,0)',
          size: Math.random() * config.brushSize + 1
        });
      }
    } else if (config.particleCount < currentCount) {
      particlesRef.current.splice(config.particleCount);
    }
  }, [config.particleCount, config.brushSize]);

  const draw = () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    // Check video readiness
    if (!canvas || !video || video.readyState < 2) {
      animationRef.current = requestAnimationFrame(draw);
      return;
    }

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      initParticles(canvas.width, canvas.height);
      
      const cols = Math.ceil(canvas.width / gridResolution);
      const rows = Math.ceil(canvas.height / gridResolution);
      colsRef.current = cols;
      rowsRef.current = rows;
      
      const gridSize = cols * rows;
      flowGridRef.current = new Array(gridSize).fill({x: 0, y: 0});
      motionGridRef.current = new Float32Array(gridSize);
      prevLumGridRef.current = new Float32Array(gridSize);
    }

    const w = canvas.width;
    const h = canvas.height;
    const cols = colsRef.current;
    const rows = rowsRef.current;

    // FADE EFFECT
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = `rgba(0, 0, 0, ${config.traceOpacity})`;
    ctx.fillRect(0, 0, w, h);

    // STYLE BLENDING MODES
    if (config.visualStyle === 'FIRE') {
      ctx.globalCompositeOperation = 'lighter';
    } else if (config.visualStyle === 'NEON_FLUID') {
      ctx.globalCompositeOperation = 'screen';
    } else {
      ctx.globalCompositeOperation = 'source-over';
    }

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = w;
    tempCanvas.height = h;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;
    tempCtx.drawImage(video, 0, 0, w, h);
    const imageData = tempCtx.getImageData(0, 0, w, h);
    const data = imageData.data;

    // --- GRID UPDATE ---
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const gridIndex = y * cols + x;
        const pixelX = x * gridResolution;
        const pixelY = y * gridResolution;
        const pixelIdx = (pixelY * w + pixelX) * 4;
        
        const luminance = (data[pixelIdx] * 0.299 + data[pixelIdx + 1] * 0.587 + data[pixelIdx + 2] * 0.114) / 255;
        
        // Motion Detection
        const prevLum = prevLumGridRef.current[gridIndex];
        const diff = Math.abs(luminance - prevLum);
        prevLumGridRef.current[gridIndex] = luminance;

        if (diff > config.motionThreshold) {
           motionGridRef.current[gridIndex] += diff * 5.0; 
        }
        motionGridRef.current[gridIndex] *= config.motionDecay; 
        if (motionGridRef.current[gridIndex] > 10) motionGridRef.current[gridIndex] = 10;

        // Flow Field
        const rightX = Math.min(x + 1, cols - 1);
        const rightLum = prevLumGridRef.current[y * cols + rightX];
        const downY = Math.min(y + 1, rows - 1);
        const downLum = prevLumGridRef.current[downY * cols + x];

        const dx = rightLum - luminance;
        const dy = downLum - luminance;

        const angle = Math.atan2(dy, dx) + Math.PI / 2;
        flowGridRef.current[gridIndex] = {
          x: Math.cos(angle),
          y: Math.sin(angle)
        };
      }
    }

    // --- PARTICLE LOOP ---
    const speedMod = 1 + (audioData.bass / 255) * 4;
    const jitterMod = (audioData.treble / 255) * config.jitter;
    const sizeMod = 1 + (audioData.mid / 255) * 1.5;

    particlesRef.current.forEach(p => {
      const gx = Math.floor(p.x / gridResolution);
      const gy = Math.floor(p.y / gridResolution);
      const gridIdx = gy * cols + gx;
      
      let flowX = 0;
      let flowY = 0;
      let gravityX = 0;
      let gravityY = 0;

      if (gx >= 0 && gx < cols && gy >= 0 && gy < rows) {
         const flow = flowGridRef.current[gridIdx];
         flowX = flow.x;
         flowY = flow.y;

         const centerM = motionGridRef.current[gridIdx];
         const rightM = motionGridRef.current[gy * cols + Math.min(gx + 1, cols - 1)];
         const leftM = motionGridRef.current[gy * cols + Math.max(gx - 1, 0)];
         const downM = motionGridRef.current[Math.min(gy + 1, rows - 1) * cols + gx];
         const upM = motionGridRef.current[Math.max(gy - 1, 0) * cols + gx];

         const gDx = (rightM - leftM) * 0.5;
         const gDy = (downM - upM) * 0.5;

         gravityX = gDx * config.interactionStrength * 20; 
         gravityY = gDy * config.interactionStrength * 20;
      }

      // Physics
      p.vx += flowX * 0.1;
      p.vy += flowY * 0.1;
      
      // Style specific physics
      if (config.visualStyle === 'FIRE') {
         p.vy -= 0.15; // Upward Buoyancy
         p.vx += (Math.random() - 0.5) * 0.2; // Turbulence
      }

      p.vx += gravityX;
      p.vy += gravityY;
      
      p.vx *= 0.9;
      p.vy *= 0.9;

      const moveSpeed = config.baseSpeed * speedMod;
      p.x += p.vx * moveSpeed * 5 + (Math.random() - 0.5) * jitterMod;
      p.y += p.vy * moveSpeed * 5 + (Math.random() - 0.5) * jitterMod;

      p.life--;
      const velocity = Math.sqrt(p.vx*p.vx + p.vy*p.vy);
      
      if (p.life <= 0 || p.x < 0 || p.x > w || p.y < 0 || p.y > h || velocity > 20) {
        p.x = Math.random() * w;
        p.y = Math.random() * h;
        // Fire particles spawn at bottom more often
        if (config.visualStyle === 'FIRE' && Math.random() > 0.3) {
           p.y = h + 10;
        }
        p.life = p.maxLife;
        p.vx = 0;
        p.vy = 0;
      }

      // DRAWING
      const pIdx = (Math.floor(p.y) * w + Math.floor(p.x)) * 4;
      if (pIdx >= 0 && pIdx < data.length) {
         let r = data[pIdx];
         let g = data[pIdx + 1];
         let b = data[pIdx + 2];
         
         // Style Color Mapping
         if (config.visualStyle === 'FIRE') {
           // Map luminance to Heat Gradient
           const lum = (r + g + b) / 3;
           // Dark = Red, Mid = Orange, Bright = Yellow
           r = Math.min(255, lum * 2);
           g = Math.min(255, Math.max(0, lum * 3 - 100));
           b = Math.min(255, Math.max(0, lum * 5 - 300));
         } else if (config.visualStyle === 'NEON_FLUID') {
            // Boost saturation
            r = Math.min(255, r * 1.5);
            g = Math.min(255, g * 1.5);
            b = Math.min(255, b * 1.5);
         }

         ctx.beginPath();
         
         if (config.visualStyle === 'VANGOGH') {
             // LINE STROKE (Original)
             const strokeLenX = p.vx * 4;
             const strokeLenY = p.vy * 4;
             ctx.moveTo(p.x - strokeLenX, p.y - strokeLenY);
             ctx.lineTo(p.x, p.y);
             ctx.strokeStyle = `rgb(${r},${g},${b})`;
             ctx.lineWidth = config.brushSize * sizeMod * (Math.random() * 0.5 + 0.5);
             ctx.lineCap = 'round';
             ctx.stroke();
         } else {
             // FLUID / FIRE (Blob/Circle)
             // Using arc creates a smooth, fluid look when combined with 'lighter' or 'screen' blending
             const radius = config.brushSize * sizeMod * (Math.random() * 0.5 + 0.8);
             ctx.fillStyle = `rgb(${r},${g},${b})`;
             ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
             ctx.fill();
         }
      }
    });

    animationRef.current = requestAnimationFrame(draw);
  };

  useEffect(() => {
    animationRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animationRef.current);
  }, [config, audioData]);

  return (
    <div className={`relative w-full h-full flex items-center justify-center bg-black ${isBroadcastMode ? 'cursor-none' : ''}`}>
      <video ref={videoRef} className="hidden" muted playsInline />
      <canvas 
        ref={canvasRef} 
        className="max-w-full max-h-full shadow-2xl" 
        style={{
          filter: `saturate(${config.colorVibrance}) contrast(1.1)`
        }}
      />
    </div>
  );
};

export default Renderer;
