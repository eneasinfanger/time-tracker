import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type IconName =
  | 'calendar'
  | 'chart'
  | 'clock'
  | 'close'
  | 'comment'
  | 'chevron-down'
  | 'chevron-up'
  | 'eye'
  | 'eye-off'
  | 'menu'
  | 'moon'
  | 'minus'
  | 'plus'
  | 'refresh'
  | 'spinner'
  | 'sun'
  | 'timer'
  | 'users';

@Component({
  selector: 'app-icon',
  standalone: true,
  template: `
    <svg
      aria-hidden="true"
      focusable="false"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="block shrink-0"
      style="overflow: visible;"
    >
      @switch (name()) {
        @case ('calendar') {
          <rect x="3.5" y="5.5" width="17" height="15" rx="2.5"></rect>
          <path d="M7 3.5v4M17 3.5v4M3.5 10.5h17"></path>
          <path d="M8 14h1M12 14h1M16 14h1M8 17h1M12 17h1"></path>
        }
        @case ('chart') {
          <path d="M4 19.5h16.5"></path>
          <path d="M6.5 16.5V11"></path>
          <path d="M11.5 16.5V7.5"></path>
          <path d="M16.5 16.5V13"></path>
        }
        @case ('clock') {
          <circle cx="12" cy="12" r="8.5"></circle>
          <path d="M12 7.5V12l3 2"></path>
        }
        @case ('close') {
          <path d="M6.5 6.5 17.5 17.5"></path>
          <path d="M17.5 6.5 6.5 17.5"></path>
        }
        @case ('comment') {
          <path d="M6.5 6.5h11a3 3 0 0 1 3 3v4a3 3 0 0 1-3 3h-5l-4.5 3v-3H6.5a3 3 0 0 1-3-3v-4a3 3 0 0 1 3-3Z"></path>
        }
        @case ('chevron-down') {
          <path d="m6.5 9 5.5 5.5L17.5 9"></path>
        }
        @case ('chevron-up') {
          <path d="m6.5 15 5.5-5.5L17.5 15"></path>
        }
        @case ('eye') {
          <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"></path>
          <circle cx="12" cy="12" r="2.5"></circle>
        }
        @case ('eye-off') {
          <path d="M3.5 4.5 20.5 19.5"></path>
          <path d="M10 6.3A11.1 11.1 0 0 1 12 6c6 0 9.5 6 9.5 6a17.4 17.4 0 0 1-3.1 4.1"></path>
          <path d="M8.1 8.1A14.3 14.3 0 0 0 2.5 12s3.5 6 9.5 6a11.2 11.2 0 0 0 3.7-.6"></path>
          <path d="M9.8 9.8A2.5 2.5 0 0 0 12 15a2.4 2.4 0 0 0 1.9-.9"></path>
        }
        @case ('menu') {
          <path d="M4.5 7.5h15"></path>
          <path d="M4.5 12h15"></path>
          <path d="M4.5 16.5h15"></path>
        }
        @case ('moon') {
          <path d="M18.5 15.2A8.2 8.2 0 1 1 8.8 5.5 6.5 6.5 0 0 0 18.5 15.2Z"></path>
        }
        @case ('minus') {
          <path d="M6.5 12h11"></path>
        }
        @case ('plus') {
          <path d="M12 6.5v11"></path>
          <path d="M6.5 12h11"></path>
        }
        @case ('refresh') {
          <path d="M20 7.5v4.5h-4.5"></path>
          <path d="M19.2 13.5a7 7 0 1 1-2.2-5.1"></path>
        }
        @case ('spinner') {
          <circle cx="12" cy="12" r="8.5" opacity="0.2"></circle>
          <path d="M12 3.5a8.5 8.5 0 0 1 8.5 8.5"></path>
        }
        @case ('sun') {
          <circle cx="12" cy="12" r="3.5"></circle>
          <path d="M12 2.8v2.4M12 18.8v2.4M4.9 4.9l1.7 1.7M17.4 17.4l1.7 1.7M2.8 12h2.4M18.8 12h2.4M4.9 19.1l1.7-1.7M17.4 6.6l1.7-1.7"></path>
        }
        @case ('timer') {
          <path d="M9.5 3.5h5"></path>
          <path d="M10.8 1.8h2.4"></path>
          <circle cx="12" cy="13" r="7"></circle>
          <path d="M12 9.5V13l2.5 1.5"></path>
        }
        @case ('users') {
          <path d="M7.5 10.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"></path>
          <path d="M16.5 10a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"></path>
          <path d="M3.8 19a5 5 0 0 1 7.4-3.6"></path>
          <path d="M13.2 19a4.2 4.2 0 0 1 6.4-3"></path>
        }
      }
    </svg>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'inline-flex shrink-0 items-center justify-center',
    style: 'display:inline-flex;align-items:center;justify-content:center;line-height:0;vertical-align:middle;',
  },
})
export class IconComponent {
  readonly name = input.required<IconName>();
}