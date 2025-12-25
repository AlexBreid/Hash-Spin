import { useState, useEffect, useRef } from 'react';
import { GameCard } from '../GameCard';
import { GameSlider } from '../GameSlider';
import { Button } from '../ui/button';
import { ChevronRight, Star, Zap, Gift } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useFetch } from '../../hooks/useDynamicApi';
import imgMines from '../../assets/task_01kbn75ywbfpz83qvdbm3c9sbx_1764870071_img_1.webp';
import imgCrash from '../../assets/task_01kbn7a4xqenbt8px4rsk9zexr_1764870172_img_0.webp';
import imgPlinko from '../../assets/plinko.png';

interface Game {
  id: string;
  title: string;
  image: string;
  category: string;
}

const featuredGames: Game[] = [
  {
    id: 'minesweeper',
    title: 'Сапёр',
    image: imgMines,
    category: 'Логика'
  },
  {
    id: 'crash',
    title: 'Краш',
    image: imgCrash,
    category: 'Ставки'
  },
  {
    id: 'plinko',
    title: 'Plinko',
    image: imgPlinko,
    category: 'Ставки'
  },
];

const popularGames: Game[] = [
  {
    id: 'minesweeper',
    title: 'Сапёр Про',
    image: imgMines,
    category: 'Логика'
  },
  {
    id: 'crash',
    title: 'Турбо Краш',
    image: imgCrash,
    category: 'Ставки'
  },
  {
    id: 'plinko',
    title: 'Plinko',
    image: imgPlinko,
    category: 'Ставки'
  },
];

const getThemeColors = () => ({
  background: 'var(--background)',
  card: 'var(--card)',
  foreground: 'var(--foreground)',
  mutedForeground: 'var(--muted-foreground)',
  primary: 'var(--primary)',
  success: 'var(--success)',
  border: 'var(--border)',
  accent: 'var(--accent)',
});

export function HomePage() {
  const navigate = useNavigate();
  const colors = getThemeColors();
  const [hasReferrer, setHasReferrer] = useState<boolean | null>(null);
  const hasLoadedRef = useRef(false);

  const { data: profileData, execute: fetchProfile } = useFetch('USER_GET_profile', 'GET');

  useEffect(() => {
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true;
      console.log('🔄 Загружаю профиль для проверки реферала...');
      
      fetchProfile().catch((err: Error) => {
        console.warn('⚠️ Ошибка загрузки профиля:', err.message);
        setHasReferrer(false);
      });
    }
  }, [fetchProfile]);

  useEffect(() => {
    if (profileData) {
      console.log('✅ Profile data:', profileData);
      
      try {
        const profile = profileData.data || profileData;
        
        if (profile.referredById) {
          console.log('✅ У пользователя уже есть реферер:', profile.referredById);
          setHasReferrer(true);
        } 
        else {
          console.log('⚠️ У пользователя НЕТ реферера');
          setHasReferrer(false);
        }
      } catch (err) {
        console.warn('⚠️ Ошибка парсинга профиля:', err);
        setHasReferrer(false);
      }
    }
  }, [profileData]);

  const handleGameClick = (gameId: string) => {
    console.log('🎮 Запуск игры:', gameId);
    
    if (gameId === 'minesweeper') {
      navigate('/minesweeper');
    } 
    else if (gameId === 'crash') {
      navigate('/crash');
    } 
    else if (gameId === 'plinko') {
      navigate('/plinko');
    } 
    else {
      console.log('❓ Неизвестная игра:', gameId);
    }
  };

  const handleBonusClick = () => {
    navigate('/referrals');
  };

  return (
    <div className="pb-24 pt-6 transition-colors duration-300" style={{ backgroundColor: colors.background, color: colors.foreground }}>
      {/* 🎁 Welcome Banner */}
      {hasReferrer === false && (
        <div className="px-4 mb-8">
          <div className="rounded-3xl p-6 relative overflow-hidden transition-colors border" style={{
            background: `linear-gradient(135deg, ${colors.primary}20, ${colors.accent}15)`,
            borderColor: colors.primary,
            borderOpacity: 0.3
          }}>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"></div>
            <div className="relative z-10">
              <div className="flex items-center space-x-2 mb-2">
                <Gift className="w-6 h-6" style={{ color: colors.accent }} />
              </div>
              <h2 className="text-2xl font-bold mb-2" style={{ color: colors.foreground }}>Получите бонусы!</h2>
              <p className="mb-4" style={{ color: colors.mutedForeground }}>Введите реферальную ссылку и получите бонусы!</p>
              <Button 
                onClick={handleBonusClick}
                className="font-semibold shadow-lg transition-all active:scale-95"
                style={{
                  background: colors.accent,
                  color: 'white'
                }}
              >
                Получить бонус
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ Альтернативная плашка */}
      {hasReferrer === true && (
        <div className="px-4 mb-8">
          <div className="rounded-3xl p-6 border transition-colors relative overflow-hidden" style={{
            background: `linear-gradient(135deg, ${colors.success}20, #10b98110)`,
            borderColor: colors.success,
            borderOpacity: 0.3
          }}>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"></div>
            <div className="relative z-10">
              <div className="flex items-center space-x-2 mb-2">
                <Zap className="w-6 h-6" style={{ color: colors.success }} />
              </div>
              <h2 className="text-lg font-bold mb-1" style={{ color: colors.foreground }}>✨ Бонус активирован!</h2>
              <p className="text-sm" style={{ color: colors.mutedForeground }}>При первом пополнении счёта вы получите дополнительные средства</p>
            </div>
          </div>
        </div>
      )}

      {/* Featured Games Slider */}
      <div className="mb-8">
        <div className="flex items-center justify-between px-4 mb-4">
          <div className="flex items-center space-x-2">
            <Zap className="w-5 h-5" style={{ color: colors.accent }} />
            <h3 className="text-xl font-bold" style={{ color: colors.foreground }}>Рекомендуемые игры</h3>
          </div>
        </div>
        
        <GameSlider games={featuredGames} onGameClick={handleGameClick} />
      </div>

      {/* Popular Games Grid */}
      <div className="px-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <Star className="w-5 h-5" style={{ color: colors.accent }} />
            <h3 className="text-xl font-bold" style={{ color: colors.foreground }}>Популярные игры</h3>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-6">
          {popularGames.map((game, index) => (
            <div key={game.id} className="card-appear" style={{animationDelay: `${index * 0.1}s`}}>
              <GameCard
                title={game.title}
                image={game.image}
                category={game.category}
                onClick={() => handleGameClick(game.id)}
              />
            </div>
          ))}
        </div>

        <Button 
          className="w-full py-3 rounded-2xl font-semibold transition-all duration-300 active:scale-95"
          style={{
            color: colors.primary,
            backgroundColor: 'transparent',
            border: `2px solid ${colors.primary}`,
            borderOpacity: 0.3
          }}
          onClick={() => console.log('Просмотр всех игр')}
        >
          Все игры
          <ChevronRight className="w-5 h-5 ml-2" />
        </Button>
      </div>
    </div>
  );
}