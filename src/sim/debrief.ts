import type { FlightRecord, Language, Failure, SimulationState } from './types';
import { angleError, lateralError, lateralSpeed } from './engine';
import { formatTime } from '../utils/formatters';

export interface DebriefMetricItem {
  id: string;
  name: string;
  valueText: string;
  limitText: string;
  passed: boolean;
  comment: string;
}

export interface DebriefAnalysis {
  isSuccess: boolean;
  scenarioId: number;
  reason?: Failure;
  badgeTitle: string;
  badgeType: 'success' | 'collision' | 'overspeed' | 'drift' | 'alignment' | 'fuel' | 'escape' | 'timeout';
  headline: string;
  causeExplanation: string;
  physicsInsight: string;
  pilotTips: string[];
  metrics: DebriefMetricItem[];
}

export function analyzeFlight(record: FlightRecord, language: Language): DebriefAnalysis {
  const isZh = language === 'zh';
  const t = (zh: string, en: string) => (isZh ? zh : en);
  const cfg = record.config;
  const res = record.result;
  const isSuccess = res?.status === 'success';
  const reason = res?.reason;
  const samples = record.samples;
  const finalSample = samples[samples.length - 1];

  const timeElapsed = res?.time ?? finalSample?.time ?? 0;
  const fuelRemaining = res?.fuel ?? finalSample?.fuel ?? 0;
  const finalDistance = res ? res.position[2] : finalSample ? finalSample.distance : 0;
  const finalSpeed = res ? Math.hypot(...res.velocity) : finalSample ? finalSample.speed : 0;
  const finalLateral = res ? lateralError(res) : finalSample ? finalSample.lateral : 0;
  const finalAngle = res ? angleError(res) : finalSample ? finalSample.angle : 0;

  // 1. 构建指标对比表
  const metrics: DebriefMetricItem[] = [];

  // 指标 A: 终点距离 / 停泊位置
  if (cfg.id === 1) {
    const distDiff = Math.abs(finalDistance - cfg.targetZ);
    const distPass = distDiff <= cfg.positionTolerance;
    metrics.push({
      id: 'distance',
      name: t('停泊点距离', 'Hold Point Distance'),
      valueText: `${finalDistance.toFixed(2)} m`,
      limitText: `${cfg.targetZ.toFixed(2)} m (±${cfg.positionTolerance} m)`,
      passed: distPass,
      comment: distPass
        ? t('精准停在黄圈内', 'Stopped accurately within yellow ring')
        : finalDistance < cfg.targetZ
        ? t('冲过了停泊点', 'Overshot past hold point')
        : t('尚未进入停泊圈', 'Not yet reached hold ring')
    });
  } else {
    const distPass = cfg.id === 4 ? finalDistance <= 0.35 : Math.abs(finalDistance - cfg.targetZ) <= cfg.positionTolerance;
    metrics.push({
      id: 'distance',
      name: t('对接口距离', 'Port Distance'),
      valueText: `${finalDistance.toFixed(2)} m`,
      limitText: cfg.id === 4 ? `≤ 0.35 m` : `${cfg.targetZ.toFixed(2)} m`,
      passed: distPass,
      comment: distPass ? t('进入对接捕获区', 'Inside capture envelope') : t('未达标', 'Outside capture envelope')
    });
  }

  // 指标 B: 接触 / 相对速度
  const speedPass = finalSpeed <= cfg.speedTolerance;
  metrics.push({
    id: 'speed',
    name: t('相对合速度', 'Relative Speed'),
    valueText: `${finalSpeed.toFixed(2)} m/s`,
    limitText: `≤ ${cfg.speedTolerance.toFixed(2)} m/s`,
    passed: speedPass,
    comment: speedPass
      ? t('速度安全平稳', 'Safe approach speed')
      : finalSpeed > cfg.speedTolerance * 3
      ? t('严重超速！危险冲击', 'Severe overspeed! Dangerous impact')
      : t('超过安全允许速度', 'Exceeded safe speed limit')
  });

  // 指标 C: 横向偏移 (关卡 2/4 重点)
  const lateralPass = finalLateral <= cfg.positionTolerance;
  metrics.push({
    id: 'lateral',
    name: t('横向中心偏移', 'Lateral Offset'),
    valueText: `${finalLateral.toFixed(2)} m`,
    limitText: `≤ ${cfg.positionTolerance.toFixed(2)} m`,
    passed: lateralPass,
    comment: lateralPass
      ? t('对准走廊中轴线', 'Aligned with centerline')
      : t('偏向侧方，未完全居中', 'Drifted sideways, off-center')
  });

  // 指标 D: 姿态偏角 (关卡 3/4 重点)
  const anglePass = finalAngle <= cfg.angleTolerance;
  metrics.push({
    id: 'angle',
    name: t('姿态偏差角度', 'Attitude Angle Error'),
    valueText: `${finalAngle.toFixed(1)}°`,
    limitText: `≤ ${cfg.angleTolerance.toFixed(1)}°`,
    passed: anglePass,
    comment: anglePass
      ? t('接口平行对正', 'Ports parallel & aligned')
      : t('接口角度倾斜', 'Ports tilted, outside latch angle')
  });

  // 2. 判定诊断原因与通俗解析
  if (isSuccess) {
    return {
      isSuccess: true,
      scenarioId: cfg.id,
      badgeTitle: t('任务圆满完成', 'Mission Accomplished'),
      badgeType: 'success',
      headline: t('完成得很好。', 'Mission accomplished.'),
      causeExplanation: t(
        '教科书级的平稳操作！所有关键指标（距离、速度、横向偏航和姿态角度）均严格处于安全捕获公差内，飞船平稳达到目标条件。',
        'Textbook flight execution! All critical parameters remained strictly within capture limits.'
      ),
      physicsInsight: t(
        '你成功掌握了太空中“动量控制”的节奏——通过反向喷火及时归零动能，完美克制了无阻力环境下的惯性漂移。',
        'You mastered momentum control in space—cancelling kinetic energy through counter-thrust to conquer inertia.'
      ),
      pilotTips: [
        t('保持这种“轻点微调、提早减速”的良好手感。', 'Keep this habit: gentle micro-bursts and early braking.'),
        t('在更复杂的后续多自由度关卡中，先稳住姿态，再进行平移接近。', 'In multi-DOF missions, stabilize attitude before translating.')
      ],
      metrics
    };
  }

  // 失败分析
  if (reason === 'collision') {
    const isMissedHold = cfg.id === 1 && finalDistance < cfg.targetZ;
    return {
      isSuccess: false,
      scenarioId: cfg.id,
      reason: 'collision',
      badgeTitle: isMissedHold
        ? t('错过停泊点 · 撞击空间站', 'Missed Hold Point · Station Impact')
        : t('飞船碰撞失控', 'Collision Impact'),
      badgeType: 'collision',
      headline: isMissedHold
        ? t('飞船冲过了 8 米黄圈，直接撞向空间站！', 'Overshot the 8m hold point and crashed into the station!')
        : t('碰到了空间站外部结构，触发防撞保护！', 'Contacted station structure, triggering collision cutoff!'),
      causeExplanation: isMissedHold
        ? t(
            `飞船以 ${finalSpeed.toFixed(2)} m/s 的高速穿过了安全黄圈，未能及时停下，撞上了空间站前端结构（对接口安全距离仅 0.35 米）。`,
            `The ship passed the hold ring at ${finalSpeed.toFixed(2)} m/s without stopping and contacted the forward station structure.`
          )
        : t(
            '飞船在接近过程中偏离了安全的进近走廊，或者在进入对接口前速度过大，舱体碰到了空间站外壳。',
            'The spacecraft strayed outside the safe approach corridor or failed to slow down before contacting the docking rim.'
          ),
      physicsInsight: t(
        '太空中绝对没有摩擦阻力！在地面骑车松手会慢慢滑停，但在太空中松开手，飞船会以当前速度“永远匀速飞行”。想要停下来，必须主动向反方向喷火制动！',
        'There is zero friction in space! On Earth things glide to a stop; in space, releasing controls keeps you coasting at constant speed forever. Stopping requires deliberate counter-thrust!'
      ),
      pilotTips: [
        t('提早按住 F 键刹车：距离黄圈还有 3~4 米时，就果断按住 F（或下箭头）进行反向喷火。', 'Brake earlier with Key F: start counter-thrusting 3-4 m before reaching the hold ring.'),
        t('盯着接近速度表：一直刹车直到速度表降为 0.00 m/s（数字变绿），飞船才是真正停住了。', 'Watch closing speed: brake continuously until speed reaches 0.00 m/s (turns green).'),
        t('在黄圈静止保持 1.5 秒：速度降为 0 后松开按键，保持平稳，即可顺利通关！', 'Hold steady for 1.5 seconds: once stopped inside the ring, release controls to complete!')
      ],
      metrics
    };
  }

  if (reason === 'overspeed') {
    return {
      isSuccess: false,
      scenarioId: cfg.id,
      reason: 'overspeed',
      badgeTitle: t('接触速度严重超标', 'Dangerous Contact Overspeed'),
      badgeType: 'overspeed',
      headline: t(`接触速度 (${finalSpeed.toFixed(2)} m/s) 超出安全限值！`, `Contact speed (${finalSpeed.toFixed(2)} m/s) exceeded safety limit!`),
      causeExplanation: t(
        `对接口允许的机械捕获速度不超过 ${cfg.speedTolerance.toFixed(2)} m/s。高速冲入会损毁机械锁扣并引发强烈反弹。`,
        `Docking mechanism capture tolerance is ≤ ${cfg.speedTolerance.toFixed(2)} m/s. Higher speed damages latches and causes bounce.`
      ),
      physicsInsight: t(
        '根据动量定理，速度越大，接触瞬间的冲击力就越剧烈。航天对接在最后阶段必须像蜗牛爬行一样轻柔微速接触。',
        'Momentum dictates that higher speed generates destructive impact force. Final contact must be gentle and creeping.'
      ),
      pilotTips: [
        t('在最后 3 米将速度压低到 0.10 m/s 以下。', 'Keep speed below 0.10 m/s inside the last 3 metres.'),
        t('在接触前使用点按反推（F 键）做微量减速。', 'Tap counter-thrust (Key F) for fine speed bleeding before contact.'),
        t('切勿在最后关头长按前进键加速。', 'Never hold forward thrust in the final closing stretch.')
      ],
      metrics
    };
  }

  if (reason === 'drift') {
    return {
      isSuccess: false,
      scenarioId: cfg.id,
      reason: 'drift',
      badgeTitle: t('横向漂移超出允许走廊', 'Excessive Lateral Drift'),
      badgeType: 'drift',
      headline: t('飞船向侧方漂离了中心对准轴！', 'Spacecraft drifted sideways off the centerline!'),
      causeExplanation: t(
        `接触时横向偏移为 ${finalLateral.toFixed(2)} m（允许限值 ≤ ${cfg.positionTolerance} m）。未能对准对接环孔径。`,
        `Lateral offset was ${finalLateral.toFixed(2)} m at contact (limit is ≤ ${cfg.positionTolerance} m). Missed docking capture aperture.`
      ),
      physicsInsight: t(
        '机头朝向对接口不等于轨迹对准对接口！如果飞船存在微小的侧向速度，它就会一边前飞一边向旁边飘移。',
        'Pointing at the port does not mean flying towards it! Sideways velocity causes you to slide laterally while moving forward.'
      ),
      pilotTips: [
        t('观察绿色准星与黄色十字标记：使用 A / D（左右）和 W / S（上下）将它们拉回重合。', 'Watch crosshairs: use A/D and W/S to align reticle with target marker.'),
        t('反向制动横向速度：移动到中心线附近时，轻点反向键把侧移速度彻底归零。', 'Cancel sideways velocity: tap opposite keys when near center to stop sliding.'),
        t('先修偏、再接近：在距离空间站尚远时完成对中，避免在近距离慌乱修正。', 'Center first, close second: align early while far from the station.')
      ],
      metrics
    };
  }

  if (reason === 'alignment') {
    return {
      isSuccess: false,
      scenarioId: cfg.id,
      reason: 'alignment',
      badgeTitle: t('姿态角度未对齐', 'Attitude Misaligned'),
      badgeType: 'alignment',
      headline: t(`姿态角度偏差达到 ${finalAngle.toFixed(1)}°（限值 ≤ ${cfg.angleTolerance}°）`, `Attitude error was ${finalAngle.toFixed(1)}° (limit ≤ ${cfg.angleTolerance}°)`),
      causeExplanation: t(
        '对接环两端必须保持高精度平行。接口歪斜会导致撞击单侧外环，无法完成锁死。',
        'Docking flanges must be strictly parallel. Angular tilt causes single-side contact collision.'
      ),
      physicsInsight: t(
        '旋转推进器改变的是“角速度”（转动快慢）。转到位之后如果不反向点按停止旋转，飞船就会一直转过头。',
        'Rotational thrusters change angular velocity. After turning into alignment, counter-thrust is required to stop rotating.'
      ),
      pilotTips: [
        t('切换到旋转模式（或使用方向键），小幅度修正俯仰与偏航角。', 'Use rotation mode / arrow keys to gently reduce pitch and yaw angles.'),
        t('转正瞬间轻点反向键，使旋转速度归零停稳。', 'Tap counter-rotation immediately when aligned to cancel spin rate.'),
        t('确认角度表降到 2.0° 以下且指针静止后再前进。', 'Verify angle is below 2.0° and motionless before moving forward.')
      ],
      metrics
    };
  }

  if (reason === 'fuel') {
    return {
      isSuccess: false,
      scenarioId: cfg.id,
      reason: 'fuel',
      badgeTitle: t('推进工质燃料耗尽', 'Fuel Exhausted'),
      badgeType: 'fuel',
      headline: t('喷气燃料耗尽，飞船失去姿态与动力控制！', 'Fuel depleted: spacecraft lost translation and attitude authority!'),
      causeExplanation: t(
        '频繁长按推进器消耗了全部燃料储量。真实航天推进剂非常昂贵且载量有限。',
        'Continuous thruster firing exhausted fuel reserves. Real spacecraft propellant is strictly limited.'
      ),
      physicsInsight: t(
        '太空飞行遵循“脉冲推进”原则：喷一下火获得初速度后，靠惯性无动力滑行，接近目标再喷一下刹车，切忌一路按着不放。',
        'Space flight relies on impulse coasting: fire briefly, coast on inertia for free, then fire briefly to brake.'
      ),
      pilotTips: [
        t('轻触点按，坚决避免长按推进键。', 'Tap in short pulses; avoid holding thruster buttons continuously.'),
        t('加速后松开按键，充分利用真空惯性滑行。', 'Release keys after gaining speed and glide on inertia.'),
        t('减少来回反复剧烈修正，提高控制效率。', 'Avoid alternating over-corrections to preserve fuel reserves.')
      ],
      metrics
    };
  }

  // 默认其他原因 (escape / timeout / unknown)
  return {
    isSuccess: false,
    scenarioId: cfg.id,
    reason: reason ?? 'timeout',
    badgeTitle: reason === 'escape' ? t('脱离安全训练区', 'Exited Training Zone') : t('训练超时', 'Training Timeout'),
    badgeType: reason === 'escape' ? 'escape' : 'timeout',
    headline: reason === 'escape'
      ? t('飞船飘出了安全教学范围！', 'Craft drifted beyond the safe training envelope!')
      : t('超过本次任务的最大允许时限。', 'Exceeded maximum allowed mission time limit.'),
    causeExplanation: reason === 'escape'
      ? t(
          '飞船向下或向外偏离过多，脱离了安全引导走廊。超出边界后失去推进动力，在太空中按原速度漂移。',
          'Craft drifted too far down or laterally, leaving the guidance corridor. Beyond the boundary, thrust cuts out and it floats freely.'
        )
      : t(
          '观察速度矢量的方向，使用反向喷火将飞船拉回训练中轴线。',
          'Monitor velocity vector heading and counter-thrust back towards centerline.'
        ),
    physicsInsight: t(
      '这就是牛顿第一定律（惯性定律）：太空中没有空气摩擦力阻挡，飞船在不受外力时会保持匀速直线运动。向下运动如果不及时反向喷气减速，就会一直向下飘走。',
      'Newton’s First Law of Inertia: with no friction in space, objects maintain constant motion. Downward velocity must be stopped with counter-thrust, or you drift forever.'
    ),
    pilotTips: [
      t('重新开始任务，时刻观察距离与速度读数。', 'Restart and keep close track of distance and speed gauges.'),
      t('按下空格键可进行紧急辅助制动。', 'Press Spacebar for emergency assisted braking.')
    ],
    metrics
  };
}
