import { inject, Injectable } from '@angular/core';
import { Firestore, collection, collectionData, doc, docData, setDoc, deleteDoc, query, where, orderBy, writeBatch } from '@angular/fire/firestore';
import { firstValueFrom, Observable } from "rxjs";
import { Activity, ISODate, Settings } from "../utils/models";

@Injectable({
  providedIn: 'root',
})
export class SyncService {
  private readonly dataCollection = 'timetracker_data';
  private readonly settingsCollection = 'timetracker_settings';
  private readonly settingsDocId = 'settings';
  private readonly firestore = inject(Firestore);

  saveSettings(settings: Settings): Promise<void> {
    const ref = doc(this.firestore, this.settingsCollection, this.settingsDocId);
    return setDoc(ref, settings, { merge: true });
  }

  getSettings(): Promise<Settings | undefined> {
    const ref = doc(this.firestore, this.settingsCollection, this.settingsDocId);
    return firstValueFrom(docData(ref) as Observable<Settings | undefined>);
  }

  getActivitiesForDay(targetDay: ISODate): Promise<Activity[]> {
    const aufgabenCollection = collection(this.firestore, this.dataCollection);
    const q = query(
      aufgabenCollection,
      where('date', '==', targetDay),
      orderBy('date', 'asc'),
    );
    return firstValueFrom(collectionData(q, { idField: 'id' }) as Observable<Activity[]>);
  }

  getActivitiesBetween(startDate: ISODate, endDate: ISODate): Promise<Activity[]> {
    const aufgabenCollection = collection(this.firestore, this.dataCollection);
    const q = query(
      aufgabenCollection,
      where('date', '>=', startDate),
      where('date', '<=', endDate),
      orderBy('date', 'asc'),
    );
    return firstValueFrom(collectionData(q, { idField: 'id' }) as Observable<Activity[]>);
  }

  async saveActivities(activities: Activity[]): Promise<void> {
    const batch = writeBatch(this.firestore);
    activities.forEach(activity => {
      if (this.isNotEmpty(activity)) {
        const ref = doc(this.firestore, `${ this.dataCollection }/${ activity.id }`);
        batch.set(ref, activity, { merge: true });
      }
    });
    await batch.commit();
  }

  private isNotEmpty(activity: Activity) {
    return Boolean(activity.startTime || activity.endTime || activity.description || activity.task);
  }

  deleteActivity(id: string): Promise<void> {
    const ref = doc(this.firestore, this.dataCollection, id);
    return deleteDoc(ref);
  }
}
