varying vec3 vPosition;
varying vec3 vNormalView;

void main() {
    vPosition = normalize(position);
    vNormalView = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}