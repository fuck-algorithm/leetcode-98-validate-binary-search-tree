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
  const primaryLines = currentStep?.primaryLine[language] || [];
  const secondaryLines = (currentStep?.codeLines[language] || []).filter(
    l => !primaryLines.includes(l)
  );
  const variables = currentStep?.variables.filter(v => v.language === language) || [];
  const callStack = currentStep?.callStack || [];

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
                const isPrimary = primaryLines.includes(lineNumber);
                const isSecondary = secondaryLines.includes(lineNumber);
                const lineVars = getVariablesForLine(lineNumber);
                const lineClassName = `code-line${isPrimary ? ' primary' : ''}${isSecondary ? ' secondary' : ''}`;

                return (
                  <div
                    key={i}
                    {...getLineProps({ line })}
                    className={lineClassName}
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

      <div className="debug-panels">
        <div className="debug-panel variables-panel">
          <div className="debug-panel-title">变量内存</div>
          <div className="variables-list">
            {variables.length === 0 ? (
              <div className="empty-hint">当前无可追踪变量</div>
            ) : (
              variables.map((v, idx) => {
                const varColor = (name: string): string => {
                  if (name.startsWith('root')) return '#4fc3f7';
                  if (name.includes('lower') || name.includes('upper')) return '#ffb74d';
                  if (name.includes('Result')) return '#66bb6a';
                  if (name === 'inRange') return '#ef5350';
                  return '#94a3b8';
                };
                return (
                  <div key={idx} className="variable-item">
                    <span className="variable-dot" style={{ background: varColor(v.name), color: varColor(v.name) }} />
                    <span className="variable-name">{v.name}</span>
                    <span className="variable-value">{v.value}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="debug-panel callstack-panel">
          <div className="debug-panel-title">调用栈</div>
          <div className="callstack-list">
            {callStack.length === 0 ? (
              <div className="empty-hint">栈为空</div>
            ) : (
              callStack.slice().reverse().map((frame, idx) => {
                const frameNum = callStack.length - idx;
                return (
                  <div
                    key={idx}
                    className={`stack-frame ${idx === 0 ? 'stack-top' : ''}`}
                    style={{ paddingLeft: `${8 + frame.depth * 12}px` }}
                  >
                    <div className="frame-head">
                      <span className="frame-index">#{frameNum}</span>
                      <span className="frame-name">{frame.functionName}</span>
                    </div>
                    <span className="frame-node">node: {frame.nodeVal ?? 'null'}</span>
                    <span className="frame-range">({frame.lower}, {frame.upper})</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
