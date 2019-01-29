import template from '../../templates/template.html'
import xr from 'xr';
import palette from '../modules/palette'
import { Toolbelt } from '../modules/toolbelt'
import { Gis } from '../modules/gis'
import { $, $$, round, numberWithCommas, wait, getDimensions } from '../modules/util'
import Ractive from 'ractive'
import ractiveTap from 'ractive-events-tap'
import ractiveEventsHover from 'ractive-events-hover'
import noUiSlider from 'nouislider'
import moment from 'moment'
import Choices from 'choices.js'
import GoogleMapsLoader from 'google-maps';
import mapstyles from '../modules/mapstyles.json'
import L from 'leaflet' // npm install leaflet@1.0.3. v 1.0.3 Check it out... https://blog.webkid.io/rarely-used-leaflet-features/
//npm install leaflet@1.3.1
import 'leaflet.markercluster'
import '../modules/Leaflet.GoogleMutant.js'
import * as topojson from "topojson"
import share from '../modules/share'
import smoothscroll from 'smoothscroll-polyfill';

smoothscroll.polyfill();
Ractive.DEBUG = false;

export class Frontier {

	constructor(data) {

		var self = this

        this.toolbelt = new Toolbelt()

        this.gis = new Gis()

        this.screenWidth = document.documentElement.clientWidth

        this.screenHeight = document.documentElement.clientHeight - 100

        this.nom = 5 // Number of masacres on radial search

        this.googledoc = data

        this.identities =   [{
                              value: "0",
                              label: "Aboriginal Civilians",
                              tag: "Aboriginal_Civilians",
                              selected: true
                            },{
                              value: "1",
                              label: "Aboriginal Warriors",
                              tag: "Aboriginal_Warriors",
                              selected: true
                            },{
                              value: "2",
                              label: "Military / Police / Government",
                              tag: "Military_Police_Government",
                              selected: true
                            },{
                              value: "3",
                              label: "Native Police",
                              tag: "Native_Police",
                              selected: true
                            },{
                              value: "4",
                              label: "Settlers / Stockmen",
                              tag: "Settlers_Stockmen",
                              selected: true
                            },{
                              value: "5",
                              label: "Colonial Civilians",
                              tag: "Colonial_Civilians",
                              selected: true
                            }]


        for (var i = 0; i < self.googledoc.length; i++) {

            self.googledoc[i].id = i
            self.googledoc[i].Latitude = +self.googledoc[i].Latitude
            self.googledoc[i].Longitude = +self.googledoc[i].Longitude
            self.googledoc[i].idcfv = +self.googledoc[i].idcfv
            self.googledoc[i].total_dead = +self.googledoc[i].Coloniser_Dead + +self.googledoc[i].Aborig_Dead
            self.googledoc[i].year = moment(self.googledoc[i].DateStart, 'YYYY-MM-DD').format('YYYY');
            self.googledoc[i].identities = []
            self.googledoc[i].article = (self.googledoc[i].Key!="") ? true : false ;

            for (var ii = 0; ii < self.identities.length; ii++) {

                if (self.googledoc[i][self.identities[ii].tag]=='y') {
                    self.googledoc[i].identities.push(ii)
                }

            }

        }

        this.latitude = -25.191917

        this.longitude = 133.772541

        this.southWest = { lat: -43.656082, lng: 112.015037 }

        this.northEast = { lat: -10.935978, lng: 154.641985 }

        this.zoom = 5

        this.zoomstart = 5

        this.map = null

        this.database = {

            geolocation: false,

            geocheck:  true,

            userLatitude: null,

            userLongitude: null,

            latitude: null,

            longitude: null,

            height: null,

            DateStart: 1776,

            DateEnd: 1929,

            records: [],

            topfive: [],

            massacre: [],

            article: [],

            postcodes: [],

            postcodeShortlist: [],

            list: false,

            radial: false,

            deaths: ["6 to 10", "11 to 20", "More than 20"],

            motivation: ["Retribution", "Opportunity", "Defence", "Dispersal", "Unknown"],

            specials: ["Aboriginal Civilians", "Aboriginal Warriors", "Military / Police / Government", "Native Police", "Settlers / Stockmen", "Colonial civilians"],

            identities: [0,1,2,3,4,5],

            filterMotivation: "All",

            filterDeaths: "All",

            filterSpecial: "",

            proximity: false,

            url: function(urlWeb) {

                return urlWeb;

            },

            dist: function(metres) {

                return (metres / 1000).toFixed(1)

            }

        }

        this.database.records = this.googledoc

        this.database.height = this.screenHeight

        this.postcoder()

	}

