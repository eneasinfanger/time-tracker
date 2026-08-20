import json
from datetime import date, datetime, timedelta, time as time_obj
from pathlib import Path

from app import create_app, db
from app.models.activity import Activity
from app.models.user import User
from app.models.user_settings import UserSettings
from app.utils.user_settings_storage import parse_settings_payload, write_settings_to_row

TIMETRACKER_PREFIX = 'timetracker_'
SETTINGS_KEY = f'{TIMETRACKER_PREFIX}settings'


def _prompt_json_file() -> Path:
    while True:
        file_path = input('Path to JSON export file: ').strip()
        if not file_path:
            print('File path is required.')
            continue

        path = Path(file_path).expanduser()
        if not path.exists():
            print(f'File does not exist: {path}')
            continue
        if not path.is_file():
            print(f'Not a file: {path}')
            continue
        return path


def _load_json_payload(path: Path) -> dict:
    try:
        with path.open('r', encoding='utf-8') as file:
            payload = json.load(file)
    except json.JSONDecodeError as exc:
        raise ValueError(f'Invalid JSON file: {exc}') from exc

    if not isinstance(payload, dict):
        raise ValueError('JSON root must be an object.')
    return payload


def _select_user() -> User:
    users = User.query.order_by(User.id.asc()).all()
    if not users:
        raise ValueError('No users found. Create a user first (e.g. with `python main.py create-admin`).')

    if len(users) == 1:
        user = users[0]
        print(f'Using only available user: #{user.id} ({user.username})')
        return user

    print('Available users:')
    for user in users:
        print(f'  {user.id}: {user.username} ({user.email})')

    allowed_ids = {user.id for user in users}
    while True:
        selected = input('User ID to import data into: ').strip()
        try:
            user_id = int(selected)
        except ValueError:
            print('Please enter a numeric user ID.')
            continue

        if user_id not in allowed_ids:
            print(f'Unknown user ID: {user_id}')
            continue

        return next(user for user in users if user.id == user_id)


def _parse_activity_date_key(key: str) -> date | None:
    if not key.startswith(TIMETRACKER_PREFIX) or key == SETTINGS_KEY:
        return None

    date_part = key[len(TIMETRACKER_PREFIX):]
    try:
        return datetime.strptime(date_part, '%Y-%m-%d').date()
    except ValueError:
        return None


def _parse_time(activity_date: date, time_value: str) -> datetime | None:
    if not time_value:
        return None
    try:
        parsed_time = datetime.strptime(time_value, '%H:%M').time()
    except ValueError:
        return None
    return datetime.combine(activity_date, parsed_time)


def _to_activity_rows(payload: dict) -> list[tuple[date, dict]]:
    rows: list[tuple[date, dict]] = []
    for key, raw_activities in payload.items():
        activity_date = _parse_activity_date_key(str(key))
        if not activity_date:
            continue

        if isinstance(raw_activities, str):
            try:
                raw_activities = json.loads(raw_activities)
            except json.JSONDecodeError:
                continue

        if not isinstance(raw_activities, list):
            continue

        for item in raw_activities:
            if isinstance(item, dict):
                rows.append((activity_date, item))
    return rows


def _replace_day_activities_for_user(user: User, activity_date: date, items: list[dict]) -> tuple[int, int]:
    start_day = datetime.combine(activity_date, time_obj.min)
    end_day = start_day + timedelta(days=1)
    existing = Activity.query.filter(
        Activity.user_id == user.id,
        Activity.start_time >= start_day,
        Activity.start_time < end_day,
    ).all()
    for activity in existing:
        db.session.delete(activity)

    imported = 0
    skipped = 0
    for item in items:
        start_time = _parse_time(activity_date, str(item.get('startTime', '')).strip())
        end_time = _parse_time(activity_date, str(item.get('endTime', '')).strip())
        activity_type = str(item.get('type', 'activity')).strip() or 'activity'
        description = str(item.get('description', '')).strip()
        task = str(item.get('task', '')).strip()

        if activity_type not in ('activity', 'text'):
            activity_type = 'activity'

        if not any([start_time, end_time, description, task]):
            skipped += 1
            continue

        if start_time is None:
            if activity_type == 'text':
                start_time = start_day
            else:
                skipped += 1
                continue

        duration_minutes = 0
        if end_time is not None:
            if end_time < start_time:
                end_time += timedelta(days=1)
            duration_minutes = int((end_time - start_time).total_seconds() / 60)

        record = Activity(
            user_id=user.id,
            task_name=task or description or 'Activity',
            description=description,
            category=activity_type,
            start_time=start_time,
            end_time=end_time,
            duration_minutes=max(0, duration_minutes),
            is_completed=end_time is not None,
        )
        db.session.add(record)
        imported += 1

    return imported, skipped


def _import_activities(user: User, payload: dict) -> tuple[int, int, int]:
    grouped_by_date: dict[date, list[dict]] = {}
    for activity_date, item in _to_activity_rows(payload):
        grouped_by_date.setdefault(activity_date, []).append(item)

    imported_total = 0
    skipped_total = 0
    for activity_date, items in grouped_by_date.items():
        imported, skipped = _replace_day_activities_for_user(user, activity_date, items)
        imported_total += imported
        skipped_total += skipped

    return imported_total, skipped_total, len(grouped_by_date)


def _import_settings(user: User, payload: dict) -> bool:
    if SETTINGS_KEY not in payload:
        return False

    imported_settings_payload = payload.get(SETTINGS_KEY)
    if isinstance(imported_settings_payload, str):
        try:
            imported_settings_payload = json.loads(imported_settings_payload)
        except json.JSONDecodeError:
            imported_settings_payload = {}

    settings_data = parse_settings_payload(imported_settings_payload)
    existing = UserSettings.query.filter_by(user_id=user.id).first()
    if existing:
        write_settings_to_row(existing, settings_data)
    else:
        settings_row = UserSettings(user_id=user.id)
        db.session.add(settings_row)
        db.session.flush()
        write_settings_to_row(settings_row, settings_data)

    return True


def main():
    app = create_app()
    with app.app_context():
        try:
            file_path = _prompt_json_file()
            payload = _load_json_payload(file_path)
            user = _select_user()

            imported_activities, skipped_activities, imported_days = _import_activities(user, payload)
            has_settings = _import_settings(user, payload)

            db.session.commit()
            print(
                f'Import successful for user #{user.id} ({user.username}). '
                f'Days: {imported_days}, activities: {imported_activities}, skipped: {skipped_activities}, '
                f'settings imported: {"yes" if has_settings else "no"}.'
            )
        except Exception as exc:
            db.session.rollback()
            print(f'Import failed: {exc}')
            raise SystemExit(1) from exc


if __name__ == '__main__':
    main()
