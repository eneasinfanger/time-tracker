from dataclasses import dataclass, field

from app import db
from app.models.user_settings import (
    UserAlwaysShownActivity,
    UserIssueTrackerProject,
    UserIssueTrackerSource,
    UserSettings,
)


@dataclass(frozen=True)
class DurationThreshold:
    weeks: int = 1
    days: int = 0
    hours: int = 0
    minutes: int = 0


@dataclass(frozen=True)
class AlwaysShownActivityItem:
    identifier: str = ''
    description: str = ''
    task: str = ''


@dataclass(frozen=True)
class IssueTrackerSourceItem:
    name: str = ''
    url: str = ''
    projects: list[str] = field(default_factory=list)


@dataclass(frozen=True)
class UserSettingsData:
    always_shown_activities: list[AlwaysShownActivityItem] = field(default_factory=list)
    duration_threshold: DurationThreshold = field(default_factory=DurationThreshold)
    enable_tasks: bool = True
    theme: str = 'system'
    issue_tracker_sources: list[IssueTrackerSourceItem] = field(default_factory=list)

    def to_api_dict(self) -> dict:
        return {
            'alwaysShownActivities': [
                {
                    'id': item.identifier,
                    'description': item.description,
                    'task': item.task,
                }
                for item in self.always_shown_activities
            ],
            'durationThreshold': {
                'weeks': self.duration_threshold.weeks,
                'days': self.duration_threshold.days,
                'hours': self.duration_threshold.hours,
                'minutes': self.duration_threshold.minutes,
            },
            'enableTasks': self.enable_tasks,
            'theme': self.theme,
            'issueTrackerSources': [
                {
                    'name': source.name,
                    'url': source.url,
                    'projects': source.projects,
                }
                for source in self.issue_tracker_sources
            ],
        }


def _to_int(value, default: int) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def parse_settings_payload(payload: object) -> UserSettingsData:
    if not isinstance(payload, dict):
        return UserSettingsData()

    duration_payload = payload.get('durationThreshold')
    if not isinstance(duration_payload, dict):
        duration_payload = {}
    duration = DurationThreshold(
        weeks=_to_int(duration_payload.get('weeks', 1), 1),
        days=_to_int(duration_payload.get('days', 0), 0),
        hours=_to_int(duration_payload.get('hours', 0), 0),
        minutes=_to_int(duration_payload.get('minutes', 0), 0),
    )

    raw_theme = str(payload.get('theme', 'system')).strip() or 'system'
    theme = raw_theme if raw_theme in ('light', 'dark', 'system') else 'system'

    raw_activities = payload.get('alwaysShownActivities')
    if not isinstance(raw_activities, list):
        raw_activities = []
    activities: list[AlwaysShownActivityItem] = []
    for item in raw_activities:
        if not isinstance(item, dict):
            continue
        activities.append(AlwaysShownActivityItem(
            identifier=str(item.get('id', '')).strip(),
            description=str(item.get('description', '')).strip(),
            task=str(item.get('task', '')).strip(),
        ))

    raw_sources = payload.get('issueTrackerSources')
    if not isinstance(raw_sources, list):
        legacy_sources = payload.get('jiraSources')
        raw_sources = legacy_sources if isinstance(legacy_sources, list) else []
    sources: list[IssueTrackerSourceItem] = []
    for raw_source in raw_sources:
        if not isinstance(raw_source, dict):
            continue
        raw_projects = raw_source.get('projects')
        if not isinstance(raw_projects, list):
            raw_projects = []
        projects = [str(project).strip() for project in raw_projects]
        sources.append(IssueTrackerSourceItem(
            name=str(raw_source.get('name', '')).strip(),
            url=str(raw_source.get('url', '')).strip(),
            projects=projects,
        ))

    return UserSettingsData(
        always_shown_activities=activities,
        duration_threshold=duration,
        enable_tasks=bool(payload.get('enableTasks', True)),
        theme=theme,
        issue_tracker_sources=sources,
    )


def read_settings_from_row(settings_row: UserSettings | None) -> UserSettingsData:
    if not settings_row:
        return UserSettingsData()

    activities = [
        AlwaysShownActivityItem(
            identifier=activity.activity_uuid or '',
            description=activity.description or '',
            task=activity.task or '',
        )
        for activity in settings_row.always_shown_activities
    ]
    sources = [
        IssueTrackerSourceItem(
            name=source.name,
            url=source.url,
            projects=[project.project for project in source.projects],
        )
        for source in settings_row.issue_tracker_sources
    ]

    return UserSettingsData(
        always_shown_activities=activities,
        duration_threshold=DurationThreshold(
            weeks=settings_row.duration_weeks,
            days=settings_row.duration_days,
            hours=settings_row.duration_hours,
            minutes=settings_row.duration_minutes,
        ),
        enable_tasks=settings_row.enable_tasks,
        theme=settings_row.theme,
        issue_tracker_sources=sources,
    )


def write_settings_to_row(settings_row: UserSettings, settings_data: UserSettingsData) -> None:
    settings_row.enable_tasks = settings_data.enable_tasks
    settings_row.theme = settings_data.theme
    settings_row.duration_weeks = settings_data.duration_threshold.weeks
    settings_row.duration_days = settings_data.duration_threshold.days
    settings_row.duration_hours = settings_data.duration_threshold.hours
    settings_row.duration_minutes = settings_data.duration_threshold.minutes

    for activity in list(settings_row.always_shown_activities):
        db.session.delete(activity)
    for source in list(settings_row.issue_tracker_sources):
        db.session.delete(source)

    for index, item in enumerate(settings_data.always_shown_activities):
        db.session.add(UserAlwaysShownActivity(
            user_settings_id=settings_row.id,
            activity_uuid=item.identifier or None,
            description=item.description,
            task=item.task,
            position=index,
        ))

    for source_index, source in enumerate(settings_data.issue_tracker_sources):
        source_row = UserIssueTrackerSource(
            user_settings_id=settings_row.id,
            name=source.name,
            url=source.url,
            position=source_index,
        )
        db.session.add(source_row)
        db.session.flush()

        for project_index, project in enumerate(source.projects):
            db.session.add(UserIssueTrackerProject(
                source_id=source_row.id,
                project=project,
                position=project_index,
            ))
