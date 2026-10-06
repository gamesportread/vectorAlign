import { ArrowRight } from 'lucide-react';
import { scenarios } from '../../sim/scenarios';
import { useSession } from '../../store';

export function FieldGuide() {
  const language = useSession((s) => s.language);
  const t = (zh: string, en: string) => (language === 'zh' ? zh : en);

  return (
    <section className="content-page guide-page">
      <span className="eyebrow">{t('交会对接科学原理', 'THE SCIENCE OF APPROACH')}</span>
      <h1>{t('理解每一次推进', 'Understand every impulse.')}</h1>
      <p className="page-lead">
        {t(
          '四个小实验，理解对接中的位置、速度和姿态。',
          'Four small experiments in position, velocity and attitude.'
        )}
      </p>

      {scenarios.map((c) => (
        <article className="guide-lesson" key={c.id}>
          <span>0{c.id}</span>
          <div>
            <h2>{c.title[language]}</h2>
            <p>{c.lesson[language]}</p>
            <small>{c.constraints[language]}</small>
          </div>
        </article>
      ))}

      <article className="science-note">
        <h2>{t('模型与科学边界', 'Model & scientific boundaries')}</h2>
        <p>
          {t(
            '这是最后 100 米范围内的近距离教学模型。米、秒和角度有明确单位；推进、惯性和姿态运动通过固定时间步长计算。训练不模拟轨道交会、潮汐效应、复杂接触力学或真实 Dragon 控制系统。',
            'This is a near-field teaching model for the final 100 metres. Thrust, inertia and attitude use a fixed simulation timestep and explicit units. It does not model orbital rendezvous, tidal effects, complex contact mechanics or the real Dragon control system.'
          )}
        </p>
        <p>
          {t(
            '平移指令采用对接口坐标系下的理想合力，姿态指令作用于机体轴。辅助制动主动施加推力并消耗资源。空间站和飞船共同绕地球自由落体；本课程忽略局部相对运动中的轨道效应，并不代表太空没有重力。',
            'Translation uses ideal resultant forces in the docking-port frame; attitude commands act on body axes. Assist braking applies thrust and consumes resources. The station and ship are in orbital free fall: neglecting orbital effects locally does not mean there is no gravity in space.'
          )}
        </p>
        <p>
          {t(
            '教学捕获条件：轴向速度 ≤ 0.15 m/s，横向偏移 ≤ 0.18 m，横向速度 ≤ 0.04 m/s，总姿态误差 ≤ 2°，角速度 ≤ 0.5°/s。以上不是实际飞船操作限值。',
            'Teaching capture limits: axial speed ≤ 0.15 m/s, lateral offset ≤ 0.18 m, lateral speed ≤ 0.04 m/s, attitude error ≤ 2°, angular rate ≤ 0.5°/s. These are not operational spacecraft limits.'
          )}
        </p>
      </article>

      <article className="sources">
        <h2>{t('资料与致谢', 'Sources & credits')}</h2>
        <a
          href="https://www.nasa.gov/international-space-station/harmony-module/"
          target="_blank"
          rel="noreferrer"
        >
          {t('NASA · 和谐号节点舱', 'NASA · Harmony module')} <ArrowRight size={15} />
        </a>
        <a
          href="https://science.nasa.gov/resource/international-space-station-3d-model/"
          target="_blank"
          rel="noreferrer"
        >
          {t('NASA · 国际空间站 3D 官方模型', 'NASA VTAD · International Space Station model')} <ArrowRight size={15} />
        </a>
        <a
          href="https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/base-map/"
          target="_blank"
          rel="noreferrer"
        >
          {t('NASA 地球观测站 · 蓝色弹珠', 'NASA Earth Observatory · Blue Marble')} <ArrowRight size={15} />
        </a>
        <a
          href="https://www.nasa.gov/stem-content/crew-orbital-docking-simulation-coding-sim/"
          target="_blank"
          rel="noreferrer"
        >
          {t('NASA STEM · 载人轨道对接模拟', 'NASA STEM · Crew Orbital Docking Simulation')} <ArrowRight size={15} />
        </a>
        <p>
          {t(
            '独立教育项目，与 NASA 无隶属或背书关系。真实载人龙飞船（Dragon）通常自主对接；此处手动控制用于原理学习。2026 Space Apps 赛题适配和资格尚待核实。',
            'An independent educational project, not affiliated with or endorsed by NASA. Dragon normally docks autonomously; manual controls here teach the underlying principles. 2026 Space Apps challenge fit and eligibility remain unverified.'
          )}
        </p>
      </article>
    </section>
  );
}
