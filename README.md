# Moinaki

A flashcard learning app for vocabulary practice, built with React Native and Expo.

## Features

- **Flashcard Sets**: Create and manage vocabulary sets from CSV files
- **Learning Mode**: Interactive learning with multiple choice answers
- **Progress Tracking**: Track your learning progress with success counters
- **Archive System**: Words are archived after 50 successful repetitions and return periodically for review
- **Pre-installed Sets**: Comes with sample vocabulary sets to get started

## Technology

- **React Native** with **Expo**
- **TypeScript** for type safety
- **Expo Router** for navigation
- **AsyncStorage** for progress persistence
- **FileSystem** for local file management

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Build for production:
   ```bash
   eas build -p android --profile preview
   ```

## CSV Format

Upload CSV files with the following format:
```
word,translation,sentences
buy,покупать,"I want to buy some bread.|She buys fresh vegetables every morning."
```

## Created with support from [GradeBuilder.tech](https://gradebuilder.tech)

This project was developed with assistance from GradeBuilder.tech, providing AI-powered development support and guidance.

## Version

Current version: 1.1.0
