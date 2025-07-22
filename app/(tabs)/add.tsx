import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, Plus, FileText } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { database } from '@/lib/database';
import { parseCSV, CSVParseError } from '@/lib/csv-parser';

export default function AddScreen() {
  const [setName, setSetName] = useState('');
  const [selectedFile, setSelectedFile] = useState<DocumentPicker.DocumentPickerResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [preview, setPreview] = useState<any[]>([]);

  const pickCSVFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', 'application/csv'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const file = result.assets[0];
        setSelectedFile(result);

        // Read and preview the file
        try {
          const content = await FileSystem.readAsStringAsync(file.uri);
          const parsedData = parseCSV(content);
          setPreview(parsedData.slice(0, 5)); // Show first 5 items
          
          // Auto-generate set name from filename if not provided
          if (!setName) {
            const fileName = file.name.replace('.csv', '').replace(/[-_]/g, ' ');
            setSetName(fileName.charAt(0).toUpperCase() + fileName.slice(1));
          }
        } catch (error) {
          if (error instanceof CSVParseError) {
            Alert.alert('Invalid File Format', error.message);
          } else {
            Alert.alert('Error', 'Failed to read file. Please check CSV format.');
          }
          setSelectedFile(null);
          setPreview([]);
          return;
        }
      }
    } catch (error) {
      console.error('Error picking file:', error);
      Alert.alert('Error', 'Failed to pick file. Please try again.');
    }
  };

  const createCardSet = async () => {
    if (!setName.trim()) {
      Alert.alert('Error', 'Please enter a set name');
      return;
    }

    if (!selectedFile || selectedFile.canceled) {
      Alert.alert('Error', 'Please select a CSV file');
      return;
    }

    setIsLoading(true);

    try {
      const file = selectedFile.assets[0];
      const content = await FileSystem.readAsStringAsync(file.uri);
      
      try {
        const parsedData = parseCSV(content);

        if (parsedData.length === 0) {
          Alert.alert('Error', 'CSV file is empty or has incorrect format');
          setIsLoading(false);
          return;
        }

        // Сохраняем CSV-файл в FileSystem через новую функцию
        await database.createCardSet(setName.trim(), content);

        // Clear form after successful creation
        setSetName('');
        setSelectedFile(null);
        setPreview([]);

        Alert.alert(
          'Success!',
          `Set "${setName}" created with ${parsedData.length} cards`,
          [
            {
              text: 'OK',
              onPress: () => router.push('/'),
            },
          ]
        );
      } catch (error) {
        if (error instanceof CSVParseError) {
          Alert.alert('Invalid File Format', error.message);
        } else {
          Alert.alert('Error', 'Failed to create card set. Please check your file format.');
        }
      }
    } catch (error) {
      console.error('Error creating card set:', error);
      Alert.alert('Error', 'Failed to create card set');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.title}>Add Set</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Set Name</Text>
          <TextInput
            style={styles.input}
            value={setName}
            onChangeText={setSetName}
            placeholder="Enter set name..."
            placeholderTextColor="#9CA3AF"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CSV File</Text>
          <Text style={styles.sectionDescription}>
            Format: word,translation,sentences{'\n'}
            Sentences are separated by "|"
          </Text>

          <TouchableOpacity
            style={styles.uploadButton}
            onPress={pickCSVFile}
            disabled={isLoading}
          >
            <Plus size={24} color="#007AFF" />
            <Text style={styles.uploadButtonText}>
              {selectedFile && !selectedFile.canceled ? 'Change File' : 'Select CSV File'}
            </Text>
          </TouchableOpacity>

          {selectedFile && !selectedFile.canceled && (
            <View style={styles.fileInfo}>
              <FileText size={20} color="#00FF7F" />
              <Text style={styles.fileName}>{selectedFile.assets[0].name}</Text>
            </View>
          )}
        </View>

        {preview.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Preview</Text>
            {preview.map((item, index) => (
              <View key={index} style={styles.previewCard}>
                <Text style={styles.previewWord}>{item.word}</Text>
                <Text style={styles.previewTranslation}>{item.translation}</Text>
                <Text style={styles.previewSentences}>
                  {item.sentences.length} sentence{item.sentences.length !== 1 ? 's' : ''}
                </Text>
              </View>
            ))}
            {preview.length > 5 && (
              <Text style={styles.moreItems}>
                And {preview.length - 5} more cards...
              </Text>
            )}
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.createButton,
            (!setName.trim() || !selectedFile || selectedFile.canceled || isLoading) && styles.createButtonDisabled
          ]}
          onPress={createCardSet}
          disabled={!setName.trim() || !selectedFile || selectedFile.canceled || isLoading}
        >
          <Text style={[
            styles.createButtonText,
            (!setName.trim() || !selectedFile || selectedFile.canceled || isLoading) && styles.createButtonTextDisabled
          ]}>
            {isLoading ? 'Creating...' : 'Create Set'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF1493',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
    lineHeight: 20,
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#FF1493',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1F2937',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#FF1493',
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF1493',
    marginLeft: 8,
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#00FF7F',
  },
  fileName: {
    fontSize: 16,
    color: '#1F2937',
    marginLeft: 8,
    flex: 1,
  },
  previewCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#FF1493',
  },
  previewWord: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF1493',
    marginBottom: 4,
  },
  previewTranslation: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 4,
  },
  previewSentences: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  moreItems: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  createButton: {
    backgroundColor: '#FF1493',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#FF1493',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  createButtonDisabled: {
    backgroundColor: '#D1D5DB',
    shadowOpacity: 0,
    elevation: 0,
  },
  createButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  createButtonTextDisabled: {
    color: '#9CA3AF',
  },
});