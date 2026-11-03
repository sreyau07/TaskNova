import { useEffect, useState } from "react";
import {
  FiGrid,
  FiCheckSquare,
  FiCalendar,
  FiBarChart2,
  FiSettings,
  FiSearch,
  FiBell,
  FiPlus,
  FiClock,
  FiCheckCircle,
  FiCircle,
  FiTrash2,
  FiTarget,
} from "react-icons/fi";

import Auth from "./Auth.jsx";
import "./App.css";
import API from "./services/api";
import WeeklyCalendar from "./WeeklyCalendar";
import Analytics from "./Analytics";
import NotificationCenter from "./NotificationCenter";


// Convert a date into the local format used by datetime-local inputs.
function toLocalDateTimeInput(dateValue) {
  if (!dateValue) return "";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) return "";

  const offset = date.getTimezoneOffset() * 60000;

  return new Date(date.getTime() - offset)
    .toISOString()
    .slice(0, 16);
}

function App() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");

  const [newPriority, setNewPriority] = useState("Medium");
  const [editPriority, setEditPriority] = useState("Medium");

  const [newTitle, setNewTitle] = useState("");
  const [newDeadline, setNewDeadline] = useState("");
  const [showForm, setShowForm] = useState(false);

  const [editingTask, setEditingTask] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDeadline, setEditDeadline] = useState("");

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [sortBy, setSortBy] = useState("Priority");
  const [activeSection, setActiveSection] = useState("dashboard");
  const [theme, setTheme] = useState(
  () => localStorage.getItem("tasknova-theme") || "light"
);

const [currentUser, setCurrentUser] = useState(() => {
  const token = localStorage.getItem("token");
  const savedUser = localStorage.getItem("tasknova-user");

  if (!token || !savedUser) return null;

  try {
    return JSON.parse(savedUser);
  } catch {
    return null;
  }
});
  // Sidebar navigation: scroll smoothly to any section.
  function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);

    if (section) {
      section.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }

    setActiveSection(sectionId);
  }

  // Task statistics.
  const completed = tasks.filter((task) => task.completed).length;
  
  const totalTasks = tasks.length;
  const pending = tasks.length - completed;

  const progress =
    tasks.length === 0
      ? 0
      : Math.round((completed / tasks.length) * 100);

  // Sort tasks by priority.
  const priorityOrder = {
    High: 1,
    Medium: 2,
    Low: 3,
  };

  
