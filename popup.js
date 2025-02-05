document.addEventListener('DOMContentLoaded', function() {
  // Load saved settings
  chrome.storage.sync.get([
    'timerType',
    'waterFrequency',
    'walkFrequency',
    'notificationsEnabled'
  ], function(data) {
    if (data.timerType) document.getElementById('timerType').value = data.timerType;
    if (data.waterFrequency) document.getElementById('waterFrequency').value = data.waterFrequency;
    if (data.walkFrequency) document.getElementById('walkFrequency').value = data.walkFrequency;
    if (data.notificationsEnabled) {
      document.getElementById('notificationsToggle').classList.add('active');
    }
  });

  // Handle notification toggle
  document.querySelector('.toggle').addEventListener('click', function() {
    const slider = document.getElementById('notificationsToggle');
    slider.classList.toggle('active');
    saveSettings();
  });

  // Save settings when changed
  document.querySelectorAll('select, input').forEach(element => {
    element.addEventListener('change', saveSettings);
  });

  // Start timer button
  document.getElementById('startTimer').addEventListener('click', function() {
    saveSettings();
    chrome.runtime.sendMessage({ action: 'startTimers' });
    showToast('Reminders started! \u2728');
  });

  // Pause timer button
  document.getElementById('pauseTimer').addEventListener('click', function() {
    updatePauseResumeButton(true);
  });

  // Reset timer button
  document.getElementById('resetTimer').addEventListener('click', function() {
    chrome.runtime.sendMessage({ action: 'resetTimers' });
    showToast('Timers reset! \u21BB');
  });

  // Check alarm state to update pause/resume button
  updatePauseResumeButton();

  // Update countdown timers
  updateCountdowns();
  setInterval(updateCountdowns, 1000);
});

function saveSettings() {
  const settings = {
    timerType: document.getElementById('timerType').value,
    waterFrequency: document.getElementById('waterFrequency').value,
    walkFrequency: document.getElementById('walkFrequency').value,
    notificationsEnabled: document.getElementById('notificationsToggle').classList.contains('active')
  };

  chrome.storage.sync.set(settings);
}

function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3000);
}

function updatePauseResumeButton(isClick = false) {
  const pauseButton = document.getElementById('pauseTimer');
  chrome.alarms.getAll((alarms) => {
    if (alarms.length === 0) {
      pauseButton.textContent = 'Resume \u25B6';
      if (isClick) {
        chrome.runtime.sendMessage({ action: 'resumeTimers' });
        showToast('Reminders resumed! \u25B6');
      }
    } else {
      pauseButton.textContent = 'Pause \u23F8';
      if (isClick) {
        chrome.runtime.sendMessage({ action: 'pauseTimers' });
        showToast('Reminders paused! \u23F8');
      }
    }
  });
}

function updateCountdowns() {
  chrome.runtime.sendMessage({ action: 'getNextTimes' }, function(response) {
    if (response) {
      const waterCountdown = document.getElementById('waterCountdown');
      const walkCountdown = document.getElementById('walkCountdown');

      if (response.nextWater) {
        waterCountdown.textContent = `Next: ${formatTimeRemaining(response.nextWater)}`;
      } else {
        waterCountdown.textContent = 'Next: --:--';
      }

      if (response.nextWalk) {
        walkCountdown.textContent = `Next: ${formatTimeRemaining(response.nextWalk)}`;
      } else {
        walkCountdown.textContent = 'Next: --:--';
      }

      // Update pause/resume button state
      updatePauseResumeButton();
    }
  });
}

function formatTimeRemaining(timestamp) {
  const now = Date.now();
  const diff = timestamp - now;
  
  if (diff <= 0) return '--:--';
  
  const totalSeconds = Math.floor(diff / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  return `${minutes}m ${seconds}s`;
} 