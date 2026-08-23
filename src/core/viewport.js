/**
 * Bridge between the simulation, browser DOM, and renderer.
 *
 * containerDiv
 * ├── titleDiv      (dynamic titles)
 * │
 * ├── canvasWrapperDiv
 * │   ├── canvas        (with simulation inside!)
 * │   ├── HUD           (shows head-up display messages)
 * │   └── CSS2D labels  (text labels in the simulation)
 * │
 * ├── SimulationButtonsDiv
 * │   ├── Start/stop    (Start/stop/reset buttons, if present)
 * │
 * ├── AddOnsDiv
 * │   ├── uPlot graph   (Graph, if present)
 * │   ├── details       (Parameter settings menu)
 * │       ├── summary
 * │           ├── dropdowns
 * │           ├── sliders
 * │           ├── buttons
 * │           └── ...
 */
export class Viewport {
    constructor(containerDiv, parameterMenuCollapsed, aspectRatio) {
        this._container = containerDiv;
        this._container.classList.add('helionContainer');
        this._container.style.position = "relative";
        this._container.style.margin = "auto";

        this._titleDiv = document.createElement("div");
        this._titleDiv.classList.add("helionTitle");
        this._titleDiv.style.position = "relative";
        this._titleDiv.style.paddingTop = "15px";
        this._titleDiv.style.left = "0";
        this._titleDiv.style.width = "100%";
        this._titleDiv.style.zIndex = "10";
        this._titleDiv.style.textAlign = "center";
        this._titleDiv.style.pointerEvents = "none";
        this._titleDiv.style.fontSize = "16px";
        this._titleDiv.style.color = "yellow";
        this._container.appendChild(this._titleDiv);

        this._canvasWrapperDiv = document.createElement("div");
        this._canvasWrapperDiv.classList.add("helionCanvasWrapper");

        Object.assign(this._canvasWrapperDiv.style, {
            position: "relative",
            display: "block",
            width: "100%",
            height: "auto",
            aspectRatio: aspectRatio,
            marginBottom: "15px",
            backgroundColor: "transparent",
        });

        this._canvas = document.createElement("canvas");
        this._canvas.classList.add("helionCanvas");

        Object.assign(this._canvas.style, {
            position: "absolute",
            inset: "0",
            display: "block",
            width: "100%",
            height: "100%",
            backgroundColor: "transparent",
        });

        this._canvasWrapperDiv.appendChild(this._canvas);
        this._container.appendChild(this._canvasWrapperDiv);

        this._simulationButtonsDiv = document.createElement("div");
        this._simulationButtonsDiv.classList.add("helionSimulationButtons");
        this._simulationButtonsDiv.style.position = "relative";
        this._simulationButtonsDiv.style.display = "block";
        this._simulationButtonsDiv.style.backgroundColor = "transparent";
        this._simulationButtonsDiv.style.width = "100%";
        this._container.appendChild(this._simulationButtonsDiv);

        this._addOnsDiv = document.createElement("div");
        this._addOnsDiv.classList.add("helionAddOns");
        this._addOnsDiv.style.position = "relative";
        this._addOnsDiv.style.display = "block";
        this._addOnsDiv.style.backgroundColor = "transparent";
        this._addOnsDiv.style.width = "100%";
        this._container.appendChild(this._addOnsDiv);

        this._details = document.createElement("details");
        this._details.classList.add("helionControlGroup");
        const summary = document.createElement("summary");
        summary.classList.add("helionControlSummary");
        summary.textContent = "⚙️ Parameters";
        this._details.appendChild(summary);
        this._details.style.visibility = "hidden";
        this._details.style.paddingBottom = "15px";
        this._details.open = !parameterMenuCollapsed;
        this._addOnsDiv.appendChild(this._details);

        this.#createInfoPanel();
        this.#createFullScreenButton();
    }

    #createInfoPanel() {
        this._infoButton = document.createElement("button");
        this._infoButton.classList.add("helionInfoButton");
        this._infoButton.innerHTML = "𝓲";
        this._infoButton.title = "Info";

        Object.assign(this._infoButton.style, {
            position: "absolute",
            top: "8px",
            right: "42px",
            zIndex: "1000",
            width: "36px",
            height: "36px",
            border: "none",
            borderRadius: "6px",
            background: "rgba(0,0,0,0.25)",
            color: "#d0d0d0",
            fontSize: "20px",
            cursor: "pointer",
            backdropFilter: "blur(4px)"
        });
        this._canvasWrapperDiv.appendChild(this._infoButton);

        this._infoPanelDiv = document.createElement("div");
        this._infoPanelDiv.classList.add("helionInfoPanel");
        this._canvasWrapperDiv.appendChild(this._infoPanelDiv);

        this._infoButton.addEventListener("click", () =>
            this._infoPanelDiv.style.visibility = this._infoPanelDiv.style.visibility === "visible"
                ? "hidden" : "visible"
        );
        this._infoPanelDiv.style.visibility = "hidden";  // Until info button is pressed
        this._infoButton.style.visibility = "hidden";    // Until content is set
    }

    #createFullScreenButton() {
        this._fullscreenButton = document.createElement("button");
        this._fullscreenButton.classList.add("helionFullscreenButton");
        this._fullscreenButton.innerHTML = "⛶";
        this._fullscreenButton.title = "Fullscreen";

        Object.assign(this._fullscreenButton.style, {
            backdropFilter: "blur(4px)",
            background: "rgba(0,0,0,0.25)",
            border: "none",
            borderRadius: "6px",
            color: "white",
            cursor: "pointer",
            fontSize: "20px",
            height: "36px",
            position: "absolute",
            right: "5px",
            top: "8px",
            width: "36px",
            zIndex: "1000"
        });

        document.addEventListener("fullscreenchange", () => {
            this._fullscreenButton.innerHTML =
                document.fullscreenElement ? "⮌" : "⛶";
        });

        document.addEventListener("fullscreenchange", () => {
            window.dispatchEvent(new Event("resize"));
        });

        this._fullscreenButton.addEventListener("click", async () => {
            if (!document.fullscreenElement)
                await this._canvasWrapperDiv.requestFullscreen();
            else
                await document.exitFullscreen();
        });

        this._canvasWrapperDiv.appendChild(this._fullscreenButton);
    }

        // const downloadButton = document.createElement("button");
        // downloadButton.textContent = "Download image";
        // document.body.appendChild(downloadButton);
        //
        // downloadButton.addEventListener("click", () => {
        //     renderer.render(scene, camera); // laatste frame renderen
        //     const link = document.createElement("a");
        //     link.download = "blackhole.png";
        //     link.href = renderer.domElement.toDataURL("image/png");
        //     link.click();
        // });


    get simulationButtonsDiv() { return this._simulationButtonsDiv; }
    get addOnsDiv() { return this._addOnsDiv; }
    get controlsDiv() { return this._details; }
    get canvasWrapper() { return this._canvasWrapperDiv; }
    get canvas() { return this._canvas; }
    get width() { return this._canvasWrapperDiv.clientWidth; }
    get height() { return this._canvasWrapperDiv.clientHeight; }
    get titleDiv() { return this._titleDiv; }

    set infoPanelText(text) {
        this._infoPanelDiv.innerHTML = text;
        this._infoButton.style.visibility = "visible";
    }

    enableParameterMenu() {
        this._details.style.visibility = "visible";
    }
}
