'use client';
import { useEffect, useRef, useState } from 'react';
// Original procedural score: no third-party recordings, tracking, or audio downloads.
export function useInvitationAudio() {
  const context = useRef<AudioContext | null>(null);
  const musicBus = useRef<GainNode | null>(null);
  const interval = useRef<ReturnType<typeof setInterval> | null>(null);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState('');
  async function audioContext() {
    const AudioConstructor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioConstructor)
      throw new Error('Audio is unavailable in this browser.');
    context.current ??= new AudioConstructor();
    await context.current.resume();
    return context.current;
  }
  function stop() {
    if (interval.current) clearInterval(interval.current);
    interval.current = null;
    if (musicBus.current && context.current) {
      const bus = musicBus.current;
      bus.gain.setTargetAtTime(0, context.current.currentTime, 0.12);
      setTimeout(() => bus.disconnect(), 700);
      musicBus.current = null;
    }
    setPlaying(false);
  }
  async function toggle() {
    if (playing) {
      stop();
      return;
    }
    try {
      const ctx = await audioContext();
      const bus = ctx.createGain();
      bus.gain.value = 0.055;
      bus.connect(ctx.destination);
      musicBus.current = bus;
      const chords = [
        [261.63, 329.63, 392, 523.25],
        [220, 261.63, 329.63, 440],
        [174.61, 220, 261.63, 349.23],
        [196, 246.94, 293.66, 392],
      ];
      let bar = 0;
      const phrase = () => {
        const now = ctx.currentTime;
        const notes = chords[bar++ % chords.length];
        for (let i = 0; i < 8; i++) {
          const oscillator = ctx.createOscillator();
          const gain = ctx.createGain();
          const start = now + i * 0.6;
          oscillator.type = 'sine';
          oscillator.frequency.value = notes[i % 4] * (i > 3 ? 2 : 1);
          gain.gain.setValueAtTime(0, start);
          gain.gain.linearRampToValueAtTime(0.5, start + 0.03);
          gain.gain.exponentialRampToValueAtTime(0.001, start + 3.5);
          oscillator.connect(gain);
          gain.connect(bus);
          oscillator.start(start);
          oscillator.stop(start + 3.6);
          oscillator.onended = () => {
            oscillator.disconnect();
            gain.disconnect();
          };
        }
      };
      phrase();
      interval.current = setInterval(phrase, 4800);
      setPlaying(true);
      setError('');
    } catch {
      setError('Music could not start. Please try again.');
      stop();
    }
  }
  async function rustle() {
    try {
      const ctx = await audioContext();
      const length = Math.floor(ctx.sampleRate * 0.55);
      const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i++)
        data[i] = (Math.random() * 2 - 1) * Math.sin((Math.PI * i) / length);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1600;
      filter.Q.value = 0.6;
      const gain = ctx.createGain();
      gain.gain.value = 0.045;
      source.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      source.start();
      source.onended = () => {
        source.disconnect();
        filter.disconnect();
        gain.disconnect();
      };
    } catch {
      /* Visual opening remains usable without audio. */
    }
  }
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) stop();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      if (interval.current) clearInterval(interval.current);
      void context.current?.close();
    };
  }, []);
  return { playing, toggle, rustle, error };
}
