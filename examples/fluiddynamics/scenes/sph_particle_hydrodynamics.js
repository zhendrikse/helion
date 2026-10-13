let Engine = (function() {

    function Particle() {
        this.x = Math.random()*(xmax-xmin)+xmin;
        this.y = Math.random()*(ymax-ymin)+ymin;
        this.Vx = Math.random()-0.5; // current velocity
        this.Vy = Math.random()-0.5;
        this.rho = 0; // density
        this.P = 0; // pressure
        this.Fx = 0;
        this.Fy = 0;

        // Note that making these properties into an array did not improve performance,
        // at least not as benchmarked in Chrome.

        this.reset = function() {
            this.Fx = 0;
            this.Fy = 0;
            this.rho = m * Wpoly6(0);
        }
    }

    function Grid() {

        function Cell() {
            this.particles = new Array(INIT_MAX_PARTICLES_IN_CELL);
            this.halfNeighbors = new Array(0);
            this.numParticles = 0;
        }

        const INIT_MAX_PARTICLES_IN_CELL = 50;
        this.cells = [];
        this.nx = 0; // # of cells in x direction
        this.ny = 0; // # of cells in y direction
        this.w = 0; // domain width
        this.y = 0; // domain height

        this.init = function(nx, ny, w, h) {
            this.nx = nx;
            this.ny = ny;
            this.w = w;
            this.h = h;
            let numCells = nx*ny;
            this.cells = new Array(numCells);
            for (let i = 0; i < numCells; i++)
                this.cells[i] = new Cell();
            for (let i = 0; i < nx; i++) {
                for (let j = 0; j < ny; j++) {
                    let c = this.cells[i+j*nx]
                    this.computeNeighbors(i, j, c);
                }
            }
        }

        /* References are stored to half of the neighboring cells of center cell C:
        ^ y
        |___________
        |_1_|_2_|_3_|
        |___|_C_|_0_|
        |___|___|___| --> x
        */
        this.computeNeighbors = function(i, j, c) {
            let idx = i + j*this.nx;
            if (i != this.nx - 1)
                c.halfNeighbors.push(this.cells[idx + 1]);
            if (j != this.ny - 1) {
                for (let i2 = Math.max(0, i-1); i2 <= Math.min(this.nx-1, i+1); i2++)
                    c.halfNeighbors.push(this.cells[idx + this.nx + i2 - i]);
            }
        }

        this.reset = function() {
            for (let c of this.cells)
                c.numParticles = 0;
        }

        // also clears references to particles
        this.hardreset = function() {
            for (let c of this.cells) {
                c.numParticles = 0;
                c.particles = new Array(INIT_MAX_PARTICLES_IN_CELL);
            }
        }

        this.getCellFromLocation = function(x, y) {
            let i = Math.floor(this.nx * x / this.w);
            let j = Math.floor(this.ny * y / this.h);
            return this.cells[i + j*this.nx];
        }

        this.addParticleToCell = function(p) {
            let c = this.getCellFromLocation(p.x, p.y);
            if (c != null)
                c.particles[c.numParticles++] = p;
            else
                console.log("Undefined grid cell!");
        }
    }

    let particles = [];
    let grid;

    let h = 1;     // smoothing length
    let h2 = Math.pow(h, 2);
    let h5 = Math.pow(h, 5);
    let h6 = Math.pow(h, 6);
    let h9 = Math.pow(h, 9);
    let Wpoly6_coeff = 315.0 / (64 * Math.PI * h9);
    let Wspiky_grad_coeff = -45.0 / (Math.PI * h6);
    let Wvisc_lapl_coeff = 45.0 / (Math.PI * h5);
    let m = 1.0;	    // Particle mass
    let k = 120;				// Gas constant
    let rho0 = 0;			// Rest density
    let mu = 3;				// Viscosity
    let gx = 0;				// Gravity-x
    let gy = -20;				// Gravity-y

    let xmin, xmax, ymin, ymax; // viewable area in which the fluid can flow
    let xlimit, ylimit; // max possible values of xmax and ymax
    let domainScale = 30;
    let gridCellSize = h;

    let lastTime = performance.now();

    let forceVelocityOn = false;
    let forceVelocityCell = null;
    let forceVx = 0;
    let forceVy = 0;

    // assumption: r2 is less than h2
    function Wpoly6(r2) {
        let temp = h2 - r2;
        return Wpoly6_coeff * temp * temp * temp;
    }

    // assumption: r is less than h
    function Wspiky_grad2(r) {
        let temp = h - r;
        return Wspiky_grad_coeff * temp * temp / r;
    }

    // assumption: r is less than h
    function Wvisc_lapl(r) {
        return Wvisc_lapl_coeff * (1 - r / h);
    }

    function dist2(p1, p2) {
        let dx = p2.x - p1.x;
        let dy = p2.y - p1.y;
        return dx * dx + dy * dy;
    }

    function AddDensity(p1, p2) {
        let r2 = dist2(p1, p2);
        if (r2 < h2) {
            let temp = m * Wpoly6(r2);
            p1.rho += temp;
            p2.rho += temp;
        }
    }

    function CalcDensity() {
        for (const cell of grid.cells)
            for (let i = 0; i < cell.numParticles; i++) {
                const p1 = cell.particles[i];
                //p1.rho = 0;
                // interactions between particles in this cell
                for (let j = i + 1; j < cell.numParticles; j++) {
                    const p2 = cell.particles[j];
                    AddDensity(p1, p2);
                }
                // interactions between particles in neighbor cells
                for (let neighbor of cell.halfNeighbors)
                    for (let j = 0; j < neighbor.numParticles; j++) {
                        const p2 = neighbor.particles[j];
                        AddDensity(p1, p2);
                    }
                p1.P = Math.max(k * (p1.rho - rho0), 0);
            }
    }

    function AddForces(p1, p2) {
        let r2 = dist2(p1, p2);
        if (r2 < h2) {
            let r = Math.sqrt(r2) + 1e-6; // add a tiny bit to avoid divide by zero
            // Eqn. 2.23 pressure-force
            let temp1 = m * (p2.P + p1.P) / (2 * p2.rho) * Wspiky_grad2(r);
            let Fx = temp1 * (p2.x - p1.x);
            let Fy = temp1 * (p2.y - p1.y);
            // Eqn. 2.26 viscosity-force
            let temp2 = mu * m * Wvisc_lapl(r) / p2.rho;
            Fx += temp2 * (p2.Vx - p1.Vx);
            Fy += temp2 * (p2.Vy - p1.Vy);
            p1.Fx += Fx;
            p1.Fy += Fy;
            p2.Fx -= Fx;
            p2.Fy -= Fy;
        }
    }

    function AddWallForces(p1) {
        if (p1.x < xmin + h) {
            let r = p1.x - xmin;
            p1.Fx -= m * p1.P / p1.rho * Wspiky_grad2(r) * r;
        }
        else if (p1.x > xmax - h) {
            let r = xmax - p1.x;
            p1.Fx += m * p1.P / p1.rho * Wspiky_grad2(r) * r;
        }
        if (p1.y < ymin + h) {
            let r = p1.y - ymin;
            p1.Fy -= m * p1.P / p1.rho * Wspiky_grad2(r) * r;
        } else if (p1.y > ymax - h) {
            let r = ymax - p1.y;
            p1.Fy += m * p1.P / p1.rho * Wspiky_grad2(r) * r;
        }
    }

    function CalcForces() {
        for (const cell of grid.cells) {
            for (let i = 0; i < cell.numParticles; i++) {
                const p1 = cell.particles[i];
                // interactions between particles in this cell
                for (let j = i + 1; j < cell.numParticles; j++) {
                    const p2 = cell.particles[j];
                    AddForces(p1, p2);
                }
                // interactions between particles in neighbor cells
                for (let neighbor of cell.halfNeighbors)
                    for (let j = 0; j < neighbor.numParticles; j++) {
                        const p2 = neighbor.particles[j];
                        AddForces(p1, p2);
                    }
                AddWallForces(p1);
            }
        }
    }

    function CalcForcedVelocity() {
        if (!forceVelocityOn || forceVelocityCell == null)
            return;
        for (let i = 0; i < forceVelocityCell.numParticles; i++) {
            let p = forceVelocityCell.particles[i];
            p.Vx = forceVx;
            p.Vy = forceVy;
            p.Fx = 0;
            p.Fy = 0;
        }
        forceVelocityOn = false;
    }

    function UpdatePosition(dT) {
        for (let p of particles) {
            let Ax = p.Fx / p.rho + gx;
            let Ay = p.Fy / p.rho + gy;

            p.Vx += Ax * dT;
            p.Vy += Ay * dT;

            p.x += (p.Vx + 0.5 * Ax * dT) * dT;
            p.y += (p.Vy + 0.5 * Ay * dT) * dT;

            if (p.x < xmin) {
                p.x = xmin + 1e-6;
                p.Vx *= -0.5;
            }
            else if (p.x > xmax) {
                p.x = xmax - 1e-6;
                p.Vx *= -0.5;
            }
            if (p.y < ymin) {
                p.y = ymin + 1e-6;
                p.Vy *= -0.5;
            } else if (p.y > ymax) {
                p.y = ymax - 1e-6;
                p.Vy *= -0.5;
            }

            grid.addParticleToCell(p);

            p.reset();
        }
    }

    return {

        init: function(width, height, left, right, bottom, top) {
            while (left >= width) {
                // assume two identical monitor setup arranged horizontally
                width += width;
            }
            xlimit = width / domainScale;
            xmin = left / domainScale;
            xmax = right / domainScale;

            ylimit = height / domainScale;
            ymin = bottom / domainScale;
            ymax = top / domainScale;

            let numGridCellsX = Math.floor(xlimit / gridCellSize);
            let numGridCellsY = Math.floor(ylimit / gridCellSize);
            grid = new Grid();
            grid.init(numGridCellsX, numGridCellsY, xlimit, ylimit);

            particles = []
        },

        resize: function(left, right, bottom, top) {
            xmin = Math.max(left / domainScale, 0);
            xmax = Math.min(right / domainScale, xlimit);
            ymin = Math.max(bottom / domainScale, 0);
            ymax = Math.min(top / domainScale, ylimit);
        },

        setNumParticles: function(n) {
            let i0 = 0;
            if (particles === undefined) {
                particles = new Array(n);
            }
            else {
                if (n < particles.length) {
                    grid.hardreset();
                    particles.length = n;
                }
                i0 = particles.length;
            }
            for (let i = i0; i < n; i++) {
                particles[i] = new Particle();
                particles[i].rho = m * Wpoly6(0);
            }
        },

        doPhysics : function() {
            CalcDensity();
            CalcForces();
            CalcForcedVelocity();
            grid.reset();
            let now = performance.now();
            let dT = now - lastTime;
            lastTime = now;
            UpdatePosition(dT * 0.001);
        },

        unpause : function() {
            lastTime = performance.now();
        },

        getParticlePosition: function(i, position) {
            let p = particles[i];
            position.x = p.x * domainScale;
            position.y = p.y * domainScale - ymin;
        },

        forceVelocity: function(x, y, Vx, Vy) {
            forceVelocityOn = true;
            forceVelocityCell = grid.getCellFromLocation(x / domainScale, ymax - y / domainScale);
            forceVx = Vx;
            forceVy = -Vy;
        },

        setGravity: function(gravityX, gravityY) {
            gx = gravityX;
            gy = gravityY;
        },

        setFluidProperties: function(mass, gasConstant, restDensity, viscosity) {
            m = mass;
            k = gasConstant;
            rho0 = restDensity;
            mu = viscosity;
        }
    }
})();

