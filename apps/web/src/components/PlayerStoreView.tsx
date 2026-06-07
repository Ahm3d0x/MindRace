import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

interface PlayerStoreViewProps {
  user: {
    id: string;
    coins: number;
    creatorTokens?: number;
    inventory: string[];
    equipped: { border: string | null; effect: string | null; avatar: string | null };
    rank: string;
  };
  isRtl: boolean;
  refreshProfile: () => Promise<void>;
  triggerAlert: (msg: string, type: 'success' | 'error' | 'info') => void;
  playSFX: (type: string) => void;
}

interface ShopItem {
  key: string;
  name: { en: string; ar: string };
  desc: { en: string; ar: string };
  cost: number;
  category: 'border' | 'effect';
  preview: string; // CSS style or emoji representation
}

const COSMETICS_CATALOG: ShopItem[] = [
  {
    key: 'cyber_neon',
    name: { en: 'Cyber Neon Border', ar: 'إطار النيون السيبراني' },
    desc: { en: 'A vibrant glowing cyan avatar border.', ar: 'إطار رمز تعبيري متوهج باللون السماوي النابض بالحياة.' },
    cost: 500,
    category: 'border',
    preview: 'linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)'
  },
  {
    key: 'gold_halo',
    name: { en: 'Gold Halo Border', ar: 'إطار الهالة الذهبية' },
    desc: { en: 'A rotating premium golden border.', ar: 'إطار ذهبي مميز مع هالة متوهجة.' },
    cost: 1500,
    category: 'border',
    preview: 'linear-gradient(135deg, #ffd700 0%, #fbbf24 100%)'
  },
  {
    key: 'dark_matter',
    name: { en: 'Dark Matter Border', ar: 'إطار المادة المظلمة' },
    desc: { en: 'A deep dark obsidian pulsing border.', ar: 'إطار داكن بنمط نبضات المادة المظلمة الغامضة.' },
    cost: 2500,
    category: 'border',
    preview: 'linear-gradient(135deg, #8b5cf6 0%, #090d16 100%)'
  },
  {
    key: 'laser_strike',
    name: { en: 'Laser Strike Effect', ar: 'تأثير ضربة الليزر' },
    desc: { en: 'A clean green/cyan laser sweep across the deck.', ar: 'مسح ضوئي ليزر أخضر وسماوي على البطاقة عند الإجابة الصحيحة.' },
    cost: 800,
    category: 'effect',
    preview: '⚡'
  },
  {
    key: 'firework',
    name: { en: 'Firework Effect', ar: 'تأثير الألعاب النارية' },
    desc: { en: 'Celebratory colorful sparkle bursts.', ar: 'انفجارات ملونة واحتفالية مبهرة عند الإجابة الصحيحة.' },
    cost: 1200,
    category: 'effect',
    preview: '🎆'
  },
  {
    key: 'matrix_rain',
    name: { en: 'Matrix Rain Effect', ar: 'تأثير مطر الماتريكس' },
    desc: { en: 'Digital falling green code matrix sweep.', ar: 'شفرات رقمية خضراء متساقطة عند الإجابة الصحيحة.' },
    cost: 2000,
    category: 'effect',
    preview: '💻'
  }
];

