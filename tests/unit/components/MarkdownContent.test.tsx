import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MarkdownContent } from '../../../src/components/MarkdownContent/MarkdownContent';

describe('MarkdownContent', () => {
  it('renders headings, lists, emphasis, and fenced code as semantic markup', () => {
    render(<MarkdownContent content={'## 规则\n\n- **左子树**更小\n- `root.val`\n\n```js\nreturn true\n```'} />);

    expect(screen.getByRole('heading', { name: '规则' })).toBeInTheDocument();
    expect(screen.getByText('左子树').tagName).toBe('STRONG');
    expect(screen.getByText('root.val').tagName).toBe('CODE');
    expect(screen.getByText('return true').closest('pre')).toBeInTheDocument();
  });

  it('does not render raw HTML or unsafe links from markdown', () => {
    const { container } = render(
      <MarkdownContent content={'<img src=x onerror="alert(1)" />\n\n[bad](javascript:alert(1))'} />,
    );

    expect(container.querySelector('img')).not.toBeInTheDocument();
    expect(container.querySelector('a')?.getAttribute('href') ?? '').not.toMatch(/^javascript:/i);
  });
});
