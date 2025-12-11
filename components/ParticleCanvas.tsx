
import React, { useRef, useEffect } from 'react';
import { ParticleSettings } from '../types';

interface ParticleCanvasProps {
  sourceVideoRef: React.RefObject<HTMLVideoElement>;
  webcamVideoRef: React.RefObject<HTMLVideoElement>;
  settings: ParticleSettings;
  isPlaying: boolean;
  analyserRef?: React.MutableRefObject<AnalyserNode | null>;
}

// Helper: Convert RGB to HSL
function rgbToHsl(r: number, g: number, b: number) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

// Character Sets for new shapes
const CHAR_SETS = {
    char: "10",
    matrix: "ﾊﾐﾋｰｳｼﾅﾓﾆｻﾜﾂｵﾘｱﾎﾃﾏｹﾒｴｶｷﾑﾕﾗｾﾈｽﾀﾇﾍ123457890",
    blocks: " ░▒▓█", // Ordered by density
    ascii: " .:-=+*#%@", // Ordered by density
    geometric: "▲▼◆●■"
};

const ParticleCanvas: React.FC<ParticleCanvasProps> = ({ sourceVideoRef, webcamVideoRef, settings, isPlaying, analyserRef }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const animationFrameRef = useRef<number | null>(null);
  const analysisCanvasRef = useRef<HTMLCanvasElement>(document.createElement('canvas'));

  // Main Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d', { alpha: true }); // Ensure alpha is enabled
    const analysisCanvas = analysisCanvasRef.current;
    const analysisCtx = analysisCanvas.getContext('2d', { willReadFrequently: true });
    
    if (!canvas || !ctx || !analysisCtx) return;

    const handleResize = () => {
      if (containerRef.current) {
        canvas.width = containerRef.current.clientWidth;
        canvas.height = containerRef.current.clientHeight;
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();

    const startTime = performance.now();
    
    // Audio data buffer
    const audioDataArray = new Uint8Array(128); // Small buffer for efficiency

    const render = (time: number) => {
      if (!isPlaying) {
        animationFrameRef.current = requestAnimationFrame(render);
        return;
      }

      // --- AUDIO ANALYSIS ---
      let audioLevel = 0; // 0.0 to 1.0
      if (analyserRef?.current) {
          analyserRef.current.getByteFrequencyData(audioDataArray);
          // Calculate average volume
          let sum = 0;
          for (let i = 0; i < audioDataArray.length; i++) {
              sum += audioDataArray[i];
          }
          audioLevel = sum / audioDataArray.length / 255; // Normalize to 0-1
      }
      
      // Dynamic modifiers based on audio
      // Beat kicks when level > 0.3
      const beat = Math.pow(audioLevel, 1.5); 
      const dynamicPixelScale = 1 + beat * 0.8; // Up to 1.8x size
      const dynamicGlow = settings.glow + (audioLevel * 20); // Add up to 20px blur

      const bgVideo = sourceVideoRef.current;
      const camVideo = webcamVideoRef.current;

      // Check if at least one source is ready
      const bgReady = bgVideo && bgVideo.readyState >= 2 && !!bgVideo.src;
      const camReady = camVideo && camVideo.srcObject && camVideo.readyState >= 2;

      if (bgReady || camReady) {
        const w = canvas.width;
        const h = canvas.height;
        const pixelSize = Math.max(2, Math.floor(settings.pixelSize));
        
        // Calculate Grid Dimensions
        const cols = Math.ceil(w / pixelSize);
        const rows = Math.ceil(h / pixelSize);
        
        // Resize analysis canvas to match grid size (low res sampling)
        if (analysisCanvas.width !== cols || analysisCanvas.height !== rows) {
            analysisCanvas.width = cols;
            analysisCanvas.height = rows;
        }

        // --- COMPOSITION STEP ---
        // 1. Clear analysis canvas (keep black for analysis baseline)
        analysisCtx.globalCompositeOperation = 'source-over';
        analysisCtx.fillStyle = '#000000';
        analysisCtx.fillRect(0, 0, cols, rows);

        // 2. Draw Background Video
        if (bgReady && bgVideo) {
            analysisCtx.drawImage(bgVideo, 0, 0, cols, rows);
        }

        // 3. Draw Webcam Video (Blended)
        if (camReady && camVideo) {
            // Use 'screen' mode to blend the light parts of the camera over the background
            analysisCtx.globalCompositeOperation = 'screen'; 
            // Optional: Flip webcam horizontally for mirror effect
            analysisCtx.save();
            analysisCtx.translate(cols, 0);
            analysisCtx.scale(-1, 1);
            analysisCtx.drawImage(camVideo, 0, 0, cols, rows);
            analysisCtx.restore();
            // Reset composite
            analysisCtx.globalCompositeOperation = 'source-over';
        }

        // 4. Get fused pixel data
        const frameData = analysisCtx.getImageData(0, 0, cols, rows);
        const data = frameData.data;

        // Clear Screen to Transparent
        ctx.clearRect(0, 0, w, h);

        const elapsed = (time - startTime) * 0.001; // Seconds

        // Determine which char set to use if using text shape
        let currentCharset = CHAR_SETS.char;
        let isTextShape = false;
        
        if (settings.shape === 'char') { currentCharset = CHAR_SETS.char; isTextShape = true; }
        else if (settings.shape === 'matrix') { currentCharset = CHAR_SETS.matrix; isTextShape = true; }
        else if (settings.shape === 'blocks') { currentCharset = CHAR_SETS.blocks; isTextShape = true; }
        else if (settings.shape === 'ascii') { currentCharset = CHAR_SETS.ascii; isTextShape = true; }
        else if (settings.shape === 'geometric') { currentCharset = CHAR_SETS.geometric; isTextShape = true; }

        if (isTextShape) {
            ctx.font = `bold ${Math.max(4, pixelSize * 0.9 + (beat * 2))}px monospace`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
        }

        // 5. Iterate through grid
        for (let i = 0; i < data.length; i += 4) {
            const pIndex = i / 4;
            const col = pIndex % cols;
            const row = Math.floor(pIndex / cols);

            // DENSITY CHECK (Deterministic spatial hash)
            if (settings.density < 1.0) {
                const noise = Math.abs(Math.sin(col * 12.9898 + row * 78.233) * 43758.5453);
                const randomVal = noise - Math.floor(noise);
                if (randomVal > settings.density) continue;
            }

            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const brightness = (r + g + b) / 3;

            // Threshold Check (modulated by audio - loud sounds reveal darker pixels)
            const effectiveThreshold = Math.max(0, settings.threshold - (audioLevel * 50));

            if (brightness > effectiveThreshold) {
                let x = col * pixelSize + pixelSize / 2;
                let y = row * pixelSize + pixelSize / 2;
                
                // Modulate render size based on audio
                // Bright pixels get bigger boost from audio
                const audioSizeBoost = (brightness / 255) * beat * pixelSize;
                const renderSize = pixelSize * (isTextShape ? 1 : 0.8) + audioSizeBoost;

                // --- ANIMATION EFFECTS ---
                // Slower and longer animations as requested
                // Audio modulates speed/amplitude
                const audioTime = elapsed * (1 + beat * 2); // Speed up time with beat
                
                if (settings.animationMode !== 'none') {
                    switch (settings.animationMode) {
                        case 'wave':
                            // Sine wave offset on Y axis based on X position
                            y += Math.sin(x * 0.02 + audioTime * 0.5) * (20 + beat * 20);
                            break;
                        case 'ripple':
                            // Radial sine wave from center
                            const centerX = w / 2;
                            const centerY = h / 2;
                            const dist = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
                            const offset = Math.sin(dist * 0.02 - audioTime * 1.5) * (15 + beat * 15);
                            x += Math.cos(Math.atan2(y - centerY, x - centerX)) * offset;
                            y += Math.sin(Math.atan2(y - centerY, x - centerX)) * offset;
                            break;
                        case 'jitter':
                            // Random noise - heavily influenced by audio high freqs (simulated by audioLevel here)
                            const jitterAmount = 4 + (audioLevel * 10);
                            x += (Math.random() - 0.5) * jitterAmount;
                            y += (Math.random() - 0.5) * jitterAmount;
                            break;
                         case 'scan':
                             // Horizontal scanline band
                             const scanPos = (elapsed * 50) % (h + 100) - 50;
                             if (Math.abs(y - scanPos) < 40 + (beat * 50)) {
                                 x += (Math.random() - 0.5) * 15;
                             }
                             break;
                    }
                }


                // Color Processing
                const hsl = rgbToHsl(r, g, b);
                let fillStyle = '';
                const lightness = hsl.l;
                
                switch (settings.colorMode) {
                    case 'grayscale':
                        fillStyle = `hsl(0, 0%, ${lightness}%)`;
                        break;
                    case 'cyber':
                        // Cyan/Blue range
                        const cyberHue = (180 + lightness / 2 + settings.hueShift + (beat * 30)) % 360;
                        fillStyle = `hsl(${cyberHue}, 80%, ${Math.min(100, lightness + 20 + beat * 20)}%)`;
                        break;
                    case 'heat':
                        // Neon/Magma Style
                        const heatHue = (270 + (lightness * 1.5) + settings.hueShift + (beat * 60)) % 360;
                        fillStyle = `hsl(${heatHue}, 100%, ${lightness + beat * 10}%)`;
                        break;
                    case 'matrix':
                        const matrixHue = (120 + settings.hueShift) % 360;
                        fillStyle = `hsl(${matrixHue}, 100%, ${Math.min(100, lightness * 1.5 + beat * 30)}%)`;
                        break;
                    case 'natural':
                    default:
                        const finalHue = (hsl.h + settings.hueShift) % 360;
                        fillStyle = `hsl(${finalHue}, ${hsl.s}%, ${Math.min(100, hsl.l + beat * 10)}%)`;
                        break;
                }

                ctx.fillStyle = fillStyle;

                // Apply Glow Effect
                if (dynamicGlow > 0) {
                    ctx.shadowBlur = dynamicGlow;
                    ctx.shadowColor = fillStyle;
                } else {
                    ctx.shadowBlur = 0;
                }

                // Shape Rendering
                if (isTextShape) {
                    // Character selection logic based on shape type
                    let charIndex = 0;
                    
                    if (settings.shape === 'blocks' || settings.shape === 'ascii') {
                         // Density mapping (brightness maps to index)
                         // Audio interaction: Beat boosts density (brighter char)
                         const normalizedBrightness = brightness / 255;
                         charIndex = Math.floor(normalizedBrightness * (currentCharset.length - 1));
                         if (beat > 0.1) {
                            // Bump index on beat
                            charIndex = Math.min(currentCharset.length - 1, charIndex + Math.floor(beat * 2));
                         }
                    } else if (settings.shape === 'matrix') {
                         // Random matrix mapping
                         // Audio interaction: Shuffles char on beat
                         // Deterministic seed based on position + slight time factor to make it "rain"
                         const timeSeed = Math.floor(time * 0.005); // Slow change
                         const fastSeed = Math.floor(time * 0.05); // Fast change
                         // If audio is loud, use fastSeed, else use timeSeed or static
                         const seed = (beat > 0.2) ? fastSeed : timeSeed;
                         
                         charIndex = (col + row * 13 + seed) % currentCharset.length;
                    } else if (settings.shape === 'geometric') {
                         // Geometric shapes
                         const seed = Math.floor(col * 3 + row * 7);
                         charIndex = seed % currentCharset.length;
                         // Audio rotation
                         if (beat > 0.2 && Math.random() > 0.5) {
                             charIndex = (charIndex + 1) % currentCharset.length;
                         }
                    } else {
                        // Binary 'char' default
                        charIndex = Math.floor((brightness / 255) * currentCharset.length);
                    }

                    const char = currentCharset[charIndex % currentCharset.length];
                    ctx.fillText(char, x, y);
                } else if (settings.shape === 'square') {
                    // Slight gap for grid look
                    const gap = 1;
                    ctx.fillRect(
                        x - renderSize / 2 + gap, 
                        y - renderSize / 2 + gap, 
                        renderSize - gap * 2, 
                        renderSize - gap * 2
                    );
                } else if (settings.shape === 'cross') {
                    const s = renderSize / 3;
                    ctx.strokeStyle = fillStyle;
                    ctx.lineWidth = Math.max(1, renderSize / 8);
                    ctx.beginPath();
                    ctx.moveTo(x - s, y);
                    ctx.lineTo(x + s, y);
                    ctx.moveTo(x, y - s);
                    ctx.lineTo(x, y + s);
                    ctx.stroke();
                } else {
                    // Circle
                    ctx.beginPath();
                    ctx.arc(x, y, renderSize * 0.4, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    animationFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      window.removeEventListener('resize', handleResize);
    };
  }, [settings, isPlaying, sourceVideoRef, webcamVideoRef, analyserRef]);

  return (
    <div ref={containerRef} className="absolute inset-0 bg-transparent overflow-hidden border border-white/5">
      <canvas ref={canvasRef} className="block w-full h-full touch-none" />
    </div>
  );
};

export default ParticleCanvas;
