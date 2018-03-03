/**
 * This object is in charge of graphics handling. No other logic must be here.
 *
 * Can draw, redraw and clear our board from elements.
 *
 * Also, by given coordinates, can return specified objects.
 */
class Renderer {

    /**
     * The default constructor for the Renderer-Board object.
     *
     * game - A reference to the parent Game object.
     * svgId - HTML ID of the game board's SVG element.
     * width -  The number of squares in the horizontal direction.
     * height - The number of squares in the vertical direction.
     */
    constructor(game, svgId, width, height) {

        this._game = game;
        this._svgId = svgId;
        this._width = width;
        this._height = height;

        /* The element, we are going to use for doing all the drawing. */
        this._svg = document.getElementById(svgId);

        /*
         * Format the game board parameters.
         * Used to draw the correct number of dots and squares.
         */
        this._boxWidth = this.svg.width.baseVal.value;
        this._boxHeight = this.svg.height.baseVal.value;
        this._squareWidth = this.boxWidth / (width + 1);
        this._squareHeight = this.boxHeight / (height + 1);

        /* 2D array of vertices. */
        this._vertices = [];

        /* Lines connecting the vertices. */
        this._lines = [];

        /* Used only for drawing a player's color when a square is claimed. */
        this._squares = [];
    }

    /**
     * Draws the initial dots, lines, and squares.
     *
     * At the beginning they are going to be empty == not claimed.
     */
    init() {

        this.initVertices();
        this.initLines();
        this.initSquares();
    }

    /**
     * This function is called any time, we either lost state, and want
     * to redraw everything.
     */
    reDraw() {
        this.dispose();
        this.init();
    }

    /**
     * Zero out all arrays with graphical items.
     */
    dispose() {
        this.disposeVertices();
        this.disposeLines();
        this.disposeSquares();
    }

    /**
     * Logical alias to `reDraw()` function. Use this one, when
     * you finished the game, and want to start new one.
     */
    reStart() {
        this.reDraw();
    }

    /**
     * Create grid, using vertices.
     *
     * The main idea here, is that vertex is placed,
     * in every corner of a claimable square.
     *
     * Totally, there are going to be (numberOfSquaresInLine + 1) vertices ->
     *  Overall (numberOfSquaresInLine + 1) ** 2.
     */
    initVertices() {

        for (let y = 0; y <= this.height; y++) {
            this.vertices[y] = [];
            for (let x = 0; x <= this.width; x++) {
                this.vertices[y][x] = new Vertex(this, x, y);
            }
        }

    }

    /**
     * Clear out the vertices array.
     */
    disposeVertices() {
        for (let y = 0; y <= this.height; y++) {
            for (let x = 0; x <= this.width; x++) {
                delete this.vertices[y][x].pop();
            }
        }
        console.log(this.vertices);
    }

    /**
     * Create Line object between each vertex.
     *
     * Lines come in two different flavours - 'horizontal' and 'vertical'.
     *
     * Important to note, that we count from top most left corner.
     */
    initLines() {

        /* This is the index of line in the single dimensional array. */
        let index = 0;

        /*
         *       1 2
         *      *-*-*
         *      |3|4|
         *      *-*-*
         *      |5|6|
         *      *-*-*
         *
         */

        /* Draw the horizontal lines */
        for (let y = 0; y < this.vertices.length; y++) {
            for (let x = 0; x < this.vertices[y].length - 1; x++) {
                let line = new Line(this, 'horizontal', index, this.vertices[y][x], this.vertices[y][x + 1]);
                this.lines.push(line);
                index++;
            }
        }

        /*
         *      *--*--*
         *     7| 8| 9|
         *      *--*--*
         *    10|11|12|
         *      *--*--*
         */

        /* Draw the vertical lines. */
        for (let y = 0; y < this.vertices.length - 1; y++) {
            for (let x = 0; x < this.vertices[y].length; x++) {
                let line = new Line(this, 'vertical', index, this.vertices[y][x], this.vertices[y + 1][x]);
                this.lines.push(line);
                index++;
            }
        }
    }

