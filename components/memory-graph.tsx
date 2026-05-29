"use client";

import dagre from "dagre";
import { Maximize2, Network, Rows3, Workflow } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  Edge,
  MarkerType,
  MiniMap,
  Node,
  NodeChange,
  Panel,
  Position,
  useEdgesState,
  useNodesState
} from "reactflow";
import { MemoryGraph as MemoryGraphType } from "@/lib/memory/types";

const NODE_WIDTH = 230;
const NODE_HEIGHT = 104;

const categoryColor: Record<string, string> = {
  goal: "#4ade80",
  preference: "#a78bfa",
  routine: "#7dd3fc",
  project: "#60a5fa",
  task: "#a78bfa",
  emotional_state: "#fb7185",
  productivity_pattern: "#fb7185"
};

const edgeColor: Record<string, string> = {
  related_to: "#60a5fa",
  caused_by: "#f4c76b",
  part_of: "#a78bfa",
  emotionally_linked: "#fb7185",
  supports: "#a78bfa",
  relates_to: "#60a5fa",
  contradicts: "#fb7185",
  follows_up: "#f4c76b",
  recurs_with: "#fb7185",
  context: "#64748b"
};

const filters = [
  { id: "all", label: "All" },
  { id: "Architecture", label: "Architecture" },
  { id: "Open Loops", label: "Open Loops" },
  { id: "Productivity", label: "Productivity" },
  { id: "Energy", label: "Energy" },
  { id: "productivity_pattern", label: "Patterns" },
  { id: "preference", label: "Preferences" }
] as const;

const legend = [
  { label: "Project", color: categoryColor.project },
  { label: "Goal", color: categoryColor.goal },
  { label: "Task", color: categoryColor.task },
  { label: "Insight", color: "#f4c76b" },
  { label: "Pattern", color: categoryColor.productivity_pattern }
];

type LayoutMode = "auto" | "manual";
type FilterId = (typeof filters)[number]["id"];
type PositionMap = Record<string, { x: number; y: number }>;

