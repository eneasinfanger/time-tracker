window.Suggestions = {
    getActivitySuggestions,
    getTimeSuggestions,
    createSuggestionDropdown,
}

function getActivitySuggestions(input) {
    const allActivities = StorageManager.getAllActivities();
    const uniqueDescriptions = [...new Set(allActivities
        .filter(activity => activity.type === 'activity' && activity.description)
        .map(activity => activity.description)
    )];

    if (!input) return uniqueDescriptions;

    return uniqueDescriptions.filter(description =>
        description.toLowerCase().includes(input.toLowerCase())
    );
}

function getTimeSuggestions(date) {
    return [StorageManager.getLastEndTime(date)];
}

function createSuggestionDropdown(input, suggestions, onSelect) {
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
    const inputRect = input.getBoundingClientRect();
    const container = input.parentElement;
    container.style.position = 'relative';
    container.appendChild(dropdown);

    // Close dropdown when clicking outside
    const closeDropdown = (e) => {
        if (!dropdown.contains(e.target) && e.target !== input) {
            dropdown.remove();
            document.removeEventListener('click', closeDropdown);
        }
    };
    document.addEventListener('click', closeDropdown);

    return dropdown;
}