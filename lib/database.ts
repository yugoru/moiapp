// Простая in-memory база данных для карточек и сетов
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { parseCSV, CSVParseError } from './csv-parser';
import { groceryStoreData } from './data/grocery-store-data';
import { startupsData } from './data/startups-data';
import { workInItData } from './data/work-in-it-data';

export type Card = {
  id: string;
  word: string;
  translation: string;
  sentences: string[];
  repeatCount: number;
  status: 'learning' | 'learned';
  setId: string;
  successCount: number;
  isArchived: boolean;
  lastReviewed: number;
};

export type CardSet = {
  id: string;
  name: string;
  fileName: string;
  color?: string;
  icon?: string;
  learnedCards: number;
  totalCards: number;
  archivedCards: number;
};

const SETS_DIR = FileSystem.documentDirectory + 'sets/';
const PROGRESS_STORAGE_KEY = 'moinaki_card_progress';

// Палитра кислотных цветов
const ACID_COLORS = [
  '#FF1493', // Deep Pink (фуксия)
  '#00BFFF', // Deep Sky Blue (ярко-голубой)
  '#00FF7F', // Spring Green (неоново-зеленый)
  '#FF4500', // Orange Red (оранжево-красный)
  '#9400D3', // Dark Violet (темно-фиолетовый)
  '#FFD700', // Gold (золотой)
  '#FF69B4', // Hot Pink (горячий розовый)
  '#00CED1', // Dark Turquoise (темно-бирюзовый)
  '#FF6347', // Tomato (томатный)
  '#8A2BE2', // Blue Violet (сине-фиолетовый)
  '#32CD32', // Lime Green (лаймовый)
  '#FF1493', // Deep Pink (дублируем для большего разнообразия)
];

// Предустановленные наборы данных
const PRESET_SETS = [
  { 
    name: 'grocery store.csv', 
    data: groceryStoreData, 
    color: '#FF1493', 
    icon: '🛒' 
  },
  { 
    name: 'startups.csv', 
    data: startupsData, 
    color: '#00BFFF', 
    icon: '🚀' 
  },
  { 
    name: 'work in IT.csv', 
    data: workInItData, 
    color: '#00FF7F', 
    icon: '💻' 
  },
];

let sets: CardSet[] = [];
let cards: Card[] = [];
let initialized = false;

// Функция для получения рандомного кислотного цвета
function getRandomAcidColor(): string {
  return ACID_COLORS[Math.floor(Math.random() * ACID_COLORS.length)];
}

// Функция для конвертации данных в CSV формат
function dataToCSV(data: any[]): string {
  const headers = 'word,translation,sentences\n';
  const rows = data.map(item => {
    const sentences = Array.isArray(item.sentences) ? item.sentences.join('|') : item.sentences;
    return `${item.word},${item.translation},"${sentences}"`;
  });
  return headers + rows.join('\n');
}

async function ensurePresetFiles() {
  await FileSystem.makeDirectoryAsync(SETS_DIR, { intermediates: true }).catch(() => {});
  for (const preset of PRESET_SETS) {
    const dest = SETS_DIR + preset.name;
    const exists = await FileSystem.getInfoAsync(dest);
    if (!exists.exists) {
      // Создаем CSV файл из предустановленных данных
      const csvContent = dataToCSV(preset.data);
      await FileSystem.writeAsStringAsync(dest, csvContent, { encoding: FileSystem.EncodingType.UTF8 });
    }
  }
}

async function loadProgressFromStorage(): Promise<Record<string, { successCount: number; isArchived: boolean; lastReviewed: number }>> {
  try {
    const progressData = await AsyncStorage.getItem(PROGRESS_STORAGE_KEY);
    return progressData ? JSON.parse(progressData) : {};
  } catch (error) {
    console.error('Error loading progress:', error);
    return {};
  }
}

async function saveProgressToStorage(progress: Record<string, { successCount: number; isArchived: boolean; lastReviewed: number }>) {
  try {
    await AsyncStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress));
  } catch (error) {
    console.error('Error saving progress:', error);
  }
}

async function loadSetsAndCards() {
  sets = [];
  cards = [];
  const progressData = await loadProgressFromStorage();
  const files = await FileSystem.readDirectoryAsync(SETS_DIR);
  let setIndex = 0;
  for (const fileName of files) {
    if (!fileName.endsWith('.csv')) continue;
    const fileUri = SETS_DIR + fileName;
    
    try {
      const content = await FileSystem.readAsStringAsync(fileUri);
      const parsed = parseCSV(content);
      const setId = fileName;
      
      // Определяем цвет: для предустановленных файлов используем заданный, для новых - рандомный
      const presetFile = PRESET_SETS.find(p => p.name === fileName);
      const color = presetFile ? presetFile.color : getRandomAcidColor();
      const icon = presetFile ? presetFile.icon : '📚';
      
      sets.push({
        id: setId,
        name: fileName.replace('.csv', '').replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        fileName,
        color: color,
        icon: icon,
        learnedCards: 0,
        totalCards: parsed.length,
        archivedCards: 0,
      });
      
      for (const item of parsed) {
        const cardId = `${setId}-${item.word}`;
        const savedProgress = progressData[cardId] || { successCount: 0, isArchived: false, lastReviewed: 0 };
        cards.push({
          id: cardId,
          word: item.word,
          translation: item.translation,
          sentences: Array.isArray(item.sentences) ? item.sentences : [],
          repeatCount: 0,
          status: 'learning',
          setId,
          successCount: savedProgress.successCount,
          isArchived: savedProgress.isArchived,
          lastReviewed: savedProgress.lastReviewed,
        });
      }
      setIndex++;
    } catch (error) {
      console.error(`Error loading file ${fileName}:`, error);
      // Пропускаем поврежденные файлы, но логируем ошибку
      if (error instanceof CSVParseError) {
        console.warn(`Skipping corrupted CSV file ${fileName}: ${error.message}`);
      }
    }
  }
}

