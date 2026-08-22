import React, { useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { toggleAudioMute, getIsMuted } from '@/lib/audio';

export const AudioToggle: React.FC<{ className?: string }> = ({ className }) => {
  const [muted, setMuted] = useState(getIsMuted());

  const handleToggle = () => {
    const nextState = toggleAudioMute();
    setMuted(nextState);
  };

  return (
    <button
      onClick={handleToggle}
      className={`p-2 rounded-full bg-slate-900/80 border border-slate-700/60 text-slate-300 hover:text-amber-400 hover:border-amber-500/40 backdrop-blur-md transition-all shadow-md active:scale-95 ${className || ''}`}
      title={muted ? 'Unmute Sound Effects' : 'Mute Sound Effects'}
      aria-label="Toggle Sound Effects"
    >
      {muted ? <VolumeX className="w-4 h-4 text-slate-400" /> : <Volume2 className="w-4 h-4 text-amber-400" />}
    </button>
  );
};
