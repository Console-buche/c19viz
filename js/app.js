// IMPORTS
import * as THREE from './libs/three/build/three.module.js';
import {
    default as dataWorld
} from '../data/covid-19-pandemic-worldwide-data-20200427.js';
//} from '../data/covid-19-pandemic-worldwide-data-confirmed-death.js';
import Country from './classes/Country.js';
import {
    OrbitControls
} from './libs/three/controls/OrbitControls.js';
import VizControls from './classes/VizControls.js';
import Screen from './classes/Screen.js';
import Planet from './classes/Planet.js';

// GLOBALS
const cc = document.getElementById("screenCanvas")
var countries = new Set();
var countriesMap = new Map();
const raycaster = new THREE.Raycaster();
var mouse = new THREE.Vector2();
const d = dataWorld;

// context setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, document.body.clientWidth / document.body.clientHeight, 0.1, 10000);
const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true
});

//init cam over China
camera.position.x = -43;
camera.position.y = 100;
camera.position.z = -170;

renderer.setSize(document.body.clientWidth, document.body.clientHeight);
document.body.appendChild(renderer.domElement);
const maxUni = renderer.capabilities.maxFragmentUniforms;

const controls = new OrbitControls(camera, renderer.domElement);
controls.target = new THREE.Vector3(0, 0, 0);
controls.autoRotate = true;
controls.autoRotateSpeed = 0.35;
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minPolarAngle = Math.PI / 3;
controls.maxPolarAngle = Math.PI / 2;

// Data parsing
var country = new Country();
scene.add(country);

// Order dataset : n Maps() ordered by dates 
var set = {};
var categories = ["Confirmed", "Deaths"];
for (var i = 0; i < d.dataWorld.length; i++) {
    var date = d.dataWorld[i].fields.date;
    var fields = d.dataWorld[i].fields;

    if (!set[date]) {
        set[date] = new Map();
    }

    var exists = set[fields.date].get(fields.zone);
    var existsSub = set[fields.date].get(fields.subzone);

    var existingKey = exists && Object.keys(exists)
    var existingKeySub = existsSub && Object.keys(existsSub)

    if (existsSub && fields.subzone) {
        categories.forEach((cat) => {
            var unseen = existingKeySub.includes(cat);
            if (unseen == false) {
                set[fields.date].set(fields.subzone, {
                    [existingKeySub]: Object.values(existsSub)[0],
                    [cat]: {
                        "count": fields.count,
                        "loc": {
                            x: fields.location[0],
                            y: fields.location[1]
                        },
                        "subzone": fields.subzone,
                        "zone": fields.zone,
                        "entry": "subzone"
                    }
                })
            }
        });
    } else if (exists && !fields.subzone) {
        var existingKeys = Object.keys(exists);
        categories.forEach((cat) => {
            var unseen = existingKeys.includes(cat);

            if (unseen == false) {
                set[fields.date].set(fields.zone, {
                    [existingKey]: Object.values(exists)[0],
                    [cat]: {
                        "count": fields.count,
                        "loc": {
                            x: fields.location[0],
                            y: fields.location[1]
                        },
                        "subzone": fields.subzone,
                        "zone": fields.zone,
                        "entry": "zone"
                    }
                })
            }
        });

    } else {
        var neim = (fields.subzone) ? fields.subzone : fields.zone;
        set[fields.date].set(neim, {
            [fields.category]: {
                "count": fields.count,
                "loc": {
                    x: fields.location[0],
                    y: fields.location[1]
                },
                "subzone": fields.subzone,
                "zone": fields.zone,
                "entry": (fields.subzone) ? "subzone" : "zone"
            }
        });
    }
}

var coords = {
    minX: 99999,
    maxX: -99999,
    minY: 99999,
    maxY: -99999
};

// countries setup
var count = 0;
Object.values(set).forEach((c, d) => { //à chaque date
    if (d == 0) {
        for (let [key, val] of c.entries()) {

            var laZone = key;
            var cats = val;
            count++;
            for (let c in cats) {
                let catName = c;
                let category = cats[c];
                var secondBarOffset = (c == "Deaths") ? 1 : 0;

                var h = country.clone();
                h.scale.y = 0;
                h.name = catName + "_";
                h.geometry.translate(0, 0.5, 0);
                if (catName == "Deaths") {
                    h.material = h.materialDeaths;
                }
                h.userData.type = "country";
                h.data.zone = laZone;
                h.data.entry = category.entry;
                h.data.category = catName;

                // store position data for later use
                var sPos = h.posToSphere(category.loc.x, category.loc.y + secondBarOffset, 50);
                h.projections.pos.flat = new THREE.Vector3(category.loc.x, 0, category.loc.y + secondBarOffset);
                h.projections.pos.spherical = new THREE.Vector3(sPos[0].x, sPos[0].y, sPos[0].z);
                h.position.set(sPos[0].x, sPos[0].y, sPos[0].z);

                scene.add(h);
                h.projections.rot.flat = new THREE.Vector3(category.loc.x, 0, category.loc.y + secondBarOffset);
                h.lookAt(new THREE.Vector3().copy(sPos[1]));
                h.projections.rot.spherical = new THREE.Vector3().copy(sPos[1])
                h.rotateX(Math.PI / 2);

                // store map boundaries in context
                let loc = category.loc;
                coords.minX = (loc.x < coords.minX) ? loc.x : coords.minX;
                coords.maxX = (loc.x > coords.maxX) ? loc.x : coords.maxX;
                coords.minY = (loc.y < coords.minY) ? loc.y : coords.minY;
                coords.maxY = (loc.y > coords.maxY) ? loc.y : coords.maxY;

                countries.add(h);
            }
        }
    }
});

