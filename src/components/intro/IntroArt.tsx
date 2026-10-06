import { useEffect, useRef, useState } from 'react';
import { RotateCcw, Play } from 'lucide-react';
import { DT } from '../../sim/engine';
import { createTrack, inRing, isStopped, pilotThrust, TRACK, trackStep, type TrackPilot, type TrackState } from '../../sim/intro';

export type T = (zh: string, en: string) => string;
export interface Hotspot { id: string; name: string; text: string }

/* ---------- 通用：侧面看的飞船（尖头朝左） ---------- */
function ShipSide({ x, y, s, flame = 0, hot }: { x: number; y: number; s: number; flame?: number; hot?: string }) {
  const nose = 0.53 * s, wide = 1.4 * s, cone = 2.2 * s, tail = 2.9 * s;
  const edge = (px: number) => nose + ((px - 0.1 * s) / (cone - 0.1 * s)) * (wide - nose); // 圆锥上边缘的半高
  const w1 = 0.8 * s, w2 = 1.2 * s;
  const glow = (id: string) => (hot === id ? 'intro-hot' : '');
  return (
    <g transform={`translate(${x} ${y})`}>
      {flame < 0 && <polygon className="intro-flame" points={`${tail},${-wide * 0.35} ${tail + 34 * -flame},0 ${tail},${wide * 0.35}`} />}
      {flame > 0 && [-1, 1].map((d) => (
        <polygon key={d} className="intro-flame" points={`${s * 0.5},${d * wide * 0.36} ${s * 0.5 - 30 * flame},${d * wide * 0.44} ${s * 0.5},${d * wide * 0.52}`} />
      ))}
      <rect className={`intro-ship-tail ${glow('tail')}`} x={cone} y={-wide} width={tail - cone} height={wide * 2} rx={3} />
      <polygon className={`intro-ship-body ${glow('body')}`} points={`${s * 0.1},${-nose} ${cone},${-wide} ${cone},${wide} ${s * 0.1},${nose}`} />
      <rect className={`intro-ship-nose ${glow('nose')}`} x={0} y={-nose} width={s * 0.12} height={nose * 2} rx={2} />
      <polygon className={`intro-ship-window ${glow('window')}`} points={`${w1},${-edge(w1) + 0.08 * s} ${w2},${-edge(w2) + 0.08 * s} ${w2},${-edge(w2) + 0.32 * s} ${w1},${-edge(w1) + 0.32 * s}`} />
      {[-1, 1].map((d) => (
        <rect key={d} className={`intro-ship-jet ${glow('jets')}`} x={s * 0.45} y={d > 0 ? wide * 0.36 : -wide * 0.36 - s * 0.16} width={s * 0.12} height={s * 0.16} />
      ))}
      <rect className={`intro-ship-jet ${glow('jets')}`} x={tail - s * 0.06} y={-s * 0.15} width={s * 0.12} height={s * 0.3} />
    </g>
  );
}

function Badge({ x, y, n, label, active, seen, onClick }: { x: number; y: number; n: number; label: string; active: boolean; seen: boolean; onClick: () => void }) {
  return (
    <g className={`intro-badge ${active ? 'active' : ''} ${seen ? 'seen' : ''}`} transform={`translate(${x} ${y})`} onClick={onClick}>
      <title>{label}</title>
      {!seen && <circle className="intro-badge-pulse" r={12} />}
      <circle r={11} />
      <text y={4} textAnchor="middle">{n}</text>
    </g>
  );
}

/** 图下方的名字按钮：和图上的数字一一对应，手机上也好点。 */
export function HotspotChips({ items, selected, seen, onSelect }: { items: Hotspot[]; selected: string; seen: Set<string>; onSelect: (id: string) => void }) {
  return (
    <div className="intro-chips">
      {items.map((h, i) => (
        <button key={h.id} className={`intro-chip ${selected === h.id ? 'active' : ''} ${seen.has(h.id) ? 'seen' : ''}`} onClick={() => onSelect(h.id)}>
          <i>{i + 1}</i>{h.name}
        </button>
      ))}
    </div>
  );
}

