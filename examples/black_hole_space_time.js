import{Cn as e,Mn as t,_n as n,jn as r,kn as i}from"../assets/src-DTRKgV0A.js";import{$ as a,G as o,L as s,nt as c,ot as l,st as u}from"../assets/fresnel_fragment_shader-C5WOpnXH.js";var d=`/helion/assets/space_pano-ZnxP3r03.jpg`,f=new r(0,0,1),p=75,m=t(p),h=f.z*Math.tan(m/2)*2,g=new c().load(d),_=`
    varying vec2 vUv;

    void main() {
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        vUv = uv;
    }
`,v=`
    varying vec2 vUv;
    uniform sampler2D uSpaceTexture;
    uniform vec2 uResolution;
    uniform vec3 uBlackholePos;
    uniform float uGM;
    #define MAX_ITERATIONS 160
    #define STEP_SIZE 0.04

    vec3 camPos = vec3(0, 0, -3.0);
    vec4 raytrace(vec3 rayDir, vec3 rayPos) {
      vec4 color = vec4(0.0, 0.0, 0.0, 1.0);
      for (int i = 0; i < MAX_ITERATIONS; i++) {
        float dist = length(rayPos - uBlackholePos);
        vec3 r = rayPos - uBlackholePos;
        float r3 = dist * dist * dist;
        vec3 accel =-3.0 * uGM * cross(rayDir, cross(r, rayDir)) / r3;

        rayDir += accel * STEP_SIZE;
        rayDir = normalize(rayDir);
        rayPos += rayDir * STEP_SIZE;
        if (dist > 0.1) {
            vec2 tex = normalize(rayDir).xy * 0.5 + 0.5;
            color = texture2D(uSpaceTexture, tex);
        }
      }

      return color;
    }

    void main() {
      vec2 uv = (vUv - 0.5) * 2.0 * vec2(uResolution.x / uResolution.y, 1.0);
      vec3 rayDir = normalize(vec3(uv, 1.0));
      vec3 rayPos = camPos;
      gl_FragColor = raytrace(rayDir, rayPos);
    }
`,y=n.with({htmlDivId:`blackHoleSpaceTimeContainer`,camera:{position:f,fieldOfView:p,controls:!1},viewport:{aspectRatio:`2/1`},headUpDisplay:{enabled:!1}}).runsEvery(.01).advancesBy(.005).onStep((e,t)=>x.uniforms.uBlackholePos.value.set(Math.sin(e.simulatedTime)*.9,Math.cos(e.simulatedTime*.7)*.2,0)).start(),b=new o(h*2/1,h),x=new a({uniforms:{uGM:{value:.025},uSpaceTexture:{value:g},uResolution:{value:new l(y.width,y.height)},uBlackholePos:{value:new u(0,0,0)}},vertexShader:_,fragmentShader:v}),S=new s(b,x);y.addObject3D(S).append(new e(`Mass`).withRange(new i(1,100,1)).withValue(.025).onInput(e=>x.uniforms.uGM.value=Number(e.target.value)/1e3));