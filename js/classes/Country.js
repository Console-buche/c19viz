import * as THREE from '../libs/three/build/three.module.js';
import {
    vizSet,
    globe,
    mappemonde
} from '../app.js';

// This class manages the init and update of country's scale based on covid stats
export default class Country extends THREE.Mesh {
    constructor() {
        super();
        this.geometry = new THREE.BoxGeometry(0.5, 1, 0.5);
        this.material = new THREE.MeshBasicMaterial({
            transparent: true,
            opacity: 0,
            color: 0x00ff00
        });
        this.materialDeaths = new THREE.MeshBasicMaterial({
            transparent: true,
            opacity: 0,
            color: 0xFF0000
        });
        this.data = {
            zone: "",
            entry: "",
            timeMap: new Map(),
            totalCount: 0,
            category: null
        }
        this.tween = null;
        this.projections = {
            pos: {
                flat: null,
                spherical: null
            },
            rot: {
                flat: null,
                spherical: null
            }
        }
    }

    _getData() {
        return this.data.timeMap.get("count");
    }

    // used in Country :: update scale.y based on current date's data
    updateScale(data, mode, shouldReset) { //TODO : normaliser la taille avec les count min et max par date, pour scale correctement et bien voir tous les pays

        if (data.get(this.data.zone) && data.get(this.data.zone)[this.data.category]) {
            //get total count and save it up within country instance data
            var getCount = data.get(this.data.zone)[this.data.category].count;
            this.data.totalCount = getCount;

            //Start showing countries when infection is declared by stats
            var opacityFactor = (this.data.category == "Deaths") ? 2 : 5;
            this.material.opacity = (this.scale.y > 1) ? this.scale.y / opacityFactor : 0;

            //even scaling for readability
            var gk = (getCount <= 0) ? 0 : 0.5 * (Math.log10(getCount) / 50)

            //setup variables used when tweening
            var targetScale = {
                y: gk
            }
            var country = this;
            var scl = {
                y: 0
            };

            //animate infection growth on country scale
            var tween = new TWEEN.Tween(scl)
                .to({
                    y: targetScale.y
                }, 500)
                .onUpdate(function () {
                    if (shouldReset == true) {
                        //reset country's scale upon restarting
                        country.scale.y = 0;
                        country.opacity = 0;
                    } else {
                        if (mode == "increment") {
                            //feed infection state to map model for material's update
                            if (vizSet.currentOrdererdSet.has(country.data.zone)) {
                                var pos = new THREE.Vector3(this.x, this.y, this.z);
                                globe.updateInfectionSpread(country.data.zone, country.scale.y, pos);
                                mappemonde.updateInfectionSpread(country.data.zone, country.scale.y, pos);
                                country.scale.y += this.y;
                            }
                        } else if (mode == "byDate") {
                            country.scale.y = this.y * 250;
                            var pos = new THREE.Vector3(this.x, this.y, this.z);
                            if (vizSet.currentOrdererdSet.has(country.data.zone)) {
                                globe.updateInfectionSpread(country.data.zone, country.scale.y, pos);
                                mappemonde.updateInfectionSpread(country.data.zone, country.scale.y, pos);
                            }
                        }
                    }
                })
                .start();
        }
    }

    //lat/lon to x,y,z 
    posToSphere(lat, lon, radius) {
        var phi = (lat) * Math.PI / 180;
        var theta = (lon - 180) * Math.PI / 180;

        var x = -(radius) * Math.cos(phi) * Math.cos(theta);
        var y = (radius) * Math.sin(phi);
        var z = (radius) * Math.cos(phi) * Math.sin(theta);

        var radius2 = radius * 2;

        var x1 = -(radius2) * Math.cos(phi) * Math.cos(theta);
        var y1 = (radius2) * Math.sin(phi);
        var z1 = (radius2) * Math.cos(phi) * Math.sin(theta);

        //return position and lookat 
        return [new THREE.Vector3(x, y, z), new THREE.Vector3(x1, y1, z1)];
    }

    //hides countries on globe view if country should be occluded by globe
    updateVisibility(cam) {
        var dot = new THREE.Vector3().copy(this.position).normalize().dot(new THREE.Vector3().copy(cam.position).normalize());
        if (vizSet.mapStyle == "spherical" && vizSet.mapStyle !== "planisphere") {
            this.visible = (dot > 0) ? true : false;
        } else {
            this.visible = true;
        }
    }

    //update country's position upon view change
    makeProjection(proj) {
        var saveScale = this.scale.y;
        var vals = (proj == "spherical") ? this.projections.pos.spherical : this.projections.pos.flat;
        var country = this;

        var tween = new TWEEN.Tween(this.position.clone())
            .to(vals.clone(), 500)
            .onUpdate(function () {
                country.position.copy(this);
                country.scale.y = 0;
            })
            .onComplete(() => {
                if (proj !== "spherical") {
                    country.lookAt(country.projections.rot.flat.clone());
                    country.rotateX(0)
                } else {
                    country.lookAt(country.projections.rot.spherical.clone());
                    country.rotateX(Math.PI / 2)
                }
                country.scale.y = saveScale
            })
            .start();
    }

}