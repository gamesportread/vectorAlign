import { useState } from 'react';
import { ArrowLeft, ArrowRight, Play, Rocket } from 'lucide-react';
import { useSession } from '../../store';
import { HotspotChips, sceneHotspots, SceneMap, ShipCloseup, shipHotspots, TrackSim, type Hotspot, type T } from './IntroArt';

/** 可点击的图 + 说明卡片。点过的会记下来，方便看出还有哪些没认识。 */
function Explorer({ t, items, Art }: { t: T; items: Hotspot[]; Art: typeof SceneMap }) {
  const [selected, setSelected] = useState(items[0].id);
  const [seen, setSeen] = useState(() => new Set([items[0].id]));
  const select = (id: string) => { setSelected(id); setSeen((s) => new Set(s).add(id)); };
  const current = items.find((h) => h.id === selected)!;
  return (
    <>
      <div className="intro-art"><Art t={t} selected={selected} seen={seen} onSelect={select} /></div>
      <HotspotChips items={items} selected={selected} seen={seen} onSelect={select} />
      <div className="intro-card" aria-live="polite">
        <strong>{items.indexOf(current) + 1}. {current.name}</strong>
        <p>{current.text}</p>
        <small>{t(`已认识 ${seen.size} / ${items.length}`, `Explored ${seen.size} / ${items.length}`)}</small>
      </div>
    </>
  );
}

