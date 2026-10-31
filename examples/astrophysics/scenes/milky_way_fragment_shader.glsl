varying vec2 vUv;

uniform sampler2D uImage;
uniform vec2 uResolution;
uniform vec2 uTranslate;
uniform float uScale;
uniform vec2 uRotate;

const float PI = 3.1415926535897932384626433832795;
const float HALF_PI = PI * 0.5;
const float TWO_PI = PI * 2.0;

void main() {
    float x = (gl_FragCoord.x - uTranslate.x) / uScale;
    float y = (uTranslate.y - gl_FragCoord.y) / uScale;

    // Inverse stereographic projection.
    float rho = length(vec2(x, y));
    float c = 2.0 * atan(rho);
    float sinc = sin(c);
    float cosc = cos(c);

    float lambda = 0.0;
    float phi = 0.0;

    // The exact center is a removable singularity in the original equations.
    if (rho > 0.000001) {
        lambda = atan(x * sinc, rho * cosc);
        phi = asin(clamp(y * sinc / rho, -1.0, 1.0));
    }

    // Inverse rotation.
    float cosphi0 = cos(uRotate.y);
    float sinphi0 = sin(uRotate.y);

    float cosphi = cos(phi);
    float x1 = cos(lambda) * cosphi;
    float y1 = sin(lambda) * cosphi;
    float z1 = sin(phi);

    lambda = atan(y1, x1 * cosphi0 + z1 * sinphi0) + uRotate.x;
    phi = asin(clamp(z1 * cosphi0 - x1 * sinphi0, -1.0, 1.0));

    vec2 imageUv = vec2(
        fract((lambda + PI) / TWO_PI),
        clamp((phi + HALF_PI) / PI, 0.0, 1.0)
    );

    gl_FragColor = texture2D(uImage, imageUv);
}
