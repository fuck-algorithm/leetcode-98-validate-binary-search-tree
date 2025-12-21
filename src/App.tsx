import { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from './components/Header';
import { DataInput } from './components/DataInput';
import { Canvas } from './components/Canvas';
import { CodePanel } from './components/CodePanel';
import { PlaybackControls } from './components/PlaybackControls';
import { WeChatFloat } from './components/WeChatFloat';
import type { TreeNode, AlgorithmStep, PlaybackState } from './types';
import { buildTreeFromArray } from './utils/treeUtils';
import { generateAlgorithmSteps } from './utils/algorithmSteps';
import { dataExamples } from './data/examples';
import './App.css';

function App() {
  const [inputData, setInputData] = useState<(number | null)[]>(dataExamples[0].input);
  const [treeData, setTreeData] = useState<TreeNode | null>(null);
  const [steps, setSteps] = useState<AlgorithmStep[]>([]);
  const [playbackState, setPlaybackState] = useState<PlaybackState>({
    isPlaying: false,
    currentStep: 0,
    totalSteps: 0,
    speed: 1,
  });
  
  const playIntervalRef = useRef<number | null>(null);

  // 当输入数据变化时，重新构建树和步骤
  useEffect(() => {
    const tree = buildTreeFromArray(inputData);
    setTreeData(tree);
    
    // 生成算法步骤
    const newSteps = generateAlgorithmSteps(tree, 600, 350);
    setSteps(newSteps);
    
    setPlaybackState(prev => ({
      ...prev,
      currentStep: 0,
      totalSteps: newSteps.length,
      isPlaying: false,
    }));
    
    // 停止播放
    if (playIntervalRef.current) {
      clearInterval(playIntervalRef.current);
      playIntervalRef.current = null;
    }
  }, [inputData]);

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

  const currentStep = steps[playbackState.currentStep] || null;

  return (
    <div className="app">
      <Header />
      <DataInput onDataChange={handleDataChange} currentData={inputData} />
      
      <div className="main-content">
        <div className="canvas-section">
          <Canvas treeData={treeData} currentStep={currentStep} />
        </div>
        <div className="code-section">
          <CodePanel currentStep={currentStep} />
        </div>
      </div>
      
      <PlaybackControls
        playbackState={playbackState}
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
