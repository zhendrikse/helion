import{$r as e,Et as t,Jn as n,Qn as r,St as i,Un as a,Wr as o,Yr as s,dr as c,fi as l,it as u,ti as d,tt as f,ui as p,vi as m,yi as h}from"../../../../assets/src-mb-KDCno.js";import{t as g}from"../../../../assets/Solarsystemscope_texture_2k_earth_daymap-CQTO_L4L.js";import{t as _}from"../../../../assets/Earth-clouds-CaADKkW0.js";var v=`/helion/assets/Solarsystemscope_texture_2k_earth_nightmap-BBH1PX2h.jpg`,y=`varying vec2 vUv;
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
}`,C=new f(u),w=new c(10,2,-4),T=i.loader.load(g),E=i.loader.load(v);T.colorSpace=m,E.colorSpace=m;var D=new class extends i{constructor({material:e,cloudsMaterial:t,fresnelMaterial:n,atmosphereMaterial:r}){super({material:e}),this._atmosphere=new p(this._mesh.geometry,r),this._atmosphere.scale.setScalar(1.075),this.add(this._atmosphere),this._fresnel=new p(this._mesh.geometry,n),this._fresnel.scale.setScalar(1.006),this.add(this._fresnel),this._clouds=new p(this._mesh.geometry,t),this._clouds.scale.setScalar(1.02),this._clouds.material.depthWrite=!1,this.add(this._clouds)}set clouds(e){this._clouds.visible=e}set atmosphere(e){this._atmosphere.visible=e}set fresnel(e){this._fresnel.visible=e}synchronizeWith(e){super.synchronizeWith(e),this._clouds.rotation.y=e.time*e.spin*.8}}({material:new h({uniforms:{uDayTexture:{value:T},uNightTexture:{value:E},uSunDirection:{value:w}},vertexShader:x,fragmentShader:S}),cloudsMaterial:new l({map:i.loader.load(_),transparent:!0,opacity:.8,depthWrite:!1,specular:new e(16777215),shininess:10}),fresnelMaterial:new h({uniforms:{uColor:{value:new c(.45,.55,1)},uIntensity:{value:.25}},vertexShader:y,fragmentShader:t,transparent:!0,depthWrite:!1,blending:2}),atmosphereMaterial:new h({uniforms:{u_sunRelPosition:{value:w},u_color:{value:new c(.45,.55,1)}},vertexShader:y,fragmentShader:b,transparent:!0,side:1,depthTest:!0,depthWrite:!1})}),O=new d(13421772,1);O.position.set(w.x,w.y,w.z);var k=performance.now()*.001;n.with({htmlDivId:`earthContainer`,camera:{fieldOfView:45,position:new c(1,1.5,4).multiplyScalar(6)},scene:{background:r.Background.STARS,scale:1e-6},lighting:{enabled:!1},headUpDisplay:{enabled:!1},infoPanel:{text:`<strong>🌎 Earth</strong><br/>• One minute simulation time &#8792; 24 hours<br/>• Mass: ${u.mass} kg<br/> • Radius: ${u.radius} m<br/>• Tilt: ${o(u.tilt)}°<br/> • Spin: ${o(u.spin)}°/h<br/>• Inclination: ${o(u.inclination)}°<br/> • Semi-major axis: ${u.semiMajorAxis} kms<br/>• Eccentricity: ${u.eccentricity}<br/> • Right ascension: ${o(u.rightAscension)}°`}}).addObject3D(new s(8947848,.01)).addObject3D(O).bind(C.alwaysWith(D)).onFrame(e=>{let t=(e-k)*.001;k=e;let n=t*24/60;C.time+=n,D.translation=C.coordinates}).append(new a(`Clouds`).checked(!0).onChange(e=>D.clouds=e).togetherWith(new a(`Atmosphere`).checked(!0).onChange(e=>D.atmosphere=e).togetherWith(new a(`Fresnel`).checked(!0).onChange(e=>D.fresnel=e)))).start();