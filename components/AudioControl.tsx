import React, { useRef, useState, useEffect } from 'react';
import { AudioData } from '../types';

interface AudioControlProps {
  onAudioUpdate: (data: AudioData) => void;
}

const AudioControl: React.FC<AudioControlProps> = ({ onAudioUpdate }) => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef<number>(0);
  
  const [fileName, setFileName] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);

    if (audioElRef.current) {
      const url = URL.createObjectURL(file);
      audioElRef.current.src = url;
      audioElRef.current.play().then(initAudioContext).catch(console.error);
    }
  };

  const initAudioContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioContextRef.current;

    if (!analyserRef.current) {
      analyserRef.current = ctx.createAnalyser();
      analyserRef.current.fftSize = 512; // Moderate resolution for performance
      analyserRef.current.smoothingTimeConstant = 0.8;
    }

    if (audioElRef.current && !sourceRef.current) {
      sourceRef.current = ctx.createMediaElementSource(audioElRef.current);
      sourceRef.current.connect(analyserRef.current);
      analyserRef.current.connect(ctx.destination);
    }

    analyzeLoop();
  };

  const analyzeLoop = () => {
    if (!analyserRef.current) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserRef.current.getByteFrequencyData(dataArray);

    // Simple frequency band split
    // Bass: ~20Hz - 250Hz (Lower indexes)
    // Mid: ~250Hz - 4kHz
    // Treble: ~4kHz - 20kHz (Higher indexes)
    
    // With fftSize 512, binCount is 256. 
    // Sample rate usually 44.1kHz. Each bin ~86Hz.
    
    let bassSum = 0;
    let midSum = 0;
    let trebleSum = 0;

    // Bass: bins 0-4 (approx 0-350Hz)
    for (let i = 0; i < 5; i++) bassSum += dataArray[i];
    
    // Mid: bins 5-30
    for (let i = 5; i < 30; i++) midSum += dataArray[i];

    // Treble: bins 30-100
    for (let i = 30; i < 100; i++) trebleSum += dataArray[i];

    const bass = bassSum / 5;
    const mid = midSum / 25;
    const treble = trebleSum / 70;

    onAudioUpdate({
      bass,
      mid,
      treble,
      isPlaying: !audioElRef.current?.paused
    });

    rafRef.current = requestAnimationFrame(analyzeLoop);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="relative overflow-hidden group">
        <label className="flex items-center justify-center w-full px-4 py-3 border border-[#facc15] text-[#facc15] font-bold cursor-pointer hover:bg-[#facc15] hover:text-black transition-all">
          <span className="truncate">{fileName ? `♪ ${fileName}` : 'UPLOAD MUSIC (MP3)'}</span>
          <input 
            type="file" 
            accept="audio/*" 
            onChange={handleFileUpload} 
            className="hidden" 
          />
        </label>
      </div>
      <audio ref={audioElRef} className="w-full h-8 opacity-50 hover:opacity-100 transition-opacity" controls />
    </div>
  );
};

export default AudioControl;
