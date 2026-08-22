import{rn as e}from"./src-BtYGL5hb.js";import{$ as t,I as n,Z as r,f as i}from"./OrbitControls-Cf9SQYCz.js";import{t as a}from"./fresnel_fragment_shader-rKZmwurF.js";var o=`varying vec3 vPosition;
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
`,s=`uniform float uTime;
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
`,c=`varying vec3 vPosition;
varying vec3 vNormalView;

void main() {
    vPosition = normalize(position);
    vNormalView = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`,l=class{constructor(e){this.uniforms=e,this.material=new r({uniforms:this.uniforms,vertexShader:c,fragmentShader:s})}},u=class{constructor(e){this.uniforms=e,this.material=new r({uniforms:this.uniforms,transparent:!0,blending:2,depthWrite:!1,vertexShader:o,fragmentShader:a})}},d=class{constructor(e){this.uniforms=e,this.material=new r({uniforms:this.uniforms,transparent:!0,blending:2,depthWrite:!1,side:1,vertexShader:`
                varying vec3 vPosition;
                varying vec3 vNormalView;

                void main(){
                    vPosition = normalize( vec3(modelViewMatrix * vec4(position, 1.)) );
                    vNormalView = normalize(normalMatrix * normal);
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
                }
                `,fragmentShader:`
                uniform vec3 uColor;
                varying vec3 vPosition;
                varying vec3 vNormalView;

                void main(){
                    float rawIntensity = max( dot(vPosition, vNormalView), 0.0 );
                    float intensity = pow(rawIntensity, 4.0);
                    gl_FragColor = vec4(uColor, intensity);
                }
                `})}},f=class extends e{constructor({color:e=new i(`#ffcc66`),speed:r=2}={}){super(),this._speed=r*.001,this.uniforms={uTime:{value:0},uColor:{value:e}};let a=new t(1,128,128),o=new n(a,new l(this.uniforms).material),s=new n(a,new u(this.uniforms).material),c=new n(a,new d(this.uniforms).material);s.scale.setScalar(1.02),c.scale.setScalar(1.75),this.add(o),this.add(s),this.add(c)}canBindTo(e){return e.position&&e.radius&&e.time!==void 0}synchronizeWith(e){this.uniforms.uTime.value=e.time*this._speed,this.scale.setScalar(e.radius)}};export{f as t};