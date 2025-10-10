import {TimeCalculator} from "./time-calculator.js";
import {DomUtils} from "./dom-utils.js";
import {StorageManager} from "./storage.js";
import { Activity, ActivitySummary, FormattedDate, Time } from './types';

class TimeTrackerApp {
    currentDate: Date;
    currentDateString: FormattedDate;

    constructor() {
        this.currentDate = new Date();
        this.currentDateString = this.formatDate(this.currentDate);

        this.initializeEventListeners();
        this.updateDateDisplay();
        this.loadActivitiesForCurrentDay();
    }

    formatDate(date: Date): FormattedDate {
        return date.toISOString().split('T')[0] as FormattedDate;
    }

    formatDateDisplay(date: Date): string {
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    initializeEventListeners() {
        document.querySelector<HTMLButtonElement>('#prevDay')!.addEventListener('click', () => this.navigateDay(-1));
        document.querySelector<HTMLButtonElement>('#nextDay')!.addEventListener('click', () => this.navigateDay(1));
        document.querySelector<HTMLButtonElement>('#addActivity')!.addEventListener('click', () => this.addNewActivity());
        document.querySelector<HTMLButtonElement>('#calculateTime')!.addEventListener('click', () => this.calculateAndShowSummary());
    }

    navigateDay(direction: number) {
        this.saveCurrentActivities();

        this.currentDate.setDate(this.currentDate.getDate() + direction);
        this.currentDateString = this.formatDate(this.currentDate);

        this.updateDateDisplay();
        this.loadActivitiesForCurrentDay();
        this.hideSummary();
    }

    updateDateDisplay() {
        document.querySelector<HTMLDivElement>('#currentDate')!.textContent = this.formatDateDisplay(this.currentDate);
    }

    loadActivitiesForCurrentDay() {
        const activities = StorageManager.getActivitiesForDate(this.currentDateString) || [];
        DomUtils.renderActivities(activities);

        if (activities.length === 0) {
            this.addNewActivity();
        }
    }

    saveCurrentActivities() {
        const activities = DomUtils.collectActivitiesFromTable();
        StorageManager.saveActivitiesForDate(this.currentDateString, activities);
    }

    addNewActivity(insertAfterIndex = null) {
        const activities = DomUtils.collectActivitiesFromTable();

        const newActivity: Activity = {
            startTime: '' as Time,
            endTime: '' as Time,
            description: '',
            type: 'activity'
        };

        if (insertAfterIndex !== null) {
            activities.splice(insertAfterIndex + 1, 0, newActivity);
        } else {
            activities.push(newActivity);
        }

        DomUtils.renderActivities(activities);
    }

    calculateAndShowSummary() {
        this.saveCurrentActivities();
        const activities = StorageManager.getActivitiesForDate(this.currentDateString) || [];
        const summary = TimeCalculator.calculateTimePerActivity(activities);

        this.showSummary(summary);
    }

    showSummary(summary: ActivitySummary) {
        const summaryContainer = document.querySelector<HTMLDivElement>('#timeSummary')!;
        const summaryContent = document.querySelector<HTMLDivElement>('#summaryContent')!;
        const summaryDate = document.querySelector<HTMLSpanElement>('#summaryDate')!;

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
        document.querySelector<HTMLDivElement>('#timeSummary')!.classList.add('hidden');
    }
}

const w = window as any;
w.app = new TimeTrackerApp();
export const getApp = () => w.app;
