import uPlot from 'uplot';

export class UPlotGraph {
    /**
     * @param {Object} options
     * @param {HTMLDivElement} options.plotParentDiv,
     * @param {string[]} options.dataDefinition,
     * @param {number} options.width = 600,
     * @param {number} options.height = 300,
     * @param {string} options.title = '',
     * @param {string} options.xLabel = '',
     * @param {string} options.yLabel = '',
     * @param {number} options.maxPoints = 500,
     * @param {string} options.labelColor = 'green',
     */
    constructor({
        plotParentDiv,
        dataDefinition,
        width = 600,
        height = 300,
        title = '',
        xLabel = '',
        yLabel = '',
        maxPoints = 500,
        labelColor = 'green',
        yRange = null,
    } = /** @type {any} */ ({})) {
        this._maxPoints = maxPoints;
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

        const uPlotOptions = this._uplotOptions(title, width, height, labelColor, xLabel, yLabel, series, yRange);
        const plotDiv = document.createElement('div');
        plotParentDiv.appendChild(plotDiv);
        this._uplotChart = new uPlot(uPlotOptions, this._graphData, plotDiv);
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
        this._uplotChart.setData(this._graphData);
    }
}