const visibleTasks = tasks
  .filter((task) => {
    // Search by task title.
    const matchesSearch = (task.title || "")
      .toLowerCase()
      .includes(search.toLowerCase().trim());

    // Check the task deadline by calendar day.
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const deadline = task.deadline
      ? new Date(task.deadline)
      : null;

    const deadlineDay = deadline
      ? new Date(deadline)
      : null;

    if (deadlineDay) {
      deadlineDay.setHours(0, 0, 0, 0);
    }

    const isOverdue =
      !task.completed &&
      deadlineDay &&
      deadlineDay < today;

    const isDueToday =
      !task.completed &&
      deadlineDay &&
      deadlineDay.getTime() === today.getTime();

    // Apply selected filter.
    const matchesFilter =
      filter === "All" ||
      (filter === "Pending" && !task.completed) ||
      (filter === "Completed" && task.completed) ||
      (filter === "Overdue" && isOverdue) ||
      (filter === "Due Today" && isDueToday);

    return matchesSearch && matchesFilter;
  })
  .sort((a, b) => {
    // Sort by deadline when selected.
    if (sortBy === "Deadline") {
      const dateA = a.deadline
        ? new Date(a.deadline).getTime()
        : Infinity;

      const dateB = b.deadline
        ? new Date(b.deadline).getTime()
        : Infinity;

      return dateA - dateB;
    }

    // Default: High, Medium, Low priority.
    const priorityA = priorityOrder[a.priority] || 2;
    const priorityB = priorityOrder[b.priority] || 2;

    return priorityA - priorityB;
  });


  // Deadline reminder logic.
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
function getDeadlineStatus(task) {
  if (!task.deadline || task.completed) return "";

  const deadline = new Date(task.deadline);

  if (Number.isNaN(deadline.getTime())) return "";

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const deadlineDay = new Date(
    deadline.getFullYear(),
    deadline.getMonth(),
    deadline.getDate()
  );

  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  if (deadlineDay.getTime() < today.getTime()) {
    return "Overdue";
  }

  if (deadlineDay.getTime() === today.getTime()) {
    return "Due Today";
  }

  if (deadlineDay.getTime() === tomorrow.getTime()) {
    return "Due Tomorrow";
  }

  const daysLeft = Math.round(
    (deadlineDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  return `Due in ${daysLeft} days`;
}
  const reminderTasks = tasks
    .filter((task) => getDeadlineStatus(task) !== "")
    .sort(
      (a, b) =>
        new Date(a.deadline).getTime() -
        new Date(b.deadline).getTime()
    );

  // Load only the signed-in user's tasks.
  useEffect(() => {
    let cancelled = false;

    async function loadTasks() {
      if (!currentUser || !localStorage.getItem("token")) {
        setTasks([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setApiError("");

      try {
        const response = await API.get("/tasks");
        if (!cancelled) setTasks(response.data.tasks || []);
      } catch (error) {
        console.error("TaskNova fetch error:", error);
        if (cancelled) return;

        if (error.response?.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("tasknova-user");
          setCurrentUser(null);
          setTasks([]);
          setApiError("Your session expired. Please sign in again.");
        } else if (error.response) {
          setApiError(
            error.response.data?.message || `Server error: ${error.response.status}`
          );
        } else {
          setApiError("Cannot connect to TaskNova backend. Check that the server is running on port 5000.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadTasks();
    return () => { cancelled = true; };
  }, [currentUser?.id, currentUser?._id]);

  async function fetchTasks() {
    setLoading(true);
    try {
      const response = await API.get("/tasks");
      setTasks(response.data.tasks || []);
      setApiError("");
    } catch (error) {
      setApiError(error.response?.data?.message || "Could not load tasks. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("tasknova-user");
    setCurrentUser(null);
    setTasks([]);
    setApiError("");
    setShowForm(false);
    cancelEditing();
  }

  // Create a task.
  async function addTask(event) {
    event.preventDefault();

    if (!newTitle.trim()) return;

    try {
      setApiError("");

      const response = await API.post("/tasks", {
        title: newTitle.trim(),
        description: "",
        deadline: newDeadline || null,
        priority: newPriority,
      });

      setTasks((current) => [
        response.data.task,
        ...current,
      ]);

      setNewTitle("");
      setNewDeadline("");
      setNewPriority("Medium");
      setShowForm(false);
    } catch (error) {
      setApiError(
        error.response?.data?.message ||
          "Could not save the task. Please try again."
      );
    }
  }
useEffect(() => {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("tasknova-theme", theme);
}, [theme]);
  // Start editing a task.
  function startEditing(task) {
    setEditingTask(task);
    setEditTitle(task.title || "");
    setEditDeadline(toLocalDateTimeInput(task.deadline));
    setEditPriority(task.priority || "Medium");
    setShowForm(false);
    setApiError("");
  }

  function cancelEditing() {
    setEditingTask(null);
    setEditTitle("");
    setEditDeadline("");
    setEditPriority("Medium");
  }

  // Save task changes.
  async function updateTask(event) {
    event.preventDefault();

    if (!editingTask || !editTitle.trim()) return;

    try {
      setApiError("");

      const response = await API.put(
        `/tasks/${editingTask._id}`,
        {
          title: editTitle.trim(),
          deadline: editDeadline || null,
          priority: editPriority,
        }
      );

      setTasks((current) =>
        current.map((task) =>
          task._id === editingTask._id
            ? response.data.task
            : task
        )
      );

      cancelEditing();
    } catch (error) {
      setApiError(
        error.response?.data?.message ||
          "Could not update the task. Check your backend PUT route."
      );
    }
  }

  // Mark a task as completed or pending.
  async function toggleTask(id) {
    const task = tasks.find((item) => item._id === id);

    if (!task) return;

    try {
      setApiError("");

      const response = await API.patch(`/tasks/${id}`, {
        completed: !task.completed,
      });

      setTasks((current) =>
        current.map((item) =>
          item._id === id ? response.data.task : item
        )
      );
    } catch (error) {
      setApiError("Could not update the task.");
    }
  }

  // Delete a task.
  async function deleteTask(id) {
    try {
      setApiError("");

      await API.delete(`/tasks/${id}`);

      setTasks((current) =>
        current.filter((task) => task._id !== id)
      );

      if (editingTask?._id === id) {
        cancelEditing();
      }
    } catch (error) {
      setApiError("Could not delete the task.");
    }
  }

  if (!currentUser || !localStorage.getItem("token")) {
    return <Auth onLogin={(user) => {
      setCurrentUser(user);
      setApiError("");
      setLoading(true);
    }} />;
  }

  return (
    <div className="app-layout">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-icon">
            <FiTarget />
          </span>

          <span>
            Task<span className="brand-accent">Nova</span>
          </span>
        </div>

        <p className="menu-label">WORKSPACE</p>

        <nav className="navigation">
          <button
            type="button"
            className={`nav-item ${
              activeSection === "tasknova-dashboard" ||
              activeSection === "dashboard"
                ? "active"
                : ""
            }`}
            onClick={() => {
              setFilter("All");
              scrollToSection("tasknova-dashboard");
            }}
          >
            <FiGrid /> Dashboard
          </button>

          <button
            type="button"
            className={`nav-item ${
              activeSection === "tasknova-tasks" ? "active" : ""
            }`}
            onClick={() => {
              setFilter("All");
              scrollToSection("tasknova-tasks");
            }}
          >
            <FiCheckSquare /> All Tasks
          </button>

          <button
            type="button"
            className={`nav-item ${
              activeSection === "tasknova-tasks" &&
              filter === "Pending"
                ? "active"
                : ""
            }`}
            onClick={() => {
              setFilter("Pending");
              scrollToSection("tasknova-tasks");
            }}
          >
            <FiClock /> Pending
          </button>

          <button
            type="button"
            className={`nav-item ${
              activeSection === "tasknova-tasks" &&
              filter === "Completed"
                ? "active"
                : ""
            }`}
            onClick={() => {
              setFilter("Completed");
              scrollToSection("tasknova-tasks");
            }}
          >
            <FiCheckCircle /> Completed
          </button>

          <button
            type="button"
            className={`nav-item ${
              activeSection === "tasknova-calendar" ? "active" : ""
            }`}
            onClick={() => scrollToSection("tasknova-calendar")}
          >
            <FiCalendar /> Calendar
          </button>

          <button
            type="button"
            className={`nav-item ${
              activeSection === "tasknova-analytics" ? "active" : ""
            }`}
            onClick={() => scrollToSection("tasknova-analytics")}
          >
            <FiBarChart2 /> Analytics
          </button>
        </nav>

        <div className="sidebar-bottom">
          <div className="upgrade-card">
            <FiTarget className="upgrade-icon" />
            <h3>Stay on track!</h3>
            <p>Small steps lead to big achievements.</p>
          </div>

          <button
            type="button"
            className="nav-item"
            onClick={() => scrollToSection("settings")}
          >
            <FiSettings /> Settings
          </button>

          <div className="profile">
            {currentUser?.profilePhoto ? (
              <img className="avatar" src={currentUser.profilePhoto} alt="Profile" />
            ) : (
              <div className="avatar">
                {(currentUser?.name || "U").trim().charAt(0).toUpperCase()}
              </div>
            )}
            <div className="profile-details">
              <strong>{currentUser?.name || "TaskNova User"}</strong>
              <span>{currentUser?.email || "My workspace"}</span>
              <button type="button" className="logout-button" onClick={handleLogout}>
                Sign out
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="main-content" id="tasknova-dashboard">
        <header className="topbar">
          <div>
            <span className="eyebrow">YOUR WORKSPACE</span>
            <h1>Dashboard</h1>
          </div>

          <div className="topbar-actions">
            <label className="search-box">
              <FiSearch />

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search your tasks..."
                aria-label="Search tasks"
              />
            </label>

            <button
              type="button"
              className="icon-button"
              aria-label="Go to notifications"
              onClick={() => scrollToSection("tasknova-notifications")}
            >
              <FiBell />
            </button>

            {currentUser?.profilePhoto ? (
              <img className="avatar top-avatar" src={currentUser.profilePhoto} alt="Profile" />
            ) : (
              <div className="avatar top-avatar">
                {(currentUser?.name || "U").trim().charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </header>

        <section className="welcome-section">
          <div>
            <span className="welcome-label">
              YOUR PRODUCTIVITY SPACE
            </span>

            <h2>Make today count.</h2>

            <p>
              Organize your priorities and make progress every day.
            </p>
          </div>

          <button
            type="button"
            className="primary-button"
            onClick={() => {
              setShowForm((current) => !current);
              cancelEditing();
            }}
          >
            <FiPlus /> Add New Task
          </button>
        </section>

        {apiError && (
          <p className="api-error" role="alert">
            {apiError}
          </p>
        )}

        {/* ADD TASK FORM */}
        {showForm && (
          <form className="task-form" onSubmit={addTask}>
            <input
              autoFocus
              value={newTitle}
              onChange={(event) => setNewTitle(event.target.value)}
              placeholder="What do you need to accomplish?"
              aria-label="New task title"
              required
            />

            <input
              type="datetime-local"
              value={newDeadline}
              onChange={(event) => setNewDeadline(event.target.value)}
              aria-label="Task deadline"
            />

            <select
              value={newPriority}
              onChange={(event) => setNewPriority(event.target.value)}
              aria-label="Task priority"
            >
              <option value="High">High Priority</option>
              <option value="Medium">Medium Priority</option>
              <option value="Low">Low Priority</option>
            </select>

            <button type="submit" className="primary-button">
              Save Task
            </button>

            <button
              type="button"
              className="cancel-button"
              onClick={() => {
                setShowForm(false);
                setNewTitle("");
                setNewDeadline("");
                setNewPriority("Medium");
              }}
            >
              Cancel
            </button>
          </form>
        )}

        {/* EDIT TASK FORM */}
        {editingTask && (
          <form
            className="task-form edit-form"
            onSubmit={updateTask}
          >
            <h3>Edit Task</h3>

            <input
              value={editTitle}
              onChange={(event) => setEditTitle(event.target.value)}
              placeholder="Task title"
              required
            />

            <input
              type="datetime-local"
              value={editDeadline}
              onChange={(event) => setEditDeadline(event.target.value)}
            />

            <select
              value={editPriority}
              onChange={(event) => setEditPriority(event.target.value)}
              aria-label="Edit task priority"
            >
              <option value="High">High Priority</option>
              <option value="Medium">Medium Priority</option>
              <option value="Low">Low Priority</option>
            </select>

            <button type="submit" className="primary-button">
              Save Changes
            </button>

            <button
              type="button"
              className="cancel-button"
              onClick={cancelEditing}
            >
              Cancel
            </button>
          </form>
        )}

        {/* DASHBOARD STATISTICS */}
        <section className="stats-grid">
          <article className="stat-card">
            <div className="stat-top">
              <span>Total Tasks</span>
              <span className="stat-icon purple">
                <FiGrid />
              </span>
            </div>

            <h3>{tasks.length}</h3>
            <p>Tasks in your workspace</p>
          </article>

          <article className="stat-card">
            <div className="stat-top">
              <span>Completed</span>
              <span className="stat-icon green">
                <FiCheckCircle />
              </span>
            </div>

            <h3>{completed}</h3>
            <p>Tasks finished successfully</p>
          </article>

          <article className="stat-card">
            <div className="stat-top">
              <span>Pending</span>
              <span className="stat-icon orange">
                <FiClock />
              </span>
            </div>

            <h3>{pending}</h3>
            <p>Tasks left to complete</p>
          </article>

          <article className="stat-card">
            <div className="stat-top">
              <span>Productivity</span>
              <span className="stat-icon blue">
                <FiTarget />
              </span>
            </div>

            <h3>{progress}%</h3>
            <p>Overall task completion</p>
          </article>
        </section>

        {/* CALENDAR SECTION */}
        <section id="tasknova-calendar" className="page-section">
          <WeeklyCalendar
            tasks={tasks}
            onToggle={toggleTask}
          />
        </section>

        {/* DEADLINE REMINDERS */}
        <section className="deadline-reminders">
          <h2>Deadline Reminders</h2>
          <p>Stay on track with your upcoming deadlines.</p>

          {reminderTasks.length === 0 ? (
            <div className="no-reminders">
              No urgent deadlines.
            </div>
          ) : (
            <div className="reminder-list">
              {reminderTasks.map((task) => {
                const status = getDeadlineStatus(task);

                return (
                  <div
                    className={`reminder-item ${status
                      .toLowerCase()
                      .replace(" ", "-")}`}
                    key={task._id}
                  >
                    <div>
                      <strong>{task.title}</strong>

                      <span>
                        {new Date(task.deadline).toLocaleString()}
                      </span>
                    </div>

                    <b>{status}</b>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {loading && <p>Loading tasks...</p>}

        {/* IN-APP NOTIFICATIONS */}
        <section
          id="tasknova-notifications"
          className="page-section"
        >
          <NotificationCenter tasks={tasks} />
        </section>

        {/* TASK LIST AND DAILY PROGRESS */}
        <section
          id="tasknova-tasks"
          className="content-grid page-section"
        >
          <div className="panel tasks-panel">
            <div className="panel-heading">
              <div>
                <h2>My Tasks</h2>
                <p>Keep moving forward, one task at a time.</p>
              </div>

              <span className="task-count">
                {visibleTasks.length} tasks
              </span>
            </div>

            <div className="filter-row">
              {["All", "Pending", "Completed"].map((item) => (
                <button
                  type="button"
                  key={item}
                  className={`filter-button ${
                    filter === item ? "selected" : ""
                  }`}
                  onClick={() => setFilter(item)}
                >
                  {item}
                </button>
              ))}
            </div>

            <div className="task-list">
              {visibleTasks.map((task) => (
                <article className="task-row" key={task._id}>
                  <button
                    type="button"
                    className={`check-button ${
                      task.completed ? "checked" : ""
                    }`}
                    onClick={() => toggleTask(task._id)}
                    aria-label={
                      task.completed
                        ? "Mark pending"
                        : "Complete task"
                    }
                  >
                    {task.completed ? (
                      <FiCheckCircle />
                    ) : (
                      <FiCircle />
                    )}
                  </button>

                  <div className="task-info">
                    <h3 className={task.completed ? "task-done" : ""}>
                      {task.title}
                    </h3>

                    <div className="task-meta">
                      <span>
                        <FiCalendar />

                        {task.deadline
                          ? new Date(task.deadline).toLocaleString()
                          : "No deadline"}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`priority ${
                      (task.priority || "Medium").toLowerCase()
                    }`}
                  >
                    {task.priority || "Medium"}
                  </span>

                  <button
                    type="button"
                    className="edit-btn"
                    onClick={() => startEditing(task)}
                    aria-label={`Edit ${task.title}`}
                  >
                    Edit
                  </button>

                  <button
                    type="button"
                    className="delete-button"
                    onClick={() => deleteTask(task._id)}
                    aria-label={`Delete ${task.title}`}
                  >
                    <FiTrash2 />
                  </button>
                </article>
              ))}

              {!loading && visibleTasks.length === 0 && (
                <div className="empty-state">
                  <FiCheckCircle />
                  <p>
                    No tasks found. Add a new task to get started!
                  </p>
                </div>
              )}
            </div>
          </div>

          <aside className="panel progress-panel">
            <h2>Daily Progress</h2>
            <p>Your progress, at a glance.</p>

            <div
              className="progress-ring"
              style={{ "--progress": `${progress}%` }}
            >
              <div className="progress-inner">
                <strong>{progress}%</strong>
                <span>Completed</span>
              </div>
            </div>

            <div className="progress-legend">
              <div>
                <span className="legend-dot completed-dot" />
                <span>Completed tasks</span>
                <strong>{completed}</strong>
              </div>

              <div>
                <span className="legend-dot pending-dot" />
                <span>Remaining tasks</span>
                <strong>{pending}</strong>
              </div>
            </div>

            <div className="motivation-card">
              <span>
                ✦ A little progress every day adds up to big results.
              </span>
            </div>
          </aside>
        </section>

        {/* ANALYTICS SECTION */}
        <section
          id="tasknova-analytics"
          className="page-section"
        >
          <Analytics tasks={tasks} />
        </section>


        <section id="settings" className="page-section settings-section">
  <div className="section-heading">
    
    <h2>Settings</h2>
    <p>Customize your TaskNova experience.</p>
  </div>

  <div className="settings-card">
    <h3>Task Preferences</h3>
    <p>Choose your default task priority.</p>

    <label htmlFor="defaultPriority">Default Priority</label>
    <select
      id="defaultPriority"
      value={newPriority}
      onChange={(event) => setNewPriority(event.target.value)}
    >
      <option value="High">High</option>
      <option value="Medium">Medium</option>
      <option value="Low">Low</option>
    </select>
  </div>
</section>

        <footer className="footer">
          <span>© 2026 TaskNova</span>
          <span>Plan smarter. Achieve more.</span>
        </footer>
      </main>
    </div>
  );
}

export default App;
