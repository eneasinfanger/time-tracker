class TimeCalculator {
    static timeToMinutes(timeString) {
        if (!timeString) return 0;
        
        const [hours, minutes] = timeString.split(':').map(Number);
        return hours * 60 + minutes;
    }

    static calculateDuration(startTime, endTime) {
        if (!startTime || !endTime) return 0;
        
        const startMinutes = this.timeToMinutes(startTime);
        const endMinutes = this.timeToMinutes(endTime);
        
        // Handle case where end time is next day (e.g., 23:00 to 01:00)
        if (endMinutes < startMinutes) {
            return (24 * 60 - startMinutes) + endMinutes;
        }
        
        return endMinutes - startMinutes;
    }

    static calculateTimePerActivity(activities) {
        const activityTimes = {};
        
        activities.forEach(activity => {
            if (activity.type === 'activity' && activity.startTime && activity.endTime && activity.description) {
                const duration = this.calculateDuration(activity.startTime, activity.endTime);
                
                if (duration > 0) {
                    if (!activityTimes[activity.description]) {
                        activityTimes[activity.description] = 0;
                    }
                    activityTimes[activity.description] += duration;
                }
            }
        });
        
        return activityTimes;
    }
}