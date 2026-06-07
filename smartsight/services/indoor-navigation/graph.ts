import { GraphEdge, GraphNode, NavigationData, RouteResult } from "./types";

function distanceMm(a: GraphNode, b: GraphNode) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function findRoute(
  data: NavigationData,
  startNodeId: string,
  endNodeId: string,
): RouteResult | null {
  const nodes = new Map(data.graph.nodes.map((node) => [node.id, node]));
  const adjacency = new Map<string, { to: string; weight: number }[]>();

  for (const node of data.graph.nodes) adjacency.set(node.id, []);

  for (const edge of data.graph.edges) {
    const from = nodes.get(edge.from);
    const to = nodes.get(edge.to);
    if (!from || !to) continue;

    const weight = edge.distanceMm ?? distanceMm(from, to);
    adjacency.get(edge.from)?.push({ to: edge.to, weight });
    if (edge.bidirectional !== false) {
      adjacency.get(edge.to)?.push({ to: edge.from, weight });
    }
  }

  const distances = new Map<string, number>();
  const previous = new Map<string, string | null>();
  const unvisited = new Set<string>();

  for (const node of data.graph.nodes) {
    distances.set(node.id, node.id === startNodeId ? 0 : Infinity);
    previous.set(node.id, null);
    unvisited.add(node.id);
  }

  while (unvisited.size > 0) {
    let current: string | null = null;

    for (const nodeId of unvisited) {
      if (current == null || distances.get(nodeId)! < distances.get(current)!) {
        current = nodeId;
      }
    }

    if (current == null || distances.get(current) === Infinity) break;
    if (current === endNodeId) break;

    unvisited.delete(current);

    for (const next of adjacency.get(current) ?? []) {
      const alt = distances.get(current)! + next.weight;
      if (alt < distances.get(next.to)!) {
        distances.set(next.to, alt);
        previous.set(next.to, current);
      }
    }
  }

  if (distances.get(endNodeId) === Infinity) return null;

  const nodeIds: string[] = [];
  let current: string | null = endNodeId;

  while (current) {
    nodeIds.unshift(current);
    current = previous.get(current) ?? null;
  }

  return {
    nodeIds,
    distanceMeters: Math.round((distances.get(endNodeId)! / 1000) * 10) / 10,
  };
}
