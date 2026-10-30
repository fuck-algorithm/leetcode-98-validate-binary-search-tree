import React, { useState } from 'react';
import { dataExamples } from '../../data/examples';
import { validateInput, generateRandomBST, generateRandomNonBST } from '../../utils/treeUtils';
import './DataInput.css';

interface DataInputProps {
  onDataChange: (data: (number | null)[]) => void;
  currentData: (number | null)[];
}

export const DataInput: React.FC<DataInputProps> = ({ onDataChange, currentData }) => {
  const [inputValue, setInputValue] = useState(JSON.stringify(currentData));
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    setError(null);
  };

  const handleExampleClick = (data: (number | null)[]) => {
    setInputValue(JSON.stringify(data));
    onDataChange(data);
    setError(null);
  }

  const handleSubmit = () => {
    const result = validateInput(inputValue);
    if (result.valid) {
      onDataChange(result.data);
      setError(null);
    } else {
      setError(result.error || '输入无效');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  const handleRandomBST = () => {
    const data = generateRandomBST(Math.floor(Math.random() * 5) + 3);
    setInputValue(JSON.stringify(data));
    onDataChange(data);
    setError(null);
  };

  const handleRandomNonBST = () => {
    const data = generateRandomNonBST(Math.floor(Math.random() * 4) + 3);
    setInputValue(JSON.stringify(data));
    onDataChange(data);
    setError(null);
  };

  return (
    <div className="data-input">
      <div className="input-row">
        <label className="input-label">输入数据 / 样例:</label>
        <input
          type="text"
          className={`input-field ${error ? 'input-error' : ''}`}
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="例如: [2,1,3]"
        />
        <button className="submit-btn" onClick={handleSubmit}>
          确认
        </button>
        <button className="random-btn" onClick={handleRandomBST}>
          随机BST
        </button>
        <button className="random-btn non-bst" onClick={handleRandomNonBST}>
          随机非BST
        </button>
        <span className="examples-divider">|</span>
        {dataExamples.slice(0, 5).map(example => (
          <button
            key={example.name}
            className={`example-btn ${JSON.stringify(currentData) === JSON.stringify(example.input) ? 'active' : ''}`}
            onClick={() => handleExampleClick(example.input)}
            title={`预期结果: ${example.expected}`}
          >
            {example.name}
          </button>
        ))}
      </div>

      {error && <div className="error-message">{error}</div>}
    </div>
  );
};
