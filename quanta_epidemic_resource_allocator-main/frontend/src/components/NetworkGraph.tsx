import { useEffect, useRef, useCallback } from 'react';
import * as d3 from 'd3';
import type { NetworkNode, NetworkEdge, Community } from '../lib/types';
import { riskColor } from '../lib/utils';

interface NetworkGraphProps {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  communities: Community[];
  width?: number;
  height?: number;
  onNodeClick?: (node: NetworkNode) => void;
  highlightSuperspreaders?: boolean;
}

// Community color palette
const COMMUNITY_COLORS = [
  '#06b6d4', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444',
  '#3b82f6', '#ec4899', '#14b8a6', '#f97316', '#a855f7',
  '#22d3ee', '#84cc16', '#fb923c', '#c084fc', '#2dd4bf',
];

export default function NetworkGraph({
  nodes,
  edges,
  communities,
  width = 600,
  height = 500,
  onNodeClick,
  highlightSuperspreaders = true,
}: NetworkGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const simulationRef = useRef<d3.Simulation<d3.SimulationNodeDatum, undefined> | null>(null);

  const communityColor = useCallback((communityId: number): string => {
    return COMMUNITY_COLORS[communityId % COMMUNITY_COLORS.length] ?? '#06b6d4';
  }, []);

  useEffect(() => {
    if (!svgRef.current || !nodes.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Compute max degree for sizing
    const maxDegree = Math.max(...nodes.map((n) => n.degree ?? 1), 1);
    const maxWeight = Math.max(...edges.map((e) => e.weight ?? 1), 1);

    // Build node/edge data copies for D3 mutation
    const nodeData = nodes.map((n) => ({ ...n })) as (NetworkNode & d3.SimulationNodeDatum)[];
    const nodeMap = new Map(nodeData.map((n) => [n.id, n]));
    const edgeData = edges
      .map((e) => ({ source: nodeMap.get(e.source)!, target: nodeMap.get(e.target)!, weight: e.weight }))
      .filter((e) => e.source && e.target);

    // Container with zoom
    const g = svg.append('g');
    svg.call(
      d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.1, 8])
        .on('zoom', (event) => g.attr('transform', event.transform))
    );

    // Draw edges
    const link = g.append('g')
      .selectAll('line')
      .data(edgeData)
      .join('line')
      .attr('stroke', 'rgba(0, 0, 0, 0.12)')
      .attr('stroke-width', (d) => 0.5 + (d.weight / maxWeight) * 2);

    // Node radius scale
    const rScale = d3.scaleLinear().domain([0, maxDegree]).range([3, 14]);

    // Superspreader threshold (top 5% by degree)
    const sortedDegrees = [...nodes].sort((a, b) => b.degree - a.degree);
    const topN = Math.max(1, Math.floor(nodes.length * 0.05));
    const topIds = new Set(sortedDegrees.slice(0, topN).map((n) => n.id));

    // Glow filter for superspreaders
    const defs = svg.append('defs');
    const filter = defs.append('filter').attr('id', 'ss-glow');
    filter.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'coloredBlur');
    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Draw nodes
    const node = g.append('g')
      .selectAll('circle')
      .data(nodeData)
      .join('circle')
      .attr('r', (d) => rScale(d.degree ?? 1))
      .attr('fill', (d) => communityColor(d.community))
      .attr('fill-opacity', 0.85)
      .attr('stroke', (d) => {
        if (highlightSuperspreaders && topIds.has(d.id)) return '#ef4444';
        return 'rgba(0, 0, 0, 0.2)';
      })
      .attr('stroke-width', (d) => (highlightSuperspreaders && topIds.has(d.id) ? 2 : 0.5))
      .attr('filter', (d) => (highlightSuperspreaders && topIds.has(d.id) ? 'url(#ss-glow)' : 'none'))
      .style('cursor', 'pointer')
      .call(
        d3.drag<SVGCircleElement, NetworkNode & d3.SimulationNodeDatum>()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on('drag', (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          }) as never
      );

    // Tooltip
    const tooltip = d3.select('body').append('div')
      .style('position', 'fixed')
      .style('background', '#ffffff')
      .style('border', '1px solid rgba(16,185,129,0.3)')
      .style('border-radius', '8px')
      .style('padding', '8px 10px')
      .style('font-size', '11px')
      .style('color', '#0f172a')
      .style('box-shadow', '0 10px 25px -5px rgba(0, 0, 0, 0.1)')
      .style('pointer-events', 'none')
      .style('opacity', 0)
      .style('z-index', 9999);

    node
      .on('mouseover', (event, d) => {
        tooltip.transition().duration(100).style('opacity', 1);
        tooltip.html(`
          <div style="font-weight:600;margin-bottom:4px">Node ${d.id}</div>
          <div>Degree: <b>${d.degree}</b></div>
          <div>Community: <b>${d.community}</b></div>
          <div>Betweenness: <b>${(d.betweenness ?? 0).toFixed(4)}</b></div>
          <div>Risk: <b style="color:${riskColor(d.risk_level)}">${d.risk_level}</b></div>
          ${topIds.has(d.id) ? '<div style="color:#ef4444;margin-top:4px">⚠ Super-spreader</div>' : ''}
        `);
      })
      .on('mousemove', (event) => {
        tooltip
          .style('left', `${event.clientX + 12}px`)
          .style('top', `${event.clientY - 28}px`);
      })
      .on('mouseleave', () => {
        tooltip.transition().duration(200).style('opacity', 0);
      })
      .on('click', (_event, d) => {
        onNodeClick?.(d);
      });

    // Force simulation
    const simulation = d3.forceSimulation(nodeData as d3.SimulationNodeDatum[])
      .force('link', d3.forceLink(edgeData).id((d) => (d as NetworkNode).id).distance(40).strength(0.3))
      .force('charge', d3.forceManyBody().strength(-60))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius((d) => rScale((d as NetworkNode).degree ?? 1) + 2));

    simulationRef.current = simulation;

    simulation.on('tick', () => {
      link
        .attr('x1', (d) => (d.source as NetworkNode & d3.SimulationNodeDatum).x ?? 0)
        .attr('y1', (d) => (d.source as NetworkNode & d3.SimulationNodeDatum).y ?? 0)
        .attr('x2', (d) => (d.target as NetworkNode & d3.SimulationNodeDatum).x ?? 0)
        .attr('y2', (d) => (d.target as NetworkNode & d3.SimulationNodeDatum).y ?? 0);
      node
        .attr('cx', (d) => d.x ?? 0)
        .attr('cy', (d) => d.y ?? 0);
    });

    return () => {
      simulation.stop();
      tooltip.remove();
    };
  }, [nodes, edges, width, height, communityColor, onNodeClick, highlightSuperspreaders]);

  // Stop simulation on unmount
  useEffect(() => {
    return () => { simulationRef.current?.stop(); };
  }, []);

  return (
    <svg
      ref={svgRef}
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ background: 'transparent' }}
    />
  );
}
