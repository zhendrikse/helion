import{A as e,F as t,G as n,I as r,K as i,M as a,R as o,W as s,Z as c,j as l,n as u,q as d,r as f,t as p,x as m}from"../assets/fresnel_fragment_shader-C6hldLup.js";var h=`varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;
varying mat3 vTbn;

attribute vec4 tangent; // "geometry.computeTangents()" is needed.

void main() {
    vUv = uv;
    vNormal = normalize(mat3(modelMatrix) * normal);
    vPosition = mat3(modelMatrix) * position;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);

    vec3 t = normalize(tangent.xyz);
    vec3 n = normalize(normal.xyz);
    vec3 b = normalize(cross(t, n));

    t = mat3(modelMatrix) * t;
    b = mat3(modelMatrix) * b;
    n = mat3(modelMatrix) * n;
    vTbn = mat3(t, b, n);
}
`,g=`uniform sampler2D u_dayTexture;
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
`,_=`varying vec2 vUv;
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
`,v=`uniform vec3 u_sunRelPosition;
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
}`,y=`/helion/assets/Solarsystemscope_texture_2k_earth_daymap-DKLT2WuX.jpg`,b=`/helion/assets/Solarsystemscope_texture_2k_earth_nightmap-BBH1PX2h.jpg`,x=`/helion/assets/earthspec1k-DVJhpabx.jpg`,S=`/helion/assets/Earth-clouds-VLfYlTHa.png`,C=`/helion/assets/2k_earth_normal_map-F-0Z3WD3.png`,w=`/helion/assets/moonmap1k-DNk7Ihgk.jpg`,T=document.getElementById(`earthContainer`),E=document.createElement(`canvas`);E.class=`applicationCanvas`,T.appendChild(E);var D=new f({alpha:!0,canvas:E,antialias:!0});D.shadowMap.enabled=!0,D.shadowMap.type=1,D.setSize(T.clientWidth,T.clientHeight);var O=new r(75,T.clientWidth/T.clientHeight,.1,1e3);O.position.set(0,0,5);var k=new l({color:16755200,opacity:0,transparent:!0}),A=new e(new i(1,30,30),k),j=class t extends m{static loader=new d;static material=new n({uniforms:{u_dayTexture:{value:t.loader.load(y)},u_nightTexture:{value:t.loader.load(b)},u_normalTexture:{value:t.loader.load(C)},u_specTexture:{value:t.loader.load(x)},u_cloudTexture:{value:t.loader.load(S)},u_normalPower:{value:5},u_sunRelPosition:{value:new c(0,0,0)},u_position:{value:new c(0,0,0)},u_moonPosition:{value:new c(0,0,0)},u_moonRadius:{value:.05},u_sunRadius:{value:.2}},vertexShader:h,fragmentShader:g});static atmosphereMaterial=new n({uniforms:{u_sunRelPosition:{value:new c(0,0,0)},u_color:{value:new c(.45,.55,1)}},vertexShader:_,fragmentShader:v,transparent:!0,side:1,depthTest:!0,depthWrite:!1});static fresnelMaterial=new n({uniforms:{u_sunRelPosition:{value:new c(0,0,0)},u_color:{value:new c(.45,.55,1)}},vertexShader:_,fragmentShader:p,transparent:!0});constructor(){super();let n=new i(1,30,30);n.computeTangents();let r=new e(n,t.material);r.scale.set(.2,.2,.2);let a=new e(n,t.atmosphereMaterial);a.scale.set(1.05,1.05,1.05);let o=new e(n,t.fresnelMaterial);o.scale.set(1.0001,1.0001,1.0001),r.add(a,o),this.add(r)}},M=new a,N=new e(new i(1,30,30),M);N.scale.set(.05,.05,.05),new d().load(w,e=>{M.map=e,M.needsUpdate=!0});var P=new o(16777215,15);P.position.set(0,0,0),P.castShadow=!0;var F=new t,I=new t,L=new t,R=new s,z=new j;R.add(z),R.add(A),A.add(P),R.add(F),F.add(I),I.add(L),L.add(N);var B=new u(O,E);B.enableDamping=!0,O.position.set(0,0,.6);var V=.5,H=0,U=0;function W(e){N.position.set(.4*Math.cos(V*e),0,-.4*Math.sin(V*e)),A.position.set(3*Math.cos(H*e),0,-3*Math.sin(H*e)),j.material.uniforms.u_sunRelPosition.value.x=3*Math.cos(H*e),j.material.uniforms.u_sunRelPosition.value.y=0,j.material.uniforms.u_sunRelPosition.value.z=-3*Math.sin(H*e),j.material.uniforms.u_moonPosition.value.x=.4*Math.cos(V*e),j.material.uniforms.u_moonPosition.value.y=0,j.material.uniforms.u_moonPosition.value.z=-.4*Math.sin(V*e),j.atmosphereMaterial.uniforms.u_sunRelPosition.value.x=3*Math.cos(H*e),j.atmosphereMaterial.uniforms.u_sunRelPosition.value.y=0,j.atmosphereMaterial.uniforms.u_sunRelPosition.value.z=-3*Math.sin(H*e),j.fresnelMaterial.uniforms.u_sunRelPosition.value.x=3*Math.cos(H*e),j.fresnelMaterial.uniforms.u_sunRelPosition.value.y=0,j.fresnelMaterial.uniforms.u_sunRelPosition.value.z=-3*Math.sin(H*e),A.rotateY(U)}function G(e){requestAnimationFrame(G),W(e*.001),B.update(),D.render(R,O)}G();