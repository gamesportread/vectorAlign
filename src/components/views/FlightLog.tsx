import { Radio } from 'lucide-react';
import { scenarios } from '../../sim/scenarios';
import { useSession } from '../../store';
import { ReviewContent } from '../modals/ReviewModal';

export function FlightLog() {
  const language = useSession((s) => s.language);
  const latest = useSession((s) => s.latest);

  const t = (zh: string, en: string) => (language === 'zh' ? zh : en);
  const scenarioConfig = scenarios.find((c) => c.id === latest?.scenario);

  return (
    <section className="content-page">
      <span className="eyebrow">{t('飞行记录仪', 'FLIGHT RECORDER')}</span>
      <h1>{t('你的飞行记录', 'Your flight log')}</h1>

      {latest ? (
        <>
          <p>
            {scenarioConfig?.title[language]} ·{' '}
            {new Date(latest.date).toLocaleString(
              language === 'zh' ? 'zh-CN' : 'en-US'
            )}{' '}
            {latest.demo ? (language === 'zh' ? '· 示范' : '· DEMO') : ''}
          </p>
          <ReviewContent />
        </>
      ) : (
        <div className="empty-state">
          <Radio size={38} />
          <h3>{t('第一段轨迹，等你来画。', 'Your first flight is waiting.')}</h3>
          <p>
            {t(
              '完成或结束一次任务后，在这里查看最近一次飞行轨迹和复盘。',
              'Finish a mission to review your latest trajectory and debrief here.'
            )}
          </p>
        </div>
      )}
    </section>
  );
}
