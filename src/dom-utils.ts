import {Suggestions} from "./suggestions.js";
import { getApp } from './main';
import { Activity, Time } from './types';

export const DomUtils = {
    renderActivities,
    collectActivitiesFromTable,
}

function renderActivities(activities: Activity[]) {
    const tbody = document.getElementById('activitiesTable')!;
    tbody.innerHTML = '';

    activities.forEach((activity, index) => {
        const row = createActivityRow(activity, index);
        tbody.appendChild(row);
    });
}

function createActivityRow(activity: Activity, index: number) {
    const row = document.createElement('tr');
    row.className = 'border-b border-gray-100 hover:bg-gray-50';

    row.innerHTML = `
            <td class="py-3 px-4">
                <input type="time" 
                       class="start-time w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${activity.type === 'text' ? 'bg-gray-100' : ''}" 
                       value="${activity.startTime || ''}"
                       ${activity.type === 'text' ? 'disabled' : ''}>
            </td>
            <td class="py-3 px-4">
                <input type="time" 
                       class="end-time w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${activity.type === 'text' ? 'bg-gray-100' : ''}" 
                       value="${activity.endTime || ''}"
                       ${activity.type === 'text' ? 'disabled' : ''}>
            </td>
            <td class="py-3 px-4 relative">
                <input type="text" 
                       class="description w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                       value="${activity.description || ''}"
                       placeholder="Enter activity or description...">
            </td>
            <td class="py-3 px-4">
                <select class="activity-type w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    <option value="activity" ${activity.type === 'activity' ? 'selected' : ''}>Timed Activity</option>
                    <option value="text" ${activity.type === 'text' ? 'selected' : ''}>Text Only</option>
                </select>
            </td>
            <td class="py-3 px-4">
                <div class="flex space-x-2">
                    <button class="add-row text-green-600 hover:text-green-700 text-sm font-medium" title="Add row below">
                        ＋
                    </button>
                    <button class="remove-row text-red-600 hover:text-red-700 text-sm font-medium" title="Remove row">
                        ✕
                    </button>
                </div>
            </td>
        `;

    attachRowEventListeners(row, index);
    return row;
}

function attachRowEventListeners(row: HTMLTableRowElement, index: number) {
    const startTimeInput = row.querySelector<HTMLInputElement>('.start-time')!;
    const endTimeInput = row.querySelector<HTMLInputElement>('.end-time')!;
    const descriptionInput = row.querySelector<HTMLInputElement>('.description')!;
    const typeSelect = row.querySelector<HTMLSelectElement>('.activity-type')!;
    const addButton = row.querySelector<HTMLButtonElement>('.add-row')!;
    const removeButton = row.querySelector<HTMLButtonElement>('.remove-row')!;


    [startTimeInput, endTimeInput, descriptionInput, typeSelect].forEach((item) => {
        item.addEventListener('blur', () => getApp().saveCurrentActivities());
    })

    // Start time suggestions
    let startTimeSuggestionTimeout: number;
    const startTimeSuggestionHandler = (e: Event) => {
        clearTimeout(startTimeSuggestionTimeout);
        startTimeSuggestionTimeout = setTimeout(() => {
            const timeSuggestions = Suggestions.getTimeSuggestions(getApp().currentDateString);
            Suggestions.createSuggestionDropdown(
                e.target as HTMLInputElement,
                timeSuggestions,
                (selectedSuggestion) => {
                    (e.target as HTMLInputElement).value = selectedSuggestion;
                }
            );
        }, 300);
    }
    startTimeInput.addEventListener('input', startTimeSuggestionHandler);
    startTimeInput.addEventListener('focus', startTimeSuggestionHandler);

    // Description suggestions
    let suggestionTimeout: number;
    const suggestionHandler = (e: Event) => {
        clearTimeout(suggestionTimeout);
        suggestionTimeout = setTimeout(() => {
            const activitySuggestions = Suggestions.getActivitySuggestions((e.target as HTMLInputElement).value);
            if (activitySuggestions.length > 1 || activitySuggestions.length === 1 && activitySuggestions[0] !== (e.target as HTMLInputElement).value) {
                Suggestions.createSuggestionDropdown(
                    e.target as HTMLInputElement,
                    activitySuggestions,
                    (selectedSuggestion) => {
                        (e.target as HTMLInputElement).value = selectedSuggestion;
                    }
                );
            }
        }, 300);
    }
    descriptionInput.addEventListener('input', suggestionHandler);
    descriptionInput.addEventListener('focus', suggestionHandler);

    // Type change handler
    typeSelect.addEventListener('change', (e) => {
        const isTextOnly = (e.target as HTMLInputElement).value === 'text';
        startTimeInput.disabled = isTextOnly;
        endTimeInput.disabled = isTextOnly;

        if (isTextOnly) {
            startTimeInput.classList.add('bg-gray-100');
            endTimeInput.classList.add('bg-gray-100');
            startTimeInput.value = '';
            endTimeInput.value = '';
        } else {
            startTimeInput.classList.remove('bg-gray-100');
            endTimeInput.classList.remove('bg-gray-100');
        }
    });

    // Add row button
    addButton.addEventListener('click', () => {
        getApp().addNewActivity(index);
    });

    // Remove row button
    removeButton.addEventListener('click', () => {
        if (document.querySelectorAll('#activitiesTable tr').length > 1) {
            row.remove();
        }
    });
}

function collectActivitiesFromTable(): Activity[] {
    const activities: Activity[] = [];
    const rows = document.querySelectorAll('#activitiesTable tr');

    rows.forEach(row => {
        const startTime = row.querySelector<HTMLInputElement>('.start-time')!.value;
        const endTime = row.querySelector<HTMLInputElement>('.end-time')!.value;
        const description = row.querySelector<HTMLInputElement>('.description')!.value;
        const type = row.querySelector<HTMLInputElement>('.activity-type')!.value;

        activities.push({
            startTime: startTime as Time,
            endTime: endTime as Time,
            description,
            type: type as Activity['type']
        });
    });

    return activities;
}
