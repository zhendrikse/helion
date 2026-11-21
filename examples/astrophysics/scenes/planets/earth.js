import{$n as e,$r as t,Ct as n,Dt as r,Wn as i,Yn as a,Yr as o,at as s,fi as c,fr as l,nt as u,ti as d,ui as f,vi as p,yi as m}from"../../../../assets/src-BpGOP1ZC.js";import{t as h}from"../../../../assets/Solarsystemscope_texture_2k_earth_daymap-CQTO_L4L.js";import{t as g}from"../../../../assets/Earth-clouds-CaADKkW0.js";var _=`/helion/assets/Solarsystemscope_texture_2k_earth_nightmap-BBH1PX2h.jpg`,v=`varying vec2 vUv;
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
`,y=`uniform vec3 u_sunRelPosition;
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
}`,b=`varying vec2 vUv;
varying vec3 vWorldNormal;

void main() {
    vUv = uv;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`,x=`uniform sampler2D uDayTexture;
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
}`,S=new u(s),C=new l(10,2,-4),w=n.loader.load(h),T=n.loader.load(_);w.colorSpace=p,T.colorSpace=p;var E=new class extends n{constructor({material:e,cloudsMaterial:t,fresnelMaterial:n,atmosphereMaterial:r}){super({material:e}),this._atmosphere=new f(this._mesh.geometry,r),this._atmosphere.scale.setScalar(1.075),this.add(this._atmosphere),this._fresnel=new f(this._mesh.geometry,n),this._fresnel.scale.setScalar(1.006),this.add(this._fresnel),this._clouds=new f(this._mesh.geometry,t),this._clouds.scale.setScalar(1.02),this._clouds.material.depthWrite=!1,this.add(this._clouds)}set clouds(e){this._clouds.visible=e}set atmosphere(e){this._atmosphere.visible=e}set fresnel(e){this._fresnel.visible=e}synchronizeWith(e){super.synchronizeWith(e),this._clouds.rotation.y=e.time*e.spin*.8}}({material:new m({uniforms:{uDayTexture:{value:w},uNightTexture:{value:T},uSunDirection:{value:C}},vertexShader:b,fragmentShader:x}),cloudsMaterial:new c({map:n.loader.load(g),transparent:!0,opacity:.8,depthWrite:!1,specular:new t(16777215),shininess:10}),fresnelMaterial:new m({uniforms:{uColor:{value:new l(.45,.55,1)},uIntensity:{value:.25}},vertexShader:v,fragmentShader:r,transparent:!0,depthWrite:!1,blending:2}),atmosphereMaterial:new m({uniforms:{u_sunRelPosition:{value:C},u_color:{value:new l(.45,.55,1)}},vertexShader:v,fragmentShader:y,transparent:!0,side:1,depthTest:!0,depthWrite:!1})}),D=new d(13421772,1);D.position.set(C.x,C.y,C.z);var O=performance.now()*.001;a.with({htmlDivId:`earthContainer`,camera:{fieldOfView:45,position:new l(1,1.5,4).multiplyScalar(6)},scene:{background:e.Background.STARS,scale:1e-6},lighting:{enabled:!1},headUpDisplay:{enabled:!1},infoPanel:{text:`<strong>🌎 Earth</strong><br/>• One minute &#8792; 24 hours.<br/>• The fifth-largest planet.<br/>• Approx. 71% of its surface is covered by water.<br/>• Atmosphere: mainly nitrogen and oxygen.<br/>• Average surface temperature is approx. 15°C.<br/>• The moon is its only satellite.<br/>• Magnetic field protects us from much of the solar wind and charged particles.<br/>👉 Earth's liquid water, protective atmosphere and suitable temperatures make it uniquely habitable.<br/>`}}).addObject3D(new o(8947848,.01)).addObject3D(D).bind(S.alwaysWith(E)).onFrame(e=>{let t=(e-O)*.001;O=e;let n=t*24/60;S.time+=n,E.translation=S.coordinates}).append(new i(`Clouds`).checked(!0).onChange(e=>E.clouds=e).togetherWith(new i(`Atmosphere`).checked(!0).onChange(e=>E.atmosphere=e).togetherWith(new i(`Fresnel`).checked(!0).onChange(e=>E.fresnel=e)))).start();