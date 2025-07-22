export function generateOptions(correct: string, allTranslations: string[]): string[] {
  // Remove the correct answer from all translations to get wrong options
  const wrongTranslations = allTranslations.filter(translation => translation !== correct);
  
  // If we don't have enough wrong options, fill with placeholders
  const wrongOptions: string[] = [];
  
  if (wrongTranslations.length >= 2) {
    // Randomly select 2 wrong options
    const shuffledWrong = wrongTranslations.sort(() => Math.random() - 0.5);
    wrongOptions.push(shuffledWrong[0], shuffledWrong[1]);
  } else if (wrongTranslations.length === 1) {
    // Only one wrong option available, add placeholder
    wrongOptions.push(wrongTranslations[0], "—");
  } else {
    // No wrong options available, add placeholders
    wrongOptions.push("—", "—");
  }
  
  // Combine correct answer with wrong options
  const allOptions = [correct, ...wrongOptions];
  
  // Shuffle the final array
  return allOptions.sort(() => Math.random() - 0.5);
}