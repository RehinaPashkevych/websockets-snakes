let sessions = {}; // Correct initialization as an object

document.addEventListener('DOMContentLoaded', function() {
    document.addEventListener('sessionListReceived', function(e) {
        sessions = e.detail; // Assuming this is an object
        updateSessionListUI();
    });

    document.getElementById('createSession').addEventListener('click', createNewSession);
});

function updateSessionListUI() {
    const sessionList = document.getElementById('sessionList');
    sessionList.innerHTML = ''; // Clear current list
    
    if (Object.keys(sessions).length === 0) {
        // Redirect logic
        window.location.href = `/0`;
    }

    Object.entries(sessions).forEach(([sessionId, userCount]) => {
        const button = document.createElement('button');
        button.textContent = `Session ${sessionId} (${userCount} users)`;
        button.addEventListener('click', () => {
            window.location.href = `/${sessionId}`;
        });
        sessionList.appendChild(button);
    });
}

function createNewSession() {
    const maxSessionId = Math.max(...Object.keys(sessions).map(id => isNaN(id) ? -1 : Number(id)));
    const newSessionId = maxSessionId >= 0 ? maxSessionId + 1 : 0;
    window.location.href = `/${newSessionId}`;
}
