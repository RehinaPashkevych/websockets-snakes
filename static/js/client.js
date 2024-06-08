import { getSnakeProperties } from './game.js';

const serverUrl = 'ws://localhost:8080';
let socket = new WebSocket(serverUrl);
socket.binaryType = 'blob'; // Ensure binary data is received as Blob objects
const encoder = new TextEncoder();
let binaryData = "";


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
           // sendInitialData();
        }

        if (window.location.pathname === '/') {
            // Set an interval to send FETCH_SESSIONS request every 400 ms
            setInterval(() => {
                if (socket.readyState === WebSocket.OPEN) {
                    const buffer = new ArrayBuffer(1); // Only 1 byte needed for type
                    const view = new DataView(buffer);
                    view.setUint8(0, 0b000 << 5); // 000 for FETCH_SESSIONS (3 bits for type, shifted left)
                    socket.send(buffer);
                }
            }, 400);
        }
            
    };

    socket.onmessage = async function(event) {
        if (event.data instanceof Blob) {
            const blob = event.data; // The data is a Blob
            const arrayBuffer = await blob.arrayBuffer();
            const dataView = new DataView(arrayBuffer);

            //console.log(dataView);
            console.log("Binary message received:", dataViewToBinaryString(dataView));
    
            // Check if the message might be binary by examining the length and content
            if (dataView.byteLength > 1 && isLikelyBinary(dataView)) {
                const type = dataView.getUint8(0) >> 5; // Extract the message type from the first 3 bits
    
                if (type === 0b001) { // 001 for SESSION_LIST
                    const sessions = {};
                    const numSessions = (dataView.byteLength - 1) / 2;
    
                    for (let i = 0; i < numSessions; i++) {
                        const sessionId = dataView.getUint8(1 + i * 2);
                        const userCount = dataView.getUint8(1 + i * 2 + 1); // High nibble for user count
                        sessions[sessionId] = userCount;
                    }
    
                    // Update session list and dispatch event
                    updateSessionList(sessions);
                    const sessionEvent = new CustomEvent('sessionListReceived', { detail: sessions });
                    document.dispatchEvent(sessionEvent);
                    return;
                }
            }
            else{
                // Fallback to assuming it's a JSON message if it's not recognized as binary
                try {
                    const text = await blob.text();
                    const json = JSON.parse(text);
                    handleJsonMessage(json);
                } catch (e) {
                    console.error('Error parsing message:', e);
                }
            }
        }
    };
    
    function handleJsonMessage(data) {
        if (data.type === 'ALL_SNAKES') {
            window.updateAllSnakes(data.snakes);
        } else if (data.type === 'DISCONNECT') {
            console.log(data);
            window.removeSnake(data.clientId); // Implement this function to remove the snake
        }
    }
    
    function isLikelyBinary(dataView) {
        // Check if the first byte is likely to indicate a known binary type
        const firstByte = dataView.getUint8(0);
        const type = firstByte >> 5; // Extract the first 3 bits to determine type
        return type === 0b001; // Extend with other known types if necessary
    }
    

});


export function sendUpdatedData() {
    const snakeInfo = getSnakeProperties();

    if (socket.readyState === WebSocket.OPEN) {

        const message = JSON.stringify({
            type: 'GAME_STATE',
            sessionId: sessionId,
            clientId: clientId, 
            snakeInfo: snakeInfo
        });
         // Use TextEncoder to convert the string to binary data (ArrayBuffer)
         
          binaryData = encoder.encode(message);

        socket.send(binaryData);
    } else {
        console.log("WebSocket is not open. ReadyState:", socket.readyState);
    }
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
    return Math.random().toString(36).substring(2, 12);
}


function dataViewToBinaryString(dataView) {
    let binaryString = '';
    for (let i = 0; i < dataView.byteLength; i++) {
        // Convert each byte to binary, pad with leading zeros to ensure 8 bits per byte,
        // and append a space to separate from the next byte
        binaryString += dataView.getUint8(i).toString(2).padStart(8, '0') + ' ';
    }
    // Trim the trailing space for neatness before returning
    return binaryString.trim();
}

