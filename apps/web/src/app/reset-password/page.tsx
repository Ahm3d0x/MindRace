'use client';

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import Link from 'next/link';

export default function ResetPasswordPage() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isRtl, setIsRtl] = useState(false);

  const activeText = isRtl
    ? {
        title: 'استعادة كلمة المرور',
        subtitle: 'أدخل بريدك الإلكتروني لتلقي رابط إعادة التعيين',
        emailLabel: 'البريد الإلكتروني',
        submitBtn: 'إرسال رابط الاستعادة',
        submitLoading: 'جاري الإرسال...',
        backToLogin: 'العودة لتسجيل الدخول',
        successAlert: 'تم إرسال الرابط! يرجى مراجعة علبة الوارد الخاصة بك.',
        errorDefault: 'حدث خطأ. يرجى التحقق من البريد المدخل والمحاولة مرة أخرى.',
        langSwitch: 'English',
      }
    : {
        title: 'Reset Password',
        subtitle: 'Enter your email to receive a recovery link',
        emailLabel: 'Email Address',
        submitBtn: 'Send Recovery Link',
        submitLoading: 'Sending Link...',
        backToLogin: 'Back to Sign In',
        successAlert: 'Recovery link sent! Please check your email inbox.',
        errorDefault: 'An error occurred. Please verify your email and try again.',
        langSwitch: 'العربية',
      };

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const { error } = await resetPassword(email);
      if (error) {
        setErrorMsg(error.message || activeText.errorDefault);
      } else {
        setSuccessMsg(activeText.successAlert);
        setEmail('');
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

          <form onSubmit={handleResetRequest} style={styles.form}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>{activeText.emailLabel}</label>
              <input
                type="email"
                required
                style={styles.input}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>

            <button type="submit" disabled={loading} className="btn-cyber" style={styles.submitBtn}>
              {loading ? activeText.submitLoading : activeText.submitBtn}
            </button>
          </form>

          <div style={styles.footer}>
            <Link href="/login" style={styles.footerLink}>
              {activeText.backToLogin}
            </Link>
          </div>
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
  footer: {
    marginTop: '32px',
    textAlign: 'center',
    fontSize: '0.9rem',
  },
  footerLink: {
    color: 'var(--primary)',
    fontWeight: 600,
  },
};
