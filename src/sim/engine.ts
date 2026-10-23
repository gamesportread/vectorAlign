import { Euler, Quaternion, Vector3 } from 'three';
import stationColliders from './station-colliders.json';
import type { ControlCommand, Failure, FlightSample, ScenarioConfig, SimulationState, Vec3 } from './types';
export const DT = 1 / 60;
export const ACCELERATION = .18;
export const ANGULAR_ACCELERATION = .035;
export const RAD = Math.PI / 180;
export const emptyCommand = (): ControlCommand => ({ translation:[0,0,0],rotation:[0,0,0],brake:false });
export const clamp = (n:number,low=-1,high=1) => Math.max(low,Math.min(high,n));
export function createState(config:ScenarioConfig):SimulationState {
  const orientation = new Quaternion().setFromEuler(new Euler(...config.attitude.map(a=>a*RAD) as Vec3));
  return {position:[...config.position],velocity:[...config.velocity],orientation:orientation.toArray(),angularVelocity:[0,0,0],fuel:config.fuel,time:0,hold:0,status:'ready',thrust:[0,0,0],torque:[0,0,0],hatch:{state:'closed',progress:0}};
}
export function attitude(state:SimulationState):Vec3 {
  const e = new Euler().setFromQuaternion(new Quaternion(...state.orientation),'XYZ');
  return [e.x/RAD,e.y/RAD,e.z/RAD];
}
export const angleError = (s:SimulationState) => 2*Math.acos(clamp(Math.abs(s.orientation[3]),0,1))/RAD;
export const angularSpeed = (s:SimulationState) => Math.hypot(...s.angularVelocity)/RAD;
export const lateralSpeed = (s:SimulationState) => Math.hypot(s.velocity[0],s.velocity[1]);
export const lateralError = (s:SimulationState) => Math.hypot(s.position[0],s.position[1]);
export function sample(s:SimulationState):FlightSample { return {time:s.time,distance:s.position[2],speed:Math.hypot(...s.velocity),lateral:lateralError(s),angle:angleError(s),fuel:s.fuel,position:[...s.position]}; }

// Conservative simplified station collision volumes in port-local metres. Their
// bounds include the teaching capsule radius; the central capture corridor is open.
export const COLLIDERS: [Vec3,Vec3][] = [
  [[-2.8,-2.8,-17],[-.75,2.8,.25]], [[.75,-2.8,-17],[2.8,2.8,.25]],
  [[-.75,.75,-17],[.75,2.8,.25]], [[-.75,-2.8,-17],[.75,-.75,.25]],
  [[-1.6,-1.6,-25],[1.6,1.6,.15]],
  ...stationColliders.boxes.map(box=>[box.min,box.max] as [Vec3,Vec3])
];

export interface ImpactResult {
  hit: boolean;
  t: number;
  normal: Vec3;
  point: Vec3;
}

export function sweepBox(start: Vec3, end: Vec3, min: Vec3, max: Vec3): ImpactResult {
  let near = 0, far = 1;
  let normal: Vec3 = [0, 0, 1];
  for (let i = 0; i < 3; i++) {
    const d = end[i] - start[i];
    if (Math.abs(d) < 1e-12) {
      if (start[i] < min[i] || start[i] > max[i]) return { hit: false, t: 1, normal: [0, 0, 1], point: end };
    } else {
      let a = (min[i] - start[i]) / d, b = (max[i] - start[i]) / d;
      let n = -1;
      if (a > b) { [a, b] = [b, a]; n = 1; }
      if (a > near) {
        near = a;
        normal = [0, 0, 0];
        normal[i] = n;
      }
      far = Math.min(far, b);
      if (near > far) return { hit: false, t: 1, normal: [0, 0, 1], point: end };
    }
  }
  const hitPoint: Vec3 = [
    start[0] + (end[0] - start[0]) * near,
    start[1] + (end[1] - start[1]) * near,
    start[2] + (end[2] - start[2]) * near
  ];
  return { hit: true, t: near, normal, point: hitPoint };
}

export function findCollidersImpact(start: Vec3, end: Vec3): ImpactResult | undefined {
  let earliest: ImpactResult | undefined;
  for (const [min, max] of COLLIDERS) {
    const res = sweepBox(start, end, min, max);
    if (res.hit) {
      if (!earliest || res.t < earliest.t) {
        earliest = res;
      }
    }
  }
  return earliest;
}

export function segmentBox(start:Vec3,end:Vec3,min:Vec3,max:Vec3):boolean {
  return sweepBox(start, end, min, max).hit;
}

