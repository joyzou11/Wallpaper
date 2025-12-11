
import React, { useState, useRef } from 'react';
import { Settings2, Upload, Play, Pause, RefreshCw, Camera, CameraOff, Circle, Square, Plus, Type, Activity, Waves, Zap, ScanLine, Ban, Lightbulb, Grid3X3, Focus, Shuffle, Move, ArrowLeftRight, LayoutGrid, MonitorPlay, Mic, MicOff, ScanFace, Binary, StretchHorizontal, Hash, Triangle } from 'lucide-react';
import { ParticleSettings, ColorMode, ParticleShape, AnimationMode, ScreenEffect } from '../types';

interface ControlsProps {
  settings: ParticleSettings;
  onSettingsChange: (key: keyof ParticleSettings, value: number | string) => void;
  onVideoUpload: (file: File) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onReset: () => void;
  isWebcamActive: boolean;
  onToggleWebcam: () => void;
  screenEffect: ScreenEffect;
  onScreenEffectChange: (effect: ScreenEffect) => void;
  gridDim: number;
  onGridDimChange: (dim: number) => void;
  isAutoLayout: boolean;
  onToggleAutoLayout: () => void;
  isMicActive: boolean;
  onToggleMic: () => void;
  isFaceGridMode: boolean;
  onToggleFaceGrid: () => void;
}

