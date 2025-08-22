export const StorageManager = {
    saveActivitiesForDate,
    getActivitiesForDate,
    getAllActivities,
    getLastEndTime,
}

function saveActivitiesForDate(date, activities) {
    const key = getStorageKey(date);
    localStorage.setItem(key, JSON.stringify(activities));
}

function getActivitiesForDate(date) {
    const key = getStorageKey(date);
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : null;
}

function getStorageKey(date) {
    return `timetracker_${date}`;
}

function getAllActivities() {
    const allActivities = [];
    const dates = getAllStoredDates();

    dates.forEach(date => {
        const activities = getActivitiesForDate(date);
        if (activities) {
            allActivities.push(...activities);
        }
    });

    return allActivities;
}

function getAllStoredDates() {
    const dates = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('timetracker_')) {
            dates.push(key.replace('timetracker_', ''));
        }
    }
    return dates;
}

function getLastEndTime(date) {
    const activities = getActivitiesForDate(date) || [];
    const timedActivities = activities.filter(activity =>
        activity.type === 'activity' && activity.endTime
    );

    if (timedActivities.length === 0) return null;

    // Find the activity with the latest end time
    return timedActivities
        .sort((a, b) => a.endTime.localeCompare(b.endTime))
        .pop().endTime;
}
