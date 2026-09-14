import { useEffect, useState } from 'react';
import { supabase, type Profile, type Reminder, type MoodEntry, type ActivitySession, type Progress, type CaregiverLink } from '../lib/supabase';
import { useAuth } from '../lib/auth';

type PatientSummary = {
  profile: Profile;
  reminders: Reminder[];
  recentMoods: MoodEntry[];
  activities: ActivitySession[];
  progress: Progress | null;
};

export default function CaregiverDashboard() {
  const { profile, signOut } = useAuth();
  const [links, setLinks] = useState<CaregiverLink[]>([]);
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [linkEmail, setLinkEmail] = useState('');
  const [linkError, setLinkError] = useState('');
  const [linkSuccess, setLinkSuccess] = useState('');

  useEffect(() => {
    (async () => {
      if (!profile) return;
      const { data: linkData } = await supabase
        .from('caregiver_links')
        .select('*')
        .eq('caregiver_id', profile.id);

      if (!linkData || linkData.length === 0) {
        setLoading(false);
        return;
      }

      setLinks(linkData);

      const summaries: PatientSummary[] = [];
      for (const link of linkData) {
        const { data: patProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', link.patient_id)
          .maybeSingle();

        if (!patProfile) continue;

        const { data: remData } = await supabase
          .from('reminders')
          .select('*')
          .eq('user_id', link.patient_id)
          .order('time', { ascending: true });

        const { data: moodData } = await supabase
          .from('mood_entries')
          .select('*')
          .eq('user_id', link.patient_id)
          .order('created_at', { ascending: false })
          .limit(7);

        const { data: actData } = await supabase
          .from('activity_sessions')
          .select('*')
          .eq('user_id', link.patient_id)
          .order('created_at', { ascending: false })
          .limit(10);

        const { data: progData } = await supabase
          .from('progress')
          .select('*')
          .eq('user_id', link.patient_id)
          .maybeSingle();

        summaries.push({
          profile: patProfile as Profile,
          reminders: (remData as Reminder[]) || [],
          recentMoods: (moodData as MoodEntry[]) || [],
          activities: (actData as ActivitySession[]) || [],
          progress: (progData as Progress) || null,
        });
      }

      setPatients(summaries);
      setLoading(false);
    })();
  }, [profile]);

  const handleLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLinkError('');
    setLinkSuccess('');
    if (!profile || !linkEmail.trim()) return;

    const { data: patProfile, error: findError } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'patient')
      .ilike('display_name', linkEmail.trim())
      .maybeSingle();

    if (findError || !patProfile) {
      setLinkError('Could not find a patient with that name. Ask them for the name they signed up with.');
      return;
    }

    const { error: linkError } = await supabase
      .from('caregiver_links')
      .insert({ caregiver_id: profile.id, patient_id: patProfile.id });

    if (linkError) {
      if (linkError.code === '23505') {
        setLinkError('You are already linked to this patient.');
      } else {
        setLinkError('Could not link to this patient. Please try again.');
      }
      return;
    }

    setLinkSuccess(`Successfully linked to ${patProfile.display_name}!`);
    setLinkEmail('');
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="dash-loading">
        <div className="dash-spinner" />
        <p>Loading your dashboard...</p>
      </div>
    );
  }

  const selected = patients[selectedIdx];

  return (
    <div className="dash-page">
      <header className="dash-header">
        <div className="dash-header-left">
          <span className="dash-logo-mark">स्मरण</span>
          <div>
            <h1 className="dash-title">Caregiver Dashboard</h1>
            <p className="dash-subtitle">Welcome back, {profile?.display_name}</p>
          </div>
        </div>
        <button className="dash-logout" onClick={signOut}>Sign Out</button>
      </header>

      {patients.length === 0 ? (
        <div className="dash-empty">
          <div className="dash-empty-icon">🤝</div>
          <h2>No patients linked yet</h2>
          <p>Enter your patient's display name (the name they used when signing up) to link with them and start monitoring their progress.</p>
          <form className="link-form" onSubmit={handleLink}>
            <input
              type="text"
              value={linkEmail}
              onChange={(e) => setLinkEmail(e.target.value)}
              placeholder="Patient's display name"
              required
            />
            <button type="submit">Link Patient</button>
          </form>
          {linkError && <p className="link-error">{linkError}</p>}
          {linkSuccess && <p className="link-success">{linkSuccess}</p>}
        </div>
      ) : (
        <div className="dash-body">
          <aside className="dash-sidebar">
            <h3 className="sidebar-title">Your Patients</h3>
            <div className="patient-list">
              {patients.map((p, i) => (
                <button
                  key={p.profile.id}
                  className={`patient-chip ${i === selectedIdx ? 'active' : ''}`}
                  onClick={() => setSelectedIdx(i)}
                >
                  <span className="patient-avatar">{p.profile.display_name.charAt(0).toUpperCase()}</span>
                  <span className="patient-name">{p.profile.display_name}</span>
                </button>
              ))}
            </div>
            <form className="link-form-sidebar" onSubmit={handleLink}>
              <input
                type="text"
                value={linkEmail}
                onChange={(e) => setLinkEmail(e.target.value)}
                placeholder="Link another patient..."
              />
              <button type="submit">+</button>
            </form>
            {linkError && <p className="link-error small">{linkError}</p>}
            {linkSuccess && <p className="link-success small">{linkSuccess}</p>}
          </aside>

          {selected && (
            <main className="dash-main">
              <div className="patient-header">
                <div className="patient-avatar-lg">{selected.profile.display_name.charAt(0).toUpperCase()}</div>
                <div>
                  <h2 className="patient-header-name">{selected.profile.display_name}</h2>
                  <p className="patient-header-sub">Patient overview</p>
                </div>
              </div>

              <div className="stat-cards">
                <div className="stat-card">
                  <span className="stat-icon">⭐</span>
                  <div className="stat-value">{selected.progress?.total_stars ?? 0}</div>
                  <div className="stat-label">Total Stars</div>
                </div>
                <div className="stat-card">
                  <span className="stat-icon">📈</span>
                  <div className="stat-value">{selected.progress?.level ?? 1}</div>
                  <div className="stat-label">Level</div>
                </div>
                <div className="stat-card">
                  <span className="stat-icon">🔥</span>
                  <div className="stat-value">{selected.progress?.current_streak ?? 0}</div>
                  <div className="stat-label">Day Streak</div>
                </div>
                <div className="stat-card">
                  <span className="stat-icon">🎮</span>
                  <div className="stat-value">{selected.activities.length}</div>
                  <div className="stat-label">Activities (10 recent)</div>
                </div>
              </div>

              <div className="dash-grid">
                <section className="dash-panel">
                  <h3 className="panel-title">Today's Reminders</h3>
                  {selected.reminders.length === 0 ? (
                    <p className="panel-empty">No reminders set yet.</p>
                  ) : (
                    <ul className="reminder-list">
                      {selected.reminders.map((r) => (
                        <li key={r.id} className={`reminder-item ${r.completed ? 'done' : ''}`}>
                          <span className="reminder-time">{r.time}</span>
                          <span className="reminder-title">{r.title}</span>
                          <span className={`reminder-status ${r.completed ? 'done' : 'pending'}`}>
                            {r.completed ? 'Done' : 'Pending'}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <section className="dash-panel">
                  <h3 className="panel-title">Recent Mood</h3>
                  {selected.recentMoods.length === 0 ? (
                    <p className="panel-empty">No mood check-ins yet.</p>
                  ) : (
                    <div className="mood-chart">
                      {selected.recentMoods.slice(0, 7).reverse().map((m) => (
                        <div key={m.id} className="mood-bar">
                          <span className={`mood-emoji mood-${m.mood}`}>
                            {m.mood === 'good' ? '😊' : m.mood === 'okay' ? '😐' : '😔'}
                          </span>
                          <span className="mood-label">{m.mood}</span>
                          <span className="mood-date">
                            {new Date(m.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <section className="dash-panel">
                  <h3 className="panel-title">Recent Activities</h3>
                  {selected.activities.length === 0 ? (
                    <p className="panel-empty">No activities completed yet.</p>
                  ) : (
                    <ul className="activity-list">
                      {selected.activities.map((a) => (
                        <li key={a.id} className="activity-item">
                          <span className="activity-type">{a.activity_type}</span>
                          {a.score !== null && <span className="activity-score">Score: {a.score}</span>}
                          <span className="activity-date">
                            {new Date(a.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>
            </main>
          )}
        </div>
      )}
    </div>
  );
}
