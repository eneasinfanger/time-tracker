import { Activity, FormattedDate, Time } from './types';

export function saveActivitiesForDate(date: FormattedDate, activities: Activity[]) {
    const key = getStorageKey(date);
    const filtered = activities.filter(ac => ac.startTime || ac.endTime || ac.description);

    if (filtered.length) {
        localStorage.setItem(key, JSON.stringify(filtered));
    } else {
        localStorage.removeItem(key);
    }
}

export function getActivitiesForDate(date: FormattedDate): Activity[] | null {
    const key = getStorageKey(date);
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : null;
}

const storagePrefix = 'timetracker_';

function getStorageKey(date: FormattedDate) {
    return `${storagePrefix}${date}`;
}

export function getPastActivities(fromDate: FormattedDate, toDate: FormattedDate) {
    const allActivities: Activity[] = [];
    const dates = getAllStoredDates(fromDate, toDate);

    dates.forEach(date => {
        const activities = getActivitiesForDate(date);
        if (activities) {
            allActivities.push(...activities);
        }
    });

    return allActivities;
}

function getAllStoredDates(fromDate: FormattedDate, toDate: FormattedDate): FormattedDate[] {
    const fromDateKey = getStorageKey(fromDate);
    const toDateKey = getStorageKey(toDate);
    const dates: FormattedDate[] = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(storagePrefix) && key >= fromDateKey && key <= toDateKey) {
            dates.push(key.replace(storagePrefix, '') as FormattedDate);
        }
    }
    return dates;
}

export function getLastEndTime(date: FormattedDate): Time | undefined {
    const activities = getActivitiesForDate(date) || [];
    const timedActivities = activities.filter(activity =>
        activity.type === 'activity' && activity.endTime
    );

    if (timedActivities.length === 0) return;

    // Find the activity with the latest end time
    return timedActivities
        .sort((a, b) => a.endTime.localeCompare(b.endTime))
        .pop()?.endTime;
}
