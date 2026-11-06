import{$r as e,Cr as t,Jn as n,Jr as r,Qr as i,Tr as a,Wr as o,ei as s,jn as c,kn as l,ti as u}from"../assets/src-C0ywdTCL.js";var d=new n(0,0,1),f=75,p=a(f),m=d.z*Math.tan(p/2)*2,h=new e().load(new URL(`../images/astrophysics/milky-way.jpg`,``+import.meta.url).href),g=`
    varying vec2 vUv;

    void main() {
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        vUv = uv;
    }
`,_=`
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
`,v=c.with({htmlDivId:`blackHoleSpaceTimeContainer`,camera:{position:d,fieldOfView:f,controls:!1},viewport:{aspectRatio:`2/1`},headUpDisplay:{enabled:!1}}).runsEvery(.01).advancesBy(.005).onStep((e,t)=>b.uniforms.uBlackholePos.value.set(Math.sin(e.simulatedTime)*.9,Math.cos(e.simulatedTime*.7)*.2,0)).start(),y=new r(m*2/1,m),b=new i({uniforms:{uGM:{value:.025},uSpaceTexture:{value:h},uResolution:{value:new s(v.width,v.height)},uBlackholePos:{value:new u(0,0,0)}},vertexShader:g,fragmentShader:_}),x=new o(y,b);v.addObject3D(x).append(new l(`Mass`).withRange(new t(1,100,1)).withValue(.025).onInput(e=>b.uniforms.uGM.value=e/1e3));