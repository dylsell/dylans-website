"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { createGame, moveKeeper, startGame, stepGame, TOTAL_SHOTS, WIN_SAVES, WORLD } from "./lib/game";
import type { Difficulty, GameEvent } from "./lib/game";
import { createStadiumRenderer } from "./lib/stadium";
import { SoccerAudio } from "./lib/audio";
import { DEFAULT_PROFILE, parseProfile, PROFILE_KEY } from "./lib/profile";
import type { Profile } from "./lib/profile";
import styles from "./soccer.module.css";

function BallIcon({ size = 24 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><circle cx="16" cy="16" r="13" /><path d="m16 10 6 4-2 7h-8l-2-7 6-4Zm0 0V3m6 11 6-3m-8 10 4 6m-12-6-4 6m2-13-6-3" /></svg>;
}
function GloveIcon() {
  return <svg width="28" height="28" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10 27 6 19l-3-5c-1-3 2-4 4-2l3 3V7c0-3 4-3 4 0V5c0-3 4-3 4 0v2c0-3 4-3 4 0v3c0-3 4-3 4 0v9l-4 8H10Z" /><path d="M10 23h13M14 8v6m4-7v7m4-4v5" /></svg>;
}
function CupIcon() {
  return <svg width="28" height="28" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true"><path d="M9 4h14v9a7 7 0 0 1-14 0V4ZM9 7H4v4c0 4 3 6 6 6m13-10h5v4c0 4-3 6-6 6M16 20v7m-6 1h12" /></svg>;
}
function Flag({ team }: { team: "usa" | "netherlands" }) {
  return <span aria-hidden="true" className={`${styles.flag} ${team === "usa" ? styles.usaFlag : styles.dutchFlag}`}>{team === "usa" && <span>✦</span>}</span>;
}

const movementKeys = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "KeyW", "KeyA", "KeyS", "KeyD"]);
const cheers = ["Great hands, Bradley!", "That's your goal, Captain!", "USA's number one strikes again!", "What a save, Bradley!"];

