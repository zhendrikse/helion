uniform sampler2D uDayTexture;
uniform sampler2D uNightTexture;
uniform vec3 uSunDirection;

varying vec2 vUv;
varying vec3 vWorldNormal;

void main() {
    float sunlight = dot(normalize(vWorldNormal), normalize(uSunDirection));
    float dayAmount = smoothstep(-0.12, 0.12, sunlight);

    vec3 dayColor = texture2D(uDayTexture, vUv).rgb;
    vec3 nightColor = texture2D(uNightTexture, vUv).rgb;

    gl_FragColor = vec4(mix(nightColor, dayColor, dayAmount), 1.0);

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}