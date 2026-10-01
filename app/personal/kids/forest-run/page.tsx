"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { createGame, jump, REGIONS, startGame, stepGame, TOTAL_DISTANCE, WORLD } from "./lib/game";
import type { Difficulty, GameEvent, Mode } from "./lib/game";
import { createForestRenderer } from "./lib/forest";
import { ForestAudio } from "./lib/audio";
import { DEFAULT_PROFILE, LEGACY_BEST_KEY, parseProfile, PROFILE_KEY } from "./lib/profile";
import type { Profile } from "./lib/profile";
import styles from "./forest.module.css";

function Leaf({ size = 23 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 23 20 9M8 20C-1 9 12 4 24 3c-1 13-5 24-16 17Z" /><path d="m11 18 0-6m5 2h5" /></svg>;
}
function Star({ size = 23 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" aria-hidden="true"><path d="m14 3 3.4 6.9 7.6 1.1-5.5 5.4 1.3 7.6-6.8-3.6L7.2 24l1.3-7.6L3 11l7.6-1.1L14 3Z" /></svg>;
}
function Mountain({ size = 28 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 32 28" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" aria-hidden="true"><path d="m2 25 12-22 14 22H2Zm18-13 3-5 7 18M9 12l5 3 4-5" /></svg>;
}
function Heart({ filled }: { filled: boolean }) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M12 21 3.6 12.6C-3 6 6-2 12 5c6-7 15 1 8.4 7.6L12 21Z" /></svg>;
}

export default function ForestRun() {
  const game = useRef(createGame());
  const [view, setView] = useState(() => createGame());
  const [profile, setProfile] = useState<Profile>({ ...DEFAULT_PROFILE });
  const profileRef = useRef<Profile>({ ...DEFAULT_PROFILE });
  const [message, setMessage] = useState("Your backpack is ready, Bradley. A whole forest is waiting.");
  const [storageAvailable, setStorageAvailable] = useState(true);
  const [canvasAvailable, setCanvasAvailable] = useState(true);
  const [fullScreen, setFullScreen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  const arena = useRef<HTMLDivElement>(null);
  const resumeButton = useRef<HTMLButtonElement>(null);
  const replayButton = useRef<HTMLButtonElement>(null);
  const audio = useRef<ForestAudio | null>(null);
  const inputPointer = useRef<number | null>(null);
  const reducedMotion = useRef(false);
  const refresh = useCallback(() => setView({ ...game.current }), []);
  const saveProfile = useCallback((patch: Partial<Profile>) => {
    const next = { ...profileRef.current, ...patch };
    profileRef.current = next;
    setProfile(next);
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(next));
      localStorage.setItem(LEGACY_BEST_KEY, String(next.bestScore));
    } catch { setStorageAvailable(false); }
  }, []);
  const pause = useCallback(() => {
    if (game.current.phase !== "playing") return;
    game.current.phase = "paused";
    inputPointer.current = null;
    audio.current?.stop();
    refresh();
  }, [refresh]);
  const doJump = useCallback(() => {
    if (game.current.phase !== "playing") return;
    audio.current?.unlock();
    if (jump(game.current)) {
      audio.current?.play(game.current.jumps === 2 ? "doubleJump" : "jump");
      refresh();
    }
  }, [refresh]);

  useEffect(() => {
    const surface = canvas.current;
    const context = surface?.getContext("2d", { alpha: false });
    if (!surface || !context) {
      const frame = requestAnimationFrame(() => setCanvasAvailable(false));
      return () => cancelAnimationFrame(frame);
    }
    const sound = new ForestAudio();
    audio.current = sound;
    let saved = { ...DEFAULT_PROFILE };
    let storageWorks = true;
    try { saved = parseProfile(localStorage.getItem(PROFILE_KEY), localStorage.getItem(LEGACY_BEST_KEY)); }
    catch { storageWorks = false; }
    profileRef.current = saved;
    game.current = createGame(saved.mode, saved.difficulty);
    sound.setMuted(saved.muted);
    let needsPaint = true;
    const portrait = new window.Image();
    portrait.onload = () => { needsPaint = true; };
    portrait.src = "/bradley/explorer.png";
    const draw = createForestRenderer();
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedMotion.current = media.matches;
    const motionChange = () => { reducedMotion.current = media.matches; needsPaint = true; };
    media.addEventListener("change", motionChange);
    const resize = () => {
      const width = surface.getBoundingClientRect().width;
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      surface.width = Math.max(1, Math.round(width * ratio));
      surface.height = Math.max(1, Math.round(width * WORLD.height / WORLD.width * ratio));
      needsPaint = true;
    };
    const observer = new ResizeObserver(resize);
    observer.observe(surface);
    resize();
    let animation = 0;
    let previousTime = 0;
    let lastHud = 0;
    let firstFrame = true;
    let lastPhase = game.current.phase;
    let sceneryTime = 0;
    const handleEvent = (event: GameEvent) => {
      const g = game.current;
      if (event.type === "jump" || event.type === "doubleJump") {
        sound.play(event.type);
      } else if (event.type === "star") {
        sound.play("star");
        saveProfile({ totalStars: profileRef.current.totalStars + 1, bestRunStars: Math.max(profileRef.current.bestRunStars, g.stars), bestCombo: Math.max(profileRef.current.bestCombo, g.bestCombo) });
        if (event.combo === 5) setMessage("Five stars in a row! Follow that golden trail, Bradley.");
      } else if (event.type === "shield") {
        sound.play("shield");
        setMessage("Star shield! You can smash right through the logs.");
      } else if (event.type === "hit") {
        sound.play("hit");
        setMessage(g.hearts > 0 ? "A little stumble. You've got this, Bradley—keep jumping!" : "Time for a breather. Every adventure makes you better.");
      } else if (event.type === "smash") {
        sound.play("smash");
        setMessage("Nothing stops Super Bradley! Keep following the stars.");
      } else if (event.type === "checkpoint") {
        sound.play("checkpoint");
        setMessage(`${REGIONS[g.region].name}! ${event.value ? "A fresh heart for the next part of your adventure." : "Full hearts. Ready for the next adventure!"}`);
      } else if (event.type === "finish") {
        const won = g.outcome === "complete";
        sound.play(won ? "win" : "finish");
        saveProfile({ runs: profileRef.current.runs + 1, trailWins: profileRef.current.trailWins + Number(won), bestDistance: Math.max(profileRef.current.bestDistance, Math.floor(g.distance)), bestScore: Math.max(profileRef.current.bestScore, Math.floor(g.score)), bestCombo: Math.max(profileRef.current.bestCombo, g.bestCombo), bestRunStars: Math.max(profileRef.current.bestRunStars, g.stars) });
        setMessage(won ? "You made it to the summit, Bradley. What an adventure!" : "The trail will be here when you're ready to try again.");
      }
      refresh();
    };
    const animate = (now: number) => {
      const dt = previousTime ? Math.min((now - previousTime) / 1000, 0.1) : 0;
      previousTime = now;
      if (firstFrame) {
        setProfile(saved);
        setStorageAvailable(storageWorks);
        setLoaded(true);
        refresh();
        firstFrame = false;
      }
      const g = game.current;
      if (!document.hidden) {
        if (g.phase === "playing") { sceneryTime += dt; stepGame(g, dt).forEach(handleEvent); }
        if (g.phase === "playing" || needsPaint || lastPhase !== g.phase) {
          context.setTransform(surface.width / WORLD.width, 0, 0, surface.height / WORLD.height, 0, 0);
          draw(context, g, sceneryTime, reducedMotion.current, portrait.complete && portrait.naturalWidth ? portrait : null);
          needsPaint = false;
          lastPhase = g.phase;
        }
        if (g.phase === "playing" && now - lastHud > 100) { refresh(); lastHud = now; }
      }
      animation = requestAnimationFrame(animate);
    };
    animation = requestAnimationFrame(animate);
    const visibilityChange = () => { if (document.hidden) pause(); previousTime = 0; };
    const fullscreenChange = () => { setFullScreen(document.fullscreenElement === arena.current); resize(); };
    document.addEventListener("visibilitychange", visibilityChange);
    document.addEventListener("fullscreenchange", fullscreenChange);
    window.addEventListener("blur", pause);
    window.addEventListener("pagehide", pause);
    window.addEventListener("orientationchange", pause);
    return () => {
      cancelAnimationFrame(animation);
      observer.disconnect();
      media.removeEventListener("change", motionChange);
      portrait.onload = null;
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
      if (game.current.phase !== "playing") return;
      const target = event.target as HTMLElement;
      if (target.closest("input, textarea, select") || target.isContentEditable) return;
      if (event.code === "Escape" || event.code === "KeyP") { event.preventDefault(); pause(); return; }
      if (target !== canvas.current || !["Space", "ArrowUp", "KeyW"].includes(event.code)) return;
      event.preventDefault();
      if (!event.repeat) doJump();
    };
    window.addEventListener("keydown", keyDown);
    return () => window.removeEventListener("keydown", keyDown);
  }, [doJump, pause]);
  useEffect(() => {
    if (view.phase === "paused") resumeButton.current?.focus({ preventScroll: true });
    if (view.phase === "finished") replayButton.current?.focus({ preventScroll: true });
  }, [view.phase]);

  function start() {
    game.current = createGame(profileRef.current.mode, profileRef.current.difficulty);
    startGame(game.current);
    inputPointer.current = null;
    audio.current?.unlock();
    audio.current?.play("start");
    setMessage("Let's go, Bradley! Tap to jump. Tap again for a double jump.");
    refresh();
    canvas.current?.focus({ preventScroll: true });
    const bounds = arena.current?.getBoundingClientRect();
    if (bounds && (bounds.bottom > window.innerHeight || bounds.top < 0)) arena.current?.scrollIntoView({ block: "start", behavior: "instant" });
  }
  function resume() {
    if (game.current.phase !== "paused") return;
    game.current.phase = "playing";
    inputPointer.current = null;
    audio.current?.unlock();
    refresh();
    canvas.current?.focus({ preventScroll: true });
  }
  function choose(patch: { mode?: Mode; difficulty?: Difficulty }) {
    if (!["ready", "finished"].includes(game.current.phase)) return;
    saveProfile(patch);
    if (patch.mode) game.current.mode = patch.mode;
    if (patch.difficulty) game.current.difficulty = patch.difficulty;
    refresh();
  }
  function pressJump(event: React.PointerEvent<HTMLElement>) {
    if (game.current.phase !== "playing" || inputPointer.current !== null || event.button !== 0) return;
    event.preventDefault();
    inputPointer.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    canvas.current?.focus({ preventScroll: true });
    doJump();
  }
  function releaseJump(event: React.PointerEvent<HTMLElement>) {
    if (inputPointer.current === event.pointerId) inputPointer.current = null;
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
      else setMessage("Turn your tablet sideways for a bigger view of the trail.");
    } catch { setMessage("Turn your tablet sideways for a bigger view of the trail."); }
  }
  const playing = view.phase === "playing";
  const finished = view.phase === "finished";
  const canChoose = view.phase === "ready" || finished;
  const completed = view.outcome === "complete";
  const distance = Math.floor(view.distance);
  const lap = Math.floor(view.distance / TOTAL_DISTANCE) + 1;
  const trailDistance = view.mode === "endless" ? view.distance % TOTAL_DISTANCE : view.distance;
  const progress = Math.min(100, trailDistance / TOTAL_DISTANCE * 100);
  const isResult = view.phase === "paused" || finished;
  const earned = Number(profile.bestRunStars >= 12) + Number(profile.bestCombo >= 5) + Number(profile.trailWins > 0);

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.topbar}>
          <Link href="/personal/kids" className={styles.back}>← <span>Bradley’s games</span></Link>
          <div className={styles.club}><Leaf size={21} /><span>THE BRADLEY ADVENTURE CLUB</span></div>
          <button className={styles.sound} onClick={toggleSound} aria-label={profile.muted ? "Turn sound on" : "Mute sound"} aria-pressed={!profile.muted}><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M11 4 5 9H2v6h3l6 5V4Z" />{profile.muted ? <path d="m16 9 6 6m0-6-6 6" /> : <path d="M15 8a6 6 0 0 1 0 8m3-12a11 11 0 0 1 0 16" />}</svg><span>Sound {profile.muted ? "off" : "on"}</span></button>
        </header>
        <div className={styles.heading}><div><p className={styles.eyebrow}><span /> A LITTLE EXPLORER. A BIG WORLD.</p><h1>Bradley’s <em>Forest Run.</em></h1></div><div className={styles.expedition}><Mountain /><div><span>EXPEDITION NO. 01</span><strong>The road to Starlight Summit</strong></div></div></div>
        <div className={styles.layout}>
          <section className={styles.gameColumn} aria-label="Forest Run game">
            <div className={styles.journey} aria-label="Your trail">
              {REGIONS.map((region, index) => <div key={region.name} className={`${styles.journeyStop} ${view.region === index ? styles.currentStop : ""} ${view.region > index || completed ? styles.doneStop : ""}`} aria-current={view.region === index ? "step" : undefined}><span>{view.region > index || completed ? "✓" : `0${index + 1}`}</span><div><small>{index === 0 ? "FIND YOUR FEET" : index === 1 ? "FOLLOW THE GLOW" : "REACH FOR THE STARS"}</small><strong>{region.name}</strong></div></div>)}
            </div>
            <div className={styles.arena} ref={arena}>
              <div className={styles.hud}>
                <div className={styles.distance}><Leaf size={24} /><strong>{distance}<small>m</small></strong><span>{view.mode === "trail" ? `OF ${TOTAL_DISTANCE}m` : "ENDLESS TRAIL"}</span></div>
                <div className={styles.starCount}><Star size={20} /><strong>{view.stars}</strong><span>STARS</span></div>
                <div className={styles.hearts} aria-label={`${view.hearts} of 3 hearts remaining`}>{[1, 2, 3].map((heart) => <span key={heart} className={heart <= view.hearts ? styles.fullHeart : styles.emptyHeart}><Heart filled={heart <= view.hearts} /></span>)}</div>
                <div className={styles.arenaTools}><button onClick={pause} disabled={!playing} aria-label="Pause game"><svg width="17" height="19" viewBox="0 0 17 19" fill="currentColor" aria-hidden="true"><path d="M3 2h4v15H3zm7 0h4v15h-4z" /></svg></button><button onClick={toggleFullscreen} aria-label={fullScreen ? "Exit fullscreen" : "Enter fullscreen"}><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M9 3H3v6m12-6h6v6M3 15v6h6m12-6v6h-6" /></svg></button></div>
              </div>
              <div className={`${styles.world} ${isResult ? styles.resultWorld : view.phase === "ready" ? styles.lobbyWorld : ""}`}>
                <canvas ref={canvas} width={960} height={540} className={styles.canvas} tabIndex={playing ? 0 : -1} aria-label="Bradley's forest trail. Tap to jump, then tap again in the air to double jump. Space or Up also jumps." aria-describedby="forest-controls" onPointerDown={pressJump} onPointerUp={releaseJump} onPointerCancel={(event) => { releaseJump(event); pause(); }} onLostPointerCapture={releaseJump} onContextMenu={(event) => event.preventDefault()} />
                {playing && <>
                  <div className={styles.regionTag}><span />{REGIONS[view.region].name}</div>
                  {view.combo >= 3 && <div className={styles.combo}><Star size={16} />{view.combo} STAR STREAK</div>}
                  {view.shield > 0 && <div className={styles.shieldStatus}><Star size={18} /><strong>STAR SHIELD</strong><span>{Math.ceil(view.shield)}s</span><i style={{ transform: `scaleX(${Math.min(1, view.shield / 7)})` }} /></div>}
                  {view.distance < 28 && <div className={styles.firstTip}>Tap to jump <span>·</span> Tap again to go higher</div>}
                </>}
                {view.phase === "ready" && <div className={`${styles.overlay} ${styles.lobby}`}><div className={styles.intro}>
                  <div className={styles.trailTicket}><Leaf size={15} /> BRADLEY’S NEXT GREAT ADVENTURE</div>
                  <h2>Little feet.<br /><em>Wild adventure.</em></h2>
                  <p>Golden stars. Secret trails. One very curious bear.<br />Let’s see how far those brave little feet can go.</p>
                  <button className={styles.primary} disabled={!loaded || !canvasAvailable} onClick={start}>Hit the trail, Bradley <span>→</span></button>
                  <div className={styles.introNotes}><span>3 hearts</span><i /> <span>2 jumps</span><i /><span>{view.mode === "trail" ? "1 big adventure" : "An endless adventure"}</span></div>
                </div><span className={styles.trailSeal} aria-hidden="true"><Mountain size={44} /><strong>TRAIL<br />EXPLORER</strong><small>EST. BRADLEY</small></span></div>}
                {view.phase === "paused" && <div className={styles.overlay}><div className={styles.resultCard}><span className={styles.resultIcon}><Leaf size={31} /></span><p className={styles.eyebrow}>EVEN EXPLORERS NEED A BREAK</p><h2>A moment in the shade.</h2><p>Your adventure is right where you left it.<br />Ready when you are, Bradley.</p><button ref={resumeButton} className={styles.primary} onClick={resume}>Back to the trail <span>→</span></button></div></div>}
                {finished && <div className={styles.overlay}><div className={styles.resultCard}>
                  <span className={`${styles.resultIcon} ${completed ? styles.goldIcon : ""}`}>{completed ? <Mountain size={33} /> : <Leaf size={31} />}</span>
                  <p className={styles.eyebrow}>{completed ? "STARLIGHT SUMMIT · YOU MADE IT" : "A LITTLE REST. ANOTHER ADVENTURE."}</p>
                  <h2>{completed ? "Trail legend, Bradley." : "Good exploring, Bradley!"}</h2>
                  <p>{completed ? "Through the trees, across the creek, all the way to the stars." : "The bear caught up! Jump just before a log, then tap again if you need a little more height."}</p>
                  <div className={styles.resultStats}><div><strong>{distance}<small>m</small></strong><span>DISTANCE</span></div><div><strong>{view.stars}</strong><span>STARS FOUND</span></div><div><strong>{Math.floor(view.score)}</strong><span>TRAIL SCORE</span></div></div>
                  <button ref={replayButton} className={styles.primary} onClick={start}>Another adventure <span>↻</span></button>
                  {completed && view.mode === "trail" && <button className={styles.extraAction} onClick={() => { choose({ mode: "endless" }); start(); }}>Keep exploring on the endless trail →</button>}
                  {!completed && view.difficulty === "ranger" && <button className={styles.extraAction} onClick={() => { choose({ difficulty: "explorer" }); start(); }}>Try the gentler Explorer pace</button>}
                </div></div>}
                {!canvasAvailable && <div className={styles.canvasError}><h2>The trail couldn’t load.</h2><p>Try reopening this game in your browser.</p><Link href="/personal/kids">Back to Bradley’s games</Link></div>}
              </div>
              <div className={styles.trailProgress} aria-label={view.mode === "trail" ? `${distance} of ${TOTAL_DISTANCE} metres completed` : `${Math.floor(trailDistance)} of ${TOTAL_DISTANCE} metres on loop ${lap}`}><span>{view.mode === "endless" ? `LOOP ${lap}` : "BASE CAMP"}</span><div><i style={{ width: `${progress}%` }} />{[33.333, 66.667].map((left) => <b key={left} style={{ left: `${left}%` }} />)}</div><span>{view.mode === "trail" ? "THE SUMMIT" : "NEXT SUMMIT"}<Mountain size={15} /></span></div>
              <div className={styles.controlsBar}>
                <div className={styles.jumpInfo}><span>YOUR NEXT MOVE</span><strong>{view.jumps === 0 ? "Jump, then jump again." : view.jumps === 1 ? "One more jump in the air!" : "Land. Breathe. Jump again."}</strong></div>
                <button className={styles.jumpButton} disabled={!playing} onPointerDown={pressJump} onPointerUp={releaseJump} onPointerCancel={(event) => { releaseJump(event); pause(); }} onLostPointerCapture={releaseJump} onKeyDown={(event) => { if (event.repeat && ["Enter", " "].includes(event.key)) event.preventDefault(); }} onClick={(event) => { if (event.detail === 0) doJump(); }} aria-label="Jump. Tap again in the air for a double jump."><span className={styles.jumpArrow}>↑</span><span>JUMP<small>TAP AGAIN TO DOUBLE JUMP</small></span><span className={styles.jumpDots} aria-hidden="true"><i className={view.jumps < 1 ? styles.jumpReady : ""} /><i className={view.jumps < 2 ? styles.jumpReady : ""} /></span></button>
              </div>
            </div>
            <div className={styles.coach} role="status" aria-live="polite" aria-atomic="true"><Leaf size={17} /><p>{message}</p><span>{Math.floor(view.score)} PTS</span></div>
            <div id="forest-controls" className={styles.instructions}><span>Tap the trail or the big jump button</span><span>SPACE / ↑ on a keyboard</span><span>Pause anytime</span></div>
          </section>
          <aside className={styles.sidebar} aria-label="Bradley's trail passport and game settings">
            <section className={styles.passport}><div className={styles.passportTop}><Leaf size={16} /><span>EXPLORER’S PASSPORT</span><span>001</span></div><div className={styles.portrait}><span className={styles.explorerLines} /><Image src="/bradley/explorer.png" width={300} height={410} alt="Bradley, our brave trail explorer" priority /><span className={styles.passportStamp}>READY FOR<br /><strong>ADVENTURE</strong></span><div className={styles.nameplate}><small>SMALL BOOTS. BIG COURAGE.</small><h2>BRADLEY<span>SELLBERG</span></h2></div></div><div className={styles.records}><div><strong>{profile.bestDistance}<small>m</small></strong><span>FARTHEST TRAIL</span></div><div><strong>{profile.totalStars}</strong><span>STARS COLLECTED</span></div></div></section>
            <section className={styles.settings}><h2 className={styles.sideLabel}>PICK YOUR ADVENTURE</h2><div className={styles.modePicker}>{(["trail", "endless"] as const).map((mode) => <button key={mode} disabled={!canChoose} aria-pressed={view.mode === mode} className={view.mode === mode ? styles.selected : ""} onClick={() => choose({ mode })}>{mode === "trail" ? "Summit trail" : "Endless"}</button>)}</div><p>{view.mode === "trail" ? "Three places to discover. Reach the summit at 450m. Each new place restores a heart." : "Keep exploring for as long as you can. How far will your next adventure take you?"}</p><div className={styles.paceRow}><span>YOUR PACE</span><div>{(["explorer", "ranger"] as const).map((difficulty) => <button key={difficulty} disabled={!canChoose} aria-pressed={view.difficulty === difficulty} className={view.difficulty === difficulty ? styles.activePace : ""} onClick={() => choose({ difficulty })}>{difficulty === "explorer" ? "Explorer" : "Ranger"}</button>)}</div></div><p className={styles.paceNote}>{view.difficulty === "explorer" ? "A gentler start with more time to jump." : "A quicker trail for confident jumpers."}{!canChoose && " Change after this run."}</p></section>
            <section className={styles.badges}><div className={styles.badgeHeading}><h2 className={styles.sideLabel}>STAMPS FOR YOUR PASSPORT</h2><span>{earned}/3</span></div><div className={`${styles.badge} ${profile.bestRunStars >= 12 ? styles.earned : ""}`}><span><Star size={23} /></span><div><strong>Star scout</strong><small>{profile.bestRunStars >= 12 ? "STAMPED · 12 STARS IN ONE RUN" : "FIND 12 STARS IN ONE RUN"}</small></div></div><div className={`${styles.badge} ${profile.bestCombo >= 5 ? styles.earned : ""}`}><span className={styles.five}>5</span><div><strong>On a golden roll</strong><small>{profile.bestCombo >= 5 ? "STAMPED · FIVE STARS IN A ROW" : "CATCH FIVE STARS WITHOUT A STUMBLE"}</small></div></div><div className={`${styles.badge} ${profile.trailWins > 0 ? styles.earned : ""}`}><span><Mountain size={25} /></span><div><strong>Summit explorer</strong><small>{profile.trailWins > 0 ? "STAMPED · SUMMIT REACHED" : "FINISH THE SUMMIT TRAIL"}</small></div></div><p className={styles.saveNote}>{storageAvailable ? `Best trail score: ${profile.bestScore}. Your records stay on this browser.` : "Saving is unavailable. Your adventure still works!"}</p></section>
          </aside>
        </div>
        <footer className={styles.footer}><Leaf size={15} /><span>MADE FOR BRADLEY. MEANT FOR ADVENTURE.</span><span>LEAVE NOTHING BUT LITTLE FOOTPRINTS.</span></footer>
      </div>
    </main>
  );
}
