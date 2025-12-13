import { useState, useEffect, useRef } from 'react';
import { GameCard } from '../GameCard';
import { GameSlider } from '../GameSlider';
import { Button } from '../ui/button';
import { ChevronRight, Star, Zap, Gift } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useFetch } from '../../hooks/useDynamicApi';
import imgMines from '../../assets/task_01kbn75ywbfpz83qvdbm3c9sbx_1764870071_img_1.webp';
import imgCrash from '../../assets/task_01kbn7a4xqenbt8px4rsk9zexr_1764870172_img_0.webp';

interface Game {
  id: string;
  title: string;
  image: string;
  category: string;
}

const featuredGames: Game[] = [
  {
    id: '1',
    title: 'Сапёр',
    image: imgMines,
    category: 'Логика'
  },
  {
    id: '2',
    title: 'Краш',
    image: imgCrash,
    category: 'Ставки'
  },
];

const popularGames: Game[] = [
  {
    id: '5',
    title: 'Сапёр Про',
    image: imgMines,
    category: 'Логика'
  },
  {
    id: '6',
    title: 'Турбо Краш',
    image: imgCrash,
    category: 'Ставки'
  },
];

export function HomePage() {
  const navigate = useNavigate();
  const [hasReferrer, setHasReferrer] = useState<boolean | null>(null);
  const hasLoadedRef = useRef(false);

  // 🔄 Загружаем информацию профиля для проверки реферала
  const { data: profileData, execute: fetchProfile } = useFetch('USER_GET_profile', 'GET');

  useEffect(() => {
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true;
      console.log('🔄 Загружаю профиль для проверки реферала...');
      
      fetchProfile().catch((err: Error) => {
        console.warn('⚠️ Ошибка загрузки профиля:', err.message);
        setHasReferrer(false); // По умолчанию показываем плашку если ошибка
      });
    }
  }, [fetchProfile]);

  // 🎁 Проверяем наличие реферала
  useEffect(() => {
    if (profileData) {
      console.log('✅ Profile data:', profileData);
      
      try {
        const profile = profileData.data || profileData;
        
        // ❌ Если есть referredById - у него уже есть реферал
        if (profile.referredById) {
          console.log('✅ У пользователя уже есть реферер:', profile.referredById);
          setHasReferrer(true); // СКРЫВАЕМ плашку
        } 
        // ✅ Если нет referredById - нет реферала
        else {
          console.log('⚠️ У пользователя НЕТ реферера');
          setHasReferrer(false); // ПОКАЗЫВАЕМ плашку
        }
      } catch (err) {
        console.warn('⚠️ Ошибка парсинга профиля:', err);
        setHasReferrer(false); // По умолчанию показываем
      }
    }
  }, [profileData]);

  const handleGameClick = (gameId: string) => {
    // Сапёр
    if (gameId === '1' || gameId === '5') {
      navigate('/minesweeper'); // 🎮 Переход на Сапёр
    } 
    // Краш
    else if (gameId === '2' || gameId === '6') {
      navigate('/crash'); // 💥 Переход на Краш
    } 
    // Остальные игры
    else {
      console.log('Запуск игры:', gameId);
    }
  };

  const handleBonusClick = () => {
    navigate('/referrals'); // 🎁 Переход на рефералки
  };

  return (
    <div className="pb-24 pt-6">
      {/* 🎁 Welcome Banner - ПОКАЗЫВАЕМ ТОЛЬКО ЕСЛИ НЕТ РЕФЕРЕРА */}
      {hasReferrer === false && (
        <div className="px-4 mb-8">
          <div className="bg-gradient-to-br from-primary via-secondary to-accent rounded-3xl p-6 text-primary-foreground relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"></div>
            <div className="relative z-10">
              <div className="flex items-center space-x-2 mb-2">
                <Gift className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Получите бонусы!</h2>
              <p className="text-primary-foreground/90 mb-4">Введите реферальную ссылку и получите бонусы!</p>
              <Button 
                onClick={handleBonusClick}
                className="bg-white text-primary hover:bg-white/90 font-semibold shadow-lg"
                size="sm"
              >
                Получить бонус
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ Альтернативная плашка для тех кто УЖЕ использовал реферала */}
      {hasReferrer === true && (
        <div className="px-4 mb-8">
          <div className="bg-gradient-to-br from-green-900/20 via-emerald-900/20 to-teal-900/20 rounded-3xl p-6 border border-green-500/30 text-green-100 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"></div>
            <div className="relative z-10">
              <div className="flex items-center space-x-2 mb-2">
                <Zap className="w-6 h-6 text-green-400" />
              </div>
              <h2 className="text-lg font-bold mb-1">✨ Бонус активирован!</h2>
              <p className="text-green-100/80 text-sm">При первом пополнении счёта вы получите дополнительные средства</p>
            </div>
          </div>
        </div>
      )}

      {/* Featured Games Slider */}
      <div className="mb-8">
        <div className="flex items-center justify-between px-4 mb-4">
          <div className="flex items-center space-x-2">
            <Zap className="w-5 h-5 text-accent" />
            <h3 className="text-xl font-bold">Рекомендуемые игры</h3>
          </div>
        </div>
        
        <GameSlider games={featuredGames} onGameClick={handleGameClick} />
      </div>

      {/* Popular Games Grid */}
      <div className="px-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <Star className="w-5 h-5 text-accent" />
            <h3 className="text-xl font-bold">Популярные игры</h3>
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
          variant="outline" 
          className="w-full py-3 rounded-2xl border-primary/30 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-300 hover:glow-effect"
          onClick={() => console.log('Просмотр всех игр')}
        >
          Все игры
          <ChevronRight className="w-5 h-5 ml-2" />
        </Button>
      </div>
    </div>
  );
}