    postcoder() {

        var self = this

        xr.get('https://interactive.guim.co.uk/docsdata/1bClr8buuWUaKj01NolwaJy2JR_SR5hKEAjQoJPaGKcw.json').then((resp) => {

            self.database.postcodes = resp.data.sheets.postcodes

            self.database.postcodes.forEach(function(value, index) {

                value.latitude = +value.latitude
                value.longitude = +value.longitude
                value["meta"] = value.postcode + ' | ' + value.place_name;

            });

            self.ractivate()
            
        });

    }

    ractivate() {

        var self = this

        this.ractive = new Ractive({
            events: { 
                tap: ractiveTap,
                hover: ractiveEventsHover
            },
            el: '#frontier_app',
            data: self.database,
            template: template,
        })

        this.ractive.observe('user_input', ( input ) => {

            if (input && input.length > 2) {

               self.database.list = true

                var reg = new RegExp(input,'gi');

                self.database.postcodeShortlist = self.database.postcodes.filter(function(item) {

                    if (reg.test(item.meta)) {

                        return item

                    }

                });

            } else {

               self.database.list = false

            }

            self.ractive.set(self.database)

        });

        this.ractive.on('postcode', (context, lat, lng) => {

            self.database.user_input = ""
            self.database.list = false
            self.database.radial = true
            self.ractive.set(self.database)
            self.getClosest(lat, lng)

        })

        this.ractive.on('deathcount', (context, deathcount) => {

            self.database.filterDeaths = deathcount;

            self.getData().then( (data) => {

                self.ractive.set(self.database)

            })

        })

        this.ractive.observe('proximity', ( proximity ) => {

            self.database.proximity = proximity
            
            self.ractive.set(self.database)

            if (self.database.geocheck) {

                self.geocheck()

            }

            if (!self.database.proximity) {

                // Remove any circles or cluser stuff if the user switches to explore mode

                if (self.rads != undefined && self.clusters != undefined) {

                    self.removerStuff()

                }

            }

        })

        this.ractive.on( 'results', function ( context ) {

            var target = document.getElementById("legend")

            if (target.classList.contains('hideFilters')) {

                target.classList.remove('hideFilters')

            } else {

                target.classList.add('hideFilters')

            }

        });

        this.ractive.on( 'geo', function ( context ) {

            if (self.database.userLatitude!=null) {

                self.getClosest(self.database.userLatitude, self.database.userLongitude)

            }

            //self.scrollTo($("#navbar"), 200)

        });


        this.ractive.on( 'top', function ( context ) {

            //self.scrollTo($("#navbar"),200)

        });

        this.ractive.on( 'info', function ( context, id ) {

            self.loadMassacre(id);

            //self.scrollTo($("#navbar"),200)

        });

        this.ractive.on( 'social', function ( context, channel ) {

            var title = "Frontier wars." ;

            var message = 'Frontier wars.'

            let sharegeneral = share(title, "https://www.theguardian.com/environment/ng-interactive/2018/aug/06/people-powered", 'https://i.guim.co.uk/img/media/6a1139738b7d9ccd958b4652a0261b02e87f1f95/0_0_1000_600/master/1000.jpg?width=1200&height=630&quality=85&auto=format&fit=crop&crop=faces%2Centropy&bm=normal&ba=bottom%2Cleft&blend64=aHR0cHM6Ly9hc3NldHMuZ3VpbS5jby51ay9pbWFnZXMvb3ZlcmxheXMvZDM1ODZhNWVmNTc4MTc1NmQyMWEzYjYzNWU1MTcxNDEvdGctZGVmYXVsdC5wbmc&s=831c1bb89135b735ad9b9470726ba453', '', '#PeoplePowe#4d605c', message);

            sharegeneral(channel);

        });
        
        this.googleizer()

    }

