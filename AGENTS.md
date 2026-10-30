## 设计理念

不要出现中国元素（中文例外），NASA有关的优先
没有特别说明，则严禁出现小字，注释，贴士

## 3D 场景相机与鼠标交互规范

- 所有具体 3D 任务场景（包括「1 升空」`src/components/liftoff/LiftoffScene3D.tsx`、「2 太空站对接」`src/Scene.tsx` 以及后续创建的「3 太空站离开」、「4 舱体降落」等场景）**必须共用同一套相机鼠标控制组件**：`src/components/scene/TaskCameraControls.tsx`（底层纯配置与跟随算法位于 `src/components/scene/taskCameraConfig.ts`）。
- 统一鼠标控制逻辑：
  - **左键拖拽**：旋转视角（`MOUSE.ROTATE`）
  - **右键拖拽**：平移视角（`MOUSE.PAN`，`screenSpacePanning: true`）
  - **滚轮滚动**：缩放距离（`MOUSE.DOLLY`）
- **后续新建或修改任何 3D 任务场景时，必须直接引入并使用 `<TaskCameraControls />` 与 `TASK_CAMERA_HINT_TEXT`，禁止在具体场景中单独新写 `<OrbitControls />` 或另写一套鼠标控制逻辑。**

## 测试

少用 computer use 直接测试。预先准备轻量自测接口，优先用接口测试。
不要过度工程化，优先解决当前任务。

## 发布
不要发布到 ChatGPT Sites。
