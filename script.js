import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import {
  getDatabase,
  ref,
  set,
  onValue,
  update,
  get
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyBWYrsRHqkZQFy-CAs8tavIhfh-nF5NJ8Q",
  authDomain: "tic-tac-toe-game-7c056.firebaseapp.com",
  databaseURL: "https://tic-tac-toe-game-7c056-default-rtdb.firebaseio.com/",
  projectId: "tic-tac-toe-game-7c056",
  storageBucket: "tic-tac-toe-game-7c056.firebasestorage.app",
  messagingSenderId: "391650837376",
  appId: "1:391650837376:web:1e166ef6a1fcc9be10b765"
};


const app = initializeApp(firebaseConfig);
const db = getDatabase(app);


const boxes = Array.from(document.querySelectorAll(".box"));
const resetbtn = document.querySelector("#reset");
const newgamebtn = document.querySelector("#new-game");
const msgcontainer = document.querySelector(".msg-container");
const msg = document.querySelector("#msg");
const createRoomBtn = document.querySelector("#create-room");
const joinRoomBtn = document.querySelector("#join-room");
const roomIdInput = document.querySelector("#room-id-input");
const playerNameInput = document.querySelector("#player-name");
const roomLinkDiv = document.querySelector("#room-link");
const statusDiv = document.querySelector("#status");

let localSymbol = null; 
let roomId = null;
let playerName = "";


const winpatterns = [
  [0,1,2],[3,4,5],[6,7,8],
  [0,3,6],[1,4,7],[2,5,8],
  [0,4,8],[2,4,6]
];


const makeRoomId = () => Math.random().toString(36).slice(2,9).toUpperCase();

createRoomBtn.addEventListener("click", async () => {
  playerName = (playerNameInput.value.trim() || "Player 1");
  const id = makeRoomId();
  roomId = id;
  localSymbol = "O";
  const roomRef = ref(db, `rooms/${roomId}`);
  const initial = {
    board: ["","","","","","","","",""],
    turn: "O",
    players: { O: playerName },
    status: "waiting",
    winner: null,
    winnerName: null,
    updatedAt: Date.now()
  };
  await set(roomRef, initial);
  attachRoomListener(roomId);
  document.getElementById("room-link").innerHTML =
  `✅ Room Created! Share this link with your friend:<br>
   <a href="?room=${roomId}">${location.href}?room=${roomId}</a>`;

document.getElementById("status").innerText = "Waiting for second player to join...";
});


joinRoomBtn.addEventListener("click", async () => {
  playerName = (playerNameInput.value.trim() || "Player 2");
  const id = (roomIdInput.value.trim() || "").toUpperCase();
  if (!id) {
    statusDiv.innerText = "Enter a room id to join.";
    return;
  }
  roomId = id;
  const roomRef = ref(db, `rooms/${roomId}`);
  const snap = await get(roomRef);
  if (!snap.exists()) {
    statusDiv.innerText = `Room ${roomId} not found.`;
    return;
  }
  const room = snap.val();
  if (!room.players || !room.players.O) {
    localSymbol = "O";
    await update(roomRef, { "players/O": playerName, status: "playing", updatedAt: Date.now() });
  } else if (!room.players.X) {
    localSymbol = "X";
    await update(roomRef, { "players/X": playerName, status: "playing", updatedAt: Date.now() });
  } else {
    statusDiv.innerText = "Room already has two players.";
    return;
  }
  attachRoomListener(roomId);
  showRoomJoined(roomId);
});


function attachRoomListener(id) {
  statusDiv.innerText = `Connected to room ${id} as ${localSymbol}.`;
  const r = ref(db, `rooms/${id}`);
  onValue(r, (snapshot) => {
    const data = snapshot.val();
    if (!data) return;
    
    const board = data.board || ["","","","","","","","",""];
    for (let i = 0; i < 9; i++) {
      boxes[i].innerText = board[i] || "";
      boxes[i].disabled = !!board[i] || data.status === "ended" || !localSymbol || data.status === "waiting";
    }
    
    if (data.winner) {
      msg.innerText = `🎉 ${data.winnerName || data.winner} wins!`;
      msgcontainer.classList.remove("hide");
    } else {
      const allFilled = board.every(cell => cell !== "");
      if (allFilled && data.status === "ended") {
        msg.innerText = `It's a draw!`;
        msgcontainer.classList.remove("hide");
      } else {
        msgcontainer.classList.add("hide");
      }
    }
    
    if (data.status === "waiting") {
      statusDiv.innerText = `Waiting for opponent... (You are ${localSymbol})`;
    } else if (data.status === "playing") {
      statusDiv.innerText = `Playing — Turn: ${data.turn}. You are ${localSymbol}.`;
    } else if (data.status === "ended") {
      statusDiv.innerText = `Game ended. ${data.winner ? `${data.winnerName || data.winner} won` : "Draw"}`;
    }
  });
}


boxes.forEach((b, idx) => {
  b.addEventListener("click", async () => {
    if (!roomId) {
      statusDiv.innerText = "Join or create a room first.";
      return;
    }
    if (!localSymbol) {
      statusDiv.innerText = "You don't have a symbol assigned.";
      return;
    }
    const roomRef = ref(db, `rooms/${roomId}`);
    const snap = await get(roomRef);
    if (!snap.exists()) return;
    const data = snap.val();
    if (data.status !== "playing") {
      statusDiv.innerText = "Game not in playing state.";
      return;
    }
    if (data.turn !== localSymbol) {
      statusDiv.innerText = "Not your turn.";
      return;
    }
    const board = data.board || ["","","","","","","","",""];
    if (board[idx]) {
      statusDiv.innerText = "Cell already filled.";
      return;
    }
   
    board[idx] = localSymbol;
    const winner = computeWinner(board);
    const updates = {
      board,
      turn: (localSymbol === "O") ? "X" : "O",
      updatedAt: Date.now()
    };
    if (winner) {
      updates.status = "ended";
      updates.winner = winner;
      updates.winnerName = (data.players && data.players[winner]) ? data.players[winner] : winner;
    } else {
      const allFilled = board.every(c => c !== "");
      updates.status = allFilled ? "ended" : "playing";
    }
    await set(roomRef, Object.assign({}, data, updates));
  });
});


resetbtn.addEventListener("click", () => {
  for (let b of boxes) {
    b.innerText = "";
    b.disabled = false;
  }
  msgcontainer.classList.add("hide");
});


newgamebtn.addEventListener("click", async () => {
  if (!roomId) {
    statusDiv.innerText = "No room active.";
    return;
  }
  const roomRef = ref(db, `rooms/${roomId}`);
  const snap = await get(roomRef);
  if (!snap.exists()) return;
  const room = snap.val();
  const resetState = {
    board: ["","","","","","","","",""],
    turn: "O",
    players: room.players || {},
    status: "playing",
    winner: null,
    winnerName: null,
    updatedAt: Date.now()
  };
  await set(roomRef, resetState);
});


function computeWinner(board) {
  for (const p of winpatterns) {
    const [a, b, c] = p;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  return null;
}