    /**
     * Clears out created Lines array, at the same time
     *  disposing the objects from them.
     */
    disposeLines() {
        for (let i = this.lines.length; i > 0; i--) {
            delete this.lines.pop();
        }
    }

    /**
     * Create squares. In current implementation, they do not amount to any `logical`
     *  part. All they do, is hold reference to who claimed the object.
     */
    initSquares() {

        let squareOffset = new Vertex(this, 0, 0).radius;

        let index = 0;
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                let square = new Square(this, x, y, index, squareOffset);
                this.squares.push(square);
                index++;
            }
        }
    };

    /**
     * Disposes squares list.
     *
     * Note: I apply 3 different techniques of clearing the array.
     */
    disposeSquares() {
        this.squares.length = 0;
    }

    /**
     * Will draw all the visible objects.
     */
    draw() {

        // draw the squares (invisible until a player claims them)
        for (let i = 0; i < this.squares.length; i++) {
            for (let j = 0; j < this.squares[i].length; j++) {
                this.squares[i][j].draw();
            }
        }

        // draw the lines
        for (let i = 0; i < this.lines.length; i++) {
            this.lines[i].draw();
        }

        // draw the vertices (should be on top of the lines)
        for (let i = 0; i < this.vertices.length; i++) {
            for (let j = 0; j < this.vertices[i].length; j++) {
                this.vertices[i][j].draw();
            }
        }
    }

    /**
     * Return line object(not real SVG thing, but our wrapper of it) by it's coordinates.
     *
     * Note: If out of bounds, or any other mistake, will return `null`.
     *  That means, that one needs to check for zeros.
     */
    getLine(coord1, coord2) {

        /* First coordinate out of bounds. */
        if (coord1[0] < 0 || coord1[1] < 0 || coord1[0] > this.width || coord1[1] > this.height) {
            return null;
        }
        /* Second coordinate out of bounds. */
        else if (coord2[0] < 0 || coord2[1] < 0 || coord2[0] > this.width || coord2[1] > this.height) {
            return null;
        }

        let lineDOM = document.getElementById('line-' + coord1[0] + '-' + coord1[1] + '-' + coord2[0] + '-' + coord2[1]);
        return !lineDOM ? null : this.lines[parseInt(lineDOM.getAttribute('data-index'))];
    }

    /**
     * Return square object(not real SVG thing, but our wrapper of it) by it's top most left corner coordinate.
     *
     * Note: If out of bounds, or any other mistake, will return `null`.
     *  That means, that one needs to check for zeros.
     *
     */
    getSquare(topLeftCornerCoordinate) {

        /* Too high, or too low. */
        if (
            topLeftCornerCoordinate[0] < 0 ||
            topLeftCornerCoordinate[1] < 0 ||
            topLeftCornerCoordinate[0] > this.width - 1 ||
            topLeftCornerCoordinate[1] > this.height - 1
        ) {
            return null;
        }

        let squareDOM = document.getElementById(
            'square-' + topLeftCornerCoordinate[0] + '-' + topLeftCornerCoordinate[1]
        );
        return !squareDOM ? null : this.squares[parseInt(squareDOM.getAttribute('data-index'))];
    }

    /* Getter functions for this class. */

    get game() {
        return this._game;
    }

    get squareHeight() {
        return this._squareHeight;
    }

    get squareWidth() {
        return this._squareWidth;
    }

    get boxWidth() {
        return this._boxWidth;
    }

    get boxHeight() {
        return this._boxHeight;
    }

    get svg() {
        return this._svg;
    }

    get vertices() {
        return this._vertices;
    }

    get lines() {
        return this._lines;
    }

    get squares() {
        return this._squares;
    }

    get svgId() {
        return this._svgId;
    }

    get width() {
        return this._width;
    }

    get height() {
        return this._height;
    }
}
