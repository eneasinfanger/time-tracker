export const StorageManager = {
    saveActivitiesForDate,
    getActivitiesForDate,
    getPastActivities,
    getLastEndTime,
}

function saveActivitiesForDate(date, activities) {
    const key = getStorageKey(date);
    const filtered = activities.filter(ac => ac.startTime || ac.endTime || ac.description);

    if (filtered.length) {
        localStorage.setItem(key, JSON.stringify(filtered));
    } else {
        localStorage.removeItem(key);
    }
}

function getActivitiesForDate(date) {
    const key = getStorageKey(date);
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : null;
}

const storagePrefix = 'timetracker_';

function getStorageKey(date) {
    return `${storagePrefix}${date}`;
}

function getPastActivities(fromDate, toDate) {
    const allActivities = [];
    const dates = getAllStoredDates(fromDate, toDate);

    dates.forEach(date => {
        const activities = getActivitiesForDate(date);
        if (activities) {
            allActivities.push(...activities);
        }
    });

    return allActivities;
}

function getAllStoredDates(fromDate, toDate) {
    const fromDateKey = getStorageKey(fromDate);
    const toDateKey = getStorageKey(toDate);
    const dates = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(storagePrefix) && key >= fromDateKey && key <= toDateKey) {
            dates.push(key.replace(storagePrefix, ''));
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
