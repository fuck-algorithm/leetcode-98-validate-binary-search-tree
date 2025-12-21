import React, { useEffect, useState } from 'react';
import { Highlight, themes, Prism } from 'prism-react-renderer';
import type { ProgrammingLanguage, AlgorithmStep, VariableState } from '../../types';
import { codeSnippets, getCodeByLanguage } from '../../data/codeSnippets';
import { getSetting, saveSetting } from '../../utils/indexedDB';
import './CodePanel.css';

// 添加 Java 和 Go 语言支持
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).Prism = Prism;
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import('prismjs/components/prism-java');
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import('prismjs/components/prism-go');

interface CodePanelProps {
  currentStep: AlgorithmStep | null;
}

export const CodePanel: React.FC<CodePanelProps> = ({ currentStep }) => {
  const [language, setLanguage] = useState<ProgrammingLanguage>('java');

  useEffect(() => {
    getSetting<ProgrammingLanguage>('selectedLanguage', 'java').then(setLanguage);
  }, []);

  const handleLanguageChange = async (lang: ProgrammingLanguage) => {
    setLanguage(lang);
    await saveSetting('selectedLanguage', lang);
  };

  const codeSnippet = getCodeByLanguage(language);
  const highlightedLines = currentStep?.codeLines[language] || [];
  const variables = currentStep?.variables.filter(v => v.language === language) || [];

  const getVariablesForLine = (lineNumber: number): VariableState[] => {
    return variables.filter(v => v.line === lineNumber);
  };

  const getPrismLanguage = (lang: ProgrammingLanguage): string => {
    switch (lang) {
      case 'java': return 'java';
      case 'python': return 'python';
      case 'golang': return 'go';
      case 'javascript': return 'javascript';
      default: return 'javascript';
    }
  };

  return (
    <div className="code-panel">
      <div className="code-header">
        <span className="code-title">算法代码</span>
        <div className="language-tabs">
          {codeSnippets.map(snippet => (
            <button
              key={snippet.language}
              className={`lang-tab ${language === snippet.language ? 'active' : ''}`}
              onClick={() => handleLanguageChange(snippet.language)}
            >
              {snippet.displayName}
            </button>
          ))}
        </div>
      </div>
      
      <div className="code-content">
        <Highlight
          theme={themes.nightOwl}
          code={codeSnippet.code}
          language={getPrismLanguage(language)}
        >
          {({ className, style, tokens, getLineProps, getTokenProps }) => (
            <pre className={className} style={{ ...style, margin: 0, padding: '12px', background: 'transparent' }}>
              {tokens.map((line, i) => {
                const lineNumber = i + 1;
                const isHighlighted = highlightedLines.includes(lineNumber);
                const lineVars = getVariablesForLine(lineNumber);
                
                return (
                  <div
                    key={i}
                    {...getLineProps({ line })}
                    className={`code-line ${isHighlighted ? 'highlighted' : ''}`}
                  >
                    <span className="line-number">{lineNumber}</span>
                    <span className="line-content">
                      {line.map((token, key) => (
                        <span key={key} {...getTokenProps({ token })} />
                      ))}
                    </span>
                    {lineVars.length > 0 && (
                      <span className="line-variables">
                        {lineVars.map((v, idx) => (
                          <span key={idx} className="variable-badge">
                            {v.name}={v.value}
                          </span>
                        ))}
                      </span>
                    )}
                  </div>
                );
              })}
            </pre>
          )}
        </Highlight>
      </div>
    </div>
  );
};