/* ---------- 第 1 步：画面里都有什么 ---------- */
export function sceneHotspots(t: T): Hotspot[] {
  return [
    { id: 'ship', name: t('你的飞船（尖头）', 'Your ship'), text: t('画面里白色、一头尖一头粗的就是你驾驶的飞船。尖的那一头是它的“门”，要和空间站的门对上。下一步会放大给你看。', 'The white shape that is narrow at one end is the spacecraft you fly. The pointy end is its door, which must meet the station’s door. Next step zooms in.') },
    { id: 'arrow', name: t('蓝色箭头', 'Blue arrow'), text: t('它表示“速度”：箭头指向飞船正在移动的方向，越长说明跑得越快。箭头消失，就说明飞船停住了。', 'It shows velocity: it points where the ship is moving, and longer means faster. When it disappears, the ship has stopped.') },
    { id: 'ring', name: t('黄圈（8 米）', 'Yellow ring (8 m)'), text: t('这个黄绿色的圈离空间站 8 米，是第一关的“停车线”，也叫“等待点”。第一关的任务就是让飞船停在这个圈里。', 'This yellow-green ring is 8 m from the station: mission 1’s stop line, called a “hold point”. Mission 1 is all about stopping inside it.') },
    { id: 'port', name: t('对接口（门）', 'Docking port'), text: t('空间站最前面的圆环，就是空间站的“门”。飞船的门和它严丝合缝地连在一起，就叫“对接”。连上以后，宇航员就能从飞船飘进空间站。', 'The ring at the very front of the station: its door. Joining the ship’s door to it tightly is called “docking”. Then astronauts can float across.') },
    { id: 'line', name: t('虚线和淡圈', 'Dashed line'), text: t('从门口笔直伸出来的虚线叫“中心线”，飞船沿着它走就能正对着门。旁边淡淡的圈是距离刻度，帮你估计还有多远。', 'The dashed “centre line” runs straight out from the door; follow it to face the door head-on. The faint circles are distance marks.') },
    { id: 'station', name: t('空间站', 'Space station'), text: t('国际空间站：在地球上空约 400 公里飞行的大型太空实验室，宇航员住在里面。画面里是它最前端的“和谐号”舱段。', 'The International Space Station: a huge lab about 400 km above Earth where astronauts live. You see its front section, called Harmony.') },
    { id: 'earth', name: t('地球（真实比例）', 'Earth (true scale)'), text: t('空间站离地面约 420 公里（大约坐 1.5 小时高铁的距离），而地球半径有 6371 公里。空间站离地面其实非常近！所以从飞船看下去，地球不是远处的一颗小球，而是一整片巨大的蓝色星球，地平线延伸横跨在视线下方。', 'The station flies about 420 km up, while Earth’s radius is 6,371 km. It is very close to the surface! Looking down, Earth is not a tiny marble in the distance, but a giant curved blue world spanning across the view below.') }
  ];
}

