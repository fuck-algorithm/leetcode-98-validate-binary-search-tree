import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as d3 from 'd3';
import type { TreeNode, AlgorithmStep, Annotation } from '../../types';
import { buildVisualTree, flattenVisualTree, getEdges } from '../../utils/treeUtils';
import './Canvas.css';

interface CanvasProps {
  treeData: TreeNode | null;
  currentStep: AlgorithmStep | null;
}

export const Canvas: React.FC<CanvasProps> = ({ treeData, currentStep }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 400 });
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });

  // 更新尺寸
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setDimensions({ width, height });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // 绘制树
  useEffect(() => {
    if (!svgRef.current || !treeData) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const { width, height } = dimensions;
    const margin = { top: 60, right: 40, bottom: 40, left: 40 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // 构建可视化树
    const visualRoot = buildVisualTree(treeData, innerWidth, innerHeight, true);
    if (!visualRoot) return;

    const nodes = flattenVisualTree(visualRoot);
    const edges = getEdges(visualRoot);

    // 计算树的实际边界，用于居中
    const xValues = nodes.map(n => n.x);
    const minX = Math.min(...xValues);
    const maxX = Math.max(...xValues);
    const treeWidth = maxX - minX;
    
    // 计算水平偏移量，使树居中
    const centerOffsetX = (innerWidth - treeWidth) / 2 - minX;

    // 创建主容器
    const g = svg.append('g')
      .attr('transform', `translate(${margin.left + transform.x + centerOffsetX}, ${margin.top + transform.y}) scale(${transform.k})`);

    // 定义箭头标记
    svg.append('defs').append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '-0 -5 10 10')
      .attr('refX', 8)
      .attr('refY', 0)
      .attr('orient', 'auto')
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .append('path')
      .attr('d', 'M 0,-5 L 10,0 L 0,5')
      .attr('fill', '#4fc3f7');

    // 绘制边
    g.selectAll('.edge')
      .data(edges)
      .enter()
      .append('line')
      .attr('class', 'edge')
      .attr('x1', d => d.source.x)
      .attr('y1', d => d.source.y)
      .attr('x2', d => d.target.x)
      .attr('y2', d => d.target.y)
      .attr('stroke', d => d.target.isNull ? '#37474f' : '#4fc3f7')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', d => d.target.isNull ? '4,4' : 'none');

    // 节点半径
    const nodeRadius = 24;

    // 绘制节点
    const nodeGroups = g.selectAll('.node')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', d => `node ${d.isNull ? 'null-node' : ''} ${d.id === currentStep?.nodeId ? 'active' : ''}`)
      .attr('transform', d => `translate(${d.x}, ${d.y})`);

    // 节点圆圈
    nodeGroups.append('circle')
      .attr('r', d => d.isNull ? 12 : nodeRadius)
      .attr('fill', d => {
        if (d.isNull) return '#37474f';
        if (d.id === currentStep?.nodeId) {
          if (currentStep?.result === false) return '#ef5350';
          if (currentStep?.result === true) return '#66bb6a';
          return '#4fc3f7';
        }
        return '#1a1a2e';
      })
      .attr('stroke', d => {
        if (d.isNull) return '#546e7a';
        if (d.id === currentStep?.nodeId) return '#fff';
        return '#4fc3f7';
      })
      .attr('stroke-width', d => d.id === currentStep?.nodeId ? 3 : 2);

    // 节点值
    nodeGroups.filter(d => !d.isNull)
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('fill', '#fff')
      .attr('font-size', '14px')
      .attr('font-weight', '600')
      .text(d => d.val?.toString() || '');

    // 空节点标记
    nodeGroups.filter(d => d.isNull)
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('fill', '#78909c')
      .attr('font-size', '10px')
      .text('null');

    // 绘制标注
    if (currentStep?.annotations) {
      const annotationGroup = g.append('g').attr('class', 'annotations');
      
      currentStep.annotations.forEach(annotation => {
        const node = nodes.find(n => n.id === annotation.nodeId);
        if (!node) return;

        let x = node.x;
        let y = node.y;
        let textAnchor = 'middle';

        switch (annotation.position) {
          case 'top':
            y -= nodeRadius + 20;
            break;
          case 'bottom':
            y += nodeRadius + 20;
            break;
          case 'left':
            x -= nodeRadius + 60;
            textAnchor = 'end';
            break;
          case 'right':
            x += nodeRadius + 10;
            textAnchor = 'start';
            break;
        }

        const lines = annotation.text.split('\n');
        const annotationG = annotationGroup.append('g')
          .attr('class', `annotation annotation-${annotation.type}`);

        // 背景
        const bgPadding = 6;
        const lineHeight = 14;
        const bgWidth = Math.max(...lines.map(l => l.length * 7)) + bgPadding * 2;
        const bgHeight = lines.length * lineHeight + bgPadding * 2;

        let bgX = x - bgWidth / 2;
        if (textAnchor === 'start') bgX = x;
        if (textAnchor === 'end') bgX = x - bgWidth;

        annotationG.append('rect')
          .attr('x', bgX)
          .attr('y', y - lineHeight / 2 - bgPadding)
          .attr('width', bgWidth)
          .attr('height', bgHeight)
          .attr('rx', 4)
          .attr('fill', getAnnotationBgColor(annotation.type))
          .attr('opacity', 0.9);

        lines.forEach((line, i) => {
          annotationG.append('text')
            .attr('x', x)
            .attr('y', y + i * lineHeight)
            .attr('text-anchor', textAnchor)
            .attr('fill', getAnnotationTextColor(annotation.type))
            .attr('font-size', '11px')
            .text(line);
        });
      });
    }

    // 绘制调用栈
    if (currentStep?.callStack && currentStep.callStack.length > 0) {
      const stackGroup = svg.append('g')
        .attr('class', 'call-stack')
        .attr('transform', `translate(${width - 180}, 60)`);

      stackGroup.append('text')
        .attr('x', 0)
        .attr('y', 0)
        .attr('fill', '#b0bec5')
        .attr('font-size', '12px')
        .attr('font-weight', '500')
        .text('调用栈');

      currentStep.callStack.slice().reverse().forEach((frame, i) => {
        const frameG = stackGroup.append('g')
          .attr('transform', `translate(0, ${20 + i * 36})`);

        frameG.append('rect')
          .attr('x', 0)
          .attr('y', 0)
          .attr('width', 160)
          .attr('height', 32)
          .attr('rx', 4)
          .attr('fill', i === 0 ? 'rgba(79, 195, 247, 0.2)' : 'rgba(255, 255, 255, 0.05)')
          .attr('stroke', i === 0 ? '#4fc3f7' : '#37474f')
          .attr('stroke-width', 1);

        frameG.append('text')
          .attr('x', 8)
          .attr('y', 13)
          .attr('fill', '#fff')
          .attr('font-size', '10px')
          .text(`node: ${frame.nodeVal ?? 'null'}`);

        frameG.append('text')
          .attr('x', 8)
          .attr('y', 25)
          .attr('fill', '#78909c')
          .attr('font-size', '9px')
          .text(`(${frame.lower}, ${frame.upper})`);
      });
    }

    // 缩放行为
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on('zoom', (event) => {
        setTransform({
          x: event.transform.x - margin.left,
          y: event.transform.y - margin.top,
          k: event.transform.k
        });
      });

    svg.call(zoom);

  }, [treeData, currentStep, dimensions, transform]);

  const handleReset = useCallback(() => {
    setTransform({ x: 0, y: 0, k: 1 });
  }, []);

  return (
    <div className="canvas-container" ref={containerRef}>
      <div className="canvas-controls">
        <button className="canvas-btn" onClick={handleReset} title="重置视图">
          ⟲ 重置
        </button>
        <span className="zoom-level">{Math.round(transform.k * 100)}%</span>
      </div>
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        className="tree-canvas"
      />
      {currentStep && (
        <div className="step-description">
          <span className="step-number">步骤 {currentStep.id + 1}</span>
          <span className="step-text">{currentStep.description}</span>
        </div>
      )}
    </div>
  );
};

function getAnnotationBgColor(type: Annotation['type']): string {
  switch (type) {
    case 'compare': return 'rgba(255, 183, 77, 0.9)';
    case 'result': return 'rgba(102, 187, 106, 0.9)';
    case 'param': return 'rgba(79, 195, 247, 0.9)';
    case 'return': return 'rgba(186, 104, 200, 0.9)';
    default: return 'rgba(96, 125, 139, 0.9)';
  }
}

function getAnnotationTextColor(type: Annotation['type']): string {
  // 保留参数以便将来根据类型返回不同颜色
  void type;
  return '#1a1a2e';
}
