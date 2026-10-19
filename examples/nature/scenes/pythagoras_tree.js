window.addEventListener('DOMContentLoaded', function() {

let defaultDepthLimit = 12,
    minDepthLimit = 1,
    maxDepthLimit = 15;
let defaultAngle = 40,
    minAngle = 10,
    maxAngle = 80;
let defaultScale = 1,
    minScale = 0.5,
    maxScale = 2.5;
let defaultYpos = 0,
    minYpos = -500,
    maxYpos = 500;
let defaultXpos = 0,
    minXpos = -500,
    maxXpos = 500;
let defaultHue = 50,
    minHue = 0,
    maxHue = 360;

const inputDepthLimit = document.querySelector("#n");
const inputAngle = document.querySelector("#alpha");
const inputTriangles = document.querySelector("#triangles");
const inputHue = document.querySelector("#hue");
const inputScale = document.querySelector("#scale");
const inputXpos = document.querySelector("#xpos");
const inputYpos = document.querySelector("#ypos");
const reset = document.querySelector("#reset");

let angle, depthLimit, scale, xpos, ypos, triangles, hue;
let trunkWidth, canvasLayers, ctxLayers;
let startX, startY;

const canvasContainer = document.getElementById("canvascontainer");
const canvas = document.getElementsByTagName("canvas")[0];
const ctx = canvas.getContext("2d");

const loadingWindow = document.createElement("div");
loadingWindow.setAttribute("id","loadingwindow");
const loadSpinner = document.createElement("div");
loadSpinner.setAttribute("id","loadspinner");
loadingWindow.appendChild(loadSpinner);
document.body.appendChild(loadingWindow);
const messageContainer = document.createElement("div");
messageContainer.setAttribute("id","messagecontainer");
canvasContainer.appendChild(messageContainer);

// Hue range settings:
const changeHue = document.querySelector("#changehue");
const changeHueOutputText = changeHue.children[1];
const changeHueOutputColor = changeHue.children[2];
changeHueOutputText.textContent = inputHue.value;
changeHueOutputColor.style.background = "hsl("+inputHue.value+", 100%, 45%)";
inputHue.addEventListener("input", function() {
    changeHueOutputText.textContent = this.value;
    changeHueOutputColor.style.background = "hsl("+this.value+", 100%, 45%)";
});

//window.addEventListener('resize', function() { createTree(); });
// draw initial default tree on load:
resetDefault();
// Draw custom tree on pressing "draw tree" button:
document.querySelector("#drawtree").addEventListener("click", function() {
    createTree();
});
// Draw tree on pressing enter key, if focus is on an input:
const inputs = document.querySelectorAll(".controls input");
if (inputs.length > 0) {
    for (let i = 0; i < inputs.length; i++) {
        inputs[i].addEventListener("keypress", function(event) {
            if (event.key === "Enter") {
                event.preventDefault();
                createTree();
            }
        });
    }
}
// Reset button:
reset.addEventListener("click", function() {
    resetDefault();
});

function createTree() {
    let validInputs = validateInputs();
    if (validInputs) {
        loadingWindow.classList.add("visible");
        // event_loop.html tasks
        setTimeout(() => {
            settings();
            createLayers();
            recursion( 0, startX, startY, 0, trunkWidth );
            mergeCanvasses();
            loadingWindow.classList.remove("visible");
        },1)
    }
};

// Create canvas layers; one for each recursion depth.
function createLayers() {
    canvasLayers = [];
    ctxLayers = [];
    for (let i = 0; i < depthLimit; i++ ) {
        canvasLayers[i] = document.createElement("canvas");
        ctxLayers[i] = canvasLayers[i].getContext("2d");
        resizeCanvas(canvasLayers[i]);
    }
};

/*
This function draws a square and optionally its top right-angled triangle.
The size is depending on the position in the tree.
It also draws from an origin and under an angle, according to its position in the tree,
accomplished by the transformations. The function calls itself to evoke recursion.
This makes the function to each time draw a different size, from a different origin,
under a different angle.
*/
function recursion(depth, originX, originY, rotation, squareSideLength){
    if (depth >= depthLimit) { return; } // stop criterion recursion
    let newOrigin, newRotation;

    ctxLayers[depth].strokeStyle = "#eeeeee"
    ctxLayers[depth].fillStyle = "hsl("+hue+", " + (depth*100/depthLimit) + "%, 45%)";

    // Vertices of the square:
    let vertex1 = transformation(0, 0, originX, originY, rotation);
    let vertex2 = transformation(squareSideLength, 0, originX, originY, rotation);
    let vertex3 = transformation(squareSideLength, -squareSideLength, originX, originY, rotation);
    let vertex4 = transformation(0, -squareSideLength, originX, originY, rotation);

    // Properties of the right-angled triangle on top of the square:
    let leftCathetus = Math.cos(angle) * squareSideLength;
    let rightCathetus = Math.sin(angle) * squareSideLength;
    let altitude = Math.sin(angle) * leftCathetus;
    let vertex5 = transformation(Math.cos(angle) * leftCathetus, -squareSideLength-altitude, originX, originY, rotation);

    // Draw square path:
    ctxLayers[depth].beginPath();
    ctxLayers[depth].moveTo(vertex1.x, vertex1.y);
    ctxLayers[depth].lineTo(vertex2.x, vertex2.y);
    ctxLayers[depth].lineTo(vertex3.x, vertex3.y);
    ctxLayers[depth].lineTo(vertex4.x, vertex4.y);
    ctxLayers[depth].stroke();
    ctxLayers[depth].fill();
    ctxLayers[depth].closePath();

    // Draw triangle path (optional):
    if (triangles && depth < depthLimit-1) {
        ctxLayers[depth].beginPath();
        ctxLayers[depth].moveTo(vertex3.x, vertex3.y);
        ctxLayers[depth].lineTo(vertex4.x, vertex4.y);
        ctxLayers[depth].lineTo(vertex5.x, vertex5.y);
        ctxLayers[depth].stroke();
        ctxLayers[depth].fill();
        ctxLayers[depth].closePath();
    }

    // Rucursion:

    // Left branch:
    newOrigin = transformation(0, -squareSideLength, originX, originY, rotation);
    newRotation = rotation - angle;
    recursion(depth + 1, newOrigin.x, newOrigin.y, newRotation, leftCathetus);

    // Right branch:
    newOrigin = transformation(Math.sqrt(leftCathetus*leftCathetus - altitude*altitude), -squareSideLength - altitude, originX, originY, rotation);
    newRotation = rotation + Math.asin(altitude/rightCathetus);
    recursion(depth + 1, newOrigin.x, newOrigin.y, newRotation, rightCathetus);
};

// Transformation matrix:
// translation to (xNewOrigin,yNewOrigin) and rotation counterclockwise.
function transformation(xNoTransform,yNoTransform,xNewOrigin,yNewOrigin,rotation){
    return {
        x: (xNoTransform * Math.cos(rotation) - yNoTransform * Math.sin(rotation)) + xNewOrigin,
        y: (xNoTransform * Math.sin(rotation) + yNoTransform * Math.cos(rotation)) + yNewOrigin
    }
};

// Stack and merge the layers into one canvas.
function mergeCanvasses(){
    for (let i = 0; i < depthLimit; i++ ) {
        ctx.drawImage(canvasLayers[i], 0, 0);
    }
    /*
    // Add signature:
    ctx.translate(startX,startY);
    ctx.rotate(-90 * Math.PI / 180);
    ctx.fillStyle = "#808080";
    ctx.font = (trunkWidth/14)+"px Arial";
    ctx.fillText("Frido Verweij",0,-(trunkWidth/28));
    */
    console.log("done");
};

// (re)set (size and clear) the canvas and set values
function settings(){
    resizeCanvas(canvas);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    scale /= 10;
    angle = (angle * Math.PI)/180;
    triangles = inputTriangles.checked;
    trunkWidth = canvasContainer.clientWidth * scale;
    startX = (canvasContainer.clientWidth / 2) - (trunkWidth / 2) + xpos;
    startY = ( canvasContainer.clientHeight / 2 ) + (trunkWidth * 2.1) + ypos;
};

// (re)size the canvas
function resizeCanvas(cnvs){
    cnvs.width = canvasContainer.clientWidth;
    cnvs.height = canvasContainer.clientHeight;
};

function getInputs(){
    depthLimit = +inputDepthLimit.value;
    angle = +inputAngle.value;
    scale = +inputScale.value;
    xpos = +inputXpos.value;
    ypos = +inputYpos.value;
    hue = +inputHue.value;
};

function validateInputs(){
    getInputs();
    if (depthLimit < minDepthLimit || depthLimit > maxDepthLimit || !Number.isInteger(depthLimit)) {
        inputDepthLimit.value = "";
        showMessage("Number of iterations must be an integer between "+ minDepthLimit +" and "+ maxDepthLimit);
        return false;
    }
    else if (angle < minAngle || angle > maxAngle || !isNumber(angle)) {
        inputAngle.value = "";
        showMessage("Angle must be a number between "+ minAngle +" and "+ maxAngle);
        return false;
    }
    else if (scale < minScale || scale > maxScale || !isNumber(scale)) {
        inputScale.value = "";
        showMessage("Scale must be a number between "+ minScale +" and "+ maxScale);
        return false;
    }
    else if (xpos < minXpos || xpos > maxXpos || !isNumber(xpos)) {
        inputXpos.value = "";
        showMessage("x-Position must be a number between "+ minXpos +" and "+ maxXpos);
        return false;
    }
    else if (ypos < minYpos || ypos > maxYpos || !isNumber(ypos)) {
        inputYpos.value = "";
        showMessage("y-Position must be a number between "+ minYpos +" and "+ maxYpos);
        return false;
    }
    else if (hue < minHue || hue > maxHue || !isNumber(hue)) {
        inputHue.value = defaultHue;
        showMessage("Hue must be a number between "+ minHue +" and "+ maxHue);
        return false;
    }
    else { return true; }
};

// Reset all values to default and draw tree:
function resetDefault(){
    inputDepthLimit.value = defaultDepthLimit;
    inputAngle.value = defaultAngle;
    inputTriangles.checked = true;;
    inputHue.value = defaultHue;
    inputScale.value = defaultScale;
    inputXpos.value = defaultXpos;
    inputYpos.value = defaultYpos;
    changeHueOutputText.textContent = inputHue.value;
    changeHueOutputColor.style.background = "hsl("+inputHue.value+", 100%, 45%)";
    createTree();
};

function showMessage(message){
    console.log(message);
    messageContainer.textContent = message;
    messageContainer.classList.add("visible");
    setTimeout( function(){
        messageContainer.classList.remove("visible");
        messageContainer.textContent = "";
    }, 3000);
};

function isNumber(n){
    return typeof n === 'number' && !isNaN(n) && isFinite(n);
};

}); 