export function SceneMap({ t, selected, seen, onSelect }: { t: T; selected: string; seen: Set<string>; onSelect: (id: string) => void }) {
  const port = 120, m = 26, cy = 150, ship = port + 18 * m;
  const hs = sceneHotspots(t);
  const hot = (id: string) => (selected === id ? 'intro-hot' : '');
  const pick = (id: string) => () => onSelect(id);
  const ring = (z: number, cls: string) => <ellipse className={cls} cx={port + z * m} cy={cy} rx={6} ry={2 * m} />;
  const badges: [string, number, number][] = [['ship', ship + 46, cy], ['arrow', ship + 30, 92], ['ring', port + 8 * m, 84], ['port', port, 116], ['line', 712, cy], ['station', 75, cy], ['earth', 380, 282]];
  return (
    <svg className="intro-svg" viewBox="0 0 760 300" role="img" aria-label={t('场景示意图', 'Scene diagram')}>
      <defs>
        <radialGradient id="intro-earth" cx="50%" cy="0%" r="80%"><stop offset="0" stopColor="#3d7fb0" /><stop offset="1" stopColor="#0d2235" /></radialGradient>
      </defs>
      {[[60, 30], [210, 50], [470, 22], [690, 60], [600, 240], [300, 40], [170, 240], [720, 210]].map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r={1.2} fill="#cfd9df" opacity={0.6} />)}
      <g className={`intro-hit ${hot('earth')}`} onClick={pick('earth')}><circle cx={380} cy={940} r={680} fill="url(#intro-earth)" /></g>
      <g className={`intro-hit ${hot('station')}`} onClick={pick('station')}>
        <rect className="intro-panel" x={8} y={22} width={30} height={92} /><rect className="intro-panel" x={8} y={186} width={30} height={92} />
        <rect className="intro-metal" x={20} y={20} width={6} height={260} />
        <rect className="intro-metal" x={-20} y={cy - 26} width={60} height={52} />
        <rect className="intro-metal" x={40} y={cy - 30} width={70} height={60} rx={4} />
        <rect className="intro-metal dark" x={110} y={cy - 17} width={10} height={34} />
      </g>
      <g className={`intro-hit ${hot('line')}`} onClick={pick('line')}>
        <line className="intro-centre" x1={port} y1={cy} x2={750} y2={cy} />
        <line x1={port} y1={cy} x2={750} y2={cy} stroke="transparent" strokeWidth={14} />
        {ring(4, 'intro-guide')}{ring(14, 'intro-guide')}{ring(22, 'intro-guide')}
      </g>
      <g className={`intro-hit ${hot('port')}`} onClick={pick('port')}><ellipse className="intro-port" cx={port} cy={cy} rx={5} ry={19} /></g>
      <g className={`intro-hit ${hot('ring')}`} onClick={pick('ring')}>
        {ring(8, 'intro-ring')}
        <ellipse cx={port + 8 * m} cy={cy} rx={14} ry={2 * m + 6} fill="transparent" />
        <text className="intro-ring-text" x={port + 8 * m} y={cy + 2 * m + 18} textAnchor="middle">8 m</text>
      </g>
      <g className="intro-hit" onClick={pick('ship')}><ShipSide x={ship} y={cy} s={m} hot={selected === 'ship' ? 'body' : undefined} /></g>
      <g className={`intro-hit ${hot('arrow')}`} onClick={pick('arrow')}>
        <line className="intro-arrow" x1={ship + 60} y1={92} x2={ship - 6} y2={92} />
        <polygon className="intro-arrow-head" points={`${ship - 18},92 ${ship - 4},85 ${ship - 4},99`} />
        <rect x={ship - 20} y={80} width={84} height={24} fill="transparent" />
      </g>
      {badges.map(([id, x, y]) => {
        const i = hs.findIndex((h) => h.id === id);
        return <Badge key={id} x={x} y={y} n={i + 1} label={hs[i].name} active={selected === id} seen={seen.has(id)} onClick={pick(id)} />;
      })}
    </svg>
  );
}