import * as THREE from 'three'
//import { GUI } from './dat.gui.module.js'
//import { GUI } from 'three/examples/js/libs/dat.gui.min.js';

window.addEventListener('load', init, false);

let engine = Engine;
let scene, camera, renderer;
let material, circle, meshes;
let left, right, bottom, top, zoomX, zoomY;
let initialOrientation;
let windowMovementInterval = -1;
let paused = false;
// let gui = new GUI();
let fluidParams = {
    NumParticles: 1000,
    ParticleMass: 1.0,
    GasConstant: 120.0,
    RestDensity: 0.5,
    Viscosity: 3,
    GravityX: 0,
    GravityY: -20,
    Color: '#00ff00',
    SetDefaults: function() { /* dummy */ }
}

function init() {
    createScene();
    attachToDocument();
    setNumParticles(fluidParams['NumParticles']);
    addGUI();
    doLoop();
}

function defaultOrientation() {
    this.angle = 0;
}

function reinit() {
    initialOrientation = (screen.orientation || defaultOrientation).angle;
    computeWindowArea();
    engine.init(screen.width, screen.height, left, right, bottom, top);
    setNumParticles(fluidParams['NumParticles']);
    doLoop();
}

function createScene() {
    initialOrientation = (screen.orientation || defaultOrientation).angle;
    computeWindowArea();
    engine.init(screen.width, screen.height, left, right, bottom, top);

    let width = right-left;
    let height = top-bottom;
    let nearPlane = 0;
    let farPlane = 1;
    camera = new THREE.OrthographicCamera( left, right, top, bottom, nearPlane, farPlane);
    camera.position.z = 1

    renderer = new THREE.WebGLRenderer();
    renderer.setSize(width * zoomX, height * zoomY);

    material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
    circle = new THREE.CircleGeometry(5, 8);

    scene = new THREE.Scene();
    renderer.render(scene, camera);
}

