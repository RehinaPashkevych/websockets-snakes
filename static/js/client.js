import { getSnakeProperties } from './game.js';

const serverUrl = 'ws://localhost:8080';
let socket = new WebSocket(serverUrl);

export function getClientId() {
    let clientId  = sessionStorage.getItem('clientId');
    if (!clientId) {
        clientId = generateUniqueId();
        sessionStorage.setItem('clientId', clientId);
    }
    return clientId;
}

let clientId = getClientId();

const sessionId = window.location.pathname.split('/')[1];


document.addEventListener("DOMContentLoaded", function() {

    socket.onopen = function(event) {

        if (window.location.pathname != '/') {
            console.log("Connected to the WebSocket server.");
            // Existing functionality: send initial data to the server
            sendInitialData();
        }


        if (window.location.pathname === '/') {
                // Set an interval to send FETCH_SESSIONS request every 400 ms
            setInterval(() => {
                if (socket.readyState === WebSocket.OPEN) {
                    socket.send(JSON.stringify({ type: 'FETCH_SESSIONS' }));
                }
            }, 400); 
        }
    };

    // Inside your client.js or equivalent
    socket.onmessage = function(event) {
        const data = JSON.parse(event.data);
        if (data.type === 'ALL_SNAKES') {
            window.updateAllSnakes(data.snakes);
        }

        if (data.type === 'DISCONNECT') {
            console.log(data)
            window.removeSnake(data.clientId); // Implement this function to remove the snake
        } else if (data.type === 'SESSION_LIST') {
            // Assuming 'updateSessionList' updates the UI based on 'data.sessions'
            updateSessionList(data.sessions);
            // Dispatch a custom event with session data
            const sessionEvent = new CustomEvent('sessionListReceived', { detail: data.sessions });
            document.dispatchEvent(sessionEvent);
        }

    };

});


export function sendUpdatedData() {
    const snakeInfo = getSnakeProperties();

    if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            type: 'GAME_STATE',
            sessionId: sessionId,
            clientId: clientId, // Use the clientId from session storage
            snakeInfo: snakeInfo
        }));
    } else {
        console.log("WebSocket is not open. ReadyState:", socket.readyState);
        // Optionally, handle the not-ready state, e.g., queue the data or retry later
    }
}

function sendInitialData() {
    const snakeInfo = getSnakeProperties();

    socket.send(JSON.stringify({
        type: 'INITIALIZE',
        sessionId: sessionId,
        clientId: clientId, // Use the clientId from session storage
        snakeInfo: snakeInfo
    }));
}


function updateSessionList(sessions) {
    const sessionList = document.getElementById('sessionList');
    sessionList.innerHTML = ''; // Clear current list

    Object.entries(sessions).forEach(([sessionId, userCount]) => {
        const button = document.createElement('button');
        button.textContent = `Session ${sessionId} (${userCount} users)`;
        button.addEventListener('click', () => {
            window.location.href = `/${sessionId}`;
        });
        sessionList.appendChild(button);
    });
}


// Generate a unique ID for this client
function generateUniqueId() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}