    geocheck() {

        var self = this

        self.database.geolocation = ("geolocation" in navigator) ? true : false ;

        var geo_options = {
          enableHighAccuracy: true, 
          maximumAge        : 30000, 
          timeout           : 27000
        };

        if (self.database.geolocation) {

            navigator.geolocation.getCurrentPosition(function(position) {

                self.database.userLatitude = position.coords.latitude

                self.database.userLongitude = position.coords.longitude

                self.watchID = navigator.geolocation.watchPosition(self.geo_success, self.geo_error, geo_options);

            });
        }

        self.database.geocheck = false

        self.ractive.set(self.database)

    }

    geo_success(position) {

        //var self = this

        //self.database.userLatitude = position.coords.latitude

        //self.database.userLongitude = position.coords.longitude

        //console.log(position.coords.latitude, position.coords.longitude);

    }

    geo_error(error) {

        /*

        var self = this

        console.log(error)

        self.database.geolocation = false

        navigator.geolocation.clearWatch(self.watchID);

        self.ractive.set(self.database)

        */

    }

    googleizer() {

        var self = this

        GoogleMapsLoader.KEY = 'AIzaSyD8Op4vGvy_plVVJGjuC5r0ZbqmmoTOmKk';
        GoogleMapsLoader.REGION = 'AU';
        GoogleMapsLoader.load(function(google) {
            self.initMap()
        });

    }

    initMap() {

        var self = this

        this.map = new L.Map('map', { 
            renderer: L.canvas(),
            center: new L.LatLng(self.latitude, self.longitude), 
            zoom: self.zoom,
            scrollWheelZoom: false,
            dragging: true,
            zoomControl: true,
            doubleClickZoom: true,
            zoomAnimation: true
        })

        self.map.zoomControl.setPosition('topright');

        var styled = L.gridLayer.googleMutant({

            type: 'roadmap',

            styles: mapstyles

        }).addTo(self.map);

        /*
        self.map.on('zoomend', function(e) {

            self.zoomend = self.map.getZoom();

            console.log(self.zoomstart + ' | ' + self.zoomend)

            if (self.zoomend > self.zoomstart) {

                for (var i = 0; i < self.array.length; i++) {

                    console.log(self.array[i].getRadius())

                    self.array[i].setRadius(self.array[i].getRadius() * 2);

                }


            } else {

                for (var i = 0; i < self.array.length; i++) {

                    self.array[i].setRadius(self.array[i].getRadius() / 2);

                }

            }

            self.zoomstart = self.map.getZoom();

        });

        */


        //this.map.on('zoomend', function(e) {

            /*

            var zoom = self.map.getZoom();

            for (var i = 0; i < self.array.length; i++) {

                self.array[i].setRadius(self.zoomLevel(zoom));

            }

            */

      //  });

        this.map.on('click', function(e) {

            self.database.radial = false

            if (self.database.proximity) {

                self.getClosest(e.latlng.lat, e.latlng.lng)

            } else {

                //self.map.panTo(new L.LatLng(e.latlng.lat, e.latlng.lng));

                //self.scrollTo($("#navbar"), 0)

            }

        });

        this.compile()

        this.casualties()

        this.topo()

        this.appscroll()

    }

    appscroll() {

        var isAndroidApp = (window.location.origin === "file://" && /(android)/i.test(navigator.userAgent) ) ? true : false ;

        var el = document.getElementById('map');

        el.ontouchstart = function(e){

            if (isAndroidApp && window.top.GuardianJSInterface.registerRelatedCardsTouch) {

              window.top.GuardianJSInterface.registerRelatedCardsTouch(true);

            }
        };

        el.ontouchend = function(e){

            if (isAndroidApp && window.top.GuardianJSInterface.registerRelatedCardsTouch) {

              window.top.GuardianJSInterface.registerRelatedCardsTouch(false);

            }

        };

    }

    zoomLevel(num) {
        return (num < 11) ? '2500' :
        (num < 10) ? '1250' :
        (num < 9) ? '625' :
        (num < 8) ? '321.5' :
        (num < 7) ? '156.25' :
        (num < 6) ? '78.125' :
        (num < 5) ? '40' :
        (num < 4) ? '20' :
        (num < 3) ? '10' :
        (num < 2) ? '5' : '5';
    }

