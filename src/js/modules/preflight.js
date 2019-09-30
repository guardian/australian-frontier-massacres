import moment from 'moment'

export class Preflight {

	constructor(data, key, settings, postcodes) {

		var self = this

		this.googledoc = data

        this.settings = settings 

        this.postcodes = postcodes

        this.settings.voting = (Number.isInteger(self.googledoc[0].votes)) ? true : false ;

        this.settings.filepath = "<%= path %>"

        this.settings.platform = navigator.platform.toLowerCase();

        this.settings.userAgent = navigator.userAgent.toLowerCase();

        this.settings.isMobile = this.mobileCheck()

        this.settings.isApp = (window.location.origin === "file://" || window.location.origin === null) ? true : false ;

        this.settings.isIos = this.ios()

        this.settings.localstore = this.localStorage()

        this.settings.randomID = this.randomString(32)

        this.settings.key = key

        this.settings.screenWidth = document.documentElement.clientWidth

        this.settings.screenHeight = document.documentElement.clientHeight

        this.settings.zoom = (self.settings.screenWidth < 600) ? 3 : (self.settings.screenWidth < 800) ? 4 : 5 ;

        this.settings.smallScreen = this.screenTest()

	}

    ios() {

      var iDevices = [
        'iPad Simulator',
        'iPhone Simulator',
        'iPod Simulator',
        'iPad',
        'iPhone',
        'iPod'
      ];

      if (!!navigator.platform) {
        while (iDevices.length) {
          if (navigator.platform === iDevices.pop()){ return true; }
        }
      }

      return false;

    }

    mobileCheck() {
        var check = false;
        (function(a) {
            if (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0, 4))) check = true
        })(navigator.userAgent || navigator.vendor || window.opera);
        var isiPad = navigator.userAgent.match(/iPad/i) != null;
        return (check || isiPad ? true : false);
    }

    localStorage() {

        var self = this

        if (typeof localStorage !== 'undefined') {
            try {
                localStorage.setItem('verify', 'confirm');
                if (localStorage.getItem('verify') === 'confirm') {
                    localStorage.removeItem('verify');
                    //localStorage is enabled
                    return true;
                } else {
                    //localStorage is disabled
                    return false;
                }
            } catch(e) {
                //localStorage is disabled
                return false;
            }
        } else {
            //localStorage is not available
            return false;
        }
    }

    randomString(length) {
        var chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
        var result = '';
        for (var i = length; i > 0; --i) result += chars[Math.floor(Math.random() * chars.length)];
        return result;
    }

    localStorage() {

        var self = this

        if (typeof localStorage !== 'undefined') {
            try {
                localStorage.setItem('verify', 'confirm');
                if (localStorage.getItem('verify') === 'confirm') {
                    localStorage.removeItem('verify');
                    //localStorage is enabled
                    self.localstore = true;
                } else {
                    //localStorage is disabled
                    self.localstore = false;
                }
            } catch(e) {
                //localStorage is disabled
                self.localstore = false;
            }
        } else {
            //localStorage is not available
            self.localstore = false;
        }
    }

    async process() {

        var self = this

        await this.postcodes.forEach(function(value, index) {

                value.latitude = +value.latitude
                value.longitude = +value.longitude
                value["meta"] = value.postcode + ' | ' + value.place_name;

            });

        await this.googledoc.forEach( (google, i) => {

            google.id = i
            google.Latitude = +google.Latitude
            google.Longitude = +google.Longitude
            google.idcfv = google.idcfv
            google.total_dead = +google.Total_Dead_Mean
            google.Aborig_Dead_Min = +google.Aborig_Dead_Min
            google.Aborig_Dead_Max = +google.Aborig_Dead_Max
            google.Aborig_Dead_Mean = +google.Aborig_Dead_Mean
            google.Coloniser_Dead_Min = +google.Coloniser_Dead_Min
            google.Coloniser_Dead_Max = +google.Coloniser_Dead_Max
            google.Coloniser_Dead_Mean = +google.Coloniser_Dead_Mean
            google.year = moment(google.Date_Mid, 'YYYY-MM-DD').format('YYYY');
            google.identities = []
            google.article = (google.Image!="") ? true : false ;
            google.AborigEst = self.estimizer('Aboriginal', google.Aborig_Dead_Min, google.Aborig_Dead_Max, google.Aborig_Dead_Mean)
            google.ColoniserEst = self.estimizer('Coloniser', google.Coloniser_Dead_Min, google.Coloniser_Dead_Max, google.Coloniser_Dead_Mean)

            for (var ii = 0; ii < self.settings.identities.length; ii++) {

                if (google[self.settings.identities[ii].tag]=='y') {
                    google.identities.push(ii)
                }

            }

        });

        this.map = null

        this.database = {

            info: false,

            tips: self.settings.tips,

            tip: self.settings.tips[0],

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

            deaths: self.settings.deaths,

            motivation: self.settings.motivation,

            specials: self.settings.specials,

            identities: [0,1,2,3,4,5],

            outsiders: [],

            filterMotivation: "All",

            filterDeaths: "All",

            filterSpecial: "",

            proximity: false,

            legend: (self.settings.isMobile || window.location.origin === "file://" || window.location.origin === null) ? true: false,

            isMobile: self.settings.isMobile,

            isApp: self.settings.isApp ,

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

        this.database.height = self.viewporter()

        if (this.settings.screenHeight > (this.settings.screenWidth * 2)) {

            this.database.screenHeight = this.settings.screenWidth

        } else {

            this.database.screenHeight = this.settings.screenHeight - 100

        }

        this.database.records = this.googledoc

        this.database.postcodes = this.postcodes

        return { database : self.database, settings : self.settings }

    }

    estimizer(label, min, max, mean) {

        var estimate = (min!=max&&min!=0&&max!=0) ? `<strong>${label} dead mean</strong>: ${mean} (min estimate: ${min}, max estimate: ${max})` : `<strong>${label} dead</strong>: ${mean}` ; 

        return estimate

    }

    screenTest() {

        return (window.innerWidth < 740) ? true : false ;

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

}