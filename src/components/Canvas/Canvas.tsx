import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as d3 from 'd3';
import type { TreeNode, AlgorithmStep, Annotation } from '../../types';
import { buildVisualTree, flattenVisualTree, getEdges } from '../../utils/treeUtils';
import './Canvas.css';

// 注解测量与渲染共用字体常量：测量和实际绘制必须用相同字体，否则 getBBox 宽度与渲染宽度脱钩
const ANNOTATION_FONT_FAMILY = '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif';
const ANNOTATION_FONT_SIZE = '11px';

interface CanvasProps {
  treeData: TreeNode | null;
  currentStep: AlgorithmStep | null;
  onDimensionsChange?: (width: number, height: number) => void;
}

export const Canvas: React.FC<CanvasProps> = ({ treeData, currentStep, onDimensionsChange }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 400 });
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });

  // 更新尺寸并上报
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        // 过滤掉布局未完成时的 0 值
        if (width > 0 && height > 0) {
          setDimensions({ width, height });
          onDimensionsChange?.(width, height);
        }
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    // 监听容器尺寸变化（更精确）
    const resizeObserver = new ResizeObserver(updateDimensions);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    return () => {
      window.removeEventListener('resize', updateDimensions);
      resizeObserver.disconnect();
    };
  }, [onDimensionsChange]);

  // 绘制树
  useEffect(() => {
    if (!svgRef.current || !treeData) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const { width, height } = dimensions;
    // margin 仅用于 g 容器整体偏移，padding 已在 buildVisualTree 内部处理
    const margin = { top: 20, right: 20, bottom: 40, left: 20 };

    // 构建可视化树（padding 已内置，坐标在 [padding, width-padding] 区间）
    const visualRoot = buildVisualTree(treeData, width, height, true);
    if (!visualRoot) return;

    const nodes = flattenVisualTree(visualRoot);
    const edges = getEdges(visualRoot);

    // buildVisualTree 已保证节点在画布内，无需重复计算 centerOffsetX
    // 创建主容器
    const g = svg.append('g')
      .attr('transform', `translate(${margin.left + transform.x}, ${margin.top + transform.y}) scale(${transform.k})`);

    // 定义多种箭头标记
    const defs = svg.append('defs');
    const arrowColors: Record<string, string> = {
      'arrow-default': '#4fc3f7',
      'arrow-left': '#ffb74d',
      'arrow-right': '#81c784',
      'arrow-fail': '#ef5350',
    };
    Object.entries(arrowColors).forEach(([id, color]) => {
      defs.append('marker')
        .attr('id', id)
        .attr('viewBox', '-0 -5 10 10')
        .attr('refX', 8)
        .attr('refY', 0)
        .attr('orient', 'auto')
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .append('path')
        .attr('d', 'M 0,-5 L 10,0 L 0,5')
        .attr('fill', color);
    });

    // 绘制边（按是否为当前步骤路径上色，null 边虚线）
    g.selectAll('.edge')
      .data(edges)
      .enter()
      .append('line')
      .attr('class', 'edge')
      .attr('x1', d => d.source.x)
      .attr('y1', d => d.source.y)
      .attr('x2', d => d.target.x)
      .attr('y2', d => d.target.y)
      .attr('stroke', d => {
        if (d.target.isNull) return '#37474f';
        if (d.target.id === currentStep?.nodeId) return '#ffb74d';
        return '#4fc3f7';
      })
      .attr('stroke-width', d => d.target.id === currentStep?.nodeId ? 3 : 2)
      .attr('stroke-dasharray', d => d.target.isNull ? '4,4' : 'none')
      .attr('marker-end', d => d.target.isNull ? '' : 'url(#arrow-default)');

    // 节点半径
    const nodeRadius = 24;

    // 按深度调色板（扁平化配色）
    const depthColors = ['#4fc3f7', '#81c784', '#ffb74d', '#ba68c8', '#ff8a65', '#4dd0e1'];

    // 绘制节点
    const nodeGroups = g.selectAll('.node')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', d => `node ${d.isNull ? 'null-node' : ''} ${d.id === currentStep?.nodeId ? 'active' : ''}`)
      .attr('transform', d => `translate(${d.x}, ${d.y})`);

    // 节点圆圈（按深度上色，活动节点覆盖为状态色）
    nodeGroups.append('circle')
      .attr('r', d => d.isNull ? 12 : nodeRadius)
      .attr('fill', d => {
        if (d.isNull) return '#37474f';
        if (d.id === currentStep?.nodeId) {
          if (currentStep?.result === false) return '#ef5350';
          if (currentStep?.result === true) return '#66bb6a';
          return '#ffb74d';
        }
        return depthColors[d.depth % depthColors.length];
      })
      .attr('stroke', d => {
        if (d.isNull) return '#546e7a';
        if (d.id === currentStep?.nodeId) return '#fff';
        return '#fff';
      })
      .attr('stroke-width', d => d.id === currentStep?.nodeId ? 3 : 1.5)
      .attr('opacity', d => d.isNull ? 0.6 : 1);

    // 节点值
    nodeGroups.filter(d => !d.isNull)
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('fill', '#1a1a2e')
      .attr('font-size', '14px')
      .attr('font-weight', '700')
      .text(d => d.val?.toString() || '');

    // 空节点标记
    nodeGroups.filter(d => d.isNull)
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('fill', '#b0bec5')
      .attr('font-size', '10px')
      .text('null');

    // 状态徽标：当前节点显示操作类型角标
    if (currentStep?.nodeId) {
      const activeNode = nodes.find(n => n.id === currentStep.nodeId);
      if (activeNode && !activeNode.isNull) {
        const badgeText = currentStep.action === 'check' ? '?' :
          currentStep.action === 'result' ? (currentStep.result ? '✓' : '✗') :
          currentStep.action === 'enter' ? '→' : '';
        if (badgeText) {
          nodeGroups.filter(d => d.id === currentStep.nodeId)
            .append('circle')
            .attr('cx', nodeRadius * 0.7)
            .attr('cy', -nodeRadius * 0.7)
            .attr('r', 9)
            .attr('fill', currentStep.result === false ? '#ef5350' :
              currentStep.result === true ? '#66bb6a' : '#fff')
            .attr('stroke', '#1a1a2e')
            .attr('stroke-width', 1.5);
          nodeGroups.filter(d => d.id === currentStep.nodeId)
            .append('text')
            .attr('x', nodeRadius * 0.7)
            .attr('y', -nodeRadius * 0.7)
            .attr('text-anchor', 'middle')
            .attr('dy', '0.35em')
            .attr('fill', currentStep.result === false ? '#fff' : '#1a1a2e')
            .attr('font-size', '11px')
            .attr('font-weight', '700')
            .text(badgeText);
        }
      }
    }

    // 绘制标注
    if (currentStep?.annotations) {
      const annotationGroup = g.append('g').attr('class', 'annotations');
      
      currentStep.annotations.forEach(annotation => {
        const node = nodes.find(n => n.id === annotation.nodeId);
        if (!node) return;

        let x = node.x;
        let y = node.y;
        let textAnchor: 'start' | 'middle' | 'end' = 'middle';

        switch (annotation.position) {
          case 'top':
            y -= nodeRadius + 24;
            break;
          case 'bottom':
            y += nodeRadius + 24;
            break;
          case 'left':
            x -= nodeRadius + 12;
            textAnchor = 'end';
            break;
          case 'right':
            x += nodeRadius + 12;
            textAnchor = 'start';
            break;
        }

        const lines = annotation.text.split('\n');
        const annotationG = annotationGroup.append('g')
          .attr('class', `annotation annotation-${annotation.type}`);

        // 背景
        const bgPadding = 8;
        const lineHeight = 16;

        // 先 append 不可见文本测量真实宽度，再据之计算背景
        const measureG = annotationGroup.append('g').attr('opacity', 0).attr('class', 'measure');
        const measuredWidths = lines.map(line =>
          measureG.append('text')
            .attr('font-size', ANNOTATION_FONT_SIZE)
            .attr('font-family', ANNOTATION_FONT_FAMILY)
            .text(line)
            .node()?.getBBox().width ?? line.length * 7
        );
        measureG.remove();

        const maxTextWidth = Math.max(...measuredWidths);
        const bgWidth = maxTextWidth + bgPadding * 2;
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
          .attr('opacity', 0.9)
          .attr('stroke', getAnnotationBgColor(annotation.type))
          .attr('stroke-width', 1);

        lines.forEach((line, i) => {
          annotationG.append('text')
            .attr('x', x)
            .attr('y', y + i * lineHeight)
            .attr('text-anchor', textAnchor)
            .attr('fill', getAnnotationTextColor(annotation.type))
            .attr('font-size', ANNOTATION_FONT_SIZE)
            .attr('font-family', ANNOTATION_FONT_FAMILY)
            .text(line);
        });
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
