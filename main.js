'use strict';

let gl;                         // The webgl context.
let surface;                    // A surface model
let shProgram;                  // A shader program
let spaceball;                  // A SimpleRotator object that lets the user rotate the view by mouse.

function deg2rad(angle) {
    return angle * Math.PI / 180;
}


// Constructor
function Model(name) {
    this.name = name;
    this.iVertexBuffer = gl.createBuffer();
    this.iNormalBuffer = gl.createBuffer();
    this.count = 0;

    this.BufferData = function (vertices, normals) {

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STREAM_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iNormalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STREAM_DRAW);

        this.count = vertices.length / 3;
    }

    this.Draw = function () {

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribVertex);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iNormalBuffer);
        gl.vertexAttribPointer(shProgram.iAttribNormal, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribNormal);

        gl.drawArrays(gl.TRIANGLES, 0, this.count);
    }
}


// Constructor
function ShaderProgram(name, program) {

    this.name = name;
    this.prog = program;

    // Location of the attribute variable in the shader program.
    this.iAttribVertex = -1;
    // Location of the uniform specifying a color for the primitive.
    this.iColor = -1;
    // Location of the uniform matrix representing the combined transformation.
    this.iModelViewProjectionMatrix = -1;

    this.Use = function () {
        gl.useProgram(this.prog);
    }
}


/* Draws a colored cube, along with a set of coordinate axes.
 * (Note that the use of the above drawPrimitive function is not an efficient
 * way to draw with WebGL.  Here, the geometry is so simple that it doesn't matter.)
 */
function draw() {
    console.log("hello")
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    /* Set the values of the projection transformation */
    let projection = m4.orthographic(-4, 4, -4, 4, -4, 4);

    /* Get the view matrix from the SimpleRotator object.*/
    let modelView = spaceball.getViewMatrix();

    let rotateToPointZero = m4.axisRotation([0.707, 0.707, 0], 0.7);
    let translateToPointZero = m4.translation(0, 0, -1);

    let matAccum0 = m4.multiply(rotateToPointZero, modelView);
    let matAccum1 = m4.multiply(translateToPointZero, matAccum0);

    /* Multiply the projection matrix times the modelview matrix to give the
       combined transformation matrix, and send that to the shader program. */
    let modelViewProjection = m4.multiply(projection, matAccum1);

    gl.uniformMatrix4fv(shProgram.iModelViewProjectionMatrix, false, modelViewProjection);

    /* Draw the six faces of a cube, with different colors. */
    let color = hexToRgb(document.getElementById('color').value)
    gl.uniform4fv(shProgram.iColor, [color.r, color.g, color.b, 1]);
    // gl.uniform4fv(shProgram.iColor, [1, 1, 0, 1]);
    gl.uniform3fv(shProgram.iP, [-1, -1, -1]);
    gl.uniform3fv(shProgram.iD, [1, 1, 0]);
    gl.uniform1f(shProgram.iR, document.getElementById('r').value);
    gl.uniform1f(shProgram.iF, document.getElementById('f').value);

    surface.Draw();
}

function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16) / 255,
        g: parseInt(result[2], 16) / 255,
        b: parseInt(result[3], 16) / 255
    } : null;
}

