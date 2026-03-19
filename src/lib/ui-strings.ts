/**
 * UI string translations for Spire Archive.
 * Usage:
 *   import { t } from '../lib/ui-strings';
 *   t('Cards', locale)  // → 'カード' when locale='ja'
 */

import type { Locale } from './data';

const strings: Record<string, Partial<Record<Locale, string>>> = {
  // Nav
  'Characters': { ja: 'キャラクター', ko: '캐릭터', zh: '角色', de: 'Charaktere', fr: 'Personnages', es: 'Personajes', pt: 'Personagens', it: 'Personaggi', pl: 'Postacie', ru: 'Персонажи', tr: 'Karakterler', th: 'ตัวละคร' },
  'Cards': { ja: 'カード', ko: '카드', zh: '卡牌', de: 'Karten', fr: 'Cartes', es: 'Cartas', pt: 'Cartas', it: 'Carte', pl: 'Karty', ru: 'Карты', tr: 'Kartlar', th: 'การ์ด' },
  'Relics': { ja: 'レリック', ko: '유물', zh: '遗物', de: 'Relikte', fr: 'Reliques', es: 'Reliquias', pt: 'Relíquias', it: 'Reliquie', pl: 'Relikty', ru: 'Реликвии', tr: 'Kalıntılar', th: 'เรลิค' },
  'Potions': { ja: 'ポーション', ko: '물약', zh: '药水', de: 'Tränke', fr: 'Potions', es: 'Pociones', pt: 'Poções', it: 'Pozioni', pl: 'Mikstury', ru: 'Зелья', tr: 'İksirler', th: 'ยา' },
  'Monsters': { ja: 'モンスター', ko: '몬스터', zh: '怪物', de: 'Monster', fr: 'Monstres', es: 'Monstruos', pt: 'Monstros', it: 'Mostri', pl: 'Potwory', ru: 'Монстры', tr: 'Canavarlar', th: 'มอนสเตอร์' },
  'Events': { ja: 'イベント', ko: '이벤트', zh: '事件', de: 'Ereignisse', fr: 'Événements', es: 'Eventos', pt: 'Eventos', it: 'Eventi', pl: 'Zdarzenia', ru: 'События', tr: 'Etkinlikler', th: 'เหตุการณ์' },
  'Buffs & Debuffs': { ja: 'バフ＆デバフ', ko: '버프 & 디버프', zh: '增益与减益', de: 'Buffs & Debuffs', fr: 'Effets', es: 'Efectos', pt: 'Efeitos', it: 'Effetti', pl: 'Efekty', ru: 'Эффекты', tr: 'Etkiler', th: 'บัฟและดีบัฟ' },
  'Enchantments': { ja: 'エンチャント', ko: '인챈트', zh: '附魔', de: 'Verzauberungen', fr: 'Enchantements', es: 'Encantamientos', pt: 'Encantamentos', it: 'Incantesimi', pl: 'Zaklęcia', ru: 'Зачарования', tr: 'Büyüler', th: 'เสน่ห์' },
  'Keywords': { ja: 'キーワード', ko: '키워드', zh: '关键词', de: 'Schlüsselwörter', fr: 'Mots-clés', es: 'Palabras clave', pt: 'Palavras-chave', it: 'Parole chiave', pl: 'Słowa kluczowe', ru: 'Ключевые слова', tr: 'Anahtar Kelimeler', th: 'คำสำคัญ' },
  'Search': { ja: '検索', ko: '검색', zh: '搜索', de: 'Suche', fr: 'Recherche', es: 'Buscar', pt: 'Buscar', it: 'Cerca', pl: 'Szukaj', ru: 'Поиск', tr: 'Ara', th: 'ค้นหา' },

  // Card detail
  'Applied Effects': { ja: '適用効果', ko: '적용 효과', zh: '应用效果', de: 'Angewandte Effekte', fr: 'Effets appliqués', es: 'Efectos aplicados', pt: 'Efeitos aplicados', it: 'Effetti applicati', pl: 'Zastosowane efekty', ru: 'Применённые эффекты', tr: 'Uygulanan Etkiler', th: 'เอฟเฟกต์ที่ใช้' },
  'Base': { ja: '基本', ko: '기본', zh: '基础', de: 'Basis', fr: 'Base', es: 'Base', pt: 'Base', it: 'Base', pl: 'Bazowa', ru: 'Базовая', tr: 'Temel', th: 'พื้นฐาน' },
  'Upgraded': { ja: '強化', ko: '업그레이드', zh: '升级', de: 'Aufgewertet', fr: 'Améliorée', es: 'Mejorada', pt: 'Melhorada', it: 'Potenziata', pl: 'Ulepszona', ru: 'Улучшенная', tr: 'Yükseltilmiş', th: 'อัปเกรด' },
  'Cost': { ja: 'コスト', ko: '비용', zh: '费用', de: 'Kosten', fr: 'Coût', es: 'Coste', pt: 'Custo', it: 'Costo', pl: 'Koszt', ru: 'Стоимость', tr: 'Maliyet', th: 'ค่าใช้จ่าย' },
  'Type': { ja: 'タイプ', ko: '유형', zh: '类型', de: 'Typ', fr: 'Type', es: 'Tipo', pt: 'Tipo', it: 'Tipo', pl: 'Typ', ru: 'Тип', tr: 'Tür', th: 'ประเภท' },
  'Rarity': { ja: 'レア度', ko: '희귀도', zh: '稀有度', de: 'Seltenheit', fr: 'Rareté', es: 'Rareza', pt: 'Raridade', it: 'Rarità', pl: 'Rzadkość', ru: 'Редкость', tr: 'Nadirlik', th: 'ความหายาก' },
  'Character': { ja: 'キャラクター', ko: '캐릭터', zh: '角色', de: 'Charakter', fr: 'Personnage', es: 'Personaje', pt: 'Personagem', it: 'Personaggio', pl: 'Postać', ru: 'Персонаж', tr: 'Karakter', th: 'ตัวละคร' },

  // Card types
  'Attack': { ja: 'アタック', ko: '공격', zh: '攻击', de: 'Angriff', fr: 'Attaque', es: 'Ataque', pt: 'Ataque', it: 'Attacco', pl: 'Atak', ru: 'Атака', tr: 'Saldırı', th: 'โจมตี' },
  'Skill': { ja: 'スキル', ko: '스킬', zh: '技能', de: 'Fertigkeit', fr: 'Compétence', es: 'Habilidad', pt: 'Habilidade', it: 'Abilità', pl: 'Umiejętność', ru: 'Навык', tr: 'Beceri', th: 'ทักษะ' },
  'Power': { ja: 'パワー', ko: '파워', zh: '能力', de: 'Kraft', fr: 'Pouvoir', es: 'Poder', pt: 'Poder', it: 'Potere', pl: 'Moc', ru: 'Сила', tr: 'Güç', th: 'พลัง' },
  'Curse': { ja: '呪い', ko: '저주', zh: '诅咒', de: 'Fluch', fr: 'Malédiction', es: 'Maldición', pt: 'Maldição', it: 'Maledizione', pl: 'Klątwa', ru: 'Проклятие', tr: 'Lanet', th: 'คำสาป' },
  'Status': { ja: 'ステータス', ko: '상태', zh: '状态', de: 'Status', fr: 'Statut', es: 'Estado', pt: 'Estado', it: 'Stato', pl: 'Status', ru: 'Статус', tr: 'Durum', th: 'สถานะ' },
  'Quest': { ja: 'クエスト', ko: '퀘스트', zh: '任务', de: 'Quest', fr: 'Quête', es: 'Misión', pt: 'Missão', it: 'Missione', pl: 'Misja', ru: 'Задание', tr: 'Görev', th: 'เควส' },

  // Rarities
  'Common': { ja: 'コモン', ko: '일반', zh: '普通', de: 'Gewöhnlich', fr: 'Commun', es: 'Común', pt: 'Comum', it: 'Comune', pl: 'Pospolita', ru: 'Обычная', tr: 'Sıradan', th: 'ธรรมดา' },
  'Uncommon': { ja: 'アンコモン', ko: '고급', zh: '罕见', de: 'Ungewöhnlich', fr: 'Peu commun', es: 'Poco común', pt: 'Incomum', it: 'Non comune', pl: 'Rzadka', ru: 'Необычная', tr: 'Nadir', th: 'ไม่ธรรมดา' },
  'Rare': { ja: 'レア', ko: '희귀', zh: '稀有', de: 'Selten', fr: 'Rare', es: 'Rara', pt: 'Rara', it: 'Rara', pl: 'Bardzo rzadka', ru: 'Редкая', tr: 'Ender', th: 'หายาก' },
  'Basic': { ja: 'ベーシック', ko: '기본', zh: '基础', de: 'Basis', fr: 'Basique', es: 'Básica', pt: 'Básica', it: 'Base', pl: 'Podstawowa', ru: 'Базовая', tr: 'Temel', th: 'พื้นฐาน' },
  'Special': { ja: 'スペシャル', ko: '특수', zh: '特殊', de: 'Spezial', fr: 'Spécial', es: 'Especial', pt: 'Especial', it: 'Speciale', pl: 'Specjalna', ru: 'Особая', tr: 'Özel', th: 'พิเศษ' },

  // Character detail
  'Starting Deck': { ja: '初期デッキ', ko: '시작 덱', zh: '初始牌组', de: 'Startdeck', fr: 'Deck de départ', es: 'Mazo inicial', pt: 'Baralho inicial', it: 'Mazzo iniziale', pl: 'Startowa talia', ru: 'Стартовая колода', tr: 'Başlangıç Destesi', th: 'สำรับเริ่มต้น' },
  'Starting Relic': { ja: '初期レリック', ko: '시작 유물', zh: '初始遗物', de: 'Startrelikt', fr: 'Relique de départ', es: 'Reliquia inicial', pt: 'Relíquia inicial', it: 'Reliquia iniziale', pl: 'Startowy relikt', ru: 'Стартовая реликвия', tr: 'Başlangıç Kalıntısı', th: 'เรลิคเริ่มต้น' },

  // Filters
  'All': { ja: 'すべて', ko: '전체', zh: '全部', de: 'Alle', fr: 'Tous', es: 'Todos', pt: 'Todos', it: 'Tutti', pl: 'Wszystkie', ru: 'Все', tr: 'Tümü', th: 'ทั้งหมด' },
  'All Characters': { ja: '全キャラクター', ko: '모든 캐릭터', zh: '所有角色', de: 'Alle Charaktere', fr: 'Tous les personnages', es: 'Todos los personajes', pt: 'Todos os personagens', it: 'Tutti i personaggi', pl: 'Wszystkie postacie', ru: 'Все персонажи', tr: 'Tüm Karakterler', th: 'ตัวละครทั้งหมด' },
  'All Types': { ja: '全タイプ', ko: '모든 유형', zh: '所有类型', de: 'Alle Typen', fr: 'Tous les types', es: 'Todos los tipos', pt: 'Todos os tipos', it: 'Tutti i tipi', pl: 'Wszystkie typy', ru: 'Все типы', tr: 'Tüm Türler', th: 'ทุกประเภท' },
  'All Rarities': { ja: '全レア度', ko: '모든 희귀도', zh: '所有稀有度', de: 'Alle Seltenheiten', fr: 'Toutes les raretés', es: 'Todas las rarezas', pt: 'Todas as raridades', it: 'Tutte le rarità', pl: 'Wszystkie rzadkości', ru: 'Все редкости', tr: 'Tüm Nadirlikler', th: 'ความหายากทั้งหมด' },
  'All Tiers': { ja: '全ティア', ko: '모든 등급', zh: '所有级别', de: 'Alle Stufen', fr: 'Tous les niveaux', es: 'Todos los niveles', pt: 'Todos os níveis', it: 'Tutti i livelli', pl: 'Wszystkie poziomy', ru: 'Все уровни', tr: 'Tüm Seviyeler', th: 'ทุกระดับ' },
  'No results found': { ja: '結果が見つかりません', ko: '결과 없음', zh: '未找到结果', de: 'Keine Ergebnisse', fr: 'Aucun résultat', es: 'Sin resultados', pt: 'Nenhum resultado', it: 'Nessun risultato', pl: 'Brak wyników', ru: 'Ничего не найдено', tr: 'Sonuç bulunamadı', th: 'ไม่พบผลลัพธ์' },

  // Monster detail
  'HP': { ja: 'HP', ko: 'HP', zh: 'HP', de: 'HP', fr: 'PV', es: 'PV', pt: 'PV', it: 'PV', pl: 'HP', ru: 'HP', tr: 'HP', th: 'HP' },
  'Moves': { ja: '行動', ko: '행동', zh: '招式', de: 'Züge', fr: 'Actions', es: 'Movimientos', pt: 'Movimentos', it: 'Mosse', pl: 'Ruchy', ru: 'Действия', tr: 'Hareketler', th: 'การเคลื่อนไหว' },
  'Encounter Type': { ja: '遭遇タイプ', ko: '조우 유형', zh: '遭遇类型', de: 'Begegnungstyp', fr: "Type de rencontre", es: 'Tipo de encuentro', pt: 'Tipo de encontro', it: 'Tipo di incontro', pl: 'Typ spotkania', ru: 'Тип встречи', tr: 'Karşılaşma Türü', th: 'ประเภทการเผชิญหน้า' },

  // Encounter types
  'Normal': { ja: 'ノーマル', ko: '일반', zh: '普通', de: 'Normal', fr: 'Normal', es: 'Normal', pt: 'Normal', it: 'Normale', pl: 'Normalny', ru: 'Обычный', tr: 'Normal', th: 'ปกติ' },
  'Elite': { ja: 'エリート', ko: '엘리트', zh: '精英', de: 'Elite', fr: 'Élite', es: 'Élite', pt: 'Elite', it: 'Élite', pl: 'Elitarny', ru: 'Элитный', tr: 'Elit', th: 'อีลีท' },
  'Boss': { ja: 'ボス', ko: '보스', zh: 'Boss', de: 'Boss', fr: 'Boss', es: 'Jefe', pt: 'Chefe', it: 'Boss', pl: 'Boss', ru: 'Босс', tr: 'Patron', th: 'บอส' },
  'Weak': { ja: '弱敵', ko: '약적', zh: '弱敌', de: 'Schwach', fr: 'Faible', es: 'Débil', pt: 'Fraco', it: 'Debole', pl: 'Słaby', ru: 'Слабый', tr: 'Zayıf', th: 'อ่อนแอ' },

  // Relic/Potion tiers
  'Shop': { ja: 'ショップ', ko: '상점', zh: '商店', de: 'Laden', fr: 'Boutique', es: 'Tienda', pt: 'Loja', it: 'Negozio', pl: 'Sklep', ru: 'Магазин', tr: 'Mağaza', th: 'ร้านค้า' },
  'Event': { ja: 'イベント', ko: '이벤트', zh: '事件', de: 'Ereignis', fr: 'Événement', es: 'Evento', pt: 'Evento', it: 'Evento', pl: 'Zdarzenie', ru: 'Событие', tr: 'Etkinlik', th: 'เหตุการณ์' },
  'Tier': { ja: 'ティア', ko: '등급', zh: '级别', de: 'Stufe', fr: 'Niveau', es: 'Nivel', pt: 'Nível', it: 'Livello', pl: 'Poziom', ru: 'Уровень', tr: 'Seviye', th: 'ระดับ' },
  'Boss Swap': { ja: 'ボス交換', ko: '보스 교환', zh: 'Boss交换', de: 'Boss-Tausch', fr: 'Échange Boss', es: 'Intercambio de Jefe', pt: 'Troca de Chefe', it: 'Scambio Boss', pl: 'Wymiana bossa', ru: 'Обмен босса', tr: 'Patron Takası', th: 'แลกบอส' },

  // Event detail
  'Choices': { ja: '選択肢', ko: '선택지', zh: '选项', de: 'Optionen', fr: 'Choix', es: 'Opciones', pt: 'Opções', it: 'Scelte', pl: 'Wybory', ru: 'Варианты', tr: 'Seçenekler', th: 'ตัวเลือก' },

  // Footer / branding
  'a Slay the Spire companion': { ja: 'Slay the Spireの攻略サイト', ko: 'Slay the Spire 공략 사이트', zh: 'Slay the Spire 攻略网站', de: 'Ein Slay the Spire Begleiter', fr: 'Un compagnon Slay the Spire', es: 'Una guía de Slay the Spire', pt: 'Um companheiro de Slay the Spire', it: 'Un compagno di Slay the Spire', pl: 'Kompendium Slay the Spire', ru: 'Справочник Slay the Spire', tr: 'Bir Slay the Spire rehberi', th: 'คู่มือ Slay the Spire' },

  // Filter options
  'All colors': { ja: '全カラー', ko: '모든 색상', zh: '所有颜色', de: 'Alle Farben', fr: 'Toutes les couleurs', es: 'Todos los colores', pt: 'Todas as cores', it: 'Tutti i colori', pl: 'Wszystkie kolory', ru: 'Все цвета', tr: 'Tüm Renkler', th: 'ทุกสี' },
  'Colorless': { ja: '無色', ko: '무색', zh: '无色', de: 'Farblos', fr: 'Incolore', es: 'Sin color', pt: 'Incolor', it: 'Incolore', pl: 'Bezbarwna', ru: 'Бесцветная', tr: 'Renksiz', th: 'ไม่มีสี' },
  'Token': { ja: 'トークン', ko: '토큰', zh: '衍生', de: 'Spielstein', fr: 'Jeton', es: 'Ficha', pt: 'Ficha', it: 'Gettone', pl: 'Żeton', ru: 'Жетон', tr: 'Jeton', th: 'โทเค็น' },
  'View Upgrades': { ja: 'アップグレードを表示', ko: '업그레이드 보기', zh: '查看升级', de: 'Aufwertungen anzeigen', fr: 'Voir les améliorations', es: 'Ver mejoras', pt: 'Ver melhorias', it: 'Vedi potenziamenti', pl: 'Pokaż ulepszenia', ru: 'Показать улучшения', tr: 'Yükseltmeleri Göster', th: 'ดูอัปเกรด' },
  'Ancient': { ja: 'エンシェント', ko: '고대', zh: '远古', de: 'Uralte', fr: 'Ancienne', es: 'Antigua', pt: 'Antiga', it: 'Antica', pl: 'Starożytna', ru: 'Древняя', tr: 'Kadim', th: 'โบราณ' },

  // Misc
  'Description': { ja: '説明', ko: '설명', zh: '描述', de: 'Beschreibung', fr: 'Description', es: 'Descripción', pt: 'Descrição', it: 'Descrizione', pl: 'Opis', ru: 'Описание', tr: 'Açıklama', th: 'คำอธิบาย' },
  'Flavor': { ja: 'フレーバー', ko: '플레이버', zh: '背景', de: 'Beschreibung', fr: 'Ambiance', es: 'Ambientación', pt: 'Sabor', it: 'Ambientazione', pl: 'Opis fabularny', ru: 'Описание', tr: 'Lezzet', th: 'รสชาติ' },
  'Back to': { ja: '戻る:', ko: '돌아가기:', zh: '返回', de: 'Zurück zu', fr: 'Retour à', es: 'Volver a', pt: 'Voltar para', it: 'Torna a', pl: 'Powrót do', ru: 'Назад к', tr: 'Geri dön:', th: 'กลับไป' },
};

/**
 * Translate a UI string key to the given locale.
 * Returns the English key if no translation exists.
 */
export function t(key: string, locale: Locale | string = 'en'): string {
  if (locale === 'en') return key;
  return strings[key]?.[locale as Locale] ?? key;
}

/**
 * Get all translations as a flat object for client-side use.
 * Only includes strings that differ from English for the given locale.
 */
export function getTranslations(locale: Locale | string): Record<string, string> {
  if (locale === 'en') return {};
  const result: Record<string, string> = {};
  for (const [key, translations] of Object.entries(strings)) {
    const val = translations[locale as Locale];
    if (val) result[key] = val;
  }
  return result;
}
