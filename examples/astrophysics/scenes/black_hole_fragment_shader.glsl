varying vec2 vUv;
uniform vec2 uResolution;
uniform float uTime;
uniform vec3 uCamPos;
uniform vec3 uBlackHolePos;
uniform vec3 uRotation;

#define MAX_ITERATIONS 1000
#define STEP_SIZE 0.02
#define PI 3.1415926535897932384626433832795
#define TAU 6.283185307179586476925286766559

float innerDiskRadius = 2.5;
float outerDiskRadius = 7.0;
float diskTwist = 10.0;
float flowRate = 0.6;

vec3 rotate(vec3 v, vec3 angle) {
    float x = v.x;
    float y = v.y;
    float z = v.z;

    float cx = cos(angle.x);
    float cy = cos(angle.y);
    float cz = cos(angle.z);

    float sx = sin(angle.x);
    float sy = sin(angle.y);
    float sz = sin(angle.z);

    float nx = cy * (sz * y + cz * x) - sy * z;
    float ny = sx * (cy * z + sy * (sz * y + cz * x)) + cx * (cz * y - sz * x);
    float nz = cx * (cy * z + sy * (sz * y + cz * x)) - sx * (cz * y - sz * x);

    return vec3(nx, ny, nz);
}

float hash(float n) {
return fract(sin(n) * 753.5453123);
}

float noise(vec3 x) {
  vec3 p = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  float n = p.x + p.y * 157.0 + 113.0 * p.z;

  return mix(mix(mix(hash(n + 0.0), hash(n + 1.0), f.x),
      mix(hash(n + 157.0), hash(n + 158.0), f.x), f.y),
      mix(mix(hash(n + 113.0), hash(n + 114.0), f.x),
      mix(hash(n + 270.0), hash(n + 271.0), f.x), f.y), f.z);
}

// https://iquilezles.org/articles/fbm/
float fbm(vec3 pos, const int numOctaves, const float iterScale, const float detail, const float weight) {
  float mul = weight;
  float add = 1.0 - 0.5 * mul;
  float t = noise(pos) * mul + add;

  for (int i = 1; i < numOctaves; ++i) {
      pos *= iterScale;
      mul = exp2(log2(weight) - float(i) / detail);
      add = 1.0 - 0.5 * mul;
      t *= noise(pos) * mul + add;
  }

  return t;
}

vec4 raytrace(vec3 rayDir, vec3 rayPos) {
vec4 color = vec4(0);
vec3 h = cross(rayPos, rayDir);
float h2 = dot(h, h);
float deltaDiskRadius = outerDiskRadius - innerDiskRadius;
float flowToDisk = (flowRate / TAU / deltaDiskRadius);
float camDist = length(uCamPos);

for (int i = 0; i < MAX_ITERATIONS; i++) {
    float dist2 = dot(rayPos, rayPos);

    if (dist2 < 1.0) return color;
    if (dist2 > 1600.0) break; // early escape for rays far away

    float dist = sqrt(dist2); // taking the sqrt is expensive, so we postponed it till the last moment
    float step = STEP_SIZE * clamp(dist * 0.2, 1.0, 5.0);
    float dist5 = dist2 * dist2 * dist;
    rayDir += -1.5 * h2 * rayPos / dist5 * step;
    vec3 steppedRayPos = rayPos + rayDir * step;

    if (dist > innerDiskRadius && dist < outerDiskRadius && rayPos.y * steppedRayPos.y < 0.0) {
      float diskDist = dist - innerDiskRadius;
      float invDist = inversesqrt(dist2);
      float invSqrtDist = sqrt(invDist);

      float distDiskDivDiskRadius = diskDist / deltaDiskRadius;
      float theta = atan(steppedRayPos.z, steppedRayPos.x);
      vec3 uvw = vec3(
        theta / TAU - diskTwist * invSqrtDist,
        distDiskDivDiskRadius * distDiskDivDiskRadius + flowToDisk,
        steppedRayPos.y * 0.5 + 0.5
      );

      float diskDensity = 1.0 - length(steppedRayPos / vec3(outerDiskRadius, 1.0, outerDiskRadius));
      diskDensity *= smoothstep(innerDiskRadius, innerDiskRadius + 1.0, dist);
      // if (diskDensity < 0.001) continue; // skip noise generation for empty parts of disk

      float densityVariation = fbm(uvw - 0.5, 3, 2.0, 1.0, 7.0);
      float angularVelocity = 1.0 / sqrt(dist);
      diskDensity *= densityVariation * invSqrtDist * invSqrtDist + 0.5 * fbm(rotate(rayPos, vec3(0, -uTime * angularVelocity, 0)), 3, 5.0, 0.1, 0.5);
      float opticalDepth = step * 80.0 * diskDensity;

      // Temperature: T(r)∝r−3/4
      float temp = pow(dist / innerDiskRadius, -0.75);
      temp = clamp(temp, 0.0, 1.0);

      vec3 innerColor = vec3(2.0, 1.6, 1.1);   // hot while/yellow
      vec3 midColor   = vec3(1.2, 0.6, 0.15);  // orange
      vec3 outerColor = vec3(0.8, 0.15, 0.05); // red

      vec3 diskColor =
        mix(
            mix(outerColor, midColor, temp),
            innerColor,
            temp * temp * temp
        );
      // Should make inner disk glow more, but it is barely visible?
      // float emission = pow(1.0 / dist, 1.5);
      // diskColor += vec3(1.0, 0.8, 0.6) * emission * 0.5;

      // Add bloom without loosing too much performance
      float glow = smoothstep(3.0, 1.5, dist);
      diskColor += vec3(1.0, 0.7, 0.4) * glow * 0.3;

      vec3 tangent = normalize(vec3(-steppedRayPos.z, 0.0, steppedRayPos.x));
      float speed = 0.6 * inversesqrt(dist);
      vec3 velocityVec = tangent * speed;
      float velocity = dot(rayDir, velocityVec);
      float dopplerShift = sqrt((1.0 - velocity) / (1.0 + velocity));
      float gravitationalShift = sqrt((1.0 - 2.0 / dist) / (1.0 - 2.0 / camDist));

      float brightness = 2.0;
      return vec4(diskColor * brightness * gravitationalShift * dopplerShift * opticalDepth, 1.0);
    }

    rayPos = steppedRayPos;
}

return color;
}

void main() {
    vec2 uv = (vUv - 0.5) * 2.0 * vec2(uResolution.x / uResolution.y, 1);

    vec3 rayDir = rotate( normalize(vec3(uv, 1)), uRotation);
    vec3 rayPos = rotate(uCamPos, uRotation);

    vec4 color = raytrace(rayDir, rayPos);
    gl_FragColor = color;
}