export function resolveCollisionResponse(
  s: SimulationState,
  contactPoint: Vec3,
  normal: Vec3,
  restitution = 0.55
): void {
  const v = new Vector3(...s.velocity);
  const n = new Vector3(...normal).normalize();
  const vDotN = v.dot(n);

  // 1. 线速度反弹冲量 (Impulse) 与横向飞离偏折 (Ejection)
  // vDotN < 0 表示朝碰撞表面运动；无速度碰撞时反弹速度近乎为零，避免小速度撞击被弹飞
  const inNormalSpeed = Math.max(0, -vDotN);
  const totalSpeed = v.length();
  const effectiveInSpeed = Math.max(inNormalSpeed, totalSpeed * 0.25);
  const bounceSpeed = effectiveInSpeed * restitution;
  const tangentV = v.clone().sub(n.clone().multiplyScalar(vDotN)).multiplyScalar(0.7);

  // 微重力偏心横向飞散速度分量（按初速度等比例缩放，低速接触时不额外注入大幅横向速度）
  const lateralDeflect = new Vector3(
    contactPoint[0] - s.position[0],
    contactPoint[1] - s.position[1],
    0
  );
  if (lateralDeflect.length() > 1e-4) {
    lateralDeflect.normalize().multiplyScalar(effectiveInSpeed * 0.45);
  } else {
    lateralDeflect.set(0.65, 0.45, 0).normalize().multiplyScalar(effectiveInSpeed * 0.45);
  }

  const newV = tangentV.add(lateralDeflect).add(n.clone().multiplyScalar(bounceSpeed));
  s.velocity = [newV.x, newV.y, newV.z];

  // 2. 偏心撞击力矩引发三维太空翻滚失控 (Eccentric Torque & Angular Tumble)
  // 力矩与冲量严格与 bounceSpeed（初速度）成正比，低速轻触时不发生大幅疯狂自转
  const r = new Vector3(
    contactPoint[0] - s.position[0],
    contactPoint[1] - s.position[1],
    contactPoint[2] - (s.position[2] + 1.2)
  );
  if (Math.hypot(r.x, r.y) < 0.15) {
    r.x = 0.45;
    r.y = 0.35;
  }
  const impulse = n.clone().multiplyScalar(bounceSpeed * 2.4);
  const torque = r.cross(impulse);
  const tumbleFactor = 0.95;

  s.angularVelocity = [
    s.angularVelocity[0] + torque.x * tumbleFactor,
    s.angularVelocity[1] + torque.y * tumbleFactor,
    s.angularVelocity[2] + torque.z * tumbleFactor
  ];

  // 3. 沿碰撞法线微调推出，防止下一帧卡模 (低速时仅移出极小距离，避免瞬移弹射感)
  const separationDist = Math.max(0.04, Math.min(0.4, 0.04 + effectiveInSpeed * 0.15));
  s.position = [
    contactPoint[0] + n.x * separationDist,
    contactPoint[1] + n.y * separationDist,
    contactPoint[2] + n.z * separationDist
  ];

  s.thrust = [0, 0, 0];
  s.torque = [0, 0, 0];
}

export function captureFailure(s:SimulationState,c:ScenarioConfig):Failure|undefined {
  if(Math.abs(s.velocity[2])>c.speedTolerance) return 'overspeed';
  if(lateralError(s)>c.positionTolerance || lateralSpeed(s)>.04) return 'drift';
  if(angleError(s)>c.angleTolerance || angularSpeed(s)>c.angularSpeedTolerance) return 'alignment';
}

