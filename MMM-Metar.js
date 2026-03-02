// Module to display METARs with no formatting, fetching from `https://avwx.rest/` API for consistency and international use.

//https://avwx.rest/api/metar/{airport}?token={token}&filter=sanitized

Module.register("MMM-Metar", {
    // Default module config.
    defaults: {
      apiKey: "",
      airports: [ "KSFO","PAO","HAF","JFK" ],
      updateInterval: 10 * 60 * 1000, //every 10 minutes
      initialLoadDelay: 0, // 0 seconds delay
      listClass: "metarsList",
      alternateBackgrounds: true,
      borderBottom: true,
      warnLength: 10,
      decoded: true,
    },

    metars: {},

    getHeader: function() {
        return this.data.header ? this.data.header : "METARs";
    },

    start () {
        //minor 'hack' to keep airports in order listed
        this.config.airports.forEach((airport) => {
            Log.info(airport);
            this.metars[airport] = '';
        });
        if(this.config.length > this.config.warnLength) {
            Log.warn(this.data.name + ": More than " + this.config.warnLength + " airports configured.");
        }
        Log.info(this.data.name + ": Fetching initial METARs");
		this.scheduleUpdate(this.config.initialLoadDelay);
    },

    getStyles() {
        return ["MMM-Metar.css"];
    },

    getTranslations() {
        return {
            de: "translations/de.json",
            en: "translations/en.json",
        };
    },


    getDom() {
        const wrapper = document.createElement("div");

        if (!this.config.apiKey) {
            const msg = document.createElement("h2");
            msg.textContent = this.translate("METAR_NO_API_KEY");
            wrapper.appendChild(msg);
            return wrapper;
        }

        const positionClass = ['top_left', 'bottom_left', 'top_right', 'bottom_right'].includes(this.data.position)
            ? 'metarHalf' : 'metarFull';

        const hasData = Object.values(this.metars).some(v => v !== '');
        if (!hasData) {
            const loading = document.createElement("div");
            loading.className = "dimmed light small";
            loading.textContent = this.translate("METAR_LOADING");
            wrapper.appendChild(loading);
            return wrapper;
        }

        if (this.config.decoded) {
            const table = document.createElement("table");
            table.className = `metarTable metarDecoded ${this.config.listClass} ${positionClass}`;

            const headers = ["METAR_STATION", "METAR_TIME", "METAR_WIND", "METAR_VISIBILITY",
                "METAR_WEATHER", "METAR_CLOUDS", "METAR_TEMP_DEW", "METAR_PRESSURE", "METAR_FLIGHT_RULES"];
            const thead = document.createElement("thead");
            const headerRow = document.createElement("tr");
            headers.forEach(key => {
                const th = document.createElement("th");
                th.textContent = this.translate(key);
                headerRow.appendChild(th);
            });
            thead.appendChild(headerRow);
            table.appendChild(thead);

            const tbody = document.createElement("tbody");
            Object.values(this.metars).forEach((data, index) => {
                const row = this.parseMetar(data);
                if (!row) return;
                const tr = document.createElement("tr");
                if (this.config.alternateBackgrounds && index % 2 === 1) tr.classList.add("altRow");
                if (this.config.borderBottom) tr.classList.add("borderBottom");

                const cells = [
                    { text: row.station, cls: "bright" },
                    { text: row.time },
                    { text: row.wind },
                    { text: row.visibility },
                    { text: row.weather },
                    { text: row.clouds },
                    { text: `${row.temp} / ${row.dewpoint}` },
                    { text: row.pressure },
                    { text: row.flightRules, cls: `flightRules ${row.flightRules}` },
                ];
                cells.forEach(({ text, cls }) => {
                    const td = document.createElement("td");
                    td.textContent = text;
                    if (cls) td.className = cls;
                    tr.appendChild(td);
                });
                tbody.appendChild(tr);
            });
            table.appendChild(tbody);
            wrapper.appendChild(table);
        } else {
            const container = document.createElement("div");
            container.className = `metarTable ${this.config.listClass} ${positionClass}`;

            Object.values(this.metars).forEach((metar, index) => {
                const div = document.createElement("div");
                let cls = "metar";
                if (this.config.alternateBackgrounds && index % 2 === 1) cls += " altRow";
                if (this.config.borderBottom) cls += " borderBottom";
                div.className = cls;
                div.textContent = metar;
                container.appendChild(div);
            });
            wrapper.appendChild(container);
        }

        return wrapper;
    },

    formatMetarTime(timeObj) {
        if (timeObj.dt) {
            const d = new Date(timeObj.dt);
            const day = String(d.getUTCDate()).padStart(2, '0');
            const hh  = String(d.getUTCHours()).padStart(2, '0');
            const mm  = String(d.getUTCMinutes()).padStart(2, '0');
            return `${day}. ${hh}:${mm}`;
        }
        // fallback: parse repr "DDHHMMSZ" → "211156Z"
        const r = timeObj.repr.replace('Z', '');
        const day = r.slice(0, 2);
        const hh  = r.slice(2, 4);
        const mm  = r.slice(4, 6);
        return `${day}. ${hh}:${mm}`;
    },

    parseMetar(data) {
        if (!data || typeof data === 'string') return null;

        let wind = this.translate('METAR_CALM');
        if (data.wind_speed && data.wind_speed.value > 0) {
            wind = data.wind_direction ? `${data.wind_direction.value}° ${data.wind_speed.value} kt` : `${data.wind_speed.value} kt`;
            if (data.wind_gust && data.wind_gust.value > 0) {
                wind += ` G${data.wind_gust.value} kt`;
            }
        }

        return {
            station: data.station || '—',
            time: data.time ? this.formatMetarTime(data.time) : '—',
            wind,
            visibility: data.visibility ? `${data.visibility.repr} SM` : '—',
            weather: data.wx_codes && data.wx_codes.length > 0 ? data.wx_codes.map(w => w.repr).join(' ') : '—',
            clouds: data.clouds && data.clouds.length > 0 ? data.clouds.map(c => c.repr).join(' ') : 'CLR',
            temp: data.temperature != null ? `${data.temperature.value} °C` : '—',
            dewpoint: data.dewpoint != null ? `${data.dewpoint.value} °C` : '—',
            pressure: data.altimeter ? `${data.altimeter.value} inHg` : '—',
            flightRules: data.flight_rules || '—',
        };
    },

	scheduleUpdate (delay = null) {
		let nextLoad = this.config.updateInterval;
		if (delay !== null && delay >= 0) {
			nextLoad = delay;
		}

		setTimeout(() => {
            this.update()
        }, nextLoad);
	},

    update() {
        Log.info(this.data.name + ": Fetching new METARs (" + this.config.airports.join(", ") + ")")
        this.config.airports.forEach((airport)=> {
            var updated = false;
            Log.info(this.data.name + ": Fetching " + airport)
            const filter = this.config.decoded ? '' : '&filter=sanitized';
            this.fetchData("https://avwx.rest/api/metar/" + airport + "?token=" + this.config.apiKey + filter)
                .then((data) => {
                    const value = this.config.decoded ? data : data.sanitized;
                    if(JSON.stringify(value) !== JSON.stringify(this.metars[airport])) {
                        this.metars[airport] = value;
                        updated = true
                    }
                    //this.updateDom(300);
                })
                .catch((request) => {
                    Log.error(this.data.name + ": unable to load:", request);
                })
                .finally(() => {
                    if(updated) {
                        this.updateDom(300);
                    }
                });
        });
        this.scheduleUpdate();
    },

    async fetchData(url) {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`);
        }
        return response.json();
    }
  });
