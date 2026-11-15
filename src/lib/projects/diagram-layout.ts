import type { DiagramEdge, DiagramLane, DiagramNode, DiagramNodeTone, StructuredDiagram } from "./types";

export type DiagramLens = "both" | "trap" | "sound";

export interface PositionedNode extends DiagramNode {
  x: number;
  y: number;
  width: number;
  height: number;
  col: number;
  dimmed: boolean;
  titleLines: string[];
  detailLines: string[];
}

export interface PositionedEdge extends DiagramEdge {
  id: string;
  path: string;
  labelX: number;
  labelY: number;
  tone: DiagramNodeTone;
  dimmed: boolean;
}

export interface DiagramLayout {
  width: number;
  height: number;
  nodes: PositionedNode[];
  edges: PositionedEdge[];
  hasLanes: boolean;
}

function wrapWords(text: string, maxChars: number, maxLines: number): string[] {
  const clean = text.trim().replace(/\s+/g, " ");
  if (!clean) return [];
  const words = clean.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxChars || !current) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
      if (lines.length === maxLines - 1) break;
    }
  }
  const consumedWords = lines.join(" ").split(" ").filter(Boolean).length;
  const remainder = words.slice(consumedWords).join(" ");
  if (remainder) {
    lines.push(remainder.length > maxChars + 3 ? `${remainder.slice(0, maxChars).trimEnd()}…` : remainder);
  } else if (current && lines.length < maxLines) {
    lines.push(current);
  }
  return lines.slice(0, maxLines);
}

function inferLane(node: DiagramNode): DiagramLane {
  if (node.lane) return node.lane;
  if (node.tone === "trap") return "trap";
  if (node.tone === "sound" || node.tone === "accent") return "sound";
  return "shared";
}

function isNodeDimmed(node: DiagramNode, lens: DiagramLens): boolean {
  if (lens === "both") return false;
  const lane = inferLane(node);
  if (lane === "shared") return false;
  return lane !== lens;
}

const LANE_ORDER: Record<DiagramLane, number> = {
  trap: 0,
  shared: 1,
  sound: 2,
};

/**
 * Deterministic DAG/flow layout for 3–6 structured diagram nodes.
 * Produces finite SVG coordinates with zero external runtime dependencies.
 */
