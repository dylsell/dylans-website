"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { drawArena } from "./lib/arena";
import { HockeyAudio } from "./lib/audio";
import { advanceRound, canShoot, clamp, createGame, GameEvent, shoot, stepGame } from "./lib/game";
import { Difficulty, ROUNDS, WORLD } from "./lib/types";
import styles from "./rink.module.css";

interface Profile { career: number; cups: number; bestStreak: number; jersey: number; muted: boolean }
const DEFAULT_PROFILE: Profile = { career: 0, cups: 0, bestStreak: 0, jersey: 7, muted: false };
const PROFILE_KEY = "bradley-hockey-profile-v2";
const positive = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
function loadProfile(): Profile {
  let legacyCareer = 0;
  let saved: Partial<Profile> = {};
  try { legacyCareer = positive(Number(localStorage.getItem("hockey-career-goals"))); } catch {}
  try {
    const value = JSON.parse(localStorage.getItem(PROFILE_KEY) || "{}");
    if (value && typeof value === "object") saved = value;
  } catch {}
  return { career: Math.max(positive(saved.career), legacyCareer),
    cups: positive(saved.cups), bestStreak: positive(saved.bestStreak),
    jersey: [7, 19, 77].includes(saved.jersey ?? 0) ? saved.jersey! : 7, muted: saved.muted === true };
}
function Bolt({ className = "" }: { className?: string }) {
  return <svg className={className} width="24" height="28" viewBox="0 0 24 28" fill="currentColor" aria-hidden="true"><path d="M14 0 1 16h9L7 28l16-18H13z" /></svg>;
}
function Trophy({ className = "" }: { className?: string }) {
  return <svg className={className} width="28" height="28" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M9 4h14v9a7 7 0 0 1-14 0V4ZM9 7H4v4c0 4 3 6 6 6m13-10h5v4c0 4-3 6-6 6M16 20v7m-6 1h12" /></svg>;
}

