import { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

type ScreenMode = 'morning' | 'evening';

const getScreenMode = (): ScreenMode => {
  const hour = new Date().getHours();
  return hour >= 6 && hour < 18 ? 'morning' : 'evening';
};

const imageForMode: Record<ScreenMode, string> = {
  morning: '/1.png',
  evening: '/2.png',
};

const messageForTarget: Record<string, string> = {
  microphone: 'Voice companion is ready.',
  profile: 'Your profile is ready to open.',
  session: 'Starting your memory walk.',
  mood: 'Thank you for sharing how you are arriving today.',
  activities: 'Activities are ready to explore.',
  progress: 'Your recent progress is ready to view.',
  reminders: 'Your reminders are ready to view.',
  more: 'More options are ready to open.',
};

export default function App() {
  const [mode, setMode] = useState<ScreenMode>(getScreenMode);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const timer = window.setInterval(() => setMode(getScreenMode()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const image = useMemo(() => imageForMode[mode], [mode]);

  const handleAction = (target: string): void => {
    setNotice(messageForTarget[target] ?? 'This area is ready to open.');
    window.setTimeout(() => setNotice(''), 2600);
  };

  return (
    <main className="app-shell">
      <div className="landing-frame">
        <img
          className="landing-artwork"
          src={image}
          alt={mode === 'morning' ? 'Smaran morning home screen' : 'Smaran evening home screen'}
        />
        <button className="hotspot microphone" aria-label="Open voice companion" onClick={() => handleAction('microphone')} />
        <button className="hotspot profile" aria-label="Open profile" onClick={() => handleAction('profile')} />
        <button className="hotspot session" aria-label="Start memory walk" onClick={() => handleAction('session')} />
        <button className="hotspot mood-good" aria-label="Choose good mood" onClick={() => handleAction('mood')} />
        <button className="hotspot mood-okay" aria-label="Choose okay mood" onClick={() => handleAction('mood')} />
        <button className="hotspot mood-low" aria-label="Choose not so good mood" onClick={() => handleAction('mood')} />
        <button className="hotspot activities" aria-label="Open activities" onClick={() => handleAction('activities')} />
        <button className="hotspot progress" aria-label="Open progress" onClick={() => handleAction('progress')} />
        <button className="hotspot reminders" aria-label="Open reminders" onClick={() => handleAction('reminders')} />
        <button className="hotspot more" aria-label="Open more options" onClick={() => handleAction('more')} />
        <div className="screen-notice" role="status" aria-live="polite" data-visible={Boolean(notice)}>
          {notice}
        </div>
      </div>
    </main>
  );
}

const rootEl = document.getElementById('root');
if (rootEl) {
  createRoot(rootEl).render(<App />);
}
