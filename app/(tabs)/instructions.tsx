import { View, Text, ScrollView, StyleSheet } from 'react-native';

export default function InstructionsScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>How to Use Moinaki</Text>
      <Text style={styles.sectionTitle}>1. Add a Set</Text>
      <Text style={styles.text}>
        Tap the "+" button and upload a CSV file with your flashcards. The format should be:
      </Text>
      <Text style={styles.code}>
        word,translation,sentences{'\n'}
        buy,покупать,"I want to buy some bread.|She buys fresh vegetables every morning."
      </Text>
      <Text style={styles.sectionTitle}>2. Learn</Text>
      <Text style={styles.text}>
        Tap on a set to start learning. Choose the correct translation for each word. Your progress will be saved automatically.
      </Text>
      <Text style={styles.sectionTitle}>3. Delete a Set</Text>
      <Text style={styles.text}>
        Tap the trash icon on a set to delete it. You will be asked to confirm before deletion.
      </Text>
      <Text style={styles.sectionTitle}>4. Preinstalled Sets</Text>
      <Text style={styles.text}>
        The app comes with some preinstalled sets. You can add your own at any time.
      </Text>
      <Text style={styles.sectionTitle}>5. Generate Custom Sets</Text>
      <Text style={styles.text}>
        You can generate custom flashcard sets using our AI assistant at:
      </Text>
      <Text style={styles.link}>
        https://chatgpt.com/g/g-687f6168cfb88191846b5f9463ab586b-moinaki-card-builder?model=gpt-4o
      </Text>
      <Text style={styles.text}>
        The AI will help you create properly formatted CSV files for any topic you want to learn.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FF1493',
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#374151',
    marginTop: 20,
    marginBottom: 8,
  },
  text: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 8,
  },
  code: {
    fontFamily: 'monospace',
    backgroundColor: '#f0f0f0',
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  link: {
    fontSize: 14,
    color: '#007AFF',
    textDecorationLine: 'underline',
    marginBottom: 8,
  },
}); 