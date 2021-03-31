import * as THREE from '../libs/three/build/three.module.js';

/*
 *This class updates the HUD with data on user event
 * Also contains HUD in 3D (canvas screen)
 * Unfinished because 3D HUD doesn't pay off in that particular viz (occlusion)
 * Todo : polish it up / remove ?
 */
export default class Screen extends THREE.Mesh {

    constructor(canvas, lookupDataset) {
        super();
        this.offscreenCanvas = canvas;
        this.material = new THREE.MeshBasicMaterial({
            map: new THREE.CanvasTexture(canvas),
            alphaTest: 0.5,
            side: THREE.DoubleSide
        });
        this.name = "Screen";
        this.geometry = new THREE.PlaneBufferGeometry(10, 5);
        this.country = null;
        this.dataset = lookupDataset;
        this.currentDate = null;
        this.currentZone = null;
        this.targets = new Map();
    }

    set _currentDate(d) {
        this.currentDate = d;
    }

    set _currentZone(z) {
        this.currentZone = z;
    }

    get _currentZone() {
        return this.currentZone;
    }

    init() {
        this.position.z = -150;
        this.position.y = -150;
        this.position.x = 5 * 100; //scale * half width
        this.scale.set(5, 5, 5)
        this.visible = false;

        // Attach dom targets for HUD updates
        const targetZone = document.getElementById("sd_zone");
        this.targets.set("zone", targetZone);
        const targetDate = document.getElementById("sd_date");
        this.targets.set("date", targetDate);
        const targetConfirmed = document.getElementById("sd_confirmed");
        this.targets.set("confirmed", targetConfirmed);
        const targetDeaths = document.getElementById("sd_deaths");
        this.targets.set("deaths", targetDeaths);
    }

    // used in VizControl app.js :: updates HUD current date based on auto/manual mode
    updateOffsetScreen_date(date) {
        this._currentDate = date;
        var ctx = this.offscreenCanvas.getContext("2d");
        ctx.clearRect(0, 0, this.offscreenCanvas.width, 70);
        ctx.font = "20px Arial";
        ctx.fillStyle = "white";
        if (date) {
            ctx.fillText("Date : " + date, 10, 50);
            this.targets.get("date").textContent = date;
        }
    }

    // used in main app.js : set and updates country and infections on user's select
    updateOffsetScreen_zone(zone) {
        this._currentZone = zone || this.currentZone;
        if (this.currentZone) {
            var ctx = this.offscreenCanvas.getContext("2d");
            ctx.clearRect(0, 70, this.offscreenCanvas.width, 100);
            ctx.font = "20px Arial";
            ctx.fillStyle = "white";
            if (this.currentZone) ctx.fillText("Zone : " + this.currentZone, 10, 85);

            var z = this.dataset[this.currentDate].get(this.currentZone);
            ctx.clearRect(0, 100, this.offscreenCanvas.width, 300);
            ctx.fillText("Total des cas confirmés : " + z.Confirmed.count, 10, 120);
            ctx.fillText("Total des décès : " + z.Deaths.count, 10, 150);

            this.targets.get("zone").textContent = this.currentZone;
            this.targets.get("confirmed").textContent = z.Confirmed.count;
            this.targets.get("deaths").textContent = z.Deaths.count;
        }
    }

    // (unused) in main app.js :: feeds cam's position to update 3D HUD screen transforms
    update(cam) {
        this.material.map.needsUpdate = true;
        this.lookAt(new THREE.Vector3(cam.position.x, cam.position.y, cam.position.z));
    }

    // same as above
    showStats(p) {
        this.position.x = p.x;
        this.position.y = p.y;
        this.position.z = p.z;
    }

}