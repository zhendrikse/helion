import{$ as e,Br as t,Jn as n,Kn as r,Qr as i,bi as a,dr as o,gi as s,oi as c,si as l,ur as u,xr as d}from"../../../assets/src-mb-KDCno.js";import{t as f}from"../../../assets/milky-way-BfvcUgXL.js";var p=`varying vec2 vUv;

void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    vUv = uv;
}`,m=`precision highp float;

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
}`,h=class extends d{constructor({width:e,height:t,texture:n}){super(),this.uniforms={u_translate:{value:new u(e,t)},u_scale:{value:500},u_rotate:{value:new u(0,0)},u_image:{value:n}}}},g=new a().load(f,function(e){e.minFilter=l,e.magFilter=c,e.generateMipmaps=!0,e.colorSpace=``,e.wrapS=s,e.wrapT=i},void 0,e=>console.error(`Could not load milky-way.jpg:`,e)),_=n.with({htmlDivId:`milkyWayPanoramaContainer`,viewport:{aspectRatio:`2 / 1`},camera:{position:new o(0,0,1),orthographic:!0,controls:!1},infoPanel:{text:`<strong>🌌 Milky way galaxy</strong><br/>This 360&#xb0; panorama of the Milky Way was created by the European Southern Observatory. The source image is in equirectangular coordinates, and is reprojected using the stereographic projection, simulating the view of the night sky from varying positions on Earth.`}}),v=new h({width:_.width,height:_.height,texture:g}),y=new u(-5e-4,25e-5);_.bind(v.onceWith(new e({vertexShader:p,fragmentShader:m,aspectRatio:2}))).runsEvery(1/60).onStep(()=>v.uniforms.u_rotate.value.add(y)).onReset(()=>v.uniforms.u_rotate.value.set(0,0)).append(new r(`Zoom`).withRange(new t(200,1e3,1)).withValue(500).onInput(e=>v.uniforms.u_scale.value=e)).withMouseClickEventListener();