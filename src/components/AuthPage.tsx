import { useState } from 'react';

type Role = 'patient' | 'asha' | 'caregiver';

const roles = [
  { id: 'patient' as const, label: 'Patient', description: 'For your daily wellbeing', icon: '01' },
  { id: 'asha' as const, label: 'ASHA Worker', description: 'For community care', icon: '02' },
  { id: 'caregiver' as const, label: 'Caregiver', description: 'For someone you love', icon: '03' },
];

export default function AuthPage() {
  const [role, setRole] = useState<Role>('patient');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const selectedRole = roles.find((item) => item.id === role);

  const showDemoMessage = (text: string) => setMessage(`${text} is ready to connect.`);

  return (
    <main className="auth-page">
      <div className="auth-shell">
        <section className="auth-story" aria-label="About Smaran">
          <div className="story-topline"><span className="story-sun" /> स्मरण <span>SMARAN</span></div>
          <div className="story-copy">
            <p className="eyebrow">A little more present, every day</p>
            <h1>Memory care,<br /><em>made gentle.</em></h1>
            <p className="story-description">A thoughtful space for moments that matter — for people living with memory loss and the people who walk beside them.</p>
          </div>
          <div className="story-note"><span className="note-mark">“</span><p>Small moments become<br />beautiful memories.</p></div>
          <div className="story-orbit orbit-one" /><div className="story-orbit orbit-two" />
        </section>

        <section className="auth-card" aria-labelledby="auth-title">
          <div className="auth-header">
            <div className="auth-mobile-mark">स्मरण <span>SMARAN</span></div>
            <p className="eyebrow">Welcome to Smaran</p>
            <h2 id="auth-title">Let&apos;s begin together.</h2>
            <p>Choose how you&apos;ll be using Smaran today.</p>
          </div>

          <div className="role-grid" role="group" aria-label="Choose your role">
            {roles.map((item) => (
              <button key={item.id} className={`role-card ${role === item.id ? 'active' : ''}`} onClick={() => setRole(item.id)} type="button" aria-pressed={role === item.id}>
                <span className="role-number">{item.icon}</span><span className="role-card-label">{item.label}</span><span className="role-card-description">{item.description}</span><span className="role-check">✓</span>
              </button>
            ))}
          </div>

          <p className="selected-role">You&apos;re joining as <strong>{selectedRole?.label}</strong></p>

          <button className="google-btn" onClick={() => showDemoMessage('Google sign in')} type="button"><span className="google-g">G</span> Continue with Google</button>
          <div className="auth-divider"><span>or continue with email</span></div>
          <form className="auth-form" onSubmit={(event) => { event.preventDefault(); showDemoMessage('Email sign in'); }}>
            <div className="form-field"><label htmlFor="email">Email address</label><input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required autoComplete="email" /></div>
            <button className="auth-submit" type="submit">Continue with email <span>→</span></button>
          </form>
          <button className="guest-btn" type="button" onClick={() => showDemoMessage('Guest access')}>Continue as a guest <span>↗</span></button>
          {message && <p className="auth-demo-message" role="status">{message}</p>}
          <p className="auth-privacy">Your information stays private and secure. <a href="#privacy">Learn more</a></p>
        </section>
      </div>
    </main>
  );
}
