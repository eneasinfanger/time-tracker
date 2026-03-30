import { inject, Injectable } from '@angular/core';
import { collection, collectionData, deleteDoc, doc, docData, Firestore, orderBy, query, setDoc, where, writeBatch } from '@angular/fire/firestore';
import { firstValueFrom, Observable } from "rxjs";
import { Activity, ISODate, Settings } from "../utils/models";
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root',
})
export class SyncService {
  private readonly USERS_COLLECTION = 'users';
  private readonly SETTINGS_COLLECTION = 'settings';
  private readonly SETTINGS_DOC_ID = 'settings';
  private readonly APP_DATA_COLLECTION = 'appData';

  private readonly firestore = inject(Firestore);
  private readonly auth = inject(AuthService);

  private get uid(): string {
    const user = this.auth.currentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }
    return user.uid;
  }

  private settingsDoc() {
    return doc(this.firestore, `${this.USERS_COLLECTION}/${this.uid}/${this.SETTINGS_COLLECTION}/${this.SETTINGS_DOC_ID}`);
  }

  private appDataCollection() {
    return collection(this.firestore, `${this.USERS_COLLECTION}/${this.uid}/${this.APP_DATA_COLLECTION}`);
  }

  async saveSettings(settings: Settings): Promise<void> {
    try {
      return await setDoc(this.settingsDoc(), settings, { merge: true });
    } catch (err: unknown) {
      this.handlePermissionError(err);
      throw err;
    }
  }

  async getSettings(): Promise<Settings | undefined> {
    try {
      return await firstValueFrom(
        docData(this.settingsDoc()) as Observable<Settings | undefined>
      );
    } catch (err: unknown) {
      this.handlePermissionError(err);
      throw err;
    }
  }

  async getActivitiesForDay(targetDay: ISODate): Promise<Activity[]> {
    const q = query(
      this.appDataCollection(),
      where('date', '==', targetDay),
      orderBy('date', 'asc'),
    );

    try {
      return await firstValueFrom(
        collectionData(q, { idField: 'id' }) as Observable<Activity[]>
      );
    } catch (err: unknown) {
      this.handlePermissionError(err);
      throw err;
    }
  }

  async getActivitiesBetween(startDate: ISODate, endDate: ISODate): Promise<Activity[]> {
    const q = query(
      this.appDataCollection(),
      where('date', '>=', startDate),
      where('date', '<=', endDate),
      orderBy('date', 'asc'),
    );

    try {
      return await firstValueFrom(
        collectionData(q, { idField: 'id' }) as Observable<Activity[]>
      );
    } catch (err: unknown) {
      this.handlePermissionError(err);
      throw err;
    }
  }

  async saveActivities(activities: Activity[]): Promise<void> {
    const batch = writeBatch(this.firestore);
    activities.forEach(activity => {
      if (this.isNotEmpty(activity)) {
        const ref = doc(
          this.firestore,
          `${this.USERS_COLLECTION}/${this.uid}/${this.APP_DATA_COLLECTION}/${activity.id}`
        );
        batch.set(ref, activity, { merge: true });
      }
    });
    try {
      await batch.commit();
    } catch (err: unknown) {
      this.handlePermissionError(err);
      throw err;
    }
  }

  deleteActivity(id: string): Promise<void> {
    const ref = doc(
      this.firestore,
      `${this.USERS_COLLECTION}/${this.uid}/${this.APP_DATA_COLLECTION}/${id}`
    );
    return deleteDoc(ref).catch(err => {
      this.handlePermissionError(err);
      throw err;
    });
  }

  private handlePermissionError(err: unknown) {
    try {
      const anyErr = err as { code?: string; message?: string };
      const code = anyErr.code ?? '';
      if (typeof code === 'string' && code.includes('permission-denied')) {
        this.auth.setAccessDenied(true);
      }
    } catch (e) {
      // ignore
    }
  }

  private isNotEmpty(activity: Activity) {
    return Boolean(
      activity.startTime ||
      activity.endTime ||
      activity.description ||
      activity.task
    );
  }
}
