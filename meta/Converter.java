import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

class Scratch {
    /*
        timetracker_2025-08-22 = \
        [
          {
            "startTime": "12:00",
            "endTime": "12:30",
            "description": "Mittag",
            "type": "activity"
          },
          {
            "startTime": "",
            "endTime": "",
            "description": "tesxt",
            "type": "text"
          }
        ]
    */

    private static Pattern DAY_PATTERN = Pattern.compile("[a-z]{2} (?<date>\\d+\\.\\d+\\.\\d+) ---");
    private static Pattern ACTIVITY_PATTERN = Pattern.compile("(?<start>\\d+\\.\\d+) - (?<end>\\d+\\.\\d+) : (?<message>.+)");

    public static void main(String[] args) throws IOException {
        String content = getContent();

        List<Day> days = new ArrayList<>();

        LocalDate lastDay = null;
        List<Activity> dayActivities = new ArrayList<>();

        for (String line : (Iterable<? extends String>) content.lines()::iterator) {
            line = line.strip();
            if (line.isEmpty()) {
                continue;
            }
            Matcher dayMatcher = DAY_PATTERN.matcher(line);
            if (dayMatcher.matches()) {
                if (lastDay != null) {
                    days.add(new Day(lastDay, List.copyOf(dayActivities)));
                    dayActivities.clear();
                }
                lastDay = parseDate(dayMatcher.group("date"));
            } else if (lastDay == null) {
                throw new IllegalStateException("1 invalid format for line : " + line);
            } else {
                Matcher matcher = ACTIVITY_PATTERN.matcher(line);
                if (matcher.matches()) {
                    dayActivities.add(new Activity(parseTime(matcher.group("start")), parseTime(matcher.group("end")), matcher.group("message")));
                } else {
                    dayActivities.add(new Activity(null, null, line));
                }
            }
        }

        if (lastDay != null) {
            days.add(new Day(lastDay, List.copyOf(dayActivities)));
        }

        System.out.println(days.stream()
            .map(day -> formatKey(day.date) + " = " + formatActivities(day.activities))
            .collect(Collectors.joining("\n"))
        );
    }

    static LocalDate parseDate(String date) {
        String[] parts = date.split("\\.");
        String day = parts[0], month = parts[1], year = parts[2];

        if (year.length() == 2) {
            year = "20" + year;
        }
        if (month.length() < 2) {
            month = "0" + month;
        }
        if (day.length() < 2) {
            day = "0" + day;
        }

        return LocalDate.parse(year + "-" + month + "-" + day);
    }

    static LocalTime parseTime(String time) {
        if (time.length() < 5) {
            time = 0 + time;
        }
        return LocalTime.parse(time.replace('.', ':'));
    }

    static String formatKey(LocalDate date) {
        return "timetracker_" + date;
    }

    static String formatActivities(List<Activity> activities) {
        return activities.stream()
            .map(Scratch::formatActivity)
            .collect(Collectors.joining(", ", "[", "]"));
    }

    static String formatActivity(Activity activity) {
        return "{%s: %s, %s: %s, %s: %s, %s: %s}".formatted(
            quote("startTime"), quote(activity.start),
            quote("endTime"), quote(activity.end),
            quote("description"), quote(activity.message),
            quote("type"), quote(activity.start == null && activity.end == null ? "text" : "activity")
        );
    }

    static String quote(Object obj) {
        return obj == null ? "\"\"" : "\"" + obj + "\"";
    }

    record Day(LocalDate date, List<Activity> activities) {}

    record Activity(LocalTime start, LocalTime end, String message) {}

    static String getContent() throws IOException {
        return Files.readString(Path.of("/home/ei226/Documents/time-tracker/meta/zeit_18.8.25-22.08.25.txt"));
    }
}