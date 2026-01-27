import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OCRResult {
  text: string;
  confidence: number;
  method: 'primary' | 'fallback' | 'hybrid';
  processingTime: number;
  metadata?: any;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const ocrSpaceApiKey = Deno.env.get('OCR_SPACE_API_KEY');
    
    if (!ocrSpaceApiKey) {
      throw new Error('OCR API key not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const payload = await req.json();
    const { file_id, file_data, file_type: clientFileType, options = {} } = payload;

    let fileBuffer: Uint8Array | null = null;
    let fileType = clientFileType || 'application/pdf';
    let fileName = 'upload.jpg'; // default

    // Prefer storage fetch by file_id (avoids large base64 payloads)
    if (file_id) {
      console.log(`Fetching file from storage: ${file_id}`);
      const { data: fileRow, error: fileRowErr } = await supabase
        .from('file_uploads')
        .select('file_url, file_type, file_name')
        .eq('id', file_id)
        .maybeSingle();
      
      if (fileRowErr || !fileRow?.file_url) {
        console.error('File lookup error:', fileRowErr, 'fileRow:', fileRow);
        throw new Error('File not found or missing storage path');
      }
      
      fileType = fileRow.file_type || fileType;
      fileName = fileRow.file_name || fileName;
      
      // Extract the storage path from the public URL
      // URL format: https://xxx.supabase.co/storage/v1/object/public/study-files/{path}
      let storagePath = fileRow.file_url;
      const storagePathMatch = fileRow.file_url.match(/\/study-files\/(.+)$/);
      if (storagePathMatch) {
        storagePath = storagePathMatch[1];
      }
      
      console.log(`Downloading from storage path: ${storagePath}`);
      
      const { data: storageFile, error: dlErr } = await supabase
        .storage
        .from('study-files')
        .download(storagePath);
      
      if (dlErr || !storageFile) {
        console.error('Storage download error:', dlErr);
        throw new Error('Could not download file from storage');
      }
      
      fileBuffer = new Uint8Array(await storageFile.arrayBuffer());
      console.log(`Downloaded ${fileBuffer.length} bytes`);
    } else if (file_data) {
    } else if (file_data) {
      // Legacy: base64 path (keep for backwards compatibility)
      console.log('Using legacy base64 file data');
      const binaryString = atob(file_data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      fileBuffer = bytes;
    } else {
      return new Response(
        JSON.stringify({ error: 'No file provided (need file_id or file_data)' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Build correct filename by MIME type
    fileName = fileType.includes('pdf') ? 'upload.pdf' : 'upload.jpg';
    console.log('Enhanced OCR processing:', { file_type: fileType, fileName, file_id, options });

    // Multi-layered OCR processing
    let ocrResult: OCRResult;

    // Ensure we have file data
    if (!fileBuffer) {
      throw new Error('No file data available for OCR processing');
    }

    try {
      // Primary OCR using OCR Space API (high accuracy for printed text)
      ocrResult = await primaryOCR(fileBuffer, fileType, fileName, ocrSpaceApiKey);
      console.log('Primary OCR successful:', { confidence: ocrResult.confidence });
      
      // If confidence is low, try fallback methods
      if (ocrResult.confidence < 0.8) {
        console.log('Low confidence, attempting fallback OCR...');
        const fallbackResult = await fallbackOCR(fileBuffer, fileType);
        
        // Use hybrid approach - combine results if both have reasonable confidence
        if (fallbackResult.confidence > 0.6) {
          ocrResult = await hybridOCR(ocrResult, fallbackResult);
        }
      }
      
    } catch (primaryError) {
      console.error('Primary OCR failed, using fallback:', primaryError);
      
      // Ensure fileBuffer is not null for fallback
      if (!fileBuffer) {
        throw new Error('No file data available for fallback OCR');
      }
      
      // Fallback OCR processing
      ocrResult = await fallbackOCR(fileBuffer, fileType);
      
      if (!ocrResult.text || ocrResult.text.length < 10) {
        throw new Error('Both primary and fallback OCR methods failed to extract meaningful text');
      }
    }

    // Post-process extracted text
    const processedText = await postProcessText(ocrResult.text, fileType);
    
    // Document type classification
    const documentType = await classifyDocument(processedText);
    
    // Extract metadata based on document type
    const metadata = await extractMetadata(processedText, documentType, fileType);

    // Update file record with enhanced results
    if (file_id) {
      await supabase
        .from('file_uploads')
        .update({ 
          ocr_text: processedText,
          status: 'ocr_completed',
          parsed_data: {
            document_type: documentType,
            metadata,
            ocr_confidence: ocrResult.confidence,
            processing_method: ocrResult.method,
            processing_time_ms: Date.now() - startTime
          }
        })
        .eq('id', file_id);
    }

    const processingTime = Date.now() - startTime;

    return new Response(
      JSON.stringify({ 
        success: true,
        text: processedText,
        confidence: ocrResult.confidence,
        method: ocrResult.method,
        document_type: documentType,
        metadata,
        processing_time_ms: processingTime,
        quality_score: calculateQualityScore(ocrResult, processedText, documentType)
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Enhanced OCR error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'OCR processing failed',
        processing_time_ms: Date.now() - startTime
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function primaryOCR(
  fileBuffer: Uint8Array, 
  fileType: string, 
  fileName: string, 
  apiKey: string
): Promise<OCRResult> {
  const startTime = Date.now();
  
  console.log(`Primary OCR with ${fileName}, type: ${fileType}`);
  
  // Enhanced OCR Space API request with optimized settings
  const formData = new FormData();
  // Create a proper ArrayBuffer copy to avoid TypeScript SharedArrayBuffer issue
  const arrayBuffer = new Uint8Array(fileBuffer).buffer as ArrayBuffer;
  const blob = new Blob([arrayBuffer], { type: fileType });
  formData.append('file', blob, fileName);
  formData.append('apikey', apiKey);
  formData.append('language', 'eng');
  formData.append('isOverlayRequired', 'true'); // Get coordinate data
  formData.append('detectOrientation', 'true');
  formData.append('scale', 'true');
  formData.append('OCREngine', '2'); // Use advanced engine
  formData.append('isTable', 'true'); // Better table detection
  
  const response = await fetch('https://api.ocr.space/parse/image', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`OCR API error: ${response.statusText}`);
  }

  const result = await response.json();
  
  if (!result.ParsedResults || result.ParsedResults.length === 0) {
    throw new Error('No text extracted from primary OCR');
  }

  const parsedResult = result.ParsedResults[0];
  const confidence = calculateOCRConfidence(parsedResult);
  
  return {
    text: parsedResult.ParsedText || '',
    confidence,
    method: 'primary',
    processingTime: Date.now() - startTime,
    metadata: {
      textOverlay: parsedResult.TextOverlay,
      orientation: parsedResult.TextOrientation,
      fileParseExitCode: parsedResult.FileParseExitCode
    }
  };
}

async function fallbackOCR(fileBuffer: Uint8Array, fileType: string): Promise<OCRResult> {
  const startTime = Date.now();
  
  console.log('Fallback OCR processing...', { fileType });
  
  try {
    // Handle DOCX files - they are ZIP archives containing XML
    if (fileType.includes('wordprocessingml') || fileType.includes('msword') || fileType.includes('docx')) {
      console.log('Detected DOCX file, extracting text from XML structure...');
      const docxText = await extractTextFromDocx(fileBuffer);
      
      if (docxText && docxText.length > 50) {
        return {
          text: docxText,
          confidence: 0.95, // DOCX extraction is highly reliable
          method: 'fallback',
          processingTime: Date.now() - startTime,
          metadata: {
            note: 'Text extracted from DOCX XML structure',
            extraction_method: 'docx_xml_parser'
          }
        };
      }
    }
    
    // Handle plain text files
    if (fileType.includes('text/plain') || fileType.includes('text/markdown')) {
      const textDecoder = new TextDecoder('utf-8');
      const plainText = textDecoder.decode(fileBuffer);
      
      if (plainText && plainText.length > 10) {
        return {
          text: plainText,
          confidence: 1.0,
          method: 'fallback',
          processingTime: Date.now() - startTime,
          metadata: {
            note: 'Plain text file read directly',
            extraction_method: 'text_decoder'
          }
        };
      }
    }
    
    // For other file types, return error instead of placeholder
    console.log('Unsupported file type for fallback OCR:', fileType);
    throw new Error(`Fallback OCR not available for file type: ${fileType}. Please use a PDF or image file.`);
    
  } catch (error) {
    console.error('Fallback OCR failed:', error);
    throw new Error('Fallback OCR processing failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
}

/**
 * Extract text content from DOCX files
 * DOCX files are ZIP archives containing XML files
 * The main content is in word/document.xml
 */
async function extractTextFromDocx(fileBuffer: Uint8Array): Promise<string> {
  try {
    // DOCX is a ZIP file - we need to find and parse the document.xml
    // The ZIP file format has local file headers followed by file data
    
    const zipData = fileBuffer;
    const textContent: string[] = [];
    
    // Find all local file headers in the ZIP
    let offset = 0;
    while (offset < zipData.length - 4) {
      // Look for local file header signature (0x04034b50)
      if (zipData[offset] === 0x50 && zipData[offset + 1] === 0x4B && 
          zipData[offset + 2] === 0x03 && zipData[offset + 3] === 0x04) {
        
        // Parse local file header
        const fileNameLength = zipData[offset + 26] | (zipData[offset + 27] << 8);
        const extraFieldLength = zipData[offset + 28] | (zipData[offset + 29] << 8);
        const compressedSize = zipData[offset + 18] | (zipData[offset + 19] << 8) | 
                              (zipData[offset + 20] << 16) | (zipData[offset + 21] << 24);
        const compressionMethod = zipData[offset + 8] | (zipData[offset + 9] << 8);
        
        const fileNameStart = offset + 30;
        const fileNameBytes = zipData.slice(fileNameStart, fileNameStart + fileNameLength);
        const fileName = new TextDecoder().decode(fileNameBytes);
        
        const dataStart = fileNameStart + fileNameLength + extraFieldLength;
        
        // We're interested in word/document.xml (main content)
        if (fileName === 'word/document.xml' && compressionMethod === 0) {
          // Uncompressed - read directly
          const xmlData = zipData.slice(dataStart, dataStart + compressedSize);
          const xmlString = new TextDecoder().decode(xmlData);
          const extractedText = extractTextFromXml(xmlString);
          if (extractedText) textContent.push(extractedText);
        } else if (fileName === 'word/document.xml' && compressionMethod === 8) {
          // Deflate compressed - use DecompressionStream
          try {
            const compressedData = zipData.slice(dataStart, dataStart + compressedSize);
            const decompressedData = await inflateData(compressedData);
            const xmlString = new TextDecoder().decode(decompressedData);
            const extractedText = extractTextFromXml(xmlString);
            if (extractedText) textContent.push(extractedText);
          } catch (decompressError) {
            console.error('Decompression failed for document.xml:', decompressError);
          }
        }
        
        // Move to next entry
        offset = dataStart + compressedSize;
      } else {
        offset++;
      }
    }
    
    const finalText = textContent.join('\n\n').trim();
    console.log(`Extracted ${finalText.length} characters from DOCX`);
    return finalText;
    
  } catch (error) {
    console.error('DOCX extraction error:', error);
    return '';
  }
}

/**
 * Inflate (decompress) deflate-compressed data
 */
async function inflateData(compressedData: Uint8Array): Promise<Uint8Array> {
  // Add zlib header for raw deflate data
  const zlibData = new Uint8Array(compressedData.length + 2);
  zlibData[0] = 0x78; // CMF
  zlibData[1] = 0x9C; // FLG
  zlibData.set(compressedData, 2);
  
  try {
    const ds = new DecompressionStream('deflate');
    const writer = ds.writable.getWriter();
    const reader = ds.readable.getReader();
    
    writer.write(new Uint8Array(compressedData.buffer.slice(compressedData.byteOffset, compressedData.byteOffset + compressedData.byteLength)));
    writer.close();
    
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    
    // Combine chunks
    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let position = 0;
    for (const chunk of chunks) {
      result.set(chunk, position);
      position += chunk.length;
    }
    
    return result;
  } catch (e) {
    console.error('Inflate failed:', e);
    throw e;
  }
}

/**
 * Extract text content from DOCX XML
 * Finds all <w:t> elements and extracts their text
 */
function extractTextFromXml(xmlString: string): string {
  const textParts: string[] = [];
  
  // Match all <w:t ...>text</w:t> elements
  const textRegex = /<w:t[^>]*>([^<]*)<\/w:t>/g;
  let match;
  
  while ((match = textRegex.exec(xmlString)) !== null) {
    if (match[1]) {
      textParts.push(match[1]);
    }
  }
  
  // Also handle paragraph breaks by looking for <w:p> elements
  // Replace </w:p> with newlines to preserve paragraph structure
  let structuredText = xmlString
    .replace(/<\/w:p>/g, '\n')
    .replace(/<w:br[^>]*\/>/g, '\n');
  
  // Now extract just the text
  const textOnlyRegex = /<w:t[^>]*>([^<]*)<\/w:t>/g;
  const structuredParts: string[] = [];
  let lastEnd = 0;
  
  while ((match = textOnlyRegex.exec(structuredText)) !== null) {
    // Check for newlines between last match and this one
    const between = structuredText.slice(lastEnd, match.index);
    if (between.includes('\n')) {
      structuredParts.push('\n');
    }
    structuredParts.push(match[1]);
    lastEnd = match.index + match[0].length;
  }
  
  const result = structuredParts.join('').replace(/\n{3,}/g, '\n\n').trim();
  return result || textParts.join(' ');
}

async function hybridOCR(primaryResult: OCRResult, fallbackResult: OCRResult): Promise<OCRResult> {
  const startTime = Date.now();
  
  console.log('Combining OCR results using hybrid approach...');
  
  // Advanced text comparison and combination logic
  const combinedText = await intelligentTextMerge(primaryResult.text, fallbackResult.text);
  const combinedConfidence = (primaryResult.confidence + fallbackResult.confidence) / 2;
  
  return {
    text: combinedText,
    confidence: Math.min(combinedConfidence, 0.95), // Cap confidence for hybrid results
    method: 'hybrid',
    processingTime: Date.now() - startTime,
    metadata: {
      primary_method: primaryResult.method,
      fallback_method: fallbackResult.method,
      combination_strategy: 'intelligent_merge'
    }
  };
}

async function intelligentTextMerge(text1: string, text2: string): Promise<string> {
  // Advanced text merging algorithm
  // In a real implementation, this would use NLP techniques to merge texts intelligently
  
  const lines1 = text1.split('\n').filter(line => line.trim());
  const lines2 = text2.split('\n').filter(line => line.trim());
  
  // Simple merge strategy - use longer text as base and fill gaps with shorter
  if (text1.length > text2.length) {
    return text1;
  } else {
    return text2;
  }
}

function calculateOCRConfidence(parsedResult: any): number {
  // Enhanced confidence calculation based on multiple factors
  let confidence = 0.5; // Base confidence
  
  // Factor in text length
  const textLength = parsedResult.ParsedText?.length || 0;
  if (textLength > 100) confidence += 0.2;
  if (textLength > 500) confidence += 0.1;
  
  // Factor in exit code
  if (parsedResult.FileParseExitCode === 1) confidence += 0.2;
  
  // Factor in text overlay data availability
  if (parsedResult.TextOverlay?.Lines?.length > 0) confidence += 0.1;
  
  // Factor in character variety (numbers, letters, punctuation)
  if (parsedResult.ParsedText) {
    const hasLetters = /[a-zA-Z]/.test(parsedResult.ParsedText);
    const hasNumbers = /[0-9]/.test(parsedResult.ParsedText);
    const hasPunctuation = /[^\w\s]/.test(parsedResult.ParsedText);
    
    if (hasLetters) confidence += 0.05;
    if (hasNumbers) confidence += 0.05;
    if (hasPunctuation) confidence += 0.05;
  }
  
  return Math.min(confidence, 1.0);
}

async function postProcessText(text: string, fileType: string): Promise<string> {
  let processedText = text;
  
  // Clean up common OCR errors
  processedText = processedText
    .replace(/[^\x20-\x7E\n\r\t]/g, '') // Remove non-printable characters
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/([a-z])([A-Z])/g, '$1 $2') // Fix missing spaces
    .replace(/(\d)([A-Za-z])/g, '$1 $2') // Separate numbers from letters
    .replace(/([A-Za-z])(\d)/g, '$1 $2')
    .trim();
  
  // Document-specific processing
  if (fileType.includes('pdf')) {
    // PDF-specific text cleanup
    processedText = processedText.replace(/\f/g, '\n'); // Form feed to newline
  }
  
  return processedText;
}

async function classifyDocument(text: string): Promise<string> {
  const lowerText = text.toLowerCase();
  
  // Enhanced document classification
  const patterns = {
    syllabus: [
      'syllabus', 'course outline', 'assignments', 'grading', 'office hours',
      'textbook', 'learning objectives', 'course description', 'prerequisites'
    ],
    schedule: [
      'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
      'time', 'room', 'building', 'lecture', 'lab', 'seminar', 'class schedule'
    ],
    timetable: [
      'timetable', 'time table', '9:00', '10:00', '11:00', 'am', 'pm',
      'period', 'block', 'slot'
    ],
    calendar: [
      'january', 'february', 'march', 'april', 'may', 'june',
      'july', 'august', 'september', 'october', 'november', 'december',
      'deadline', 'due date', 'exam date'
    ]
  };
  
  const scores = Object.entries(patterns).map(([type, keywords]) => {
    const score = keywords.reduce((acc, keyword) => {
      const regex = new RegExp(keyword, 'gi');
      const matches = (text.match(regex) || []).length;
      return acc + matches;
    }, 0);
    return { type, score };
  });
  
  const bestMatch = scores.sort((a, b) => b.score - a.score)[0];
  return bestMatch.score > 0 ? bestMatch.type : 'unknown';
}

async function extractMetadata(text: string, documentType: string, fileType: string): Promise<any> {
  const metadata: any = {
    document_type: documentType,
    file_type: fileType,
    text_length: text.length,
    word_count: text.split(/\s+/).filter(word => word.length > 0).length,
    line_count: text.split('\n').length
  };
  
  // Extract dates
  const dateRegex = /\b\d{1,2}[-/]\d{1,2}[-/]\d{2,4}\b/g;
  const dates = text.match(dateRegex) || [];
  if (dates.length > 0) {
    metadata.dates_found = dates;
  }
  
  // Extract times
  const timeRegex = /\b\d{1,2}:\d{2}\s?(AM|PM|am|pm)?\b/g;
  const times = text.match(timeRegex) || [];
  if (times.length > 0) {
    metadata.times_found = times;
  }
  
  // Extract course codes
  const courseCodeRegex = /\b[A-Z]{2,4}\s?\d{3,4}\b/g;
  const courseCodes = text.match(courseCodeRegex) || [];
  if (courseCodes.length > 0) {
    metadata.course_codes_found = courseCodes;
  }
  
  // Extract room numbers
  const roomRegex = /\b(Room|Rm|R)\s?[A-Z]?\d{2,4}[A-Z]?\b/gi;
  const rooms = text.match(roomRegex) || [];
  if (rooms.length > 0) {
    metadata.rooms_found = rooms;
  }
  
  return metadata;
}

function calculateQualityScore(ocrResult: OCRResult, processedText: string, documentType: string): number {
  let score = ocrResult.confidence * 0.4; // Base confidence weight
  
  // Text quality factors
  const textLength = processedText.length;
  if (textLength > 100) score += 0.1;
  if (textLength > 500) score += 0.1;
  if (textLength > 1000) score += 0.1;
  
  // Document classification confidence
  if (documentType !== 'unknown') score += 0.15;
  
  // Processing method bonus
  if (ocrResult.method === 'primary') score += 0.1;
  else if (ocrResult.method === 'hybrid') score += 0.05;
  
  // Processing time penalty (slower = lower quality)
  if (ocrResult.processingTime > 10000) score -= 0.05;
  
  return Math.min(Math.max(score, 0), 1);
}