    getClosest(lat, lng) {

        var self = this

        self.database.latitude = lat;

        self.database.longitude = lng;

        for (var i = 0; i < self.database.records.length; i++) {

            self.database.records[i].distance = self.gis.sphericalCosinus(self.database.records[i].Latitude, self.database.records[i].Longitude,lat,lng)

        }

        self.database.records.sort( (a, b) => {

            return a["distance"] - b["distance"]

        });

        var mark = (self.database.records.length > 5) ? self.nom : self.database.records.length ;

        var distance = self.database.records[mark].distance * 1.2 ;

        var hypotenuse = Math.sqrt( ( distance * distance ) + ( distance * distance ) )

        var southWest = self.gis.createCoord([lng, lat], 225, hypotenuse)

        var northEast = self.gis.createCoord([lng, lat], 45, hypotenuse)

        self.map.fitBounds([[southWest[1],southWest[0]], [northEast[1], northEast[0]]]);

        var copy = JSON.parse(JSON.stringify(self.database.records))

        self.database.topfive = copy.splice(0, mark)

        self.ractive.set(self.database)

        self.renderCircles(lat, lng)


    }

    removerStuff() {

        var self = this

        if(self.map.hasLayer(self.rads)){

            self.rads.eachLayer(
                function(l){ 
                    self.rads.removeLayer(l);
            });
        }

        if(self.map.hasLayer(self.clusters)){

            self.map.removeLayer(self.clusters);

        }


    }

    renderCircles(lat, lng) {

        var self = this

        if(self.map.hasLayer(self.rads)){

            self.rads.eachLayer(
                function(l){ 
                    self.rads.removeLayer(l);
            });
        }

        if(self.map.hasLayer(self.clusters)){

            self.map.removeLayer(self.clusters);

        }

        var array = [];

        var countdown = 0.5

        if (self.database.proximity) { // self.database.radial

            for (var i = 0; i < self.database.topfive.length; i++) {

                let radius = L.circle([lat, lng], self.database.topfive[i].distance,{ weight: 1, dashArray: "5 10", color:'darkgrey',opacity:countdown,fillOpacity:0})

                countdown = countdown - 0.05

                array.push(radius);
            }

        } else {

            var mark = (self.database.records.length > 5) ? self.nom - 1 : self.database.records.length - 1 ;

            let radius = L.circle([lat, lng], self.database.topfive[mark].distance,{ weight: 1, dashArray: "5 10", color:'darkgrey',opacity:countdown,fillOpacity:0})

            array.push(radius);

        }

        self.clusters = new L.MarkerClusterGroup({
                            iconCreateFunction: function(cluster) {
                                var children = cluster.getAllChildMarkers();
                                var sum = 0;
                                for (var i = 0; i < children.length; i++) {
                                    sum += children[i].options.icon.options.html;
                                }
                                return new L.DivIcon({ html: '<b>&#43;</b>' });
                            }
                        });

        for (var i = 0; i < self.database.topfive.length; i++) {

            var icon = L.marker([self.database.topfive[i].Latitude, self.database.topfive[i].Longitude], {
              icon: L.divIcon({
                  className: 'number_of_dead_' + self.colourizer(self.database.topfive[i].total_dead),
                  html: self.database.topfive[i].total_dead,
                  id: self.database.topfive[i].id
              })
            }).on('mouseover', function (e) {

                var massacre = document.querySelector("[data-massacre='" + e.target.options.icon.options.id + "']");
                massacre.style.backgroundColor = "#4d605c";
                
            }).on('mouseout', function (e) {

                var massacre = document.querySelectorAll(".massacre_row")

                for (var i = 0; i < massacre.length; i++) {
                    massacre[i].style.backgroundColor = "transparent";
                }

            }).on('click', function (e) {
                self.map.panTo(new L.LatLng(e.latlng.lat, e.latlng.lng));
                self.loadMassacre(e.target.options.icon.options.id)
            });

            //array.push(icon);

            self.clusters.addLayer(icon);

        }

        self.map.addLayer(self.clusters);

        /*
        var markers = L.markerClusterGroup();
        markers.addLayer(L.marker(getRandomLatLng(map)));
        ... Add more layers ...
        map.addLayer(markers);
        */


        self.rads = L.featureGroup(array).addTo(self.map);


    }

    colourizer(num) {
        return (num < 11) ? '1' :
        (num < 21) ? '2' : '3' ;
    }

