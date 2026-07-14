"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import CodePlayground from "../../courses/[id]/CodePlayground";

export default function CodeProblemPage() {
  const { id } = useParams();
  const playgroundRef = useRef(null);
  const [problem, setProblem] = useState(null);
  const [error, setError] = useState("");
  const [showSolution, setShowSolution] = useState(false);

  useEffect(() => {
    fetch(`/api/code-problems/${id}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((json) => setProblem(json?.data?.codeProblem || json?.codeProblem))
      .catch(() => setError("Could not load code problem."));
  }, [id]);

  if (error) return <div className="mx-auto max-w-5xl px-6 py-10 text-red-300">{error}</div>;
  if (!problem) return <div className="mx-auto max-w-5xl px-6 py-10 text-muted-2">Loading...</div>;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#f5f5f5] text-slate-900">
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4">
        <Link href="/Dashboard/Curriculum" className="text-sm font-medium text-slate-700 hover:text-slate-950">
          &lt; Back
        </Link>
        <button
          type="button"
          onClick={() => playgroundRef.current?.runCode()}
          className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-bg hover:bg-accent-2"
        >
          Run
        </button>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-2">
        <section className="min-h-0 overflow-y-auto border-r border-slate-200 bg-white p-6">
          <div className="mx-auto max-w-3xl">
            <div className="mb-5 border-b border-slate-100 pb-3 text-sm font-semibold text-slate-700">
              Description
            </div>
            <h1 className="mb-5 text-2xl font-semibold text-slate-950">{problem.title}</h1>
            <div className="whitespace-pre-wrap text-sm leading-7 text-slate-700">{problem.questionText}</div>
          </div>
        </section>

        <section className="min-h-0 overflow-y-auto bg-[#f7f7f8] p-3">
          <div className="space-y-3">
            <CodePlayground ref={playgroundRef} hideRunButton />

            <button
              type="button"
              onClick={() => setShowSolution((v) => !v)}
              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-bg hover:bg-accent-2"
            >
              {showSolution ? "Hide Solution" : "View Solution"}
            </button>

            {showSolution ? (
              <pre className="overflow-x-auto rounded-lg border border-border bg-[#05070c] p-5 text-sm text-slate-100">
                <code>{problem.solutionCode}</code>
              </pre>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