let L = 1
let T = 1
let B = 0.5
function CreateSurfaceData() {
    L = document.getElementById('l').value
    T = document.getElementById('t').value
    B = document.getElementById('b').value
    let vertexList = [];
    let normalList = [];
    const numb = 50;
    const uE = 1 / numb;
    const vE = 1.3 / numb;
    for (let u = 0; u < 1; u += uE) {
        for (let v = -0.3; v < 1; v += vE) {
            let vertex1 = directrixSurface(u, v)
            let vertex2 = directrixSurface(u + uE, v)
            let vertex3 = directrixSurface(u, v + vE)
            let vertex4 = directrixSurface(u + uE, v + vE)
            let normal1 = directrixNormal(u, v)
            let normal2 = directrixNormal(u + uE, v)
            let normal3 = directrixNormal(u, v + vE)
            let normal4 = directrixNormal(u + uE, v + vE)
            vertexList.push(
                ...vertex1, ...vertex2, ...vertex3,
                ...vertex3, ...vertex2, ...vertex4,
            )
            normalList.push(
                ...normal1, ...normal2, ...normal3,
                ...normal3, ...normal2, ...normal4,
            )
        }
    }
    return [vertexList, normalList];
}
const pow = Math.pow
function directrixSurface(u, v) {
    let x = u
    let y = (L - u) * Math.tan(v)
    let z = T * (L - u) / L * (((2 * pow(B, 2)) / (4 * pow(L, 2) * pow(Math.tan(v), 2) + pow(B, 2))) - 1)
    return [x, y, z]
}
const e = 0.001;
function directrixNormal(u, v) {
    let uv = directrixSurface(u, v)
    let ue = directrixSurface(u + e, v)
    let ve = directrixSurface(u, v + e)
    const dU = [(uv[0] - ue[0]) / e, (uv[1] - ue[1]) / e, (uv[2] - ue[2]) / e]
    const dV = [(uv[0] - ve[0]) / e, (uv[1] - ve[1]) / e, (uv[2] - ue[2]) / e]
    return m4.normalize(m4.cross(dU, dV))
}

/* Initialize the WebGL context. Called from init() */
function initGL() {
    let prog = createProgram(gl, vertexShaderSource, fragmentShaderSource);

    shProgram = new ShaderProgram('Basic', prog);
    shProgram.Use();

    shProgram.iAttribVertex = gl.getAttribLocation(prog, "vertex");
    shProgram.iAttribNormal = gl.getAttribLocation(prog, "normal");
    shProgram.iModelViewProjectionMatrix = gl.getUniformLocation(prog, "ModelViewProjectionMatrix");
    shProgram.iColor = gl.getUniformLocation(prog, "color");
    shProgram.iP = gl.getUniformLocation(prog, "uP");
    shProgram.iD = gl.getUniformLocation(prog, "uD");
    shProgram.iR = gl.getUniformLocation(prog, "uR");
    shProgram.iF = gl.getUniformLocation(prog, "uF");

    surface = new Model('Surface');
    surface.BufferData(...CreateSurfaceData());

    gl.enable(gl.DEPTH_TEST);
}


/* Creates a program for use in the WebGL context gl, and returns the
 * identifier for that program.  If an error occurs while compiling or
 * linking the program, an exception of type Error is thrown.  The error
 * string contains the compilation or linking error.  If no error occurs,
 * the program identifier is the return value of the function.
 * The second and third parameters are strings that contain the
 * source code for the vertex shader and for the fragment shader.
 */
function createProgram(gl, vShader, fShader) {
    let vsh = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vsh, vShader);
    gl.compileShader(vsh);
    if (!gl.getShaderParameter(vsh, gl.COMPILE_STATUS)) {
        throw new Error("Error in vertex shader:  " + gl.getShaderInfoLog(vsh));
    }
    let fsh = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fsh, fShader);
    gl.compileShader(fsh);
    if (!gl.getShaderParameter(fsh, gl.COMPILE_STATUS)) {
        throw new Error("Error in fragment shader:  " + gl.getShaderInfoLog(fsh));
    }
    let prog = gl.createProgram();
    gl.attachShader(prog, vsh);
    gl.attachShader(prog, fsh);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        throw new Error("Link error in program:  " + gl.getProgramInfoLog(prog));
    }
    return prog;
}


/**
 * initialization function that will be called when the page has loaded
 */
function init() {
    let canvas;
    try {
        canvas = document.getElementById("webglcanvas");
        gl = canvas.getContext("webgl");
        if (!gl) {
            throw "Browser does not support WebGL";
        }
    }
    catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not get a WebGL graphics context.</p>";
        return;
    }
    try {
        initGL();  // initialize the WebGL graphics context
    }
    catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not initialize the WebGL graphics context: " + e + "</p>";
        return;
    }

    spaceball = new TrackballRotator(canvas, draw, 0);

    draw();
}
const UPDATE_INTERVAL = 200;
setInterval(change, UPDATE_INTERVAL);
function change() {
    surface.BufferData(...CreateSurfaceData())
    draw()
}