export function step(state:SimulationState,command:ControlCommand,c:ScenarioConfig,dt=DT):SimulationState {
  // 若已因碰撞失败，物理引擎继续执行无动力自由惯性动力学积分（弹飞与失控自转翻滚）
  if (state.status === 'failed') {
    const s: SimulationState = {
      ...state,
      position: [...state.position],
      velocity: [...state.velocity],
      angularVelocity: [...state.angularVelocity],
      orientation: [...state.orientation],
      thrust: [0, 0, 0],
      torque: [0, 0, 0],
      time: state.time + dt
    };
    s.position[0] += s.velocity[0] * dt;
    s.position[1] += s.velocity[1] * dt;
    s.position[2] += s.velocity[2] * dt;
    const omega = new Vector3(...s.angularVelocity);
    const length = omega.length();
    if (length > 0) {
      s.orientation = new Quaternion(...s.orientation)
        .multiply(new Quaternion().setFromAxisAngle(omega.divideScalar(length), length * dt))
        .normalize()
        .toArray();
    }

    // 刚体多点防穿模检测：飞船鼻部、质心与尾部旋转扫掠
    const q = new Quaternion(...s.orientation);
    const pos = new Vector3(...s.position);
    const tailWorld = pos.clone().add(new Vector3(0, 0, 2.9).applyQuaternion(q));
    const noseWorld = pos.clone();
    const comWorld = pos.clone().add(new Vector3(0, 0, 1.4).applyQuaternion(q));
    
    // 对接口及空间站前表面 (z <= 0.25 区域) 刚体接触约束，防止翻滚时船尾扫入舱体内
    const minZ = Math.min(noseWorld.z, comWorld.z - 0.7, tailWorld.z - 0.7);
    if (s.reason === 'collision' && minZ < 0.35 && Math.hypot(pos.x, pos.y) < 3.2) {
      s.position[2] += Math.max(0, 0.36 - minZ);
      if (s.velocity[2] < 0) {
        s.velocity[2] = Math.abs(s.velocity[2]) * 0.45;
      }
    }

    const secondaryImpact = findCollidersImpact(state.position, s.position);
    if (secondaryImpact) {
      resolveCollisionResponse(s, secondaryImpact.point, secondaryImpact.normal, 0.45);
    }
    return s;
  }

  if (state.status !== 'flying') return state;

  const s:SimulationState={
    ...state,
    position:[...state.position],
    velocity:[...state.velocity],
    angularVelocity:[...state.angularVelocity],
    orientation:[...state.orientation],
    thrust:[0,0,0],
    torque:[0,0,0],
    time:state.time+dt,
    hatch: state.hatch ? { ...state.hatch } : undefined
  };

  // 舱门开启动画推进
  if (s.hatch) {
    if (s.hatch.state === 'opening') {
      const next = s.hatch.progress + dt / 1.2;
      if (next >= 1) {
        s.hatch = { state: 'open', progress: 1 };
      } else {
        s.hatch = { state: 'opening', progress: next };
      }
    } else if (s.hatch.state === 'closing') {
      const next = s.hatch.progress - dt / 1.2;
      if (next <= 0) {
        s.hatch = { state: 'closed', progress: 0 };
      } else {
        s.hatch = { state: 'closing', progress: next };
      }
    }
  }

  let cost=0;
  for(let i=0;i<3;i++) {
    if(c.translation[i]) s.thrust[i]=command.brake?clamp(-s.velocity[i]/(ACCELERATION*dt)):clamp(command.translation[i]);
    if(c.rotation) s.torque[i]=command.brake?clamp(-s.angularVelocity[i]/(ANGULAR_ACCELERATION*dt)):clamp(command.rotation[i]);
    cost+=(Math.abs(s.thrust[i])*.42+Math.abs(s.torque[i])*.3)*dt;
  }
  const fraction=cost>0?Math.min(1,s.fuel/cost):1;
  s.fuel=Math.max(0,s.fuel-cost);
  for(let i=0;i<3;i++) {
    s.thrust[i]*=fraction;s.torque[i]*=fraction;
    if(c.translation[i]) {s.velocity[i]+=s.thrust[i]*ACCELERATION*dt;s.position[i]+=s.velocity[i]*dt;}
    else {s.velocity[i]=0;s.position[i]=c.position[i];}
    if(c.rotation) s.angularVelocity[i]+=s.torque[i]*ANGULAR_ACCELERATION*dt;else s.angularVelocity[i]=0;
  }
  if(c.rotation) {
    const omega=new Vector3(...s.angularVelocity);const length=omega.length();
    if(length>0) s.orientation=new Quaternion(...s.orientation).multiply(new Quaternion().setFromAxisAngle(omega.divideScalar(length),length*dt)).normalize().toArray();
  }

  const fail=(reason:Failure, contactPoint?: Vec3, normal?: Vec3)=>{
    s.status='failed';
    s.reason=reason;
    if(contactPoint && normal) {
      resolveCollisionResponse(s, contactPoint, normal);
    }
  };

  const impact = findCollidersImpact(state.position, s.position);
  if (impact) {
    if (impact.point[1] < -.75) {
      fail('escape');
    } else {
      fail('collision', impact.point, impact.normal);
    }
    return s;
  }

  // 终末对接前舱门开启安全检查 (< 1.5m 必须打开舱门，否则头锥阻挡无法建立硬捕获)
  if (c.id === 4 && s.hatch?.state === 'closed' && state.position[2] >= 1.5 && s.position[2] < 1.5) {
    s.position[2] = 1.49;
    fail('hatch_closed', s.position, [0, 0, 1]);
    return s;
  }

  // Evaluate contact on the swept path, not just at the endpoint.
  if(state.position[2]>.35 && s.position[2]<=.35) {
    const t=(state.position[2]-.35)/(state.position[2]-s.position[2]);
    const contact:SimulationState={...s,position:state.position.map((v,i)=>v+(s.position[i]-v)*t) as Vec3};
    const latErr = lateralError(contact);
    if(contact.position[1] < -.75) {
      // 往下飞偏离对接口，下方为开阔太空无障碍舱壁，属于越出引导走廊失败
      fail('escape');
    } else if(latErr < .75) {
      const reason = c.id === 1 ? (angleError(contact) < 30 ? undefined : 'alignment') : (c.id < 4 ? 'collision' : captureFailure(contact, c));
      s.position = contact.position;
      if(reason) {
        fail(reason, contact.position, [0, 0, 1]);
      } else {
        s.status = 'success';
        s.velocity = [0, 0, 0];
        s.angularVelocity = [0, 0, 0];
      }
    } else if(latErr <= 1.25) {
      // 仅在接近对接口外沿金属圆环（半径约 0.8~1.2m）时判定撞击金属圈
      s.position = contact.position;
      fail('collision', contact.position, [0, 0, 1]);
    } else {
      // 偏离对接口舱体较远，检查是否撞击空间站其他结构（如太阳翼横梁）
      const impact = findCollidersImpact(state.position, s.position);
      if (impact && impact.point[1] >= -.75) {
        fail('collision', impact.point, impact.normal);
      } else {
        // 未撞击任何结构，属于越出教学走廊
        fail('escape');
      }
    }
  }

  if(s.status==='flying') {
    const impact = findCollidersImpact(state.position, s.position);
    if (impact) {
      if (impact.point[1] < -.75) {
        // 往下飞越过边界，判定为脱离训练区而非撞击
        fail('escape');
      } else {
        fail('collision', impact.point, impact.normal);
      }
    }
  }

  if(s.status==='flying' && s.position[2]<=.35) {
    if (c.id === 1 && s.position[1] >= -.75 && lateralError(s) < .75 && angleError(s) < 30) {
      s.status = 'success';
      s.position[2] = .35;
      s.velocity = [0, 0, 0];
      s.angularVelocity = [0, 0, 0];
    } else if (s.position[1] >= -.75 && lateralError(s) <= 1.25) {
      fail('collision', s.position, [0, 0, 1]);
    } else {
      fail('escape');
    }
  }

  // 边界判定：向下飞超出范围、向上/向侧面偏离过远、或远离空间站
  // 超过边界判定为失败 (escape)，失去推力并保持无动力自然漂浮
  if(s.status==='flying') {
    const isOutOfBounds =
      s.position[1] < -4.5 ||        // 往下飞超出边界 (向下偏离超过 4.5 米)
      s.position[1] > 12 ||          // 向上偏离过远
      Math.abs(s.position[0]) > 16 || // 向左/右横向偏离过远
      s.position[2] > 75 ||          // 倒飞远离空间站过远
      s.position[2] < -20 ||         // 穿过空间站后方
      Math.hypot(...s.position) > 85;

    if (isOutOfBounds) {
      fail('escape');
    }
  }
  if(s.status==='flying' && c.id<4) {
    const aligned=c.id===1?Math.abs(s.position[2]-c.targetZ)<=c.positionTolerance && Math.abs(s.velocity[2])<=c.speedTolerance:
      c.id===2?lateralError(s)<=c.positionTolerance && lateralSpeed(s)<=c.speedTolerance:angleError(s)<=c.angleTolerance && angularSpeed(s)<=c.angularSpeedTolerance;
    s.hold=aligned?s.hold+dt:0;if(s.hold>=c.holdDuration) s.status='success';
  }
  if(s.status==='flying' && s.fuel<=0) fail('fuel');
  if(s.status==='flying' && s.time>=c.maxTime) fail('timeout');

  return s;
}
// Deterministic feedback demonstration, using exactly the player's dynamics.
export function demonstration(s:SimulationState,c:ScenarioConfig):ControlCommand {
  if (s.hatch && s.hatch.state !== 'open' && (c.id === 4 || c.targetZ <= 0.35 || s.position[2] < 35)) {
    s.hatch.state = 'open';
    s.hatch.progress = 1;
  }
  const command=emptyCommand();
  for(let i=0;i<3;i++) {
    const error=(i===2?c.targetZ:0)-s.position[i];
    let desired=clamp(error*.14,-.65,.65);
    if(c.id===4 && i===2) {
      const aligned=lateralError(s)<.25 && angleError(s)<2;
      desired=aligned?-Math.min(.65,Math.max(.08,(s.position[2]-.35)*.09)):0;
    }
    command.translation[i]=clamp((desired-s.velocity[i])*1.8/ACCELERATION);
  }
  const q=new Quaternion(...s.orientation);if(q.w<0) q.set(-q.x,-q.y,-q.z,-q.w);
  const error=[q.x,q.y,q.z];
  for(let i=0;i<3;i++) command.rotation[i]=clamp((-error[i]*.3-s.angularVelocity[i]*.9)/ANGULAR_ACCELERATION);
  return command;
}
export class FixedStepper {
  private accumulator=0;
  advance(delta:number,callback:()=>void) {this.accumulator+=Math.min(Math.max(0,delta),.25);while(this.accumulator+1e-10>=DT){callback();this.accumulator-=DT;}}
  reset(){this.accumulator=0;}
}
