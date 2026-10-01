import { Pipe, PipeTransform } from '@angular/core';

/** Turns API slugs into labels: "mr-mime" → "Mr Mime", "special-attack" → "Special Attack". */
@Pipe({ name: 'displayName' })
export class DisplayNamePipe implements PipeTransform {
  transform(slug: string | null | undefined): string {
    if (!slug) return '';
    return slug
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}
