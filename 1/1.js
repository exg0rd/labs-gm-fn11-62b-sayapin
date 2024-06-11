// 1.js

"use strict";

// Vertex shader program
const VSHADER_SOURCE =
    "attribute vec4 a_Position;\n" +
    "attribute float a_select;\n" +
    "uniform mat4 u_projMatrix;\n" +
    "uniform float u_pointSize;\n" +
    "uniform vec4 u_color;\n" +
    "uniform vec4 u_colorSelect;\n" +
    "varying vec4 v_color;\n" +
    "void main() {\n" +
    "  gl_Position = u_projMatrix * a_Position;\n" +
    "  gl_PointSize = u_pointSize;\n" +
    "  if (a_select != 0.0)\n" +
    "    v_color = u_colorSelect;\n" +
    "  else\n" +
    "    v_color = u_color;\n" +
    "}\n";

// Fragment shader program
const FSHADER_SOURCE =
    "precision mediump float;\n" +
    "varying vec4 v_color;\n" +
    "void main() {\n" +
    "  gl_FragColor = v_color;\n" +
    "}\n";

function main() {
    // Retrieve <canvas> element
    const canvas = document.getElementById("mycanvas");
    canvas.width = document.documentElement.clientWidth;
    canvas.height = document.documentElement.clientHeight;

    // Get the rendering context for 2DCG
    const ctx = canvas.getContext("2d");

    const countSplinePoints = document.getElementById("countSplinePoints");
    const uniform = document.getElementById("uniform");
    const chordal = document.getElementById("chordal");
    const centripetal = document.getElementById("centripetal");

    const gui = new dat.GUI();

    const guiCtrPointsParams = gui.addFolder("Control point parameters");
    const guiSplineParams = gui.addFolder("Spline parameters");

    const controlsParameters = {
        showCtrPoints: true,
        controlPolygon: false,
        lineSpline: false,
        countSplinePoints: 10,
        paramCoords: "uniform",
        visualize: "points",
    };

    guiCtrPointsParams
        .add(Data.controlsParameters, "showCtrPoints")
        .onChange(function (e) {
            Data.draw();
        });
    guiCtrPointsParams
        .add(Data.controlsParameters, "controlPolygon")
        .onChange(function (e) {
            Data.draw();
        });

    guiSplineParams
        .add(Data.controlsParameters, "lineSpline")
        .onChange(function (e) {
            Data.calculateAndDraw();
        });
    guiSplineParams
        .add(Data.controlsParameters, "countSplinePoints", 1, 500, 1)
        .onChange(function (e) {
            Data.calculateAndDraw();
        });
    guiSplineParams
        .add(Data.controlsParameters, "paramCoords", [
            "uniform",
            "chordal",
            "centripetal",
        ])
        .onChange(function (e) {
            Data.calculateAndDraw();
        });
    guiSplineParams
        .add(Data.controlsParameters, "visualize", ["points", "line"])
        .onChange(function (e) {
            Data.draw();
        });

    Data.init(canvas, ctx, controlsParameters);

    // Register function (event handler) to be called on a mouse press
    canvas.onclick = function (ev) {
        click(ev, canvas);
    };

    canvas.onmousemove = function (ev) {
        mousemove(ev, canvas);
    };

    canvas.onmousedown = function (ev) {
        mousedown(ev, canvas);
    };

    canvas.onmouseup = function (ev) {
        mouseup(ev, canvas);
    };
}

class Point {
    constructor(x, y) {
        this.select = false;
        this.x = x;
        this.y = y;
        this.t = 0;
        this.setRect();
    }
    setPoint(x, y) {
        this.x = x;
        this.y = y;
        this.setRect();
    }
    setRect() {
        this.left = this.x - 5;
        this.right = this.x + 5;
        this.bottom = this.y - 5;
        this.up = this.y + 5;
    }
    ptInRect(x, y) {
        const inX = this.left <= x && x <= this.right;
        const inY = this.bottom <= y && y <= this.up;
        return inX && inY;
    }
}

