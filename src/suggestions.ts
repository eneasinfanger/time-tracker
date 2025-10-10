import {StorageManager} from "./storage.js";
import { getApp } from './main';
import { FormattedDate, Time } from './types';

export const Suggestions = {
    getActivitySuggestions,
    getTimeSuggestions,
    createSuggestionDropdown,
}

function getActivitySuggestions(input: string) {
    let lastWeek = new Date(getApp().currentDate);
    lastWeek.setDate(lastWeek.getDate() - 7);
    const allActivities = StorageManager.getPastActivities(getApp().formatDate(lastWeek), getApp().currentDateString);
    const uniqueDescriptions = [...new Set(allActivities
        .filter(activity => activity.type === 'activity' && activity.description)
        .map(activity => activity.description)
    )];

    if (!input) return uniqueDescriptions;

    return uniqueDescriptions.filter(description =>
        description.toLowerCase().includes(input.toLowerCase())
    );
}

function getTimeSuggestions(date: FormattedDate): Time[] {
    const endTime = StorageManager.getLastEndTime(date);
    return endTime ? [endTime] : [];
}

function createSuggestionDropdown(input: HTMLInputElement, suggestions: string[], onSelect: (selection: string) => void) {
    // Remove existing dropdown
    const existingDropdown = document.querySelector('.suggestion-dropdown');
    if (existingDropdown) {
        existingDropdown.remove();
    }

    if (!suggestions || suggestions.length === 0) return;

    const dropdown = document.createElement('div');
    dropdown.className = 'suggestion-dropdown absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg mt-1 max-h-40 overflow-y-auto';

    suggestions.forEach(suggestion => {
        const item = document.createElement('div');
        item.className = 'px-3 py-2 hover:bg-gray-100 cursor-pointer';
        item.textContent = suggestion;
        item.addEventListener('click', () => {
            onSelect(suggestion);
            dropdown.remove();
        });
        dropdown.appendChild(item);
    });

    // Position the dropdown
    const container = input.parentElement;
    if (container) {
        container.style.position = 'relative';
        container.appendChild(dropdown);
    } else {
        input.appendChild(dropdown);
    }

    // Close dropdown when clicking outside
    const closeDropdown = (e: MouseEvent) => {
        if (!dropdown.contains(e.target as Node) && e.target !== input) {
            dropdown.remove();
            document.removeEventListener('click', closeDropdown);
        }
    };
    document.addEventListener('click', closeDropdown);

    return dropdown;
}