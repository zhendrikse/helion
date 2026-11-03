uniform vec3 uColor;

varying vec3 vPosition;
varying vec3 vNormalView;

void main(){

    float inner =
        0.2 -
        0.7 *
        min(
            dot(vPosition,vNormalView),
            0.0
        );

    inner = pow(inner,5.0);

    float outer =
        1.0 +
        dot(
            normalize(vPosition),
            normalize(vNormalView)
        );

    outer = pow(outer,2.0);

    float fresnel =
        inner + outer;

    gl_FragColor =
        vec4(uColor,0.7)
        * fresnel;
}
