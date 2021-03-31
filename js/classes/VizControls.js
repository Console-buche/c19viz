import {
    s,
    mappemonde,
    globe,
    maxUni
} from '../app.js';

// This class is the link between view, models, data
export default class VizControls {

    constructor(data) {
        this.data = data;
        this.currentDate = Object.keys(data)[0];
        this.currentSet = data[0];
        this.currentOrdererdSet = null;
        this.population = null; //set
        this.populationMap = null; //map
        this.currentMinMax = {
            min: 0,
            max: 0
        };
        this.shouldReset = false;
        this.modes = {
            increment: false,
            byDate: true,
            loop: {
                interval: null,
                currentRangeSelect: 0
            }
        }
        this.mapStyle = "spherical"; //default
    }

    get _nbOfDays() {
        return Object.values(this.data).length;
    }

    get _data() {
        return this.data;
    }

    set _population(p) {
        this.population = p;
    }

    get _population() {
        return this.population;
    }

    set _populationMap(p) {
        this.populationMap = p;
    }

    get _populationMap() {
        return this.populationMap;
    }

    set _currentSet(d) {
        this.currentSet = d;
    }

    set _currentOrderedSet(d) {
        this.currentOrdererdSet = d;
    }

    set _currentMinMax(d) {
        this.currentMinMax = d;
    }

    get _currentMinMax() {
        return this.currentMinMax;
    }

    toggleMode(btn) {
        this.modes.increment = !this.modes.increment;
        this.modes.byDate = !this.modes.byDate;

        if (this.modes.increment == false) {
            clearInterval(this.modes.loop.interval);
            console.log(btn);
            btn.setAttribute("class", "navBtn -play-button");
            //btn.style.background = "blue";

        } else {
            btn.setAttribute("class", "navBtn -play-button -play-button-clicked");
            //    btn.style.background = "yellow";
            this.animate();
        }
    }

    // used in main app.js :: for data parsing and ordering
    orderByDate() {
        const ordered = {};
        const d = this.data;
        Object.keys(this.data).sort().forEach(function (key) {
            ordered[key] = d[key];
        });
        this.data = ordered;
    }

    // bind range selector event to scene 
    updateUIRangeSelector() {

        const dis = this; //save global context before losing "this" to the html range selector
        var range = document.getElementById("dateRate");
        range.setAttribute("max", this._nbOfDays);
        range.addEventListener("input", () => {
            const date = Object.keys(dis.data)[range.value];
            s.updateOffsetScreen_date(date);
        });
        range.addEventListener("change", () => {

            if (dis.modes.increment) {
                clearInterval(dis.modes.loop.interval);
            }
            const date = Object.keys(dis.data)[range.value];
            dis.modes.loop.currentRangeSelect = parseInt(range.value, 10);

            // console.log(date);
            const dateDisplay = document.getElementById("dateValue");
            dis.updateHud(dateDisplay, date);

            const dayData = dis.data[date];
            dis._currentSet = dayData;
            dis.currentOrdererdSet = this.sortConfirmed();
            dis.updatePopScale(dayData);

            //reset modes to manual
            dis.modes.increment = false;
            dis.modes.byDate = true;

        });
    }

    // as named
    updateHud(dateContainer, date) {
        dateContainer.textContent = date;
        s.updateOffsetScreen_date(date);
        s.updateOffsetScreen_zone();
    }

    // helper to find min/max :: used to even out scales
    findMinMax(set, category) {
        set[Symbol.iterator] = function* () {
            yield*[...this.entries()].sort((a, b) => a[1][category].count - b[1][category].count);
        }

        const sortedByCount = [...set];
        const minMax = {
            min: sortedByCount[0][1][category].count,
            max: sortedByCount[sortedByCount.length - 1][1][category].count
        };

        return minMax;
    }

    // as named
    updatePopScale(data) {
        const d = data;
        this.population.forEach(country => {
            country.updateScale(d, this.getSelectedMode(), this.shouldReset);
        })
    }

    // as named
    updateProjModels(proj) {
        this.mapStyle = proj;
        if (proj == "spherical") {
            mappemonde.hide("mappemonde");
            globe.show("globe", "core", "aura");
        } else {
            mappemonde.show("mappemonde");
            globe.hide("globe", "core", "aura");
        }
    }

    // as named
    getSelectedMode() {
        var m = Array.from(Object.values(this.modes))
        for (m in this.modes) {
            if (this.modes[m] == true) {
                return m;
            }
        }
    }

    sortConfirmed() {

        var cSet = [...this.currentSet];

        var sortedByCases = [];
        for (var confirmedCase in cSet) {
            sortedByCases.push([cSet[confirmedCase][0], cSet[confirmedCase][1].Confirmed.count]);
        }

        sortedByCases.sort(function (a, b) {
            return b[1] - a[1];
        });

        var threshedMap = sortedByCases.slice(0, maxUni);

        var sortedMap = new Map();
        threshedMap.forEach((c) => {
            sortedMap.set(c[0], c[1]);
        })

        return sortedMap;
    }

    // autoplay loop
    animate() {
        var i = parseInt(this.modes.loop.currentRangeSelect, 10);
        this.modes.loop.interval = setInterval(() => {
            const dis = this; //save global context before losing "this" to the html range selector
            var range = document.getElementById("dateRate");
            range.value = i;

            const date = Object.keys(dis.data)[range.value];
            const dateDisplay = document.getElementById("dateValue");
            dis.updateHud(dateDisplay, date);

            const dayData = dis.data[date];
            dis._currentSet = dayData;

            dis.currentOrdererdSet = this.sortConfirmed();

            dis.updatePopScale(dayData);
            // behaviour upon reaching last date
            i = (i < (dis._nbOfDays - 1)) ? i + 1 : 0;
            this.modes.loop.currentRangeSelect = i;
            if (i == 0) {
                this.shouldReset = true;
            } else {
                this.shouldReset = false;
            }
        }, 250)
    }

}