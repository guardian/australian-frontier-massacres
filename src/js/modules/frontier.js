import template from '../../templates/template.html'
import modalTemplate from '../../templates/modal.html'
import tipsTemplate from '../../templates/tips.html'
import xr from 'xr';
import palette from '../modules/palette'
import { Toolbelt } from '../modules/toolbelt'
import { Gis } from '../modules/gis'
import { $, $$, round, numberWithCommas, wait, getDimensions } from '../modules/util'
import Ractive from 'ractive'
import ractiveTap from 'ractive-events-tap'
import ractiveEventsHover from 'ractive-events-hover'
import ractiveFade from 'ractive-transitions-fade'
import noUiSlider from 'nouislider'
import moment from 'moment'
import GoogleMapsLoader from 'google-maps';
import mapstyles from '../modules/mapstyles.json'
import L from '../modules/leaflet/dist/leaflet-src' // Check it out... https://blog.webkid.io/rarely-used-leaflet-features/
import Modal from '../modules/modal'
import '../modules/Leaflet.GoogleMutant.js'
import '../modules/sidebar.js'
import * as topojson from "topojson"
import share from '../modules/share'
import australia from '../modules/states.json'
import smoothscroll from 'smoothscroll-polyfill';
import bbox from 'geojson-bbox';
import * as ElementPosition from 'element-position';

smoothscroll.polyfill();
Ractive.DEBUG = false;

export class Frontier {

	constructor(data) {

		var self = this

        this.toolbelt = new Toolbelt()

        this.gis = new Gis()

        this.screenWidth = document.documentElement.clientWidth

        this.screenHeight = document.documentElement.clientHeight

        this.isMobile = this.toolbelt.mobileCheck()

        this.nom = 5 // Number of masacres on radial search

        this.googledoc = data

        this.boundingbox = [{

            "northEast" : { "lat": -10.935978, "lng": 154.641985 },

            "southWest" : { "lat": -43.656082, "lng": 112.015037 }

        }]

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
            self.googledoc[i].idcfv = self.googledoc[i].idcfv
            self.googledoc[i].total_dead = +self.googledoc[i].Total_Dead_Mean //+self.googledoc[i].Coloniser_Dead + +self.googledoc[i].Aborig_Dead
            self.googledoc[i].Aborig_Dead_Min = +self.googledoc[i].Aborig_Dead_Min
            self.googledoc[i].Aborig_Dead_Max = +self.googledoc[i].Aborig_Dead_Max
            self.googledoc[i].Aborig_Dead_Mean = +self.googledoc[i].Aborig_Dead_Mean
            self.googledoc[i].Coloniser_Dead_Min = +self.googledoc[i].Coloniser_Dead_Min
            self.googledoc[i].Coloniser_Dead_Max = +self.googledoc[i].Coloniser_Dead_Max
            self.googledoc[i].Coloniser_Dead_Mean = +self.googledoc[i].Coloniser_Dead_Mean
            self.googledoc[i].year = moment(self.googledoc[i].Date_Mid, 'YYYY-MM-DD').format('YYYY');
            self.googledoc[i].identities = []
            self.googledoc[i].article = (self.googledoc[i].Image!="") ? true : false ;
            self.googledoc[i].AborigEst = self.estimizer('Aboriginal', self.googledoc[i].Aborig_Dead_Min, self.googledoc[i].Aborig_Dead_Max, self.googledoc[i].Aborig_Dead_Mean)
            self.googledoc[i].ColoniserEst = self.estimizer('Coloniser', self.googledoc[i].Coloniser_Dead_Min, self.googledoc[i].Coloniser_Dead_Max, self.googledoc[i].Coloniser_Dead_Mean)

            for (var ii = 0; ii < self.identities.length; ii++) {

                if (self.googledoc[i][self.identities[ii].tag]=='y') {
                    self.googledoc[i].identities.push(ii)
                }

            }

        }

        this.latitude = -27

        this.longitude = 133.772541

        this.southWest = { lat: -43.656082, lng: 112.015037 }

        this.northEast = { lat: -10.935978, lng: 154.641985 }

        this.zoom = (self.screenWidth < 600) ? 3 : (self.screenWidth < 800) ? 4 : 5 ;

        this.zoomstart = 5

        this.map = null

