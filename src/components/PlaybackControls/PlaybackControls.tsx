import React, { useEffect, useCallback, useRef } from 'react';
import type { PlaybackState } from '../../types';
import { getSetting, saveSetting } from '../../utils/indexedDB';
import './PlaybackControls.css';

interface PlaybackControlsProps {
  playbackState: PlaybackState;
  onPlay: () => void;
  onPause: () => void;
  onPrevStep: () => void;
  onNextStep: () => void;
  onReset: () => void;
  onSpeedChange: (speed: number) => void;
  onSeek: (step: number) => void;
}

const SPEED_OPTIONS = [0.5, 1, 1.5, 2, 3];

export const PlaybackControls: React.FC<PlaybackControlsProps> = ({
  playbackState,
  onPlay,
  onPause,
  onPrevStep,
  onNextStep,
  onReset,
  onSpeedChange,
  onSeek,
}) => {
  const progressRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  // 加载保存的播放速度
  useEffect(() => {
    getSetting<number>('playbackSpeed', 1).then(speed => {
      if (SPEED_OPTIONS.includes(speed)) {
        onSpeedChange(speed);
      }
    });
  }, [onSpeedChange]);

  // 保存播放速度
  const handleSpeedChange = async (speed: number) => {
    onSpeedChange(speed);
    await saveSetting('playbackSpeed', speed);
  };

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 忽略输入框中的按键
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case ' ':
          e.preventDefault();
          if (playbackState.isPlaying) {
            onPause();
          } else {
            onPlay();
          }
          break;
        case 'ArrowLeft':
          e.preventDefault();
          onPrevStep();
          break;
        case 'ArrowRight':
          e.preventDefault();
          onNextStep();
          break;
        case 'r':
        case 'R':
          e.preventDefault();
          onReset();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [playbackState.isPlaying, onPlay, onPause, onPrevStep, onNextStep, onReset]);

  // 进度条拖拽
  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current) return;
    const rect = progressRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const step = Math.round(percentage * (playbackState.totalSteps - 1));
    onSeek(Math.max(0, Math.min(step, playbackState.totalSteps - 1)));
  }, [playbackState.totalSteps, onSeek]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    isDragging.current = true;
    handleProgressClick(e);
  }, [handleProgressClick]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging.current) return;
    handleProgressClick(e);
  }, [handleProgressClick]);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      isDragging.current = false;
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  const progress = playbackState.totalSteps > 0
    ? (playbackState.currentStep / (playbackState.totalSteps - 1)) * 100
    : 0;

  return (
    <div className="playback-controls">
      <div className="controls-row">
        <div className="control-buttons">
          <button
            className="control-btn"
            onClick={onPrevStep}
            disabled={playbackState.currentStep === 0}
            title="上一步"
          >
            ⏮ <span className="shortcut">←</span>
          </button>
          
          <button
            className="control-btn play-btn"
            onClick={playbackState.isPlaying ? onPause : onPlay}
            title={playbackState.isPlaying ? '暂停' : '播放'}
          >
            {playbackState.isPlaying ? '⏸' : '▶'} <span className="shortcut">空格</span>
          </button>
          
          <button
            className="control-btn"
            onClick={onNextStep}
            disabled={playbackState.currentStep >= playbackState.totalSteps - 1}
            title="下一步"
          >
            ⏭ <span className="shortcut">→</span>
          </button>
          
          <button
            className="control-btn reset-btn"
            onClick={onReset}
            title="重置"
          >
            ⟲ <span className="shortcut">R</span>
          </button>
        </div>

        <div className="step-info">
          <span className="current-step">{playbackState.currentStep + 1}</span>
          <span className="step-separator">/</span>
          <span className="total-steps">{playbackState.totalSteps}</span>
        </div>

        <div className="speed-control">
          <span className="speed-label">速度:</span>
          <div className="speed-buttons">
            {SPEED_OPTIONS.map(speed => (
              <button
                key={speed}
                className={`speed-btn ${playbackState.speed === speed ? 'active' : ''}`}
                onClick={() => handleSpeedChange(speed)}
              >
                {speed}x
              </button>
            ))}
          </div>
        </div>
      </div>

      <div
        className="progress-bar"
        ref={progressRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        <div className="progress-track">
          <div
            className="progress-fill"
            style={{ width: `${progress}%` }}
          />
          <div
            className="progress-handle"
            style={{ left: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
};
