import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Pressable } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, CircleCheck as CheckCircle, Circle as XCircle } from 'lucide-react-native';
import { database, Card } from '@/lib/database';
import { generateOptions } from '@/lib/answer-generator';

type ScreenState = 'question' | 'result' | 'sentences';

export default function LearnScreen() {
  const { setId } = useLocalSearchParams();
  const [cards, setCards] = useState<Card[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [options, setOptions] = useState<string[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [screenState, setScreenState] = useState<ScreenState>('question');
  const [isCorrect, setIsCorrect] = useState(false);
  const [loading, setLoading] = useState(true);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [isArchivedMode, setIsArchivedMode] = useState(false);

  const loadCards = async () => {
    try {
      const loadedCards = await database.getCardsForLearning(String(setId), 10);
      if (loadedCards.length === 0) {
        Alert.alert('Empty Set', 'This set has no cards to learn', [
          { text: 'OK', onPress: () => router.back() }
        ]);
        return;
      }
      
      const allArchived = loadedCards.every(card => card.isArchived);
      setIsArchivedMode(allArchived);
      
      setCards(loadedCards);
      setCurrentCardIndex(0);
      generateAnswerOptions(loadedCards[0]);
    } catch (error) {
      console.error('Error loading cards:', error);
      Alert.alert('Error', 'Failed to load cards');
    } finally {
      setLoading(false);
    }
  };

  const generateAnswerOptions = async (currentCard: Card) => {
    try {
      const allCards = await database.getCardsForLearning(String(setId), 100);
      const allTranslations = allCards.map(card => card.translation);
      const generatedOptions = generateOptions(currentCard.translation, allTranslations);
      setOptions(generatedOptions);
    } catch (error) {
      console.error('Error generating options:', error);
      setOptions([currentCard.translation]);
    }
  };

  useEffect(() => {
    loadCards();
  }, [setId]);

  const handleAnswerSelect = (answer: string) => {
    if (screenState !== 'question') return;

    setSelectedAnswer(answer);
    
    const currentCard = cards[currentCardIndex];
    const correct = answer === currentCard.translation;
    setIsCorrect(correct);
    setScreenState('result');
    
    if (correct) {
      setCorrectAnswers(prev => prev + 1);
    }
    setTotalAnswered(prev => prev + 1);

    database.updateCardProgress(currentCard.id, correct);
  };

  const handleScreenTap = () => {
    if (screenState === 'result') {
      setScreenState('sentences');
    } else if (screenState === 'sentences') {
      moveToNextCard();
    }
  };

  const moveToNextCard = () => {
    if (currentCardIndex < cards.length - 1) {
      const nextIndex = currentCardIndex + 1;
      setCurrentCardIndex(nextIndex);
      setSelectedAnswer(null);
      setScreenState('question');
      setIsCorrect(false);
      generateAnswerOptions(cards[nextIndex]);
    } else {
      Alert.alert(
        'Session Complete!',
        `You answered ${correctAnswers} out of ${totalAnswered} correctly.`,
        [
          { text: 'Continue', onPress: () => router.back() }
        ]
      );
    }
  };

  const getOptionStyle = (option: string) => {
    if (screenState === 'question') {
      return styles.optionButton;
    }
    
    if (screenState === 'result') {
      const currentCard = cards[currentCardIndex];
      const isCorrectAnswer = option === currentCard.translation;
      const isSelectedAnswer = option === selectedAnswer;
      
      if (isCorrectAnswer) {
        return [styles.optionButton, styles.correctOption];
      } else if (isSelectedAnswer && !isCorrect) {
        return [styles.optionButton, styles.incorrectOption];
      }
      return styles.optionButton;
    }
    
    return styles.optionButton;
  };

  const getOptionTextStyle = (option: string) => {
    if (screenState === 'question') {
      return styles.optionText;
    }
    
    if (screenState === 'result') {
      const currentCard = cards[currentCardIndex];
      const isCorrectAnswer = option === currentCard.translation;
      const isSelectedAnswer = option === selectedAnswer;
      
      if (isCorrectAnswer) {
        return styles.correctOptionText;
      } else if (isSelectedAnswer && !isCorrect) {
        return styles.incorrectOptionText;
      }
      return styles.optionText;
    }
    
    return styles.optionText;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading cards...</Text>
      </View>
    );
  }

  const currentCard = cards[currentCardIndex];
  if (!currentCard) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No cards available</Text>
      </View>
    );
  }

  const renderQuestionScreen = () => (
    <View style={styles.cardContainer}>
      <View style={styles.card}>
        <Text style={styles.word}>{currentCard.word}</Text>
        
        <View style={styles.optionsContainer}>
          {options.map((option, index) => (
            <TouchableOpacity
              key={index}
              style={getOptionStyle(option)}
              onPress={() => handleAnswerSelect(option)}
              disabled={screenState !== 'question'}
            >
              <Text style={getOptionTextStyle(option)}>
                {option}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );

  const renderResultScreen = () => (
    <Pressable style={styles.fullScreenPressable} onPress={handleScreenTap}>
      <View style={styles.cardContainer}>
        <View style={styles.card}>
          <Text style={styles.word}>{currentCard.word}</Text>
          
          <View style={styles.optionsContainer}>
            {options.map((option, index) => (
              <View
                key={index}
                style={getOptionStyle(option)}
              >
                <Text style={getOptionTextStyle(option)}>
                  {option}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.resultContainer}>
            <View style={styles.resultHeader}>
              {isCorrect ? (
                <CheckCircle size={32} color="#10B981" />
              ) : (
                <XCircle size={32} color="#EF4444" />
              )}
              <Text style={[styles.resultText, { color: isCorrect ? '#10B981' : '#EF4444' }]}>
                {isCorrect ? 'Correct!' : 'Incorrect'}
              </Text>
            </View>
            
            <Text style={styles.tapHint}>Tap anywhere to continue</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );

  const renderSentencesScreen = () => {
    // Парсим предложения из строки, разделенной |
    let sentences = [];
    if (currentCard.sentences && Array.isArray(currentCard.sentences)) {
      sentences = currentCard.sentences;
    } else if (currentCard.sentences && typeof currentCard.sentences === 'string') {
      sentences = currentCard.sentences.split('|').map(s => s.trim()).filter(s => s.length > 0);
    }

    return (
      <Pressable style={styles.fullScreenPressable} onPress={handleScreenTap}>
        <View style={styles.cardContainer}>
          <View style={styles.card}>
            <Text style={styles.word}>{currentCard.word}</Text>
            <Text style={styles.translation}>{currentCard.translation}</Text>
            
            <View style={styles.sentencesContainer}>
              <Text style={styles.sentencesTitle}>Example sentences:</Text>
              {sentences.length > 0 ? (
                sentences.slice(0, 3).map((sentence, index) => {
                  // Разделяем предложение для подсветки слова
                  const regex = new RegExp(`\\b${currentCard.word}\\b`, 'gi');
                  const parts = sentence.split(regex);
                  const matches = sentence.match(regex) || [];
                  
                  return (
                    <View key={index} style={styles.sentenceContainer}>
                      <Text style={styles.sentence}>
                        {parts.map((part, partIndex) => (
                          <React.Fragment key={partIndex}>
                            <Text style={styles.sentenceText}>{part}</Text>
                            {matches[partIndex] && (
                              <Text style={styles.highlightedWord}>
                                {matches[partIndex]}
                              </Text>
                            )}
                          </React.Fragment>
                        ))}
                      </Text>
                    </View>
                  );
                })
              ) : (
                <Text style={styles.noSentences}>No example sentences available</Text>
              )}
            </View>
            
            <Text style={styles.tapHint}>Tap anywhere to continue</Text>
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.title}>Learning</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.scoreContainer}>
        <Text style={styles.scoreText}>
          {correctAnswers}/{totalAnswered} correct
          {isArchivedMode && (
            <Text style={styles.archivedModeText}> • 📦 Archive Mode</Text>
          )}
        </Text>
      </View>

      {screenState === 'question' && renderQuestionScreen()}
      {screenState === 'result' && renderResultScreen()}
      {screenState === 'sentences' && renderSentencesScreen()}

      <View style={styles.progressContainer}>
        <Text style={styles.progressText}>
          {currentCardIndex + 1} of {cards.length}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#FF1493',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF1493',
  },
  placeholder: {
    width: 40,
  },
  scoreContainer: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  scoreText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
  },
  archivedModeText: {
    color: '#FF4500',
    fontWeight: '500',
  },
  fullScreenPressable: {
    flex: 1,
  },
  cardContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  word: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FF1493',
    textAlign: 'center',
    marginBottom: 30,
  },
  translation: {
    fontSize: 24,
    fontWeight: '600',
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  optionsContainer: {
    gap: 15,
  },
  optionButton: {
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#FF1493',
    borderRadius: 15,
    paddingVertical: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  optionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FF1493',
  },
  correctOption: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  incorrectOption: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
  },
  correctOptionText: {
    color: '#ffffff',
  },
  incorrectOptionText: {
    color: '#ffffff',
  },
  resultContainer: {
    alignItems: 'center',
    marginTop: 30,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  resultText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  sentencesContainer: {
    marginTop: 20,
  },
  sentencesTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 15,
    textAlign: 'center',
  },
  sentenceContainer: {
    marginBottom: 12,
    paddingLeft: 15,
    borderLeftWidth: 3,
    borderLeftColor: '#FF1493',
  },
  sentence: {
    fontSize: 16,
    lineHeight: 24,
  },
  sentenceText: {
    color: '#374151',
  },
  highlightedWord: {
    color: '#FF1493',
    fontWeight: 'bold',
    backgroundColor: '#FFE4E1',
    paddingHorizontal: 3,
    borderRadius: 3,
  },
  noSentences: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  tapHint: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 20,
    fontStyle: 'italic',
  },
  progressContainer: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  progressText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 100,
  },
  errorText: {
    fontSize: 18,
    color: '#EF4444',
    textAlign: 'center',
    marginTop: 100,
  },
});