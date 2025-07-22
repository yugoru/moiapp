import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl, Image } from 'react-native';
import { router } from 'expo-router';
import { Plus, BookOpen, Trash2, Trophy } from 'lucide-react-native';
import { database, CardSet } from '@/lib/database';

export default function HomeScreen() {
  const [cardSets, setCardSets] = useState<CardSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadCardSets = async () => {
    try {
      console.log('Loading card sets...');
      const sets = await database.getCardSets();
      console.log('Loaded sets:', sets);
      setCardSets(sets);
    } catch (error) {
      console.error('Error loading card sets:', error);
      Alert.alert('Error', 'Failed to load card sets');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    console.log('HomeScreen mounted, loading card sets...');
    database.init().then(() => {
      loadCardSets();
    });
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadCardSets();
  };

  const handleDeleteSet = (set: CardSet) => {
    Alert.alert(
      'Delete Set',
      `Are you sure you want to delete "${set.name}"? All cards will be permanently deleted.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await database.deleteCardSet(set.id);
              loadCardSets();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete set');
            }
          },
        },
      ]
    );
  };

  const getProgressColor = (learned: number, total: number) => {
    const percentage = total > 0 ? learned / total : 0;
    if (percentage === 1) return '#00FF7F'; // Bright green for completed
    if (percentage > 0.7) return '#FF1493'; // Magenta for high progress
    if (percentage > 0.3) return '#FF6347'; // Bright orange for medium progress
    return '#FF4500'; // Bright red for low progress
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading sets...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Image source={require('@/assets/images/logo.png')} style={styles.logo} />
          <Text style={styles.subtitle}>My Card Sets</Text>
        </View>
        <TouchableOpacity 
          style={styles.addButton} 
          onPress={() => router.push('/add')}
        >
          <Plus size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {cardSets.length === 0 ? (
        <View style={styles.emptyState}>
          <Image source={require('@/assets/images/icon.png')} style={styles.emptyIcon} />
          <Text style={styles.emptyTitle}>No sets yet</Text>
          <Text style={styles.emptyDescription}>
            Add your first flashcard set by uploading a CSV file
          </Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => router.push('/add')}
          >
            <Plus size={20} color="#ffffff" />
            <Text style={styles.emptyButtonText}>Add Set</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {cardSets.map((set) => {
            const progress = set.totalCards > 0 ? set.learnedCards / set.totalCards : 0;
            const progressColor = getProgressColor(set.learnedCards, set.totalCards);
            
            return (
              <View key={set.id} style={styles.cardContainer}>
                <TouchableOpacity
                  style={[styles.card, { borderLeftColor: set.color }]}
                  onPress={() => router.push(`/learn/${set.id}`)}
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.cardIcon}>
                      <Text style={styles.iconText}>{set.icon}</Text>
                    </View>
                    <View style={styles.cardInfo}>
                      <Text style={styles.cardName}>{set.name}</Text>
                      <Text style={styles.cardStats}>
                        {set.learnedCards} of {set.totalCards} learned
                        {set.archivedCards > 0 && ` • ${set.archivedCards} archived`}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => handleDeleteSet(set)}
                    >
                      <Trash2 size={20} color="#FF4500" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.progressContainer}>
                    <View style={styles.progressBar}>
                      <View 
                        style={[
                          styles.progressFill, 
                          { 
                            width: `${progress * 100}%`,
                            backgroundColor: progressColor 
                          }
                        ]} 
                      />
                    </View>
                    <Text style={styles.progressText}>
                      {Math.round(progress * 100)}%
                    </Text>
                  </View>

                  {set.learnedCards === set.totalCards && set.totalCards > 0 && (
                    <View style={styles.completedBadge}>
                      <Trophy size={16} color="#00FF7F" />
                      <Text style={styles.completedText}>Completed</Text>
                    </View>
                  )}

                  {set.archivedCards === set.totalCards && set.totalCards > 0 && (
                    <View style={styles.archivedBadge}>
                      <Text style={styles.archivedText}>📦 All Archived</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            );
          })}
        </ScrollView>
      )}
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
  titleContainer: {
    flex: 1,
  },
  logo: {
    width: 120,
    height: 40,
    resizeMode: 'contain',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 2,
  },
  addButton: {
    backgroundColor: '#FF1493',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF1493',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 60,
    height: 60,
    marginBottom: 20,
    resizeMode: 'contain',
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  emptyButton: {
    backgroundColor: '#FF1493',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#FF1493',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  emptyButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  cardContainer: {
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  iconText: {
    fontSize: 24,
  },
  cardInfo: {
    flex: 1,
  },
  cardName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  cardStats: {
    fontSize: 14,
    color: '#6B7280',
  },
  deleteButton: {
    padding: 8,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
    marginRight: 12,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    minWidth: 40,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingVertical: 4,
  },
  completedText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#00FF7F',
    marginLeft: 4,
  },
  archivedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingVertical: 4,
    backgroundColor: '#FF4500',
    borderRadius: 4,
  },
  archivedText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginLeft: 4,
  },
});