/* ---------- 第 2 步：飞船放大看 ---------- */
export function shipHotspots(t: T): Hotspot[] {
  return [
    { id: 'nose', name: t('尖头 = 飞船的门', 'Pointy end = door'), text: t('画面里那个“头”就是这里。它是飞船的舱门，也叫“对接口”。对接时，这个门要正对着空间站的门，慢慢贴上去，然后自动锁紧。', 'That “head” you see is the hatch, also called the docking port. It must face the station’s door, touch gently, and then lock.') },
    { id: 'window', name: t('窗户', 'Window'), text: t('宇航员坐在里面可以往外看。不过对接时主要靠摄像头和屏幕上的数字。', 'Astronauts can look out, but docking mostly relies on cameras and the numbers on screen.') },
    { id: 'body', name: t('乘员舱', 'Crew cabin'), text: t('宇航员坐的地方，形状像个圆锥。整艘飞船长约 3 米，比一辆小汽车还短一点。', 'Where astronauts sit; shaped like a cone. The whole ship is about 3 m long, a bit shorter than a small car.') },
    { id: 'tail', name: t('尾部（装燃料）', 'Back (fuel)'), text: t('这里装着喷气用的燃料。燃料有限，每喷一次气都会用掉一点；用光了，就再也没法改变速度了。', 'Holds the fuel for thrusting. Fuel is limited: every puff uses some, and when it runs out you can’t change speed any more.') },
    { id: 'jets', name: t('小喷气嘴（推进器）', 'Little jets (thrusters)'), text: t('飞船身上有很多小喷气嘴，叫“推进器”。气往后喷，飞船就往前加速；气往前喷，飞船就减速或后退。你按住按钮，就是让它们喷气。', 'Small nozzles called thrusters. Gas out the back pushes the ship forward; gas out the front slows it down or backs it up. Holding a button fires them.') }
  ];
}

export function ShipCloseup({ t, selected, seen, onSelect }: { t: T; selected: string; seen: Set<string>; onSelect: (id: string) => void }) {
  const s = 80, x = 260, cy = 140;
  const hs = shipHotspots(t);
  const pick = (id: string) => () => onSelect(id);
  const badges: [string, number, number][] = [['nose', x + 6, cy], ['window', x + 80, cy - 48], ['body', x + 130, cy + 8], ['tail', x + 200, cy + 60], ['jets', x + 41, cy + 74]];
  return (
    <svg className="intro-svg" viewBox="0 0 760 280" role="img" aria-label={t('飞船放大图', 'Ship close-up')}>
      <rect className="intro-metal" x={-10} y={cy - 70} width={70} height={140} rx={6} />
      <ellipse className="intro-port" cx={62} cy={cy} rx={7} ry={44} />
      <line className="intro-centre" x1={70} y1={cy} x2={x - 4} y2={cy} />
      <text className="intro-small-text" x={30} y={cy + 92} textAnchor="middle">{t('空间站的门', 'Station door')}</text>
      <path className="intro-align-arrow" d={`M ${x - 22} ${cy - 62} L ${92} ${cy - 62}`} />
      <polygon className="intro-arrow-head lime" points={`${82},${cy - 62} ${94},${cy - 68} ${94},${cy - 56}`} />
      <text className="intro-small-text" x={(x + 70) / 2} y={cy - 74} textAnchor="middle">{t('门对门，慢慢贴上', 'Door to door, gently')}</text>
      <ShipSide x={x} y={cy} s={s} flame={selected === 'jets' ? 0.7 : 0} hot={selected} />
      <rect className="intro-hit-zone" x={x - 6} y={cy - 46} width={24} height={92} onClick={pick('nose')} />
      <rect className="intro-hit-zone" x={x + 58} y={cy - 64} width={44} height={30} onClick={pick('window')} />
      <rect className="intro-hit-zone" x={x + 100} y={cy - 40} width={72} height={80} onClick={pick('body')} />
      <rect className="intro-hit-zone" x={x + 176} y={cy - 112} width={56} height={224} onClick={pick('tail')} />
      <rect className="intro-hit-zone" x={x + 26} y={cy + 34} width={32} height={50} onClick={pick('jets')} />
      {badges.map(([id, bx, by]) => {
        const i = hs.findIndex((h) => h.id === id);
        return <Badge key={id} x={bx} y={by} n={i + 1} label={hs[i].name} active={selected === id} seen={seen.has(id)} onClick={pick(id)} />;
      })}
    </svg>
  );
}

