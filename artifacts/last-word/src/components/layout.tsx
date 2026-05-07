import { ReactNode } from "react";

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-[100dvh] flex flex-col text-foreground relative overflow-hidden dark">
      {/* Vignette overlay for depth */}
      <div className="vignette" />

      <div className="relative z-10 flex-1 flex flex-col pb-[50px] overflow-y-auto">
        {children}
      </div>

      {/* Styled ad banner — looks like a real mobile banner */}
      <div
        className="h-[50px] fixed bottom-0 left-0 w-full z-40 flex items-center justify-between px-4"
        style={{
          background: "linear-gradient(90deg, #05090f 0%, #0c1628 50%, #05090f 100%)",
          borderTop: "1px solid rgba(34,211,238,0.14)",
        }}
      >
        {/* Left: fake brand */}
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black text-white flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #22d3ee 0%, #7c3aed 100%)" }}
          >
            LW
          </div>
          <span className="text-xs font-bold text-white/55 leading-none">Last Word Pro</span>
        </div>

        {/* Centre: label */}
        <span className="text-[9px] font-mono text-white/18 uppercase tracking-widest">Sponsored</span>

        {/* Right: CTA */}
        <div
          className="px-3 py-1 rounded-full text-xs font-bold text-cyan-400 flex-shrink-0"
          style={{
            background: "rgba(34,211,238,0.09)",
            border: "1px solid rgba(34,211,238,0.22)",
          }}
        >
          Play Free
        </div>
      </div>
    </div>
  );
}
