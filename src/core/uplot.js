import uPlot from 'uplot';
import { Interval } from '../model/math/math';

export class UPlotGraph {
    /**
     * @param {Object} options
     * @param {any} options.dataDefinition,
     * @param {number | null} options.width = null,
     * @param {number | null} options.height = null,
     * @param {string} options.title = '',
     * @param {string} options.xLabel = '',
     * @param {string} options.yLabel = '',
     * @param {number} options.maxPoints = 500,
     * @param {string} options.labelColor = 'green',
     * @param {Interval | null} options.yRange = null no range means auto range
     */
    constructor({
        dataDefinition,
        width = null,
        height = null,
        title = '',
        xLabel = '',
        yLabel = '',
        maxPoints = 500,
        labelColor = 'green',
        yRange = null,
    } = /** @type {any} */ ({})) {
        this._maxPoints = maxPoints;
        /** @type {number[][]} */
        this._graphData = [];
        dataDefinition.forEach(() => this._graphData.push([]));

        const series = [{}];
        dataDefinition.slice(1).forEach(dataPoint => {
            series.push({
                label: dataPoint.label,
                stroke: dataPoint.color,
                fill: dataPoint.fill
            });
        });

        this._uPlotOptionsArgs = [title, width, height, labelColor, xLabel, yLabel, series, yRange ? [yRange.from, yRange.to] : null];
        this._uplotChart = null;
        this._plotDiv = null;
    }

    /**
     * Attach graph to a parent div (fluent API: graph lives elsewhere, Simulation only appends it).
     * @param {HTMLDivElement} parentDiv
     * @returns {UPlotGraph}
     */
    attach(parentDiv) {
        if (this._uplotChart) return this;
        let [title, width, height, labelColor, xLabel, yLabel, series, yRange] = this._uPlotOptionsArgs;
        if (width == null) width = parentDiv.clientWidth || parentDiv.getBoundingClientRect?.().width || 600;
        // fallback if still 0 (before layout)
        if (!width) width = 600;
        if (height == null) height = Math.round(width * 0.5);
        const uPlotOptions = this._uplotOptions(title, width, height, labelColor, xLabel, yLabel, series, yRange);
        const plotDiv = document.createElement('div');
        parentDiv.appendChild(plotDiv);
        this._plotDiv = plotDiv;
        this._uplotChart = new uPlot(uPlotOptions, this._graphData, plotDiv);
        return this;
    }

    /**
     * @param {string} title
     * @param {number} width
     * @param {number} height
     * @param {string} labelColor
     * @param {string} xLabel
     * @param {string} yLabel
     * @param {{}[]} series
     */
    _uplotOptions(title, width, height, labelColor, xLabel, yLabel, series, yRange = null) {
        return {
            title,
            width,
            height,
            scales: yRange
                ? { x: { auto: true }, y: { auto: false, range: yRange } }
                : { x: { auto: true }, y: { auto: true } },
            axes: [{
                stroke: labelColor,
                font: '12px Arial',
                grid: { stroke: 'rgba(255, 255, 255, 0.2)', width: 1 },
                label: xLabel,
            }, {
                stroke: labelColor,
                font: '12px Arial',
                grid: { stroke: 'rgba(255, 255, 255, 0.2)', width: 1 },
                label: yLabel
            }],
            series
        };
    }

    get graphData() { return this._graphData; }

    update() {
        if (this._graphData[0].length > this._maxPoints)
            this._graphData.forEach(arr => arr.shift());
        this._uplotChart?.setData(this._graphData);
    }

    /**
     * Push one row of variables (t, series...) and update chart.
     * Preferred over Simulation.plot() in new code.
     * @param {number[]} variables
     * @returns {UPlotGraph}
     */
    push(variables) {
        for (let i = 0; i < variables.length; ++i)
            this._graphData[i].push(variables[i]);
        this.update();
        return this;
    }

    reset() {
        this._graphData.forEach(arr => arr.length = 0);
        this.update();
        return this;
    }
}
