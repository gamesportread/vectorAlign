import { AlertTriangle, ArrowRight, BookOpen, Check, RotateCcw, ShieldAlert, Sparkles } from 'lucide-react';
import { useSession } from '../../store';
import { FlightChart } from '../charts/FlightChart';
import { analyzeFlight } from '../../sim/debrief';

export function ReviewContent() {
  const language = useSession((s) => s.language);
  const latest = useSession((s) => s.latest);
  const start = useSession((s) => s.start);
  const select = useSession((s) => s.select);
  const openIntro = useSession((s) => s.openIntro);

  const t = (zh: string, en: string) => (language === 'zh' ? zh : en);

  if (!latest?.result) {
    return <p>{t('暂无飞行记录', 'No flight recorded yet.')}</p>;
  }

  const analysis = analyzeFlight(latest, language);
  const success = analysis.isSuccess;

  return (
    <div className="debrief-container">
      {/* 状态徽章与核心诊断 */}
      <div className={`debrief-header ${success ? 'is-success' : 'is-failure'}`}>
        <div className={`result-icon ${success ? 'success' : 'failure'}`}>
          {success ? <Check size={32} /> : <AlertTriangle size={30} />}
        </div>
        <div className="debrief-header-text">
          <div className="debrief-badges">
            <span className={`debrief-pill pill-${analysis.badgeType}`}>
              {analysis.badgeTitle}
            </span>
            <span className="debrief-scenario-pill">
              {t(`关卡 0${latest.scenario}`, `Mission 0${latest.scenario}`)} · {latest.config.title[language]}
            </span>
          </div>
          <h3 className="result-title">{analysis.headline}</h3>
          <p className="debrief-summary">{analysis.causeExplanation}</p>
          {latest.demo && (
            <p className="demo-notice" style={{ marginTop: '8px', color: '#9bb8a8', fontSize: '0.8125rem' }}>
              {t(
                '这段示范使用与你相同的推进与物理模型。亲自完成任务后会记录课程进度。',
                'This demo uses the same thrusters and physics as your flight. Complete a flight yourself to earn course progress.'
              )}
            </p>
          )}
        </div>
      </div>

      {/* 事故黑匣子关键指标对比网格 */}
      <div className="debrief-metrics-grid">
        {analysis.metrics.map((m) => (
          <div key={m.id} className={`debrief-metric-card ${m.passed ? 'is-pass' : 'is-fail'}`}>
            <div className="metric-header">
              <span className="metric-title">{m.name}</span>
              <span className={`metric-badge ${m.passed ? 'badge-pass' : 'badge-fail'}`}>
                {m.passed ? (success ? '✓ 达标' : '✓ 正常') : '✕ 超标'}
              </span>
            </div>
            <div className="metric-values">
              <strong className="metric-actual">{m.valueText}</strong>
              <small className="metric-target">{t('标准', 'Target')}: {m.limitText}</small>
            </div>
            <p className="metric-eval">{m.comment}</p>
          </div>
        ))}
      </div>

      {/* 航天员教官支招与科学原理解释 */}
      <div className="debrief-insights-card">
        <div className="insight-section">
          <div className="insight-title">
            <Sparkles size={16} />
            <h4>{t('科学原理揭秘', 'The Physics in Space')}</h4>
          </div>
          <p>{analysis.physicsInsight}</p>
        </div>

        {!success && (
          <div className="insight-section tips-section">
            <div className="insight-title">
              <ShieldAlert size={16} />
              <h4>{t('教官通关秘籍 (下一把怎么做)', 'Flight Instructor Tips')}</h4>
            </div>
            <ul className="pilot-tips-list">
              {analysis.pilotTips.map((tip, idx) => (
                <li key={idx}>
                  <span className="tip-index">{idx + 1}</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* 飞行时序曲线图表 */}
      <FlightChart record={latest} />

      {/* 弹窗底部操作按钮 */}
      <div className="modal-actions debrief-actions">
        <button
          className="secondary-button"
          onClick={() => {
            select(latest.scenario, latest.config);
            start();
          }}
        >
          <RotateCcw size={16} />
          {t('重新尝试 (R)', 'Try again (R)')}
        </button>

        {!success && (
          <button
            className="secondary-button guide-hint-btn"
            onClick={() => {
              openIntro(2); // 导引直接跳到第3步：太空没有刹车片
            }}
          >
            <BookOpen size={16} />
            {t('查看新手讲解', 'Review Guide')}
          </button>
        )}

        {success && !latest.demo && latest.scenario < 4 && (
          <button
            className="primary-button"
            onClick={() => select(latest.scenario + 1)}
          >
            {t('下一任务', 'Next mission')}
            <ArrowRight size={16} />
          </button>
        )}
      </div>
    </div>
  );
}

export function ReviewModal() {
  return <ReviewContent />;
}