/* ---------- 第 3、4 步：一条直线上的小练习 ---------- */
export function TrackSim({ t, mode }: { t: T; mode: 'practice' | 'compare' }) {
  const [state, setState] = useState<TrackState>(createTrack);
  const [pilot, setPilot] = useState<TrackPilot | null>(null);
  const stateRef = useRef(state), input = useRef(0), pilotRef = useRef<TrackPilot | null>(null);
  const rate = mode === 'compare' ? 3 : 1;

  const launch = (p: TrackPilot) => {
    stateRef.current = createTrack(); input.current = 0; pilotRef.current = p;
    setState(stateRef.current); setPilot(p);
  };

  useEffect(() => {
    let frame = 0, last = performance.now(), acc = 0;
    const tick = (now: number) => {
      acc += Math.min(0.25, (now - last) / 1000) * rate; last = now;
      const p = pilotRef.current;
      if (p && stateRef.current.status === 'flying') {
        while (acc >= DT) { stateRef.current = trackStep(stateRef.current, pilotThrust(p, stateRef.current, input.current)); acc -= DT; }
        setState(stateRef.current);
      } else acc = 0;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [rate]);

  useEffect(() => {
    if (mode !== 'practice') return;
    const map: Record<string, number> = { KeyR: -1, KeyF: 1 };
    const down = (e: KeyboardEvent) => { if (e.code in map) { e.preventDefault(); input.current = map[e.code]; } };
    const up = (e: KeyboardEvent) => { if (e.code in map) input.current = 0; };
    window.addEventListener('keydown', down); window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); input.current = 0; };
  }, [mode]);

  const port = 70, m = 36, cy = 118;
  const nose = port + state.x * m;
  const running = pilot !== null && state.status === 'flying';
  const arrowLen = Math.min(150, Math.abs(state.v) * 120);
  const dir = Math.sign(state.v);

  let message: string;
  if (state.status === 'crash') message = pilot === 'coast'
    ? t('砰！没人刹车，飞船一直保持原来的速度冲过去，撞上了空间站。第一关碰到空间站就算失败。', 'Bang! Nobody braked, so the ship kept its speed and hit the station. Touching the station fails mission 1.')
    : t('砰！撞上空间站了。松开按钮飞船不会停，要提前按“刹车”。', 'Bang! Releasing the button doesn’t stop the ship. Brake earlier.');
  else if (state.status === 'lost') message = t('刹车太猛，飞船倒着飘走了。快停住的时候，要轻轻地、短短地按。', 'Braked too hard, so the ship drifted backward. Use short, gentle taps near the end.');
  else if (state.status === 'success') message = pilot === 'auto'
    ? t('离黄圈还有 4 米多就开始刹车，速度慢慢变成 0，正好停在圈里。', 'Braking starts over 4 m before the ring, so the speed reaches zero right inside it.')
    : t('漂亮！你在黄圈里停稳了——第一关就是这样过的。', 'Nice! You stopped in the ring — that is exactly how mission 1 is won.');
  else if (!pilot) message = mode === 'practice'
    ? t('点“开始练习”。飞船会自己往空间站飘，你按住“刹车”让它停在黄圈里。', 'Press “Start practice”. The ship drifts toward the station; hold “Brake” to stop it in the ring.')
    : t('选一种做法，看看会发生什么（3 倍速播放）。', 'Pick one and watch what happens (3× speed).');
  else if (state.hold > 0) message = t(`在圈里停住了，保持住… ${state.hold.toFixed(1)} / ${TRACK.hold} 秒`, `Stopped in the ring, hold it… ${state.hold.toFixed(1)} / ${TRACK.hold} s`);
  else if (inRing(state) && !isStopped(state)) message = t('已经在黄圈里了，但还没停住。', 'Inside the ring, but still moving.');
  else if (state.thrust === 0 && !isStopped(state)) message = t('没按按钮，可飞船还在动——这就是“惯性”：东西会保持原来的运动，不会自己停。', 'No button pressed, yet the ship keeps moving — that’s inertia: things keep doing what they were doing.');
  else if (state.thrust > 0) message = t('气从前面喷出来，速度在变小……', 'Gas out the front: speed is dropping…');
  else message = t('气从后面喷出来，飞船在加速靠近！', 'Gas out the back: the ship speeds up toward the station!');

  const hold = (v: number) => ({
    onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => { e.currentTarget.setPointerCapture(e.pointerId); input.current = v; },
    onPointerUp: () => { input.current = 0; }, onPointerCancel: () => { input.current = 0; }, onLostPointerCapture: () => { input.current = 0; }
  });

  return (
    <div className={`intro-track ${state.status}`}>
      <svg className="intro-svg" viewBox="0 0 720 232" role="img" aria-label={t('一条直线上的练习', 'One-line practice')}>
        <rect className={`intro-metal ${state.status === 'crash' ? 'crashed' : ''}`} x={-10} y={cy - 62} width={72} height={124} rx={5} />
        <rect className="intro-metal dark" x={62} y={cy - 24} width={8} height={48} />
        <line className="intro-centre" x1={port} y1={cy} x2={720} y2={cy} />
        <rect className="intro-ring-band" x={port + (TRACK.target - TRACK.tolerance) * m} y={cy - 74} width={TRACK.tolerance * 2 * m} height={148} />
        <ellipse className="intro-ring" cx={port + TRACK.target * m} cy={cy} rx={7} ry={72} />
        {Array.from({ length: 9 }, (_, i) => i * 2).map((d) => (
          <g key={d}><line className="intro-tick" x1={port + d * m} y1={206} x2={port + d * m} y2={212} /><text className="intro-small-text" x={port + d * m} y={228} textAnchor="middle">{d}{d === 16 ? t(' 米', ' m') : ''}</text></g>
        ))}
        <ShipSide x={nose} y={cy} s={m} flame={running ? state.thrust : 0} />
        {Math.abs(state.v) > 0.005 && (
          <g>
            <line className="intro-arrow" x1={nose + 52} y1={cy - 64} x2={nose + 52 + dir * arrowLen} y2={cy - 64} />
            <polygon className="intro-arrow-head" transform={`translate(${nose + 52 + dir * (arrowLen + 6)} ${cy - 64}) scale(${-dir} 1)`} points="-8,0 6,-7 6,7" />
          </g>
        )}
      </svg>
      <div className="intro-readout">
        <span><small>{t('离门', 'To door')}</small><b>{state.x.toFixed(2)}</b> {t('米', 'm')}</span>
        <span className={isStopped(state) ? 'ok' : ''}><small>{t('靠近速度', 'Closing speed')}</small><b>{(-state.v).toFixed(2)}</b> {t('米/秒', 'm/s')}</span>
        <span className={inRing(state) ? 'ok' : ''}><small>{t('在黄圈里？', 'In the ring?')}</small><b>{inRing(state) ? t('是', 'Yes') : t('否', 'No')}</b></span>
      </div>
      <p className="intro-track-msg" aria-live="polite">{message}</p>
      <div className="intro-track-controls">
        {mode === 'practice' ? (
          <>
            <button className="secondary-button" onClick={() => launch('manual')}>
              {pilot ? <RotateCcw size={15} /> : <Play size={15} />}{pilot ? t('重来', 'Retry') : t('开始练习', 'Start practice')}
            </button>
            <button className="intro-thrust" disabled={!running} {...hold(-1)}>◀ {t('加速靠近', 'Speed up')} <kbd>R</kbd></button>
            <button className="intro-thrust brake" disabled={!running} {...hold(1)}>{t('刹车', 'Brake')} ▶ <kbd>F</kbd></button>
          </>
        ) : (
          <>
            <button className={`secondary-button ${pilot === 'coast' ? 'picked' : ''}`} onClick={() => launch('coast')}><Play size={15} />{t('一直不刹车会怎样？', 'What if I never brake?')}</button>
            <button className={`secondary-button ${pilot === 'auto' ? 'picked' : ''}`} onClick={() => launch('auto')}><Play size={15} />{t('看正确做法', 'Show the right way')}</button>
          </>
        )}
      </div>
    </div>
  );
}
