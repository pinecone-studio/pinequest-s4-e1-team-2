import { GraphNode } from "./types";

const QR1_INSTRUCTIONS: Record<string, string[]> = {
  room_303_door: ["303 тоот одоо байгаа газрын тань зүүн гар талд байна."],
  room_302_door: [
    "Одоо байгаа газраасаа баруун гар тийш эргээд 6.6 метр явна.",
    "302 тоот зүүн гар талд байна.",
  ],
  room_301_door: [
    "Одоо байгаа газраасаа баруун гар тийш эргээд 9.9 метр явна.",
    "301 тоот зүүн гар талд байна.",
  ],
  room_304_door: [
    "Одоо байгаа газраасаа эсрэг тал руугаа эргээд 6.2 метр явна.",
    "304 тоотод хүрнэ.",
  ],
  room_305_door: [
    "Одоо байгаа газраасаа эсрэг тал руугаа эргээд 6.2 метр явна.",
    "Зүүн гар тийш эргээд 2.5 метр явна.",
    "305 тоот баруун гар талд байна.",
  ],
  room_00_door: [
    "Одоо байгаа газраасаа баруун гар тийш эргээд 9.9 метр явна.",
    "Баруун гар тийш эргээд 7.5 метр явна.",
    "00 өрөө зүүн гар талд байна.",
  ],
  qr_2_node: [
    "Одоо байгаа газраасаа баруун гар тийш эргээд 9.9 метр явна.",
    "Баруун гар тийш эргээд 8.8 метр явна.",
    "Хаалгаар гараад шатанд хүрнэ.",
  ],
};

function normalizeDegrees(degrees: number) {
  return ((degrees + 540) % 360) - 180;
}

function getTurnText(previous: GraphNode, current: GraphNode, next: GraphNode) {
  const incoming = Math.atan2(current.y - previous.y, current.x - previous.x);
  const outgoing = Math.atan2(next.y - current.y, next.x - current.x);
  const turnDegrees = normalizeDegrees(((outgoing - incoming) * 180) / Math.PI);

  if (Math.abs(turnDegrees) < 30) return "чигээрээ";
  return turnDegrees > 0 ? "зүүн гар тийш" : "баруун гар тийш";
}

function getDistanceMeters(from: GraphNode, to: GraphNode) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  return Math.round((Math.sqrt(dx * dx + dy * dy) / 1000) * 10) / 10;
}

export function buildRouteInstructions(nodes: GraphNode[]) {
  if (nodes.length === 0) return ["Зам олдсонгүй."];
  if (nodes.length === 1) return ["Та сонгосон цэг дээр байна."];

  const startNodeId = nodes[0].id;
  const endNodeId = nodes[nodes.length - 1].id;

  if (startNodeId === "qr_1_node" && QR1_INSTRUCTIONS[endNodeId]) {
    return QR1_INSTRUCTIONS[endNodeId];
  }

  const instructions: string[] = [];
  const firstDistanceMeters = getDistanceMeters(nodes[0], nodes[1]);
  instructions.push(
    `QR уншуулсан цэгээсээ урагш ${firstDistanceMeters} метр явна.`,
  );

  for (let i = 1; i < nodes.length - 1; i++) {
    const previous = nodes[i - 1];
    const current = nodes[i];
    const next = nodes[i + 1];
    const turnText = getTurnText(previous, current, next);
    const distanceMeters = getDistanceMeters(current, next);

    if (turnText === "чигээрээ") {
      instructions.push(`Чигээрээ ${distanceMeters} метр явна.`);
    } else {
      instructions.push(`${turnText} эргээд ${distanceMeters} метр явна.`);
    }
  }

  instructions.push("Та очих газартаа ирлээ.");
  return instructions;
}
