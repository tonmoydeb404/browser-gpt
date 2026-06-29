import { memo, useMemo } from "react";
import { Controls, type Node, type Edge } from "@xyflow/react";
import { Canvas } from "@/components/ai-elements/canvas";
import { Edge as FlowEdge } from "@/components/ai-elements/edge";
import type {
  SitemapNode,
  SitemapEdge,
} from "@/contexts/conversations/agents/types";

const SitemapNodeComponent = ({
  data,
}: {
  data: { label: string };
}) => (
  <div className="rounded-md border bg-card px-3 py-2 text-xs shadow-sm">
    <div className="truncate font-medium" title={data.label}>
      {data.label}
    </div>
  </div>
);

const nodeTypes = { sitemap: SitemapNodeComponent };

function toFlowData(
  nodes: SitemapNode[],
  edges: SitemapEdge[],
): { flowNodes: Node[]; flowEdges: Edge[] } {
  const flowNodes: Node[] = nodes.map((n, i) => ({
    id: n.id,
    type: "sitemap",
    position: { x: 0, y: i * 100 },
    data: { label: n.title || n.url },
  }));

  const flowEdges: Edge[] = edges.map((e) => ({
    id: `${e.source}-${e.target}`,
    source: e.source,
    target: e.target,
    type: "animated" as const,
  }));

  return { flowNodes, flowEdges };
}

export const ConversationsSitemap = memo(function ConversationsSitemap({
  nodes,
  edges,
}: {
  nodes: SitemapNode[];
  edges: SitemapEdge[];
}) {
  const { flowNodes, flowEdges } = useMemo(
    () => toFlowData(nodes, edges),
    [nodes, edges],
  );

  if (flowNodes.length === 0) return null;

  return (
    <div className="h-64 w-full overflow-hidden rounded-lg border">
      <Canvas
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        proOptions={{ hideAttribution: true }}
      >
        <Controls showInteractive={false} />
      </Canvas>
    </div>
  );
});
