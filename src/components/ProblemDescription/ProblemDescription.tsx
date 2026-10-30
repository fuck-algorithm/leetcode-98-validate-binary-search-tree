// src/components/ProblemDescription/ProblemDescription.tsx
import React from 'react';
import { MarkdownContent } from '../MarkdownContent/MarkdownContent';
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
      <div className="modal-content" role="dialog" aria-modal="true" aria-labelledby="problem-modal-title" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="关闭题目描述">×</button>
        <h2 className="modal-title" id="problem-modal-title">题目描述</h2>
        <div className="problem-content">
          <MarkdownContent content={problemDescription} />
        </div>
      </div>
    </div>
  );
};
