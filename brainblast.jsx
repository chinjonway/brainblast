import React, { useState, useEffect, useRef } from "react";

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const NUM_QUESTIONS = 10;
const TIME_LIMIT = 15;
const MAX_SCORE = 1000;

const LANGUAGES = ["English", "Malay", "Chinese Simplified"];
const IOS_DISMISS_KEY = "bb-install-ios-dismissed";
const ANDROID_DISMISS_KEY = "bb-install-android-dismissed";

const ANS_COLORS = [
  { bg: "#e63946", light: "#ff6b6b", dark: "#c1121f", label: "A" },
  { bg: "#2ec4b6", light: "#3ddbd0", dark: "#1a9990", label: "B" },
  { bg: "#f4a261", light: "#ffb84d", dark: "#e07b30", label: "C" },
  { bg: "#a8dadc", light: "#c8f0f2", dark: "#6bbfc2", label: "D" },
];

// ─── SCORING ─────────────────────────────────────────────────────────────────
function calcScore(correct, timeTaken) {
  if (!correct) return 0;
  const speed = Math.max(0, 1 - timeTaken / TIME_LIMIT);
  return Math.round(MAX_SCORE * (0.7 + 0.3 * speed));
}

// ─── TOPIC POOL — sampled randomly each game to force fresh questions ──────────
const TOPIC_POOL = [
  // Science & STEM
  "human body parts and organs", "how plants grow and photosynthesis", "the water cycle and weather",
  "simple machines (lever, pulley, wheel)", "electricity and magnets", "states of matter (solid, liquid, gas)",
  "the food chain and ecosystems", "volcanoes and earthquakes", "space exploration and astronauts",
  "planets and moons of the solar system", "stars and constellations", "fossils and prehistoric life",
  "insects and their life cycles", "how computers and the internet work", "robots and artificial intelligence basics",
  "coding concepts (loops, conditions)", "forces like gravity and friction", "light and shadows",
  "sound and vibrations", "chemical reactions in everyday life",
  // Math
  "multiplication and division facts", "fractions and decimals", "geometry shapes and angles",
  "patterns and sequences", "measurement (length, weight, volume)", "time and calendars",
  "money and percentages", "probability and chance", "area and perimeter",
  // Animals & Nature
  "ocean animals and deep sea creatures", "rainforest animals", "animals of the arctic and antarctic",
  "endangered animals and conservation", "bird species and migration", "reptiles and amphibians",
  "animal adaptations and camouflage", "farm animals and their products", "wild cats and big cats",
  "nocturnal animals", "animal record holders (fastest, biggest, smallest)",
  // Geography & World
  "countries and their capitals", "world rivers and lakes", "mountain ranges of the world",
  "deserts of the world", "Asian countries and cultures", "flags of the world",
  "Malaysian states and landmarks", "famous world monuments", "climate zones",
  "island nations and archipelagos",
  // History & Culture
  "ancient civilizations (Egypt, Rome, China)", "famous inventors and their inventions",
  "Malaysian history and independence", "world wars (basic facts for kids)", "famous explorers",
  "traditional festivals around the world", "Olympic Games history", "traditional Malaysian games and food",
  "Chinese New Year traditions", "Hari Raya traditions",
  // Food & Health
  "vitamins and healthy food groups", "fruits and vegetables from around the world",
  "traditional Asian dishes", "how bread and cheese are made", "dental health and hygiene",
  "the importance of exercise and sleep", "first aid basics",
  // Arts, Music & Pop Culture
  "musical instruments and their sounds", "famous paintings and artists",
  "types of dance from around the world", "fairy tales and folklore characters",
  "popular children's book characters", "world record holders (Guinness)",
  // Sports
  "Olympic sports and rules", "football / soccer rules and famous players",
  "water sports and swimming", "martial arts from different countries",
  "famous Malaysian athletes",
];

