/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    locale: import('./lib/data').Locale;
    langPrefix: string;
  }
}
