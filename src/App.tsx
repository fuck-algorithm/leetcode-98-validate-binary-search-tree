import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Header } from './components/Header';
import { DataInput } from './components/DataInput';
import { Canvas } from './components/Canvas';
import { CodePanel } from './components/CodePanel';
import { PlaybackControls } from './components/PlaybackControls';
import { WeChatFloat } from './components/WeChatFloat';
import type { PlaybackState } from './types';
import { buildTreeFromArray } from './utils/treeUtils';
import { generateAlgorithmSteps } from './utils/algorithmSteps';
import { dataExamples } from './data/examples';
import './App.css';

function App() {
  const [inputData, setInputData] = useState<(number | null)[]>(dataExamples[0].input);
  const treeData = useMemo(() => buildTreeFromArray(inputData), [inputData]);
  const [canvasSize, setCanvasSize] = useState<{ width: number; height: number } | null>(null);
  const steps = useMemo(
    () => treeData
      ? generateAlgorithmSteps(treeData, canvasSize?.width ?? 800, canvasSize?.height ?? 400)
      : [],
    [treeData, canvasSize],
  );
  const [playbackState, setPlaybackState] = useState<PlaybackState>({
    isPlaying: false,
    currentStep: 0,
    totalSteps: 0,
    speed: 1,
  });

  const playIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    // Keep the playback model synchronized with the generated snapshot sequence.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPlaybackState(prev => prev.totalSteps === steps.length
      ? prev
      : { ...prev, totalSteps: steps.length, currentStep: 0, isPlaying: false });
  }, [steps.length]);

  // 当输入数据变化时，立即停止播放并重置步骤
  useEffect(() => {
    if (playIntervalRef.current) {
      clearInterval(playIntervalRef.current);
      playIntervalRef.current = null;
    }
    // Reset the external playback timer and its UI state when the input snapshot changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPlaybackState(prev => ({ ...prev, currentStep: 0, isPlaying: false }));
  }, [inputData]);

  // 画布尺寸变化回调
  const handleDimensionsChange = useCallback((width: number, height: number) => {
    setCanvasSize(prev => {
      // 尺寸未变化时不触发重渲染
      if (prev && Math.abs(prev.width - width) < 1 && Math.abs(prev.height - height) < 1) {
        return prev;
      }
      return { width, height };
    });
  }, []);

  // 播放控制
  useEffect(() => {
    if (playbackState.isPlaying) {
      const interval = 1000 / playbackState.speed;
      playIntervalRef.current = window.setInterval(() => {
        setPlaybackState(prev => {
          if (prev.currentStep >= prev.totalSteps - 1) {
            if (playIntervalRef.current) {
              clearInterval(playIntervalRef.current);
              playIntervalRef.current = null;
            }
            return { ...prev, isPlaying: false };
          }
          return { ...prev, currentStep: prev.currentStep + 1 };
        });
      }, interval);
    } else {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
        playIntervalRef.current = null;
      }
    }

    return () => {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
      }
    };
  }, [playbackState.isPlaying, playbackState.speed]);

  const handleDataChange = useCallback((data: (number | null)[]) => {
    setInputData(data);
  }, []);

  const handlePlay = useCallback(() => {
    if (playbackState.currentStep >= playbackState.totalSteps - 1) {
      setPlaybackState(prev => ({ ...prev, currentStep: 0, isPlaying: true }));
    } else {
      setPlaybackState(prev => ({ ...prev, isPlaying: true }));
    }
  }, [playbackState.currentStep, playbackState.totalSteps]);

  const handlePause = useCallback(() => {
    setPlaybackState(prev => ({ ...prev, isPlaying: false }));
  }, []);

  const handlePrevStep = useCallback(() => {
    setPlaybackState(prev => ({
      ...prev,
      currentStep: Math.max(0, prev.currentStep - 1),
      isPlaying: false,
    }));
  }, []);

  const handleNextStep = useCallback(() => {
    setPlaybackState(prev => ({
      ...prev,
      currentStep: Math.min(prev.totalSteps - 1, prev.currentStep + 1),
      isPlaying: false,
    }));
  }, []);

  const handleReset = useCallback(() => {
    setPlaybackState(prev => ({
      ...prev,
      currentStep: 0,
      isPlaying: false,
    }));
  }, []);

  const handleSpeedChange = useCallback((speed: number) => {
    setPlaybackState(prev => ({ ...prev, speed }));
  }, []);

  const handleSeek = useCallback((step: number) => {
    setPlaybackState(prev => ({
      ...prev,
      currentStep: step,
      isPlaying: false,
    }));
  }, []);

  const effectivePlaybackState = {
    ...playbackState,
    totalSteps: steps.length,
    currentStep: Math.min(playbackState.currentStep, Math.max(0, steps.length - 1)),
  };
  const currentStep = steps[effectivePlaybackState.currentStep] || null;

  return (
    <div className="app">
      <Header />
      <DataInput onDataChange={handleDataChange} currentData={inputData} />
      
      <div className="main-content">
        <div className="canvas-section">
          <Canvas
            treeData={treeData}
            currentStep={currentStep}
            onDimensionsChange={handleDimensionsChange}
          />
        </div>
        <div className="code-section">
          <CodePanel currentStep={currentStep} />
        </div>
      </div>
      
      <PlaybackControls
        playbackState={effectivePlaybackState}
        onPlay={handlePlay}
        onPause={handlePause}
        onPrevStep={handlePrevStep}
        onNextStep={handleNextStep}
        onReset={handleReset}
        onSpeedChange={handleSpeedChange}
        onSeek={handleSeek}
      />
      
      <WeChatFloat />
    </div>
  );
}

export default App;
