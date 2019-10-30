import template from '../../templates/template.html'
import modalTemplate from '../../templates/modal.html'
import tipsTemplate from '../../templates/tips.html'
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

	constructor(application) {

		var self = this

        this.map = null

        this.database = application.database

        this.googledoc = application.database.records

        this.settings = application.settings

        this.toolbelt = new Toolbelt()

        this.gis = new Gis()

	} 

    viewporter() {

        var self = this

        var mapheight = self.settings.screenHeight

        if (self.settings.isMobile || window.location.origin === "file://" || window.location.origin === null) {

            if (self.settings.screenWidth > self.settings.screenHeight) {

                mapheight = self.settings.screenWidth / 2

            } else {

                mapheight = self.settings.screenWidth
            }

        }

        return mapheight

    }

    screenTest() {

        return (window.innerWidth < 740) ? true : false ;

    }

    resize() {

        var self = this

        window.addEventListener("resize", function() {

            clearTimeout(document.body.data)

            document.body.data = setTimeout( function() { 

                console.log("Resized")

                self.settings.screenWidth = document.documentElement.clientWidth

                self.settings.screenHeight = document.documentElement.clientHeight

                if (self.settings.screenHeight > (self.settings.screenWidth * 2)) {

                    self.settings.screenHeight = self.settings.screenWidth

                } else {

                    self.settings.screenHeight = self.settings.screenHeight - 100

                }

                self.database.height = self.viewporter()

                self.settings.smallScreen = self.screenTest();

                self.settings.zoom = (self.settings.screenWidth < 600) ? 3 : (self.settings.screenWidth < 800) ? 4 : 5 ;

                self.ractive.set(self.database);

                self.map.invalidateSize();

            }, 200);

        });

        window.addEventListener("orientationchange", function() {
            
            console.log("orientationchange")
            
        }, false);


    }

    removeLoop() {

        var self = this

        if (self.requestAnimationFrame) {
           window.cancelAnimationFrame(self.requestAnimationFrame);
           self.requestAnimationFrame = undefined;
        }

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

                self.database.postcodeShortlist = self.database.postcodes.filter(function(item) {

                    var results = item.meta.toLowerCase()

                    if (results.includes(input.toLowerCase())) {

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

                }

                event.original.preventDefault()

            }
           

        });

        this.ractive.on('panel', (context) => {

            self.database.info = false

            self.ractive.set(self.database)

        })

        this.ractive.on('tips', (context) => {

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

            var shareURL = self.toolbelt.getShareUrl()

            let sharegeneral = share(self.settings.title, shareURL, self.settings.fbImg, '', self.settings.twHash, self.settings.message);

            sharegeneral(channel);

        });

        this.ractive.on('showLink', function(e) {

            self.database.massacre.showLink = self.database.massacre.showLink ? false : true ;

            self.ractive.set(self.database)
        })

        this.ractive.on( 'all', function ( context ) {

            self.database.all = context.event.target.checked

            self.getData().then( (data) => {

                self.ractive.set(self.database)

            })

        });


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
            center: new L.LatLng(self.settings.latitude, self.settings.longitude), 
            zoom: self.settings.zoom,
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

            } else {

                self.database.first = false

                self.database.logging = self.database.logging += `Proximity mode: ${self.database.proximity} | iSMobile: ${self.settings.isMobile}<br/>`

                if (self.settings.isMobile) {

                    self.database.logging = self.database.logging += "Mobile map clicked<br/>"

                    self.getNearest(e.latlng.lat, e.latlng.lng)

                }

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

        var el = document.getElementById('map');

        el.ontouchstart = function(e){

            if (self.settings.isAndroidApp && window.top.GuardianJSInterface.registerRelatedCardsTouch) {

              window.top.GuardianJSInterface.registerRelatedCardsTouch(true);

            }
        };

        el.ontouchend = function(e){

            if (self.settings.isAndroidApp && window.top.GuardianJSInterface.registerRelatedCardsTouch) {

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

          enableHighAccuracy : true, 

          maximumAge : 30000, 

          timeout : 27000

        };

        if (self.database.geolocation) {

            navigator.geolocation.getCurrentPosition(function(position) {

                if (self.settings.northEast.lng >= position.coords.longitude && position.coords.longitude >= self.settings.southWest.lng && self.settings.northEast.lat >= position.coords.latitude && position.coords.latitude >= self.settings.southWest.lat) {

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

    getNearest(lat, lng) {

        var self = this

        for (var i = 0; i < self.database.records.length; i++) {

            self.database.records[i].distance = self.gis.sphericalCosinus(self.database.records[i].Latitude, self.database.records[i].Longitude,lat,lng)

            console.log(self.gis.sphericalCosinus(self.database.records[i].Latitude, self.database.records[i].Longitude,lat,lng))

        }

        self.database.records.sort( (a, b) => {

            return a["distance"] - b["distance"]

        });

        if (self.database.records.length > 0) {

            self.loadMassacre(self.database.records[0].id)

            self.highlight(self.database.records[0].id)

        }

    }

    getClosest(lat, lng) {

        var self = this

        self.database.latitude = lat;

        self.database.longitude = lng;

        for (var i = 0; i < self.database.records.length; i++) {

            self.database.records[i].distance = self.gis.sphericalCosinus(self.database.records[i].Latitude, self.database.records[i].Longitude,lat,lng)

        }

        self.database.records.sort( (a, b) => a["distance"] - b["distance"]);

        var mark = (self.database.records.length > 5) ? self.settings.radialResults : self.database.records.length ;

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

            self.rads.eachLayer((l) => self.rads.removeLayer(l));

        }

    }

    renderCircles(lat, lng) {

        var self = this

        if(self.map.hasLayer(self.rads)){

            self.rads.eachLayer((l) => self.rads.removeLayer(l));

        }

        var array = [];

        var countdown = 0.5

        if (self.database.proximity) {

            for (var i = 0; i < self.database.topfive.length; i++) {

                let radius = L.circle([lat, lng], self.database.topfive[i].distance,{ weight: 1, dashArray: "5 10", color:'darkgrey',opacity:countdown,fillOpacity:0})

                countdown = countdown - 0.05

                array.push(radius);
            }

        } else {

            var mark = (self.database.records.length > 5) ? self.settings.radialResults - 1 : self.database.records.length - 1 ;

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

            self.massacres.eachLayer((l) => self.massacres.removeLayer(l));
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

            L.DomEvent.stopPropagation(e)

        });

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

            var tooltipContent = L.Util.template(self.settings.tooltipTemplate, tooltipData); 

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

        var massacre = self.googledoc.find( (item) => item.id === id);

        massacre.showLink = false

        self.database.massacre = massacre

        self.ractive.set(self.database)

        if (!self.settings.isMobile) {

            self.scrollTo($("#frontier-results"), 200)

        }

    }

    getData() {

        var self = this

        return new Promise((resolve, reject) => {

            var data_one = self.googledoc.filter((item) => {

                if (item.year >= self.database.DateStart && item.year <= self.database.DateEnd) {

                    return item

                }

            });

            var range = (self.database.filterDeaths === '6 to 10') ? [6,10] : (self.database.filterDeaths === '11 to 20') ? [11,20] : (self.database.filterDeaths === 'More than 20') ? [21,1000] : [0,1000] ;

            var data_two = data_one.filter((item) => {

                if (item.total_dead >= range[0] && item.total_dead <= range[1]) {

                    return item

                }

            })

            var identities = []

            for (var i = 0; i < self.database.specials.length; i++) {

                var index = self.settings.groups.indexOf(self.database.specials[i])

                identities.push(index)

            }

            var data_three = data_two.filter( (item) => {

                if ( self.toolbelt.contains(item.identities, identities) ) {

                    return item

                }

            })

            var data_four = (self.database.fatalities=='All') ? data_three : data_three.filter( (item) => item.Primary_Victim_Group == self.database.fatalities)

            var data_five = (self.database.all) ? data_four : data_four.filter( (item) => item.new)

            self.database.records = data_five

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
                isApp: self.settings.isApp
            }
        });

        var el = $('.modal-content');

        el.ontouchstart = (e) => {

            if (self.settings.isAndroidApp && window.top.GuardianJSInterface.registerRelatedCardsTouch) {

              window.top.GuardianJSInterface.registerRelatedCardsTouch(true);

            }
        };

        el.ontouchend = (e) => {

            if (self.settings.isAndroidApp && window.top.GuardianJSInterface.registerRelatedCardsTouch) {

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
                isApp: self.settings.isApp,
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

        var el = $('.details-container-inner');

        el.ontouchstart = (e) => {

            if (self.settings.isAndroidApp && window.top.GuardianJSInterface.registerRelatedCardsTouch) {

              window.top.GuardianJSInterface.registerRelatedCardsTouch(true);

            }
        };

        el.ontouchend = (e) => {

            if (self.settings.isAndroidApp && window.top.GuardianJSInterface.registerRelatedCardsTouch) {

              window.top.GuardianJSInterface.registerRelatedCardsTouch(false);

            }

        };

    }

    caseload(idcfv) {

        var self = this

        var data = self.googledoc.filter( (d) => d.idcfv === idcfv )

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