function pickTopics(n) {
  const shuffled = TOPIC_POOL.slice().sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

// ─── AI QUESTION GENERATION ──────────────────────────────────────────────────
async function generateQuestions(seed) {
  const langAssignments = Array.from({ length: NUM_QUESTIONS }, () =>
    LANGUAGES[Math.floor(Math.random() * LANGUAGES.length)]
  );

  // Pick exactly NUM_QUESTIONS distinct topics — one per question
  const chosenTopics = pickTopics(NUM_QUESTIONS);

  const res = await fetch("/api/questions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ seed, langAssignments, chosenTopics, numQuestions: NUM_QUESTIONS }),
  });
  if (!res.ok) {
    let body = "";
    try { body = await res.text(); } catch {}
    throw new Error(`API ${res.status}: ${body.slice(0, 200)}`);
  }
  const data = await res.json();
  if (data.error) throw new Error(`API error: ${data.error}`);
  const qs = data.questions;
  if (!Array.isArray(qs) || qs.length === 0) throw new Error("No questions in response");
  return qs.map((q, i) => ({ ...q, id: i + 1 }));
}

function newSeed() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

// ─── RANK HELPER ─────────────────────────────────────────────────────────────
function getRank(pct) {
  if (pct === 100) return { label: "PERFECT!", emoji: "🏆", color: "#FFD700" };
  if (pct >= 80)   return { label: "BRILLIANT!", emoji: "⭐", color: "#f4a261" };
  if (pct >= 60)   return { label: "GREAT JOB!", emoji: "🎉", color: "#2ec4b6" };
  if (pct >= 40)   return { label: "GOOD TRY!", emoji: "👍", color: "#a8dadc" };
  return            { label: "KEEP LEARNING!", emoji: "📚", color: "#e63946" };
}

// ─── LANG BADGE ──────────────────────────────────────────────────────────────
function LangBadge({ lang }) {
  const map = {
    "English": { flag: "🇬🇧", short: "EN", color: "#3b82f6" },
    "Malay":   { flag: "🇲🇾", short: "MY", color: "#10b981" },
    "Chinese Simplified": { flag: "🇨🇳", short: "中文", color: "#ef4444" },
  };
  const info = map[lang] || { flag: "🌐", short: lang, color: "#888" };
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      background: info.color + "22", border: `1px solid ${info.color}55`,
      borderRadius: 8, padding: "3px 10px", fontSize: 12, fontWeight: 700,
      color: info.color,
    }}>
      <span>{info.flag}</span>
      <span>{info.short}</span>
    </div>
  );
}

// ─── STARS ───────────────────────────────────────────────────────────────────
function Stars({ count, total }) {
  const filled = Math.round((count / total) * 5);
  return (
    <div style={{ display: "flex", gap: 4, justifyContent: "center", margin: "8px 0" }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} style={{ fontSize: 22, filter: i < filled ? "none" : "grayscale(1) opacity(0.25)" }}>⭐</span>
      ))}
    </div>
  );
}

