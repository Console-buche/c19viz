import * as THREE from '../libs/three/build/three.module.js';
import {
    scene,
    maxUni,
    camera
} from '../app.js';
import InfectionShader from './InfectionShader.js';

//This class manages the globe and flatmap models + materials
export default class Planet extends THREE.Mesh {

    constructor() {
        super();
        this.countries = null;
        this.countriesFlat = null;
        this.geometryCrust = new THREE.SphereBufferGeometry(50, 32, 32);
        this.geometryMappemonde = new THREE.PlaneBufferGeometry(360, 180);
        this.crustUniforms = {
            mapTexture: {
                value: new THREE.TextureLoader().load("./textures/mapMono.png")
            },
            areas: {
                value: []
            },
            matAreas: {
                value: [] //array of mat4 => TODO : check nb of uniforms sent
            }
        }
        this.geometryCore = new THREE.SphereBufferGeometry(45, 32, 32);
        this.materialCrust = new THREE.ShaderMaterial({
            uniforms: this.crustUniforms,
            vertexShader: null,
            fragmentShader: null,
            transparent: true
        });
        this.materialCore = new THREE.MeshBasicMaterial({
            transparent: true,
            color: 0x0081D7,
            opacity: 0.95
        });
        this.materialAura = new THREE.MeshBasicMaterial({
            transparent: true,
            color: 0xFFFFFF,
            opacity: 0.5,
            side: THREE.BackSide
        });
        this.planetLayers = new Map();
        this.camTargets = {
            globe: new THREE.Vector3(-43, 100, -170),
            mappemonde: new THREE.Vector3(-158, 174, 0)
        }
    }

    get _countries() {
        return this.countries;
    }

    init(countries, type) {

        const c = countries;
        this.fillPositions(c);
        var dis = this;
        var shader = new InfectionShader(maxUni);
        console.log(shader);
        this.materialCrust.vertexShader = shader.vertex;
        this.materialCrust.fragmentShader = shader.fragment;
        this.materialCrust.needsUpdate = true;


        const mapTex = new THREE.TextureLoader().load("./textures/mapMono.png", function (t) {
            t.anisotropy = 16;

            dis.crustUniforms.mapTexture.value = t;
            dis.materialCrust.needsUpdate = true;
            dis.materialCrust.uniformsNeedUpdate = true;

            if (type == "globe") {
                const aura = new THREE.Mesh(dis.geometryCore, dis.materialAura); //invisible & hides behind
                aura.scale.set(1.125, 1.125, 1.125);
                const core = new THREE.Mesh(dis.geometryCore, dis.materialCore); //invisible & hides behind
                core.name = "core";

                const crust = new THREE.Mesh(dis.geometryCrust, dis.materialCrust);
                crust.material.needsUpdate = true;
                crust.name = "earth";

                scene.add(aura);
                scene.add(core);
                scene.add(crust);

                dis.planetLayers.set("aura", aura);
                dis.planetLayers.set("core", core);
                dis.planetLayers.set("globe", crust);

            } else if (type == "mappemonde") {

                const plani = new THREE.Mesh(dis.geometryMappemonde, dis.materialCrust);
                plani.material.needsUpdate = true;
                plani.position.y = 0.3;
                plani.geometry.rotateX(-Math.PI / 2);
                plani.geometry.rotateY(-Math.PI / 2);
                plani.updateMatrix();
                plani.name = "plani";

                scene.add(plani);
                plani.visible = false; //viz starts with globe 

                dis.planetLayers.set("mappemonde", plani);

                var loading = document.getElementById("loading");
                loading.style.display = "none";
            }
        });
    }

    //used in vizControls :: hides other mapstyle
    hide(...styles) {
        styles.forEach((style) =>
            this.planetLayers.get(style).visible = false
        )
    }

    //used in vizControls :: shows selected mapstyle
    show(...styles) {
        styles.forEach((style) =>
            this.planetLayers.get(style).visible = true
        );

        const startingPos = camera.position.clone();
        const dis = this;
        var tween = new TWEEN.Tween(startingPos)
            .to(
                dis.camTargets[styles[0]].clone(), 1500)
            .onUpdate(function () {
                camera.position.copy(this);
            })
            .start();
    }

    //used in Planet :: uniform setup for infection area growth
    fillPositions(countries) {
        var cc = 0; //nb of countries to animate an infection area for
        var countriesMap = new Map();

        countries.forEach((c, k) => {
            if (c.data.category == "Confirmed") {

                let ctn = cc;
                countriesMap.set(c.data.zone, {
                    mesh: c,
                    pos: new THREE.Vector3(c.position.x, c.position.y, c.position.z),
                    infectionLevel: 0.0,
                    id: ctn
                });

                this.crustUniforms.areas.value.push(new THREE.Vector4(c.position.x, c.position.y, c.position.z, 0.0))
                cc++
            };
        });

        this.crustUniforms.needsUpdate = true;
        this.crustUniforms.uniformsNeedUpdate = true;
        this.countries = countriesMap;

    }

    //used in Country :: update infection spread based on scale. Not actual geographical data.
    updateInfectionSpread(zone, scl) {

        var id = this._countries.get(zone).id;
        var country = this._countries.get(zone);

        var s = THREE.MathUtils.clamp(scl * 2, 0, 7.5); //growth coefficient based on scale for realistic-ish view

        this.crustUniforms.areas.value[id].x = country.mesh.position.x;
        this.crustUniforms.areas.value[id].y = country.mesh.position.y;
        this.crustUniforms.areas.value[id].z = country.mesh.position.z;
        this.crustUniforms.areas.value[id].w = s;
        this.materialCrust.needsUpdate = true;
        this.materialCrust.uniforms.needsUpdate = true;

    }

}