export function IntroTour() {
  const language = useSession((s) => s.language);
  const step = useSession((s) => s.introStep);
  const t: T = (zh, en) => (language === 'zh' ? zh : en);
  const go = (n: number) => useSession.setState({ introStep: n });

  const finish = (demo: boolean) => {
    const s = useSession.getState();
    s.closeIntro();
    s.select(1);
    s.start(demo);
  };

  const steps = [
    {
      tab: t('画面里有什么', 'What’s on screen'),
      title: t('先认一认：画面里都是什么？', 'First: what is everything on screen?'),
      lead: t('这是从侧面看的示意图，和正式训练的 3D 画面一一对应。点一点图上的数字（或下面的按钮），看看每样东西是什么。', 'A side-view sketch matching the 3D training scene. Tap the numbers (or the buttons below) to see what each thing is.'),
      body: <Explorer t={t} items={sceneHotspots(t)} Art={SceneMap} />
    },
    {
      tab: t('你的飞船', 'Your ship'),
      title: t('那个“尖头”是什么？——是你的飞船', 'What is the pointy thing? Your spaceship'),
      lead: t('你的任务：开着这艘飞船，让它的“门”和空间站的“门”轻轻连在一起，这就叫“对接”。点一点飞船的各个部分。', 'Your job: fly this ship so its door joins the station’s door gently. That is called docking. Tap each part of the ship.'),
      body: <Explorer t={t} items={shipHotspots(t)} Art={ShipCloseup} />
    },
    {
      tab: t('太空里没有刹车', 'No brakes in space'),
      title: t('动手试试：太空里没有刹车片', 'Try it: there are no brake pads in space'),
      lead: t('在地上骑车，不蹬了车会慢慢停下，因为地面和空气在“拖”着它（这叫摩擦）。太空里几乎没有东西拖着飞船，松开按钮后它会一直按原来的速度飘下去。想停下，只能往反方向喷气。', 'On a bike, stop pedalling and you slowly stop because the ground and air drag on you (friction). In space almost nothing drags on the ship, so after you let go it keeps drifting at the same speed. To stop, you must fire the opposite way.'),
      body: <TrackSim t={t} mode="practice" />
    },
    {
      tab: t('为什么停在黄圈', 'Why the ring'),
      title: t('为什么第一关要停在黄圈里？', 'Why does mission 1 stop at the yellow ring?'),
      lead: t('先对比两种做法，再看下面三个原因。', 'Compare the two ways first, then read the three reasons below.'),
      body: (
        <>
          <TrackSim t={t} mode="compare" />
          <div className="intro-reasons">
            <div><b>1</b><strong>{t('先学会“停”', 'Learn to stop first')}</strong><p>{t('第一关只练一件事：在想停的地方停下来。后面每一关、每一次对接都要用到这个本领。', 'Mission 1 trains one skill: stopping exactly where you want. Every later mission and every docking needs it.')}</p></div>
            <div><b>2</b><strong>{t('真飞船也这么做', 'Real ships do this too')}</strong><p>{t('真实飞船靠近空间站时，会在几个固定的“等待点”先停一停，确认一切正常才继续靠近。黄圈就是我们的等待点。', 'Real spacecraft pause at fixed “hold points” on the way in, check everything is fine, then continue. The yellow ring is our hold point.')}</p></div>
            <div><b>3</b><strong>{t('留出安全距离', 'Leave a safety gap')}</strong><p>{t('8 米离空间站还有一段距离。就算没停准，也来得及纠正，不会一下子撞上去。', '8 m is still a safe gap. Even if you overshoot a little, there is time to fix it before hitting anything.')}</p></div>
          </div>
          <div className="intro-rule">
            <strong>{t('怎样才算过关？三件事同时做到：', 'How do you pass? All three at once:')}</strong>
            <ul>
              <li>{t('飞船在黄圈前后 0.35 米以内（大约一只手臂长）；', 'The ship is within 0.35 m of the ring (about an arm’s length);')}</li>
              <li>{t('速度小于 0.06 米/秒，也就是每秒挪动不到 6 厘米，几乎不动；', 'Speed below 0.06 m/s — under 6 cm per second, almost still;')}</li>
              <li>{t('这样稳稳地保持 1.5 秒。', 'Hold it like that for 1.5 seconds.')}</li>
            </ul>
          </div>
        </>
      )
    },
    {
      tab: t('看懂屏幕', 'Read the screen'),
      title: t('最后：屏幕上的数字和按键', 'Last: the numbers and keys'),
      lead: t('正式训练时，画面下面有四个数字，控制区有一排按钮。第一关只需要看前两个数字、用前后两个键。', 'In training there are four numbers under the scene and a row of buttons. Mission 1 only needs the first two numbers and the forward/back keys.'),
      body: (
        <>
          <div className="intro-grid">
            <div className="key"><span>{t('距对接口', 'PORT DISTANCE')}</span><p>{t('飞船离空间站的门还有几米。第一关要让它停在 8 左右。', 'How many metres to the station door. In mission 1, stop near 8.')}</p></div>
            <div className="key"><span>{t('接近速度', 'CLOSING SPEED')}</span><p>{t('每秒靠近几米。变成 0 就是停住了；负数表示在往后退。', 'Metres per second toward the door. 0 means stopped; negative means backing away.')}</p></div>
            <div><span>{t('中心偏离距离', 'LATERAL OFFSET')}</span><p>{t('离中心虚线偏了多远。第一关先不用管，第二关再练。', 'How far off the centre line. Ignore it for now; mission 2 trains it.')}</p></div>
            <div><span>{t('推进燃料', 'THRUSTER RESERVE')}</span><p>{t('每次喷气都会用掉一点燃料。用光了就无法再控制，任务失败。', 'Every puff uses fuel. If it runs out you can’t steer any more and the mission fails.')}</p></div>
          </div>
          <div className="intro-keys">
            <span><kbd>R</kbd>{t('往空间站方向加速', 'Speed up toward the station')}</span>
            <span><kbd>F</kbd>{t('刹车 / 往后退', 'Brake / back away')}</span>
            <span><kbd>{t('空格', 'Space')}</kbd>{t('自动刹车：帮你把速度减到 0（也耗燃料）', 'Assist brake: slows you to zero (uses fuel too)')}</span>
            <span><kbd>{t('拖动', 'Drag')}</kbd>{t('转动观察角度；“侧视图”最容易看清离黄圈多远', 'Turn the camera; “Side view” shows the ring distance best')}</span>
          </div>
          <p className="intro-tip">{t('小提示：画面里的标签（比如“黄圈：8 米等待点”）可以点开再看这份讲解；不想要时，点画面右上角的“标签”按钮关掉。', 'Tip: the labels in the 3D scene (like “Yellow ring: 8 m hold point”) reopen this guide. Turn them off with the “Labels” button at the top right of the scene.')}</p>
        </>
      )
    }
  ];

  const current = steps[step] ?? steps[0];
  const last = step === steps.length - 1;

  return (
    <div className="intro-tour">
      <nav className="intro-steps" aria-label={t('讲解步骤', 'Guide steps')}>
        {steps.map((s, i) => (
          <button key={i} className={i === step ? 'active' : i < step ? 'done' : ''} onClick={() => go(i)} aria-current={i === step ? 'step' : undefined}>
            <i>{i + 1}</i><span>{s.tab}</span>
          </button>
        ))}
      </nav>
      <h3>{current.title}</h3>
      <p className="intro-lead">{current.lead}</p>
      {/* key 让切换步骤时小练习重新开始 */}
      <div key={step}>{current.body}</div>
      <div className="intro-footer">
        <button className="intro-skip" onClick={() => useSession.getState().closeIntro()}>{t('跳过讲解', 'Skip guide')}</button>
        <div>
          {step > 0 && <button className="secondary-button" onClick={() => go(step - 1)}><ArrowLeft size={15} />{t('上一步', 'Back')}</button>}
          {last ? (
            <>
              <button className="secondary-button" onClick={() => finish(true)}><Play size={15} />{t('先看示范', 'Watch demo')}</button>
              <button className="primary-button" onClick={() => finish(false)}><Rocket size={16} />{t('开始第一关', 'Start mission 1')}</button>
            </>
          ) : (
            <button className="primary-button" onClick={() => go(step + 1)}>{t('下一步', 'Next')}<ArrowRight size={15} /></button>
          )}
        </div>
      </div>
    </div>
  );
}
