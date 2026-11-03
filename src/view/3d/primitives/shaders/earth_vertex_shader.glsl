varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;
varying mat3 vTbn;

attribute vec4 tangent; // "geometry.computeTangents()" is needed.

void main() {
    vUv = uv;
    vNormal = normalize(mat3(modelMatrix) * normal);
    vPosition = mat3(modelMatrix) * position;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);

    vec3 t = normalize(tangent.xyz);
    vec3 n = normalize(normal.xyz);
    vec3 b = normalize(cross(t, n));

    t = mat3(modelMatrix) * t;
    b = mat3(modelMatrix) * b;
    n = mat3(modelMatrix) * n;
    vTbn = mat3(t, b, n);
}
