
import React, { useState, useEffect, useRef } from 'react';
import ParticleCanvas from './components/ParticleCanvas';
import Controls from './components/Controls';
import { ParticleSettings, DEFAULT_SETTINGS, ScreenEffect } from './types';
import { AlertCircle, X } from 'lucide-react';
import { FaceDetector, FilesetResolver } from '@mediapipe/tasks-vision';

function App() {
  const [videoSource, setVideoSource] = useState<string | null>(null);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  
  // Audio State
  const [isMicActive, setIsMicActive] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  // Face Detection State
  const [isFaceGridMode, setIsFaceGridMode] = useState(false);
  const faceDetectorRef = useRef<FaceDetector | null>(null);
  const lastVideoTimeRef = useRef<number>(-1);

  // Grid Layout State
  const [layout, setLayout] = useState({ rows: 2, cols: 2 });
  const [uiGridDim, setUiGridDim] = useState(2); // For UI selection state
  
  const [gridSettings, setGridSettings] = useState<ParticleSettings[]>([]);
  
  const [isPlaying, setIsPlaying] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Layout Animation State
  const [screenEffect, setScreenEffect] = useState<ScreenEffect>('grid'); 
  const [isAutoLayout, setIsAutoLayout] = useState(false);
  const [layoutStage, setLayoutStage] = useState(0); // 0-6 stages
  const [layoutSeed, setLayoutSeed] = useState(0); // For random/focus animations

  // Shared Video References
  const sourceVideoRef = useRef<HTMLVideoElement>(null);
  const webcamVideoRef = useRef<HTMLVideoElement>(null);

  // Initialize/Update grid settings when layout changes
  useEffect(() => {
    const totalCells = layout.rows * layout.cols;
    setGridSettings(prev => {
        // If exact match, do nothing (prevents reset on minor updates)
        if (prev.length === totalCells) return prev;
        
        const newSettings = [...prev];
        
        // Shrink array if needed
        if (newSettings.length > totalCells) {
            return newSettings.slice(0, totalCells);
        }
        
        // Expand array if needed
        // Copy the first cell's settings to maintain theme (color, shape), but vary the offsets
        const template = newSettings[0] || DEFAULT_SETTINGS;
        
        while (newSettings.length < totalCells) {
            const index = newSettings.length;
            newSettings.push({
                ...template,
                hueShift: (template.hueShift + (360 / totalCells) * index) % 360,
                offsetX: (Math.random() - 0.5) * 50,
                offsetY: (Math.random() - 0.5) * 50,
            });
        }
        return newSettings;
    });
  }, [layout]);

  const handleReset = () => {
    const totalCells = layout.rows * layout.cols;
    const initialSettings = Array(totalCells).fill(null).map((_, index) => ({
      ...DEFAULT_SETTINGS,
      hueShift: (360 / totalCells) * index,
      offsetX: (Math.random() - 0.5) * 50,
      offsetY: (Math.random() - 0.5) * 50,
    }));
    setGridSettings(initialSettings);
  };

  // Initialize Face Detector
  useEffect(() => {
    const initFaceDetector = async () => {
        try {
            const vision = await FilesetResolver.forVisionTasks(
                "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
            );
            faceDetectorRef.current = await FaceDetector.createFromOptions(vision, {
                baseOptions: {
                    modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite`,
                    delegate: "GPU"
                },
                runningMode: "VIDEO"
            });
            console.log("Face Detector Initialized");
        } catch (e) {
            console.error("Failed to initialize Face Detector", e);
        }
    };
    initFaceDetector();
  }, []);

  // Face Detection Loop
  useEffect(() => {
    let intervalId: any;

    if (isFaceGridMode && mediaStream && webcamVideoRef.current && faceDetectorRef.current) {
        intervalId = setInterval(() => {
            const video = webcamVideoRef.current;
            if (video && video.readyState >= 2 && video.currentTime !== lastVideoTimeRef.current) {
                lastVideoTimeRef.current = video.currentTime;
                
                try {
                    const detections = faceDetectorRef.current?.detectForVideo(video, performance.now()).detections;
                    const count = detections ? detections.length : 0;
                    
                    // Match panels to face count
                    // 0 or 1 face -> 1 Panel (1x1)
                    // 2 faces -> 2 Panels (1x2 side-by-side)
                    // 3 faces -> 4 Panels (2x2) - closest square grid
                    // 4 faces -> 4 Panels (2x2)
                    // 5+ faces -> Row/Col calculation
                    
                    let targetRows = 1;
                    let targetCols = 1;

                    if (count <= 1) {
                         targetRows = 1; targetCols = 1;
                    } else if (count === 2) {
                         targetRows = 1; targetCols = 2; // Landscape friendly split
                    } else {
                         // General algorithm for N > 2
                         targetCols = Math.ceil(Math.sqrt(count));
                         targetRows = Math.ceil(count / targetCols);
                    }
                    
                    setLayout(prev => {
                        if (prev.rows !== targetRows || prev.cols !== targetCols) {
                            return { rows: targetRows, cols: targetCols };
                        }
                        return prev;
                    });
                    
                    // Update UI indicator if square, else deselect
                    if (targetRows === targetCols && [1,2,4,8].includes(targetRows)) {
                        setUiGridDim(targetRows);
                    } else {
                        setUiGridDim(0);
                    }

                } catch (e) {
                    console.error("Detection error", e);
                }
            }
        }, 500); // Check every 500ms to allow stability
    }

    return () => clearInterval(intervalId);
  }, [isFaceGridMode, mediaStream]);

  // Handle Source Video Logic
  useEffect(() => {
    const video = sourceVideoRef.current;
    if (video) {
        if (videoSource) {
            video.crossOrigin = "anonymous";
            video.src = videoSource;
            video.loop = true;
            video.muted = true;
            video.playbackRate = 1.0; 
            video.play().catch(e => console.error("Source play failed", e));
        } else {
            video.removeAttribute('src'); 
            video.load();
        }
    }
  }, [videoSource]);

  // Handle Webcam Video Logic
  useEffect(() => {
    const video = webcamVideoRef.current;
    if (video) {
        if (mediaStream) {
            video.srcObject = mediaStream;
            video.muted = true;
            video.play().catch(e => console.error("Webcam play failed", e));
        } else {
            video.srcObject = null;
        }
    }
    return () => {
        // Cleanup handled by component unmount or next effect
    };
  }, [mediaStream]);

  // Handle Play/Pause
  useEffect(() => {
    const video = sourceVideoRef.current;
    if (video && videoSource) {
        if (isPlaying) video.play().catch(() => {});
        else video.pause();
    }
  }, [isPlaying, videoSource]);

  // Cleanup Media
  useEffect(() => {
    return () => {
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
          audioContextRef.current.close();
      }
    };
  }, [mediaStream]);

  // LAYOUT SEQUENCER
  useEffect(() => {
      let interval: ReturnType<typeof setInterval>;
      if (isAutoLayout) {
          interval = setInterval(() => {
              // Cycle through stages 0 to 6
              setLayoutStage(prev => {
                  const next = (prev + 1) % 7;
                  if (next === 6) setLayoutSeed(Math.random() * 1000); // New random seed
                  return next;
              });
          }, 4000); // Change stage every 4 seconds
      } else {
          // Reset when auto is off
          setLayoutStage(4);
      }
      return () => clearInterval(interval);
  }, [isAutoLayout]);

  const handleVideoUpload = (file: File) => {
    const url = URL.createObjectURL(file);
    setVideoSource(url);
    setError(null);
  };

  const handleToggleWebcam = async () => {
    if (mediaStream) {
      setMediaStream(null);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        setMediaStream(stream);
        setError(null);
      } catch (err) {
        console.error("Webcam access denied", err);
        setError("Could not access webcam. Please check permissions.");
      }
    }
  };

  const handleToggleMic = async () => {
      if (isMicActive) {
          if (audioContextRef.current) {
              audioContextRef.current.close();
              audioContextRef.current = null;
              analyserRef.current = null;
          }
          setIsMicActive(false);
      } else {
          try {
              const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
              const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
              const analyser = ctx.createAnalyser();
              analyser.fftSize = 256;
              analyser.smoothingTimeConstant = 0.8;
              
              const source = ctx.createMediaStreamSource(stream);
              source.connect(analyser);
              
              audioContextRef.current = ctx;
              analyserRef.current = analyser;
              audioSourceRef.current = source;
              setIsMicActive(true);
              setError(null);
          } catch (err) {
              console.error("Microphone access denied", err);
              setError("Could not access microphone.");
          }
      }
  };

  const handleToggleFaceGrid = () => {
    const nextState = !isFaceGridMode;
    setIsFaceGridMode(nextState);
    if (nextState) {
        setIsAutoLayout(false); // Disable auto layout conflict
        setScreenEffect('grid'); // Reset effects
        if (!mediaStream) {
            handleToggleWebcam(); // Auto-enable camera
        }
    }
  };

  const handleGlobalSettingsChange = (key: keyof ParticleSettings, value: number | string) => {
    setGridSettings(prev => prev.map(s => ({ ...s, [key]: value })));
  };

  const handleGridDimChange = (dim: number) => {
      setUiGridDim(dim);
      setLayout({ rows: dim, cols: dim });
      setIsAutoLayout(false); // Disable auto layout if user manually changes grid size
      setIsFaceGridMode(false); // Disable face mode if user manually overrides
  };

  const handleToggleAutoLayout = () => {
      if (!isAutoLayout) {
          setLayout({ rows: 8, cols: 8 }); // Force 8x8 for optimal auto layout experience
          setUiGridDim(8);
          setScreenEffect('grid'); // Reset effects
          setIsFaceGridMode(false); // Disable face mode
      }
      setIsAutoLayout(!isAutoLayout);
  };

  // Helper to calculate styles for Grid Transitions
  const getScreenStyle = (index: number): React.CSSProperties => {
      // --- AUTO LAYOUT STAGES (0-6) ---
      // Only applies if Auto Layout is ON and we are in 8x8 mode (64 cells)
      if (isAutoLayout && layout.cols === 8 && layout.rows === 8) {
        const row = Math.floor(index / 8);
        const col = index % 8;
        const transition = 'all 1.2s cubic-bezier(0.25, 1, 0.5, 1)';

        // Stage 0: Single (Cell 27)
        if (layoutStage === 0) {
            if (index === 27) return { 
                transform: 'translate(50%, 50%) scale(8)', 
                zIndex: 50,
                opacity: 1,
                transition 
            };
            return { opacity: 0, transform: 'scale(0)', transition };
        }

        // Stage 1: Dual (Cells 27 & 28)
        if (layoutStage === 1) {
            if (index === 27) return { transform: 'translate(-150%, 50%) scale(8)', zIndex: 40, opacity: 1, transition };
            if (index === 28) return { transform: 'translate(150%, 50%) scale(8)', zIndex: 40, opacity: 1, transition };
            return { opacity: 0, transform: 'scale(0)', transition };
        }

        // Stage 2: Quad (Cells 27, 28, 35, 36)
        if (layoutStage === 2) {
            if (index === 27) return { transform: 'translate(-150%, -150%) scale(4)', zIndex: 30, opacity: 1, transition };
            if (index === 28) return { transform: 'translate(150%, -150%) scale(4)', zIndex: 30, opacity: 1, transition };
            if (index === 35) return { transform: 'translate(-150%, 150%) scale(4)', zIndex: 30, opacity: 1, transition };
            if (index === 36) return { transform: 'translate(150%, 150%) scale(4)', zIndex: 30, opacity: 1, transition };
            return { opacity: 0, transform: 'scale(0.5)', transition };
        }

        // Stage 3: 4x4 (Rows 2-5, Cols 2-5)
        if (layoutStage === 3) {
            if (row >= 2 && row <= 5 && col >= 2 && col <= 5) {
                const tx = (col - 3.5) * 100;
                const ty = (row - 3.5) * 100;
                return { 
                    transform: `translate(${tx}%, ${ty}%) scale(2)`, 
                    zIndex: 20, 
                    opacity: 1,
                    transition 
                };
            }
            return { opacity: 0, transform: 'scale(0.8)', transition };
        }

        // Stage 4: Full 8x8
        if (layoutStage === 4) {
            return { transform: 'scale(1) translate(0, 0)', opacity: 1, transition };
        }

        // Stage 5: Focus
        if (layoutStage === 5) {
            if (index === 27) return { transform: 'scale(1.5)', zIndex: 50, boxShadow: '0 0 50px rgba(255,255,255,0.2)', transition };
            return { opacity: 0.3, transform: 'scale(0.9)', filter: 'blur(3px)', transition };
        }

        // Stage 6: Random
        if (layoutStage === 6) {
            const isVisible = ((index * 7 + layoutSeed) % 10) > 3;
            return { 
                opacity: isVisible ? 1 : 0.1, 
                transform: isVisible ? 'scale(1)' : 'scale(0.8)',
                transition: 'opacity 0.5s ease' 
            };
        }
      }

      // --- MANUAL EFFECTS ---
      if (screenEffect === 'grid') return {};

      // Pan Effect
      if (screenEffect === 'pan') {
          const row = Math.floor(index / layout.cols);
          const isEven = row % 2 === 0;
          return {
              transform: `translateX(${isEven ? '-10%' : '10%'})`,
              transition: 'transform 3s ease-in-out'
          };
      }
      
      // Random / Drift / Focus
      if (screenEffect === 'random') return { opacity: Math.random() > 0.5 ? 1 : 0.2 };
      
      if (screenEffect === 'focus') {
          // Find approx center index
          const centerIndex = Math.floor(gridSettings.length / 2) + Math.floor(layout.cols / 2);
          return index === centerIndex ? { transform: 'scale(1.2)', zIndex: 10 } : { filter: 'blur(2px)', opacity: 0.5 };
      }
      
      // Drift (just subtle movement based on pre-calculated offsets)
      if (screenEffect === 'drift') {
          const s = gridSettings[index];
          return { transform: `translate(${s.offsetX}px, ${s.offsetY}px)` };
      }

      return {};
  };

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Hidden Sources */}
      <video ref={sourceVideoRef} className="hidden" playsInline loop muted />
      <video ref={webcamVideoRef} className="hidden" playsInline muted />

      {/* Grid Container */}
      <div 
        className="w-full h-full grid bg-transparent transition-all duration-500"
        style={{ 
            perspective: '1000px',
            gridTemplateColumns: `repeat(${layout.cols}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${layout.rows}, minmax(0, 1fr))`
        }}
      >
        {gridSettings.map((settings, index) => (
          <div 
            key={index} 
            className="relative w-full h-full overflow-hidden transition-all duration-500 ease-out"
            style={getScreenStyle(index)}
          >
            <ParticleCanvas
              sourceVideoRef={sourceVideoRef}
              webcamVideoRef={webcamVideoRef}
              settings={settings}
              isPlaying={isPlaying}
              analyserRef={analyserRef}
            />
            {/* Cell ID Overlay (Debug/Aesthetic) */}
            <div className="absolute top-1 left-1 text-[8px] text-white/20 font-mono pointer-events-none">
                {index.toString().padStart(2, '0')}
            </div>
          </div>
        ))}
      </div>

      {/* UI Controls */}
      <Controls
        settings={gridSettings[0] || DEFAULT_SETTINGS}
        onSettingsChange={handleGlobalSettingsChange}
        onVideoUpload={handleVideoUpload}
        isPlaying={isPlaying}
        onTogglePlay={() => setIsPlaying(!isPlaying)}
        onReset={handleReset}
        isWebcamActive={!!mediaStream}
        onToggleWebcam={handleToggleWebcam}
        screenEffect={screenEffect}
        onScreenEffectChange={(e) => {
            setScreenEffect(e);
            setIsAutoLayout(false);
            setIsFaceGridMode(false);
        }}
        gridDim={uiGridDim}
        onGridDimChange={handleGridDimChange}
        isAutoLayout={isAutoLayout}
        onToggleAutoLayout={handleToggleAutoLayout}
        isMicActive={isMicActive}
        onToggleMic={handleToggleMic}
        isFaceGridMode={isFaceGridMode}
        onToggleFaceGrid={handleToggleFaceGrid}
      />

      {/* Error Toast */}
      {error && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 bg-red-500/90 text-white px-4 py-2 rounded-full flex items-center gap-2 text-sm shadow-xl animate-in fade-in slide-in-from-top-4">
          <AlertCircle size={16} />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-2 hover:text-white/80">
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
