export interface CSVRow {
  word: string;
  translation: string;
  sentences: string[];
}

export class CSVParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CSVParseError';
  }
}

export function parseCSV(csvContent: string): CSVRow[] {
  try {
    // Проверяем, что файл не пустой
    if (!csvContent || csvContent.trim().length === 0) {
      throw new CSVParseError('The file is empty. Please upload a CSV file with data.');
    }

    const lines = csvContent.trim().split('\n');
    
    // Проверяем, что есть хотя бы заголовок и одна строка данных
    if (lines.length < 2) {
      throw new CSVParseError('The file must contain at least a header row and one data row.');
    }

    // Проверяем заголовок
    const header = lines[0].toLowerCase().trim();
    const expectedHeader = 'word,translation,sentences';
    
    if (header !== expectedHeader) {
      throw new CSVParseError(
        `Invalid CSV format. The header should be: "${expectedHeader}". ` +
        `Found: "${header}". Please check your file format.`
      );
    }

    const results: CSVRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue; // Пропускаем пустые строки

      try {
        const row = parseCSVLine(line, i + 1);
        if (row) {
          results.push(row);
        }
      } catch (error) {
        if (error instanceof CSVParseError) {
          throw error;
        }
        throw new CSVParseError(
          `Error parsing line ${i + 1}: "${line}". ` +
          `Please check that the line follows the format: word,translation,"sentence1|sentence2"`
        );
      }
    }

    if (results.length === 0) {
      throw new CSVParseError('No valid data rows found in the file. Please check your CSV format.');
    }

    return results;
  } catch (error) {
    if (error instanceof CSVParseError) {
      throw error;
    }
    throw new CSVParseError(
      'Failed to parse CSV file. Please ensure the file is in the correct format: ' +
      'word,translation,sentences with proper comma separation and quotes around sentences.'
    );
  }
}

function parseCSVLine(line: string, lineNumber: number): CSVRow | null {
  // Простой парсер для строки CSV
  const parts: string[] = [];
  let current = '';
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        // Экранированная кавычка
        current += '"';
        i += 2;
        continue;
      }
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      parts.push(current.trim());
      current = '';
    } else {
      current += char;
    }
    i++;
  }
  
  // Добавляем последнюю часть
  parts.push(current.trim());

  if (inQuotes) {
    throw new CSVParseError(
      `Unclosed quotes in line ${lineNumber}. Please check your CSV format.`
    );
  }

  if (parts.length < 3) {
    throw new CSVParseError(
      `Line ${lineNumber} has insufficient columns. Expected 3 columns (word, translation, sentences), found ${parts.length}.`
    );
  }

  const [word, translation, sentencesStr] = parts;

  // Валидация обязательных полей
  if (!word || word.trim().length === 0) {
    throw new CSVParseError(
      `Line ${lineNumber}: Word field cannot be empty.`
    );
  }

  if (!translation || translation.trim().length === 0) {
    throw new CSVParseError(
      `Line ${lineNumber}: Translation field cannot be empty.`
    );
  }

  // Парсинг предложений
  let sentences: string[];
  if (!sentencesStr || sentencesStr.trim().length === 0) {
    sentences = [];
  } else {
    // Убираем внешние кавычки если они есть
    const cleanSentences = sentencesStr.replace(/^"|"$/g, '');
    sentences = cleanSentences.split('|').map(s => s.trim()).filter(s => s.length > 0);
  }

  return {
    word: word.trim(),
    translation: translation.trim(),
    sentences
  };
}