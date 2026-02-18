/**
 * CSV parsing utility that respects standard quoting rules
 * Handles commas and newlines inside quoted fields, escaped quotes, UTF-8 BOM, and CRLF line endings
 */

export interface CSVParseResult {
  headers: string[];
  rows: string[][];
}

/**
 * Strip UTF-8 BOM if present at the start of the text
 */
function stripBOM(text: string): string {
  if (text.charCodeAt(0) === 0xfeff) {
    return text.slice(1);
  }
  return text;
}

/**
 * Normalize line endings (CRLF → LF)
 */
function normalizeLineEndings(text: string): string {
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

/**
 * Parse CSV text into headers and rows, respecting standard CSV quoting rules
 */
export function parseCSV(csvText: string): CSVParseResult {
  // Strip BOM and normalize line endings
  const normalized = normalizeLineEndings(stripBOM(csvText.trim()));
  const lines = normalized.split('\n');
  
  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  // Parse header row
  const headers = parseCSVLine(lines[0]);

  // Parse data rows
  const rows: string[][] = [];
  let i = 1;
  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) {
      i++;
      continue;
    }

    // Handle multi-line quoted fields
    let fullLine = line;
    let quoteCount = countUnescapedQuotes(line);
    
    // If odd number of quotes, field spans multiple lines
    while (quoteCount % 2 !== 0 && i + 1 < lines.length) {
      i++;
      fullLine += '\n' + lines[i];
      quoteCount = countUnescapedQuotes(fullLine);
    }

    const row = parseCSVLine(fullLine);
    rows.push(row);
    i++;
  }

  return { headers, rows };
}

/**
 * Parse a single CSV line into fields, respecting quotes
 */
function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let currentField = '';
  let insideQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];
    const nextChar = i + 1 < line.length ? line[i + 1] : '';

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        // Escaped quote (two consecutive quotes)
        currentField += '"';
        i += 2;
        continue;
      } else {
        // Toggle quote state
        insideQuotes = !insideQuotes;
        i++;
        continue;
      }
    }

    if (char === ',' && !insideQuotes) {
      // Field separator
      fields.push(currentField.trim());
      currentField = '';
      i++;
      continue;
    }

    // Regular character
    currentField += char;
    i++;
  }

  // Add the last field
  fields.push(currentField.trim());

  return fields;
}

/**
 * Count unescaped quotes in a string
 */
function countUnescapedQuotes(str: string): number {
  let count = 0;
  let i = 0;
  while (i < str.length) {
    if (str[i] === '"') {
      if (i + 1 < str.length && str[i + 1] === '"') {
        // Escaped quote, skip both
        i += 2;
      } else {
        count++;
        i++;
      }
    } else {
      i++;
    }
  }
  return count;
}
