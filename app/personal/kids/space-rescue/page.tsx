"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { createGame, LEVELS, moveShip, nextLevel, retryLevel, startGame, stepGame, WORLD } from "./lib/game";
import type { Difficulty, GameEvent } from "./lib/game";
import { createSpaceRenderer } from "./lib/space";
import { SpaceAudio } from "./lib/audio";
import { DEFAULT_PROFILE, parseProfile, PROFILE_KEY } from "./lib/profile";
import type { Profile } from "./lib/profile";
import styles from "./space.module.css";

function Rocket({ size = 25 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" aria-hidden="true"><path d="M11 21 8 16C12 7 19 3 28 4c1 9-3 16-12 20l-5-3Zm-3-5-5 1 4-8 7-1M16 24l-1 5 8-4 1-7M9 25l-4 3 2-5" /><circle cx="21" cy="11" r="3" /></svg>;
}
function Star({ size = 22 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" aria-hidden="true"><path d="m14 3 3.4 6.9 7.6 1.1-5.5 5.4 1.3 7.6-6.8-3.6L7.2 24l1.3-7.6L3 11l7.6-1.1L14 3Z" /></svg>;
}
function CrewIcon({ index, size = 25 }: { index: number; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{index === 0 ? <><path d="M8 25c-2-6 3-8 5-11 2-2 4-2 6 0 2 3 7 5 5 11-1 4-5 1-8 1s-7 3-8-1Z" /><ellipse cx="6" cy="13" rx="3" ry="4" transform="rotate(-25 6 13)" /><ellipse cx="12" cy="7" rx="3" ry="4" /><ellipse cx="20" cy="7" rx="3" ry="4" /><ellipse cx="26" cy="13" rx="3" ry="4" transform="rotate(25 26 13)" /></> : index === 1 ? <><circle cx="16" cy="16" r="12" /><path d="m16 10 6 4-2 7h-8l-2-7 6-4Zm0 0V4m6 10 5-3m-7 10 4 5m-12-5-4 5m2-12-5-3" /></> : index === 2 ? <><circle cx="16" cy="16" r="12" /><path d="M8 6c8 5 8 15 0 20M24 6c-8 5-8 15 0 20m-13-16 4 1m-3 5h4m-5 6 4-1m6-11-4 1m3 5h-4m5 6-4-1" /></> : <><path d="M16 27 5 16C-2 8 9 0 16 8c7-8 18 0 11 8L16 27Z" /><path d="m11 16 3 3 7-7" /></>}</svg>;
}
function Bolt() {
  return <svg width="18" height="21" viewBox="0 0 20 24" fill="currentColor" aria-hidden="true"><path d="M12 0 1 14h8L6 24l13-14h-8z" /></svg>;
}
const weaponNames = ["Soccer Sparks", "Twin Kick", "Baseball Burst", "All-Star Blaster"];
const rescueLines = ["Woof! Nelly is safe and ready for the ride home.", "Your little teammate is safe. Great flying, Bradley!", "Dad Dylan is cheering from the rescue ship. Home run!", "Mom Beth is safe. The whole family is together again!"];
const pilotKeys = new Set(["ArrowLeft", "ArrowRight", "KeyA", "KeyD"]);

export default function SpaceRescue() {
  const game = useRef(createGame());
  const [view, setView] = useState(() => createGame());
  const [profile, setProfile] = useState<Profile>({ ...DEFAULT_PROFILE });
  const profileRef = useRef<Profile>({ ...DEFAULT_PROFILE });
  const [message, setMessage] = useState("Nelly and your family need a hero. Captain Bradley, ready for launch?");
  const [loaded, setLoaded] = useState(false);
  const [storageAvailable, setStorageAvailable] = useState(true);
  const [canvasAvailable, setCanvasAvailable] = useState(true);
  const [fullScreen, setFullScreen] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  const arena = useRef<HTMLDivElement>(null);
  const resumeButton = useRef<HTMLButtonElement>(null);
  const continueButton = useRef<HTMLButtonElement>(null);
  const audio = useRef<SpaceAudio | null>(null);
  const pointer = useRef<number | null>(null);
  const keys = useRef(new Set<string>());
  const reducedMotion = useRef(false);
  const refresh = useCallback(() => setView({ ...game.current, rescued: [...game.current.rescued] }), []);
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
    pointer.current = null;
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
    const sound = new SpaceAudio();
    audio.current = sound;
    let saved = { ...DEFAULT_PROFILE };
    let storageWorks = true;
    try { saved = parseProfile(localStorage.getItem(PROFILE_KEY)); }
    catch { storageWorks = false; }
    profileRef.current = saved;
    game.current = createGame(saved.difficulty, undefined, saved.furthestLevel);
    sound.setMuted(saved.muted);
    const draw = createSpaceRenderer();
    let needsPaint = true;
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
    let frame = 0;
    let lastTime = 0;
    let lastHud = 0;
    let firstFrame = true;
    let time = 0;
    let drawnGame = game.current;
    let drawnPhase = game.current.phase;
    const handleEvent = (event: GameEvent) => {
      const g = game.current;
      sound.play(event.type);
      if (event.type === "boss") {
        setMessage(`${LEVELS[g.level].bossName} is here! Watch the orange shots and keep moving.`);
      } else if (event.type === "upgrade") {
        setMessage(`${weaponNames[g.weaponTier - 1]} unlocked! Your blaster just got an upgrade, Bradley.`);
      } else if (event.type === "hit") {
        setMessage(g.lives > 0 ? "A little bump! Your shield gives you a moment to find a clear space." : "Nice flying, Bradley. Your rescued crew is still safe.");
      } else if (event.type === "rescue") {
        saveProfile({ totalRescues: profileRef.current.totalRescues + 1, furthestLevel: Math.max(profileRef.current.furthestLevel, Math.min(LEVELS.length - 1, g.level + 1)), bestScore: Math.max(profileRef.current.bestScore, g.score) });
        setMessage(rescueLines[g.level]);
      } else if (event.type === "win") {
        saveProfile({ victories: profileRef.current.victories + 1, bestScore: Math.max(profileRef.current.bestScore, g.score) });
        setMessage("Nelly, Logan, Dad, and Mom—all safe. You're their hero, Bradley!");
      } else if (event.type === "lose") {
        saveProfile({ bestScore: Math.max(profileRef.current.bestScore, g.score) });
      }
      if (event.type !== "shoot" && event.type !== "alien") refresh();
    };
    const animate = (now: number) => {
      const dt = lastTime ? Math.min((now - lastTime) / 1000, 0.1) : 0;
      lastTime = now;
      if (firstFrame) { setProfile(saved); setStorageAvailable(storageWorks); setLoaded(true); refresh(); firstFrame = false; }
      const g = game.current;
      if (!document.hidden) {
        if (g.phase === "playing") {
          time += dt;
          const direction = Number(keys.current.has("ArrowRight") || keys.current.has("KeyD")) - Number(keys.current.has("ArrowLeft") || keys.current.has("KeyA"));
          if (direction) moveShip(g, g.targetX + direction * 750 * dt);
          stepGame(g, dt).forEach(handleEvent);
        }
        if (g.phase === "playing" || needsPaint || drawnGame !== g || drawnPhase !== g.phase) {
          ctx.setTransform(surface.width / WORLD.width, 0, 0, surface.height / WORLD.height, 0, 0);
          draw(ctx, g, time * 1000, reducedMotion.current);
          needsPaint = false; drawnGame = g; drawnPhase = g.phase;
        }
        if (g.phase === "playing" && now - lastHud > 100) { refresh(); lastHud = now; }
      }
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    const visibilityChange = () => { if (document.hidden) pause(); lastTime = 0; };
    const fullscreenChange = () => {
      setFullScreen(document.fullscreenElement === arena.current);
      resize();
      keys.current.clear();
      if (game.current.phase === "playing") surface.focus({ preventScroll: true });
    };
    document.addEventListener("visibilitychange", visibilityChange);
    document.addEventListener("fullscreenchange", fullscreenChange);
    window.addEventListener("blur", pause);
    window.addEventListener("pagehide", pause);
    window.addEventListener("orientationchange", pause);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      media.removeEventListener("change", motionChange);
      document.removeEventListener("visibilitychange", visibilityChange);
      document.removeEventListener("fullscreenchange", fullscreenChange);
      window.removeEventListener("blur", pause);
      window.removeEventListener("pagehide", pause);
      window.removeEventListener("orientationchange", pause);
      sound.dispose(); audio.current = null;
    };
  }, [pause, refresh, saveProfile]);

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (game.current.phase !== "playing") return;
      if ((event.target as HTMLElement).closest("input,textarea,select,[contenteditable=true]")) return;
      if (event.code === "Escape" || event.code === "KeyP") { event.preventDefault(); pause(); return; }
      if (event.target !== canvas.current || !pilotKeys.has(event.code)) return;
      event.preventDefault(); keys.current.add(event.code);
    };
    const up = (event: KeyboardEvent) => { keys.current.delete(event.code); };
    window.addEventListener("keydown", down); window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, [pause]);
  useEffect(() => {
    if (view.phase === "paused") resumeButton.current?.focus({ preventScroll: true });
    if (["rescued", "lost", "won"].includes(view.phase)) continueButton.current?.focus({ preventScroll: true });
  }, [view.phase]);

  function focusFlight() {
    keys.current.clear(); pointer.current = null;
    audio.current?.unlock();
    refresh();
    canvas.current?.focus({ preventScroll: true });
    const bounds = arena.current?.getBoundingClientRect();
    if (bounds && (bounds.bottom > window.innerHeight || bounds.top < 0)) arena.current?.scrollIntoView({ block: "start", behavior: "instant" });
  }
  function start() {
    game.current = createGame(profileRef.current.difficulty, undefined, game.current.level);
    startGame(game.current);
    saveProfile({ missions: profileRef.current.missions + 1 });
    audio.current?.unlock(); audio.current?.play("start");
    setMessage(`Let's rescue ${LEVELS[game.current.level].rescue}! Slide left and right. Your blaster fires for you.`);
    focusFlight();
  }
  function resume() {
    if (game.current.phase !== "paused") return;
    game.current.phase = "playing";
    focusFlight();
  }
  function advance() {
    nextLevel(game.current);
    audio.current?.play("start");
    setMessage(`Next stop: ${LEVELS[game.current.level].sector}. ${LEVELS[game.current.level].rescue} is counting on you!`);
    focusFlight();
  }
  function retry() {
    retryLevel(game.current);
    setMessage(`Fresh shields, same brave captain. Let's rescue ${LEVELS[game.current.level].rescue}!`);
    focusFlight();
  }
  function missionMap(level = game.current.level) {
    game.current = createGame(profileRef.current.difficulty, undefined, level);
    keys.current.clear(); pointer.current = null; audio.current?.stop();
    setMessage("Choose a mission, Captain. Your unlocked worlds are ready to explore.");
    refresh();
  }
  function chooseLevel(level: number) {
    if (level > profileRef.current.furthestLevel || game.current.phase !== "ready") return;
    missionMap(level);
  }
  function chooseDifficulty(difficulty: Difficulty) {
    if (game.current.phase !== "ready") return;
    saveProfile({ difficulty });
    game.current = createGame(difficulty, undefined, game.current.level);
    refresh();
  }
  function steer(event: React.PointerEvent<HTMLElement>) {
    if (game.current.phase !== "playing") return;
    if (event.pointerType !== "mouse" && pointer.current !== event.pointerId) return;
    if (pointer.current !== null && pointer.current !== event.pointerId) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    moveShip(game.current, (event.clientX - bounds.left) / bounds.width * WORLD.width);
  }
  function grab(event: React.PointerEvent<HTMLElement>) {
    if (game.current.phase !== "playing" || pointer.current !== null || event.button !== 0) return;
    event.preventDefault(); pointer.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    canvas.current?.focus({ preventScroll: true });
    steer(event);
    audio.current?.unlock();
  }
  function release(event: React.PointerEvent<HTMLElement>) {
    if (pointer.current === event.pointerId) pointer.current = null;
  }
  function toggleSound() {
    const muted = !profileRef.current.muted;
    audio.current?.setMuted(muted);
    if (!muted) audio.current?.unlock();
    saveProfile({ muted });
    keys.current.clear();
    if (game.current.phase === "playing") canvas.current?.focus({ preventScroll: true });
  }
  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (arena.current?.requestFullscreen) await arena.current.requestFullscreen();
      else setMessage("Turn your tablet sideways for a bigger flight deck.");
    } catch { setMessage("Turn your tablet sideways for a bigger flight deck."); }
  }

  const level = LEVELS[view.level];
  const playing = view.phase === "playing";
  const isResult = ["rescued", "lost", "won", "paused"].includes(view.phase);
  const bossPercent = view.boss ? Math.max(0, Math.round(view.boss.hp / view.boss.maxHp * 100)) : 0;

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.topbar}><Link href="/personal/kids" className={styles.back}>← <span>Bradley’s games</span></Link><div className={styles.club}><Rocket size={20} /><span>THE BRADLEY SPACE PROGRAM</span></div><button className={styles.sound} onClick={toggleSound} aria-label={profile.muted ? "Turn sound on" : "Mute sound"} aria-pressed={!profile.muted}><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M11 4 5 9H2v6h3l6 5V4Z" />{profile.muted ? <path d="m16 9 6 6m0-6-6 6" /> : <path d="M15 8a6 6 0 0 1 0 8m3-12a11 11 0 0 1 0 16" />}</svg><span>Sound {profile.muted ? "off" : "on"}</span></button></header>
        <div className={styles.heading}><div><p className={styles.eyebrow}><span /> SMALL CAPTAIN. GALACTIC COURAGE.</p><h1>Bradley’s <em>Space Rescue.</em></h1></div><div className={styles.missionTag}><span>MISSION CONTROL</span><strong>Bring your favorite people home.</strong></div></div>
        <div className={styles.layout}>
          <section className={styles.gameColumn} aria-label="Space Rescue game">
            <div className={styles.missionTrack} aria-label="The rescue mission">{LEVELS.map((item, index) => <div key={item.rescue} className={`${styles.missionStop} ${index === view.level ? styles.currentStop : ""} ${view.rescued.includes(item.rescue) ? styles.savedStop : ""}`}><span>{view.rescued.includes(item.rescue) ? "✓" : `0${index + 1}`}</span><div><small>{view.rescued.includes(item.rescue) ? "SAFE & SOUND" : "RESCUE"}</small><strong>{item.rescue === "Dylan" ? "Dad Dylan" : item.rescue === "Beth" ? "Mom Beth" : item.rescue}</strong></div><CrewIcon index={index} size={21} /></div>)}</div>
            <div className={styles.arena} ref={arena}>
              <div className={styles.hud}><div className={styles.levelLabel}><span className={styles.liveDot} /><div><small>MISSION {view.level + 1} / {LEVELS.length}</small><strong>{level.sector}</strong></div></div><div className={styles.score}><strong>{view.score.toLocaleString()}</strong><span>POINTS</span></div><div className={styles.lives} aria-label={`${view.lives} of 5 shields remaining`}>{[1, 2, 3, 4, 5].map((life) => <i key={life} className={life <= view.lives ? styles.liveShield : ""} />)}</div><div className={styles.arenaTools}><button onClick={pause} disabled={!playing} aria-label="Pause game"><svg width="17" height="19" viewBox="0 0 17 19" fill="currentColor" aria-hidden="true"><path d="M3 2h4v15H3zm7 0h4v15h-4z" /></svg></button><button onClick={toggleFullscreen} aria-label={fullScreen ? "Exit fullscreen" : "Enter fullscreen"}><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M9 3H3v6m12-6h6v6M3 15v6h6m12-6v6h-6" /></svg></button></div></div>
              <div className={`${styles.space} ${isResult ? styles.resultSpace : view.phase === "ready" ? styles.lobbySpace : ""}`}>
                <canvas ref={canvas} width={960} height={720} className={styles.canvas} tabIndex={playing ? 0 : -1} aria-label="Bradley's spaceship. Drag left or right, move the mouse, or use the arrow keys to dodge orange alien bullets. Your blaster shoots automatically." aria-describedby="space-controls" onPointerDown={grab} onPointerMove={steer} onPointerUp={release} onPointerCancel={(event) => { release(event); pause(); }} onLostPointerCapture={release} onContextMenu={(event) => event.preventDefault()} />
                {playing && <><div className={styles.waveTag}>{view.stage === "boss" ? "BOSS BATTLE" : `ALIEN WAVE ${view.wave + 1} / 2`}</div>{view.stage === "boss" && view.boss && <div className={styles.bossBar}><strong>{level.bossName}</strong><div role="progressbar" aria-label="Boss shield remaining" aria-valuenow={bossPercent} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${bossPercent}%` }} /></div></div>}{view.upgradeFlash > 0 && <div className={styles.upgradePop}><Bolt /><div><span>AUTO-UPGRADE!</span><strong>{weaponNames[view.weaponTier - 1]}</strong></div></div>}</>}
                {view.phase === "ready" && <div className={`${styles.overlay} ${styles.lobby}`}><div className={styles.intro}><div className={styles.callup}><span /> CAPTAIN BRADLEY, WE NEED YOU</div><h2>Big universe.<br /><em>Bigger hero.</em></h2><p>The aliens have your favorite crew.<br />A brave captain. A super blaster. Four daring rescues.</p><button className={styles.primary} disabled={!loaded || !canvasAvailable} onClick={start}>{view.level === 0 ? "Blast off, Bradley" : `Rescue ${level.rescue}`}<Rocket size={20} /></button><div className={styles.introHint}><span>↔</span><div>Drag to steer. Dodge the orange shots.<br /><strong>Your blaster fires and upgrades by itself.</strong></div></div></div><div className={styles.orbitBadge} aria-hidden="true"><Rocket size={43} /><strong>BRADLEY</strong><span>CAPTAIN · NO. 01</span></div></div>}
                {view.phase === "paused" && <div className={styles.overlay}><div className={styles.resultCard}><span className={styles.resultIcon}><Rocket size={32} /></span><p className={styles.eyebrow}>MISSION ON HOLD</p><h2>A quick space break.</h2><p>The galaxy can wait, Bradley.<br />Your ship is right where you left it.</p><button ref={resumeButton} className={styles.primary} onClick={resume}>Back to the rescue <span>→</span></button><button className={styles.secondary} onClick={() => missionMap()}>Mission map</button></div></div>}
                {view.phase === "rescued" && <div className={styles.overlay}><div className={styles.resultCard}><span className={`${styles.resultIcon} ${styles.rescueIcon}`}><CrewIcon index={view.level} size={36} /></span><p className={styles.eyebrow}>MISSION {view.level + 1} COMPLETE</p><h2>{level.rescue} is safe!</h2><p>{rescueLines[view.level]}</p><div className={styles.rescueReward}><span>✓ FULL SHIELDS RESTORED NEXT MISSION</span><strong>Next rescue: {LEVELS[Math.min(view.level + 1, 3)].rescue}</strong></div><button ref={continueButton} className={styles.primary} onClick={advance}>On to the next rescue <span>→</span></button><button className={styles.secondary} onClick={() => missionMap(Math.min(view.level + 1, 3))}>Take a break · progress saved</button></div></div>}
                {view.phase === "lost" && <div className={styles.overlay}><div className={styles.resultCard}><span className={styles.resultIcon}><Rocket size={32} /></span><p className={styles.eyebrow}>FRESH SHIELDS. SAME BRAVE CAPTAIN.</p><h2>You’ve got this, Bradley.</h2><p>Keep sliding into the gaps between orange shots.<br />{view.rescued.length ? "Your rescued crew is still safe!" : "Nelly knows you can do it. Try again!"}</p><div className={styles.resultStats}><div><strong>{view.score}</strong><span>MISSION SCORE</span></div><div><strong>{view.rescued.length}<small>/4</small></strong><span>CREW SAFE</span></div></div><button ref={continueButton} className={styles.primary} onClick={retry}>Retry this mission <span>↻</span></button><button className={styles.secondary} onClick={() => missionMap()}>Mission map</button></div></div>}
                {view.phase === "won" && <div className={styles.overlay}><div className={styles.resultCard}><span className={`${styles.resultIcon} ${styles.rescueIcon}`}><Star size={34} /></span><p className={styles.eyebrow}>FOUR RESCUES. ONE INCREDIBLE CAPTAIN.</p><h2>Everyone’s home, Bradley!</h2><p>Nelly’s tail is wagging. Logan is cheering.<br />Mom and Dad couldn’t be prouder.</p><div className={styles.savedCrew}>{LEVELS.map((person, index) => <span key={person.rescue}><CrewIcon index={index} size={24} /><small>{person.rescue}</small></span>)}</div><div className={styles.resultStats}><div><strong>{view.score.toLocaleString()}</strong><span>FINAL SCORE</span></div><div><strong>{profile.bestScore.toLocaleString()}</strong><span>PERSONAL BEST</span></div></div><button ref={continueButton} className={styles.primary} onClick={() => { missionMap(0); start(); }}>Another space adventure <Rocket size={18} /></button><button className={styles.secondary} onClick={() => missionMap(0)}>Choose a mission</button></div></div>}
                {!canvasAvailable && <div className={styles.canvasError}><h2>The flight deck couldn’t load.</h2><p>Try reopening this game in your browser.</p><Link href="/personal/kids">Back to Bradley’s games</Link></div>}
              </div>
              <div className={styles.flightFooter}><div className={styles.blasterLabel}><Bolt /><div><small>AUTO-FIRING · TIER {view.weaponTier}</small><strong>{weaponNames[view.weaponTier - 1]}</strong></div></div><div className={styles.tierLights} aria-hidden="true">{[1, 2, 3, 4].map((tier) => <i key={tier} className={tier <= view.weaponTier ? styles.tierOn : ""} />)}</div><span className={styles.autopilotNote}>YOU STEER. YOUR BLASTER DOES THE REST.</span></div>
            </div>
            <div className={styles.coach} role="status" aria-live="polite" aria-atomic="true"><span className={styles.radioIcon}>◉</span><p>{message}</p></div><div id="space-controls" className={styles.instructions}><span>↔ Drag the bottom of the screen to steer</span><span>Mouse / ← → / A D</span><span>Orange shots = dodge!</span></div>
          </section>
          <aside className={styles.sidebar} aria-label="Captain Bradley and the rescue crew">
            <section className={styles.captainCard}><div className={styles.cardTop}><span>OFFICIAL CAPTAIN’S CARD</span><Star size={13} /></div><div className={styles.portrait}><span className={styles.bigNumber}>01</span><Image src="/bradley/astronaut.png" width={300} height={420} alt="Captain Bradley in his astronaut suit" priority /><div className={styles.nameplate}><small>THE GALAXY’S FAVORITE TEAMMATE</small><h2>BRADLEY<span>SELLBERG</span></h2><span className={styles.captainRank}><span /> ALL-STAR SPACE CAPTAIN</span></div></div><div className={styles.records}><div><strong>{profile.bestScore.toLocaleString()}</strong><span>BEST SCORE</span></div><div><strong>{profile.victories}</strong><span>HERO MISSIONS</span></div></div></section>
            <section className={styles.crewCard}><div className={styles.sectionHeading}><h2 className={styles.sideLabel}>YOUR RESCUE CREW</h2><span>{view.rescued.length}/4 SAFE</span></div><div className={styles.crewList}>{LEVELS.map((person, index) => <button key={person.rescue} className={`${styles.crewMember} ${view.rescued.includes(person.rescue) ? styles.crewSafe : ""} ${index === view.level ? styles.crewCurrent : ""}`} disabled={view.phase !== "ready" || index > profile.furthestLevel} onClick={() => chooseLevel(index)} aria-label={`${person.rescue}, ${person.relation}. ${index > profile.furthestLevel ? "Locked mission" : `Choose mission ${index + 1}`}`} aria-pressed={index === view.level}><span className={styles.crewAvatar}><CrewIcon index={index} size={23} /></span><div><strong>{person.rescue}</strong><small>{person.relation}</small></div><span className={styles.crewStatus}>{view.rescued.includes(person.rescue) ? "✓" : index > profile.furthestLevel ? <svg width="13" height="15" viewBox="0 0 16 19" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><rect x="2" y="8" width="12" height="9" rx="2" /><path d="M4 8V5a4 4 0 0 1 8 0v3" /></svg> : "→"}</span></button>)}</div><p>Beat each boss to bring someone home. Unlocked missions stay ready for your next visit.</p></section>
            <section className={styles.settings}><h2 className={styles.sideLabel}>CHOOSE YOUR FLIGHT</h2><div className={styles.modePicker}>{(["cadet", "ace"] as const).map((difficulty) => <button key={difficulty} disabled={view.phase !== "ready"} aria-pressed={view.difficulty === difficulty} className={view.difficulty === difficulty ? styles.selected : ""} onClick={() => chooseDifficulty(difficulty)}>{difficulty === "cadet" ? "Space Cadet" : "Ace Pilot"}</button>)}</div><p>{view.difficulty === "cadet" ? "Slower alien shots. More room to dodge. Big adventures for little pilots." : "Quicker alien attacks for a captain who’s ready for a challenge."}</p><p className={styles.saveNote}>{storageAvailable ? "Your scores and unlocked missions stay on this browser." : "Saving is unavailable. You can still finish your adventure!"}</p></section>
          </aside>
        </div>
        <footer className={styles.footer}><Rocket size={15} /><span>MADE FOR BRADLEY. FUELED BY FAMILY.</span><span>EVERY FAMILY NEEDS A SPACE CAPTAIN.</span></footer>
      </div>
    </main>
  );
}
