import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase, type Reminder, type MoodEntry, type Progress } from '../lib/supabase';
import { useAuth } from '../lib/auth';

type ScreenMode = 'morning' | 'evening';

const getScreenMode = (): ScreenMode => {
  const hour = new Date().getHours();
  return hour >= 6 && hour < 18 ? 'morning' : 'evening';
};

const imageForMode: Record<ScreenMode, string> = {
  morning: '/1.png',
  evening: '/2.png',
};

export default function PatientApp() {
  const { profile, signOut } = useAuth();
  const [mode, setMode] = useState<ScreenMode>(getScreenMode);
  const [notice, setNotice] = useState('');
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [todayMood, setTodayMood] = useState<MoodEntry | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setMode(getScreenMode()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    (async () => {
      const [{ data: remData }, { data: moodData }, { data: progData }] = await Promise.all([
        supabase.from('reminders').select('*').order('time', { ascending: true }),
        supabase
          .from('mood_entries')
          .select('*')
          .gte('created_at', new Date().toISOString().split('T')[0])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase.from('progress').select('*').maybeSingle(),
      ]);

      if (remData) setReminders(remData as Reminder[]);
      if (moodData) setTodayMood(moodData as MoodEntry);
      if (progData) setProgress(progData as Progress);
    })();
  }, []);

  const image = useMemo(() => imageForMode[mode], [mode]);

  const showNotice = useCallback((msg: string) => {
    setNotice(msg);
    window.setTimeout(() => setNotice(''), 2600);
  }, []);

  const handleAction = useCallback(
    async (target: string): Promise<void> => {
      switch (target) {
        case 'microphone':
          showNotice('Voice companion is ready.');
          break;
        case 'profile':
          showNotice(`Welcome, ${profile?.display_name ?? 'friend'}.`);
          break;
        case 'session':
          showNotice('Starting your memory walk.');
          break;
        case 'mood': {
          await supabase.from('mood_entries').insert({ mood: 'good' as const });
          setTodayMood({ id: 'temp', mood: 'good', note: null, user_id: '', created_at: new Date().toISOString() });
          showNotice('Thank you for sharing how you are arriving today.');
          break;
        }
        case 'activities':
          showNotice('Activities are ready to explore.');
          break;
        case 'progress': {
          const summary = progress
            ? `You are on level ${progress.level} with ${progress.total_stars} stars and a ${progress.current_streak}-day streak.`
            : 'Your recent progress is ready to view.';
          showNotice(summary);
          break;
        }
        case 'reminders': {
          if (reminders.length > 0) {
            const formatted = reminders
              .map((r) => `${r.time} — ${r.title} (${r.completed ? 'Done' : 'Pending'})`)
              .join(', ');
            showNotice(`Today's reminders: ${formatted}`);
          } else {
            showNotice('You have no reminders yet. You are doing wonderfully.');
          }
          break;
        }
        case 'more':
          showNotice('More options are ready to open.');
          break;
        default:
          showNotice('This area is ready to open.');
      }
    },
    [reminders, progress, profile, showNotice],
  );

  return (
    <main className="app-shell">
      <button className="patient-logout" onClick={signOut} aria-label="Sign out">Sign Out</button>
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
