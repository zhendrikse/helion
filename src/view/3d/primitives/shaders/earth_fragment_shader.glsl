uniform sampler2D u_dayTexture;
uniform sampler2D u_nightTexture;
uniform sampler2D u_normalTexture;
uniform sampler2D u_specTexture;
uniform sampler2D u_cloudTexture;
uniform vec3 u_sunRelPosition; // the relative position of light source
uniform float u_normalPower;
uniform vec3 u_position;
uniform vec3 u_moonPosition;
uniform float u_moonRadius;
uniform float u_sunRadius;

varying mat3 vTbn;
varying vec2 vUv; // texture UV map
varying vec3 vNormal; // normal vector at surface
varying vec3 vPosition;

#define PI (3.141592)

float eclipse(float angleBtw, float angleLight, float angleObs) {
    float angleRatio2 = pow(angleObs / angleLight, 2.);
    float value;
    if (angleBtw > angleLight - angleObs && angleBtw < angleLight + angleObs) {
        if (angleBtw < angleObs - angleLight) {
            value = 0.;
        }else {
            float x = 0.5/angleBtw * (angleBtw*angleBtw + angleLight*angleLight - angleObs*angleObs);
            float ths = acos(x/angleLight);
            float thm = acos((angleBtw-x)/angleObs);
            value = 1./PI * (PI - ths + 0.5 * sin(2. * ths) - thm * angleRatio2 + 0.5 * angleRatio2 * sin(2. * thm));
        }
    } else if (angleBtw > angleLight + angleObs)
        value = 1.;
    else { // angleBtw < angleLight - angleObs
        value = 1. - angleRatio2;
    }

    return clamp(value, 0., 1.);
}

void main( void ) {
    vec3 sunDir = normalize(u_sunRelPosition);

    // Day and night texture with eclipse
    vec3 dayColor = texture2D( u_dayTexture, vUv ).rgb;
    vec3 nightColor = texture2D( u_nightTexture, vUv ).rgb;

    float cosAngleSunToNormal = dot(vNormal, sunDir); // Compute cosine sun to normal
    float mixAmountTexture = 1. / (1. + exp(-20. * cosAngleSunToNormal));
    float mixAmountHemisphere = mixAmountTexture;

    // 2. Eclipse
    vec3 surfacePosition = u_position + vPosition;
    float distSurfaceToSun = length(u_sunRelPosition);
    float cosAngleBtwSunMoon = dot(sunDir, normalize(u_moonPosition - surfacePosition));
    float angleBtwSunMoon = acos(cosAngleBtwSunMoon);
    float distSurfaceToMoon = length(u_moonPosition - surfacePosition);

    mixAmountHemisphere *= eclipse(angleBtwSunMoon, asin(u_sunRadius/distSurfaceToSun), asin(u_moonRadius/distSurfaceToMoon));

    // Normal map texture
    vec3 t_normal = texture2D( u_normalTexture, vUv ).xyz * 2.0 - 1.0;
    vec3 normal = normalize(vTbn * t_normal);
    float cosAngleSunToSurface = dot(normal, sunDir); // Compute cosine sun to normal
    mixAmountTexture *= 1.0 + u_normalPower * (cosAngleSunToSurface - cosAngleSunToNormal);
    mixAmountTexture *= mixAmountHemisphere;
    mixAmountTexture = clamp(mixAmountTexture, 0., 1.);

    // Cloud shadow
    vec3 translVec = 0.0005 * inverse(vTbn) * (vNormal - sunDir);
    vec4 cloudsShadow = texture2D(u_cloudTexture, vUv - translVec.xy);
    mixAmountTexture *= (1. - 0.5*cloudsShadow.a);

    // Combine night and day colors
    vec3 color = mix( nightColor, dayColor, mixAmountTexture ); // Select day or night texture

    // Specular map texture with reflection
    float reflectRatio = texture2D(u_specTexture, vUv).r;
    reflectRatio = 0.3 * reflectRatio + 0.1;
    vec3 reflectVec = reflect(-sunDir, normal); // reflected vector of sunlight
    float specPower = clamp(dot(reflectVec, normalize(cameraPosition - surfacePosition)), 0., 1.); // dot product between reflected light and camera vector
    color += mixAmountTexture * pow(specPower, 2.0) * reflectRatio;

    // cloud
    vec4 cloudsColor = texture2D(u_cloudTexture, vUv);
    cloudsColor.r *= clamp(mixAmountHemisphere, 0.2, 1.);
    cloudsColor.g *= clamp(pow(mixAmountHemisphere, 1.5), 0.2, 1.);
    cloudsColor.b *= clamp(pow(mixAmountHemisphere, 2.0), 0.2, 1.); // Blue light is less scattered than red light
    cloudsColor.a *= clamp(mixAmountHemisphere, 0.1, 1.);
    color = color * (1.0 - cloudsColor.a) + cloudsColor.rgb * cloudsColor.a;

    // render
    gl_FragColor = vec4(color, 1.);
}
