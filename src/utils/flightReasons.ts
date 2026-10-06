import type { Failure, Language } from '../sim/types';

const reasons: Record<string, [string, string]> = {
  overspeed: [
    '接触时速度过高。更早开始反向推进，在接近接口前降到 0.15 m/s 以下。',
    'Contact speed was too high. Start counter-thrust earlier and approach below 0.15 m/s.'
  ],
  drift: [
    '横向偏移或漂移速度过大。先回到中心线，再用反向推进停止横向移动。',
    'Lateral position or velocity was too large. Centre the ship, then cancel the sideways drift.'
  ],
  alignment: [
    '接口方向或旋转速度超出范围。对准之后，用反向旋转推进停稳。',
    'Orientation or angular velocity was outside the capture limits. Align, then counter-thrust to stop rotating.'
  ],
  collision: [
    '碰到了空间站结构。保持在引导走廊内，接近前先减速。',
    'You contacted station structure. Stay in the approach corridor and reduce speed before closing in.'
  ],
  escape: [
    '飞船超出了安全训练边界。在太空中失去推力后会一直按原速度漂移，请注意观察速度方向，提前反向推进。',
    'The spacecraft flew beyond the safe training boundary. Without thrust it floats indefinitely in space. Watch velocity and brake in advance.'
  ],
  fuel: [
    '推进资源已耗尽。尝试更短的推进脉冲，避免反复过度修正。',
    'Thruster reserve is exhausted. Try shorter impulses and avoid repeated overcorrection.'
  ],
  timeout: [
    '本次训练达到时间限制。查看轨迹，重新尝试。',
    'The training time limit was reached. Review the flight trace and try again.'
  ]
};

const defaultReason: [string, string] = [
  '查看曲线，观察推进如何影响运动。',
  'Review how your thrust changed the motion.'
];

export function getReasonText(reason: Failure | string | undefined, lang: Language): string {
  return (reasons[reason ?? ''] ?? defaultReason)[lang === 'zh' ? 0 : 1];
}
