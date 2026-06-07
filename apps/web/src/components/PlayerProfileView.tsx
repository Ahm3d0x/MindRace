import React, { useState, useEffect } from 'react';
import { RankBadge } from './RankBadge';
import { supabase } from '../lib/supabase';

interface PlayerProfileViewProps {
  user: {
    id: string;
    username: string;
    email: string;
    rank: string;
    rankPoints: number;
    coins: number;
    creatorTokens?: number;
    badges: string[];
    inventory: string[];
    equipped: { border: string | null; effect: string | null; avatar: string | null };
    stats: {
      winRate?: number;
      correctAnswersRate?: number;
      averageAnswerTimeMs?: number;
      fastestAnswerMs?: number;
      matchesPlayed?: number;
      matchesWon?: number;
      totalQuestionsAnswered?: number;
      totalCorrectAnswers?: number;
      consecutiveWins?: number;
      bestSurvivalLevel?: number;
      correct_Science?: number;
      correct_History?: number;
      dailyStreak?: number;
      captainMatchesWon?: number;
      tournamentWins?: number;
      tournamentCount?: number;
      [key: string]: any;
    };
  };
  onClose: () => void;
  isRtl: boolean;
  setIsRtl: (v: boolean) => void;
  sfxEnabled: boolean;
  setSfxEnabled: (v: boolean) => void;
  sfxVolume: number;
  setSfxVolume: (v: number) => void;
  playSFX: (type: string) => void;
  signOut: () => void;
  refreshProfile: () => Promise<void>;
  triggerAlert: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const BADGES_METADATA = [
  { key: 'first_win', name: { en: 'First Victory', ar: 'النصر الأول' }, desc: { en: 'Win your first match', ar: 'فز بمباراتك الأولى' }, icon: '🥇', target: 1 },
  { key: 'century', name: { en: 'Century', ar: 'القرن' }, desc: { en: 'Play 100 matches', ar: 'العب 100 مباراة' }, icon: '💯', target: 100 },
  { key: 'speed_demon', name: { en: 'Speed Demon', ar: 'شيطان السرعة' }, desc: { en: 'Answer in under 1.5 seconds', ar: 'أجب في أقل من 1.5 ثانية' }, icon: '⚡', target: 1.5 },
  { key: 'undefeated', name: { en: 'Undefeated', ar: 'لا يقهر' }, desc: { en: 'Win 50 consecutive matches', ar: 'فز بـ 50 مباراة متتالية' }, icon: '🔥', target: 50 },
  { key: 'team_leader', name: { en: 'Team Leader', ar: 'قائد الفريق' }, desc: { en: 'Win 100 matches as captain', ar: 'فز بـ 100 مباراة كقائد' }, icon: '👑', target: 100 },
  { key: 'tournament_king', name: { en: 'Tournament King', ar: 'ملك البطولة' }, desc: { en: 'Complete a tournament without a loss', ar: 'أكمل بطولة كاملة دون خسارة' }, icon: '🏰', target: 1 },
  { key: 'scientist', name: { en: 'Scientist', ar: 'العالِم' }, desc: { en: 'Answer 1,000 science questions correctly', ar: 'أجب عن 1000 سؤال علوم بشكل صحيح' }, icon: '🧪', target: 1000 },
  { key: 'historian', name: { en: 'Historian', ar: 'المؤرخ' }, desc: { en: 'Answer 1,000 history questions correctly', ar: 'أجب عن 1000 سؤال تاريخ بشكل صحيح' }, icon: '📜', target: 1000 },
  { key: 'sharpshooter', name: { en: 'Sharpshooter', ar: 'القناص' }, desc: { en: 'Achieve 90%+ accuracy in a 20+ Q match', ar: 'دقة 90%+ في مباراة 20+ سؤال' }, icon: '🎯', target: 90 },
  { key: 'survivor', name: { en: 'Survivor', ar: 'الناجي' }, desc: { en: 'Reach level 50 in Survival Mode', ar: 'صل للمستوى 50 في نمط البقاء' }, icon: '⛺', target: 50 },
  { key: 'daily_devotee', name: { en: 'Daily Devotee', ar: 'المثابر اليومي' }, desc: { en: 'Complete 30 daily challenges in a row', ar: 'أكمل 30 تحدي يومي متتالي' }, icon: '📆', target: 30 },
  { key: 'knowledge_titan', name: { en: 'Knowledge Titan', ar: 'عملاق المعرفة' }, desc: { en: 'Reach Titan rank (9,000 RP)', ar: 'صل إلى رتبة العملاق (9000 نقطة)' }, icon: '🌌', target: 9000 }
];

interface SeasonArchive {
  id: string;
  season_id: string;
  user_id: string;
  username: string;
  rank_tier: string;
  rank_points: number;
  placement: number;
  rewards_awarded: {
    coins?: number;
    badge?: string;
    cosmetic?: string;
  };
  archived_at: string;
  seasons: {
    name: string;
    theme: string;
  };
}

export const PlayerProfileView: React.FC<PlayerProfileViewProps> = ({
  user,
  onClose,
  isRtl,
  setIsRtl,
  sfxEnabled,
  setSfxEnabled,
  sfxVolume,
  setSfxVolume,
  playSFX,
  signOut,
  refreshProfile,
  triggerAlert
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'stats' | 'badges' | 'settings'>('overview');
  const [archives, setArchives] = useState<SeasonArchive[]>([]);
  const [loadingArchives, setLoadingArchives] = useState<boolean>(false);

  // Help & Guides state
  const [openGuide, setOpenGuide] = useState<string | null>(null);

  // Settings states
  const [effectsEnabled, setEffectsEnabled] = useState<boolean>(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(true);

  // Account form states
  const [newUsername, setNewUsername] = useState<string>(user?.username || '');
  const [newPassword, setNewPassword] = useState<string>('');
  const [loadingUsername, setLoadingUsername] = useState<boolean>(false);
  const [loadingPassword, setLoadingPassword] = useState<boolean>(false);

  useEffect(() => {
    // Load local storage preferences
    const eff = localStorage.getItem('graphics_effects_enabled');
    if (eff !== null) setEffectsEnabled(eff === 'true');
    const notif = localStorage.getItem('notifications_enabled');
    if (notif !== null) setNotificationsEnabled(notif === 'true');
  }, []);

  const handleToggleEffects = () => {
    playSFX('click');
    const nextVal = !effectsEnabled;
    setEffectsEnabled(nextVal);
    localStorage.setItem('graphics_effects_enabled', String(nextVal));
  };

  const handleToggleNotifications = () => {
    playSFX('click');
    const nextVal = !notificationsEnabled;
    setNotificationsEnabled(nextVal);
    localStorage.setItem('notifications_enabled', String(nextVal));
  };

  // Fetch seasonal records
  useEffect(() => {
    if (user?.id && activeTab === 'stats') {
      const fetchArchives = async () => {
        setLoadingArchives(true);
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const token = session?.access_token;
          if (!token) return;

          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/v1/seasons/archive`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (res.ok) {
            const data = await res.json();
            const userArchives = (data || []).filter((item: SeasonArchive) => item.user_id === user.id);
            setArchives(userArchives);
          }
        } catch (err) {
          console.error('Error fetching user season archives:', err);
        } finally {
          setLoadingArchives(false);
        }
      };

      fetchArchives();
    }
  }, [user?.id, activeTab]);

  // Update Username
  const handleUpdateUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || newUsername === user.username) return;

    setLoadingUsername(true);
    playSFX('click');

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ username: newUsername.trim() })
        .eq('id', user.id);

      if (error) throw error;

      triggerAlert(isRtl ? 'تم تحديث اسم المستخدم بنجاح!' : 'Username updated successfully!', 'success');
      await refreshProfile();
    } catch (err: any) {
      playSFX('wrong');
      triggerAlert(err.message || (isRtl ? 'فشل تحديث الاسم' : 'Failed to update username'), 'error');
    } finally {
      setLoadingUsername(false);
    }
  };

  // Update Password
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword.trim() || newPassword.length < 6) {
      triggerAlert(isRtl ? 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' : 'Password must be at least 6 characters', 'error');
      return;
    }

    setLoadingPassword(true);
    playSFX('click');

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword.trim() });
      if (error) throw error;

      triggerAlert(isRtl ? 'تم تحديث كلمة المرور بنجاح!' : 'Password updated successfully!', 'success');
      setNewPassword('');
    } catch (err: any) {
      playSFX('wrong');
      triggerAlert(err.message || (isRtl ? 'فشل تحديث كلمة المرور' : 'Failed to update password'), 'error');
    } finally {
      setLoadingPassword(false);
    }
  };

  // Calculations
  const points = user.rankPoints || 0;
  const winRate = user.stats?.winRate ?? 0;
  const accuracy = user.stats?.correctAnswersRate ?? 0;
  const speed = user.stats?.averageAnswerTimeMs ? (user.stats.averageAnswerTimeMs / 1000).toFixed(2) : '0.00';
  const fastest = user.stats?.fastestAnswerMs ? (user.stats.fastestAnswerMs / 1000).toFixed(2) : '0.00';
  const totalQuestions = user.stats?.totalQuestionsAnswered ?? 0;
  const correctAnswers = user.stats?.totalCorrectAnswers ?? 0;

  // Performance Rating Logic
  const calculatePerformanceRating = () => {
    const score = (winRate * 0.6) + (accuracy * 0.4);
    if (score >= 90) return 'S+';
    if (score >= 80) return 'S';
    if (score >= 70) return 'A';
    if (score >= 60) return 'B';
    if (score >= 45) return 'C';
    return 'D';
  };

  const getEquippedBorderStyle = (borderKey: string | null, rank: string) => {
    if (borderKey === 'cyber_neon') return { backgroundImage: 'linear-gradient(rgba(15,18,30,1), rgba(15,18,30,1)), linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)', border: '4px solid transparent', backgroundOrigin: 'border-box', backgroundClip: 'padding-box, border-box' };
    if (borderKey === 'gold_halo') return { backgroundImage: 'linear-gradient(rgba(15,18,30,1), rgba(15,18,30,1)), linear-gradient(135deg, #ffd700 0%, #fbbf24 100%)', border: '4px solid transparent', backgroundOrigin: 'border-box', backgroundClip: 'padding-box, border-box' };
    if (borderKey === 'dark_matter') return { backgroundImage: 'linear-gradient(rgba(15,18,30,1), rgba(15,18,30,1)), linear-gradient(135deg, #8b5cf6 0%, #090d16 100%)', border: '4px solid transparent', backgroundOrigin: 'border-box', backgroundClip: 'padding-box, border-box' };
    return { border: '3px solid rgba(255, 255, 255, 0.1)' };
  };

  const ranks = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Master', 'Grand Master', 'Legend', 'Mythic', 'Titan'];
  const arabicRanks: Record<string, string> = {
    'Bronze': 'برونزي',
    'Silver': 'فضي',
    'Gold': 'ذهبي',
    'Platinum': 'بلاتيني',
    'Diamond': 'ألماسي',
    'Master': 'خبير',
    'Grand Master': 'أستاذ كبير',
    'Legend': 'أسطورة',
    'Mythic': 'خرافي',
    'Titan': 'عملاق'
  };

  const getRankLabel = (tier: string) => {
    return isRtl ? (arabicRanks[tier] || tier) : tier;
  };

  // Badge progress calc
  const getBadgeProgress = (badgeKey: string) => {
    const s = user.stats || {};
    const matchesPlayed = s.matchesPlayed || 0;
    const matchesWon = s.matchesWon || 0;
    const consecutiveWins = s.consecutiveWins || 0;
    const bestSurvivalLevel = s.bestSurvivalLevel || 0;
    const correctScience = s.correct_Science || 0;
    const correctHistory = s.correct_History || 0;
    const dailyStreak = s.dailyStreak || 0;
    const captainMatchesWon = s.captainMatchesWon || 0;
    const tournamentWins = s.tournamentWins || 0;

    switch (badgeKey) {
      case 'first_win':
        return matchesWon >= 1 ? 100 : 0;
      case 'century':
        return Math.min(100, Math.round((matchesPlayed / 100) * 100));
      case 'speed_demon':
        return (s.fastestAnswerMs && s.fastestAnswerMs <= 1500) ? 100 : 0;
      case 'undefeated':
        return Math.min(100, Math.round((consecutiveWins / 50) * 100));
      case 'team_leader':
        return Math.min(100, Math.round((captainMatchesWon / 100) * 100));
      case 'tournament_king':
        return tournamentWins >= 1 ? 100 : 0;
      case 'scientist':
        return Math.min(100, Math.round((correctScience / 1000) * 100));
      case 'historian':
        return Math.min(100, Math.round((correctHistory / 1000) * 100));
      case 'sharpshooter':
        return accuracy >= 90 ? 100 : Math.round((accuracy / 90) * 100);
      case 'survivor':
        return Math.min(100, Math.round((bestSurvivalLevel / 50) * 100));
      case 'daily_devotee':
        return Math.min(100, Math.round((dailyStreak / 30) * 100));
      case 'knowledge_titan':
        return Math.min(100, Math.round((points / 9000) * 100));
      default:
        return 0;
    }
  };

  const getBadgeCurrentValue = (badgeKey: string) => {
    const s = user.stats || {};
    switch (badgeKey) {
      case 'first_win': return s.matchesWon || 0;
      case 'century': return s.matchesPlayed || 0;
      case 'speed_demon': return s.fastestAnswerMs ? `${(s.fastestAnswerMs / 1000).toFixed(2)}s` : 'N/A';
      case 'undefeated': return s.consecutiveWins || 0;
      case 'team_leader': return s.captainMatchesWon || 0;
      case 'tournament_king': return s.tournamentWins || 0;
      case 'scientist': return s.correct_Science || 0;
      case 'historian': return s.correct_History || 0;
      case 'sharpshooter': return `${accuracy}%`;
      case 'survivor': return s.bestSurvivalLevel || 0;
      case 'daily_devotee': return s.dailyStreak || 0;
      case 'knowledge_titan': return points;
      default: return 0;
    }
  };

  // Translations
  const t = {
    overview: isRtl ? 'العامة' : 'Overview',
    stats: isRtl ? 'الإحصائيات' : 'Stats & Rankings',
    badges: isRtl ? 'الإنجازات' : 'Achievements',
    settings: isRtl ? 'الإعدادات' : 'Settings',
    lvl: isRtl ? 'المستوى' : 'Level',
    rank: isRtl ? 'الرتبة' : 'Rank',
    totalXP: isRtl ? 'إجمالي الخبرة' : 'Total XP',
    played: isRtl ? 'عدد المباريات' : 'Matches Played',
    won: isRtl ? 'الانتصارات' : 'Matches Won',
    winRate: isRtl ? 'نسبة الفوز' : 'Win Rate',
    rating: isRtl ? 'تصنيف الأداء' : 'Performance Rating',
    accuracy: isRtl ? 'الدقة' : 'Accuracy',
    speed: isRtl ? 'السرعة' : 'Speed Score',
    activity: isRtl ? 'النشاط' : 'Activity Score',
    pastSeasons: isRtl ? 'سجلات المواسم السابقة' : 'Past Season Records',
    generalSettings: isRtl ? 'الإعدادات العامة' : 'General Settings',
    soundEffects: isRtl ? 'المؤثرات الصوتية' : 'Sound Effects',
    volume: isRtl ? 'مستوى الصوت' : 'Sound Volume',
    visualEffects: isRtl ? 'التأثيرات البصرية' : 'Visual Effects',
    notifications: isRtl ? 'الإشعارات' : 'Notifications',
    helpGuides: isRtl ? 'شرح ودليل اللعبة' : 'Help & Guides',
    accountSettings: isRtl ? 'إعدادات الحساب' : 'Account Settings',
    updateUsername: isRtl ? 'تعديل اسم المستخدم' : 'Edit Username',
    updatePassword: isRtl ? 'تعديل كلمة المرور' : 'Edit Password',
    logout: isRtl ? 'تسجيل الخروج' : 'Log Out',
    saveBtn: isRtl ? 'حفظ' : 'Save',
    unlocked: isRtl ? 'مكتمل' : 'Unlocked',
    progress: isRtl ? 'التقدم' : 'Progress'
  };

  const guides = [
    {
      key: 'about',
      title: { en: 'Game Description', ar: 'شرح اللعبة' },
      content: {
        en: 'MindRace is a real-time intellectual battle arena where players compete in various fields of knowledge. Earn RP to rank up from Bronze to Titan, gather coins to purchase premium cosmetics, and complete quests to earn bonus rewards.',
        ar: 'العباقرة (MindRace) هي ساحة معارك معرفية فورية يتنافس فيها اللاعبون في مختلف مجالات المعرفة. اجمع نقاط التصنيف (RP) لتصعد من رتبة البرونزي إلى العملاق، واجمع العملات الذهبية لشراء إطارات وتأثيرات بصرية مميزة، وأكمل المهام اليومية للحصول على مكافآت مضاعفة.'
      }
    },
    {
      key: 'how-to-play',
      title: { en: 'How to Play', ar: 'كيفية اللعب' },
      content: {
        en: '1. Click PLAY ARENA to start a standard timed match.\n2. Click Solo Practice to answer questions without time pressure.\n3. Survival Mode gives you 3 lives, wrong answers cost 1 life.\n4. Create custom Multiplayer lobbies to host match rooms with friends.',
        ar: '1. اضغط على "PLAY ARENA" لبدء تحدٍ سريع تحت ضغط الوقت.\n2. العب "Solo Practice" للتمرن والتعلم دون وجود عداد للوقت.\n3. تحدى نفسك في "Survival Arena" حيث تبدأ بـ 3 أرواح وتفقد روحاً مع كل إجابة خاطئة.\n4. أنشئ غرف مبارزة جماعية (Custom Battle Room) وتحدى أصدقاءك بالرموز الخاصة.'
      }
    },
    {
      key: 'ranking',
      title: { en: 'Ranking System', ar: 'نظام التصنيف' },
      content: {
        en: 'Ranks are determined by your Rank Points (RP). Every 1,000 RP upgrades your tier. Tiers progress as follows: Bronze -> Silver -> Gold -> Platinum -> Diamond -> Master -> Grand Master -> Legend -> Mythic -> Titan. Winning matches awards RP, while losing deducts RP.',
        ar: 'يتم تحديد رتبتك بناءً على نقاط التصنيف (RP). كل 1000 نقطة ترفع مستواك للرتبة التالية. الترتيب هو: برونزي -> فضي -> ذهبي -> بلاتيني -> ألماسي -> خبير -> أستاذ كبير -> أسطورة -> خرافي -> عملاق. الفوز يمنحك نقاطاً بينما الخسارة تخصم منك النقاط.'
      }
    },
    {
      key: 'faq',
      title: { en: 'Frequently Asked Questions', ar: 'الأسئلة الشائعة' },
      content: {
        en: 'Q: How do I get Coins?\nA: Win matches, complete daily challenges, and claim seasonal rewards.\n\nQ: How do I equip avatar borders?\nA: Go to the Store page, purchase a border, and click "Equip" on the item card.\n\nQ: Can I create custom question packs?\nA: Yes! Go to the Backpack tab, select the Packs section, and click "Create Question Pack".',
        ar: 'س: كيف يمكنني الحصول على العملات؟\nج: من خلال الفوز بالمباريات، إنجاز التحديات اليومية، والمطالبة بمكافآت الموسم.\n\nس: كيف أقوم بتجهيز إطار الرمز التعبيري؟\nج: اذهب إلى صفحة المتجر، اشترِ الإطار الذي يعجبك، ثم اضغط على "تجهيز" في بطاقة السلعة.\n\nس: هل يمكنني إنشاء أسئلة خاصة بي؟\nج: نعم! انتقل إلى تبويب الحقيبة (Backpack)، ثم قسم حزم الأسئلة، واضغط على "إنشاء حزمة أسئلة جديدة".'
      }
    }
  ];

  return (
    <div style={styles.container} dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={onClose}>◀</button>
        <h2 style={styles.title}>{isRtl ? 'الملف الشخصي للاعب' : 'Player Profile'}</h2>
        <div style={{ width: '30px' }} />
      </div>

      {/* Tabs Menu */}
      <div style={styles.tabsContainer}>
        {(['overview', 'stats', 'badges', 'settings'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => { playSFX('click'); setActiveTab(tab); }}
            style={{
              ...styles.tabBtn,
              borderBottom: activeTab === tab ? '2px solid #00f2fe' : 'none',
              color: activeTab === tab ? '#ffffff' : '#8a93c0',
              fontWeight: activeTab === tab ? 'bold' : 'normal'
            }}
          >
            {t[tab]}
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      <div style={styles.tabContentScroll}>
        
        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div style={styles.tabSection}>
            <div style={styles.card}>
              <div style={styles.overviewHeader}>
                <div style={{
                  ...styles.avatarRing,
                  ...getEquippedBorderStyle(user.equipped?.border, user.rank)
                }}>
                  👤
                </div>
                <h3 style={styles.username}>{user.username}</h3>
                <span style={styles.emailLabel}>{user.email}</span>
              </div>

              <div style={styles.statsGrid}>
                <div style={styles.statItem}>
                  <span style={styles.statLabel}>{t.lvl}</span>
                  <span style={styles.statValue}>12</span>
                </div>
                <div style={styles.statItem}>
                  <span style={styles.statLabel}>{t.rank}</span>
                  <span style={{ ...styles.statValue, color: `var(--color-${user.rank.toLowerCase().replace(' ', '')})`, fontSize: '1rem' }}>
                    {getRankLabel(user.rank)}
                  </span>
                </div>
                <div style={styles.statItem}>
                  <span style={styles.statLabel}>RP</span>
                  <span style={{ ...styles.statValue, color: '#00f2fe' }}>{points} RP</span>
                </div>
                <div style={styles.statItem}>
                  <span style={styles.statLabel}>{t.totalXP}</span>
                  <span style={styles.statValue}>{points * 12} XP</span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '16px' }}>
                <span style={{ fontSize: '0.75rem', color: '#8a93c0' }}>{isRtl ? 'الخبرة الحالية للمستوى' : 'Level XP Progress'}</span>
                <div style={styles.xpTrack}>
                  <div style={{ ...styles.xpBarFill, width: '45%' }} />
                </div>
              </div>
            </div>

            <div style={styles.card}>
              <h4 style={styles.sectionTitle}>{isRtl ? 'أداء المباريات' : 'Match Performance'}</h4>
              <div style={styles.statsGrid}>
                <div style={styles.statItem}>
                  <span style={styles.statLabel}>{t.played}</span>
                  <span style={styles.statValue}>{user.stats?.matchesPlayed || 0}</span>
                </div>
                <div style={styles.statItem}>
                  <span style={styles.statLabel}>{t.won}</span>
                  <span style={{ ...styles.statValue, color: '#00ff87' }}>{user.stats?.matchesWon || 0}</span>
                </div>
                <div style={styles.statItem}>
                  <span style={styles.statLabel}>{t.winRate}</span>
                  <span style={{ ...styles.statValue, color: '#00f2fe' }}>{winRate}%</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: STATS & RANKINGS */}
        {activeTab === 'stats' && (
          <div style={styles.tabSection}>
            <div style={styles.card}>
              <h4 style={styles.sectionTitle}>{isRtl ? 'إحصائيات المهارة' : 'Skill Stats'}</h4>
              <div style={styles.statsGrid}>
                <div style={styles.statItem}>
                  <span style={styles.statLabel}>{t.rating}</span>
                  <span style={{ ...styles.statValue, color: '#ffd700' }}>{calculatePerformanceRating()}</span>
                </div>
                <div style={styles.statItem}>
                  <span style={styles.statLabel}>{t.accuracy}</span>
                  <span style={styles.statValue}>{accuracy}%</span>
                </div>
                <div style={styles.statItem}>
                  <span style={styles.statLabel}>{t.speed}</span>
                  <span style={styles.statValue}>{speed}s</span>
                </div>
                <div style={styles.statItem}>
                  <span style={styles.statLabel}>{t.activity}</span>
                  <span style={styles.statValue}>{Math.min(100, Math.round(totalQuestions / 10))}</span>
                </div>
              </div>
            </div>

            {/* Past Season Records */}
            <div style={styles.card}>
              <h4 style={styles.sectionTitle}>{t.pastSeasons}</h4>
              {loadingArchives ? (
                <span style={styles.infoText}>{isRtl ? 'جاري التحميل...' : 'Loading records...'}</span>
              ) : archives.length === 0 ? (
                <span style={styles.infoText}>{isRtl ? 'لا توجد سجلات مواسم سابقة' : 'No previous season records'}</span>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {archives.map((archive) => (
                    <div key={archive.id} style={styles.seasonRow}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>{archive.seasons?.name}</span>
                        <span style={{ color: '#ffd700', fontSize: '0.8rem' }}>#{archive.placement}</span>
                      </div>
                      <span style={{ fontSize: '0.75rem', color: '#8a93c0' }}>
                        {getRankLabel(archive.rank_tier)} | {archive.rank_points} RP
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: BADGES & ACHIEVEMENTS */}
        {activeTab === 'badges' && (
          <div style={styles.tabSection}>
            <div style={styles.badgesGridContainer}>
              {BADGES_METADATA.map((badge) => {
                const isUnlocked = user.badges?.includes(badge.key);
                const progress = getBadgeProgress(badge.key);
                const currentVal = getBadgeCurrentValue(badge.key);

                return (
                  <div
                    key={badge.key}
                    style={{
                      ...styles.badgeCard,
                      opacity: isUnlocked ? 1 : 0.35,
                      border: isUnlocked ? '1px solid rgba(0, 242, 254, 0.2)' : '1px solid rgba(255, 255, 255, 0.05)'
                    }}
                  >
                    <span style={styles.badgeIcon}>{badge.icon}</span>
                    <span style={styles.badgeName}>{isRtl ? badge.name.ar : badge.name.en}</span>
                    <span style={styles.badgeDesc}>{isRtl ? badge.desc.ar : badge.desc.en}</span>
                    
                    <div style={{ width: '100%', marginTop: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem', color: '#8a93c0', marginBottom: '2px' }}>
                        <span>{t.progress}</span>
                        <span>{isUnlocked ? t.unlocked : `${currentVal} / ${badge.target}`}</span>
                      </div>
                      <div style={styles.progressBarBg}>
                        <div style={{ ...styles.progressBarFill, width: `${progress}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 4: SETTINGS */}
        {activeTab === 'settings' && (
          <div style={styles.tabSection}>
            
            {/* 1. Language settings */}
            <div style={styles.card}>
              <h4 style={styles.sectionTitle}>{isRtl ? 'اللغة' : 'Language'}</h4>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => { playSFX('click'); setIsRtl(false); }}
                  style={{
                    ...styles.actionBtn,
                    flex: 1,
                    background: !isRtl ? 'rgba(0, 242, 254, 0.12)' : 'rgba(255,255,255,0.02)',
                    border: !isRtl ? '1px solid #00f2fe' : '1px solid rgba(255,255,255,0.08)',
                    color: !isRtl ? '#00f2fe' : '#8a93c0'
                  }}
                >
                  English
                </button>
                <button
                  onClick={() => { playSFX('click'); setIsRtl(true); }}
                  style={{
                    ...styles.actionBtn,
                    flex: 1,
                    background: isRtl ? 'rgba(0, 242, 254, 0.12)' : 'rgba(255,255,255,0.02)',
                    border: isRtl ? '1px solid #00f2fe' : '1px solid rgba(255,255,255,0.08)',
                    color: isRtl ? '#00f2fe' : '#8a93c0'
                  }}
                >
                  العربية
                </button>
              </div>
            </div>

            {/* 2. General settings */}
            <div style={styles.card}>
              <h4 style={styles.sectionTitle}>{t.generalSettings}</h4>
              
              <div style={styles.settingRow}>
                <span style={styles.settingLabel}>{t.soundEffects}</span>
                <button
                  onClick={() => { playSFX('click'); setSfxEnabled(!sfxEnabled); }}
                  style={{
                    ...styles.toggleBtn,
                    backgroundColor: sfxEnabled ? 'rgba(0, 242, 254, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                    borderColor: sfxEnabled ? '#00f2fe' : 'rgba(255, 255, 255, 0.1)',
                    color: sfxEnabled ? '#00f2fe' : '#8a93c0'
                  }}
                >
                  {sfxEnabled ? (isRtl ? 'تشغيل' : 'ON') : (isRtl ? 'إيقاف' : 'OFF')}
                </button>
              </div>

              <div style={styles.settingColumn}>
                <span style={styles.settingLabel}>{t.volume} ({Math.round(sfxVolume * 100)}%)</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={sfxVolume}
                  onChange={(e) => setSfxVolume(parseFloat(e.target.value))}
                  onMouseUp={() => playSFX('tick')}
                  disabled={!sfxEnabled}
                  style={{ width: '100%', accentColor: '#00f2fe', cursor: 'pointer', opacity: sfxEnabled ? 1 : 0.4 }}
                />
              </div>

              <div style={styles.settingRow}>
                <span style={styles.settingLabel}>{t.visualEffects}</span>
                <button
                  onClick={handleToggleEffects}
                  style={{
                    ...styles.toggleBtn,
                    backgroundColor: effectsEnabled ? 'rgba(0, 242, 254, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                    borderColor: effectsEnabled ? '#00f2fe' : 'rgba(255, 255, 255, 0.1)',
                    color: effectsEnabled ? '#00f2fe' : '#8a93c0'
                  }}
                >
                  {effectsEnabled ? (isRtl ? 'تشغيل' : 'ON') : (isRtl ? 'إيقاف' : 'OFF')}
                </button>
              </div>

              <div style={styles.settingRow}>
                <span style={styles.settingLabel}>{t.notifications}</span>
                <button
                  onClick={handleToggleNotifications}
                  style={{
                    ...styles.toggleBtn,
                    backgroundColor: notificationsEnabled ? 'rgba(0, 242, 254, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                    borderColor: notificationsEnabled ? '#00f2fe' : 'rgba(255, 255, 255, 0.1)',
                    color: notificationsEnabled ? '#00f2fe' : '#8a93c0'
                  }}
                >
                  {notificationsEnabled ? (isRtl ? 'تشغيل' : 'ON') : (isRtl ? 'إيقاف' : 'OFF')}
                </button>
              </div>
            </div>

            {/* 3. Help Accordion */}
            <div style={styles.card}>
              <h4 style={styles.sectionTitle}>{t.helpGuides}</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {guides.map((g) => {
                  const isOpen = openGuide === g.key;
                  return (
                    <div key={g.key} style={styles.guideWrapper}>
                      <div
                        onClick={() => { playSFX('click'); setOpenGuide(isOpen ? null : g.key); }}
                        style={styles.guideHeader}
                      >
                        <span style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>{isRtl ? g.title.ar : g.title.en}</span>
                        <span>{isOpen ? '▲' : '▼'}</span>
                      </div>
                      {isOpen && (
                        <div style={styles.guideContent}>
                          {isRtl ? g.content.ar : g.content.en}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 4. Account Settings */}
            <div style={styles.card}>
              <h4 style={styles.sectionTitle}>{t.accountSettings}</h4>
              
              {/* Edit Username */}
              <form onSubmit={handleUpdateUsername} style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                <span style={{ fontSize: '0.75rem', color: '#8a93c0' }}>{t.updateUsername}</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    required
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    style={styles.textInput}
                  />
                  <button type="submit" disabled={loadingUsername} style={styles.submitSubBtn}>
                    {loadingUsername ? '...' : t.saveBtn}
                  </button>
                </div>
              </form>

              {/* Edit Password */}
              <form onSubmit={handleUpdatePassword} style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                <span style={{ fontSize: '0.75rem', color: '#8a93c0' }}>{t.updatePassword}</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="password"
                    required
                    placeholder={isRtl ? 'أدخل كلمة مرور جديدة...' : 'New password...'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    style={styles.textInput}
                  />
                  <button type="submit" disabled={loadingPassword} style={styles.submitSubBtn}>
                    {loadingPassword ? '...' : t.saveBtn}
                  </button>
                </div>
              </form>

              {/* Logout Button */}
              <button
                onClick={() => { playSFX('click'); signOut(); }}
                style={styles.logoutBtn}
              >
                🚪 {t.logout}
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: '#0b0d1a',
    color: '#ffffff',
    fontFamily: 'var(--font-ui)',
    overflow: 'hidden'
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    backgroundColor: '#0e1124',
    flexShrink: 0
  },
  backBtn: {
    background: 'none',
    border: 'none',
    color: '#00f2fe',
    fontSize: '1.2rem',
    cursor: 'pointer',
    padding: '4px'
  },
  title: {
    fontSize: '1.15rem',
    fontWeight: 900,
    color: '#ffffff',
    margin: 0
  },
  tabsContainer: {
    display: 'flex',
    backgroundColor: '#070814',
    borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
    flexShrink: 0
  },
  tabBtn: {
    flex: 1,
    padding: '12px 4px',
    background: 'none',
    border: 'none',
    fontSize: '0.75rem',
    cursor: 'pointer',
    textAlign: 'center',
    transition: 'color 0.2s ease',
    textTransform: 'uppercase'
  },
  tabContentScroll: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px',
    minHeight: 0
  },
  tabSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.04)',
    borderRadius: '12px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  overviewHeader: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    gap: '6px',
    paddingBottom: '12px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
  },
  avatarRing: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '2.5rem',
    backgroundColor: '#0b0d1a',
    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.3)'
  },
  username: {
    fontSize: '1.3rem',
    fontWeight: 800,
    margin: 0,
    color: '#ffffff'
  },
  emailLabel: {
    fontSize: '0.8rem',
    color: '#8a93c0'
  },
  sectionTitle: {
    fontSize: '0.9rem',
    fontWeight: 800,
    color: '#00f2fe',
    margin: 0,
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px'
  },
  statItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '10px',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderRadius: '8px',
    border: '1px solid rgba(255, 255, 255, 0.02)'
  },
  statLabel: {
    fontSize: '0.7rem',
    color: '#8a93c0',
    marginBottom: '4px'
  },
  statValue: {
    fontSize: '1.1rem',
    fontWeight: 800,
    color: '#ffffff'
  },
  xpTrack: {
    width: '100%',
    height: '6px',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '3px',
    overflow: 'hidden'
  },
  xpBarFill: {
    height: '100%',
    backgroundColor: '#00f2fe',
    borderRadius: '3px',
    transition: 'width 0.5s ease'
  },
  seasonRow: {
    padding: '8px 12px',
    borderRadius: '8px',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    border: '1px solid rgba(255, 255, 255, 0.03)',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  infoText: {
    fontSize: '0.8rem',
    color: '#8a93c0'
  },
  badgesGridContainer: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px'
  },
  badgeCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.01)',
    borderRadius: '10px',
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    transition: 'all 0.2s ease'
  },
  badgeIcon: {
    fontSize: '2.2rem',
    marginBottom: '6px'
  },
  badgeName: {
    fontSize: '0.8rem',
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: '2px'
  },
  badgeDesc: {
    fontSize: '0.6rem',
    color: '#8a93c0',
    lineHeight: 1.2,
    flexGrow: 1
  },
  progressBarBg: {
    width: '100%',
    height: '4px',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '2px',
    overflow: 'hidden'
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#ffd700',
    borderRadius: '2px'
  },
  settingRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 0',
    borderBottom: '1px solid rgba(255, 255, 255, 0.04)'
  },
  settingColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    padding: '8px 0',
    borderBottom: '1px solid rgba(255, 255, 255, 0.04)'
  },
  settingLabel: {
    fontSize: '0.85rem',
    color: '#ffffff'
  },
  toggleBtn: {
    border: '1px solid',
    borderRadius: '6px',
    padding: '4px 12px',
    fontSize: '0.75rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.15s ease'
  },
  actionBtn: {
    padding: '8px 12px',
    borderRadius: '6px',
    fontSize: '0.8rem',
    cursor: 'pointer',
    transition: 'all 0.15s ease'
  },
  guideWrapper: {
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: '8px',
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.15)'
  },
  guideHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 12px',
    cursor: 'pointer',
    userSelect: 'none'
  },
  guideContent: {
    padding: '12px',
    fontSize: '0.75rem',
    color: '#8a93c0',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderTop: '1px solid rgba(255, 255, 255, 0.04)',
    lineHeight: 1.4,
    whiteSpace: 'pre-line'
  },
  textInput: {
    flex: 1,
    padding: '8px 12px',
    borderRadius: '6px',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    color: '#ffffff',
    fontSize: '0.8rem',
    outline: 'none'
  },
  submitSubBtn: {
    padding: '8px 16px',
    borderRadius: '6px',
    backgroundColor: 'rgba(0, 242, 254, 0.12)',
    border: '1px solid #00f2fe',
    color: '#ffffff',
    fontSize: '0.8rem',
    fontWeight: 'bold',
    cursor: 'pointer'
  },
  logoutBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '10px',
    borderRadius: '8px',
    backgroundColor: 'rgba(255, 59, 92, 0.1)',
    border: '1px solid rgba(255, 59, 92, 0.25)',
    color: '#ff3b5c',
    fontSize: '0.85rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    width: '100%',
    transition: 'background 0.2s'
  }
};
