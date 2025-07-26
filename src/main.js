import './style.css'
import { createClient } from '@supabase/supabase-js';


document.querySelector('#app').innerHTML = `
<h1> Cold Play 2025 </h2>
<img id="ballImage" src="../public/ball-modified.png" style="display:none;" />
 <canvas id="myCanvas" width="520" height="640" style="border:1px solid #000;"></canvas>
 <div id="icons" style="display: none;">
  <i id="cameraIcon" class="fa-solid fa-video fa-2x"></i>
</div>
<div id="lboarddiv">
<div id=allButtons>
<button id="runButton">Start</button>
<button id="stopButton">Stop</button>
<button id="restartButton">Restart</button>
</div>
<div class=leaderBoard>
<h2>Top 10 Leaderboard </h2>
<ul id="leaderboard"></ul>
<div>
 <div id="nameInputContainer">
    <input type="text" id="usernameInput" placeholder="Enter your name" />
  </div>

<div>

`
const storedName = localStorage.getItem("playerName");
const nameInputContainer = document.getElementById("nameInputContainer");

if (storedName) {
  nameInputContainer.style.display = "none"; // hide the input if name already exists
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const canvas = document.getElementById("myCanvas");
const ctx = canvas.getContext("2d");
const ballRadius = 10;
const MAX_SPEED = 10;
let x = canvas.width / 2;
let y = canvas.height - 30;
let dx = 2;
let dy = -2;
let score = 0;

let mouseX = 0;
let mouseY = 0;
let scored = false; // To prevent multiple scoring while hovering

canvas.addEventListener("mousemove", function (e) {
  const rect = canvas.getBoundingClientRect();
  mouseX = e.clientX - rect.left;
  mouseY = e.clientY - rect.top;
});

function drawBall() {
  const img = document.getElementById("ballImage");
  ctx.drawImage(img, x - ballRadius, y - ballRadius, ballRadius * 6, ballRadius * 6);
}


function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBall();
  drawScore();

  // Ball boundary collision
  if (x + dx > canvas.width - ballRadius || x + dx < ballRadius) {
    dx = -dx;
  }
  if (y + dy > canvas.height - ballRadius || y + dy < ballRadius) {
    dy = -dy;
  }

  // Update ball position based on current speed
  x += dx;
  y += dy;

  checkMouseOverBall();
}


const HOVER_RADIUS = ballRadius * 1.5; // Or even 2

function checkMouseOverBall() {
  const dist = Math.sqrt((x - mouseX) ** 2 + (y - mouseY) ** 2);
  if (dist <= HOVER_RADIUS) {
    if (!scored) {
      score++;
      scored = true;

      // Increase speed by 5% per score
      let speed = Math.sqrt(dx ** 2 + dy ** 2);
      const newSpeed = Math.min(speed * 1.05, MAX_SPEED);

      const angle = Math.atan2(dy, dx);
      dx = newSpeed * Math.cos(angle);
      dy = newSpeed * Math.sin(angle);
    }
  } else {
    scored = false;
  }
}

// let userName = document.getElementById('userNameInput').value
// console.log(userName)


function startGame() {
  let username = localStorage.getItem("playerName");

  if (!username) {
    username = document.getElementById("usernameInput").value.trim();
    if (!username) {
      alert("Please enter your name to start the game.");
      return false; // game did not start
    }
    localStorage.setItem("playerName", username);
    nameInputContainer.style.display = "none";
  }

  gameRunning = true;
  score = 0;
  animationId = requestAnimationFrame(gameLoop);
  return true; // game started
}



document.getElementById("runButton").addEventListener("click", () => {
  const didStart = startGame();
  if (didStart) {
    document.getElementById("runButton").disabled = true;
  }
});


let cursorUrl;

function applyIconCursor() {
  const cameraIcon = document.getElementById("cameraIcon");
  if (!cameraIcon) return;

  if (!cursorUrl) {
    const svgData = `
      <svg xmlns="http://www.w3.org/2000/svg" height="32" width="32" viewBox="0 0 576 512" fill="black">
        <path d="M336.2 64H63.8C28.6 64 0 92.6 0 127.8v256.4C0 419.4 28.6 448 63.8 448h272.4c35.2 0 63.8-28.6 63.8-63.8v-70.1l104.8 82.7c21.4 16.9 54.9 1.7 54.9-25.4V140.6c0-27.1-33.5-42.3-54.9-25.4L400 198V127.8C400 92.6 371.4 64 336.2 64z"/>
      </svg>
    `;
    const svgBlob = new Blob([svgData], { type: "image/svg+xml" });
    cursorUrl = URL.createObjectURL(svgBlob);
  }

  canvas.addEventListener("mouseenter", () => {
    canvas.style.cursor = `url(${cursorUrl}) 16 16, auto`;
  });

  canvas.addEventListener("mouseleave", () => {
    canvas.style.cursor = "default";
    // Note: Don't revoke URL unless you won't use it again
  });
}

applyIconCursor();

function drawScore() {
  ctx.font = "20px Arial";
  ctx.fillStyle = "#000"; // Or another contrasting color
  ctx.textAlign = "left";
  ctx.fillText("Score: " + score, 10, 25);
}




// 🔑 Assign/get a unique ID for this browser
let userId = localStorage.getItem('userId');
if (!userId) {
  userId = crypto.randomUUID();
  localStorage.setItem('userId', userId);
}

// 🛠 Save high score to Supabase
async function saveHighScore(score) {
  const username = localStorage.getItem("playerName") || "Anonymous";

  const existing = await supabase
    .from("high_scores")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (existing.data) {
    if (score > existing.data.score) {
      await supabase
        .from("high_scores")
        .update({ score, username })
        .eq("user_id", userId);
    }
  } else {
    await supabase.from("high_scores").insert([
      {
        user_id: userId,
        score,
        username,
      },
    ]);
  }
}


// 🏆 Load top 10 leaderboard
async function getLeaderboard() {
  const { data, error } = await supabase
    .from('high_scores')
    .select('user_id, score, username')
    .order('score', { ascending: false })
    .limit(10);
  if (error) return console.error('Leaderboard error:', error);
  return data;
}

// 📋 Display leaderboard in DOM
async function renderLeaderboard() {
  const board = document.getElementById('leaderboard');
  const list = await getLeaderboard();
  console.log(list)
  board.innerHTML = list
    .map((row, idx) => `<li>${idx + 1}: ${row.username} >> ${row.score}</li>`)
    .join('');
}

// 🎮 At game over / new high score
async function onGameOver(finalScore) {
  stopGame();
  await saveHighScore(finalScore);
  await renderLeaderboard();
}


document.getElementById("stopButton").addEventListener("click", async () => {
  await onGameOver(score);
  document.getElementById("stopButton").disabled = true;
});

let animationId;
let gameRunning = true;

function gameLoop() {
  if (!gameRunning) return;
  draw();
  animationId = requestAnimationFrame(gameLoop);
}




function stopGame() {
  gameRunning = false;
  cancelAnimationFrame(animationId);
}

// Load leaderboard on page load
renderLeaderboard();

const refreshButton = document.getElementById('restartButton');

// Add a click event listener to the button
refreshButton.addEventListener('click', function () {
  // Reload the current page
  location.reload();
  // Or, for a hard reload bypassing the cache:
  // location.reload(true); 
});