const Data = {
    pointsCtr: [],
    pointsSpline: [],
    canvas: null,
    ctx: null,
    movePoint: false,
    iMove: -1,
    leftButtonDown: false,
    controlsParameters: {
        showCtrPoints: true,
        controlPolygon: false,
        lineSpline: false,
        countSplinePoints: 10,
        paramCoords: "uniform",
        visualize: "points",
    },
    init: function (canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
    },
    setLeftButtonDown: function (value) {
        this.leftButtonDown = value;
    },
    add_coords: function (x, y) {
        const pt = new Point(x, y);
        this.pointsCtr.push(pt);
    },
    mousemoveHandler: function (x, y) {
        if (this.leftButtonDown) {
            if (this.movePoint) {
                this.pointsCtr[this.iMove].setPoint(x, y);

                this.draw();

                if (this.controlsParameters.lineSpline)
                    this.calculateLineSpline();
            }
        } else
            for (let i = 0; i < this.pointsCtr.length; i++) {
                this.pointsCtr[i].select = false;

                if (this.pointsCtr[i].ptInRect(x, y))
                    this.pointsCtr[i].select = true;

                this.draw();
            }
    },
    mousedownHandler: function (button, x, y) {
        if (button == 0) {
            //left button
            this.movePoint = false;

            for (let i = 0; i < this.pointsCtr.length; i++) {
                if (this.pointsCtr[i].select == true) {
                    this.movePoint = true;
                    this.iMove = i;
                }
            }

            this.setLeftButtonDown(true);
        }
    },
    mouseupHandler: function (button, x, y) {
        if (button == 0)
            //left button
            this.setLeftButtonDown(false);
    },
    clickHandler: function (x, y) {
        if (!this.movePoint) {
            this.add_coords(x, y);
            if (this.controlsParameters.lineSpline) this.calculateLineSpline();
            this.draw();
        }
    },
    draw: function () {
        if (this.pointsCtr.length == 0) return;

        // Clear <canvas>
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        // Draw
        if (this.controlsParameters.showCtrPoints) {
            for (const point of this.pointsCtr) {
                if (point.select) this.ctx.fillStyle = "GoldenRod";
                else this.ctx.fillStyle = "black";
                this.ctx.beginPath();
                this.ctx.arc(point.x, point.y, 5, 0, 2 * Math.PI, false);
                this.ctx.fill();
            }
        }
        if (this.controlsParameters.controlPolygon) {
            this.ctx.strokeStyle = "black";
            this.ctx.beginPath();
            for (let i = 0; i < this.pointsCtr.length; i++)
                if (i == 0)
                    this.ctx.moveTo(this.pointsCtr[i].x, this.pointsCtr[i].y);
                else this.ctx.lineTo(this.pointsCtr[i].x, this.pointsCtr[i].y);
            this.ctx.stroke();
        }
        if (this.controlsParameters.lineSpline) {
            switch (this.controlsParameters.visualize) {
                case "points":
                    this.ctx.fillStyle = "red";
                    for (const point of this.pointsSpline) {
                        this.ctx.beginPath();
                        this.ctx.arc(
                            point.x,
                            point.y,
                            3,
                            0,
                            2 * Math.PI,
                            false
                        );
                        this.ctx.fill();
                    }
                    break;
                case "line":
                    this.ctx.strokeStyle = "red";
                    this.ctx.beginPath();
                    for (let i = 0; i < this.pointsSpline.length; i++)
                        if (i == 0)
                            this.ctx.moveTo(
                                this.pointsSpline[i].x,
                                this.pointsSpline[i].y
                            );
                        else
                            this.ctx.lineTo(
                                this.pointsSpline[i].x,
                                this.pointsSpline[i].y
                            );
                    this.ctx.stroke();
                    break;
            }
        }
    },
    calculateAndDraw: function () {
        if (this.controlsParameters.lineSpline) this.calculateLineSpline();

        this.draw();
    },
    calculateLineSpline: function () {
        let i, j;
        let pt;
        let t, x, y, dt, omega;

        // РАССЧИТАТЬ ЗНАЧЕНИЕ ПАРАМЕТРИЧЕСКИХ КООРДИНАТ КОНТРОЛЬНЫХ ТОЧЕК
        const n = this.pointsCtr.length - 1;

        let d = 0;
        for (i = 1; i <= n; i++) {
            d += Math.hypot(
                this.pointsCtr[i].x - this.pointsCtr[i - 1].x,
                this.pointsCtr[i].y - this.pointsCtr[i - 1].y
            );
        }
        let dc = 0;
        for (i = 1; i <= n; i++) {
            dc += Math.sqrt(
                Math.hypot(
                    this.pointsCtr[i].x - this.pointsCtr[i - 1].x,
                    this.pointsCtr[i].y - this.pointsCtr[i - 1].y
                )
            );
        }

        for (i = 0; i < this.pointsCtr.length; i++) {
            switch (this.controlsParameters.paramCoords) {
                case "uniform":
                    this.pointsCtr[i].t = i / n;
                    break;
                case "chordal":
                    {
                        if (i > 0 && i < n)
                            this.pointsCtr[i].t =
                                this.pointsCtr[i - 1].t +
                                Math.hypot(
                                    this.pointsCtr[i].x -
                                        this.pointsCtr[i - 1].x,
                                    this.pointsCtr[i].y -
                                        this.pointsCtr[i - 1].y
                                ) /
                                    d;
                        if (i == n) this.pointsCtr[n].t = 1;
                        if (i == 0) this.pointsCtr[i].t = 0;
                    }
                    break;
                case "centripetal":
                    if (i > 0 && i < n)
                        this.pointsCtr[i].t =
                            this.pointsCtr[i - 1].t +
                            Math.sqrt(
                                Math.hypot(
                                    this.pointsCtr[i].x -
                                        this.pointsCtr[i - 1].x,
                                    this.pointsCtr[i].y -
                                        this.pointsCtr[i - 1].y
                                )
                            ) /
                                dc;
                    if (i == n) this.pointsCtr[n].t = 1;
                    if (i == 0) this.pointsCtr[i].t = 0;

                    break;
            }
        }

        console.log(this.pointsCtr);

        const N = this.controlsParameters.countSplinePoints;
        this.pointsSpline = new Array(N);

        t = this.pointsCtr[0].t;
        dt = (this.pointsCtr[n].t - this.pointsCtr[0].t) / (N - 1);
        i = 0;
        // РАСЧЕТ КООРДИНАТ ТОЧКИ СПЛАЙНА
        for (j = 0; j < N; j++) {
            t = j * dt;
            while (t > this.pointsCtr[i + 1].t) i += 1;
            let h = this.pointsCtr[i + 1].t - this.pointsCtr[i].t;
            omega = (t - this.pointsCtr[i].t) / h;
            x =
                this.pointsCtr[i].x * (1 - omega) +
                this.pointsCtr[i + 1].x * omega;
            y =
                this.pointsCtr[i].y * (1 - omega) +
                this.pointsCtr[i + 1].y * omega;
            pt = new Point(x, y);
            this.pointsSpline[j] = pt;
        }
    },
};

