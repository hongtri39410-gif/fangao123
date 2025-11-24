
import React, { useState, useEffect } from 'react';
import Renderer from './components/Renderer';
import ControlPanel from './components/ControlPanel';
import AudioControl from './components/AudioControl';
import { RenderConfig, AudioData } from './types';

const App: React.FC = () => {
  const [config, setConfig] = useState<RenderConfig>({
    visualStyle: 'VANGOGH',
    particleCount: 2000,
    baseSpeed: 1.0,
    traceOpacity: 0.1,
    brushSize: 3,
    jitter: 0,
    colorVibrance: 1.2,
    interactionStrength: 2.0, // Default attraction strength
    motionDecay: 0.95, // Long trails
    motionThreshold: 0.05 // Moderate sensitivity
  });

  const [audioData, setAudioData] = useState<AudioData>({
    bass: 0,
    mid: 0,
    treble: 0,
    isPlaying: false
  });

  const [isBroadcastMode, setIsBroadcastMode] = useState(false);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');

  // Change window title for Resolume identification
  useEffect(() => {
    if (isBroadcastMode) {
      document.title = "VAN GOGH - BROADCAST OUTPUT";
    } else {
      document.title = "VAN GOGH // REAL-TIME";
    }
  }, [isBroadcastMode]);

  return (
    <div className="relative w-full h-screen bg-[#050505] overflow-hidden text-[#e0e0e0]">
      {/* Main Canvas Area */}
      <div className={`absolute inset-0 transition-all duration-500 ${isBroadcastMode ? 'z-50' : 'z-0'}`}>
        <Renderer 
          config={config} 
          audioData={audioData} 
          isBroadcastMode={isBroadcastMode}
          onExitBroadcast={() => setIsBroadcastMode(false)}
          cameraId={selectedCameraId}
        />
      </div>

      {/* Floating UI Layer (Hidden in Broadcast Mode) */}
      <div className={`absolute inset-0 z-10 pointer-events-none transition-opacity duration-500 ${isBroadcastMode ? 'opacity-0' : 'opacity-100'}`}>
        
        {/* Header / Audio Controls */}
        <div className="absolute top-8 left-8 pointer-events-auto">
          <div className="mb-6">
            <h1 className="font-display text-4xl font-bold text-white tracking-wider mb-2">VAN GOGH</h1>
            <div className="h-1 w-12 bg-[#facc15]"></div>
          </div>
          
          <div className="w-64 bg-black/80 backdrop-blur border border-[#333] p-4 rounded-sm shadow-xl">
             <div className="mb-4 flex justify-between items-end">
               <span className="text-xs text-[#888] tracking-widest">AUDIO INPUT</span>
               <div className="flex gap-1 h-3 items-end">
                 <div className="w-1 bg-[#facc15]" style={{ height: `${(audioData.bass / 255) * 100}%` }}></div>
                 <div className="w-1 bg-[#facc15]" style={{ height: `${(audioData.mid / 255) * 100}%` }}></div>
                 <div className="w-1 bg-[#facc15]" style={{ height: `${(audioData.treble / 255) * 100}%` }}></div>
               </div>
             </div>
             <AudioControl onAudioUpdate={setAudioData} />
          </div>
        </div>

        {/* Settings Panel */}
        <div className="pointer-events-auto">
           <ControlPanel 
             config={config} 
             setConfig={setConfig} 
             isBroadcastMode={isBroadcastMode}
             toggleBroadcast={() => setIsBroadcastMode(true)}
             selectedCameraId={selectedCameraId}
             onCameraChange={setSelectedCameraId}
           />
        </div>
      </div>
      
      {/* Broadcast Mode Tooltip */}
      {isBroadcastMode && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none animate-pulse">
          <div className="bg-[#facc15] text-black px-4 py-1 rounded-sm text-xs font-bold tracking-widest">
            NDI / CINEMA MODE ACTIVE
          </div>
          <div className="bg-black/50 text-white/50 px-4 py-1 rounded-full text-[10px]">
             Window Title: "VAN GOGH - BROADCAST OUTPUT" • Press ESC to exit
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
