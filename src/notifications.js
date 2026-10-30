
export async function requestNotificationPermission() {
  if (!("Notification" in window)) {
    alert("Your browser does not support notifications.");
    return false;
  }

  if (Notification.permission === "granted") {
    return true;
  }

  if (Notification.permission === "denied") {
    alert(
      "Notifications are blocked. Enable them in your browser site settings."
    );
    return false;
  }

  const permission = await Notification.requestPermission();
  return permission === "granted";
}

export function showTaskNotification(title, message) {
  if (
    "Notification" in window &&
    Notification.permission === "granted"
  ) {
    new Notification(title, {
      body: message,
      icon: "/vite.svg",
    });
  }
}
