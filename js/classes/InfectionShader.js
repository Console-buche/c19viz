export default class InfectionShader {
    constructor(maxUni) {
        this.uniThresh = (() => {
            if (maxUni > 280) {
                return 263; //TODO : not hardcore this ? currently nb of countries...
            } else {
                return (maxUni - 15); //arbitrarily remove 5 to give space from additional uni... lazy one
            }
        });
        this.vertex = `
        varying vec2 vUv;
        varying vec3 vP;

        void main() {
        vUv = uv;

        vec3 p = vec3(position.x, position.y, position.z );
        
        vP = p;

          gl_Position = projectionMatrix *
                        modelViewMatrix  *
                        vec4(p,1.0);

        }`;
        this.fragment = `
        const int NBOFCOUNTRIES = ${this.uniThresh()};
        uniform vec4 areas[${this.uniThresh()}];

        uniform vec2 textureDimensions;
        uniform sampler2D mapTexture;
        varying vec2 vUv;
        varying vec3 vP;

        void main() {
        vec4 tex = texture2D(mapTexture, vUv);

        //map background
        //gl_FragColor = vec4(237.0 / 255.0, 201.0 / 255.0, 175.0 / 255.0, tex.a);
        vec4 fond = vec4(1.0, 1.0, 1.0, tex.a);
        //vec4 fond = vec4(0.0, 0.0, 0.0, tex.a);
                
        

        //infection spread
        for (int i = 0; i < NBOFCOUNTRIES; i++) {
            if (i >= NBOFCOUNTRIES) { break; }
            float d = distance(vP, areas[i].xyz);
            if (d < areas[i].w) {
                fond *= vec4(1.0, clamp(d, 0.65, 0.90), clamp(d, 0.65, 0.90), tex.a);
            }
        }


        gl_FragColor = fond;
        
        }`
    }

    get _vertexShader() {
        return this.vertex;
    }

    get _fragmentShader() {
        return this.fragment;
    }
}