function click(ev, canvas) {
    const x = ev.clientX; // x coordinate of a mouse pointer
    const y = ev.clientY; // y coordinate of a mouse pointer
    const rect = ev.target.getBoundingClientRect();

    Data.clickHandler(x - rect.left, y - rect.top);
}

function mousedown(ev, canvas) {
    const x = ev.clientX; // x coordinate of a mouse pointer
    const y = ev.clientY; // y coordinate of a mouse pointer
    const rect = ev.target.getBoundingClientRect();

    Data.mousedownHandler(EventUtil.getButton(ev), x - rect.left, y - rect.top);
}

function mouseup(ev, canvas) {
    const x = ev.clientX; // x coordinate of a mouse pointer
    const y = ev.clientY; // y coordinate of a mouse pointer
    const rect = ev.target.getBoundingClientRect();

    Data.mouseupHandler(EventUtil.getButton(ev), x - rect.left, y - rect.top);
}

function mousemove(ev, canvas) {
    const x = ev.clientX; // x coordinate of a mouse pointer
    const y = ev.clientY; // y coordinate of a mouse pointer
    const rect = ev.target.getBoundingClientRect();
    //if (ev.buttons == 1)
    //    alert('with left key');
    Data.mousemoveHandler(x - rect.left, y - rect.top);
}