export function MemoryGraph({ graph }: { graph: MemoryGraphType }) {
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("auto");
  const [activeFilter, setActiveFilter] = useState<FilterId>("all");
  const [manualPositions, setManualPositions] = useState<PositionMap>({});
  const [isExpanded, setIsExpanded] = useState(false);

  const filteredGraph = useMemo(() => filterGraph(graph, activeFilter), [activeFilter, graph]);
  const baseNodes = useMemo(() => createNodes(filteredGraph), [filteredGraph]);
  const baseEdges = useMemo(() => createEdges(filteredGraph), [filteredGraph]);

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
    <section
      className={`overflow-hidden rounded-lg border border-white/10 bg-[#090c12] shadow-[0_24px_90px_rgba(0,0,0,0.35)] ${
        isExpanded ? "fixed inset-4 z-50" : ""
      }`}
    >
      <div className="flex flex-col gap-4 border-b border-white/[0.07] bg-gradient-to-b from-white/[0.035] to-transparent px-5 py-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-mint/80">Memory Graph</p>
            <h2 className="mt-2 text-2xl font-medium text-slate-50">How context connects</h2>
          </div>

          <div className="flex items-start gap-5">
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-1">
              {legend.map((item) => (
                <div key={item.label} className="flex items-center gap-2 text-xs text-slate-300">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  {item.label}
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <IconButton active={layoutMode === "auto"} label="Auto layout" onClick={() => setLayoutMode("auto")}>
                <Rows3 className="h-4 w-4" />
              </IconButton>
              <IconButton active={layoutMode === "manual"} label="Manual layout" onClick={() => setLayoutMode("manual")}>
                <Workflow className="h-4 w-4" />
              </IconButton>
              <IconButton active={isExpanded} label="Expand graph" onClick={() => setIsExpanded((current) => !current)}>
                <Maximize2 className="h-4 w-4" />
              </IconButton>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {filters.map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => setActiveFilter(filter.id)}
              className={`rounded-md border px-3 py-1.5 text-xs transition ${
                activeFilter === filter.id
                  ? "border-mint/70 bg-mint/10 text-mint"
                  : "border-white/10 bg-black/20 text-muted hover:border-white/25 hover:text-slate-100"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      <div className={`${isExpanded ? "h-[calc(100vh-12rem)]" : "h-[640px]"} relative`}>
        <ReactFlow
          className="memory-graph-flow"
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          nodesDraggable
          elementsSelectable
          fitView
          fitViewOptions={{ padding: 0.24 }}
          minZoom={0.25}
        >
          <Background color="rgba(148,163,184,0.18)" gap={18} size={1} />
          <Controls className="memory-graph-controls" position="bottom-left" showInteractive />
          <MiniMap
            className="memory-graph-minimap"
            nodeColor={(node) => String(node.style?.borderColor ?? "#7dd3fc")}
            nodeStrokeWidth={2}
            pannable
            zoomable
          />
          <Panel position="bottom-left" className="memory-graph-tip">
            <div className="rounded-lg border border-white/[0.07] bg-[#0d1118]/95 px-3 py-2 text-xs text-muted shadow-xl">
              Tip: Drag nodes to explore connections. Scroll to zoom. Double-click a node to focus.
            </div>
          </Panel>
          <Panel position="top-left" className="memory-graph-count">
            <div className="rounded-md border border-white/[0.08] bg-[#0d1118]/80 px-2.5 py-1 text-xs text-slate-300">
              {nodes.length} nodes / {edges.length} links
            </div>
          </Panel>
        </ReactFlow>
      </div>
    </section>
  );
}

function createNodes(graph: MemoryGraphType): Node[] {
  return graph.nodes.map((node) => {
    const color = categoryColor[node.category] ?? "#f4c76b";

    return {
      id: node.id,
      position: { x: 0, y: 0 },
      sourcePosition: Position.Bottom,
      targetPosition: Position.Top,
      data: {
        label: (
          <div className="space-y-1.5">
            <div className="flex items-start gap-2">
              <span
                className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border"
                style={{ borderColor: color, color }}
              >
                <Network className="h-2.5 w-2.5" />
              </span>
              <div className="min-w-0">
                <div className="line-clamp-2 text-[12px] font-medium leading-4 text-slate-100">{node.label}</div>
                <div className="mt-1 text-[10px] text-slate-400">{labelForNode(node.category, node.cluster)}</div>
              </div>
            </div>
          </div>
        )
      },
      style: {
        borderColor: color,
        background: "rgba(10, 14, 22, 0.92)",
        boxShadow: `0 0 30px ${color}18`,
        padding: 13,
        width: NODE_WIDTH,
        minHeight: NODE_HEIGHT,
        opacity: 0.88 + Math.min(node.importance, 10) * 0.012
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
        strokeWidth: 1 + edge.strength * 1.8,
        opacity: 0.45 + edge.strength * 0.38
      },
      labelStyle: {
        fill: "#d7dee9",
        fontSize: 11
      },
      labelBgPadding: [8, 4],
      labelBgBorderRadius: 8,
      labelBgStyle: {
        fill: "rgba(17, 24, 39, 0.92)",
        stroke: "rgba(255,255,255,0.08)"
      }
    };
  });
}

function filterGraph(graph: MemoryGraphType, filter: FilterId): MemoryGraphType {
  if (filter === "all") return graph;

  const nodes = graph.nodes.filter((node) => node.cluster === filter || node.category === filter);
  const visibleIds = new Set(nodes.map((node) => node.id));

  return {
    nodes,
    edges: graph.edges.filter((edge) => visibleIds.has(edge.source) && visibleIds.has(edge.target))
  };
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
    const position = dagreGraph.node(node.id) ?? { x: 0, y: 0 };

    return {
      ...node,
      position: {
        x: position.x - NODE_WIDTH / 2,
        y: position.y - NODE_HEIGHT / 2
      }
    };
  });
}

function IconButton({
  active,
  children,
  label,
  onClick
}: {
  active?: boolean;
  children: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`grid h-10 w-10 place-items-center rounded-md border transition ${
        active
          ? "border-mint/70 bg-mint/10 text-mint"
          : "border-white/10 bg-black/20 text-muted hover:border-white/25 hover:text-slate-100"
      }`}
    >
      {children}
    </button>
  );
}

function labelForNode(category: string, cluster: string) {
  if (category === "productivity_pattern") return "Pattern";
  if (category === "emotional_state") return "Pattern";
  if (cluster === "Architecture" || cluster === "Demo") return category === "project" ? "Project" : titleCase(category);
  return titleCase(category);
}

function titleCase(value: string) {
  return value
    .replaceAll("_", " ")
    .split(" ")
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}
