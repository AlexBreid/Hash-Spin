// HomePage.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameCard } from '../GameCard';
import { GameSlider } from '../GameSlider';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { ChevronRight, Star, Zap, Gift, Rocket, Plus, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useFetch } from '../../hooks/useDynamicApi';
import { useAuth } from '../../context/AuthContext';
import { motion } from 'framer-motion';
import type { PanInfo } from 'framer-motion';
import { toast } from 'react-hot-toast';
import imgMines from '../../assets/task_01kbn75ywbfpz83qvdbm3c9sbx_1764870071_img_1.webp';
import imgCrash from '../../assets/task_01kbn7a4xqenbt8px4rsk9zexr_1764870172_img_0.webp';
import imgPlinko from '../../assets/plinko.png';
import imgCoinFlip from '../../assets/coinflip.png';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

interface Game {
  id: string;
  title: string;
  image: string;
  category: string;
  disabled?: boolean;
  comingSoonLabel?: string;
  isNew?: boolean;
}

interface Banner {
  id: number;
  imageUrl: string;
  title?: string;
  text?: string;
  buttonText?: string;
  linkUrl?: string;
  actionType: 'LINK' | 'BONUS' | 'NONE';
  bonusId?: number;
  bonus?: {
    id: number;
    code: string;
    name: string;
    percentage: number;
  };
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
  {
    id: 'coinflip',
    title: 'Орёл и решка',
    image: imgCoinFlip,
    category: 'Ставки',
    isNew: true,
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
  {
    id: 'coinflip',
    title: 'Орёл и решка',
    image: imgCoinFlip,
    category: 'Ставки',
    isNew: true,
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
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const hasLoadedRef = useRef(false);
  
  // Количество игроков для каждой игры (с базовым значением + случайный бонус) 
  const [playersCount, setPlayersCount] = useState<Record<string, number>>(() => {
    // Инициализируем сразу значениями, чтобы они отображались
    const realCounts = {
      minesweeper: Math.floor(Math.random() * 50) + 10,
      crash: Math.floor(Math.random() * 80) + 30,
      plinko: Math.floor(Math.random() * 40) + 15,
      coinflip: Math.floor(Math.random() * 60) + 20,
    };
    const bonusCounts: Record<string, number> = {};
    Object.keys(realCounts).forEach((gameId) => {
      const randomBonus = Math.floor(Math.random() * 201) + 100; // 100-300
      bonusCounts[gameId] = realCounts[gameId as keyof typeof realCounts] + randomBonus;
    });
    return bonusCounts;
  });
  const hasInitializedPlayers = useRef(false);

  const { token } = useAuth();
  const { data: profileData, execute: fetchProfile } = useFetch('USER_GET_profile', 'GET');
  
  // Safe admin check
  const isAdmin = profileData?.data?.isAdmin || profileData?.isAdmin || false;
  
  const [banners, setBanners] = useState<Banner[]>([]);

  // Загрузка баннеров напрямую (contentRoutes не в dynamic API)
  const fetchBanners = useCallback(async () => {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch(`${API_URL}/api/content/banners`, { headers });
      if (res.ok) {
        const result = await res.json();
        const data = result.success ? result.data : (Array.isArray(result) ? result : []);
        if (Array.isArray(data)) {
          setBanners(data);
        }
      }
    } catch (err) {
      console.error('Error fetching banners:', err);
    }
  }, [token]);

  // Fallback banners if no dynamic ones
  const defaultBanners: Banner[] = [
    {
      id: -1,
      imageUrl: '', // Will be handled by custom render
      title: 'Получите бонус!',
      text: 'Введите реферальный код и получите +100% к пополнению',
      buttonText: 'Получить бонус',
      actionType: 'BONUS',
      linkUrl: '/referrals'
    },
    {
      id: -2,
      imageUrl: '',
      title: 'Промо для новичков!',
      text: 'Получите +50% к первому депозиту автоматически',
      buttonText: 'Пополнить счёт',
      actionType: 'LINK',
      linkUrl: '/deposit'
    }
  ];

  const activeBanners = banners.length > 0 ? banners : defaultBanners;
  const slides = activeBanners.map((_, i) => i);

  const handleDrag = (_event: any, info: PanInfo) => {
    setDragOffset(info.offset.x);
  };

  const handleDragEnd = (_event: any, info: PanInfo) => {
    const threshold = 100;
    const velocity = info.velocity.x;
    
    // Если скорость достаточно большая, переключаем слайд
    // Исправлено направление: свайп влево (velocity < 0) -> следующий слайд
    if (Math.abs(velocity) > 500) {
      if (velocity < 0) {
        setCurrentSlide((prev) => (prev + 1) % slides.length);
      } else {
        setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
      }
    } 
    // Или если смещение достаточно большое
    else if (Math.abs(info.offset.x) > threshold) {
      // Исправлено направление: свайп влево (offset.x < 0) -> следующий слайд
      if (info.offset.x < 0) {
        setCurrentSlide((prev) => (prev + 1) % slides.length);
      } else {
        setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
      }
    }
    
    setDragOffset(0);
    setIsDragging(false);
  };

  // Инициализация и обновление количества игроков
  useEffect(() => {
    if (hasInitializedPlayers.current) return;

    // Получаем реальное количество игроков (имитируем API вызов)
    const fetchPlayersCount = async () => {
      try {
        // Здесь можно добавить реальный API вызов для получения количества активных игроков
        // Пока используем имитацию реальных игроков
        const realCounts = {
          minesweeper: Math.floor(Math.random() * 50) + 10, // 10-60 реальных игроков
          crash: Math.floor(Math.random() * 80) + 30, // 30-110 реальных игроков
          plinko: Math.floor(Math.random() * 40) + 15, // 15-55 реальных игроков
          coinflip: Math.floor(Math.random() * 60) + 20, // 20-80 реальных игроков
        };

        // Добавляем случайный бонус от 100 до 300 к каждому (только один раз при инициализации)
        const bonusCounts: Record<string, number> = {};
        Object.keys(realCounts).forEach((gameId) => {
          const randomBonus = Math.floor(Math.random() * 201) + 100; // 100-300
          bonusCounts[gameId] = realCounts[gameId as keyof typeof realCounts] + randomBonus;
        });

        
        setPlayersCount(bonusCounts);
        hasInitializedPlayers.current = true;
      } catch (error) {
        
      }
    };

    fetchPlayersCount();
  }, []);

  // Убрано периодическое обновление - значения устанавливаются один раз при инициализации

  // Автоматическая прокрутка
  useEffect(() => {
    if (isDragging || hasReferrer === true) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [isDragging, currentSlide, hasReferrer]);

  const getSlideStyle = (index: number, offset: number = 0) => {
    const baseDiff = index - currentSlide;
    // Инвертируем dragPercent для правильного направления
    const dragPercent = isDragging ? -dragOffset / window.innerWidth : 0;
    
    // Вычисляем позицию с учетом offset (для копий слайдов)
    const diff = baseDiff + offset * slides.length;
    let currentOffset = (diff - dragPercent) * 100;
    
    // Нормализуем позицию для кругового эффекта
    // Если слайд уходит вправо за пределы, он появляется слева
    while (currentOffset > 100) {
      currentOffset = currentOffset - slides.length * 100;
    }
    // Если слайд уходит влево за пределы, он появляется справа
    while (currentOffset < -100) {
      currentOffset = currentOffset + slides.length * 100;
    }
    
    // Вычисляем расстояние от центра для эффектов
    const absOffset = Math.abs(currentOffset);
    
    // Масштаб: текущий слайд больше, соседние меньше
    const scale = absOffset < 10 ? 0.9 : absOffset < 50 ? 0.85 : 0.75;
    
    // Эффект затемнения: чем дальше от центра, тем темнее
    const brightness = absOffset < 10 ? 1 : absOffset < 50 ? 0.7 : 0.4;
    
    // Z-index: текущий слайд сверху, остальные ниже
    const zIndex = absOffset < 10 ? 10 : absOffset < 50 ? 5 : 1;
    
    // Скрываем слайды, которые слишком далеко
    const opacity = absOffset > 150 ? 0 : 1;
    
    return {
      transform: `translateX(${currentOffset}%) scale(${scale})`,
      transition: isDragging ? 'none' : 'all 0.3s ease-out',
      zIndex,
      opacity,
      filter: `brightness(${brightness})`,
    };
  };

  // Загружаем баннеры при монтировании
  useEffect(() => {
    fetchBanners();
  }, [fetchBanners]);

  useEffect(() => {
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true;
      
      fetchProfile().catch((err: Error) => {
        setHasReferrer(false);
      });
    }
  }, [fetchProfile]);

  useEffect(() => {
    if (profileData) {
      
      
      try {
        const profile = profileData.data || profileData;
        
        if (profile.referredById) {
          
          setHasReferrer(true);
        } 
        else {
          
          setHasReferrer(false);
        }
      } catch (err) {
        
        setHasReferrer(false);
      }
    }
  }, [profileData]);

  const handleBannerAction = (banner: Banner) => {
    if (banner.actionType === 'LINK' && banner.linkUrl) {
      if (banner.linkUrl.startsWith('http')) {
        window.open(banner.linkUrl, '_blank');
      } else {
        navigate(banner.linkUrl);
      }
    } else if (banner.actionType === 'BONUS') {
      // Активация бонуса
      if (banner.bonus?.code) {
        activateBonus(banner.bonus.code);
      } else {
        toast.error('Бонус недоступен');
      }
    } else if (banner.actionType === 'NONE' && banner.linkUrl) {
      // Баннер без действия, но с ссылкой - редирект при клике
      if (banner.linkUrl.startsWith('http')) {
        window.open(banner.linkUrl, '_blank');
      } else {
        navigate(banner.linkUrl);
      }
    }
  };

  const activateBonus = async (bonusCode: string) => {
    try {
      const res = await fetch(`${API_URL}/api/v1/referral/link-referrer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ referralCode: bonusCode }),
      });
      
      const result = await res.json();
      
      if (res.ok && (result.success || !result.error)) {
        toast.success(`🎉 Бонус "${bonusCode}" активирован!`);
        // Обновляем профиль чтобы отразить новый статус
        fetchProfile().catch(() => {});
      } else {
        toast.error(result.error || result.message || 'Не удалось активировать бонус');
      }
    } catch (err) {
      toast.error('Ошибка при активации бонуса');
    }
  };

  const handleGameClick = (gameId: string) => {
    if (gameId === 'minesweeper') {
      navigate('/minesweeper');
    } else if (gameId === 'crash') {
      navigate('/crash');
    } else if (gameId === 'plinko') {
      navigate('/plinko');
    } else if (gameId === 'coinflip') {
      navigate('/coinflip');
    }
  };

  return (
    <div className="pb-24 pt-6 transition-colors duration-300" style={{ 
      backgroundColor: colors.background, 
      color: colors.foreground,
      overflowX: 'hidden',
      width: '100%',
      maxWidth: '100%'
    }}>
      {/* 🎠 СЛАЙДЕР БАННЕРОВ */}
      {hasReferrer === false && (
        <div className="mb-8">
          <div className="relative" style={{ overflow: 'visible', padding: '0 16px' }}>
            <motion.div
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
              onDragStart={() => setIsDragging(true)}
              onDrag={handleDrag}
              onDragEnd={handleDragEnd}
              style={{ 
                height: '280px',
                width: '100%',
                cursor: isDragging ? 'grabbing' : 'grab',
                position: 'relative',
              }}
            >
              {/* Рендерим слайды с копиями для кругового эффекта */}
              {[-slides.length, 0, slides.length].map((offset) => (
                <React.Fragment key={offset}>
                  {activeBanners.map((banner, index) => (
                    <motion.div
                      key={`banner-${banner.id}-${offset}`}
                      style={{
                        ...getSlideStyle(index, offset),
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                      }}
                    >
                      <div className="relative h-full w-full">
                        {/* Background Effect */}
                        <div className={`absolute -inset-0.5 rounded-3xl blur-xl opacity-50 animate-pulse ${
                          index % 2 === 0 
                            ? 'bg-gradient-to-r from-yellow-400 via-orange-500 to-pink-600' 
                            : 'bg-gradient-to-r from-blue-400 via-purple-500 to-pink-600'
                        }`} />
                        
                        <Card className="relative border-0 rounded-3xl overflow-hidden shadow-2xl h-full w-full" style={{ backgroundColor: colors.card }}>
                          {/* Фон баннера */}
                          {banner.imageUrl ? (
                            <img 
                              src={banner.imageUrl.startsWith('/') ? `${API_URL}${banner.imageUrl}` : banner.imageUrl} 
                              alt={banner.title || 'Banner'} 
                              className="absolute inset-0 w-full h-full object-cover z-0"
                            />
                          ) : (
                            <div className={`absolute inset-0 z-0 ${
                              index % 2 === 0
                                ? 'bg-gradient-to-br from-yellow-500/20 via-orange-500/10 to-pink-600/20'
                                : 'bg-gradient-to-br from-blue-500/20 via-purple-500/10 to-pink-600/20'
                            }`}>
                              <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10" />
                            </div>
                          )}
                          
                          {/* Контент поверх — текст / кнопка */}
                          {(banner.title || banner.text || banner.buttonText) && (
                            <div className="relative z-10 p-6 h-full flex flex-col justify-center" style={{
                              background: banner.imageUrl ? 'linear-gradient(to right, rgba(0,0,0,0.7), rgba(0,0,0,0.2))' : 'transparent'
                            }}>
                              {banner.title && (
                                <div className="flex items-center space-x-2 mb-3">
                                  {banner.actionType === 'BONUS' ? (
                                    <Gift className="w-6 h-6" style={{ color: colors.accent }} />
                                  ) : (
                                    <Star className="w-6 h-6" style={{ color: '#3b82f6' }} />
                                  )}
                                  <h2 className="text-2xl font-bold" style={{ color: banner.imageUrl ? 'white' : colors.foreground }}>
                                    {banner.title}
                                  </h2>
                                </div>
                              )}
                              
                              {banner.text && (
                                <p className="mb-4 text-sm" style={{ color: banner.imageUrl ? 'rgba(255,255,255,0.8)' : colors.mutedForeground }}>
                                  {banner.text}
                                </p>
                              )}

                              {banner.bonus && banner.actionType === 'BONUS' && (
                                <div className="mb-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/20 border border-purple-500/30 w-fit">
                                  <Gift className="w-4 h-4 text-purple-400" />
                                  <span className="text-sm font-semibold text-purple-300">
                                    +{banner.bonus.percentage}% бонус
                                  </span>
                                </div>
                              )}
                              
                              {banner.buttonText && (
                                <Button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleBannerAction(banner);
                                  }}
                                  className="font-semibold shadow-lg transition-all active:scale-95 w-fit"
                                  style={{
                                    background: banner.actionType === 'BONUS' 
                                      ? 'linear-gradient(to right, #8b5cf6, #a855f7)' 
                                      : (index % 2 === 0 ? colors.accent : 'linear-gradient(to right, #3b82f6, #8b5cf6)'),
                                    color: 'white'
                                  }}
                                >
                                  {banner.actionType === 'BONUS' && <Gift className="w-4 h-4 mr-2 inline" />}
                                  {banner.actionType === 'LINK' && <Rocket className="w-4 h-4 mr-2 inline" />}
                                  {banner.buttonText}
                                </Button>
                              )}
                            </div>
                          )}
                          
                          {/* Кликабельная зона — если нет кнопки, но есть ссылка или действие */}
                          {!banner.buttonText && (banner.linkUrl || banner.actionType !== 'NONE') && (
                            <div 
                              className="absolute inset-0 z-20 cursor-pointer" 
                              onClick={() => handleBannerAction(banner)}
                            />
                          )}
                        </Card>
                      </div>
                    </motion.div>
                  ))}
                </React.Fragment>
              ))}
            </motion.div>

          </div>
        </div>
      )}

      {/* Admin Manage Banners Button (Always visible for admins) */}
      {isAdmin && (
        <div className="px-4 mb-8 flex justify-center">
          <Button 
            onClick={() => navigate('/admin/banners')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-full shadow-lg transition-all active:scale-95 flex items-center gap-2"
          >
            <Settings className="w-5 h-5" />
            Управление баннерами
          </Button>
        </div>
      )}

      {/* ✅ Альтернативная плашка */}
      {hasReferrer === true && (
        <div className="px-4 mb-8">
          <div className="rounded-3xl p-6 border transition-colors relative overflow-hidden" style={{
            background: `linear-gradient(135deg, ${colors.success}20, #10b98110)`,
            borderColor: `${colors.success}4D`
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
        
        <GameSlider 
          games={featuredGames} 
          onGameClick={handleGameClick} 
          playersCount={playersCount}
        />
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
                playersCount={playersCount[game.id]}
                isNew={game.isNew}
              />
            </div>
          ))}
        </div>

        <Button 
          className="w-full py-3 rounded-2xl font-semibold transition-all duration-300 active:scale-95"
          style={{
            color: colors.primary,
            backgroundColor: 'transparent',
            border: `2px solid ${colors.primary}4D`
          }}
          onClick={() => {}}
        >
          Все игры
          <ChevronRight className="w-5 h-5 ml-2" />
        </Button>
      </div>
    </div>
  );
}
