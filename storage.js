class StorageManager {
    static getStorageKey(date) {
        return `timetracker_${date}`;
    }

    static saveActivitiesForDate(date, activities) {
        const key = this.getStorageKey(date);
        localStorage.setItem(key, JSON.stringify(activities));
    }

    static getActivitiesForDate(date) {
        const key = this.getStorageKey(date);
        const stored = localStorage.getItem(key);
        return stored ? JSON.parse(stored) : null;
    }

    static getAllStoredDates() {
        const dates = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('timetracker_')) {
                dates.push(key.replace('timetracker_', ''));
            }
        }
        return dates;
    }

    static getAllActivities() {
        const allActivities = [];
        const dates = this.getAllStoredDates();
        
        dates.forEach(date => {
            const activities = this.getActivitiesForDate(date);
            if (activities) {
                allActivities.push(...activities);
            }
        });
        
        return allActivities;
    }

    static getLastEndTime(date) {
        const activities = this.getActivitiesForDate(date) || [];
        const timedActivities = activities.filter(activity => 
            activity.type === 'activity' && activity.endTime
        );
        
        if (timedActivities.length === 0) return '';
        
        // Find the activity with the latest end time
        return timedActivities
            .sort((a, b) => a.endTime.localeCompare(b.endTime))
            .pop().endTime;
    }
}