export type GraphNode = {
  id: string;
  x: number; // DXF mm
  y: number; // DXF mm
  label?: string;
};

export type GraphEdge = {
  from: string;
  to: string;
  distanceMm?: number;
  bidirectional?: boolean;
};

export type Room = {
  id: string;
  name: string;
  doorNodeId: string;
  x?: number;
  y?: number;
};

export type QrAnchor = {
  id: string;
  label: string;
  nodeId: string;
  buildingId: string;
  floor: number;
};

export type NavigationData = {
  buildingId: string;
  buildingName: string;
  floor: number;
  qrAnchors: QrAnchor[];
  rooms: Room[];
  graph: {
    nodes: GraphNode[];
    edges: GraphEdge[];
  };
};

export type RouteResult = {
  nodeIds: string[];
  distanceMeters: number;
};
