"use client";

import dagre from "dagre";
import { useCallback, useEffect, useMemo, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  Edge,
  MarkerType,
  Node,
  NodeChange,
  Position,
  useEdgesState,
  useNodesState
} from "reactflow";
import { MemoryGraph as MemoryGraphType } from "@/lib/memory/types";

const NODE_WIDTH = 260;
const NODE_HEIGHT = 118;

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
  supports: "#8ee6c9",
  relates_to: "#7dd3fc",
  contradicts: "#f0a3b2",
  follows_up: "#f4c76b",
  recurs_with: "#93c5fd",
  context: "#64748b"
};

type LayoutMode = "auto" | "manual";
type PositionMap = Record<string, { x: number; y: number }>;

export function MemoryGraph({ graph }: { graph: MemoryGraphType }) {
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("auto");
  const [manualPositions, setManualPositions] = useState<PositionMap>({});

  const baseNodes = useMemo(() => createNodes(graph), [graph]);
  const baseEdges = useMemo(() => createEdges(graph), [graph]);
  const clusters = useMemo(() => Array.from(new Set(graph.nodes.map((node) => node.cluster))).slice(0, 8), [graph.nodes]);

  const initialNodes = useMemo(
    () => getVisibleNodes(baseNodes, baseEdges, layoutMode, manualPositions),
    [baseEdges, baseNodes, layoutMode, manualPositions]
  );

  const [nodes, setNodes, applyNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges] = useEdgesState(baseEdges);

  useEffect(() => {
    setNodes(getVisibleNodes(baseNodes, baseEdges, layoutMode, manualPositions));
    setEdges(baseEdges);
  }, [baseEdges, baseNodes, layoutMode, manualPositions, setEdges, setNodes]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      applyNodesChange(changes);

      const moved = changes.filter((change) => change.type === "position" && change.position);
      if (!moved.length) return;

      setManualPositions((current) => {
        const next = { ...current };
        moved.forEach((change) => {
          if (change.type === "position" && change.position) {
            next[change.id] = change.position;
          }
        });
        return next;
      });

      if (layoutMode === "auto") {
        setLayoutMode("manual");
      }
    },
    [applyNodesChange, layoutMode]
  );

  return (
    <div className="flex h-[680px] flex-col overflow-hidden rounded-lg border border-white/10 bg-black/20">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-white/[0.025] px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          {clusters.map((cluster) => (
            <span key={cluster} className="rounded-md bg-white/[0.055] px-2.5 py-1 text-xs text-slate-300">
              {cluster}
            </span>
          ))}
        </div>
        <div className="inline-flex rounded-lg border border-white/10 bg-black/25 p-1">
          <button
            type="button"
            onClick={() => setLayoutMode("auto")}
            className={`rounded-md px-3 py-1.5 text-xs transition ${
              layoutMode === "auto" ? "bg-signal text-black" : "text-muted hover:text-slate-100"
            }`}
          >
            Auto Layout
          </button>
          <button
            type="button"
            onClick={() => setLayoutMode("manual")}
            className={`rounded-md px-3 py-1.5 text-xs transition ${
              layoutMode === "manual" ? "bg-white/[0.12] text-slate-100" : "text-muted hover:text-slate-100"
            }`}
          >
            Manual
          </button>
        </div>
      </div>

      <ReactFlow
        className="flex-1"
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        nodesDraggable
        elementsSelectable
        fitView
        fitViewOptions={{ padding: 0.22 }}
        minZoom={0.25}
      >
        <Background color="rgba(255,255,255,0.08)" gap={28} />
        <Controls showInteractive />
      </ReactFlow>
    </div>
  );
}

function createNodes(graph: MemoryGraphType): Node[] {
  return graph.nodes.map((node) => {
    const color = categoryColor[node.category] ?? "#7dd3fc";

    return {
      id: node.id,
      position: { x: 0, y: 0 },
      sourcePosition: Position.Bottom,
      targetPosition: Position.Top,
      data: {
        label: (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">{node.cluster}</span>
              <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] text-slate-300">{node.importance}/10</span>
            </div>
            <div className="line-clamp-3 text-[13px] leading-5 text-slate-100">{node.label}</div>
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
              <span>{node.category.replaceAll("_", " ")}</span>
            </div>
          </div>
        )
      },
      style: {
        borderColor: color,
        boxShadow: `0 0 28px ${color}1f`,
        padding: 14,
        width: NODE_WIDTH,
        minHeight: NODE_HEIGHT,
        opacity: 0.86 + Math.min(node.importance, 10) * 0.014
      }
    };
  });
}

function createEdges(graph: MemoryGraphType): Edge[] {
  return graph.edges.map((edge) => {
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
      labelBgPadding: [6, 3],
      labelBgBorderRadius: 6,
      labelBgStyle: {
        fill: "rgba(8, 9, 11, 0.82)"
      }
    };
  });
}

function getVisibleNodes(nodes: Node[], edges: Edge[], layoutMode: LayoutMode, manualPositions: PositionMap) {
  const layouted = layoutWithDagre(nodes, edges);

  if (layoutMode === "auto") return layouted;

  return layouted.map((node) => ({
    ...node,
    position: manualPositions[node.id] ?? node.position
  }));
}

function layoutWithDagre(nodes: Node[], edges: Edge[]) {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: "TB", nodesep: 100, ranksep: 150 });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  return nodes.map((node) => {
    const position = dagreGraph.node(node.id);

    return {
      ...node,
      position: {
        x: position.x - NODE_WIDTH / 2,
        y: position.y - NODE_HEIGHT / 2
      }
    };
  });
}
