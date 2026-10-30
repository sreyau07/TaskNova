
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import "./Analytics.css";

function Analytics({ tasks = [] }) {
  const completed = tasks.filter((task) => task.completed).length;
  const pending = tasks.length - completed;

  const priorityData = [
    {
      name: "High",
      value: tasks.filter((task) => task.priority === "High").length,
    },
    {
      name: "Medium",
      value: tasks.filter(
        (task) => !task.priority || task.priority === "Medium"
      ).length,
    },
    {
      name: "Low",
      value: tasks.filter((task) => task.priority === "Low").length,
    },
  ];

  const statusData = [
    { name: "Completed", count: completed },
    { name: "Pending", count: pending },
  ];

  const COLORS = ["#ef4444", "#f59e0b", "#22c55e"];

  return (
    <section className="analytics-section">
      <div className="analytics-heading">
        <h2>Analytics Dashboard</h2>
        <p>Understand your productivity at a glance.</p>
      </div>

      <div className="analytics-summary">
        <article>
          <span>Total Tasks</span>
          <strong>{tasks.length}</strong>
        </article>
        <article>
          <span>Completed</span>
          <strong>{completed}</strong>
        </article>
        <article>
          <span>Pending</span>
          <strong>{pending}</strong>
        </article>
      </div>

      <div className="analytics-charts">
        <article className="analytics-card">
          <h3>Task Status</h3>
          {tasks.length === 0 ? (
            <p className="analytics-empty">Add tasks to see your chart.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={statusData}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={85}
                  label
                >
                  <Cell fill="#22c55e" />
                  <Cell fill="#ef4444" />
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </article>

        <article className="analytics-card">
          <h3>Tasks by Priority</h3>
          {tasks.length === 0 ? (
            <p className="analytics-empty">Add tasks to see your chart.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={priorityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" name="Tasks" radius={[6, 6, 0, 0]}>
                  {priorityData.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={
                        entry.name === "High"
                          ? "#ef4444"
                          : entry.name === "Medium"
                          ? "#f59e0b"
                          : "#22c55e"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </article>
      </div>
    </section>
  );
}

export default Analytics;