        this.database = {

            info: false,

            tips: [{
                "posX" : 0,
                "posY" : 0,
                "title" : "Explore and proximity mode",
                "tip": "You can switch between explore and proximity modes. Proximity mode lets you view massacres in proximity to a location you have selected (either by using the postcode search feature or by tapping the geolocation button). In explore mode you can pan, zoom in or out, or reorientate the map to display incidents by state boundaries. In either mode click on a map marker to view more information about the massacres."
            },{
                "posX" : 0,
                "posY" : 0,
                "title" : "Filter panel toggle",
                "tip" : "You can toggle the filter panel on and off. When the filter panel is open you can specify a date range, filter results by the number of fatalities, or display massacres in which certain groups were involved."
            }],

            tip: "",

            tipDisplay: false,

            currentTip: 0,

            currentPosX: null,

            currentPosY: null,

            geolocation: false,

            geocheck:  true,

            userLatitude: null,

            userLongitude: null,

            latitude: null,

            longitude: null,

            height: null,

            DateStart: 1776,

            DateEnd: 1928,

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

            outsiders: [],

            filterMotivation: "All",

            filterDeaths: "All",

            filterSpecial: "",

            proximity: false,

            legend: (self.isMobile|| window.location.origin === "file://" || window.location.origin === null) ? true: false,

            isMobile: (self.isMobile || window.location.origin === "file://" || window.location.origin === null) ? true: false,

            isApp: (window.location.origin === "file://" || window.location.origin === null) ? true : false ,

            logging: "Console log output for testing:<br/>",

            smallScreen: null,

            fatalities: 'All',

            first: true,

            fatalitiesCheck: function(fatalities,category) {

                return (fatalities==category) ? true : false;

            },

            deathcountCheck: function(deathCount,category) {

                return (deathCount==category) ? true : false;

            },

            url: function(urlWeb) {

                return urlWeb;

            },

            dist: function(metres) {

                return (metres / 1000).toFixed(1)

            }

        }

        if (this.screenHeight > (this.screenWidth * 2)) {

            this.screenHeight = this.screenWidth

        } else {

            this.screenHeight = this.screenHeight - 100

        }

        this.database.tip = this.database.tips[0].tip

        this.database.logging = this.database.logging += `Mobile: ${(self.isMobile) ? true: false } <br/>` ;

        this.database.records = this.googledoc

        this.database.height = (self.isMobile || window.location.origin === "file://" || window.location.origin === null) ? self.screenWidth : self.screenHeight ;

        this.database.smallScreen = this.screenTest()

