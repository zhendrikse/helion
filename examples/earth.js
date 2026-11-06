import{Dr as e,En as t,Fn as n,Fr as r,Ir as i,Jn as a,Kr as o,Mr as s,Q as c,Qr as l,Wr as u,Zr as d,ct as f,ft as p,jn as m,ti as h}from"../assets/src-C0ywdTCL.js";import{n as g,t as _}from"../assets/Earth-clouds-_AH3-y1O.js";var v=`/helion/assets/Solarsystemscope_texture_2k_earth_nightmap-BBH1PX2h.jpg`,y=`varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vNormalModel;
varying vec3 vNormalView;
varying vec3 vPosition;

void main() {
    vUv = uv;
    vNormal = normalize(mat3(modelMatrix) * normal);
    vNormalModel = normal;
    vNormalView = normalize(normalMatrix * normal);
    vPosition = normalize(vec3(modelViewMatrix * vec4(position, 1.0)).xyz);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`,b=`uniform vec3 u_sunRelPosition;
uniform vec3 u_color; // the color of atmosphere

varying vec3 vNormal;
varying vec3 vNormalView;
varying vec3 vPosition;

void main( void ) {
    vec3 sunDir = u_sunRelPosition;
    vec3 sunDirUnit = normalize(sunDir);

    // Day and night texture
    float cosAngleSunToNormal = dot(vNormal, sunDirUnit); // Compute cosine sun to normal
    float mixAmount = 1. / (1. + exp(-7. * (cosAngleSunToNormal + 0.1))); // Sharpen the edge beween the transition

    // Atmosphere
    float raw_intensity = 3. * max(dot(vPosition, vNormalView), 0.);
    float intensity = pow(raw_intensity, 3.);

    gl_FragColor = vec4(u_color, intensity) * mixAmount;
}`,x=`varying vec2 vUv;
varying vec3 vWorldNormal;

void main() {
    vUv = uv;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`,S=`uniform sampler2D uDayTexture;
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
}`,C=new h(10,2,-4),w=f.loader.load(g),T=f.loader.load(v);w.colorSpace=d,T.colorSpace=d;var E=new class extends f{constructor({material:e,cloudsMaterial:t,fresnelMaterial:n,atmosphereMaterial:r}){super({material:e}),this._atmosphere=new u(this._mesh.geometry,r),this._atmosphere.scale.setScalar(1.075),this.add(this._atmosphere),this._fresnel=new u(this._mesh.geometry,n),this._fresnel.scale.setScalar(1.006),this.add(this._fresnel),this._clouds=new u(this._mesh.geometry,t),this._clouds.scale.setScalar(1.02),this._clouds.material.depthWrite=!1,this.add(this._clouds)}set clouds(e){this._clouds.visible=e}set atmosphere(e){this._atmosphere.visible=e}set fresnel(e){this._fresnel.visible=e}synchronizeWith(e){super.synchronizeWith(e),this._clouds.rotation.y=e.time*e.spin*.8}}({material:new l({uniforms:{uDayTexture:{value:w},uNightTexture:{value:T},uSunDirection:{value:C}},vertexShader:x,fragmentShader:S}),cloudsMaterial:new o({map:f.loader.load(_),transparent:!0,opacity:.8,depthWrite:!1,specular:new r(16777215),shininess:10}),fresnelMaterial:new l({uniforms:{uColor:{value:new h(.45,.55,1)},uIntensity:{value:.25}},vertexShader:y,fragmentShader:p,transparent:!0,depthWrite:!1,blending:2}),atmosphereMaterial:new l({uniforms:{u_sunRelPosition:{value:C},u_color:{value:new h(.45,.55,1)}},vertexShader:y,fragmentShader:b,transparent:!0,side:1,depthTest:!0,depthWrite:!1})}),D=new i(13421772,1);D.position.copy(C);var O=performance.now()*.001;m.with({htmlDivId:`earthContainer`,camera:{fieldOfView:45,position:new a(1,1.5,4).multiplyScalar(6)},scene:{background:n.Background.STARS,scale:1e-6},lighting:{enabled:!1},headUpDisplay:{enabled:!1},infoPanel:{text:`<strong>🌎 Earth</strong><br/>• One minute simulation time &#8792; 24 hours<br/>• Mass: ${c.mass} kg<br/> • Radius: ${c.radius} m<br/>• Tilt: ${e(c.tilt)}°<br/> • Spin: ${e(c.spin)}°/h<br/>• Inclination: ${e(c.inclination)}°<br/> • Semi-major axis: ${c.semiMajorAxis} kms<br/>• Eccentricity: ${c.eccentricity}<br/> • Right ascension: ${e(c.rightAscension)}°`}}).addObject3D(new s(8947848,.01)).addObject3D(D).bind(c.alwaysWith(E)).onFrame(e=>{let t=(e-O)*.001;O=e;let n=t*24/60;c.time+=n,E.translation=c.coordinates}).append(new t(`Clouds`).checked(!0).onChange(e=>E.clouds=e).togetherWith(new t(`Atmosphere`).checked(!0).onChange(e=>E.atmosphere=e).togetherWith(new t(`Fresnel`).checked(!0).onChange(e=>E.fresnel=e)))).start();