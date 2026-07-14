"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRightIcon,
  CheckCircleIcon,
  LockIcon,
  MedalIcon,
  PlayCircleIcon,
} from "../../components/Icons";

function Bar({ percent }) {
  return (
    <div className="h-1.5 bg-card-2 rounded-full overflow-hidden">
      <div className="h-full rounded-full bg-gradient-to-r from-accent to-accent-violet" style={{ width: `${percent}%` }} />
    </div>
  );
}

export default function CurriculumPage() {
  const [pathCourses, setPathCourses] = useState([]);
  const [progress, setProgress] = useState([]);
  const [details, setDetails] = useState({});
  const [openId, setOpenId] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/path", { cache: "no-store" }).then((r) => r.json()).catch(() => ({})),
      fetch("/api/progress/summary", { cache: "no-store" }).then((r) => r.json()).catch(() => ({})),
    ]).then(([path, prog]) => {
      const list = path?.courses || path?.data?.courses || [];
      setPathCourses(list);
      setProgress(prog?.data?.summary || []);
      Promise.all(
        list.map((c) =>
          fetch(`/api/courses/${c._id || c.id}/lectures`, { cache: "no-store" })
            .then((r) => r.json())
            .then((j) => [String(c._id || c.id), j?.data || j])
            .catch(() => null),
        ),
      ).then((rows) => setDetails(Object.fromEntries(rows.filter(Boolean))));
    });
  }, []);

  const openDpp = async (dpp) => {
    const json = await fetch(`/api/dpps/${dpp._id || dpp.id}`, { cache: "no-store" }).then((r) => r.json());
    setQuiz({ ...(json?.data?.dpp || json?.dpp), index: 0, score: 0 });
    setAnswer("");
    setResult(null);
  };

  const submitAnswer = async () => {
    const q = quiz.questions[quiz.index];
    const json = await fetch(`/api/dpps/${quiz._id}/questions/${q._id}/answer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ selectedOption: answer }),
    }).then((r) => r.json());
    const checked = json?.data || json;
    setResult(checked);
    if (checked.correct) setQuiz((x) => ({ ...x, score: x.score + 1 }));
  };

  const courses = useMemo(() => {
    const progById = new Map(progress.map((p) => [String(p.courseId), p]));
    return pathCourses
      .map((c, i) => {
        const id = String(c._id || c.id);
        const p = progById.get(id) || {};
        const prev = pathCourses[i - 1];
        const unlocked = i === 0 || c.completed || prev?.completed;
        return {
          id,
          title: c.title || p.title || "Course",
          percent: c.completed ? 100 : Math.max(0, Math.min(100, p.percent || 0)),
          watched: p.watchedLectures || 0,
          total: p.totalLectures || c.lectures?.length || 1,
          locked: !unlocked,
          lecture: p.lastLectureId ? "Continue last watched video" : "Video 1",
          dpps: (details[id]?.sections || []).flatMap((s) => s.dpps || []),
          codeProblems: (details[id]?.sections || []).flatMap((s) => s.codeProblems || []),
        };
      });
  }, [pathCourses, progress, details]);

  const avg = courses.length ? Math.round(courses.reduce((a, c) => a + c.percent, 0) / courses.length) : 0;
  const done = courses.filter((c) => c.percent >= 100).length;

  return (
    <div className="max-w-300 mx-auto px-6 md:px-8 py-8 md:py-10">
      <h1 className="font-display text-2xl text-white mb-6">Curriculum</h1>
      <div className="card overflow-hidden grid grid-cols-1 lg:grid-cols-[1fr_320px]">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white">Curriculum Roadmap</h2>
            <span className="rounded-full bg-accent text-bg text-xs px-4 py-2">Learn Completion</span>
          </div>
          <ol className="relative flex flex-col gap-3 before:absolute before:left-4 before:top-4 before:bottom-4 before:w-px before:bg-accent/30">
            {courses.map((c, i) => (
              <li key={c.id} className="relative grid grid-cols-[34px_1fr] gap-4">
                <span className="relative z-10 mt-4 size-8 rounded-full border border-accent/40 bg-card grid place-items-center text-accent-2">
                  {c.locked ? <LockIcon width={14} /> : <CheckCircleIcon width={14} />}
                </span>
                <button
                  type="button"
                  onClick={() => !c.locked && setOpenId(openId === c.id ? null : c.id)}
                  className="text-left rounded-xl border border-border bg-card/70 hover:border-accent/40 p-4 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-white font-semibold truncate">Week {i + 1}: {c.title}</h3>
                      <p className="text-sm text-muted-2 mt-1">
                        {c.locked ? "Complete previous course to unlock" : `${c.watched}/${c.total} lessons complete`}
                      </p>
                    </div>
                    <span className="font-mono text-xs text-accent-2">{c.percent}%</span>
                    <ArrowRightIcon className={`text-muted-2 transition-transform ${openId === c.id ? "rotate-90" : ""}`} />
                  </div>
                  <div className="mt-3"><Bar percent={c.percent} /></div>
                  {openId === c.id ? (
                    <div className="mt-4 space-y-2">
                      <Link href={`/courses/${c.id}`} className="flex items-center gap-3 rounded-lg bg-white/[0.04] px-3 py-2 text-sm text-muted-2 hover:text-white">
                        <PlayCircleIcon width={16} /> {c.lecture}
                      </Link>
                      {c.dpps.map((dpp) => (
                        <button key={dpp._id} type="button" onClick={() => openDpp(dpp)} className="w-full flex items-center gap-3 rounded-lg bg-accent-soft px-3 py-2 text-sm text-accent-2 hover:text-white">
                          <CheckCircleIcon width={16} /> DPP: {dpp.title}
                        </button>
                      ))}
                      {c.codeProblems.map((codeProblem) => (
                        <Link key={codeProblem._id} href={`/code-problem/${codeProblem._id}`} className="flex items-center gap-3 rounded-lg bg-white/[0.04] px-3 py-2 text-sm text-muted-2 hover:text-white">
                          <span className="font-mono text-accent-2">&lt;/&gt;</span> Code: {codeProblem.title}
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </button>
              </li>
            ))}
          </ol>
        </div>
        <aside className="border-t lg:border-t-0 lg:border-l border-border bg-accent-soft/20 p-6 flex flex-col justify-center gap-6">
          <div className="mx-auto size-36 rounded-full p-3" style={{ background: `conic-gradient(#5ce6d0 ${avg * 3.6}deg, rgba(255,255,255,.08) 0)` }}>
            <div className="size-full rounded-full bg-card grid place-items-center text-center">
              <div><p className="text-xs text-muted-2">Course Completion</p><p className="text-3xl font-semibold text-accent-2">{avg}%</p></div>
            </div>
          </div>
          <div className="rounded-xl border border-accent-2/20 bg-accent-soft p-4 flex gap-3">
            <span className="size-10 rounded-lg bg-accent-warm/15 text-accent-warm grid place-items-center"><MedalIcon /></span>
            <div><h3 className="text-white font-semibold">Course Hero</h3><p className="text-sm text-muted-2">{done}/{courses.length} courses complete</p></div>
          </div>
        </aside>
      </div>
      {quiz ? (
        <div className="fixed inset-0 z-50 bg-black/70 grid place-items-center p-4">
          <div className="card max-w-xl w-full">
            <h2 className="text-white font-semibold mb-4">{quiz.title}</h2>
            {quiz.index >= quiz.questions.length ? (
              <>
                <p className="text-muted-2">Score: {quiz.score}/{quiz.questions.length}</p>
                <button className="mt-4 rounded-lg bg-accent text-bg px-4 py-2" onClick={() => setQuiz(null)}>Close</button>
              </>
            ) : (
              <>
                <p className="text-white mb-3">{quiz.questions[quiz.index].questionText}</p>
                {["A", "B", "C", "D"].map((o) => {
                  const q = quiz.questions[quiz.index];
                  const good = result?.correctOption === o;
                  const bad = result && answer === o && !good;
                  return (
                    <label key={o} className={`mb-2 block rounded-lg border border-border p-3 text-sm ${good ? "bg-green-500/20 text-green-200" : bad ? "bg-red-500/20 text-red-200" : "text-muted-2"}`}>
                      <input disabled={!!result} className="mr-2" type="radio" checked={answer === o} onChange={() => setAnswer(o)} />
                      {q[`option${o}`]}
                    </label>
                  );
                })}
                <div className="mt-4 flex justify-end gap-2">
                  <button className="rounded-lg border border-border px-4 py-2 text-muted-2" onClick={() => setQuiz(null)}>Close</button>
                  {!result ? (
                    <button disabled={!answer} className="rounded-lg bg-accent text-bg px-4 py-2 disabled:opacity-50" onClick={submitAnswer}>Submit</button>
                  ) : (
                    <button className="rounded-lg bg-accent text-bg px-4 py-2" onClick={() => { setQuiz((x) => ({ ...x, index: x.index + 1 })); setAnswer(""); setResult(null); }}>Next</button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