export default function HockeyGame() {
  const game = useRef(createGame());
  const profileRef = useRef<Profile>({ ...DEFAULT_PROFILE });
  const [view, setView] = useState(() => createGame());
  const [profile, setProfile] = useState<Profile>({ ...DEFAULT_PROFILE });
  const [message, setMessage] = useState("Your name on the jersey. Your crowd in the stands.");
  const [fullScreen, setFullScreen] = useState(false);
  const [storageAvailable, setStorageAvailable] = useState(true);
  const [canvasAvailable, setCanvasAvailable] = useState(true);
  const canvas = useRef<HTMLCanvasElement>(null);
  const arena = useRef<HTMLDivElement>(null);
  const audio = useRef<HockeyAudio | null>(null);
  const keys = useRef(new Set<string>());
  const aimPointer = useRef<number | null>(null);
  const reducedMotion = useRef(false);

  const saveProfile = useCallback((patch: Partial<Profile>) => {
    const next = { ...profileRef.current, ...patch };
    profileRef.current = next;
    setProfile(next);
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(next));
      localStorage.setItem("hockey-career-goals", String(next.career));
    } catch { setStorageAvailable(false); }
  }, []);
  const refresh = useCallback(() => setView({ ...game.current }), []);
  const beginCharge = useCallback(() => {
    audio.current?.unlock();
    if (canShoot(game.current)) { game.current.charging = true; refresh(); }
  }, [refresh]);
  const releaseShot = useCallback(() => {
    if (!game.current.charging) return;
    if (shoot(game.current)) audio.current?.play("shot");
    refresh();
  }, [refresh]);
  const pause = useCallback(() => {
    const g = game.current;
    if (g.phase !== "playing") return;
    g.phase = "paused";
    g.charging = false;
    g.charge = 0;
    keys.current.clear();
    aimPointer.current = null;
    audio.current?.stop();
    refresh();
  }, [refresh]);

  useEffect(() => {
    const surface = canvas.current;
    const ctx = surface?.getContext("2d");
    if (!surface || !ctx) {
      const frame = requestAnimationFrame(() => setCanvasAvailable(false));
      return () => cancelAnimationFrame(frame);
    }
    const sound = new HockeyAudio();
    audio.current = sound;
    const loaded = loadProfile();
    profileRef.current = loaded;
    sound.setMuted(loaded.muted);
    const portrait = new window.Image();
    portrait.src = "/bradley/hoodie.png";
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedMotion.current = media.matches;
    const onMotionChange = () => { reducedMotion.current = media.matches; };
    media.addEventListener("change", onMotionChange);
    const resize = () => {
      const width = surface.getBoundingClientRect().width;
      const ratio = Math.min(window.devicePixelRatio || 1, 2.5);
      surface.width = Math.round(width * ratio);
      surface.height = Math.round(width * WORLD.height / WORLD.width * ratio);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(surface);
    resize();
    let lastTime = 0;
    let lastHud = 0;
    let animation = 0;
    let firstFrame = true;
    let ambienceTime = 0;
    const announceEvent = (event: GameEvent) => {
      const g = game.current;
      if (event.type === "goal") {
        saveProfile({ career: profileRef.current.career + 1, bestStreak: Math.max(profileRef.current.bestStreak, g.bestStreak) });
        const text = event.hatTrick ? "Hat trick, Bradley! Three goals. One superstar." : event.power ? "What a rocket, Bradley!" : ["Bradley scores! This is your ice.", "Top shot, Captain Bradley!", "The Tampa crowd is on its feet!"][g.totalGoals % 3];
        setMessage(text);
        sound.play("goal");
        sound.announce(event.hatTrick ? "A hat trick for Bradley Sellberg! The crowd goes wild!" : event.power ? "Bradley with the lightning shot! What a goal!" : `Goal! Bradley Sellberg scores for Tampa Bay! ${g.totalGoals === 1 ? "That's your first of the night!" : "Go Bradley!"}`);
      } else if (event.type === "save" || event.type === "post") {
        sound.play(event.type);
        setMessage(event.type === "post" ? "So close! Aim a little inside the red posts." : "Nice try, Bradley. Find the open corner!");
      } else if (event.type === "round") {
        sound.announce(`Great skating, Bradley! ${ROUNDS[g.round + 1].name} is up next.`);
      } else {
        saveProfile({ cups: profileRef.current.cups + 1 });
        sound.play("win");
        sound.announce("Captain Bradley Sellberg, you are the champion! Lift that cup! Tampa Bay is cheering for you!");
        setMessage("Your arena. Your team. Your cup.");
      }
      refresh();
    };
    const animate = (now: number) => {
      const dt = lastTime ? Math.min((now - lastTime) / 1000, 0.05) : 0;
      lastTime = now;
      if (firstFrame) { setProfile(loaded); firstFrame = false; }
      const g = game.current;
      if (!document.hidden && g.phase !== "paused") ambienceTime += dt;
      if (g.phase === "playing") {
        const horizontal = Number(keys.current.has("ArrowRight") || keys.current.has("KeyD")) - Number(keys.current.has("ArrowLeft") || keys.current.has("KeyA"));
        const vertical = Number(keys.current.has("ArrowDown") || keys.current.has("KeyS")) - Number(keys.current.has("ArrowUp") || keys.current.has("KeyW"));
        g.aimX = clamp(g.aimX + horizontal * dt * 210, WORLD.netLeft + 6, WORLD.netRight - 6);
        g.aimY = clamp(g.aimY + vertical * dt * 120, WORLD.netTop + 6, WORLD.netBottom - 10);
      }
      stepGame(g, dt).forEach(announceEvent);
      ctx.setTransform(surface.width / WORLD.width, 0, 0, surface.height / WORLD.height, 0, 0);
      drawArena(ctx, { time: ambienceTime, phase: g.phase, playerX: g.playerX, goalieX: g.goalieX, goalieLean: g.goalieLean,
        aimX: g.aimX, aimY: g.aimY, charge: g.charge, flight: g.flight, celebration: g.celebration,
        hatTrick: g.hatTrick, jersey: profileRef.current.jersey, round: g.round, goals: g.goals, reducedMotion: reducedMotion.current }, portrait.complete && portrait.naturalWidth ? portrait : null);
      if (now - lastHud > 90) { refresh(); lastHud = now; }
      animation = requestAnimationFrame(animate);
    };
    animation = requestAnimationFrame(animate);
    const onVisibility = () => { if (document.hidden) pause(); };
    const onFullScreen = () => setFullScreen(Boolean(document.fullscreenElement));
    document.addEventListener("visibilitychange", onVisibility);
    document.addEventListener("fullscreenchange", onFullScreen);
    window.addEventListener("blur", pause);
    return () => {
      cancelAnimationFrame(animation);
      observer.disconnect();
      media.removeEventListener("change", onMotionChange);
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("fullscreenchange", onFullScreen);
      window.removeEventListener("blur", pause);
      sound.dispose();
      audio.current = null;
    };
  }, [pause, refresh, saveProfile]);

  useEffect(() => {
    const keyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest("input, textarea, select") || target.isContentEditable) return;
      if (event.code === "Escape" || event.code === "KeyP") { pause(); return; }
      if (game.current.phase !== "playing") return;
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "KeyW", "KeyA", "KeyS", "KeyD"].includes(event.code)) {
        event.preventDefault(); keys.current.add(event.code);
      }
      // Focused buttons keep their native keyboard action; the main rink also supports Space.
      if (event.code === "Space" && !target.closest("button, a")) { event.preventDefault(); if (!event.repeat) beginCharge(); }
    };
    const keyUp = (event: KeyboardEvent) => {
      keys.current.delete(event.code);
      if (event.code === "Space" && game.current.charging) { event.preventDefault(); releaseShot(); }
    };
    window.addEventListener("keydown", keyDown);
    window.addEventListener("keyup", keyUp);
    return () => { window.removeEventListener("keydown", keyDown); window.removeEventListener("keyup", keyUp); };
  }, [beginCharge, pause, releaseShot]);

  function start() {
    const difficulty = game.current.difficulty;
    game.current = createGame(difficulty);
    game.current.phase = "playing";
    audio.current?.unlock();
    audio.current?.play("start");
    audio.current?.announce(`Now taking the ice for Tampa Bay, number ${profileRef.current.jersey}, Captain Bradley Sellberg! Let's score some goals!`);
    setMessage("Let's go, Bradley! Pick a corner and let it fly.");
    refresh();
    canvas.current?.focus();
  }
  function resume() {
    game.current.phase = "playing";
    audio.current?.unlock();
    refresh();
    canvas.current?.focus();
  }
  function nextRound() {
    advanceRound(game.current);
    audio.current?.unlock();
    audio.current?.play("start");
    audio.current?.announce(ROUNDS[game.current.round].cue);
    setMessage(ROUNDS[game.current.round].cue);
    refresh();
    canvas.current?.focus();
  }
  function aimAt(event: React.PointerEvent<HTMLCanvasElement>) {
    if (game.current.phase !== "playing" || aimPointer.current !== event.pointerId) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width * WORLD.width;
    const y = (event.clientY - rect.top) / rect.height * WORLD.height;
    game.current.aimX = clamp(x, WORLD.netLeft + 6, WORLD.netRight - 6);
    // Below the goal, keep aiming at a useful height so small hands can steer from the ice.
    game.current.aimY = y < WORLD.netBottom + 40 ? clamp(y, WORLD.netTop + 6, WORLD.netBottom - 10) : 255;
  }
  function chooseCorner(x: number) {
    game.current.aimX = x;
    game.current.aimY = 239;
    refresh();
    canvas.current?.focus();
  }
  function chooseDifficulty(difficulty: Difficulty) {
    game.current.difficulty = difficulty;
    refresh();
  }
  async function toggleFullScreen() {
    if (document.fullscreenElement) { await document.exitFullscreen().catch(() => {}); return; }
    if (arena.current?.requestFullscreen) await arena.current.requestFullscreen().catch(() => setMessage("Fullscreen isn't available here. Your rink is ready below."));
    else setMessage("Turn your screen sideways for a bigger view of the ice.");
  }
  function toggleSound() {
    const muted = !profileRef.current.muted;
    audio.current?.setMuted(muted);
    if (!muted) audio.current?.unlock();
    saveProfile({ muted });
  }

  const round = ROUNDS[view.round];
  const playing = view.phase === "playing";
  const ready = playing && !view.flight && view.cooldown <= 0;
  const accuracy = view.shots ? Math.round(view.totalGoals / view.shots * 100) : 0;
  const isOverlay = view.phase !== "playing";

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.topbar}>
          <Link href="/personal/kids" className={styles.back}>← <span>Bradley’s games</span></Link>
          <div className={styles.club}><Bolt /> <span>THE BRADLEY HOCKEY CLUB</span></div>
          <button className={styles.sound} onClick={toggleSound} aria-label={profile.muted ? "Turn sound on" : "Mute sound"} aria-pressed={!profile.muted}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M11 4 5 9H2v6h3l6 5V4Z" />{profile.muted ? <path d="m16 9 6 6m0-6-6 6" /> : <><path d="M15 8a6 6 0 0 1 0 8M18 4a11 11 0 0 1 0 16" /></>}</svg>
            <span>Sound {profile.muted ? "off" : "on"}</span>
          </button>
        </header>
        <div className={styles.heading}>
          <div><p className={styles.eyebrow}><span /> TAMPA BAY’S NEXT BIG THING</p><h1>Bradley’s <span>Lightning Hockey.</span></h1></div>
          <p className={styles.headlineNote}>Little skater. Big arena.<br /><strong>A whole crowd cheering for you.</strong></p>
        </div>
        <div className={styles.layout}>
          <section className={styles.gameColumn} aria-label="Hockey game">
            <div className={styles.journey} aria-label="Road to the cup">
              {ROUNDS.map((item, index) => <div key={item.name} className={`${styles.journeyStep} ${index === view.round ? styles.currentStep : ""} ${index < view.round || view.phase === "won" ? styles.doneStep : ""}`} aria-current={index === view.round ? "step" : undefined}><span>{index < view.round || view.phase === "won" ? "✓" : `0${index + 1}`}</span><div><small>{index === 2 ? "BRING IT HOME" : index === 1 ? "LIGHT IT UP" : "WARM UP"}</small><strong>{item.name}</strong></div>{index === 2 && <Trophy />}</div>)}
            </div>
            <div ref={arena} className={styles.arenaWrap}>
              <div className={styles.scoreboard}>
                <div className={styles.team}><span className={styles.teamBadge}><Bolt /></span><div><small>CAPTAIN BRADLEY</small><strong>TAMPA BAY</strong></div></div>
                <div className={styles.score}><strong>{view.goals}</strong><span>/ {round.goal}<small>GOALS</small></span></div>
                <div className={styles.roundLabel}><span className={styles.liveDot} /><div><strong>{round.name}</strong><small>ROUND {view.round + 1} OF 3</small></div></div>
                <div className={styles.arenaTools}>
                  {playing && <button onClick={pause} aria-label="Pause game" title="Pause (P)">Ⅱ</button>}
                  <button onClick={toggleFullScreen} aria-label={fullScreen ? "Exit fullscreen" : "Enter fullscreen"} title="Fullscreen">⛶</button>
                </div>
              </div>
              <div className={styles.canvasWrap}>
                <canvas ref={canvas} className={styles.canvas} width={WORLD.width} height={WORLD.height} tabIndex={0}
                  aria-label="Bradley's hockey rink. Aim with arrow keys or drag on the ice. Hold Space to charge, release to shoot. You can also use the corner and Shoot buttons below."
                  onPointerDown={event => { if (!playing) return; aimPointer.current = event.pointerId; event.currentTarget.setPointerCapture(event.pointerId); event.currentTarget.focus(); aimAt(event); }}
                  onPointerMove={aimAt} onPointerUp={() => { aimPointer.current = null; }} onPointerCancel={() => { aimPointer.current = null; }}>
                  Use the corner buttons to aim and the Shoot button to take a shot.
                </canvas>
                {playing && !view.result && <div className={styles.rinkTag}><span /> {view.charge >= 0.7 ? "LIGHTNING SHOT READY" : view.flight ? "LET IT FLY" : "YOUR ICE, BRADLEY"}</div>}
                {playing && view.result && <div className={`${styles.result} ${view.result === "goal" ? styles.goalResult : ""}`} key={`${view.shots}-${view.result}`}><small>{view.result === "goal" ? view.hatTrick ? "THREE GOALS. ONE CAPTAIN." : view.flight && view.flight.power >= 0.7 ? "LIGHTNING SHOT" : "BRADLEY SELLBERG" : "YOU’VE GOT THIS, BRADLEY"}</small><strong>{view.result === "goal" ? view.hatTrick ? "HAT TRICK!" : "GOOOAL!" : view.result === "post" ? "SO CLOSE!" : "NICE TRY!"}</strong><span>{view.result === "goal" ? "The crowd goes wild." : "Find a corner. Go again."}</span></div>}
                {isOverlay && <div className={`${styles.overlay} ${view.phase === "lobby" ? styles.lobbyOverlay : ""}`}>
                  {view.phase === "lobby" ? <div className={styles.intro}>
                    <div className={styles.ticket}>PLAYER ONE <span>★</span> BRADLEY SELLBERG</div>
                    <h2>Your ice.<br />Your <em>moment.</em></h2>
                    <p>Pull on your Lightning jersey.<br />Score hat tricks. Bring home the cup.</p>
                    <button className={styles.primary} onClick={start} disabled={!canvasAvailable}>Let’s play, Bradley <Bolt /></button>
                    <span className={styles.noPressure}>Three rounds. Unlimited tries. All you.</span>
                  </div> : view.phase === "paused" ? <div className={styles.intermission}>
                    <span className={styles.overlayIcon}><Bolt /></span><p className={styles.eyebrow}>A QUICK WATER BREAK</p><h2>Your ice is waiting.</h2><p>Take your time, Captain.</p><button className={styles.primary} onClick={resume}>Back to the ice <span>→</span></button>
                  </div> : view.phase === "round" ? <div className={styles.intermission}>
                    <span className={styles.overlayIcon}><Bolt /></span><p className={styles.eyebrow}>HAT TRICK COMPLETE</p><h2>That’s our captain!</h2><p>{view.round === 0 ? "Home ice is yours. Time for all-star night." : "One more round. The cup is waiting, Bradley."}</p>
                    <div className={styles.roundStats}><span><strong>{view.totalGoals}</strong>goals tonight</span><span><strong>{view.bestStreak}</strong>best streak</span></div>
                    <button className={styles.primary} onClick={nextRound}>Next: {ROUNDS[view.round + 1].name} <span>→</span></button>
                  </div> : <div className={styles.intermission}>
                    <span className={`${styles.overlayIcon} ${styles.cupIcon}`}><Trophy /></span><p className={styles.eyebrow}>YOUR NAME GOES ON THE CUP</p><h2>Champion Bradley!</h2><p>Number {profile.jersey}. Captain. Tampa Bay’s star.</p>
                    <div className={styles.roundStats}><span><strong>{view.totalGoals}</strong>goals</span><span><strong>{accuracy}%</strong>scoring rate</span><span><strong>{view.powerGoals}</strong>power goals</span></div>
                    <button className={styles.primary} onClick={start}>Take another victory lap <Bolt /></button>
                  </div>}
                </div>}
                {!canvasAvailable && <div className={styles.canvasError}>The rink couldn’t load in this browser. Try reloading the page or opening it in another browser.</div>}
              </div>
              <div className={styles.controls}>
                <div className={styles.aimControls}><span>AIM FOR A CORNER</span><div><button disabled={!playing} onClick={() => chooseCorner(436)} aria-label="Aim at left corner">↖ <span>Left</span></button><button disabled={!playing} onClick={() => chooseCorner(664)} aria-label="Aim at right corner"><span>Right</span> ↗</button></div></div>
                <button className={`${styles.shoot} ${view.charge >= 0.7 ? styles.powerShot : ""}`} disabled={!ready}
                  onPointerDown={event => { if (event.button !== 0) return; event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); beginCharge(); }}
                  onPointerUp={releaseShot} onPointerCancel={() => { game.current.charging = false; game.current.charge = 0; refresh(); }}
                  onBlur={() => { game.current.charging = false; game.current.charge = 0; refresh(); }}
                  onLostPointerCapture={() => { if (game.current.charging) { game.current.charging = false; game.current.charge = 0; refresh(); } }}
                  onKeyDown={event => { if ((event.code === "Space" || event.code === "Enter") && !event.repeat) { event.preventDefault(); beginCharge(); } }}
                  onKeyUp={event => { if (event.code === "Space" || event.code === "Enter") { event.preventDefault(); releaseShot(); } }}
                  onClick={event => { if (event.detail === 0 && !game.current.flight) { beginCharge(); releaseShot(); } }}>
                  <span className={styles.chargeFill} style={{ width: `${view.charge * 100}%` }} /><Bolt /><span>{view.charge >= 0.7 ? "LET IT FLY!" : view.charging ? "POWERING UP…" : !playing ? "READY WHEN YOU ARE" : view.flight ? "NICE SHOT, CAPTAIN" : "SHOOT!"}<small>{view.charging ? "Release for a lightning shot" : "Tap to shoot · hold for power"}</small></span><span className={styles.keycap}>SPACE</span>
                </button>
              </div>
            </div>
            <div className={styles.commentary} role="status" aria-live="polite"><span className={styles.mic}>◉</span><p>{message}</p>{playing && view.streak >= 2 && <strong>{view.streak} GOAL STREAK</strong>}</div>
            <p className={styles.instructions}>Click or drag to aim <span>·</span> Arrow keys to move your shot <span>·</span> Hold & release Space to shoot <span>·</span> P to pause</p>
          </section>
          <aside className={styles.sidebar} aria-label="Bradley's player card and trophy room">
            <section className={styles.playerCard}>
              <div className={styles.cardTop}><span>THE HOME TEAM HERO</span><Bolt /></div>
              <div className={styles.portrait}><span className={styles.bigNumber}>{profile.jersey}</span><div className={styles.portraitHalo} /><Image src="/bradley/hoodie.png" alt="Bradley, captain of his Tampa Bay hockey team" width={250} height={350} priority /><span className={styles.captainBadge}>C</span><div className={styles.nameplate}><span>TAMPA BAY • #{profile.jersey}</span><h2>BRADLEY<br />SELLBERG</h2></div></div>
              <div className={styles.jerseyPicker}><span>YOUR JERSEY NUMBER</span><div>{[7, 19, 77].map(number => <button key={number} onClick={() => saveProfile({ jersey: number })} aria-label={`Jersey number ${number}`} aria-pressed={profile.jersey === number} className={profile.jersey === number ? styles.selected : ""}>{number}</button>)}</div></div>
              <div className={styles.careerStats}><div><strong>{profile.career}</strong><span>CAREER GOALS</span></div><div><strong>{profile.cups}</strong><span>CUPS WON</span></div></div>
            </section>
            <section className={styles.modeCard}><p className={styles.sideLabel}>YOUR KIND OF GAME</p><div className={styles.modePicker}><button disabled={view.phase !== "lobby" && view.phase !== "won"} aria-pressed={view.difficulty === "rookie"} onClick={() => chooseDifficulty("rookie")} className={view.difficulty === "rookie" ? styles.activeMode : ""}>Rookie</button><button disabled={view.phase !== "lobby" && view.phase !== "won"} aria-pressed={view.difficulty === "allstar"} onClick={() => chooseDifficulty("allstar")} className={view.difficulty === "allstar" ? styles.activeMode : ""}>All-star</button></div><p>{view.difficulty === "rookie" ? "Big openings. Happy skating. A great place to start." : "A quicker goalie. A bigger challenge. Same superstar."}</p></section>
            <section className={styles.trophyRoom}><div className={styles.trophyTitle}><p className={styles.sideLabel}>THE TROPHY SHELF</p><Trophy /></div><div className={styles.badges}>
              <div className={profile.career > 0 ? styles.earned : ""}><span><Bolt /></span><strong>First goal</strong><small>{profile.career > 0 ? "IT STARTED HERE" : "SCORE YOUR FIRST"}</small></div>
              <div className={profile.bestStreak >= 3 ? styles.earned : ""}><span>3</span><strong>On fire</strong><small>{profile.bestStreak >= 3 ? "THREE IN A ROW" : "GET A 3-GOAL STREAK"}</small></div>
              <div className={profile.cups > 0 ? styles.earned : ""}><span><Trophy /></span><strong>Champion</strong><small>{profile.cups > 0 ? "CUP IN THE CABINET" : "WIN ALL 3 ROUNDS"}</small></div>
            </div><p className={styles.saveNote}>{storageAvailable ? "Your story stays saved on this device." : "Saving is unavailable. You can still play this session."}</p></section>
          </aside>
        </div>
        <footer className={styles.footer}><Bolt /><span>BUILT FOR BRADLEY. POWERED BY A LITTLE LIGHTNING.</span><span>HOME ICE ADVANTAGE, ALWAYS.</span></footer>
      </div>
    </main>
  );
}
