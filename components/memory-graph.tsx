"use client";

import ReactFlow, { Background, Controls, Edge, Node } from "reactflow";
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

export function MemoryGraph({ graph }: { graph: MemoryGraphType }) {
  const nodes: Node[] = graph.nodes.map((node, index) => ({
    id: node.id,
    position: {
      x: 80 + (index % 3) * 230,
      y: 60 + Math.floor(index / 3) * 130
    },
    data: { label: node.label },
    style: {
      borderColor: categoryColor[node.category],
      boxShadow: `0 0 32px ${categoryColor[node.category]}22`,
      padding: 12,
      width: 180
    }
  }));

  const edges: Edge[] = graph.edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    label: edge.label,
    animated: true
  }));

  return (
    <div className="h-[360px] overflow-hidden rounded-lg border border-white/10 bg-black/20">
      <ReactFlow nodes={nodes} edges={edges} fitView>
        <Background color="rgba(255,255,255,0.08)" gap={22} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
