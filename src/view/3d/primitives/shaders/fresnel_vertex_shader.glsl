varying vec3 vPosition;
varying vec3 vNormalView;

void main(){

    vPosition =
        normalize(
            vec3(
                modelViewMatrix *
                vec4(position,1.)
            )
        );

    vNormalView =
        normalize(
            normalMatrix * normal
        );

    gl_Position =
        projectionMatrix *
        modelViewMatrix *
        vec4(position,1.);
}
