
import { useState } from "react";
import {
  FiBell,
  FiClock,
  FiAlertCircle,
  FiCalendar,
  FiCheckCircle,
} from "react-icons/fi";
import "./NotificationCenter.css";

function NotificationCenter({ tasks = [] }) {
  const [activeFilter, setActiveFilter] = useState("All");

  const now = new Date();

  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  function getStatus(task) {
    const deadline = new Date(task.deadline);
    const deadlineDay = new Date(deadline);
    deadlineDay.setHours(0, 0, 0, 0);

    if (deadlineDay < today) return "Overdue";
    if (deadlineDay.getTime() === today.getTime()) return "Due Today";
    return "Due Tomorrow";
  }

  const reminders = tasks
    .filter((task) => {
      if (!task.deadline || task.completed) return false;

      const status = getStatus(task);

      return (
        status === "Overdue" ||
        status === "Due Today" ||
        status === "Due Tomorrow"
      );
    })
    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

  const filteredReminders =
    activeFilter === "All"
      ? reminders
      : reminders.filter((task) => getStatus(task) === activeFilter);

  const counts = {
    All: reminders.length,
    Overdue: reminders.filter((task) => getStatus(task) === "Overdue").length,
    "Due Today": reminders.filter((task) => getStatus(task) === "Due Today").length,
    "Due Tomorrow": reminders.filter((task) => getStatus(task) === "Due Tomorrow").length,
  };

  function getIcon(status) {
    if (status === "Overdue") return <FiAlertCircle />;
    if (status === "Due Today") return <FiClock />;
    return <FiCalendar />;
  }

  return (
    <section className="notification-center">
      <div className="notification-heading">
        <div className="notification-heading-icon">
          <FiBell />
        </div>

        <div>
          <h2>Notification Center</h2>
          <p>Your upcoming and overdue deadlines</p>
        </div>

        <span className="notification-count">{reminders.length}</span>
      </div>

      <div className="notification-filters">
        {["All", "Overdue", "Due Today", "Due Tomorrow"].map((filter) => (
          <button
            type="button"
            key={filter}
            className={`notification-filter ${
              activeFilter === filter ? "notification-filter-active" : ""
            }`}
            onClick={() => setActiveFilter(filter)}
          >
            {filter}
            <span>{counts[filter]}</span>
          </button>
        ))}
      </div>

      {filteredReminders.length === 0 ? (
        <div className="notification-empty">
          <FiCheckCircle />
          <p>
            {activeFilter === "All"
              ? "You're all caught up! No urgent deadlines."
              : `No ${activeFilter.toLowerCase()} tasks.`}
          </p>
        </div>
      ) : (
        <div className="notification-list">
          {filteredReminders.map((task) => {
            const status = getStatus(task);

            return (
              <article
                className={`notification-item ${status
                  .toLowerCase()
                  .replace(" ", "-")}`}
                key={task._id}
              >
                <span className="notification-item-icon">
                  {getIcon(status)}
                </span>

                <div className="notification-item-content">
                  <strong>{task.title}</strong>
                  <span>{status}</span>
                  <small>
                    Deadline:{" "}
                    {new Date(task.deadline).toLocaleString("en-IN")}
                  </small>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default NotificationCenter;
