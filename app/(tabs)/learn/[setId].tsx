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

  // Animation values
  const cardAnimation = new Animated.Value(1);
  const resultAnimation = new Animated.Value(0);

  const loadCards = async () => {
    try {
      const loadedCards = await database.getCardsForLearning(Number(setId), 10);
      if (loadedCards.length === 0) {
        Alert.alert('Empty Set', 'This set has no cards to learn', [
          { text: 'OK', onPress: () => router.back() }
        ]);
        return;
      }
      
      setCards(loadedCards);
      setCurrentCardIndex(0);
      generateOptions(loadedCards[0]);
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
      const allCards = await database.getCardsForLearning(Number(setId), 100);
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
    setShowResult(true);
    
    const currentCard = cards[currentCardIndex];
    const correct = answer === currentCard.translation;
    setIsCorrect(correct);
    
    if (correct) {
      setCorrectAnswers(prev => prev + 1);
    }
    setTotalAnswered(prev => prev + 1);

    // Update card progress
    database.updateCardProgress(currentCard.id!, correct);

    // Animate result
    Animated.spring(resultAnimation, {
      toValue: 1,
      useNativeDriver: true,
    }).start();

    // Auto move to next card after 2 seconds
    setTimeout(() => {
      moveToNextCard();
    }, 2000);
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
        })
      ]).start();

      setTimeout(() => {
        const nextIndex = currentCardIndex + 1;
        setCurrentCardIndex(nextIndex);
        generateAnswerOptions(cards[nextIndex]);
        setSelectedAnswer(null);
        setShowResult(false);
        resultAnimation.setValue(0);
      }, 200);
    } else {
      // Show completion screen
      Alert.alert(
        'Session Complete!',
        `You answered ${correctAnswers} out of ${totalAnswered} questions correctly.`,
        [
          { text: 'Continue', onPress: loadCards },
          { text: 'Finish', onPress: () => router.back() }
        ]
      );
    }
  };

  const showSentences = () => {
    const currentCard = cards[currentCardIndex];
    router.push(`/sentences/${currentCard.id}`);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Preparing cards...</Text>
      </View>
    );
  }

  if (cards.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No cards to learn</Text>
      </View>
    );
  }

  const currentCard = cards[currentCardIndex];
  const progress = ((currentCardIndex + 1) / cards.length) * 100;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#374151" />
        </TouchableOpacity>
        
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>
            {currentCardIndex + 1} of {cards.length}
          </Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
        </View>

        <View style={styles.scoreContainer}>
          <Text style={styles.scoreText}>{correctAnswers}/{totalAnswered}</Text>
        </View>
      </View>

      <Animated.View 
        style={[
          styles.cardContainer,
          {
            opacity: cardAnimation,
            transform: [{
              scale: cardAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: [0.9, 1],
              }),
            }],
          }
        ]}
      >
        <View style={styles.card}>
          <TouchableOpacity onPress={showSentences} style={styles.wordContainer}>
            <Text style={styles.word}>{currentCard.word}</Text>
            <Volume2 size={20} color="#FF1493" style={styles.volumeIcon} />
          </TouchableOpacity>
          
          <Text style={styles.instruction}>
            Choose the correct translation:
          </Text>

          <View style={styles.optionsContainer}>
            {options.map((option, index) => {
              const isSelected = selectedAnswer === option;
              const isCorrectOption = option === currentCard.translation;
              
              let buttonStyle = styles.optionButton;
              let textStyle = styles.optionText;

              if (showResult) {
                if (isCorrectOption) {
                  buttonStyle = [styles.optionButton, styles.correctOption];
                  textStyle = [styles.optionText, styles.correctOptionText];
                } else if (isSelected) {
                  buttonStyle = [styles.optionButton, styles.incorrectOption];
                  textStyle = [styles.optionText, styles.incorrectOptionText];
                } else {
                  buttonStyle = [styles.optionButton, styles.disabledOption];
                  textStyle = [styles.optionText, styles.disabledOptionText];
                }
              } else if (isSelected) {
                buttonStyle = [styles.optionButton, styles.selectedOption];
                textStyle = [styles.optionText, styles.selectedOptionText];
              }

              return (
                <TouchableOpacity
                  key={index}
                  style={buttonStyle}
                  onPress={() => handleAnswerSelect(option)}
                  disabled={showResult}
                >
                  <Text style={textStyle}>{option}</Text>
                  {showResult && isCorrectOption && (
                    <CheckCircle size={20} color="#00FF7F" />
                  )}
                  {showResult && isSelected && !isCorrectOption && (
                    <XCircle size={20} color="#FF4500" />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Animated.View>

      {showResult && (
        <Animated.View 
          style={[
            styles.resultContainer,
            {
              opacity: resultAnimation,
              transform: [{
                translateY: resultAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [50, 0],
                }),
              }],
            }
          ]}
        >
          <View style={[
            styles.resultBadge,
            isCorrect ? styles.correctBadge : styles.incorrectBadge
          ]}>
            {isCorrect ? (
              <CheckCircle size={24} color="#ffffff" />
            ) : (
              <XCircle size={24} color="#ffffff" />
            )}
            <Text style={styles.resultText}>
              {isCorrect ? 'Correct!' : 'Wrong'}
            </Text>
          </View>
        </Animated.View>
      )}

      <View style={styles.bottomActions}>
        <TouchableOpacity
          style={styles.restartButton}
          onPress={loadCards}
        >
          <RotateCcw size={20} color="#6B7280" />
          <Text style={styles.restartText}>Restart</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    fontSize: 18,
    color: '#6B7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  emptyText: {
    fontSize: 18,
    color: '#6B7280',
  },
  header: {
    flexDirection: 'row',
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
  progressContainer: {
    flex: 1,
    marginHorizontal: 20,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
    marginBottom: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#F0F0F0',
    borderRadius: 3,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FF1493',
    borderRadius: 3,
  },
  scoreContainer: {
    alignItems: 'center',
  },
  scoreText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
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
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 2,
    borderColor: '#FF1493',
  },
  wordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
  },
  word: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FF1493',
    textAlign: 'center',
  },
  volumeIcon: {
    marginLeft: 12,
  },
  instruction: {
    fontSize: 18,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 30,
  },
  optionsContainer: {
    gap: 16,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#FF1493',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  selectedOption: {
    backgroundColor: '#FFE4E1',
    borderColor: '#FF1493',
  },
  correctOption: {
    backgroundColor: '#F0FFF0',
    borderColor: '#00FF7F',
  },
  incorrectOption: {
    backgroundColor: '#FFE4E1',
    borderColor: '#FF4500',
  },
  disabledOption: {
    opacity: 0.6,
  },
  optionText: {
    fontSize: 18,
    color: '#374151',
    flex: 1,
  },
  selectedOptionText: {
    color: '#FF1493',
    fontWeight: '600',
  },
  correctOptionText: {
    color: '#00FF7F',
    fontWeight: '600',
  },
  incorrectOptionText: {
    color: '#FF4500',
    fontWeight: '600',
  },
  disabledOptionText: {
    color: '#9CA3AF',
  },
  resultContainer: {
    position: 'absolute',
    bottom: 120,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  resultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  correctBadge: {
    backgroundColor: '#00FF7F',
  },
  incorrectBadge: {
    backgroundColor: '#FF4500',
  },
  resultText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginLeft: 8,
  },
  bottomActions: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 20,
  },
  restartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  restartText: {
    fontSize: 16,
    color: '#6B7280',
    marginLeft: 8,
  },
});