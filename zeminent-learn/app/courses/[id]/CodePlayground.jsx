"use client";

import { forwardRef, useImperativeHandle, useRef, useState } from "react";

const STARTER = 'console.log("Hello World");';

function valueToText(value) {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

const CodePlayground = forwardRef(function CodePlayground({ hideRunButton = false }, ref) {
  const [code, setCode] = useState(STARTER);
  const [lines, setLines] = useState([]);
  const iframeRef = useRef(null);
  const runIdRef = useRef(0);

  function runCode() {
    const runId = String(++runIdRef.current);
    setLines([]);
    iframeRef.current?.remove();

    const iframe = document.createElement("iframe");
    iframe.sandbox = "allow-scripts";
    iframe.style.display = "none";
    iframeRef.current = iframe;

    const cleanup = setTimeout(() => {
      if (iframeRef.current === iframe) {
        setLines((prev) => [...prev, { type: "error", text: "Execution timed out after 3s." }]);
        iframe.remove();
        iframeRef.current = null;
      }
    }, 3000);

    const onMessage = (event) => {
      if (event.source !== iframe.contentWindow || event.data?.runId !== runId) return;
      const { type, payload, done } = event.data;
      if (type) {
        setLines((prev) => [...prev, { type, text: payload.map(valueToText).join(" ") }]);
      }
      if (done) {
        clearTimeout(cleanup);
        window.removeEventListener("message", onMessage);
        iframe.remove();
        if (iframeRef.current === iframe) iframeRef.current = null;
      }
    };

    window.addEventListener("message", onMessage);
    iframe.srcdoc = `
      <script>
        const runId = ${JSON.stringify(runId)};
        const send = (type, payload) => parent.postMessage({ runId, type, payload }, "*");
        ["log","warn","error"].forEach((name) => {
          console[name] = (...args) => send(name, args);
        });
        try {
          const result = Function(${JSON.stringify(code)})();
          if (result !== undefined) send("return", [result]);
        } catch (error) {
          send("error", [error && error.stack ? error.stack : String(error)]);
        }
        parent.postMessage({ runId, done: true }, "*");
      <\/script>
    `;
    document.body.appendChild(iframe);
  }

  useImperativeHandle(ref, () => ({ runCode }));

  return (
    <section className="rounded-lg border border-border bg-card p-3 md:p-4">
      <div className={hideRunButton ? "mb-3" : "mb-3 flex items-center justify-between gap-3"}>
        <h3 className="font-display text-lg">Try it yourself</h3>
        {!hideRunButton ? (
          <button
            type="button"
            onClick={runCode}
            className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-bg transition-colors hover:bg-accent-2"
          >
            Run
          </button>
        ) : null}
      </div>
      <div className="grid gap-3">
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          spellCheck={false}
          className="min-h-[360px] w-full resize-y rounded-lg border border-border bg-[#080b12] p-4 font-mono text-sm leading-6 text-white outline-none transition-colors placeholder:text-muted focus:border-border-strong"
        />
        <div className="min-h-40 rounded-lg border border-border bg-[#05070c] p-4 font-mono text-sm text-muted-2">
          {lines.length ? (
            lines.map((line, index) => (
              <div
                key={index}
                className={
                  line.type === "error"
                    ? "text-red-300"
                    : line.type === "warn"
                      ? "text-yellow-200"
                      : line.type === "return"
                        ? "text-accent-2"
                        : "text-slate-200"
                }
              >
                {line.text}
              </div>
            ))
          ) : (
            <span className="text-muted">Output will appear here.</span>
          )}
        </div>
      </div>
    </section>
  );
});

export default CodePlayground;