        this.postcoder()

	}

    estimizer(label, min, max, mean) {

        var estimate = (min!=max&&min!=0&&max!=0) ? `<strong>${label} dead mean</strong>: ${mean} (min estimate: ${min}, max estimate: ${max})` : `<strong>${label} dead</strong>: ${mean}` ; 

        return estimate

    }

    screenTest() {

        return (window.innerWidth < 740) ? true : false ;

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
            
        });

    }

    resize() {

        var self = this

        window.addEventListener("resize", function() {

            clearTimeout(document.body.data)

            document.body.data = setTimeout( function() { 

                console.log("Resized")

                self.screenWidth = document.documentElement.clientWidth

                self.screenHeight = document.documentElement.clientHeight

                if (self.screenHeight > (self.screenWidth * 2)) {

                    self.screenHeight = self.screenWidth

                } else {

                    self.screenHeight = self.screenHeight - 100

                }

                self.database.height = (self.isMobile || window.location.origin === "file://" || window.location.origin === null) ? self.screenWidth : self.screenHeight ;

                self.database.smallScreen = self.screenTest()

                self.ractive.set(self.database)

            }, 200);

        });

    }

    removeLoop() {

        var self = this

        // Remove render iframe
        if (self.requestAnimationFrame) {
           window.cancelAnimationFrame(self.requestAnimationFrame);
           self.requestAnimationFrame = undefined;
        }

        console.log("The loop has been closed")

    }

    renderLoop() {

        var self = this

        var landscape = document.getElementsByClassName("parallax-container")[0]

        var painting = document.getElementsByClassName("painting")[0]

        var x = getDimensions(landscape)[1]

        var y = window.pageYOffset

        this.requestAnimationFrame = requestAnimationFrame( function() {

            if (y > 0 && y < x) {

                painting.style.opacity = (x - y) / x

            }

            self.renderLoop()

        })
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


        this.ractive.on( 'keydown', function ( event ) {

            if (event.original.keyCode===13) {

                if (self.database.postcodeShortlist.length > 0 && self.database.list) {

                    var lat = self.database.postcodeShortlist[0].latitude
                    var lng = self.database.postcodeShortlist[0].longitude

                    self.database.user_input = ""
                    self.database.list = false
                    self.database.radial = true
                    self.ractive.set(self.database)
                    self.getClosest(lat, lng)

                } else {

                    console.log("Nothing to see here")

                }

                event.original.preventDefault()

            }
           

        });

        this.ractive.on('panel', (context) => {

            self.database.info = false

            self.ractive.set(self.database)

        })

        this.ractive.on('tips', (context) => {

            console.log("Tips")

            self.database.currentTip = (self.database.currentTip == self.database.tips.length - 1) ? 0 : self.database.currentTip + 1 ;

            self.getCoordinates()

        })

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


        this.ractive.on('fatalities', (context, fatalities) => {

            self.database.fatalities = fatalities;

            self.getData().then( (data) => {

                self.ractive.set(self.database)

            })

        })


        this.ractive.on( 'about', function ( context ) {

            self.showAbout()

        });

        this.ractive.on( 'add', function ( context, tag ) {

            var index = self.database.outsiders.indexOf(tag);

            if (index !== -1) self.database.outsiders.splice(index, 1);

            self.database.specials.push(tag)

            self.getData().then( (data) => {

                self.ractive.set(self.database)

            })

        });

        this.ractive.on( 'remove', function ( context, tag ) {

            var index = self.database.specials.indexOf(tag);

            if (index !== -1) self.database.specials.splice(index, 1);

            self.database.outsiders.push(tag)

            self.getData().then( (data) => {

                self.ractive.set(self.database)

            })

        });


        this.ractive.observe('proximity', ( proximity ) => {

            self.database.proximity = proximity

            self.ractive.set(self.database)
            
            if (self.database.geocheck) {

                self.geocheck()

            }

            if (!self.database.proximity) {

                // Remove any circles or cluser stuff if the user switches to explore mode

                if (self.rads != undefined) {

                    self.removerStuff()

                }

                self.database.topfive = []

            }

            self.ractive.set(self.database)

        })

        this.ractive.on( 'results', function ( context ) {

            self.database.legend = self.database.legend ? false : true ;

            self.ractive.set(self.database);

            (self.database.legend) ? self.sidebar.hide() : self.sidebar.show() ;

        });

        this.ractive.on( 'close', function ( context ) {

            self.database.legend = self.database.legend ? false : true ;

            self.ractive.set(self.database)

            self.sidebar.hide()

        });

        this.ractive.on( 'geo', function ( context ) {

            if (self.database.userLatitude!=null) {

                self.getClosest(self.database.userLatitude, self.database.userLongitude)

            } else {

                self.database.logging = self.database.logging += "Geolocation has no coordinates<br/>";

            }

        });

        this.ractive.on( 'top', function ( context ) {

            self.scrollTo($("#navbar"),200)

        });

        this.ractive.on( 'info', function ( context, id ) {

            self.loadMassacre(id);

        });

        this.ractive.on( 'infohover', function ( context, id ) {

            for (var i = 0; i < self.array.length; i++) {

                let marker = self.array[i]

                if (self.array[i].options.id == id) {

                    if ( context.hover ) {

                        marker.setRadius( self.getRadius() * 2 );

                    } else {

                        marker.setRadius( self.getRadius() );
                    }

                }
            }

        });

        this.ractive.on( 'social', function ( context, channel ) {

            var title = "The Killing Times." ;

            var message = 'The Killing Times.'

            // title, shareURL, fbImg, twImg, hashTag, FBmessage=''

            let sharegeneral = share(title, "https://www.theguardian.com/australia-news/ng-interactive/2019/mar/04/massacre-map-australia-the-killing-times-frontier-wars", '', '', '#KillingTimes', message);

            sharegeneral(channel);

        });

        this.ractive.on('showLink', function(e) {

            self.database.massacre.showLink = self.database.massacre.showLink ? false : true ;

            self.ractive.set(self.database)
        })

        this.resize()
        
        this.googleizer()

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

        var geojson = L.geoJson(australia, {
            style: {
                weight: 1,
                opacity: 1,
                color: 'black',
                fillOpacity: 0,
            }
        }).addTo(self.map);

        self.sidebar = L.control.sidebar('sidebar', {

            position: 'left'

        });

        self.map.addControl(self.sidebar);

        (self.database.legend) ? self.sidebar.hide() : self.sidebar.show() ;

        // Set the circle radius depending on zoom level

        self.map.on('zoomend', function(e) {

            var radius = self.getRadius()
    
            for (var i = 0; i < self.array.length; i++) {

                self.array[i].setRadius(radius);

            }

        });

        this.map.on('click', function(e) {

            self.database.radial = false

            if (self.database.proximity) {

                self.getClosest(e.latlng.lat, e.latlng.lng)

            }

        });

        this.compile()

        this.topo()

        this.appscroll()

        this.createState()

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

    createState() {

        var self = this
          
        var states = L.control({ position: 'bottomright' });
     
        states.onAdd = function() {
     
            var leg = L.DomUtil.create('div', 'states');
     
            leg.innerHTML += '<ul>'; 
         
            leg.innerHTML += '<li data-sid="0">NSW</li>';

            leg.innerHTML += '<li data-sid="1">VIC</li>';

            leg.innerHTML += '<li data-sid="2">QLD</li>';

            leg.innerHTML += '<li data-sid="3">SA</li>';

            leg.innerHTML += '<li data-sid="4">WA</li>';

            leg.innerHTML += '<li data-sid="5">TAS</li>';

            leg.innerHTML += '<li data-sid="6">NT</li>';

            leg.innerHTML += '<li data-sid="7">ACT</li>';

            leg.innerHTML += '</ul>';
     
            return leg;
        };
     
        states.addTo(self.map);

        var lis = document.getElementsByClassName("states")[0].getElementsByTagName('li');

        for (var i=0; i<lis.length; i++) {
            lis[i].addEventListener('click', function() {

                var extent = bbox(australia[0].features[+this.getAttribute("data-sid")]); 
                var southWest = L.latLng(extent[1], extent[0]);
                var northEast = L.latLng(extent[3], extent[2]);
                var bounds = new L.LatLngBounds(southWest,northEast);

                self.map.fitBounds(bounds);

            }, false);
        }
     
    }  

    getCoordinates() {

        var self = this

        var infos = ["info-1", "info-2"]

        for (var i = 0; i < infos.length; i++) {

            var el = document.getElementById(infos[i]);

            var pos = ElementPosition.getCoordinates(el);

            self.database.tips[i].posX = pos.left - 100 + ( ( pos.right - pos.left) / 2 )

            self.database.tips[i].posY = self.toolbelt.getOffsetTop(el) - 140
        }

        self.database.tipDisplay = true

        self.database.info = true

        self.database.currentPosX = self.database.tips[self.database.currentTip].posX

        self.database.currentPosY = self.database.tips[self.database.currentTip].posY

        this.database.tip = this.database.tips[self.database.currentTip].tip

        this.showModal()
        
        self.ractive.set(self.database)

    }

    geocheck() {

        var self = this

        self.database.geocheck = false

        self.database.geolocation = ("geolocation" in navigator) ? true : false ;

        var geo_options = {
          enableHighAccuracy: true, 
          maximumAge        : 30000, 
          timeout           : 27000
        };

        if (self.database.geolocation) {

            navigator.geolocation.getCurrentPosition(function(position) {

                if (self.boundingbox[0].northEast.lng >= position.coords.longitude && position.coords.longitude >= self.boundingbox[0].southWest.lng && self.boundingbox[0].northEast.lat >= position.coords.latitude && position.coords.latitude >= self.boundingbox[0].southWest.lat) {

                    self.database.logging = self.database.logging += "Geolocation is supported<br/>";

                    self.database.userLatitude = position.coords.latitude

                    self.database.userLongitude = position.coords.longitude

                    self.watchID = navigator.geolocation.watchPosition(function(position){

                        self.database.userLatitude = position.coords.latitude

                        self.database.userLongitude = position.coords.longitude

                        self.database.logging = self.database.logging += `${position.coords.latitude}, ${position.coords.longitude} <br/>`

                        self.ractive.set(self.database)

                    }, function(error){

                        self.database.logging = self.database.logging += JSON.stringify(error) + '<br/>'

                        self.database.geolocation = false

                        navigator.geolocation.clearWatch(self.watchID);

                        self.ractive.set(self.database)

                    }, geo_options);

                } else {

                    self.database.logging = self.database.logging += "Geolocation: The user is not in Australia<br/>";

                    self.database.geolocation = false

                    self.ractive.set(self.database)

                }

            });

        } else {

            self.database.logging = self.database.logging += "Geolocation is not supported<br/>";

        }

        self.ractive.set(self.database)

    }

    getRadius() {

        var self = this

        var currentZoom = self.map.getZoom()

        var radius =  (currentZoom === 0) ? 156412 :
         (currentZoom === 1) ? 78206 :
         (currentZoom === 2) ? 39103 :
         (currentZoom === 3) ? 19551 :
         (currentZoom === 4) ? 9776  :
         (currentZoom === 5) ? 4888  :
         (currentZoom === 6) ? 2444  :
         (currentZoom === 7) ? 1222  :
         (currentZoom === 8) ? 610.984 :
         (currentZoom === 9) ? 305.492 :
         (currentZoom === 10) ? 152.746 :
         (currentZoom === 11) ? 76.373 :
         (currentZoom === 12) ? 38.187 :
         (currentZoom === 13) ? 19.093 :
         (currentZoom === 14) ? 9.547    :
         (currentZoom === 15) ? 4.773 :
         (currentZoom === 16) ? 2.387 :
         (currentZoom === 16) ? 1.193 :
         (currentZoom === 18) ? 0.596  :
         (currentZoom === 19) ? 0.298  : 0.1 ;

        radius = radius * 5

        return radius

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

    }

    renderCircles(lat, lng) {

        var self = this

        if(self.map.hasLayer(self.rads)){

            self.rads.eachLayer(
                function(l){ 
                    self.rads.removeLayer(l);
            });

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

        let location = new L.circle([lat, lng], {
                    color: 'white',
                    opacity: 3,
                    fillColor: '#2496f9',
                    fillOpacity: 0.5,
                    radius: 2000
                });

        array.push(location);

        self.rads = L.featureGroup(array).addTo(self.map);

        self.rads.bringToBack()

    }

    highlight(id) {

        var self = this

        for (var i = 0; i < self.array.length; i++) {

            let marker = self.array[i]

            if (self.array[i].options.id == id) {

                marker.setRadius( self.getRadius() * 2 );

            } else {

                marker.setRadius( self.getRadius() );
            }
        }

    }

    colourizer(num) {

        return (num < 11) ? '1' : (num < 21) ? '2' : '3' ;

    }

    topo() {

        function colourizer(num) {

            return (num < 11) ? 'orange' : (num < 21) ? 'red' : '#6d0909' ;

        }

        function borderizer(border) {

            return (border) ? 0.5 : 0 ;

        }

        function shaperizer(cat) {

            return (cat=='Aboriginal') ? 'circle' : 'square' ;

        }


        var self = this

        if (self.map.hasLayer(self.massacres)) {

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
                    opacity: 0,
                    fillColor: colourizer(item.total_dead),
                    fillOpacity: 0.5,
                    id: item.id,
                    coloniser: (item.Primary_Victim_Group=='Aboriginal') ? false : true,
                    radius: self.getRadius()
                });


            self.array.push(marker);

        }

        self.massacres = L.featureGroup(self.array).addTo(self.map);

        self.massacres.on("click", (e) => {

            self.database.first = false

            self.map.panTo(new L.LatLng(e.latlng.lat, e.latlng.lng));

            self.loadMassacre(e.layer.options.id);

            self.highlight(e.layer.options.id)

        });

        var tooltipTemplate = `<strong>{site}</strong><br />
            <em>{date}</em><br /><br /> 
            <strong>Motive:</strong> {motive}<br />
            {aboriginal}<br />
            {coloniser}<br /><br />
            <div class="totaline"></div>
            <strong>Total dead:</strong> {total}<br /><br />
            <div class="readmore" data-id="{id}">Click on marker to read full description below</div>`;

        self.massacres.on('mouseover', (e) => {

            var id = e.layer.options.id

            var massacre = self.googledoc.find( (item) => {

                return item.id === id

            });

            var tooltipData = {  
              site : massacre.Site_Name, 
              date : (massacre.Known_Date!='') ? massacre.Known_Date : massacre.year,
              motive: massacre.Motive,
              aboriginal : massacre.AborigEst,
              coloniser : massacre.ColoniserEst,
              total: massacre.Total_Dead_Mean,
              id : id
            };

            var tooltipContent = L.Util.template(tooltipTemplate, tooltipData); 

            self.popup = L.popup().setLatLng(e.latlng).setContent(tooltipContent).openOn(self.map);

            if (self.database.topfive.length > 0) {

                var listIds = self.database.topfive.map(list => list.id);

                if (self.toolbelt.contains(listIds, id)) {

                    var tablerow = document.querySelector("[data-massacre='" + id + "']");

                    tablerow.classList.add("massacre_highlight");

                }

            }

        });

        self.massacres.on('mouseout', (e) => {

            if (self.popup && self.map) {
                self.map.closePopup(self.popup);
                self.popup = null;
            }

            var massacre = document.querySelectorAll(".massacre_row")

            for (var i = 0; i < massacre.length; i++) {

                if (massacre[i].classList.contains("massacre_highlight")) {

                    massacre[i].classList.remove("massacre_highlight");

                }
                
            }

        })

        self.map.on('popupopen', function() {  

            var classname = document.getElementsByClassName("readmore");

            for (var i = 0; i < classname.length; i++) {

                classname[i].addEventListener('click', function() {

                    self.loadMassacre(+this.getAttribute("data-id"))

                }, false);
            }

        });

    }

    loadMassacre(id) {

        var self = this

        var massacre = self.googledoc.find( (item) => {

            return item.id === id

        });

        massacre.showLink = false,

        self.database.massacre = massacre

        console.log(self.database.massacre)

        self.ractive.set(self.database)

        if (!self.database.isMobile) {

            self.scrollTo($("#frontier-results"), 200)

        }

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

            var groups = ["Aboriginal Civilians", "Aboriginal Warriors", "Military / Police / Government", "Native Police", "Settlers / Stockmen", "Colonial civilians"]

            var identities = []

            for (var i = 0; i < self.database.specials.length; i++) {

                var index = groups.indexOf(self.database.specials[i])

                identities.push(index)

            }

            var data_three = data_two.filter(function(item) {

                if ( self.toolbelt.contains(item.identities, identities) ) {

                    return item

                }

            })

            var data_four = (self.database.fatalities=='All') ? data_three : data_three.filter(function(item) {

                return item.Primary_Victim_Group == self.database.fatalities

            })

            self.database.records = data_four

            self.topo()

            if (self.database.latitude!=null && self.database.longitude!=null && self.database.proximity) {

                self.getClosest(self.database.latitude, self.database.longitude)

            }

            resolve(data_one);  

        })

    }

    showAbout() {

        var modal = new Modal({
            transitions: { fade: ractiveFade },
            events: { tap: ractiveTap },
            template: modalTemplate,
            data: {
                isApp: (window.location.origin === "file://" || window.location.origin === null) ? true : false 
            }
        });

        var isAndroidApp = (window.location.origin === "file://" && /(android)/i.test(navigator.userAgent) ) ? true : false ;

        var el = $('.modal-content');

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

    showModal() {

        var self = this

        var modal = new Modal({
            transitions: { fade: ractiveFade },
            events: { 
                tap: ractiveTap
            },
            data: {
                title: self.database.tips[self.database.currentTip].title,
                tip: self.database.tips[self.database.currentTip].tip,
                isApp: (window.location.origin === "file://" || window.location.origin === null) ? true : false,
                showNext: true
            },
            template: tipsTemplate
        });

        modal.on('showNext', function(e) {

            e.original.preventDefault()

            self.database.currentTip = (self.database.currentTip == self.database.tips.length - 1) ? 0 : self.database.currentTip + 1 ;

            modal.set('title',self.database.tips[self.database.currentTip].title)

            modal.set('tip',self.database.tips[self.database.currentTip].tip)

            self.database.currentPosX = self.database.tips[self.database.currentTip].posX

            self.database.currentPosY = self.database.tips[self.database.currentTip].posY
            
            self.ractive.set(self.database)

        })

        modal.on('close', function(e) {

            self.database.info = false ;

            self.database.currentTip = (self.database.currentTip == self.database.tips.length - 1) ? 0 : self.database.currentTip + 1 ;

            self.ractive.set(self.database) ;

        })

        var isAndroidApp = (window.location.origin === "file://" && /(android)/i.test(navigator.userAgent) ) ? true : false ;

        var el = $('.details-container-inner');

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

    caseload(idcfv) {

        var self = this

        var data = self.googledoc.filter(function(d) { return d.idcfv === idcfv })

        if (data.length > 0) {

            self.map.panTo(new L.LatLng(data[0].Latitude, data[0].Longitude));

            self.loadMassacre(data[0].id);

            self.highlight(data[0].id)

        }

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