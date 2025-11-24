
import React, { useEffect, useState } from 'react';
import { RenderConfig, VisualStyle } from '../types';

interface ControlPanelProps {
  config: RenderConfig;
  setConfig: React.Dispatch<React.SetStateAction<RenderConfig>>;
  isBroadcastMode: boolean;
  toggleBroadcast: () => void;
  selectedCameraId: string;
  onCameraChange: (id: string) => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({ 
  config, 
  setConfig, 
  isBroadcastMode, 
  toggleBroadcast,
  selectedCameraId,
  onCameraChange
}) => {
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);

  useEffect(() => {
    const getDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter(device => device.kind === 'videoinput');
        setVideoDevices(videoInputs);
        
        // If no camera selected yet, but we found some, select the first one (or the default)
        if (!selectedCameraId && videoInputs.length > 0) {
           // Try to find the default one first, otherwise take the first available
           const defaultDevice = videoInputs.find(d => d.deviceId === 'default');
           onCameraChange(defaultDevice ? defaultDevice.deviceId : videoInputs[0].deviceId);
        }
      } catch (err) {
        console.error("Error enumerating devices:", err);
      }
    };

    // Initial fetch
    getDevices();

    // Listen for device changes (plugging in new webcam)
    navigator.mediaDevices.addEventListener('devicechange', getDevices);
    return () => navigator.mediaDevices.removeEventListener('devicechange', getDevices);
  }, [selectedCameraId, onCameraChange]);

  const handleChange = (key: keyof RenderConfig, value: number) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const setStyle = (style: VisualStyle) => {
    // Apply presets for better UX when switching styles
    let updates: Partial<RenderConfig> = { visualStyle: style };
    
    switch (style) {
      case 'VANGOGH':
        updates = {
          ...updates,
          traceOpacity: 0.1,
          brushSize: 3,
          colorVibrance: 1.2,
          interactionStrength: 2.0
        };
        break;
      case 'FIRE':
        updates = {
          ...updates,
          traceOpacity: 0.25, // Fades faster to avoid whiteout
          brushSize: 15, // Large brush for fluid volume
          colorVibrance: 1.5,
          interactionStrength: 3.0
        };
        break;
      case 'NEON_FLUID':
        updates = {
          ...updates,
          traceOpacity: 0.05, // Long smooth trails
          brushSize: 8, // Med-Large brush for liquid feel
          colorVibrance: 2.0,
          interactionStrength: 1.5
        };
        break;
    }
    
    setConfig(prev => ({ ...prev, ...updates }));
  };

  return (
    <div className={`fixed top-0 right-0 h-full w-80 bg-black/90 border-l border-[#222] backdrop-blur-md p-6 transform transition-transform duration-500 overflow-y-auto z-50 ${isBroadcastMode ? 'translate-x-full' : 'translate-x-0'}`}>
      <h2 className="font-display text-2xl mb-1 text-white">IMPRESSIONIST</h2>
      <h3 className="text-xs text-[#666] mb-8 font-mono tracking-widest">RENDER ENGINE v1.2</h3>

      <div className="space-y-8">

        {/* SECTION: STYLE SELECTOR */}
        <div className="space-y-4">
          <h4 className="text-[#888] text-[10px] font-bold tracking-widest border-b border-[#333] pb-2">STYLE MODE</h4>
          <div className="grid grid-cols-3 gap-2">
            <button 
              onClick={() => setStyle('VANGOGH')}
              className={`text-[10px] font-bold py-2 border ${config.visualStyle === 'VANGOGH' ? 'bg-[#facc15] text-black border-[#facc15]' : 'border-[#333] text-[#666] hover:border-[#666]'}`}
            >
              VAN GOGH
            </button>
            <button 
              onClick={() => setStyle('FIRE')}
              className={`text-[10px] font-bold py-2 border ${config.visualStyle === 'FIRE' ? 'bg-orange-500 text-black border-orange-500' : 'border-[#333] text-[#666] hover:border-[#666]'}`}
            >
              INFERNO
            </button>
            <button 
              onClick={() => setStyle('NEON_FLUID')}
              className={`text-[10px] font-bold py-2 border ${config.visualStyle === 'NEON_FLUID' ? 'bg-cyan-400 text-black border-cyan-400' : 'border-[#333] text-[#666] hover:border-[#666]'}`}
            >
              NEON
            </button>
          </div>
        </div>

        {/* SECTION: INPUT SOURCE */}
        <div className="space-y-6">
          <h4 className="text-[#888] text-[10px] font-bold tracking-widest border-b border-[#333] pb-2">INPUT SOURCE</h4>
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-[#facc15]">
              <label>CAMERA SELECT</label>
              <span>{videoDevices.length} FOUND</span>
            </div>
            <select 
              className="w-full bg-[#111] border border-[#333] text-[#e0e0e0] text-xs p-2 rounded-sm focus:border-[#facc15] outline-none"
              value={selectedCameraId}
              onChange={(e) => onCameraChange(e.target.value)}
            >
              {videoDevices.map((device, idx) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `Camera ${idx + 1}`}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        {/* SECTION: VISUALS */}
        <div className="space-y-6">
          <h4 className="text-[#888] text-[10px] font-bold tracking-widest border-b border-[#333] pb-2">VISUALS</h4>
          
          {/* Particle Count */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-[#facc15]">
              <label>BRUSH COUNT</label>
              <span>{config.particleCount}</span>
            </div>
            <input 
              type="range" 
              min="500" 
              max="5000" 
              step="100"
              value={config.particleCount}
              onChange={(e) => handleChange('particleCount', parseInt(e.target.value))} 
            />
          </div>

          {/* Trace Opacity (Oil Paint Wetness) */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-[#facc15]">
              <label>TRAIL FADE</label>
              <span>{config.traceOpacity.toFixed(2)}</span>
            </div>
            <input 
              type="range" 
              min="0.01" 
              max="0.5" 
              step="0.01"
              value={config.traceOpacity}
              onChange={(e) => handleChange('traceOpacity', parseFloat(e.target.value))} 
            />
          </div>

          {/* Brush Size */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-[#facc15]">
              <label>STROKE WIDTH</label>
              <span>{config.brushSize}px</span>
            </div>
            <input 
              type="range" 
              min="1" 
              max="30" 
              step="0.5"
              value={config.brushSize}
              onChange={(e) => handleChange('brushSize', parseFloat(e.target.value))} 
            />
          </div>
          
          {/* Vibrance */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-[#facc15]">
              <label>COLOR VIBRANCE</label>
              <span>{config.colorVibrance.toFixed(1)}x</span>
            </div>
            <input 
              type="range" 
              min="1.0" 
              max="3.0" 
              step="0.1"
              value={config.colorVibrance}
              onChange={(e) => handleChange('colorVibrance', parseFloat(e.target.value))} 
            />
          </div>
        </div>

        {/* SECTION: PHYSICS */}
        <div className="space-y-6">
          <h4 className="text-[#888] text-[10px] font-bold tracking-widest border-b border-[#333] pb-2">PHYSICS / INTERACTION</h4>

          {/* Interaction Strength */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-[#facc15]">
              <label>MOTION ATTRACTION</label>
              <span>{config.interactionStrength.toFixed(1)}</span>
            </div>
            <input 
              type="range" 
              min="0" 
              max="5.0" 
              step="0.1"
              value={config.interactionStrength}
              onChange={(e) => handleChange('interactionStrength', parseFloat(e.target.value))} 
            />
          </div>

          {/* Base Speed */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-[#facc15]">
              <label>BASE FLOW SPEED</label>
              <span>{config.baseSpeed.toFixed(1)}</span>
            </div>
            <input 
              type="range" 
              min="0.1" 
              max="5.0" 
              step="0.1"
              value={config.baseSpeed}
              onChange={(e) => handleChange('baseSpeed', parseFloat(e.target.value))} 
            />
          </div>

           {/* Motion Decay */}
           <div className="space-y-2">
            <div className="flex justify-between text-xs text-[#facc15]">
              <label>GRAVITY DECAY</label>
              <span>{config.motionDecay.toFixed(2)}</span>
            </div>
            <input 
              type="range" 
              min="0.80" 
              max="0.99" 
              step="0.01"
              value={config.motionDecay}
              onChange={(e) => handleChange('motionDecay', parseFloat(e.target.value))} 
            />
          </div>

          {/* Sensitivity */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-[#facc15]">
              <label>SENSITIVITY</label>
              <span>{(1.0 - config.motionThreshold).toFixed(2)}</span>
            </div>
            <input 
              type="range" 
              min="0.01" 
              max="0.2" 
              step="0.01"
              style={{ direction: 'rtl' }} // Inverted because lower threshold = higher sensitivity
              value={config.motionThreshold}
              onChange={(e) => handleChange('motionThreshold', parseFloat(e.target.value))} 
            />
          </div>
        </div>

        <div className="pt-8 border-t border-[#333]">
           <button 
             onClick={toggleBroadcast}
             className="w-full py-4 border border-white/20 text-white bg-[#facc15]/10 hover:bg-[#facc15] hover:text-black transition-all text-xs tracking-widest uppercase font-bold"
           >
             Enter NDI / Cinema Mode
           </button>
           <p className="text-[10px] text-[#555] mt-2 text-center">
             Use "NDI Screen Capture" on this window to send to Resolume Arena.
           </p>
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;
