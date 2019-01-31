import template from '../../templates/template.html'
import modalTemplate from '../../templates/modal.html'
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
import Choices from 'choices.js'
import GoogleMapsLoader from 'google-maps';
import mapstyles from '../modules/mapstyles.json'
import L from 'leaflet' // npm install leaflet@1.0.3. v 1.0.3 Check it out... https://blog.webkid.io/rarely-used-leaflet-features/
//npm install leaflet@1.3.1
import Modal from '../modules/modal'
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

        this.screenHeight = document.documentElement.clientHeight

        this.isMobile = this.mobileCheck()

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
            self.googledoc[i].total_dead = +self.googledoc[i].Total_Dead_Mean //+self.googledoc[i].Coloniser_Dead + +self.googledoc[i].Aborig_Dead
            self.googledoc[i].year = moment(self.googledoc[i].Date_Mid, 'YYYY-MM-DD').format('YYYY');
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

            proximity: (self.isMobile) ? true: false,

            legend: (self.isMobile) ? true: false,

            logging: "Console log output for testing:<br/>",

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

        this.database.logging = this.database.logging += "Mobile: " + (self.isMobile) ? true: false ;

        this.database.records = this.googledoc

        this.database.height = this.screenHeight

        this.postcoder()

	}

    mobileCheck() {
        var self = this
        var check = false;
        (function(a) {
            if (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0, 4))) check = true
        })(navigator.userAgent || navigator.vendor || window.opera);
        var isiPad = navigator.userAgent.match(/iPad/i) != null;
        var isApp = (window.location.origin === "file://" || window.location.origin === "null") ? true : false ;
        var preflight = (check || isiPad ? true : false)
        var status = (isApp) ? true : preflight ;

        return status;
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

        this.ractive.on( 'about', function ( context ) {

            self.showAbout()

        });


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

                self.database.topfive = []

            }

            self.ractive.set(self.database)

        })

        this.ractive.on( 'results', function ( context ) {

            var target = document.getElementById("legend")

            if (target.classList.contains('hideFilters')) {

                target.classList.remove('hideFilters')

            } else {

                target.classList.add('hideFilters')

            }

        });


        this.ractive.on( 'close', function ( context ) {

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

        self.database.geocheck = false

        self.database.geolocation = ("geolocation" in navigator) ? true : false ;

        var geo_options = {
          enableHighAccuracy: true, 
          maximumAge        : 30000, 
          timeout           : 27000
        };

        if (self.database.geolocation) {

            navigator.geolocation.getCurrentPosition(function(position) {

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

            });
        } else {

            self.database.logging = self.database.logging += "Geolocation is not supported<br/>";

        }

        

        self.ractive.set(self.database)

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

                //self.map.panTo(new L.LatLng(e.latlng.lat, e.latlng.lng));

                //self.scrollTo($("#navbar"), 0)

            }

        });

        this.compile()

        this.casualties()

        this.topo()

        this.appscroll()

    }

    getRadius() {

        var self = this

        var currentZoom = self.map.getZoom()

        //https://wiki.openstreetmap.org/wiki/Zoom_levels

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

        /*
        The distance represented by one pixel (S) is given by

        S=C*cos(y)/2^(z+8) where...

        C is the (equatorial) circumference of the Earth

        z is the zoom level

        y is the latitude of where you're interested in the scale.
        */


        radius = radius * 5

        //var metresPerPixel = 40075016.686 * Math.abs(Math.cos(self.map.getCenter().lat)) / Math.pow(2, (self.map.getZoom()+8));

        //console.log(currentZoom + ' | ' + metresPerPixel)

        //var radius = metresPerPixel * 4

        return radius

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


        function borderizer(border) {

            return (border) ? 0.5 : 0 ;

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
                color: 'black',
                opacity: borderizer(item.article),
                fillColor: colourizer(item.total_dead),
                fillOpacity: 0.5,
                id: item.id, //idcfv
                radius: self.getRadius()
            });

            self.array.push(marker);
        }

        self.massacres = L.featureGroup(self.array).addTo(self.map);

        self.massacres.on("click", (e) => {

            self.map.panTo(new L.LatLng(e.latlng.lat, e.latlng.lng));

            self.loadMassacre(e.layer.options.id);

        });

        var tooltipTemplate = `<strong>{site}</strong><br />
            <em>{date}</em><br /><br /> 
            <strong>Motive:</strong> {motive}<br />
            <strong>Aboriginal dead:</strong> {aboriginal}<br />
            <strong>Coloniser dead:</strong> {coloniser}<br /><br />
            <div class="readmore" data-id="{id}">Click to see full description</div>`;


        self.massacres.on('mouseover', (e) => {

            var id = e.layer.options.id

            var massacre = self.googledoc.find( (item) => {

                return item.id === id

            });

            var tooltipData = {  
              site : massacre.Site_Name, 
              date : (massacre.Known_Date!='') ? massacre.Known_Date : massacre.year,
              motive: massacre.Motive,
              aboriginal : massacre.Aborig_Dead_Mean,
              coloniser : massacre.Coloniser_Dead_Mean,
              id : id
            };

            var tooltipContent = L.Util.template(tooltipTemplate, tooltipData); 

          var popup = L.popup()
           .setLatLng(e.latlng) 
           .setContent(tooltipContent)
           .openOn(self.map);
        });

        self.map.on('popupopen', function() {  

            var classname = document.getElementsByClassName("readmore");

            for (var i = 0; i < classname.length; i++) {
                classname[i].addEventListener('click', function(){

                    self.loadMassacre(+this.getAttribute("data-id"))

                }, false);
            }

        });

    }

    loadArticle(key) {

        var self = this

        xr.get(`https://interactive.guim.co.uk/docsdata/${key}.json?t=${new Date().getTime()}`).then((resp) => {

            self.database.massacre.editorial = resp.data

            self.ractive.set(self.database)

            self.scrollTo($("#frontier-results"), 200)

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

            self.scrollTo($("#frontier-results"), 200)

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