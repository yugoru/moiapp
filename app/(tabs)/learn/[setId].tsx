import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Animated } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Volume2, RotateCcw, CircleCheck as CheckCircle, Circle as XCircle } from 'lucide-react-native';
import { database, Card } from '@/lib/database';
import { generateOptions } from '@/lib/answer-generator';

export default function LearnScreen() {
  const { setId } = useLocalSearchParams();
  const [cards, setCards] = useState<Card[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [options, setOptions] = useState<string[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [loading, setLoading] = useState(true);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [isArchivedMode, setIsArchivedMode] = useState(false);

  // Animation values
  const cardAnimation = new Animated.Value(1);
  const resultAnimation = new Animated.Value(0);

  const loadCards = async () => {
    try {
      const loadedCards = await database.getCardsForLearning(String(setId), 10);
      if (loadedCards.length === 0) {
        Alert.alert('Empty Set', 'This set has no cards to learn', [
          { text: 'OK', onPress: () => router.back() }
        ]);
        return;
      }
      
      // Проверяем, все ли карточки архивные
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
      // Get all cards from the same set for generating wrong options
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
    if (showResult) return;

    setSelectedAnswer(answer);
    
    const currentCard = cards[currentCardIndex];
    const correct = answer === currentCard.translation;
    setIsCorrect(correct);
    
    // Show result after a brief delay to highlight the selection
    setTimeout(() => {
      setShowResult(true);
      
      // Animate result
      Animated.spring(resultAnimation, {
        toValue: 1,
        useNativeDriver: true,
      }).start();
    }, 500);
    
    if (correct) {
      setCorrectAnswers(prev => prev + 1);
    }
    setTotalAnswered(prev => prev + 1);

    // Update card progress
    database.updateCardProgress(currentCard.id, correct);

    // Auto move to next card after 2 seconds
    setTimeout(() => {
      moveToNextCard();
    }, 3500);
  };

  const moveToNextCard = () => {
    if (currentCardIndex < cards.length - 1) {
      // Animate card transition
      Animated.sequence([
        Animated.timing(cardAnimation, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(cardAnimation, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      const nextIndex = currentCardIndex + 1;
      setCurrentCardIndex(nextIndex);
      setSelectedAnswer(null);
      setShowResult(false);
      setIsCorrect(false);
      resultAnimation.setValue(0);
      generateAnswerOptions(cards[nextIndex]);
    } else {
      // Finished all cards
      Alert.alert(
        'Session Complete!',
        `You answered ${correctAnswers} out of ${totalAnswered} correctly.`,
        [
          { text: 'Continue', onPress: () => router.back() }
        ]
      );
    }
  };

  const showSentences = () => {
    const currentCard = cards[currentCardIndex];
    if (!currentCard || !currentCard.sentences || currentCard.sentences.length === 0) {
      return null;
    }

    // Показываем максимум 3 предложения
    const sentencesToShow = currentCard.sentences.slice(0, 3);
    
    return (
      <View style={styles.sentencesContainer}>
        <Text style={styles.sentencesTitle}>Example sentences:</Text>
        {sentencesToShow.map((sentence, index) => {
          // Подсвечиваем изученное слово зеленым цветом
          const highlightedSentence = sentence.replace(
            new RegExp(`\\b${currentCard.word}\\b`, 'gi'),
            (match) => `**${match}**`
          );
          
          return (
            <Text key={index} style={styles.sentence}>
              {highlightedSentence.split('**').map((part, partIndex) => {
                if (part.toLowerCase() === currentCard.word.toLowerCase()) {
                  return (
                    <Text key={partIndex} style={styles.highlightedWord}>
                      {part}
                    </Text>
                  );
                }
                return part;
              })}
            </Text>
          );
        })}
      </View>
    );
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

      <Animated.View style={[styles.cardContainer, { opacity: cardAnimation }]}>
        <View style={styles.card}>
          <Text style={styles.word}>{currentCard.word}</Text>
          
          {!showResult && (
            <View style={styles.optionsContainer}>
              {options.map((option, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.optionButton,
                    selectedAnswer === option && !showResult && styles.selectedOption,
                  ]}
                  onPress={() => handleAnswerSelect(option)}
                  disabled={showResult}
                >
                  <Text style={[
                    styles.optionText,
                    selectedAnswer === option && !showResult && styles.selectedOptionText,
                  ]}>
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {showResult && (
            <Animated.View 
              style={[
                styles.resultContainer,
                { transform: [{ scale: resultAnimation }] }
              ]}
            >
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
              
              <View style={styles.correctAnswerContainer}>
                <Text style={styles.correctAnswerLabel}>Correct answer:</Text>
                <Text style={styles.correctAnswer}>{currentCard.translation}</Text>
                
                {/* Show which option was selected */}
                {!isCorrect && (
                  <View style={styles.wrongAnswerContainer}>
                    <Text style={styles.wrongAnswerLabel}>Your answer:</Text>
                    <Text style={styles.wrongAnswer}>{selectedAnswer}</Text>
                  </View>
                )}
              </View>

              {currentCard.sentences && currentCard.sentences.length > 0 && (
                <View style={styles.sentencesContainer}>
                  <Text style={styles.sentencesTitle}>Example sentences:</Text>
                  {currentCard.sentences.slice(0, 3).map((sentence, index) => {
                    // Split sentence by the word to highlight it
                    const parts = sentence.split(new RegExp(`(\\b${currentCard.word}\\b)`, 'gi'));
                    
                    return (
                    <Text key={index} style={styles.sentence}>
                      {parts.map((part, partIndex) => {
                        if (part.toLowerCase() === currentCard.word.toLowerCase()) {
                          return (
                            <Text key={partIndex} style={styles.highlightedWord}>
                              {part}
                            </Text>
                          );
                        }
                        return part;
                      })}
                    </Text>
                    );
                  })}
                </View>
              )}
            </Animated.View>
          )}
        </View>
      </Animated.View>

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
  selectedOption: {
    backgroundColor: '#FFE4E1',
    borderColor: '#FF1493',
  },
  selectedOptionText: {
    color: '#FF1493',
  },
  correctOption: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  incorrectOption: {
    backgroundColor: '#FF6347',
    borderColor: '#FF6347',
  },
  correctOptionText: {
    color: '#ffffff',
  },
  incorrectOptionText: {
    color: '#ffffff',
  },
  resultContainer: {
    alignItems: 'center',
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
  correctAnswerContainer: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    width: '100%',
  },
  correctAnswerLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 5,
  },
  correctAnswer: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#10B981',
  },
  wrongAnswerContainer: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  wrongAnswerLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 5,
  },
  wrongAnswer: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6347',
  },
  sentencesContainer: {
    width: '100%',
    marginTop: 15,
  },
  sentencesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 10,
  },
  sentence: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
    marginBottom: 8,
    paddingLeft: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#FF1493',
  },
  highlightedWord: {
    color: '#10B981',
    fontWeight: 'bold',
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 2,
    borderRadius: 3,
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