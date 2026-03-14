import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatDate(value) {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export function truncateUrl(url, max = 50) {
  if (!url) return '';
  if (url.length <= max) return url;
  return `${url.slice(0, max)}...`;
}