// ─── PROGRESS DOTS ───────────────────────────────────────────────────────────
function ProgressDots({ total, current, results }) {
  return (
    <div style={{ display: "flex", gap: 5, justifyContent: "center", flexWrap: "wrap" }}>
      {Array.from({ length: total }).map((_, i) => {
        const done = i < current;
        const correct = results[i]?.correct;
        return (
          <div key={i} style={{
            width: 10, height: 10, borderRadius: "50%",
            background: done ? (correct ? "#2ec4b6" : "#e63946") : i === current ? "#f4a261" : "#2a2a3a",
            border: i === current ? "2px solid #f4a261" : "2px solid transparent",
            transition: "all 0.3s",
            boxShadow: i === current ? "0 0 8px #f4a26188" : "none",
          }} />
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOME SCREEN
// ═══════════════════════════════════════════════════════════════════════════════
function HomeScreen({ onStart, loading, error }) {
  return (
    <div style={S.screen}>
      <div style={S.bgGrid} />
      <div style={S.card}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 54, marginBottom: 8, display: "block", animation: "float 2.5s ease-in-out infinite" }}>🧠</div>
          <h1 style={S.logoTitle}>BRAIN<span style={{ color: "#f4a261" }}>BLAST</span></h1>
          <p style={{ color: "#555", fontSize: 13, letterSpacing: 1, marginTop: 4 }}>Trivia for the Brilliant Mind</p>
        </div>

        <div style={S.divider} />

        {/* Info tiles */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 24 }}>
          {[
            { icon: "🔬", label: "STEM Focus", sub: "Ages 8–12" },
            { icon: "⏱", label: "15s Each", sub: "Speed bonus" },
            { icon: "🌏", label: "3 Languages", sub: "EN · MY · 中文" },
          ].map((t, i) => (
            <div key={i} style={S.infotile}>
              <span style={{ fontSize: 22 }}>{t.icon}</span>
              <span style={{ fontWeight: 800, fontSize: 12, lineHeight: 1.2 }}>{t.label}</span>
              <span style={{ color: "#555", fontSize: 10 }}>{t.sub}</span>
            </div>
          ))}
        </div>

        {error && (
          <div style={{ background: "#e6394622", border: "1px solid #e6394655", borderRadius: 10, padding: "10px 14px", marginBottom: 12 }}>
            <p style={{ color: "#e63946", textAlign: "center", fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Failed to generate questions</p>
            <p style={{ color: "#e6394699", textAlign: "center", fontSize: 11, wordBreak: "break-all" }}>{error}</p>
          </div>
        )}

        <button style={{ ...S.startBtn, opacity: loading ? 0.6 : 1 }} onClick={onStart} disabled={loading}>
          {loading
            ? <><span style={{ animation: "spin 1s linear infinite", display: "inline-block", marginRight: 8 }}>✦</span>Generating questions...</>
            : "🚀 Start Challenge"}
        </button>

        {loading && (
          <p style={{ textAlign: "center", color: "#555", fontSize: 12, marginTop: 10 }}>
            ✨ AI crafting fresh questions in 3 languages...
          </p>
        )}

        <p style={{ textAlign: "center", color: "#333", fontSize: 11, marginTop: 16 }}>
          Every game is unique — questions never repeat!
        </p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUESTION SCREEN
// ═══════════════════════════════════════════════════════════════════════════════
function QuestionScreen({ question, qIndex, total, results, onAnswer }) {
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const [picked, setPicked] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const startRef = useRef(Date.now());
  const timerRef = useRef(null);

  useEffect(() => {
    setPicked(null);
    setRevealed(false);
    setTimeLeft(TIME_LIMIT);
    startRef.current = Date.now();
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          doReveal(null, TIME_LIMIT);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [question?.id]);

  const doReveal = (idx, time) => {
    clearInterval(timerRef.current);
    setPicked(idx);
    setRevealed(true);
    const correct = idx === question.correct;
    const gained = calcScore(correct, time);
    setTimeout(() => onAnswer({ idx, timeTaken: time, correct, gained }), 1800);
  };

  const handlePick = idx => {
    if (picked !== null || revealed) return;
    const timeTaken = Math.min((Date.now() - startRef.current) / 1000, TIME_LIMIT);
    doReveal(idx, timeTaken);
  };

  if (!question) return null;

  const progress = (timeLeft / TIME_LIMIT) * 100;
  const timerColor = timeLeft > 8 ? "#2ec4b6" : timeLeft > 4 ? "#f4a261" : "#e63946";
  const correctCount = results.filter(r => r.correct).length;
  const accuracy = results.length > 0 ? Math.round((correctCount / results.length) * 100) : null;

  return (
    <div style={S.screen}>
      <div style={S.bgGrid} />
      <div style={S.gameWrap}>

        {/* Top bar */}
        <div style={S.topBar}>
          <div style={S.topStat}>
            <span style={S.statLabel}>QUESTION</span>
            <span style={S.statVal}>{qIndex + 1}<span style={{ color: "#333", fontSize: 13 }}>/{total}</span></span>
          </div>
          <svg width="60" height="60" viewBox="0 0 60 60">
            <circle cx="30" cy="30" r="24" fill="#111120" stroke="#2a2a3a" strokeWidth="4" />
            <circle cx="30" cy="30" r="24" fill="none" stroke={timerColor} strokeWidth="4"
              strokeDasharray={`${2 * Math.PI * 24}`}
              strokeDashoffset={`${2 * Math.PI * 24 * (1 - progress / 100)}`}
              strokeLinecap="round"
              style={{ transition: "stroke-dashoffset 1s linear, stroke 0.3s" }}
              transform="rotate(-90 30 30)" />
            <text x="30" y="36" textAnchor="middle" fill="#fff" fontSize="17"
              style={{ fontFamily: "'Bebas Neue', cursive" }}>{timeLeft}</text>
          </svg>
          <div style={S.topStat}>
            <span style={S.statLabel}>ACCURACY</span>
            <span style={S.statVal}>{accuracy !== null ? `${accuracy}%` : "—"}</span>
          </div>
        </div>

        {/* Progress dots */}
        <div style={{ marginBottom: 14 }}>
          <ProgressDots total={total} current={qIndex} results={results} />
        </div>

        {/* Question card */}
        <div style={S.questionCard}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            {question.lang && <LangBadge lang={question.lang} />}
            <div style={{ fontSize: 36, animation: "float 3s ease-in-out infinite" }}>{question.emoji}</div>
          </div>
          <p style={S.qText}>{question.question}</p>
        </div>

        {/* Timer bar */}
        <div style={S.timerTrack}>
          <div style={{ ...S.timerFill, width: `${progress}%`, background: `linear-gradient(90deg,${timerColor},${timerColor}88)` }} />
        </div>

        {/* Answers */}
        <div style={S.ansGrid}>
          {question.answers.map((ans, i) => {
            const col = ANS_COLORS[i];
            const isCorrect = i === question.correct;
            const isWrong = revealed && i === picked && !isCorrect;
            const showCorrect = revealed && isCorrect;
            const isPicked = i === picked;
            return (
              <button key={i}
                style={{
                  ...S.ansBtn,
                  background: showCorrect ? col.bg : isWrong ? "#2a2a3a" : revealed && !isPicked ? "#111120" : "#1e1e35",
                  border: showCorrect ? `2px solid ${col.bg}` : isPicked && !revealed ? `2px solid ${col.bg}` : "2px solid #2a2a3a",
                  opacity: revealed && !isCorrect && !isPicked ? 0.3 : 1,
                  transform: showCorrect ? "scale(1.02)" : "scale(1)",
                  boxShadow: showCorrect ? `0 0 20px ${col.bg}66` : "none",
                  cursor: picked === null ? "pointer" : "default",
                }}
                onClick={() => handlePick(i)}
                disabled={picked !== null}>
                <div style={{ ...S.ansLetter, background: showCorrect ? col.dark : col.bg + "33", color: showCorrect ? "#fff" : col.bg }}>
                  {col.label}
                </div>
                <span style={{ flex: 1, textAlign: "left", lineHeight: 1.35 }}>{ans}</span>
                {showCorrect && <span style={{ fontSize: 18 }}>✓</span>}
                {isWrong && <span style={{ fontSize: 18, color: "#e63946" }}>✗</span>}
              </button>
            );
          })}
        </div>

        {/* Feedback */}
        {revealed && (
          <div style={{
            ...S.feedback,
            background: picked === question.correct ? "#2ec4b622" : "#e6394622",
            border: `1px solid ${picked === question.correct ? "#2ec4b6" : "#e63946"}`,
            color: picked === question.correct ? "#2ec4b6" : "#e63946",
          }}>
            {picked === null
              ? "⏰ Time's up! Correct answer highlighted."
              : picked === question.correct
                ? `🎉 Correct! +${calcScore(true, Math.min((Date.now() - startRef.current) / 1000, TIME_LIMIT))} pts`
                : `❌ Wrong! Answer was ${ANS_COLORS[question.correct].label}: ${question.answers[question.correct]}`}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// RESULTS SCREEN
// ═══════════════════════════════════════════════════════════════════════════════
function ResultsScreen({ questions, results, onPlayAgain, loading }) {
  const totalScore = results.reduce((s, r) => s + (r.gained || 0), 0);
  const correct = results.filter(r => r.correct).length;
  const pct = Math.round((correct / NUM_QUESTIONS) * 100);
  const rank = getRank(pct);
  const avgTime = results.reduce((s, r) => s + (r.timeTaken || 0), 0) / NUM_QUESTIONS;

  // Language stats
  const langStats = {};
  LANGUAGES.forEach(l => { langStats[l] = { correct: 0, total: 0 }; });
  questions.forEach((q, i) => {
    const l = q.lang || "English";
    if (langStats[l]) {
      langStats[l].total++;
      if (results[i]?.correct) langStats[l].correct++;
    }
  });

  return (
    <div style={S.screen}>
      <div style={S.bgGrid} />
      <div style={{ ...S.card, maxWidth: 500 }}>

        {/* Rank */}
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 52, marginBottom: 8, animation: "float 2s ease-in-out infinite", display: "block" }}>{rank.emoji}</div>
          <h2 style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 38, color: rank.color, letterSpacing: 3, marginBottom: 4 }}>{rank.label}</h2>
          <Stars count={correct} total={NUM_QUESTIONS} />
        </div>

        {/* Score stats */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
          {[
            { val: totalScore.toLocaleString(), label: "TOTAL SCORE", color: "#f4a261" },
            { val: `${correct}/${NUM_QUESTIONS}`, label: "CORRECT", color: "#2ec4b6" },
            { val: `${pct}%`, label: "ACCURACY", color: "#a8dadc" },
            { val: `${avgTime.toFixed(1)}s`, label: "AVG TIME", color: "#e63946" },
          ].map((s, i) => (
            <div key={i} style={S.statBox}>
              <span style={{ fontSize: 30, fontFamily: "'Bebas Neue', cursive", color: s.color }}>{s.val}</span>
              <span style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 11, letterSpacing: 1.5, color: "#444" }}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* Language breakdown */}
        <div style={S.divider} />
        <p style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 13, letterSpacing: 2, color: "#444", marginBottom: 10 }}>BY LANGUAGE</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
          {LANGUAGES.map(lang => {
            const stat = langStats[lang];
            if (!stat || stat.total === 0) return null;
            const langPct = Math.round((stat.correct / stat.total) * 100);
            const map = { "English": "🇬🇧", "Malay": "🇲🇾", "Chinese Simplified": "🇨🇳" };
            return (
              <div key={lang} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 18 }}>{map[lang]}</span>
                <span style={{ fontSize: 13, color: "#aaa", width: 130 }}>{lang}</span>
                <div style={{ flex: 1, height: 6, background: "#1a1a2e", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${langPct}%`, background: "linear-gradient(90deg,#2ec4b6,#f4a261)", borderRadius: 3, transition: "width 0.6s ease" }} />
                </div>
                <span style={{ fontSize: 12, color: "#666", width: 50, textAlign: "right" }}>{stat.correct}/{stat.total}</span>
              </div>
            );
          })}
        </div>

        {/* Question breakdown */}
        <div style={S.divider} />
        <p style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 13, letterSpacing: 2, color: "#444", marginBottom: 10 }}>QUESTION BREAKDOWN</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 20, maxHeight: 260, overflowY: "auto" }}>
          {questions.map((q, i) => {
            const r = results[i];
            const map = { "English": "🇬🇧", "Malay": "🇲🇾", "Chinese Simplified": "🇨🇳" };
            return (
              <div key={i} style={{
                display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 12px",
                background: r?.correct ? "#2ec4b611" : "#e6394611",
                borderRadius: 12,
                border: `1px solid ${r?.correct ? "#2ec4b633" : "#e6394633"}`,
              }}>
                <span style={{ fontSize: 16, marginTop: 1 }}>{q.emoji}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                    <span style={{ fontSize: 13 }}>{map[q.lang] || "🌐"}</span>
                    <p style={{ fontSize: 12, color: "#ccc", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{q.question}</p>
                  </div>
                  <p style={{ fontSize: 11, color: r?.correct ? "#2ec4b6" : "#e63946" }}>
                    {r?.correct
                      ? `✓ Correct · ${r.timeTaken?.toFixed(1)}s · +${r.gained} pts`
                      : `✗ Answer: ${q.answers[q.correct]}`}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <button style={{ ...S.startBtn, opacity: loading ? 0.6 : 1 }} onClick={onPlayAgain} disabled={loading}>
          {loading
            ? <><span style={{ animation: "spin 1s linear infinite", display: "inline-block", marginRight: 8 }}>✦</span>Generating new questions...</>
            : "🔄 Play Again — New Questions"}
        </button>
        {loading && (
          <p style={{ textAlign: "center", color: "#555", fontSize: 12, marginTop: 8 }}>
            ✨ Fresh set coming up...
          </p>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PWA INSTALL PROMPT
// ═══════════════════════════════════════════════════════════════════════════════
function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showAndroidPrompt, setShowAndroidPrompt] = useState(false);
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);

  useEffect(() => {
    const ua = window.navigator.userAgent || "";
    const isIOS = /iphone|ipad|ipod/i.test(ua);
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;

    const isDismissed = (key) => {
      try {
        return window.localStorage.getItem(key) === "1";
      } catch {
        return false;
      }
    };

    if (isIOS && !isStandalone && !isDismissed(IOS_DISMISS_KEY)) {
      setShowIOSPrompt(true);
    }

    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setDeferredPrompt(event);
      if (!isDismissed(ANDROID_DISMISS_KEY)) {
        setShowAndroidPrompt(true);
      }
    };

    const handleAppInstalled = () => {
      setShowAndroidPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const dismissPrompt = (storageKey, setter) => {
    try {
      window.localStorage.setItem(storageKey, "1");
    } catch {}
    setter(false);
  };

  const installOnAndroid = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setShowAndroidPrompt(false);
    if (choice?.outcome === "dismissed") {
      try {
        window.localStorage.setItem(ANDROID_DISMISS_KEY, "1");
      } catch {}
    }
  };

  if (!showAndroidPrompt && !showIOSPrompt) return null;

  return (
    <div style={S.installPromptWrap}>
      {showAndroidPrompt && (
        <div style={S.installPromptCard}>
          <p style={S.installPromptTitle}>Install BrainBlast</p>
          <p style={S.installPromptText}>Add the app to your home screen for full-screen gameplay and faster launch.</p>
          <div style={S.installActions}>
            <button style={S.installSecondaryBtn} onClick={() => dismissPrompt(ANDROID_DISMISS_KEY, setShowAndroidPrompt)}>Later</button>
            <button style={S.installPrimaryBtn} onClick={installOnAndroid}>Install</button>
          </div>
        </div>
      )}

      {!showAndroidPrompt && showIOSPrompt && (
        <div style={S.installPromptCard}>
          <p style={S.installPromptTitle}>Install on iPhone/iPad</p>
          <p style={S.installPromptText}>Tap <strong>Share</strong> then choose <strong>Add to Home Screen</strong> to install BrainBlast.</p>
          <div style={S.installActions}>
            <button style={S.installPrimaryBtn} onClick={() => dismissPrompt(IOS_DISMISS_KEY, setShowIOSPrompt)}>Got it</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════
export default function BrainBlast() {
  const [screen, setScreen] = useState("home");
  const [questions, setQuestions] = useState([]);
  const [qIndex, setQIndex] = useState(0);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const startGame = async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = await generateQuestions(newSeed());
      setQuestions(qs);
      setQIndex(0);
      setResults([]);
      setScreen("question");
    } catch (e) {
      setError(e.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (result) => {
    const newResults = [...results, result];
    setResults(newResults);
    if (qIndex + 1 >= NUM_QUESTIONS) {
      setScreen("results");
    } else {
      setQIndex(i => i + 1);
    }
  };

  const handlePlayAgain = async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = await generateQuestions(newSeed());
      setQuestions(qs);
      setQIndex(0);
      setResults([]);
      setScreen("question");
    } catch (e) {
      setError(e.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={S.root}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;700;900&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        body { background:#0d0d1a; }
        @keyframes float   { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes spin    { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes fadeUp  { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        ::-webkit-scrollbar { width:4px; }
        ::-webkit-scrollbar-track { background:#1a1a2e; }
        ::-webkit-scrollbar-thumb { background:#2a2a3a; border-radius:2px; }
      `}</style>

      {screen === "home"     && <HomeScreen onStart={startGame} loading={loading} error={error} />}
      {screen === "question" && (
        <QuestionScreen
          key={qIndex}
          question={questions[qIndex]}
          qIndex={qIndex}
          total={NUM_QUESTIONS}
          results={results}
          onAnswer={handleAnswer}
        />
      )}
      {screen === "results"  && (
        <ResultsScreen
          questions={questions}
          results={results}
          onPlayAgain={handlePlayAgain}
          loading={loading}
        />
      )}
      <InstallPrompt />
    </div>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const S = {
  root: { minHeight:"100vh", background:"#0d0d1a", fontFamily:"'DM Sans',sans-serif", color:"#fff", overflowX:"hidden" },
  screen: { minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", padding:"20px 16px", position:"relative" },
  bgGrid: { position:"fixed", inset:0, backgroundImage:"linear-gradient(#ffffff07 1px,transparent 1px),linear-gradient(90deg,#ffffff07 1px,transparent 1px)", backgroundSize:"40px 40px", pointerEvents:"none", zIndex:0 },
  card: { position:"relative", zIndex:1, background:"#111120", borderRadius:20, padding:"32px 26px", width:"100%", maxWidth:440, border:"1px solid #2a2a3a", boxShadow:"0 32px 80px #00000099", animation:"fadeUp 0.4s ease" },
  logoTitle: { fontFamily:"'Bebas Neue',cursive", fontSize:44, letterSpacing:4, color:"#fff", lineHeight:1 },
  divider: { height:1, background:"linear-gradient(90deg,transparent,#2a2a3a,transparent)", margin:"18px 0" },
  infotile: { display:"flex", flexDirection:"column", alignItems:"center", gap:4, background:"#0d0d1a", borderRadius:12, padding:"12px 8px", border:"1px solid #2a2a3a", textAlign:"center" },
  startBtn: { width:"100%", padding:"16px", borderRadius:14, border:"none", background:"linear-gradient(135deg,#f4a261,#e63946)", color:"#fff", fontSize:17, fontWeight:900, fontFamily:"'Bebas Neue',cursive", letterSpacing:2, cursor:"pointer", boxShadow:"0 8px 28px #e6394444", transition:"opacity 0.2s", display:"flex", alignItems:"center", justifyContent:"center" },
  gameWrap: { position:"relative", zIndex:1, width:"100%", maxWidth:540, animation:"fadeUp 0.3s ease" },
  topBar: { display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14, background:"#111120", borderRadius:16, padding:"10px 18px", border:"1px solid #2a2a3a" },
  topStat: { display:"flex", flexDirection:"column", alignItems:"center", minWidth:70 },
  statLabel: { fontSize:10, color:"#444", letterSpacing:1.5, fontFamily:"'Bebas Neue',cursive" },
  statVal: { fontSize:22, fontFamily:"'Bebas Neue',cursive", letterSpacing:1, color:"#fff" },
  questionCard: { background:"#111120", borderRadius:20, padding:"20px 20px", border:"1px solid #2a2a3a", marginBottom:10, marginTop:10 },
  qText: { fontSize:18, fontWeight:700, lineHeight:1.5, color:"#eee" },
  timerTrack: { height:4, background:"#1a1a2e", borderRadius:2, marginBottom:12, overflow:"hidden" },
  timerFill: { height:"100%", borderRadius:2, transition:"width 1s linear" },
  ansGrid: { display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 },
  ansBtn: { display:"flex", alignItems:"center", gap:10, padding:"13px 13px", borderRadius:14, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", fontWeight:700, fontSize:14, color:"#fff", transition:"all 0.2s", textAlign:"left" },
  ansLetter: { width:28, height:28, borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Bebas Neue',cursive", fontSize:16, flexShrink:0 },
  feedback: { padding:"11px 14px", borderRadius:12, fontSize:13, fontWeight:700, textAlign:"center", animation:"fadeUp 0.3s ease" },
  statBox: { display:"flex", flexDirection:"column", alignItems:"center", background:"#0d0d1a", borderRadius:14, padding:"14px 10px", border:"1px solid #2a2a3a", gap:4 },
  installPromptWrap: { position:"fixed", left:12, right:12, bottom:12, zIndex:20, display:"flex", justifyContent:"center", pointerEvents:"none" },
  installPromptCard: { width:"100%", maxWidth:500, background:"#111120ee", border:"1px solid #2a2a3a", boxShadow:"0 24px 64px #000000aa", borderRadius:14, padding:"12px 14px", pointerEvents:"auto", backdropFilter:"blur(6px)" },
  installPromptTitle: { fontSize:15, fontWeight:800, color:"#f4f6ff", marginBottom:4 },
  installPromptText: { fontSize:12, lineHeight:1.4, color:"#aeb8e6", marginBottom:10 },
  installActions: { display:"flex", gap:8, justifyContent:"flex-end" },
  installPrimaryBtn: { border:"none", background:"linear-gradient(135deg,#f4a261,#e63946)", color:"#fff", borderRadius:10, padding:"8px 14px", fontWeight:800, fontSize:12, cursor:"pointer" },
  installSecondaryBtn: { border:"1px solid #39457b", background:"#1a2145", color:"#d3dbff", borderRadius:10, padding:"8px 14px", fontWeight:800, fontSize:12, cursor:"pointer" },
};
