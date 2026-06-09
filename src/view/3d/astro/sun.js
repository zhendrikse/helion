import {
    Group, Color, SphereGeometry, ShaderMaterial, AdditiveBlending, Mesh, BackSide
} from "three";
import fresnelFragmentShader from "./shaders/fresnel_fragment_shader.glsl?raw";
import fresnelVertexShader from "./shaders/fresnel_vertex_shader.glsl?raw";
import sunFragmentShader from "./shaders/sun_fragment_shader.glsl?raw";
import sunVertexShader from "./shaders/sun_vertex_shader.glsl?raw";

/**
 * Original code by Sangil Lee:
 *    https://sangillee.com/2024-06-29-create-realistic-sun-with-shaders/
 */
class SurfaceMaterial {
    constructor(uniforms) {
        this.uniforms = uniforms;
        this.material = new ShaderMaterial({
            uniforms: this.uniforms,
            vertexShader: sunVertexShader,
            fragmentShader: sunFragmentShader
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
            vertexShader: fresnelVertexShader,
            fragmentShader: fresnelFragmentShader
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