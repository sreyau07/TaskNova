
import { useState } from "react";
import {
  FiChevronLeft,
  FiChevronRight,
  FiCheckCircle,
  FiCircle,
  FiCalendar,
} from "react-icons/fi";
import "./WeeklyCalendar.css";

function getDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getMonday(date) {
  const monday = new Date(date);
  monday.setHours(0, 0, 0, 0);
  const day = monday.getDay();
  monday.setDate(monday.getDate() + (day === 0 ? -6 : 1 - day));
  return monday;
}

function WeeklyCalendar({ tasks = [], onToggle }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState(
    getDateKey(new Date())
  );

  const monday = getMonday(new Date());
  monday.setDate(monday.getDate() + weekOffset * 7);

  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return date;
  });

  const weekEnd = days[6];

  const formatDate = (date) =>
    date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
    });

  const weekTasks = tasks.filter((task) => {
    if (!task.deadline) return false;

    const deadline = new Date(task.deadline);
    const endExclusive = new Date(weekEnd);
    endExclusive.setDate(endExclusive.getDate() + 1);

    return deadline >= monday && deadline < endExclusive;
  });

  const completedThisWeek = weekTasks.filter(
    (task) => task.completed
  ).length;

  const selectedDayTasks = tasks.filter((task) => {
    if (!task.deadline) return false;
    return getDateKey(new Date(task.deadline)) === selectedDate;
  });

  const selectedDateObject = new Date(`${selectedDate}T12:00:00`);

  const selectedDateLabel = selectedDateObject.toLocaleDateString(
    "en-IN",
    {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }
  );

  function changeWeek(offset) {
    const nextOffset = weekOffset + offset;
    setWeekOffset(nextOffset);

    const nextMonday = getMonday(new Date());
    nextMonday.setDate(nextMonday.getDate() + nextOffset * 7);

    const todayKey = getDateKey(new Date());
    const selectedIsToday = selectedDate === todayKey;

    if (selectedIsToday || offset !== 0) {
      setSelectedDate(getDateKey(nextMonday));
    }
  }

  return (
    <section className="weekly-calendar">
      <div className="calendar-heading">
        <div>
          <h2>Weekly Task Calendar</h2>
          <p className="calendar-month">
            {monday.toLocaleDateString("en-IN", {
              month: "long",
              year: "numeric",
            })}
          </p>
          <p>
            {formatDate(monday)} – {formatDate(weekEnd)}
            {" · "}Monday to Sunday
          </p>
        </div>

        <div className="calendar-navigation">
          <button
            type="button"
            onClick={() => changeWeek(-1)}
            aria-label="Previous week"
          >
            <FiChevronLeft />
          </button>

          <button
            type="button"
            onClick={() => changeWeek(1)}
            aria-label="Next week"
          >
            <FiChevronRight />
          </button>
        </div>
      </div>

      <div className="weekly-progress">
        <div>
          <strong>{completedThisWeek}</strong>
          <span> tasks completed this week</span>
        </div>
        <div>
          <strong>{weekTasks.length - completedThisWeek}</strong>
          <span> tasks remaining</span>
        </div>
      </div>

      <div className="calendar-days">
        {days.map((day) => {
          const dayKey = getDateKey(day);

          const dayTasks = tasks.filter((task) => {
            if (!task.deadline) return false;
            return getDateKey(new Date(task.deadline)) === dayKey;
          });

          const completedCount = dayTasks.filter(
            (task) => task.completed
          ).length;

          const isToday = dayKey === getDateKey(new Date());
          const isSelected = dayKey === selectedDate;

          return (
            <button
              type="button"
              className={`calendar-day ${
                isSelected ? "calendar-day-selected" : ""
              }`}
              key={dayKey}
              onClick={() => setSelectedDate(dayKey)}
              aria-pressed={isSelected}
              aria-label={`Select ${day.toLocaleDateString("en-IN", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}`}
            >
              <div
                className={`calendar-day-heading ${
                  isToday ? "today" : ""
                }`}
              >
                <span>
                  {day.toLocaleDateString("en-IN", {
                    weekday: "short",
                  })}
                </span>
                <strong>{day.getDate()}</strong>
                <small>
                  {completedCount}/{dayTasks.length} completed
                </small>
              </div>

              <div className="calendar-day-tasks">
                {dayTasks.length === 0 ? (
                  <p className="no-day-tasks">No tasks</p>
                ) : (
                  dayTasks.slice(0, 3).map((task) => (
                    <div
                      className={`calendar-task ${
                        task.completed
                          ? "calendar-task-done"
                          : "calendar-task-pending"
                      }`}
                      key={task._id}
                    >
                      <span className="calendar-task-title">
                        {task.title}
                      </span>
                    </div>
                  ))
                )}

                {dayTasks.length > 3 && (
                  <small>+{dayTasks.length - 3} more</small>
                )}
              </div>

              {dayTasks.length > 0 && (
                <div
                  className={`day-result ${
                    completedCount === dayTasks.length
                      ? "day-result-complete"
                      : "day-result-pending"
                  }`}
                >
                  {completedCount === dayTasks.length
                    ? "All done!"
                    : `${dayTasks.length - completedCount} remaining`}
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="selected-day-panel">
        <div className="selected-day-heading">
          <FiCalendar />
          <div>
            <h3>{selectedDateLabel}</h3>
            <p>
              {selectedDayTasks.length}{" "}
              {selectedDayTasks.length === 1 ? "task" : "tasks"} scheduled
            </p>
          </div>
        </div>

        {selectedDayTasks.length === 0 ? (
          <p className="selected-day-empty">
            No tasks for this date. Enjoy your free time or add a task!
          </p>
        ) : (
          <div className="selected-day-task-list">
            {selectedDayTasks.map((task) => (
              <div
                className={`selected-day-task ${
                  task.completed ? "calendar-task-done" : ""
                }`}
                key={task._id}
              >
                <button
                  type="button"
                  className="calendar-check"
                 onClick={() => onToggle(task._id)}
                  aria-label={
                    task.completed
                      ? `Mark ${task.title} incomplete`
                      : `Mark ${task.title} complete`
                  }
                >
                  {task.completed ? (
                    <FiCheckCircle />
                  ) : (
                    <FiCircle />
                  )}
                </button>

                <span className="calendar-task-title">
                  {task.title}
                </span>

                <span className="selected-task-status">
                  {task.completed ? "Completed" : "Pending"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="calendar-note">
        Select a day to view its tasks. Only tasks with a deadline appear
        on the calendar.
      </p>
    </section>
  );
}

export default WeeklyCalendar;
