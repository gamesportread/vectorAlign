import type { ScenarioConfig } from './types';
const base = { fuel: 100, positionTolerance: .2, speedTolerance: .06, angleTolerance: 2, angularSpeedTolerance: .5, holdDuration: 1.5, maxTime: 600 };
export const scenarios: ScenarioConfig[] = [
  { ...base, id: 1, title: {zh:'学会停下来',en:'Learn to stop'}, subtitle:{zh:'惯性与反向推进',en:'Inertia & counter-thrust'},
    brief:{zh:'飞船正在靠近空间站。用反向推进，在 8 米等待点停稳。松开按钮后，飞船仍会继续移动。',en:'You are approaching the station. Use reverse thrust to stop at the 8 m hold point. Releasing a button does not stop the spacecraft.'},
    lesson:{zh:'推进改变速度，而不是直接改变位置。先观察接近速度，提前反推；速度归零后再松开。',en:'Thrust changes velocity, not position. Watch your closing speed, brake early, then release when your speed reaches zero.'},
    constraints:{zh:'六自由度已全部解锁 · 自由平移与姿态控制',en:'All 6-DOF unlocked · Full translation & rotation'},
    position:[0,0,18],velocity:[0,0,-.65],attitude:[0,0,0],translation:[true,true,true],rotation:true,targetZ:8,positionTolerance:.35 },
  { ...base, id:2,title:{zh:'消除横向漂移',en:'Cancel the drift'},subtitle:{zh:'位置与相对速度',en:'Position & relative velocity'},
    brief:{zh:'对接口在前方，但你正在向侧面漂移。用上下左右推进，把位置和横向速度同时归零。',en:'The port is ahead, but you are drifting sideways. Use lateral thrust to centre the ship and cancel its sideways velocity.'},
    lesson:{zh:'瞄准标记重合时，飞船仍可能横向移动。需要同时检查偏移和漂移速度。',en:'The markers can overlap while you are still drifting. Both lateral position and velocity must be close to zero.'},
    constraints:{zh:'六自由度已全部解锁 · 自由平移与姿态控制',en:'All 6-DOF unlocked · Full translation & rotation'},
    position:[2.4,-1.4,12],velocity:[.08,-.04,0],attitude:[0,0,0],translation:[true,true,true],rotation:true,targetZ:12 },
  { ...base,id:3,title:{zh:'对准接口',en:'Align the port'},subtitle:{zh:'姿态与角速度',en:'Attitude & angular velocity'},
    brief:{zh:'调整俯仰、偏航与滚转，让接口方向一致，并用反向旋转推进停止转动。',en:'Adjust pitch, yaw and roll to align the ports, then counter-thrust to stop the rotation.'},
    lesson:{zh:'转向推进器改变角速度。对准的一瞬间并不代表完成，还需要停止旋转。',en:'Rotational thrusters change angular velocity. Momentary alignment is not enough: rotation must also stop.'},
    constraints:{zh:'六自由度已全部解锁 · 自由平移与姿态控制',en:'All 6-DOF unlocked · Full translation & rotation'},
    position:[0,0,8],velocity:[0,0,0],attitude:[9,-12,7],translation:[true,true,true],rotation:true,targetZ:8 },
  { ...base,id:4,title:{zh:'最后 50 米',en:'The final 50 metres'},subtitle:{zh:'完整对接任务',en:'Complete docking mission'},
    brief:{zh:'独立完成接近、减速、姿态对齐和对接。接触时速度不超过 0.15 m/s，并消除横向漂移。',en:'Approach, slow down, align and dock. Contact at no more than 0.15 m/s with minimal sideways drift.'},
    lesson:{zh:'先消除偏移和姿态误差，再缓慢接近。对接同时要求位置、方向、速度和角速度满足条件。',en:'Cancel lateral and attitude errors before the final approach. Docking requires safe position, orientation, velocity and angular velocity together.'},
    constraints:{zh:'六自由度全部开放 · 所有推进消耗资源',en:'All six degrees of freedom · every thrust uses resources'},
    position:[.6,-.3,50],velocity:[0,0,-.35],attitude:[2,-3,2],translation:[true,true,true],rotation:true,targetZ:.35,positionTolerance:.18,speedTolerance:.15,maxTime:900 }
];

export const getScenario = (id: number) => scenarios.find(s=>s.id === id) ?? scenarios[0];
