precision highp float;

uniform sampler2D u_image;
uniform vec2 u_translate;
uniform float u_scale;
uniform vec2 u_rotate;

const float c_pi = 3.14159265358979323846;
const float c_halfPi = c_pi * 0.5;
const float c_twoPi = c_pi * 2.0;

void main() {

    float cosphi0 = cos(u_rotate.y);
    float sinphi0 = sin(u_rotate.y);

    float x = (gl_FragCoord.x - u_translate.x) / u_scale;
    float y = (u_translate.y - gl_FragCoord.y) / u_scale;

    // Inverse stereographic projection
    float rho = sqrt(x * x + y * y);

    float c = 2.0 * atan(rho);
    float sinc = sin(c);
    float cosc = cos(c);

    float lambda = 0.0;
    float phi = 0.0;

    if (rho > 0.000001) {
        lambda = atan(x * sinc, rho * cosc);
        phi = asin(clamp(y * sinc / rho, -1.0, 1.0));
    }

    // Inverse rotation
    float cosphi = cos(phi);

    float x1 = cos(lambda) * cosphi;
    float y1 = sin(lambda) * cosphi;
    float z1 = sin(phi);

    lambda = atan(
        y1,
        x1 * cosphi0 + z1 * sinphi0
    ) + u_rotate.x;

    phi = asin(
        clamp(z1 * cosphi0 - x1 * sinphi0, -1.0, 1.0)
    );

    // Sample the Milky Way panorama
    lambda = mod(lambda + c_pi, c_twoPi);

    vec2 uv = vec2(
        lambda / c_twoPi,
        (phi + c_halfPi) / c_pi
    );

    gl_FragColor = texture2D(u_image, uv);
}