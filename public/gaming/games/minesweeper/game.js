// MINESWEEPER GAME

const allowedOrigins = [];
const gridContainer = document.getElementById("grid-container");
const pxSize = 10;

// Set gridContainer width equal to height
if (gridContainer.offsetWidth > gridContainer.offsetHeight) {
    gridContainer.style.setProperty("width", gridContainer.offsetHeight + "px");
} else {
    gridContainer.style.setProperty("height", gridContainer.offsetWidth + "px");
}

window.parent.postMessage({type: "start-game", content: {width: 10, height: 10}}, "*");

window.addEventListener("message", (event) => {
    // Only accept messages from trusted origins
    // if (!["http://localhost:443", "https://wallatext.loca.lt/gaming"].includes(event.origin)) {
    //     return;
    // }

    if (event.data.type === "game-started") {
        
        // Set attribute "draggable" of all squares to "false" during creation
    } else if (event.data.type === "square-result") {
        if (event.data.content === "safe") {

        } else if (event.data.content === "bomb") {
            
        }
    }
});