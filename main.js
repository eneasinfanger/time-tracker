class TimeTrackerApp {
    constructor() {
        this.currentDate = new Date();
        this.currentDateString = this.formatDate(this.currentDate);

        this.initializeEventListeners();
        this.updateDateDisplay();
        this.loadActivitiesForCurrentDay();
    }

    formatDate(date) {
        return date.toISOString().split('T')[0];
    }

    formatDateDisplay(date) {
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    initializeEventListeners() {
        document.getElementById('prevDay').addEventListener('click', () => this.navigateDay(-1));
        document.getElementById('nextDay').addEventListener('click', () => this.navigateDay(1));
        document.getElementById('addActivity').addEventListener('click', () => this.addNewActivity());
        document.getElementById('calculateTime').addEventListener('click', () => this.calculateAndShowSummary());
    }

    navigateDay(direction) {
        this.saveCurrentActivities();

        this.currentDate.setDate(this.currentDate.getDate() + direction);
        this.currentDateString = this.formatDate(this.currentDate);

        this.updateDateDisplay();
        this.loadActivitiesForCurrentDay();
        this.hideSummary();
    }

    updateDateDisplay() {
        document.getElementById('currentDate').textContent = this.formatDateDisplay(this.currentDate);
    }

    loadActivitiesForCurrentDay() {
        const activities = StorageManager.getActivitiesForDate(this.currentDateString) || [];
        DOMUtils.renderActivities(activities);

        if (activities.length === 0) {
            this.addNewActivity();
        }
    }

    saveCurrentActivities() {
        const activities = DOMUtils.collectActivitiesFromTable();
        StorageManager.saveActivitiesForDate(this.currentDateString, activities);
    }

    addNewActivity(insertAfterIndex = null) {
        const activities = DOMUtils.collectActivitiesFromTable();

        const newActivity = {
            startTime: '',
            endTime: '',
            description: '',
            type: 'activity'
        };

        if (insertAfterIndex !== null) {
            activities.splice(insertAfterIndex + 1, 0, newActivity);
        } else {
            activities.push(newActivity);
        }

        DOMUtils.renderActivities(activities);
    }

    calculateAndShowSummary() {
        this.saveCurrentActivities();
        const activities = StorageManager.getActivitiesForDate(this.currentDateString) || [];
        const summary = TimeCalculator.calculateTimePerActivity(activities);

        this.showSummary(summary);
    }

    showSummary(summary) {
        const summaryContainer = document.getElementById('timeSummary');
        const summaryContent = document.getElementById('summaryContent');
        const summaryDate = document.getElementById('summaryDate');

        summaryDate.textContent = this.formatDateDisplay(this.currentDate);

        if (Object.keys(summary).length === 0) {
            summaryContent.innerHTML = '<p class="text-gray-500">No timed activities found for this day.</p>';
        } else {
            summaryContent.innerHTML = Object.entries(summary)
                .sort((a, b) => a[0] > b[0] ? 1 : -1)
                .map(([activity, minutes]) => {
                    const hours = Math.floor(minutes / 60);
                    const mins = minutes % 60;
                    const timeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

                    return `
                        <div class="flex justify-between items-center py-2 px-4 bg-gray-50 rounded-lg">
                            <span class="font-medium text-gray-900">${activity}</span>
                            <span class="text-blue-600 font-semibold">${timeStr}</span>
                        </div>
                    `;
                })
                .join('');
        }

        summaryContainer.classList.remove('hidden');
    }

    hideSummary() {
        document.getElementById('timeSummary').classList.add('hidden');
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new TimeTrackerApp();
});