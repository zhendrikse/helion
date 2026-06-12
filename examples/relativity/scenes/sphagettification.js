import {Mesh, MeshBasicMaterial, PerspectiveCamera, Scene, SphereGeometry, WebGLRenderer} from "three";

// const container = document.getElementById("earthContainer");
// const canvas = document.createElement('canvas');
// canvas.class = "applicationCanvas";
// container.appendChild(canvas);

const renderer = new WebGLRenderer({alpha: true, antialias: true});
const canvas = renderer.domElement;
document.body.appendChild(canvas);

const camera = new PerspectiveCamera(50, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
camera.position.set(0, 0, 5);

const material_sun = new MeshBasicMaterial({color: 0xffaa00, opacity: 1, transparent: true});
const sun = new Mesh(new SphereGeometry(1, 30, 30), material_sun);

const scene = new Scene();
scene.add(sun);


function animate(clockTime) {
    renderer.render(scene, camera);

    requestAnimationFrame(animate);
}

requestAnimationFrame(animate);