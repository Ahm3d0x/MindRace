'use client';

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function UpdatePasswordPage() {
  const { updatePassword } = useAuth();
  const router = useRouter();

  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isRtl, setIsRtl] = useState(false);

  const activeText = isRtl
    ? {
        title: 'تعيين كلمة المرور الجديدة',
        subtitle: 'أدخل كلمة مرور جديدة قوية لتأمين حسابك',
        passwordLabel: 'كلمة المرور الجديدة',
        submitBtn: 'تحديث كلمة المرور',
        submitLoading: 'جاري التحديث...',
        successAlert: 'تم تحديث كلمة المرور بنجاح! سيتم تحويلك إلى الرئيسية...',
        errorDefault: 'فشل التحديث. يرجى المحاولة مرة أخرى.',
        langSwitch: 'English',
      }
    : {
        title: 'Set New Password',
        subtitle: 'Enter a strong new password to secure your account',
        passwordLabel: 'New Password',
        submitBtn: 'Update Password',
        submitLoading: 'Updating Password...',
        successAlert: 'Password updated successfully! Redirecting you to home...',
        errorDefault: 'Failed to update password. Please try again.',
        langSwitch: 'العربية',
      };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const { error } = await updatePassword(password);
      if (error) {
        setErrorMsg(error.message || activeText.errorDefault);
      } else {
        setSuccessMsg(activeText.successAlert);
        setPassword('');
        setTimeout(() => {
          router.push('/');
        }, 2000);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : activeText.errorDefault;
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={styles.container} dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Top Header Glow Bar */}
      <div style={styles.topBar}>
        <div style={styles.topBarContent}>
          <div style={styles.logoContainer}>
            <Link href="/" style={styles.logoLink}>
              <span className="text-glow" style={styles.logoText}>MIND RACE</span>
            </Link>
          </div>
          <button style={styles.rtlBtn} onClick={() => setIsRtl(!isRtl)}>
            {activeText.langSwitch}
          </button>
        </div>
      </div>

      <div style={styles.authWrapper}>
        <div className="glass-panel" style={styles.authCard}>
          <div style={styles.header}>
            <h1 className="text-glow" style={styles.title}>
              {activeText.title}
            </h1>
            <p style={styles.subtitle}>{activeText.subtitle}</p>
          </div>

          {errorMsg && (
            <div style={styles.errorAlert}>
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div style={styles.successAlert}>
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleUpdatePassword} style={styles.form}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>{activeText.passwordLabel}</label>
              <input
                type="password"
                required
                style={styles.input}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="min. 6 characters"
              />
            </div>

            <button type="submit" disabled={loading} className="btn-cyber" style={styles.submitBtn}>
              {loading ? activeText.submitLoading : activeText.submitBtn}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'var(--bg-deep)',
  },
  topBar: {
    height: '70px',
    borderBottom: '1px solid var(--border-glass)',
    background: 'rgba(9, 10, 15, 0.8)',
    backdropFilter: 'blur(10px)',
  },
  topBarContent: {
    maxWidth: '1200px',
    height: '100%',
    margin: '0 auto',
    padding: '0 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logoContainer: {
    display: 'flex',
    alignItems: 'center',
  },
  logoLink: {
    textDecoration: 'none',
  },
  logoText: {
    fontSize: '1.4rem',
    fontWeight: 800,
    letterSpacing: '0.15em',
    color: '#ffffff',
  },
  rtlBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid var(--border-glass)',
    color: 'var(--text-primary)',
    padding: '8px 16px',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '0.85rem',
  },
  authWrapper: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 24px',
  },
  authCard: {
    width: '100%',
    maxWidth: '450px',
    padding: '40px',
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginBottom: '30px',
    textAlign: 'center',
  },
  title: {
    fontSize: '2rem',
    fontWeight: 800,
    background: 'linear-gradient(to right, #ffffff, #a0aec0)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  subtitle: {
    fontSize: '0.95rem',
    color: 'var(--text-secondary)',
  },
  errorAlert: {
    backgroundColor: 'rgba(255, 23, 68, 0.1)',
    border: '1px solid var(--error)',
    color: 'var(--error)',
    padding: '12px 16px',
    borderRadius: 'var(--radius-sm)',
    marginBottom: '24px',
    fontSize: '0.9rem',
    textAlign: 'center',
  },
  successAlert: {
    backgroundColor: 'rgba(0, 230, 118, 0.1)',
    border: '1px solid var(--success)',
    color: 'var(--success)',
    padding: '12px 16px',
    borderRadius: 'var(--radius-sm)',
    marginBottom: '24px',
    fontSize: '0.9rem',
    textAlign: 'center',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '0.85rem',
    fontWeight: 600,
    color: 'var(--text-secondary)',
  },
  input: {
    backgroundColor: 'var(--bg-input)',
    border: '1px solid var(--border-glass)',
    borderRadius: 'var(--radius-sm)',
    color: '#ffffff',
    padding: '12px 16px',
    fontSize: '0.95rem',
    outline: 'none',
    transition: 'all 0.2s',
  },
  submitBtn: {
    marginTop: '10px',
    width: '100%',
  },
};