export const PlayerStoreView: React.FC<PlayerStoreViewProps> = ({
  user,
  isRtl,
  refreshProfile,
  triggerAlert,
  playSFX
}) => {
  const [activeTab, setActiveTab] = useState<'border' | 'effect'>('border');
  const [loadingKey, setLoadingKey] = useState<string | null>(null);

  const inventory = user?.inventory || [];
  const equipped = user?.equipped || { border: null, effect: null, avatar: null };

  const handleBuy = async (item: ShopItem) => {
    if (user.coins < item.cost) {
      playSFX('wrong');
      triggerAlert(isRtl ? 'ليس لديك عملات كافية!' : 'Insufficient coins!', 'error');
      return;
    }

    setLoadingKey(item.key);
    playSFX('click');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/v1/store/buy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ cosmeticKey: item.key })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Purchase failed');
      }

      playSFX('correct');
      triggerAlert(
        isRtl 
          ? `تم شراء ${item.name.ar} بنجاح!` 
          : `Successfully purchased ${item.name.en}!`, 
        'success'
      );
      await refreshProfile();
    } catch (err: any) {
      playSFX('wrong');
      triggerAlert(err.message || 'Error occurred', 'error');
    } finally {
      setLoadingKey(null);
    }
  };

  const handleEquip = async (item: ShopItem, isEquipped: boolean) => {
    setLoadingKey(item.key);
    playSFX('click');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/v1/store/equip`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          category: item.category, 
          key: isEquipped ? null : item.key 
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Equip failed');
      }

      triggerAlert(
        isRtl 
          ? (isEquipped ? 'تم إلغاء التجهيز' : 'تم التجهيز بنجاح!') 
          : (isEquipped ? 'Unequipped item' : 'Equipped successfully!'), 
        'success'
      );
      await refreshProfile();
    } catch (err: any) {
      playSFX('wrong');
      triggerAlert(err.message || 'Error occurred', 'error');
    } finally {
      setLoadingKey(null);
    }
  };

  const items = COSMETICS_CATALOG.filter(item => item.category === activeTab);

  return (
    <div style={styles.container} dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Shop Header */}
      <div style={styles.header}>
        <h2 style={styles.title}>{isRtl ? 'متجر المظاهر' : 'Cosmetics Shop'}</h2>
        <div style={styles.currencies}>
          <span style={styles.currencyBadge}>🪙 {user.coins}</span>
          <span style={styles.currencyBadgeRare}>👑 {user.creatorTokens || 0}</span>
        </div>
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        <button 
          style={{ 
            ...styles.tabBtn, 
            borderBottom: activeTab === 'border' ? '2px solid #00f2fe' : 'none',
            color: activeTab === 'border' ? '#ffffff' : '#8a93c0',
            fontWeight: activeTab === 'border' ? 'bold' : 'normal'
          }}
          onClick={() => { playSFX('click'); setActiveTab('border'); }}
        >
          {isRtl ? 'إطارات الرمز' : 'Avatar Borders'}
        </button>
        <button 
          style={{ 
            ...styles.tabBtn, 
            borderBottom: activeTab === 'effect' ? '2px solid #00f2fe' : 'none',
            color: activeTab === 'effect' ? '#ffffff' : '#8a93c0',
            fontWeight: activeTab === 'effect' ? 'bold' : 'normal'
          }}
          onClick={() => { playSFX('click'); setActiveTab('effect'); }}
        >
          {isRtl ? 'تأثيرات الإجابة' : 'Answer Effects'}
        </button>
      </div>

      {/* Catalog items scroll */}
      <div style={styles.scrollContainer}>
        <div style={styles.itemsGrid}>
          {items.map((item) => {
            const isOwned = inventory.includes(item.key);
            const isEquipped = equipped[item.category] === item.key;
            const isLoading = loadingKey === item.key;

            return (
              <div key={item.key} style={styles.itemCard} className="glass-panel">
                {/* Preview Box */}
                <div style={styles.previewContainer}>
                  {item.category === 'border' ? (
                    <div style={{
                      width: '55px',
                      height: '55px',
                      borderRadius: '50%',
                      border: '3px solid transparent',
                      backgroundImage: `linear-gradient(rgba(15,18,30,1), rgba(15,18,30,1)), ${item.preview}`,
                      backgroundOrigin: 'border-box',
                      backgroundClip: 'padding-box, border-box',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.5rem',
                      boxShadow: isEquipped ? '0 0 12px rgba(0, 242, 254, 0.4)' : 'none'
                    }}>
                      👤
                    </div>
                  ) : (
                    <span style={{ fontSize: '2.2rem', filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.2))' }}>
                      {item.preview}
                    </span>
                  )}
                </div>

                {/* Details */}
                <div style={styles.itemDetails}>
                  <h3 style={styles.itemName}>{isRtl ? item.name.ar : item.name.en}</h3>
                  <p style={styles.itemDesc}>{isRtl ? item.desc.ar : item.desc.en}</p>
                </div>

                {/* Actions */}
                <div style={styles.actionRow}>
                  {isOwned ? (
                    <button
                      style={{
                        ...styles.actionBtn,
                        background: isEquipped 
                          ? 'rgba(255, 59, 92, 0.15)' 
                          : 'linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)',
                        border: isEquipped ? '1px solid rgba(255, 59, 92, 0.3)' : 'none',
                        color: '#ffffff'
                      }}
                      disabled={isLoading}
                      onClick={() => handleEquip(item, isEquipped)}
                    >
                      {isLoading 
                        ? '...' 
                        : (isEquipped 
                          ? (isRtl ? 'إلغاء' : 'Unequip') 
                          : (isRtl ? 'تجهيز' : 'Equip'))}
                    </button>
                  ) : (
                    <button
                      style={{
                        ...styles.actionBtn,
                        background: 'rgba(255, 215, 0, 0.12)',
                        border: '1px solid rgba(255, 215, 0, 0.3)',
                        color: '#ffd700',
                        fontWeight: 'bold'
                      }}
                      disabled={isLoading}
                      onClick={() => handleBuy(item)}
                    >
                      {isLoading ? '...' : `🪙 ${item.cost}`}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
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
    overflow: 'hidden'
  },
  header: {
    padding: '16px 16px 8px 16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
    backgroundColor: '#0e1124',
    flexShrink: 0
  },
  title: {
    fontSize: '1.2rem',
    fontWeight: 900,
    color: '#ffffff',
    margin: 0
  },
  currencies: {
    display: 'flex',
    gap: '6px'
  },
  currencyBadge: {
    fontSize: '0.75rem',
    padding: '4px 8px',
    background: 'rgba(255,179,0,0.12)',
    border: '1px solid rgba(255,179,0,0.2)',
    borderRadius: '20px',
    color: '#ffb300',
    fontWeight: 'bold'
  },
  currencyBadgeRare: {
    fontSize: '0.75rem',
    padding: '4px 8px',
    background: 'rgba(0,242,254,0.12)',
    border: '1px solid rgba(0,242,254,0.2)',
    borderRadius: '20px',
    color: '#00f2fe',
    fontWeight: 'bold'
  },
  tabs: {
    display: 'flex',
    borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
    background: '#070814',
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
    transition: 'all 0.2s'
  },
  scrollContainer: {
    padding: '16px',
    overflowY: 'auto',
    flex: 1,
    minHeight: 0
  },
  itemsGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  itemCard: {
    display: 'flex',
    alignItems: 'center',
    padding: '10px 14px',
    backgroundColor: 'rgba(255,255,255,0.01)',
    border: '1px solid rgba(255,255,255,0.03)',
    borderRadius: '12px',
    gap: '12px'
  },
  previewContainer: {
    width: '64px',
    height: '64px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(0, 0, 0, 0.25)',
    borderRadius: '8px',
    flexShrink: 0
  },
  itemDetails: {
    flex: 1,
    minWidth: 0
  },
  itemName: {
    fontSize: '0.85rem',
    fontWeight: 'bold',
    color: '#ffffff',
    margin: '0 0 2px 0',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  itemDesc: {
    fontSize: '0.7rem',
    color: '#8a93c0',
    margin: 0,
    lineHeight: 1.25
  },
  actionRow: {
    display: 'flex',
    alignItems: 'center',
    flexShrink: 0
  },
  actionBtn: {
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '0.75rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    minWidth: '75px',
    transition: 'all 0.1s'
  }
};
