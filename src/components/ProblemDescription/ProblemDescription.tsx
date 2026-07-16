// src/components/ProblemDescription/ProblemDescription.tsx
import React from 'react';
import { problemDescription } from '../../data/problemDescription';
import './ProblemDescription.css';

interface ProblemDescriptionProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProblemDescription: React.FC<ProblemDescriptionProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        <h2 className="modal-title">题目描述</h2>
        <div className="problem-content">
          <pre>{problemDescription}</pre>
        </div>
      </div>
    </div>
  );
};
