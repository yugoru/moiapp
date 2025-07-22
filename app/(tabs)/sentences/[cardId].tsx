import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, BookOpen } from 'lucide-react-native';
import { database, Card } from '@/lib/database';

export default function SentencesScreen() {
  const { cardId } = useLocalSearchParams();
  const [card, setCard] = useState<Card | null>(null);
  const [loading, setLoading] = useState(true);

  const loadCard = async () => {
    try {
      const loadedCard = await database.getCardById(Number(cardId));
      if (!loadedCard) {
        Alert.alert('Error', 'Card not found', [
          { text: 'OK', onPress: () => router.back() }
        ]);
        return;
      }
      setCard(loadedCard);
    } catch (error) {
      console.error('Error loading card:', error);
      Alert.alert('Error', 'Failed to load card');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCard();
  }, [cardId]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading sentences...</Text>
      </View>
    );
  }

  if (!card) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Card not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.title}>Example Sentences</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        <View style={styles.wordCard}>
          <View style={styles.wordHeader}>
            <BookOpen size={24} color="#FF1493" />
            <Text style={styles.word}>{card.word}</Text>
          </View>
          <Text style={styles.translation}>{card.translation}</Text>
          
          <View style={styles.progressInfo}>
            <Text style={styles.progressText}>
              Repetitions: {card.repeatCount}/50
            </Text>
            <View style={styles.statusBadge}>
              <Text style={[
                styles.statusText,
                card.status === 'archived' ? styles.archivedStatus : styles.learningStatus
              ]}>
                {card.status === 'archived' ? 'Learned' : 'Learning'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.sentencesSection}>
          <Text style={styles.sectionTitle}>
            Usage Examples ({card.sentences.length})
          </Text>
          
          {card.sentences.map((sentence, index) => (
            <View key={index} style={styles.sentenceCard}>
              <View style={styles.sentenceHeader}>
                <Text style={styles.sentenceNumber}>{index + 1}</Text>
              </View>
              <Text style={styles.sentenceText}>
                {sentence.replace(new RegExp(card.word, 'gi'), (match) => `**${match}**`)}
              </Text>
            </View>
          ))}
        </View>

        {card.sentences.length === 0 && (
          <View style={styles.noSentences}>
            <Text style={styles.noSentencesText}>
              No example sentences for this word
            </Text>
          </View>
        )}
      </ScrollView>
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF1493',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  wordCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 2,
    borderColor: '#FF1493',
  },
  wordHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  word: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FF1493',
    marginLeft: 12,
  },
  translation: {
    fontSize: 20,
    color: '#6B7280',
    marginBottom: 16,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#FF1493',
    paddingTop: 16,
  },
  progressText: {
    fontSize: 14,
    color: '#6B7280',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#FFE4E1',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  archivedStatus: {
    color: '#00FF7F',
  },
  learningStatus: {
    color: '#FF1493',
  },
  sentencesSection: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF1493',
    marginBottom: 16,
  },
  sentenceCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#FF1493',
  },
  sentenceHeader: {
    marginRight: 12,
  },
  sentenceNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF1493',
    backgroundColor: '#FFE4E1',
    width: 28,
    height: 28,
    textAlign: 'center',
    lineHeight: 28,
    borderRadius: 14,
  },
  sentenceText: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
    flex: 1,
  },
  noSentences: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FF1493',
  },
  noSentencesText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
});