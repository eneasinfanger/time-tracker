class DOMUtils {
    static renderActivities(activities) {
        const tbody = document.getElementById('activitiesTable');
        tbody.innerHTML = '';

        activities.forEach((activity, index) => {
            const row = this.createActivityRow(activity, index);
            tbody.appendChild(row);
        });
    }

    static createActivityRow(activity, index) {
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

        this.attachRowEventListeners(row, index);
        return row;
    }

    static attachRowEventListeners(row, index) {
        const startTimeInput = row.querySelector('.start-time');
        const endTimeInput = row.querySelector('.end-time');
        const descriptionInput = row.querySelector('.description');
        const typeSelect = row.querySelector('.activity-type');
        const addButton = row.querySelector('.add-row');
        const removeButton = row.querySelector('.remove-row');


        [startTimeInput, endTimeInput, descriptionInput, typeSelect].forEach((item) => {
            item.addEventListener('blur', () => window.app.saveCurrentActivities());
        })

        // Start time suggestions
        let startTimeSuggestionTimeout;
        const startTimeSuggestionHandler = (e) => {
            clearTimeout(startTimeSuggestionTimeout);
            startTimeSuggestionTimeout = setTimeout(() => {
                const timeSuggestions = SuggestionManager.getTimeSuggestions(window.app.currentDateString);
                SuggestionManager.createSuggestionDropdown(
                    e.target,
                    timeSuggestions,
                    (selectedSuggestion) => {
                        console.log("suggestion selected", selectedSuggestion);
                        e.target.value = selectedSuggestion;
                    }
                );
            }, 300);
        }
        startTimeInput.addEventListener('input', startTimeSuggestionHandler);
        startTimeInput.addEventListener('focus', startTimeSuggestionHandler);

        // Description suggestions
        let suggestionTimeout;
        const suggestionHandler = (e) => {
            clearTimeout(suggestionTimeout);
            suggestionTimeout = setTimeout(() => {
                SuggestionManager.createSuggestionDropdown(
                    e.target,
                    SuggestionManager.getActivitySuggestions(e.target.value),
                    (selectedSuggestion) => {
                        e.target.value = selectedSuggestion;
                    }
                );
            }, 300);
        }
        descriptionInput.addEventListener('input', suggestionHandler);
        descriptionInput.addEventListener('focus', suggestionHandler);

        // Type change handler
        typeSelect.addEventListener('change', (e) => {
            const isTextOnly = e.target.value === 'text';
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
            window.app.addNewActivity(index);
        });

        // Remove row button
        removeButton.addEventListener('click', () => {
            if (document.querySelectorAll('#activitiesTable tr').length > 1) {
                row.remove();
            }
        });
    }

    static collectActivitiesFromTable() {
        const activities = [];
        const rows = document.querySelectorAll('#activitiesTable tr');

        rows.forEach(row => {
            const startTime = row.querySelector('.start-time').value;
            const endTime = row.querySelector('.end-time').value;
            const description = row.querySelector('.description').value;
            const type = row.querySelector('.activity-type').value;

            activities.push({
                startTime,
                endTime,
                description,
                type
            });
        });

        return activities;
    }
}