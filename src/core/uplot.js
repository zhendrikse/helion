import uPlot from 'uplot';
import { Interval } from '../model/math/math.js';
import { Colour } from '../view/colormappers.js';

export class UPlotGraph {
    /**
     * @param {{
     *   width?: number
     *   dataDefinition?: any
     *   height?: number 
     *   title?: string
     *   xLabel?: string
     *   yLabel?: string
     *   maxPoints?: number
     *   labelColor?: Colour
     *   yRange?: Interval | null 
     * }} param0 
     */
    constructor({
        dataDefinition,
        width = 0,
        height = 0,
        title = '',
        xLabel = '',
        yLabel = '',
        maxPoints = 500,
        labelColor = Colour.Green,
        yRange = null,
    } = {}) {
        this._maxPoints = maxPoints;
        /** @type {number[][]} */
        this._graphData = [];
        dataDefinition.forEach(() => this._graphData.push([]));

        const series = [{}];
        dataDefinition.slice(1).forEach(dataPoint => {
            const stroke = dataPoint.color?.asHexString ? dataPoint.color.asHexString() : dataPoint.color;
            const fill = dataPoint.fill?.asHexString ? dataPoint.fill.asHexString() : dataPoint.fill;
            series.push({
                label: dataPoint.label,
                stroke,
                fill
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
        if (this._uplotChart) 
            return this;
        
        let [title, width, height, labelColor, xLabel, yLabel, series, yRange] = this._uPlotOptionsArgs;
        if (!width) 
            width = parentDiv.clientWidth || parentDiv.getBoundingClientRect?.().width || 600;
        
        if (!width) // fallback if still 0 (before layout)
            width = 600;
        if (!height) 
            height = Math.round(width * 0.5);
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
     * @param {Colour} labelColor
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
                stroke: labelColor?.asHexString ? labelColor.asHexString() : labelColor,
                font: '12px Arial',
                grid: { stroke: 'rgba(255, 255, 255, 0.2)', width: 1 },
                label: xLabel,
            }, {
                stroke: labelColor?.asHexString ? labelColor.asHexString() : labelColor,
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

export class UPlotBarGraph extends UPlotGraph {
    /**
     * @param {{
     *   values?: number[]
     *   width?: number
     *   height?: number 
     *   title?: string
     *   xLabel?: string
     *   yLabel?: string
     *   color?: Colour
     *   labelColor?: Colour
     *   yRange?: Interval | null 
     * }} param0 
     */
    constructor({
        values, 
        width = 0, 
        height = 0, 
        title = '', 
        xLabel = '', 
        yLabel = '', 
        labelColor = Colour.Green, 
        color = Colour.Green, 
        yRange = null
    } = {}) {
        super({
            dataDefinition: [{label: 'Index'}, {label: yLabel || 'Value', color, fill: color}],
            width, height, title, xLabel, yLabel, labelColor, yRange
        });
        this._values = values ?? [];
        this._graphData = [this._values.map((_, index) => index), this._values.slice()];
    }

    /** @param {HTMLDivElement} parentDiv */
    attach(parentDiv) {
        if (this._uplotChart)
            return this;

        let [title, width, height, labelColor, xLabel, yLabel, series, yRange] = this._uPlotOptionsArgs;
        if (!width)
            width = parentDiv.clientWidth || parentDiv.getBoundingClientRect?.().width || 600;
        if (!width)
            width = 600;
        if (!height)
            height = Math.round(width * 0.5);

        series[1].paths = uPlot.paths.bars({size: [0.7, Infinity]});
        const uPlotOptions = this._uplotOptions(title, width, height, labelColor, xLabel, yLabel, series, yRange);
        uPlotOptions.scales.x = {
            time: false,
            auto: false,
            range: [-0.5, Math.max(0.5, this._values.length - 0.5)]
        };

        const plotDiv = document.createElement('div');
        parentDiv.appendChild(plotDiv);
        this._plotDiv = plotDiv;
        this._uplotChart = new uPlot(uPlotOptions, this._graphData, plotDiv);
        return this;
    }

    /** @param {number[]} values */
    updateValues(values) {
        this._values = values.slice();
        this._graphData = [this._values.map((_, index) => index), this._values.slice()];
        this._uplotChart?.setData(this._graphData);
        return this;
    }
}