export type Vec3 = [number, number, number];
export type Quat = [number, number, number, number];
export type Language = 'zh' | 'en';
export type Localized = Record<Language, string>;
export type Failure = 'overspeed' | 'drift' | 'alignment' | 'collision' | 'escape' | 'fuel' | 'timeout' | 'hatch' | 'hatch_closed';
export type HatchState = 'closed' | 'opening' | 'open' | 'closing';
export interface HatchData { state: HatchState; progress: number }
export interface ControlCommand { translation: Vec3; rotation: Vec3; brake: boolean }
export interface ScenarioConfig {
  id: number; title: Localized; subtitle: Localized; brief: Localized; lesson: Localized; constraints: Localized;
  objective?: Localized; hint?: Localized; passCriteria?: Localized;
  position: Vec3; velocity: Vec3; attitude: Vec3; fuel: number;
  translation: [boolean, boolean, boolean]; rotation: boolean;
  targetZ: number; positionTolerance: number; speedTolerance: number; angleTolerance: number; angularSpeedTolerance: number;
  holdDuration: number; maxTime: number;
}
export interface SimulationState {
  position: Vec3; velocity: Vec3; orientation: Quat; angularVelocity: Vec3; fuel: number; time: number; hold: number;
  status: 'ready' | 'flying' | 'success' | 'failed'; reason?: Failure; thrust: Vec3; torque: Vec3;
  hatch?: HatchData;
}
export interface FlightSample { time: number; distance: number; speed: number; lateral: number; angle: number; fuel: number; position: Vec3 }
export interface FlightEvent { time: number; type: 'start' | 'brake' | 'warning' | 'success' | 'failed'; reason?: Failure }
export interface FlightRecord { scenario: number; demo: boolean; samples: FlightSample[]; events: FlightEvent[]; result?: SimulationState; config: ScenarioConfig; date: string }