const Controls: React.FC<ControlsProps> = ({
  settings,
  onSettingsChange,
  onVideoUpload,
  isPlaying,
  onTogglePlay,
  onReset,
  isWebcamActive,
  onToggleWebcam,
  screenEffect,
  onScreenEffectChange,
  gridDim,
  onGridDimChange,
  isAutoLayout,
  onToggleAutoLayout,
  isMicActive,
  onToggleMic,
  isFaceGridMode,
  onToggleFaceGrid,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleMouseEnter = () => setIsVisible(true);
  const handleMouseLeave = () => setIsVisible(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && onVideoUpload) {
      onVideoUpload(e.target.files[0]);
    }
  };

  const colorModes: { id: ColorMode; label: string; color: string }[] = [
    { id: 'natural', label: 'Nat', color: 'bg-gradient-to-r from-red-500 via-green-500 to-blue-500' },
    { id: 'grayscale', label: 'Mono', color: 'bg-gradient-to-r from-gray-700 to-gray-300' },
    { id: 'cyber', label: 'Cyber', color: 'bg-gradient-to-r from-blue-600 to-cyan-400' },
    { id: 'heat', label: 'Neon', color: 'bg-gradient-to-r from-blue-600 via-green-500 to-pink-500' },
    { id: 'matrix', label: 'Mtrx', color: 'bg-gradient-to-r from-green-800 to-green-400' },
  ];

  const shapes: { id: ParticleShape; icon: React.FC<any>; label: string }[] = [
      { id: 'circle', icon: Circle, label: 'Circle' },
      { id: 'square', icon: Square, label: 'Square' },
      { id: 'cross', icon: Plus, label: 'Cross' },
      { id: 'char', icon: Type, label: 'Text' },
      { id: 'matrix', icon: Binary, label: 'Matrix' },
      { id: 'blocks', icon: StretchHorizontal, label: 'Block' },
      { id: 'ascii', icon: Hash, label: 'ASCII' },
      { id: 'geometric', icon: Triangle, label: 'Geo' },
  ];

  const animations: { id: AnimationMode; icon: React.FC<any>; label: string }[] = [
      { id: 'none', icon: Ban, label: 'Static' },
      { id: 'wave', icon: Waves, label: 'Wave' },
      { id: 'ripple', icon: Activity, label: 'Ripple' },
      { id: 'scan', icon: ScanLine, label: 'Scan' },
      { id: 'jitter', icon: Zap, label: 'Jitter' },
  ];

  const screenEffects: { id: ScreenEffect; icon: React.FC<any>; label: string }[] = [
      { id: 'grid', icon: Grid3X3, label: 'Grid' },
      { id: 'focus', icon: Focus, label: 'Focus' },
      { id: 'random', icon: Shuffle, label: 'Rand' },
      { id: 'drift', icon: Move, label: 'Drift' },
      { id: 'pan', icon: ArrowLeftRight, label: 'Pan' },
  ];

  const gridOptions = [1, 2, 4, 8];

  return (
    <div
      className="fixed bottom-6 right-6 z-50 flex flex-col items-end"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Control Panel */}
      <div
        className={`
          mb-4 overflow-hidden transition-all duration-300 ease-in-out bg-black/90 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl
          ${isVisible ? 'opacity-100 w-72 translate-y-0 scale-100' : 'opacity-0 w-72 translate-y-4 scale-95 pointer-events-none h-0'}
        `}
      >
        <div className="p-5 space-y-5 text-white/90">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 className="text-sm font-bold tracking-widest uppercase text-white/80">System Control</h3>
            <div className="flex gap-2">
               <button
                onClick={onTogglePlay}
                className="p-1.5 hover:bg-white/10 rounded-md transition-colors text-white/70 hover:text-white"
                title={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? <Pause size={16} /> : <Play size={16} />}
              </button>
              <button
                onClick={onReset}
                className="p-1.5 hover:bg-white/10 rounded-md transition-colors text-white/70 hover:text-white"
                title="Reset Settings"
              >
                <RefreshCw size={16} />
              </button>
            </div>
          </div>

          {/* Grid Panel Count Selector */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
                <div className="text-[10px] uppercase tracking-wider text-white/40 font-semibold flex items-center gap-2">
                    <LayoutGrid size={12} />
                    <span>Panel Grid ({gridDim}x{gridDim})</span>
                </div>
                {/* Auto Layout Toggles */}
                <div className="flex gap-1">
                    <button 
                      onClick={onToggleFaceGrid}
                      title="Auto-Scale by Face Count"
                      className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] border transition-all ${isFaceGridMode ? 'bg-orange-500/20 border-orange-500 text-orange-300' : 'bg-white/5 border-white/10 text-white/50 hover:text-white'}`}
                    >
                      <ScanFace size={10} />
                    </button>
                    <button 
                      onClick={onToggleAutoLayout}
                      title="Auto-Sequence Layout"
                      className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] border transition-all ${isAutoLayout ? 'bg-purple-500/20 border-purple-500 text-purple-300' : 'bg-white/5 border-white/10 text-white/50 hover:text-white'}`}
                    >
                      <MonitorPlay size={10} />
                      <span className="hidden sm:inline">Seq</span>
                    </button>
                </div>
            </div>
            <div className="grid grid-cols-4 gap-2">
                {gridOptions.map((dim) => (
                    <button
                        key={dim}
                        onClick={() => onGridDimChange(dim)}
                        className={`
                            py-1.5 text-xs font-mono rounded-md border transition-all
                            ${gridDim === dim && !isAutoLayout && !isFaceGridMode
                                ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400' 
                                : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white'
                            }
                        `}
                    >
                        {dim}x{dim}
                    </button>
                ))}
            </div>
          </div>

          {/* Source Management */}
          <div className="space-y-2">
            <div className="text-[10px] uppercase tracking-wider text-white/40 font-semibold">Sources & Input</div>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-1.5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-all text-[11px] group"
                title="Upload Video"
              >
                <Upload size={13} className="group-hover:text-cyan-400 transition-colors" />
                <span>Video</span>
              </button>
              <button
                onClick={onToggleWebcam}
                className={`
                  flex items-center justify-center gap-1.5 py-2.5 border rounded-lg transition-all text-[11px]
                  ${isWebcamActive 
                    ? 'bg-red-500/20 border-red-500/50 text-red-300 hover:bg-red-500/30' 
                    : 'bg-white/5 border-white/10 hover:bg-white/10 text-white group'
                  }
                `}
                title="Toggle Webcam"
              >
                {isWebcamActive ? <CameraOff size={13} /> : <Camera size={13} className="group-hover:text-cyan-400 transition-colors" />}
                <span>Cam</span>
              </button>
               <button
                onClick={onToggleMic}
                className={`
                  flex items-center justify-center gap-1.5 py-2.5 border rounded-lg transition-all text-[11px]
                  ${isMicActive 
                    ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300 hover:bg-yellow-500/30' 
                    : 'bg-white/5 border-white/10 hover:bg-white/10 text-white group'
                  }
                `}
                title="Toggle Microphone"
              >
                {isMicActive ? <MicOff size={13} /> : <Mic size={13} className="group-hover:text-cyan-400 transition-colors" />}
                <span>Mic</span>
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/mp4,video/webm"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

           {/* Screen Layout Effects */}
           <div className="space-y-2">
             <div className="text-[10px] uppercase tracking-wider text-white/40 font-semibold">Screen Effect</div>
             <div className="grid grid-cols-5 gap-1 bg-white/5 p-1 rounded-lg">
                {screenEffects.map((effect) => (
                    <button
                        key={effect.id}
                        onClick={() => onScreenEffectChange(effect.id)}
                        title={effect.label}
                        className={`
                            flex items-center justify-center h-8 rounded transition-all
                            ${screenEffect === effect.id && !isAutoLayout && !isFaceGridMode ? 'bg-white/20 text-white shadow-sm' : 'text-white/40 hover:text-white/80 hover:bg-white/5'}
                        `}
                    >
                        <effect.icon size={16} />
                    </button>
                ))}
             </div>
          </div>

           {/* Shape Selector */}
           <div className="space-y-2">
             <div className="text-[10px] uppercase tracking-wider text-white/40 font-semibold">Element Shape</div>
             <div className="grid grid-cols-4 gap-1 bg-white/5 p-1 rounded-lg">
                {shapes.map((s) => (
                    <button
                        key={s.id}
                        onClick={() => onSettingsChange('shape', s.id)}
                        title={s.label}
                        className={`
                            flex items-center justify-center h-8 rounded transition-all
                            ${settings.shape === s.id ? 'bg-white/20 text-white shadow-sm' : 'text-white/40 hover:text-white/80 hover:bg-white/5'}
                        `}
                    >
                        <s.icon size={16} />
                    </button>
                ))}
             </div>
          </div>

          {/* Animation Selector */}
          <div className="space-y-2">
             <div className="text-[10px] uppercase tracking-wider text-white/40 font-semibold">Motion FX</div>
             <div className="grid grid-cols-5 gap-1 bg-white/5 p-1 rounded-lg">
                {animations.map((a) => (
                    <button
                        key={a.id}
                        onClick={() => onSettingsChange('animationMode', a.id)}
                        title={a.label}
                        className={`
                            flex items-center justify-center h-8 rounded transition-all
                            ${settings.animationMode === a.id ? 'bg-white/20 text-cyan-300 shadow-sm' : 'text-white/40 hover:text-white/80 hover:bg-white/5'}
                        `}
                    >
                        <a.icon size={16} />
                    </button>
                ))}
             </div>
          </div>

          {/* Color Mode */}
          <div className="space-y-2">
             <div className="text-[10px] uppercase tracking-wider text-white/40 font-semibold">Color Processor</div>
             <div className="grid grid-cols-5 gap-1.5">
                {colorModes.map((mode) => (
                    <button
                        key={mode.id}
                        onClick={() => onSettingsChange('colorMode', mode.id)}
                        title={mode.label}
                        className={`
                            h-6 rounded-md transition-all border
                            ${settings.colorMode === mode.id ? 'border-white scale-105 z-10 shadow-lg' : 'border-transparent opacity-40 hover:opacity-100'}
                            ${mode.color}
                        `}
                    />
                ))}
             </div>
          </div>

           {/* Hue Shift Slider */}
           <div className="space-y-1 pt-1">
              <div className="flex justify-between text-[10px] text-white/50">
                <span>Hue Offset</span>
                <span>{Math.round(settings.hueShift)}°</span>
              </div>
              <input
                type="range"
                min="0"
                max="360"
                value={settings.hueShift}
                onChange={(e) => onSettingsChange('hueShift', parseInt(e.target.value))}
                className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-purple-400 hover:accent-purple-300"
              />
            </div>

          {/* Sliders */}
          <div className="space-y-4 pt-1">
             <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-white/50">
                <span>Grid Resolution (Pixel Size)</span>
                <span>{settings.pixelSize}px</span>
              </div>
              <input
                type="range"
                min="4"
                max="60"
                step="1"
                value={settings.pixelSize}
                onChange={(e) => onSettingsChange('pixelSize', parseFloat(e.target.value))}
                className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-white/50">
                <span className="flex items-center gap-1"><Lightbulb size={10} /> Neon Glow</span>
                <span>{settings.glow || 0}</span>
              </div>
              <input
                type="range"
                min="0"
                max="30"
                step="1"
                value={settings.glow || 0}
                onChange={(e) => onSettingsChange('glow', parseInt(e.target.value))}
                className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-pink-500"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-white/50">
                <span>Density</span>
                <span>{Math.round(settings.density * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.05"
                max="1.0"
                step="0.05"
                value={settings.density}
                onChange={(e) => onSettingsChange('density', parseFloat(e.target.value))}
                className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-white/50">
                <span>Luma Threshold</span>
                <span>{settings.threshold}</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={settings.threshold}
                onChange={(e) => onSettingsChange('threshold', parseInt(e.target.value))}
                className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Trigger Button */}
      <div
        className={`
          w-14 h-14 rounded-full bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center shadow-2xl cursor-pointer
          transition-all duration-300 hover:scale-105 hover:bg-black/80 hover:border-cyan-500/50 group
        `}
      >
        <Settings2
          className={`text-white/70 group-hover:text-cyan-400 transition-colors duration-300 ${isVisible ? 'rotate-90' : 'rotate-0'}`}
          size={24}
        />
      </div>
    </div>
  );
};

export default Controls;
