import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Pipe({
    name: 'linkify',
    standalone: true
})
export class LinkifyPipe implements PipeTransform {

    constructor(private sanitizer: DomSanitizer) { }

    transform(text: string | null | undefined): SafeHtml {
        if (!text) {
            return '';
        }

        // Pattern to match URLs
        const urlPattern = /(https?:\/\/[^\s]+)/g;

        // Replace URLs with anchor tags
        // Add target="_blank" and rel="noopener noreferrer" for security
        const result = text.replace(urlPattern, '<a href="$1" target="_blank" rel="noopener noreferrer" class="linkified">$1</a>');

        // Trust the HTML (since we control the replacement and want to render it as HTML)
        return this.sanitizer.bypassSecurityTrustHtml(result);
    }
}
