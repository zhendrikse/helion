import {
    MathPhysicsModelBehavior, Simulation, Slider, Vec3, Range, TiledPlane,
    FixedIntervalNormalizer, Interval,
    ColorMappers,
    ColorMapper
} from "../../../src/index.js";

class Game {
    constructor(cells) {
        this._cells = cells;
    }

    next_generation() {
        let new_cells = [];
        for (let row = 0; row < this.height(); row++)
            new_cells.push(this.next_row_generation(row));
        this._cells = new_cells;
    }

    next_row_generation(row) {
        let result = [];
        for (let i = 0; i < this.width(); i++)
            result.push(this.cell_at(row, i).next_generation(this.neighbours_for(row, i)));
        return result;
    }

    neighbours_for(row, column) {
        let neighbours = [
            this.cell_at(row - 1, column - 1),
            this.cell_at(row - 1, column),
            this.cell_at(row - 1, column + 1),
            this.cell_at(row,     column - 1),
            this.cell_at(row,     column + 1),
            this.cell_at(row + 1, column - 1),
            this.cell_at(row + 1, column),
            this.cell_at(row + 1, column + 1),
        ];
        return without_nones(neighbours);
    }

    cell_at(row, column) {
        if (column < 0) return null;
        if (column >= this.width()) return null;
        if (row < 0) return null;
        if (row >= this.height()) return null;
        return this._cells[row][column];
    }

    width = () => this._cells[0].length;
    height = () => this._cells.length;
}


function without_nones(list_) {
    let filtered_list = [];
    for (let item of list_)
        if (item !== null)
            filtered_list.push(item);

    return filtered_list;
}

class Cell {
    constructor(alive) {
        this._alive = alive;
    }

    next_generation(neighbours) {
        if (this.is_alive())
            return this._next_generation_when_alive(neighbours);
        return this._next_generation_when_dead(neighbours);
    }

    _next_generation_when_dead(neighbours) {
        return living(neighbours).length === 3
            ? living_cell()
            : dead_cell();
    }

    _next_generation_when_alive(neighbours) {
        const n = living(neighbours).length;
        return (n === 2 || n === 3)
            ? living_cell()
            : dead_cell();
    }

    is_alive() {
        return this._alive;
    }
}

function living(neighbours) {
    let living_neighbours = [];
    for (let neighbour of neighbours)
        if (neighbour.is_alive())
            living_neighbours.push(neighbour);
    return living_neighbours;
}

const dead_cell = () => new Cell(false);
const living_cell = () => new Cell(true);

let cellSize = 2;
let dimension_x = 500;
let dimension_y = 500;
let cellsX = Math.floor(dimension_x / cellSize);
let cellsY = Math.floor(dimension_y / cellSize);

class GameOfLife extends MathPhysicsModelBehavior {
    constructor(nx = cellsX, ny = cellsY, randomStart = true) {
        super();

        this.nx = nx;
        this.ny = ny;

        this._game = null;
        this.newGame();
    }

    newGame(randomStart = true) {
        const cells = [];
        for (let x = 0; x <this.nx; x++) {
            let row = [];
            for (let y = 0; y < this.ny; y++)
                randomStart ?
                    row.push(Math.random() < 0.5 ? dead_cell() : living_cell()) :
                    row.push(dead_cell());
            cells.push(row);
        }

        this._game = new Game(cells);
    }

    valueAt(x, y) {
        return this._game.cell_at(x, y).is_alive() ? 1 : 0;
    }

    rangeAt(resolution) {
        return new Interval(0, 1);
    }

    nextGeneration() {
        this._game.next_generation();
    }
}

class CellColorMapper extends ColorMapper {
    map(value, toTargetColor) {
        toTargetColor.setRGB(0.01, value ===1 ? .75 : 0.01, 0.01);
    }
}

const gameOfLife = new GameOfLife();
const simulation = Simulation.with({
        htmlDivId: "game-of-life",
        camera: {
            position: new Vec3(0, 0, dimension_x * 1.05),
            orthographic: true
        }
    })
    .withMouseClickEventListener()
    .bind(gameOfLife.alwaysWith(new TiledPlane({
        colorMapper: new CellColorMapper(),
        cellSize
    })))
    .runsEvery(.5)
    .onStep(() => gameOfLife.nextGeneration())
    .onReset(() => gameOfLife.newGame())
    .append(new Slider("🏃 Frame rate")
        .withRange(new Range(1, 30, 1))
        .withValue(2)
        .onChange(event => simulation.runsEvery(1 / Number(event.target.value)))
    );


