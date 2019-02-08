        /*

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

        */