function attachToDocument() {
    document.body.appendChild( renderer.domElement );

    window.addEventListener('resize', handleWindowResize, false);
    window.addEventListener('mouseout', handleMouseOut, false);
    window.addEventListener('visibilitychange', handleVisibilityChange, false);
    renderer.domElement.addEventListener('mousemove', handleMouseMove, false);
    renderer.domElement.addEventListener('touchmove', handleTouchMove, false);
    renderer.domElement.addEventListener('touchend', handleTouchEnd, false);
    renderer.domElement.addEventListener('touchcancel', handleTouchEnd, false);
}

function handleVisibilityChange(e) {
    if (paused && !document.hidden) {
        engine.unpause();
    }
    paused = document.hidden;
}

function handleMouseOut(e){
    // if the mouse leaves the window, watch for window movement on screen and adjust the simulation domain appropriately
    if (windowMovementInterval == -1 && e.toElement == null && e.relatedTarget == null) { // really outside the window
        windowMovementInterval = setInterval(function() {
            let prevL = left;
            let prevR = right;
            let prevB = bottom;
            let prevT = top;
            computeWindowArea();
            if (left != prevL || right != prevR || bottom != prevB || top != prevT) {
                handleWindowResize();
            }
        }, 10);
    }
}

function handleWindowResize() {
    computeWindowArea();

    let width = right-left;
    let height = top-bottom;
    let aspectRatio = width/height;

    let angleDiff = (screen.orientation || defaultOrientation).angle - initialOrientation;
    if (Math.abs(angleDiff) > 1) {
        reinit();
        // TODO when ScreenOrientation.lock() API is more mature, lock it
    } else {
        engine.resize(left, right, bottom, top);
        renderer.setSize(width * zoomX, height * zoomY);
        camera.rotation.z = 0;
        camera.position.x = 0;
        camera.position.y = 0;
    }

    renderer.setSize(width * zoomX, height * zoomY);
    camera.aspect = aspectRatio;
    camera.left = left;
    camera.right = right;
    camera.top = top;
    camera.bottom = bottom;
    camera.updateProjectionMatrix();
}

