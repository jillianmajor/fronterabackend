import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/** Escape user-controlled strings embedded in HTML email bodies. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Replace `{{key}}` placeholders in a template string. */
export function renderTemplate(template: string, variables: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => variables[key] ?? '');
}

export function loadTemplateFile(templatesDir: string, fileName: string): string {
  return readFileSync(join(templatesDir, fileName), 'utf8');
}
