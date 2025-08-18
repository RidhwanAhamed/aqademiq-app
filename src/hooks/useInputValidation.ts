import { useState } from 'react';
import { z } from 'zod';

/**
 * Input validation hook with XSS protection and sanitization
 */
export function useInputValidation<T extends z.ZodRawShape>(schema: z.ZodObject<T>) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  // HTML entity encoding for XSS protection
  const encodeHTML = (str: string): string => {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  };

  // Sanitize input by removing potentially dangerous characters
  const sanitizeInput = (value: unknown): unknown => {
    if (typeof value === 'string') {
      // Remove script tags and dangerous patterns
      const cleaned = value
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
        .replace(/data:\s*text\/html/gi, '');
      
      return encodeHTML(cleaned);
    }
    
    if (Array.isArray(value)) {
      return value.map(sanitizeInput);
    }
    
    if (typeof value === 'object' && value !== null) {
      const sanitized: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(value)) {
        sanitized[key] = sanitizeInput(val);
      }
      return sanitized;
    }
    
    return value;
  };

  const validate = (data: unknown): { success: boolean; data?: z.infer<typeof schema>; errors?: Record<string, string> } => {
    try {
      // Sanitize input before validation
      const sanitizedData = sanitizeInput(data);
      
      // Validate with Zod schema
      const result = schema.parse(sanitizedData);
      
      setErrors({});
      return { success: true, data: result };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        
        error.errors.forEach((err) => {
          const path = err.path.join('.');
          fieldErrors[path] = err.message;
        });
        
        setErrors(fieldErrors);
        return { success: false, errors: fieldErrors };
      }
      
      const generalError = { general: 'Validation failed' };
      setErrors(generalError);
      return { success: false, errors: generalError };
    }
  };

  const clearErrors = () => setErrors({});

  const getFieldError = (field: string): string | undefined => errors[field];

  return {
    validate,
    errors,
    clearErrors,
    getFieldError,
    sanitizeInput,
    encodeHTML
  };
}