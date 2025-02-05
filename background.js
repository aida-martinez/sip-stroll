let nextWaterTime = null;
let nextWalkTime = null;
let pausedWaterTime = null;
let pausedWalkTime = null;

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.set({
    timerType: 'browser',
    waterFrequency: '60',
    walkFrequency: '120',
    notificationsEnabled: true
  });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'startTimers') {
    startTimers();
  } else if (request.action === 'pauseTimers') {
    pauseTimers();
  } else if (request.action === 'resumeTimers') {
    resumeTimers();
  } else if (request.action === 'resetTimers') {
    resetTimers();
  } else if (request.action === 'getNextTimes') {
    // Get the scheduled times from alarms
    chrome.alarms.get('waterReminder', (waterAlarm) => {
      chrome.alarms.get('walkReminder', (walkAlarm) => {
        sendResponse({
          nextWater: waterAlarm ? waterAlarm.scheduledTime : null,
          nextWalk: walkAlarm ? walkAlarm.scheduledTime : null
        });
      });
    });
    return true; // Keep message channel open for async response
  }
  return true;
});

function startTimers() {
  chrome.storage.sync.get([
    'waterFrequency',
    'walkFrequency',
    'notificationsEnabled'
  ], function(data) {
    if (!data.notificationsEnabled) return;

    // Get existing alarms first
    chrome.alarms.get('waterReminder', (waterAlarm) => {
      chrome.alarms.get('walkReminder', (walkAlarm) => {
        // Only create new alarms if they don't exist
        if (!waterAlarm) {
          chrome.alarms.create('waterReminder', {
            periodInMinutes: parseInt(data.waterFrequency),
            when: Date.now() + parseInt(data.waterFrequency) * 60 * 1000
          });
        }
        
        if (!walkAlarm) {
          chrome.alarms.create('walkReminder', {
            periodInMinutes: parseInt(data.walkFrequency),
            when: Date.now() + parseInt(data.walkFrequency) * 60 * 1000
          });
        }
      });
    });
  });
}

function pauseTimers() {
  // Store remaining times before clearing alarms
  chrome.alarms.get('waterReminder', (waterAlarm) => {
    pausedWaterTime = waterAlarm ? waterAlarm.scheduledTime - Date.now() : null;
  });
  chrome.alarms.get('walkReminder', (walkAlarm) => {
    pausedWalkTime = walkAlarm ? walkAlarm.scheduledTime - Date.now() : null;
  });
  
  chrome.alarms.clearAll();
  nextWaterTime = null;
  nextWalkTime = null;
}

function resetTimers() {
  chrome.storage.sync.get([
    'waterFrequency',
    'walkFrequency',
    'notificationsEnabled'
  ], function(data) {
    if (!data.notificationsEnabled) return;

    // Clear existing alarms
    chrome.alarms.clearAll();

    // Create new alarms starting from now
    chrome.alarms.create('waterReminder', {
      periodInMinutes: parseInt(data.waterFrequency),
      when: Date.now() // Start immediately
    });

    chrome.alarms.create('walkReminder', {
      periodInMinutes: parseInt(data.walkFrequency),
      when: Date.now() // Start immediately
    });
  });
}

function resumeTimers() {
  chrome.storage.sync.get([
    'waterFrequency',
    'walkFrequency',
    'notificationsEnabled'
  ], function(data) {
    if (!data.notificationsEnabled) return;

    // Resume with remaining time if available, otherwise use full duration
    const waterDelay = pausedWaterTime || (parseInt(data.waterFrequency) * 60 * 1000);
    const walkDelay = pausedWalkTime || (parseInt(data.walkFrequency) * 60 * 1000);

    // Create new alarms with remaining time
    chrome.alarms.create('waterReminder', {
      periodInMinutes: parseInt(data.waterFrequency),
      when: Date.now() + waterDelay
    });

    chrome.alarms.create('walkReminder', {
      periodInMinutes: parseInt(data.walkFrequency),
      when: Date.now() + walkDelay
    });

    // Clear stored pause times
    pausedWaterTime = null;
    pausedWalkTime = null;
  });
}

// Handle alarm events
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'waterReminder') {
    showNotification(
      'Time for a sip!',
      'Stay hydrated - take a water break!'
    );
  } else if (alarm.name === 'walkReminder') {
    showNotification(
      'Time to move!',
      'Take a quick stroll to refresh your mind and body!'
    );
  }
});

function showNotification(title, message) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'images/icon128.png',
    title: title,
    message: message,
    priority: 2
  });
}

// Start timers when browser opens if that option is selected
chrome.storage.sync.get(['timerType'], function(data) {
  if (data.timerType === 'browser') {
    startTimers();
  }
});

// Add this to handle browser restart cases
chrome.runtime.onStartup.addListener(() => {
  // Clear any stored pause times on browser startup
  pausedWaterTime = null;
  pausedWalkTime = null;
}); 