# 火箭升空任务（Mission 01 · Liftoff）系统架构设计蓝图

本文件记录 Vector Align 主界面第一项任务 **「1 升空 (Liftoff)」** 的工程架构设计、物理数学模型、KSP 操控映射、四关渐进课程及无头自测接口规范。

## 1. 模块目录结构

- `src/sim/liftoff/types.ts` — 升空物理引擎、火箭多级构型、开普勒轨道根数、KSP 操控指令与四关配置类型定义。
- `src/sim/liftoff/vehicles.ts` — 基于 NASA AS-506 飞行评估报告的 **土星五号 (Saturn V)** 与 **长征二号F (CZ-2F)** 真实多级参数表。
- `src/sim/liftoff/atmosphere.ts` — US Standard Atmosphere 1976 分层大气模型、跨音速激波阻力系数 $C_d(M, \alpha)$ 与动压 $q$ 计算。
- `src/sim/liftoff/orbit.ts` — 球体地球引力、发射场纬度自转线速度借力、开普勒轨道根数（远地点 $Ap$、近地点 $Pe$、偏心率 $e$、第一宇宙速度）实时解算。
- `src/sim/liftoff/scenarios.ts` — 延续「00 通识 + 4 关进阶训练」的关卡参数配置，以及面向青少年受众的专业词汇通俗科普词典 `LIFTOFF_GLOSSARY`。
- `src/sim/liftoff/engine.ts` — 60 Hz 定步长变质量火箭升空动力学积分器 `stepLiftoff`、级间分离状态机 `stageRocket` 与确定性自动驾驶仪 `liftoffAutopilot`。
- `src/testing/liftoff-driver.ts` — 无需 WebGL/浏览器的轻量级无头自测驱动器 `liftoffDriver`。
- `src/sim/liftoff/engine.test.ts` — 物理不变量、失败判据与四关通关自动化测试套件。
- `src/components/scene/TaskCameraControls.tsx` & `src/components/scene/taskCameraConfig.ts` — 全站所有 3D 任务场景共用的统一鼠标相机控制器（**左键旋转、右键平移、滚轮缩放**）。`LiftoffScene3D.tsx` 与 `Scene.tsx` 均通过该组件提供一致的 3D 视口交互，后续新增任何 3D 任务场景也必须直接复用该组件而非重新编写。

## 2. 快速验证命令

```sh
npm run test:api
```