    topo() {

        function colourizer(num) {

            return (num < 11) ? 'orange' : (num < 21) ? 'red' : '#6d0909' ;

        }

        var self = this

        if(self.map.hasLayer(self.massacres)) {

            self.massacres.eachLayer(
                function(l){ 
                    self.massacres.removeLayer(l);
            });
        }

        self.array = [];

        for (var i = 0; i < self.database.records.length; i++) {

            var item = self.database.records[i];

            let marker = new L.circle([item.Latitude,item.Longitude], {
                color: colourizer(item.total_dead),
                opacity: 1,
                fillColor: colourizer(item.total_dead),
                fillOpacity: 1,
                id: item.id, //idcfv
                radius: 1000
            });

            self.array.push(marker);
        }

        self.massacres = L.featureGroup(self.array).addTo(self.map);

        self.massacres.on("click", (e) => {

            self.map.panTo(new L.LatLng(e.latlng.lat, e.latlng.lng));

            self.loadMassacre(e.layer.options.id);

        });

    }

    loadArticle(key) {

        var self = this

        xr.get(`https://interactive.guim.co.uk/docsdata/${key}.json?t=${new Date().getTime()}`).then((resp) => {

            self.database.massacre.editorial = resp.data

            self.ractive.set(self.database)

            //self.scrollTo($("#frontier-results"), 200)

        });

    }

    loadMassacre(id) {

        var self = this

        var massacre = self.googledoc.find( (item) => {

            return item.id === id

        });

        self.database.massacre = massacre

        if (self.database.massacre.article) {

            self.loadArticle(self.database.massacre.Key)

        } else {

            self.database.massacre.editorial = []

            self.ractive.set(self.database)

            //self.scrollTo($("#frontier-results"), 2000)

        }

    }

    casualties() {

        var self = this

        this.choice = new Choices(document.getElementById('casualties'), {

            removeItemButton: true,

        });

        this.choice.setChoices(self.identities, 'value', 'label', false);

        this.choice.passedElement.element.addEventListener('addItem', function(event) {

            self.database.identities.push(+event.detail.value)

                self.getData().then( (data) => {

                    self.ractive.set(self.database)

                })

        });

        this.choice.passedElement.element.addEventListener('removeItem', function(event) {

            var index = self.database.identities.indexOf(+event.detail.value);

            if (index !== -1) self.database.identities.splice(index, 1);

            self.getData().then( (data) => {

                self.ractive.set(self.database)

            })

        });


    }

    compile() {

        var self = this

        var slider = document.getElementsByClassName('filter_slider')[0];

        noUiSlider.create(slider, {
            start: [1776, 1929],
            connect: true,
            range: {
                'min': 1776,
                'max': 1929
            }
        });

        slider.noUiSlider.on('slide', function( values, handle, unencoded, tap, positions ) {

            self.database.DateStart = parseInt(values[0])

            self.database.DateEnd = parseInt(values[1])

            self.getData().then( (data) => {

                self.ractive.set(self.database)

            })

        });

    }

    getData() {

        var self = this

        return new Promise((resolve, reject) => {

            // Select the data that fall between the specified dates
            var data_one = self.googledoc.filter(function(item) {

                if (item.year >= self.database.DateStart && item.year <= self.database.DateEnd) {
                    return item
                }

            });


            // Set the range for the number of deaths
            var range = (self.database.filterDeaths === '6 to 10') ? [6,10] :
            (self.database.filterDeaths === '11 to 20') ? [11,20] :
            (self.database.filterDeaths === 'More than 20') ? [21,1000] : [0,1000] ;

            var data_two = data_one.filter(function(item) {

                if (item.total_dead >= range[0] && item.total_dead <= range[1]) {
                    return item
                }

            })


            var data_three = data_two.filter(function(item) {

                //returns true for 1 or more matches, where 'a' is an array and 'b' is a search string or an array of multiple search strings
                if ( self.toolbelt.contains(item.identities, self.database.identities) ) {
                    return item
                }

            })


            self.database.records = data_three

            self.topo()

            if (self.database.latitude!=null && self.database.longitude!=null && self.database.proximity) {
                self.getClosest(self.database.latitude, self.database.longitude)
            }

            resolve(data_one);  

        })


    }

    scrollTo(element, time) {

        var self = this

        self.scroll_timeout = setTimeout(function() {

            var elementTop = window.pageYOffset + element.getBoundingClientRect().top

            window.scroll({
              top: elementTop,
              behavior: "smooth"
            });

        }, time);

    }

}