function computeWindowArea() {
    // the width and height pad/bars estimate can be calculated less than zero on mobile due to zooming
    let widthPadEstimate = Math.max(window.outerWidth - window.innerWidth, 0);
    left = window.screenX + widthPadEstimate/2;
    right = window.screenX + window.outerWidth - widthPadEstimate/2;
    // note positive screen y is measured top-down, positive fluid sim y is measured bottom-up
    // assume address bar, toolbars, favs, menus, are all at the top
    let topBarsHeightEstimate = Math.max(window.outerHeight - window.innerHeight, 0);
    bottom = screen.height - window.screenY - window.outerHeight;
    top = screen.height - window.screenY - topBarsHeightEstimate;

    // on mobile, innerWidth/Height can be larger than outerWidth/Height, requiring some renderer zooming
    zoomX = window.innerWidth > window.outerWidth ? window.innerWidth / window.outerWidth : 1;
    zoomY = window.innerHeight > window.outerHeight ? window.innerHeight / window.outerHeight : 1;
    let isProbablyMobileDevice = window.innerWidth > window.outerWidth || window.innerHeight > window.outerHeight;
    if (isProbablyMobileDevice) {
        // also on mobile, just use the entire screen due to keyboards and url input boxes taking up lots'a'space
        left = 0;
        right = screen.width;
        bottom = 0;
        top = screen.height;
    }
}

