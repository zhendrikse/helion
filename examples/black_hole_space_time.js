import{B as e,J as t,it as n,lt as r,mt as i,pt as a}from"../assets/fresnel_fragment_shader-DpuzHYbP.js";import{Ln as o,bn as s,fr as c,ur as l,vn as u}from"../assets/src-C2mPBov6.js";var d=`/helion/assets/space_pano-ZnxP3r03.jpg`,f=new o(0,0,1),p=75,m=c(p),h=f.z*Math.tan(m/2)*2,g=new r().load(d),_=`
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
`,y=s.with({htmlDivId:`blackHoleSpaceTimeContainer`,camera:{position:f,fieldOfView:p,controls:!1},viewport:{aspectRatio:`2/1`},headUpDisplay:{enabled:!1}}).runsEvery(.01).advancesBy(.005).onStep((e,t)=>x.uniforms.uBlackholePos.value.set(Math.sin(e.simulatedTime)*.9,Math.cos(e.simulatedTime*.7)*.2,0)).start(),b=new t(h*2/1,h),x=new n({uniforms:{uGM:{value:.025},uSpaceTexture:{value:g},uResolution:{value:new a(y.width,y.height)},uBlackholePos:{value:new i(0,0,0)}},vertexShader:_,fragmentShader:v}),S=new e(b,x);y.addObject3D(S).append(new u(`Mass`).withRange(new l(1,100,1)).withValue(.025).onInput(e=>x.uniforms.uGM.value=e/1e3));