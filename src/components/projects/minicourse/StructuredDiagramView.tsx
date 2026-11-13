"use client";

import { Component, type ReactNode, useMemo, useState } from "react";
import { FeedbackTrigger } from "@/components/feedback/FeedbackButton";
import { layoutStructuredDiagram, type DiagramLens } from "@/lib/projects/diagram-layout";
import type { DiagramNodeTone, StructuredDiagram } from "@/lib/projects/types";
import { play, unlockSound } from "@/lib/sound";

const TONE_PALETTE: Record<
  DiagramNodeTone,
  {
    fill: string;
    stroke: string;
    activeStroke: string;
    badgeBg: string;
    badgeText: string;
    badgeLabel: string;
    title: string;
    detail: string;
    edge: string;
  }
> = {
  neutral: {
    fill: "rgba(15, 23, 42, 0.92)",
    stroke: "rgba(148, 163, 184, 0.42)",
    activeStroke: "#e2e8f0",
    badgeBg: "rgba(148, 163, 184, 0.16)",
    badgeText: "#cbd5e1",
    badgeLabel: "CONTEXT",
    title: "#f8fafc",
    detail: "rgba(226, 232, 240, 0.72)",
    edge: "#94a3b8",
  },
  trap: {
    fill: "rgba(45, 12, 24, 0.88)",
    stroke: "rgba(251, 113, 133, 0.52)",
    activeStroke: "#fda4af",
    badgeBg: "rgba(244, 63, 94, 0.22)",
    badgeText: "#fecdd3",
    badgeLabel: "TRAP",
    title: "#ffe4e6",
    detail: "rgba(254, 205, 211, 0.78)",
    edge: "#fb7185",
  },
  accent: {
    fill: "rgba(8, 47, 73, 0.88)",
    stroke: "rgba(103, 232, 249, 0.55)",
    activeStroke: "#67e8f9",
    badgeBg: "rgba(34, 211, 238, 0.2)",
    badgeText: "#a5f3fc",
    badgeLabel: "GUARDRAIL",
    title: "#ecfeff",
    detail: "rgba(207, 250, 254, 0.8)",
    edge: "#22d3ee",
  },
  sound: {
    fill: "rgba(6, 46, 38, 0.88)",
    stroke: "rgba(52, 211, 153, 0.55)",
    activeStroke: "#6ee7b7",
    badgeBg: "rgba(16, 185, 129, 0.22)",
    badgeText: "#a7f3d0",
    badgeLabel: "CALIBRATED",
    title: "#ecfdf5",
    detail: "rgba(209, 250, 229, 0.82)",
    edge: "#34d399",
  },
};

class DiagramErrorBoundary extends Component<
  {
    projectId: string;
    slideId: string;
    slideTitle: string;
    diagram: StructuredDiagram;
    children: ReactNode;
  },
  { errorMessage: string | null }