function handleMouseMove(e) {
    if (windowMovementInterval != -1) {
        clearInterval(windowMovementInterval);
        windowMovementInterval = -1;
    }
    engine.forceVelocity(e.clientX+left, e.clientY/*+bottom*/, e.movementX, e.movementY);
}

let lastX = undefined;
let lastY = undefined;

function handleTouchMove(e) {
    if (windowMovementInterval != -1) {
        clearInterval(windowMovementInterval);
        windowMovementInterval = -1;
    }
    if (e.touches.length > 0) {
        let touch = e.changedTouches[0];
        let tx = touch.clientX/zoomX;
        let ty = touch.clientY/zoomY;
        if (lastX != undefined && lastY != undefined) {
            let dx = tx - lastX;
            let dy = ty - lastY;
            engine.forceVelocity(tx+left, ty/*+bottom*/, dx, dy);
        }
        lastX = tx;
        lastY = ty;
    }
    // TODO incorporate window.devicePixelRatio?
}

function handleTouchEnd(e) {
    lastX = undefined;
    lastY = undefined;
}

function setNumParticles(n) {
    let i0 = 0;
    if (meshes == undefined) {
        meshes = new Array(n);
    }
    else {
        if (n < meshes.length) {
            for (var i = n; i < meshes.length; i++) {
                scene.remove(meshes[i]);
            }
            meshes.length = n;
        }
        i0 = meshes.length;
    }

    engine.setNumParticles(n);

    for (var i = i0; i < n; i++) {
        var m = new THREE.Mesh(circle, material);
        meshes[i] = m;
        scene.add(m);
    }
}

function addGUI() {
    // gui.add(fluidParams, 'NumParticles', 0, 5000).step(10).onFinishChange(function(n) {
    //     setNumParticles(n);
    // });
    // gui.add(fluidParams, 'ParticleMass', 1, 1000).onChange(updateFluidProperties);
    // gui.add(fluidParams, 'GasConstant', 1, 1000).onChange(updateFluidProperties);
    // gui.add(fluidParams, 'RestDensity', 0, 10).onChange(updateFluidProperties);
    // gui.add(fluidParams, 'Viscosity', 0, 10).onChange(updateFluidProperties);;
    // gui.add(fluidParams, 'GravityX', -100, 100).step(10).onChange(updateGravity);
    // gui.add(fluidParams, 'GravityY', -100, 100).step(10).onChange(updateGravity);
    // gui.addColor(fluidParams, 'Color').onChange(function(c) {
    //     material.color.set(c);
    // });
    // gui.add(fluidParams, 'SetDefaults').onChange(function() {
    //     for (var i in gui.__controllers) {
    //         let controller = gui.__controllers[i];
    //         if (controller.property != 'SetDefaults') {
    //             controller.setValue(controller.initialValue);
    //         }
    //     }
    //     setNumParticles(fluidParams['NumParticles']);
    // });
}

function updateGravity() {
    engine.setGravity(fluidParams['GravityX'], fluidParams['GravityY']);
}

function updateFluidProperties() {
    let mass = fluidParams['ParticleMass'];
    let gasConstant = fluidParams['GasConstant'];
    let restDensity = fluidParams['RestDensity'];
    let viscosity = fluidParams['Viscosity']
    engine.setFluidProperties(mass, gasConstant, restDensity, viscosity);
}

function doLoop() {
    engine.doPhysics();
    for (var i = 0; i < meshes.length; i++)
        engine.getParticlePosition(i, meshes[i].position)
    renderer.render(scene, camera);
    requestAnimationFrame(doLoop);
}

