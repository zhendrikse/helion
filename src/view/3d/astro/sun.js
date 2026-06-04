import {
    Group, Color, SphereGeometry, ShaderMaterial, AdditiveBlending, Mesh, BackSide
} from "three";

/**
 * Original code by Sangil Lee:
 *    https://sangillee.com/2024-06-29-create-realistic-sun-with-shaders/
 */
class SurfaceMaterial {
    constructor(uniforms) {
        this.uniforms = uniforms;
        this.material = new ShaderMaterial({
            uniforms: this.uniforms,
            vertexShader: /* glsl */`
            varying vec3 vPosition;
            varying vec3 vNormalView;

            void main() {
                vPosition = normalize(position);
                vNormalView = normalize(normalMatrix * normal);
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,

            fragmentShader: /* glsl */`
            uniform float uTime;
            varying vec3 vPosition;
            #define NUM_OCTAVES 6

            float random(vec3 st) {
                return fract(sin(dot(st, vec3(12.9898, 78.233, 23.112))) * 12943.145);
            }

            float noise(vec3 p){
                vec3 iPos = floor(p);
                vec3 fPos = fract(p);

                float iTime = floor(uTime * 0.2);
                float fTime = fract(uTime * 0.2);

                vec3 t = smoothstep(0.,1.,fPos);
                float tt = smoothstep(0.,1.,fTime);

                float aa = random(iPos + iTime);
                float ab = random(iPos + iTime + vec3(1.,0.,0.));
                float ac = random(iPos + iTime + vec3(0.,1.,0.));
                float ad = random(iPos + iTime + vec3(1.,1.,0.));
                float ae = random(iPos + iTime + vec3(0.,0.,1.));
                float af = random(iPos + iTime + vec3(1.,0.,1.));
                float ag = random(iPos + iTime + vec3(0.,1.,1.));
                float ah = random(iPos + iTime + vec3(1.,1.,1.));

                float ba = random(iPos + iTime + 1.);
                float bb = random(iPos + iTime + 1. + vec3(1.,0.,0.));
                float bc = random(iPos + iTime + 1. + vec3(0.,1.,0.));
                float bd = random(iPos + iTime + 1. + vec3(1.,1.,0.));
                float be = random(iPos + iTime + 1. + vec3(0.,0.,1.));
                float bf = random(iPos + iTime + 1. + vec3(1.,0.,1.));
                float bg = random(iPos + iTime + 1. + vec3(0.,1.,1.));
                float bh = random(iPos + iTime + 1. + vec3(1.,1.,1.));

                float n0 = mix(
                    mix(
                        mix(aa, ab, t.x),
                        mix(ac, ad, t.x),
                        t.y
                    ),
                    mix(
                        mix(ae, af, t.x),
                        mix(ag, ah, t.x),
                        t.y
                    ),
                    t.z
                );

                float n1 = mix(
                    mix(
                        mix(ba, bb, t.x),
                        mix(bc, bd, t.x),
                        t.y
                    ),
                    mix(
                        mix(be, bf, t.x),
                        mix(bg, bh, t.x),
                        t.y
                    ),
                    t.z
                );

                return mix(n0,n1,tt);
            }

            float fBm(vec3 p, float scale){
                float value = 0.;
                float amp = 0.2;
                p *= scale;
                vec3 angle = vec3(-0.001 * uTime, 0.0001 * uTime, 0.0004 * uTime);
                
                mat3 rotX = mat3(
                    1,0,0,
                    0, cos(angle.x), -sin(angle.x),
                    0, sin(angle.x),  cos(angle.x)
                );

                mat3 rotY = mat3(
                    cos(angle.y), 0 ,sin(angle.y),
                    0, 1, 0,
                    -sin(angle.y), 0, cos(angle.y)
                );

                mat3 rotZ = mat3(
                    cos(angle.z), -sin(angle.z),0,
                    sin(angle.z),  cos(angle.z),0,
                    0, 0, 1
                );

                for(int i = 0; i < NUM_OCTAVES; i++){
                    value += amp * noise(p);
                    p = rotX * rotY * rotZ * p * 2.0;
                    amp *= 0.8;
                }

                return value;
            }

            void main(){
                vec3 st = vPosition;
                vec3 q;
                q.x = fBm(st, 5.);
                q.y = fBm(st + vec3(1.2,3.2,1.52), 5.);
                q.z = fBm(st + vec3(0.02,0.12,0.152), 5.);
                float n = fBm(st + q + vec3(1.82, 1.32, 1.09), 5.);
                vec3 color = mix(vec3(1.0, 0.4, 0.0), vec3(1.0), n * n);
                color = mix(color, vec3(1.0, 0.0, 0.0), q * 0.7);
                gl_FragColor = vec4(color * 1.6, 1.0);
            }
        `
        });
    }
}

class FresnelMaterial {
    constructor(uniforms) {
        this.uniforms = uniforms;
        this.material = new ShaderMaterial({

            uniforms: this.uniforms,

            transparent: true,
            blending: AdditiveBlending,
            depthWrite: false,

            vertexShader: `
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
                `,

            fragmentShader: `
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
                `
        });
    }
}

class GlowMaterial {
    constructor(uniforms) {
        this.uniforms = uniforms;
        this.material = new ShaderMaterial({
            uniforms: this.uniforms,
            transparent: true,
            blending: AdditiveBlending,
            depthWrite: false,
            side: BackSide,
            vertexShader: `
                varying vec3 vPosition;
                varying vec3 vNormalView;

                void main(){
                    vPosition = normalize( vec3(modelViewMatrix * vec4(position,1.)) );
                    vNormalView = normalize(normalMatrix * normal);
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.);
                }
                `,

            fragmentShader: `
                uniform vec3 uColor;
                varying vec3 vPosition;
                varying vec3 vNormalView;

                void main(){
                    float rawIntensity = max( dot(vPosition, vNormalView), 0.0 );
                    float intensity = pow(rawIntensity,4.0);
                    gl_FragColor = vec4(uColor, intensity);
                }
                `
        });
    }
}

export class Sun extends Group {
    bind(body) {
        // Sanity checks
        if (!body.radius)
            throw new Error("Body does not have a radius, hence it cannot be attached to this view.");

        this._body = body;
    }

    render(time) {
        this.uniforms.uTime.value = time * 0.002;
        this.scale.setScalar(this._body.radius);
    }

    constructor({
        color = new Color("#ffcc66")
    } = {}) {
        super();
        this.uniforms = {
            uTime: { value: 0 },
            uColor: { value: color }
        };

        const geometry = new SphereGeometry(1, 128, 128);
        const surface = new Mesh(geometry, new SurfaceMaterial(this.uniforms).material);
        const fresnel = new Mesh(geometry, new FresnelMaterial(this.uniforms).material);
        const glow = new Mesh(geometry, new GlowMaterial(this.uniforms).material);
        fresnel.scale.setScalar(1.02);
        glow.scale.setScalar(1.75);
        this.add(surface);
        this.add(fresnel);
        this.add(glow);
    }

    update(deltaTime) {
        this.uniforms.uTime.value += deltaTime;
    }
}