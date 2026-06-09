'use client'

import { useState, useRef, useEffect } from 'react'

export default function AudioPlayer({ url }: { url: string }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [speed, setSpeed] = useState(1)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const onTimeUpdate = () => setCurrentTime(audio.currentTime)
    const onDurationChange = () => setDuration(audio.duration)
    const onEnded = () => setPlaying(false)

    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('durationchange', onDurationChange)
    audio.addEventListener('ended', onEnded)
    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('durationchange', onDurationChange)
      audio.removeEventListener('ended', onEnded)
    }
  }, [])

  function togglePlay() {
    const audio = audioRef.current
    if (!audio) return
    if (playing) { audio.pause(); setPlaying(false) }
    else { audio.play(); setPlaying(true) }
  }

  function seek(e: React.ChangeEvent<HTMLInputElement>) {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = Number(e.target.value)
    setCurrentTime(audio.currentTime)
  }

  function changeVolume(e: React.ChangeEvent<HTMLInputElement>) {
    const v = Number(e.target.value)
    if (audioRef.current) audioRef.current.volume = v
    setVolume(v)
  }

  function changeSpeed(s: number) {
    if (audioRef.current) audioRef.current.playbackRate = s
    setSpeed(s)
  }

  function skip(sec: number) {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = Math.max(0, Math.min(audio.currentTime + sec, duration))
  }

  function fmt(s: number) {
    if (!s || isNaN(s)) return '0:00'
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const progress = duration ? (currentTime / duration) * 100 : 0
  const speeds = [0.75, 1, 1.25, 1.5, 2]

  return (
    <div className="rounded-2xl p-5" style={{ background: '#f0faf0' }}>
      <audio ref={audioRef} src={url} preload="metadata" />

      {/* Progress bar */}
      <div className="mb-4">
        <input
          type="range"
          min={0}
          max={duration || 100}
          value={currentTime}
          onChange={seek}
          className="w-full h-2 rounded-full appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, #009900 ${progress}%, #c8e6c9 ${progress}%)`,
          }}
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1.5">
          <span>{fmt(currentTime)}</span>
          <span>{fmt(duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {/* Skip back 10s */}
          <button
            onClick={() => skip(-10)}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-600 hover:bg-green-100 transition-colors text-xs font-bold"
          >
            -10
          </button>

          {/* Play/pause */}
          <button
            onClick={togglePlay}
            className="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-sm transition-all hover:opacity-90"
            style={{ background: '#009900' }}
          >
            {playing ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
            )}
          </button>

          {/* Skip forward 10s */}
          <button
            onClick={() => skip(10)}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-600 hover:bg-green-100 transition-colors text-xs font-bold"
          >
            +10
          </button>
        </div>

        {/* Speed */}
        <div className="flex items-center gap-1">
          {speeds.map((s) => (
            <button
              key={s}
              onClick={() => changeSpeed(s)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                speed === s ? 'text-white' : 'text-gray-500 hover:bg-green-100'
              }`}
              style={speed === s ? { background: '#009900' } : {}}
            >
              {s}x
            </button>
          ))}
        </div>

        {/* Volume */}
        <div className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
            {volume > 0.5 && <path d="M19.07 4.93a10 10 0 010 14.14"/>}
            {volume > 0 && <path d="M15.54 8.46a5 5 0 010 7.07"/>}
          </svg>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={volume}
            onChange={changeVolume}
            className="w-20 h-1.5 rounded-full appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, #009900 ${volume * 100}%, #c8e6c9 ${volume * 100}%)`,
            }}
          />
        </div>
      </div>
    </div>
  )
}