> {
  state: { errorMessage: string | null } = { errorMessage: null };

  static getDerivedStateFromError(error: Error) {
    return { errorMessage: error.message || "Diagram render error" };
  }

  render() {
    if (this.state.errorMessage) {
      return (
        <div className="rounded-2xl border border-amber-300/30 bg-amber-400/[0.07] p-5 text-sm text-amber-100">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold">This concept diagram could not be displayed</p>
              <p className="mt-1 text-xs text-white/65">
                You can keep reading the card normally and flag this diagram so the course author can fix it.
              </p>
            </div>
            <FeedbackTrigger
              projectId={this.props.projectId}
              surface="primer"
              targetId={this.props.slideId}
              targetLabel={this.props.slideTitle}
              defaultKind="diagram_broken"
              label="Report broken diagram"
              context={{
                renderError: this.state.errorMessage,
                diagram: this.props.diagram,
              }}
            />
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function LensButtons({ lens, onChange }: { lens: DiagramLens; onChange: (next: DiagramLens) => void }) {
  const items: [DiagramLens, string][] = [
    ["both", "⇄ Compare Both"],
    ["trap", "⚠ Naive Trap"],
    ["sound", "✓ Calibrated Fix"],
  ];
  return (
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Interactive diagram lens">
      {items.map(([id, label]) => {
        const active = lens === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => {
              unlockSound();
              play("open");
              onChange(id);
            }}
            className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
              active
                ? "border-cyan-300 bg-cyan-300/20 text-cyan-100"
                : "border-white/15 bg-white/[0.04] text-white/65 hover:border-white/35 hover:text-white"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

function DiagramCanvas({
  projectId,
  slideId,
  slideTitle,
  diagram,
}: {
  projectId: string;
  slideId: string;
  slideTitle: string;
  diagram: StructuredDiagram;
}) {
  const [lens, setLens] = useState<DiagramLens>("both");
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);

  const layout = useMemo(() => layoutStructuredDiagram(diagram, lens), [diagram, lens]);
  const uid = `diag-${slideId.replace(/[^a-z0-9-]/gi, "")}`;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-br from-slate-950/95 via-indigo-950/55 to-slate-900/95 p-4 sm:p-5">
      <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-cyan-400/10 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-10 -left-10 h-36 w-36 rounded-full bg-fuchsia-400/10 blur-2xl" />

      <div className="relative flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
        <p className="text-xs font-medium text-cyan-100/85">{diagram.caption}</p>
        <div className="flex flex-wrap items-center gap-2">
          {layout.hasLanes && <LensButtons lens={lens} onChange={setLens} />}
          <FeedbackTrigger
            projectId={projectId}
            surface="primer"
            targetId={slideId}
            targetLabel={`Diagram · ${slideTitle}`}
            defaultKind="diagram_broken"
            label="Diagram issue?"
            compact
            context={{
              lens,
              diagram,
            }}
          />
        </div>
      </div>

      <div className="relative mt-3 overflow-x-auto">
        <svg
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          className="h-auto min-w-[540px] w-full select-none"
          role="img"
          aria-label={diagram.caption}
        >
          <defs>
            <pattern id={`${uid}-grid`} width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1" fill="rgba(255,255,255,0.06)" />
            </pattern>
            {(Object.keys(TONE_PALETTE) as DiagramNodeTone[]).map((tone) => (
              <marker
                key={tone}
                id={`${uid}-arrow-${tone}`}
                viewBox="0 0 10 10"
                refX="8.5"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill={TONE_PALETTE[tone].edge} />
              </marker>
            ))}
          </defs>

          <rect x="0" y="0" width={layout.width} height={layout.height} fill={`url(#${uid}-grid)`} rx="12" />

          {/* Edge paths */}
          {layout.edges.map((edge) => {
            const connected = activeNodeId ? edge.from === activeNodeId || edge.to === activeNodeId : false;
            const opacity = edge.dimmed ? 0.16 : activeNodeId && !connected ? 0.35 : 0.92;
            const strokeColor = TONE_PALETTE[edge.tone].edge;

            return (
              <g key={edge.id} style={{ opacity, transition: "opacity 220ms ease" }}>
                <path
                  d={edge.path}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth={connected ? 2.6 : 1.9}
                  strokeDasharray={edge.style === "dashed" ? "5 4" : undefined}
                  markerEnd={`url(#${uid}-arrow-${edge.tone})`}
                />
              </g>
            );
          })}

          {/* Nodes */}
          {layout.nodes.map((node) => {
            const palette = TONE_PALETTE[node.tone];
            const selected = activeNodeId === node.id;
            const opacity = node.dimmed ? 0.2 : 1;
            const badgeWidth = palette.badgeLabel.length * 5.8 + 12;

            return (
              <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                style={{ opacity, transition: "opacity 220ms ease", cursor: "pointer" }}
                onClick={() => setActiveNodeId((cur) => (cur === node.id ? null : node.id))}
              >
                <rect
                  x="0"
                  y="0"
                  width={node.width}
                  height={node.height}
                  rx="12"
                  fill={palette.fill}
                  stroke={selected ? palette.activeStroke : palette.stroke}
                  strokeWidth={selected ? 2 : 1.25}
                />
                <rect x="10" y="7" width={badgeWidth} height="14" rx="7" fill={palette.badgeBg} />
                <text
                  x={10 + badgeWidth / 2}
                  y="16.8"
                  textAnchor="middle"
                  fill={palette.badgeText}
                  fontSize="8.5"
                  fontWeight="600"
                  fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                >
                  {palette.badgeLabel}
                </text>

                {node.titleLines.map((line, i) => (
                  <text
                    key={`t-${i}`}
                    x="11"
                    y={34 + i * 13}
                    fill={palette.title}
                    fontSize="11.5"
                    fontWeight="600"
                    fontFamily="ui-sans-serif, system-ui, -apple-system, sans-serif"
                  >
                    {line}
                  </text>
                ))}

                {node.detailLines.slice(0, node.titleLines.length > 1 ? 1 : 2).map((line, i) => (
                  <text
                    key={`d-${i}`}
                    x="11"
                    y={(node.titleLines.length > 1 ? 60 : 49) + i * 11.5}
                    fill={palette.detail}
                    fontSize="9.8"
                    fontFamily="ui-sans-serif, system-ui, -apple-system, sans-serif"
                  >
                    {line}
                  </text>
                ))}
              </g>
            );
          })}

          {/* Edge label pills painted above nodes so labels are never clipped */}
          {layout.edges.map((edge) => {
            if (!edge.label) return null;
            const connected = activeNodeId ? edge.from === activeNodeId || edge.to === activeNodeId : false;
            const opacity = edge.dimmed ? 0.12 : activeNodeId && !connected ? 0.35 : 0.96;
            const pillWidth = Math.max(46, edge.label.length * 6.2 + 14);
            return (
              <g
                key={`${edge.id}-label`}
                transform={`translate(${edge.labelX}, ${edge.labelY})`}
                style={{ opacity, transition: "opacity 220ms ease", pointerEvents: "none" }}
              >
                <rect
                  x={-pillWidth / 2}
                  y={-9.5}
                  width={pillWidth}
                  height={18}
                  rx={9}
                  fill="rgba(9, 13, 26, 0.94)"
                  stroke="rgba(255, 255, 255, 0.2)"
                  strokeWidth="1"
                />
                <text
                  x="0"
                  y="3.2"
                  textAnchor="middle"
                  fill="#e2e8f0"
                  fontSize="9.5"
                  fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                >
                  {edge.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

export function StructuredDiagramView({
  projectId,
  slideId,
  slideTitle,
  diagram,
}: {
  projectId: string;
  slideId: string;
  slideTitle: string;
  diagram: StructuredDiagram;
}) {
  return (
    <DiagramErrorBoundary projectId={projectId} slideId={slideId} slideTitle={slideTitle} diagram={diagram}>
      <DiagramCanvas projectId={projectId} slideId={slideId} slideTitle={slideTitle} diagram={diagram} />
    </DiagramErrorBoundary>
  );
}