// make instance of vizcontrols and export for further use by other classes instances
const vizSet = new VizControls(set, countries);
vizSet.orderByDate();
vizSet.updateUIRangeSelector();
vizSet._population = countries;

countries.forEach((country) => {
    var name = (country.data.subzone) ? country.data.subzone : country.data.zone;
    if (country.data.category == "Confirmed") {
        countriesMap.set(
            name, {
                country
            });
    }
});
vizSet._populationMap = countriesMap;

// make HUD
var s = new Screen(cc, set);
s.init();
scene.add(s);

// make map models
var globe = new Planet();
var mappemonde = new Planet();
globe.init(countries, "globe");
mappemonde.init(countries, "mappemonde");

// render loop
var animate = function () {
    requestAnimationFrame(animate);

    renderer.render(scene, camera);
    s.update(camera); //update hud

    TWEEN.update();
    controls.update(); //update 


    countries.forEach((c) => {
        c.updateVisibility(camera);
    });

    raycaster.setFromCamera(mouse, camera);
};

animate();

// EVENT LISTENERS
// autoplay
var buttonAuto = document.querySelector(".-play-button");
buttonAuto.addEventListener("click", (e) => {
    vizSet.toggleMode(e.target);
    hideTooltip();
})

// country picker
window.addEventListener('mousemove', showCountriesData, false);
window.addEventListener('touchstart', showCountriesData, false);

function showCountriesData(event) {
    if (event.type == "touchstart") {
        mouse.x = (event.touches[0].clientX / document.body.clientWidth) * 2 - 1;
        mouse.y = -(event.touches[0].clientY / document.body.clientHeight) * 2 + 1;
    } else {
        mouse.x = (event.clientX / document.body.clientWidth) * 2 - 1;
        mouse.y = -(event.clientY / document.body.clientHeight) * 2 + 1;
    }

    var intersects = raycaster.intersectObjects(scene.children);
    if (intersects.length > 0 && intersects[0].object.userData.type == "country") {
        for (var i = 0; i < intersects.length; i++) {
            var c = intersects[0].object.data.zone
            s.country = c;
            s.updateOffsetScreen_zone(c);
            //s.showStats(intersects[0].point);
        }
    }
}

// map styles
var toggleProjection = document.getElementsByClassName("projectionMode");
[...toggleProjection].forEach(mode =>
    mode.addEventListener("click", toggleProj)
);

function toggleProj() {
    const proj = this.getAttribute("data-projection");
    vizSet.updateProjModels(proj);
    if (proj == "spherical") {
        controls.minPolarAngle = Math.PI / 3;
        controls.maxPolarAngle = Math.PI / 2;
    } else {
        controls.minPolarAngle = Math.PI / 6;
        controls.maxPolarAngle = Math.PI / 3;
    }
    countries.forEach((c) => {
        c.makeProjection(proj);
    })
}

//hide tooltip
function hideTooltip() {
    const tt = document.getElementById("infoClick");
    tt.style.display = "none";
}

// canvas resize
window.addEventListener('resize', onWindowResize, false);

function onWindowResize() {

    camera.aspect = document.body.clientWidth / document.body.clientHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(document.body.clientWidth, document.body.clientHeight);

}

//get in touch
const getInTouchBtnLN = document.getElementById("getInTouchLN");
getInTouchBtnLN.addEventListener("click", () => {
    window.open("http://linkedin.com/in/sebdubourg");
});
const getInTouchBtnTW = document.getElementById("getInTouchTW");
getInTouchBtnTW.addEventListener("click", () => {
    window.open("https://twitter.com/Console_buche");
});

// mobile warning, source : https://stackoverflow.com/questions/11381673/detecting-a-mobile-browser
function mobileCheck() {
    let check = false;
    (function (a) {
        if (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0, 4))) check = true;
    })(navigator.userAgent || navigator.vendor || window.opera);
    if (check) {
        let warning = document.getElementById("mobileWarning");
        warning.style.display = "block";
    }
};
mobileCheck();

// export

export {
    vizSet,
    globe,
    mappemonde,
    scene,
    s,
    cube,
    maxUni,
    camera
};


// debug
var geometry = new THREE.BoxGeometry(5, 5, 5);
var material = new THREE.MeshBasicMaterial({
    color: 0x00ff00
});
var cube = new THREE.Mesh(geometry, material);
cube.position.set(20, 0, 50);
//scene.add(cube);
cube.visible = false;