export function layoutStructuredDiagram(diagram: StructuredDiagram, lens: DiagramLens = "both"): DiagramLayout {
  const width = 860;
  const rawNodes = diagram.nodes.slice(0, 6);
  if (rawNodes.length === 0) {
    throw new Error("Diagram contains no nodes to render.");
  }

  const byId = new Map<string, DiagramNode>();
  for (const node of rawNodes) {
    byId.set(node.id, node);
  }

  const validEdges = diagram.edges.filter(
    (edge) => edge.from !== edge.to && byId.has(edge.from) && byId.has(edge.to),
  );

  // Compute topological column depth with cycle guard.
  const incomingCount = new Map<string, number>();
  const outgoing = new Map<string, string[]>();
  for (const node of rawNodes) {
    incomingCount.set(node.id, 0);
    outgoing.set(node.id, []);
  }
  for (const edge of validEdges) {
    incomingCount.set(edge.to, (incomingCount.get(edge.to) ?? 0) + 1);
    outgoing.get(edge.from)?.push(edge.to);
  }

  const colOf = new Map<string, number>();
  const queue: string[] = rawNodes.filter((n) => (incomingCount.get(n.id) ?? 0) === 0).map((n) => n.id);
  if (queue.length === 0) queue.push(rawNodes[0].id);

  for (const id of queue) colOf.set(id, 0);

  let steps = 0;
  const maxSteps = rawNodes.length * rawNodes.length + 4;
  while (queue.length > 0 && steps < maxSteps) {
    steps++;
    const current = queue.shift()!;
    const baseCol = colOf.get(current) ?? 0;
    for (const next of outgoing.get(current) ?? []) {
      const nextCol = Math.min(rawNodes.length - 1, baseCol + 1);
      if ((colOf.get(next) ?? -1) < nextCol) {
        colOf.set(next, nextCol);
        queue.push(next);
      }
    }
  }

  rawNodes.forEach((node, idx) => {
    if (!colOf.has(node.id)) colOf.set(node.id, Math.min(idx, 3));
  });

  // Compress sparse column indices to contiguous 0..numCols-1.
  const distinctCols = [...new Set([...colOf.values()])].sort((a, b) => a - b);
  const colRank = new Map(distinctCols.map((c, i) => [c, i]));
  const numCols = Math.max(1, distinctCols.length);

  const columns: DiagramNode[][] = Array.from({ length: numCols }, () => []);
  for (const node of rawNodes) {
    const c = colRank.get(colOf.get(node.id) ?? 0) ?? 0;
    columns[c].push(node);
  }

  for (const colNodes of columns) {
    colNodes.sort((a, b) => LANE_ORDER[inferLane(a)] - LANE_ORDER[inferLane(b)]);
  }

  const maxRowsInCol = Math.max(1, ...columns.map((c) => c.length));
  const nodeWidth = numCols >= 4 ? 168 : numCols === 3 ? 204 : 240;
  const nodeHeight = 76;
  const vGap = 36;
  const padX = 24;
  const padY = 24;
  const height = Math.max(196, padY * 2 + maxRowsInCol * nodeHeight + (maxRowsInCol - 1) * vGap);

  const usableW = width - padX * 2 - nodeWidth;
  const positionedById = new Map<string, PositionedNode>();

  columns.forEach((colNodes, cIdx) => {
    const x = numCols === 1 ? (width - nodeWidth) / 2 : padX + (usableW * cIdx) / (numCols - 1);
    const totalColH = colNodes.length * nodeHeight + (colNodes.length - 1) * vGap;

    colNodes.forEach((node, rIdx) => {
      let y = (height - totalColH) / 2 + rIdx * (nodeHeight + vGap);
      // If a single node sits in a column of a multi-row branching graph, align trap top / sound bottom.
      if (colNodes.length === 1 && maxRowsInCol >= 2) {
        const lane = inferLane(node);
        if (lane === "trap") y = padY;
        else if (lane === "sound") y = height - padY - nodeHeight;
      }

      const maxTitleChars = numCols >= 4 ? 19 : 24;
      const maxDetailChars = numCols >= 4 ? 24 : 31;
      const positioned: PositionedNode = {
        ...node,
        x: Math.round(x),
        y: Math.round(y),
        width: nodeWidth,
        height: nodeHeight,
        col: cIdx,
        dimmed: isNodeDimmed(node, lens),
        titleLines: wrapWords(node.label, maxTitleChars, 2),
        detailLines: node.detail ? wrapWords(node.detail, maxDetailChars, 2) : [],
      };
      positionedById.set(node.id, positioned);
    });
  });

  const edges: PositionedEdge[] = validEdges.map((edge, idx) => {
    const from = positionedById.get(edge.from)!;
    const to = positionedById.get(edge.to)!;

    const forward = to.x >= from.x;
    const startX = forward ? from.x + from.width : from.x;
    const startY = from.y + from.height / 2;
    const endX = forward ? to.x : to.x + to.width;
    const endY = to.y + to.height / 2;

    const dx = Math.max(36, Math.abs(endX - startX) * 0.48);
    const cx1 = forward ? startX + dx : startX - dx;
    const cx2 = forward ? endX - dx : endX + dx;
    const path = `M ${startX} ${startY} C ${cx1} ${startY}, ${cx2} ${endY}, ${endX} ${endY}`;

    // Cubic bezier midpoint at t = 0.5
    const labelX = Math.round(0.125 * startX + 0.375 * cx1 + 0.375 * cx2 + 0.125 * endX);
    const labelY = Math.round(0.125 * startY + 0.375 * startY + 0.375 * endY + 0.125 * endY);

    const targetLane = inferLane(to);
    const tone: DiagramNodeTone =
      targetLane === "trap" ? "trap" : targetLane === "sound" ? (to.tone === "accent" ? "accent" : "sound") : to.tone;

    return {
      ...edge,
      id: `${edge.from}-${edge.to}-${idx}`,
      path,
      labelX,
      labelY,
      tone,
      dimmed: from.dimmed || to.dimmed,
    };
  });

  const hasLanes =
    rawNodes.some((n) => inferLane(n) === "trap") && rawNodes.some((n) => inferLane(n) === "sound");

  return {
    width,
    height,
    nodes: rawNodes.map((n) => positionedById.get(n.id)!),
    edges,
    hasLanes,
  };
}
