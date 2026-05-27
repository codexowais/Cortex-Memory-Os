"use client";

import { useMemo } from "react";
import ReactFlow, { Background, Controls, Edge, MarkerType, Node } from "reactflow";
import { MemoryGraph as MemoryGraphType } from "@/lib/memory/types";

const categoryColor: Record<string, string> = {
  goal: "#8ee6c9",
  preference: "#f4c76b",
  routine: "#7dd3fc",
  project: "#c4b5fd",
  task: "#f0a3b2",
  emotional_state: "#f9a8d4",
  productivity_pattern: "#93c5fd"
};

const edgeColor: Record<string, string> = {
  related_to: "#7dd3fc",
  caused_by: "#f4c76b",
  part_of: "#8ee6c9",
  emotionally_linked: "#f9a8d4",
  context: "#64748b"
};

const clusterAnchors: Record<string, { x: number; y: number }> = {
  Architecture: { x: 60, y: 50 },
  Demo: { x: 360, y: 60 },
  Productivity: { x: 660, y: 55 },
  Energy: { x: 210, y: 250 },
  "Open Loops": { x: 520, y: 260 }
};

export function MemoryGraph({ graph }: { graph: MemoryGraphType }) {
  const { nodes, edges, clusters } = useMemo(() => {
    const clusterCounts = new Map<string, number>();
    const orderedClusters = Array.from(new Set(graph.nodes.map((node) => node.cluster)));

    const nodes: Node[] = graph.nodes.map((node, index) => {
      const clusterIndex = orderedClusters.indexOf(node.cluster);
      const anchor = clusterAnchors[node.cluster] ?? {
        x: 80 + (clusterIndex % 3) * 300,
        y: 70 + Math.floor(clusterIndex / 3) * 210
      };
      const count = clusterCounts.get(node.cluster) ?? 0;
      clusterCounts.set(node.cluster, count + 1);

      const color = categoryColor[node.category];
      const radius = Math.min(120, 78 + node.importance * 4);

      return {
        id: node.id,
        position: {
          x: anchor.x + (count % 2) * 132 + (index % 2) * 18,
          y: anchor.y + Math.floor(count / 2) * 92
        },
        data: {
          label: (
            <div className="space-y-1">
              <div className="text-[11px] text-slate-400">{node.cluster}</div>
              <div className="line-clamp-3 leading-5">{node.label}</div>
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <span>{node.category.replaceAll("_", " ")}</span>
                <span>{node.importance}/10</span>
              </div>
            </div>
          )
        },
        style: {
          borderColor: color,
          boxShadow: `0 0 26px ${color}22`,
          padding: 12,
          width: radius * 2,
          minHeight: 86,
          opacity: 0.82 + Math.min(node.importance, 10) * 0.018
        }
      };
    });

    const edges: Edge[] = graph.edges.map((edge) => {
      const color = edgeColor[edge.type] ?? edgeColor.context;

      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label: edge.label,
        animated: edge.strength > 0.55,
        type: "smoothstep",
        markerEnd: { type: MarkerType.ArrowClosed, color },
        style: {
          stroke: color,
          strokeWidth: 1 + edge.strength * 2,
          opacity: 0.38 + edge.strength * 0.45
        },
        labelStyle: {
          fill: "#cbd5e1",
          fontSize: 11
        },
        labelBgStyle: {
          fill: "rgba(8, 9, 11, 0.78)"
        }
      };
    });

    return {
      nodes,
      edges,
      clusters: orderedClusters.slice(0, 6)
    };
  }, [graph]);

  return (
    <div className="flex h-[430px] flex-col overflow-hidden rounded-lg border border-white/10 bg-black/20">
      <div className="flex flex-wrap gap-2 border-b border-white/10 bg-white/[0.025] px-3 py-2">
        {clusters.map((cluster) => (
          <span key={cluster} className="rounded-md bg-white/[0.055] px-2 py-1 text-xs text-slate-300">
            {cluster}
          </span>
        ))}
      </div>
      <ReactFlow className="flex-1" nodes={nodes} edges={edges} fitView fitViewOptions={{ padding: 0.18 }}>
        <Background color="rgba(255,255,255,0.08)" gap={24} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