export default function SoccerGame() {
  const game = useRef(createGame());
  const [view, setView] = useState(() => createGame());
  const [profile, setProfile] = useState<Profile>({ ...DEFAULT_PROFILE });
  const profileRef = useRef<Profile>({ ...DEFAULT_PROFILE });
  const [message, setMessage] = useState("The gloves are yours, Bradley. Let's make some saves.");
  const [storageAvailable, setStorageAvailable] = useState(true);
  const [canvasAvailable, setCanvasAvailable] = useState(true);
  const [fullScreen, setFullScreen] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  const arena = useRef<HTMLDivElement>(null);
  const startButton = useRef<HTMLButtonElement>(null);
  const resumeButton = useRef<HTMLButtonElement>(null);
  const replayButton = useRef<HTMLButtonElement>(null);
  const audio = useRef<SoccerAudio | null>(null);
  const keys = useRef(new Set<string>());
  const activePointer = useRef<number | null>(null);
  const reducedMotion = useRef(false);
  const refresh = useCallback(() => setView({ ...game.current, results: [...game.current.results] }), []);

  const saveProfile = useCallback((patch: Partial<Profile>) => {
    const next = { ...profileRef.current, ...patch };
    profileRef.current = next;
    setProfile(next);
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify(next)); }
    catch { setStorageAvailable(false); }
  }, []);

  const pause = useCallback(() => {
    if (game.current.phase !== "playing") return;
    game.current.phase = "paused";
    keys.current.clear();
    activePointer.current = null;
    audio.current?.stop();
    refresh();
  }, [refresh]);

  useEffect(() => {
    const surface = canvas.current;
    const ctx = surface?.getContext("2d", { alpha: false });
    if (!surface || !ctx) {
      const frame = requestAnimationFrame(() => setCanvasAvailable(false));
      return () => cancelAnimationFrame(frame);
    }
    const sound = new SoccerAudio();
    audio.current = sound;
    let loaded = { ...DEFAULT_PROFILE };
    let storageWorks = true;
    try { loaded = parseProfile(localStorage.getItem(PROFILE_KEY)); }
    catch { storageWorks = false; }
    profileRef.current = loaded;
    sound.setMuted(loaded.muted);
    const draw = createStadiumRenderer();
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedMotion.current = media.matches;
    const motionChange = () => { reducedMotion.current = media.matches; };
    media.addEventListener("change", motionChange);
    let needsPaint = true;
    const resize = () => {
      const width = surface.getBoundingClientRect().width;
      // Bound the drawing work on Kindle Fire and other small tablets.
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      surface.width = Math.max(1, Math.round(width * ratio));
      surface.height = Math.max(1, Math.round(width * WORLD.height / WORLD.width * ratio));
      needsPaint = true;
    };
    const observer = new ResizeObserver(resize);
    observer.observe(surface);
    resize();
    let animation = 0;
    let lastTime = 0;
    let lastHud = 0;
    let firstFrame = true;
    let sceneryTime = 0;
    let lastDrawnPhase = game.current.phase;
    const handleEvent = (event: GameEvent) => {
      const g = game.current;
      if (event.type === "kick") {
        sound.play("kick");
        setMessage("Here it comes! Move your gloves to the ball.");
      } else if (event.type === "save") {
        sound.play("save");
        setMessage(g.streak >= 3 ? `${g.streak} saves in a row! You're a wall, Bradley.` : cheers[(g.saves - 1) % cheers.length]);
        saveProfile({ careerSaves: profileRef.current.careerSaves + 1, bestStreak: Math.max(profileRef.current.bestStreak, g.bestStreak) });
      } else if (event.type === "goal") {
        sound.play("goal");
        setMessage("Next one's yours, Bradley. Watch where the ball is going!");
      } else if (event.type === "finish") {
        const won = g.saves >= WIN_SAVES;
        sound.play(won ? "win" : "save");
        saveProfile({ matches: profileRef.current.matches + 1, cups: profileRef.current.cups + Number(won), bestScore: Math.max(profileRef.current.bestScore, g.saves) });
        setMessage(won ? "You did it, Bradley! The Keeper Cup is yours." : "Great practice, Bradley. Every shot helps you get better.");
      }
      refresh();
    };
    const animate = (now: number) => {
      const dt = lastTime ? Math.min((now - lastTime) / 1000, 0.05) : 0;
      lastTime = now;
      if (firstFrame) {
        setProfile(loaded);
        setStorageAvailable(storageWorks);
        firstFrame = false;
      }
      const g = game.current;
      if (!document.hidden) {
        if (g.phase === "playing") {
          sceneryTime += dt;
          const dx = Number(keys.current.has("ArrowRight") || keys.current.has("KeyD")) - Number(keys.current.has("ArrowLeft") || keys.current.has("KeyA"));
          const dy = Number(keys.current.has("ArrowDown") || keys.current.has("KeyS")) - Number(keys.current.has("ArrowUp") || keys.current.has("KeyW"));
          if (dx || dy) {
            const length = Math.hypot(dx, dy);
            moveKeeper(g, g.keeperX + dx / length * 720 * dt, g.keeperY + dy / length * 720 * dt);
          }
          stepGame(g, dt).forEach(handleEvent);
        }
        if (g.phase === "playing" || needsPaint || g.phase !== lastDrawnPhase) {
          ctx.setTransform(surface.width / WORLD.width, 0, 0, surface.height / WORLD.height, 0, 0);
          draw(ctx, g, sceneryTime, reducedMotion.current);
          needsPaint = false;
          lastDrawnPhase = g.phase;
        }
        if (g.phase === "playing" && now - lastHud > 100) { refresh(); lastHud = now; }
      }
      animation = requestAnimationFrame(animate);
    };
    animation = requestAnimationFrame(animate);
    const visibilityChange = () => { if (document.hidden) pause(); lastTime = 0; };
    const fullscreenChange = () => { setFullScreen(document.fullscreenElement === arena.current); resize(); };
    document.addEventListener("visibilitychange", visibilityChange);
    document.addEventListener("fullscreenchange", fullscreenChange);
    window.addEventListener("blur", pause);
    window.addEventListener("pagehide", pause);
    // Rotation pauses a live shot so resizing cannot cost Bradley a save.
    window.addEventListener("orientationchange", pause);
    return () => {
      cancelAnimationFrame(animation);
      observer.disconnect();
      media.removeEventListener("change", motionChange);
      document.removeEventListener("visibilitychange", visibilityChange);
      document.removeEventListener("fullscreenchange", fullscreenChange);
      window.removeEventListener("blur", pause);
      window.removeEventListener("pagehide", pause);
      window.removeEventListener("orientationchange", pause);
      sound.dispose();
      audio.current = null;
    };
  }, [pause, refresh, saveProfile]);

  useEffect(() => {
    const keyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest("input, textarea, select") || target.isContentEditable) return;
      if (game.current.phase === "playing" && (event.code === "Escape" || event.code === "KeyP")) { event.preventDefault(); pause(); return; }
      if (game.current.phase !== "playing" || target !== canvas.current || !movementKeys.has(event.code)) return;
      event.preventDefault();
      keys.current.add(event.code);
    };
    const keyUp = (event: KeyboardEvent) => { keys.current.delete(event.code); };
    window.addEventListener("keydown", keyDown);
    window.addEventListener("keyup", keyUp);
    return () => { window.removeEventListener("keydown", keyDown); window.removeEventListener("keyup", keyUp); };
  }, [pause]);

  useEffect(() => {
    if (view.phase === "paused") resumeButton.current?.focus({ preventScroll: true });
    if (view.phase === "finished") replayButton.current?.focus({ preventScroll: true });
  }, [view.phase]);

  function start() {
    game.current = createGame(game.current.difficulty);
    startGame(game.current);
    keys.current.clear();
    activePointer.current = null;
    audio.current?.unlock();
    audio.current?.play("start");
    setMessage("Eyes on the ball, Bradley. Slide your gloves to catch it!");
    refresh();
    canvas.current?.focus({ preventScroll: true });
    const bounds = arena.current?.getBoundingClientRect();
    if (bounds && (bounds.bottom > window.innerHeight || bounds.top < 0)) {
      arena.current?.scrollIntoView({ block: "start", behavior: "instant" });
    }
  }
  function resume() {
    if (game.current.phase !== "paused") return;
    keys.current.clear();
    game.current.phase = "playing";
    audio.current?.unlock();
    refresh();
    canvas.current?.focus({ preventScroll: true });
  }
  function chooseDifficulty(difficulty: Difficulty) {
    if (game.current.phase !== "ready" && game.current.phase !== "finished") return;
    game.current.difficulty = difficulty;
    refresh();
  }
  function pointGloves(event: React.PointerEvent<HTMLCanvasElement>) {
    if (game.current.phase !== "playing") return;
    if (event.pointerType !== "mouse" && activePointer.current !== event.pointerId) return;
    if (event.pointerType === "mouse" && activePointer.current !== null && activePointer.current !== event.pointerId) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    moveKeeper(game.current, (event.clientX - bounds.left) / bounds.width * WORLD.width, (event.clientY - bounds.top) / bounds.height * WORLD.height);
  }
  function pointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    if (game.current.phase !== "playing" || activePointer.current !== null || event.button !== 0) return;
    event.preventDefault();
    activePointer.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.focus({ preventScroll: true });
    pointGloves(event);
    audio.current?.unlock();
  }
  function releasePointer(event: React.PointerEvent<HTMLCanvasElement>) {
    if (activePointer.current === event.pointerId) activePointer.current = null;
  }
  function toggleSound() {
    const muted = !profileRef.current.muted;
    audio.current?.setMuted(muted);
    if (!muted) audio.current?.unlock();
    saveProfile({ muted });
  }
  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (arena.current?.requestFullscreen) await arena.current.requestFullscreen();
      else setMessage("Turn your tablet sideways for a bigger pitch.");
    } catch { setMessage("Turn your tablet sideways for a bigger pitch."); }
  }

  const playing = view.phase === "playing";
  const canChoose = view.phase === "ready" || view.phase === "finished";
  const won = view.saves >= WIN_SAVES;
  const remaining = TOTAL_SHOTS - view.results.length;
  const matchStage = view.shotIndex < 3 ? "Find your feet" : view.shotIndex < 7 ? "You've got this" : "Bring it home";
  const status = view.stage === "windup" ? "Get ready…" : view.stage === "flight" ? "Catch the ball!" : view.lastResult === "save" ? "SAVED!" : "Next one's yours!";

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.topbar}>
          <Link href="/personal/kids" className={styles.back}>← <span>Bradley’s games</span></Link>
          <span className={styles.club}><BallIcon size={20} /> THE BRADLEY SPORTS CLUB</span>
          <button className={styles.soundButton} onClick={toggleSound} aria-pressed={!profile.muted} aria-label={profile.muted ? "Turn sound on" : "Mute sound"}>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M11 4 5 9H2v6h3l6 5V4Z" />{profile.muted ? <path d="m16 9 6 6m0-6-6 6" /> : <path d="M15 8a6 6 0 0 1 0 8m3-12a11 11 0 0 1 0 16" />}</svg>
            <span>Sound {profile.muted ? "off" : "on"}</span>
          </button>
        </header>

        <div className={styles.heading}>
          <div><p className={styles.eyebrow}><span /> USA’S NUMBER ONE</p><h1>Bradley’s <em>Keeper Cup.</em></h1></div>
          <div className={styles.matchTicket}><Flag team="usa" /><span>USA <small>vs</small> NETHERLANDS</span><Flag team="netherlands" /></div>
        </div>

        <div className={styles.layout}>
          <section className={styles.gameColumn} aria-label="Soccer goalie game">
            <div className={styles.matchHeader}><span><i /> MATCH DAY · BRADLEY STADIUM</span><span>10 SHOTS. YOUR GOAL.</span></div>
            <div className={styles.arena} ref={arena}>
              <div className={styles.scoreboard}>
                <div className={styles.team}><Flag team="usa" /><div><small>BRADLEY IN GOAL</small><strong>USA</strong></div></div>
                <div className={styles.scoreStat}><strong>{view.saves}</strong><span>SAVES</span></div>
                <div className={styles.scoreDivider} />
                <div className={`${styles.scoreStat} ${styles.dutchScore}`}><strong>{view.goals}</strong><span>GOALS</span></div>
                <div className={`${styles.team} ${styles.awayTeam}`}><div><small>THE CHALLENGERS</small><strong>NETHERLANDS</strong></div><Flag team="netherlands" /></div>
                <div className={styles.arenaTools}>
                  <button onClick={pause} disabled={!playing} aria-label="Pause game"><svg width="17" height="19" viewBox="0 0 17 19" fill="currentColor" aria-hidden="true"><path d="M3 2h4v15H3zm7 0h4v15h-4z" /></svg></button>
                  <button onClick={toggleFullscreen} aria-label={fullScreen ? "Exit fullscreen" : "Enter fullscreen"}><svg width="19" height="19" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.6" fill="none" aria-hidden="true"><path d="M9 3H3v6m12-6h6v6M3 15v6h6m12-6v6h-6" /></svg></button>
                </div>
              </div>

              <div className={`${styles.pitch} ${view.phase === "finished" || view.phase === "paused" ? styles.resultPitch : ""}`}>
                <canvas ref={canvas} className={styles.canvas} width={960} height={600} tabIndex={playing ? 0 : -1} aria-label="Bradley's goalkeeper pitch. Drag or tap to move the gloves. On a computer, move your mouse or use the arrow keys." aria-describedby="soccer-controls" onPointerDown={pointerDown} onPointerMove={pointGloves} onPointerUp={releasePointer} onPointerCancel={(event) => { releasePointer(event); pause(); }} onLostPointerCapture={releasePointer} onContextMenu={(event) => event.preventDefault()} />
                {playing && <>
                  <div className={styles.shotTag}>SHOT {Math.min(view.shotIndex + 1, TOTAL_SHOTS)} <span>/ {TOTAL_SHOTS}</span></div>
                  <div className={`${styles.pitchCue} ${view.stage === "result" ? view.lastResult === "save" ? styles.saveCue : styles.goalCue : ""}`}><span>{view.stage === "result" ? view.lastResult === "save" && view.streak > 1 ? `${view.streak} IN A ROW` : "KEEP GOING, CAPTAIN" : matchStage}</span><strong>{status}</strong></div>
                  {view.stage === "windup" && <div className={styles.windupTrack}><span style={{ transform: `scaleX(${Math.max(0, 1 - view.elapsed / view.windupDuration)})` }} /></div>}
                </>}
                {view.phase === "ready" && <div className={`${styles.overlay} ${styles.lobby}`}>
                  <div className={styles.intro}>
                    <div className={styles.callup}><span>★</span> YOUR COUNTRY IS CALLING</div>
                    <h2>Big gloves.<br />Bigger <em>saves.</em></h2>
                    <p>The Netherlands is taking aim.<br />Bradley, you’re the USA’s last line of defense.</p>
                    <button ref={startButton} className={styles.primary} onClick={start} disabled={!canvasAvailable}>Let’s go, Bradley <span>→</span></button>
                    <div className={styles.introHint}><GloveIcon /><span>Move your gloves. Catch the ball.<br /><strong>Save {WIN_SAVES} of {TOTAL_SHOTS} to lift the cup.</strong></span></div>
                  </div>
                  <div className={styles.heroNumber} aria-hidden="true"><span>BRADLEY</span><strong>01</strong><span>UNITED STATES</span></div>
                </div>}
                {view.phase === "paused" && <div className={styles.overlay}><div className={styles.resultCard}>
                  <span className={styles.resultIcon}><GloveIcon /></span><p className={styles.eyebrow}>A QUICK WATER BREAK</p><h2>Your goal is waiting.</h2><p>Take your time, Bradley.<br />We’ll pick up right where you left off.</p>
                  <button ref={resumeButton} className={styles.primary} onClick={resume}>Back in goal <span>→</span></button>
                </div></div>}
                {view.phase === "finished" && <div className={styles.overlay}><div className={styles.resultCard}>
                  <span className={`${styles.resultIcon} ${won ? styles.goldIcon : ""}`}>{won ? <CupIcon /> : <GloveIcon />}</span>
                  <p className={styles.eyebrow}>{won ? "THE KEEPER CUP IS YOURS" : "ANOTHER MATCH. EVEN MORE PRACTICE."}</p>
                  <h2>{view.saves === TOTAL_SHOTS ? "A perfect ten, Bradley!" : won ? "USA’s hero? Bradley." : "Good hustle, Bradley!"}</h2>
                  <p>{won ? "Big saves. Brave hands. A whole country cheering." : `You saved ${view.saves} ${view.saves === 1 ? "shot" : "shots"}. Keep your eyes on the ball and try again!`}</p>
                  <div className={styles.resultStats}><div><strong>{view.saves}<small>/{TOTAL_SHOTS}</small></strong><span>SAVES</span></div><div><strong>{view.bestStreak}</strong><span>BEST STREAK</span></div><div><strong>{profile.bestScore}</strong><span>PERSONAL BEST</span></div></div>
                  <button ref={replayButton} className={styles.primary} onClick={start}>Play again <span>↻</span></button>
                  {!won && view.difficulty === "pro" && <button className={styles.practiceLink} onClick={() => { chooseDifficulty("rookie"); start(); }}>Try the slower Rookie mode</button>}
                </div></div>}
                {!canvasAvailable && <div className={styles.canvasError}><h2>The pitch couldn’t load.</h2><p>Try reopening this game in your browser.</p><Link href="/personal/kids">Back to Bradley’s games</Link></div>}
              </div>

              <div className={styles.matchFooter}>
                <div className={styles.shotMarkers} aria-label={`${view.saves} saves and ${view.goals} goals from ${view.results.length} of ${TOTAL_SHOTS} shots`}>
                  {Array.from({ length: TOTAL_SHOTS }, (_, index) => <span key={index} aria-hidden="true" className={`${view.results[index] === "save" ? styles.savedShot : view.results[index] === "goal" ? styles.missedShot : ""} ${playing && index === view.shotIndex && view.stage !== "result" ? styles.currentShot : ""}`}>{view.results[index] === "save" ? "✓" : view.results[index] === "goal" ? "·" : index + 1}</span>)}
                </div>
                <span className={styles.cupTarget}><CupIcon /><span>{won ? "Cup secured!" : `${WIN_SAVES} saves = Keeper Cup`}</span></span>
              </div>
            </div>
            <div className={styles.coach} role="status" aria-live="polite" aria-atomic="true"><span className={styles.coachDot} /><p>{message}</p>{playing && <span className={styles.remaining}>{remaining} TO GO</span>}</div>
            <div id="soccer-controls" className={styles.controls}><span><GloveIcon /><strong>Tap or drag</strong> to move your gloves</span><span><span className={styles.keyboard}>↑ ↓ ← →</span> Mouse or arrow keys work too</span><span>Pause anytime</span></div>
          </section>

          <aside className={styles.sidebar} aria-label="Bradley's player profile and game settings">
            <section className={styles.playerCard}>
              <div className={styles.cardTop}><span>OFFICIAL KEEPER CARD</span><span>★ USA ★</span></div>
              <div className={styles.portrait}>
                <div className={styles.cardStripes} /><span className={styles.cardNumber}>01</span>
                <Image src="/bradley/hoodie.png" width={300} height={400} alt="Bradley, Team USA's goalkeeper" priority />
                <span className={styles.playerPosition}>GK</span>
                <div className={styles.nameplate}><span>YOUR GOAL. YOUR MOMENT.</span><h2>BRADLEY<span>SELLBERG</span></h2><div><Flag team="usa" /><span>TEAM USA · NO. 01</span></div></div>
              </div>
              <div className={styles.career}><div><strong>{profile.careerSaves}</strong><span>CAREER SAVES</span></div><div><strong>{profile.cups}</strong><span>KEEPER CUPS</span></div></div>
            </section>

            <section className={styles.modeCard}>
              <h2 className={styles.sideLabel}>YOUR PACE. YOUR PITCH.</h2>
              <div className={styles.modePicker} aria-label="Difficulty">{(["rookie", "pro"] as const).map((mode) => <button key={mode} disabled={!canChoose} aria-pressed={view.difficulty === mode} className={view.difficulty === mode ? styles.activeMode : ""} onClick={() => chooseDifficulty(mode)}>{mode === "rookie" ? "Rookie" : "Pro"}{mode === "rookie" && <span>START HERE</span>}</button>)}</div>
              <p>{view.difficulty === "rookie" ? "Slower shots, bigger catches, and a glowing hint. A great place to find your feet." : "Faster shots. No target hints. Watch the ball and trust your hands."}</p>
              {!canChoose && <small>Change your pace after this match.</small>}
            </section>

            <section className={styles.badgeSection}>
              <div className={styles.badgeHeading}><h2 className={styles.sideLabel}>BRADLEY’S BADGES</h2><span>{Number(profile.careerSaves > 0) + Number(profile.bestStreak >= 3) + Number(profile.cups > 0)} / 3</span></div>
              <div className={`${styles.badge} ${profile.careerSaves > 0 ? styles.earned : ""}`}><span><GloveIcon /></span><div><strong>Safe hands</strong><small>{profile.careerSaves > 0 ? "EARNED · YOUR FIRST SAVE" : "MAKE YOUR FIRST SAVE"}</small></div></div>
              <div className={`${styles.badge} ${profile.bestStreak >= 3 ? styles.earned : ""}`}><span className={styles.streakIcon}>3</span><div><strong>The Bradley wall</strong><small>{profile.bestStreak >= 3 ? "EARNED · THREE IN A ROW" : "SAVE THREE IN A ROW"}</small></div></div>
              <div className={`${styles.badge} ${profile.cups > 0 ? styles.earned : ""}`}><span><CupIcon /></span><div><strong>Country’s keeper</strong><small>{profile.cups > 0 ? "EARNED · KEEPER CUP WINNER" : "SAVE SIX IN ONE MATCH"}</small></div></div>
              <p className={styles.saveNote}>{storageAvailable ? "Your saves and badges stay on this browser." : "Saving is unavailable. You can still play this match!"}</p>
            </section>
          </aside>
        </div>
        <footer className={styles.footer}><BallIcon size={15} /><span>MADE FOR BRADLEY. BUILT FOR BIG SAVES.</span><span>ONE GOAL. ALL HEART.</span></footer>
      </div>
    </main>
  );
}