export const database = {
  async init() {
    if (initialized) return;
    initialized = true;
    await ensurePresetFiles();
    await loadSetsAndCards();
  },

  async getCardSets(): Promise<CardSet[]> {
    await loadSetsAndCards();
    // Обновляем статистику для каждого сета
    return sets.map(set => {
      const setCards = cards.filter(card => card.setId === set.id);
      const learned = setCards.filter(card => card.status === 'learned').length;
      const archived = setCards.filter(card => card.isArchived).length;
      return {
        ...set,
        learnedCards: learned,
        totalCards: setCards.length,
        archivedCards: archived,
      };
    });
  },

  async createCardSet(name: string, csvContent: string): Promise<string> {
    try {
      // Валидируем CSV перед сохранением
      parseCSV(csvContent);
      
      const fileName = name.replace(/\s+/g, '_').toLowerCase() + '.csv';
      const fileUri = SETS_DIR + fileName;
      await FileSystem.writeAsStringAsync(fileUri, csvContent, { encoding: FileSystem.EncodingType.UTF8 });
      await loadSetsAndCards();
      return fileName;
    } catch (error) {
      if (error instanceof CSVParseError) {
        throw new Error(`Invalid CSV format: ${error.message}`);
      }
      throw new Error('Failed to create card set. Please check your file format.');
    }
  },

  async addCards(newCards: Omit<Card, 'id'>[]): Promise<void> {
    // Не используется, т.к. теперь карточки читаются из файлов
  },

  async getCardsForLearning(setId: string, limit: number): Promise<Card[]> {
    await loadSetsAndCards();
    const setCards = cards.filter(card => card.setId === setId);
    const archivedCards = setCards.filter(card => card.isArchived);
    const nonArchivedCards = setCards.filter(card => !card.isArchived);
    
    // Если все слова в архиве, возвращаем архивные слова для тренировки
    if (nonArchivedCards.length === 0 && archivedCards.length > 0) {
      return archivedCards.slice(0, limit);
    }
    
    // Иначе возвращаем обычные слова + архивные, которые не тренировались неделю
    const now = Date.now();
    const oneWeek = 7 * 24 * 60 * 60 * 1000; // 7 дней в миллисекундах
    
    const availableCards = setCards.filter(card => 
      !card.isArchived || (now - card.lastReviewed) > oneWeek
    );
    
    return availableCards.slice(0, limit);
  },

  async getArchivedCardsForTraining(setId: string, limit: number): Promise<Card[]> {
    await loadSetsAndCards();
    const archivedCards = cards.filter(card => 
      card.setId === setId && card.isArchived
    );
    return archivedCards.slice(0, limit);
  },

  async isSetFullyArchived(setId: string): Promise<boolean> {
    await loadSetsAndCards();
    const setCards = cards.filter(card => card.setId === setId);
    return setCards.length > 0 && setCards.every(card => card.isArchived);
  },

  async updateCardProgress(cardId: string, correct: boolean): Promise<void> {
    const card = cards.find(c => c.id === cardId);
    if (card) {
      card.lastReviewed = Date.now();
      
      if (correct) {
        card.successCount += 1;
        card.status = 'learned';
        
        // Если достигли 50 успешных повторений, архивируем
        if (card.successCount >= 50) {
          card.isArchived = true;
        }
      } else {
        card.repeatCount += 1;
      }
      
      // Сохраняем прогресс в AsyncStorage
      const progressData = await loadProgressFromStorage();
      progressData[cardId] = {
        successCount: card.successCount,
        isArchived: card.isArchived,
        lastReviewed: card.lastReviewed,
      };
      await saveProgressToStorage(progressData);
    }
  },

  async deleteCardSet(setId: string): Promise<void> {
    const fileUri = SETS_DIR + setId;
    await FileSystem.deleteAsync(fileUri, { idempotent: true });
    
    // Удаляем прогресс для карточек этого сета
    const progressData = await loadProgressFromStorage();
    const cardIdsToRemove = Object.keys(progressData).filter(id => id.startsWith(setId));
    cardIdsToRemove.forEach(id => delete progressData[id]);
    await saveProgressToStorage(progressData);
    
    await loadSetsAndCards();
  },

  async getCardById(cardId: string): Promise<Card | null> {
    await loadSetsAndCards();
    return cards.find(card => card.id === cardId) || null;
  },

  async getCardProgress(cardId: string): Promise<{ successCount: number; isArchived: boolean; lastReviewed: number } | null> {
    const card = cards.find(c => c.id === cardId);
    if (card) {
      return {
        successCount: card.successCount,
        isArchived: card.isArchived,
        lastReviewed: card.lastReviewed,
      };
    }
    return null;
  },
};