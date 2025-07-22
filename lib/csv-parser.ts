export interface CSVData {
  word: string;
  translation: string;
  sentences: string[];
}

export function parseCSV(csvContent: string): CSVData[] {
  const lines = csvContent.split('\n').filter(line => line.trim());
  
  // Skip header row
  const dataLines = lines.slice(1);
  
  const result: CSVData[] = [];
  
  for (const line of dataLines) {
    // Simple CSV parsing - handling quoted values
    const values = parseCSVLine(line);
    
    if (values.length >= 3) {
      const [word, translation, sentences] = values;
      
      const sentenceArray = sentences
        .split('|')
        .map(s => s.trim())
        .filter(s => s.length > 0);
      
      result.push({
        word: word.trim(),
        translation: translation.trim(),
        sentences: sentenceArray,
      });
    }
  }
  
  return result;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current);
  return result.map(val => val.replace(/^"|"$/g, '')); // Remove surrounding quotes
}